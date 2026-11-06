import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  APIProvider,
  AdvancedMarker,
  Map as GoogleMap,
  useMap,
  useMapsLibrary,
} from '@vis.gl/react-google-maps';
import {
  Building2,
  Compass,
  Eye,
  Landmark,
  LocateFixed,
  MapPin,
  Minus,
  Navigation,
  Play,
  Plus,
  ShoppingBag,
  Sparkles,
  Train,
  Utensils,
  X,
} from 'lucide-react';
import {
  ALL_STATIONS,
  STATIONS_BY_ID,
  TORONTO_CENTRAL_NEXUS,
  TORONTO_LANDMARKS,
  TRANSIT_LINES,
  StationNode,
  TorontoLandmark,
  TransitLine,
  canvasPointToLatLng,
  getStationChainTrackLatLngs,
  getStationTrackLatLng,
} from '../data/torontoTransitData';
import {
  RouteResult,
  computeSnakeEmergenceGeometry,
  calculateHaversineKm,
} from '../utils/pathfinding';

declare global {
  namespace google.maps {
    class Polyline {
      constructor(opts?: Record<string, unknown>);
      setMap(map: unknown): void;
      addListener(eventName: string, handler: () => void): void;
    }
  }
}

export type TransitLayerFilter = 'all' | 'rail' | 'bus';
type PlaceCategoryFilter = 'all' | 'landmarks' | 'shopping' | 'live-shops' | 'live-dining' | 'hidden';

interface LiveGooglePlace {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  rating?: number;
  category: 'shop' | 'dining' | 'attraction';
  nearestStation: StationNode;
  walkingMinutes: number;
}

interface TorontoNeonMapProps {
  emergenceProgress: number;
  onReplayEmergence: () => void;
  layerFilter: TransitLayerFilter;
  onChangeLayerFilter: (filter: TransitLayerFilter) => void;
  selectedLineId: string | null;
  onSelectLine: (lineId: string | null) => void;
  selectedStation: StationNode | null;
  onSelectStation: (station: StationNode | null) => void;
  activeRoute: RouteResult | null;
  onSetRouteOrigin: (stationId: string, landmark?: TorontoLandmark) => void;
  onSetRouteDestination: (stationId: string, landmark?: TorontoLandmark) => void;
  onBackToCanada: () => void;
}

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
const USAGE_ATTRIBUTION_IDS = ['gmp_mcp_codeassist_v1_aistudio'];

function findNearestStation(lat: number, lng: number): { station: StationNode; walkingMinutes: number; walkingMeters: number } {
  let bestStation = ALL_STATIONS[0];
  let bestDistKm = Infinity;
  for (const st of ALL_STATIONS) {
    const d = calculateHaversineKm(lat, lng, st.lat, st.lng);
    if (d < bestDistKm) {
      bestDistKm = d;
      bestStation = st;
    }
  }
  const walkingMeters = Math.max(60, Math.round(bestDistKm * 1000));
  const walkingMinutes = Math.max(1, Math.round(walkingMeters / 78));
  return { station: bestStation, walkingMinutes, walkingMeters };
}

/**
 * Imperative Google Maps Polyline layer for the glowing neon Metro, LRT, and Express Bus lines,
 * including the "Snake emerging from Union Station" animation and shortest-path route glow.
 */
