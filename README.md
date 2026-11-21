# catrack — Toronto Transit Map & Route Planner

**Live Demo:** [catrack-six.vercel.app](https://catrack-six.vercel.app)

> **Note:** This is an experimental personal project exploring AI-assisted development (vibe-coding) to build an interactive transit map and route planner for the Greater Toronto & Hamilton Area (GTHA).

## Features

- **GTHA Network Map:** Visualizes 14 major transit lines across TTC Subway, UP Express, GO Rail, LRT, and the 407 Express Bus corridor.
- **Line Filtering:** Toggle visibility by service tier (Metro & GO Rail, LRT & 407 Bus, or All Lines).
- **Route Planner:** Computes the shortest path between stations or popular landmarks (e.g., CN Tower → Pearson Airport, Union → Niagara Falls) with estimated travel time, distance (km), stop count, and fare breakdowns.
- **Journey Simulation:** Animated path playback to highlight transfers and step-by-step routing.
- **Multi-Region Viewports:** Quick camera presets for Toronto Core, Full GTHA, Hamilton & Niagara, Kitchener & Guelph, Oshawa, and a Canada-wide overview.

## Tech Stack

- **Frontend:** React, TypeScript, Vite
- **Styling:** Tailwind CSS
- **Maps & Graphics:** Google Maps API, Custom SVG Overlays
- **Testing:** Unit tests for the routing engine (`pathfinding.test.ts`)

## Getting Started

1. **Clone the repository:**
   ```bash
   git clone https://github.com/alinboy0208/catrack.git
   cd catrack
   ```

2. **Install dependencies:**
   ```bash
   bun install
   # or: npm install
   ```

3. **Set up environment variables:**
   Create a `.env` file from `.env.example` and add your Google Maps API key:
   ```bash
   cp .env.example .env
   ```

4. **Start the development server:**
   ```bash
   bun run dev
   # or: npm run dev
   ```

## Project Structure

```text
src/
├── components/
│   ├── TorontoNeonMap.tsx       # Main map canvas and transit line overlays
│   ├── RoutePlannerSidebar.tsx  # Route search, line filters, and trip breakdown
│   └── CanadaMapView.tsx        # Canada national overview mode
├── data/
│   └── torontoTransitData.ts    # Station coordinates and network graph definitions
├── utils/
│   └── pathfinding.test.ts      # Unit tests for pathfinding logic
└── App.tsx                      # Application state and layout
```
