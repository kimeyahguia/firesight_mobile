import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import {
  COLORS,
  RISK_COLORS,
  ALERT_COLORS,
  RiskLevel,
  AlertType,
} from '@/constants/theme';

// ────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  emphasized?: boolean;
}

interface BarangayRisk {
  id: string;
  name: string;
  risk: RiskLevel;
  incidents: number;
}

interface EmergencyContact {
  id: string;
  name: string;
  role: string;
  phone: string;
  icon: keyof typeof Ionicons.glyphMap;
}

interface AlertItem {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  type: AlertType;
}

interface ResourceItem {
  id: string;
  title: string;
  snippet: string;
  category: string;
}

// ────────────────────────────────────────────────────────────
// Mock Data
// ────────────────────────────────────────────────────────────

const QUICK_ACTIONS: QuickAction[] = [
  {
    id: 'report',
    title: 'Report Fire',
    description: 'Send an alert now',
    icon: 'flame',
    emphasized: true,
  },
  {
    id: 'map',
    title: 'Risk Map',
    description: 'View area risk levels',
    icon: 'map',
  },
  {
    id: 'contacts',
    title: 'Emergency Contacts',
    description: 'BFP, MDRRMO & more',
    icon: 'call',
  },
  {
    id: 'tips',
    title: 'Safety Tips',
    description: 'Learn prevention basics',
    icon: 'book',
  },
];

const BARANGAY_RISKS: BarangayRisk[] = [
  { id: '1', name: 'Lian Proper', risk: 'High', incidents: 3 },
  { id: '2', name: 'Bungahan', risk: 'Moderate', incidents: 1 },
  { id: '3', name: 'Lumaniag', risk: 'Low', incidents: 0 },
  { id: '4', name: 'Balaytigui', risk: 'Moderate', incidents: 2 },
  { id: '5', name: 'Caybunga', risk: 'Low', incidents: 0 },
];

const EMERGENCY_CONTACTS: EmergencyContact[] = [
  {
    id: '1',
    name: 'BFP Lian Fire Station',
    role: 'Fire & Rescue',
    phone: '(043) 740 1234',
    icon: 'flame',
  },
  {
    id: '2',
    name: 'MDRRMO Lian',
    role: 'Disaster Risk Reduction',
    phone: '(043) 740 5678',
    icon: 'shield-checkmark',
  },
  {
    id: '3',
    name: 'Barangay Emergency Hotline',
    role: 'Local Response Unit',
    phone: '0917 123 4567',
    icon: 'megaphone',
  },
];

const ALERTS: AlertItem[] = [
  {
    id: '1',
    title: 'High Heat Index Warning',
    description: 'Elevated temperatures increase fire risk this week.',
    timestamp: '2h ago',
    type: 'Warning',
  },
  {
    id: '2',
    title: 'Community Fire Drill',
    description: 'Scheduled drill for Barangay Lian Proper this weekend.',
    timestamp: '1d ago',
    type: 'Drill',
  },
  {
    id: '3',
    title: 'Incident Resolved',
    description: 'Reported incident in Balaytigui has been addressed.',
    timestamp: '2d ago',
    type: 'Resolved',
  },
];

const RESOURCES: ResourceItem[] = [
  {
    id: '1',
    title: 'Top Fire Prevention Tips at Home',
    snippet: 'Simple habits that significantly reduce household fire risk.',
    category: 'Prevention',
  },
  {
    id: '2',
    title: 'What To Do During an LPG Fire',
    snippet: 'Step-by-step actions to stay safe during a gas-related fire.',
    category: 'Emergency',
  },
  {
    id: '3',
    title: 'Electrical Safety Checklist',
    snippet: 'Common wiring hazards to check in your home regularly.',
    category: 'Checklist',
  },
];

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ────────────────────────────────────────────────────────────
// Sub-components
// ────────────────────────────────────────────────────────────

