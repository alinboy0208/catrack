import React, { useState } from 'react';
import { Compass, ZoomIn } from 'lucide-react';

interface CanadaMapViewProps {
  onSelectToronto: () => void;
}

// Vertical shift applied to the 1600x900 reference map group so Southern Ontario & Toronto sit comfortably above the bottom edge
const MAP_Y_OFFSET = -52;

// Exact position of Toronto on the 1600x900 Canada reference image (Southern Ontario, NW shore of Lake Ontario)
const TORONTO_CANADA_POS = { x: 1032, y: 822 };

const PROVINCE_LABELS: Array<{
  name: string;
  lines?: string[];
  x: number;
  y: number;
}> = [
  { name: 'YUKON', x: 408, y: 378 },
  {
    name: 'NORTHWEST TERRITORIES',
    lines: ['NORTHWEST', 'TERRITORIES'],
    x: 576,
    y: 416,
  },
  { name: 'NUNAVUT', x: 758, y: 446 },
  {
    name: 'BRITISH COLUMBIA',
    lines: ['BRITISH', 'COLUMBIA'],
    x: 428,
    y: 568,
  },
  { name: 'ALBERTA', x: 554, y: 598 },
  { name: 'SASKATCHEWAN', x: 654, y: 615 },
  { name: 'MANITOBA', x: 756, y: 636 },
  { name: 'ONTARIO', x: 892, y: 702 },
  { name: 'QUEBEC', x: 1112, y: 648 },
];

interface CanadianCityMarker {
  name: string;
  x: number;
  y: number;
  labelDx: number;
  labelDy: number;
  anchor: 'start' | 'middle' | 'end';
  isCapital?: boolean;
}

const CANADIAN_CITIES: CanadianCityMarker[] = [
  { name: 'Whitehorse', x: 395, y: 422, labelDx: 0, labelDy: -9, anchor: 'middle' },
  { name: 'Yellowknife', x: 580, y: 468, labelDx: 0, labelDy: -9, anchor: 'middle' },
  { name: 'Iqaluit', x: 1095, y: 445, labelDx: 0, labelDy: -10, anchor: 'middle' },
  { name: 'Victoria', x: 384, y: 714, labelDx: -10, labelDy: 5, anchor: 'end' },
  { name: 'Vancouver', x: 404, y: 698, labelDx: -10, labelDy: -5, anchor: 'end' },
  { name: 'Edmonton', x: 554, y: 648, labelDx: 0, labelDy: -9, anchor: 'middle' },
  { name: 'Calgary', x: 546, y: 698, labelDx: -10, labelDy: 4, anchor: 'end' },
  { name: 'Saskatoon', x: 646, y: 668, labelDx: 0, labelDy: -9, anchor: 'middle' },
  { name: 'Regina', x: 662, y: 722, labelDx: 0, labelDy: -9, anchor: 'middle' },
  { name: 'Winnipeg', x: 754, y: 736, labelDx: 0, labelDy: -9, anchor: 'middle' },
  { name: 'Thunder Bay', x: 876, y: 774, labelDx: -10, labelDy: 4, anchor: 'end' },
  { name: 'Ottawa', x: 1076, y: 774, labelDx: -8, labelDy: -9, anchor: 'end', isCapital: true },
  { name: 'Montréal', x: 1122, y: 762, labelDx: 0, labelDy: -10, anchor: 'middle' },
  { name: 'Québec City', x: 1162, y: 732, labelDx: 10, labelDy: 3, anchor: 'start' },
  { name: 'Halifax', x: 1278, y: 745, labelDx: 10, labelDy: 4, anchor: 'start' },
  { name: "St. John's", x: 1396, y: 646, labelDx: 10, labelDy: 4, anchor: 'start' },
];

