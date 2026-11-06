import {
  ALL_STATIONS,
  STATIONS_BY_ID,
  TORONTO_CENTRAL_NEXUS,
  TORONTO_LANDMARKS,
  TRANSIT_LINES,
  StationNode,
  TorontoLandmark,
  TransitLine,
  getStationChainTrackCanvasPoints,
} from '../data/torontoTransitData';

export type RouteOptimizationMode = 'fastest' | 'fewest-transfers' | 'shortest-distance';

export interface RouteSearchOptions {
  mode?: RouteOptimizationMode;
  includeBuses?: boolean;
}

export interface RouteLeg {
  line: TransitLine;
  fromStation: StationNode;
  toStation: StationNode;
  stops: StationNode[];
  distanceKm: number;
  durationMinutes: number;
  directionLabel: string;
}

export interface RouteResult {
  originStation: StationNode;
  destinationStation: StationNode;
  originLandmark?: TorontoLandmark;
  destinationLandmark?: TorontoLandmark;
  legs: RouteLeg[];
  allStationsInOrder: StationNode[];
  totalDistanceKm: number;
  totalDurationMinutes: number;
  totalStops: number;
  transferCount: number;
  fareCad: number;
  optimizationMode: RouteOptimizationMode;
}

export interface SearchableLocation {
  id: string;
  type: 'station' | 'landmark';
  title: string;
  subtitle: string;
  stationId: string;
  stationName: string;
  municipality: string;
  walkingMinutes?: number;
  landmark?: TorontoLandmark;
  lineBadges: Array<{ code: string; color: string; mode: TransitLine['mode'] }>;
}

const LINES_BY_ID: Record<string, TransitLine> = {};
for (const l of TRANSIT_LINES) {
  LINES_BY_ID[l.id] = l;
}

/**
 * Great-circle Haversine distance in kilometers between two lat/lng points
 */
export function calculateHaversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Earth radius km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.max(0.25, Number((R * c).toFixed(2)));
}

/**
 * Estimate travel time in minutes for a single hop between adjacent stations
 */
function estimateHopMinutes(
  distKm: number,
  mode: TransitLine['mode'],
  lineId?: string
): number {
  // UP Express and GO Regional Rail average ~54 km/h on shared rail corridors; Subway ~38 km/h; LRT ~32 km/h; 407 Express Bus ~45 km/h
  const isRegionalOrAirportRail =
    lineId === 'line-10' || Boolean(lineId && lineId.startsWith('go-'));
  const speedKmh = isRegionalOrAirportRail
    ? 54
    : mode === 'subway'
      ? 38
      : mode === 'lrt'
        ? 32
        : 25;
  const dwellMin = isRegionalOrAirportRail ? 0.4 : mode === 'subway' ? 0.45 : 0.55;
  return Math.max(1.1, (distKm / speedKmh) * 60 + dwellMin);
}

/**
 * Dijkstra's shortest-path algorithm over (stationId, lineId) state space
 */
