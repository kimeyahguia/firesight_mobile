import { API_ENDPOINTS } from '@/constants/api';
import { COLORS, FONT_SIZES } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

// ────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────

type IoniconName = keyof typeof Ionicons.glyphMap;

interface SettingRow {
  id: string;
  icon: IoniconName;
  iconBg: string;
  iconColor: string;
  title: string;
  subtitle: string;
  type: 'nav' | 'switch';
}

interface SettingSection {
  id: string;
  title: string;
  rows: SettingRow[];
}

// ────────────────────────────────────────────────────────────
// Static config (rows without switches just navigate / alert)
// ────────────────────────────────────────────────────────────

const SECTIONS: SettingSection[] = [
  {
    id: 'account',
    title: 'Account',
    rows: [
      {
        id: 'personalInfo',
        icon: 'person-outline',
        iconBg: '#FFF1E6',
        iconColor: COLORS.primaryOrange,
        title: 'Personal Information',
        subtitle: 'Name, barangay, and profile photo',
        type: 'nav',
      },
      {
        id: 'contactNumber',
        icon: 'call-outline',
        iconBg: 'rgba(109,91,208,0.1)',
        iconColor: COLORS.accentViolet,
        title: 'Contact Number',
        subtitle: 'Update your registered phone number',
        type: 'nav',
      },
      {
        id: 'changePassword',
        icon: 'lock-closed-outline',
        iconBg: '#EEF2FF',
        iconColor: COLORS.accentViolet,
        title: 'Change Password',
        subtitle: 'Update your account password',
        type: 'nav',
      },
    ],
  },
  {
    id: 'emergency',
    title: 'Emergency Information',
    rows: [
      {
        id: 'savedContacts',
        icon: 'people-outline',
        iconBg: '#ECFDF5',
        iconColor: COLORS.successGreen,
        title: 'Saved Emergency Contacts',
        subtitle: 'Manage who gets notified during a report',
        type: 'nav',
      },
      {
        id: 'household',
        icon: 'home-outline',
        iconBg: '#FFF7ED',
        iconColor: '#C2410C',
        title: 'Household Members & Notes',
        subtitle: 'PWDs, seniors, infants, special instructions',
        type: 'nav',
      },
    ],
  },
  {
    id: 'support',
    title: 'Support',
    rows: [
      {
        id: 'helpCenter',
        icon: 'help-circle-outline',
        iconBg: COLORS.surfaceMuted,
        iconColor: COLORS.slateText,
        title: 'Help Center',
        subtitle: 'FAQs and troubleshooting',
        type: 'nav',
      },
      {
        id: 'about',
        icon: 'information-circle-outline',
        iconBg: COLORS.surfaceMuted,
        iconColor: COLORS.slateText,
        title: 'About FIRESIGHT',
        subtitle: 'Version, credits, and BFP Lian partnership',
        type: 'nav',
      },
      {
        id: 'privacy',
        icon: 'document-text-outline',
        iconBg: COLORS.surfaceMuted,
        iconColor: COLORS.slateText,
        title: 'Privacy Policy',
        subtitle: 'How your data is collected and used',
        type: 'nav',
      },
    ],
  },
];

const LANGUAGES = ['English', 'Tagalog'] as const;

// ────────────────────────────────────────────────────────────
// Sub-components
// ────────────────────────────────────────────────────────────

function SectionLabel({ title }: { title: string }) {
  return <Text style={styles.sectionLabel}>{title}</Text>;
}

function NavRow({ row, onPress }: { row: SettingRow; onPress: () => void }) {
  return (
    <TouchableOpacity activeOpacity={0.8} style={styles.row} onPress={onPress}>
      <View style={[styles.iconWrap, { backgroundColor: row.iconBg }]}>
        <Ionicons name={row.icon} size={17} color={row.iconColor} />
      </View>
      <View style={styles.rowText}>
        <Text style={styles.rowTitle}>{row.title}</Text>
        <Text style={styles.rowSubtitle}>{row.subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={COLORS.mutedText} />
    </TouchableOpacity>
  );
}

function SwitchRow({
  icon,
  iconBg,
  iconColor,
  title,
  subtitle,
  value,
  onValueChange,
}: {
  icon: IoniconName;
  iconBg: string;
  iconColor: string;
  title: string;
  subtitle: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
}) {
  return (
    <View style={styles.row}>
      <View style={[styles.iconWrap, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={17} color={iconColor} />
      </View>
      <View style={styles.rowText}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowSubtitle}>{subtitle}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: COLORS.border, true: COLORS.primaryOrange }}
        thumbColor="#FFFFFF"
      />
    </View>
  );
}

