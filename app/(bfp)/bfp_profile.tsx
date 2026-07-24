import { API_ENDPOINTS } from '@/constants/api';
import { COLORS, FONT_SIZES } from '@/constants/theme';
import apiClient from '@/services/apiClient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
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

interface PersonnelProfile {
  id: string;
  fullName: string;
  rankTitle: string;
  email: string;
  phone: string;
  avatarUrl: string | null;
  position: string;
  badgeNumber: string;
  isVerified: boolean;
  memberSince: string;
}

interface DutySchedule {
  duty_date: string;
  shift: string;
  start_time: string;
  end_time: string;
  station: string;
  remarks: string | null;
  status: string;
}

interface EditFormState {
  fullName: string;
  rankTitle: string;
  email: string;
  phone: string;
  position: string;
}

interface PasswordFormState {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface NotifPrefs {
  emergency: boolean;
  assigned: boolean;
  dispatch: boolean;
  status: boolean;
}

interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

interface HelpSupportData {
  contactPerson: string | null;
  supportEmail: string | null;
  hotline: string | null;
  announcement: string | null;
  faqs: FaqItem[];
}

interface AboutData {
  appName: string | null;
  description: string | null;
  systemOverview: string | null;
  developerInfo: string | null;
  versionLabel: string | null;
  versionDescription: string | null;
  additionalInfo: string | null;
}

const NOTIF_PREFS_KEY = 'bfp_notif_prefs';
const DEFAULT_NOTIF_PREFS: NotifPrefs = {
  emergency: true,
  assigned: true,
  dispatch: true,
  status: true,
};

// TODO: palitan kapag may column na para sa station/duty status/per-personnel stats
const STATIC_STATION = 'BFP Lian Fire Station';
const STATIC_DUTY_STATUS: 'On Duty' | 'Off Duty' = 'On Duty';

type MenuItem = {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconBg: string;
  iconColor: string;
  danger?: boolean;
};

const PREFERENCES_ITEMS: MenuItem[] = [
  { id: 'password', label: 'Change Password', icon: 'lock-closed-outline', iconBg: '#FFF1E6', iconColor: COLORS.primaryOrange },
  { id: 'notifications', label: 'Notification Preferences', icon: 'notifications-outline', iconBg: '#ECFDF5', iconColor: COLORS.successGreen },
  { id: 'schedule', label: 'Duty Schedule', icon: 'calendar-outline', iconBg: '#EEF2FF', iconColor: COLORS.accentViolet },
];

const SUPPORT_ITEMS: MenuItem[] = [
  { id: 'help', label: 'Help & Support', icon: 'help-circle-outline', iconBg: COLORS.surfaceMuted, iconColor: COLORS.slateText },
  { id: 'about', label: 'About FireSight', icon: 'information-circle-outline', iconBg: COLORS.surfaceMuted, iconColor: COLORS.slateText },
];

const DANGER_ITEMS: MenuItem[] = [
  { id: 'logout', label: 'Log Out', icon: 'log-out-outline', iconBg: '#FEF2F2', iconColor: COLORS.criticalRed, danger: true },
];

function MenuRow({ item, onPress }: { item: MenuItem; onPress: (item: MenuItem) => void }) {
  return (
    <TouchableOpacity activeOpacity={0.75} style={styles.menuRow} onPress={() => onPress(item)}>
      <View style={[styles.menuIconWrap, { backgroundColor: item.iconBg }]}>
        <Ionicons name={item.icon} size={18} color={item.iconColor} />
      </View>
      <Text style={[styles.menuLabel, item.danger && { color: COLORS.criticalRed }]}>
        {item.label}
      </Text>
      {!item.danger && (
        <Ionicons name="chevron-forward" size={16} color={COLORS.mutedText} />
      )}
    </TouchableOpacity>
  );
}

function MenuGroup({
  title,
  items,
  onPress,
}: {
  title?: string;
  items: MenuItem[];
  onPress: (item: MenuItem) => void;
}) {
  return (
    <View style={styles.menuGroupWrap}>
      {title && <Text style={styles.menuGroupTitle}>{title}</Text>}
      <View style={styles.menuGroupCard}>
        {items.map((item, index) => (
          <View key={item.id}>
            <MenuRow item={item} onPress={onPress} />
            {index < items.length - 1 && <View style={styles.divider} />}
          </View>
        ))}
      </View>
    </View>
  );
}

// ────────────────────────────────────────────────────────────
// Edit Profile Modal
// ────────────────────────────────────────────────────────────

function AccountEditModal({
  visible,
  initial,
  onClose,
  onSaved,
}: {
  visible: boolean;
  initial: PersonnelProfile | null;
  onClose: () => void;
  onSaved: (updated: PersonnelProfile) => void;
}) {
  const [form, setForm] = useState<EditFormState>({
    fullName: '',
    rankTitle: '',
    email: '',
    phone: '',
    position: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (initial) {
      setForm({
        fullName: initial.fullName ?? '',
        rankTitle: initial.rankTitle ?? '',
        email: initial.email ?? '',
        phone: initial.phone ?? '',
        position: initial.position ?? '',
      });
    }
  }, [initial, visible]);

  function updateField(key: keyof EditFormState, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    if (!initial) return;

    if (!form.fullName.trim()) {
      Alert.alert('Missing Info', 'Kailangan ang full name.');
      return;
    }
    if (form.email.trim() && !/^\S+@\S+\.\S+$/.test(form.email.trim())) {
      Alert.alert('Invalid Email', 'Suriin ang format ng email.');
      return;
    }

    setSaving(true);
    try {
      const { data } = await apiClient.post(API_ENDPOINTS.bfpProfileUpdate, {
        personnel_id: initial.id,
        full_name: form.fullName.trim(),
        rank_title: form.rankTitle.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        position: form.position.trim(),
      });

      if (!data.success) throw new Error(data.message || 'Update failed');

      onSaved(data.data as PersonnelProfile);
      onClose();
    } catch (err: any) {
      console.error('Failed to update profile:', err);
      Alert.alert('Hindi Na-save', err?.message ?? 'May naganap na error. Subukan ulit.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.editOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={styles.modalBackdrop} onPress={onClose} />
        <View style={styles.editSheet}>
          <View style={styles.editHandle} />
          <View style={styles.editHeaderRow}>
            <Text style={styles.editTitle}>Account & Profile</Text>
            <TouchableOpacity activeOpacity={0.7} style={styles.editCloseBtn} onPress={onClose}>
              <Ionicons name="close" size={18} color={COLORS.slateText} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {initial && (
              <View style={styles.previewRow}>
                <View style={styles.previewAvatar}>
                  <Text style={styles.previewAvatarText}>
                    {initial.fullName
                      ? initial.fullName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
                      : '—'}
                  </Text>
                </View>
                <View style={styles.previewMeta}>
                  <Text style={styles.previewName}>{initial.fullName || 'No name yet'}</Text>
                  <Text style={styles.previewSub}>{initial.rankTitle || initial.position || 'Fire Officer'}</Text>
                  <View style={styles.previewContactRow}>
                    <Ionicons name="mail-outline" size={12} color={COLORS.mutedText} />
                    <Text style={styles.previewContactText}>{initial.email || 'No email yet'}</Text>
                  </View>
                  <View style={styles.previewContactRow}>
                    <Ionicons name="call-outline" size={12} color={COLORS.mutedText} />
                    <Text style={styles.previewContactText}>{initial.phone || 'No phone yet'}</Text>
                  </View>
                </View>
              </View>
            )}

            <Text style={styles.modalSectionTitle}>Account Information</Text>
            <View style={styles.modalInfoCard}>
              <View style={styles.infoCardRow}>
                <Ionicons name="shield-checkmark-outline" size={16} color={COLORS.mutedText} />
                <Text style={styles.infoCardLabel}>Badge ID</Text>
                <Text style={styles.infoCardValue}>{initial?.badgeNumber || '—'}</Text>
              </View>
              <View style={styles.infoCardDivider} />
              <View style={styles.infoCardRow}>
                <Ionicons name="calendar-outline" size={16} color={COLORS.mutedText} />
                <Text style={styles.infoCardLabel}>Since</Text>
                <Text style={styles.infoCardValue}>{initial?.memberSince || '—'}</Text>
              </View>
              <View style={styles.infoCardDivider} />
              <View style={styles.infoCardRow}>
                <Ionicons
                  name={initial?.isVerified ? 'checkmark-done-circle-outline' : 'time-outline'}
                  size={16}
                  color={initial?.isVerified ? COLORS.successGreen : COLORS.mutedText}
                />
                <Text style={styles.infoCardLabel}>Status</Text>
                <Text style={[styles.infoCardValue, initial?.isVerified && { color: COLORS.successGreen }]}>
                  {initial?.isVerified ? 'Verified' : 'Pending'}
                </Text>
              </View>
            </View>

            <Text style={styles.modalSectionTitle}>Editable Fields</Text>
            <Text style={styles.fieldLabel}>Full Name</Text>
            <TextInput
              style={styles.fieldInput}
              value={form.fullName}
              onChangeText={(v) => updateField('fullName', v)}
              placeholder="Full name"
              placeholderTextColor={COLORS.mutedText}
            />

            <Text style={styles.fieldLabel}>Rank / Title</Text>
            <TextInput
              style={styles.fieldInput}
              value={form.rankTitle}
              onChangeText={(v) => updateField('rankTitle', v)}
              placeholder="e.g. Fire Officer II"
              placeholderTextColor={COLORS.mutedText}
            />

            <Text style={styles.fieldLabel}>Position</Text>
            <TextInput
              style={styles.fieldInput}
              value={form.position}
              onChangeText={(v) => updateField('position', v)}
              placeholder="Position"
              placeholderTextColor={COLORS.mutedText}
            />

            <Text style={styles.fieldLabel}>Email</Text>
            <TextInput
              style={styles.fieldInput}
              value={form.email}
              onChangeText={(v) => updateField('email', v)}
              placeholder="Email address"
              placeholderTextColor={COLORS.mutedText}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Text style={styles.fieldLabel}>Phone</Text>
            <TextInput
              style={styles.fieldInput}
              value={form.phone}
              onChangeText={(v) => updateField('phone', v)}
              placeholder="Phone number"
              placeholderTextColor={COLORS.mutedText}
              keyboardType="phone-pad"
            />

            <TouchableOpacity
              activeOpacity={0.85}
              style={[styles.saveBtn, saving && { opacity: 0.7 }]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                  <Text style={styles.saveBtnText}>Save Changes</Text>
                </>
              )}
            </TouchableOpacity>

            <View style={{ height: 24 }} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ────────────────────────────────────────────────────────────
// Change Password Modal
// ────────────────────────────────────────────────────────────

function ChangePasswordModal({
  visible,
  personnelId,
  onClose,
}: {
  visible: boolean;
  personnelId: string | null;
  onClose: () => void;
}) {
  const [form, setForm] = useState<PasswordFormState>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [saving, setSaving] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  useEffect(() => {
    if (visible) {
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    }
  }, [visible]);

  function updateField(key: keyof PasswordFormState, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    if (!personnelId) return;

    if (!form.currentPassword || !form.newPassword || !form.confirmPassword) {
      Alert.alert('Missing Info', 'Punan lahat ng fields.');
      return;
    }
    if (form.newPassword.length < 8) {
      Alert.alert('Mahinang Password', 'Kailangan ng hindi bababa sa 8 characters ang bagong password.');
      return;
    }
    if (form.newPassword !== form.confirmPassword) {
      Alert.alert('Hindi Tugma', 'Hindi magkatugma ang bagong password at confirmation.');
      return;
    }

    setSaving(true);
    try {
      const { data } = await apiClient.post(API_ENDPOINTS.bfpProfileChangePassword, {
        personnel_id: personnelId,
        current_password: form.currentPassword,
        new_password: form.newPassword,
      });

      if (!data.success) throw new Error(data.message || 'Failed to change password');

      Alert.alert('Tapos Na', 'Na-update na ang password mo.');
      onClose();
    } catch (err: any) {
      console.error('Failed to change password:', err);
      Alert.alert('Hindi Na-save', err?.message ?? 'May naganap na error. Subukan ulit.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.editOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={styles.modalBackdrop} onPress={onClose} />
        <View style={styles.editSheet}>
          <View style={styles.editHandle} />
          <View style={styles.editHeaderRow}>
            <Text style={styles.editTitle}>Change Password</Text>
            <TouchableOpacity activeOpacity={0.7} style={styles.editCloseBtn} onPress={onClose}>
              <Ionicons name="close" size={18} color={COLORS.slateText} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text style={styles.fieldLabel}>Current Password</Text>
            <View style={styles.passwordRow}>
              <TextInput
                style={styles.passwordInput}
                value={form.currentPassword}
                onChangeText={(v) => updateField('currentPassword', v)}
                placeholder="Current password"
                placeholderTextColor={COLORS.mutedText}
                secureTextEntry={!showCurrent}
              />
              <TouchableOpacity onPress={() => setShowCurrent((v) => !v)} hitSlop={8}>
                <Ionicons name={showCurrent ? 'eye-off-outline' : 'eye-outline'} size={18} color={COLORS.mutedText} />
              </TouchableOpacity>
            </View>

            <Text style={styles.fieldLabel}>New Password</Text>
            <View style={styles.passwordRow}>
              <TextInput
                style={styles.passwordInput}
                value={form.newPassword}
                onChangeText={(v) => updateField('newPassword', v)}
                placeholder="Kahit 8 characters"
                placeholderTextColor={COLORS.mutedText}
                secureTextEntry={!showNew}
              />
              <TouchableOpacity onPress={() => setShowNew((v) => !v)} hitSlop={8}>
                <Ionicons name={showNew ? 'eye-off-outline' : 'eye-outline'} size={18} color={COLORS.mutedText} />
              </TouchableOpacity>
            </View>

            <Text style={styles.fieldLabel}>Confirm New Password</Text>
            <TextInput
              style={styles.fieldInput}
              value={form.confirmPassword}
              onChangeText={(v) => updateField('confirmPassword', v)}
              placeholder="Ulitin ang bagong password"
              placeholderTextColor={COLORS.mutedText}
              secureTextEntry={!showNew}
            />

            <TouchableOpacity
              activeOpacity={0.85}
              style={[styles.saveBtn, saving && { opacity: 0.7 }]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                  <Text style={styles.saveBtnText}>Update Password</Text>
                </>
              )}
            </TouchableOpacity>

            <View style={{ height: 24 }} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ────────────────────────────────────────────────────────────
// Notification Preferences Modal (local/device-level, AsyncStorage)
// ────────────────────────────────────────────────────────────

const NOTIF_TOGGLE_META: { key: keyof NotifPrefs; label: string; description: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'emergency', label: 'Emergency Alerts', description: 'Mga high-priority na fire alerts', icon: 'flame' },
  { key: 'assigned', label: 'Assigned Incidents', description: "Kapag may na-assign sa'yo", icon: 'person-add' },
  { key: 'dispatch', label: 'Dispatch Updates', description: 'Mga update sa dispatch/response', icon: 'car' },
  { key: 'status', label: 'Status Changes', description: 'Verification at resolution updates', icon: 'checkmark-done-circle' },
];

function NotificationPreferencesModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [prefs, setPrefs] = useState<NotifPrefs>(DEFAULT_NOTIF_PREFS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!visible) return;
    (async () => {
      setLoading(true);
      try {
        const stored = await AsyncStorage.getItem(NOTIF_PREFS_KEY);
        if (stored) setPrefs(JSON.parse(stored));
        else setPrefs(DEFAULT_NOTIF_PREFS);
      } catch (err) {
        console.error('Failed to load notif prefs:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [visible]);

  async function toggle(key: keyof NotifPrefs) {
    const updated = { ...prefs, [key]: !prefs[key] };
    setPrefs(updated);
    try {
      await AsyncStorage.setItem(NOTIF_PREFS_KEY, JSON.stringify(updated));
    } catch (err) {
      console.error('Failed to save notif prefs:', err);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.editOverlay}>
        <Pressable style={styles.modalBackdrop} onPress={onClose} />
        <View style={styles.editSheet}>
          <View style={styles.editHandle} />
          <View style={styles.editHeaderRow}>
            <Text style={styles.editTitle}>Notification Preferences</Text>
            <TouchableOpacity activeOpacity={0.7} style={styles.editCloseBtn} onPress={onClose}>
              <Ionicons name="close" size={18} color={COLORS.slateText} />
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator size="small" color={COLORS.deepIndigo} style={{ marginVertical: 24 }} />
          ) : (
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.prefsNote}>
                Naka-save ito sa device na ito lang. Ipapasok pa sa server-side settings 'pag na-add na ang preferences table.
              </Text>
              {NOTIF_TOGGLE_META.map((item) => (
                <View key={item.key} style={styles.prefRow}>
                  <View style={styles.prefIconWrap}>
                    <Ionicons name={item.icon} size={18} color={COLORS.accentViolet} />
                  </View>
                  <View style={styles.prefTextWrap}>
                    <Text style={styles.prefLabel}>{item.label}</Text>
                    <Text style={styles.prefDescription}>{item.description}</Text>
                  </View>
                  <Switch
                    value={prefs[item.key]}
                    onValueChange={() => toggle(item.key)}
                    trackColor={{ false: COLORS.border, true: COLORS.accentViolet }}
                    thumbColor="#FFFFFF"
                  />
                </View>
              ))}
              <View style={{ height: 24 }} />
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

// ────────────────────────────────────────────────────────────
// Duty Schedule Modal (read-only placeholder — walang schedule table pa sa DB)
// ────────────────────────────────────────────────────────────

function getDutyStatusColor(status: string): { bg: string; text: string } {
  const normalized = status?.toLowerCase().trim() ?? '';
  if (normalized === 'on duty') {
    return { bg: '#ECFDF5', text: COLORS.successGreen };
  }
  return { bg: COLORS.surfaceMuted, text: COLORS.mutedText };
}

function formatDutyDateShort(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
}

function DutyScheduleModal({
  visible,
  onClose,
  personnelId,
}: {
  visible: boolean;
  onClose: () => void;
  personnelId: string | null;
}) {
  const [loading, setLoading] = useState(true);
  const [schedule, setSchedule] = useState<DutySchedule[]>([]);

  useEffect(() => {
    if (!visible || !personnelId) return;
    loadSchedule();
  }, [visible, personnelId]);

  async function loadSchedule() {
    try {
      setLoading(true);
      const { data } = await apiClient.get(
        `${API_ENDPOINTS.bfpDutySchedule}?personnel_id=${personnelId}`
      );
      if (data.success) {
        setSchedule(data.data);
      } else {
        setSchedule([]);
      }
    } catch (err) {
      console.log(err);
      setSchedule([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.editOverlay}>
        <Pressable style={styles.modalBackdrop} onPress={onClose} />

        <View style={styles.editSheet}>
          <View style={styles.editHandle} />

          <View style={styles.editHeaderRow}>
            <Text style={styles.editTitle}>Duty Schedule</Text>
            <TouchableOpacity activeOpacity={0.7} style={styles.editCloseBtn} onPress={onClose}>
              <Ionicons name="close" size={18} color={COLORS.slateText} />
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator size="small" color={COLORS.deepIndigo} style={{ marginVertical: 30 }} />
          ) : schedule.length === 0 ? (
            <View style={styles.scheduleEmptyWrap}>
              <View style={styles.scheduleEmptyIconWrap}>
                <Ionicons name="calendar-outline" size={30} color={COLORS.mutedText} />
              </View>
              <Text style={styles.scheduleEmptyTitle}>No Schedule Found</Text>
              <Text style={styles.scheduleEmptySubtitle}>
                Your duty schedule has not been assigned yet.
              </Text>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.tableWrap}>
                {/* Table Header */}
                <View style={styles.tableHeaderRow}>
                  <Text style={[styles.tableHeaderCell, styles.colDate]}>Date</Text>
                  <Text style={[styles.tableHeaderCell, styles.colShift]}>Shift</Text>
                  <Text style={[styles.tableHeaderCell, styles.colTime]}>Time</Text>
                  <Text style={[styles.tableHeaderCell, styles.colStatus]}>Status</Text>
                </View>

                {/* Table Rows */}
                {schedule.map((item, index) => {
                  const statusStyle = getDutyStatusColor(item.status);
                  return (
                    <View key={index}>
                      <View
                        style={[
                          styles.tableRow,
                          index % 2 === 1 && styles.tableRowAlt,
                        ]}
                      >
                        <Text style={[styles.tableCell, styles.colDate, styles.tableCellStrong]}>
                          {formatDutyDateShort(item.duty_date)}
                        </Text>
                        <Text style={[styles.tableCell, styles.colShift]} numberOfLines={1}>
                          {item.shift}
                        </Text>
                        <Text style={[styles.tableCell, styles.colTime]} numberOfLines={1}>
                          {item.start_time}–{item.end_time}
                        </Text>
                        <View style={[styles.colStatus, styles.tableStatusCellWrap]}>
                          <View style={[styles.tableStatusChip, { backgroundColor: statusStyle.bg }]}>
                            <Text style={[styles.tableStatusChipText, { color: statusStyle.text }]} numberOfLines={1}>
                              {item.status}
                            </Text>
                          </View>
                        </View>
                      </View>

                      {/* Secondary row: station + remarks (spans full width) */}
                      <View
                        style={[
                          styles.tableSubRow,
                          index % 2 === 1 && styles.tableRowAlt,
                        ]}
                      >
                        <MaterialCommunityIcons name="fire-station" size={11} color={COLORS.mutedText} />
                        <Text style={styles.tableSubRowText} numberOfLines={1}>
                          {item.station}
                          {item.remarks ? `  •  ${item.remarks}` : ''}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
              <View style={{ height: 12 }} />
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

// ────────────────────────────────────────────────────────────
// Help & Support Modal (backend-managed content)
// ────────────────────────────────────────────────────────────

function HelpSupportModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [data, setData] = useState<HelpSupportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [expandedFaqId, setExpandedFaqId] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setExpandedFaqId(null);
    (async () => {
      setLoading(true);
      setErrorMsg(null);
      try {
        const { data: res } = await apiClient.get(API_ENDPOINTS.bfpHelpSupport);
        if (!res.success) throw new Error(res.message || 'Failed to load Help & Support');
        setData(res.data as HelpSupportData);
      } catch (err: any) {
        console.error('Failed to load help & support:', err);
        setErrorMsg('Hindi na-load ang Help & Support info.');
      } finally {
        setLoading(false);
      }
    })();
  }, [visible]);

  const hasContactInfo = !!(data?.hotline || data?.supportEmail || data?.contactPerson);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.editOverlay}>
        <Pressable style={styles.modalBackdrop} onPress={onClose} />
        <View style={styles.editSheet}>
          <View style={styles.editHandle} />
          <View style={styles.editHeaderRow}>
            <Text style={styles.editTitle}>Help & Support</Text>
            <TouchableOpacity activeOpacity={0.7} style={styles.editCloseBtn} onPress={onClose}>
              <Ionicons name="close" size={18} color={COLORS.slateText} />
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator size="small" color={COLORS.deepIndigo} style={{ marginVertical: 24 }} />
          ) : errorMsg ? (
            <Text style={styles.modalEmptyText}>{errorMsg}</Text>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false}>
              {data?.announcement ? (
                <View style={styles.announcementBox}>
                  <Ionicons name="megaphone-outline" size={16} color="#9A3412" />
                  <Text style={styles.announcementText}>{data.announcement}</Text>
                </View>
              ) : null}

              {hasContactInfo ? (
                <>
                  {data?.hotline && (
                    <TouchableOpacity
                      activeOpacity={0.8}
                      style={styles.supportHotlineCard}
                      onPress={() => Linking.openURL(`tel:${data.hotline}`)}
                    >
                      <View style={styles.supportIconWrap}>
                        <Ionicons name="call" size={18} color={COLORS.successGreen} />
                      </View>
                      <View style={styles.flex1}>
                        <Text style={styles.supportRowLabel}>Hotline</Text>
                        <Text style={styles.supportRowValue}>{data.hotline}</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color={COLORS.mutedText} />
                    </TouchableOpacity>
                  )}
                  {data?.supportEmail && (
                    <TouchableOpacity
                      activeOpacity={0.8}
                      style={styles.supportHotlineCard}
                      onPress={() => Linking.openURL(`mailto:${data.supportEmail}`)}
                    >
                      <View style={[styles.supportIconWrap, { backgroundColor: '#EEF2FF' }]}>
                        <Ionicons name="mail" size={18} color={COLORS.accentViolet} />
                      </View>
                      <View style={styles.flex1}>
                        <Text style={styles.supportRowLabel}>Support Email</Text>
                        <Text style={styles.supportRowValue}>{data.supportEmail}</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color={COLORS.mutedText} />
                    </TouchableOpacity>
                  )}
                  {data?.contactPerson && (
                    <View style={styles.supportHotlineCard}>
                      <View style={[styles.supportIconWrap, { backgroundColor: COLORS.surfaceMuted }]}>
                        <Ionicons name="person" size={18} color={COLORS.slateText} />
                      </View>
                      <View style={styles.flex1}>
                        <Text style={styles.supportRowLabel}>Contact Person</Text>
                        <Text style={styles.supportRowValue}>{data.contactPerson}</Text>
                      </View>
                    </View>
                  )}
                </>
              ) : (
                <Text style={styles.modalEmptyText}>Walang contact info na naka-configure.</Text>
              )}

              <Text style={styles.modalSectionTitle}>Frequently Asked Questions</Text>
              {data?.faqs && data.faqs.length > 0 ? (
                data.faqs.map((faq) => {
                  const expanded = expandedFaqId === faq.id;
                  return (
                    <View key={faq.id} style={styles.faqItem}>
                      <TouchableOpacity
                        activeOpacity={0.75}
                        style={styles.faqQuestionRow}
                        onPress={() => setExpandedFaqId(expanded ? null : faq.id)}
                      >
                        <Text style={styles.faqQuestionText}>{faq.question}</Text>
                        <Ionicons
                          name={expanded ? 'chevron-up' : 'chevron-down'}
                          size={16}
                          color={COLORS.mutedText}
                        />
                      </TouchableOpacity>
                      {expanded && (
                        <View style={styles.faqAnswerWrap}>
                          <Text style={styles.faqAnswerText}>{faq.answer}</Text>
                        </View>
                      )}
                    </View>
                  );
                })
              ) : (
                <Text style={styles.modalEmptyText}>Wala pang FAQ na naka-configure.</Text>
              )}

              <View style={{ height: 24 }} />
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

// ────────────────────────────────────────────────────────────
// About FireSight Modal (backend-managed content)
// ────────────────────────────────────────────────────────────

function AboutModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [data, setData] = useState<AboutData | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    (async () => {
      setLoading(true);
      setErrorMsg(null);
      try {
        const { data: res } = await apiClient.get(API_ENDPOINTS.bfpAboutApp);
        if (!res.success) throw new Error(res.message || 'Failed to load About FireSight');
        setData(res.data as AboutData);
      } catch (err: any) {
        console.error('Failed to load about info:', err);
        setErrorMsg('Hindi na-load ang About FireSight info.');
      } finally {
        setLoading(false);
      }
    })();
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.editOverlay}>
        <Pressable style={styles.modalBackdrop} onPress={onClose} />
        <View style={styles.editSheet}>
          <View style={styles.editHandle} />
          <View style={styles.editHeaderRow}>
            <Text style={styles.editTitle}>About FireSight</Text>
            <TouchableOpacity activeOpacity={0.7} style={styles.editCloseBtn} onPress={onClose}>
              <Ionicons name="close" size={18} color={COLORS.slateText} />
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator size="small" color={COLORS.deepIndigo} style={{ marginVertical: 24 }} />
          ) : errorMsg ? (
            <Text style={styles.modalEmptyText}>{errorMsg}</Text>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.aboutHeaderRow}>
                <View style={styles.aboutAppIconWrap}>
                  <Ionicons name="flame" size={30} color="#FFFFFF" />
                </View>
                <Text style={styles.aboutAppName}>{data?.appName || 'FireSight'}</Text>
                <View style={styles.aboutVersionChip}>
                  <Text style={styles.aboutVersionChipText}>
                    {data?.versionLabel || 'Version unavailable'}
                  </Text>
                </View>
              </View>

              {data?.description && (
                <>
                  <Text style={styles.aboutSectionTitle}>Description</Text>
                  <Text style={styles.aboutSectionText}>{data.description}</Text>
                </>
              )}

              {data?.systemOverview && (
                <>
                  <Text style={styles.aboutSectionTitle}>System Overview</Text>
                  <Text style={styles.aboutSectionText}>{data.systemOverview}</Text>
                </>
              )}

              {data?.developerInfo && (
                <>
                  <Text style={styles.aboutSectionTitle}>Developer / Organization</Text>
                  <Text style={styles.aboutSectionText}>{data.developerInfo}</Text>
                </>
              )}

              {data?.versionDescription && (
                <>
                  <Text style={styles.aboutSectionTitle}>Version Notes</Text>
                  <Text style={styles.aboutSectionText}>{data.versionDescription}</Text>
                </>
              )}

              {data?.additionalInfo && (
                <>
                  <Text style={styles.aboutSectionTitle}>Additional Information</Text>
                  <Text style={styles.aboutSectionText}>{data.additionalInfo}</Text>
                </>
              )}

              {!data?.description &&
                !data?.systemOverview &&
                !data?.developerInfo &&
                !data?.versionDescription &&
                !data?.additionalInfo && (
                  <Text style={styles.modalEmptyText}>Wala pang laman ang About page na ito.</Text>
                )}

              <View style={{ height: 24 }} />
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

export default function ProfileScreen() {
  const [logoutVisible, setLogoutVisible] = useState(false);
  const [editVisible, setEditVisible] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [notifPrefsVisible, setNotifPrefsVisible] = useState(false);
  const [scheduleVisible, setScheduleVisible] = useState(false);
  const [helpVisible, setHelpVisible] = useState(false);
  const [aboutVisible, setAboutVisible] = useState(false);

  const [profile, setProfile] = useState<PersonnelProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const personnelId = await AsyncStorage.getItem('user_id');
      if (!personnelId) {
        setErrorMsg('Walang naka-store na user_id. Mag-login muli.');
        setLoading(false);
        return;
      }

      const { data } = await apiClient.get(
        `${API_ENDPOINTS.bfpProfileRead}?personnel_id=${personnelId}`
      );

      if (!data.success) throw new Error(data.message || 'Failed to load profile');
      setProfile(data.data as PersonnelProfile);
    } catch (err: any) {
      console.error('Failed to load profile:', err);
      setErrorMsg('Hindi na-load ang profile.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  function handleMenuPress(item: MenuItem) {
    if (item.id === 'logout') {
      setLogoutVisible(true);
      return;
    }
    if (item.id === 'edit') {
      setEditVisible(true);
      return;
    }
    if (item.id === 'password') {
      setPasswordVisible(true);
      return;
    }
    if (item.id === 'notifications') {
      setNotifPrefsVisible(true);
      return;
    }
    if (item.id === 'schedule') {
      setScheduleVisible(true);
      return;
    }
    if (item.id === 'help') {
      setHelpVisible(true);
      return;
    }
    if (item.id === 'about') {
      setAboutVisible(true);
      return;
    }
  }

  function handleBackPress() {
    router.replace('/');
  }

  async function confirmLogout() {
    setLogoutVisible(false);
    await AsyncStorage.multiRemove(['user_id', 'user_token']); // adjust base sa actual keys mo
    router.replace('/login');
  }

  function handleProfileSaved(updated: PersonnelProfile) {
    setProfile(updated);
  }

  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, styles.centerFill]}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.deepIndigo} />
        <ActivityIndicator size="large" color="#FFFFFF" />
      </SafeAreaView>
    );
  }

  if (errorMsg || !profile) {
    return (
      <SafeAreaView style={[styles.safeArea, styles.centerFill]}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.deepIndigo} />
        <Ionicons name="cloud-offline-outline" size={40} color="rgba(255,255,255,0.6)" />
        <Text style={styles.errorText}>{errorMsg ?? 'Walang profile data.'}</Text>
        <TouchableOpacity activeOpacity={0.8} style={styles.retryBtn} onPress={fetchProfile}>
          <Text style={styles.retryBtnText}>Subukan Ulit</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const initials = profile.fullName
    ? profile.fullName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : '—';

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.deepIndigo} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerBlock}>
          <View style={styles.headerTopRow}>
            <TouchableOpacity activeOpacity={0.8} style={styles.backIconButton} onPress={handleBackPress}>
              <Ionicons name="arrow-back" size={18} color="rgba(255,255,255,0.9)" />
            </TouchableOpacity>
            <Text style={styles.headerEyebrow}>My Profile</Text>
            <TouchableOpacity activeOpacity={0.8} style={styles.editIconButton} onPress={() => setEditVisible(true)}>
              <Ionicons name="create-outline" size={18} color="rgba(255,255,255,0.9)" />
            </TouchableOpacity>
          </View>

          <View style={styles.identityRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
              <View
                style={[
                  styles.dutyDot,
                  { backgroundColor: STATIC_DUTY_STATUS === 'On Duty' ? COLORS.successGreen : COLORS.mutedText },
                ]}
              />
            </View>
            <View style={styles.identityMeta}>
              <Text style={styles.responderName}>{profile.fullName}</Text>
              <Text style={styles.responderRole}>
                {profile.rankTitle || profile.position || 'Fire Officer'}
              </Text>
              <View style={styles.dutyBadge}>
                <View
                  style={[
                    styles.dutyBadgeDot,
                    { backgroundColor: STATIC_DUTY_STATUS === 'On Duty' ? COLORS.successGreen : COLORS.mutedText },
                  ]}
                />
                <Text style={styles.dutyBadgeText}>{STATIC_DUTY_STATUS}</Text>
              </View>
            </View>
          </View>

          <View style={styles.stationRow}>
            <MaterialCommunityIcons name="fire-station" size={15} color="rgba(255,255,255,0.7)" />
            <Text style={styles.stationText}>{STATIC_STATION}</Text>
          </View>
        </View>

        <MenuGroup title="Preferences" items={PREFERENCES_ITEMS} onPress={handleMenuPress} />
        <MenuGroup title="Support" items={SUPPORT_ITEMS} onPress={handleMenuPress} />
        <MenuGroup items={DANGER_ITEMS} onPress={handleMenuPress} />

        <Text style={styles.versionText}>FireSight v1.0.0</Text>
      </ScrollView>

      <AccountEditModal
        visible={editVisible}
        initial={profile}
        onClose={() => setEditVisible(false)}
        onSaved={handleProfileSaved}
      />

      <ChangePasswordModal
        visible={passwordVisible}
        personnelId={profile.id}
        onClose={() => setPasswordVisible(false)}
      />

      <NotificationPreferencesModal
        visible={notifPrefsVisible}
        onClose={() => setNotifPrefsVisible(false)}
      />

      <DutyScheduleModal
          visible={scheduleVisible}
          onClose={() => setScheduleVisible(false)}
          personnelId={profile.id}
      />

      <HelpSupportModal
        visible={helpVisible}
        onClose={() => setHelpVisible(false)}
      />

      <AboutModal
        visible={aboutVisible}
        onClose={() => setAboutVisible(false)}
      />

      <Modal visible={logoutVisible} transparent animationType="fade" onRequestClose={() => setLogoutVisible(false)}>
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setLogoutVisible(false)} />
          <View style={styles.centerCard}>
            <View style={styles.modalIconWrap}>
              <Ionicons name="log-out-outline" size={26} color={COLORS.criticalRed} />
            </View>
            <Text style={styles.modalTitle}>Log Out</Text>
            <Text style={styles.modalMessage}>Are you sure you want to log out of FireSight?</Text>
            <View style={styles.modalActions}>
              <TouchableOpacity activeOpacity={0.8} style={styles.cancelBtn} onPress={() => setLogoutVisible(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity activeOpacity={0.85} style={styles.dangerBtn} onPress={confirmLogout}>
                <Text style={styles.dangerBtnText}>Log Out</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  safeArea: { flex: 1, backgroundColor: COLORS.deepIndigo },
  centerFill: { alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 32 },
  errorText: { color: 'rgba(255,255,255,0.8)', fontSize: FONT_SIZES.secondary, textAlign: 'center' },
  retryBtn: {
    marginTop: 8, backgroundColor: 'rgba(255,255,255,0.14)', borderRadius: 12,
    paddingHorizontal: 20, paddingVertical: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  retryBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: FONT_SIZES.caption },

  scrollView: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { paddingBottom: 32 },

  headerBlock: {
    backgroundColor: COLORS.deepIndigo,
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 28,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  headerTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  headerEyebrow: {
    fontSize: FONT_SIZES.tiny,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.55)',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  backIconButton: {
    width: 40, height: 40, borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
  },
  editIconButton: {
    width: 40, height: 40, borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
  },

  identityRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16 },
  avatar: {
    width: 64, height: 64, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.2)',
  },
  avatarText: { fontSize: FONT_SIZES.cardTitle, fontWeight: '800', color: '#FFFFFF' },
  dutyDot: {
    position: 'absolute', bottom: -2, right: -2,
    width: 16, height: 16, borderRadius: 8,
    borderWidth: 2.5, borderColor: COLORS.deepIndigo,
  },
  identityMeta: { flex: 1, gap: 4 },
  responderName: { fontSize: FONT_SIZES.cardTitle, fontWeight: '800', color: '#FFFFFF' },
  responderRole: { fontSize: FONT_SIZES.caption, color: 'rgba(255,255,255,0.65)', fontWeight: '600' },
  dutyBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4, marginTop: 2,
  },
  dutyBadgeDot: { width: 6, height: 6, borderRadius: 3 },
  dutyBadgeText: { fontSize: FONT_SIZES.tiny, fontWeight: '700', color: '#FFFFFF' },

  stationRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  stationText: { fontSize: FONT_SIZES.caption, color: 'rgba(255,255,255,0.7)', fontWeight: '500' },

  infoCard: {
    backgroundColor: COLORS.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginHorizontal: 20,
    marginTop: -22,
    paddingHorizontal: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  infoCardRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 13 },
  infoCardLabel: { fontSize: FONT_SIZES.caption, color: COLORS.mutedText, fontWeight: '600', width: 66 },
  infoCardValue: { flex: 1, fontSize: FONT_SIZES.caption, color: COLORS.deepIndigo, fontWeight: '700', textAlign: 'right' },
  infoCardDivider: { height: 1, backgroundColor: COLORS.border },

  menuGroupWrap: { marginHorizontal: 20, marginBottom: 20 },
  menuGroupTitle: {
    fontSize: FONT_SIZES.tiny, fontWeight: '700', color: COLORS.mutedText,
    textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10, marginLeft: 4, marginTop:20,
  },
  menuGroupCard: {
    backgroundColor: COLORS.card, borderRadius: 18,
    borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 14,
  },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13 },
  menuIconWrap: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  menuLabel: { flex: 1, fontSize: FONT_SIZES.secondary, fontWeight: '600', color: COLORS.deepIndigo },
  divider: { height: 1, backgroundColor: COLORS.border },

  versionText: {
    textAlign: 'center', fontSize: FONT_SIZES.tiny, color: COLORS.mutedText,
    marginTop: 4,
  },

  modalOverlay: { flex: 1, justifyContent: 'center', paddingHorizontal: 32 },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(17,24,39,0.55)' },
  centerCard: { backgroundColor: COLORS.card, borderRadius: 22, padding: 24, alignItems: 'center', width: '100%' },
  modalIconWrap: {
    width: 52, height: 52, borderRadius: 16, backgroundColor: '#FEF2F2',
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
  },
  modalTitle: { fontSize: 17, fontWeight: '800', color: COLORS.deepIndigo, marginBottom: 6, textAlign: 'center' },
  modalMessage: { fontSize: 13, color: COLORS.slateText, textAlign: 'center', marginBottom: 20, lineHeight: 18 },
  modalActions: { flexDirection: 'row', gap: 10, width: '100%' },
  cancelBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 14, alignItems: 'center',
    backgroundColor: COLORS.surfaceMuted, borderWidth: 1, borderColor: COLORS.border,
  },
  cancelBtnText: { fontSize: 13.5, fontWeight: '700', color: COLORS.deepIndigo },
  dangerBtn: { flex: 1, paddingVertical: 12, borderRadius: 14, alignItems: 'center', backgroundColor: COLORS.criticalRed },
  dangerBtnText: { fontSize: 13.5, fontWeight: '700', color: '#FFFFFF' },

  // ── Shared bottom-sheet modal (Edit / Password / Notifications / Schedule) ──
  editOverlay: { flex: 1, justifyContent: 'flex-end' },
  editSheet: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
    maxHeight: '85%',
  },
  editHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: COLORS.border, alignSelf: 'center', marginBottom: 14 },
  editHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  editTitle: { fontSize: FONT_SIZES.cardTitle, fontWeight: '800', color: COLORS.deepIndigo },
  editCloseBtn: {
    width: 32, height: 32, borderRadius: 10, backgroundColor: COLORS.surfaceMuted,
    alignItems: 'center', justifyContent: 'center',
  },
  fieldLabel: { fontSize: FONT_SIZES.caption, fontWeight: '700', color: COLORS.slateText, marginBottom: 6, marginTop: 12 },
  fieldInput: {
    backgroundColor: COLORS.card, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: FONT_SIZES.secondary, color: COLORS.deepIndigo,
  },
  passwordRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: COLORS.card, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: 14, paddingVertical: 12,
  },
  passwordInput: { flex: 1, fontSize: FONT_SIZES.secondary, color: COLORS.deepIndigo, padding: 0 },
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: COLORS.deepIndigo, borderRadius: 14, height: 50, marginTop: 24,
  },
  saveBtnText: { fontSize: FONT_SIZES.secondary, fontWeight: '700', color: '#FFFFFF' },

  // ── Notification Preferences ──
  prefsNote: {
    fontSize: FONT_SIZES.tiny, color: COLORS.mutedText, lineHeight: 16,
    backgroundColor: COLORS.surfaceMuted, borderRadius: 10, padding: 10, marginBottom: 14,
  },
  prefRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  prefIconWrap: {
    width: 36, height: 36, borderRadius: 11, backgroundColor: '#EEF2FF',
    alignItems: 'center', justifyContent: 'center',
  },
  prefTextWrap: { flex: 1 },
  prefLabel: { fontSize: FONT_SIZES.secondary, fontWeight: '700', color: COLORS.deepIndigo },
  prefDescription: { fontSize: FONT_SIZES.tiny, color: COLORS.mutedText, marginTop: 2 },

  // ── Account & Edit modal preview ──
  previewRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 },
  previewAvatar: {
    width: 56, height: 56, borderRadius: 18, backgroundColor: COLORS.deepIndigo,
    alignItems: 'center', justifyContent: 'center',
  },
  previewAvatarText: { color: '#FFFFFF', fontWeight: '800', fontSize: FONT_SIZES.cardTitle },
  previewMeta: { flex: 1 },
  previewName: { fontSize: FONT_SIZES.secondary, fontWeight: '800', color: COLORS.deepIndigo },
  previewSub: { fontSize: FONT_SIZES.tiny, color: COLORS.mutedText, marginTop: 2 },
  previewContactRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 },
  previewContactText: { fontSize: FONT_SIZES.tiny, color: COLORS.slateText, fontWeight: '600' },

  modalSectionTitle: {
    fontSize: FONT_SIZES.tiny, fontWeight: '700', color: COLORS.mutedText,
    textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 18, marginBottom: 8,
  },
  modalInfoCard: {
    backgroundColor: COLORS.surfaceMuted, borderRadius: 16,
    borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 14,
  },
  modalEmptyText: {
    fontSize: FONT_SIZES.caption, color: COLORS.mutedText, textAlign: 'center', paddingVertical: 24,
  },

  // ── Help & Support ──
  announcementBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: '#FFF7ED', borderRadius: 14, borderWidth: 1, borderColor: '#FED7AA',
    padding: 12, marginBottom: 14,
  },
  announcementText: { flex: 1, fontSize: FONT_SIZES.caption, color: '#9A3412', lineHeight: 18 },
  supportHotlineCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: COLORS.card, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border,
    padding: 14, marginBottom: 10,
  },
  supportIconWrap: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#ECFDF5', alignItems: 'center', justifyContent: 'center' },
  supportRowLabel: { fontSize: FONT_SIZES.tiny, color: COLORS.mutedText, fontWeight: '600' },
  supportRowValue: { fontSize: FONT_SIZES.secondary, color: COLORS.deepIndigo, fontWeight: '700', marginTop: 2 },
  faqItem: { backgroundColor: COLORS.card, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, marginBottom: 8, overflow: 'hidden' },
  faqQuestionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, gap: 10 },
  faqQuestionText: { flex: 1, fontSize: FONT_SIZES.secondary, fontWeight: '700', color: COLORS.deepIndigo },
  faqAnswerWrap: { paddingHorizontal: 14, paddingBottom: 14 },
  faqAnswerText: { fontSize: FONT_SIZES.caption, color: COLORS.slateText, lineHeight: 19 },

  // ── About FireSight ──
  aboutHeaderRow: { alignItems: 'center', marginBottom: 8 },
  aboutAppIconWrap: {
    width: 64, height: 64, borderRadius: 20, backgroundColor: COLORS.deepIndigo,
    alignItems: 'center', justifyContent: 'center', marginBottom: 10,
  },
  aboutAppName: { fontSize: FONT_SIZES.cardTitle, fontWeight: '800', color: COLORS.deepIndigo },
  aboutVersionChip: {
    marginTop: 6, backgroundColor: COLORS.surfaceMuted, borderRadius: 999,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  aboutVersionChipText: { fontSize: FONT_SIZES.tiny, fontWeight: '700', color: COLORS.slateText },
  aboutSectionTitle: {
    fontSize: FONT_SIZES.caption, fontWeight: '700', color: COLORS.mutedText,
    textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 16, marginBottom: 6,
  },
  aboutSectionText: { fontSize: FONT_SIZES.secondary, color: COLORS.slateText, lineHeight: 20 },

  // ── Duty Schedule ──
  scheduleEmptyWrap: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 12 },
  scheduleEmptyIconWrap: {
    width: 64, height: 64, borderRadius: 20, backgroundColor: COLORS.surfaceMuted,
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
    borderWidth: 1, borderColor: COLORS.border,
  },
  scheduleEmptyTitle: { fontSize: FONT_SIZES.cardTitle, fontWeight: '700', color: COLORS.deepIndigo, marginBottom: 8, textAlign: 'center' },
  scheduleEmptySubtitle: { fontSize: FONT_SIZES.secondary, color: COLORS.mutedText, textAlign: 'center', lineHeight: 20 },
  // ── Duty Schedule (table) ──
  tableWrap: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.surfaceMuted,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tableHeaderCell: {
    fontSize: FONT_SIZES.tiny,
    fontWeight: '700',
    color: COLORS.mutedText,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  tableRowAlt: {
    backgroundColor: COLORS.surfaceMuted,
  },
  tableCell: {
    fontSize: FONT_SIZES.tiny,
    color: COLORS.slateText,
    fontWeight: '500',
    paddingRight: 4,
  },
  tableCellStrong: {
    color: COLORS.deepIndigo,
    fontWeight: '700',
  },
  colDate: { width: '22%' },
  colShift: { width: '26%' },
  colTime: { width: '26%' },
  colStatus: { width: '26%' },
  tableStatusCellWrap: {
    alignItems: 'flex-start',
  },
  tableStatusChip: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    maxWidth: '100%',
  },
  tableStatusChipText: {
    fontSize: FONT_SIZES.tiny,
    fontWeight: '700',
  },
  tableSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingBottom: 9,
  },
  tableSubRowText: {
    flex: 1,
    fontSize: FONT_SIZES.tiny,
    color: COLORS.mutedText,
  },
});