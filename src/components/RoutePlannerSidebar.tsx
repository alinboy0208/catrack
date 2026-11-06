import React, { useMemo, useState } from 'react';
import {
  ArrowUpDown,
  Bus,
  ChevronDown,
  ChevronUp,
  Clock,
  Footprints,
  MapPin,
  Navigation,
  Route,
  Search,
  TrainFront,
  X,
} from 'lucide-react';
import {
  ALL_STATIONS,
  STATIONS_BY_ID,
  TORONTO_LANDMARKS,
  TRANSIT_LINES,
  StationNode,
  TorontoLandmark,
  TransitLine,
} from '../data/torontoTransitData';
import {
  RouteOptimizationMode,
  RouteResult,
  SearchableLocation,
  searchPlacesAndStations,
} from '../utils/pathfinding';

interface RoutePlannerSidebarProps {
  activeTab: 'route' | 'lines';
  onChangeTab: (tab: 'route' | 'lines') => void;
  originStationId: string;
  destinationStationId: string;
  originLandmark?: TorontoLandmark;
  destinationLandmark?: TorontoLandmark;
  onSelectOrigin: (stationId: string, landmark?: TorontoLandmark) => void;
  onSelectDestination: (stationId: string, landmark?: TorontoLandmark) => void;
  onSwapLocations: () => void;
  optimizationMode: RouteOptimizationMode;
  onChangeOptimizationMode: (mode: RouteOptimizationMode) => void;
  includeBuses: boolean;
  onToggleIncludeBuses: (include: boolean) => void;
  activeRoute: RouteResult | null;
  isRouteHighlighted?: boolean;
  onActivateRoute?: () => void;
  onClearRoute: () => void;
  selectedLineId: string | null;
  onSelectLine: (lineId: string | null) => void;
  onSelectStation: (station: StationNode) => void;
}

const POPULAR_TORONTO_PRESETS: Array<{
  label: string;
  originStationId: string;
  destStationId: string;
  originLandmarkId?: string;
  destLandmarkId?: string;
}> = [
  {
    label: 'CN Tower → Pearson Airport',
    originStationId: 'union',
    destStationId: 'pearson-airport',
    originLandmarkId: 'lm-cn-tower',
    destLandmarkId: 'lm-pearson',
  },
  {
    label: 'Union → Niagara Falls',
    originStationId: 'union',
    destStationId: 'niagara-falls-go',
    originLandmarkId: 'lm-cn-tower',
    destLandmarkId: 'lm-niagara-falls',
  },
  {
    label: 'Union → Kitchener & Guelph',
    originStationId: 'union',
    destStationId: 'kitchener-go',
    destLandmarkId: 'lm-kitchener',
  },
  {
    label: 'Hamilton → Oshawa',
    originStationId: 'hamilton-go',
    destStationId: 'oshawa-go',
    originLandmarkId: 'lm-hamilton',
    destLandmarkId: 'lm-oshawa',
  },
];