export const CanadaMapView: React.FC<CanadaMapViewProps> = ({ onSelectToronto }) => {
  const [isZoomingToToronto, setIsZoomingToToronto] = useState(false);
  const [isHoveringToronto, setIsHoveringToronto] = useState(false);

  const handleTriggerZoom = () => {
    if (isZoomingToToronto) return;
    setIsZoomingToToronto(true);
    window.setTimeout(() => {
      onSelectToronto();
    }, 780);
  };

  // Transform origin anchored precisely at Toronto's shifted coordinates
  const originPercentX = `${(TORONTO_CANADA_POS.x / 1600) * 100}%`;
  const originPercentY = `${((TORONTO_CANADA_POS.y + MAP_Y_OFFSET) / 900) * 100}%`;

  return (
    <div
      className="relative w-full h-full bg-[#182234] overflow-hidden select-none flex flex-col justify-between"
      data-testid="canada-map-stage"
    >
      {/* Interactive Canada Vector + Reference Map Stage */}
      <div
        className="absolute inset-0 w-full h-full transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]"
        style={{
          transformOrigin: `${originPercentX} ${originPercentY}`,
          transform: isZoomingToToronto
            ? 'scale(9.5)'
            : isHoveringToronto
              ? 'scale(1.035)'
              : 'scale(1)',
          opacity: isZoomingToToronto ? 0.15 : 1,
        }}
      >
        <svg
          viewBox="0 0 1600 900"
          preserveAspectRatio="xMidYMid meet"
          className="w-full h-full"
          role="img"
          aria-label="Map of Canada featuring major Canadian cities and interactive Toronto transit node"
        >
          <defs>
            <radialGradient id="torontoBeaconGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#FFD600" stopOpacity="0.95" />
              <stop offset="35%" stopColor="#00E5FF" stopOpacity="0.55" />
              <stop offset="100%" stopColor="#00E5FF" stopOpacity="0" />
            </radialGradient>
            <filter id="neonDotGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Base Deep Navy Fill matching Gemini_Generated_Image_ctfv22ctfv22ctfv.jpg */}
          <rect width="1600" height="900" fill="#182234" className="pointer-events-none" />

          {/* Shifted Map Group so Southern Ontario & Toronto are fully visible with generous bottom margin */}
          <g transform={`translate(0, ${MAP_Y_OFFSET})`}>
            {/* Exact Reference Map of Canada uploaded by User */}
            <image
              href="/assets/aistudio/Gemini_Generated_Image_ctfv22ctfv22ctfv_5203fe4a.jpg"
              x="0"
              y="0"
              width="1600"
              height="900"
              preserveAspectRatio="xMidYMid meet"
              className="pointer-events-none"
            />

            {/* Subtle Latitude/Longitude Reference Lines */}
            <g stroke="rgba(226, 232, 240, 0.05)" strokeWidth="1" strokeDasharray="4 8" className="pointer-events-none">
              <line x1="0" y1="300" x2="1600" y2="300" />
              <line x1="0" y1="550" x2="1600" y2="550" />
              <line x1="0" y1="822" x2="1600" y2="822" />
              <line x1="480" y1="0" x2="480" y2="900" />
              <line x1="1032" y1="0" x2="1032" y2="900" />
            </g>

            {/* Centered Province & Territory Labels */}
            <g className="pointer-events-none">
              {PROVINCE_LABELS.map((prov) => (
                <text
                  key={prov.name}
                  x={prov.x}
                  y={prov.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="rgba(148, 163, 184, 0.52)"
                  fontSize={prov.name === 'SASKATCHEWAN' ? '8.5' : '10'}
                  fontWeight="600"
                  letterSpacing={prov.name === 'SASKATCHEWAN' ? '0.08em' : '0.14em'}
                >
                  {prov.lines
                    ? prov.lines.map((lineText, idx) => (
                        <tspan
                          key={lineText}
                          x={prov.x}
                          dy={idx === 0 ? '-0.45em' : '1.25em'}
                        >
                          {lineText}
                        </tspan>
                      ))
                    : prov.name}
                </text>
              ))}
            </g>

            {/* Connecting National Corridor Arcs to Toronto */}
            <g
              fill="none"
              stroke="rgba(56, 189, 248, 0.2)"
              strokeWidth="1.2"
              strokeDasharray="4 6"
              className="pointer-events-none"
            >
              <path d="M 404 698 Q 690 630 1032 822" />
              <path d="M 546 698 Q 775 700 1032 822" />
              <path d="M 754 736 Q 895 752 1032 822" />
              <path d="M 1032 822 Q 1080 790 1122 762" />
              <path d="M 1122 762 Q 1200 745 1278 745" />
            </g>

            {/* Major Canadian Cities across Provinces & Territories */}
            <g className="pointer-events-none">
              {CANADIAN_CITIES.map((city) => (
                <g key={city.name} transform={`translate(${city.x}, ${city.y})`}>
                  <circle
                    r={city.isCapital ? 4.5 : 3.5}
                    fill={city.isCapital ? '#38BDF8' : '#E2E8F0'}
                    stroke="#0F172A"
                    strokeWidth="1.5"
                  />
                  <circle
                    r={city.isCapital ? 8 : 6}
                    fill="none"
                    stroke={city.isCapital ? 'rgba(56, 189, 248, 0.45)' : 'rgba(226, 232, 240, 0.25)'}
                    strokeWidth="1"
                  />
                  <text
                    x={city.labelDx}
                    y={city.labelDy}
                    textAnchor={city.anchor}
                    fill={city.isCapital ? '#BAE6FD' : '#E2E8F0'}
                    fontSize="11.5"
                    fontWeight="600"
                    style={{
                      textShadow: '0 2px 6px rgba(2, 6, 23, 0.95)',
                    }}
                  >
                    {city.name}
                  </text>
                </g>
              ))}
            </g>

            {/* Subtle Radial Guide Rings Focusing on Toronto */}
            <g stroke="rgba(0, 229, 255, 0.2)" strokeWidth="1" strokeDasharray="3 6" className="pointer-events-none">
              <circle
                cx={TORONTO_CANADA_POS.x}
                cy={TORONTO_CANADA_POS.y}
                r={isHoveringToronto ? 68 : 54}
                fill="none"
              />
              <circle
                cx={TORONTO_CANADA_POS.x}
                cy={TORONTO_CANADA_POS.y}
                r={isHoveringToronto ? 110 : 94}
                fill="none"
                stroke="rgba(255, 214, 0, 0.15)"
              />
            </g>

            {/* Interactive Toronto City Node (Click Target) */}
            <g
              transform={`translate(${TORONTO_CANADA_POS.x}, ${TORONTO_CANADA_POS.y})`}
              onClick={handleTriggerZoom}
              onMouseEnter={() => setIsHoveringToronto(true)}
              onMouseLeave={() => setIsHoveringToronto(false)}
              className="cursor-pointer"
              style={{ pointerEvents: 'all' }}
            >
              {/* Generous hit area for effortless clicking */}
              <circle
                r="48"
                fill="rgba(0, 0, 0, 0.001)"
                data-testid="canada-toronto-trigger"
              />

              {/* Ambient Neon Halo */}
              <circle r="40" fill="url(#torontoBeaconGlow)" className="pointer-events-none" />

              {/* Expanding Radar Rings */}
              <circle
                r="24"
                fill="none"
                stroke="#00E5FF"
                strokeWidth="1.75"
                strokeOpacity="0.65"
                className="pointer-events-none"
              >
                <animate
                  attributeName="r"
                  values="10;36;10"
                  dur="2.6s"
                  repeatCount="indefinite"
                />
                <animate
                  attributeName="stroke-opacity"
                  values="0.85;0.05;0.85"
                  dur="2.6s"
                  repeatCount="indefinite"
                />
              </circle>

              <circle
                r="16"
                fill="none"
                stroke="#FFD600"
                strokeWidth="2"
                strokeOpacity="0.85"
                className="pointer-events-none"
              >
                <animate
                  attributeName="r"
                  values="7;22;7"
                  dur="1.9s"
                  repeatCount="indefinite"
                />
                <animate
                  attributeName="stroke-opacity"
                  values="0.9;0.15;0.9"
                  dur="1.9s"
                  repeatCount="indefinite"
                />
              </circle>

              {/* Core Neon Toronto Dot */}
              <circle
                r={isHoveringToronto ? 9.5 : 8}
                fill="#FFD600"
                stroke="#FFFFFF"
                strokeWidth="2.5"
                filter="url(#neonDotGlow)"
                className="pointer-events-none"
              />

              {/* Callout Line & Label next to the Toronto Dot (positioned below Ottawa/Montréal so zero cities are covered) */}
              <line
                x1="12"
                y1="2"
                x2="44"
                y2="12"
                stroke="#FFD600"
                strokeWidth="2"
                className="pointer-events-none"
              />
              <g transform="translate(46, -12)">
                <rect
                  x="0"
                  y="0"
                  width="226"
                  height="46"
                  rx="8"
                  fill="rgba(7, 18, 34, 0.94)"
                  stroke="#FFD600"
                  strokeWidth="1.5"
                />
                <text
                  x="14"
                  y="19"
                  fill="#FFFFFF"
                  fontSize="13"
                  fontWeight="700"
                  letterSpacing="0.06em"
                >
                  TORONTO, ONTARIO
                </text>
                <text
                  x="14"
                  y="36"
                  fill="#00E5FF"
                  fontSize="11"
                  fontWeight="600"
                >
                  Click to zoom &amp; deploy Metro →
                </text>
              </g>
            </g>
          </g>
        </svg>
      </div>

      {/* Compact Top Overlay Instructions so the map and cities remain completely unobstructed */}
      <div className="relative z-10 pointer-events-none px-5 pt-4 flex flex-col md:flex-row items-start justify-between gap-3">
        <div className="bg-slate-950/80 backdrop-blur-md border border-slate-800/90 rounded-xl px-4 py-3 max-w-md pointer-events-auto shadow-xl">
          <div className="text-[11px] font-medium text-cyan-400 tracking-wide mb-0.5 flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5" />
            <span>Canada National Atlas · Stage 01</span>
          </div>
          <h1 className="text-base md:text-lg font-bold text-white tracking-tight">
            Greater Toronto Rapid Transit Hub
          </h1>
          <p className="text-xs text-slate-300 mt-1 leading-relaxed">
            Click the glowing <strong className="text-amber-300 font-semibold">Toronto</strong> beacon on Lake Ontario to zoom into the city and deploy all 15 Subway, LRT &amp; Express Bus lines.
          </p>
        </div>

        {/* Direct Zoom Button */}
        <div className="bg-slate-950/80 backdrop-blur-md border border-slate-800/90 rounded-xl px-3.5 py-2.5 flex items-center gap-3 pointer-events-auto shadow-xl">
          <div className="text-[11px] text-slate-300 font-mono-tabular hidden sm:block">
            <div className="text-white font-semibold">TORONTO · 43.65°N, 79.38°W</div>
            <div className="text-cyan-400">11 Rail Lines · 4 Express Bus</div>
          </div>

          <button
            type="button"
            onClick={handleTriggerZoom}
            aria-label="Zoom into Toronto Metro Network"
            className="px-3.5 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-semibold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer shadow-md"
          >
            <ZoomIn className="w-3.5 h-3.5" />
            <span>Enter Toronto Map</span>
          </button>
        </div>
      </div>
    </div>
  );
};