const NeonTransitPolylinesOverlay: React.FC<{
  visibleLines: TransitLine[];
  lineEmergenceMap: Map<string, ReturnType<typeof computeSnakeEmergenceGeometry>>;
  emergenceProgress: number;
  showNestVectors: boolean;
  selectedLineId: string | null;
  onSelectLine: (lineId: string | null) => void;
  activeRoute: RouteResult | null;
}> = ({
  visibleLines,
  lineEmergenceMap,
  emergenceProgress,
  showNestVectors,
  selectedLineId,
  onSelectLine,
  activeRoute,
}) => {
  const map = useMap();
  const polylinesRef = useRef<google.maps.Polyline[]>([]);

  useEffect(() => {
    if (!map || typeof google === 'undefined' || !google.maps) return;

    // Clear previous polylines
    for (const poly of polylinesRef.current) {
      poly.setMap(null);
    }
    polylinesRef.current = [];

    const created: google.maps.Polyline[] = [];

    // 1. Central Union Station Tethers ("Con rắn bò ra khỏi tổ" origin paths during emergence)
    if (showNestVectors || emergenceProgress < 0.96) {
      for (const line of visibleLines) {
        const state = lineEmergenceMap.get(line.id);
        if (!state || state.tetherPoints.length < 2) continue;

        const path = state.tetherPoints.map(([x, y]) => canvasPointToLatLng(x, y));
        const tetherOpacity = emergenceProgress < 0.96 ? state.tetherOpacity : 0.28;
        if (tetherOpacity <= 0.01) continue;

        const tetherGlow = new google.maps.Polyline({
          path,
          geodesic: false,
          strokeColor: line.color,
          strokeOpacity: tetherOpacity * 0.45,
          strokeWeight: 9,
          clickable: false,
          zIndex: 5,
          map,
        });

        const tetherCore = new google.maps.Polyline({
          path,
          geodesic: false,
          strokeColor: line.color,
          strokeOpacity: tetherOpacity,
          strokeWeight: 2.8,
          clickable: false,
          zIndex: 6,
          map,
        });

        created.push(tetherGlow, tetherCore);
      }
    }

    // 2. Neon Subway, LRT, and Express Bus Lines (Slithering outward from Anchor to Termini)
    for (const line of visibleLines) {
      const state = lineEmergenceMap.get(line.id);
      if (!state) continue;

      const isLineSelected = selectedLineId === line.id;
      const isLineInRoute = activeRoute
        ? activeRoute.legs.some((leg) => leg.line.id === line.id)
        : false;

      let lineOpacity = 1;
      if (activeRoute) {
        lineOpacity = isLineInRoute ? 0.45 : 0.22;
      } else if (selectedLineId) {
        lineOpacity = isLineSelected ? 1 : 0.24;
      }

      const isBus = line.mode === 'bus';
      const branches = [state.branchAPoints, state.branchBPoints];

      for (const branchPts of branches) {
        if (!branchPts || branchPts.length < 2) continue;
        const path = branchPts.map(([x, y]) => canvasPointToLatLng(x, y));

        // Outer neon halo
        const outerGlow = new google.maps.Polyline({
          path,
          geodesic: false,
          strokeColor: line.color,
          strokeOpacity: 0.24 * lineOpacity,
          strokeWeight: isBus ? 7.5 : 9.5,
          clickable: true,
          zIndex: isLineSelected ? 28 : 12,
          map,
        });

        // Main neon tube
        const mainStroke = new google.maps.Polyline({
          path,
          geodesic: false,
          strokeColor: line.color,
          strokeOpacity: (isBus ? 0.85 : 0.95) * lineOpacity,
          strokeWeight: isBus ? 3.0 : 3.8,
          clickable: true,
          zIndex: isLineSelected ? 29 : 18,
          map,
        });

        // Inner white-hot core
        const innerCore = new google.maps.Polyline({
          path,
          geodesic: false,
          strokeColor: line.coreColor,
          strokeOpacity: (isBus ? 0.78 : 0.94) * lineOpacity,
          strokeWeight: isBus ? 1.0 : 1.35,
          clickable: false,
          zIndex: isLineSelected ? 30 : 20,
          map,
        });

        const handleClick = () => {
          onSelectLine(selectedLineId === line.id ? null : line.id);
        };
        outerGlow.addListener('click', handleClick);
        mainStroke.addListener('click', handleClick);

        created.push(outerGlow, mainStroke, innerCore);
      }
    }

    // 3. Active Shortest-Path Route Highlight Overlay (hugging exact parallel Google Maps track curves)
    if (activeRoute && emergenceProgress >= 0.5) {
      for (const leg of activeRoute.legs) {
        const stopsList = leg.stops || [];
        const path = getStationChainTrackLatLngs(stopsList, leg.line.id);
        if (path.length < 2) continue;

        const routeOuterAura = new google.maps.Polyline({
          path,
          geodesic: false,
          strokeColor: leg.line.color,
          strokeOpacity: 0.42,
          strokeWeight: 15,
          clickable: false,
          zIndex: 45,
          map,
        });

        const routeMainTube = new google.maps.Polyline({
          path,
          geodesic: false,
          strokeColor: leg.line.color,
          strokeOpacity: 1,
          strokeWeight: 6.5,
          clickable: false,
          zIndex: 48,
          map,
        });

        const routeHotCore = new google.maps.Polyline({
          path,
          geodesic: false,
          strokeColor: '#FFFFFF',
          strokeOpacity: 0.96,
          strokeWeight: 2.3,
          clickable: false,
          zIndex: 50,
          map,
        });

        created.push(routeOuterAura, routeMainTube, routeHotCore);
      }
    }

    polylinesRef.current = created;

    return () => {
      for (const poly of created) {
        poly.setMap(null);
      }
    };
  }, [
    map,
    visibleLines,
    lineEmergenceMap,
    emergenceProgress,
    showNestVectors,
    selectedLineId,
    onSelectLine,
    activeRoute,
  ]);

  return null;
};

/**
 * Inner Map Controller handling camera presets, station/landmark selection, and live Places API (New) discovery.
 */
const TorontoMapInner: React.FC<
  TorontoNeonMapProps & {
    placeFilter: PlaceCategoryFilter;
    setPlaceFilter: (f: PlaceCategoryFilter) => void;
    selectedLandmark: TorontoLandmark | null;
    setSelectedLandmark: (lm: TorontoLandmark | null) => void;
    livePlaces: LiveGooglePlace[];
    setLivePlaces: React.Dispatch<React.SetStateAction<LiveGooglePlace[]>>;
    selectedLivePlace: LiveGooglePlace | null;
    setSelectedLivePlace: (lp: LiveGooglePlace | null) => void;
    isLoadingLivePlaces: boolean;
    setIsLoadingLivePlaces: (loading: boolean) => void;
    showNestVectors: boolean;
  }
