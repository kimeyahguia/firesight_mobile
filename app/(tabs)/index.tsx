import {
  ALERTS,
  BARANGAY_RISKS,
  EMERGENCY_CONTACTS,
  QUICK_ACTIONS,
  RESOURCES,
} from '@/constants/data';
import { COLORS } from '@/constants/theme';
import { RiskLevel } from '@/constants/types';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert, Dimensions,
  Linking,
  Modal, Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import ActionCard from '@/components/common/ActionCard';
import AppHeader from '@/components/common/AppHeader';
import PrimaryButton from '@/components/common/PrimaryButton';
import ScreenContainer from '@/components/common/ScreenContainer';
import SectionHeader from '@/components/common/SectionHeader';
import StatusBadge from '@/components/common/StatusBadge';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const HALF_SHEET = SCREEN_HEIGHT * 0.55;

// How many items to show inline before "See All" / "View All"
const ALERTS_PREVIEW_COUNT = 2;
const RESOURCES_PREVIEW_COUNT = 2;

type Contact = (typeof EMERGENCY_CONTACTS)[number];
type AlertItem = (typeof ALERTS)[number];
type Resource = (typeof RESOURCES)[number];
type BarangayItem = (typeof BARANGAY_RISKS)[number];

// ────────────────────────────────────────────────────────────
// Sub-components
// ────────────────────────────────────────────────────────────

function BarangayCard({ item, onPress }: { item: BarangayItem; onPress: (item: BarangayItem) => void }) {
  return (
    <TouchableOpacity activeOpacity={0.8} style={styles.barangayCard} onPress={() => onPress(item)}>
      <View style={styles.barangayCardHeader}>
        <StatusBadge variant="risk" value={item.risk} />
      </View>
      <Text style={styles.barangayName} numberOfLines={1}>{item.name}</Text>
      <Text style={styles.barangayIncidents}>
        {item.incidents} {item.incidents === 1 ? 'incident' : 'incidents'} this month
      </Text>
      <Text style={styles.tapHint}>Tap for details →</Text>
    </TouchableOpacity>
  );
}

