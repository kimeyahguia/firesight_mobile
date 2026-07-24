import { COLORS, FONT_SIZES } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { DrawerActions } from '@react-navigation/native';
import { useNavigation, useRouter } from 'expo-router';
import React from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface BfpHeaderProps {
  unreadNotifCount?: number;
  onBellPress?: () => void;   // kung wala, walang default action — pass mo per screen kung may notif modal
  onLogoutPress?: () => void; // kung wala, gagamit ng default logout confirm + redirect sa /login
  children?: React.ReactNode; // eyebrow/title, summary strip, search bar, etc. — iba-iba per screen
}

export default function BfpHeader({
  unreadNotifCount = 0,
  onBellPress,
  onLogoutPress,
  children,
}: BfpHeaderProps) {
  const navigation = useNavigation();
  const router = useRouter();

  function openDrawer() {
    navigation.dispatch(DrawerActions.openDrawer());
  }

  function handleLogoutPress() {
    if (onLogoutPress) {
      onLogoutPress();
      return;
    }
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out',
        style: 'destructive',
        onPress: () => router.replace('/login'),
      },
    ]);
  }

  return (
    <View style={styles.heroHeader}>
      <View style={styles.brandRow}>
        <View style={styles.brandLeft}>
          <TouchableOpacity style={styles.menuButton} activeOpacity={0.7} onPress={openDrawer}>
            <Ionicons name="menu-outline" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.brandIconWrap}>
            <Ionicons name="flame" size={15} color="#FFFFFF" />
          </View>
          <Text style={styles.brandText}>
            FIRE<Text style={styles.brandAccent}>SIGHT</Text>
          </Text>
        </View>

        <View style={styles.rightActions}>
          <TouchableOpacity style={styles.logoutButton} activeOpacity={0.7} onPress={handleLogoutPress}>
            <Ionicons name="log-out-outline" size={20} color="rgba(255,255,255,0.85)" />
          </TouchableOpacity>

          {onBellPress && (
            <TouchableOpacity style={styles.bellButton} activeOpacity={0.7} onPress={onBellPress}>
              <Ionicons name="notifications-outline" size={20} color="rgba(255,255,255,0.85)" />
              {unreadNotifCount > 0 && <View style={styles.bellDot} />}
            </TouchableOpacity>
          )}
        </View>
      </View>

      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  heroHeader: { backgroundColor: COLORS.deepIndigo, paddingHorizontal: 20, paddingTop: 50, paddingBottom: 24 },
  brandRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  brandLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  brandIconWrap: { width: 28, height: 28, borderRadius: 9, backgroundColor: COLORS.primaryOrange, alignItems: 'center', justifyContent: 'center' },
  brandText: { fontSize: FONT_SIZES.cardTitle, fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.8 },
  brandAccent: { color: COLORS.primaryOrange },
  rightActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  menuButton: {
    width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
  },
  logoutButton: {
    width: 42, height: 42, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
  },
  bellButton: {
    width: 42, height: 42, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
  },
  bellDot: { position: 'absolute', top: 9, right: 10, width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.primaryOrange, borderWidth: 1.5, borderColor: COLORS.deepIndigo },
});