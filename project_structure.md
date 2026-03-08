# Project Structure

This document outlines the file and directory structure of the Smart Assembly Line Optimizer project.

## Directory Layout

```
Maxwell-Optimizations-main/
├── src/
│   ├── app/                    # Next.js App Router directories
│   │   ├── digital-twin/       # Route for the 3D Digital Twin visualization
│   │   ├── globals.css         # Global styles and Tailwind directives
│   │   ├── layout.tsx          # Root layout component
│   │   └── page.tsx            # Main Dashboard entry point (/)
│   │
│   └── components/             # Reusable React components
│       ├── digital-twin/       # 3D-specific components (Three.js/Fiber)
│       │   ├── ConveyorBelt.tsx
│       │   ├── FactoryFloor.tsx
│       │   ├── MachineNode.tsx
│       │   ├── ProductPCB.tsx
│       │   ├── SceneContainer.tsx
│       │   └── SimulationControls.tsx
│       │
│       ├── FactoryOverview.tsx     # High-level factory metrics view
│       ├── MachineCard.tsx         # Individual machine status card
│       ├── OptimizationControls.tsx # UI for toggling modes (Classical/Quantum)
│       ├── ResultsDashboard.tsx    # Detailed metrics display
│       ├── ScheduleTimeline.tsx    # Production schedule visualization
│       └── UtilizationChart.tsx    # Graphical resource usage
│
├── public/                     # Static assets
├── .eslintrc.json              # ESLint configuration
├── next.config.ts              # Next.js configuration
├── package.json                # Project dependencies and scripts
├── postcss.config.mjs          # PostCSS configuration for Tailwind
├── tailwind.config.ts          # Tailwind CSS configuration
└── tsconfig.json               # TypeScript configuration
```

## Key Files Description

| File | Description |
|------|-------------|
| `src/app/page.tsx` | The main landing page acting as the "Command Center". Contains the Dashboard, Factory Overview, and Optimization Controls. |
| `src/app/digital-twin/page.tsx` | The dedicated route for the immersive 3D Digital Twin experience. |
| `src/components/OptimizationControls.tsx` | Key interactive component for switching between Classical and Quantum optimization modes. |
| `src/components/digital-twin/SceneContainer.tsx` | Likely the main wrapper for the 3D Canvas and scene setup. |
