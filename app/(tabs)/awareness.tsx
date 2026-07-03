import AppHeader from '@/components/common/AppHeader';
import { COLORS, FONT_SIZES } from '@/constants/theme';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  LayoutAnimation,
  Linking,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  UIManager,
  View,
} from 'react-native';

if (Platform.OS === 'android') {
  UIManager.setLayoutAnimationEnabledExperimental?.(true);
}

// ────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────

type IconName = keyof typeof Ionicons.glyphMap;

interface SafetyTopic {
  id: string;
  title: string;
  description: string;
  icon: IconName;
  content: string;
}

interface PreventionTip {
  id: string;
  text: string;
  icon: IconName;
}

interface QuizQuestion {
  id: string;
  question: string;
  choices: string[];
  correct: number;
  explanation: string;
}

interface EmergencyStep {
  id: string;
  step: number;
  text: string;
}

interface Officer {
  id: string;
  name: string;
  rank: string;
  role: string;
}

// Unified resource type — merges what used to be "guides" and "articles"
interface Resource {
  id: string;
  title: string;
  summary: string;
  category: string;
  icon: IconName;
  readTime: string;
  body: string[]; // step list or paragraph(s) — rendered as bullets either way
}

// ────────────────────────────────────────────────────────────
// BFP Lian Fire Station — Overview Data
// TODO: Replace ALL placeholder details (contact, address, officers,
// established year) with verified information from BFP Lian Fire Station.
// ────────────────────────────────────────────────────────────

const BFP_LIAN_INFO = {
  name: 'BFP Lian Fire Station',
  tagline: 'Serving Lian, Batangas with pride and readiness',
  address: 'Poblacion, Lian, Batangas', // TODO: confirm exact address
  contactNumber: '(043) 000-0000', // TODO: replace with real hotline
  emergencyHotline: '911',
  officeHours: 'Open 24/7 for emergency response',
  established: '—', // TODO: add actual founding year if available
  barangaysCovered: 22, // TODO: confirm actual number of barangays in Lian
  mission:
    'To prevent and suppress destructive fires, investigate their causes, enforce the Fire Code of the Philippines, and respond to man-made and natural disasters and other emergencies.',
  vision:
    'A center of excellence in fire protection service, committed to the safety and welfare of every resident of Lian, Batangas.',
  services: [
    'Fire suppression and emergency response',
    'Fire safety inspection and code enforcement',
    'Fire investigation',
    'Community fire safety education and drills',
    'Emergency medical assistance during incidents',
  ],
};

// PLACEHOLDER ONLY — dummy names/ranks for layout purposes.
// TODO: Replace with actual BFP Lian Fire Station personnel roster.
const BFP_OFFICERS: Officer[] = [
  { id: '1', name: 'Juan Dela Cruz', rank: 'F/Insp', role: 'Fire Marshal / Station Head' },
  { id: '2', name: 'Maria Santos', rank: 'F/SFO1', role: 'Deputy Fire Marshal' },
  { id: '3', name: 'Ramon Garcia', rank: 'F/FO2', role: 'Fire Suppression Team Lead' },
  { id: '4', name: 'Liza Reyes', rank: 'F/FO1', role: 'Community Education Officer' },
];

// ────────────────────────────────────────────────────────────
// Data
// ────────────────────────────────────────────────────────────

const SAFETY_TOPICS: SafetyTopic[] = [
  {
    id: 'home-prevention',
    title: 'Fire Prevention at Home',
    description: 'Everyday habits that reduce household fire risk.',
    icon: 'home-outline',
    content:
      'Most home fires are preventable. Never leave cooking unattended, keep flammable materials away from heat sources, and ensure your smoke detector is working. Unplug appliances when not in use and avoid overloading electrical outlets. Create a home escape plan with your family and practice it twice a year.',
  },
  {
    id: 'lpg-safety',
    title: 'LPG / Gas Leak Safety',
    description: 'Spot warning signs and respond to gas leaks safely.',
    icon: 'flame-outline',
    content:
      'If you smell gas, do not turn on any switches or use your phone inside. Open windows and doors immediately, turn off the LPG valve, and evacuate the area. Never use an open flame to check for leaks. Call your LPG provider or BFP once you are safely outside. Have your tank and hose inspected regularly.',
  },
  {
    id: 'electrical-safety',
    title: 'Electrical Fire Safety',
    description: 'Common wiring hazards and how to avoid them.',
    icon: 'flash-outline',
    content:
      'Faulty wiring is a leading cause of residential fires. Watch for warning signs: flickering lights, burning smell, warm outlets, or frequent tripped breakers. Do not use extension cords as permanent wiring. Have a licensed electrician inspect your home every few years, especially in older houses with aluminum wiring.',
  },
  {
    id: 'evacuation-basics',
    title: 'Evacuation Basics',
    description: 'Plan safe exit routes before an emergency happens.',
    icon: 'exit-outline',
    content:
      'Know at least two exits from every room in your home. Choose a meeting spot outside — like a neighbor\'s gate or the barangay hall — so everyone knows where to go. Practice your plan with children. In a real fire, stay low to avoid smoke, feel doors before opening them, and never go back inside for belongings.',
  },
];

