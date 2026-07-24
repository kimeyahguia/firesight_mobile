import { API_ENDPOINTS } from '@/constants/api';
import { ALERT_COLORS, COLORS, FONT_SIZES, TYPOGRAPHY } from '@/constants/theme';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  Linking,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const { width: SCREEN_W } = Dimensions.get('window');

// ────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────
interface Officer {
  id: string;
  name: string;
  rank: string;
  role: string;
  yearsOfService?: number;
  photoUrl?: string | null;
  bio?: string;
}

interface StationInfo {
  name: string;
  tagline: string;
  address: string;
  contactNumber: string;
  emergencyHotline: string;
  officeHours: string;
  established: string;
  barangaysCovered: number;
  municipality?: string;
  mission: string;
  vision: string;
  services: string[];
  heroImages?: string[];
}

interface Accomplishment {
  id: string;
  title: string;
  description: string;
  year: string;
  image: string;
}

interface ServiceItem {
  id: string;
  title: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
}

// ────────────────────────────────────────────────────────────
// Mock content — swap for real API data once endpoints exist, bes.
// All images below are fire trucks / firefighters / rescue ops
// so they're actually on-theme for BFP Lian instead of generic stock.
// ────────────────────────────────────────────────────────────
const FALLBACK_HERO_IMAGES: string[] = [
  'https://images.unsplash.com/photo-1516937941344-00b4e0337589?q=80&w=1600', // fire truck
  'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?q=80&w=1600', // firefighter in action
  'https://images.unsplash.com/photo-1584634731339-252c581abfc5?q=80&w=1600', // firefighter gear
];

const ACCOMPLISHMENTS: Accomplishment[] = [
  {
    id: '1',
    title: 'Fire Prevention Month 2025',
    description: 'Municipality-wide awareness campaign covering all barangays in Lian.',
    year: '2025',
    image: 'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?q=80&w=1200', // fire truck night response
  },
  {
    id: '2',
    title: 'Outstanding Response Award',
    description: 'Recognized by the Provincial Fire Marshal for fastest average response time.',
    year: '2024',
    image: 'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?q=80&w=1200', // firefighter action
  },
  {
    id: '3',
    title: 'Community Fire Drills',
    description: 'Conducted safety drills across schools and barangay halls.',
    year: '2024',
    image: 'https://images.unsplash.com/photo-1587556930799-8dca6fad6d41?q=80&w=1200', // firefighter training/drill
  },
  {
    id: '4',
    title: 'Rescue Operations Excellence',
    description: 'Successful multi-agency rescue coordination during flood season.',
    year: '2023',
    image: 'https://images.unsplash.com/photo-1523293182086-7651a899d37f?q=80&w=1200', // rescue operation
  },
];

const SERVICES: ServiceItem[] = [
  { id: '1', title: 'Fire Suppression', icon: 'fire-truck' },
  { id: '2', title: 'Rescue Operations', icon: 'ambulance' },
  { id: '3', title: 'Emergency Response', icon: 'alarm-light' },
  { id: '4', title: 'Fire Safety Inspection', icon: 'clipboard-check' },
  { id: '5', title: 'Fire Code Enforcement', icon: 'gavel' },
  { id: '6', title: 'Community Awareness', icon: 'account-group' },
];

async function fetchJson(url: string) {
  const res = await fetch(url);
  const json = await res.json();
  if (!json.success) throw new Error(json.message || 'Request failed');
  return json.data;
}

