import { COLORS, FONT_SIZES } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface AppHeaderProps {
  title: string;
  subtitle?: string;
  showLocation?: boolean;
  onBellPress?: () => void;
  showBell?: boolean;
  hasNotification?: boolean;
  showBrand?: boolean;
  showLogout?: boolean;
  onLogoutPress?: () => void;
  rightAction?: { icon: keyof typeof Ionicons.glyphMap; onPress?: () => void };
}

export default function AppHeader({
  title,
  subtitle,
  showLocation = false,
  onBellPress,
  showBell = true,
  hasNotification = true,
  showBrand = true,
  showLogout = false,
  onLogoutPress,
  rightAction,
}: AppHeaderProps) {
  return (
    <View>
      {showBrand && (
        <View style={styles.brandRow}>
          <View style={styles.brandLeftRow}>
            <View style={styles.brandIconWrap}>
              <Ionicons name="flame" size={20} color="#FFFFFF" />
            </View>
            <Text style={styles.brandText}>
              FIRE<Text style={styles.brandTextAccent}>SIGHT</Text>
            </Text>
          </View>
        </View>
      )}

      <View style={styles.headerRow}>
        <Text style={styles.greeting}>{title}</Text>

        <View style={styles.headerActions}>
          {showLogout && (
            <TouchableOpacity activeOpacity={0.7} style={styles.logoutButton} onPress={onLogoutPress}>
              <Ionicons name="log-out-outline" size={19} color={COLORS.criticalRed} />
            </TouchableOpacity>
          )}

          {rightAction ? (
            <TouchableOpacity activeOpacity={0.7} style={styles.bellButton} onPress={rightAction.onPress}>
              <Ionicons name={rightAction.icon} size={20} color={COLORS.deepIndigo} />
            </TouchableOpacity>
          ) : showBell ? (
            <TouchableOpacity activeOpacity={0.7} style={styles.bellButton} onPress={onBellPress}>
              <Ionicons name="notifications-outline" size={22} color={COLORS.deepIndigo} />
              {hasNotification && <View style={styles.bellDot} />}
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {showLocation && subtitle ? (
        <View style={styles.locationRow}>
          <Ionicons name="location" size={13} color={COLORS.slateText} />
          <Text style={styles.locationText}>{subtitle}</Text>
        </View>
      ) : subtitle ? (
        <Text style={styles.subtitleText}>{subtitle}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  brandRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 12,
  },
  brandLeftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  // ── Brand icon: pinalaki konti para bagay sa mas malaking text ──
  brandIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: COLORS.primaryOrange,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // ── "FIRESIGHT" — ito na ngayon ang pinaka-emphasized text sa header ──
  brandText: {
    fontSize: FONT_SIZES.heroTitle,
    fontWeight: '800',
    color: COLORS.deepIndigo,
    letterSpacing: -0.5,
  },
  brandTextAccent: {
    color: COLORS.primaryOrange,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoutButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(220,38,38,0.15)',
  },
  // ── Page title: balik sa dating size, secondary lang sa brand ──
  greeting: {
    flex: 1,
    fontSize: FONT_SIZES.sectionHeading,
    fontWeight: '700',
    color: COLORS.deepIndigo,
    letterSpacing: -0.3,
  },
  subtitleText: {
    fontSize: FONT_SIZES.secondary,
    color: COLORS.slateText,
    fontWeight: '500',
    marginTop: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
    marginBottom: 20,
  },
  locationText: {
    fontSize: FONT_SIZES.secondary,
    color: COLORS.slateText,
    fontWeight: '500',
  },
  bellButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: COLORS.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  bellDot: {
    position: 'absolute',
    top: 10,
    right: 11,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primaryOrange,
    borderWidth: 1.5,
    borderColor: COLORS.card,
  },
});