import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateHaversineKm,
  computeSnakeEmergenceGeometry,
  findShortestRoute,
  searchPlacesAndStations,
} from './pathfinding';
import {
  STATIONS_BY_ID,
  TORONTO_CENTRAL_NEXUS,
  TORONTO_LANDMARKS,
  TRANSIT_LINES,
  getStationChainTrackCanvasPoints,
  getStationChainTrackLatLngs,
  getStationTrackLatLng,
} from '../data/torontoTransitData';

test('calculateHaversineKm computes realistic distance between Union Station and Pearson Airport', () => {
  // Union (43.6453, -79.3806) to Pearson (~43.6777, -79.6248) is ~20 km straight-line
  const km = calculateHaversineKm(43.6453, -79.3806, 43.6777, -79.6248);
  assert.ok(km > 15 && km < 26, `Expected distance between 15 and 26 km, got ${km}`);
});

test('findShortestRoute finds direct path on Line 1 from Union Station to Finch', () => {
  const result = findShortestRoute('union', 'finch', { mode: 'fastest' });
  assert.ok(result, 'Expected a valid route from Union to Finch');
  assert.equal(result.legs.length, 1, 'Should stay on Line 1 with 0 transfers');
  assert.equal(result.transferCount, 0);
  assert.equal(result.legs[0].line.id, 'line-1');
  assert.equal(result.originStation.id, 'union');
  assert.equal(result.destinationStation.id, 'finch');
  assert.ok(result.totalStops >= 12);
  assert.ok(result.totalDurationMinutes > 15);
});

test('CN Tower (Union Station) to Pearson Airport uses 1 direct UP Express train with 0 transfers across all modes', () => {
  const cnTower = TORONTO_LANDMARKS.find((l) => l.id === 'lm-cn-tower');
  const pearson = TORONTO_LANDMARKS.find((l) => l.id === 'lm-pearson');

  for (const mode of ['fastest', 'fewest-transfers', 'shortest-distance'] as const) {
    const forward = findShortestRoute('union', 'pearson-airport', { mode }, cnTower, pearson);
    assert.ok(forward, `Expected route for mode=${mode}`);
    assert.equal(
      forward.legs.length,
      1,
      `Mode ${mode}: CN Tower -> Pearson Airport must be a 1-leg direct ride, got ${forward.legs.map((l) => l.line.id).join(' -> ')}`
    );
    assert.equal(forward.transferCount, 0);
    assert.equal(
      forward.legs[0].line.id,
      'line-10',
      `Mode ${mode}: Must use UP Express (line-10) directly, not Kitchener Line`
    );

    const reverse = findShortestRoute('pearson-airport', 'union', { mode }, pearson, cnTower);
    assert.ok(reverse, `Expected reverse route for mode=${mode}`);
    assert.equal(reverse.legs.length, 1);
    assert.equal(reverse.transferCount, 0);
    assert.equal(reverse.legs[0].line.id, 'line-10');
  }
});

test('Multi-leg routes to Pearson Airport transfer directly to UP Express without redundant Kitchener Line hops', () => {
  // From Dundas (Line 1) -> Union -> Pearson Airport
  const fromDundas = findShortestRoute('dundas', 'pearson-airport', { mode: 'fastest' });
  assert.ok(fromDundas);
  assert.equal(fromDundas.legs.length, 2, 'Should only take Line 1 -> UP Express (1 transfer)');
  assert.equal(fromDundas.legs[0].line.id, 'line-1');
  assert.equal(fromDundas.legs[1].line.id, 'line-10');

  // From Bathurst (Line 2) -> Dundas West -> Pearson Airport
  const fromBathurst = findShortestRoute('bathurst', 'pearson-airport', { mode: 'fastest' });
  assert.ok(fromBathurst);
  assert.equal(fromBathurst.legs.length, 2, 'Should only take Line 2 -> UP Express (1 transfer)');
  assert.equal(fromBathurst.legs[0].line.id, 'line-2');
  assert.equal(fromBathurst.legs[1].line.id, 'line-10');
});

test('Shared corridors to Kitchener, Stouffville, and Milton stay on 1 single direct line from Union Station', () => {
  const toKitchener = findShortestRoute('union', 'kitchener-go', { mode: 'fastest' });
  assert.ok(toKitchener);
  assert.equal(toKitchener.legs.length, 1);
  assert.equal(toKitchener.legs[0].line.id, 'go-kitchener');

  const toStouffville = findShortestRoute('union', 'stouffville-go', { mode: 'fastest' });
  assert.ok(toStouffville);
  assert.equal(toStouffville.legs.length, 1);
  assert.equal(toStouffville.legs[0].line.id, 'go-stouffville');

  const toMilton = findShortestRoute('union', 'milton-go', { mode: 'fastest' });
  assert.ok(toMilton);
  assert.equal(toMilton.legs.length, 1);
  assert.equal(toMilton.legs[0].line.id, 'go-milton');
});

