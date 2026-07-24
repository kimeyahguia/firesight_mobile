import { API_ENDPOINTS } from '@/constants/api';
import { COLORS } from '@/constants/theme';
import { EmergencyContact, HomeResource, IncidentStatus } from '@/constants/types';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
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
import { QUICK_ACTIONS } from '@/constants/data';
import { fetchRiskMap, RiskMapApiError, type BarangayData } from '@/services/riskMap';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const HALF_SHEET = SCREEN_HEIGHT * 0.55;

// Fallback kung walang valid URL sa resources.content
const BFP_OFFICIAL_URL = 'https://bfp.gov.ph/';

// Statuses na dapat magpakita ng "responder tracking" box.
// I-adjust base sa actual enum values na ginagamit sa backend/IncidentStatus.
const RESPONDER_ACTIVE_STATUSES = ['Dispatched', 'En Route', 'On Site', 'Responding'];

// Order ng status timeline sa "My Report Status" modal.
// I-match sa actual values ng IncidentStatus type (case-insensitive na yung matching sa baba).
const STATUS_STEPS = ['Pending', 'Verified', 'Responding', 'Resolved'];

const HIDDEN_QUICK_ACTION_IDS: string[] = [];

// Gradient pairs na paikot-ikot na background ng Safety Resource cards.
const RESOURCE_GRADIENTS: [string, string][] = [
  [COLORS.deepIndigo, '#3B2E86'],
  ['#7A3B0F', COLORS.primaryOrange],
  ['#3C2A6E', COLORS.accentViolet],
];

type Contact = EmergencyContact;
type Resource = HomeResource;
type BarangayItem = BarangayData;

// ── My latest incident report (from incidents/read.php) ──
type MyReport = {
  id: string;
  reference_id: string;
  title: string;
  status: IncidentStatus;
  location: string;
  created_at: string;
  // TODO(backend): i-return ang mga field na ito sa incidents/read.php
  // kapag na-dispatch na ang responder, para gumana yung live tracking box.
  responder_status?: string;
  responder_eta?: string;
  responder_lat?: number;
  responder_lng?: number;
};

const isResponderActive = (status?: string) =>
  !!status && RESPONDER_ACTIVE_STATUSES.includes(status);

// ────────────────────────────────────────────────────────────
// Sub-components
// ────────────────────────────────────────────────────────────

function BarangayCard({ item, onPress }: { item: BarangayItem; onPress: (item: BarangayItem) => void }) {
  return (
    <TouchableOpacity activeOpacity={0.85} style={styles.barangayCard} onPress={() => onPress(item)}>
      <View style={styles.barangayCardHeader}>
        <StatusBadge variant="risk" value={item.risk} />
      </View>
      <Text style={styles.barangayName} numberOfLines={1}>{item.name}</Text>
      <Text style={styles.barangayIncidents}>
        {item.incidents} {item.incidents === 1 ? 'incident' : 'incidents'} this month
      </Text>
      <View style={styles.tapHintRow}>
        <Text style={styles.tapHint}>Tap for details</Text>
        <Ionicons name="arrow-forward" size={11} color={COLORS.accentViolet} />
      </View>
    </TouchableOpacity>
  );
}

