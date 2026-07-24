import { COLORS, FONT_SIZES } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { MotiView } from 'moti';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import ToastLib from 'react-native-toast-message';

function BaseToast({ text1, text2, icon, color, bg }: any) {
  return (
    <MotiView
      from={{ opacity: 0, translateY: -14, scale: 0.95 }}
      animate={{ opacity: 1, translateY: 0, scale: 1 }}
      transition={{ type: 'timing', duration: 220 }}
      style={[styles.toast, { borderLeftColor: color }]}
    >
      <View style={[styles.iconWrap, { backgroundColor: bg }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.title} numberOfLines={1}>{text1}</Text>
        {!!text2 && <Text style={styles.message} numberOfLines={2}>{text2}</Text>}
      </View>
    </MotiView>
  );
}

// I-pass ito sa <Toast config={toastConfig} /> sa root layout mo (_layout.tsx)
export const toastConfig = {
  success: (props: any) => <BaseToast {...props} icon="checkmark-circle" color={COLORS.successGreen} bg="#ECFDF5" />,
  error: (props: any) => <BaseToast {...props} icon="close-circle" color={COLORS.criticalRed} bg="#FEF2F2" />,
  info: (props: any) => <BaseToast {...props} icon="information-circle" color={COLORS.accentViolet} bg="#EEF2FF" />,
  warning: (props: any) => <BaseToast {...props} icon="warning" color={COLORS.warningAmber} bg="#FFFBEB" />,
};

// Helper functions — import at gamitin kahit saan na screen, may haptic na
export function toastSuccess(text1: string, text2?: string) {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  ToastLib.show({ type: 'success', text1, text2 });
}
export function toastError(text1: string, text2?: string) {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  ToastLib.show({ type: 'error', text1, text2 });
}
export function toastInfo(text1: string, text2?: string) {
  Haptics.selectionAsync();
  ToastLib.show({ type: 'info', text1, text2 });
}
export function toastWarning(text1: string, text2?: string) {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  ToastLib.show({ type: 'warning', text1, text2 });
}

const styles = StyleSheet.create({
  toast: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: COLORS.card, borderRadius: 16, padding: 12,
    marginHorizontal: 16, borderLeftWidth: 4, width: '90%',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 10, elevation: 6,
  },
  iconWrap: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: FONT_SIZES.caption, fontWeight: '800', color: COLORS.deepIndigo },
  message: { fontSize: FONT_SIZES.tiny, color: COLORS.slateText, marginTop: 2 },
});