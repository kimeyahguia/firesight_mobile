import type { RiskBarangay, RiskMarker } from '@/types/riskMap';
import React, { forwardRef } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { WebView } from 'react-native-webview';
import { buildRiskMapHtml, MapBaseLayer } from './riskMapHtml';

export interface RiskMapViewProps {
  barangays: RiskBarangay[];
  markers?: RiskMarker[];
  selectedName?: string | null;
  showHeatmap?: boolean;
  showMarkers?: boolean;
  baseLayer?: MapBaseLayer;
  center?: { lat: number; lng: number };
  zoom?: number;
  backgroundColor?: string;
  onSelectBarangay?: (name: string, id: string) => void;
  style?: StyleProp<ViewStyle>;
}

/**
 * Shared WebView wrapper for the Risk Map. Both the User (map.tsx) and
 * BFP (alerts.tsx) screens render this inside their own layout/shell —
 * only the map rendering itself is shared, not the surrounding UI, since
 * the two screens have genuinely different UX (filters, tabs, panels).
 *
 * Ref is forwarded so screens can still call webViewRef.current.injectJavaScript(...)
 * for things like map.setView(...) or switchMapView(...), same as before.
 */
const RiskMapView = forwardRef<WebView, RiskMapViewProps>(function RiskMapView(
  {
    barangays,
    markers = [],
    selectedName = null,
    showHeatmap = false,
    showMarkers = true,
    baseLayer = 'street',
    center,
    zoom,
    backgroundColor,
    onSelectBarangay,
    style,
  },
  ref
) {
  const html = buildRiskMapHtml({
    barangays, markers, selectedName, showHeatmap, showMarkers, baseLayer, center, zoom, backgroundColor,
  });

  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if ((data.type === 'polygonPress' || data.type === 'markerClick') && data.name) {
        onSelectBarangay?.(data.name, data.id);
      }
    } catch {
      // Ignore malformed messages from the WebView JS bridge — not fatal.
    }
  };

  return (
    <View style={[styles.container, style]}>
      <WebView
        ref={ref}
        originWhitelist={['*']}
        source={{ html }}
        style={styles.webview}
        javaScriptEnabled
        domStorageEnabled
        onMessage={handleMessage}
        startInLoadingState
        bounces={false}
      />
    </View>
  );
});

export default RiskMapView;

const styles = StyleSheet.create({
  container: { flex: 1, overflow: 'hidden' },
  webview: { flex: 1 },
});