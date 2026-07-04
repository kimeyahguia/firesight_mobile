import React, { useCallback, useEffect, useState } from 'react';

import AppHeader from '@/components/common/AppHeader';
import { API_ENDPOINTS } from '@/constants/api';
import { COLORS, FONT_SIZES } from '@/constants/theme';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

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

function ReadinessRow({ item, onToggle, toggling }: { item: ReadinessItem; onToggle: () => void; toggling: boolean }) {
  const isDone = item.done === 1;
  return (
    <TouchableOpacity activeOpacity={0.7} style={styles.readinessRow} onPress={onToggle} disabled={toggling}>
      <View style={[styles.readinessIconWrap, { backgroundColor: isDone ? '#ECFDF5' : COLORS.surfaceMuted }]}>
        <Ionicons name={item.icon} size={15} color={isDone ? COLORS.successGreen : COLORS.mutedText} />
      </View>
      <Text style={[styles.readinessLabel, !isDone && styles.readinessLabelMuted]}>
        {item.label}
      </Text>
      {toggling ? (
        <ActivityIndicator size="small" color={COLORS.mutedText} />
      ) : (
        <Ionicons
          name={isDone ? 'checkmark-circle' : 'ellipse-outline'}
          size={18}
          color={isDone ? COLORS.successGreen : COLORS.mutedText}
        />
      )}
    </TouchableOpacity>
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

function TrustedContactRow({ contact, onDelete }: { contact: TrustedContact; onDelete: () => void }) {
  const handleCall = () => {
    const cleaned = contact.phone.replace(/[^0-9+]/g, '');
    if (!cleaned) return;
    Linking.openURL(`tel:${cleaned}`).catch(() =>
      Alert.alert('Error', 'Unable to open the dialer on this device.')
    );
  };

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
      <TouchableOpacity activeOpacity={0.7} style={styles.contactCallButton} onPress={handleCall}>
        <Ionicons name="call-outline" size={16} color={COLORS.primaryOrange} />
      </TouchableOpacity>
      <TouchableOpacity activeOpacity={0.7} style={styles.contactDeleteButton} onPress={onDelete}>
        <Ionicons name="trash-outline" size={16} color={COLORS.criticalRed} />
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

// Add-contact modal
function AddContactModal({
  visible,
  onClose,
  onSubmit,
  submitting,
}: {
  visible: boolean;
  onClose: () => void;
  onSubmit: (name: string, relation: string, phone: string) => void;
  submitting: boolean;
}) {
  const [name, setName] = useState('');
  const [relation, setRelation] = useState('');
  const [phone, setPhone] = useState('');

  const handleSubmit = () => {
    if (!name.trim() || !relation.trim() || !phone.trim()) {
      Alert.alert('Missing info', 'Please fill in all fields.');
      return;
    }
    onSubmit(name.trim(), relation.trim(), phone.trim());
  };

  const handleClose = () => {
    setName('');
    setRelation('');
    setPhone('');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalOverlay}
      >
        <View style={styles.modalCard}>
          <View style={styles.modalHeaderRow}>
            <Text style={styles.modalTitle}>Add Trusted Contact</Text>
            <TouchableOpacity onPress={handleClose} activeOpacity={0.7}>
              <Ionicons name="close" size={22} color={COLORS.mutedText} />
            </TouchableOpacity>
          </View>

          <Text style={styles.modalLabel}>Full Name</Text>
          <TextInput
            style={styles.modalInput}
            placeholder="e.g. Juan Dela Cruz"
            placeholderTextColor={COLORS.mutedText}
            value={name}
            onChangeText={setName}
          />

          <Text style={styles.modalLabel}>Relation</Text>
          <TextInput
            style={styles.modalInput}
            placeholder="e.g. Father, Neighbor, Barangay Captain"
            placeholderTextColor={COLORS.mutedText}
            value={relation}
            onChangeText={setRelation}
          />

          <Text style={styles.modalLabel}>Phone Number</Text>
          <TextInput
            style={styles.modalInput}
            placeholder="e.g. 09171234567"
            placeholderTextColor={COLORS.mutedText}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />

          <TouchableOpacity
            activeOpacity={0.85}
            style={[styles.modalSubmitBtn, submitting && { opacity: 0.7 }]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                <Text style={styles.modalSubmitBtnText}>Save Contact</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ────────────────────────────────────────────────────────────
// Main Screen
// ────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<number | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [togglingItemId, setTogglingItemId] = useState<string | null>(null);
  const [addContactVisible, setAddContactVisible] = useState(false);
  const [addingContact, setAddingContact] = useState(false);

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

const fetchProfile = useCallback(async () => {
  if (userId === null) return;
  try {
    setLoading(true);
    setError(null);
    const response = await fetch(`${API_ENDPOINTS.profileRead}?user_id=${userId}`);
    const text = await response.text();
    console.log('Status:', response.status);
    console.log('Response body:', text);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`${API_ENDPOINTS.profileRead}?user_id=${userId}`);
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Server error');
      }

      setProfileData(data);
    } catch (err) {
      console.error('Failed to fetch profile:', err);
      setError(err instanceof Error ? err.message : 'Failed to load profile. Check your connection.');
    } finally {
      setLoading(false);
    }

    const data: ProfileData = JSON.parse(text);
    setProfileData(data);
  } catch (err) {
    console.error('Failed to fetch profile:', err);
    setError('Failed to load profile. Check your connection.');
  } finally {
    setLoading(false);
  }
}, [userId]);

  // ── Avatar picker + real upload ──
  async function handlePickImage() {
    if (!userId) return;

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Allow photo library access to change your profile picture.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled || result.assets.length === 0) return;

    const asset = result.assets[0];

    // Optimistic local preview while uploading
    setProfileData((prev) =>
      prev ? { ...prev, user: { ...prev.user, avatar_url: asset.uri } } : prev
    );

    try {
      setUploadingAvatar(true);

      const filename = asset.uri.split('/').pop() ?? `avatar_${Date.now()}.jpg`;
      const match = /\.(\w+)$/.exec(filename);
      const ext = match ? match[1] : 'jpg';

      const formData = new FormData();
      formData.append('user_id', String(userId));
      formData.append('avatar', {
        uri: asset.uri,
        name: filename,
        type: `image/${ext === 'jpg' ? 'jpeg' : ext}`,
      } as any);

      const response = await fetch(API_ENDPOINTS.profileUpdate, {
        method: 'POST',
        headers: { 'Content-Type': 'multipart/form-data' },
        body: formData,
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error ?? 'Upload failed');
      }

      // Replace optimistic local uri with the real server URL
      setProfileData((prev) =>
        prev ? { ...prev, user: { ...prev.user, avatar_url: result.avatar_url } } : prev
      );
    } catch (err) {
      console.error('Avatar upload failed:', err);
      Alert.alert('Upload failed', 'Could not update your profile photo. Please try again.');
      // Revert optimistic preview on failure
      fetchProfile();
    } finally {
      setUploadingAvatar(false);
    }
  }

  // ── Readiness toggle ──
  async function handleToggleReadiness(item: ReadinessItem) {
    if (!userId || togglingItemId) return;

    setTogglingItemId(item.id);

    // Optimistic update
    setProfileData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        readiness: prev.readiness.map((r) =>
          r.id === item.id ? { ...r, done: r.done === 1 ? 0 : 1 } : r
        ),
      };
    });

    try {
      const response = await fetch(API_ENDPOINTS.readinessToggle, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          readiness_item_id: Number(item.id),
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error('Toggle failed');

      // Sync with actual server value (in case of race conditions)
      setProfileData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          readiness: prev.readiness.map((r) =>
            r.id === item.id ? { ...r, done: result.done } : r
          ),
        };
      });
    } catch (err) {
      console.error('Readiness toggle failed:', err);
      Alert.alert('Error', 'Could not update this item. Please try again.');
      // Revert on failure
      fetchProfile();
    } finally {
      setTogglingItemId(null);
    }
  }

  // ── Add trusted contact ──
  async function handleAddContact(name: string, relation: string, phone: string) {
    if (!userId) return;

    try {
      setAddingContact(true);
      const response = await fetch(API_ENDPOINTS.contactAdd, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, name, relation, phone }),
      });
      const result = await response.json();

      if (!response.ok || !result.success) throw new Error(result.error ?? 'Failed to add contact');

      setProfileData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          contacts: [...prev.contacts, { id: String(result.id), name, relation, phone }],
        };
      });

      setAddContactVisible(false);
    } catch (err) {
      console.error('Add contact failed:', err);
      Alert.alert('Error', 'Could not add this contact. Please try again.');
    } finally {
      setAddingContact(false);
    }
  }

  // ── Delete trusted contact ──
  async function handleDeleteContact(contactId: string) {
    if (!userId) return;

    Alert.alert('Remove Contact', 'Are you sure you want to remove this contact?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          const previousContacts = profileData?.contacts ?? [];

          // Optimistic removal
          setProfileData((prev) =>
            prev ? { ...prev, contacts: prev.contacts.filter((c) => c.id !== contactId) } : prev
          );

          try {
            const response = await fetch(API_ENDPOINTS.contactDelete, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ user_id: userId, contact_id: Number(contactId) }),
            });
            const result = await response.json();
            if (!response.ok || !result.success) throw new Error('Delete failed');
          } catch (err) {
            console.error('Delete contact failed:', err);
            Alert.alert('Error', 'Could not remove this contact.');
            // Revert on failure
            setProfileData((prev) => (prev ? { ...prev, contacts: previousContacts } : prev));
          }
        },
      },
    ]);
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
                disabled={uploadingAvatar}
              >
                {user.avatar_url ? (
                  <Image source={{ uri: user.avatar_url }} style={styles.avatarImage} />
                ) : (
                  <View style={styles.avatarFallback}>
                    <Text style={styles.avatarText}>{initials}</Text>
                  </View>
                )}
                {uploadingAvatar && (
                  <View style={styles.avatarUploadingOverlay}>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  </View>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={handlePickImage}
                style={styles.cameraButton}
                disabled={uploadingAvatar}
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
                <ReadinessRow
                  item={item}
                  onToggle={() => handleToggleReadiness(item)}
                  toggling={togglingItemId === item.id}
                />
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
                <TrustedContactRow contact={contact} onDelete={() => handleDeleteContact(contact.id)} />
                {index < contacts.length - 1 && <View style={styles.rowDivider} />}
              </View>
            ))
          )}
          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.addContactButton}
            onPress={() => setAddContactVisible(true)}
          >
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
          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.hotlineCallButton}
            onPress={() => Linking.openURL('tel:(043)7401234')}
          >
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
          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.resourcesButton}
            onPress={() => router.push('/(tabs)/awareness' as any)}
          >
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

      <AddContactModal
        visible={addContactVisible}
        onClose={() => setAddContactVisible(false)}
        onSubmit={handleAddContact}
        submitting={addingContact}
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
  avatarUploadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
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
    gap: 10,
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
  contactDeleteButton: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#FEF2F2',
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

  // Add Contact Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(30,27,75,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 22,
    paddingBottom: 32,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  modalTitle: {
    fontSize: FONT_SIZES.cardTitle,
    fontWeight: '800',
    color: COLORS.deepIndigo,
  },
  modalLabel: {
    fontSize: FONT_SIZES.caption,
    fontWeight: '700',
    color: COLORS.slateText,
    marginBottom: 6,
    marginTop: 12,
  },
  modalInput: {
    backgroundColor: COLORS.surfaceMuted,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: FONT_SIZES.secondary,
    color: COLORS.deepIndigo,
  },
  modalSubmitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primaryOrange,
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 22,
  },
  modalSubmitBtnText: {
    fontSize: FONT_SIZES.secondary,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});