// app/signin.tsx
import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS } from '@/constants/theme';
import { API_ENDPOINTS } from '@/constants/api';

import FormInput from '@/components/common/FormInput';
import PrimaryButton from '@/components/common/PrimaryButton';

// ────────────────────────────────────────────────────────────
// Validation helpers
// ────────────────────────────────────────────────────────────

const PH_PHONE_REGEX = /^(09|\+639)\d{9}$/;

function validatePhone(phone: string): string | null {
  const trimmed = phone.trim().replace(/\s+/g, '');
  if (!PH_PHONE_REGEX.test(trimmed)) {
    return 'Enter a valid PH phone number (e.g. 09171234567).';
  }
  return null;
}

function validatePassword(password: string): string | null {
  if (password.length < 8) {
    return 'Password must be at least 8 characters.';
  }
  if (!/[A-Z]/.test(password)) {
    return 'Password must include at least one uppercase letter.';
  }
  if (!/[a-z]/.test(password)) {
    return 'Password must include at least one lowercase letter.';
  }
  if (!/[0-9]/.test(password)) {
    return 'Password must include at least one number.';
  }
  return null;
}

function validateName(name: string): string | null {
  const trimmed = name.trim();
  if (trimmed.length < 2) {
    return 'Please enter your full name.';
  }
  if (!/^[a-zA-ZñÑ\s.'-]+$/.test(trimmed)) {
    return 'Name contains invalid characters.';
  }
  return null;
}

// ────────────────────────────────────────────────────────────
// Password strength logic
// ────────────────────────────────────────────────────────────

type StrengthLevel = 'empty' | 'weak' | 'medium' | 'strong';

interface PasswordCheck {
  label: string;
  passed: boolean;
}

function getPasswordChecks(password: string): PasswordCheck[] {
  return [
    { label: 'At least 8 characters', passed: password.length >= 8 },
    { label: 'One uppercase letter (A-Z)', passed: /[A-Z]/.test(password) },
    { label: 'One lowercase letter (a-z)', passed: /[a-z]/.test(password) },
    { label: 'One number (0-9)', passed: /[0-9]/.test(password) },
    { label: 'One special character (!@#$%...)', passed: /[^A-Za-z0-9]/.test(password) },
  ];
}

function getPasswordStrength(password: string): { level: StrengthLevel; score: number } {
  if (password.length === 0) return { level: 'empty', score: 0 };

  const checks = getPasswordChecks(password);
  const passedCount = checks.filter((c) => c.passed).length;

  if (passedCount <= 2) return { level: 'weak', score: passedCount };
  if (passedCount <= 4) return { level: 'medium', score: passedCount };
  return { level: 'strong', score: passedCount };
}

const STRENGTH_CONFIG: Record<StrengthLevel, { label: string; color: string }> = {
  empty: { label: '', color: 'transparent' },
  weak: { label: 'Weak', color: '#EF4444' },
  medium: { label: 'Medium', color: '#F59E0B' },
  strong: { label: 'Strong', color: '#22C55E' },
};

// ────────────────────────────────────────────────────────────
// Password Strength Meter Component
// ────────────────────────────────────────────────────────────

function PasswordStrengthMeter({ password }: { password: string }) {
  const { level, score } = useMemo(() => getPasswordStrength(password), [password]);
  const checks = useMemo(() => getPasswordChecks(password), [password]);

  if (password.length === 0) return null;

  const config = STRENGTH_CONFIG[level];
  const totalBars = 5;

  return (
    <View style={styles.strengthWrap}>
      {/* Strength bar */}
      <View style={styles.strengthBarRow}>
        {Array.from({ length: totalBars }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.strengthBarSegment,
              { backgroundColor: i < score ? config.color : 'rgba(255,255,255,0.15)' },
            ]}
          />
        ))}
      </View>
      <Text style={[styles.strengthLabel, { color: config.color }]}>
        {config.label}
      </Text>

      {/* Checklist */}
      <View style={styles.checklistWrap}>
        {checks.map((check, index) => (
          <View key={index} style={styles.checklistRow}>
            <Ionicons
              name={check.passed ? 'checkmark-circle' : 'ellipse-outline'}
              size={14}
              color={check.passed ? '#22C55E' : 'rgba(255,255,255,0.4)'}
            />
            <Text
              style={[
                styles.checklistText,
                { color: check.passed ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.4)' },
              ]}
            >
              {check.label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export default function SignInScreen() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [nameError, setNameError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmError, setConfirmError] = useState('');
  const [formError, setFormError] = useState('');

  const [loading, setLoading] = useState(false);

  const clearErrors = () => {
    setNameError('');
    setPhoneError('');
    setPasswordError('');
    setConfirmError('');
    setFormError('');
  };

  const handleSignUp = async () => {
    clearErrors();

    const trimmedName = name.trim();
    const trimmedPhone = phone.trim().replace(/\s+/g, '');

    const nameErr = validateName(trimmedName);
    const phoneErr = validatePhone(trimmedPhone);
    const passwordErr = validatePassword(password);

    let hasError = false;

    if (nameErr) {
      setNameError(nameErr);
      hasError = true;
    }
    if (phoneErr) {
      setPhoneError(phoneErr);
      hasError = true;
    }
    if (passwordErr) {
      setPasswordError(passwordErr);
      hasError = true;
    }
    if (password !== confirmPassword) {
      setConfirmError('Passwords do not match.');
      hasError = true;
    }

    if (hasError) return;

    setLoading(true);

    try {
      const response = await fetch(API_ENDPOINTS.register, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: trimmedName,
          phone: trimmedPhone,
          password: password,
        }),
      });

      let result;
      try {
        result = await response.json();
      } catch {
        setFormError('Unexpected server response. Please try again.');
        setLoading(false);
        return;
      }

      if (!response.ok || !result.success) {
        setFormError(result.message || 'Sign up failed. Please try again.');
        setLoading(false);
        return;
      }

      await AsyncStorage.setItem('user_id', String(result.user.id));
      await AsyncStorage.setItem('user_data', JSON.stringify(result.user));

      setPassword('');
      setConfirmPassword('');

      setLoading(false);
      router.replace('/(tabs)');
    } catch {
      setFormError('Connection error. Please check your network and try again.');
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
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Back button */}
          <TouchableOpacity
            activeOpacity={0.7}
            style={styles.backButton}
            onPress={() => router.back()}
            disabled={loading}
          >
            <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>

          {/* Logo / Brand */}
          <View style={styles.brandWrap}>
            <View style={styles.logoCircle}>
              <Ionicons name="flame" size={32} color="#FFFFFF" />
            </View>
            <Text style={styles.appName}>
              FIRE<Text style={styles.appNameAccent}>SIGHT</Text>
            </Text>
            <Text style={styles.tagline}>Create an account to report incidents and receive alerts</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <FormInput
              label="Full Name"
              icon="person-outline"
              placeholder="Juan Dela Cruz"
              value={name}
              onChangeText={(text) => {
                setName(text);
                if (nameError) setNameError('');
              }}
              error={nameError}
              autoCapitalize="words"
            />
            <FormInput
              label="Phone Number"
              icon="call-outline"
              placeholder="09171234567"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={(text) => {
                setPhone(text);
                if (phoneError) setPhoneError('');
              }}
              error={phoneError}
            />
            <FormInput
              label="Password"
              icon="lock-closed-outline"
              placeholder="At least 8 characters"
              isPassword
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                if (passwordError) setPasswordError('');
              }}
              error={passwordError}
              autoCapitalize="none"
              autoCorrect={false}
            />

            {/* Live password strength meter + checklist */}
            <PasswordStrengthMeter password={password} />

            <FormInput
              label="Confirm Password"
              icon="lock-closed-outline"
              placeholder="Re-enter your password"
              isPassword
              value={confirmPassword}
              onChangeText={(text) => {
                setConfirmPassword(text);
                if (confirmError) setConfirmError('');
              }}
              error={confirmError}
              autoCapitalize="none"
              autoCorrect={false}
            />

            {formError ? <Text style={styles.formErrorText}>{formError}</Text> : null}

            <PrimaryButton
              label="Create Account"
              variant="primary"
              fullWidth
              loading={loading}
              disabled={loading}
              onPress={handleSignUp}
              style={styles.signupButton}
            />
          </View>

          {/* Footer */}
          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity activeOpacity={0.6} onPress={() => router.back()} disabled={loading}>
              <Text style={styles.footerLink}>Log In</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradientFill: { flex: 1 },
  flexFill: { flex: 1 },
  content: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
    justifyContent: 'center',
  },
  backButton: {
    position: 'absolute',
    top: 16,
    left: 24,
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
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
  appName: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  appNameAccent: { color: COLORS.primaryOrange },
  tagline: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 12,
  },
  form: { marginBottom: 24 },

  // Password strength meter
  strengthWrap: {
    marginTop: -8,
    marginBottom: 16,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 14,
    padding: 12,
  },
  strengthBarRow: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 6,
  },
  strengthBarSegment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  strengthLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
  },
  checklistWrap: {
    gap: 5,
  },
  checklistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  checklistText: {
    fontSize: 11.5,
    fontWeight: '500',
  },

  formErrorText: {
    fontSize: 12.5,
    color: '#FCA5A5',
    marginBottom: 12,
    marginTop: -4,
  },
  signupButton: { marginTop: 8 },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  footerText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
  },
  footerLink: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primaryOrange,
  },
});