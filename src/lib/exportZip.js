import JSZip from 'jszip'
import { buildGeoJSON } from './geojsonBuilder.js'
import { buildRoutingGraph } from './routingGraphBuilder.js'

/**
 * Generate and download the campus map zip export
 * @param {Object} project - Current project state
 * @param {Array} features - Feature list
 * @param {Array} routingNodes - Routing graph nodes
 * @param {Array} routingEdges - Routing graph edges
 * @returns {Promise<Blob>} zip blob
 */
export async function generateExportZip(project, features, routingNodes, routingEdges) {
  const zip = new JSZip()

  // 1. campus.geojson
  const geojson = buildGeoJSON(features)
  zip.file('campus.geojson', JSON.stringify(geojson, null, 2))

  // 2. routing_graph.json
  const routingGraph = buildRoutingGraph(routingNodes, routingEdges)
  zip.file('routing_graph.json', JSON.stringify(routingGraph, null, 2))

  // 3. project.json — metadata for perfect round-trip re-import
  const projectMeta = {
    name: project.name,
    description: project.description || '',
    id: project.id,
    center: project.center,
    zoom: project.zoom,
    createdAt: project.createdAt,
    exportedAt: new Date().toISOString(),
    ramapoint_version: '2.0.0',
  }
  zip.file('project.json', JSON.stringify(projectMeta, null, 2))

  // 4. campus.kml — for Google Earth / Google Maps import
  zip.file('campus.kml', buildKML(project, features))

  // 5. README.md
  const readme = generateReadme(project, geojson, routingGraph)
  zip.file('README.md', readme)

  // 6. Code snippets folder
  const snippets = zip.folder('code_snippets')
  snippets.file('flutter_example.dart', FLUTTER_SNIPPET(project))
  snippets.file('react_native_example.jsx', REACT_NATIVE_SNIPPET(project))
  snippets.file('swift_example.swift', SWIFT_SNIPPET(project))

  // Generate and return blob
  const blob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  })

  return blob
}

/**
 * Download a standalone KML file
 */
export function downloadKML(project, features) {
  const kml = buildKML(project, features)
  const blob = new Blob([kml], { type: 'application/vnd.google-earth.kml+xml' })
  downloadBlob(blob, `${project.name.toLowerCase().replace(/\s+/g, '-')}.kml`)
}

/**
 * Build a KML string from project features
 */
export function buildKML(project, features) {
  const placemarks = features.map((f) => {
    const name = f.name || 'Feature'
    const desc = f.category ? `<description>${f.category}</description>` : ''
    const geom = f.geometry
    if (!geom) return ''

    let geometryKml = ''
    if (geom.type === 'Point') {
      const [lng, lat] = geom.coordinates
      geometryKml = `<Point><coordinates>${lng},${lat},0</coordinates></Point>`
    } else if (geom.type === 'LineString') {
      const coordStr = geom.coordinates.map(([lng, lat]) => `${lng},${lat},0`).join(' ')
      geometryKml = `<LineString><tessellate>1</tessellate><coordinates>${coordStr}</coordinates></LineString>`
    } else if (geom.type === 'Polygon') {
      const ring = geom.coordinates[0] || []
      const coordStr = ring.map(([lng, lat]) => `${lng},${lat},0`).join(' ')
      geometryKml = `<Polygon><outerBoundaryIs><LinearRing><tessellate>1</tessellate><coordinates>${coordStr}</coordinates></LinearRing></outerBoundaryIs></Polygon>`
    } else {
      return ''
    }

    return `    <Placemark>
      <name>${escapeXml(name)}</name>
      ${desc}
      ${geometryKml}
    </Placemark>`
  }).filter(Boolean).join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${escapeXml(project.name || 'Campus Map')}</name>
    <description>Exported from RamaPoint on ${new Date().toLocaleDateString()}</description>
${placemarks}
  </Document>
</kml>`
}

function escapeXml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/**
 * Trigger download of a Blob in the browser
 */
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function generateReadme(project, geojson, routingGraph) {
  return `# ${project.name || 'Campus Map'} — Exported by RamaPoint

Generated: ${new Date().toISOString()}

## Files

| File | Description |
|------|-------------|
| \`campus.geojson\` | All map features (buildings, paths, POIs) |
| \`routing_graph.json\` | Navigation graph with ${routingGraph.stats.nodeCount} nodes, ${routingGraph.stats.edgeCount} edges |
| \`code_snippets/\` | Integration examples for Flutter, React Native, Swift |

## Statistics

- Features: ${geojson.features.length}
- Buildings: ${geojson.features.filter(f => f.properties.type === 'building').length}
- Paths: ${geojson.features.filter(f => f.properties.type === 'path').length}
- POIs: ${geojson.features.filter(f => f.properties.type === 'poi').length}
- Routing nodes: ${routingGraph.stats.nodeCount}
- Total path distance: ${routingGraph.stats.totalDistance}m

## Usage

See \`code_snippets/\` for ready-to-use integration examples.
`
}