// ────────────────────────────────────────────────────────────
// Small reusable bits
// ────────────────────────────────────────────────────────────
function SectionHeader({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <View style={styles.sectionHeaderWrap}>
      <Text style={styles.sectionEyebrow}>{eyebrow}</Text>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

function initials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
}

// ────────────────────────────────────────────────────────────
// Main screen
// ────────────────────────────────────────────────────────────
export default function BfpAboutScreen() {
  const [loading, setLoading] = useState(true);
  const [stationInfo, setStationInfo] = useState<StationInfo | null>(null);
  const [officers, setOfficers] = useState<Officer[]>([]);

  const [heroIndex, setHeroIndex] = useState(0);
  const [selectedOfficer, setSelectedOfficer] = useState<Officer | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const [stationData, officersData] = await Promise.all([
          fetchJson(API_ENDPOINTS.bfpStationInfo),
          fetchJson(API_ENDPOINTS.bfpPersonnel),
        ]);
        setStationInfo(stationData);
        setOfficers(officersData);
      } catch (err) {
        console.error('Failed to load BFP about data:', err);
        Alert.alert('Error', 'Failed to load BFP Lian info. Please check your connection.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleCall = (number?: string) => {
    if (!number) {
      Alert.alert('Unavailable', 'This contact number is not yet available.');
      return;
    }
    const cleaned = number.replace(/[^0-9+]/g, '');
    if (!cleaned) {
      Alert.alert('Unavailable', 'This contact number is not yet available.');
      return;
    }
    Linking.openURL(`tel:${cleaned}`).catch(() =>
      Alert.alert('Error', 'Unable to open the dialer on this device.')
    );
  };

  const handleHeroScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_W);
    if (idx !== heroIndex) setHeroIndex(idx);
  };

  // NOTE bes: adjust this path to match your actual Tabs route file
  // under app/(bfp)/. If your risk map screen lives at
  // app/(bfp)/(tabs)/risk-map.tsx, this path is already correct.
  // If it's nested differently (e.g. inside a drawer group), update it.
  const goToRiskMapTab = () => {
    router.push('/(tabs)/map' as any);
  };

  if (loading || !stationInfo) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={COLORS.primaryOrange} />
          <Text style={styles.loadingText}>Loading BFP Lian info...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const heroImages =
    stationInfo.heroImages && stationInfo.heroImages.length > 0
      ? stationInfo.heroImages
      : FALLBACK_HERO_IMAGES;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.deepIndigo} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Top bar (floats over hero) ── */}
        <View style={styles.topBar}>
          <TouchableOpacity activeOpacity={0.85} style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={20} color={COLORS.background} />
          </TouchableOpacity>
        </View>

        {/* ── Hero Banner ── */}
        <View style={styles.heroWrap}>
          <FlatList
            data={heroImages}
            keyExtractor={(item, i) => `${item}-${i}`}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={handleHeroScroll}
            scrollEventThrottle={16}
            renderItem={({ item }) => (
              <Image source={{ uri: item }} style={styles.heroImage} resizeMode="cover" />
            )}
          />
          <LinearGradient
            colors={['rgba(30,27,75,0.05)', 'rgba(30,27,75,0.85)']}
            style={styles.heroGradient}
            pointerEvents="none"
          />
          <View style={styles.heroTextWrap}>
            <View style={styles.heroBadge}>
              <MaterialCommunityIcons name="shield-star" size={13} color={COLORS.warningAmber} />
              <Text style={styles.heroBadgeText}>Bureau of Fire Protection</Text>
            </View>
            <Text style={styles.heroTitle}>Lian Fire Station</Text>
            <Text style={styles.heroSubtitle}>
              Serving and Protecting the Municipality of Lian
            </Text>
          </View>
          {heroImages.length > 1 && (
            <View style={styles.heroDotsRow}>
              {heroImages.map((_, i) => (
                <View key={i} style={[styles.heroDot, i === heroIndex && styles.heroDotActive]} />
              ))}
            </View>
          )}
        </View>

        {/* ── About the Station ── */}
        <View style={styles.section}>
          <SectionHeader eyebrow="Institutional Profile" title="About the Station" />
          <View style={styles.iconStatGrid}>
            <View style={styles.iconStatCard}>
              <View style={[styles.iconStatIconWrap, { backgroundColor: COLORS.contactIconBg }]}>
                <Ionicons name="calendar-outline" size={18} color={COLORS.primaryOrange} />
              </View>
              <Text style={styles.iconStatValue}>{stationInfo.established}</Text>
              <Text style={styles.iconStatLabel}>Established</Text>
            </View>
            <View style={styles.iconStatCard}>
              <View style={[styles.iconStatIconWrap, { backgroundColor: COLORS.surfaceMuted }]}>
                <Ionicons name="location-outline" size={18} color={COLORS.deepIndigo} />
              </View>
              <Text style={styles.iconStatValue}>{stationInfo.municipality ?? 'Lian'}</Text>
              <Text style={styles.iconStatLabel}>Municipality Served</Text>
            </View>
            <View style={styles.iconStatCard}>
              <View style={[styles.iconStatIconWrap, { backgroundColor: ALERT_COLORS.Warning.bg }]}>
                <Ionicons name="map-outline" size={18} color={COLORS.warningAmber} />
              </View>
              <Text style={styles.iconStatValue}>{stationInfo.barangaysCovered}</Text>
              <Text style={styles.iconStatLabel}>Barangays Covered</Text>
            </View>
            <View style={styles.iconStatCard}>
              <View style={[styles.iconStatIconWrap, { backgroundColor: COLORS.contactIconBg }]}>
                <Ionicons name="time-outline" size={18} color={COLORS.primaryOrange} />
              </View>
              <Text style={styles.iconStatValue}>24/7</Text>
              <Text style={styles.iconStatLabel}>Availability</Text>
            </View>
          </View>

          <View style={styles.missionCard}>
            <View style={styles.missionRow}>
              <MaterialCommunityIcons name="target" size={16} color={COLORS.primaryOrange} />
              <Text style={styles.missionLabel}>Mission</Text>
            </View>
            <Text style={styles.missionText}>{stationInfo.mission}</Text>
          </View>
          <View style={styles.missionCard}>
            <View style={styles.missionRow}>
              <MaterialCommunityIcons name="telescope" size={16} color={COLORS.deepIndigo} />
              <Text style={styles.missionLabel}>Vision</Text>
            </View>
            <Text style={styles.missionText}>{stationInfo.vision}</Text>
          </View>
        </View>

        {/* ── Officers ── */}
        <View style={styles.section}>
          <SectionHeader eyebrow="Leadership" title="Meet Our Officers" />
          <FlatList
            data={officers}
            keyExtractor={(o) => o.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 12, paddingRight: 20 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                activeOpacity={0.85}
                style={styles.officerCard}
                onPress={() => setSelectedOfficer(item)}
              >
                <View style={styles.officerPortraitWrap}>
                  {item.photoUrl ? (
                    <Image source={{ uri: item.photoUrl }} style={styles.officerPortrait} />
                  ) : (
                    <View style={styles.officerPortraitFallback}>
                      <Text style={styles.officerInitials}>{initials(item.name)}</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.officerRank}>{item.rank}</Text>
                <Text style={styles.officerName} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.officerRole} numberOfLines={1}>{item.role}</Text>
                {typeof item.yearsOfService === 'number' && (
                  <View style={styles.officerYearsPill}>
                    <Text style={styles.officerYearsText}>{item.yearsOfService} yrs service</Text>
                  </View>
                )}
              </TouchableOpacity>
            )}
            ListEmptyComponent={<Text style={styles.emptyText}>No personnel listed yet.</Text>}
          />
        </View>

        {/* ── Accomplishments ── */}
        <View style={styles.section}>
          <SectionHeader eyebrow="Recognition" title="Accomplishments" />
          <View style={{ gap: 14 }}>
            {ACCOMPLISHMENTS.map((a) => (
              <View key={a.id} style={styles.accomplishCard}>
                <Image source={{ uri: a.image }} style={styles.accomplishImage} resizeMode="cover" />
                <LinearGradient
                  colors={['transparent', 'rgba(30,27,75,0.75)']}
                  style={styles.accomplishGradient}
                />
                <View style={styles.accomplishBadge}>
                  <Ionicons name="trophy" size={13} color={COLORS.deepIndigo} />
                </View>
                <View style={styles.accomplishTextWrap}>
                  <View style={styles.accomplishHeaderRow}>
                    <Text style={styles.accomplishTitle}>{a.title}</Text>
                    <Text style={styles.accomplishYear}>{a.year}</Text>
                  </View>
                  <Text style={styles.accomplishDesc} numberOfLines={2}>{a.description}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* ── Core Services ── */}
        <View style={styles.section}>
          <SectionHeader eyebrow="Mandate" title="Core Services" />
          <View style={styles.servicesGrid}>
            {SERVICES.map((s) => (
              <View key={s.id} style={styles.serviceCard}>
                <View style={styles.serviceIconWrap}>
                  <MaterialCommunityIcons name={s.icon} size={22} color={COLORS.primaryOrange} />
                </View>
                <Text style={styles.serviceCardTitle}>{s.title}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── Bottom CTA ── */}
        <View style={[styles.section, { paddingBottom: 8 }]}>
          <View style={styles.ctaCard}>
            <MaterialCommunityIcons name="fire" size={26} color={COLORS.warningAmber} style={{ marginBottom: 10 }} />
            <Text style={styles.ctaTitle}>Together We Build a{'\n'}Fire-Safe Community</Text>
            <View style={styles.ctaButtonsRow}>
              <TouchableOpacity
                activeOpacity={0.85}
                style={styles.ctaBtnPrimary}
                onPress={() => handleCall(stationInfo.contactNumber)}
              >
                <Ionicons name="call-outline" size={14} color={COLORS.background} />
                <Text style={styles.ctaBtnPrimaryText}>Contact Station</Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.85}
                style={styles.ctaBtnDanger}
                onPress={() => handleCall(stationInfo.emergencyHotline)}
              >
                <Ionicons name="alert-circle-outline" size={14} color={COLORS.background} />
                <Text style={styles.ctaBtnDangerText}>Emergency Hotline</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity activeOpacity={0.85} style={styles.ctaBtnOutline} onPress={goToRiskMapTab}>
              <Ionicons name="map-outline" size={14} color={COLORS.background} />
              <Text style={styles.ctaBtnOutlineText}>Visit FireSight Risk Map</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* ── Officer detail modal ── */}
      <Modal
        visible={!!selectedOfficer}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedOfficer(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.officerModalCard}>
            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setSelectedOfficer(null)}>
              <Ionicons name="close" size={18} color={COLORS.deepIndigo} />
            </TouchableOpacity>
            {selectedOfficer && (
              <>
                <View style={styles.officerModalPortraitWrap}>
                  {selectedOfficer.photoUrl ? (
                    <Image source={{ uri: selectedOfficer.photoUrl }} style={styles.officerModalPortrait} />
                  ) : (
                    <View style={styles.officerModalPortraitFallback}>
                      <Text style={styles.officerModalInitials}>{initials(selectedOfficer.name)}</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.officerModalRank}>{selectedOfficer.rank}</Text>
                <Text style={styles.officerModalName}>{selectedOfficer.name}</Text>
                <Text style={styles.officerModalRole}>{selectedOfficer.role}</Text>
                {typeof selectedOfficer.yearsOfService === 'number' && (
                  <View style={styles.officerModalYearsPill}>
                    <Ionicons name="ribbon-outline" size={13} color={COLORS.warningAmber} />
                    <Text style={styles.officerModalYearsText}>
                      {selectedOfficer.yearsOfService} years of service
                    </Text>
                  </View>
                )}
                {selectedOfficer.bio ? (
                  <Text style={styles.officerModalBio}>{selectedOfficer.bio}</Text>
                ) : null}
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ────────────────────────────────────────────────────────────
// Styles — all colors/type sizes pulled from @/constants/theme
// ────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontSize: FONT_SIZES.secondary, color: COLORS.slateText },

  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 8 },

  topBar: { position: 'absolute', top: 44, left: 16, zIndex: 10 },
  backBtn: {
    width: 36, height: 36, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(30,27,75,0.45)',
  },

  // Hero
  heroWrap: { width: SCREEN_W, height: 340, marginBottom: 28 },
  heroImage: { width: SCREEN_W, height: 340 },
  heroGradient: { ...StyleSheet.absoluteFillObject },
  heroTextWrap: { position: 'absolute', bottom: 28, left: 20, right: 20 },
  heroBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'flex-start', backgroundColor: 'rgba(245,158,11,0.15)',
    borderWidth: 1, borderColor: 'rgba(245,158,11,0.4)',
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5, marginBottom: 10,
  },
  heroBadgeText: { fontSize: FONT_SIZES.tiny, fontWeight: '700', color: COLORS.warningAmber, letterSpacing: 0.3 },
  heroTitle: { ...TYPOGRAPHY.screenTitle, color: COLORS.background, marginBottom: 6 },
  heroSubtitle: { fontSize: FONT_SIZES.secondary, color: 'rgba(255,255,255,0.85)', fontStyle: 'italic' },
  heroDotsRow: { position: 'absolute', bottom: 12, alignSelf: 'center', flexDirection: 'row', gap: 5 },
  heroDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.4)' },
  heroDotActive: { backgroundColor: COLORS.warningAmber, width: 14 },

  // Sections
  section: { paddingHorizontal: 20, marginBottom: 30 },
  sectionHeaderWrap: { marginBottom: 16 },
  sectionEyebrow: {
    fontSize: FONT_SIZES.tiny, fontWeight: '700', color: COLORS.primaryOrange,
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: 3,
  },
  sectionTitle: { ...TYPOGRAPHY.cardTitle, color: COLORS.deepIndigo, fontWeight: '800' },

  // About / icon stat grid
  iconStatGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
  iconStatCard: {
    width: '47.5%', backgroundColor: COLORS.card, borderRadius: 16,
    padding: 14, borderWidth: 1, borderColor: COLORS.border,
    shadowColor: COLORS.deepIndigo, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 10, elevation: 1,
  },
  iconStatIconWrap: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  iconStatValue: { fontSize: FONT_SIZES.secondary, fontWeight: '800', color: COLORS.deepIndigo, marginBottom: 2 },
  iconStatLabel: { fontSize: FONT_SIZES.caption, color: COLORS.slateText },

  missionCard: {
    backgroundColor: COLORS.card, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: COLORS.border, marginBottom: 10,
  },
  missionRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 6 },
  missionLabel: { fontSize: FONT_SIZES.secondary, fontWeight: '700', color: COLORS.deepIndigo, textTransform: 'uppercase', letterSpacing: 0.4 },
  missionText: { fontSize: FONT_SIZES.secondary, color: COLORS.slateText, lineHeight: 19 },

  emptyText: { fontSize: FONT_SIZES.secondary, color: COLORS.mutedText, paddingVertical: 8 },

  // Officers
  officerCard: {
    width: 132, backgroundColor: COLORS.card, borderRadius: 18,
    padding: 14, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border,
    shadowColor: COLORS.deepIndigo, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 1,
  },
  officerPortraitWrap: { marginBottom: 10 },
  officerPortrait: { width: 56, height: 56, borderRadius: 28 },
  officerPortraitFallback: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: COLORS.accentViolet,
    alignItems: 'center', justifyContent: 'center',
  },
  officerInitials: { fontSize: FONT_SIZES.secondary, fontWeight: '700', color: COLORS.background },
  officerRank: { fontSize: FONT_SIZES.tiny, fontWeight: '700', color: COLORS.primaryOrange, textTransform: 'uppercase', letterSpacing: 0.3 },
  officerName: { fontSize: FONT_SIZES.secondary, fontWeight: '700', color: COLORS.deepIndigo, textAlign: 'center', marginTop: 3 },
  officerRole: { fontSize: FONT_SIZES.caption, color: COLORS.slateText, textAlign: 'center', marginTop: 2 },
  officerYearsPill: {
    marginTop: 8, backgroundColor: ALERT_COLORS.Warning.bg, borderRadius: 10,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  officerYearsText: { fontSize: 9, fontWeight: '700', color: ALERT_COLORS.Warning.text },

  // Accomplishments
  accomplishCard: { height: 170, borderRadius: 20, overflow: 'hidden', backgroundColor: COLORS.deepIndigo },
  accomplishImage: { ...StyleSheet.absoluteFillObject },
  accomplishGradient: { ...StyleSheet.absoluteFillObject },
  accomplishBadge: {
    position: 'absolute', top: 12, right: 12,
    width: 30, height: 30, borderRadius: 10,
    backgroundColor: COLORS.warningAmber, alignItems: 'center', justifyContent: 'center',
  },
  accomplishTextWrap: { position: 'absolute', bottom: 14, left: 16, right: 16 },
  accomplishHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  accomplishTitle: { fontSize: FONT_SIZES.secondary, fontWeight: '800', color: COLORS.background, flex: 1, marginRight: 8 },
  accomplishYear: { fontSize: FONT_SIZES.caption, fontWeight: '700', color: COLORS.warningAmber },
  accomplishDesc: { fontSize: FONT_SIZES.caption, color: 'rgba(255,255,255,0.85)', lineHeight: 16 },

  // Services
  servicesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  serviceCard: {
    width: '47.5%', backgroundColor: COLORS.card, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: COLORS.border, alignItems: 'flex-start', gap: 10,
  },
  serviceIconWrap: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: COLORS.contactIconBg,
    alignItems: 'center', justifyContent: 'center',
  },
  serviceCardTitle: { fontSize: FONT_SIZES.secondary, fontWeight: '700', color: COLORS.deepIndigo },

  // CTA
  ctaCard: {
    backgroundColor: COLORS.deepIndigo, borderRadius: 22, padding: 24, alignItems: 'center',
    shadowColor: COLORS.deepIndigo, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.25, shadowRadius: 18, elevation: 6,
  },
  ctaTitle: { fontSize: FONT_SIZES.cardTitle, fontWeight: '800', color: COLORS.background, textAlign: 'center', lineHeight: 24, marginBottom: 18 },
  ctaButtonsRow: { flexDirection: 'row', gap: 10, width: '100%', marginBottom: 10 },
  ctaBtnPrimary: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: COLORS.primaryOrange, borderRadius: 12, paddingVertical: 12,
  },
  ctaBtnPrimaryText: { fontSize: FONT_SIZES.caption, fontWeight: '700', color: COLORS.background },
  ctaBtnDanger: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: COLORS.criticalRed, borderRadius: 12, paddingVertical: 12,
  },
  ctaBtnDangerText: { fontSize: FONT_SIZES.caption, fontWeight: '700', color: COLORS.background },
  ctaBtnOutline: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    width: '100%', borderRadius: 12, paddingVertical: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
  },
  ctaBtnOutlineText: { fontSize: FONT_SIZES.caption, fontWeight: '700', color: COLORS.background },

  // Officer modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(30,27,75,0.6)', alignItems: 'center', justifyContent: 'center', padding: 30 },
  officerModalCard: { width: '100%', backgroundColor: COLORS.card, borderRadius: 22, padding: 24, alignItems: 'center' },
  modalCloseBtn: {
    position: 'absolute', top: 14, right: 14, width: 30, height: 30, borderRadius: 10,
    backgroundColor: COLORS.surfaceMuted, alignItems: 'center', justifyContent: 'center',
  },
  officerModalPortraitWrap: { marginBottom: 14, marginTop: 6 },
  officerModalPortrait: { width: 84, height: 84, borderRadius: 42 },
  officerModalPortraitFallback: {
    width: 84, height: 84, borderRadius: 42, backgroundColor: COLORS.accentViolet,
    alignItems: 'center', justifyContent: 'center',
  },
  officerModalInitials: { fontSize: FONT_SIZES.appBar, fontWeight: '700', color: COLORS.background },
  officerModalRank: { fontSize: FONT_SIZES.secondary, fontWeight: '700', color: COLORS.primaryOrange, textTransform: 'uppercase', letterSpacing: 0.4 },
  officerModalName: { ...TYPOGRAPHY.cardTitle, color: COLORS.deepIndigo, marginTop: 4 },
  officerModalRole: { fontSize: FONT_SIZES.secondary, color: COLORS.slateText, marginTop: 3 },
  officerModalYearsPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: ALERT_COLORS.Warning.bg, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 5, marginTop: 12,
  },
  officerModalYearsText: { fontSize: FONT_SIZES.caption, fontWeight: '700', color: ALERT_COLORS.Warning.text },
  officerModalBio: { fontSize: FONT_SIZES.secondary, color: COLORS.slateText, lineHeight: 18, textAlign: 'center', marginTop: 14 },
});