export function findShortestRoute(
  originStationId: string,
  destinationStationId: string,
  options: RouteSearchOptions = {},
  originLandmark?: TorontoLandmark,
  destinationLandmark?: TorontoLandmark
): RouteResult | null {
  const origin = STATIONS_BY_ID[originStationId];
  const destination = STATIONS_BY_ID[destinationStationId];
  if (!origin || !destination) return null;

  const optimizationMode: RouteOptimizationMode = options.mode ?? 'fastest';
  const includeBuses = options.includeBuses ?? true;

  if (origin.id === destination.id) {
    const walkMin =
      (originLandmark?.walkingMinutes ?? 0) + (destinationLandmark?.walkingMinutes ?? 0);
    return {
      originStation: origin,
      destinationStation: destination,
      originLandmark,
      destinationLandmark,
      legs: [],
      allStationsInOrder: [origin],
      totalDistanceKm: 0,
      totalDurationMinutes: walkMin,
      totalStops: 0,
      transferCount: 0,
      fareCad: 0,
      optimizationMode,
    };
  }

  const activeLines = TRANSIT_LINES.filter((line) => includeBuses || line.mode !== 'bus');

  // Build adjacency list: stationId -> Array<{ neighborId, lineId, distKm, hopMinutes }>
  interface Edge {
    neighborId: string;
    lineId: string;
    distKm: number;
    hopMinutes: number;
  }
  const adj: Record<string, Edge[]> = {};
  const lineDirectPairs = new Set<string>();

  for (const line of activeLines) {
    const ids = line.stationIds;
    for (let i = 0; i < ids.length - 1; i++) {
      const a = STATIONS_BY_ID[ids[i]];
      const b = STATIONS_BY_ID[ids[i + 1]];
      if (!a || !b) continue;
      const distKm = calculateHaversineKm(a.lat, a.lng, b.lat, b.lng);
      const hopMinutes = estimateHopMinutes(distKm, line.mode, line.id);

      if (!adj[a.id]) adj[a.id] = [];
      if (!adj[b.id]) adj[b.id] = [];

      adj[a.id].push({ neighborId: b.id, lineId: line.id, distKm, hopMinutes });
      adj[b.id].push({ neighborId: a.id, lineId: line.id, distKm, hopMinutes });

      lineDirectPairs.add(`${line.id}::${a.id}::${b.id}`);
      lineDirectPairs.add(`${line.id}::${b.id}::${a.id}`);
    }
  }

  // State key: `${stationId}::${lineId}`
  interface StateNode {
    key: string;
    stationId: string;
    lineId: string;
    cost: number;
  }

  const distCost: Record<string, number> = {};
  const prevState: Record<string, { prevKey: string | null; stationId: string; lineId: string }> = {};
  const visited = new Set<string>();
  const queue: StateNode[] = [];

  const startEdges = adj[origin.id] || [];
  const startLines = Array.from(new Set(startEdges.map((e) => e.lineId)));

  for (const lineId of startLines) {
    const key = `${origin.id}::${lineId}`;
    distCost[key] = 0;
    prevState[key] = { prevKey: null, stationId: origin.id, lineId };
    queue.push({ key, stationId: origin.id, lineId, cost: 0 });
  }

  let bestEndKey: string | null = null;

  while (queue.length > 0) {
    queue.sort((a, b) => a.cost - b.cost);
    const current = queue.shift()!;
    if (visited.has(current.key)) continue;
    visited.add(current.key);

    if (current.stationId === destination.id) {
      bestEndKey = current.key;
      break;
    }

    const prevNode = prevState[current.key];
    const prevStationId = prevNode?.prevKey ? prevNode.stationId : null;

    const neighbors = adj[current.stationId] || [];
    for (const edge of neighbors) {
      // Prevent immediate U-turn back to previous station
      if (prevStationId && edge.neighborId === prevStationId) continue;

      const isTransfer = edge.lineId !== current.lineId;
      // If the passenger transfers to a line that ALREADY served the exact segment they just rode (e.g. riding Kitchener Union->Weston then switching to UP Express at Weston), penalize heavily so the direct line is boarded from the start
      const isRedundantSharedCorridorTransfer = Boolean(
        isTransfer &&
          prevStationId &&
          lineDirectPairs.has(`${edge.lineId}::${prevStationId}::${current.stationId}`)
      );
      const sharedCorridorPenalty = isRedundantSharedCorridorTransfer ? 60 : 0;

      let stepCost = 0;

      if (optimizationMode === 'fastest') {
        stepCost = edge.hopMinutes + (isTransfer ? 5.5 : 0) + sharedCorridorPenalty;
      } else if (optimizationMode === 'fewest-transfers') {
        stepCost = edge.hopMinutes + (isTransfer ? 40 : 0) + sharedCorridorPenalty;
      } else {
        // shortest-distance
        stepCost = edge.distKm + (isTransfer ? 1.5 : 0) + sharedCorridorPenalty;
      }

      const nextKey = `${edge.neighborId}::${edge.lineId}`;
      const newCost = current.cost + stepCost;

      if (distCost[nextKey] === undefined || newCost < distCost[nextKey]) {
        distCost[nextKey] = newCost;
        prevState[nextKey] = {
          prevKey: current.key,
          stationId: edge.neighborId,
          lineId: edge.lineId,
        };
        queue.push({
          key: nextKey,
          stationId: edge.neighborId,
          lineId: edge.lineId,
          cost: newCost,
        });
      }
    }
  }

  if (!bestEndKey) return null;

  // Reconstruct state chain
  const chain: Array<{ stationId: string; lineId: string }> = [];
  let cursor: string | null = bestEndKey;
  while (cursor) {
    const stateEntry: { prevKey: string | null; stationId: string; lineId: string } | undefined =
      prevState[cursor];
    if (!stateEntry) break;
    chain.unshift({ stationId: stateEntry.stationId, lineId: stateEntry.lineId });
    cursor = stateEntry.prevKey;
  }

  // Group into contiguous legs by lineId
  const legs: RouteLeg[] = [];
  let i = 0;
  while (i < chain.length - 1) {
    const legLineId = chain[i + 1].lineId;
    const line = LINES_BY_ID[legLineId];
    const legStops: StationNode[] = [STATIONS_BY_ID[chain[i].stationId]];
    let legDist = 0;
    let legMinutes = 0;

    let j = i + 1;
    while (j < chain.length && chain[j].lineId === legLineId) {
      const prevSt = STATIONS_BY_ID[chain[j - 1].stationId];
      const currSt = STATIONS_BY_ID[chain[j].stationId];
      const d = calculateHaversineKm(prevSt.lat, prevSt.lng, currSt.lat, currSt.lng);
      legDist += d;
      legMinutes += estimateHopMinutes(d, line.mode, line.id);
      legStops.push(currSt);
      j++;
    }

    // Determine terminal direction label
    const firstIdx = line.stationIds.indexOf(legStops[0].id);
    const lastIdx = line.stationIds.indexOf(legStops[legStops.length - 1].id);
    const terminalId =
      lastIdx >= firstIdx
        ? line.stationIds[line.stationIds.length - 1]
        : line.stationIds[0];
    const terminalName = STATIONS_BY_ID[terminalId]?.name ?? line.shortName;

    legs.push({
      line,
      fromStation: legStops[0],
      toStation: legStops[legStops.length - 1],
      stops: legStops,
      distanceKm: Number(legDist.toFixed(2)),
      durationMinutes: Math.max(2, Math.round(legMinutes)),
      directionLabel: `Towards ${terminalName}`,
    });

    i = j - 1;
  }

  const allStationsInOrder: StationNode[] = [];
  for (const leg of legs) {
    for (const st of leg.stops) {
      if (
        allStationsInOrder.length === 0 ||
        allStationsInOrder[allStationsInOrder.length - 1].id !== st.id
      ) {
        allStationsInOrder.push(st);
      }
    }
  }

  const transferCount = Math.max(0, legs.length - 1);
  const transferWaitMinutes = transferCount * 3;
  const walkMinutes =
    (originLandmark?.walkingMinutes ?? 0) + (destinationLandmark?.walkingMinutes ?? 0);

  const totalDistanceKm = Number(
    legs.reduce((sum, l) => sum + l.distanceKm, 0).toFixed(2)
  );
  const totalDurationMinutes =
    legs.reduce((sum, l) => sum + l.durationMinutes, 0) +
    transferWaitMinutes +
    walkMinutes;

  return {
    originStation: origin,
    destinationStation: destination,
    originLandmark,
    destinationLandmark,
    legs,
    allStationsInOrder,
    totalDistanceKm,
    totalDurationMinutes,
    totalStops: Math.max(0, allStationsInOrder.length - 1),
    transferCount,
    fareCad: 3.35, // Official TTC / Ontario One-Fare adult PRESTO rate
    optimizationMode,
  };
}

