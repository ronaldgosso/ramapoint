# <img src="public/logo.png" width="42" height="42" style="vertical-align: middle; margin-right: 8px;" /> RamaPoint — PWA Campus Map Editor

RamaPoint is a professional, offline-capable Progressive Web Application (PWA) designed for campus map creation, custom vector feature drawing, POI landmark management, and routing network editing. It provides full integration capabilities to export spatial coordinates and navigation graphs into mobile application frameworks.

---

## 🌟 Key Features

* **Spatial Vector Map Editor**: Draw buildings (polygons), paths (polylines), and points of interest (markers) with unified customization controls (name, category, custom emoji, background fill color, border/stroke color, and stroke weight width).
* **Base Map Custom Tile Layers**: Switch between OpenStreetMap, CartoDB Positron, Esri Satellite, Mapbox, and Google Maps. Access built-in API keys settings (`⚙️`) to input and persist custom Mapbox/Google tokens.
* **Active Navigation Tracking**: Continuous high-accuracy GPS location rendering via a pulsing blue radar dot, with map centering (`🎯`) and manual viewport coordinate pinning (`📌`) to customize project starting positions.
* **Intelligent Routing Graph**: Place junctions, entrances, waypoints, and destinations on the map, connect them with routing edges, and manage their visibility or deletion. Edges calculate distance automatically via the **Haversine formula**.
* **Global Keyboard Shortcuts**: Access actions rapidly with `Ctrl + S` (Save), `Ctrl + Z`/`Ctrl + Y` (Undo/Redo), `Esc` (Exit modes), `Delete` (Remove element), and keys `B`/`P`/`M` for drawing tools.
* **Responsive Layouts**: Optimizes workspace viewports on mobile devices by shifting layout panels into overlays and bottom drawer navigation bars.

---

## 🛠️ Tech Stack & Architecture

- **Frontend**: React 19, Vite, Leaflet, React-Leaflet, and Leaflet-Geoman (spatial drawing mechanics).
- **Styling**: Vanilla CSS with custom properties (CSS variables) for modern dark-themed aesthetics.
- **Persistence**: IndexedDB (via the `idb` API) with debounced auto-save triggers.
- **State Management**: React Reducer pattern with integrated multi-level Undo/Redo history stack.

### Directory Structure

```text
ramapoint/
├── src/
│   ├── components/
│   │   ├── Export/        # GeoJSON/Graph Zip packing modals
│   │   ├── Map/           # Leaflet viewports and Geoman sync layers
│   │   ├── Panels/        # Layers sidebar and properties controllers
│   │   └── UI/            # Navigation toolbars, status bars, and toasts
│   ├── context/           # AppState React context
│   ├── hooks/             # Project state IndexedDB controllers and undo/redo hooks
│   ├── lib/               # Utility functions (coordinate algorithms, distance math)
│   ├── App.jsx            # Layout viewport shell and keybinding listeners
│   ├── index.css          # Design system variables, animations, and overlays
│   └── main.jsx           # App entrypoint
├── README.md              # Project overview
└── CONTRIBUTING.md        # Guidelines for contributions
```

---

## 🚀 Local Development Setup

To run this project locally, ensure you have Node.js installed, then execute:

```bash
# Clone the repository
git clone https://github.com/ronaldgosso/ramapoint.git
cd ramapoint

# Install dependencies
npm install

# Run the local development server
npm run dev

# Run ESLint linter
npm run lint

# Build production bundle
npm run build
```

---

## 📱 Integration into Mobile Frameworks

When exporting your campus layouts, RamaPoint packages coordinates into a ZIP containing `campus.geojson` (vector features) and `routing_graph.json` (navigation graph of nodes/edges).

Refer to the integration snippets below for parsing these assets:

### 🐦 Flutter Integration
```dart
Future<List<Polygon>> loadBuildings(BuildContext context) async {
  String data = await DefaultAssetBundle.of(context).loadString('assets/campus.geojson');
  Map<String, dynamic> json = jsonDecode(data);
  List<Polygon> polygons = [];

  for (var feature in json['features']) {
    if (feature['properties']['type'] == 'building') {
      List<LatLng> points = [];
      for (var ring in feature['geometry']['coordinates'][0]) {
        points.add(LatLng(ring[1], ring[0])); // GeoJSON [lng, lat] to Leaflet [lat, lng]
      }
      polygons.add(Polygon(
        points: points,
        color: Color(int.parse(feature['properties']['color'].replaceAll('#', '0xff'))).withOpacity(0.4),
        borderColor: Color(int.parse(feature['properties']['strokeColor'].replaceAll('#', '0xff'))),
        borderStrokeWidth: 2,
      ));
    }
  }
  return polygons;
}
```

### ⚛️ React Native Integration
```jsx
import MapView, { Polygon } from 'react-native-maps';
import campusGeoJSON from './assets/campus.json';

export default function CampusMap() {
  return (
    <MapView style={{ flex: 1 }}>
      {campusGeoJSON.features.map((feature) => {
        if (feature.properties.type === 'building') {
          const coordinates = feature.geometry.coordinates[0].map(coord => ({
            latitude: coord[1],
            longitude: coord[0]
          }));
          return (
            <Polygon
              key={feature.id}
              coordinates={coordinates}
              fillColor={feature.properties.color + "66"}
              strokeColor={feature.properties.strokeColor}
              strokeWidth={2}
            />
          );
        }
      })}
    </MapView>
  );
}
```

---

## 🤝 Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](file:///c:/Users/Neptune/Documents/Projects/ramapoint/CONTRIBUTING.md) for details on code style, branching, and pull request procedures.