function LanguageRow({
  current,
  onPress,
}: {
  current: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity activeOpacity={0.8} style={styles.row} onPress={onPress}>
      <View style={[styles.iconWrap, { backgroundColor: 'rgba(109,91,208,0.1)' }]}>
        <Ionicons name="language-outline" size={17} color={COLORS.accentViolet} />
      </View>
      <View style={styles.rowText}>
        <Text style={styles.rowTitle}>Language</Text>
        <Text style={styles.rowSubtitle}>App display language</Text>
      </View>
      <View style={styles.languagePill}>
        <Text style={styles.languagePillText}>{current}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={COLORS.mutedText} style={{ marginLeft: 6 }} />
    </TouchableOpacity>
  );
}

function RowDivider() {
  return <View style={styles.rowDivider} />;
}

// ── Edit Personal Info modal ──
function EditPersonalInfoModal({
  visible,
  onClose,
  loading,
  submitting,
  fullName,
  barangay,
  onChangeFullName,
  onChangeBarangay,
  onSubmit,
}: {
  visible: boolean;
  onClose: () => void;
  loading: boolean;
  submitting: boolean;
  fullName: string;
  barangay: string;
  onChangeFullName: (v: string) => void;
  onChangeBarangay: (v: string) => void;
  onSubmit: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalOverlay}
      >
        <Pressable style={styles.modalBackdrop} onPress={onClose} />
        <View style={styles.modalCard}>
          <View style={styles.modalHeaderRow}>
            <Text style={styles.modalCardTitle}>Personal Information</Text>
            <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
              <Ionicons name="close" size={22} color={COLORS.mutedText} />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.modalLoadingBox}>
              <ActivityIndicator size="small" color={COLORS.primaryOrange} />
              <Text style={styles.modalLoadingText}>Loading your info…</Text>
            </View>
          ) : (
            <>
              <Text style={styles.modalLabel}>Full Name</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. Juan Dela Cruz"
                placeholderTextColor={COLORS.mutedText}
                value={fullName}
                onChangeText={onChangeFullName}
              />

              <Text style={styles.modalLabel}>Barangay</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. Bucana"
                placeholderTextColor={COLORS.mutedText}
                value={barangay}
                onChangeText={onChangeBarangay}
              />

              <TouchableOpacity
                activeOpacity={0.85}
                style={[styles.modalSubmitBtn, submitting && { opacity: 0.7 }]}
                onPress={onSubmit}
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
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── DAGDAG: Change Password modal ──
function ChangePasswordModal({
  visible,
  onClose,
  submitting,
  currentPassword,
  newPassword,
  confirmPassword,
  onChangeCurrent,
  onChangeNew,
  onChangeConfirm,
  onSubmit,
}: {
  visible: boolean;
  onClose: () => void;
  submitting: boolean;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  onChangeCurrent: (v: string) => void;
  onChangeNew: (v: string) => void;
  onChangeConfirm: (v: string) => void;
  onSubmit: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalOverlay}
      >
        <Pressable style={styles.modalBackdrop} onPress={onClose} />
        <View style={styles.modalCard}>
          <View style={styles.modalHeaderRow}>
            <Text style={styles.modalCardTitle}>Change Password</Text>
            <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
              <Ionicons name="close" size={22} color={COLORS.mutedText} />
            </TouchableOpacity>
          </View>

          <Text style={styles.modalLabel}>Current Password</Text>
          <TextInput
            style={styles.modalInput}
            placeholder="Enter current password"
            placeholderTextColor={COLORS.mutedText}
            value={currentPassword}
            onChangeText={onChangeCurrent}
            secureTextEntry
          />

          <Text style={styles.modalLabel}>New Password</Text>
          <TextInput
            style={styles.modalInput}
            placeholder="At least 8 characters"
            placeholderTextColor={COLORS.mutedText}
            value={newPassword}
            onChangeText={onChangeNew}
            secureTextEntry
          />

          <Text style={styles.modalLabel}>Confirm New Password</Text>
          <TextInput
            style={styles.modalInput}
            placeholder="Re-enter new password"
            placeholderTextColor={COLORS.mutedText}
            value={confirmPassword}
            onChangeText={onChangeConfirm}
            secureTextEntry
          />

          <TouchableOpacity
            activeOpacity={0.85}
            style={[styles.modalSubmitBtn, submitting && { opacity: 0.7 }]}
            onPress={onSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                <Text style={styles.modalSubmitBtnText}>Update Password</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── DAGDAG: Update Contact Number modal ──
function UpdateContactNumberModal({
  visible,
  onClose,
  loading,
  submitting,
  currentPhone,
  newPhone,
  password,
  onChangeNewPhone,
  onChangePassword,
  onSubmit,
}: {
  visible: boolean;
  onClose: () => void;
  loading: boolean;
  submitting: boolean;
  currentPhone: string;
  newPhone: string;
  password: string;
  onChangeNewPhone: (v: string) => void;
  onChangePassword: (v: string) => void;
  onSubmit: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalOverlay}
      >
        <Pressable style={styles.modalBackdrop} onPress={onClose} />
        <View style={styles.modalCard}>
          <View style={styles.modalHeaderRow}>
            <Text style={styles.modalCardTitle}>Contact Number</Text>
            <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
              <Ionicons name="close" size={22} color={COLORS.mutedText} />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.modalLoadingBox}>
              <ActivityIndicator size="small" color={COLORS.primaryOrange} />
              <Text style={styles.modalLoadingText}>Loading your info…</Text>
            </View>
          ) : (
            <>
              <Text style={styles.modalLabel}>Current Number</Text>
              <View style={styles.modalReadonlyBox}>
                <Text style={styles.modalReadonlyText}>{currentPhone || '—'}</Text>
              </View>

              <Text style={styles.modalLabel}>New Phone Number</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="0917 123 4567"
                placeholderTextColor={COLORS.mutedText}
                value={newPhone}
                onChangeText={onChangeNewPhone}
                keyboardType="phone-pad"
              />

              <Text style={styles.modalLabel}>Confirm with Password</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Enter your password"
                placeholderTextColor={COLORS.mutedText}
                value={password}
                onChangeText={onChangePassword}
                secureTextEntry
              />

              <TouchableOpacity
                activeOpacity={0.85}
                style={[styles.modalSubmitBtn, submitting && { opacity: 0.7 }]}
                onPress={onSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                    <Text style={styles.modalSubmitBtnText}>Save New Number</Text>
                  </>
                )}
              </TouchableOpacity>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ────────────────────────────────────────────────────────────
// Main Screen
// ────────────────────────────────────────────────────────────

export default function SettingsScreen() {
  const [darkMode, setDarkMode] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [accessibilityLargeText, setAccessibilityLargeText] = useState(false);
  const [language, setLanguage] = useState<string>(LANGUAGES[0]);

  // ── Personal Info edit modal state ──
  const [personalInfoVisible, setPersonalInfoVisible] = useState(false);
  const [personalInfoLoading, setPersonalInfoLoading] = useState(false);
  const [personalInfoSubmitting, setPersonalInfoSubmitting] = useState(false);
  const [editFullName, setEditFullName] = useState('');
  const [editBarangay, setEditBarangay] = useState('');

  // ── DAGDAG: Change Password modal state ──
  const [changePasswordVisible, setChangePasswordVisible] = useState(false);
  const [changePasswordSubmitting, setChangePasswordSubmitting] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // ── DAGDAG: Contact Number modal state ──
  const [contactNumberVisible, setContactNumberVisible] = useState(false);
  const [contactNumberLoading, setContactNumberLoading] = useState(false);
  const [contactNumberSubmitting, setContactNumberSubmitting] = useState(false);
  const [currentPhone, setCurrentPhone] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [phonePassword, setPhonePassword] = useState('');

  function handleNav(rowId: string) {
    if (rowId === 'personalInfo') {
      openPersonalInfo();
      return;
    }
    if (rowId === 'savedContacts') {
      router.push('/(tabs)/profile' as any);
      return;
    }
    if (rowId === 'changePassword') {
      openChangePassword();
      return;
    }
    if (rowId === 'contactNumber') {
      openContactNumber();
      return;
    }
    // TODO: wire these up to real screens/routes as they get built
    Alert.alert('Coming Soon', 'This settings page is not yet available.');
  }

  // ── buksan ang Personal Info modal at i-load current data ──
  async function openPersonalInfo() {
    setPersonalInfoVisible(true);
    setPersonalInfoLoading(true);
    try {
      const userId = await AsyncStorage.getItem('user_id');
      if (!userId) {
        Alert.alert('Not logged in', 'Please log in to edit your personal information.');
        setPersonalInfoVisible(false);
        return;
      }
      const response = await fetch(`${API_ENDPOINTS.profileRead}?user_id=${userId}`);
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to load your info.');
      }
      setEditFullName(result.user.full_name ?? '');
      setEditBarangay(result.user.barangay ?? '');
    } catch (err) {
      console.error('Failed to load personal info:', err);
      Alert.alert('Error', 'Could not load your personal information.');
      setPersonalInfoVisible(false);
    } finally {
      setPersonalInfoLoading(false);
    }
  }

  // ── i-save ang personal info gamit ang profileUpdate ──
  async function handleSavePersonalInfo() {
    if (!editFullName.trim() || !editBarangay.trim()) {
      Alert.alert('Missing info', 'Please fill in both fields.');
      return;
    }
    try {
      setPersonalInfoSubmitting(true);
      const userId = await AsyncStorage.getItem('user_id');
      if (!userId) return;

      const response = await fetch(API_ENDPOINTS.profileUpdate, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: Number(userId),
          full_name: editFullName.trim(),
          barangay: editBarangay.trim(),
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to save changes.');
      }

      const cachedUserData = await AsyncStorage.getItem('user_data');
      if (cachedUserData) {
        const parsed = JSON.parse(cachedUserData);
        parsed.full_name = editFullName.trim();
        parsed.barangay = editBarangay.trim();
        await AsyncStorage.setItem('user_data', JSON.stringify(parsed));
      }

      setPersonalInfoVisible(false);
      Alert.alert('Saved', 'Your personal information has been updated.');
    } catch (err) {
      console.error('Failed to save personal info:', err);
      Alert.alert('Error', 'Could not save your changes. Please try again.');
    } finally {
      setPersonalInfoSubmitting(false);
    }
  }

  // ── DAGDAG: buksan ang Change Password modal ──
  function openChangePassword() {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setChangePasswordVisible(true);
  }

  // ── DAGDAG: i-submit ang change password ──
  async function handleChangePassword() {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Missing info', 'Please fill in all fields.');
      return;
    }
    if (newPassword.length < 8) {
      Alert.alert('Weak password', 'New password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Mismatch', 'New password and confirmation do not match.');
      return;
    }
    try {
      setChangePasswordSubmitting(true);
      const userId = await AsyncStorage.getItem('user_id');
      if (!userId) return;

      const response = await fetch(API_ENDPOINTS.changePassword, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: Number(userId),
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to update password.');
      }

      setChangePasswordVisible(false);
      Alert.alert('Password Updated', 'Your password has been changed successfully.');
    } catch (err) {
      console.error('Failed to change password:', err);
      Alert.alert('Error', err instanceof Error ? err.message : 'Could not update your password.');
    } finally {
      setChangePasswordSubmitting(false);
    }
  }

  // ── DAGDAG: buksan ang Contact Number modal at i-load current phone ──
  async function openContactNumber() {
    setContactNumberVisible(true);
    setContactNumberLoading(true);
    setNewPhone('');
    setPhonePassword('');
    try {
      const userId = await AsyncStorage.getItem('user_id');
      if (!userId) {
        Alert.alert('Not logged in', 'Please log in to update your contact number.');
        setContactNumberVisible(false);
        return;
      }
      const response = await fetch(`${API_ENDPOINTS.profileRead}?user_id=${userId}`);
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to load your info.');
      }
      setCurrentPhone(result.user.phone ?? '');
    } catch (err) {
      console.error('Failed to load contact number:', err);
      Alert.alert('Error', 'Could not load your current contact number.');
      setContactNumberVisible(false);
    } finally {
      setContactNumberLoading(false);
    }
  }

  // ── DAGDAG: i-submit ang bagong contact number ──
  async function handleSaveContactNumber() {
    if (!newPhone.trim() || !phonePassword) {
      Alert.alert('Missing info', 'Please fill in both fields.');
      return;
    }
    try {
      setContactNumberSubmitting(true);
      const userId = await AsyncStorage.getItem('user_id');
      if (!userId) return;

      const response = await fetch(API_ENDPOINTS.updatePhone, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: Number(userId),
          phone: newPhone.trim(),
          current_password: phonePassword,
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to update contact number.');
      }

      const cachedUserData = await AsyncStorage.getItem('user_data');
      if (cachedUserData) {
        const parsed = JSON.parse(cachedUserData);
        parsed.phone = newPhone.trim();
        await AsyncStorage.setItem('user_data', JSON.stringify(parsed));
      }

      setContactNumberVisible(false);
      Alert.alert('Updated', 'Your contact number has been updated. Use this new number the next time you log in.');
    } catch (err) {
      console.error('Failed to update contact number:', err);
      Alert.alert('Error', err instanceof Error ? err.message : 'Could not update your contact number.');
    } finally {
      setContactNumberSubmitting(false);
    }
  }

  function handleDarkModeToggle(value: boolean) {
    setDarkMode(value);
    // TODO: hook into a real ThemeContext / app-wide dark mode provider
  }

  function handleLanguageToggle() {
    const next = language === LANGUAGES[0] ? LANGUAGES[1] : LANGUAGES[0];
    setLanguage(next);
    // TODO: hook into i18n provider
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <TouchableOpacity activeOpacity={0.7} style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={20} color={COLORS.deepIndigo} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Settings</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Account */}
        <SectionLabel title="Account" />
        <View style={styles.card}>
          {SECTIONS[0].rows.map((row, index) => (
            <View key={row.id}>
              <NavRow row={row} onPress={() => handleNav(row.id)} />
              {index < SECTIONS[0].rows.length - 1 && <RowDivider />}
            </View>
          ))}
        </View>

        {/* Preferences */}
        <SectionLabel title="Preferences" />
        <View style={styles.card}>
          <SwitchRow
            icon="moon-outline"
            iconBg="#EEF2FF"
            iconColor={COLORS.accentViolet}
            title="Dark Mode"
            subtitle="Switch to a darker color theme"
            value={darkMode}
            onValueChange={handleDarkModeToggle}
          />
          <RowDivider />
          <SwitchRow
            icon="notifications-outline"
            iconBg="rgba(109,91,208,0.1)"
            iconColor={COLORS.accentViolet}
            title="Notifications"
            subtitle="Fire alerts, drills, and updates"
            value={notifications}
            onValueChange={setNotifications}
          />
          <RowDivider />
          <LanguageRow current={language} onPress={handleLanguageToggle} />
          <RowDivider />
          <SwitchRow
            icon="text-outline"
            iconBg={COLORS.surfaceMuted}
            iconColor={COLORS.slateText}
            title="Accessibility — Larger Text"
            subtitle="Increase text size across the app"
            value={accessibilityLargeText}
            onValueChange={setAccessibilityLargeText}
          />
        </View>

        {/* Emergency Information */}
        <SectionLabel title="Emergency Information" />
        <View style={styles.card}>
          {SECTIONS[1].rows.map((row, index) => (
            <View key={row.id}>
              <NavRow row={row} onPress={() => handleNav(row.id)} />
              {index < SECTIONS[1].rows.length - 1 && <RowDivider />}
            </View>
          ))}
        </View>

        {/* Support */}
        <SectionLabel title="Support" />
        <View style={styles.card}>
          {SECTIONS[2].rows.map((row, index) => (
            <View key={row.id}>
              <NavRow row={row} onPress={() => handleNav(row.id)} />
              {index < SECTIONS[2].rows.length - 1 && <RowDivider />}
            </View>
          ))}
        </View>

        <Text style={styles.versionText}>FIRESIGHT v1.0.0 · Lian, Batangas</Text>

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* Edit Personal Info modal */}
      <EditPersonalInfoModal
        visible={personalInfoVisible}
        onClose={() => setPersonalInfoVisible(false)}
        loading={personalInfoLoading}
        submitting={personalInfoSubmitting}
        fullName={editFullName}
        barangay={editBarangay}
        onChangeFullName={setEditFullName}
        onChangeBarangay={setEditBarangay}
        onSubmit={handleSavePersonalInfo}
      />

      {/* ── DAGDAG: Change Password modal ── */}
      <ChangePasswordModal
        visible={changePasswordVisible}
        onClose={() => setChangePasswordVisible(false)}
        submitting={changePasswordSubmitting}
        currentPassword={currentPassword}
        newPassword={newPassword}
        confirmPassword={confirmPassword}
        onChangeCurrent={setCurrentPassword}
        onChangeNew={setNewPassword}
        onChangeConfirm={setConfirmPassword}
        onSubmit={handleChangePassword}
      />

      {/* ── DAGDAG: Contact Number modal ── */}
      <UpdateContactNumberModal
        visible={contactNumberVisible}
        onClose={() => setContactNumberVisible(false)}
        loading={contactNumberLoading}
        submitting={contactNumberSubmitting}
        currentPhone={currentPhone}
        newPhone={newPhone}
        password={phonePassword}
        onChangeNewPhone={setNewPhone}
        onChangePassword={setPhonePassword}
        onSubmit={handleSaveContactNumber}
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
    paddingTop: 50,
  },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 22,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: COLORS.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  headerTitle: {
    fontSize: FONT_SIZES.appBar,
    fontWeight: '800',
    color: COLORS.deepIndigo,
  },

  sectionLabel: {
    fontSize: FONT_SIZES.caption,
    fontWeight: '700',
    color: COLORS.mutedText,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 10,
    marginLeft: 4,
  },

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

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 12,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: { flex: 1 },
  rowTitle: {
    fontSize: FONT_SIZES.secondary,
    fontWeight: '700',
    color: COLORS.deepIndigo,
    marginBottom: 2,
  },
  rowSubtitle: {
    fontSize: FONT_SIZES.caption,
    color: COLORS.slateText,
    lineHeight: 15,
  },
  rowDivider: {
    height: 1,
    backgroundColor: COLORS.border,
  },

  languagePill: {
    backgroundColor: COLORS.surfaceMuted,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  languagePillText: {
    fontSize: FONT_SIZES.tiny,
    fontWeight: '700',
    color: COLORS.deepIndigo,
  },

  versionText: {
    textAlign: 'center',
    fontSize: FONT_SIZES.tiny,
    color: COLORS.mutedText,
    marginBottom: 8,
  },

  // ── Modal styles (shared by Personal Info, Change Password, Contact Number) ──
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(30,27,75,0.5)',
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
  modalCardTitle: {
    fontSize: FONT_SIZES.cardTitle,
    fontWeight: '800',
    color: COLORS.deepIndigo,
  },
  modalLoadingBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    gap: 10,
  },
  modalLoadingText: {
    fontSize: FONT_SIZES.caption,
    color: COLORS.slateText,
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
  // ── DAGDAG: read-only box para sa current phone display ──
  modalReadonlyBox: {
    backgroundColor: COLORS.surfaceMuted,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  modalReadonlyText: {
    fontSize: FONT_SIZES.secondary,
    color: COLORS.mutedText,
    fontWeight: '600',
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