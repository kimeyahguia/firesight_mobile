import React, { useState, useEffect } from 'react';

import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  SafeAreaView,
  Image,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS, FONT_SIZES } from '@/constants/theme';
import { API_ENDPOINTS } from '@/constants/api';
import AppHeader from '@/components/common/AppHeader';

// ────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────

type IoniconName = keyof typeof Ionicons.glyphMap;

interface ReadinessItem {
  id: string;
  label: string;
  done: number; // 0 or 1 from MySQL
  icon: IoniconName;
}

interface TrustedContact {
  id: string;
  name: string;
  relation: string;
  phone: string;
}

interface ProfileUser {
  id: number;
  full_name: string;
  email: string;
  avatar_url: string | null;
  barangay: string;
  is_verified: number;
}

interface ProfileStats {
  reports: number;
  alertsViewed: number;
  guidesRead: number;
}

interface ProfileData {
  user: ProfileUser;
  readiness: ReadinessItem[];
  contacts: TrustedContact[];
  stats: ProfileStats;
}

interface ActivityStat {
  id: string;
  label: string;
  value: string;
  icon: IoniconName;
  iconBg: string;
  iconColor: string;
}

interface PreferenceItem {
  id: string;
  icon: IoniconName;
  iconBg: string;
  iconColor: string;
  title: string;
  subtitle: string;
}

// ────────────────────────────────────────────────────────────
// Static preference list (no DB needed — just navigation items)
// ────────────────────────────────────────────────────────────

const PREFERENCE_ITEMS: PreferenceItem[] = [
  {
    id: '1',
    icon: 'person-outline',
    iconBg: '#FFF1E6',
    iconColor: COLORS.primaryOrange,
    title: 'Edit Profile',
    subtitle: 'Update your name, barangay, and photo',
  },
  {
    id: '2',
    icon: 'notifications-outline',
    iconBg: 'rgba(109,91,208,0.1)',
    iconColor: COLORS.accentViolet,
    title: 'Notification Preferences',
    subtitle: 'Alerts, drills, and emergency updates',
  },
  {
    id: '3',
    icon: 'location-outline',
    iconBg: '#ECFDF5',
    iconColor: COLORS.successGreen,
    title: 'Location & Permissions',
    subtitle: 'Manage reporting location access',
  },
  {
    id: '4',
    icon: 'shield-checkmark-outline',
    iconBg: '#EEF2FF',
    iconColor: COLORS.accentViolet,
    title: 'Privacy & Data',
    subtitle: 'Control how your data is used',
  },
  {
    id: '5',
    icon: 'help-circle-outline',
    iconBg: COLORS.surfaceMuted,
    iconColor: COLORS.slateText,
    title: 'Help & Support',
    subtitle: 'FAQs, contact BFP, report an issue',
  },
];

// ────────────────────────────────────────────────────────────
// Sub-components
// ────────────────────────────────────────────────────────────

function SectionHeader({ eyebrow, title, subtitle }: { eyebrow?: string; title: string; subtitle?: string }) {
  return (
    <View style={styles.sectionHeaderWrap}>
      {eyebrow ? <Text style={styles.sectionEyebrow}>{eyebrow}</Text> : null}
      <Text style={styles.sectionTitle}>{title}</Text>
      {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
    </View>
  );
}

function ReadinessRow({ item }: { item: ReadinessItem }) {
  const isDone = item.done === 1;
  return (
    <View style={styles.readinessRow}>
      <View style={[styles.readinessIconWrap, { backgroundColor: isDone ? '#ECFDF5' : COLORS.surfaceMuted }]}>
        <Ionicons name={item.icon} size={15} color={isDone ? COLORS.successGreen : COLORS.mutedText} />
      </View>
      <Text style={[styles.readinessLabel, !isDone && styles.readinessLabelMuted]}>
        {item.label}
      </Text>
      <Ionicons
        name={isDone ? 'checkmark-circle' : 'ellipse-outline'}
        size={18}
        color={isDone ? COLORS.successGreen : COLORS.mutedText}
      />
    </View>
  );
}

function ActivityStatCard({ stat }: { stat: ActivityStat }) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIconWrap, { backgroundColor: stat.iconBg }]}>
        <Ionicons name={stat.icon} size={18} color={stat.iconColor} />
      </View>
      <Text style={styles.statValue}>{stat.value}</Text>
      <Text style={styles.statLabel}>{stat.label}</Text>
    </View>
  );
}