export const FLUTTER_SNIPPET = (project) => `// Flutter Integration — flutter_map + geojson
// pubspec.yaml: flutter_map: ^7.0.0, http: ^1.0.0

import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'dart:convert';
import 'dart:io';

class CampusMapView extends StatefulWidget {
  const CampusMapView({super.key});

  @override
  State<CampusMapView> createState() => _CampusMapViewState();
}

class _CampusMapViewState extends State<CampusMapView> {
  Map<String, dynamic>? campusGeoJson;
  Map<String, dynamic>? routingGraph;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    final geoJsonStr = await rootBundle.loadString('assets/campus.geojson');
    final routingStr = await rootBundle.loadString('assets/routing_graph.json');
    setState(() {
      campusGeoJson = jsonDecode(geoJsonStr);
      routingGraph = jsonDecode(routingStr);
    });
  }

  @override
  Widget build(BuildContext context) {
    return FlutterMap(
      options: const MapOptions(
        initialCenter: LatLng(${project.center?.[0] || 40.71}, ${project.center?.[1] || -74.00}),
        initialZoom: ${project.zoom || 16},
      ),
      children: [
        TileLayer(
          urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
          userAgentPackageName: 'com.example.campus',
        ),
        if (campusGeoJson != null) ..._buildFeatureLayers(),
      ],
    );
  }

  List<Widget> _buildFeatureLayers() {
    final features = campusGeoJson!['features'] as List;
    final polygons = <Polygon>[];
    final polylines = <Polyline>[];
    final markers = <Marker>[];

    for (final feature in features) {
      final type = feature['properties']['type'];
      final color = _parseColor(feature['properties']['color'] ?? '#B8F7E4');
      final geometry = feature['geometry'];

      if (type == 'building' && geometry['type'] == 'Polygon') {
        final coords = (geometry['coordinates'][0] as List)
            .map((c) => LatLng(c[1].toDouble(), c[0].toDouble()))
            .toList();
        polygons.add(Polygon(points: coords, color: color.withOpacity(0.4), borderColor: color, borderStrokeWidth: 2));
      } else if (type == 'path' && geometry['type'] == 'LineString') {
        final coords = (geometry['coordinates'] as List)
            .map((c) => LatLng(c[1].toDouble(), c[0].toDouble()))
            .toList();
        polylines.add(Polyline(points: coords, color: color, strokeWidth: 3));
      } else if (type == 'poi' && geometry['type'] == 'Point') {
        final coord = geometry['coordinates'];
        markers.add(Marker(
          point: LatLng(coord[1].toDouble(), coord[0].toDouble()),
          child: const Icon(Icons.location_pin, color: Colors.redAccent, size: 30),
        ));
      }
    }

    return [
      PolygonLayer(polygons: polygons),
      PolylineLayer(polylines: polylines),
      MarkerLayer(markers: markers),
    ];
  }

  Color _parseColor(String hex) {
    hex = hex.replaceAll('#', '');
    if (hex.length == 6) hex = 'FF$hex';
    return Color(int.parse(hex, radix: 16));
  }
}
`

export const REACT_NATIVE_SNIPPET = (project) => `// React Native Integration — react-native-maps
// npm install react-native-maps

import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import MapView, { Polygon, Polyline, Marker } from 'react-native-maps';

// Import your exported JSON files
const campusGeoJson = require('./campus.geojson');
const routingGraph = require('./routing_graph.json');

export default function CampusMapView() {
  const [features, setFeatures] = useState([]);
  const [routeNodes, setRouteNodes] = useState([]);

  useEffect(() => {
    setFeatures(campusGeoJson.features || []);
    setRouteNodes(routingGraph.nodes || []);
  }, []);

  const renderFeature = (feature, index) => {
    const { type, color = '#B8F7E4' } = feature.properties;
    const { geometry } = feature;

    if (type === 'building' && geometry.type === 'Polygon') {
      const coords = geometry.coordinates[0].map(([lng, lat]) => ({ latitude: lat, longitude: lng }));
      return (
        <Polygon
          key={feature.id || index}
          coordinates={coords}
          fillColor={color + '66'}
          strokeColor={color}
          strokeWidth={2}
        />
      );
    }
    if (type === 'path' && geometry.type === 'LineString') {
      const coords = geometry.coordinates.map(([lng, lat]) => ({ latitude: lat, longitude: lng }));
      return (
        <Polyline key={feature.id || index} coordinates={coords} strokeColor={color} strokeWidth={3} />
      );
    }
    if (type === 'poi' && geometry.type === 'Point') {
      const [lng, lat] = geometry.coordinates;
      return (
        <Marker key={feature.id || index} coordinate={{ latitude: lat, longitude: lng }}
          title={feature.properties.name} />
      );
    }
    return null;
  };

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: ${project.center?.[0] || 40.71},
          longitude: ${project.center?.[1] || -74.00},
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        }}
      >
        {features.map(renderFeature)}
        {routeNodes.map((node, i) => (
          <Marker
            key={node.id || i}
            coordinate={{ latitude: node.lat, longitude: node.lng }}
            title={node.label}
            pinColor="blue"
          />
        ))}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { width: '100%', height: '100%' },
});
`

