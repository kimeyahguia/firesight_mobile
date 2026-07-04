import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS, FONT_SIZES } from '@/constants/theme';
import { API_ENDPOINTS } from '@/constants/api';

import FormInput from '@/components/common/FormInput';
import PrimaryButton from '@/components/common/PrimaryButton';

export default function LoginScreen() {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError('');

    if (!phone || !password) {
      setError('Please fill in both fields.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(API_ENDPOINTS.login, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, password }),
      });
      const result = await response.json();

      if (!result.success) {
        setError(result.message || 'Login failed.');
        setLoading(false);
        return;
      }

      await AsyncStorage.setItem('user_id', String(result.user.id));
      await AsyncStorage.setItem('user_data', JSON.stringify(result.user));
      await AsyncStorage.setItem('user_role', result.user.role);

      setLoading(false);

      if (result.user.role === 'personnel') {
        router.replace('/(bfp_tabs)');
      } else {
        router.replace('/(tabs)');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Connection error. Please try again.');
      setLoading(false);
    }
  };

  return (
      <LinearGradient
        colors={['#0F1C3F', '#1E1B4B']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientFill}
      >
      <KeyboardAvoidingView
        style={styles.flexFill}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.content}>

          {/* Logo / Brand */}
          <View style={styles.brandWrap}>
            <View style={styles.logoCircle}>
              <Ionicons name="flame" size={30} color="#FFFFFF" />
            </View>
            <Text style={styles.stationLabel}>BFP LIAN FIRE STATION</Text>
            <Text style={styles.appName}>
              FIRE<Text style={styles.appNameAccent}>SIGHT</Text>
            </Text>
            <Text style={styles.tagline}>
              Community fire safety and reporting app for Lian, Batangas
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <FormInput
              label="Phone Number"
              icon="call-outline"
              placeholder="0917 123 4567"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
            />
            <FormInput
              label="Password"
              icon="lock-closed-outline"
              placeholder="Enter your password"
              isPassword
              value={password}
              onChangeText={setPassword}
              error={error}
            />

            <TouchableOpacity activeOpacity={0.6} style={styles.forgotWrap}>
              <Text style={styles.forgotText}>Forgot password?</Text>
            </TouchableOpacity>

            <PrimaryButton
              label="Log In"
              variant="primary"
              fullWidth
              loading={loading}
              onPress={handleLogin}
              style={styles.loginButton}
            />

            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.browseButton}
              onPress={() => router.replace('/(tabs)')}
            >
              <Text style={styles.browseButtonText}>Browse Without Logging In</Text>
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Don&apos;t have an account? </Text>
            <TouchableOpacity activeOpacity={0.6} onPress={() => router.push('/sign_in')}>
              <Text style={styles.footerLink}>Sign Up</Text>
            </TouchableOpacity>
          </View>

        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradientFill: { flex: 1 },
  flexFill: { flex: 1 },
  content: {
    flex: 1,
    paddingHorizontal: 28,
    justifyContent: 'center',
  },

  // ── Brand ──
  brandWrap: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoCircle: {
    width: 68,
    height: 68,
    borderRadius: 22,
    backgroundColor: COLORS.primaryOrange,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
    shadowColor: COLORS.primaryOrange,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 6,
  },
  stationLabel: {
    fontSize: FONT_SIZES.tiny,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 1.6,
    marginBottom: 10,
  },
  appName: {
    fontSize: FONT_SIZES.heroTitle,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
    marginBottom: 10,
  },
  appNameAccent: { color: COLORS.primaryOrange },
  tagline: {
    fontSize: FONT_SIZES.secondary,
    color: 'rgba(255,255,255,0.65)',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 16,
  },

  // ── Form ──
  form: { marginBottom: 20 },
  forgotWrap: {
    alignSelf: 'flex-end',
    marginBottom: 28,
    marginTop: -6,
  },
  forgotText: {
    fontSize: FONT_SIZES.caption,
    fontWeight: '700',
    color: COLORS.primaryOrange,
  },
  loginButton: {
    marginTop: 4,
    shadowColor: COLORS.primaryOrange,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
  },

  // Secondary action — de-emphasized so it doesn't compete with Log In
  browseButton: {
    marginTop: 14,
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  browseButtonText: {
    fontSize: FONT_SIZES.secondary,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
    textDecorationLine: 'underline',
  },

  // ── Footer ──
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 4,
  },
  footerText: {
    fontSize: FONT_SIZES.secondary,
    color: 'rgba(255,255,255,0.55)',
  },
  footerLink: {
    fontSize: FONT_SIZES.secondary,
    fontWeight: '700',
    color: COLORS.primaryOrange,
  },
});