export const RoutePlannerSidebar: React.FC<RoutePlannerSidebarProps> = ({
  activeTab,
  onChangeTab,
  originStationId,
  destinationStationId,
  originLandmark,
  destinationLandmark,
  onSelectOrigin,
  onSelectDestination,
  onSwapLocations,
  optimizationMode,
  onChangeOptimizationMode,
  includeBuses,
  onToggleIncludeBuses,
  activeRoute,
  isRouteHighlighted = false,
  onActivateRoute,
  onClearRoute,
  selectedLineId,
  onSelectLine,
  onSelectStation,
}) => {
  const [originQuery, setOriginQuery] = useState('');
  const [destQuery, setDestQuery] = useState('');
  const [focusedField, setFocusedField] = useState<'origin' | 'dest' | null>(null);
  const [expandedLegIndex, setExpandedLegIndex] = useState<number | null>(null);
  const [lineSearchQuery, setLineSearchQuery] = useState('');

  const originDisplayTitle = originLandmark
    ? `${originLandmark.name} (${STATIONS_BY_ID[originStationId]?.name})`
    : STATIONS_BY_ID[originStationId]
      ? `${STATIONS_BY_ID[originStationId].name} Station`
      : '';

  const destDisplayTitle = destinationLandmark
    ? `${destinationLandmark.name} (${STATIONS_BY_ID[destinationStationId]?.name})`
    : STATIONS_BY_ID[destinationStationId]
      ? `${STATIONS_BY_ID[destinationStationId].name} Station`
      : '';

  const originSuggestions = useMemo(
    () => searchPlacesAndStations(originQuery).slice(0, 8),
    [originQuery]
  );

  const destSuggestions = useMemo(
    () => searchPlacesAndStations(destQuery).slice(0, 8),
    [destQuery]
  );

  const handleChooseSuggestion = (
    field: 'origin' | 'dest',
    loc: SearchableLocation
  ) => {
    if (field === 'origin') {
      onSelectOrigin(loc.stationId, loc.landmark);
      setOriginQuery('');
    } else {
      onSelectDestination(loc.stationId, loc.landmark);
      setDestQuery('');
    }
    setFocusedField(null);
  };

  const filteredLines = useMemo(() => {
    const q = lineSearchQuery.trim().toLowerCase();
    if (!q) return TRANSIT_LINES;
    return TRANSIT_LINES.filter(
      (line) =>
        line.name.toLowerCase().includes(q) ||
        line.description.toLowerCase().includes(q) ||
        line.stationIds.some((id) =>
          STATIONS_BY_ID[id]?.name.toLowerCase().includes(q)
        )
    );
  }, [lineSearchQuery]);

  const inspectedLine: TransitLine | undefined = selectedLineId
    ? TRANSIT_LINES.find((l) => l.id === selectedLineId)
    : undefined;

  return (
    <aside
      className="w-full lg:w-[410px] xl:w-[430px] shrink-0 bg-[#081322] border-b lg:border-b-0 lg:border-r border-slate-800/90 flex flex-col h-full overflow-hidden"
      aria-label="Toronto Transit Route Planner and Network Directory"
    >
      {/* Minimalist Google Maps-style Top Mode Bar */}
      <div className="px-4 pt-3 pb-2 border-b border-slate-800/60 flex items-center justify-between">
        <div className="flex items-center gap-4" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'route'}
            onClick={() => onChangeTab('route')}
            className={`pb-1.5 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'route'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Navigation className="w-3.5 h-3.5" />
            <span>Directions</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'lines'}
            onClick={() => onChangeTab('lines')}
            className={`pb-1.5 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'lines'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <TrainFront className="w-3.5 h-3.5" />
            <span>Lines</span>
          </button>
        </div>

        {activeTab === 'route' && (
          <button
            type="button"
            onClick={() =>
              onChangeOptimizationMode(
                optimizationMode === 'fastest' ? 'fewest-transfers' : 'fastest'
              )
            }
            className="text-[11px] text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
          >
            {optimizationMode === 'fastest' ? 'Fastest route' : 'Fewest transfers'}
          </button>
        )}
      </div>

      {/* TAB 1: GOOGLE MAPS-STYLE MINIMALIST SEARCH & DIRECTIONS */}
      {activeTab === 'route' && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Clean Google Maps-style Origin/Destination Box */}
          <div className="bg-slate-900/50 border border-slate-800/80 rounded-xl p-3">
            <div className="flex items-center gap-2.5">
              {/* Left Google Maps Route Dots & Connector Line */}
              <div className="flex flex-col items-center justify-center gap-1 py-1 shrink-0">
                <div className="w-2.5 h-2.5 rounded-full border-2 border-cyan-400 bg-transparent" />
                <div className="w-0.5 h-5 border-l border-dotted border-slate-500" />
                <MapPin className="w-3.5 h-3.5 text-rose-400" />
              </div>

              {/* Center Stacked Inputs */}
              <div className="flex-1 space-y-2 min-w-0">
                {/* Starting Point Input */}
                <div className="relative">
                  <input
                    id="origin-search-input"
                    type="text"
                    aria-label="Choose starting point"
                    value={focusedField === 'origin' ? originQuery : originDisplayTitle}
                    onFocus={() => {
                      setFocusedField('origin');
                      setOriginQuery('');
                    }}
                    onBlur={() => {
                      window.setTimeout(() => {
                        setFocusedField((prev) => (prev === 'origin' ? null : prev));
                      }, 180);
                    }}
                    onChange={(e) => setOriginQuery(e.target.value)}
                    placeholder="Choose starting point..."
                    className="w-full px-3 py-2 bg-slate-950/90 border border-slate-800 focus:border-cyan-400 rounded-lg text-xs text-white placeholder-slate-400 outline-none transition-colors pr-7"
                  />
                  {focusedField === 'origin' && originQuery && (
                    <button
                      type="button"
                      onClick={() => setOriginQuery('')}
                      aria-label="Clear origin query"
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {/* Origin Autocomplete Dropdown */}
                  {focusedField === 'origin' && (
                    <div className="absolute left-0 right-0 top-full mt-1 z-30 bg-slate-950 border border-slate-700 rounded-lg shadow-2xl max-h-60 overflow-y-auto divide-y divide-slate-800/70">
                      {originSuggestions.map((loc) => (
                        <button
                          key={`orig-${loc.id}`}
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            handleChooseSuggestion('origin', loc);
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-slate-900 transition-colors flex items-center justify-between gap-2 cursor-pointer"
                        >
                          <div className="truncate">
                            <div className="text-xs font-medium text-white truncate">
                              {loc.title}
                            </div>
                            <div className="text-[11px] text-slate-400 truncate">
                              {loc.subtitle}
                            </div>
                          </div>
                          <span className="text-[11px] font-mono-tabular text-cyan-400 shrink-0">
                            {loc.lineBadges.map((b) => b.code).join('/')}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Destination Input */}
                <div className="relative">
                  <input
                    id="dest-search-input"
                    type="text"
                    aria-label="Choose destination"
                    value={focusedField === 'dest' ? destQuery : destDisplayTitle}
                    onFocus={() => {
                      setFocusedField('dest');
                      setDestQuery('');
                    }}
                    onBlur={() => {
                      window.setTimeout(() => {
                        setFocusedField((prev) => (prev === 'dest' ? null : prev));
                      }, 180);
                    }}
                    onChange={(e) => setDestQuery(e.target.value)}
                    placeholder="Choose destination..."
                    className="w-full px-3 py-2 bg-slate-950/90 border border-slate-800 focus:border-cyan-400 rounded-lg text-xs text-white placeholder-slate-400 outline-none transition-colors pr-7"
                  />
                  {focusedField === 'dest' && destQuery && (
                    <button
                      type="button"
                      onClick={() => setDestQuery('')}
                      aria-label="Clear destination query"
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {/* Destination Autocomplete Dropdown */}
                  {focusedField === 'dest' && (
                    <div className="absolute left-0 right-0 top-full mt-1 z-30 bg-slate-950 border border-slate-700 rounded-lg shadow-2xl max-h-60 overflow-y-auto divide-y divide-slate-800/70">
                      {destSuggestions.map((loc) => (
                        <button
                          key={`dest-${loc.id}`}
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            handleChooseSuggestion('dest', loc);
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-slate-900 transition-colors flex items-center justify-between gap-2 cursor-pointer"
                        >
                          <div className="truncate">
                            <div className="text-xs font-medium text-white truncate">
                              {loc.title}
                            </div>
                            <div className="text-[11px] text-slate-400 truncate">
                              {loc.subtitle}
                            </div>
                          </div>
                          <span className="text-[11px] font-mono-tabular text-cyan-400 shrink-0">
                            {loc.lineBadges.map((b) => b.code).join('/')}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Right Swap Icon Button */}
              <button
                type="button"
                onClick={onSwapLocations}
                aria-label="Swap starting point and destination"
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800/80 rounded-full transition-colors cursor-pointer shrink-0"
              >
                <ArrowUpDown className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Popular Toronto Landmark Route Presets */}
          <div>
            <div className="text-xs font-medium text-slate-400 mb-2">
              Quick Toronto Landmark Routes
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {POPULAR_TORONTO_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => {
                    const oLm = TORONTO_LANDMARKS.find(
                      (l) => l.id === preset.originLandmarkId
                    );
                    const dLm = TORONTO_LANDMARKS.find(
                      (l) => l.id === preset.destLandmarkId
                    );
                    onSelectOrigin(preset.originStationId, oLm);
                    onSelectDestination(preset.destStationId, dLm);
                  }}
                  className="text-left px-2.5 py-2 bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800/90 rounded-lg text-[11px] text-slate-200 hover:text-cyan-300 transition-colors truncate cursor-pointer"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Calculated Shortest Route Itinerary Result */}
          {activeRoute ? (
            <div
              className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-4"
              data-testid="route-itinerary-panel"
            >
              <div className="flex items-start justify-between gap-2 border-b border-slate-800 pb-3">
                <div className="min-w-0">
                  <div className="text-xs text-cyan-400 font-medium">
                    Optimal Path Computed ·{' '}
                    {activeRoute.optimizationMode === 'fastest'
                      ? 'Minimum Travel Time'
                      : activeRoute.optimizationMode === 'fewest-transfers'
                        ? 'Minimum Transfers'
                        : 'Minimum Track Distance'}
                  </div>
                  <h3 className="text-base font-bold text-white mt-0.5 leading-snug">
                    {activeRoute.originLandmark
                      ? activeRoute.originLandmark.name
                      : activeRoute.originStation.name}{' '}
                    →{' '}
                    {activeRoute.destinationLandmark
                      ? activeRoute.destinationLandmark.name
                      : activeRoute.destinationStation.name}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (isRouteHighlighted) {
                      onClearRoute();
                    } else if (onActivateRoute) {
                      onActivateRoute();
                    }
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold shrink-0 transition-colors cursor-pointer ${
                    isRouteHighlighted
                      ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                      : 'bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-400/50'
                  }`}
                >
                  {isRouteHighlighted ? 'Hide Route' : 'Show on Map'}
                </button>
              </div>

              {/* Tabular Key Metrics Grid */}
              <div className="grid grid-cols-4 gap-2 text-center bg-slate-950/80 border border-slate-800/80 rounded-lg p-2.5 font-mono-tabular">
                <div>
                  <div className="text-sm font-bold text-amber-300">
                    {activeRoute.totalDurationMinutes} min
                  </div>
                  <div className="text-[10px] text-slate-400">DURATION</div>
                </div>
                <div>
                  <div className="text-sm font-bold text-cyan-300">
                    {activeRoute.totalDistanceKm} km
                  </div>
                  <div className="text-[10px] text-slate-400">DISTANCE</div>
                </div>
                <div>
                  <div className="text-sm font-bold text-white">
                    {activeRoute.totalStops}
                  </div>
                  <div className="text-[10px] text-slate-400">STOPS</div>
                </div>
                <div>
                  <div className="text-sm font-bold text-emerald-300">
                    ${activeRoute.fareCad.toFixed(2)}
                  </div>
                  <div className="text-[10px] text-slate-400">ONE-FARE</div>
                </div>
              </div>

              {/* Step-by-Step Leg Breakdown */}
              <div className="space-y-3">
                {/* Origin Landmark Walking Approach */}
                {activeRoute.originLandmark && (
                  <div className="flex items-start gap-3 text-xs text-slate-300 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/70">
                    <Footprints className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-semibold text-white">
                        Walk from {activeRoute.originLandmark.name}
                      </div>
                      <div className="text-slate-400 font-mono-tabular">
                        {activeRoute.originLandmark.walkingMinutes} min (
                        {activeRoute.originLandmark.walkingMeters}m) to{' '}
                        {activeRoute.originStation.name} Station
                      </div>
                    </div>
                  </div>
                )}

                {activeRoute.legs.map((leg, idx) => {
                  const isExpanded = expandedLegIndex === idx;
                  const intermediateStops = leg.stops.slice(1, -1);

                  return (
                    <div
                      key={`${leg.line.id}-${idx}`}
                      className="bg-slate-950/70 border border-slate-800/90 rounded-lg p-3 space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold text-slate-950 shrink-0 font-mono-tabular"
                            style={{ backgroundColor: leg.line.color }}
                          >
                            {leg.line.code}
                          </span>
                          <div>
                            <div className="text-xs font-bold text-white">
                              {leg.line.name}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              {leg.directionLabel}
                            </div>
                          </div>
                        </div>

                        <div className="text-right font-mono-tabular shrink-0">
                          <div className="text-xs font-semibold text-amber-300">
                            {leg.durationMinutes} min
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {leg.distanceKm} km · {leg.stops.length - 1} stops
                          </div>
                        </div>
                      </div>

                      <div className="text-xs space-y-1 pt-1 border-t border-slate-800/60">
                        <div className="flex items-center justify-between text-emerald-300">
                          <span className="font-medium">
                            Board: {leg.fromStation.name}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {leg.fromStation.municipality}
                          </span>
                        </div>

                        {intermediateStops.length > 0 && (
                          <div>
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedLegIndex(isExpanded ? null : idx)
                              }
                              className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 py-0.5 cursor-pointer"
                            >
                              {isExpanded ? (
                                <ChevronUp className="w-3 h-3" />
                              ) : (
                                <ChevronDown className="w-3 h-3" />
                              )}
                              <span>
                                {intermediateStops.length} intermediate stations
                              </span>
                            </button>

                            {isExpanded && (
                              <ul className="pl-3 mt-1 space-y-1 text-[11px] text-slate-300 border-l border-slate-700">
                                {intermediateStops.map((st) => (
                                  <li
                                    key={st.id}
                                    onClick={() => onSelectStation(st)}
                                    className="hover:text-cyan-300 cursor-pointer"
                                  >
                                    {st.name}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        )}

                        <div className="flex items-center justify-between text-rose-300">
                          <span className="font-medium">
                            Exit: {leg.toStation.name}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {idx < activeRoute.legs.length - 1
                              ? 'Transfer Hub'
                              : leg.toStation.municipality}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Destination Landmark Walking Arrival */}
                {activeRoute.destinationLandmark && (
                  <div className="flex items-start gap-3 text-xs text-slate-300 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/70">
                    <Footprints className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-semibold text-white">
                        Walk to {activeRoute.destinationLandmark.name}
                      </div>
                      <div className="text-slate-400 font-mono-tabular">
                        {activeRoute.destinationLandmark.walkingMinutes} min (
                        {activeRoute.destinationLandmark.walkingMeters}m) from{' '}
                        {activeRoute.destinationStation.name} Station
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-slate-900/50 border border-slate-800/80 rounded-xl p-5 text-center space-y-2">
              <Route className="w-6 h-6 text-cyan-400 mx-auto" />
              <div className="text-sm font-semibold text-white">
                Select Any Origin &amp; Destination
              </div>
              <p className="text-xs text-slate-400">
                Choose any station or Toronto landmark above, or click stations directly on the neon map to compute the shortest route.
              </p>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: NETWORK LINES & BUS DIRECTORY */}
      {activeTab === 'lines' && (
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={lineSearchQuery}
              onChange={(e) => setLineSearchQuery(e.target.value)}
              placeholder="Filter lines or station names..."
              aria-label="Filter transit lines or stations"
              className="w-full pl-8 pr-3 py-2 bg-slate-950 border border-slate-800 focus:border-cyan-400 rounded-lg text-xs text-white placeholder-slate-500 outline-none"
            />
          </div>

          {inspectedLine && (
            <div className="bg-slate-900/90 border border-slate-700 rounded-xl p-3.5 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span
                    className="w-6 h-6 rounded flex items-center justify-center text-xs font-bold text-slate-950 font-mono-tabular"
                    style={{ backgroundColor: inspectedLine.color }}
                  >
                    {inspectedLine.code}
                  </span>
                  <h3 className="text-sm font-bold text-white">
                    {inspectedLine.name}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => onSelectLine(null)}
                  className="text-xs text-slate-400 hover:text-white px-2 py-0.5 bg-slate-950 rounded cursor-pointer"
                >
                  Show All
                </button>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {inspectedLine.description}
              </p>
              <div className="text-[11px] text-slate-400 font-mono-tabular">
                Peak Frequency: {inspectedLine.frequencyPeak} · Daily Riders:{' '}
                {inspectedLine.dailyRidership} · {inspectedLine.stationIds.length}{' '}
                Stations
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1 max-h-36 overflow-y-auto">
                {inspectedLine.stationIds.map((stId) => {
                  const st = STATIONS_BY_ID[stId];
                  if (!st) return null;
                  return (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => onSelectStation(st)}
                      className="px-2 py-1 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded text-[11px] text-slate-200 hover:text-cyan-300 transition-colors cursor-pointer"
                    >
                      {st.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="space-y-2">
            {filteredLines.map((line) => {
              const isSelected = selectedLineId === line.id;
              return (
                <button
                  key={line.id}
                  type="button"
                  onClick={() =>
                    onSelectLine(isSelected ? null : line.id)
                  }
                  className={`w-full text-left p-3 rounded-xl border transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-slate-900 border-cyan-400/70'
                      : 'bg-slate-900/55 hover:bg-slate-900/90 border-slate-800/80'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span
                        className="w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold text-slate-950 font-mono-tabular shrink-0"
                        style={{ backgroundColor: line.color }}
                      >
                        {line.code}
                      </span>
                      <div>
                        <div className="text-xs font-bold text-white">
                          {line.name}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {line.mode.toUpperCase()} · {line.stationIds.length}{' '}
                          stations · Every {line.frequencyPeak}
                        </div>
                      </div>
                    </div>
                    <span className="text-[11px] font-mono-tabular text-slate-400">
                      {line.dailyRidership}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </aside>
  );
};
