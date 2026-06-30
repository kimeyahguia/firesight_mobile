import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  SafeAreaView,
  Switch,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { COLORS, FONT_SIZES } from '@/constants/theme';

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

// ────────────────────────────────────────────────────────────
// Main Screen
// ────────────────────────────────────────────────────────────

export default function SettingsScreen() {
  const [darkMode, setDarkMode] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [accessibilityLargeText, setAccessibilityLargeText] = useState(false);
  const [language, setLanguage] = useState<string>(LANGUAGES[0]);

  function handleNav(rowId: string) {
    // TODO: wire these up to real screens/routes as they get built
    Alert.alert('Coming Soon', 'This settings page is not yet available.');
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
    paddingTop: 12,
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
});