const EMERGENCY_STEPS: EmergencyStep[] = [
  { id: '1', step: 1, text: 'Stay calm and alert people nearby' },
  { id: '2', step: 2, text: 'Call BFP Lian or 911 immediately' },
  { id: '3', step: 3, text: 'Evacuate through the safest route' },
  { id: '4', step: 4, text: 'Stay low to avoid smoke inhalation' },
  { id: '5', step: 5, text: 'Use an extinguisher only if the fire is small and manageable' },
];

const PREVENTION_TIPS: PreventionTip[] = [
  { id: '1', text: 'Do not overload outlets or extension cords', icon: 'flash-outline' },
  { id: '2', text: 'Have your LPG tank and hose checked regularly', icon: 'flame-outline' },
  { id: '3', text: 'Keep matches and lighters away from children', icon: 'shield-outline' },
  { id: '4', text: 'Prepare and practice your evacuation plan', icon: 'map-outline' },
];

// Merged former "guides" + "articles" into one compact resource list
const RESOURCES: Resource[] = [
  {
    id: 'house-fire-response',
    title: 'During a House Fire',
    summary: 'Steps to stay safe and get out fast.',
    category: 'Emergency',
    icon: 'exit-outline',
    readTime: '3 min',
    body: [
      'Shout "Fire!" or trigger the smoke alarm to alert everyone.',
      'Feel the door before opening — use another exit if hot.',
      'Stay low and crawl under smoke to reach the exit.',
      'Close doors behind you to slow the spread.',
      'Go to your meeting point, then call 911 or BFP Lian.',
      'Never re-enter a burning building.',
    ],
  },
  {
    id: 'kitchen-fire-guide',
    title: 'Kitchen Fire Response',
    summary: 'Handling grease fires and flare-ups.',
    category: 'Prevention',
    icon: 'flame-outline',
    readTime: '2 min',
    body: [
      'Slide a lid over a grease fire and turn off the heat — never use water.',
      'If it grows or spreads, leave immediately and call for help.',
      'Keep a fire extinguisher within easy reach in the kitchen.',
      'Never leave cooking unattended.',
    ],
  },
  {
    id: 'children-safety',
    title: 'Protecting Children',
    summary: 'Keeping kids safe during emergencies.',
    category: 'Family',
    icon: 'people-outline',
    readTime: '2 min',
    body: [
      'Teach kids to recognize the smoke alarm sound.',
      'Practice your escape plan together regularly.',
      'Assign a trusted adult to guide young children out.',
      'Remind them never to hide from firefighters.',
    ],
  },
  {
    id: 'brownout-safety',
    title: 'Brownouts & Power Surges',
    summary: 'Lower electrical fire risk during outages.',
    category: 'Electrical',
    icon: 'flash-outline',
    readTime: '2 min',
    body: [
      'Avoid candles near flammable materials during brownouts.',
      'Unplug appliances before an outage happens.',
      'Use surge protectors once power is restored.',
      'Consider a whole-house surge protector if outages are frequent.',
    ],
  },
];

const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: 'q1',
    question: 'What is the first thing to do if you smell a gas leak inside your home?',
    choices: [
      'Turn on the exhaust fan',
      'Call your neighbor using your phone inside',
      'Open windows and evacuate without touching any switches',
      'Look for the source of the leak with a lighter',
    ],
    correct: 2,
    explanation:
      'Any spark — even from a light switch or phone — can ignite leaking gas. Open windows, evacuate, and call for help only once you\'re safely outside.',
  },
  {
    id: 'q2',
    question: 'What does the "P" in the PASS fire extinguisher technique stand for?',
    choices: ['Press', 'Pull the pin', 'Point at the fire', 'Push the handle'],
    correct: 1,
    explanation:
      'PASS: Pull the pin, Aim at the base, Squeeze the handle, Sweep side to side. Always aim at the base — not the flames.',
  },
  {
    id: 'q3',
    question: 'When escaping a fire, you should:',
    choices: [
      'Stand upright and run quickly',
      'Stay low and crawl to avoid smoke',
      'Open all windows first',
      'Go back for important belongings',
    ],
    correct: 1,
    explanation:
      'Smoke rises, so the cleanest air is near the floor. Crawling keeps you below the smoke and gives you more time to escape safely.',
  },
  {
    id: 'q4',
    question: 'How often should you test your smoke detector?',
    choices: ['Once a year', 'Every 5 years', 'Monthly', 'Only after a fire incident'],
    correct: 2,
    explanation:
      'Test your smoke detector monthly by pressing the test button. Replace batteries every year and the entire unit every 10 years.',
  },
];

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  Emergency: { bg: '#FEE2E2', text: '#DC2626' },
  Prevention: { bg: '#FEF3C7', text: '#B45309' },
  Family: { bg: '#ECFDF5', text: '#15803D' },
  Electrical: { bg: '#FFF7ED', text: '#C2410C' },
};

// ────────────────────────────────────────────────────────────
// Sub-components
// ────────────────────────────────────────────────────────────

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={styles.sectionHeaderWrap}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
    </View>
  );
}

