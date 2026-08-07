# RamaPoint AI Illustration Specification

This document is a technical visual guide for an Illustration AI Agent. It details the user interface, design system, core widgets, and usage workflows of **RamaPoint** so you can generate precise diagrams, step-by-step visual tutorials, and infographics for our users.

---

## 🎨 1. Visual Theme & Styling Guide

When generating illustrations for RamaPoint, adhere to the following UI aesthetics:
*   **Color Theme**: Sleek Dark Mode.
    *   **Primary Background**: Dark charcoal / slate (`#111827` or `#1F2937`).
    *   **Accent Color**: Electric Indigo / Violet (`#6366F1`) used for active indicators, selections, and call-to-actions.
    *   **Text Color**: High-contrast off-white (`#F9FAFB`) with secondary text in slate-gray (`#9CA3AF`).
*   **Vector Shape Colors**:
    *   **Buildings**: Filled with light transparent teal (`#B8F7E4`, opacity `0.35`) and outlined in electric teal (`#7BE8C9`, weight `2px`).
    *   **Paths / Walkways**: Styled as glowing amber lines (`#FBBF24`, opacity `0.85`, weight `3px`).
    *   **Routing Nodes**: Rendered as bright, circular blue waypoints (`#3B82F6`) with glowing outer concentric rings.
    *   **Routing Edges**: Displayed as dashed white/blue lines connecting nodes.
*   **Typography**: Clean sans-serif sans-serif font family (Inter, Outfit, or Roboto) with rounded card edges (`border-radius: 12px` to `16px`).
*   **Glassmorphism**: Panel cards have a semi-transparent dark background (`rgba(31, 41, 55, 0.75)`) with a blur filter and subtle borders (`rgba(255, 255, 255, 0.08)`).

---

## 🖥️ 2. Core UI Layout & Components

An illustration of the RamaPoint editor should feature the following panels floating on top of a central map canvas:

```
┌─────────────────────────────────────────────────────────────────────────┐
│  🗺️ RAMAPOINT    [Project Name]   [Saved status]      [Export]  [Save]  │  ◄ Top Toolbar
├──────────────┬──────────────────────────────────────────┬──────────────┤
│              │  [Geoman Draw Toolbar]                   │              │
│ 👁️ Layers    │  ┌───┐                                    │ ⚙️ Properties │
│ 🏢 Buildings │  │ ⬡ │ (Buildings)                       │  Name: [...] │
│ 🛣️ Paths     │  │ ╱ │ (Paths)                           │  Style:      │
│ 📍 POIs      │  │ ✍ │ (Text tool)                       │  [Color  ]   │
│ 🔵 Nodes     │  └───┘                                    │  [Weight ]   │
│ ↗️ Edges     │                                          │              │
│              │                                          │  [✨ Snap &  │
│              │                                          │   Straighten]│
│              │                    ┌──────────────────┐  │              │
│              │                    │ 🗺️ BASE MAP      │  │  [Metadata]  │
│              │                    │ [🌐 Sat] [📍 GPS]│  │  [Delete  ]  │
│              │                    │ [🔵 Add] [↗️ Edge]│  │              │
│              │                    └──────────────────┘  │              │
└──────────────┴──────────────────────────────────────────┴──────────────┘
```

1.  **Top Toolbar**: Displays the RamaPoint brand logo, editable Project Name input field, a dynamic save status badge ("Saved" or "Unsaved •" with auto-save indicator), and primary action buttons (**💾 Save**, **📤 Export**).
2.  **Left Sidebar (Layers Menu)**: Contains collapsible lists of all drawn Buildings, Paths, POIs, Routing Nodes, and Edges. Each list item has:
    *   An interactive eye icon (`👁️` / `👁️‍🗨️`) to toggle map visibility.
    *   A target locator icon to immediately pan/zoom and focus on that specific element.
3.  **Right Sidebar (Properties Panel)**: Contextually displays editing fields when a feature is selected:
    *   Name and description input fields.
    *   Style parameter controls (Color Pickers, Stroke Weight Sliders).
    *   Custom key-value metadata list inputs.
    *   **✨ Straighten & Snap Corners** button (only for buildings/paths).
    *   A delete confirmation button (**🗑️ Delete Feature**).
4.  **Floating Map Controls**:
    *   **Geoman Drawing Tools**: Placed on the top-left map region to switch between drawing shapes, drawing polylines, adding text, and editing.
    *   **Base Map Card**: Floating card in the bottom-right. Contains buttons to switch map tile layers (Satellite, Terrain, Streets), a locate GPS button (`🎯`), viewport pin (`📌`), and custom key settings (`⚙️`). It also hosts the routing graph tools: **Add Node (🔵)** and **Draw Edge (↗️)**.

---

## 🏃 3. Key Workflows to Illustrate

Use the following guidelines to design specific workflow diagrams for users:

### Workflow A: Drawing & Styling Shapes
1.  **Draw**: User clicks the Pentagon icon on the Geoman toolbar and clicks on the map canvas to draw a polygon representing a building.
2.  **Select**: User clicks the building shape on the map, highlighting it with selection nodes and opening the Properties Panel.
3.  **Style**: User drags the color picker inside the Properties Panel to change the building's color from default teal to bright magenta. The map updates the color in real-time.

### Workflow B: Straighten & Snap (RDP)
1.  **Rough Sketch**: User draws a squiggly, hand-drawn path containing redundant points near an existing rectangular building.
2.  **Trigger**: User selects the path and clicks the **`✨ Straighten & Snap Corners`** button.
3.  **Result**: The path immediately straightens (RDP simplification), removes the squiggles, and aligns its vertices perfectly parallel to the building's walls (snapping within 10 meters).

### Workflow C: Dragging Floating Text Labels
1.  **Place**: User selects the Text tool (**T** icon), clicks the map, enters "Science Hall", and hits Enter. A text label floats on the map.
2.  **Relocate**: User clicks and drags the "Science Hall" label directly across the map to adjust its placement.
3.  **Adjust**: In the Properties Panel, the user increases the font size slider to `24px` and changes its color to bright yellow.

### Workflow D: Creating a Routing Graph
1.  **Node Placement**: User clicks the **Add Node** button (🔵) in the Base Map card, then clicks twice on the map to create Node 1 and Node 2.
2.  **Edge Connection**: User clicks the **Draw Edge** button (↗️), clicks Node 1, and then clicks Node 2. A line connects them.
3.  **Bidirectional / Walk Time**: User selects the edge, toggles **Bidirectional** in the properties panel, and views the calculated distance (meters) and walk time (seconds) updated in the statistics display.

---

## 🤖 4. Guidelines for the Illustration AI Agent

To generate high-quality tutorial graphics for this project, structure your generation prompts as follows:

*   **Prompt Template**:
    > "Isometric mockup of a dark-themed web application interface for a campus map editor. Showing a vector map on a dark charcoal grid. Bright neon teal polygons for buildings, neon amber polylines for paths, and pulsing blue circular nodes. A semi-transparent dark properties panel floats on the right with a glowing button that says 'Straighten & Snap'. Modern clean vector, neon accents, high UI detail, flat design, isolated background."
*   **Scene Structure**:
    *   Use **step indicators** (1, 2, 3 circles) with glowing connecting lines to direct the reader's eye.
    *   Include **before-and-after split screens** specifically when demonstrating the *Straighten & Snap* feature (showing a jagged hand-drawn polyline on the left transforming into a clean straight snapped line on the right).
    *   Make sure UI text boxes inside panels look like actual input fields with cursors to represent interactivity.
