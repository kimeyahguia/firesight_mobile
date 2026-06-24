import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, TextInputProps } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '@/constants/theme';

interface FormInputProps extends TextInputProps {
  label?: string;
  error?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  isPassword?: boolean;
}

export default function FormInput({
  label,
  error,
  icon,
  isPassword = false,
  style,
  ...textInputProps
}: FormInputProps) {
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
          {...textInputProps}
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
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.deepIndigo,
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceMuted,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    gap: 10,
  },
  inputRowFocused: {
    borderColor: COLORS.primaryOrange,
    backgroundColor: COLORS.card,
  },
  inputRowError: {
    borderColor: '#EF4444',
  },
  icon: {
    marginRight: 0,
  },
  input: {
    flex: 1,
    fontSize: 14.5,
    color: COLORS.deepIndigo,
    paddingVertical: 14,
  },
  errorText: {
    fontSize: 11.5,
    color: '#EF4444',
    marginTop: 6,
    fontWeight: '500',
  },
});