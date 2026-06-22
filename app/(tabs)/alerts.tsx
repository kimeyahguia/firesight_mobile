import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const COLORS = {
  darkSlate: '#111827',
  slateText: '#475569',
  background: '#F8FAFC',
};

export default function AlertsScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <Ionicons name="notifications" size={40} color={COLORS.darkSlate} />
      <Text style={styles.title}>Latest Alerts</Text>
      <Text style={styles.subtitle}>Coming soon</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.darkSlate,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.slateText,
  },
});