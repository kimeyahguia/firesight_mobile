import { COLORS, FONT_SIZES } from '@/constants/theme';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { MotiView } from 'moti';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Modal from 'react-native-modal';

interface ConfirmModalProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

// Reusable confirm dialog — gamitin sa logout, delete, cancel report, etc.
// Usage: <ConfirmModal visible={x} title="..." message="..." onConfirm={} onCancel={} />
export default function ConfirmModal({
  visible,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  return (
    <Modal
      isVisible={visible}
      onBackdropPress={onCancel}
      backdropOpacity={0}
      animationIn="fadeIn"
      animationOut="fadeOut"
      useNativeDriver
      style={styles.modalWrap}
    >
      <BlurView intensity={35} tint="dark" style={StyleSheet.absoluteFill} />
      <MotiView
        from={{ opacity: 0, scale: 0.9, translateY: 10 }}
        animate={{ opacity: 1, scale: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 220 }}
        style={styles.card}
      >
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.message}>{message}</Text>

        <View style={styles.btnRow}>
          <TouchableOpacity
            activeOpacity={0.85}
            style={[styles.btn, styles.cancelBtn]}
            onPress={() => {
              Haptics.selectionAsync();
              onCancel();
            }}
          >
            <Text style={styles.cancelText}>{cancelLabel}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.85}
            style={[styles.btn, destructive ? styles.destructiveBtn : styles.confirmBtn]}
            onPress={() => {
              Haptics.notificationAsync(
                destructive
                  ? Haptics.NotificationFeedbackType.Warning
                  : Haptics.NotificationFeedbackType.Success
              );
              onConfirm();
            }}
          >
            <Text style={styles.confirmText}>{confirmLabel}</Text>
          </TouchableOpacity>
        </View>
      </MotiView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalWrap: { justifyContent: 'center', alignItems: 'center', margin: 24 },
  card: { width: '100%', backgroundColor: COLORS.card, borderRadius: 22, padding: 22, alignItems: 'center' },
  title: { fontSize: FONT_SIZES.cardTitle, fontWeight: '800', color: COLORS.deepIndigo, marginBottom: 8, textAlign: 'center' },
  message: { fontSize: FONT_SIZES.caption, color: COLORS.slateText, textAlign: 'center', marginBottom: 20, lineHeight: 20 },
  btnRow: { flexDirection: 'row', gap: 10, width: '100%' },
  btn: { flex: 1, paddingVertical: 13, borderRadius: 14, alignItems: 'center' },
  cancelBtn: { backgroundColor: COLORS.surfaceMuted },
  confirmBtn: { backgroundColor: COLORS.primaryOrange },
  destructiveBtn: { backgroundColor: COLORS.criticalRed },
  cancelText: { fontWeight: '700', color: COLORS.slateText },
  confirmText: { fontWeight: '800', color: '#FFFFFF' },
});