function ContactRow({ contact, onCall }: { contact: Contact; onCall: (c: Contact) => void }) {
  return (
    <View style={styles.contactRow}>
      <View style={styles.contactIconWrap}>
        <Ionicons name={contact.icon as any} size={18} color={COLORS.primaryOrange} />
      </View>
      <View style={styles.contactInfo}>
        <Text style={styles.contactName}>{contact.name}</Text>
        <Text style={styles.contactRole}>{contact.role}</Text>
        <Text style={styles.contactPhone}>{contact.phone}</Text>
      </View>
      <TouchableOpacity activeOpacity={0.8} style={styles.callButton} onPress={() => onCall(contact)}>
        <Ionicons name="call" size={16} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}

function AlertRow({ item, onPress }: { item: AlertItem; onPress: (item: AlertItem) => void }) {
  return (
    <TouchableOpacity activeOpacity={0.85} style={styles.alertRow} onPress={() => onPress(item)}>
      <View style={styles.alertRowTop}>
        <Text style={styles.alertTitle}>{item.title}</Text>
        <StatusBadge variant="alert" value={item.type} />
      </View>
      <Text style={styles.alertDescription} numberOfLines={2}>{item.description}</Text>
      <Text style={styles.alertTimestamp}>{item.timestamp}</Text>
    </TouchableOpacity>
  );
}

function ResourceCard({ item, onPress }: { item: Resource; onPress: (item: Resource) => void }) {
  return (
    <TouchableOpacity activeOpacity={0.85} style={styles.resourceCard} onPress={() => onPress(item)}>
      <View style={styles.resourceChip}>
        <Text style={styles.resourceChipText}>{item.category}</Text>
      </View>
      <Text style={styles.resourceTitle}>{item.title}</Text>
      <Text style={styles.resourceSnippet} numberOfLines={2}>{item.snippet}</Text>
      <View style={styles.resourceReadMore}>
        <Text style={styles.resourceReadMoreText}>Read more</Text>
        <Ionicons name="chevron-forward" size={13} color={COLORS.accentViolet} />
      </View>
    </TouchableOpacity>
  );
}

// ────────────────────────────────────────────────────────────
// Reusable half-sheet wrapper
// ────────────────────────────────────────────────────────────

function HalfSheet({
  visible,
  onClose,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={[styles.sheetCard, { maxHeight: HALF_SHEET }]}>
          <View style={styles.sheetHandle} />
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.sheetScroll}
            bounces={false}
          >
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ────────────────────────────────────────────────────────────
// Main Screen
// ────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const [currentRisk] = useState<RiskLevel>('Moderate');
  const [logoutVisible, setLogoutVisible] = useState(false);
  const [callModalVisible, setCallModalVisible] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [selectedBarangay, setSelectedBarangay] = useState<BarangayItem | null>(null);
  const [selectedAlert, setSelectedAlert] = useState<AlertItem | null>(null);
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [mapModalVisible, setMapModalVisible] = useState(false);
  const [allAlertsVisible, setAllAlertsVisible] = useState(false);

  const handleLogout = () => { setLogoutVisible(false); router.replace('/login'); };

  const handleCall = (contact: Contact) => { setSelectedContact(contact); setCallModalVisible(true); };
  const confirmCall = () => {
    if (selectedContact) {
      Linking.openURL(`tel:${selectedContact.phone}`).catch(() =>
        Alert.alert('Error', 'Unable to make a call on this device.')
      );
    }
    setCallModalVisible(false);
  };

  const riskColor = (risk: string) => {
    if (risk === 'High' || risk === 'Critical') return COLORS.criticalRed;
    if (risk === 'Moderate') return COLORS.primaryOrange;
    return COLORS.successGreen;
  };

  const alertsPreview = ALERTS.slice(0, ALERTS_PREVIEW_COUNT);
  const resourcesPreview = RESOURCES.slice(0, RESOURCES_PREVIEW_COUNT);

  return (
    <ScreenContainer>
      <AppHeader
        title="Good Morning, Kimberly"
        subtitle="Lian, Batangas"
        showLocation
        showLogout
        onLogoutPress={() => setLogoutVisible(true)}
      />

      {/* Hero */}
      <View style={styles.heroCard}>
        <View style={styles.heroTopRow}>
          <Text style={styles.heroLabel}>Current Fire Risk</Text>
          <StatusBadge variant="risk" value={currentRisk} />
        </View>
        <Text style={styles.heroDescription}>
          Conditions are trending warmer than usual. Stay alert and review fire
          prevention measures in your household.
        </Text>
        <View style={styles.heroContextRow}>
          <MaterialCommunityIcons name="fire-alert" size={16} color={COLORS.primaryOrange} />
          <Text style={styles.heroContextText}>2 fire-related incidents reported nearby this week</Text>
        </View>
        <View style={styles.heroActionsRow}>
          <PrimaryButton label="View Risk Map" icon="map-outline" variant="secondary" fullWidth onPress={() => setMapModalVisible(true)} />
          <PrimaryButton label="Report Fire" icon="flame" variant="primary" fullWidth onPress={() => setReportModalVisible(true)} />
        </View>
        <Text style={styles.heroUpdatedText}>Last updated 12 minutes ago</Text>
      </View>

      {/* Quick Actions */}
      <SectionHeader title="Quick Actions" />
      <View style={styles.quickActionsGrid}>
        {QUICK_ACTIONS.map((action) => (
          <ActionCard
            key={action.id}
            action={action}
            onPress={() => {
              const routes: Record<string, string> = {
                map: '/(tabs)/map',
                report: '/(tabs)/report',
                awareness: '/(tabs)/awareness',
                profile: '/(tabs)/profile',
              };
              const target = routes[action.id];
              if (target) router.push(target as any);
            }}
          />
        ))}
      </View>

      {/* Risk by Area */}
      <SectionHeader title="Risk by Area" actionLabel="See Map" onActionPress={() => setMapModalVisible(true)} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.barangayScrollContent}>
        {BARANGAY_RISKS.map((item) => (
          <BarangayCard key={item.id} item={item} onPress={setSelectedBarangay} />
        ))}
      </ScrollView>

      {/* Latest Alerts — preview only */}
      <SectionHeader title="Latest Alerts" actionLabel="View All" onActionPress={() => setAllAlertsVisible(true)} />
      <View style={styles.alertsCard}>
        {alertsPreview.map((item, index) => (
          <View key={item.id}>
            <AlertRow item={item} onPress={setSelectedAlert} />
            {index < alertsPreview.length - 1 && <View style={styles.divider} />}
          </View>
        ))}
      </View>

      {/* Emergency Contacts */}
      <SectionHeader
        title="Emergency Contacts"
        actionLabel="Learn More"
        onActionPress={() => router.push('/(tabs)/awareness' as any)}
      />
      <View style={styles.contactsCard}>
        {EMERGENCY_CONTACTS.map((contact, index) => (
          <View key={contact.id}>
            <ContactRow contact={contact} onCall={handleCall} />
            {index < EMERGENCY_CONTACTS.length - 1 && <View style={styles.divider} />}
          </View>
        ))}
      </View>

      {/* Safety Resources — preview only */}
      <SectionHeader
        title="Safety Resources"
        actionLabel="See All"
        onActionPress={() => router.push('/(tabs)/awareness' as any)}
      />
      <View style={styles.resourcesList}>
        {resourcesPreview.map((item) => (
          <ResourceCard key={item.id} item={item} onPress={setSelectedResource} />
        ))}
      </View>

      {/* ── MODALS ───────────────────────────────────────── */}

      {/* Logout — center modal (not half sheet, intentional) */}
      <Modal visible={logoutVisible} transparent animationType="fade" onRequestClose={() => setLogoutVisible(false)}>
        <View style={[styles.overlay, { justifyContent: 'center', paddingHorizontal: 32 }]}>
          <Pressable style={styles.backdrop} onPress={() => setLogoutVisible(false)} />
          <View style={styles.centerCard}>
            <View style={styles.modalIconWrap}>
              <Ionicons name="log-out-outline" size={26} color={COLORS.primaryOrange} />
            </View>
            <Text style={styles.modalTitle}>Log Out</Text>
            <Text style={styles.modalMessage}>Are you sure you want to log out?</Text>
            <View style={styles.modalActions}>
              <TouchableOpacity activeOpacity={0.8} style={styles.cancelBtn} onPress={() => setLogoutVisible(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity activeOpacity={0.85} style={styles.dangerBtn} onPress={handleLogout}>
                <Text style={styles.dangerBtnText}>Log Out</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Call Confirmation — center modal */}
      <Modal visible={callModalVisible} transparent animationType="fade" onRequestClose={() => setCallModalVisible(false)}>
        <View style={[styles.overlay, { justifyContent: 'center', paddingHorizontal: 32 }]}>
          <Pressable style={styles.backdrop} onPress={() => setCallModalVisible(false)} />
          <View style={styles.centerCard}>
            <View style={[styles.modalIconWrap, { backgroundColor: '#DCFCE7' }]}>
              <Ionicons name="call" size={26} color={COLORS.successGreen} />
            </View>
            <Text style={styles.modalTitle}>Call {selectedContact?.name}</Text>
            <Text style={styles.modalMessage}>
              {selectedContact?.role}{'\n'}
              <Text style={{ fontWeight: '700', color: COLORS.deepIndigo }}>{selectedContact?.phone}</Text>
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity activeOpacity={0.8} style={styles.cancelBtn} onPress={() => setCallModalVisible(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity activeOpacity={0.85} style={[styles.dangerBtn, { backgroundColor: COLORS.successGreen }]} onPress={confirmCall}>
                <Text style={styles.dangerBtnText}>Call Now</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Barangay Detail — simplified summary, no dense grid */}
      <HalfSheet visible={!!selectedBarangay} onClose={() => setSelectedBarangay(null)}>
        <View style={styles.modalIconWrap}>
          <MaterialCommunityIcons name="map-marker-radius" size={26} color={COLORS.primaryOrange} />
        </View>
        <Text style={styles.modalTitle}>{selectedBarangay?.name}</Text>
        <View style={[styles.riskBadgeRow, { borderColor: riskColor(selectedBarangay?.risk ?? '') }]}>
          <Text style={[styles.riskBadgeText, { color: riskColor(selectedBarangay?.risk ?? '') }]}>
            {selectedBarangay?.risk} Risk Level
          </Text>
        </View>
        <Text style={styles.barangaySummaryText}>
          {selectedBarangay?.incidents ?? 0} {selectedBarangay?.incidents === 1 ? 'incident' : 'incidents'} this month · monitored by BFP Lian Main
        </Text>
        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.primaryActionBtn}
          onPress={() => { setSelectedBarangay(null); setMapModalVisible(true); }}
        >
          <Ionicons name="map-outline" size={16} color="#fff" />
          <Text style={styles.primaryActionBtnText}>View on Map</Text>
        </TouchableOpacity>
        <TouchableOpacity activeOpacity={0.7} style={styles.ghostBtn} onPress={() => setSelectedBarangay(null)}>
          <Text style={styles.ghostBtnText}>Close</Text>
        </TouchableOpacity>
      </HalfSheet>

      {/* Alert Detail */}
      <HalfSheet visible={!!selectedAlert} onClose={() => setSelectedAlert(null)}>
        <View style={[styles.modalIconWrap, { backgroundColor: '#FEF2F2' }]}>
          <Ionicons name="alert-circle" size={26} color={COLORS.criticalRed} />
        </View>
        <StatusBadge variant="alert" value={selectedAlert?.type ?? ''} />
        <Text style={[styles.modalTitle, { marginTop: 10 }]}>{selectedAlert?.title}</Text>
        <Text style={styles.modalMessage}>{selectedAlert?.description}</Text>
        <Text style={[styles.modalMessage, { fontSize: 11, color: COLORS.mutedText, marginTop: -8 }]}>
          {selectedAlert?.timestamp}
        </Text>
        <TouchableOpacity activeOpacity={0.7} style={styles.ghostBtn} onPress={() => setSelectedAlert(null)}>
          <Text style={styles.ghostBtnText}>Dismiss</Text>
        </TouchableOpacity>
      </HalfSheet>

      {/* Resource Detail */}
      <HalfSheet visible={!!selectedResource} onClose={() => setSelectedResource(null)}>
        <View style={styles.resourceChip}>
          <Text style={styles.resourceChipText}>{selectedResource?.category}</Text>
        </View>
        <Text style={[styles.modalTitle, { marginTop: 12, textAlign: 'left', alignSelf: 'flex-start' }]}>
          {selectedResource?.title}
        </Text>
        <Text style={[styles.modalMessage, { textAlign: 'left', alignSelf: 'flex-start', lineHeight: 20 }]}>
          {selectedResource?.snippet}
        </Text>
        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.primaryActionBtn}
          onPress={() => { setSelectedResource(null); router.push('/(tabs)/awareness' as any); }}
        >
          <Ionicons name="book-outline" size={16} color="#fff" />
          <Text style={styles.primaryActionBtnText}>Go to Awareness</Text>
        </TouchableOpacity>
        <TouchableOpacity activeOpacity={0.7} style={styles.ghostBtn} onPress={() => setSelectedResource(null)}>
          <Text style={styles.ghostBtnText}>Close</Text>
        </TouchableOpacity>
      </HalfSheet>

      {/* Report Fire */}
      <HalfSheet visible={reportModalVisible} onClose={() => setReportModalVisible(false)}>
        <View style={[styles.modalIconWrap, { backgroundColor: '#FEF2F2' }]}>
          <MaterialCommunityIcons name="fire-alert" size={28} color={COLORS.criticalRed} />
        </View>
        <Text style={styles.modalTitle}>Report a Fire</Text>
        <Text style={styles.modalMessage}>Choose how you want to report a fire incident in your area.</Text>
        <TouchableOpacity
          activeOpacity={0.85}
          style={[styles.primaryActionBtn, { backgroundColor: COLORS.criticalRed }]}
          onPress={() => { setReportModalVisible(false); router.push('/(tabs)/report' as any); }}
        >
          <Ionicons name="flame" size={16} color="#fff" />
          <Text style={styles.primaryActionBtnText}>Fill Incident Report</Text>
        </TouchableOpacity>
        <TouchableOpacity
          activeOpacity={0.85}
          style={[styles.primaryActionBtn, { backgroundColor: COLORS.successGreen, marginTop: 10 }]}
          onPress={() => { setReportModalVisible(false); handleCall(EMERGENCY_CONTACTS[0]); }}
        >
          <Ionicons name="call" size={16} color="#fff" />
          <Text style={styles.primaryActionBtnText}>Call BFP Emergency</Text>
        </TouchableOpacity>
        <TouchableOpacity activeOpacity={0.7} style={styles.ghostBtn} onPress={() => setReportModalVisible(false)}>
          <Text style={styles.ghostBtnText}>Cancel</Text>
        </TouchableOpacity>
      </HalfSheet>

      {/* Map */}
      <HalfSheet visible={mapModalVisible} onClose={() => setMapModalVisible(false)}>
        <View style={styles.mapPlaceholder}>
          <MaterialCommunityIcons name="map-legend" size={48} color={COLORS.accentViolet} />
          <Text style={styles.mapPlaceholderTitle}>Risk Map</Text>
          <Text style={styles.mapPlaceholderSub}>
            GIS map showing fire risk levels across all barangays in Lian, Batangas.
          </Text>
        </View>
        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.primaryActionBtn}
          onPress={() => { setMapModalVisible(false); router.push('/(tabs)/map' as any); }}
        >
          <Ionicons name="map" size={16} color="#fff" />
          <Text style={styles.primaryActionBtnText}>Open Full Map</Text>
        </TouchableOpacity>
        <TouchableOpacity activeOpacity={0.7} style={styles.ghostBtn} onPress={() => setMapModalVisible(false)}>
          <Text style={styles.ghostBtnText}>Close</Text>
        </TouchableOpacity>
      </HalfSheet>

      {/* All Alerts */}
      <HalfSheet visible={allAlertsVisible} onClose={() => setAllAlertsVisible(false)}>
        <Text style={[styles.modalTitle, { alignSelf: 'flex-start', marginBottom: 16 }]}>All Alerts</Text>
        {ALERTS.map((item, index) => (
          <View key={item.id} style={{ width: '100%' }}>
            <TouchableOpacity
              activeOpacity={0.85}
              style={styles.alertRow}
              onPress={() => { setAllAlertsVisible(false); setSelectedAlert(item); }}
            >
              <View style={styles.alertRowTop}>
                <Text style={styles.alertTitle}>{item.title}</Text>
                <StatusBadge variant="alert" value={item.type} />
              </View>
              <Text style={styles.alertDescription} numberOfLines={2}>{item.description}</Text>
              <Text style={styles.alertTimestamp}>{item.timestamp}</Text>
            </TouchableOpacity>
            {index < ALERTS.length - 1 && <View style={styles.divider} />}
          </View>
        ))}
        <TouchableOpacity activeOpacity={0.7} style={[styles.ghostBtn, { marginTop: 4 }]} onPress={() => setAllAlertsVisible(false)}>
          <Text style={styles.ghostBtnText}>Close</Text>
        </TouchableOpacity>
      </HalfSheet>
    </ScreenContainer>
  );
}

