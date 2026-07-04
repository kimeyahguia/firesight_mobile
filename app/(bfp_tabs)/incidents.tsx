import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  SafeAreaView,
  TextInput,
  Alert,
  Modal,
  Dimensions,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, FONT_SIZES, RISK_COLORS, type RiskLevel } from '@/constants/theme';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// ────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────

type IncidentStatus = 'Pending' | 'Verified' | 'Responding' | 'Resolved';
type FilterChip = 'All' | IncidentStatus;

type TimelineStep = 'Reported' | 'Verified' | 'Dispatched' | 'On Scene' | 'Resolved';

interface TimelineItem {
  step: TimelineStep;
  done: boolean;
  active: boolean;
  timestamp?: string;
  actor?: string;
}

interface Incident {
  id: string;
  refId: string;
  reporter: string;
  reporterPhone: string;
  reporterBarangay: string;
  barangay: string;
  type: string;
  dateTime: string;
  status: IncidentStatus;
  severity: RiskLevel;
  description: string;
  photoAttached: boolean;
  causeOfFire?: string;
  findings?: string;
  additionalNotes?: string;
  latitude: number;
  longitude: number;
  timeline: TimelineItem[];
}

// ────────────────────────────────────────────────────────────
// Mock Data
// ────────────────────────────────────────────────────────────

const MOCK_INCIDENTS: Incident[] = [
  {
    id: '1',
    refId: 'FS-20240701-3821',
    reporter: 'Juan dela Cruz',
    reporterPhone: '0917 123 4567',
    reporterBarangay: 'Lian Proper',
    barangay: 'Lian Proper',
    type: 'Residential Fire',
    dateTime: 'Jul 1, 2024 · 08:14 AM',
    status: 'Pending',
    severity: 'High',
    description: 'House fire reported near the public market. Flames visible from second floor. Smoke is heavy and spreading to adjacent structures.',
    photoAttached: true,
    causeOfFire: 'Unattended cooking (suspected)',
    findings: 'Second floor fully engulfed. Ground floor partially affected. Neighboring structures at risk.',
    additionalNotes: 'Two families may still be inside. Evacuation ongoing.',
    latitude: 14.0425,
    longitude: 120.6263,
    timeline: [
      { step: 'Reported', done: true, active: false, timestamp: '08:14 AM', actor: 'Juan dela Cruz' },
      { step: 'Verified', done: false, active: true },
      { step: 'Dispatched', done: false, active: false },
      { step: 'On Scene', done: false, active: false },
      { step: 'Resolved', done: false, active: false },
    ],
  },
  {
    id: '2',
    refId: 'FS-20240701-3820',
    reporter: 'Maria Santos',
    reporterPhone: '0918 765 4321',
    reporterBarangay: 'Bungahan',
    barangay: 'Bungahan',
    type: 'Grass Fire',
    dateTime: 'Jul 1, 2024 · 07:52 AM',
    status: 'Responding',
    severity: 'Moderate',
    description: 'Grass fire spreading near the barangay boundary. Wind making it worse. Approximately 200 sqm already burned.',
    photoAttached: true,
    causeOfFire: 'Possible illegal burning of waste',
    findings: 'Fire is spreading northeast due to wind. Power lines nearby.',
    additionalNotes: 'Resident requested immediate backup.',
    latitude: 14.0489,
    longitude: 120.6301,
    timeline: [
      { step: 'Reported', done: true, active: false, timestamp: '07:52 AM', actor: 'Maria Santos' },
      { step: 'Verified', done: true, active: false, timestamp: '07:58 AM', actor: 'PO1 Reyes' },
      { step: 'Dispatched', done: true, active: true, timestamp: '08:03 AM', actor: 'FO1 Cruz' },
      { step: 'On Scene', done: false, active: false },
      { step: 'Resolved', done: false, active: false },
    ],
  },
  {
    id: '3',
    refId: 'FS-20240701-3819',
    reporter: 'Carlo Reyes',
    reporterPhone: '0919 234 5678',
    reporterBarangay: 'Panikian',
    barangay: 'Panikian',
    type: 'Electrical Fire',
    dateTime: 'Jul 1, 2024 · 07:30 AM',
    status: 'Verified',
    severity: 'High',
    description: 'Electrical post caught fire. Power line sparking, residents evacuating.',
    photoAttached: false,
    causeOfFire: 'Electrical short circuit',
    findings: 'One utility pole involved. MERALCO notified.',
    additionalNotes: 'Area cordoned off. Waiting for MERALCO.',
    latitude: 14.0398,
    longitude: 120.6221,
    timeline: [
      { step: 'Reported', done: true, active: false, timestamp: '07:30 AM', actor: 'Carlo Reyes' },
      { step: 'Verified', done: true, active: true, timestamp: '07:38 AM', actor: 'PO2 Santos' },
      { step: 'Dispatched', done: false, active: false },
      { step: 'On Scene', done: false, active: false },
      { step: 'Resolved', done: false, active: false },
    ],
  },
  {
    id: '4',
    refId: 'FS-20240701-3818',
    reporter: 'Ana Mendoza',
    reporterPhone: '0920 345 6789',
    reporterBarangay: 'Maguibuay',
    barangay: 'Maguibuay',
    type: 'LPG-Related',
    dateTime: 'Jul 1, 2024 · 06:45 AM',
    status: 'Resolved',
    severity: 'Low',
    description: 'LPG tank leak reported. Fire extinguished before spreading.',
    photoAttached: true,
    causeOfFire: 'Faulty LPG regulator',
    findings: 'Small flame contained to kitchen area only.',
    additionalNotes: 'Family advised to replace regulator. BFP issued safety notice.',
    latitude: 14.0511,
    longitude: 120.6189,
    timeline: [
      { step: 'Reported', done: true, active: false, timestamp: '06:45 AM', actor: 'Ana Mendoza' },
      { step: 'Verified', done: true, active: false, timestamp: '06:50 AM', actor: 'PO1 Reyes' },
      { step: 'Dispatched', done: true, active: false, timestamp: '06:55 AM', actor: 'FO2 Bautista' },
      { step: 'On Scene', done: true, active: false, timestamp: '07:05 AM', actor: 'Team Alpha' },
      { step: 'Resolved', done: true, active: true, timestamp: '07:28 AM', actor: 'FO2 Bautista' },
    ],
  },
  {
    id: '5',
    refId: 'FS-20240701-3817',
    reporter: 'Ben Torres',
    reporterPhone: '0921 456 7890',
    reporterBarangay: 'Lumaniag',
    barangay: 'Lumaniag',
    type: 'Vehicle Fire',
    dateTime: 'Jul 1, 2024 · 06:10 AM',
    status: 'Pending',
    severity: 'Moderate',
    description: 'Jeepney engine fire along the highway. No casualties reported.',
    photoAttached: false,
    latitude: 14.0467,
    longitude: 120.6342,
    timeline: [
      { step: 'Reported', done: true, active: true, timestamp: '06:10 AM', actor: 'Ben Torres' },
      { step: 'Verified', done: false, active: false },
      { step: 'Dispatched', done: false, active: false },
      { step: 'On Scene', done: false, active: false },
      { step: 'Resolved', done: false, active: false },
    ],
  },
  {
    id: '6',
    refId: 'FS-20240701-3816',
    reporter: 'Rosa Villanueva',
    reporterPhone: '0922 567 8901',
    reporterBarangay: 'Quilitisan',
    barangay: 'Quilitisan',
    type: 'Smoke Only',
    dateTime: 'Jul 1, 2024 · 05:58 AM',
    status: 'Verified',
    severity: 'Low',
    description: 'Smoke observed coming from abandoned structure. No visible flames.',
    photoAttached: true,
    causeOfFire: 'Unknown — under investigation',
    findings: 'No active flames. Possible smoldering material inside.',
    latitude: 14.0378,
    longitude: 120.6278,
    timeline: [
      { step: 'Reported', done: true, active: false, timestamp: '05:58 AM', actor: 'Rosa Villanueva' },
      { step: 'Verified', done: true, active: true, timestamp: '06:10 AM', actor: 'PO1 Reyes' },
      { step: 'Dispatched', done: false, active: false },
      { step: 'On Scene', done: false, active: false },
      { step: 'Resolved', done: false, active: false },
    ],
  },
];

