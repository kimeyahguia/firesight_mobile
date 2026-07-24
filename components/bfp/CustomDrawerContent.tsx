import { API_ENDPOINTS } from '@/constants/api';
import { COLORS, FONT_SIZES } from '@/constants/theme';
import apiClient from '@/services/apiClient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  DrawerContentComponentProps,
  DrawerContentScrollView,
} from '@react-navigation/drawer';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

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

const NAV_ITEMS = [
  { route: '/(bfp)/(bfp_tabs)', matchKey: '(bfp_tabs)', label: 'Home', icon: 'home-outline' as const },
  { route: '/(bfp)/bfp_profile', matchKey: 'bfp_profile', label: 'My Profile', icon: 'person-outline' as const },
  { route: '/(bfp)/bfp_settings', matchKey: 'bfp_settings', label: 'Settings', icon: 'settings-outline' as const },
];

export default function CustomDrawerContent(props: DrawerContentComponentProps) {
  const activeRoute = props.state.routeNames[props.state.index];

  const [profile, setProfile] = useState<PersonnelProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const personnelId = await AsyncStorage.getItem('user_id');
        if (!personnelId) {
          setLoading(false);
          return;
        }
        const { data } = await apiClient.get(
          `${API_ENDPOINTS.bfpProfileRead}?personnel_id=${personnelId}`
        );
        if (data.success) {
          setProfile(data.data as PersonnelProfile);
        }
      } catch (err) {
        console.error('Failed to load drawer profile:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function navigateTo(path: string) {
    props.navigation.closeDrawer();
    router.push(path as any);
  }

  function handleLogout() {
    props.navigation.closeDrawer();
    router.replace('/login');
  }

  const displayName = profile?.fullName ?? 'BFP Personnel';
  const displayRole = profile?.rankTitle || profile?.position || 'Fire Officer';
  const initials = profile?.fullName
    ? profile.fullName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : '—';

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          {loading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.avatarText}>{initials}</Text>
          )}
        </View>
        <Text style={styles.name}>{displayName}</Text>
        <Text style={styles.role}>{displayRole}</Text>
      </View>

      <DrawerContentScrollView {...props} contentContainerStyle={styles.scrollContent}>
        {NAV_ITEMS.map((item) => {
          const active = activeRoute === item.matchKey;
          return (
            <TouchableOpacity
              key={item.route}
              activeOpacity={0.75}
              style={[styles.navItem, active && styles.navItemActive]}
              onPress={() => navigateTo(item.route)}
            >
              <Ionicons
                name={item.icon}
                size={19}
                color={active ? COLORS.primaryOrange : COLORS.slateText}
              />
              <Text style={[styles.navLabel, active && styles.navLabelActive]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </DrawerContentScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity activeOpacity={0.75} style={styles.logoutItem} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={19} color={COLORS.criticalRed} />
          <Text style={styles.logoutLabel}>Log Out</Text>
        </TouchableOpacity>
        <View style={styles.brandRow}>
          <MaterialCommunityIcons name="fire" size={14} color={COLORS.mutedText} />
          <Text style={styles.brandText}>FireSight v1.0.0</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.card },
  header: {
    backgroundColor: COLORS.deepIndigo,
    paddingVertical: 24,
    paddingHorizontal: 20,
    marginTop: 20,
  },
  avatar: {
    width: 72, height: 72, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 14,
  },
  avatarText: { fontSize: FONT_SIZES.cardTitle, fontWeight: '800', color: '#FFFFFF' },
  name: { fontSize: FONT_SIZES.body, fontWeight: '800', color: '#FFFFFF', marginBottom: 3 },
  role: { fontSize: FONT_SIZES.secondary, color: 'rgba(255,255,255,0.65)', fontWeight: '600' },

  scrollContent: { paddingTop: 12, paddingHorizontal: 12 },
  navItem: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingVertical: 13, paddingHorizontal: 12, borderRadius: 12, marginBottom: 4,
  },
  navItemActive: { backgroundColor: '#FFF1E6' },
  navLabel: { fontSize: FONT_SIZES.secondary, fontWeight: '600', color: COLORS.slateText },
  navLabelActive: { color: COLORS.primaryOrange, fontWeight: '700' },

  footer: {
    borderTopWidth: 1, borderTopColor: COLORS.border,
    paddingHorizontal: 20, paddingVertical: 16, gap: 14,
  },
  logoutItem: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  logoutLabel: { fontSize: FONT_SIZES.secondary, fontWeight: '600', color: COLORS.criticalRed },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  brandText: { fontSize: FONT_SIZES.tiny, color: COLORS.mutedText, fontWeight: '500' },
});