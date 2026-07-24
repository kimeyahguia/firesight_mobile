import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { COLORS, FONT_SIZES } from '@/constants/theme';
import { NotificationsProvider } from '@/context/NotificationsContext';

export default function BFPTabLayout() {
  return (
    <NotificationsProvider>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarButton: HapticTab,
          tabBarActiveTintColor: COLORS.primaryOrange,
          tabBarInactiveTintColor: 'rgba(255, 255, 255, 0.84)',
          tabBarStyle: {
            backgroundColor: COLORS.deepIndigo,
            borderTopColor: 'rgba(255, 255, 255, 0.47)',
            borderTopWidth: 1,
            height: 64,
            paddingTop: 10,
            paddingBottom: 25,
            marginBottom: 5,
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
            title: 'Dashboard',
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="view-dashboard" size={size ?? 24} color={color} />
            ),
          }}
        />

        <Tabs.Screen
          name="incidents"
          options={{
            title: 'Incidents',
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="fire-alert" size={size ?? 24} color={color} />
            ),
          }}
        />

        <Tabs.Screen
          name="alerts"
          options={{
            title: 'Risk Center',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="shield-checkmark" size={size ?? 24} color={color} />
            ),
          }}
        />

        <Tabs.Screen
          name="response"
          options={{
            title: 'Response',
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="fire-truck" size={size ?? 24} color={color} />
            ),
          }}
        />
      </Tabs>
    </NotificationsProvider>
  );
}