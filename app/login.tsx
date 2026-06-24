import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { COLORS } from '@/constants/theme';

import FormInput from '@/components/common/FormInput';
import PrimaryButton from '@/components/common/PrimaryButton';

export default function LoginScreen() {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [signupVisible, setSignupVisible] = useState(false);
  const [signupName, setSignupName] = useState('');
  const [signupPhone, setSignupPhone] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupError, setSignupError] = useState('');
  const [signupLoading, setSignupLoading] = useState(false);

  const handleLogin = () => {
    setError('');

    if (!phone || !password) {
      setError('Please fill in both fields.');
      return;
    }

    setLoading(true);

    // TODO: replace with real auth call
    setTimeout(() => {
      setLoading(false);
      router.replace('/(tabs)');
    }, 800);
  };

  const closeSignup = () => {
    setSignupVisible(false);
    setSignupName('');
    setSignupPhone('');
    setSignupPassword('');
    setSignupError('');
  };

  const handleSignup = () => {
    setSignupError('');

    if (!signupName || !signupPhone || !signupPassword) {
      setSignupError('Please fill in all fields.');
      return;
    }

    setSignupLoading(true);

    // TODO: replace with real account-creation call
    setTimeout(() => {
      setSignupLoading(false);
      closeSignup();
      router.replace('/(tabs)');
    }, 800);
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
            <Text style={styles.tagline}>Community fire safety and reporting app for Lian, Batangas</Text>
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

          {/* Footer */}
          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Don&apos;t have an account? </Text>
            <TouchableOpacity activeOpacity={0.6} onPress={() => setSignupVisible(true)}>
              <Text style={styles.footerLink}>Sign Up</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Sign Up Modal */}
      <Modal
        visible={signupVisible}
        animationType="slide"
        transparent
        onRequestClose={closeSignup}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={closeSignup} />

          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalSheetWrap}
          >
            <View style={styles.modalSheet}>
              <View style={styles.modalHandle} />

              <View style={styles.modalHeaderRow}>
                <Text style={styles.modalTitle}>Create Account</Text>
                <TouchableOpacity activeOpacity={0.7} onPress={closeSignup} hitSlop={8}>
                  <Ionicons name="close" size={22} color={COLORS.slateText} />
                </TouchableOpacity>
              </View>

              <Text style={styles.modalSubtitle}>
                Sign up to report incidents and receive alerts for your barangay.
              </Text>

              <FormInput
                label="Full Name"
                icon="person-outline"
                placeholder="Juan Dela Cruz"
                value={signupName}
                onChangeText={setSignupName}
              />
              <FormInput
                label="Phone Number"
                icon="call-outline"
                placeholder="0917 123 4567"
                keyboardType="phone-pad"
                value={signupPhone}
                onChangeText={setSignupPhone}
              />
              <FormInput
                label="Password"
                icon="lock-closed-outline"
                placeholder="Create a password"
                isPassword
                value={signupPassword}
                onChangeText={setSignupPassword}
                error={signupError}
              />

              <PrimaryButton
                label="Create Account"
                variant="primary"
                fullWidth
                loading={signupLoading}
                onPress={handleSignup}
                style={styles.modalSubmitButton}
              />
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradientFill: {
    flex: 1,
  },
  flexFill: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
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
  stationLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.55)',
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  appName: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  appNameAccent: {
    color: COLORS.primaryOrange,
  },
  tagline: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 12,
  },
  form: {
    marginBottom: 24,
  },
  forgotWrap: {
    alignSelf: 'flex-end',
    marginBottom: 24,
    marginTop: -4,
  },
  forgotText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: COLORS.primaryOrange,
  },
  loginButton: {
    marginTop: 4,
  },
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
    fontSize: 13.5,
    fontWeight: '600',
    color: '#FFFFFF',
  },
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

  // Sign Up Modal (stays light/white — modals over dark gradients
  // usually look better as a white sheet, contacts/forms inside
  // already use COLORS.card/border which are white/light by default)
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(17,24,39,0.5)',
  },
  modalSheetWrap: {
    width: '100%',
  },
  modalSheet: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 32,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: COLORS.deepIndigo,
  },
  modalSubtitle: {
    fontSize: 13,
    color: COLORS.slateText,
    lineHeight: 18,
    marginBottom: 20,
  },
  modalSubmitButton: {
    marginTop: 8,
  },
});