> = ({
  emergenceProgress,
  layerFilter,
  selectedLineId,
  onSelectLine,
  selectedStation,
  onSelectStation,
  activeRoute,
  onSetRouteOrigin,
  onSetRouteDestination,
  placeFilter,
  selectedLandmark,
  setSelectedLandmark,
  livePlaces,
  setLivePlaces,
  selectedLivePlace,
  setSelectedLivePlace,
  setIsLoadingLivePlaces,
  showNestVectors,
}) => {
  const map = useMap();
  const placesLib = useMapsLibrary('places');
  const [hoveredStationId, setHoveredStationId] = useState<string | null>(null);
  const [hoveredLandmarkId, setHoveredLandmarkId] = useState<string | null>(null);
  const [currentZoom, setCurrentZoom] = useState<number>(11.8);

  useEffect(() => {
    if (!map) return;
    const listener = map.addListener('zoom_changed', () => {
      setCurrentZoom(map.getZoom() || 11.8);
    });
    return () => {
      listener.remove();
    };
  }, [map]);

  const visibleLines = useMemo(
    () =>
      TRANSIT_LINES.filter((line) => {
        if (selectedLineId === line.id) return true;
        if (activeRoute && activeRoute.legs.some((leg) => leg.line.id === line.id)) return true;
        if (layerFilter === 'rail') return line.status === 'Operational';
        if (layerFilter === 'bus') return line.status === 'Master Plan Expansion';
        return true;
      }),
    [layerFilter, selectedLineId, activeRoute]
  );

  // Precompute snake emergence state for each visible line
  const { lineEmergenceMap, globallyReachedStations } = useMemo(() => {
    const mapInstance = new Map<string, ReturnType<typeof computeSnakeEmergenceGeometry>>();
    const reached = new Set<string>();
    for (const line of visibleLines) {
      const state = computeSnakeEmergenceGeometry(line, emergenceProgress);
      mapInstance.set(line.id, state);
      for (const stId of state.reachedStationIds) {
        reached.add(stId);
      }
    }
    return { lineEmergenceMap: mapInstance, globallyReachedStations: reached };
  }, [visibleLines, emergenceProgress]);

  // Collect station IDs participating in active shortest-path route and map each station to its route leg line ID
  const { routeStationIds, routeStationLineMap } = useMemo(() => {
    const idSet = new Set<string>();
    const lineMap = new Map<string, string>();
    if (activeRoute) {
      for (const leg of activeRoute.legs) {
        for (const st of leg.stops) {
          idSet.add(st.id);
          if (!lineMap.has(st.id)) {
            lineMap.set(st.id, leg.line.id);
          }
        }
      }
      for (const st of activeRoute.allStationsInOrder) {
        idSet.add(st.id);
      }
    }
    return { routeStationIds: idSet, routeStationLineMap: lineMap };
  }, [activeRoute]);

  const routeTransferIds = useMemo(() => {
    const set = new Set<string>();
    if (activeRoute && activeRoute.legs.length > 1) {
      for (let i = 0; i < activeRoute.legs.length - 1; i++) {
        set.add(activeRoute.legs[i].toStation.id);
      }
    }
    return set;
  }, [activeRoute]);

  // Pan smoothly when user selects a station
  useEffect(() => {
    if (map && selectedStation) {
      const targetLineId =
        (selectedLineId && selectedStation.lines.includes(selectedLineId)
          ? selectedLineId
          : null) ||
        routeStationLineMap.get(selectedStation.id) ||
        selectedStation.lines[0];
      const pos = getStationTrackLatLng(selectedStation.id, targetLineId);
      map.panTo(pos);
      const currentZoom = map.getZoom() || 12;
      if (currentZoom < 13) {
        map.setZoom(13.4);
      }
    }
  }, [map, selectedStation?.id, selectedLineId, routeStationLineMap]);

  // Pan smoothly when user selects a landmark
  useEffect(() => {
    if (map && selectedLandmark && selectedLandmark.lat && selectedLandmark.lng) {
      map.panTo({ lat: selectedLandmark.lat, lng: selectedLandmark.lng });
      const currentZoom = map.getZoom() || 12;
      if (currentZoom < 13.5) {
        map.setZoom(13.8);
      }
    }
  }, [map, selectedLandmark?.id]);

  // Query live Toronto shops or dining via Google Places API (New) when requested
  useEffect(() => {
    if (!placesLib || (placeFilter !== 'live-shops' && placeFilter !== 'live-dining')) {
      return;
    }

    let cancelled = false;
    const fetchLivePlaces = async () => {
      setIsLoadingLivePlaces(true);
      try {
        const textQuery =
          placeFilter === 'live-shops'
            ? 'popular shopping malls retail stores markets in Toronto'
            : 'popular restaurants cafes food markets in Downtown Toronto';

        const { places } = await placesLib.Place.searchByText({
          textQuery,
          fields: ['id', 'displayName', 'location', 'formattedAddress', 'rating'],
          locationBias: { lat: 43.6532, lng: -79.3832 },
          maxResultCount: 12,
        });

        if (cancelled) return;

        const mapped: LiveGooglePlace[] = [];
        for (const p of places || []) {
          if (!p.location) continue;
          const lat = p.location.lat();
          const lng = p.location.lng();
          const nearest = findNearestStation(lat, lng);
          mapped.push({
            id: p.id || `${lat}-${lng}`,
            name: p.displayName || 'Toronto Place',
            address: p.formattedAddress || 'Toronto, ON',
            lat,
            lng,
            rating: p.rating ?? undefined,
            category: placeFilter === 'live-shops' ? 'shop' : 'dining',
            nearestStation: nearest.station,
            walkingMinutes: nearest.walkingMinutes,
          });
        }
        setLivePlaces(mapped);
      } catch (err) {
        const msg = String((err as Error)?.message || err);
        if (/429|RESOURCE_EXHAUSTED|OverQuota/i.test(msg)) {
          window.dispatchEvent(
            new CustomEvent('gmp-quota-exceeded', {
              detail: { source: 'web-service', error: err },
            })
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoadingLivePlaces(false);
        }
      }
    };

    fetchLivePlaces();
    return () => {
      cancelled = true;
    };
  }, [placesLib, placeFilter, setLivePlaces, setIsLoadingLivePlaces]);

  // Since Google Maps natively displays malls, parks, museums, and shops, keep only the iconic CN Tower pin on the map
  const visibleLandmarks = useMemo(() => {
    if (placeFilter === 'hidden') {
      return [];
    }
    return TORONTO_LANDMARKS.filter((lm) => lm.id === 'lm-cn-tower');
  }, [placeFilter]);

  return (
    <>
      {/* Imperative Glowing Neon Metro & Bus Polylines */}
      <NeonTransitPolylinesOverlay
        visibleLines={visibleLines}
        lineEmergenceMap={lineEmergenceMap}
        emergenceProgress={emergenceProgress}
        showNestVectors={showNestVectors}
        selectedLineId={selectedLineId}
        onSelectLine={onSelectLine}
        activeRoute={activeRoute}
      />

      {/* Central Union Station Nexus ("The Nest" / Điểm cố định chung) - only shown during emergence or when Nest Vectors are toggled */}
      {(emergenceProgress < 0.99 || showNestVectors) && (
        <AdvancedMarker
          position={{ lat: TORONTO_CENTRAL_NEXUS.lat, lng: TORONTO_CENTRAL_NEXUS.lng }}
          zIndex={35}
          onClick={() => {
            const unionSt = STATIONS_BY_ID['union'];
            if (unionSt) onSelectStation(unionSt);
          }}
        >
          <div className="w-5 h-5 translate-y-1/2 relative flex items-center justify-center cursor-pointer group">
            <span className="absolute w-7 h-7 rounded-full bg-amber-400/25 animate-ping pointer-events-none" />
            <span className="w-3.5 h-3.5 rounded-full bg-[#FFD600] border-[1.5px] border-white shadow-[0_0_12px_#FFD600] flex items-center justify-center">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-950" />
            </span>
          </div>
        </AdvancedMarker>
      )}

      {/* Slithering Snake Heads while emerging (0 < emergenceProgress < 0.99) */}
      {emergenceProgress < 0.99 &&
        visibleLines.map((line) => {
          const state = lineEmergenceMap.get(line.id);
          if (!state) return null;
          const posA = state.branchAHead
            ? canvasPointToLatLng(state.branchAHead[0], state.branchAHead[1])
            : null;
          const posB = state.branchBHead
            ? canvasPointToLatLng(state.branchBHead[0], state.branchBHead[1])
            : null;
          return (
            <React.Fragment key={`snake-heads-${line.id}`}>
              {posA && (
                <AdvancedMarker position={posA} zIndex={60}>
                  <div
                    className="w-2.5 h-2.5 translate-y-1/2 rounded-full border-[1.5px] border-white"
                    style={{
                      backgroundColor: line.color,
                      boxShadow: `0 0 12px ${line.color}, 0 0 20px ${line.color}`,
                    }}
                  />
                </AdvancedMarker>
              )}
              {posB && (
                <AdvancedMarker position={posB} zIndex={60}>
                  <div
                    className="w-2.5 h-2.5 translate-y-1/2 rounded-full border-[1.5px] border-white"
                    style={{
                      backgroundColor: line.color,
                      boxShadow: `0 0 12px ${line.color}, 0 0 20px ${line.color}`,
                    }}
                  />
                </AdvancedMarker>
              )}
            </React.Fragment>
          );
        })}

      {/* Metro, LRT & Express Bus Station Nodes - ONLY visible when a Line or Route (or Station) is selected, and snapped 100% onto the rendered line */}
      {ALL_STATIONS.map((station) => {
        const hasActiveSelection = Boolean(
          selectedLineId || activeRoute || selectedStation
        );
        if (!hasActiveSelection) return null;

        const isVisibleInLayer = station.lines.some((lId) =>
          visibleLines.some((vl) => vl.id === lId)
        );
        if (!isVisibleInLayer) return null;

        const isReached = globallyReachedStations.has(station.id);
        if (!isReached && emergenceProgress < 0.98) return null;

        const isInRoute = routeStationIds.has(station.id);
        const isTransfer = routeTransferIds.has(station.id);
        const isOrigin = activeRoute?.originStation.id === station.id;
        const isDest = activeRoute?.destinationStation.id === station.id;
        const isSelected = selectedStation?.id === station.id;
        const isHovered = hoveredStationId === station.id;
        const isInSelectedLine = Boolean(
          selectedLineId && station.lines.includes(selectedLineId)
        );

        // Only display dots belonging to the active route or selected line (or explicitly inspected station)
        if (activeRoute) {
          if (!isInRoute && !isSelected) return null;
        } else if (selectedLineId) {
          if (!isInSelectedLine && !isSelected) return null;
        } else if (!isSelected) {
          return null;
        }

        // Determine the exact line whose rendered track polyline this station dot should sit on
        const targetLineId = activeRoute
          ? routeStationLineMap.get(station.id) ||
            (selectedLineId && station.lines.includes(selectedLineId)
              ? selectedLineId
              : station.lines[0])
          : selectedLineId && station.lines.includes(selectedLineId)
            ? selectedLineId
            : station.lines[0];

        const primaryLine =
          TRANSIT_LINES.find((l) => l.id === targetLineId) ||
          TRANSIT_LINES.find((l) => station.lines.includes(l.id));

        const strokeColor = primaryLine ? primaryLine.color : '#38BDF8';
        const snappedTrackPos = getStationTrackLatLng(station.id, targetLineId);

        const isLineTerminal = Boolean(
          primaryLine &&
            (primaryLine.stationIds[0] === station.id ||
              primaryLine.stationIds[primaryLine.stationIds.length - 1] ===
                station.id)
        );

        const showLabel =
          isOrigin ||
          isDest ||
          isTransfer ||
          isSelected ||
          isHovered ||
          currentZoom >= 13.2 ||
          (activeRoute &&
            isInRoute &&
            (activeRoute.allStationsInOrder.length <= 10 ||
              station.isInterchange)) ||
          (selectedLineId &&
            isInSelectedLine &&
            primaryLine &&
            (primaryLine.stationIds.length <= 12 ||
              isLineTerminal ||
              station.id === 'union' ||
              station.id === 'bloor-yonge' ||
              station.id === 'spadina' ||
              station.id === 'kennedy' ||
              station.id === 'kipling'));

        return (
          <AdvancedMarker
            key={`${station.id}-${targetLineId || 'default'}`}
            position={snappedTrackPos}
            zIndex={
              isOrigin || isDest
                ? 70
                : isTransfer || isSelected || isHovered
                ? 55
                : station.isInterchange
                ? 30
                : 22
            }
            onClick={() => {
              setSelectedLandmark(null);
              setSelectedLivePlace(null);
              onSelectStation(station);
            }}
          >
            <div
              data-testid={`station-dot-${station.id}`}
              onMouseEnter={() => setHoveredStationId(station.id)}
              onMouseLeave={() => setHoveredStationId(null)}
              className="w-5 h-5 translate-y-1/2 relative flex items-center justify-center cursor-pointer group"
            >
              {/* Station Circle Node centered dead-on the rendered track stroke */}
              <div
                className={`rounded-full transition-transform duration-150 group-hover:scale-150 ${
                  isOrigin || isDest || isTransfer || isSelected
                    ? 'w-2.5 h-2.5 bg-white border-2'
                    : 'w-2 h-2 bg-slate-950 border-[1.5px]'
                }`}
                style={{
                  borderColor:
                    isOrigin || isDest || isTransfer || isSelected
                      ? strokeColor
                      : '#FFFFFF',
                  backgroundColor:
                    isOrigin || isDest || isTransfer || isSelected
                      ? '#FFFFFF'
                      : strokeColor,
                  boxShadow:
                    isOrigin || isDest || isTransfer || isSelected
                      ? `0 0 10px ${strokeColor}`
                      : `0 0 6px ${strokeColor}`,
                }}
              />

              {/* Station Name Label */}
              {showLabel && (
                <div
                  className={`absolute left-4 whitespace-nowrap px-1.5 py-0.5 rounded text-[10px] font-semibold tracking-tight pointer-events-none border ${
                    isOrigin || isDest || isTransfer || isSelected
                      ? 'bg-slate-950/95 text-white border-cyan-400/60 shadow-lg'
                      : 'bg-slate-950/85 text-slate-200 border-slate-800/80'
                  }`}
                >
                  {station.name}
                </div>
              )}

              {/* Active Route START / TRANSFER / END Callout Badge */}
              {activeRoute && (isOrigin || isDest || isTransfer) && (
                <div
                  className={`absolute -top-6 px-2 py-0.5 rounded-md text-[10px] font-extrabold tracking-wider uppercase whitespace-nowrap shadow-lg border pointer-events-none ${
                    isOrigin
                      ? 'bg-emerald-950/95 text-emerald-300 border-emerald-400 shadow-emerald-950/80'
                      : isDest
                      ? 'bg-cyan-950/95 text-cyan-300 border-cyan-400 shadow-cyan-950/80'
                      : 'bg-amber-950/95 text-amber-300 border-amber-400 shadow-amber-950/80'
                  }`}
                >
                  {isOrigin ? 'START' : isDest ? 'END' : 'TRANSFER'}
                </div>
              )}
            </div>
          </AdvancedMarker>
        );
      })}

      {/* Curated Iconic Toronto Landmarks & Shopping Hubs (CN Tower, Eaton Centre, Yorkdale, etc.) */}
      {visibleLandmarks.map((lm) => {
        if (!lm.lat || !lm.lng) return null;
        const isShopping =
          lm.category === 'Shopping & Culture' || lm.category === 'District';
        const isSelected = selectedLandmark?.id === lm.id;
        const isHovered = hoveredLandmarkId === lm.id;

        // Flagship landmarks always show full label; dense secondary downtown pins expand on zoom >= 12.8 or hover
        const isPrimaryFlagship =
          lm.id === 'lm-cn-tower' ||
          lm.id === 'lm-eaton-centre' ||
          lm.id === 'lm-rom' ||
          lm.id === 'lm-casa-loma' ||
          lm.id === 'lm-distillery' ||
          lm.id === 'lm-kensington' ||
          lm.id === 'lm-yorkdale' ||
          lm.id === 'lm-square-one' ||
          lm.id === 'lm-scarborough-tc' ||
          lm.id === 'lm-fairview-mall' ||
          lm.id === 'lm-high-park' ||
          lm.id === 'lm-pearson' ||
          lm.id === 'lm-sunnybrook' ||
          lm.id === 'lm-york-u' ||
          lm.id === 'lm-toronto-zoo';

        const showFullText =
          isPrimaryFlagship || isSelected || isHovered || currentZoom >= 12.8;

        const isTopHero = lm.id === 'lm-cn-tower' || lm.id === 'lm-eaton-centre';

        return (
          <AdvancedMarker
            key={lm.id}
            position={{ lat: lm.lat, lng: lm.lng }}
            zIndex={isSelected || isHovered ? 85 : isTopHero ? 68 : isPrimaryFlagship ? 48 : 38}
            onClick={() => {
              onSelectStation(null);
              setSelectedLivePlace(null);
              setSelectedLandmark(lm);
            }}
          >
            <div
              onMouseEnter={() => setHoveredLandmarkId(lm.id)}
              onMouseLeave={() => setHoveredLandmarkId(null)}
              className={`flex items-center gap-1.5 rounded-full border backdrop-blur-md cursor-pointer transition-all duration-150 hover:scale-105 ${
                showFullText ? 'px-2 py-1' : 'p-1'
              } ${
                isSelected
                  ? 'bg-slate-900 border-amber-400 text-white shadow-[0_0_18px_rgba(251,191,36,0.65)]'
                  : isShopping
                  ? 'bg-slate-950/92 border-pink-500/65 text-pink-100 hover:border-pink-400 shadow-[0_2px_10px_rgba(236,72,153,0.35)]'
                  : 'bg-slate-950/92 border-amber-400/70 text-amber-100 hover:border-amber-300 shadow-[0_2px_10px_rgba(251,191,36,0.35)]'
              }`}
            >
              <span
                className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${
                  isShopping
                    ? 'bg-pink-500/25 text-pink-300'
                    : 'bg-amber-500/25 text-amber-300'
                }`}
              >
                {isShopping ? (
                  <ShoppingBag className="w-2.5 h-2.5" />
                ) : (
                  <Landmark className="w-2.5 h-2.5" />
                )}
              </span>
              {showFullText && (
                <span className="text-[10.5px] font-semibold tracking-tight whitespace-nowrap">
                  {lm.shortLabel || lm.name}
                </span>
              )}
            </div>
          </AdvancedMarker>
        );
      })}

      {/* Live Google Places API (New) Results (when user selects Live Shops or Live Dining) */}
      {(placeFilter === 'live-shops' || placeFilter === 'live-dining') &&
        livePlaces.map((lp) => {
          const isSelected = selectedLivePlace?.id === lp.id;
          return (
            <AdvancedMarker
              key={lp.id}
              position={{ lat: lp.lat, lng: lp.lng }}
              zIndex={isSelected ? 82 : 46}
              onClick={() => {
                onSelectStation(null);
                setSelectedLandmark(null);
                setSelectedLivePlace(lp);
              }}
            >
              <div
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border backdrop-blur-md cursor-pointer transition-transform hover:scale-105 ${
                  isSelected
                    ? 'bg-slate-900 border-cyan-400 text-white shadow-[0_0_16px_rgba(34,211,238,0.6)]'
                    : 'bg-slate-950/92 border-cyan-400/60 text-cyan-100 shadow-md'
                }`}
              >
                {lp.category === 'shop' ? (
                  <ShoppingBag className="w-3 h-3 text-cyan-300 shrink-0" />
                ) : (
                  <Utensils className="w-3 h-3 text-amber-300 shrink-0" />
                )}
                <span className="text-[10.5px] font-semibold whitespace-nowrap max-w-[140px] truncate">
                  {lp.name}
                </span>
              </div>
            </AdvancedMarker>
          );
        })}
    </>
  );
};

