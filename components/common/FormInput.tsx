import { COLORS } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import React, { forwardRef, useState } from 'react';
import { StyleSheet, Text, TextInput, TextInputProps, TouchableOpacity, View } from 'react-native';

interface FormInputProps extends TextInputProps {
  label?: string;
  error?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  isPassword?: boolean;
}

const FormInput = forwardRef<TextInput, FormInputProps>(function FormInput(
  { label, error, icon, isPassword = false, style, ...textInputProps },
  ref
) {
  const [secure, setSecure] = useState(isPassword);
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.wrapper}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View
        style={[
          styles.inputRow,
          focused && styles.inputRowFocused,
          error && styles.inputRowError,
        ]}
      >
        {icon && (
          <Ionicons
            name={icon}
            size={18}
            color={focused ? COLORS.primaryOrange : COLORS.slateText}
            style={styles.icon}
          />
        )}
        <TextInput
          ref={ref}
          {...textInputProps}
          style={[styles.input, style]}
          placeholderTextColor={COLORS.mutedText}
          secureTextEntry={secure}
          onFocus={(e) => {
            setFocused(true);
            textInputProps.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            textInputProps.onBlur?.(e);
          }}
        />
        {isPassword && (
          <TouchableOpacity onPress={() => setSecure(!secure)} hitSlop={8}>
            <Ionicons
              name={secure ? 'eye-off-outline' : 'eye-outline'}
              size={18}
              color={COLORS.slateText}
            />
          </TouchableOpacity>
        )}
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
});

export default FormInput;

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.9)', // dating COLORS.deepIndigo — blend sa dark bg, ngayon visible na
    marginBottom: 8,
    letterSpacing: 0.2,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'transparent',
    paddingHorizontal: 14,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  inputRowFocused: {
    borderColor: COLORS.primaryOrange,
  },
  inputRowError: {
    borderColor: '#EF4444',
  },
  icon: {
    marginRight: 0,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: COLORS.deepIndigo,
    paddingVertical: 15,
  },
  errorText: {
    fontSize: 11.5,
    color: '#FCA5A5',
    marginTop: 6,
    fontWeight: '600',
  },
});