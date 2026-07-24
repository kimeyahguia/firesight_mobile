import { ALERT_COLORS, COLORS, FONT_SIZES } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { NotifCategory, NotificationItem, useNotifications } from '../../context/NotificationsContext';

function categoryIcon(cat: NotifCategory) {
  switch (cat) {
    case 'emergency': return 'flame';
    case 'assigned': return 'person-add';
    case 'verification': return 'shield-checkmark';
    case 'dispatch': return 'car';
    case 'status': return 'checkmark-done-circle';
  }
}

function NotificationRow({ item }: { item: NotificationItem }) {
  const ac = ALERT_COLORS[item.alertType];
  return (
    <View style={[styles.notifCard, item.unread && styles.notifCardUnread]}>
      {item.unread && <View style={styles.unreadDot} />}
      <View style={[styles.notifIconWrap, { backgroundColor: ac.bg }]}>
        <Ionicons name={categoryIcon(item.category)} size={18} color={ac.text} />
      </View>
      <View style={styles.notifBody}>
        <View style={styles.notifTopRow}>
          <Text style={[styles.notifTitle, item.unread && styles.notifTitleUnread]} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.notifTimestamp}>{item.timestamp}</Text>
        </View>
        <Text style={styles.notifDescription} numberOfLines={2}>{item.description}</Text>
        <View style={[styles.notifStatusBadge, { backgroundColor: ac.bg }]}>
          <Text style={[styles.notifStatusText, { color: ac.text }]}>{item.status}</Text>
        </View>
      </View>
    </View>
  );
}

export default function NotificationsModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { notifications, markAsRead } = useNotifications();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <Pressable style={styles.modalBackdrop} onPress={onClose} />
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <View style={styles.modalHeaderRow}>
            <Text style={styles.modalTitle}>Notifications</Text>
            <TouchableOpacity onPress={onClose} style={styles.modalCloseBtn}>
              <Ionicons name="close" size={18} color={COLORS.slateText} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.notifList} showsVerticalScrollIndicator={false}>
            {notifications.map((item) => (
              <Pressable key={item.id} onPress={() => markAsRead(item.id)}>
                <NotificationRow item={item} />
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(17,24,39,0.55)' },
  modalSheet: {
    backgroundColor: COLORS.card, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 28, maxHeight: '85%',
  },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: COLORS.border, alignSelf: 'center', marginBottom: 16 },
  modalHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  modalTitle: { fontSize: FONT_SIZES.cardTitle, fontWeight: '800', color: COLORS.deepIndigo, flex: 1, marginRight: 8 },
  modalCloseBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: COLORS.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  notifList: { maxHeight: 480 },
  notifCard: {
    flexDirection: 'row', gap: 12, backgroundColor: COLORS.card, borderRadius: 18, padding: 14,
    borderWidth: 1, borderColor: COLORS.border, marginBottom: 10, position: 'relative',
  },
  notifCardUnread: { borderColor: COLORS.accentViolet, backgroundColor: COLORS.surfaceMuted },
  unreadDot: { position: 'absolute', top: 12, right: 12, width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.accentViolet },
  notifIconWrap: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  notifBody: { flex: 1 },
  notifTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  notifTitle: { fontSize: FONT_SIZES.secondary, fontWeight: '700', color: COLORS.slateText, flex: 1, marginRight: 8 },
  notifTitleUnread: { color: COLORS.deepIndigo },
  notifTimestamp: { fontSize: FONT_SIZES.tiny, color: COLORS.mutedText, fontWeight: '600' },
  notifDescription: { fontSize: FONT_SIZES.caption, color: COLORS.slateText, marginTop: 4, lineHeight: 18 },
  notifStatusBadge: { alignSelf: 'flex-start', marginTop: 8, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  notifStatusText: { fontSize: FONT_SIZES.tiny, fontWeight: '800' },
});