function TrustedContactRow({ contact }: { contact: TrustedContact }) {
  return (
    <View style={styles.contactRow}>
      <View style={styles.contactAvatar}>
        <Text style={styles.contactAvatarText}>
          {contact.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
        </Text>
      </View>
      <View style={styles.contactInfo}>
        <Text style={styles.contactName}>{contact.name}</Text>
        <Text style={styles.contactMeta}>{contact.relation} · {contact.phone}</Text>
      </View>
      <TouchableOpacity activeOpacity={0.7} style={styles.contactCallButton}>
        <Ionicons name="call-outline" size={16} color={COLORS.primaryOrange} />
      </TouchableOpacity>
    </View>
  );
}

function PreferenceRow({ item }: { item: PreferenceItem }) {
  return (
    <TouchableOpacity activeOpacity={0.8} style={styles.prefRow}>
      <View style={[styles.prefIconWrap, { backgroundColor: item.iconBg }]}>
        <Ionicons name={item.icon} size={17} color={item.iconColor} />
      </View>
      <View style={styles.prefText}>
        <Text style={styles.prefTitle}>{item.title}</Text>
        <Text style={styles.prefSubtitle}>{item.subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={COLORS.mutedText} />
    </TouchableOpacity>
  );
}

// ────────────────────────────────────────────────────────────
// Main Screen
// ────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const [profileUri, setProfileUri] = useState<string | null>(null);
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<number | null>(null);

  // Load logged-in user_id from AsyncStorage on mount
  useEffect(() => {
    const loadUserAndProfile = async () => {
      const storedId = await AsyncStorage.getItem('user_id');
      if (storedId) {
        setUserId(Number(storedId));
      } else {
        // walang naka-login, balik sa login screen
        router.replace('/login');
      }
    };
    loadUserAndProfile();
  }, []);

  // Fetch profile once userId is available
  useEffect(() => {
    if (userId !== null) {
      fetchProfile();
    }
  }, [userId]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`${API_ENDPOINTS.profileRead}?user_id=${userId}`);
      if (!response.ok) throw new Error('Server error');
      const data: ProfileData = await response.json();
      setProfileData(data);
    } catch (err) {
      console.error('Failed to fetch profile:', err);
      setError('Failed to load profile. Check your connection.');
    } finally {
      setLoading(false);
    }
  };

  async function handlePickImage() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets.length > 0) {
      setProfileUri(result.assets[0].uri);
      // TODO: upload to server via profile/update.php + move image to server storage
    }
  }

  // ── Loading state ──
  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={COLORS.primaryOrange} />
          <Text style={styles.centerStateText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Error / empty state ──
  if (error || !profileData) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerState}>
          <Ionicons name="cloud-offline-outline" size={40} color={COLORS.mutedText} />
          <Text style={styles.centerStateText}>{error ?? 'No profile data found.'}</Text>
          <TouchableOpacity activeOpacity={0.8} style={styles.retryButton} onPress={fetchProfile}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const { user, readiness, contacts, stats } = profileData;

  const readinessDone = readiness.filter((i) => i.done === 1).length;
  const readinessTotal = readiness.length || 1;
  const readinessPct = Math.round((readinessDone / readinessTotal) * 100);

  const initials = user.full_name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const ACTIVITY_STATS: ActivityStat[] = [
    {
      id: '1',
      label: 'Reports Submitted',
      value: String(stats.reports),
      icon: 'flame-outline',
      iconBg: '#FFF1E6',
      iconColor: COLORS.primaryOrange,
    },
    {
      id: '2',
      label: 'Alerts Viewed',
      value: String(stats.alertsViewed),
      icon: 'notifications-outline',
      iconBg: 'rgba(109,91,208,0.1)',
      iconColor: COLORS.accentViolet,
    },
    {
      id: '3',
      label: 'Guides Read',
      value: String(stats.guidesRead),
      icon: 'book-outline',
      iconBg: '#ECFDF5',
      iconColor: COLORS.successGreen,
    },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header — shared AppHeader component, gear icon routes to /settings */}
        <AppHeader
          title="Profile"
          subtitle="Your account, readiness, and preferences"
          showBrand={false}
          rightAction={{ icon: 'settings-outline', onPress: () => router.push('/settings') }}
        />

        {/* Profile Hero Card */}
        <View style={styles.heroCard}>
          <View style={styles.heroTop}>

            {/* Avatar with camera button */}
            <View style={styles.avatarContainer}>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={handlePickImage}
                style={styles.avatarTouchable}
              >
                {profileUri ? (
                  <Image source={{ uri: profileUri }} style={styles.avatarImage} />
                ) : user.avatar_url ? (
                  <Image source={{ uri: user.avatar_url }} style={styles.avatarImage} />
                ) : (
                  <View style={styles.avatarFallback}>
                    <Text style={styles.avatarText}>{initials}</Text>
                  </View>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={handlePickImage}
                style={styles.cameraButton}
              >
                <Ionicons name="camera" size={12} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <View style={styles.heroMeta}>
              <Text style={styles.heroName}>{user.full_name}</Text>
              <Text style={styles.heroSub}>{user.email}</Text>
              <View style={styles.heroBadgeRow}>
                {user.is_verified === 1 && (
                  <View style={styles.heroBadge}>
                    <Ionicons name="shield-checkmark" size={11} color="#FED7AA" />
                    <Text style={styles.heroBadgeText}>Verified Resident</Text>
                  </View>
                )}
                <View style={styles.heroLocationPill}>
                  <Ionicons name="location-outline" size={11} color="rgba(255,255,255,0.6)" />
                  <Text style={styles.heroLocationText}>{user.barangay}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Mini stats */}
          <View style={styles.heroStatsRow}>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>{stats.reports}</Text>
              <Text style={styles.heroStatLabel}>Reports</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>{stats.alertsViewed}</Text>
              <Text style={styles.heroStatLabel}>Alerts Read</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>{readinessPct}%</Text>
              <Text style={styles.heroStatLabel}>Readiness</Text>
            </View>
          </View>
        </View>

        {/* Safety Readiness Snapshot */}
        <SectionHeader
          eyebrow="Status"
          title="Safety Readiness"
          subtitle={`${readinessDone} of ${readiness.length} items completed`}
        />
        <View style={styles.card}>
          <View style={styles.readinessBarBg}>
            <View style={[styles.readinessBarFill, { width: `${readinessPct}%` as `${number}%` }]} />
          </View>
          <View style={styles.readinessList}>
            {readiness.map((item, index) => (
              <View key={item.id}>
                <ReadinessRow item={item} />
                {index < readiness.length - 1 && <View style={styles.rowDivider} />}
              </View>
            ))}
          </View>
        </View>

        {/* Activity Overview */}
        <SectionHeader eyebrow="Overview" title="My Activity" subtitle="Your FIRESIGHT contributions" />
        <View style={styles.statsRow}>
          {ACTIVITY_STATS.map((stat) => (
            <ActivityStatCard key={stat.id} stat={stat} />
          ))}
        </View>

        {/* Trusted Contacts */}
        <SectionHeader eyebrow="Safety Network" title="Trusted Emergency Contacts" />
        <View style={styles.card}>
          {contacts.length === 0 ? (
            <Text style={styles.emptyContactsText}>No trusted contacts added yet.</Text>
          ) : (
            contacts.map((contact, index) => (
              <View key={contact.id}>
                <TrustedContactRow contact={contact} />
                {index < contacts.length - 1 && <View style={styles.rowDivider} />}
              </View>
            ))
          )}
          <TouchableOpacity activeOpacity={0.8} style={styles.addContactButton}>
            <Ionicons name="add-circle-outline" size={16} color={COLORS.primaryOrange} />
            <Text style={styles.addContactText}>Add Emergency Contact</Text>
          </TouchableOpacity>
        </View>

        {/* Emergency Hotline */}
        <View style={styles.hotlineCard}>
          <View style={styles.hotlineLeft}>
            <View style={styles.hotlineIconWrap}>
              <MaterialCommunityIcons name="fire-truck" size={20} color={COLORS.primaryOrange} />
            </View>
            <View>
              <Text style={styles.hotlineName}>BFP Lian Fire Station</Text>
              <Text style={styles.hotlineNumber}>(043) 740 1234</Text>
            </View>
          </View>
          <TouchableOpacity activeOpacity={0.8} style={styles.hotlineCallButton}>
            <Ionicons name="call" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* App Preferences */}
        <SectionHeader eyebrow="Settings" title="Account & Preferences" />
        <View style={styles.card}>
          {PREFERENCE_ITEMS.map((item, index) => (
            <View key={item.id}>
              <PreferenceRow item={item} />
              {index < PREFERENCE_ITEMS.length - 1 && <View style={styles.rowDivider} />}
            </View>
          ))}
        </View>

        {/* Safety Resources Shortcut */}
        <View style={styles.resourcesCard}>
          <View style={styles.resourcesLeft}>
            <Text style={styles.resourcesEyebrow}>Keep Learning</Text>
            <Text style={styles.resourcesTitle}>Continue Learning</Text>
            <Text style={styles.resourcesSubtitle}>
              You've read {stats.guidesRead} guides. Review home fire prevention basics next.
            </Text>
          </View>
          <TouchableOpacity activeOpacity={0.85} style={styles.resourcesButton}>
            <Ionicons name="book" size={15} color={COLORS.deepIndigo} />
            <Text style={styles.resourcesButtonText}>Open</Text>
          </TouchableOpacity>
        </View>

        {/* Logout */}
        <TouchableOpacity
          activeOpacity={0.8}
          style={styles.logoutButton}
          onPress={async () => {
            await AsyncStorage.removeItem('user_id');
            await AsyncStorage.removeItem('user_data');
            router.replace('/login');
          }}
        >
          <Ionicons name="log-out-outline" size={18} color={COLORS.criticalRed} />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>

        <Text style={styles.versionText}>FIRESIGHT v1.0.0 · Lian, Batangas</Text>

        <View style={{ height: 32 }} />
      </ScrollView>
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
  scrollView: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },

  // Loading / error state
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 40,
  },
  centerStateText: {
    fontSize: FONT_SIZES.secondary,
    color: COLORS.slateText,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 8,
    backgroundColor: COLORS.primaryOrange,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: FONT_SIZES.secondary,
  },
  emptyContactsText: {
    fontSize: FONT_SIZES.caption,
    color: COLORS.mutedText,
    paddingVertical: 16,
    textAlign: 'center',
  },

  // Hero Card
  heroCard: {
    backgroundColor: COLORS.deepIndigo,
    borderRadius: 22,
    padding: 20,
    marginTop: 20,
    marginBottom: 28,
    shadowColor: COLORS.deepIndigo,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 6,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    marginBottom: 20,
  },

  // Avatar
  avatarContainer: {
    position: 'relative',
    width: 58,
    height: 58,
  },
  avatarTouchable: {
    width: 58,
    height: 58,
    borderRadius: 18,
    overflow: 'hidden',
  },
  avatarImage: {
    width: 58,
    height: 58,
    borderRadius: 18,
  },
  avatarFallback: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: COLORS.primaryOrange,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: FONT_SIZES.appBar,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  cameraButton: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 22,
    height: 22,
    borderRadius: 7,
    backgroundColor: COLORS.accentViolet,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.deepIndigo,
  },

  heroMeta: { flex: 1 },
  heroName: {
    fontSize: FONT_SIZES.cardTitle,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 3,
  },
  heroSub: {
    fontSize: FONT_SIZES.caption,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 8,
  },
  heroBadgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(249,115,22,0.2)',
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  heroBadgeText: {
    fontSize: FONT_SIZES.tiny,
    fontWeight: '700',
    color: '#FED7AA',
  },
  heroLocationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  heroLocationText: {
    fontSize: FONT_SIZES.tiny,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '600',
  },
  heroStatsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 14,
    paddingVertical: 14,
  },
  heroStat: {
    flex: 1,
    alignItems: 'center',
  },
  heroStatValue: {
    fontSize: FONT_SIZES.cardTitle,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  heroStatLabel: {
    fontSize: FONT_SIZES.tiny,
    color: 'rgba(255,255,255,0.55)',
    fontWeight: '600',
  },
  heroStatDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginVertical: 4,
  },

  // Section header — eyebrow + title + subtitle hierarchy
  sectionHeaderWrap: { marginBottom: 12 },
  sectionEyebrow: {
    fontSize: FONT_SIZES.tiny,
    fontWeight: '700',
    color: COLORS.primaryOrange,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.cardTitle,
    fontWeight: '700',
    color: COLORS.deepIndigo,
  },
  sectionSubtitle: {
    fontSize: FONT_SIZES.caption,
    color: COLORS.slateText,
    marginTop: 2,
  },

  // Generic card
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 16,
    marginBottom: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },

  // Readiness
  readinessBarBg: {
    height: 5,
    backgroundColor: COLORS.border,
    borderRadius: 999,
    marginTop: 16,
    marginBottom: 14,
    overflow: 'hidden',
  },
  readinessBarFill: {
    height: 5,
    backgroundColor: COLORS.successGreen,
    borderRadius: 999,
  },
  readinessList: { paddingBottom: 4 },
  readinessRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    gap: 12,
  },
  readinessIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  readinessLabel: {
    flex: 1,
    fontSize: FONT_SIZES.secondary,
    color: COLORS.deepIndigo,
    fontWeight: '500',
  },
  readinessLabelMuted: {
    color: COLORS.mutedText,
  },
  rowDivider: {
    height: 1,
    backgroundColor: COLORS.border,
  },

  // Activity stats
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    alignItems: 'center',
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  statIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  statValue: {
    fontSize: FONT_SIZES.appBar,
    fontWeight: '800',
    color: COLORS.deepIndigo,
  },
  statLabel: {
    fontSize: FONT_SIZES.tiny,
    color: COLORS.slateText,
    fontWeight: '600',
    textAlign: 'center',
  },

  // Trusted contacts
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    gap: 12,
  },
  contactAvatar: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(109,91,208,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactAvatarText: {
    fontSize: FONT_SIZES.secondary,
    fontWeight: '700',
    color: COLORS.accentViolet,
  },
  contactInfo: { flex: 1 },
  contactName: {
    fontSize: FONT_SIZES.secondary,
    fontWeight: '700',
    color: COLORS.deepIndigo,
    marginBottom: 2,
  },
  contactMeta: {
    fontSize: FONT_SIZES.caption,
    color: COLORS.slateText,
  },
  contactCallButton: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: COLORS.contactIconBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addContactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  addContactText: {
    fontSize: FONT_SIZES.secondary,
    fontWeight: '700',
    color: COLORS.primaryOrange,
  },

  // Hotline card
  hotlineCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  hotlineLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  hotlineIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.contactIconBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hotlineName: {
    fontSize: FONT_SIZES.secondary,
    fontWeight: '700',
    color: COLORS.deepIndigo,
    marginBottom: 2,
  },
  hotlineNumber: {
    fontSize: FONT_SIZES.caption,
    color: COLORS.slateText,
  },
  hotlineCallButton: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: COLORS.primaryOrange,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Preferences
  prefRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    gap: 12,
  },
  prefIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  prefText: { flex: 1 },
  prefTitle: {
    fontSize: FONT_SIZES.secondary,
    fontWeight: '700',
    color: COLORS.deepIndigo,
    marginBottom: 2,
  },
  prefSubtitle: {
    fontSize: FONT_SIZES.caption,
    color: COLORS.slateText,
    lineHeight: 15,
  },

  // Resources shortcut
  resourcesCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceMuted,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    marginBottom: 24,
    gap: 12,
  },
  resourcesLeft: { flex: 1 },
  resourcesEyebrow: {
    fontSize: FONT_SIZES.tiny,
    fontWeight: '700',
    color: COLORS.accentViolet,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 3,
  },
  resourcesTitle: {
    fontSize: FONT_SIZES.secondary,
    fontWeight: '700',
    color: COLORS.deepIndigo,
    marginBottom: 4,
  },
  resourcesSubtitle: {
    fontSize: FONT_SIZES.caption,
    color: COLORS.slateText,
    lineHeight: 16,
  },
  resourcesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  resourcesButtonText: {
    fontSize: FONT_SIZES.secondary,
    fontWeight: '700',
    color: COLORS.deepIndigo,
  },

  // Logout
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 15,
    marginBottom: 16,
  },
  logoutText: {
    fontSize: FONT_SIZES.secondary,
    fontWeight: '700',
    color: COLORS.criticalRed,
  },
  versionText: {
    textAlign: 'center',
    fontSize: FONT_SIZES.tiny,
    color: COLORS.mutedText,
    marginBottom: 8,
  },
});