/**
 * Search across all Toronto stations and landmarks
 */
export function searchPlacesAndStations(query: string): SearchableLocation[] {
  const q = query.trim().toLowerCase();
  const items: SearchableLocation[] = [];

  // 1. Add Landmarks
  for (const lm of TORONTO_LANDMARKS) {
    const st = STATIONS_BY_ID[lm.stationId];
    if (!st) continue;
    const lineBadges = st.lines
      .map((lId) => LINES_BY_ID[lId])
      .filter(Boolean)
      .map((l) => ({ code: l.code, color: l.color, mode: l.mode }));

    items.push({
      id: lm.id,
      type: 'landmark',
      title: lm.name,
      subtitle: `${lm.category} · ${lm.walkingMinutes} min walk from ${st.name}`,
      stationId: st.id,
      stationName: st.name,
      municipality: st.municipality,
      walkingMinutes: lm.walkingMinutes,
      landmark: lm,
      lineBadges,
    });
  }

  // 2. Add Stations
  for (const st of ALL_STATIONS) {
    const lineBadges = st.lines
      .map((lId) => LINES_BY_ID[lId])
      .filter(Boolean)
      .map((l) => ({ code: l.code, color: l.color, mode: l.mode }));

    items.push({
      id: st.id,
      type: 'station',
      title: `${st.name} Station`,
      subtitle: `${st.municipality}${st.streetAddress ? ` · ${st.streetAddress}` : ''}`,
      stationId: st.id,
      stationName: st.name,
      municipality: st.municipality,
      lineBadges,
    });
  }

  if (!q) {
    return items.slice(0, 25);
  }

  const scored = items
    .map((item) => {
      let score = 0;
      const titleLower = item.title.toLowerCase();
      const subLower = item.subtitle.toLowerCase();

      if (titleLower === q || item.stationName.toLowerCase() === q) score += 100;
      else if (titleLower.startsWith(q)) score += 75;
      else if (titleLower.includes(q)) score += 50;
      else if (subLower.includes(q)) score += 30;

      if (item.landmark) {
        for (const kw of item.landmark.keywords) {
          if (kw.includes(q)) score += 45;
        }
      }
      return { item, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.map((entry) => entry.item);
}

/**
 * Interpolate a polyline up to normalized progress p in [0, 1]
 */
export function slicePolylineByProgress(
  points: [number, number][],
  progress: number
): {
  slicedPoints: [number, number][];
  headPoint: [number, number];
} {
  if (points.length === 0) {
    return {
      slicedPoints: [],
      headPoint: [TORONTO_CENTRAL_NEXUS.x, TORONTO_CENTRAL_NEXUS.y],
    };
  }
  if (points.length === 1 || progress <= 0) {
    return {
      slicedPoints: [points[0]],
      headPoint: points[0],
    };
  }
  if (progress >= 1) {
    return {
      slicedPoints: points,
      headPoint: points[points.length - 1],
    };
  }

  // Compute segment lengths
  const segLengths: number[] = [];
  let totalLen = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const dx = points[i + 1][0] - points[i][0];
    const dy = points[i + 1][1] - points[i][1];
    const len = Math.hypot(dx, dy);
    segLengths.push(len);
    totalLen += len;
  }

  if (totalLen === 0) {
    return { slicedPoints: [points[0]], headPoint: points[0] };
  }

  const targetDist = totalLen * progress;
  const sliced: [number, number][] = [points[0]];
  let accum = 0;

  for (let i = 0; i < segLengths.length; i++) {
    const segLen = segLengths[i];
    if (accum + segLen <= targetDist) {
      sliced.push(points[i + 1]);
      accum += segLen;
    } else {
      const remain = targetDist - accum;
      const ratio = segLen > 0 ? remain / segLen : 0;
      const hx = points[i][0] + (points[i + 1][0] - points[i][0]) * ratio;
      const hy = points[i][1] + (points[i + 1][1] - points[i][1]) * ratio;
      const head: [number, number] = [hx, hy];
      sliced.push(head);
      return { slicedPoints: sliced, headPoint: head };
    }
  }

  return {
    slicedPoints: points,
    headPoint: points[points.length - 1],
  };
}

export interface SnakeEmergenceState {
  /** Tether from Central Union Nexus to the line's anchor station */
  tetherPoints: [number, number][];
  tetherOpacity: number;
  /** Branch A slithering from anchor station toward start of line */
  branchAPoints: [number, number][];
  branchAHead: [number, number] | null;
  /** Branch B slithering from anchor station toward end of line */
  branchBPoints: [number, number][];
  branchBHead: [number, number] | null;
  /** Station IDs along this line that the snake has already reached */
  reachedStationIds: Set<string>;
}

/**
 * Builds the tether path from Union Station (TORONTO_CENTRAL_NEXUS) to a line's anchor station
 * by following the actual Line 1 Yonge–University Subway track so the snake never cuts off-track.
 */
function buildOnTrackTetherFromUnion(anchorStation: StationNode): [number, number][] {
  const nexusPt: [number, number] = [TORONTO_CENTRAL_NEXUS.x, TORONTO_CENTRAL_NEXUS.y];
  const anchorPt: [number, number] = [anchorStation.x, anchorStation.y];

  const line1 = LINES_BY_ID['line-1'];
  if (line1) {
    const unionIdx = line1.stationIds.indexOf('union');
    const targetIdx = line1.stationIds.indexOf(anchorStation.id);
    if (unionIdx !== -1 && targetIdx !== -1 && unionIdx !== targetIdx) {
      const sliceIds =
        unionIdx < targetIdx
          ? line1.stationIds.slice(unionIdx, targetIdx + 1)
          : line1.stationIds.slice(targetIdx, unionIdx + 1).reverse();
      const chainStations = sliceIds
        .map((id) => STATIONS_BY_ID[id])
        .filter((s): s is StationNode => Boolean(s));
      const pts = getStationChainTrackCanvasPoints(chainStations, 'line-1');
      if (pts.length >= 2) {
        pts[0] = nexusPt;
        return pts;
      }
    }
  }

  return [nexusPt, anchorPt];
}

/**
 * Computes the "Snake emerging from the nest" ("con rắn bò ra khỏi tổ") geometry:
 * 1. Every line begins at the single fixed central point: TORONTO_CENTRAL_NEXUS (Union Station).
 * 2. Phase 1 (progress 0 -> 0.24): A glowing neon snake head shoots out from Union Station
 *    along the Line 1 spine to the line's emergenceAnchorId station.
 * 3. Phase 2 (progress 0.24 -> 1.0): From that anchor station, the line slithers outward
 *    in both directions along its exact Google Maps railway/subway track geometry.
 */
export function computeSnakeEmergenceGeometry(
  line: TransitLine,
  progress: number
): SnakeEmergenceState {
  const clamped = Math.max(0, Math.min(1, progress));
  const nexusPt: [number, number] = [TORONTO_CENTRAL_NEXUS.x, TORONTO_CENTRAL_NEXUS.y];

  const stations = line.stationIds
    .map((id) => STATIONS_BY_ID[id])
    .filter((s): s is StationNode => Boolean(s));

  if (stations.length === 0) {
    return {
      tetherPoints: [],
      tetherOpacity: 0,
      branchAPoints: [],
      branchAHead: null,
      branchBPoints: [],
      branchBHead: null,
      reachedStationIds: new Set(),
    };
  }

  let anchorIdx = stations.findIndex((s) => s.id === line.emergenceAnchorId);
  if (anchorIdx === -1) anchorIdx = Math.floor(stations.length / 2);
  const anchorStation = stations[anchorIdx];
  const anchorPt: [number, number] = [anchorStation.x, anchorStation.y];

  const distToAnchor = Math.hypot(anchorPt[0] - nexusPt[0], anchorPt[1] - nexusPt[1]);
  const hasTether = distToAnchor > 4;

  // If the line doesn't pass directly through Union, allocate first 24% of progress for the snake slithering from Union to Anchor
  const tetherPhaseEnd = hasTether ? 0.24 : 0.0;

  let tetherPoints: [number, number][] = [];
  let tetherOpacity = 0;

  if (hasTether) {
    const tetherProg = Math.min(1, clamped / tetherPhaseEnd);
    const rawTether = buildOnTrackTetherFromUnion(anchorStation);
    const sliced = slicePolylineByProgress(rawTether, tetherProg);
    tetherPoints = sliced.slicedPoints;
    // Fade out tether once the snake reaches full emergence so no duplicate lines remain
    tetherOpacity =
      clamped < 0.80
        ? 0.72
        : Math.max(0, 0.72 * (1 - (clamped - 0.80) / 0.18));
  }

  if (clamped <= tetherPhaseEnd && hasTether) {
    return {
      tetherPoints,
      tetherOpacity,
      branchAPoints: [],
      branchAHead: tetherPoints[tetherPoints.length - 1] ?? nexusPt,
      branchBPoints: [],
      branchBHead: null,
      reachedStationIds: new Set(),
    };
  }

  const routeProgress = hasTether
    ? (clamped - tetherPhaseEnd) / (1 - tetherPhaseEnd)
    : clamped;

  // Branch A: from anchorIdx down to 0, expanded with exact Google Maps parallel track curve waypoints
  const branchAStations = stations.slice(0, anchorIdx + 1).reverse();
  const branchACoords: [number, number][] = getStationChainTrackCanvasPoints(
    branchAStations,
    line.id
  );
  const slicedA = slicePolylineByProgress(branchACoords, routeProgress);

  // Branch B: from anchorIdx up to stations.length - 1, expanded with exact Google Maps parallel track curve waypoints
  const branchBStations = stations.slice(anchorIdx);
  const branchBCoords: [number, number][] = getStationChainTrackCanvasPoints(
    branchBStations,
    line.id
  );
  const slicedB = slicePolylineByProgress(branchBCoords, routeProgress);

  const reached = new Set<string>();
  const countA = Math.floor(branchAStations.length * routeProgress + 0.05);
  for (let i = 0; i < Math.min(branchAStations.length, countA); i++) {
    reached.add(branchAStations[i].id);
  }
  const countB = Math.floor(branchBStations.length * routeProgress + 0.05);
  for (let i = 0; i < Math.min(branchBStations.length, countB); i++) {
    reached.add(branchBStations[i].id);
  }
  if (routeProgress > 0.01) {
    reached.add(anchorStation.id);
  }

  return {
    tetherPoints,
    tetherOpacity,
    branchAPoints: slicedA.slicedPoints,
    branchAHead: routeProgress < 1 && branchACoords.length > 1 ? slicedA.headPoint : null,
    branchBPoints: slicedB.slicedPoints,
    branchBHead: routeProgress < 1 && branchBCoords.length > 1 ? slicedB.headPoint : null,
    reachedStationIds: reached,
  };
}
