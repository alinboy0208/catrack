/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { CanadaMapView } from './components/CanadaMapView';
import {
  TorontoNeonMap,
  TransitLayerFilter,
} from './components/TorontoNeonMap';
import { RoutePlannerSidebar } from './components/RoutePlannerSidebar';
import {
  STATIONS_BY_ID,
  TORONTO_LANDMARKS,
  StationNode,
  TorontoLandmark,
} from './data/torontoTransitData';
import {
  RouteOptimizationMode,
  RouteResult,
  findShortestRoute,
} from './utils/pathfinding';

export default function App() {
  // Support ?autostart=1 query parameter per ultra-mode testability specification
  const initialStage =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('autostart') === '1'
      ? 'toronto'
      : 'canada';

  const [stage, setStage] = useState<'canada' | 'toronto'>(initialStage);
  const [emergenceProgress, setEmergenceProgress] = useState<number>(
    initialStage === 'toronto' ? 1 : 0
  );

  // Sidebar & Map state
  const [sidebarTab, setSidebarTab] = useState<'route' | 'lines'>('route');
  const [layerFilter, setLayerFilter] = useState<TransitLayerFilter>('rail');
  const [selectedLineId, setSelectedLineId] = useState<string | null>(null);
  const [selectedStation, setSelectedStation] = useState<StationNode | null>(null);

  // Shortest Path Route Planner state
  const [originStationId, setOriginStationId] = useState<string>('union');
  const [destinationStationId, setDestinationStationId] = useState<string>('pearson-airport');
  const [originLandmark, setOriginLandmark] = useState<TorontoLandmark | undefined>(
    TORONTO_LANDMARKS.find((l) => l.id === 'lm-cn-tower')
  );
  const [destinationLandmark, setDestinationLandmark] = useState<
    TorontoLandmark | undefined
  >(TORONTO_LANDMARKS.find((l) => l.id === 'lm-pearson'));
  const [optimizationMode, setOptimizationMode] =
    useState<RouteOptimizationMode>('fastest');
  const [includeBuses, setIncludeBuses] = useState<boolean>(true);
  const [isRouteHighlightActive, setIsRouteHighlightActive] =
    useState<boolean>(false);
  const [quotaExceeded, setQuotaExceeded] = useState<boolean>(false);

  useEffect(() => {
    const onQuota = () => setQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', onQuota);
    return () => window.removeEventListener('gmp-quota-exceeded', onQuota);
  }, []);

  const animFrameRef = useRef<number | null>(null);

  // Trigger the "Snake emerging from the central nest" animation (0 -> 1)
  const triggerSnakeEmergence = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
    }
    setIsRouteHighlightActive(false);
    setSelectedLineId(null);
    setEmergenceProgress(0.02);

    const startTime = performance.now();
    const durationMs = 2300;

    const step = (now: number) => {
      const elapsed = now - startTime;
      const rawT = Math.min(1, elapsed / durationMs);
      // Smooth ease-out curve
      const eased = 1 - Math.pow(1 - rawT, 2.4);
      setEmergenceProgress(eased);
      if (rawT < 1) {
        animFrameRef.current = requestAnimationFrame(step);
      } else {
        setEmergenceProgress(1);
      }
    };

    animFrameRef.current = requestAnimationFrame(step);
  }, []);

  useEffect(() => {
    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, []);

  const handleEnterTorontoFromCanada = () => {
    setStage('toronto');
    triggerSnakeEmergence();
  };

  // Compute Dijkstra shortest route whenever origin, destination, or options change
  const computedRoute: RouteResult | null = findShortestRoute(
    originStationId,
    destinationStationId,
    { mode: optimizationMode, includeBuses },
    originLandmark,
    destinationLandmark
  );

  const handleSelectOrigin = (stId: string, landmark?: TorontoLandmark) => {
    setOriginStationId(stId);
    setOriginLandmark(landmark);
    setIsRouteHighlightActive(true);
    setSelectedLineId(null);
  };

  const handleSelectDestination = (stId: string, landmark?: TorontoLandmark) => {
    setDestinationStationId(stId);
    setDestinationLandmark(landmark);
    setIsRouteHighlightActive(true);
    setSelectedLineId(null);
  };

  const handleSwapLocations = () => {
    const tempSt = originStationId;
    const tempLm = originLandmark;
    setOriginStationId(destinationStationId);
    setOriginLandmark(destinationLandmark);
    setDestinationStationId(tempSt);
    setDestinationLandmark(tempLm);
    setIsRouteHighlightActive(true);
  };

  return (
    <div
      className="min-h-screen h-screen w-screen flex flex-col bg-[#06101E] text-slate-100 overflow-hidden"
      data-stage={stage}
    >
      {quotaExceeded && (
        <div
          role="alert"
          className="sticky top-0 z-[9999] px-4 py-2.5 bg-[#FFF4E5] text-[#663C00] border-b border-[#FFA726] text-xs font-sans shrink-0"
        >
          <strong>Google Maps quota reached.</strong> The shared demo key is
          temporarily throttled, or your project needs billing enabled. To keep
          using maps without interruption, create your own API key in Google
          Cloud Console and add it under{' '}
          <em>Settings &rarr; Secrets</em> as{' '}
          <code>VITE_GOOGLE_MAPS_API_KEY</code>.{' '}
          <a
            href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
            target="_blank"
            rel="noopener noreferrer"
            className="underline font-semibold"
          >
            Step-by-step guide &rarr;
          </a>
        </div>
      )}

      {/* Top Bar Contract: 3 zones separated by gap-8 */}
      <header className="flex items-center justify-between gap-8 px-6 py-3.5 bg-[#050D1A] border-b border-slate-800/90 shrink-0 z-30">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            setStage('canada');
          }}
          className="text-lg font-bold tracking-tight text-white whitespace-nowrap shrink-0 font-display"
        >
          Toronto Metro Pulse
        </a>

        {/* Zone 2: 4 concise single-line navigation links */}
        <nav
          className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-300"
          aria-label="Primary Navigation"
        >
          <button
            type="button"
            onClick={() => setStage('canada')}
            className={`hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              stage === 'canada'
                ? 'text-cyan-400 underline underline-offset-8'
                : ''
            }`}
          >
            Canada Atlas
          </button>
          <button
            type="button"
            onClick={() => {
              if (stage !== 'toronto') {
                handleEnterTorontoFromCanada();
              } else {
                setIsRouteHighlightActive(false);
                setSelectedLineId(null);
              }
            }}
            className={`hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              stage === 'toronto' && !isRouteHighlightActive && sidebarTab === 'route'
                ? 'text-cyan-400 underline underline-offset-8'
                : ''
            }`}
          >
            Toronto Network
          </button>
          <button
            type="button"
            onClick={() => {
              setStage('toronto');
              setEmergenceProgress(1);
              setSidebarTab('route');
              setIsRouteHighlightActive(true);
            }}
            className={`hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              stage === 'toronto' && isRouteHighlightActive
                ? 'text-cyan-400 underline underline-offset-8'
                : ''
            }`}
          >
            Route Finder
          </button>
          <button
            type="button"
            onClick={() => {
              setStage('toronto');
              setEmergenceProgress(1);
              setSidebarTab('lines');
            }}
            className={`hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              stage === 'toronto' && sidebarTab === 'lines'
                ? 'text-cyan-400 underline underline-offset-8'
                : ''
            }`}
          >
            Master Plan Lines
          </button>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center gap-3 shrink-0">
          {stage === 'canada' ? (
            <button
              type="button"
              onClick={handleEnterTorontoFromCanada}
              className="px-4 py-2 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Launch Toronto Map
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                if (isRouteHighlightActive || selectedLineId || selectedStation) {
                  setIsRouteHighlightActive(false);
                  setSelectedLineId(null);
                  setSelectedStation(null);
                } else {
                  setIsRouteHighlightActive(true);
                }
              }}
              className="px-4 py-2 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {isRouteHighlightActive || selectedLineId
                ? 'Show Full Network'
                : 'Highlight Active Route'}
            </button>
          )}
        </div>
      </header>

      {/* Main Content Stage */}
      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        {stage === 'canada' ? (
          <CanadaMapView onSelectToronto={handleEnterTorontoFromCanada} />
        ) : (
          <>
            <RoutePlannerSidebar
              activeTab={sidebarTab}
              onChangeTab={setSidebarTab}
              originStationId={originStationId}
              destinationStationId={destinationStationId}
              originLandmark={originLandmark}
              destinationLandmark={destinationLandmark}
              onSelectOrigin={handleSelectOrigin}
              onSelectDestination={handleSelectDestination}
              onSwapLocations={handleSwapLocations}
              optimizationMode={optimizationMode}
              onChangeOptimizationMode={(mode) => {
                setOptimizationMode(mode);
                setIsRouteHighlightActive(true);
              }}
              includeBuses={includeBuses}
              onToggleIncludeBuses={(inc) => {
                setIncludeBuses(inc);
                setIsRouteHighlightActive(true);
              }}
              activeRoute={computedRoute}
              isRouteHighlighted={isRouteHighlightActive}
              onActivateRoute={() => {
                setIsRouteHighlightActive(true);
                setSelectedLineId(null);
              }}
              onClearRoute={() => {
                setIsRouteHighlightActive(false);
                setSelectedStation(null);
              }}
              selectedLineId={selectedLineId}
              onSelectLine={(lineId) => {
                setSelectedLineId(lineId);
                if (lineId) setIsRouteHighlightActive(false);
              }}
              onSelectStation={(st) => setSelectedStation(st)}
            />

            <div className="flex-1 h-full relative overflow-hidden">
              <TorontoNeonMap
                emergenceProgress={emergenceProgress}
                onReplayEmergence={triggerSnakeEmergence}
                layerFilter={layerFilter}
                onChangeLayerFilter={setLayerFilter}
                selectedLineId={selectedLineId}
                onSelectLine={(lineId) => {
                  setSelectedLineId(lineId);
                  if (lineId) setIsRouteHighlightActive(false);
                }}
                selectedStation={selectedStation}
                onSelectStation={setSelectedStation}
                activeRoute={isRouteHighlightActive ? computedRoute : null}
                onSetRouteOrigin={(stId, lm) => {
                  handleSelectOrigin(stId, lm);
                  setSelectedStation(null);
                }}
                onSetRouteDestination={(stId, lm) => {
                  handleSelectDestination(stId, lm);
                  setSelectedStation(null);
                }}
                onBackToCanada={() => setStage('canada')}
              />
            </div>
          </>
        )}
      </main>
    </div>
  );
}