function SectionHeader({ title, actionLabel }: { title: string; actionLabel?: string }) {
  return (
    <View style={styles.sectionHeaderRow}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {actionLabel ? (
        <TouchableOpacity activeOpacity={0.6}>
          <Text style={styles.sectionAction}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

function RiskBadge({ risk }: { risk: RiskLevel }) {
  const palette = RISK_COLORS[risk];
  return (
    <View style={[styles.riskBadge, { backgroundColor: palette.bg }]}>
      <View style={[styles.riskDot, { backgroundColor: palette.dot }]} />
      <Text style={[styles.riskBadgeText, { color: palette.text }]}>{risk} Risk</Text>
    </View>
  );
}

function AlertBadge({ type }: { type: AlertType }) {
  const palette = ALERT_COLORS[type];
  return (
    <View style={[styles.alertBadge, { backgroundColor: palette.bg }]}>
      <Text style={[styles.alertBadgeText, { color: palette.text }]}>{type}</Text>
    </View>
  );
}

function QuickActionCard({ action }: { action: QuickAction }) {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      style={[
        styles.quickActionCard,
        action.emphasized && styles.quickActionCardEmphasized,
      ]}
    >
      <View
        style={[
          styles.quickActionIconWrap,
          action.emphasized && styles.quickActionIconWrapEmphasized,
        ]}
      >
        <Ionicons
          name={action.icon}
          size={22}
          color={action.emphasized ? '#FFFFFF' : COLORS.deepIndigo}
        />
      </View>
      <Text
        style={[
          styles.quickActionTitle,
          action.emphasized && styles.quickActionTitleEmphasized,
        ]}
      >
        {action.title}
      </Text>
      <Text
        style={[
          styles.quickActionDescription,
          action.emphasized && styles.quickActionDescriptionEmphasized,
        ]}
      >
        {action.description}
      </Text>
    </TouchableOpacity>
  );
}

function BarangayCard({ item }: { item: BarangayRisk }) {
  const palette = RISK_COLORS[item.risk];
  return (
    <View style={styles.barangayCard}>
      <View style={styles.barangayCardHeader}>
        <View style={[styles.barangayDot, { backgroundColor: palette.dot }]} />
        <Text style={styles.barangayName} numberOfLines={1}>
          {item.name}
        </Text>
      </View>
      <Text style={[styles.barangayRiskLabel, { color: palette.text }]}>{item.risk}</Text>
      <Text style={styles.barangayIncidents}>
        {item.incidents} {item.incidents === 1 ? 'incident' : 'incidents'} this month
      </Text>
    </View>
  );
}

function ContactRow({ contact }: { contact: EmergencyContact }) {
  return (
    <View style={styles.contactRow}>
      <View style={styles.contactIconWrap}>
        <Ionicons name={contact.icon} size={18} color={COLORS.primaryOrange} />
      </View>
      <View style={styles.contactInfo}>
        <Text style={styles.contactName}>{contact.name}</Text>
        <Text style={styles.contactRole}>{contact.role}</Text>
        <Text style={styles.contactPhone}>{contact.phone}</Text>
      </View>
      <TouchableOpacity activeOpacity={0.8} style={styles.callButton}>
        <Ionicons name="call" size={16} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}

function AlertRow({ item }: { item: AlertItem }) {
  return (
    <View style={styles.alertRow}>
      <View style={styles.alertRowTop}>
        <Text style={styles.alertTitle}>{item.title}</Text>
        <AlertBadge type={item.type} />
      </View>
      <Text style={styles.alertDescription}>{item.description}</Text>
      <Text style={styles.alertTimestamp}>{item.timestamp}</Text>
    </View>
  );
}

function ResourceCard({ item }: { item: ResourceItem }) {
  return (
    <TouchableOpacity activeOpacity={0.85} style={styles.resourceCard}>
      <View style={styles.resourceChip}>
        <Text style={styles.resourceChipText}>{item.category}</Text>
      </View>
      <Text style={styles.resourceTitle}>{item.title}</Text>
      <Text style={styles.resourceSnippet}>{item.snippet}</Text>
    </TouchableOpacity>
  );
}

// ────────────────────────────────────────────────────────────
// Main Screen
// ────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const [currentRisk] = useState<RiskLevel>('Moderate');

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.greeting}>Good Morning, Kimberly</Text>
            <View style={styles.locationRow}>
              <Ionicons name="location" size={13} color={COLORS.slateText} />
              <Text style={styles.locationText}>Lian, Batangas</Text>
            </View>
          </View>
          <TouchableOpacity activeOpacity={0.7} style={styles.bellButton}>
            <Ionicons name="notifications-outline" size={22} color={COLORS.deepIndigo} />
            <View style={styles.bellDot} />
          </TouchableOpacity>
        </View>

        {/* Hero Fire Risk Card */}
        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <Text style={styles.heroLabel}>Current Fire Risk</Text>
            <RiskBadge risk={currentRisk} />
          </View>

          <Text style={styles.heroDescription}>
            Conditions are trending warmer than usual. Stay alert and review fire
            prevention measures in your household.
          </Text>

          <View style={styles.heroContextRow}>
            <MaterialCommunityIcons name="fire-alert" size={16} color={COLORS.primaryOrange} />
            <Text style={styles.heroContextText}>
              2 fire-related incidents reported nearby this week
            </Text>
          </View>

          <View style={styles.heroActionsRow}>
            <TouchableOpacity activeOpacity={0.85} style={styles.heroSecondaryButton}>
              <Ionicons name="map-outline" size={16} color={COLORS.deepIndigo} />
              <Text style={styles.heroSecondaryButtonText}>View Risk Map</Text>
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.85} style={styles.heroPrimaryButton}>
              <Ionicons name="flame" size={16} color="#FFFFFF" />
              <Text style={styles.heroPrimaryButtonText}>Report Fire</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.heroUpdatedText}>Last updated 12 minutes ago</Text>
        </View>

        {/* Quick Actions */}
        <SectionHeader title="Quick Actions" />
        <View style={styles.quickActionsGrid}>
          {QUICK_ACTIONS.map((action) => (
            <QuickActionCard key={action.id} action={action} />
          ))}
        </View>

        {/* Risk by Area */}
        <SectionHeader title="Risk by Area" actionLabel="See Map" />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.barangayScrollContent}
        >
          {BARANGAY_RISKS.map((item) => (
            <BarangayCard key={item.id} item={item} />
          ))}
        </ScrollView>

        {/* Emergency Contacts */}
        <SectionHeader title="Emergency Contacts" />
        <View style={styles.contactsCard}>
          {EMERGENCY_CONTACTS.map((contact, index) => (
            <View key={contact.id}>
              <ContactRow contact={contact} />
              {index < EMERGENCY_CONTACTS.length - 1 && <View style={styles.divider} />}
            </View>
          ))}
        </View>

        {/* Latest Alerts */}
        <SectionHeader title="Latest Alerts" actionLabel="View All" />
        <View style={styles.alertsCard}>
          {ALERTS.map((item, index) => (
            <View key={item.id}>
              <AlertRow item={item} />
              {index < ALERTS.length - 1 && <View style={styles.divider} />}
            </View>
          ))}
        </View>

        {/* Safety Resources */}
        <SectionHeader title="Safety Resources" actionLabel="See All" />
        <View style={styles.resourcesList}>
          {RESOURCES.map((item) => (
            <ResourceCard key={item.id} item={item} />
          ))}
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ────────────────────────────────────────────────────────────
// Styles
// ────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },

  // Header
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  greeting: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.deepIndigo,
    letterSpacing: -0.3,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  locationText: {
    fontSize: 13,
    color: COLORS.slateText,
    fontWeight: '500',
  },
  bellButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: COLORS.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  bellDot: {
    position: 'absolute',
    top: 10,
    right: 11,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primaryOrange,
    borderWidth: 1.5,
    borderColor: COLORS.card,
  },

  // Hero Card
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
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  heroLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.85)',
  },
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
  heroDescription: {
    fontSize: 13.5,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 19,
    marginBottom: 14,
  },
  heroContextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(249,115,22,0.18)',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 18,
  },
  heroContextText: {
    fontSize: 12.5,
    color: '#FDBA74',
    fontWeight: '500',
    flex: 1,
  },
  heroActionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  heroSecondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 14,
    paddingVertical: 12,
  },
  heroSecondaryButtonText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: COLORS.deepIndigo,
  },
  heroPrimaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.primaryOrange,
    borderRadius: 14,
    paddingVertical: 12,
  },
  heroPrimaryButtonText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  heroUpdatedText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.45)',
    marginTop: 14,
    textAlign: 'center',
  },

  // Section header
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.deepIndigo,
  },
  sectionAction: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primaryOrange,
  },

  // Quick Actions
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 28,
  },
  quickActionCard: {
    width: (SCREEN_WIDTH - 40 - 12) / 2,
    backgroundColor: COLORS.card,
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  quickActionCardEmphasized: {
    backgroundColor: COLORS.primaryOrange,
    borderColor: COLORS.primaryOrange,
  },
  quickActionIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: COLORS.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  quickActionIconWrapEmphasized: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  quickActionTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: COLORS.deepIndigo,
    marginBottom: 3,
  },
  quickActionTitleEmphasized: {
    color: '#FFFFFF',
  },
  quickActionDescription: {
    fontSize: 12,
    color: COLORS.slateText,
    lineHeight: 16,
  },
  quickActionDescriptionEmphasized: {
    color: 'rgba(255,255,255,0.85)',
  },

  // Barangay cards
  barangayScrollContent: {
    paddingRight: 8,
    marginBottom: 28,
  },
  barangayCard: {
    width: 150,
    backgroundColor: COLORS.card,
    borderRadius: 18,
    padding: 16,
    marginRight: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  barangayCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  barangayDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  barangayName: {
    fontSize: 13.5,
    fontWeight: '700',
    color: COLORS.deepIndigo,
    flex: 1,
  },
  barangayRiskLabel: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  barangayIncidents: {
    fontSize: 11.5,
    color: COLORS.slateText,
  },

  // Contacts
  contactsCard: {
    backgroundColor: COLORS.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 28,
    paddingHorizontal: 16,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 12,
  },
  contactIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.contactIconBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.deepIndigo,
    marginBottom: 2,
  },
  contactRole: {
    fontSize: 11.5,
    color: COLORS.slateText,
    marginBottom: 2,
  },
  contactPhone: {
    fontSize: 12.5,
    color: COLORS.slateText,
    fontWeight: '600',
  },
  callButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.successGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
  },

  // Alerts
  alertsCard: {
    backgroundColor: COLORS.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 28,
    paddingHorizontal: 16,
  },
  alertRow: {
    paddingVertical: 14,
  },
  alertRowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
    gap: 8,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.deepIndigo,
    flex: 1,
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
  alertDescription: {
    fontSize: 12.5,
    color: COLORS.slateText,
    lineHeight: 17,
    marginBottom: 6,
  },
  alertTimestamp: {
    fontSize: 11,
    color: COLORS.mutedText,
  },

  // Resources
  resourcesList: {
    gap: 12,
  },
  resourceCard: {
    backgroundColor: COLORS.card,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  resourceChip: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.surfaceMuted,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 10,
  },
  resourceChipText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: COLORS.accentViolet,
  },
  resourceTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: COLORS.deepIndigo,
    marginBottom: 4,
  },
  resourceSnippet: {
    fontSize: 12.5,
    color: COLORS.slateText,
    lineHeight: 17,
  },
});