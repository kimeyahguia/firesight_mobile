import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Modal, Pressable } from 'react-native';
import { router } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '@/constants/theme';
import { RiskLevel } from '@/constants/types';
import {
  QUICK_ACTIONS,
  BARANGAY_RISKS,
  EMERGENCY_CONTACTS,
  ALERTS,
  RESOURCES,
} from '@/constants/data';

import ScreenContainer from '@/components/common/ScreenContainer';
import AppHeader from '@/components/common/AppHeader';
import SectionHeader from '@/components/common/SectionHeader';
import StatusBadge from '@/components/common/StatusBadge';
import ActionCard from '@/components/common/ActionCard';
import PrimaryButton from '@/components/common/PrimaryButton';

// ────────────────────────────────────────────────────────────
// Small home-only sub-components (not reused elsewhere, so they
// stay local instead of cluttering components/common/)
// ────────────────────────────────────────────────────────────

function BarangayCard({ item }: { item: (typeof BARANGAY_RISKS)[number] }) {
  return (
    <View style={styles.barangayCard}>
      <View style={styles.barangayCardHeader}>
        <StatusBadge variant="risk" value={item.risk} />
      </View>
      <Text style={styles.barangayName} numberOfLines={1}>
        {item.name}
      </Text>
      <Text style={styles.barangayIncidents}>
        {item.incidents} {item.incidents === 1 ? 'incident' : 'incidents'} this month
      </Text>
    </View>
  );
}

function ContactRow({ contact }: { contact: (typeof EMERGENCY_CONTACTS)[number] }) {
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

function AlertRow({ item }: { item: (typeof ALERTS)[number] }) {
  return (
    <View style={styles.alertRow}>
      <View style={styles.alertRowTop}>
        <Text style={styles.alertTitle}>{item.title}</Text>
        <StatusBadge variant="alert" value={item.type} />
      </View>
      <Text style={styles.alertDescription}>{item.description}</Text>
      <Text style={styles.alertTimestamp}>{item.timestamp}</Text>
    </View>
  );
}

function ResourceCard({ item }: { item: (typeof RESOURCES)[number] }) {
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
  const [logoutVisible, setLogoutVisible] = useState(false);

  const handleLogout = () => {
    setLogoutVisible(false);
    router.replace('/login');
  };

  return (
    <ScreenContainer>
      <AppHeader
        title="Good Morning, Kimberly"
        subtitle="Lian, Batangas"
        showLocation
        showLogout
        onLogoutPress={() => setLogoutVisible(true)}
      />

      {/* Hero Fire Risk Card */}
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
          <Text style={styles.heroContextText}>
            2 fire-related incidents reported nearby this week
          </Text>
        </View>

        <View style={styles.heroActionsRow}>
          <PrimaryButton
            label="View Risk Map"
            icon="map-outline"
            variant="secondary"
            fullWidth
          />
          <PrimaryButton
            label="Report Fire"
            icon="flame"
            variant="primary"
            fullWidth
          />
        </View>

        <Text style={styles.heroUpdatedText}>Last updated 12 minutes ago</Text>
      </View>

      {/* Quick Actions */}
      <SectionHeader title="Quick Actions" />
      <View style={styles.quickActionsGrid}>
        {QUICK_ACTIONS.map((action) => (
          <ActionCard key={action.id} action={action} />
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

      {/* Logout Confirmation Modal */}
      <Modal
        visible={logoutVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setLogoutVisible(false)}
      >
        <View style={styles.logoutOverlay}>
          <Pressable style={styles.logoutBackdrop} onPress={() => setLogoutVisible(false)} />
          <View style={styles.logoutCard}>
            <View style={styles.logoutIconWrap}>
              <Ionicons name="log-out-outline" size={26} color={COLORS.primaryOrange} />
            </View>
            <Text style={styles.logoutTitle}>Log Out</Text>
            <Text style={styles.logoutMessage}>Are you sure you want to log out?</Text>

            <View style={styles.logoutActionsRow}>
              <TouchableOpacity
                activeOpacity={0.8}
                style={styles.logoutCancelButton}
                onPress={() => setLogoutVisible(false)}
              >
                <Text style={styles.logoutCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.85}
                style={styles.logoutConfirmButton}
                onPress={handleLogout}
              >
                <Text style={styles.logoutConfirmText}>Log Out</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

// ────────────────────────────────────────────────────────────
// Styles (home-screen-specific only — shared styles now live
// inside their respective components/common/* files)
// ────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
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
  heroUpdatedText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.45)',
    marginTop: 14,
    textAlign: 'center',
  },

  // Quick Actions
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 28,
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
    marginBottom: 10,
    alignItems: 'flex-start',
  },
  barangayName: {
    fontSize: 13.5,
    fontWeight: '700',
    color: COLORS.deepIndigo,
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

  // Logout confirmation modal
  logoutOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  logoutBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(17,24,39,0.5)',
  },
  logoutCard: {
    width: '100%',
    backgroundColor: COLORS.card,
    borderRadius: 22,
    padding: 24,
    alignItems: 'center',
  },
  logoutIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: COLORS.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  logoutTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.deepIndigo,
    marginBottom: 6,
  },
  logoutMessage: {
    fontSize: 13,
    color: COLORS.slateText,
    textAlign: 'center',
    marginBottom: 20,
  },
  logoutActionsRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  logoutCancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    backgroundColor: COLORS.surfaceMuted,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  logoutCancelText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: COLORS.deepIndigo,
  },
  logoutConfirmButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    backgroundColor: COLORS.criticalRed,
  },
  logoutConfirmText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});