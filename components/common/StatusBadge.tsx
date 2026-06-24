import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, RISK_COLORS, ALERT_COLORS } from '@/constants/theme';
import { RiskLevel, AlertType } from '@/constants/types';

type StatusBadgeProps =
  | { variant: 'risk'; value: RiskLevel }
  | { variant: 'alert'; value: AlertType };

export default function StatusBadge(props: StatusBadgeProps) {
  if (props.variant === 'risk') {
    const palette = RISK_COLORS[props.value];
    return (
      <View style={[styles.riskBadge, { backgroundColor: palette.bg }]}>
        <View style={[styles.riskDot, { backgroundColor: palette.dot }]} />
        <Text style={[styles.riskBadgeText, { color: palette.text }]}>
          {props.value} Risk
        </Text>
      </View>
    );
  }

  const palette = ALERT_COLORS[props.value];
  return (
    <View style={[styles.alertBadge, { backgroundColor: palette.bg }]}>
      <Text style={[styles.alertBadgeText, { color: palette.text }]}>{props.value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  riskBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  riskDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  riskBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  alertBadge: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
  },
  alertBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
});