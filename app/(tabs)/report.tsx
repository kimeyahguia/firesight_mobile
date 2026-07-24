import { API_ENDPOINTS } from '@/constants/api';
import { COLORS, RISK_COLORS, RiskLevel } from '@/constants/theme';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import React, { useCallback, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Image,
  Linking,
  Modal,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { WebView } from 'react-native-webview';

// ────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────

type SeverityLevel = RiskLevel | 'Critical';

type IncidentType =
  | 'Residential Fire'
  | 'Electrical Fire'
  | 'Grass Fire'
  | 'Smoke Only'
  | 'LPG-Related'
  | 'Vehicle Fire';

type YesNoUnsure = 'Yes' | 'No' | 'Unsure';

type SubmitState = 'idle' | 'submitting' | 'done';

type TerrainMode = 'flat' | 'realistic';

interface ToggleQuestion {
  key: 'peopleAtRisk' | 'fireActive' | 'respondersOnSite';
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}

// ────────────────────────────────────────────────────────────
// Mock Data
// ────────────────────────────────────────────────────────────

const STEPS = ['Photo', 'Details', 'Review'] as const;

const SEVERITY_LEVELS: SeverityLevel[] = ['Low', 'Moderate', 'High', 'Critical'];

const SEVERITY_COLORS: Record<SeverityLevel, { bg: string; text: string; dot: string }> = {
  Low: RISK_COLORS.Low,
  Moderate: RISK_COLORS.Moderate,
  High: RISK_COLORS.High,
  Critical: { bg: '#450A0A', text: '#FFFFFF', dot: '#DC2626' },
};

const INCIDENT_TYPES: IncidentType[] = [
  'Residential Fire',
  'Electrical Fire',
  'Grass Fire',
  'Smoke Only',
  'LPG-Related',
  'Vehicle Fire',
];

const TOGGLE_QUESTIONS: ToggleQuestion[] = [
  { key: 'peopleAtRisk', label: 'Are people trapped or at risk?', icon: 'people' },
  { key: 'fireActive', label: 'Is the fire still active?', icon: 'flame' },
  { key: 'respondersOnSite', label: 'Are responders already on site?', icon: 'shield-checkmark' },
];

// Small reusable press-scale wrapper for native-feeling microinteractions.
function usePressScale(toValue = 0.96) {
  const scale = useRef(new Animated.Value(1)).current;
  const onPressIn = () => {
    Animated.spring(scale, { toValue, useNativeDriver: true, speed: 40, bounciness: 4 }).start();
  };
  const onPressOut = () => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 6 }).start();
  };
  return { scale, onPressIn, onPressOut };
}