const FILTER_CHIPS: FilterChip[] = ['All', 'Pending', 'Verified', 'Responding', 'Resolved'];

const TIMELINE_ICONS: Record<TimelineStep, keyof typeof Ionicons.glyphMap> = {
  Reported: 'alert-circle',
  Verified: 'shield-checkmark',
  Dispatched: 'car',
  'On Scene': 'flame',
  Resolved: 'checkmark-circle',
};

// ────────────────────────────────────────────────────────────
// Status / helper config
// ────────────────────────────────────────────────────────────

const STATUS_STYLE: Record<IncidentStatus, { bg: string; text: string; dot: string; icon: keyof typeof Ionicons.glyphMap }> = {
  Pending: { bg: '#FFF7ED', text: '#C2410C', dot: COLORS.primaryOrange, icon: 'time-outline' },
  Verified: { bg: '#EEF2FF', text: COLORS.accentViolet, dot: COLORS.accentViolet, icon: 'shield-checkmark-outline' },
  Responding: { bg: '#FFFBEB', text: '#B45309', dot: COLORS.warningAmber, icon: 'car-outline' },
  Resolved: { bg: '#ECFDF5', text: COLORS.successGreen, dot: COLORS.successGreen, icon: 'checkmark-circle-outline' },
};

const FILTER_COUNT = (incidents: Incident[], filter: FilterChip) =>
  filter === 'All' ? incidents.length : incidents.filter((i) => i.status === filter).length;

// ────────────────────────────────────────────────────────────
// Shared small components
// ────────────────────────────────────────────────────────────

function SeverityBadge({ level }: { level: RiskLevel }) {
  const palette = RISK_COLORS[level];
  return (
    <View style={[shared.severityBadge, { backgroundColor: palette.bg }]}>
      <View style={[shared.severityDot, { backgroundColor: palette.dot }]} />
      <Text style={[shared.severityText, { color: palette.text }]}>{level}</Text>
    </View>
  );
}

function StatusBadge({ status }: { status: IncidentStatus }) {
  const s = STATUS_STYLE[status];
  return (
    <View style={[shared.statusBadge, { backgroundColor: s.bg }]}>
      <Ionicons name={s.icon} size={12} color={s.dot} />
      <Text style={[shared.statusText, { color: s.text }]}>{status}</Text>
    </View>
  );
}

const shared = StyleSheet.create({
  severityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
  },
  severityDot: { width: 5, height: 5, borderRadius: 3 },
  severityText: { fontSize: FONT_SIZES.tiny, fontWeight: '700' },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
  },
  statusText: { fontSize: FONT_SIZES.tiny, fontWeight: '700' },
});

// ────────────────────────────────────────────────────────────
// Incident Details Modal
// ────────────────────────────────────────────────────────────

