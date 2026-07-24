import { Tabs } from 'expo-router';
import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { View, StyleSheet, TouchableOpacity, GestureResponderEvent } from 'react-native';

import { HapticTab } from '@/components/haptic-tab';
import { COLORS, FONT_SIZES } from '@/constants/theme';

function ReportTabButton({
  onPress,
}: {
  onPress?: (e: GestureResponderEvent) => void;
}) {
  return (
    <View style={styles.reportButtonWrap}>
      <TouchableOpacity
        style={styles.reportButton}
        onPress={onPress}
        activeOpacity={0.85}
      >
        <Ionicons name="flame" size={32} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarActiveTintColor: COLORS.primaryOrange,
        tabBarInactiveTintColor: COLORS.mutedText,
        tabBarStyle: {
          backgroundColor: COLORS.card,
          borderTopColor: COLORS.border,
          borderTopWidth: 1,
          height: 64,
          paddingTop: 8,
          paddingBottom: 10,
        },
        tabBarLabelStyle: {
          fontSize: FONT_SIZES.tiny,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            <Ionicons name="home" size={size ?? 24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: 'Risk Map',
          tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            <Ionicons name="map" size={size ?? 24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="report"
        options={{
          title: '',
          tabBarButton: (props) => <ReportTabButton onPress={props.onPress} />,
        }}
      />
      <Tabs.Screen
        name="awareness"
        options={{
          title: 'Learn',
          tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            <Ionicons name="book" size={size ?? 24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            <Ionicons name="person" size={size ?? 24} color={color} />
          ),
        }}
      />

      {/* Hidden screens — exist inside (tabs) for shared layout/navigation
          context, but excluded from the bottom tab bar via href: null.
          Reachable only through router.push(), never shown as a tab icon. */}
      <Tabs.Screen
        name="settings"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  reportButtonWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  reportButton: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: COLORS.primaryOrange,
    alignItems: 'center',
    justifyContent: 'center',
    top: -28,
    borderWidth: 5,
    borderColor: COLORS.card,
    shadowColor: COLORS.primaryOrange,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 7,
  },
});