function ContactRow({ contact, onCall }: { contact: Contact; onCall: (c: Contact) => void }) {
  return (
    <View style={styles.contactRow}>
      <View style={styles.contactIconWrap}>
        <Ionicons name={contact.icon as any} size={19} color={COLORS.primaryOrange} />
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

// Carousel card para sa Safety Resources — may gradient background na ngayon (paikot base sa index),
// tapping opens the actual BFP site/link.
function ResourceLinkCard({
  item,
  index,
  onPress,
}: {
  item: Resource;
  index: number;
  onPress: (item: Resource) => void;
}) {
  const [colorStart, colorEnd] = RESOURCE_GRADIENTS[index % RESOURCE_GRADIENTS.length];
  return (
    <TouchableOpacity activeOpacity={0.88} style={styles.resourceLinkCard} onPress={() => onPress(item)}>
      <LinearGradient
        colors={[colorStart, colorEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      <View style={styles.resourceGlow} />
      <View style={styles.resourceChip}>
        <Text style={styles.resourceChipText}>{item.category}</Text>
      </View>
      <Text style={styles.resourceLinkTitle} numberOfLines={3}>{item.title}</Text>
      <View style={styles.resourceLinkFooter}>
        <Ionicons name="open-outline" size={13} color="#FFFFFF" />
        <Text style={styles.resourceLinkFooterText}>Visit BFP Site</Text>
      </View>
    </TouchableOpacity>
  );
}

// Status timeline — pinapakita kung saan stage yung report (Pending → Verified → Responding → Resolved).
function StatusTimeline({ current }: { current?: string }) {
  const currentIndex = STATUS_STEPS.findIndex(
    (s) => s.toLowerCase() === (current || '').toLowerCase()
  );

  return (
    <View style={styles.timelineRow}>
      {STATUS_STEPS.map((step, idx) => {
        const isDone = currentIndex >= 0 && idx <= currentIndex;
        const isActive = idx === currentIndex;
        const isLast = idx === STATUS_STEPS.length - 1;

        return (
          <View key={step} style={styles.timelineStepGroup}>
            <View style={styles.timelineStepWrap}>
              <View
                style={[
                  styles.timelineDot,
                  isDone && styles.timelineDotDone,
                  isActive && styles.timelineDotActive,
                ]}
              >
                {isDone && !isActive && <Ionicons name="checkmark" size={11} color="#fff" />}
              </View>
              <Text style={[styles.timelineLabel, isDone && styles.timelineLabelDone]} numberOfLines={1}>
                {step}
              </Text>
            </View>
            {!isLast && (
              <View style={[styles.timelineLine, idx < currentIndex && styles.timelineLineDone]} />
            )}
          </View>
        );
      })}
    </View>
  );
}

// ── Reusable "empty state" for a section when the fetch returns nothing ──
function EmptySectionNote({ text }: { text: string }) {
  return (
    <View style={styles.emptySectionBox}>
      <Ionicons name="information-circle-outline" size={16} color={COLORS.mutedText} />
      <Text style={styles.emptySectionText}>{text}</Text>
    </View>
  );
}

// ── Reusable "error state" for a section when the fetch fails ──
function ErrorSectionNote({ text, onRetry }: { text: string; onRetry: () => void }) {
  return (
    <View style={styles.errorSectionBox}>
      <Ionicons name="warning-outline" size={16} color={COLORS.criticalRed} />
      <Text style={styles.errorSectionText}>{text}</Text>
      <TouchableOpacity activeOpacity={0.8} onPress={onRetry} style={styles.retryChip}>
        <Ionicons name="refresh" size={13} color={COLORS.deepIndigo} />
        <Text style={styles.retryChipText}>Retry</Text>
      </TouchableOpacity>
    </View>
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
  const [callModalVisible, setCallModalVisible] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [selectedBarangay, setSelectedBarangay] = useState<BarangayItem | null>(null);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [mapModalVisible, setMapModalVisible] = useState(false);
  const [myReportDetailVisible, setMyReportDetailVisible] = useState(false);
  const [contactsModalVisible, setContactsModalVisible] = useState(false); // Emergency Hotline modal

  // ── Fetched data state ──
  const [barangayRisks, setBarangayRisks] = useState<BarangayItem[]>([]);
  const [emergencyContacts, setEmergencyContacts] = useState<Contact[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [myReport, setMyReport] = useState<MyReport | null>(null);

  // ── Loading + error state per section (para hiwalay-hiwalay ang feedback) ──
  const [barangaysLoading, setBarangaysLoading] = useState(true);
  const [barangaysError, setBarangaysError] = useState<string | null>(null);

  const [contactsLoading, setContactsLoading] = useState(true);
  const [contactsError, setContactsError] = useState<string | null>(null);

  const [resourcesLoading, setResourcesLoading] = useState(true);
  const [resourcesError, setResourcesError] = useState<string | null>(null);

  const [myReportLoading, setMyReportLoading] = useState(true);
  const [myReportError, setMyReportError] = useState<string | null>(null);

  // ── Fetch: Barangay Risk Summary (shared risk_map.php via riskMapService) ──
  const fetchBarangayRisks = useCallback(async () => {
    setBarangaysLoading(true);
    setBarangaysError(null);
    try {
      const { barangays } = await fetchRiskMap();
      setBarangayRisks(
        barangays.map((b) => ({
          id: b.id,
          name: b.name,
          risk: b.risk,
          boundary: b.boundary,
          incidents: b.verifiedIncidents,
        }))
      );
    } catch (err) {
      const message = err instanceof RiskMapApiError
        ? err.message
        : 'Network error while loading risk data.';
      console.log('[HomeScreen] barangay risk fetch error ->', err);
      setBarangaysError(message);
    } finally {
      setBarangaysLoading(false);
    }
  }, []);

  // ── Fetch: Emergency Contacts (ginagamit ngayon sa Emergency Hotline modal) ──
  const fetchEmergencyContacts = useCallback(async () => {
    setContactsLoading(true);
    setContactsError(null);
    try {
      const response = await fetch(API_ENDPOINTS.homeEmergencyContacts);
      if (!response.ok) {
        setContactsError('Could not load emergency contacts.');
        return;
      }
      const result = await response.json();
      if (result.success && Array.isArray(result.contacts)) {
        setEmergencyContacts(result.contacts);
      } else {
        setContactsError(result.message || 'Could not load emergency contacts.');
      }
    } catch (err: unknown) {
      console.log('[HomeScreen] contacts fetch error ->', err);
      const errorMessage = err instanceof Error
        ? err.message
        : 'Network error while loading emergency contacts.';
      setContactsError(errorMessage);
    } finally {
      setContactsLoading(false);
    }
  }, []);

  // ── Fetch: Resources (preview only for Home — now used as a link carousel) ──
  const fetchResources = useCallback(async () => {
    setResourcesLoading(true);
    setResourcesError(null);
    try {
      const response = await fetch(`${API_ENDPOINTS.homeResources}?preview=true`);
      if (!response.ok) {
        setResourcesError('Could not load resources.');
        return;
      }
      const result = await response.json();
      if (result.success && Array.isArray(result.resources)) {
        setResources(result.resources);
      } else {
        setResourcesError(result.message || 'Could not load resources.');
      }
    } catch (err) {
      console.log('[HomeScreen] resources fetch error ->', err);
      setResourcesError('Network error while loading resources.');
    } finally {
      setResourcesLoading(false);
    }
  }, []);

  // ── Fetch: My latest incident report ──
  const fetchMyReport = useCallback(async () => {
    setMyReportLoading(true);
    setMyReportError(null);
    try {
      const userId = await AsyncStorage.getItem('user_id');
      if (!userId) {
        setMyReportError('You need to be logged in to view your reports.');
        return;
      }
      const response = await fetch(`${API_ENDPOINTS.incidentsRead}?user_id=${userId}&limit=1`);
      if (!response.ok) {
        setMyReportError('Could not load your report status.');
        return;
      }
      const result = await response.json();
      if (result.success && Array.isArray(result.data)) {
        setMyReport(result.data.length > 0 ? result.data[0] : null);
      } else {
        setMyReportError(result.message || 'Could not load your report status.');
      }
    } catch (err) {
      console.log('[HomeScreen] my report fetch error ->', err);
      setMyReportError('Network error while loading your report status.');
    } finally {
      setMyReportLoading(false);
    }
  }, []);

  // ── Re-fetch every time Home tab gains focus ──
  useFocusEffect(
    useCallback(() => {
      fetchBarangayRisks();
      fetchEmergencyContacts();
      fetchResources();
      fetchMyReport();
    }, [fetchBarangayRisks, fetchEmergencyContacts, fetchResources, fetchMyReport])
  );

  const handleCall = (contact: Contact) => { setSelectedContact(contact); setCallModalVisible(true); };
  const confirmCall = () => {
    if (selectedContact) {
      Linking.openURL(`tel:${selectedContact.phone}`).catch(() =>
        Alert.alert('Error', 'Unable to make a call on this device.')
      );
    }
    setCallModalVisible(false);
  };

  // Kapag walang valid URL sa resources.content, fallback sa official BFP site.
  const handleOpenResource = (item: Resource) => {
    const raw = (item.content || '').trim();
    const url = /^https?:\/\//i.test(raw) ? raw : BFP_OFFICIAL_URL;
    Linking.openURL(url).catch(() => Alert.alert('Error', 'Unable to open this link.'));
  };

  const riskColor = (risk: string) => {
    if (risk === 'High' || risk === 'Critical') return COLORS.criticalRed;
    if (risk === 'Moderate') return COLORS.primaryOrange;
    return COLORS.successGreen;
  };

  // Quick Action routing — "emergency" ay nagbubukas ng Emergency Contacts modal
  // (dating hawak ng hotline button), hindi na naka-route sa ibang screen.
  const handleQuickAction = (actionId: string) => {
    if (actionId === 'emergency') {
      setContactsModalVisible(true);
      return;
    }

  const routes: Record<string, string> = {
    map: '/(tabs)/map',
    report: '/(tabs)/report',
    awareness: '/(tabs)/awareness',
    profile: '/(tabs)/profile',
    safety: '/(tabs)/awareness',
    safety_tips: '/(tabs)/awareness',
    tips: '/(tabs)/awareness',
    learn: '/(tabs)/awareness',
  };
  const target = routes[actionId];
  if (target) router.push(target as any);
};

  // "emergency" quick action alisin na sa grid — hawak na ng Emergency Hotline button.
  const visibleQuickActions = QUICK_ACTIONS.filter((a) => !HIDDEN_QUICK_ACTION_IDS.includes(a.id));

  return (
    <ScreenContainer>
      <AppHeader
        title="Good Morning, Kimberly"
        subtitle="Lian, Batangas"
        showLocation
        showBell
        hasNotification={false}
        onBellPress={() => router.push('/(tabs)/notifications' as any)}
      />

      {/* Safety Resources — gradient carousel cards, links papunta sa BFP site */}
      <SectionHeader title="Safety Resources" />
      {resourcesLoading ? (
        <View style={styles.sectionLoadingBox}>
          <ActivityIndicator size="small" color={COLORS.primaryOrange} />
          <Text style={styles.sectionLoadingText}>Loading resources…</Text>
        </View>
      ) : resourcesError ? (
        <ErrorSectionNote text={resourcesError} onRetry={fetchResources} />
      ) : resources.length === 0 ? (
        <EmptySectionNote text="No safety resources available yet." />
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.resourceScrollContent}>
          {resources.map((item, idx) => (
            <ResourceLinkCard key={item.id} item={item} index={idx} onPress={handleOpenResource} />
          ))}
        </ScrollView>
      )}

      {/* Quick Actions — Apple-inspired 2-column grid; primary action (emphasized) spans full width */}
      {/* Quick Actions — Apple-inspired pill grid, 2 per row */}
      <SectionHeader title="Quick Actions" />
      <View style={styles.quickActionsGrid}>
        {visibleQuickActions.map((action) => (
          <View key={action.id} style={styles.quickActionSlot}>
            <ActionCard
              action={action}
              onPress={() => handleQuickAction(action.id)}
            />
          </View>
        ))}
      </View>

      {/* My Report Status — hero card, premium gradient + package-tracking style timeline */}
      <View style={styles.heroCard}>
        <LinearGradient
          colors={[COLORS.deepIndigo, '#1B1444', 'rgba(249,115,22,0.5)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={styles.heroGlow} />

        <View style={styles.heroTopRow}>
          <Text style={styles.heroLabel}>My Report Status</Text>
          {myReport && <StatusBadge variant="status" value={myReport.status} />}
        </View>

        {myReportLoading ? (
          <View style={styles.heroLoadingBox}>
            <ActivityIndicator size="small" color="#FFFFFF" />
            <Text style={styles.heroLoadingText}>Loading your report…</Text>
          </View>
        ) : myReportError ? (
          <View style={styles.heroErrorBox}>
            <Ionicons name="warning-outline" size={16} color="#FCA5A5" />
            <Text style={styles.heroErrorText}>{myReportError}</Text>
          </View>
        ) : !myReport ? (
          <Text style={styles.heroDescription}>
            You haven't reported any fire incidents yet. If you spot a fire, report it right away so BFP can respond quickly.
          </Text>
        ) : (
          <>
            <Text style={styles.heroDescription} numberOfLines={2}>
              {myReport.title}
            </Text>
            <View style={styles.heroContextRow}>
              <MaterialCommunityIcons name="map-marker-outline" size={16} color={COLORS.primaryOrange} />
              <Text style={styles.heroContextText} numberOfLines={1}>{myReport.location}</Text>
            </View>

            <StatusTimeline current={myReport.status as any} />

            {isResponderActive(myReport.responder_status) && (
              <View style={styles.trackingBox}>
                <View style={styles.trackingHeaderRow}>
                  <View style={styles.trackingIconWrap}>
                    <MaterialCommunityIcons name="fire-truck" size={16} color={COLORS.primaryOrange} />
                  </View>
                  <Text style={styles.trackingHeaderText}>
                    {myReport.responder_status}
                    {myReport.responder_eta ? ` · ETA ${myReport.responder_eta}` : ''}
                  </Text>
                </View>
                <Text style={styles.trackingSubText}>Responders are on their way to your location.</Text>
              </View>
            )}

            <View style={styles.heroActionsRow}>
              <PrimaryButton label="View Details" icon="document-text-outline" variant="secondary" fullWidth onPress={() => setMyReportDetailVisible(true)} />
            </View>
            <Text style={styles.heroUpdatedText}>Ref: {myReport.reference_id}</Text>
          </>
        )}
      </View>

      {/* Risk by Area */}
      <SectionHeader title="Risk by Area" actionLabel="See Map" onActionPress={() => setMapModalVisible(true)} />
      {barangaysLoading ? (
        <View style={styles.sectionLoadingBox}>
          <ActivityIndicator size="small" color={COLORS.primaryOrange} />
          <Text style={styles.sectionLoadingText}>Loading barangay risk data…</Text>
        </View>
      ) : barangaysError ? (
        <ErrorSectionNote text={barangaysError} onRetry={fetchBarangayRisks} />
      ) : barangayRisks.length === 0 ? (
        <EmptySectionNote text="No barangay risk data available yet." />
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.barangayScrollContent}>
          {barangayRisks.map((item) => (
            <BarangayCard key={item.id} item={item} onPress={setSelectedBarangay} />
          ))}
        </ScrollView>
      )}

      {/* ── MODALS ───────────────────────────────────────── */}

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

      {/* Emergency Contacts — list of contacts, fetched live via fetchEmergencyContacts() */}
      <HalfSheet visible={contactsModalVisible} onClose={() => setContactsModalVisible(false)}>
        <Text style={[styles.modalTitle, { alignSelf: 'flex-start', marginBottom: 4 }]}>Emergency Hotline</Text>
        <Text style={[styles.modalMessage, { alignSelf: 'flex-start', textAlign: 'left', marginBottom: 16 }]}>
          Tap the call button to contact BFP or a responder directly.
        </Text>
        {contactsLoading ? (
          <View style={styles.sectionLoadingBox}>
            <ActivityIndicator size="small" color={COLORS.primaryOrange} />
            <Text style={styles.sectionLoadingText}>Loading emergency contacts…</Text>
          </View>
        ) : contactsError ? (
          <ErrorSectionNote text={contactsError} onRetry={fetchEmergencyContacts} />
        ) : emergencyContacts.length === 0 ? (
          <EmptySectionNote text="No emergency contacts found." />
        ) : (
          <View style={[styles.contactsCard, { width: '100%', marginBottom: 8 }]}>
            {emergencyContacts.map((contact, index) => (
              <View key={contact.id}>
                <ContactRow contact={contact} onCall={handleCall} />
                {index < emergencyContacts.length - 1 && <View style={styles.divider} />}
              </View>
            ))}
          </View>
        )}
        <TouchableOpacity activeOpacity={0.7} style={styles.ghostBtn} onPress={() => setContactsModalVisible(false)}>
          <Text style={styles.ghostBtnText}>Close</Text>
        </TouchableOpacity>
      </HalfSheet>

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

      {/* My Report Detail — full status timeline + responder tracking */}
      <HalfSheet visible={myReportDetailVisible} onClose={() => setMyReportDetailVisible(false)}>
        <View style={[styles.modalIconWrap, { backgroundColor: '#FFF7ED' }]}>
          <MaterialCommunityIcons name="fire-alert" size={26} color={COLORS.primaryOrange} />
        </View>
        {myReport && <StatusBadge variant="status" value={myReport.status} />}
        <Text style={[styles.modalTitle, { marginTop: 10 }]}>{myReport?.title}</Text>
        <Text style={styles.modalMessage}>{myReport?.location}</Text>
        <Text style={[styles.modalMessage, { fontSize: 11, color: COLORS.mutedText, marginTop: -8 }]}>
          Ref: {myReport?.reference_id} · {myReport?.created_at}
        </Text>

        <StatusTimeline current={myReport?.status as any} />

        {isResponderActive(myReport?.responder_status) && (
          <View style={[styles.mapPlaceholder, { paddingVertical: 24 }]}>
            <MaterialCommunityIcons name="fire-truck" size={40} color={COLORS.primaryOrange} />
            <Text style={styles.mapPlaceholderTitle}>{myReport?.responder_status}</Text>
            <Text style={styles.mapPlaceholderSub}>
              {myReport?.responder_eta
                ? `Estimated arrival in ${myReport?.responder_eta}.`
                : 'A responder has been dispatched to your location.'}
            </Text>
          </View>
        )}

        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.primaryActionBtn}
          onPress={() => { setMyReportDetailVisible(false); router.push('/(tabs)/profile' as any); }}
        >
          <Ionicons name="flame" size={16} color="#fff" />
          <Text style={styles.primaryActionBtnText}>See your Reports</Text>
        </TouchableOpacity>
        <TouchableOpacity activeOpacity={0.7} style={styles.ghostBtn} onPress={() => setMyReportDetailVisible(false)}>
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
          onPress={() => {
            setReportModalVisible(false);
            if (emergencyContacts[0]) handleCall(emergencyContacts[0]);
          }}
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
    </ScreenContainer>
  );
}

// ────────────────────────────────────────────────────────────
// Styles — Apple-inspired: soft elevation, generous spacing, refined type
// ────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  heroCard: {
    borderRadius: 28,
    padding: 24,
    marginBottom: 30,
    overflow: 'hidden',
    shadowColor: COLORS.deepIndigo,
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.26,
    shadowRadius: 26,
    elevation: 8,
  },
  heroGlow: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(249,115,22,0.22)',
    top: -70,
    right: -50,
  },
  heroTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  heroLabel: { fontSize: 13.5, fontWeight: '700', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: 0.8 },
  heroDescription: { fontSize: 15, color: '#FFFFFF', lineHeight: 21, marginBottom: 16, fontWeight: '600', letterSpacing: -0.2 },
  heroContextRow: {
    flexDirection: 'row', alignItems: 'center', gap: 9,
    backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 14,
    paddingVertical: 11, paddingHorizontal: 13, marginBottom: 20,
    borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.16)',
  },
  heroContextText: { fontSize: 12.5, color: '#FDBA74', fontWeight: '600', flex: 1 },
  heroActionsRow: { flexDirection: 'row', gap: 10 },
  heroUpdatedText: { fontSize: 11, color: 'rgba(255,255,255,0.45)', marginTop: 16, textAlign: 'center' },
  heroLoadingBox: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 },
  heroLoadingText: { fontSize: 12.5, color: 'rgba(255,255,255,0.7)', fontStyle: 'italic' },
  heroErrorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(220,38,38,0.18)', borderRadius: 14,
    paddingVertical: 11, paddingHorizontal: 13,
  },
  heroErrorText: { fontSize: 12.5, color: '#FCA5A5', flex: 1 },

  // ── Status timeline — delivery-tracking style ──
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  timelineStepGroup: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  timelineStepWrap: { alignItems: 'center', width: 54 },
  timelineDot: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 5,
    borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.2)',
  },
  timelineDotDone: { backgroundColor: COLORS.successGreen, borderColor: COLORS.successGreen },
  timelineDotActive: { backgroundColor: COLORS.primaryOrange, borderColor: COLORS.primaryOrange },
  timelineLabel: { fontSize: 9.5, color: 'rgba(255,255,255,0.5)', textAlign: 'center', fontWeight: '600' },
  timelineLabelDone: { color: 'rgba(255,255,255,0.92)', fontWeight: '800' },
  timelineLine: {
    flex: 1, height: 2, backgroundColor: 'rgba(255,255,255,0.14)',
    marginTop: -16, marginHorizontal: -4, borderRadius: 999,
  },
  timelineLineDone: { backgroundColor: COLORS.successGreen },

  trackingBox: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 18,
    padding: 14,
    marginBottom: 18,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  trackingHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  trackingIconWrap: {
    width: 28, height: 28, borderRadius: 10, backgroundColor: 'rgba(249,115,22,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  trackingHeaderText: { fontSize: 13, fontWeight: '700', color: '#FDBA74', flex: 1 },
  trackingSubText: { fontSize: 11.5, color: 'rgba(255,255,255,0.65)', lineHeight: 16, paddingLeft: 38 },

  hotlineButton: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: COLORS.card, borderRadius: 22,
    padding: 16, marginBottom: 30,
    shadowColor: '#0F1235', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.05, shadowRadius: 14, elevation: 2,
  },
  hotlineIconWrap: {
    width: 48, height: 48, borderRadius: 16, backgroundColor: COLORS.successGreen,
    alignItems: 'center', justifyContent: 'center',
  },
  hotlineTitle: { fontSize: 15, fontWeight: '700', color: COLORS.deepIndigo, marginBottom: 3, letterSpacing: -0.2 },
  hotlineSubtitle: { fontSize: 12, color: COLORS.slateText },
  hotlineChevronWrap: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: COLORS.surfaceMuted,
    alignItems: 'center', justifyContent: 'center',
  },

  // ── Quick Actions — Apple-inspired pill grid, 2 per row, mas malaki na ──
    quickActionsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginBottom: 30,
      marginHorizontal: -6,
    },
    quickActionSlot: {
      width: '50%',
      paddingHorizontal: 6,
      marginBottom: 14,
    },

  barangayScrollContent: { paddingRight: 8, marginBottom: 30 },
  barangayCard: {
    width: 158, backgroundColor: COLORS.card, borderRadius: 20,
    padding: 17, marginRight: 14,
    shadowColor: '#0F1235', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2,
  },
  barangayCardHeader: { marginBottom: 12, alignItems: 'flex-start' },
  barangayName: { fontSize: 14, fontWeight: '700', color: COLORS.deepIndigo, marginBottom: 5, letterSpacing: -0.2 },
  barangayIncidents: { fontSize: 11.5, color: COLORS.slateText, lineHeight: 16 },
  tapHintRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 10 },
  tapHint: { fontSize: 10.5, color: COLORS.accentViolet, fontWeight: '700' },

  contactsCard: {
    backgroundColor: COLORS.card, borderRadius: 20,
    paddingHorizontal: 18,
    shadowColor: '#0F1235', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 10, elevation: 1,
  },
  contactRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, gap: 13 },
  contactIconWrap: {
    width: 44, height: 44, borderRadius: 15, backgroundColor: COLORS.contactIconBg,
    alignItems: 'center', justifyContent: 'center',
  },
  contactInfo: { flex: 1 },
  contactName: { fontSize: 14.5, fontWeight: '700', color: COLORS.deepIndigo, marginBottom: 2 },
  contactRole: { fontSize: 11.5, color: COLORS.slateText, marginBottom: 2 },
  contactPhone: { fontSize: 12.5, color: COLORS.slateText, fontWeight: '600' },
  callButton: { width: 38, height: 38, borderRadius: 19, backgroundColor: COLORS.successGreen, alignItems: 'center', justifyContent: 'center' },
  divider: { height: 1, backgroundColor: 'rgba(0,0,0,0.05)' },

  // ── Safety Resource cards — gradient background instead of plain white ──
  resourceScrollContent: { paddingRight: 8, marginBottom: 30 },
  resourceLinkCard: {
    width: 176,
    borderRadius: 20,
    padding: 17,
    marginRight: 14,
    overflow: 'hidden',
    shadowColor: '#0F1235', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.14, shadowRadius: 14, elevation: 3,
  },
  resourceGlow: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.1)',
    top: -30,
    right: -25,
  },
  resourceChip: {
    alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 999, paddingHorizontal: 11, paddingVertical: 5, marginBottom: 12,
    borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.24)',
  },
  resourceChipText: { fontSize: 10.5, fontWeight: '700', color: '#FFFFFF' },
  resourceLinkTitle: { fontSize: 14, fontWeight: '700', color: '#FFFFFF', marginBottom: 12, minHeight: 54, lineHeight: 18, letterSpacing: -0.2 },
  resourceLinkFooter: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  resourceLinkFooterText: { fontSize: 11.5, color: '#FFFFFF', fontWeight: '700' },

  // ── Loading / error / empty section states ──
  sectionLoadingBox: {
    flexDirection: 'row', alignItems: 'center', gap: 9,
    paddingVertical: 18, paddingHorizontal: 4, marginBottom: 30,
  },
  sectionLoadingText: { fontSize: 12.5, color: COLORS.slateText, fontStyle: 'italic' },
  emptySectionBox: {
    flexDirection: 'row', alignItems: 'center', gap: 9,
    backgroundColor: COLORS.surfaceMuted, borderRadius: 16,
    paddingVertical: 15, paddingHorizontal: 15, marginBottom: 30,
  },
  emptySectionText: { fontSize: 12.5, color: COLORS.mutedText, flex: 1 },
  errorSectionBox: {
    flexDirection: 'row', alignItems: 'center', gap: 9,
    backgroundColor: '#FDEAEA', borderRadius: 16,
    paddingVertical: 13, paddingHorizontal: 15, marginBottom: 30,
  },
  errorSectionText: { fontSize: 12.5, color: COLORS.criticalRed, flex: 1 },
  retryChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#FFFFFF', borderRadius: 999,
    paddingHorizontal: 11, paddingVertical: 7,
  },
  retryChipText: { fontSize: 11.5, fontWeight: '700', color: COLORS.deepIndigo },

  // Overlay + Sheet
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15,18,53,0.5)' },
  sheetCard: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 12,
    paddingHorizontal: 24,
    paddingBottom: 34,
  },
  sheetScroll: { paddingBottom: 8, alignItems: 'center' },
  sheetHandle: { width: 40, height: 4, borderRadius: 999, backgroundColor: 'rgba(0,0,0,0.12)', marginBottom: 20, alignSelf: 'center' },

  // Center modal (call)
  centerCard: {
    backgroundColor: COLORS.card, borderRadius: 28,
    padding: 26, alignItems: 'center', width: '100%',
    shadowColor: '#0F1235', shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.2, shadowRadius: 30, elevation: 10,
  },

  modalIconWrap: {
    width: 56, height: 56, borderRadius: 18, backgroundColor: COLORS.surfaceMuted,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: COLORS.deepIndigo, marginBottom: 7, textAlign: 'center', letterSpacing: -0.3 },
  modalMessage: { fontSize: 13, color: COLORS.slateText, textAlign: 'center', marginBottom: 22, lineHeight: 19 },
  modalActions: { flexDirection: 'row', gap: 10, width: '100%' },
  cancelBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 16, alignItems: 'center',
    backgroundColor: COLORS.surfaceMuted,
  },
  cancelBtnText: { fontSize: 13.5, fontWeight: '700', color: COLORS.deepIndigo },
  dangerBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 16, alignItems: 'center', backgroundColor: COLORS.criticalRed,
    shadowColor: COLORS.criticalRed, shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.22, shadowRadius: 10, elevation: 3,
  },
  dangerBtnText: { fontSize: 13.5, fontWeight: '700', color: '#FFFFFF' },

  riskBadgeRow: { borderWidth: 1.5, borderRadius: 999, paddingHorizontal: 15, paddingVertical: 6, marginBottom: 18 },
  riskBadgeText: { fontSize: 12.5, fontWeight: '700' },

  barangaySummaryText: {
    fontSize: 13,
    color: COLORS.slateText,
    textAlign: 'center',
    marginBottom: 22,
    lineHeight: 19,
  },

  mapPlaceholder: {
    alignItems: 'center', paddingVertical: 34, gap: 11, width: '100%',
    backgroundColor: COLORS.surfaceMuted, borderRadius: 22, marginBottom: 22,
  },
  mapPlaceholderTitle: { fontSize: 16.5, fontWeight: '800', color: COLORS.deepIndigo, letterSpacing: -0.3 },
  mapPlaceholderSub: { fontSize: 12.5, color: COLORS.slateText, textAlign: 'center', paddingHorizontal: 20, lineHeight: 18 },

  primaryActionBtn: {
    width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 9, backgroundColor: COLORS.primaryOrange, borderRadius: 16, paddingVertical: 15,
    shadowColor: COLORS.primaryOrange, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.26, shadowRadius: 12, elevation: 4,
  },
  primaryActionBtnText: { fontSize: 14.5, fontWeight: '700', color: '#fff' },
  ghostBtn: { marginTop: 14, paddingVertical: 11, width: '100%', alignItems: 'center' },
  ghostBtnText: { fontSize: 13.5, fontWeight: '600', color: COLORS.slateText },
});