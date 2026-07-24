import { RISK_COLORS } from '@/constants/theme';
import type { RiskBarangay, RiskMarker } from '@/types/riskMap';

export type MapBaseLayer = 'street' | 'flat' | 'satellite';

interface BuildRiskMapHtmlOptions {
  barangays: RiskBarangay[];
  markers?: RiskMarker[];
  selectedName?: string | null;
  showHeatmap?: boolean;
  showMarkers?: boolean;
  baseLayer?: MapBaseLayer;
  center?: { lat: number; lng: number };
  zoom?: number;
  backgroundColor?: string;
}

const RISK_INTENSITY: Record<string, number> = {
  Critical: 1.0,
  High: 0.8,
  Moderate: 0.5,
  Low: 0.3,
};

export function buildRiskMapHtml({
  barangays,
  markers = [],
  selectedName = null,
  showHeatmap = false,
  showMarkers = true,
  baseLayer = 'street',
  center,
  zoom = 11.5,
  backgroundColor = '#E5E7EB',
}: BuildRiskMapHtmlOptions): string {
  if (barangays.length === 0) {
    return `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head><body><div id="map" style="width:100%;height:100%;"></div></body></html>`;
  }

  const centerLat = center?.lat ?? barangays.reduce((s, b) => s + b.lat, 0) / barangays.length;
  const centerLng = center?.lng ?? barangays.reduce((s, b) => s + b.lng, 0) / barangays.length;

  const polygonData = barangays
    .filter((b) => Array.isArray(b.boundary) && b.boundary.length >= 3)
    .map((b) => ({
      id: b.id,
      name: b.name,
      risk: b.risk,
      color: RISK_COLORS[b.risk].dot,
      coords: b.boundary,
      incidents: b.verifiedIncidents,
      selected: b.id === selectedName || b.name === selectedName,
    }));

  const fallbackData = barangays
    .filter((b) => !Array.isArray(b.boundary) || b.boundary.length < 3)
    .map((b) => ({
      id: b.id,
      name: b.name,
      risk: b.risk,
      color: RISK_COLORS[b.risk].dot,
      lat: b.lat,
      lng: b.lng,
      incidents: b.verifiedIncidents,
      selected: b.id === selectedName || b.name === selectedName,
    }));

  const markerData = showMarkers
    ? markers.map((m) => ({
        id: m.id,
        barangay: m.barangay,
        lat: m.lat,
        lng: m.lng,
        color: RISK_COLORS[m.severity].dot,
      }))
    : [];

  const heatPoints = markers.map((m) => [m.lat, m.lng, RISK_INTENSITY[m.severity] ?? 0.3]);

  return `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body, #map { width: 100%; height: 100%; background: ${backgroundColor}; }
    .leaflet-control-attribution { display: none; }
    .leaflet-popup-content-wrapper { border-radius: 12px; font-family: -apple-system, sans-serif; font-size: 13px; box-shadow: 0 4px 16px rgba(0,0,0,0.15); }
    .leaflet-popup-tip-container { display: none; }
    .barangay-label {
      background: rgba(255,255,255,0.92); border: none; box-shadow: 0 1px 4px rgba(0,0,0,0.25);
      border-radius: 6px; padding: 2px 6px; font-family: -apple-system, sans-serif;
      font-size: 10.5px; font-weight: 700; color: #1E1B4B; pointer-events: none;
    }
    .barangay-label::before { display: none; }
    .fire-pin { width: 10px; height: 10px; border-radius: 50%; border: 1px solid #fff; box-shadow: 0 1px 4px rgba(0,0,0,0.4); }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script src="https://unpkg.com/leaflet.heat@0.2.0/dist/leaflet-heat.js"></script>
  <script>
    var map = L.map('map', { zoomControl: true, attributionControl: false }).setView([${centerLat}, ${centerLng}], ${zoom});

    var streetLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 20 });
    var flatLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', { maxZoom: 20, subdomains: 'abcd' });
    var satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { maxZoom: 20 });
    var layers = { street: streetLayer, flat: flatLayer, satellite: satelliteLayer };
    var currentKey = '${baseLayer}';
    layers[currentKey].addTo(map);

    function switchMapView(key) {
      if (!layers[key] || key === currentKey) return;
      map.removeLayer(layers[currentKey]);
      currentKey = key;
      layers[currentKey].addTo(map);
    }

    // Refs kept by id so screens can pan/open-popup programmatically via
    // injectJavaScript without rebuilding the whole map (window.focusBarangay).
    var polyRefs = {};
    var fallbackRefs = {};

    var polygons = ${JSON.stringify(polygonData)};
    polygons.forEach(function(p) {
      var poly = L.polygon(p.coords, {
        color: p.color, weight: p.selected ? 3 : 1.5, fillColor: p.color, fillOpacity: p.selected ? 0.45 : 0.22,
      }).addTo(map);
      poly.bindTooltip(p.name, { permanent: true, direction: 'center', className: 'barangay-label' });
      poly.bindPopup('<b>' + p.name + '</b><br/><span style="color:' + p.color + ';font-weight:700;">' + p.risk + ' Risk</span><br/>' + p.incidents + ' verified incident(s)');
      poly.on('click', function() {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'polygonPress', id: p.id, name: p.name }));
      });
      polyRefs[p.id] = poly;
    });

    var fallback = ${JSON.stringify(fallbackData)};
    fallback.forEach(function(b) {
      var size = b.selected ? 22 : 16;
      var icon = L.divIcon({
        className: '',
        html: '<div style="width:' + size + 'px;height:' + size + 'px;border-radius:50%;background:' + b.color + ';border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.35);"></div>',
        iconSize: [size, size], iconAnchor: [size / 2, size / 2],
      });
      var marker = L.marker([b.lat, b.lng], { icon: icon }).addTo(map)
        .bindPopup('<b>' + b.name + '</b><br/><span style="color:' + b.color + ';font-weight:700;">' + b.risk + ' Risk</span><br/>' + b.incidents + ' verified incident(s)');
      marker.bindTooltip(b.name, { permanent: true, direction: 'top', offset: [0, -size / 2], className: 'barangay-label' });
      marker.on('click', function() {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'polygonPress', id: b.id, name: b.name }));
      });
      fallbackRefs[b.id] = marker;
    });

    window.focusBarangay = function(id, lat, lng, zoom) {
      map.setView([lat, lng], zoom || 16, { animate: true });
      if (polyRefs[id]) { polyRefs[id].openPopup(); }
      else if (fallbackRefs[id]) { fallbackRefs[id].openPopup(); }
    };

    ${showMarkers ? `
    var incidentMarkers = ${JSON.stringify(markerData)};
    incidentMarkers.forEach(function(m) {
      var icon = L.divIcon({ className: '', html: '<div class="fire-pin" style="background:' + m.color + ';"></div>', iconSize: [8, 8], iconAnchor: [7, 7] });
      var mk = L.marker([m.lat, m.lng], { icon: icon }).addTo(map);
      mk.on('click', function() {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'markerClick', id: m.id, name: m.barangay }));
      });
    });
    ` : ''}

    ${showHeatmap ? `
    var heatPoints = ${JSON.stringify(heatPoints)};
    if (heatPoints.length > 0) {
      L.heatLayer(heatPoints, { radius: 45, blur: 35, maxZoom: 15, max: 1.0, minOpacity: 0.3 }).addTo(map);
    }
    ` : ''}

    map.on('click', function() {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'mapClick' }));
    });
  </script>
</body>
</html>
  `;
}