export const TorontoNeonMap: React.FC<TorontoNeonMapProps> = (props) => {
  const {
    emergenceProgress,
    onReplayEmergence,
    layerFilter,
    onChangeLayerFilter,
    selectedLineId,
    onSelectLine,
    selectedStation,
    onSelectStation,
    activeRoute,
    onSetRouteOrigin,
    onSetRouteDestination,
    onBackToCanada,
  } = props;

  const [placeFilter, setPlaceFilter] = useState<PlaceCategoryFilter>('all');
  const [selectedLandmark, setSelectedLandmark] = useState<TorontoLandmark | null>(null);
  const [livePlaces, setLivePlaces] = useState<LiveGooglePlace[]>([]);
  const [selectedLivePlace, setSelectedLivePlace] = useState<LiveGooglePlace | null>(null);
  const [isLoadingLivePlaces, setIsLoadingLivePlaces] = useState<boolean>(false);
  const [showNestVectors, setShowNestVectors] = useState<boolean>(false);

  return (
    <div
      className="relative w-full h-full bg-[#06101E] overflow-hidden select-none"
      data-testid="toronto-neon-map-stage"
      data-emergence-progress={emergenceProgress.toFixed(2)}
    >
      <APIProvider
        apiKey={GOOGLE_MAPS_API_KEY}
        language="en"
        region="CA"
      >
        <GoogleMap
          defaultCenter={{ lat: 43.675, lng: -79.428 }}
          defaultZoom={11.5}
          mapId="DEMO_MAP_ID"
          colorScheme="DARK"
          gestureHandling="greedy"
          disableDefaultUI={true}
          internalUsageAttributionIds={USAGE_ATTRIBUTION_IDS}
          className="w-full h-full"
        >
          <TorontoMapInner
            {...props}
            placeFilter={placeFilter}
            setPlaceFilter={setPlaceFilter}
            selectedLandmark={selectedLandmark}
            setSelectedLandmark={setSelectedLandmark}
            livePlaces={livePlaces}
            setLivePlaces={setLivePlaces}
            selectedLivePlace={selectedLivePlace}
            setSelectedLivePlace={setSelectedLivePlace}
            isLoadingLivePlaces={isLoadingLivePlaces}
            setIsLoadingLivePlaces={setIsLoadingLivePlaces}
            showNestVectors={showNestVectors}
          />
          <MapControlsOverlay
            layerFilter={layerFilter}
            onChangeLayerFilter={onChangeLayerFilter}
            placeFilter={placeFilter}
            setPlaceFilter={setPlaceFilter}
            isLoadingLivePlaces={isLoadingLivePlaces}
            onReplayEmergence={onReplayEmergence}
            showNestVectors={showNestVectors}
            setShowNestVectors={setShowNestVectors}
            onBackToCanada={onBackToCanada}
          />
        </GoogleMap>
      </APIProvider>

      {/* Selected Landmark / Shopping Hub Inspector Card */}
      {selectedLandmark && (
        <div className="absolute bottom-5 left-5 z-20 w-80 bg-slate-950/95 backdrop-blur-md border border-amber-500/40 rounded-xl p-4 shadow-2xl">
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <div>
              <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider text-amber-400">
                {selectedLandmark.category === 'Shopping & Culture' ? (
                  <ShoppingBag className="w-3 h-3" />
                ) : (
                  <Landmark className="w-3 h-3" />
                )}
                {selectedLandmark.category}
              </span>
              <h3 className="text-sm font-bold text-white font-display leading-snug mt-0.5">
                {selectedLandmark.name}
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setSelectedLandmark(null)}
              className="text-slate-400 hover:text-white text-xs px-1.5 py-0.5 rounded bg-slate-900 cursor-pointer"
              aria-label="Close landmark details"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed mb-3">
            {selectedLandmark.description}
          </p>

          <div className="flex items-center justify-between text-[11px] text-slate-300 bg-slate-900/90 border border-slate-800 rounded-lg px-2.5 py-1.5 mb-3">
            <span className="flex items-center gap-1.5">
              <Train className="w-3.5 h-3.5 text-cyan-400" />
              Nearest:{' '}
              <strong className="text-white">
                {STATIONS_BY_ID[selectedLandmark.stationId]?.name || 'Union Station'}
              </strong>
            </span>
            <span className="text-emerald-400 font-mono font-semibold">
              {selectedLandmark.walkingMinutes} min walk
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() =>
                onSetRouteOrigin(selectedLandmark.stationId, selectedLandmark)
              }
              className="px-2.5 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-xs font-semibold transition-colors cursor-pointer"
            >
              Route from Here
            </button>
            <button
              type="button"
              onClick={() =>
                onSetRouteDestination(selectedLandmark.stationId, selectedLandmark)
              }
              className="px-2.5 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 text-xs font-semibold transition-colors cursor-pointer"
            >
              Route to Here
            </button>
          </div>
        </div>
      )}

      {/* Selected Live Google Place Inspector Card */}
      {selectedLivePlace && (
        <div className="absolute bottom-5 left-5 z-20 w-80 bg-slate-950/95 backdrop-blur-md border border-cyan-500/40 rounded-xl p-4 shadow-2xl">
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <div>
              <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider text-cyan-400">
                <Sparkles className="w-3 h-3" />
                Google Maps Place
              </span>
              <h3 className="text-sm font-bold text-white font-display leading-snug mt-0.5">
                {selectedLivePlace.name}
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setSelectedLivePlace(null)}
              className="text-slate-400 hover:text-white text-xs px-1.5 py-0.5 rounded bg-slate-900 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <p className="text-xs text-slate-400 mb-2.5">{selectedLivePlace.address}</p>

          <div className="flex items-center justify-between text-[11px] text-slate-300 bg-slate-900/90 border border-slate-800 rounded-lg px-2.5 py-1.5 mb-3">
            <span className="flex items-center gap-1.5">
              <Train className="w-3.5 h-3.5 text-cyan-400" />
              Nearest: <strong className="text-white">{selectedLivePlace.nearestStation.name}</strong>
            </span>
            <span className="text-emerald-400 font-mono font-semibold">
              ~{selectedLivePlace.walkingMinutes}m walk
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => onSetRouteOrigin(selectedLivePlace.nearestStation.id)}
              className="px-2.5 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-xs font-semibold transition-colors cursor-pointer"
            >
              Set as Start
            </button>
            <button
              type="button"
              onClick={() => onSetRouteDestination(selectedLivePlace.nearestStation.id)}
              className="px-2.5 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 text-xs font-semibold transition-colors cursor-pointer"
            >
              Set as Destination
            </button>
          </div>
        </div>
      )}

      {/* Selected Metro Station Quick Inspector Card */}
      {selectedStation && !selectedLandmark && !selectedLivePlace && (
        <div className="absolute bottom-5 left-5 z-20 w-80 bg-slate-950/95 backdrop-blur-md border border-slate-700/80 rounded-xl p-4 shadow-2xl">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400">
                {selectedStation.municipality} •{' '}
                {selectedStation.isInterchange ? 'Interchange Hub' : 'Transit Station'}
              </span>
              <h3 className="text-base font-bold text-white font-display">
                {selectedStation.name}
              </h3>
              {selectedStation.streetAddress && (
                <p className="text-xs text-slate-400">{selectedStation.streetAddress}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => onSelectStation(null)}
              className="text-slate-400 hover:text-white text-xs px-1.5 py-0.5 rounded bg-slate-800/80 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Lines serving this station */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            {selectedStation.lines.map((lId) => {
              const l = TRANSIT_LINES.find((item) => item.id === lId);
              if (!l) return null;
              return (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => onSelectLine(l.id)}
                  className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-900 border border-slate-700 text-slate-200 hover:border-slate-500 cursor-pointer"
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: l.color }}
                  />
                  {l.shortName}
                </button>
              );
            })}
          </div>

          {/* Set as Origin / Destination actions */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => onSetRouteOrigin(selectedStation.id)}
              className="px-2.5 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-xs font-semibold transition-colors cursor-pointer"
            >
              Set as Start
            </button>
            <button
              type="button"
              onClick={() => onSetRouteDestination(selectedStation.id)}
              className="px-2.5 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 text-xs font-semibold transition-colors cursor-pointer"
            >
              Set as Destination
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Floating HUD Controls inside the Google Map context so camera buttons can control `useMap()`.
 */
