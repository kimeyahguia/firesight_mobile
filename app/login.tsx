import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
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

      setLoading(false);
      router.replace('/(tabs)');
    } catch (err) {
      console.error('Login error:', err);
      setError('Connection error. Please try again.');
      setLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={[COLORS.deepIndigo, COLORS.accentViolet]}
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
              <Ionicons name="flame" size={32} color="#FFFFFF" />
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
              activeOpacity={0.85}
              style={styles.browseButton}
              onPress={() => router.replace('/(tabs)')}
            >
              <Text style={styles.browseButtonText}>Browse Without Logging In</Text>
            </TouchableOpacity>
          </View>

          {/* BFP Responder Entry */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.bfpButton}
            onPress={() => router.replace('/(bfp_tabs)')}
          >
            <View style={styles.bfpButtonLeft}>
              <View style={styles.bfpIconWrap}>
                <MaterialCommunityIcons name="fire-truck" size={18} color={COLORS.primaryOrange} />
              </View>
              <View>
                <Text style={styles.bfpButtonTitle}>BFP Responder Portal</Text>
                <Text style={styles.bfpButtonSub}>For authorized BFP Lian personnel only</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.4)" />
          </TouchableOpacity>

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
    paddingHorizontal: 24,
    justifyContent: 'center',
  },

  // Brand
  brandWrap: {
    alignItems: 'center',
    marginBottom: 36,
  },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: COLORS.primaryOrange,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: COLORS.primaryOrange,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  stationLabel: {
    fontSize: FONT_SIZES.tiny,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.55)',
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  appName: {
    fontSize: FONT_SIZES.screenTitle,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  appNameAccent: { color: COLORS.primaryOrange },
  tagline: {
    fontSize: FONT_SIZES.secondary,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 12,
  },

  // Form
  form: { marginBottom: 16 },
  forgotWrap: {
    alignSelf: 'flex-end',
    marginBottom: 24,
    marginTop: -4,
  },
  forgotText: {
    fontSize: FONT_SIZES.caption,
    fontWeight: '600',
    color: COLORS.primaryOrange,
  },
  loginButton: { marginTop: 4 },
  browseButton: {
    marginTop: 12,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  browseButtonText: {
    fontSize: FONT_SIZES.secondary,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Divider
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
    marginTop: 4,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  dividerText: {
    fontSize: FONT_SIZES.caption,
    color: 'rgba(255,255,255,0.4)',
    fontWeight: '600',
  },

  // BFP Responder button
  bfpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 14,
    paddingVertical: 13,
    marginBottom: 28,
  },
  bfpButtonLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bfpIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(249,115,22,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(249,115,22,0.25)',
  },
  bfpButtonTitle: {
    fontSize: FONT_SIZES.secondary,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  bfpButtonSub: {
    fontSize: FONT_SIZES.tiny,
    color: 'rgba(255,255,255,0.45)',
    fontWeight: '500',
  },

  // Footer
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  footerText: {
    fontSize: FONT_SIZES.secondary,
    color: 'rgba(255,255,255,0.6)',
  },
  footerLink: {
    fontSize: FONT_SIZES.secondary,
    fontWeight: '700',
    color: COLORS.primaryOrange,
  },
});