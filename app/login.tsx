import { API_ENDPOINTS } from '@/constants/api';
import { COLORS, FONT_SIZES } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';

import React, { useEffect, useRef, useState } from 'react';
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
  View
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

// ────────────────────────────────────────────────────────────
// Small presentation-only helper: adds a tactile "press" scale
// to any tappable element without touching business logic.
// Purely additive — wraps existing onPress handlers.
// ────────────────────────────────────────────────────────────

function Tactile({
  children,
  onPress,
  style,
  disabled,
  scaleTo = 0.96,
  hitSlop,
  accessibilityRole,
}: {
  children: React.ReactNode;
  onPress?: () => void;
  style?: any;
  disabled?: boolean;
  scaleTo?: number;
  hitSlop?: any;
  accessibilityRole?: any;
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
        accessibilityRole={accessibilityRole}
        onPressIn={() => animateTo(scaleTo)}
        onPressOut={() => animateTo(1)}
        onPress={onPress}
      >
        {children}
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function LoginScreen() {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');

  const [phoneError, setPhoneError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [formError, setFormError] = useState('');

  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(true); // ← DAGDAG: naka-default checked

  // ── DAGDAG: listahan ng lahat ng phone number na na-login na dati
  // (hindi lang yung pinaka-huli) — dito kukunin yung mga suggestion ──
  const [savedPhones, setSavedPhones] = useState<string[]>([]);
  const [showPhoneSuggestion, setShowPhoneSuggestion] = useState(false);

  const passwordInputRef = useRef<TextInput>(null);

  // Micro-interaction: the Remember Me checkbox gets a gentle "pop"
  // when toggled. Presentation-only, does not affect state logic.
  const checkScale = useRef(new Animated.Value(1)).current;

  // ── DAGDAG: i-load yung listahan ng naka-save na phone numbers.
  // Hindi na ito direktang inilalagay sa input — hihintayin munang i-tap
  // ni user yung Phone field bago lumabas yung mga suggestion ──
  useEffect(() => {
    (async () => {
      try {
        const storedList = await AsyncStorage.getItem('saved_phones');
        if (storedList) {
          const parsed = JSON.parse(storedList);
          if (Array.isArray(parsed)) {
            setSavedPhones(parsed.filter((p): p is string => typeof p === 'string'));
          }
        } else {
          // ── Migration: dati iisang 'saved_phone' key lang — ilipat sa bagong listahan ──
          const legacy = await AsyncStorage.getItem('saved_phone');
          if (legacy) {
            setSavedPhones([legacy]);
            await AsyncStorage.setItem('saved_phones', JSON.stringify([legacy]));
            await AsyncStorage.removeItem('saved_phone');
          }
        }

        const savedRememberMe = await AsyncStorage.getItem('remember_me');
        if (savedRememberMe === 'true') setRememberMe(true);
      } catch (err) {
        console.error('Failed to load saved phone numbers:', err);
      }
    })();
  }, []);

  function applySuggestedPhone(number: string) {
    setPhone(number);
    setShowPhoneSuggestion(false);
    if (phoneError) setPhoneError('');
  }

  async function removeSavedPhone(number: string) {
    const updated = savedPhones.filter((p) => p !== number);
    setSavedPhones(updated);
    try {
      await AsyncStorage.setItem('saved_phones', JSON.stringify(updated));
    } catch (err) {
      console.error('Failed to update saved phone list:', err);
    }
  }

  function toggleRememberMe() {
    Animated.sequence([
      Animated.spring(checkScale, { toValue: 0.8, useNativeDriver: true, speed: 50, bounciness: 8 }),
      Animated.spring(checkScale, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 10 }),
    ]).start();
    setRememberMe((prev) => !prev);
  }

  // ── DAGDAG: real-time validity check para sa disabled state ng button ──
  const trimmedPhone = phone.trim();
  const isFormValid = PH_PHONE_REGEX.test(trimmedPhone.replace(/\s+/g, '')) && password.trim().length > 0;

  const handleLogin = async () => {
    Keyboard.dismiss();
    setFormError('');

    const trimmedPass = password.trim();
    const phoneErr = validatePhone(phone);
    let hasError = false;

    if (phoneErr) {
      setPhoneError(phoneErr);
      hasError = true;
    } else {
      setPhoneError('');
    }

    if (!trimmedPass) {
      setPasswordError('Password is required.');
      hasError = true;
    } else {
      setPasswordError('');
    }

    if (hasError) return;

    // I-normalize yung values bago ipadala sa backend
    const cleanPhone = trimmedPhone.replace(/\s+/g, '');
    setPhone(cleanPhone);
    setPassword(trimmedPass);

    setLoading(true);

    try {
      const response = await fetch(API_ENDPOINTS.login, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: cleanPhone, password: trimmedPass }),
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
        if (response.status >= 500) {
          setFormError('Something went wrong on our end. Please try again in a moment.');
        } else if (response.status === 401) {
          setFormError('Incorrect phone number or password.');
        } else {
          setFormError(result.message || 'Login failed. Please try again.');
        }
        setLoading(false);
        return;
      }

      await AsyncStorage.setItem('user_id', String(result.user.id));
      await AsyncStorage.setItem('user_data', JSON.stringify(result.user));
      await AsyncStorage.setItem('user_role', result.user.role);
      // ── DAGDAG: i-save yung remember_me flag ──
      await AsyncStorage.setItem('remember_me', rememberMe ? 'true' : 'false');

      // ── DAGDAG: idagdag yung phone number na ito sa listahan ng naka-save
      // (pinaka-bago sa taas, walang duplicate, max 5 lang) ──
      if (rememberMe) {
        try {
          const updatedList = [cleanPhone, ...savedPhones.filter((p) => p !== cleanPhone)].slice(0, 5);
          setSavedPhones(updatedList);
          await AsyncStorage.setItem('saved_phones', JSON.stringify(updatedList));
        } catch (err) {
          console.error('Failed to update saved phone list:', err);
        }
        await AsyncStorage.removeItem('saved_password'); // linisin yung dating naka-save na password (kung meron)
      } else {
        await AsyncStorage.multiRemove(['saved_phone', 'saved_password']);
      }

      setLoading(false);

      if (result.user.role === 'personnel') {
        router.replace('/(bfp)/(bfp_tabs)');
      } else {
        router.replace('/(tabs)');
      }
    } catch (err) {
      console.error('Login error:', err);
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
      {/* ── Ambient background layer: soft glows + blurred decorative
          shapes. Purely decorative, sits behind all content. ── */}
      <View style={styles.ambientLayer} pointerEvents="none">
        <LinearGradient
          colors={['rgba(109,91,208,0.35)', 'rgba(109,91,208,0)']}
          style={styles.glowTopLeft}
        />
        <LinearGradient
          colors={['rgba(249,115,22,0.22)', 'rgba(249,115,22,0)']}
          style={styles.glowBottomRight}
        />
        <LinearGradient
          colors={['rgba(255,255,255,0.06)', 'rgba(255,255,255,0)']}
          style={styles.glowCenter}
        />
      </View>

      <KeyboardAvoidingView
        style={styles.flexFill}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {/* ── DAGDAG: dismiss keyboard pag tapped sa labas ng inputs, at
            ScrollView para hindi matakpan ng keyboard yung Login button ── */}
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Logo / Brand */}
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
              <Text style={styles.stationLabel}>BFP LIAN FIRE STATION</Text>
              
            </View>

            {/* ── Floating authentication card ── */}
            <View style={styles.cardShadowWrap}>
              <View style={styles.card}>

                <View style={styles.form}>
                  <FormInput
                    label="Phone Number"
                    icon="call-outline"
                    placeholder="0917 123 4567"
                    keyboardType="phone-pad"
                    value={phone}
                    onFocus={() => {
                      if (savedPhones.length > 0) setShowPhoneSuggestion(true);
                    }}
                    onChangeText={(text) => {
                      setPhone(text);
                      setShowPhoneSuggestion(false);
                      if (phoneError) setPhoneError('');
                      if (formError) setFormError('');
                    }}
                    onBlur={() => {
                      // ── DAGDAG: konting delay bago itago yung suggestion, para
                      // may time maka-register yung tap sa suggestion chip ──
                      setTimeout(() => setShowPhoneSuggestion(false), 150);
                      const cleaned = phone.trim();
                      if (cleaned !== phone) setPhone(cleaned);
                    }}
                    error={phoneError}
                    returnKeyType="next"
                    onSubmitEditing={() => passwordInputRef.current?.focus()}
                    blurOnSubmit={false}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />

                  {/* ── DAGDAG: Suggestion list — redesigned as Apple-style
                      rounded account chips. Same data + handlers as before,
                      only the presentation changed (list rows → chips). ── */}
                  {showPhoneSuggestion && savedPhones.length > 0 && (
                    <View style={styles.suggestionWrap}>
                      <Text style={styles.suggestionLabel}>Saved accounts</Text>
                      <View style={styles.chipRow}>
                        {savedPhones.map((num) => (
                          <View key={num} style={styles.chip}>
                            <Tactile
                              onPress={() => applySuggestedPhone(num)}
                              style={styles.chipSelectArea}
                              scaleTo={0.94}
                            >
                              <View style={styles.chipInner}>
                                <View style={styles.chipIconWrap}>
                                  <Ionicons name="person" size={12} color={COLORS.primaryOrange} />
                                </View>
                                <Text style={styles.chipText} numberOfLines={1}>
                                  {num}
                                </Text>
                              </View>
                            </Tactile>
                            <Tactile
                              onPress={() => removeSavedPhone(num)}
                              style={styles.chipRemoveBtn}
                              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                              scaleTo={0.85}
                            >
                              <Ionicons name="close" size={12} color="rgba(255,255,255,0.45)" />
                            </Tactile>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}

                  <FormInput
                    ref={passwordInputRef}
                    label="Password"
                    icon="lock-closed-outline"
                    placeholder="Enter your password"
                    isPassword
                    value={password}
                    onChangeText={(text) => {
                      setPassword(text);
                      if (passwordError) setPasswordError('');
                      if (formError) setFormError('');
                    }}
                    onBlur={() => {
                      const cleaned = password.trim();
                      if (cleaned !== password) setPassword(cleaned);
                    }}
                    error={passwordError}
                    returnKeyType="done"
                    onSubmitEditing={handleLogin}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />

                  {formError ? (
                    <View style={styles.formErrorWrap}>
                      <Ionicons name="alert-circle" size={14} color="#FCA5A5" style={{ marginRight: 6 }} />
                      <Text style={styles.formErrorText}>{formError}</Text>
                    </View>
                  ) : null}

                  {/* ── DAGDAG: Remember Me row — refined iOS-style checkbox ── */}
                  <View style={styles.rememberRow}>
                    <Tactile onPress={toggleRememberMe} style={styles.rememberMeWrap} scaleTo={0.97}>
                      <View style={styles.rememberMeInner}>
                        <Animated.View
                          style={[
                            styles.checkbox,
                            rememberMe && styles.checkboxChecked,
                            { transform: [{ scale: checkScale }] },
                          ]}
                        >
                          {rememberMe && <Ionicons name="checkmark" size={13} color="#FFFFFF" />}
                        </Animated.View>
                        <Text style={styles.rememberMeText}>Remember me</Text>
                      </View>
                    </Tactile>

                    <Tactile onPress={() => {}} scaleTo={0.95}>
                      <Text style={styles.forgotText}>Forgot password?</Text>
                    </Tactile>
                  </View>

                  <PrimaryButton
                    label="Log In"
                    variant="primary"
                    fullWidth
                    loading={loading}
                    disabled={!isFormValid || loading}
                    onPress={handleLogin}
                    style={styles.loginButton}
                  />

                  <Tactile
                    onPress={() => router.replace('/(tabs)')}
                    disabled={loading}
                    style={styles.browseButtonWrap}
                    scaleTo={0.97}
                  >
                    <View style={styles.browseButton}>
                      <Text style={styles.browseButtonText}>Browse Without Logging In</Text>
                    </View>
                  </Tactile>
                </View>
              </View>
            </View>

            {/* Footer */}
            <View style={styles.footerRow}>
              <Text style={styles.footerText}>Don&apos;t have an account? </Text>
              <Tactile onPress={() => router.push('/sign_in')} disabled={loading} scaleTo={0.95}>
                <Text style={styles.footerLink}>Sign Up</Text>
              </Tactile>
            </View>
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
    justifyContent: 'center',
    paddingVertical: 48,
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
  glowCenter: {
    position: 'absolute',
    top: '38%',
    left: '10%',
    width: 280,
    height: 280,
    borderRadius: 280,
  },

  // ── Brand ──
  brandWrap: {
    alignItems: 'center',
    marginBottom: 36,
  },

  logoImage: {
    width: 80,
    height: 80,
  },
  logoCircle: {
    width: 76,
    height: 60,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,

    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 18,
    elevation: 6,
  },

  stationLabel: {
    fontSize: FONT_SIZES.tiny,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.45)',
    letterSpacing: 2,
    marginBottom: 12,
  },
  appName: {
    fontSize: FONT_SIZES.heroTitle + 15,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.3,
    marginBottom: 10,
  },
  appNameAccent: { color: COLORS.primaryOrange },
  tagline: {
    fontSize: FONT_SIZES.secondary,
    color: 'rgba(255,255,255,0.55)',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 20,
  },

  // ── Floating card ──
  cardShadowWrap: {
    borderRadius: 28,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.35,
    shadowRadius: 30,
    elevation: 10,
    marginBottom: 28,
  },
  card: {
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: '#161339',
    paddingHorizontal: 22,
    paddingTop: 26,
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
    fontSize: FONT_SIZES.caption,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 22,
  },

  // ── Form ──
  form: { marginTop: 2 },

  // ── DAGDAG: Suggestion chips (Apple account-picker style) ──
  suggestionWrap: {
    marginTop: -10,
    marginBottom: 18,
  },
  suggestionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#211D52',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: 20,
    paddingLeft: 6,
    paddingRight: 6,
    paddingVertical: 6,
  },
  chipSelectArea: {},
  chipInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  chipIconWrap: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(249,115,22,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 7,
  },
  chipText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#FFFFFF',
    maxWidth: 140,
  },
  chipRemoveBtn: {
    marginLeft: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
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

  // ── DAGDAG: Remember Me row ──
  rememberRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 26,
    marginTop: 2,
  },
  rememberMeWrap: {},
  rememberMeInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  checkboxChecked: {
    backgroundColor: COLORS.primaryOrange,
    borderColor: COLORS.primaryOrange,
  },
  rememberMeText: {
    fontSize: FONT_SIZES.caption,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
  },
  forgotText: {
    fontSize: FONT_SIZES.caption,
    fontWeight: '700',
    color: COLORS.primaryOrange,
  },

  loginButton: {
    marginTop: 4,
    borderRadius: 18,
    shadowColor: COLORS.primaryOrange,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 5,
  },

  // Secondary action — de-emphasized so it doesn't compete with Log In
  browseButtonWrap: {
    marginTop: 10,
  },
  browseButton: {
    paddingVertical: 8,
    borderRadius: 16,
    alignItems: 'center',
    backgroundColor: '#1D1A48',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  browseButtonText: {
    fontSize: FONT_SIZES.secondary,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
  },

  // ── Footer ──
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 4,
  },
  footerText: {
    fontSize: FONT_SIZES.secondary,
    color: 'rgba(255,255,255,0.5)',
  },
  footerLink: {
    fontSize: FONT_SIZES.secondary,
    fontWeight: '700',
    color: COLORS.primaryOrange,
  },
});