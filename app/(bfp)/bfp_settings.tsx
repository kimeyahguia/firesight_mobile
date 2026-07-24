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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { COLORS, FONT_SIZES } from '@/constants/theme';



export default function SettingsScreen() {
  const [pushEnabled, setPushEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [locationEnabled, setLocationEnabled] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.deepIndigo} />

      <View style={styles.header}>
        <TouchableOpacity activeOpacity={0.8} style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.groupTitle}>Preferences</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <Ionicons name="notifications-outline" size={18} color={COLORS.slateText} />
            <Text style={styles.rowLabel}>Push Notifications</Text>
            <Switch value={pushEnabled} onValueChange={setPushEnabled} trackColor={{ true: COLORS.primaryOrange }} />
          </View>
          <View style={styles.divider} />
          <View style={styles.row}>
            <Ionicons name="volume-medium-outline" size={18} color={COLORS.slateText} />
            <Text style={styles.rowLabel}>Alert Sounds</Text>
            <Switch value={soundEnabled} onValueChange={setSoundEnabled} trackColor={{ true: COLORS.primaryOrange }} />
          </View>
          <View style={styles.divider} />
          <View style={styles.row}>
            <Ionicons name="location-outline" size={18} color={COLORS.slateText} />
            <Text style={styles.rowLabel}>Location Access</Text>
            <Switch value={locationEnabled} onValueChange={setLocationEnabled} trackColor={{ true: COLORS.primaryOrange }} />
          </View>
          <View style={styles.divider} />
          <View style={styles.row}>
            <Ionicons name="moon-outline" size={18} color={COLORS.slateText} />
            <Text style={styles.rowLabel}>Dark Mode</Text>
            <Switch value={darkMode} onValueChange={setDarkMode} trackColor={{ true: COLORS.primaryOrange }} />
          </View>
        </View>

        <Text style={styles.groupTitle}>General</Text>
        <View style={styles.card}>
          <TouchableOpacity activeOpacity={0.75} style={styles.row}>
            <Ionicons name="language-outline" size={18} color={COLORS.slateText} />
            <Text style={styles.rowLabel}>Language</Text>
            <Text style={styles.rowValue}>English</Text>
            <Ionicons name="chevron-forward" size={16} color={COLORS.mutedText} />
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity activeOpacity={0.75} style={styles.row}>
            <Ionicons name="document-text-outline" size={18} color={COLORS.slateText} />
            <Text style={styles.rowLabel}>Terms & Privacy Policy</Text>
            <Ionicons name="chevron-forward" size={16} color={COLORS.mutedText} />
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity activeOpacity={0.75} style={styles.row}>
            <Ionicons name="information-circle-outline" size={18} color={COLORS.slateText} />
            <Text style={styles.rowLabel}>App Version</Text>
            <Text style={styles.rowValue}>1.0.0</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.deepIndigo },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 50, paddingBottom: 16,
  },
  backButton: {
    width: 40, height: 40, borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: FONT_SIZES.cardTitle, fontWeight: '800', color: '#FFFFFF' },

  scrollView: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 32 },

  groupTitle: {
    fontSize: FONT_SIZES.tiny, fontWeight: '700', color: COLORS.mutedText,
    textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10, marginLeft: 4,
  },
  card: {
    backgroundColor: COLORS.card, borderRadius: 18, borderWidth: 1,
    borderColor: COLORS.border, paddingHorizontal: 14, marginBottom: 24,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  rowLabel: { flex: 1, fontSize: FONT_SIZES.secondary, fontWeight: '600', color: COLORS.deepIndigo },
  rowValue: { fontSize: FONT_SIZES.caption, color: COLORS.mutedText, fontWeight: '600' },
  divider: { height: 1, backgroundColor: COLORS.border },
});