import { COLORS } from '@/constants/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

export default function Bootstrap() {
  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      const userId = await AsyncStorage.getItem('user_id');
      const userRole = await AsyncStorage.getItem('user_role');
      const rememberMe = await AsyncStorage.getItem('remember_me');

      if (userId && rememberMe === 'true') {
        // ── May naka-save na session AT gustong i-remember ── auto-login
        if (userRole === 'personnel') {
          router.replace('/(bfp)/(bfp_tabs)');
        } else {
          router.replace('/(tabs)');
        }
        return;
      }

      // ── Wala o hindi gustong i-remember — linisin ang lumang session ──
      if (rememberMe !== 'true') {
        await AsyncStorage.multiRemove(['user_id', 'user_data', 'user_role']);
      }
      router.replace('/login');
    } catch (err) {
      console.error('Session check error:', err);
      router.replace('/login');
    }
  };

  return (
    <LinearGradient
      colors={['#0F1C3F', '#1E1B4B']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.fill}
    >
      <View style={styles.centerBox}>
        <ActivityIndicator size="large" color={COLORS.primaryOrange} />
        <Text style={styles.text}>Loading FireSight…</Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  centerBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 },
  text: { fontSize: 13.5, color: 'rgba(255,255,255,0.7)', fontWeight: '600' },
});