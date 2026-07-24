// app/signin.tsx
import { API_ENDPOINTS } from '@/constants/api';
import { COLORS } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useMemo, useRef, useState } from 'react';
import {
  Animated,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';

import FormInput from '@/components/common/FormInput';
import PrimaryButton from '@/components/common/PrimaryButton';

// ────────────────────────────────────────────────────────────
// Validation helpers (UNCHANGED)
// ────────────────────────────────────────────────────────────

const PH_PHONE_REGEX = /^(09|\+639)\d{9}$/;

function validatePhone(phone: string): string | null {
  const trimmed = phone.trim().replace(/\s+/g, '');
  if (!trimmed) return 'Phone number is required.';
  if (!PH_PHONE_REGEX.test(trimmed)) {
    return 'Enter a valid PH phone number (e.g. 09171234567).';
  }
  return null;
}

function validatePassword(password: string): string | null {
  if (!password) return 'Password is required.';
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
  if (!trimmed) return 'Full name is required.';
  if (trimmed.length < 2) {
    return 'Please enter your full name.';
  }
  if (!/^[a-zA-ZñÑ\s.'-]+$/.test(trimmed)) {
    return 'Name contains invalid characters.';
  }
  return null;
}

function validateConfirmPassword(password: string, confirm: string): string | null {
  if (!confirm) return 'Please confirm your password.';
  if (password !== confirm) return 'Passwords do not match.';
  return null;
}

// ────────────────────────────────────────────────────────────
// Password strength logic (UNCHANGED)
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
  empty: { label: 'Requirements', color: 'rgba(255,255,255,0.5)' },
  weak: { label: 'Weak', color: '#EF4444' },
  medium: { label: 'Medium', color: '#F59E0B' },
  strong: { label: 'Strong', color: '#22C55E' },
};

// ────────────────────────────────────────────────────────────
// Presentation-only helper: adds a tactile "press" scale to any
// tappable element without touching business logic. Purely
// additive — wraps existing onPress handlers.
// ────────────────────────────────────────────────────────────

function Tactile({
  children,
  onPress,
  style,
  disabled,
  scaleTo = 0.96,
  hitSlop,
}: {
  children: React.ReactNode;
  onPress?: () => void;
  style?: any;
  disabled?: boolean;
  scaleTo?: number;
  hitSlop?: any;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const animateTo = (value: number) => {
    Animated.spring(scale, {
      toValue: value,
      useNativeDriver: true,
      speed: 40,
      bounciness: 6,
    }).start();
  };

  return (
    <Animated.View style={[{ transform: [{ scale }] }, style]}>
      <TouchableOpacity
        activeOpacity={0.85}
        disabled={disabled}
        hitSlop={hitSlop}
        onPressIn={() => animateTo(scaleTo)}
        onPressOut={() => animateTo(1)}
        onPress={onPress}
      >
        {children}
      </TouchableOpacity>
    </Animated.View>
  );
}

// ────────────────────────────────────────────────────────────
// Password Strength Meter Component (restyled as a grouped card)
// ────────────────────────────────────────────────────────────

function PasswordStrengthMeter({ password }: { password: string }) {
  const { level, score } = useMemo(() => getPasswordStrength(password), [password]);
  const checks = useMemo(() => getPasswordChecks(password), [password]);

  const config = STRENGTH_CONFIG[level];
  const totalBars = 5;

  return (
    <View style={styles.strengthWrap}>
      {/* Strength bar — dagdag na palaging nakikita para makita agad
          ni user yung mga password requirements bago pa mag-type ── */}
      <View style={styles.strengthHeaderRow}>
        <Text style={styles.strengthHeaderLabel}>Password Strength</Text>
        <Text style={[styles.strengthLabel, { color: config.color }]}>{config.label}</Text>
      </View>
      <View style={styles.strengthBarRow}>
        {Array.from({ length: totalBars }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.strengthBarSegment,
              { backgroundColor: i < score ? config.color : 'rgba(255,255,255,0.10)' },
            ]}
          />
        ))}
      </View>

      {/* Checklist */}
      <View style={styles.checklistWrap}>
        {checks.map((check, index) => (
          <View key={index} style={styles.checklistRow}>
            <Ionicons
              name={check.passed ? 'checkmark-circle' : 'ellipse-outline'}
              size={15}
              color={check.passed ? '#22C55E' : 'rgba(255,255,255,0.35)'}
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
  const [success, setSuccess] = useState(false);

  const phoneInputRef = useRef<TextInput>(null);
  const passwordInputRef = useRef<TextInput>(null);
  const confirmInputRef = useRef<TextInput>(null);

  const clearErrors = () => {
    setNameError('');
    setPhoneError('');
    setPasswordError('');
    setConfirmError('');
    setFormError('');
  };

  // ── DAGDAG: real-time validity check para sa disabled state ng button ──
  const isFormValid =
    !validateName(name) &&
    !validatePhone(phone) &&
    !validatePassword(password) &&
    !validateConfirmPassword(password, confirmPassword);

  const handleSignUp = async () => {
    Keyboard.dismiss();
    clearErrors();

    const trimmedName = name.trim();
    const trimmedPhone = phone.trim().replace(/\s+/g, '');

    const nameErr = validateName(trimmedName);
    const phoneErr = validatePhone(trimmedPhone);
    const passwordErr = validatePassword(password);
    const confirmErr = validateConfirmPassword(password, confirmPassword);

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
    if (confirmErr) {
      setConfirmError(confirmErr);
      hasError = true;
    }

    if (hasError) return;

    // I-normalize yung mga value bago ipadala sa backend
    setName(trimmedName);
    setPhone(trimmedPhone);

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
        if (response.status === 409) {
          // ── DAGDAG: ipakita sa ilalim mismo ng Phone field yung
          // "already registered" error, hindi generic banner na lang ──
          setPhoneError(result.message || 'Phone number already registered.');
        } else if (response.status >= 500) {
          setFormError('Something went wrong on our end. Please try again in a moment.');
        } else {
          setFormError(result.message || 'Sign up failed. Please try again.');
        }
        setLoading(false);
        return;
      }

      setPassword('');
      setConfirmPassword('');
      setLoading(false);

      // ── DAGDAG: ipakita muna yung success feedback bago mag-redirect
      // sa Login screen (hindi na auto-login diretso sa app) ──
      setSuccess(true);
      setTimeout(() => {
        router.replace('/login');
      }, 1600);
    } catch {
      setFormError('Connection error. Please check your internet connection and try again.');
      setLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={['#0B1330', '#171347', '#1E1B4B']}
      start={{ x: 0.1, y: 0 }}
      end={{ x: 0.9, y: 1 }}
      style={styles.gradientFill}
    >
      {/* ── Ambient background layer: soft glows, purely decorative ── */}
      <View style={styles.ambientLayer} pointerEvents="none">
        <LinearGradient
          colors={['rgba(109,91,208,0.30)', 'rgba(109,91,208,0)']}
          style={styles.glowTopLeft}
        />
        <LinearGradient
          colors={['rgba(249,115,22,0.20)', 'rgba(249,115,22,0)']}
          style={styles.glowBottomRight}
        />
      </View>

      <KeyboardAvoidingView
        style={styles.flexFill}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* ── DAGDAG: dismiss keyboard pag tapped sa labas ng inputs ── */}
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {/* Back button */}
            <Tactile
              onPress={() => router.back()}
              disabled={loading}
              style={styles.backButtonWrap}
              scaleTo={0.9}
            >
              <View style={styles.backButton}>
                <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
              </View>
            </Tactile>

            {/* Logo / Brand — matches Login screen branding */}
            <View style={styles.brandWrap}>
              <View style={styles.logoCircle}>
                <Image
                  source={require('@/assets/images/firesight_logo_transparent.png')}
                  style={styles.logoImage}
                  resizeMode="contain"
                />
              </View>
              <Text style={styles.appName}>
                FIRE<Text style={styles.appNameAccent}>SIGHT</Text>
              </Text>
              
            </View>

            {success ? (
              // ── DAGDAG: Success state — palitan muna ng confirmation
              // bago mag-redirect sa Login ──
              <View style={styles.successCard}>
                <View style={styles.successIconCircle}>
                  <Ionicons name="checkmark" size={36} color="#FFFFFF" />
                </View>
                <Text style={styles.successTitle}>Account created!</Text>
                <Text style={styles.successSubtitle}>Taking you to the Login screen…</Text>
              </View>
            ) : (
              <>
                {/* Floating form card */}
                <View style={styles.cardShadowWrap}>
                  <View style={styles.card}>
                    <Text style={styles.cardTitle}>Create Account</Text>
                    <Text style={styles.cardSubtitle}>Sign up to report incidents and receive alerts</Text>

                    <View style={styles.form}>
                      <FormInput
                        label="Full Name"
                        icon="person-outline"
                        placeholder="Juan Dela Cruz"
                        value={name}
                        onChangeText={(text) => {
                          setName(text);
                          if (nameError) setNameError('');
                          if (formError) setFormError('');
                        }}
                        onBlur={() => {
                          const cleaned = name.trim();
                          if (cleaned !== name) setName(cleaned);
                        }}
                        error={nameError}
                        autoCapitalize="words"
                        returnKeyType="next"
                        onSubmitEditing={() => phoneInputRef.current?.focus()}
                        blurOnSubmit={false}
                        editable={!loading}
                      />
                      <FormInput
                        ref={phoneInputRef}
                        label="Phone Number"
                        icon="call-outline"
                        placeholder="09171234567"
                        keyboardType="phone-pad"
                        value={phone}
                        onChangeText={(text) => {
                          setPhone(text);
                          if (phoneError) setPhoneError('');
                          if (formError) setFormError('');
                        }}
                        onBlur={() => {
                          const cleaned = phone.trim();
                          if (cleaned !== phone) setPhone(cleaned);
                        }}
                        error={phoneError}
                        returnKeyType="next"
                        onSubmitEditing={() => passwordInputRef.current?.focus()}
                        blurOnSubmit={false}
                        editable={!loading}
                      />
                      <FormInput
                        ref={passwordInputRef}
                        label="Password"
                        icon="lock-closed-outline"
                        placeholder="At least 8 characters"
                        isPassword
                        value={password}
                        onChangeText={(text) => {
                          setPassword(text);
                          if (passwordError) setPasswordError('');
                          if (formError) setFormError('');
                        }}
                        error={passwordError}
                        autoCapitalize="none"
                        autoCorrect={false}
                        returnKeyType="next"
                        onSubmitEditing={() => confirmInputRef.current?.focus()}
                        blurOnSubmit={false}
                        editable={!loading}
                      />

                      {/* Live password strength meter + checklist — palaging
                          nakikita para alam agad ni user yung requirements ── */}
                      <PasswordStrengthMeter password={password} />

                      <FormInput
                        ref={confirmInputRef}
                        label="Confirm Password"
                        icon="lock-closed-outline"
                        placeholder="Re-enter your password"
                        isPassword
                        value={confirmPassword}
                        onChangeText={(text) => {
                          setConfirmPassword(text);
                          if (confirmError) setConfirmError('');
                          if (formError) setFormError('');
                        }}
                        error={confirmError}
                        autoCapitalize="none"
                        autoCorrect={false}
                        returnKeyType="done"
                        onSubmitEditing={handleSignUp}
                        editable={!loading}
                      />

                      {formError ? (
                        <View style={styles.formErrorWrap}>
                          <Ionicons name="alert-circle" size={14} color="#FCA5A5" style={{ marginRight: 6 }} />
                          <Text style={styles.formErrorText}>{formError}</Text>
                        </View>
                      ) : null}

                      <PrimaryButton
                        label="Create Account"
                        variant="primary"
                        fullWidth
                        loading={loading}
                        disabled={!isFormValid || loading}
                        onPress={handleSignUp}
                        style={styles.signupButton}
                      />
                    </View>
                  </View>
                </View>

                {/* Footer */}
                <View style={styles.footerRow}>
                  <Text style={styles.footerText}>Already have an account? </Text>
                  <Tactile onPress={() => router.back()} disabled={loading} scaleTo={0.95}>
                    <Text style={styles.footerLink}>Log In</Text>
                  </Tactile>
                </View>
              </>
            )}
          </ScrollView>
        </TouchableWithoutFeedback>
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
    paddingTop: 64,
    paddingBottom: 44,
    justifyContent: 'center',
  },

  // ── Ambient background ──
  ambientLayer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  glowTopLeft: {
    position: 'absolute',
    top: -140,
    left: -100,
    width: 320,
    height: 320,
    borderRadius: 320,
  },
  glowBottomRight: {
    position: 'absolute',
    bottom: -160,
    right: -120,
    width: 360,
    height: 360,
    borderRadius: 360,
  },

  // ── Back button ──
  backButtonWrap: {
    position: 'absolute',
    top: 22,
    left: 24,
    zIndex: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Brand — mirrors Login screen presentation ──
  brandWrap: {
    alignItems: 'center',
    marginBottom: 15,
  },
  logoImage: {
    width: 70,
    height: 70,
  },
  logoCircle: {
    width: 72,
    height: 62,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 18,
    elevation: 6,
  },
  appName: {
    fontSize: 40,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
    marginBottom: 5,
  },
  appNameAccent: { color: COLORS.primaryOrange },
  
  // ── Floating card ──
  cardShadowWrap: {
    borderRadius: 28,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.35,
    shadowRadius: 30,
    elevation: 10,
    marginBottom: 26,
  },
  card: {
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: '#161339',
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 24,
    overflow: 'hidden',
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
    letterSpacing: 0.2,
  },
  cardSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 22,
    lineHeight: 18,
  },

  form: { marginTop: 2 },

  // ── Password strength meter — grouped Apple-style card ──
  strengthWrap: {
    marginTop: -8,
    marginBottom: 18,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    borderRadius: 18,
    padding: 16,
  },
  strengthHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  strengthHeaderLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.45)',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  strengthBarRow: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 14,
  },
  strengthBarSegment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  strengthLabel: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  checklistWrap: {
    gap: 8,
  },
  checklistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checklistText: {
    fontSize: 12,
    fontWeight: '500',
  },

  formErrorWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(252,165,165,0.08)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
    marginTop: -4,
  },
  formErrorText: {
    fontSize: 12.5,
    color: '#FCA5A5',
    fontWeight: '600',
    flexShrink: 1,
  },

  signupButton: {
    marginTop: 6,
    borderRadius: 18,
    shadowColor: COLORS.primaryOrange,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 5,
  },

  // ── Footer ──
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 4,
  },
  footerText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
  },
  footerLink: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primaryOrange,
  },

  // ── Success state — floating card treatment ──
  successCard: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 24,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: '#161339',
    gap: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.35,
    shadowRadius: 30,
    elevation: 10,
  },
  successIconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#22C55E',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 6,
  },
  successTitle: {
    fontSize: 21,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  successSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.55)',
  },
});