// ── Leaflet map HTML builder (Street + Satellite via L.control.layers) ──
function buildLeafletMapHtml(lat: number, lng: number, interactive: boolean) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <style>
    .leaflet-pane,.leaflet-tile,.leaflet-marker-icon,.leaflet-marker-shadow,.leaflet-tile-container,.leaflet-pane > svg,.leaflet-pane > canvas,.leaflet-zoom-box,.leaflet-image-layer,.leaflet-layer{position:absolute;left:0;top:0}
    .leaflet-container{overflow:hidden;-webkit-tap-highlight-color:transparent}
    .leaflet-tile,.leaflet-marker-icon,.leaflet-marker-shadow{-webkit-user-select:none;-moz-user-select:none;user-select:none;-webkit-user-drag:none}
    .leaflet-tile::selection{background:transparent}
    .leaflet-safari .leaflet-tile{image-rendering:-webkit-optimize-contrast}
    .leaflet-safari .leaflet-tile-container{width:1600px;height:1600px;-webkit-transform-origin:0 0}
    .leaflet-marker-icon,.leaflet-marker-shadow{display:block}
    .leaflet-container .leaflet-overlay-pane svg,.leaflet-container .leaflet-marker-pane img,.leaflet-container .leaflet-shadow-pane img,.leaflet-container .leaflet-tile-pane img,.leaflet-container img.leaflet-image-layer,.leaflet-container .leaflet-tile{max-width:none!important;max-height:none!important}
    .leaflet-container.leaflet-touch-zoom{-ms-touch-action:pan-x pan-y;touch-action:pan-x pan-y}
    .leaflet-container.leaflet-touch-drag{-ms-touch-action:pinch-zoom;touch-action:none;touch-action:pinch-zoom}
    .leaflet-container.leaflet-touch-drag.leaflet-touch-zoom{-ms-touch-action:none;touch-action:none}
    .leaflet-tile{filter:inherit;visibility:hidden}
    .leaflet-tile-loaded{visibility:inherit}
    .leaflet-zoom-box{width:0;height:0;-moz-box-sizing:border-box;box-sizing:border-box;z-index:800}
    .leaflet-overlay-pane svg{-moz-user-select:none}
    .leaflet-pane{z-index:400}
    .leaflet-tile-pane{z-index:200}
    .leaflet-overlay-pane{z-index:400}
    .leaflet-shadow-pane{z-index:500}
    .leaflet-marker-pane{z-index:600}
    .leaflet-tooltip-pane{z-index:650}
    .leaflet-popup-pane{z-index:700}
    .leaflet-map-pane canvas{z-index:100}
    .leaflet-map-pane svg{z-index:200}
    .leaflet-vml-shape{width:1px;height:1px}
    .lvml{behavior:url(#default#VML);display:inline-block;position:absolute}
    .leaflet-control{position:relative;z-index:800;pointer-events:visiblePainted;pointer-events:auto}
    .leaflet-top,.leaflet-bottom{position:absolute;z-index:1000;pointer-events:none}
    .leaflet-top{top:0}
    .leaflet-right{right:0}
    .leaflet-bottom{bottom:0}
    .leaflet-left{left:0}
    .leaflet-control{float:left;clear:both}
    .leaflet-right .leaflet-control{float:right}
    .leaflet-top .leaflet-control{margin-top:10px}
    .leaflet-bottom .leaflet-control{margin-bottom:10px}
    .leaflet-left .leaflet-control{margin-left:10px}
    .leaflet-right .leaflet-control{margin-right:10px}
    .leaflet-fade-anim .leaflet-popup{opacity:0;transition:opacity .2s linear}
    .leaflet-fade-anim .leaflet-map-pane .leaflet-popup{opacity:1}
    .leaflet-zoom-animated{transform-origin:0 0}
    svg.leaflet-zoom-animated{will-change:transform}
    .leaflet-zoom-anim .leaflet-zoom-animated{transition:transform .25s cubic-bezier(0,0,.25,1)}
    .leaflet-zoom-anim .leaflet-tile,.leaflet-pan-anim .leaflet-tile{transition:none}
    .leaflet-zoom-anim .leaflet-zoom-hide{visibility:hidden}
    .leaflet-interactive{cursor:pointer}
    .leaflet-grab{cursor:-webkit-grab;cursor:grab}
    .leaflet-crosshair,.leaflet-crosshair .leaflet-interactive{cursor:crosshair}
    .leaflet-popup-pane,.leaflet-control{cursor:auto}
    .leaflet-dragging .leaflet-grab,.leaflet-dragging .leaflet-grab .leaflet-interactive,.leaflet-dragging .leaflet-marker-draggable{cursor:move;cursor:-webkit-grabbing;cursor:grabbing}
    .leaflet-marker-icon,.leaflet-marker-shadow,.leaflet-image-layer,.leaflet-pane > svg path,.leaflet-tile-container{pointer-events:none}
    .leaflet-marker-icon.leaflet-interactive,.leaflet-image-layer.leaflet-interactive,.leaflet-pane > svg path.leaflet-interactive,svg.leaflet-image-layer.leaflet-interactive path{pointer-events:visiblePainted;pointer-events:auto}
    .leaflet-container{background:#ddd;outline-offset:1px}
    .leaflet-container a{color:#0078A8}
    .leaflet-zoom-box{border:2px dotted #38f;background:rgba(255,255,255,0.5)}
    .leaflet-bar{box-shadow:0 1px 5px rgba(0,0,0,0.65);border-radius:4px}
    .leaflet-bar a{background-color:#fff;border-bottom:1px solid #ccc;width:26px;height:26px;line-height:26px;display:block;text-align:center;text-decoration:none;color:#000}
    .leaflet-bar a,.leaflet-control-layers-toggle{background-position:50% 50%;background-repeat:no-repeat;display:block}
    .leaflet-bar a:hover,.leaflet-bar a:focus{background-color:#f4f4f4}
    .leaflet-bar a:first-child{border-top-left-radius:4px;border-top-right-radius:4px}
    .leaflet-bar a:last-child{border-bottom-left-radius:4px;border-bottom-right-radius:4px;border-bottom:none}
    .leaflet-bar a.leaflet-disabled{cursor:default;background-color:#f4f4f4;color:#bbb}
    .leaflet-touch .leaflet-bar a{width:30px;height:30px;line-height:30px}
    .leaflet-touch .leaflet-bar a:first-child{border-top-left-radius:2px;border-top-right-radius:2px}
    .leaflet-touch .leaflet-bar a:last-child{border-bottom-left-radius:2px;border-bottom-right-radius:2px}
    .leaflet-control-zoom-in,.leaflet-control-zoom-out{font:bold 18px 'Lucida Console',Monaco,monospace;text-indent:1px}
    .leaflet-touch .leaflet-control-zoom-in,.leaflet-touch .leaflet-control-zoom-out{font-size:22px}
    .leaflet-control-layers{box-shadow:0 1px 5px rgba(0,0,0,0.4);background:#fff;border-radius:5px}
    .leaflet-control-layers-toggle{background-size:20px 20px;width:36px;height:36px}
    .leaflet-touch .leaflet-control-layers-toggle{width:44px;height:44px}
    .leaflet-control-layers .leaflet-control-layers-list,.leaflet-control-layers-expanded .leaflet-control-layers-toggle{display:none}
    .leaflet-control-layers-expanded .leaflet-control-layers-list{display:block;position:relative}
    .leaflet-control-layers-expanded{padding:6px 10px 6px 6px;color:#333;background:#fff}
    .leaflet-control-layers-scrollbar{overflow-y:scroll;overflow-x:hidden;padding-right:5px}
    .leaflet-control-layers-selector{margin-top:2px;position:relative;top:1px}
    .leaflet-control-layers label{display:block;font-size:13px}
    .leaflet-control-layers-separator{height:0;border-top:1px solid #ddd;margin:5px -10px 5px -6px}
    .leaflet-default-icon-path{background-image:url(https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png)}
    .leaflet-control-attribution{background:#fff;background:rgba(255,255,255,0.8);margin:0}
    .leaflet-control-attribution a{text-decoration:none}
    .leaflet-control-attribution a:hover,.leaflet-control-attribution a:focus{text-decoration:underline}
    .leaflet-attribution-flag{display:inline!important;vertical-align:baseline!important;width:1em;height:.6669em}
    .leaflet-left .leaflet-control-scale{margin-left:5px}
    .leaflet-bottom .leaflet-control-scale{margin-bottom:5px}
    .leaflet-control-scale-line{border:2px solid #777;border-top:none;line-height:1.1;padding:2px 5px 1px;font-size:11px;white-space:nowrap;overflow:hidden;-moz-box-sizing:border-box;box-sizing:border-box;background:rgba(255,255,255,0.8);text-shadow:1px 1px #fff}
    .leaflet-touch .leaflet-control-attribution,.leaflet-touch .leaflet-control-layers,.leaflet-touch .leaflet-bar{box-shadow:none}
    .leaflet-touch .leaflet-control-layers,.leaflet-touch .leaflet-bar{border:2px solid rgba(0,0,0,0.2);background-clip:padding-box}
    .leaflet-popup{position:absolute;text-align:center;margin-bottom:20px}
    .leaflet-popup-content-wrapper{padding:1px;text-align:left;border-radius:12px}
    .leaflet-popup-content{margin:13px 24px 13px 20px;line-height:1.3;font-size:13px;min-height:1px}
    .leaflet-popup-content p{margin:17px 0}
    .leaflet-popup-tip-container{width:40px;height:20px;position:absolute;left:50%;margin-left:-20px;overflow:hidden;pointer-events:none}
    .leaflet-popup-tip{width:17px;height:17px;padding:1px;margin:-10px auto 0;transform:rotate(45deg)}
    .leaflet-popup-content-wrapper,.leaflet-popup-tip{background:#fff;color:#333;box-shadow:0 3px 14px rgba(0,0,0,0.4)}
    .leaflet-container a.leaflet-popup-close-button{position:absolute;top:0;right:0;border:none;text-align:center;width:24px;height:24px;font:16px/24px Tahoma,Verdana,sans-serif;color:#757575;text-decoration:none;background:transparent}
    .leaflet-container a.leaflet-popup-close-button:hover,.leaflet-container a.leaflet-popup-close-button:focus{color:#585858}
    .leaflet-oldie .leaflet-popup-content-wrapper{-ms-zoom:1}
    .leaflet-oldie .leaflet-popup-tip{width:24px;margin:0 auto;-ms-filter:"progid:DXImageTransform.Microsoft.Matrix(M11=0.70710678, M12=0.70710678, M21=-0.70710678, M22=0.70710678)";filter:progid:DXImageTransform.Microsoft.Matrix(M11=0.70710678,M12=0.70710678,M21=-0.70710678,M22=0.70710678)}
    .leaflet-oldie .leaflet-control-zoom,.leaflet-oldie .leaflet-control-layers,.leaflet-oldie .leaflet-popup-content-wrapper,.leaflet-oldie .leaflet-popup-tip{border:1px solid #999}
    .leaflet-div-icon{background:#fff;border:1px solid #666}
    .leaflet-tooltip{position:absolute;padding:6px;background-color:#fff;border:1px solid #fff;border-radius:3px;color:#222;white-space:nowrap;-webkit-user-select:none;-moz-user-select:none;user-select:none;pointer-events:none;box-shadow:0 1px 3px rgba(0,0,0,0.4)}

    html, body, #map { height: 100%; width: 100%; margin: 0; padding: 0; background: #DDEBD0; }
    .leaflet-control-attribution { font-size: 8px; }
    .leaflet-control-layers { font-size: 12px; }
    #errorBox {
      position: absolute; top: 0; left: 0; right: 0; bottom: 0;
      display: none; align-items: center; justify-content: center;
      flex-direction: column; gap: 6px; text-align: center;
      padding: 16px; font-family: -apple-system, sans-serif;
      color: #6B7280; font-size: 12px; background: #DDEBD0;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <div id="errorBox">Hindi ma-load ang map tiles.<br/>Check ang internet connection.</div>

  <script>
    function reportError(msg) {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'error', msg: msg }));
      }
      document.getElementById('errorBox').style.display = 'flex';
    }
    window.onerror = function (msg, url, line) {
      reportError('JS error: ' + msg + ' @ line ' + line);
      return true;
    };
  </script>

  <script src="https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js" onerror="reportError('Failed to load leaflet.js from CDN')"></script>

  <script>
    try {
      if (typeof L === 'undefined') {
        reportError('Leaflet library did not load (L is undefined)');
      } else {
        var lat = ${lat};
        var lng = ${lng};
        var interactive = ${interactive};

        var map = L.map('map', {
          zoomControl: interactive,
          attributionControl: false,
          dragging: interactive,
          touchZoom: interactive,
          scrollWheelZoom: interactive,
          doubleClickZoom: interactive,
          boxZoom: interactive,
          keyboard: interactive,
        }).setView([lat, lng], interactive ? 17 : 16);

        var streetLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          subdomains: 'abc',
          attribution: '&copy; OpenStreetMap contributors',
        });

        var satelliteLayer = L.tileLayer(
          'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
          {
            maxZoom: 19,
            attribution: 'Tiles &copy; Esri, Maxar, Earthstar Geographics',
          }
        );

        satelliteLayer.addTo(map);

        var baseMaps = {
          'Satellite': satelliteLayer,
          'Street': streetLayer,
        };

        L.control.layers(baseMaps, null, { collapsed: true, position: 'topright' }).addTo(map);

        var fireIcon = L.divIcon({
          className: 'fire-marker',
          html: '<div style="width:32px;height:32px;border-radius:16px;background:#FF6B35;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.35);"></div>',
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        });

        L.marker([lat, lng], { icon: fireIcon }).addTo(map);

        setTimeout(function () { map.invalidateSize(); }, 200);

        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'success' }));
        }
      }
    } catch (err) {
      reportError('Init exception: ' + err.message);
    }
  </script>
</body>
</html>
`;
}

// ────────────────────────────────────────────────────────────
// Sub-components
// ────────────────────────────────────────────────────────────

function SectionCard({
  icon,
  title,
  children,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.sectionCard}>
      <View style={styles.sectionTitleRow}>
        <View style={styles.sectionIconWrap}>
          <Ionicons name={icon} size={16} color={COLORS.primaryOrange} />
        </View>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function FieldLabel({ label, optional }: { label: string; optional?: boolean }) {
  return (
    <Text style={styles.fieldLabel}>
      {label}
      {optional ? <Text style={styles.fieldLabelOptional}> (optional)</Text> : null}
    </Text>
  );
}

function SeverityChip({
  level,
  active,
  onPress,
}: {
  level: SeverityLevel;
  active: boolean;
  onPress: () => void;
}) {
  const palette = SEVERITY_COLORS[level];
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={[
        styles.severityChip,
        { borderColor: active ? palette.dot : COLORS.border },
        active && { backgroundColor: palette.dot },
      ]}
    >
      <View
        style={[
          styles.severityDot,
          { backgroundColor: active ? '#FFFFFF' : palette.dot },
        ]}
      />
      <Text
        style={[
          styles.severityChipText,
          { color: active ? '#FFFFFF' : COLORS.deepIndigo },
        ]}
      >
        {level}
      </Text>
    </TouchableOpacity>
  );
}

function IncidentTypeChip({
  type,
  active,
  onPress,
}: {
  type: IncidentType;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={[styles.typeChip, active && styles.typeChipActive]}
    >
      <Text style={[styles.typeChipText, active && styles.typeChipTextActive]}>
        {type}
      </Text>
    </TouchableOpacity>
  );
}

function YesNoSelector({
  value,
  onChange,
}: {
  value: YesNoUnsure;
  onChange: (v: YesNoUnsure) => void;
}) {
  const options: YesNoUnsure[] = ['Yes', 'No', 'Unsure'];
  return (
    <View style={styles.yesNoRow}>
      {options.map((option) => {
        const active = value === option;
        return (
          <TouchableOpacity
            key={option}
            activeOpacity={0.85}
            onPress={() => onChange(option)}
            style={[styles.yesNoOption, active && styles.yesNoOptionActive]}
          >
            <Text style={[styles.yesNoOptionText, active && styles.yesNoOptionTextActive]}>
              {option}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function StepProgress({ currentStep }: { currentStep: number }) {
  return (
    <View style={styles.progressWrap}>
      <View style={styles.progressTopRow}>
        <Text style={styles.progressStepText}>
          Step {currentStep + 1} of {STEPS.length}
        </Text>
        <Text style={styles.progressLabelText}>{STEPS[currentStep]}</Text>
      </View>
      <View style={styles.progressTrack}>
        {STEPS.map((_, index) => (
          <View
            key={index}
            style={[
              styles.progressSegment,
              index <= currentStep && styles.progressSegmentActive,
              index === STEPS.length - 1 && { marginRight: 0 },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

// ── Terrain toggle (Flat / Realistic) ──
function TerrainToggle({
  value,
  onChange,
}: {
  value: TerrainMode;
  onChange: (v: TerrainMode) => void;
}) {
  return (
    <View style={styles.terrainToggleRow}>
      {(['flat', 'realistic'] as TerrainMode[]).map((mode) => {
        const active = value === mode;
        return (
          <TouchableOpacity
            key={mode}
            activeOpacity={0.85}
            onPress={() => onChange(mode)}
            style={[styles.terrainToggleOption, active && styles.terrainToggleOptionActive]}
          >
            <Ionicons
              name={mode === 'flat' ? 'grid-outline' : 'earth'}
              size={13}
              color={active ? '#FFFFFF' : COLORS.slateText}
            />
            <Text style={[styles.terrainToggleText, active && styles.terrainToggleTextActive]}>
              {mode === 'flat' ? 'Flat' : 'Realistic'}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ── Mini map preview ──
function MiniMapPreview({
  terrainMode,
  coords,
  onExpand,
}: {
  terrainMode: TerrainMode;
  coords: { lat: number; lng: number } | null;
  onExpand: () => void;
}) {
  if (terrainMode === 'realistic' && coords) {
    return (
      <TouchableOpacity activeOpacity={0.9} onPress={onExpand} style={[styles.miniMapPreview, styles.miniMapRealistic]}>
        <WebView
          key={`${coords.lat.toFixed(5)}-${coords.lng.toFixed(5)}`}
          originWhitelist={['*']}
          source={{ html: buildLeafletMapHtml(coords.lat, coords.lng, false) }}
          style={styles.realMapImage}
          scrollEnabled={false}
          pointerEvents="none"
          javaScriptEnabled
          domStorageEnabled
          startInLoadingState
          mixedContentMode="always"
          onLoadStart={() => console.log('[Map] WebView load start')}
          onLoadEnd={() => console.log('[Map] WebView load end')}
          onError={(e) => console.log('[Map] WebView onError ->', e.nativeEvent)}
          onHttpError={(e) => console.log('[Map] WebView onHttpError ->', e.nativeEvent)}
          onMessage={(e) => console.log('[Map] JS message ->', e.nativeEvent.data)}
          renderLoading={() => (
            <View style={styles.mapLoadingOverlay}>
              <Ionicons name="map-outline" size={22} color={COLORS.mutedText} />
              <Text style={styles.mapFallbackText}>Naglo-load ang satellite map…</Text>
            </View>
          )}
        />
        <View style={styles.expandHintBadge}>
          <Ionicons name="expand" size={13} color="#FFFFFF" />
          <Text style={styles.expandHintText}>I-tap para palakihin</Text>
        </View>
      </TouchableOpacity>
    );
  }

  if (terrainMode === 'realistic' && !coords) {
    return (
      <View style={[styles.miniMapPreview, styles.miniMapRealistic]}>
        <Ionicons name="cloud-offline-outline" size={22} color={COLORS.mutedText} />
        <Text style={styles.mapFallbackText}>Wala pang GPS coords — i-refresh muna</Text>
      </View>
    );
  }

  return (
    <TouchableOpacity
      activeOpacity={coords ? 0.9 : 1}
      onPress={coords ? onExpand : undefined}
      style={styles.miniMapPreview}
    >
      <View style={styles.miniMapPin}>
        <Ionicons name="location" size={22} color="#FFFFFF" />
      </View>
      <View style={styles.miniMapGrid} />
      {coords && (
        <View style={styles.expandHintBadge}>
          <Ionicons name="expand" size={13} color="#FFFFFF" />
          <Text style={styles.expandHintText}>I-tap para palakihin</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

// ── Fullscreen map modal ──
function FullscreenMapModal({
  visible,
  coords,
  address,
  onClose,
}: {
  visible: boolean;
  coords: { lat: number; lng: number } | null;
  address: string;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <SafeAreaView style={styles.fullscreenMapSafeArea}>
        <View style={styles.fullscreenMapHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.fullscreenMapTitle}>Incident Location</Text>
            <Text style={styles.fullscreenMapSubtitle} numberOfLines={1}>{address}</Text>
          </View>
          <TouchableOpacity activeOpacity={0.8} onPress={onClose} style={styles.fullscreenMapCloseButton}>
            <Ionicons name="close" size={22} color={COLORS.deepIndigo} />
          </TouchableOpacity>
        </View>

        <View style={styles.fullscreenMapBody}>
          {coords ? (
            <WebView
              key={`fullscreen-${coords.lat.toFixed(5)}-${coords.lng.toFixed(5)}`}
              originWhitelist={['*']}
              source={{ html: buildLeafletMapHtml(coords.lat, coords.lng, true) }}
              style={{ flex: 1 }}
              javaScriptEnabled
              domStorageEnabled
              startInLoadingState
              mixedContentMode="always"
              onLoadStart={() => console.log('[FullscreenMap] load start')}
              onLoadEnd={() => console.log('[FullscreenMap] load end')}
              onError={(e) => console.log('[FullscreenMap] onError ->', e.nativeEvent)}
              onHttpError={(e) => console.log('[FullscreenMap] onHttpError ->', e.nativeEvent)}
              onMessage={(e) => console.log('[FullscreenMap] JS message ->', e.nativeEvent.data)}
              renderLoading={() => (
                <View style={styles.mapLoadingOverlay}>
                  <Ionicons name="map-outline" size={26} color={COLORS.mutedText} />
                  <Text style={styles.mapFallbackText}>Naglo-load ang satellite map…</Text>
                </View>
              )}
            />
          ) : (
            <View style={styles.mapLoadingOverlay}>
              <Ionicons name="cloud-offline-outline" size={26} color={COLORS.mutedText} />
              <Text style={styles.mapFallbackText}>Wala pang GPS coords</Text>
            </View>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
}

// ────────────────────────────────────────────────────────────
// Main Screen
// ────────────────────────────────────────────────────────────

export default function ReportScreen() {
  const [step, setStep] = useState(0);
  const [submitState, setSubmitState] = useState<SubmitState>('idle');
  const [referenceId, setReferenceId] = useState('');

  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [cameraLoading, setCameraLoading] = useState(false);

  const [locationLoading, setLocationLoading] = useState(true);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [barangay, setBarangay] = useState('');
  const [streetLandmark, setStreetLandmark] = useState('');
  const [locationDetails, setLocationDetails] = useState('');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [terrainMode, setTerrainMode] = useState<TerrainMode>('flat');
  const [mapModalVisible, setMapModalVisible] = useState(false);

  const [whatIsOnFire, setWhatIsOnFire] = useState('');
  const [severity, setSeverity] = useState<SeverityLevel>('Moderate');
  const [incidentType, setIncidentType] = useState<IncidentType>('Residential Fire');
  const [description, setDescription] = useState('');

  const [toggleAnswers, setToggleAnswers] = useState<Record<string, YesNoUnsure>>({
    peopleAtRisk: 'Unsure',
    fireActive: 'Yes',
    respondersOnSite: 'No',
  });

  const [userFullName, setUserFullName] = useState('');
  const [userContact, setUserContact] = useState('');
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [showStep0Errors, setShowStep0Errors] = useState(false);
  const [showStep1Errors, setShowStep1Errors] = useState(false);

  const severityPalette = SEVERITY_COLORS[severity];
  const scrollRef = useRef<ScrollView>(null);
  const spinValue = useRef(new Animated.Value(0)).current;
  const takePhotoPress = usePressScale();

  const fetchUserProfile = useCallback(async () => {
    setProfileLoading(true);
    setProfileError(null);
    try {
      const userId = await AsyncStorage.getItem('user_id');

      if (!userId) {
        setProfileError('Not logged in.');
        setProfileLoading(false);
        return;
      }

      const url = `${API_ENDPOINTS.profileRead}?user_id=${userId}`;
      const response = await fetch(url);

      if (!response.ok) {
        setProfileError('Could not load your account details.');
        setProfileLoading(false);
        return;
      }

      const result = await response.json();

      if (result.success && result.user) {
        setUserFullName(result.user.full_name || '');
        setUserContact(result.user.phone || '');
      } else {
        setProfileError(result.message || 'Could not load your account details.');
      }
    } catch (err) {
      console.log('[ReportScreen] profile fetch error ->', err);
      setProfileError('Network error while loading your account details.');
    } finally {
      setProfileLoading(false);
    }
  }, []);

  const fetchRealLocation = useCallback(async () => {
    setLocationLoading(true);
    setLocationError(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationError('Location permission denied. Enable it in settings to auto-detect your location.');
        setLocationLoading(false);
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      setCoords({ lat: position.coords.latitude, lng: position.coords.longitude });

      const [place] = await Location.reverseGeocodeAsync({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });

      if (place) {
        setBarangay(place.district || place.subregion || place.city || '');
        setStreetLandmark(
          [place.street, place.name].filter(Boolean).join(', ') || 'Unknown street'
        );
      }
    } catch (err) {
      setLocationError('Could not detect your location. Please check your GPS and try again.');
    } finally {
      setLocationLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchRealLocation();
      fetchUserProfile();
    }, [fetchRealLocation, fetchUserProfile])
  );

  React.useEffect(() => {
    if (submitState === 'submitting') {
      Animated.loop(
        Animated.timing(spinValue, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        })
      ).start();
    } else {
      spinValue.setValue(0);
    }
  }, [submitState]);

  function goToStep(index: number) {
    setStep(index);
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  }

  function handleNext() {
    if (step === 0) {
      const isValid = !!photoUri && !locationLoading && !!coords && !!barangay && !!streetLandmark;
      if (!isValid) {
        setShowStep0Errors(true);
        return;
      }
      setShowStep0Errors(false);
      goToStep(1);
      return;
    }
    if (step === 1) {
      const isValid =
        !!barangay &&
        !!streetLandmark &&
        !!whatIsOnFire.trim() &&
        !!description.trim() &&
        !profileLoading &&
        !!userFullName &&
        !!userContact;
      if (!isValid) {
        setShowStep1Errors(true);
        return;
      }
      setShowStep1Errors(false);
      goToStep(2);
      return;
    }
  }

  function handleBack() {
    setShowStep0Errors(false);
    setShowStep1Errors(false);
    if (step > 0) goToStep(step - 1);
  }

  async function handleTakePhoto() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Camera Permission Needed',
        'FIRESIGHT needs camera access to capture proof of the incident. Gallery uploads are disabled to keep reports authentic.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings() },
        ]
      );
      return;
    }

    setCameraLoading(true);
    try {
      const result = await ImagePicker.launchCameraAsync({
        quality: 0.7,
        exif: false,
        allowsEditing: false,
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        setPhotoUri(result.assets[0].uri);
      }
    } catch (err) {
      Alert.alert('Camera Error', 'Something went wrong while opening the camera.');
    } finally {
      setCameraLoading(false);
    }
  }

  async function handleSubmit() {
    setSubmitState('submitting');

    try {
      const userId = await AsyncStorage.getItem('user_id');

      if (!userId) {
        Alert.alert('Not Logged In', 'Please log in again before submitting a report.');
        setSubmitState('idle');
        return;
      }

      const formData = new FormData();
      formData.append('user_id', userId);
      formData.append('barangay', barangay);
      formData.append('street_landmark', streetLandmark);
      formData.append('location_details', locationDetails);
      formData.append('what_is_on_fire', whatIsOnFire);
      formData.append('severity', severity);
      formData.append('incident_type', incidentType);
      formData.append('description', description);
      formData.append('people_at_risk', toggleAnswers.peopleAtRisk);
      formData.append('fire_active', toggleAnswers.fireActive);
      formData.append('responders_on_site', toggleAnswers.respondersOnSite);
      formData.append('full_name', userFullName);
      formData.append('contact_number', userContact);

      if (coords) {
        formData.append('latitude', String(coords.lat));
        formData.append('longitude', String(coords.lng));
      }

      if (photoUri) {
        const filename = photoUri.split('/').pop() || 'photo.jpg';
        const match = /\.(\w+)$/.exec(filename);
        const ext = match ? match[1] : 'jpg';

        console.log('[Submit] Photo URI ->', photoUri); // 👈 dagdag muna ito

        formData.append('photo', {
          uri: photoUri,
          name: filename,
          type: `image/${ext === 'jpg' ? 'jpeg' : ext}`,
        } as any);
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      let response: Response;
      try {
        response = await fetch(API_ENDPOINTS.incidentsCreate, {
          method: 'POST',
          body: formData,
          signal: controller.signal,
        });
      } catch (fetchErr: any) {
        clearTimeout(timeoutId);
        console.log('[Submit] Fetch failed ->', fetchErr.name, fetchErr.message); // 👈 DAGDAG DITO
        if (fetchErr.name === 'AbortError') {
          Alert.alert(
            'Request Timed Out',
            'Hindi tumugon ang server sa loob ng 10 segundo. I-check ang WiFi connection mo o baka naka-ibang network ka sa PC/server.'
          );
        } else {
          Alert.alert(
            'Cannot Reach Server',
            'Hindi ma-reach ang FireSight server. Siguraduhin na same WiFi network ka ng backend PC at tumatakbo ang server.'
          );
        }
        setSubmitState('idle');
        return;
      }
      clearTimeout(timeoutId);

      if (!response.ok) {
        let serverMessage = `Server returned error ${response.status}.`;
        try {
          const errBody = await response.json();
          if (errBody?.message) serverMessage = errBody.message;
        } catch {
          serverMessage = `Server error (HTTP ${response.status}). Baka may isyu sa backend script.`;
        }
        Alert.alert('Submission Failed', serverMessage);
        setSubmitState('idle');
        return;
      }

      let result: any;
      try {
        result = await response.json();
      } catch {
        Alert.alert(
          'Invalid Server Response',
          'Nag-respond ang server pero hindi valid JSON ang laman.'
        );
        setSubmitState('idle');
        return;
      }

      if (!result.success) {
        Alert.alert('Submission Failed', result.message || 'Please try again.');
        setSubmitState('idle');
        return;
      }

      setReferenceId(result.reference_id);
      setSubmitState('done');
    } catch (err: any) {
      console.error('Unexpected submit error:', err);
      Alert.alert('Unexpected Error', err?.message || 'Something went wrong. Please try again.');
      setSubmitState('idle');
    }
  }

  function handleClear() {
    setPhotoUri(null);
    fetchRealLocation();
    setLocationDetails('');
    setWhatIsOnFire('');
    setSeverity('Moderate');
    setIncidentType('Residential Fire');
    setDescription('');
    setToggleAnswers({ peopleAtRisk: 'Unsure', fireActive: 'Yes', respondersOnSite: 'No' });
    setSubmitState('idle');
    setReferenceId('');
    setShowStep0Errors(false);
    setShowStep1Errors(false);
    goToStep(0);
  }

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const fullAddress = `${streetLandmark}${streetLandmark && barangay ? ', ' : ''}${barangay}${barangay ? ', Batangas' : ''}`;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      <View style={styles.headerRow}>
        <View>
          <Text style={styles.headerTitle}>Report Fire</Text>
        </View>
        <TouchableOpacity activeOpacity={0.7} style={styles.headerIconButton}>
          <Ionicons name="help-circle-outline" size={20} color={COLORS.deepIndigo} />
        </TouchableOpacity>
      </View>

      <StepProgress currentStep={step} />

      <ScrollView
        ref={scrollRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {step === 0 && (
          <>
            <View style={styles.noticeCard}>
              <View style={styles.noticeTopRow}>
                <Ionicons name="alert-circle" size={18} color={COLORS.primaryOrange} />
                <Text style={styles.noticeTitle}>Before you continue</Text>
              </View>
              <Text style={styles.noticeTextStrong}>
                If the fire is actively spreading, call emergency responders immediately while
                submitting this report.
              </Text>
              <View style={styles.hotlineRow}>
                <Ionicons name="call" size={14} color={COLORS.deepIndigo} />
                <Text style={styles.hotlineText}>BFP Lian Fire Station · (043) 740 1234</Text>
              </View>
            </View>

            <SectionCard icon="camera" title="Incident Photo">
              <View style={styles.uploadAreaLarge}>
                {photoUri ? (
                  <View style={styles.uploadPreviewLarge}>
                    <Image source={{ uri: photoUri }} style={styles.photoPreviewImage} />
                    <TouchableOpacity
                      onPress={() => setPhotoUri(null)}
                      activeOpacity={0.7}
                      style={styles.uploadRemoveBadge}
                    >
                      <Ionicons name="close-circle" size={24} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View
                    style={[
                      styles.uploadEmptyLarge,
                      showStep0Errors && !photoUri && styles.fieldError,
                    ]}
                  >
                    <View style={styles.uploadIconCircle}>
                      <Ionicons name="camera-outline" size={30} color={COLORS.accentViolet} />
                    </View>
                    <Text style={styles.uploadEmptyText}>No photo captured yet</Text>
                  </View>
                )}
              </View>

              {showStep0Errors && !photoUri && (
                <Text style={styles.fieldErrorText}>⚠ Kailangan ng photo bago magpatuloy.</Text>
              )}

              <Animated.View style={{ transform: [{ scale: takePhotoPress.scale }] }}>
                <TouchableOpacity
                  activeOpacity={0.9}
                  onPressIn={takePhotoPress.onPressIn}
                  onPressOut={takePhotoPress.onPressOut}
                  onPress={handleTakePhoto}
                  disabled={cameraLoading}
                >
                  <LinearGradient
                    colors={[COLORS.primaryOrange, '#EA580C']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[styles.uploadButtonFull, styles.uploadButtonPrimary]}
                  >
                    <Ionicons name="camera" size={16} color="#FFFFFF" />
                    <Text style={styles.uploadButtonPrimaryText}>
                      {cameraLoading ? 'Opening camera…' : photoUri ? 'Retake Photo' : 'Take Photo'}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              </Animated.View>

              <View style={styles.integrityNote}>
                <Ionicons name="shield-checkmark-outline" size={13} color={COLORS.mutedText} />
                <Text style={styles.helperText}>
                  Camera only — gallery uploads are disabled to ensure photo authenticity.
                </Text>
              </View>
            </SectionCard>

            <SectionCard icon="location" title="Location">
              {locationLoading ? (
                <View style={styles.locationLoadingRow}>
                  <Ionicons name="locate" size={15} color={COLORS.primaryOrange} />
                  <Text style={styles.locationLoadingText}>Detecting your location…</Text>
                </View>
              ) : locationError ? (
                <View style={styles.locationLoadingRow}>
                  <Ionicons name="warning" size={15} color={COLORS.criticalRed} />
                  <Text style={[styles.locationLoadingText, { color: COLORS.criticalRed, fontStyle: 'normal' }]}>
                    {locationError}
                  </Text>
                </View>
              ) : (
                <View style={styles.locationSummaryRow}>
                  <Ionicons name="navigate" size={16} color={COLORS.primaryOrange} />
                  <Text style={styles.locationSummaryText}>
                    Detected near {streetLandmark || 'your area'}, {barangay}, Batangas
                  </Text>
                </View>
              )}

              <View style={styles.mapCardTopRow}>
                <Text style={styles.mapCardTopLabel}>Terrain view</Text>
                <TerrainToggle value={terrainMode} onChange={setTerrainMode} />
              </View>

              <MiniMapPreview
                terrainMode={terrainMode}
                coords={coords}
                onExpand={() => setMapModalVisible(true)}
              />

              {showStep0Errors && (!coords || !barangay || !streetLandmark) && (
                <Text style={styles.fieldErrorText}>
                  ⚠ Kailangan makumpleto ang GPS location bago magpatuloy. I-tap ang refresh sa ibaba.
                </Text>
              )}

              <View style={styles.gpsChipRow}>
                <View
                  style={[
                    styles.gpsChip,
                    showStep0Errors && (!coords || !barangay || !streetLandmark) && styles.fieldError,
                  ]}
                >
                  <Ionicons
                    name={locationLoading ? 'ellipse' : locationError ? 'close-circle' : 'checkmark-circle'}
                    size={13}
                    color={locationLoading ? COLORS.mutedText : locationError ? COLORS.criticalRed : COLORS.successGreen}
                  />
                  <Text style={styles.gpsChipText}>
                    {locationLoading ? 'Locating via GPS…' : locationError ? 'GPS unavailable' : 'GPS location locked'}
                  </Text>
                </View>

                <TouchableOpacity
                  activeOpacity={0.85}
                  style={styles.refreshIconButton}
                  onPress={fetchRealLocation}
                >
                  <Ionicons name="refresh" size={15} color={COLORS.deepIndigo} />
                </TouchableOpacity>
              </View>
            </SectionCard>
          </>
        )}

        {step === 1 && (
          <>
            <SectionCard icon="location" title="Confirm Location">
              <FieldLabel label="Barangay" />
              <View
                style={[
                  styles.readOnlyField,
                  showStep1Errors && !barangay && styles.fieldError,
                ]}
              >
                <Ionicons name="location-outline" size={14} color={COLORS.mutedText} />
                <Text style={styles.readOnlyFieldText}>
                  {barangay || 'Detecting…'}
                </Text>
              </View>
              {showStep1Errors && !barangay && (
                <Text style={styles.fieldErrorText}>⚠ Wala pang na-detect na barangay.</Text>
              )}

              <FieldLabel label="Street / Landmark" />
              <View
                style={[
                  styles.readOnlyField,
                  showStep1Errors && !streetLandmark && styles.fieldError,
                ]}
              >
                <Ionicons name="navigate-outline" size={14} color={COLORS.mutedText} />
                <Text style={styles.readOnlyFieldText}>
                  {streetLandmark || 'Detecting…'}
                </Text>
              </View>
              {showStep1Errors && !streetLandmark && (
                <Text style={styles.fieldErrorText}>⚠ Wala pang na-detect na street/landmark.</Text>
              )}

              <Text style={styles.helperText}>
                Auto-detected mula sa GPS. I-refresh sa Step 1 kung mali.
              </Text>

              <FieldLabel label="Additional location details" optional />
              <TextInput
                value={locationDetails}
                onChangeText={setLocationDetails}
                placeholder="e.g. Behind the basketball court"
                placeholderTextColor={COLORS.mutedText}
                style={styles.textInput}
              />
            </SectionCard>

            <SectionCard icon="document-text" title="Incident Details">
              <FieldLabel label="What is on fire?" />
              <TextInput
                value={whatIsOnFire}
                onChangeText={setWhatIsOnFire}
                placeholder="e.g. House, grass, electrical post, vehicle"
                placeholderTextColor={COLORS.mutedText}
                style={[
                  styles.textInput,
                  showStep1Errors && !whatIsOnFire.trim() && styles.fieldError,
                ]}
              />
              {showStep1Errors && !whatIsOnFire.trim() && (
                <Text style={styles.fieldErrorText}>⚠ Sagutan muna ito.</Text>
              )}

              <FieldLabel label="Severity level" />
              <View style={styles.severityRow}>
                {SEVERITY_LEVELS.map((level) => (
                  <SeverityChip
                    key={level}
                    level={level}
                    active={severity === level}
                    onPress={() => setSeverity(level)}
                  />
                ))}
              </View>

              <FieldLabel label="Type of incident" />
              <View style={styles.typeChipsWrap}>
                {INCIDENT_TYPES.map((type) => (
                  <IncidentTypeChip
                    key={type}
                    type={type}
                    active={incidentType === type}
                    onPress={() => setIncidentType(type)}
                  />
                ))}
              </View>

              <FieldLabel label="Description / What is happening?" />
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="Describe the situation in detail..."
                placeholderTextColor={COLORS.mutedText}
                style={[
                  styles.textInput,
                  styles.textArea,
                  showStep1Errors && !description.trim() && styles.fieldError,
                ]}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
              {showStep1Errors && !description.trim() && (
                <Text style={styles.fieldErrorText}>⚠ Sagutan muna ito.</Text>
              )}
            </SectionCard>

            <SectionCard icon="warning" title="Situation Context">
              {TOGGLE_QUESTIONS.map((question, index) => (
                <View key={question.key} style={index > 0 ? styles.toggleQuestionSpacer : undefined}>
                  <View style={styles.toggleQuestionRow}>
                    <Ionicons name={question.icon} size={15} color={COLORS.slateText} />
                    <Text style={styles.toggleQuestionLabel}>{question.label}</Text>
                  </View>
                  <YesNoSelector
                    value={toggleAnswers[question.key]}
                    onChange={(v) =>
                      setToggleAnswers((prev) => ({ ...prev, [question.key]: v }))
                    }
                  />
                </View>
              ))}
            </SectionCard>

            <SectionCard icon="person" title="Your Information">
              {profileLoading ? (
                <View style={styles.locationLoadingRow}>
                  <Ionicons name="person-circle-outline" size={15} color={COLORS.primaryOrange} />
                  <Text style={styles.locationLoadingText}>Loading your account details…</Text>
                </View>
              ) : profileError ? (
                <View style={styles.locationLoadingRow}>
                  <Ionicons name="warning" size={15} color={COLORS.criticalRed} />
                  <Text style={[styles.locationLoadingText, { color: COLORS.criticalRed, fontStyle: 'normal' }]}>
                    {profileError}
                  </Text>
                </View>
              ) : (
                <>
                  <View
                    style={[
                      styles.credentialRow,
                      showStep1Errors && !userFullName && styles.fieldError,
                    ]}
                  >
                    <View style={styles.credentialIconWrap}>
                      <Ionicons name="person" size={16} color={COLORS.primaryOrange} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.credentialLabel}>Full Name</Text>
                      <Text style={styles.credentialValue}>{userFullName || 'Not set'}</Text>
                    </View>
                  </View>

                  <View
                    style={[
                      styles.credentialRow,
                      showStep1Errors && !userContact && styles.fieldError,
                    ]}
                  >
                    <View style={styles.credentialIconWrap}>
                      <Ionicons name="call" size={16} color={COLORS.primaryOrange} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.credentialLabel}>Contact Number</Text>
                      <Text style={styles.credentialValue}>{userContact || 'Not set'}</Text>
                    </View>
                  </View>

                  {showStep1Errors && (!userFullName || !userContact) && (
                    <Text style={styles.fieldErrorText}>
                      ⚠ Kulang ang account details. I-update sa Profile.
                    </Text>
                  )}
                </>
              )}

              <Text style={styles.helperText}>
                Auto-filled from your account. Update it in Profile if this is incorrect.
              </Text>
            </SectionCard>
          </>
        )}

        {step === 2 && (
          <>
            <SectionCard icon="image" title="Photo Preview">
              <View style={styles.uploadAreaLarge}>
                {photoUri ? (
                  <View style={styles.uploadPreviewLarge}>
                    <Image source={{ uri: photoUri }} style={styles.photoPreviewImage} />
                  </View>
                ) : (
                  <View style={styles.uploadEmptyLarge}>
                    <Ionicons name="image-outline" size={30} color={COLORS.mutedText} />
                    <Text style={styles.uploadEmptyText}>No photo attached</Text>
                  </View>
                )}
              </View>
            </SectionCard>

            <SectionCard icon="map" title="Map Pin">
              <View style={styles.mapCardTopRow}>
                <Text style={styles.mapCardTopLabel}>Terrain view</Text>
                <TerrainToggle value={terrainMode} onChange={setTerrainMode} />
              </View>
              <MiniMapPreview
                terrainMode={terrainMode}
                coords={coords}
                onExpand={() => setMapModalVisible(true)}
              />
              <Text style={styles.locationSummaryText}>
                {streetLandmark}, {barangay}, Batangas
              </Text>
            </SectionCard>

            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Report Summary</Text>

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>What's on fire</Text>
                <Text style={styles.summaryValue}>{whatIsOnFire || 'Not specified'}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Severity</Text>
                <View style={[styles.summarySeverityBadge, { backgroundColor: severityPalette.bg }]}>
                  <Text style={[styles.summarySeverityText, { color: '#FFFFFF' }]}>
                    {severity}
                  </Text>
                </View>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Incident Type</Text>
                <Text style={styles.summaryValue}>{incidentType}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>People at risk</Text>
                <Text style={styles.summaryValue}>{toggleAnswers.peopleAtRisk}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Fire active</Text>
                <Text style={styles.summaryValue}>{toggleAnswers.fireActive}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Reporter</Text>
                <Text style={styles.summaryValue}>{userFullName || 'Not set'}</Text>
              </View>

              <View style={styles.summaryEmergencyNote}>
                <Ionicons name="alert-circle" size={14} color={COLORS.primaryOrange} />
                <Text style={styles.summaryEmergencyText}>
                  If the fire is still spreading, call BFP Lian directly while this report is sent.
                </Text>
              </View>

              <View style={styles.summaryReadyRow}>
                <Ionicons name="checkmark-circle" size={15} color={COLORS.successGreen} />
                <Text style={styles.summaryReadyText}>Ready to submit</Text>
              </View>
            </View>
          </>
        )}

        <View style={{ height: 16 }} />
      </ScrollView>

      <View style={styles.bottomBar}>
        {step > 0 && (
          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.backButton}
            onPress={handleBack}
            disabled={submitState === 'submitting'}
          >
            <Ionicons name="chevron-back" size={18} color={COLORS.deepIndigo} />
          </TouchableOpacity>
        )}

        {step < 2 ? (
          <TouchableOpacity activeOpacity={0.85} style={styles.nextButton} onPress={handleNext}>
            <Text style={styles.nextButtonText}>Continue</Text>
            <Ionicons name="chevron-forward" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            activeOpacity={0.85}
            style={[styles.nextButton, styles.submitButtonBottom]}
            onPress={handleSubmit}
            disabled={submitState === 'submitting'}
          >
            {submitState === 'submitting' ? (
              <>
                <Animated.View style={{ transform: [{ rotate: spin }] }}>
                  <Ionicons name="sync" size={18} color="#FFFFFF" />
                </Animated.View>
                <Text style={styles.nextButtonText}>Sending report…</Text>
              </>
            ) : (
              <>
                <MaterialCommunityIcons name="fire-alert" size={18} color="#FFFFFF" />
                <Text style={styles.nextButtonText}>Submit Report</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>

      <FullscreenMapModal
        visible={mapModalVisible}
        coords={coords}
        address={fullAddress || 'Detecting location…'}
        onClose={() => setMapModalVisible(false)}
      />
    </SafeAreaView>
  );
}

// ────────────────────────────────────────────────────────────
// Styles
// ────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },

  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 50,
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.deepIndigo,
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 13,
    color: COLORS.slateText,
    marginTop: 4,
    maxWidth: 250,
    lineHeight: 18,
  },
  headerIconButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: COLORS.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
  },

  progressWrap: {
    paddingHorizontal: 20,
    marginTop: 6,
    marginBottom: 6,
  },
  progressTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressStepText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: COLORS.mutedText,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  progressLabelText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: COLORS.primaryOrange,
  },
  progressTrack: {
    flexDirection: 'row',
    gap: 6,
  },
  progressSegment: {
    flex: 1,
    height: 4,
    borderRadius: 999,
    backgroundColor: COLORS.surfaceMuted,
  },
  progressSegmentActive: {
    backgroundColor: COLORS.primaryOrange,
  },

  noticeCard: {
    backgroundColor: COLORS.surfaceMuted,
    borderRadius: 18,
    padding: 16,
    marginBottom: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
  },
  noticeTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  noticeTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.deepIndigo,
  },
  noticeText: {
    fontSize: 12.5,
    color: COLORS.slateText,
    lineHeight: 18,
    marginBottom: 8,
  },
  noticeTextStrong: {
    fontSize: 12.5,
    color: COLORS.deepIndigo,
    fontWeight: '600',
    lineHeight: 18,
    marginBottom: 12,
  },
  hotlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
  },
  hotlineText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.deepIndigo,
  },

  sectionCard: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 18,
    marginBottom: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: COLORS.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 15.5,
    fontWeight: '700',
    color: COLORS.deepIndigo,
  },

  fieldLabel: {
    fontSize: 12.5,
    fontWeight: '600',
    color: COLORS.deepIndigo,
    marginBottom: 3,
    marginTop: 3,
  },
  fieldLabelOptional: {
    fontWeight: '400',
    color: COLORS.mutedText,
  },

  readOnlyField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.surfaceMuted,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
  },
  readOnlyFieldText: {
    fontSize: 13.5,
    color: COLORS.deepIndigo,
    fontWeight: '500',
    flex: 1,
  },

  fieldError: {
    borderColor: COLORS.criticalRed,
    borderWidth: 1.5,
  },
  fieldErrorText: {
    fontSize: 11.5,
    color: COLORS.criticalRed,
    fontWeight: '600',
    marginTop: -6,
    marginBottom: 10,
  },

  textInput: {
    backgroundColor: COLORS.surfaceMuted,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 13.5,
    color: COLORS.deepIndigo,
    marginBottom: 10,
  },
  textArea: {
    minHeight: 100,
    paddingTop: 10,
  },

  helperText: {
    fontSize: 11.5,
    color: COLORS.mutedText,
    lineHeight: 16,
    marginTop: 4,
    flex: 1,
  },

  uploadAreaLarge: {
    marginBottom: 10,
  },
  uploadEmptyLarge: {
    height: 220,
    borderRadius: 18,
    backgroundColor: COLORS.surfaceMuted,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  uploadIconCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadEmptyText: {
    fontSize: 12.5,
    color: COLORS.slateText,
    fontWeight: '500',
  },
  uploadPreviewLarge: {
    height: 220,
    borderRadius: 18,
    backgroundColor: COLORS.surfaceMuted,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    overflow: 'hidden',
    position: 'relative',
  },
  photoPreviewImage: {
    width: '100%',
    height: '100%',
    borderRadius: 18,
  },
  uploadRemoveBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 14,
  },
  uploadButtonFull: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 14,
    paddingVertical: 12,
    marginBottom: 10,
  },
  uploadButtonPrimary: {
    backgroundColor: COLORS.primaryOrange,
  },
  uploadButtonPrimaryText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  integrityNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 4,
    marginTop: 4,
  },

  locationLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  locationLoadingText: {
    fontSize: 13,
    color: COLORS.slateText,
    fontStyle: 'italic',
    flex: 1,
  },
  locationSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  locationSummaryText: {
    fontSize: 13,
    color: COLORS.deepIndigo,
    fontWeight: '500',
    flex: 1,
    marginTop: 10,
  },

  mapCardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  mapCardTopLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    color: COLORS.mutedText,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  terrainToggleRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.surfaceMuted,
    borderRadius: 999,
    padding: 3,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    gap: 2,
  },
  terrainToggleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 5,
    paddingVertical: 6,
    borderRadius: 999,
  },
  terrainToggleOptionActive: {
    backgroundColor: COLORS.deepIndigo,
  },
  terrainToggleText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.slateText,
  },
  terrainToggleTextActive: {
    color: '#FFFFFF',
  },

  miniMapPreview: {
    height: 120,
    borderRadius: 18,
    backgroundColor: COLORS.surfaceMuted,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    overflow: 'hidden',
    position: 'relative',
  },
  miniMapGrid: {
    position: 'absolute',
    width: '140%',
    height: '140%',
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
  },
  miniMapPin: {
    width: 35,
    height: 35,
    borderRadius: 15,
    backgroundColor: COLORS.primaryOrange,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: COLORS.card,
    zIndex: 2,
  },

  miniMapRealistic: {
    backgroundColor: '#DDEBD0',
    gap: 6,
  },
  realMapImage: {
    width: '100%',
    height: '100%',
    backgroundColor: 'transparent',
  },
  mapLoadingOverlay: {
    marginTop: -30,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#DDEBD0',
  },
  mapFallbackText: {
    fontSize: 11.5,
    color: COLORS.mutedText,
    textAlign: 'center',
    paddingHorizontal: 20,
  },

  expandHintBadge: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(31, 27, 46, 0.75)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  expandHintText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  gpsChipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  gpsChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.surfaceMuted,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
  },
  gpsChipText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: COLORS.deepIndigo,
  },
  refreshIconButton: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: COLORS.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
  },

  severityRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  severityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1.5,
  },
  severityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  severityChipText: {
    fontSize: 12,
    fontWeight: '700',
  },

  typeChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  typeChip: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: COLORS.surfaceMuted,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
  },
  typeChipActive: {
    backgroundColor: COLORS.deepIndigo,
    borderColor: COLORS.deepIndigo,
  },
  typeChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.slateText,
  },
  typeChipTextActive: {
    color: '#FFFFFF',
  },

  toggleQuestionSpacer: {
    marginTop: 15,
  },
  toggleQuestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  toggleQuestionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.deepIndigo,
    flex: 1,
  },
  yesNoRow: {
    flexDirection: 'row',
    gap: 8,
  },
  yesNoOption: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: COLORS.surfaceMuted,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
  },
  yesNoOptionActive: {
    backgroundColor: COLORS.primaryOrange,
    borderColor: COLORS.primaryOrange,
  },
  yesNoOptionText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.slateText,
  },
  yesNoOptionTextActive: {
    color: '#FFFFFF',
  },

  credentialRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.surfaceMuted,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
  },
  credentialIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: '#FFF1E6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  credentialLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.mutedText,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  credentialValue: {
    fontSize: 13.5,
    fontWeight: '600',
    color: COLORS.deepIndigo,
  },

  summaryCard: {
    backgroundColor: COLORS.deepIndigo,
    borderRadius: 20,
    padding: 18,
    marginBottom: 20,
  },
  summaryTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 14,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  summaryLabel: {
    fontSize: 12.5,
    color: 'rgba(255,255,255,0.6)',
  },
  summaryValue: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#FFFFFF',
    maxWidth: '60%',
    textAlign: 'right',
  },
  summarySeverityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  summarySeverityText: {
    fontSize: 11,
    fontWeight: '700',
  },
  summaryEmergencyNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    padding: 10,
    marginTop: 14,
  },
  summaryEmergencyText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.85)',
    flex: 1,
    lineHeight: 15,
  },
  summaryReadyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 14,
  },
  summaryReadyText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: COLORS.successGreen,
  },

  bottomBar: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    backgroundColor: COLORS.background,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
  },
  backButton: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: COLORS.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
  },
  nextButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primaryOrange,
    borderRadius: 16,
    paddingVertical: 16,
    shadowColor: COLORS.primaryOrange,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  submitButtonBottom: {
    backgroundColor: COLORS.primaryOrange,
  },
  nextButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  fullscreenMapSafeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  fullscreenMapHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
    gap: 12,
  },
  fullscreenMapTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.deepIndigo,
  },
  fullscreenMapSubtitle: {
    fontSize: 12.5,
    color: COLORS.slateText,
    marginTop: 2,
  },
  fullscreenMapCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
  },
  fullscreenMapBody: {
    flex: 1,
  },
});