function BFPOverviewCard({
  expanded,
  onToggle,
}: {
  expanded: boolean;
  onToggle: () => void;
}) {
  const handleCall = (number: string) => {
    const cleaned = number.replace(/[^0-9+]/g, '');
    if (!cleaned) {
      Alert.alert('Unavailable', 'This contact number is not yet available.');
      return;
    }
    Linking.openURL(`tel:${cleaned}`).catch(() =>
      Alert.alert('Error', 'Unable to open the dialer on this device.')
    );
  };

  return (
    <View style={styles.bfpCard}>
      <View style={styles.bfpTopRow}>
        <View style={styles.bfpLogoWrap}>
          <MaterialCommunityIcons name="fire-truck" size={26} color={COLORS.primaryOrange} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.bfpName}>{BFP_LIAN_INFO.name}</Text>
          <Text style={styles.bfpTagline}>{BFP_LIAN_INFO.tagline}</Text>
        </View>
      </View>

      {/* Quick stats */}
      <View style={styles.bfpStatsRow}>
        <View style={styles.bfpStatBox}>
          <Text style={styles.bfpStatValue}>{BFP_LIAN_INFO.barangaysCovered}</Text>
          <Text style={styles.bfpStatLabel}>Barangays Covered</Text>
        </View>
        <View style={styles.bfpStatDivider} />
        <View style={styles.bfpStatBox}>
          <Text style={styles.bfpStatValue}>24/7</Text>
          <Text style={styles.bfpStatLabel}>Emergency Response</Text>
        </View>
        <View style={styles.bfpStatDivider} />
        <View style={styles.bfpStatBox}>
          <Text style={styles.bfpStatValue}>{BFP_LIAN_INFO.established}</Text>
          <Text style={styles.bfpStatLabel}>Established</Text>
        </View>
      </View>

      {/* Contact rows */}
      <View style={styles.bfpContactRow}>
        <Ionicons name="location-outline" size={16} color={COLORS.slateText} />
        <Text style={styles.bfpContactText}>{BFP_LIAN_INFO.address}</Text>
      </View>
      <View style={styles.bfpContactRow}>
        <Ionicons name="time-outline" size={16} color={COLORS.slateText} />
        <Text style={styles.bfpContactText}>{BFP_LIAN_INFO.officeHours}</Text>
      </View>

      {/* Call buttons */}
      <View style={styles.bfpCallRow}>
        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.bfpCallBtn}
          onPress={() => handleCall(BFP_LIAN_INFO.contactNumber)}
        >
          <Ionicons name="call-outline" size={15} color="#FFFFFF" />
          <Text style={styles.bfpCallBtnText}>Call Station</Text>
        </TouchableOpacity>
        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.bfpEmergencyBtn}
          onPress={() => handleCall(BFP_LIAN_INFO.emergencyHotline)}
        >
          <Ionicons name="alert-circle-outline" size={15} color={COLORS.primaryOrange} />
          <Text style={styles.bfpEmergencyBtnText}>Emergency: {BFP_LIAN_INFO.emergencyHotline}</Text>
        </TouchableOpacity>
      </View>

      {/* Expand toggle */}
      <TouchableOpacity activeOpacity={0.8} style={styles.bfpMoreBtn} onPress={onToggle}>
        <Text style={styles.bfpMoreBtnText}>{expanded ? 'Show less' : 'About BFP Lian'}</Text>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={15} color={COLORS.accentViolet} />
      </TouchableOpacity>

      {expanded && (
        <View style={styles.bfpExpanded}>
          <Text style={styles.bfpSectionLabel}>Mission</Text>
          <Text style={styles.bfpSectionText}>{BFP_LIAN_INFO.mission}</Text>

          <Text style={[styles.bfpSectionLabel, { marginTop: 14 }]}>Vision</Text>
          <Text style={styles.bfpSectionText}>{BFP_LIAN_INFO.vision}</Text>

          <Text style={[styles.bfpSectionLabel, { marginTop: 14 }]}>Services</Text>
          <View style={{ marginTop: 6, gap: 8 }}>
            {BFP_LIAN_INFO.services.map((service, i) => (
              <View key={i} style={styles.bfpServiceRow}>
                <View style={styles.bfpServiceDot} />
                <Text style={styles.bfpServiceText}>{service}</Text>
              </View>
            ))}
          </View>

          <View style={styles.bfpOfficersHeaderRow}>
            <Text style={[styles.bfpSectionLabel, { marginTop: 14 }]}>Station Officers</Text>
            <View style={styles.bfpPlaceholderTag}>
              <Text style={styles.bfpPlaceholderTagText}>Placeholder</Text>
            </View>
          </View>
          <View style={{ marginTop: 6, gap: 10 }}>
            {BFP_OFFICERS.map((officer) => (
              <View key={officer.id} style={styles.officerRow}>
                <View style={styles.officerAvatar}>
                  <Text style={styles.officerAvatarText}>
                    {officer.name.split(' ').map((n) => n[0]).join('')}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.officerName}>
                    {officer.rank} {officer.name}
                  </Text>
                  <Text style={styles.officerRole}>{officer.role}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

function TopicCard({
  topic,
  expanded,
  onPress,
  done,
  onMarkDone,
}: {
  topic: SafetyTopic;
  expanded: boolean;
  onPress: () => void;
  done: boolean;
  onMarkDone: () => void;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      style={[styles.topicCard, done && styles.topicCardDone]}
      onPress={onPress}
    >
      <View style={styles.topicCardHeader}>
        <View style={[styles.topicIconWrap, done && { backgroundColor: '#ECFDF5' }]}>
          <Ionicons name={topic.icon} size={20} color={done ? COLORS.successGreen : COLORS.primaryOrange} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.topicTitle}>{topic.title}</Text>
          <Text style={styles.topicDescription}>{topic.description}</Text>
        </View>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={16}
          color={COLORS.mutedText}
        />
      </View>
      {expanded && (
        <View style={styles.topicExpanded}>
          <Text style={styles.topicContent}>{topic.content}</Text>
          <TouchableOpacity
            activeOpacity={0.85}
            style={[styles.markDoneBtn, done && styles.markDoneBtnDone]}
            onPress={(e) => { e.stopPropagation?.(); onMarkDone(); }}
          >
            <Ionicons name={done ? 'checkmark-circle' : 'checkmark-circle-outline'} size={15} color={done ? COLORS.successGreen : COLORS.slateText} />
            <Text style={[styles.markDoneBtnText, done && { color: COLORS.successGreen }]}>
              {done ? 'Marked as read' : 'Mark as read'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );
}

// Compact 2-column preview tile — tap to select, detail renders below the grid
function ResourceTile({
  resource,
  active,
  onPress,
}: {
  resource: Resource;
  active: boolean;
  onPress: () => void;
}) {
  const catColor = CATEGORY_COLORS[resource.category] ?? { bg: COLORS.surfaceMuted, text: COLORS.accentViolet };
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      style={[styles.resourceTile, active && styles.resourceTileActive]}
      onPress={onPress}
    >
      <View style={[styles.resourceTileIconWrap, { backgroundColor: catColor.bg }]}>
        <Ionicons name={resource.icon} size={17} color={catColor.text} />
      </View>
      <Text style={styles.resourceTileTitle} numberOfLines={2}>{resource.title}</Text>
      <Text style={styles.resourceTileMeta}>{resource.readTime} read</Text>
    </TouchableOpacity>
  );
}

function ResourceDetail({ resource }: { resource: Resource }) {
  const catColor = CATEGORY_COLORS[resource.category] ?? { bg: COLORS.surfaceMuted, text: COLORS.accentViolet };
  return (
    <View style={styles.resourceDetailCard}>
      <View style={[styles.guideBadge, { backgroundColor: catColor.bg }]}>
        <Text style={[styles.guideBadgeText, { color: catColor.text }]}>{resource.category}</Text>
      </View>
      <Text style={styles.resourceDetailTitle}>{resource.title}</Text>
      <Text style={styles.resourceDetailSummary}>{resource.summary}</Text>
      <View style={styles.guideDivider} />
      {resource.body.map((line, i) => (
        <View key={i} style={styles.guideStepRow}>
          <View style={styles.guideStepDot} />
          <Text style={styles.guideStepText}>{line}</Text>
        </View>
      ))}
    </View>
  );
}

function QuizSection() {
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [answered, setAnswered] = useState(false);

  const q = QUIZ_QUESTIONS[current];

  const handleAnswer = (idx: number) => {
    if (answered) return;
    setSelected(idx);
    setAnswered(true);
    if (idx === q.correct) setScore((s) => s + 1);
  };

  const handleNext = () => {
    if (current < QUIZ_QUESTIONS.length - 1) {
      setCurrent((c) => c + 1);
      setSelected(null);
      setAnswered(false);
    } else {
      setFinished(true);
    }
  };

  const handleRetry = () => {
    setCurrent(0);
    setSelected(null);
    setScore(0);
    setFinished(false);
    setAnswered(false);
  };

  if (finished) {
    const pct = Math.round((score / QUIZ_QUESTIONS.length) * 100);
    return (
      <View style={styles.quizCard}>
        <View style={styles.quizResultIconWrap}>
          <Ionicons name={pct >= 75 ? 'trophy' : 'refresh-circle'} size={32} color={pct >= 75 ? '#F59E0B' : COLORS.primaryOrange} />
        </View>
        <Text style={styles.quizResultTitle}>
          {pct >= 75 ? 'Great job!' : 'Keep learning!'}
        </Text>
        <Text style={styles.quizResultScore}>
          {score} / {QUIZ_QUESTIONS.length} correct — {pct}%
        </Text>
        <Text style={styles.quizResultSub}>
          {pct >= 75
            ? 'You have a solid understanding of fire safety basics.'
            : 'Review the topics above and try again to improve your score.'}
        </Text>
        <TouchableOpacity activeOpacity={0.85} style={styles.quizRetryBtn} onPress={handleRetry}>
          <Ionicons name="refresh" size={15} color="#fff" />
          <Text style={styles.quizRetryBtnText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.quizCard}>
      <View style={styles.quizHeaderRow}>
        <View style={styles.quizLabelWrap}>
          <Ionicons name="help-circle" size={16} color={COLORS.accentViolet} />
          <Text style={styles.quizLabel}>Safety Quiz</Text>
        </View>
        <Text style={styles.quizProgress}>
          {current + 1} / {QUIZ_QUESTIONS.length}
        </Text>
      </View>

      <View style={styles.quizProgressBar}>
        <View style={[styles.quizProgressFill, { width: `${((current + 1) / QUIZ_QUESTIONS.length) * 100}%` }]} />
      </View>

      <Text style={styles.quizQuestion}>{q.question}</Text>

      <View style={styles.quizChoices}>
        {q.choices.map((choice, idx) => {
          let choiceStyle = styles.quizChoice;
          let textStyle = styles.quizChoiceText;
          if (answered) {
            if (idx === q.correct) {
              choiceStyle = { ...styles.quizChoice, ...styles.quizChoiceCorrect };
              textStyle = { ...styles.quizChoiceText, color: '#15803D' };
            } else if (idx === selected && idx !== q.correct) {
              choiceStyle = { ...styles.quizChoice, ...styles.quizChoiceWrong };
              textStyle = { ...styles.quizChoiceText, color: '#DC2626' };
            }
          }
          return (
            <TouchableOpacity
              key={idx}
              activeOpacity={0.85}
              style={choiceStyle}
              onPress={() => handleAnswer(idx)}
              disabled={answered}
            >
              <Text style={textStyle}>{choice}</Text>
              {answered && idx === q.correct && (
                <Ionicons name="checkmark-circle" size={16} color="#15803D" />
              )}
              {answered && idx === selected && idx !== q.correct && (
                <Ionicons name="close-circle" size={16} color="#DC2626" />
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {answered && (
        <View style={styles.quizExplanation}>
          <Ionicons name="information-circle-outline" size={15} color={COLORS.accentViolet} />
          <Text style={styles.quizExplanationText}>{q.explanation}</Text>
        </View>
      )}

      {answered && (
        <TouchableOpacity activeOpacity={0.85} style={styles.quizNextBtn} onPress={handleNext}>
          <Text style={styles.quizNextBtnText}>
            {current < QUIZ_QUESTIONS.length - 1 ? 'Next Question' : 'See Results'}
          </Text>
          <Ionicons name="arrow-forward" size={15} color="#fff" />
        </TouchableOpacity>
      )}
    </View>
  );
}

// ────────────────────────────────────────────────────────────
// Main Screen
// ────────────────────────────────────────────────────────────

export default function AwarenessScreen() {
  const [expandedTopic, setExpandedTopic] = useState<string | null>(null);
  const [doneTopic, setDoneTopic] = useState<Set<string>>(new Set());
  const [bfpExpanded, setBfpExpanded] = useState(false);
  const [activeResource, setActiveResource] = useState<string>(RESOURCES[0].id);

  const toggleTopic = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedTopic((prev) => (prev === id ? null : id));
  };

  const toggleBfp = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setBfpExpanded((prev) => !prev);
  };

  const selectResource = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setActiveResource(id);
  };

  const markTopicDone = (id: string) => {
    setDoneTopic((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const progress = Math.round((doneTopic.size / SAFETY_TOPICS.length) * 100);
  const selectedResource = RESOURCES.find((r) => r.id === activeResource) ?? RESOURCES[0];

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header — same as index */}
        <AppHeader
          title="Fire Safety Awareness"
          subtitle="Lian, Batangas"
          showLocation
          showBell
          showBrand
        />

        {/* BFP Lian Overview — shown first */}
        <BFPOverviewCard expanded={bfpExpanded} onToggle={toggleBfp} />

        {/* Hero */}
        <View style={styles.heroCard}>
          <View style={styles.heroBadge}>
            <Text style={styles.heroBadgeText}>Safety Guide</Text>
          </View>
          <Text style={styles.heroTitle}>Stay Prepared, Stay Protected</Text>
          <Text style={styles.heroDescription}>
            Build everyday habits that prevent fires before they start, and know exactly
            what to do if an emergency happens in your home or barangay.
          </Text>
          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.heroButton}
            onPress={() => toggleTopic(SAFETY_TOPICS[0].id)}
          >
            <Text style={styles.heroButtonText}>Start Learning</Text>
            <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Progress Tracker */}
        <View style={styles.progressCard}>
          <View style={styles.progressHeaderRow}>
            <View>
              <Text style={styles.progressTitle}>Your Learning Progress</Text>
              <Text style={styles.progressSub}>
                {doneTopic.size} of {SAFETY_TOPICS.length} topics read
              </Text>
            </View>
            <Text style={styles.progressPct}>{progress}%</Text>
          </View>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
          </View>
          {doneTopic.size === SAFETY_TOPICS.length && (
            <View style={styles.progressComplete}>
              <Ionicons name="trophy" size={14} color="#F59E0B" />
              <Text style={styles.progressCompleteText}>All topics completed! Try the quiz below.</Text>
            </View>
          )}
        </View>

        {/* Quick Safety Topics — expandable */}
        <SectionHeader title="Quick Safety Topics" subtitle="Tap a topic to expand" />
        <View style={styles.topicsList}>
          {SAFETY_TOPICS.map((topic) => (
            <TopicCard
              key={topic.id}
              topic={topic}
              expanded={expandedTopic === topic.id}
              onPress={() => toggleTopic(topic.id)}
              done={doneTopic.has(topic.id)}
              onMarkDone={() => markTopicDone(topic.id)}
            />
          ))}
        </View>

        {/* Emergency Steps */}
        <View style={styles.emergencyCard}>
          <View style={styles.emergencyHeaderRow}>
            <View style={styles.emergencyIconWrap}>
              <MaterialCommunityIcons name="fire-alert" size={20} color={COLORS.primaryOrange} />
            </View>
            <Text style={styles.emergencyTitle}>If a Fire Starts Nearby</Text>
          </View>
          <View style={styles.stepsList}>
            {EMERGENCY_STEPS.map((item) => (
              <View key={item.id} style={styles.stepRow}>
                <View style={styles.stepNumberWrap}>
                  <Text style={styles.stepNumberText}>{item.step}</Text>
                </View>
                <Text style={styles.stepText}>{item.text}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Prevention Tips */}
        <SectionHeader title="Home Fire Prevention Tips" />
        <View style={styles.tipsCard}>
          {PREVENTION_TIPS.map((tip, index) => (
            <View key={tip.id}>
              <View style={styles.tipRow}>
                <View style={styles.tipIconWrap}>
                  <Ionicons name={tip.icon} size={16} color={COLORS.successGreen} />
                </View>
                <Text style={styles.tipText}>{tip.text}</Text>
              </View>
              {index < PREVENTION_TIPS.length - 1 && <View style={styles.tipDivider} />}
            </View>
          ))}
        </View>

        {/* Safety Quiz */}
        <SectionHeader title="Test Your Knowledge" subtitle="Quick fire safety quiz" />
        <QuizSection />

        {/* Resources — compact grid, merged guides + articles */}
        <SectionHeader title="Resources" subtitle="Tap a card to read" />
        <View style={styles.resourceGrid}>
          {RESOURCES.map((resource) => (
            <ResourceTile
              key={resource.id}
              resource={resource}
              active={activeResource === resource.id}
              onPress={() => selectResource(resource.id)}
            />
          ))}
        </View>
        <View style={{ marginBottom: 28 }}>
          <ResourceDetail resource={selectedResource} />
        </View>

        {/* CTA */}
        <View style={styles.ctaCard}>
          <View style={styles.ctaIconWrap}>
            <Ionicons name="alert-circle-outline" size={24} color="#FFFFFF" />
          </View>
          <Text style={styles.ctaTitle}>See smoke or active fire?</Text>
          <Text style={styles.ctaDescription}>
            Report it immediately through FIRESIGHT so responders can act fast.
          </Text>
          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.ctaButton}
            onPress={() => router.push('/(tabs)/report' as any)}
          >
            <Ionicons name="flame" size={16} color={COLORS.primaryOrange} />
            <Text style={styles.ctaButtonText}>Report Fire</Text>
          </TouchableOpacity>
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
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 12 },

  sectionHeaderWrap: { marginBottom: 14 },
  sectionTitle: { fontSize: FONT_SIZES.md ?? 17, fontWeight: '700', color: COLORS.deepIndigo },
  sectionSubtitle: { fontSize: FONT_SIZES.xs ?? 12.5, color: COLORS.slateText, marginTop: 2 },

  // BFP Overview
  bfpCard: {
    backgroundColor: COLORS.card, borderRadius: 22, padding: 20, marginBottom: 20,
    borderWidth: 1, borderColor: COLORS.border,
    shadowColor: COLORS.deepIndigo, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 3,
  },
  bfpTopRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 18 },
  bfpLogoWrap: { width: 52, height: 52, borderRadius: 16, backgroundColor: COLORS.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  bfpName: { fontSize: 16.5, fontWeight: '800', color: COLORS.deepIndigo, marginBottom: 2 },
  bfpTagline: { fontSize: 12, color: COLORS.slateText, lineHeight: 16 },
  bfpStatsRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surfaceMuted, borderRadius: 14, paddingVertical: 14, marginBottom: 16 },
  bfpStatBox: { flex: 1, alignItems: 'center' },
  bfpStatValue: { fontSize: 16, fontWeight: '800', color: COLORS.primaryOrange, marginBottom: 2 },
  bfpStatLabel: { fontSize: 10, color: COLORS.slateText, textAlign: 'center' },
  bfpStatDivider: { width: 1, height: 30, backgroundColor: COLORS.border },
  bfpContactRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  bfpContactText: { fontSize: 12.5, color: COLORS.deepIndigo, flex: 1 },
  bfpCallRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  bfpCallBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: COLORS.deepIndigo, borderRadius: 12, paddingVertical: 11 },
  bfpCallBtnText: { fontSize: 12.5, fontWeight: '700', color: '#FFFFFF' },
  bfpEmergencyBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#FFF7ED', borderRadius: 12, paddingVertical: 11, borderWidth: 1, borderColor: '#FED7AA' },
  bfpEmergencyBtnText: { fontSize: 12.5, fontWeight: '700', color: COLORS.primaryOrange },
  bfpMoreBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 16, paddingVertical: 6 },
  bfpMoreBtnText: { fontSize: 12.5, fontWeight: '700', color: COLORS.accentViolet },
  bfpExpanded: { marginTop: 12, paddingTop: 16, borderTopWidth: 1, borderTopColor: COLORS.border },
  bfpSectionLabel: { fontSize: 12, fontWeight: '700', color: COLORS.deepIndigo, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.3 },
  bfpSectionText: { fontSize: 13, color: COLORS.slateText, lineHeight: 19 },
  bfpServiceRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  bfpServiceDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: COLORS.primaryOrange, marginTop: 7 },
  bfpServiceText: { flex: 1, fontSize: 12.5, color: COLORS.deepIndigo, lineHeight: 18 },

  bfpOfficersHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bfpPlaceholderTag: { backgroundColor: '#FEF3C7', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3, marginTop: 14 },
  bfpPlaceholderTagText: { fontSize: 9.5, fontWeight: '700', color: '#B45309', letterSpacing: 0.3 },
  officerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  officerAvatar: { width: 34, height: 34, borderRadius: 10, backgroundColor: COLORS.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  officerAvatarText: { fontSize: 11, fontWeight: '700', color: COLORS.accentViolet },
  officerName: { fontSize: 12.5, fontWeight: '700', color: COLORS.deepIndigo },
  officerRole: { fontSize: 11, color: COLORS.slateText, marginTop: 1 },

  // Hero
  heroCard: {
    backgroundColor: COLORS.deepIndigo, borderRadius: 22, padding: 22, marginBottom: 20,
    shadowColor: COLORS.deepIndigo, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 16, elevation: 6,
  },
  heroBadge: { alignSelf: 'flex-start', backgroundColor: 'rgba(249,115,22,0.2)', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5, marginBottom: 14 },
  heroBadgeText: { fontSize: 11, fontWeight: '700', color: '#FED7AA', letterSpacing: 0.4 },
  heroTitle: { fontSize: 20, fontWeight: '800', color: '#FFFFFF', marginBottom: 10 },
  heroDescription: { fontSize: 13.5, color: 'rgba(255,255,255,0.7)', lineHeight: 19, marginBottom: 18 },
  heroButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.primaryOrange, borderRadius: 14, paddingVertical: 13 },
  heroButtonText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },

  // Progress
  progressCard: { backgroundColor: COLORS.card, borderRadius: 18, padding: 18, marginBottom: 28, borderWidth: 1, borderColor: COLORS.border },
  progressHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  progressTitle: { fontSize: 14, fontWeight: '700', color: COLORS.deepIndigo, marginBottom: 2 },
  progressSub: { fontSize: 12, color: COLORS.slateText },
  progressPct: { fontSize: 22, fontWeight: '800', color: COLORS.primaryOrange },
  progressBarBg: { height: 8, backgroundColor: COLORS.surfaceMuted, borderRadius: 999, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: COLORS.primaryOrange, borderRadius: 999 },
  progressComplete: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  progressCompleteText: { fontSize: 12, color: '#B45309', fontWeight: '600' },

  // Topics
  topicsList: { gap: 12, marginBottom: 28 },
  topicCard: { backgroundColor: COLORS.card, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: COLORS.border },
  topicCardDone: { borderColor: COLORS.successGreen, borderWidth: 1.5 },
  topicCardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  topicIconWrap: { width: 38, height: 38, borderRadius: 12, backgroundColor: COLORS.contactIconBg, alignItems: 'center', justifyContent: 'center' },
  topicTitle: { fontSize: 13.5, fontWeight: '700', color: COLORS.deepIndigo, marginBottom: 2 },
  topicDescription: { fontSize: 11.5, color: COLORS.slateText, lineHeight: 15 },
  topicExpanded: { marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: COLORS.border },
  topicContent: { fontSize: 13, color: COLORS.deepIndigo, lineHeight: 20, marginBottom: 14 },
  markDoneBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingVertical: 7, paddingHorizontal: 12, borderRadius: 999, backgroundColor: COLORS.surfaceMuted, borderWidth: 1, borderColor: COLORS.border },
  markDoneBtnDone: { backgroundColor: '#ECFDF5', borderColor: COLORS.successGreen },
  markDoneBtnText: { fontSize: 12, fontWeight: '600', color: COLORS.slateText },

  // Emergency
  emergencyCard: { backgroundColor: COLORS.surfaceMuted, borderRadius: 20, padding: 20, marginBottom: 28, borderWidth: 1, borderColor: COLORS.border },
  emergencyHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  emergencyIconWrap: { width: 38, height: 38, borderRadius: 12, backgroundColor: COLORS.contactIconBg, alignItems: 'center', justifyContent: 'center' },
  emergencyTitle: { fontSize: 16, fontWeight: '700', color: COLORS.deepIndigo },
  stepsList: { gap: 14 },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  stepNumberWrap: { width: 24, height: 24, borderRadius: 8, backgroundColor: COLORS.primaryOrange, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  stepNumberText: { fontSize: 12, fontWeight: '700', color: '#FFFFFF' },
  stepText: { flex: 1, fontSize: 13.5, color: COLORS.deepIndigo, lineHeight: 19 },

  // Tips
  tipsCard: { backgroundColor: COLORS.card, borderRadius: 18, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 16, marginBottom: 28 },
  tipRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, gap: 12 },
  tipIconWrap: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#ECFDF5', alignItems: 'center', justifyContent: 'center' },
  tipText: { flex: 1, fontSize: 13.5, color: COLORS.deepIndigo, fontWeight: '500' },
  tipDivider: { height: 1, backgroundColor: COLORS.border },

  // Quiz
  quizCard: { backgroundColor: COLORS.card, borderRadius: 20, padding: 20, marginBottom: 28, borderWidth: 1, borderColor: COLORS.border },
  quizHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  quizLabelWrap: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  quizLabel: { fontSize: 13, fontWeight: '700', color: COLORS.accentViolet },
  quizProgress: { fontSize: 12, fontWeight: '600', color: COLORS.mutedText },
  quizProgressBar: { height: 6, backgroundColor: COLORS.surfaceMuted, borderRadius: 999, overflow: 'hidden', marginBottom: 18 },
  quizProgressFill: { height: '100%', backgroundColor: COLORS.accentViolet, borderRadius: 999 },
  quizQuestion: { fontSize: 15, fontWeight: '700', color: COLORS.deepIndigo, lineHeight: 21, marginBottom: 16 },
  quizChoices: { gap: 10, marginBottom: 14 },
  quizChoice: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: 13, borderRadius: 14, backgroundColor: COLORS.surfaceMuted, borderWidth: 1.5, borderColor: COLORS.border },
  quizChoiceCorrect: { backgroundColor: '#ECFDF5', borderColor: '#16A34A' },
  quizChoiceWrong: { backgroundColor: '#FEF2F2', borderColor: '#DC2626' },
  quizChoiceText: { flex: 1, fontSize: 13.5, color: COLORS.deepIndigo, fontWeight: '500', lineHeight: 18 },
  quizExplanation: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#EDE9FE', borderRadius: 12, padding: 12, marginBottom: 14 },
  quizExplanationText: { flex: 1, fontSize: 12.5, color: '#4C1D95', lineHeight: 17 },
  quizNextBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.deepIndigo, borderRadius: 14, paddingVertical: 13 },
  quizNextBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  quizResultIconWrap: { alignSelf: 'center', width: 64, height: 64, borderRadius: 20, backgroundColor: COLORS.surfaceMuted, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  quizResultTitle: { fontSize: 18, fontWeight: '800', color: COLORS.deepIndigo, textAlign: 'center', marginBottom: 6 },
  quizResultScore: { fontSize: 15, fontWeight: '700', color: COLORS.primaryOrange, textAlign: 'center', marginBottom: 8 },
  quizResultSub: { fontSize: 13, color: COLORS.slateText, textAlign: 'center', lineHeight: 18, marginBottom: 20 },
  quizRetryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.primaryOrange, borderRadius: 14, paddingVertical: 13 },
  quizRetryBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },

  // Resources — compact grid
  resourceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 14 },
  resourceTile: {
    width: '47%', backgroundColor: COLORS.card, borderRadius: 16, padding: 14,
    borderWidth: 1.5, borderColor: COLORS.border,
  },
  resourceTileActive: { borderColor: COLORS.primaryOrange, backgroundColor: '#FFF7ED' },
  resourceTileIconWrap: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  resourceTileTitle: { fontSize: 12.5, fontWeight: '700', color: COLORS.deepIndigo, lineHeight: 16, marginBottom: 4 },
  resourceTileMeta: { fontSize: 10.5, color: COLORS.mutedText },
  resourceDetailCard: { backgroundColor: COLORS.card, borderRadius: 18, padding: 18, borderWidth: 1, borderColor: COLORS.border },
  resourceDetailTitle: { fontSize: 15, fontWeight: '700', color: COLORS.deepIndigo, marginBottom: 4, marginTop: 2 },
  resourceDetailSummary: { fontSize: 12.5, color: COLORS.slateText, lineHeight: 18 },
  guideBadge: { alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3, marginBottom: 8 },
  guideBadgeText: { fontSize: 10, fontWeight: '700' },
  guideDivider: { height: 1, backgroundColor: COLORS.border, marginVertical: 14 },
  guideStepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  guideStepDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.primaryOrange, marginTop: 7 },
  guideStepText: { flex: 1, fontSize: 13, color: COLORS.deepIndigo, lineHeight: 19 },

  // CTA
  ctaCard: { backgroundColor: COLORS.deepIndigo, borderRadius: 22, padding: 22, alignItems: 'flex-start', shadowColor: COLORS.deepIndigo, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 16, elevation: 6 },
  ctaIconWrap: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(249,115,22,0.2)', alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  ctaTitle: { fontSize: 17, fontWeight: '800', color: '#FFFFFF', marginBottom: 6 },
  ctaDescription: { fontSize: 13, color: 'rgba(255,255,255,0.75)', lineHeight: 18, marginBottom: 18 },
  ctaButton: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FFFFFF', borderRadius: 14, paddingHorizontal: 18, paddingVertical: 12 },
  ctaButtonText: { fontSize: 13.5, fontWeight: '700', color: COLORS.primaryOrange },
});