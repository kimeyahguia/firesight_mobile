import React, { useCallback, useEffect, useState } from 'react';

import AppHeader from '@/components/common/AppHeader';
import { API_ENDPOINTS } from '@/constants/api';
import { COLORS, FONT_SIZES } from '@/constants/theme';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
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

function ActivityStatCard({ stat }: { stat: ActivityStat }) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIconWrap, { backgroundColor: stat.iconBg }]}>
        <Ionicons name={stat.icon} size={20} color={stat.iconColor} />
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
          <View style={styles.modalHandle} />
          <View style={styles.modalHeaderRow}>
            <Text style={styles.modalCardTitle}>Add Trusted Contact</Text>
            <TouchableOpacity onPress={handleClose} activeOpacity={0.7} style={styles.modalCloseBtn}>
              <Ionicons name="close" size={18} color={COLORS.mutedText} />
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

// Edit-profile modal — updates full_name + barangay via profile/update.php (JSON branch)
function EditProfileModal({
  visible,
  onClose,
  onSubmit,
  submitting,
  initialFullName,
  initialBarangay,
}: {
  visible: boolean;
  onClose: () => void;
  onSubmit: (fullName: string, barangay: string) => void;
  submitting: boolean;
  initialFullName: string;
  initialBarangay: string;
}) {
  const [fullName, setFullName] = useState(initialFullName);
  const [barangay, setBarangay] = useState(initialBarangay);

  // Re-sync fields kapag binuksan ulit yung modal (baka nagbago na yung data)
  useEffect(() => {
    if (visible) {
      setFullName(initialFullName);
      setBarangay(initialBarangay);
    }
  }, [visible, initialFullName, initialBarangay]);

  const handleSubmit = () => {
    if (!fullName.trim() || !barangay.trim()) {
      Alert.alert('Missing info', 'Please fill in all fields.');
      return;
    }
    onSubmit(fullName.trim(), barangay.trim());
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalOverlay}
      >
        <View style={styles.modalCard}>
          <View style={styles.modalHandle} />
          <View style={styles.modalHeaderRow}>
            <Text style={styles.modalCardTitle}>Edit Profile</Text>
            <TouchableOpacity onPress={onClose} activeOpacity={0.7} style={styles.modalCloseBtn}>
              <Ionicons name="close" size={18} color={COLORS.mutedText} />
            </TouchableOpacity>
          </View>

          <Text style={styles.modalLabel}>Full Name</Text>
          <TextInput
            style={styles.modalInput}
            placeholder="e.g. Juan Dela Cruz"
            placeholderTextColor={COLORS.mutedText}
            value={fullName}
            onChangeText={setFullName}
          />

          <Text style={styles.modalLabel}>Barangay</Text>
          <TextInput
            style={styles.modalInput}
            placeholder="e.g. Lumbangan"
            placeholderTextColor={COLORS.mutedText}
            value={barangay}
            onChangeText={setBarangay}
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
                <Text style={styles.modalSubmitBtnText}>Save Changes</Text>
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
  const [addContactVisible, setAddContactVisible] = useState(false);
  const [addingContact, setAddingContact] = useState(false);
  const [logoutVisible, setLogoutVisible] = useState(false);
  const [editVisible, setEditVisible] = useState(false);
  const [updatingProfile, setUpdatingProfile] = useState(false);

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

  // ── Fetch profile ──
  const fetchProfile = useCallback(async () => {
    if (userId === null) return;
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
  }, [userId]);

  useEffect(() => {
    if (userId !== null) {
      fetchProfile();
    }
  }, [userId, fetchProfile]);

  // ── Logout (with confirmation modal) ──
  const handleLogout = async () => {
    setLogoutVisible(false);
    await AsyncStorage.removeItem('user_id');
    await AsyncStorage.removeItem('user_data');
    router.replace('/login');
  };

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
        throw new Error(result.error ?? result.message ?? 'Upload failed');
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

  // ── Edit profile (full_name + barangay) — matches update.php's JSON branch ──
  async function handleUpdateProfile(fullName: string, barangay: string) {
    if (!userId) return;

    try {
      setUpdatingProfile(true);
      const response = await fetch(API_ENDPOINTS.profileUpdate, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, full_name: fullName, barangay: barangay }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message ?? 'Update failed');
      }

      setProfileData((prev) =>
        prev ? { ...prev, user: { ...prev.user, full_name: fullName, barangay: barangay } } : prev
      );
      setEditVisible(false);
    } catch (err) {
      console.error('Profile update failed:', err);
      Alert.alert('Update failed', 'Could not update your profile. Please try again.');
    } finally {
      setUpdatingProfile(false);
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
          subtitle="Your account, activity, and contacts"
          showBrand={true}
          showBell={false}
          showLogout={true}
          onLogoutPress={() => setLogoutVisible(true)}
          rightAction={{ icon: 'settings-outline', onPress: () => router.push('/settings') }}
        />

        {/* Profile Hero Card — premium digital ID */}
        <View style={styles.heroCard}>
          <LinearGradient
            colors={[COLORS.deepIndigo, '#1B1444', 'rgba(249,115,22,0.5)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFillObject}
          />
          <View style={styles.heroGlow} />

          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.heroEditButton}
            onPress={() => setEditVisible(true)}
          >
            <Ionicons name="create-outline" size={15} color="#FFFFFF" />
          </TouchableOpacity>

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
                <Ionicons name="camera" size={13} color="#FFFFFF" />
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
                  <Ionicons name="location-outline" size={11} color="rgba(255,255,255,0.65)" />
                  <Text style={styles.heroLocationText}>{user.barangay}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Floating stat chips */}
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

        {/* Activity Overview — backend-driven via profileRead.php stats */}
        <SectionHeader eyebrow="Overview" title="My Activity" subtitle="Your FIRESIGHT contributions" />
        <View style={styles.statsRow}>
          {ACTIVITY_STATS.map((stat) => (
            <ActivityStatCard key={stat.id} stat={stat} />
          ))}
        </View>

        {/* View My Reports — routes to the dedicated reports/status screen */}
        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.viewReportsCard}
          onPress={() => router.push('/my-reports')}
        >
          <View style={styles.viewReportsIconWrap}>
            <MaterialCommunityIcons name="fire-alert" size={22} color={COLORS.primaryOrange} />
          </View>
          <View style={styles.viewReportsLeft}>
            <Text style={styles.viewReportsTitle}>My Reports</Text>
            <Text style={styles.viewReportsSubtitle}>
              Track the status of your {stats.reports} submitted {stats.reports === 1 ? 'report' : 'reports'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={COLORS.mutedText} />
        </TouchableOpacity>

        {/* BFP Station Contact — Apple Maps contact-card style */}
        <View style={styles.hotlineCard}>
          <View style={styles.hotlineLeft}>
            <View style={styles.hotlineIconWrap}>
              <MaterialCommunityIcons name="fire-truck" size={24} color={COLORS.primaryOrange} />
            </View>
            <View>
              <View style={styles.hotlineNameRow}>
                <Text style={styles.hotlineName}>BFP Lian Fire Station</Text>
                <View style={styles.hotlineBadge}>
                  <Text style={styles.hotlineBadgeText}>Official</Text>
                </View>
              </View>
              <Text style={styles.hotlineNumber}>(043) 740 1234</Text>
            </View>
          </View>
          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.hotlineCallButton}
            onPress={() => Linking.openURL('tel:(043)7401234')}
          >
            <Ionicons name="call" size={17} color="#FFFFFF" />
          </TouchableOpacity>
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
            <View style={styles.addContactIconWrap}>
              <Ionicons name="add" size={16} color={COLORS.primaryOrange} />
            </View>
            <Text style={styles.addContactText}>Add Emergency Contact</Text>
          </TouchableOpacity>
        </View>

        {/* Safety Resources Shortcut — Apple Fitness recommendation style */}
        <View style={styles.resourcesCard}>
          <View style={styles.resourcesIllustrationWrap}>
            <Ionicons name="book" size={22} color={COLORS.accentViolet} />
          </View>
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
            <Text style={styles.resourcesButtonText}>Open</Text>
            <Ionicons name="arrow-forward" size={14} color={COLORS.deepIndigo} />
          </TouchableOpacity>
        </View>

        {/* Logout */}
        <TouchableOpacity
          activeOpacity={0.8}
          style={styles.logoutButton}
          onPress={() => setLogoutVisible(true)}
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

      <EditProfileModal
        visible={editVisible}
        onClose={() => setEditVisible(false)}
        onSubmit={handleUpdateProfile}
        submitting={updatingProfile}
        initialFullName={user.full_name}
        initialBarangay={user.barangay}
      />

      {/* Logout Confirmation Modal — premium centered iOS-style dialog */}
      <Modal visible={logoutVisible} transparent animationType="fade" onRequestClose={() => setLogoutVisible(false)}>
        <View style={[styles.modalCenterOverlay, { justifyContent: 'center', paddingHorizontal: 32 }]}>
          <Pressable style={styles.modalCenterBackdrop} onPress={() => setLogoutVisible(false)} />
          <View style={styles.centerCard}>
            <View style={styles.centerModalIconWrap}>
              <Ionicons name="log-out-outline" size={28} color={COLORS.primaryOrange} />
            </View>
            <Text style={styles.centerModalTitle}>Log Out</Text>
            <Text style={styles.centerModalMessage}>Are you sure you want to log out?</Text>
            <View style={styles.centerModalActions}>
              <TouchableOpacity activeOpacity={0.8} style={styles.cancelBtn} onPress={() => setLogoutVisible(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity activeOpacity={0.85} style={styles.dangerBtn} onPress={handleLogout}>
                <Text style={styles.dangerBtnText}>Log Out</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ────────────────────────────────────────────────────────────
// Styles — Apple-inspired: soft elevation, generous spacing
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
    gap: 14,
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
    borderRadius: 16,
    paddingHorizontal: 22,
    paddingVertical: 12,
    shadowColor: COLORS.primaryOrange,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 3,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: FONT_SIZES.secondary,
  },
  emptyContactsText: {
    fontSize: FONT_SIZES.caption,
    color: COLORS.mutedText,
    paddingVertical: 18,
    textAlign: 'center',
  },

  // Hero Card — premium digital ID
  heroCard: {
    borderRadius: 30,
    padding: 24,
    marginTop: 20,
    marginBottom: 30,
    overflow: 'hidden',
    shadowColor: COLORS.deepIndigo,
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.28,
    shadowRadius: 26,
    elevation: 8,
  },
  heroGlow: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(249,115,22,0.22)',
    top: -70,
    right: -50,
  },
  heroEditButton: {
    position: 'absolute',
    top: 18,
    right: 18,
    width: 30,
    height: 30,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.22)',
    zIndex: 3,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
    marginBottom: 24,
  },

  // Avatar
  avatarContainer: {
    position: 'relative',
    width: 72,
    height: 72,
  },
  avatarTouchable: {
    width: 72,
    height: 72,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarFallback: {
    width: '100%',
    height: '100%',
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
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraButton: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: COLORS.accentViolet,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: COLORS.deepIndigo,
  },

  heroMeta: { flex: 1, paddingTop: 4 },
  heroName: {
    fontSize: 19,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
    letterSpacing: -0.4,
  },
  heroSub: {
    fontSize: FONT_SIZES.caption,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 10,
  },
  heroBadgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.22)',
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
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  heroLocationText: {
    fontSize: FONT_SIZES.tiny,
    color: 'rgba(255,255,255,0.65)',
    fontWeight: '600',
  },
  heroStatsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 18,
    paddingVertical: 16,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  heroStat: {
    flex: 1,
    alignItems: 'center',
  },
  heroStatValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 3,
    letterSpacing: -0.3,
  },
  heroStatLabel: {
    fontSize: FONT_SIZES.tiny,
    color: 'rgba(255,255,255,0.55)',
    fontWeight: '600',
  },
  heroStatDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.12)',
    marginVertical: 4,
  },

  // Section header
  sectionHeaderWrap: { marginBottom: 14 },
  sectionEyebrow: {
    fontSize: FONT_SIZES.tiny,
    fontWeight: '800',
    color: COLORS.primaryOrange,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 5,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: COLORS.deepIndigo,
    letterSpacing: -0.4,
  },
  sectionSubtitle: {
    fontSize: FONT_SIZES.caption,
    color: COLORS.slateText,
    marginTop: 3,
  },

  // Generic card
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 24,
    paddingHorizontal: 18,
    marginBottom: 28,
    overflow: 'hidden',
    shadowColor: '#0F1235',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 14,
    elevation: 2,
  },

  rowDivider: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },

  // Activity stats
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    gap: 7,
    shadowColor: '#0F1235',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  statIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 3,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.deepIndigo,
    letterSpacing: -0.3,
  },
  statLabel: {
    fontSize: FONT_SIZES.tiny,
    color: COLORS.slateText,
    fontWeight: '600',
    textAlign: 'center',
  },

  // View My Reports card
  viewReportsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 22,
    padding: 16,
    marginBottom: 28,
    gap: 14,
    shadowColor: '#0F1235',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 14,
    elevation: 2,
  },
  viewReportsIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: '#FFF1E6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewReportsLeft: { flex: 1 },
  viewReportsTitle: {
    fontSize: FONT_SIZES.secondary,
    fontWeight: '700',
    color: COLORS.deepIndigo,
    marginBottom: 3,
  },
  viewReportsSubtitle: {
    fontSize: FONT_SIZES.caption,
    color: COLORS.slateText,
    lineHeight: 17,
  },

  // Trusted contacts
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    gap: 12,
  },
  contactAvatar: {
    width: 44,
    height: 44,
    borderRadius: 16,
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
    width: 36,
    height: 36,
    borderRadius: 13,
    backgroundColor: COLORS.contactIconBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactDeleteButton: {
    width: 36,
    height: 36,
    borderRadius: 13,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addContactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 16,
  },
  addContactIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFF3EA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addContactText: {
    fontSize: FONT_SIZES.secondary,
    fontWeight: '700',
    color: COLORS.primaryOrange,
  },

  // Hotline card — Apple Maps contact style
  hotlineCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.card,
    borderRadius: 22,
    padding: 16,
    marginBottom: 28,
    shadowColor: '#0F1235',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 14,
    elevation: 2,
  },
  hotlineLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  hotlineIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: COLORS.contactIconBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hotlineNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 3,
  },
  hotlineName: {
    fontSize: FONT_SIZES.secondary,
    fontWeight: '700',
    color: COLORS.deepIndigo,
  },
  hotlineBadge: {
    backgroundColor: '#F0EBFE',
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  hotlineBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: COLORS.accentViolet,
    letterSpacing: 0.3,
  },
  hotlineNumber: {
    fontSize: FONT_SIZES.caption,
    color: COLORS.slateText,
  },
  hotlineCallButton: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: COLORS.primaryOrange,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.primaryOrange,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },

  // Resources shortcut — Apple Fitness recommendation card
  resourcesCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F0FC',
    borderRadius: 22,
    padding: 18,
    marginBottom: 28,
    gap: 14,
  },
  resourcesIllustrationWrap: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: 'rgba(109,91,208,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resourcesLeft: { flex: 1 },
  resourcesEyebrow: {
    fontSize: FONT_SIZES.tiny,
    fontWeight: '800',
    color: COLORS.accentViolet,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  resourcesTitle: {
    fontSize: FONT_SIZES.secondary,
    fontWeight: '700',
    color: COLORS.deepIndigo,
    marginBottom: 5,
  },
  resourcesSubtitle: {
    fontSize: FONT_SIZES.caption,
    color: COLORS.slateText,
    lineHeight: 17,
  },
  resourcesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.card,
    borderRadius: 14,
    paddingHorizontal: 15,
    paddingVertical: 11,
    shadowColor: '#0F1235',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  resourcesButtonText: {
    fontSize: FONT_SIZES.secondary,
    fontWeight: '700',
    color: COLORS.deepIndigo,
  },

  // Logout button (in-page) — destructive, minimal
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    backgroundColor: COLORS.card,
    borderRadius: 20,
    paddingVertical: 16,
    marginBottom: 18,
    shadowColor: '#0F1235',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 1,
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

  // Add Contact / Edit Profile Modal — Apple-style sheet
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,18,53,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 22,
    paddingBottom: 34,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.12)',
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  modalCardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.deepIndigo,
    letterSpacing: -0.3,
  },
  modalCloseBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalLabel: {
    fontSize: FONT_SIZES.tiny,
    fontWeight: '800',
    color: COLORS.slateText,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 8,
    marginTop: 14,
  },
  modalInput: {
    backgroundColor: COLORS.surfaceMuted,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: FONT_SIZES.secondary,
    color: COLORS.deepIndigo,
  },
  modalSubmitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primaryOrange,
    borderRadius: 16,
    paddingVertical: 16,
    marginTop: 24,
    shadowColor: COLORS.primaryOrange,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 12,
    elevation: 4,
  },
  modalSubmitBtnText: {
    fontSize: FONT_SIZES.secondary,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Logout Confirmation Modal — premium centered iOS-style dialog
  modalCenterOverlay: { flex: 1 },
  modalCenterBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15,18,53,0.55)' },
  centerCard: {
    backgroundColor: COLORS.card,
    borderRadius: 28,
    padding: 26,
    alignItems: 'center',
    width: '100%',
    shadowColor: '#0F1235',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.2,
    shadowRadius: 30,
    elevation: 10,
  },
  centerModalIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: '#FFF3EA',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  centerModalTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: COLORS.deepIndigo,
    marginBottom: 7,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  centerModalMessage: {
    fontSize: FONT_SIZES.secondary,
    color: COLORS.slateText,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 19,
  },
  centerModalActions: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    backgroundColor: COLORS.surfaceMuted,
  },
  cancelBtnText: {
    fontSize: FONT_SIZES.secondary,
    fontWeight: '700',
    color: COLORS.deepIndigo,
  },
  dangerBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    backgroundColor: COLORS.criticalRed,
    shadowColor: COLORS.criticalRed,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 3,
  },
  dangerBtnText: {
    fontSize: FONT_SIZES.secondary,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});