export const SWIFT_SNIPPET = (project) => `// iOS Swift Integration — MapKit
// Add campus.geojson and routing_graph.json to your Xcode project bundle

import MapKit
import UIKit

class CampusMapViewController: UIViewController, MKMapViewDelegate {
    let mapView = MKMapView()

    override func viewDidLoad() {
        super.viewDidLoad()
        setupMapView()
        loadCampusData()
    }

    private func setupMapView() {
        mapView.frame = view.bounds
        mapView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        mapView.delegate = self
        view.addSubview(mapView)

        let region = MKCoordinateRegion(
            center: CLLocationCoordinate2D(latitude: ${project.center?.[0] || 40.71}, longitude: ${project.center?.[1] || -74.00}),
            span: MKCoordinateSpan(latitudeDelta: 0.005, longitudeDelta: 0.005)
        )
        mapView.setRegion(region, animated: false)
    }

    private func loadCampusData() {
        guard let geoJsonUrl = Bundle.main.url(forResource: "campus", withExtension: "geojson"),
              let data = try? Data(contentsOf: geoJsonUrl) else { return }

        do {
            let geoJsonObjects = try MKGeoJSONDecoder().decode(data)
            for object in geoJsonObjects {
                if let feature = object as? MKGeoJSONFeature {
                    processFeature(feature)
                }
            }
        } catch {
            print("GeoJSON decode error: \\(error)")
        }
    }

    private func processFeature(_ feature: MKGeoJSONFeature) {
        var featureType = "unknown"
        var color = UIColor.systemGreen

        if let props = feature.properties,
           let json = try? JSONSerialization.jsonObject(with: props) as? [String: Any] {
            featureType = json["type"] as? String ?? "unknown"
            if let colorHex = json["color"] as? String {
                color = UIColor(hex: colorHex) ?? .systemGreen
            }
        }

        for geometry in feature.geometry {
            switch geometry {
            case let polygon as MKPolygon where featureType == "building":
                polygon.title = feature.identifier
                mapView.addOverlay(polygon)
            case let polyline as MKPolyline where featureType == "path":
                polyline.title = feature.identifier
                mapView.addOverlay(polyline)
            case let point as MKPointAnnotation where featureType == "poi":
                mapView.addAnnotation(point)
            default:
                break
            }
        }
    }

    // MARK: - MKMapViewDelegate
    func mapView(_ mapView: MKMapView, rendererFor overlay: MKOverlay) -> MKOverlayRenderer {
        if let polygon = overlay as? MKPolygon {
            let renderer = MKPolygonRenderer(polygon: polygon)
            renderer.fillColor = UIColor(hex: "#B8F7E4")?.withAlphaComponent(0.4)
            renderer.strokeColor = UIColor(hex: "#B8F7E4")
            renderer.lineWidth = 2
            return renderer
        }
        if let polyline = overlay as? MKPolyline {
            let renderer = MKPolylineRenderer(polyline: polyline)
            renderer.strokeColor = UIColor(hex: "#B8F7E4")
            renderer.lineWidth = 3
            return renderer
        }
        return MKOverlayRenderer(overlay: overlay)
    }
}

// UIColor hex extension
extension UIColor {
    convenience init?(hex: String) {
        var hexStr = hex.trimmingCharacters(in: .whitespacesAndNewlines)
        hexStr = hexStr.hasPrefix("#") ? String(hexStr.dropFirst()) : hexStr
        guard hexStr.count == 6,
              let rgb = UInt64(hexStr, radix: 16) else { return nil }
        self.init(
            red: CGFloat((rgb >> 16) & 0xFF) / 255.0,
            green: CGFloat((rgb >> 8) & 0xFF) / 255.0,
            blue: CGFloat(rgb & 0xFF) / 255.0,
            alpha: 1.0
        )
    }
}
`