test('UP Express (line-10) and Kitchener Line (go-kitchener) are rendered as parallel non-overlapping tracks along shared corridor', () => {
  const sharedStations = ['union', 'dundas-west', 'mount-dennis', 'weston-go'].map(
    (id) => STATIONS_BY_ID[id]
  );
  const upCanvasPts = getStationChainTrackCanvasPoints(sharedStations, 'line-10');
  const kiCanvasPts = getStationChainTrackCanvasPoints(sharedStations, 'go-kitchener');

  assert.equal(
    upCanvasPts.length,
    kiCanvasPts.length,
    'UP Express and Kitchener Line should have matching vertex counts along the shared corridor'
  );
  assert.ok(upCanvasPts.length >= 15, 'Should include detailed Google Maps curve waypoints');

  for (let i = 0; i < upCanvasPts.length; i++) {
    const sep = Math.hypot(
      upCanvasPts[i][0] - kiCanvasPts[i][0],
      upCanvasPts[i][1] - kiCanvasPts[i][1]
    );
    assert.ok(
      sep > 1.8 && sep < 3.6,
      `Vertex ${i}: expected parallel separation between 1.8 and 3.6 canvas units, got ${sep.toFixed(3)}`
    );
  }

  // Verify forward and reverse lat/lng slices match identically
  const upForwardLatLng = getStationChainTrackLatLngs(sharedStations, 'line-10');
  const upReverseLatLng = getStationChainTrackLatLngs(
    [...sharedStations].reverse(),
    'line-10'
  ).reverse();
  assert.deepEqual(upForwardLatLng, upReverseLatLng);
});

test('getStationTrackLatLng places every station dot dead-center on its rendered line polyline with zero deviation', () => {
  for (const line of TRANSIT_LINES) {
    const stations = line.stationIds.map((id) => STATIONS_BY_ID[id]);
    const trackLatLngs = getStationChainTrackLatLngs(stations, line.id);
    assert.ok(trackLatLngs.length >= stations.length);

    for (const st of stations) {
      const dotPos = getStationTrackLatLng(st.id, line.id);
      let minDist = Infinity;
      for (const pt of trackLatLngs) {
        const d = Math.hypot(pt.lat - dotPos.lat, pt.lng - dotPos.lng);
        if (d < minDist) minDist = d;
      }
      assert.ok(
        minDist < 1e-6,
        `Station ${st.id} on line ${line.id} must lie directly on a vertex of the rendered line polyline, got minDist=${minDist}`
      );
    }
  }
});

test('findShortestRoute finds multi-line route from Pearson Airport to Scarborough Centre', () => {
  const result = findShortestRoute('pearson-airport', 'scarborough-centre', {
    mode: 'fastest',
    includeBuses: true,
  });
  assert.ok(result, 'Expected a valid route from Pearson Airport to Scarborough Centre');
  assert.ok(result.legs.length >= 2, 'Should require at least 1 transfer');
  assert.equal(result.allStationsInOrder[0].id, 'pearson-airport');
  assert.equal(
    result.allStationsInOrder[result.allStationsInOrder.length - 1].id,
    'scarborough-centre'
  );
  assert.ok(result.totalDistanceKm > 20);
});

test('findShortestRoute respects fewest-transfers optimization mode', () => {
  const fastest = findShortestRoute('square-one', 'sheppard-yonge', {
    mode: 'fastest',
  });
  const fewest = findShortestRoute('square-one', 'sheppard-yonge', {
    mode: 'fewest-transfers',
  });
  assert.ok(fastest && fewest);
  assert.ok(
    fewest.transferCount <= fastest.transferCount,
    'Fewest transfers mode should have <= transfers than fastest mode'
  );
});

test('searchPlacesAndStations resolves Toronto landmarks like CN Tower and University of Toronto', () => {
  const cnMatches = searchPlacesAndStations('CN Tower');
  assert.ok(cnMatches.length > 0, 'Should match CN Tower landmark');
  assert.equal(cnMatches[0].type, 'landmark');
  assert.equal(cnMatches[0].stationId, 'union');

  const uoftMatches = searchPlacesAndStations('University of Toronto');
  assert.ok(uoftMatches.length > 0, 'Should match University of Toronto');
  assert.equal(uoftMatches[0].stationId, 'st-george');
});

test('computeSnakeEmergenceGeometry originates from TORONTO_CENTRAL_NEXUS and expands to full line', () => {
  const line2 = TRANSIT_LINES.find((l) => l.id === 'line-2')!;
  const startState = computeSnakeEmergenceGeometry(line2, 0.05);
  assert.ok(startState.tetherPoints.length >= 2);
  assert.equal(startState.tetherPoints[0][0], TORONTO_CENTRAL_NEXUS.x);
  assert.equal(startState.tetherPoints[0][1], TORONTO_CENTRAL_NEXUS.y);
  assert.equal(startState.reachedStationIds.size, 0);

  const midState = computeSnakeEmergenceGeometry(line2, 0.6);
  assert.ok(midState.branchAPoints.length >= 2);
  assert.ok(midState.branchBPoints.length >= 2);
  assert.ok(midState.reachedStationIds.has('bloor-yonge'));

  const fullState = computeSnakeEmergenceGeometry(line2, 1.0);
  assert.equal(fullState.reachedStationIds.size, line2.stationIds.length);
  assert.equal(fullState.branchAHead, null);
  assert.equal(fullState.branchBHead, null);
});
