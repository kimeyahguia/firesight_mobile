import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '@/constants/theme';

interface PrimaryButtonProps {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
  icon?: keyof typeof Ionicons.glyphMap;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
}

export default function PrimaryButton({
  label,
  onPress,
  variant = 'primary',
  icon,
  loading = false,
  disabled = false,
  fullWidth = false,
  style,
}: PrimaryButtonProps) {
  const isPrimary = variant === 'primary';
  const isOutline = variant === 'outline';

  const iconColor = isPrimary ? '#FFFFFF' : COLORS.deepIndigo;

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      disabled={disabled || loading}
      onPress={onPress}
      style={[
        styles.base,
        isPrimary && styles.primary,
        variant === 'secondary' && styles.secondary,
        isOutline && styles.outline,
        fullWidth && styles.fullWidth,
        (disabled || loading) && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary ? '#FFFFFF' : COLORS.deepIndigo} size="small" />
      ) : (
        <>
          {icon && <Ionicons name={icon} size={17} color={iconColor} />}
          <Text
            style={[
              styles.label,
              isPrimary && styles.labelPrimary,
              variant === 'secondary' && styles.labelSecondary,
              isOutline && styles.labelOutline,
            ]}
          >
            {label}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 20,
    minHeight: 52,
  },
  fullWidth: {
    flex: 1,
  },
  primary: {
    backgroundColor: COLORS.primaryOrange,
  },
  secondary: {
    backgroundColor: 'rgba(255,255,255,0.95)',
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: COLORS.deepIndigo,
  },
  disabled: {
    opacity: 0.5,
  },
  label: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  labelPrimary: {
    color: '#FFFFFF',
  },
  labelSecondary: {
    color: COLORS.deepIndigo,
  },
  labelOutline: {
    color: COLORS.deepIndigo,
  },
});