function IncidentDetailsModal({
  incident: incidentProp,
  visible,
  onClose,
}: {
  incident: Incident | null;
  visible: boolean;
  onClose: () => void;
}) {
  if (!incidentProp) return null;

  const incident = incidentProp; // narrowed, di na null dito pababa

  function handleAction(label: string) {
    Alert.alert(label, `Action: ${label} for ${incident.refId}`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Confirm', style: 'default' },
    ]);
  }
  
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={detailStyles.overlay}>
        {/* Backdrop */}
        <TouchableOpacity style={detailStyles.backdrop} activeOpacity={1} onPress={onClose} />

        <SafeAreaView style={detailStyles.sheet}>
          {/* Handle */}
          <View style={detailStyles.handle} />

          {/* Sheet header */}
          <View style={detailStyles.sheetHeader}>
            <View style={detailStyles.sheetHeaderLeft}>
              <Text style={detailStyles.sheetRefId}>{incident.refId}</Text>
              <View style={detailStyles.sheetBadgeRow}>
                <StatusBadge status={incident.status} />
                <SeverityBadge level={incident.severity} />
              </View>
            </View>
            <TouchableOpacity activeOpacity={0.7} style={detailStyles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={20} color={COLORS.slateText} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={detailStyles.scrollView}
            contentContainerStyle={detailStyles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* ── Incident Info card ── */}
            <View style={detailStyles.sectionCard}>
              <View style={detailStyles.sectionTitleRow}>
                <View style={[detailStyles.sectionIconWrap, { backgroundColor: '#FFF1E6' }]}>
                  <MaterialCommunityIcons name="fire-alert" size={16} color={COLORS.primaryOrange} />
                </View>
                <Text style={detailStyles.sectionTitle}>Incident Information</Text>
              </View>

              <Text style={detailStyles.incidentTypeTitle}>{incident.type}</Text>
              <Text style={detailStyles.incidentDesc}>{incident.description}</Text>

              <View style={detailStyles.infoGrid}>
                <View style={detailStyles.infoRow}>
                  <Ionicons name="location-outline" size={14} color={COLORS.mutedText} />
                  <Text style={detailStyles.infoLabel}>Barangay</Text>
                  <Text style={detailStyles.infoValue}>{incident.barangay}, Lian, Batangas</Text>
                </View>
                <View style={detailStyles.infoDivider} />
                <View style={detailStyles.infoRow}>
                  <Ionicons name="time-outline" size={14} color={COLORS.mutedText} />
                  <Text style={detailStyles.infoLabel}>Date & Time</Text>
                  <Text style={detailStyles.infoValue}>{incident.dateTime}</Text>
                </View>
                {incident.causeOfFire && (
                  <>
                    <View style={detailStyles.infoDivider} />
                    <View style={detailStyles.infoRow}>
                      <Ionicons name="flame-outline" size={14} color={COLORS.mutedText} />
                      <Text style={detailStyles.infoLabel}>Cause</Text>
                      <Text style={detailStyles.infoValue}>{incident.causeOfFire}</Text>
                    </View>
                  </>
                )}
                {incident.findings && (
                  <>
                    <View style={detailStyles.infoDivider} />
                    <View style={detailStyles.infoRow}>
                      <Ionicons name="document-text-outline" size={14} color={COLORS.mutedText} />
                      <Text style={detailStyles.infoLabel}>Findings</Text>
                      <Text style={detailStyles.infoValue}>{incident.findings}</Text>
                    </View>
                  </>
                )}
                {incident.additionalNotes && (
                  <>
                    <View style={detailStyles.infoDivider} />
                    <View style={detailStyles.infoRow}>
                      <Ionicons name="chatbubble-outline" size={14} color={COLORS.mutedText} />
                      <Text style={detailStyles.infoLabel}>Notes</Text>
                      <Text style={detailStyles.infoValue}>{incident.additionalNotes}</Text>
                    </View>
                  </>
                )}
              </View>
            </View>

            {/* ── Reporter Info card ── */}
            <View style={detailStyles.sectionCard}>
              <View style={detailStyles.sectionTitleRow}>
                <View style={[detailStyles.sectionIconWrap, { backgroundColor: '#EEF2FF' }]}>
                  <Ionicons name="person-outline" size={16} color={COLORS.accentViolet} />
                </View>
                <Text style={detailStyles.sectionTitle}>Reporter Information</Text>
              </View>

              <View style={detailStyles.reporterRow}>
                <View style={detailStyles.reporterAvatar}>
                  <Text style={detailStyles.reporterAvatarText}>
                    {incident.reporter.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                  </Text>
                </View>
                <View style={detailStyles.reporterMeta}>
                  <Text style={detailStyles.reporterName}>{incident.reporter}</Text>
                  <Text style={detailStyles.reporterSub}>{incident.reporterBarangay}, Lian</Text>
                </View>
                <TouchableOpacity activeOpacity={0.85} style={detailStyles.callButton}>
                  <Ionicons name="call" size={16} color="#FFFFFF" />
                </TouchableOpacity>
              </View>

              <View style={detailStyles.infoGrid}>
                <View style={detailStyles.infoRow}>
                  <Ionicons name="call-outline" size={14} color={COLORS.mutedText} />
                  <Text style={detailStyles.infoLabel}>Phone</Text>
                  <Text style={detailStyles.infoValue}>{incident.reporterPhone}</Text>
                </View>
                <View style={detailStyles.infoDivider} />
                <View style={detailStyles.infoRow}>
                  <Ionicons name="camera-outline" size={14} color={COLORS.mutedText} />
                  <Text style={detailStyles.infoLabel}>Photo</Text>
                  <Text style={detailStyles.infoValue}>
                    {incident.photoAttached ? 'Attached (camera-captured)' : 'Not attached'}
                  </Text>
                </View>
              </View>
            </View>

            {/* ── Photo Evidence card ── */}
            {incident.photoAttached && (
              <View style={detailStyles.sectionCard}>
                <View style={detailStyles.sectionTitleRow}>
                  <View style={[detailStyles.sectionIconWrap, { backgroundColor: '#F4F3FB' }]}>
                    <Ionicons name="images-outline" size={16} color={COLORS.accentViolet} />
                  </View>
                  <Text style={detailStyles.sectionTitle}>Incident Photos</Text>
                </View>

                <View style={detailStyles.photosRow}>
                  {[1, 2, 3].map((p) => (
                    <TouchableOpacity key={p} activeOpacity={0.85} style={detailStyles.photoThumb}>
                      <View style={detailStyles.photoThumbInner}>
                        <Ionicons name="image-outline" size={22} color={COLORS.mutedText} />
                        <Text style={detailStyles.photoThumbLabel}>Photo {p}</Text>
                      </View>
                      {p === 1 && (
                        <View style={detailStyles.primaryPhotoBadge}>
                          <Text style={detailStyles.primaryPhotoBadgeText}>Primary</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={detailStyles.photoCaptureNote}>
                  <Ionicons name="shield-checkmark-outline" size={11} color={COLORS.mutedText} />
                  {' '}Photos captured directly via camera — gallery uploads disabled.
                </Text>
              </View>
            )}

            {/* ── Location Preview card ── */}
            <View style={detailStyles.sectionCard}>
              <View style={detailStyles.sectionTitleRow}>
                <View style={[detailStyles.sectionIconWrap, { backgroundColor: '#ECFDF5' }]}>
                  <Ionicons name="map-outline" size={16} color={COLORS.successGreen} />
                </View>
                <Text style={detailStyles.sectionTitle}>Incident Location</Text>
              </View>

              {/* Simulated map */}
              <TouchableOpacity activeOpacity={0.85} style={detailStyles.mapPreview}>
                <View style={detailStyles.mapBg}>
                  {[0.33, 0.66].map((p) => (
                    <View key={`h${p}`} style={[detailStyles.mapGridH, { top: `${p * 100}%` as `${number}%` }]} />
                  ))}
                  {[0.33, 0.66].map((p) => (
                    <View key={`v${p}`} style={[detailStyles.mapGridV, { left: `${p * 100}%` as `${number}%` }]} />
                  ))}
                  <View style={detailStyles.mapPin}>
                    <Ionicons name="flame" size={14} color="#FFFFFF" />
                  </View>
                  <View style={detailStyles.mapExpandCta}>
                    <Ionicons name="expand-outline" size={13} color={COLORS.deepIndigo} />
                    <Text style={detailStyles.mapExpandText}>Open in Maps</Text>
                  </View>
                </View>
              </TouchableOpacity>

              <View style={detailStyles.coordRow}>
                <Ionicons name="navigate-outline" size={13} color={COLORS.mutedText} />
                <Text style={detailStyles.coordText}>
                  {incident.latitude.toFixed(4)}, {incident.longitude.toFixed(4)}
                </Text>
                <View style={detailStyles.gpsLockedBadge}>
                  <View style={detailStyles.gpsLockedDot} />
                  <Text style={detailStyles.gpsLockedText}>GPS Locked</Text>
                </View>
              </View>
            </View>

            {/* ── Incident Timeline card ── */}
            <View style={detailStyles.sectionCard}>
              <View style={detailStyles.sectionTitleRow}>
                <View style={[detailStyles.sectionIconWrap, { backgroundColor: '#FFF1E6' }]}>
                  <Ionicons name="git-branch-outline" size={16} color={COLORS.primaryOrange} />
                </View>
                <Text style={detailStyles.sectionTitle}>Incident Timeline</Text>
              </View>

              <View style={detailStyles.timeline}>
                {incident.timeline.map((item, index) => {
                  const isLast = index === incident.timeline.length - 1;
                  const iconColor = item.done
                    ? COLORS.successGreen
                    : item.active
                    ? COLORS.primaryOrange
                    : COLORS.mutedText;
                  const iconBg = item.done
                    ? '#ECFDF5'
                    : item.active
                    ? '#FFF1E6'
                    : COLORS.surfaceMuted;
                  const iconName = item.done
                    ? 'checkmark-circle'
                    : item.active
                    ? TIMELINE_ICONS[item.step]
                    : 'ellipse-outline';

                  return (
                    <View key={item.step} style={detailStyles.timelineRow}>
                      {/* Left: icon + connector line */}
                      <View style={detailStyles.timelineLeft}>
                        <View style={[detailStyles.timelineIcon, { backgroundColor: iconBg }]}>
                          <Ionicons name={iconName} size={16} color={iconColor} />
                        </View>
                        {!isLast && (
                          <View
                            style={[
                              detailStyles.timelineLine,
                              { backgroundColor: item.done ? COLORS.successGreen : COLORS.border },
                            ]}
                          />
                        )}
                      </View>

                      {/* Right: content */}
                      <View style={[detailStyles.timelineContent, !isLast && { paddingBottom: 20 }]}>
                        <Text
                          style={[
                            detailStyles.timelineStep,
                            item.active && { color: COLORS.primaryOrange },
                            item.done && { color: COLORS.successGreen },
                            !item.done && !item.active && { color: COLORS.mutedText },
                          ]}
                        >
                          {item.step}
                          {item.active && !item.done && (
                            <Text style={detailStyles.timelineActivePill}>{' '}● Current</Text>
                          )}
                        </Text>
                        {item.timestamp ? (
                          <Text style={detailStyles.timelineMeta}>
                            {item.timestamp}
                            {item.actor ? ` · ${item.actor}` : ''}
                          </Text>
                        ) : (
                          <Text style={detailStyles.timelinePending}>Awaiting</Text>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* ── Action Buttons ── */}
            <View style={detailStyles.actionsCard}>
              <Text style={detailStyles.actionsTitle}>Responder Actions</Text>

              {incident.status === 'Pending' && (
                <TouchableOpacity
                  activeOpacity={0.85}
                  style={detailStyles.actionPrimary}
                  onPress={() => handleAction('Verify Report')}
                >
                  <Ionicons name="shield-checkmark" size={19} color="#FFFFFF" />
                  <Text style={detailStyles.actionPrimaryText}>Verify Report</Text>
                </TouchableOpacity>
              )}

              {(incident.status === 'Verified') && (
                <TouchableOpacity
                  activeOpacity={0.85}
                  style={detailStyles.actionDispatch}
                  onPress={() => handleAction('Dispatch Team')}
                >
                  <MaterialCommunityIcons name="fire-truck" size={19} color="#FFFFFF" />
                  <Text style={detailStyles.actionPrimaryText}>Dispatch Team</Text>
                </TouchableOpacity>
              )}

              {incident.status !== 'Resolved' && (
                <TouchableOpacity
                  activeOpacity={0.85}
                  style={detailStyles.actionUpdate}
                  onPress={() => handleAction('Update Incident')}
                >
                  <Ionicons name="refresh-outline" size={17} color={COLORS.deepIndigo} />
                  <Text style={detailStyles.actionUpdateText}>Update Incident Status</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                activeOpacity={0.85}
                style={detailStyles.actionEvidence}
                onPress={() => handleAction('Add Evidence')}
              >
                <Ionicons name="camera-outline" size={17} color={COLORS.accentViolet} />
                <Text style={detailStyles.actionEvidenceText}>Add Evidence / Photo</Text>
              </TouchableOpacity>

              {incident.status === 'Pending' && (
                <TouchableOpacity
                  activeOpacity={0.85}
                  style={detailStyles.actionFalse}
                  onPress={() => handleAction('Mark as False Report')}
                >
                  <Ionicons name="close-circle-outline" size={17} color={COLORS.criticalRed} />
                  <Text style={detailStyles.actionFalseText}>Mark as False Report</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={{ height: 40 }} />
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

// ────────────────────────────────────────────────────────────
// Incident Card (list item)
// ────────────────────────────────────────────────────────────

function IncidentCard({
  incident,
  onViewDetails,
}: {
  incident: Incident;
  onViewDetails: (incident: Incident) => void;
}) {
  function handleUpdate() {
    Alert.alert('Update Status', `Update status for ${incident.refId}`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Responding', style: 'default' },
      { text: 'Resolved', style: 'default' },
    ]);
  }

  function handleVerify() {
    Alert.alert('Verify Incident', `Mark ${incident.refId} as Verified?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Verify', style: 'default' },
    ]);
  }

  // Simplicity: one primary action shown at a time (the thing that moves the
  // incident forward), plus a single secondary "View Details" — instead of
  // 3-4 competing buttons.
  const primaryAction =
    incident.status === 'Pending'
      ? { label: 'Verify', icon: 'shield-checkmark-outline' as const, onPress: handleVerify, style: listStyles.actionButtonVerify, textStyle: listStyles.actionButtonVerifyText }
      : incident.status !== 'Resolved'
      ? { label: 'Update', icon: 'refresh-outline' as const, onPress: handleUpdate, style: listStyles.actionButtonUpdate, textStyle: listStyles.actionButtonUpdateText }
      : null;

  return (
    <View style={listStyles.incidentCard}>
      <View style={[listStyles.cardStrip, { backgroundColor: RISK_COLORS[incident.severity].dot }]} />
      <View style={listStyles.cardInner}>

        {/* Top row */}
        <View style={listStyles.cardTopRow}>
          <View style={listStyles.cardTopLeft}>
            <Text style={listStyles.refId}>{incident.refId}</Text>
            <View style={listStyles.badgeRow}>
              <StatusBadge status={incident.status} />
              <SeverityBadge level={incident.severity} />
            </View>
          </View>
          {incident.photoAttached && (
            <View style={listStyles.photoBadge}>
              <Ionicons name="camera" size={13} color={COLORS.accentViolet} />
            </View>
          )}
        </View>

        <Text style={listStyles.incidentType}>{incident.type}</Text>
        <Text style={listStyles.incidentDescription} numberOfLines={2}>
          {incident.description}
        </Text>

        {/* Meta row — condensed to one line for scanability */}
        <View style={listStyles.metaRow}>
          <View style={listStyles.metaChip}>
            <Ionicons name="person-outline" size={12} color={COLORS.mutedText} />
            <Text style={listStyles.metaChipText}>{incident.reporter}</Text>
          </View>
          <View style={listStyles.metaChip}>
            <Ionicons name="location-outline" size={12} color={COLORS.mutedText} />
            <Text style={listStyles.metaChipText}>{incident.barangay}</Text>
          </View>
          <View style={listStyles.metaChip}>
            <Ionicons name="time-outline" size={12} color={COLORS.mutedText} />
            <Text style={listStyles.metaChipText}>{incident.dateTime.split('·')[1]?.trim() ?? incident.dateTime}</Text>
          </View>
        </View>

        {/* Actions: secondary (outline) + at most one primary action */}
        <View style={listStyles.actionRow}>
          <TouchableOpacity
            activeOpacity={0.8}
            style={listStyles.actionButtonOutline}
            onPress={() => onViewDetails(incident)}
          >
            <Ionicons name="eye-outline" size={15} color={COLORS.deepIndigo} />
            <Text style={listStyles.actionButtonOutlineText}>View Details</Text>
          </TouchableOpacity>

          {primaryAction && (
            <TouchableOpacity activeOpacity={0.8} style={primaryAction.style} onPress={primaryAction.onPress}>
              <Ionicons name={primaryAction.icon} size={15} color={incident.status === 'Pending' ? COLORS.accentViolet : '#FFFFFF'} />
              <Text style={primaryAction.textStyle}>{primaryAction.label}</Text>
            </TouchableOpacity>
          )}

          {incident.status === 'Resolved' && (
            <View style={listStyles.resolvedTag}>
              <Ionicons name="checkmark-circle" size={14} color={COLORS.successGreen} />
              <Text style={listStyles.resolvedTagText}>Closed</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

// ────────────────────────────────────────────────────────────
// Main Screen
// ────────────────────────────────────────────────────────────

export default function IncidentsScreen() {
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterChip>('All');
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [detailsVisible, setDetailsVisible] = useState(false);

  const filtered = useMemo(() => {
    let list = MOCK_INCIDENTS;
    if (activeFilter !== 'All') {
      list = list.filter((i) => i.status === activeFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (i) =>
          i.refId.toLowerCase().includes(q) ||
          i.reporter.toLowerCase().includes(q) ||
          i.barangay.toLowerCase().includes(q) ||
          i.type.toLowerCase().includes(q)
      );
    }
    return list;
  }, [search, activeFilter]);

  function handleViewDetails(incident: Incident) {
    setSelectedIncident(incident);
    setDetailsVisible(true);
  }

  return (
    <SafeAreaView style={listStyles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.deepIndigo} />

      {/* ── Fixed Header ── */}
      <View style={listStyles.header}>
        <View style={listStyles.headerTopRow}>
          <View>
            <Text style={listStyles.headerEyebrow}>BFP Lian Fire Station</Text>
            <Text style={listStyles.headerTitle}>Incidents</Text>
          </View>
          <View style={listStyles.headerRight}>
            <TouchableOpacity activeOpacity={0.8} style={listStyles.headerIconButton}>
              <Ionicons name="funnel-outline" size={19} color="rgba(255,255,255,0.9)" />
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.8} style={listStyles.headerIconButton}>
              <Ionicons name="notifications-outline" size={19} color="rgba(255,255,255,0.9)" />
              <View style={listStyles.bellDot} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Summary strip */}
        <View style={listStyles.summaryStrip}>
          {(['Pending', 'Responding', 'Verified', 'Resolved'] as IncidentStatus[]).map((s, index, arr) => (
            <React.Fragment key={s}>
              <View style={listStyles.summaryItem}>
                <Text style={[listStyles.summaryValue, { color: STATUS_STYLE[s].dot }]}>
                  {FILTER_COUNT(MOCK_INCIDENTS, s)}
                </Text>
                <Text style={listStyles.summaryLabel}>{s}</Text>
              </View>
              {index < arr.length - 1 && <View style={listStyles.summaryDivider} />}
            </React.Fragment>
          ))}
        </View>

        {/* Search bar */}
        <View style={listStyles.searchBar}>
          <Ionicons name="search-outline" size={17} color="rgba(255,255,255,0.6)" />
          <TextInput
            style={listStyles.searchInput}
            placeholder="Search by ID, reporter, barangay..."
            placeholderTextColor="rgba(255,255,255,0.5)"
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')} activeOpacity={0.7} hitSlop={8}>
              <Ionicons name="close-circle" size={17} color="rgba(255,255,255,0.6)" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── Filter chips ── */}
      <View style={listStyles.filtersWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={listStyles.filtersScroll}
        >
          {FILTER_CHIPS.map((chip) => {
            const active = activeFilter === chip;
            const count = FILTER_COUNT(MOCK_INCIDENTS, chip);
            return (
              <TouchableOpacity
                key={chip}
                activeOpacity={0.8}
                style={[listStyles.filterChip, active && listStyles.filterChipActive]}
                onPress={() => setActiveFilter(chip)}
              >
                <Text style={[listStyles.filterChipText, active && listStyles.filterChipTextActive]}>
                  {chip}
                </Text>
                <View style={[listStyles.filterChipCount, active && listStyles.filterChipCountActive]}>
                  <Text style={[listStyles.filterChipCountText, active && listStyles.filterChipCountTextActive]}>
                    {count}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ── Incident list ── */}
      <ScrollView
        style={listStyles.scrollView}
        contentContainerStyle={listStyles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {filtered.length === 0 ? (
          <View style={listStyles.emptyState}>
            <View style={listStyles.emptyIconWrap}>
              <MaterialCommunityIcons name="fire-off" size={36} color={COLORS.mutedText} />
            </View>
            <Text style={listStyles.emptyTitle}>No incidents found</Text>
            <Text style={listStyles.emptySubtitle}>
              {search
                ? 'Try a different search term.'
                : `No ${activeFilter.toLowerCase()} incidents at the moment.`}
            </Text>
          </View>
        ) : (
          <>
            <Text style={listStyles.resultCount}>
              {filtered.length} incident{filtered.length !== 1 ? 's' : ''}
              {activeFilter !== 'All' ? ` · ${activeFilter}` : ''}
            </Text>
            {filtered.map((incident) => (
              <IncidentCard
                key={incident.id}
                incident={incident}
                onViewDetails={handleViewDetails}
              />
            ))}
          </>
        )}
        <View style={{ height: 32 }} />
      </ScrollView>

      {/* ── Details Modal ── */}
      <IncidentDetailsModal
        incident={selectedIncident}
        visible={detailsVisible}
        onClose={() => setDetailsVisible(false)}
      />
    </SafeAreaView>
  );
}

// ────────────────────────────────────────────────────────────
// List Styles
// ────────────────────────────────────────────────────────────

const listStyles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.deepIndigo },
  header: {
    backgroundColor: COLORS.deepIndigo,
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 16,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  headerEyebrow: {
    fontSize: FONT_SIZES.tiny,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.55)',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 3,
  },
  headerTitle: {
    fontSize: FONT_SIZES.sectionHeading,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  headerRight: { flexDirection: 'row', gap: 8 },
  // Touch-Friendly: 44px min tap target
  headerIconButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  bellDot: {
    position: 'absolute',
    top: 10,
    right: 11,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: COLORS.primaryOrange,
    borderWidth: 1.5,
    borderColor: COLORS.deepIndigo,
  },
  summaryStrip: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    paddingVertical: 13,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  summaryItem: { flex: 1, alignItems: 'center', gap: 3 },
  summaryDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.12)', marginVertical: 4 },
  summaryValue: { fontSize: FONT_SIZES.cardTitle, fontWeight: '800' },
  summaryLabel: { fontSize: FONT_SIZES.tiny, color: 'rgba(255,255,255,0.55)', fontWeight: '600' },
  // Readability: stronger contrast on search bar (text + placeholder were
  // barely visible before against the dark background)
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 48,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  searchInput: { flex: 1, fontSize: FONT_SIZES.secondary, color: '#FFFFFF', padding: 0 },
  filtersWrap: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 16,
    marginTop: -4,
  },
  filtersScroll: { paddingHorizontal: 20, gap: 8, paddingBottom: 14 },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    height: 38,
    borderRadius: 999,
    backgroundColor: COLORS.surfaceMuted,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterChipActive: { backgroundColor: COLORS.deepIndigo, borderColor: COLORS.deepIndigo },
  filterChipText: { fontSize: FONT_SIZES.caption, fontWeight: '700', color: COLORS.slateText },
  filterChipTextActive: { color: '#FFFFFF' },
  filterChipCount: { backgroundColor: COLORS.border, borderRadius: 999, paddingHorizontal: 7, paddingVertical: 2 },
  filterChipCountActive: { backgroundColor: 'rgba(255,255,255,0.18)' },
  filterChipCountText: { fontSize: FONT_SIZES.tiny, fontWeight: '700', color: COLORS.slateText },
  filterChipCountTextActive: { color: '#FFFFFF' },
  scrollView: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { paddingHorizontal: 20, paddingTop: 6 },
  resultCount: {
    fontSize: FONT_SIZES.caption,
    fontWeight: '700',
    color: COLORS.mutedText,
    marginBottom: 14,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  incidentCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  cardStrip: { width: 4 },
  cardInner: { flex: 1, padding: 16, gap: 10 },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardTopLeft: { flex: 1, gap: 8 },
  refId: { fontSize: FONT_SIZES.caption, fontWeight: '800', color: COLORS.accentViolet, letterSpacing: 0.4 },
  badgeRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  photoBadge: { width: 30, height: 30, borderRadius: 10, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center' },
  incidentType: { fontSize: FONT_SIZES.body, fontWeight: '800', color: COLORS.deepIndigo },
  incidentDescription: { fontSize: FONT_SIZES.caption, color: COLORS.slateText, lineHeight: 18 },
  // Simplicity + Readability: one scrollable meta row of chips instead of a
  // stacked label/value grid — less vertical noise, still fully scannable.
  metaRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.surfaceMuted,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  metaChipText: { fontSize: FONT_SIZES.tiny, color: COLORS.slateText, fontWeight: '600', maxWidth: 120 },
  actionRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  // Touch-Friendly: min height 44, and secondary/primary contrast is clearer
  actionButtonOutline: {
    flex: 1,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    height: 44, borderRadius: 12,
    backgroundColor: COLORS.surfaceMuted, borderWidth: 1, borderColor: COLORS.border,
  },
  actionButtonOutlineText: { fontSize: FONT_SIZES.caption, fontWeight: '700', color: COLORS.deepIndigo },
  actionButtonVerify: {
    flex: 1,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    height: 44, borderRadius: 12,
    backgroundColor: '#EEF2FF', borderWidth: 1, borderColor: 'rgba(109,91,208,0.25)',
  },
  actionButtonVerifyText: { fontSize: FONT_SIZES.caption, fontWeight: '700', color: COLORS.accentViolet },
  actionButtonUpdate: {
    flex: 1,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    height: 44, borderRadius: 12,
    backgroundColor: COLORS.deepIndigo,
  },
  actionButtonUpdateText: { fontSize: FONT_SIZES.caption, fontWeight: '700', color: '#FFFFFF' },
  resolvedTag: {
    flex: 1,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    height: 44, borderRadius: 12, backgroundColor: '#ECFDF5',
  },
  resolvedTagText: { fontSize: FONT_SIZES.caption, fontWeight: '700', color: COLORS.successGreen },
  emptyState: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 32 },
  emptyIconWrap: {
    width: 72, height: 72, borderRadius: 24, backgroundColor: COLORS.surfaceMuted,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
    borderWidth: 1, borderColor: COLORS.border,
  },
  emptyTitle: { fontSize: FONT_SIZES.cardTitle, fontWeight: '700', color: COLORS.deepIndigo, marginBottom: 6, textAlign: 'center' },
  emptySubtitle: { fontSize: FONT_SIZES.secondary, color: COLORS.mutedText, textAlign: 'center', lineHeight: 20 },
});

// ────────────────────────────────────────────────────────────
// Detail Modal Styles
// ────────────────────────────────────────────────────────────

const detailStyles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(17,24,39,0.55)' },
  sheet: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: SCREEN_HEIGHT * 0.92,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: COLORS.border, alignSelf: 'center', marginTop: 12, marginBottom: 4,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  sheetHeaderLeft: { flex: 1 },
  sheetRefId: { fontSize: FONT_SIZES.caption, fontWeight: '800', color: COLORS.accentViolet, letterSpacing: 0.4, marginBottom: 8 },
  sheetBadgeRow: { flexDirection: 'row', gap: 6 },
  // Touch-Friendly: bumped from 36 to 44
  closeButton: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: COLORS.surfaceMuted, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: COLORS.border,
  },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 16 },

  // Section cards
  sectionCard: {
    backgroundColor: COLORS.card, borderRadius: 20, borderWidth: 1,
    borderColor: COLORS.border, padding: 16, marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 8, elevation: 1,
  },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  sectionIconWrap: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { fontSize: FONT_SIZES.secondary, fontWeight: '700', color: COLORS.deepIndigo },

  // Incident info
  incidentTypeTitle: { fontSize: FONT_SIZES.cardTitle, fontWeight: '800', color: COLORS.deepIndigo, marginBottom: 6 },
  incidentDesc: { fontSize: FONT_SIZES.secondary, color: COLORS.slateText, lineHeight: 21, marginBottom: 16 },
  infoGrid: {
    backgroundColor: COLORS.surfaceMuted, borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 4,
    borderWidth: 1, borderColor: COLORS.border,
  },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingVertical: 12 },
  infoLabel: { fontSize: FONT_SIZES.caption, color: COLORS.mutedText, fontWeight: '600', width: 68 },
  infoValue: { fontSize: FONT_SIZES.caption, color: COLORS.deepIndigo, fontWeight: '700', flex: 1, lineHeight: 18 },
  infoDivider: { height: 1, backgroundColor: COLORS.border },

  // Reporter
  reporterRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  reporterAvatar: {
    width: 46, height: 46, borderRadius: 14,
    backgroundColor: 'rgba(109,91,208,0.12)', alignItems: 'center', justifyContent: 'center',
  },
  reporterAvatarText: { fontSize: FONT_SIZES.secondary, fontWeight: '800', color: COLORS.accentViolet },
  reporterMeta: { flex: 1 },
  reporterName: { fontSize: FONT_SIZES.secondary, fontWeight: '700', color: COLORS.deepIndigo, marginBottom: 2 },
  reporterSub: { fontSize: FONT_SIZES.caption, color: COLORS.slateText },
  // Touch-Friendly: 44px
  callButton: {
    width: 44, height: 44, borderRadius: 13,
    backgroundColor: COLORS.successGreen, alignItems: 'center', justifyContent: 'center',
  },

  // Photos
  photosRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  photoThumb: {
    flex: 1, height: 90, borderRadius: 14, overflow: 'hidden',
    backgroundColor: COLORS.surfaceMuted, borderWidth: 1, borderColor: COLORS.border,
  },
  photoThumbInner: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4 },
  photoThumbLabel: { fontSize: FONT_SIZES.tiny, color: COLORS.mutedText, fontWeight: '600' },
  primaryPhotoBadge: {
    position: 'absolute', bottom: 6, left: 6,
    backgroundColor: COLORS.deepIndigo, borderRadius: 999, paddingHorizontal: 7, paddingVertical: 3,
  },
  primaryPhotoBadgeText: { fontSize: FONT_SIZES.tiny, color: '#FFFFFF', fontWeight: '700' },
  photoCaptureNote: { fontSize: FONT_SIZES.tiny, color: COLORS.mutedText, lineHeight: 16 },

  // Map
  mapPreview: { borderRadius: 16, overflow: 'hidden', marginBottom: 12 },
  mapBg: {
    height: 130, backgroundColor: '#EEF2FF', position: 'relative', overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center',
  },
  mapGridH: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: 'rgba(109,91,208,0.12)' },
  mapGridV: { position: 'absolute', top: 0, bottom: 0, width: 1, backgroundColor: 'rgba(109,91,208,0.12)' },
  mapPin: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: COLORS.criticalRed, alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: '#FFFFFF',
    shadowColor: COLORS.criticalRed, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 6, elevation: 4,
  },
  mapExpandCta: {
    position: 'absolute', bottom: 8, right: 8, flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6,
    borderWidth: 1, borderColor: COLORS.border,
  },
  mapExpandText: { fontSize: FONT_SIZES.tiny, fontWeight: '700', color: COLORS.deepIndigo },
  coordRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  coordText: { fontSize: FONT_SIZES.caption, color: COLORS.slateText, fontWeight: '500', flex: 1 },
  gpsLockedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#ECFDF5', borderRadius: 999, paddingHorizontal: 9, paddingVertical: 5,
  },
  gpsLockedDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.successGreen },
  gpsLockedText: { fontSize: FONT_SIZES.tiny, fontWeight: '700', color: COLORS.successGreen },

  // Timeline
  timeline: { paddingTop: 4 },
  timelineRow: { flexDirection: 'row', gap: 14 },
  timelineLeft: { alignItems: 'center', width: 32 },
  timelineIcon: {
    width: 32, height: 32, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  timelineLine: { width: 2, flex: 1, marginVertical: 4, borderRadius: 1 },
  timelineContent: { flex: 1, paddingBottom: 4 },
  timelineStep: { fontSize: FONT_SIZES.secondary, fontWeight: '700', marginBottom: 3 },
  timelineActivePill: { fontSize: FONT_SIZES.tiny, color: COLORS.primaryOrange, fontWeight: '700' },
  timelineMeta: { fontSize: FONT_SIZES.caption, color: COLORS.slateText },
  timelinePending: { fontSize: FONT_SIZES.caption, color: COLORS.mutedText, fontStyle: 'italic' },

  // Actions card — clear primary/secondary/destructive hierarchy:
  // 1 solid primary action, 1 neutral secondary, 1 tinted tertiary,
  // 1 destructive outline — each visually distinct by weight, not just color.
  actionsCard: {
    backgroundColor: COLORS.card, borderRadius: 20, borderWidth: 1,
    borderColor: COLORS.border, padding: 16, marginBottom: 16, gap: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 8, elevation: 1,
  },
  actionsTitle: { fontSize: FONT_SIZES.secondary, fontWeight: '800', color: COLORS.deepIndigo, marginBottom: 4 },
  actionPrimary: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: COLORS.accentViolet, borderRadius: 14, height: 52,
    shadowColor: COLORS.accentViolet, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 3,
  },
  actionDispatch: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: COLORS.criticalRed, borderRadius: 14, height: 52,
    shadowColor: COLORS.criticalRed, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 3,
  },
  actionPrimaryText: { fontSize: FONT_SIZES.body, fontWeight: '700', color: '#FFFFFF' },
  actionUpdate: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: COLORS.surfaceMuted, borderRadius: 14, height: 48,
    borderWidth: 1, borderColor: COLORS.border,
  },
  actionUpdateText: { fontSize: FONT_SIZES.secondary, fontWeight: '700', color: COLORS.deepIndigo },
  actionEvidence: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#EEF2FF', borderRadius: 14, height: 48,
    borderWidth: 1, borderColor: 'rgba(109,91,208,0.2)',
  },
  actionEvidenceText: { fontSize: FONT_SIZES.secondary, fontWeight: '700', color: COLORS.accentViolet },
  actionFalse: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: 'transparent', borderRadius: 14, height: 48,
    borderWidth: 1.5, borderColor: 'rgba(220,38,38,0.3)',
  },
  actionFalseText: { fontSize: FONT_SIZES.secondary, fontWeight: '700', color: COLORS.criticalRed },
});