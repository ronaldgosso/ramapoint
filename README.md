# 🗺️ RamaPoint — PWA Campus Map Editor

RamaPoint is a professional, offline-capable Progressive Web Application (PWA) designed for campus map creation, custom vector feature drawing, POI management, and routing network editing. It provides full integration capabilities to export spatial coordinates and navigation graphs into mobile application frameworks.

---

## 🚀 Key Functionalities

### 1. Spatial Vector Map Editor
Draw and customize vector shapes directly on the map:
- **Buildings (Polygons)**: Design custom campus layouts with customizable preset colors, border strokes, and custom properties (metadata).
- **Paths (Polylines)**: Map walkways, stairways, and roads, setting stroke weights and colors.
- **Points of Interest (POIs)**: Pin landmarks, amenities, and academics with a select category and custom emoji icon (e.g., ☕, 🎓, 🚗).
- **Offline Cache**: Integrates IndexedDB (via the `idb` API) to cache tile layers locally, enabling complete offline functionality.

### 2. Intelligent Routing Graph Editor
Map a pathfinding navigation network over your campus:
- **Routing Nodes**: Place junctions, waypoints, entrances, and destinations on the map.
- **Routing Edges**: Interactively link nodes. RamaPoint automatically calculates the geographical distance (in meters) between connected coordinates using the **Haversine formula**.
- **Dynamic Styling**: Select any node or edge to open the Properties Panel, edit custom styles, change colors dynamically, adjust path line weights, or safely remove connections.

### 3. Smart Initial Geolocation
Upon startup, if the project is using its default coordinates, RamaPoint uses the browser's Geolocation API to request the user's location, centering the map viewport and saving the coords in the project configuration.

---

## 🛠️ Architecture & Under-the-Hood Mechanics

### Programmatic Map Synchronization
* **Drawing Mode Hook**: Toolbar selections trigger React context updates, which are synchronized to Leaflet-Geoman's drawing tools in `GeomanControls.jsx` (e.g., `map.pm.enableDraw('Polygon')`).
* **Bidirectional Events**: Completed drawings call a `pm:create` hook that captures the geometry coords, wraps clean up procedures in asynchronous ticks to avoid Geoman lifecycle bugs, and saves details to the global state.
* **Stale Closure Mitigation**: Mouse click handlers inside Leaflet layers utilize mutable references (`handleNodeClickRef`) to bypass stale React closures, keeping interactive routing layers perfectly updated.
* **Suppressed Backdrops**: Active modal dialog overlays (such as the *Export Modal* or *Project Manager*) apply a `modal-open` class tag to hide Leaflet's tile container (`.leaflet-tile-pane`) dynamically, giving the user a distraction-free screen layout.

---

## 📱 Integration into Other Mobile Frameworks

When you click **Export**, RamaPoint packages your layouts into a ZIP containing two data assets:
1. `campus.geojson`: Contains vector features (buildings, paths, POIs) and metadata.
2. `routing_graph.json`: Contains the navigation grid array of nodes and edges (source/target IDs, distances, coordinates).

Here is how you can use these assets in other frameworks:

### 🐦 Flutter Integration
Use the `flutter_map` package to render your `campus.geojson` features, and construct your own Dijkstra/A* pathfinder using the routing JSON.

```dart
// Import packages
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'dart:convert';

// Load geojson and draw features
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
Use the `react-native-maps` library to render vector elements dynamically.

```jsx
import MapView, { Polygon, Polyline, Marker } from 'react-native-maps';
import campusGeoJSON from './assets/campus.json';

export default function CampusMap() {
  return (
    <MapView
      style={{ flex: 1 }}
      initialRegion={{
        latitude: 40.7128,
        longitude: -74.006,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      }}
    >
      {campusGeoJSON.features.map((feature) => {
        const type = feature.properties.type;
        const coordinates = feature.geometry.coordinates[0].map(coord => ({
          latitude: coord[1],
          longitude: coord[0]
        }));

        if (type === 'building') {
          return (
            <Polygon
              key={feature.id}
              coordinates={coordinates}
              fillColor={feature.properties.color + "66"} // hex opacity
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

### 🍏 iOS Swift Integration (MapKit)
Use Apple's `MKGeoJSONDecoder` to parse coordinates and draw overlays natively.

```swift
import MapKit

class CampusViewController: UIViewController, MKMapViewDelegate {
    let mapView = MKMapView()
    
    override func viewDidLoad() {
        super.viewDidLoad()
        setupMap()
        loadGeoJSON()
    }
    
    func loadGeoJSON() {
        guard let url = Bundle.main.url(forResource: "campus", withExtension: "geojson"),
              let data = try? Data(contentsOf: url) else { return }
        
        let decoder = MKGeoJSONDecoder()
        if let features = try? decoder.decode(data) as? [MKGeoJSONFeature] {
            for feature in features {
                for geometry in feature.geometry {
                    if let polygon = geometry as? MKPolygon {
                        mapView.addOverlay(polygon)
                    }
                }
            }
        }
    }
    
    func mapView(_ mapView: MKMapView, rendererFor overlay: MKOverlay) -> MKOverlayRenderer {
        if let polygon = overlay as? MKPolygon {
            let renderer = MKPolygonRenderer(polygon: polygon)
            renderer.fillColor = UIColor.systemGreen.withAlphaComponent(0.3)
            renderer.strokeColor = UIColor.systemGreen
            renderer.lineWidth = 2
            return renderer
        }
        return MKOverlayRenderer(overlay: overlay)
    }
}
```
