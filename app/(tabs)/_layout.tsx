import { Tabs } from 'expo-router';
import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { View, StyleSheet, TouchableOpacity, GestureResponderEvent } from 'react-native';

import { HapticTab } from '@/components/haptic-tab';
import { COLORS } from '@/constants/theme';

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
        <Ionicons name="flame" size={26} color="#FFFFFF" />
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
        tabBarInactiveTintColor: COLORS.slateText,
        tabBarStyle: {
          backgroundColor: COLORS.card,
          borderTopColor: COLORS.border,
          borderTopWidth: 1,
          height: 64,
          paddingTop: 8,
          paddingBottom: 10,
        },
        tabBarLabelStyle: {
          fontSize: 11,
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
        name="contacts"
        options={{
          title: 'Contacts',
          tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            <Ionicons name="call" size={size ?? 24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="alerts"
        options={{
          title: 'Alerts',
          tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            <Ionicons name="notifications" size={size ?? 24} color={color} />
          ),
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
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primaryOrange,
    alignItems: 'center',
    justifyContent: 'center',
    top: -22,
    borderWidth: 4,
    borderColor: COLORS.card,
    shadowColor: COLORS.primaryOrange,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
});