const MapControlsOverlay: React.FC<{
  layerFilter: TransitLayerFilter;
  onChangeLayerFilter: (filter: TransitLayerFilter) => void;
  placeFilter: PlaceCategoryFilter;
  setPlaceFilter: (f: PlaceCategoryFilter) => void;
  isLoadingLivePlaces: boolean;
  onReplayEmergence: () => void;
  showNestVectors: boolean;
  setShowNestVectors: React.Dispatch<React.SetStateAction<boolean>>;
  onBackToCanada: () => void;
}> = ({
  layerFilter,
  onChangeLayerFilter,
  placeFilter,
  setPlaceFilter,
  isLoadingLivePlaces,
  onReplayEmergence,
  showNestVectors,
  setShowNestVectors,
  onBackToCanada,
}) => {
  const map = useMap();

  const focusPreset = useCallback(
    (preset: 'toronto' | 'gtha' | 'niagara' | 'kitchener' | 'oshawa') => {
      if (!map) return;
      if (preset === 'toronto') {
        map.panTo({ lat: 43.675, lng: -79.428 });
        map.setZoom(11.5);
      } else if (preset === 'gtha') {
        map.panTo({ lat: 43.52, lng: -79.58 });
        map.setZoom(9.1);
      } else if (preset === 'niagara') {
        map.panTo({ lat: 43.22, lng: -79.46 });
        map.setZoom(10.0);
      } else if (preset === 'kitchener') {
        map.panTo({ lat: 43.56, lng: -80.12 });
        map.setZoom(10.1);
      } else if (preset === 'oshawa') {
        map.panTo({ lat: 43.82, lng: -79.05 });
        map.setZoom(10.8);
      }
    },
    [map]
  );

  return (
    <>
      {/* Top-Left Floating HUD: Back to Canada + Transit Mode Filter */}
      <div className="absolute top-3.5 left-3.5 z-20 flex flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={onBackToCanada}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-950/90 hover:bg-slate-900 text-slate-200 border border-slate-700/80 text-[11px] font-medium backdrop-blur-md shadow-lg transition-colors cursor-pointer"
          >
            <Compass className="w-3.5 h-3.5 text-cyan-400" />
            Canada
          </button>

          {/* Layer Filter Group (All / Subway, LRT & GO Rail / Express Bus) */}
          <div className="inline-flex items-center bg-slate-950/90 border border-slate-800 rounded-lg p-0.5 backdrop-blur-md shadow-lg">
            {(
              [
                { id: 'rail', label: 'Metro & GO Rail (11)' },
                { id: 'all', label: 'All (14)' },
                { id: 'bus', label: 'LRT & 407 Bus (3)' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => onChangeLayerFilter(tab.id)}
                className={`px-2 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                  layerFilter === tab.id
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Replay Snake Emergence Button */}
          <button
            type="button"
            onClick={onReplayEmergence}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-400/40 text-[11px] font-medium backdrop-blur-md shadow-lg transition-colors cursor-pointer"
            title="Replay transit lines emerging from Union Station"
          >
            <Play className="w-3 h-3 fill-amber-300" />
            Replay Snake
          </button>

          {/* Toggle Central Union Origin Tethers */}
          <button
            type="button"
            onClick={() => setShowNestVectors((v) => !v)}
            className={`inline-flex items-center gap-1 px-2 py-1.5 rounded-lg border text-[11px] font-medium backdrop-blur-md shadow-lg transition-colors cursor-pointer ${
              showNestVectors
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400/50'
                : 'bg-slate-950/85 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            <Eye className="w-3 h-3" />
            Hub Tethers
          </button>
        </div>
      </div>

      {/* Top-Right Camera Quick-Focus & Zoom Controls */}
      <div className="absolute top-3.5 right-3.5 z-20 flex flex-col items-end gap-2">
        <div className="flex items-center gap-1 bg-slate-950/90 border border-slate-800 rounded-lg p-1 backdrop-blur-md shadow-lg">
          <button
            type="button"
            onClick={() => focusPreset('toronto')}
            className="px-2 py-1 rounded text-[11px] font-medium text-amber-300 hover:text-white hover:bg-slate-800/80 cursor-pointer"
          >
            Toronto Core
          </button>
          <button
            type="button"
            onClick={() => focusPreset('gtha')}
            className="px-2 py-1 rounded text-[11px] font-medium text-cyan-300 hover:text-white hover:bg-slate-800/80 cursor-pointer"
          >
            Full GTHA
          </button>
          <button
            type="button"
            onClick={() => focusPreset('niagara')}
            className="px-2 py-1 rounded text-[11px] font-medium text-slate-300 hover:text-white hover:bg-slate-800/80 cursor-pointer"
          >
            Hamilton &amp; Niagara
          </button>
          <button
            type="button"
            onClick={() => focusPreset('kitchener')}
            className="px-2 py-1 rounded text-[11px] font-medium text-slate-300 hover:text-white hover:bg-slate-800/80 cursor-pointer"
          >
            Kitchener &amp; Guelph
          </button>
          <button
            type="button"
            onClick={() => focusPreset('oshawa')}
            className="px-2 py-1 rounded text-[11px] font-medium text-slate-300 hover:text-white hover:bg-slate-800/80 cursor-pointer"
          >
            Oshawa
          </button>
        </div>

        <div className="flex flex-col bg-slate-950/90 border border-slate-800 rounded-lg overflow-hidden backdrop-blur-md shadow-lg">
          <button
            type="button"
            onClick={() => map && map.setZoom((map.getZoom() || 12) + 1)}
            className="p-2 text-slate-300 hover:text-white hover:bg-slate-800/80 border-b border-slate-800 cursor-pointer"
            aria-label="Zoom In"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => map && map.setZoom((map.getZoom() || 12) - 1)}
            className="p-2 text-slate-300 hover:text-white hover:bg-slate-800/80 border-b border-slate-800 cursor-pointer"
            aria-label="Zoom Out"
          >
            <Minus className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => focusPreset('toronto')}
            className="p-2 text-slate-300 hover:text-white hover:bg-slate-800/80 cursor-pointer"
            aria-label="Focus Toronto Core"
            title="Focus Toronto Core"
          >
            <LocateFixed className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Bottom-Right Compact Legend */}
      <div className="absolute bottom-5 right-3.5 z-20 hidden sm:flex items-center gap-4 px-3.5 py-2 rounded-xl bg-slate-950/90 backdrop-blur-md border border-slate-800/90 text-[11px] text-slate-300 shadow-xl">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-[#FFD600] border border-white shadow-[0_0_8px_#FFD600]" />
          <span>Union Nexus</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-4 h-1 rounded-full bg-cyan-400 shadow-[0_0_6px_#00E5FF]" />
          <span>Subway / LRT</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400/30 border border-amber-400" />
          <span>Landmark / Tower</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-pink-500/30 border border-pink-400" />
          <span>Shopping / Mall</span>
        </div>
      </div>
    </>
  );
};
