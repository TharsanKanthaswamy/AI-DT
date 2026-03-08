# System Architecture

## Overview

The Smart Assembly Line Optimizer is a modern web application designed to demonstrate Industry 4.0 concepts. It features a real-time dashboard for factory monitoring and an immersive 3D digital twin for visualizing assembly line processes.

## Technology Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router)
- **Language**: TypeScript
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/)
- **3D Visualization**:
    - [Three.js](https://threejs.org/)
    - [React Three Fiber](https://docs.pmnd.rs/react-three-fiber)
    - [Drei](https://github.com/pmndrs/drei)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Charts**: [Recharts](https://recharts.org/)

## Frontend Architecture

The application utilizes the **Next.js App Router** for handling navigation and rendering.

### Route Structure
- **`/` (Dashboard)**: The main entry point.
    - **Layout**: Standard header/footer layout.
    - **Components**: Composed of several specialized dashboard widgets (`FactoryOverview`, `OptimizationControls`, `ResultsDashboard`, `ScheduleTimeline`, `UtilizationChart`).
    - **State Management**: Uses local React state (`useState`) to manage the simulation modes ("Classical" vs "Quantum") and UI visibility.

- **`/digital-twin` (3D Visualization)**: A dedicated route for the 3D experience.
    - **Purpose**: Provides a high-fidelity visual representation of the factory floor.
    - **Implementation**: Heavily relies on `react-three-fiber` `Canvas` to render 3D scenes.
    - **Components**: `FactoryFloor`, `MachineNode`, `ConveyorBelt`, `ProductPCB`.

### Component Design
- **Atomic & Functional**: Components are designed to be functional and focused on specific tasks (e.g., `MachineCard` displays status for one machine).
- **Styling**: Uses utility-first CSS (Tailwind) for rapid and consistent styling. Dark mode support is built-in.

## Data Flow & Simulation

Currently, the application operates in a **"Demo Mode"**.

1. **Simulation Logic**: The application simulates backend processes using `setTimeout` and local state transitions.
2. **Data Source**: Data is currently mocked within the components (e.g., random generation or static constants in `ScheduleTimeline.tsx`).
3. **Interactivity**: Users can toggle between "Classical" and "Quantum" optimization modes. This triggers a visual update in the dashboard (changing charts, colors, and alerts) to demonstrate the *impact* of the optimization, without connecting to a real quantum backend yet.

## Future Integration

As indicated in the application footer, the architecture is designed to be **"Digital Twin Simulation Ready"**.

- **Backend Connectivity**: The controls (`OptimizationControls`) are positioned to hook into API endpoints (e.g., `/api/optimize`).
- **IoT Integration**: The `MachineCard` components can be updated to subscribe to real-time WebSockets for live telemetry.
