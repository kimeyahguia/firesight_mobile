import {
  QuickAction,
  BarangayRisk,
  EmergencyContact,
  AlertItem,
  ResourceItem,
} from '@/constants/types';

// ────────────────────────────────────────────────────────────
// Shared mock data for FIRESIGHT
// ────────────────────────────────────────────────────────────

export const QUICK_ACTIONS: QuickAction[] = [
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

export const BARANGAY_RISKS: BarangayRisk[] = [
  { id: '1', name: 'Lian Proper', risk: 'High', incidents: 3 },
  { id: '2', name: 'Bungahan', risk: 'Moderate', incidents: 1 },
  { id: '3', name: 'Lumaniag', risk: 'Low', incidents: 0 },
  { id: '4', name: 'Balaytigui', risk: 'Moderate', incidents: 2 },
  { id: '5', name: 'Caybunga', risk: 'Low', incidents: 0 },
];

export const EMERGENCY_CONTACTS: EmergencyContact[] = [
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

export const ALERTS: AlertItem[] = [
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

export const RESOURCES: ResourceItem[] = [
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