// ────────────────────────────────────────────────────────────
// Styles
// ────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  heroCard: {
    backgroundColor: COLORS.deepIndigo,
    borderRadius: 22,
    padding: 22,
    marginBottom: 28,
    shadowColor: COLORS.deepIndigo,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 6,
  },
  heroTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  heroLabel: { fontSize: 15, fontWeight: '600', color: 'rgba(255,255,255,0.85)' },
  heroDescription: { fontSize: 13.5, color: 'rgba(255,255,255,0.7)', lineHeight: 19, marginBottom: 14 },
  heroContextRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(249,115,22,0.18)', borderRadius: 12,
    paddingVertical: 10, paddingHorizontal: 12, marginBottom: 18,
  },
  heroContextText: { fontSize: 12.5, color: '#FDBA74', fontWeight: '500', flex: 1 },
  heroActionsRow: { flexDirection: 'row', gap: 10 },
  heroUpdatedText: { fontSize: 11, color: 'rgba(255,255,255,0.45)', marginTop: 14, textAlign: 'center' },

  quickActionsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 28 },

  barangayScrollContent: { paddingRight: 8, marginBottom: 28 },
  barangayCard: {
    width: 150, backgroundColor: COLORS.card, borderRadius: 18,
    padding: 16, marginRight: 12, borderWidth: 1, borderColor: COLORS.border,
  },
  barangayCardHeader: { marginBottom: 10, alignItems: 'flex-start' },
  barangayName: { fontSize: 13.5, fontWeight: '700', color: COLORS.deepIndigo, marginBottom: 4 },
  barangayIncidents: { fontSize: 11.5, color: COLORS.slateText },
  tapHint: { fontSize: 10.5, color: COLORS.accentViolet, marginTop: 8, fontWeight: '600' },

  contactsCard: {
    backgroundColor: COLORS.card, borderRadius: 18, borderWidth: 1,
    borderColor: COLORS.border, marginBottom: 28, paddingHorizontal: 16,
  },
  contactRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, gap: 12 },
  contactIconWrap: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: COLORS.contactIconBg,
    alignItems: 'center', justifyContent: 'center',
  },
  contactInfo: { flex: 1 },
  contactName: { fontSize: 14, fontWeight: '700', color: COLORS.deepIndigo, marginBottom: 2 },
  contactRole: { fontSize: 11.5, color: COLORS.slateText, marginBottom: 2 },
  contactPhone: { fontSize: 12.5, color: COLORS.slateText, fontWeight: '600' },
  callButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.successGreen, alignItems: 'center', justifyContent: 'center' },
  divider: { height: 1, backgroundColor: COLORS.border },

  alertsCard: {
    backgroundColor: COLORS.card, borderRadius: 18, borderWidth: 1,
    borderColor: COLORS.border, marginBottom: 28, paddingHorizontal: 16,
  },
  alertRow: { paddingVertical: 14, width: '100%' },
  alertRowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6, gap: 8 },
  alertTitle: { fontSize: 14, fontWeight: '700', color: COLORS.deepIndigo, flex: 1 },
  alertDescription: { fontSize: 12.5, color: COLORS.slateText, lineHeight: 17, marginBottom: 6 },
  alertTimestamp: { fontSize: 11, color: COLORS.mutedText },

  resourcesList: { gap: 12 },
  resourceCard: { backgroundColor: COLORS.card, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: COLORS.border },
  resourceChip: {
    alignSelf: 'flex-start', backgroundColor: COLORS.surfaceMuted,
    borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, marginBottom: 10,
  },
  resourceChipText: { fontSize: 10.5, fontWeight: '700', color: COLORS.accentViolet },
  resourceTitle: { fontSize: 14.5, fontWeight: '700', color: COLORS.deepIndigo, marginBottom: 4 },
  resourceSnippet: { fontSize: 12.5, color: COLORS.slateText, lineHeight: 17 },
  resourceReadMore: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 2 },
  resourceReadMoreText: { fontSize: 12, color: COLORS.accentViolet, fontWeight: '600' },

  // Overlay + Sheet
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(17,24,39,0.55)' },
  sheetCard: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 16,
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  sheetScroll: { paddingBottom: 8, alignItems: 'center' },
  sheetHandle: { width: 40, height: 4, borderRadius: 999, backgroundColor: COLORS.border, marginBottom: 20, alignSelf: 'center' },

  // Center modal (logout, call)
  centerCard: {
    backgroundColor: COLORS.card, borderRadius: 22,
    padding: 24, alignItems: 'center', width: '100%',
  },

  modalIconWrap: {
    width: 52, height: 52, borderRadius: 16, backgroundColor: COLORS.surfaceMuted,
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
  },
  modalTitle: { fontSize: 17, fontWeight: '800', color: COLORS.deepIndigo, marginBottom: 6, textAlign: 'center' },
  modalMessage: { fontSize: 13, color: COLORS.slateText, textAlign: 'center', marginBottom: 20, lineHeight: 18 },
  modalActions: { flexDirection: 'row', gap: 10, width: '100%' },
  cancelBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 14, alignItems: 'center',
    backgroundColor: COLORS.surfaceMuted, borderWidth: 1, borderColor: COLORS.border,
  },
  cancelBtnText: { fontSize: 13.5, fontWeight: '700', color: COLORS.deepIndigo },
  dangerBtn: { flex: 1, paddingVertical: 12, borderRadius: 14, alignItems: 'center', backgroundColor: COLORS.criticalRed },
  dangerBtnText: { fontSize: 13.5, fontWeight: '700', color: '#FFFFFF' },

  riskBadgeRow: { borderWidth: 1.5, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 5, marginBottom: 16 },
  riskBadgeText: { fontSize: 12.5, fontWeight: '700' },

  barangaySummaryText: {
    fontSize: 13,
    color: COLORS.slateText,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 18,
  },

  mapPlaceholder: {
    alignItems: 'center', paddingVertical: 32, gap: 10, width: '100%',
    backgroundColor: COLORS.surfaceMuted, borderRadius: 18, marginBottom: 20,
  },
  mapPlaceholderTitle: { fontSize: 16, fontWeight: '800', color: COLORS.deepIndigo },
  mapPlaceholderSub: { fontSize: 12.5, color: COLORS.slateText, textAlign: 'center', paddingHorizontal: 20, lineHeight: 18 },

  primaryActionBtn: {
    width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: COLORS.primaryOrange, borderRadius: 14, paddingVertical: 13,
  },
  primaryActionBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  ghostBtn: { marginTop: 12, paddingVertical: 10, width: '100%', alignItems: 'center' },
  ghostBtnText: { fontSize: 13.5, fontWeight: '600', color: COLORS.slateText },
});