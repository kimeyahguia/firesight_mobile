import AppHeader from '@/components/common/AppHeader';
import { API_ENDPOINTS } from '@/constants/api';
import { COLORS, FONT_SIZES } from '@/constants/theme';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  LayoutAnimation,
  Linking,
  Modal,
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
  done?: boolean;
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

interface Resource {
  id: string;
  title: string;
  summary: string;
  category: string;
  icon: IconName;
  readTime: string;
  body: string[];
}

interface StationInfo {
  name: string;
  tagline: string;
  address: string;
  contactNumber: string;
  emergencyHotline: string;
  officeHours: string;
  established: string;
  barangaysCovered: number;
  mission: string;
  vision: string;
  services: string[];
}

// ────────────────────────────────────────────────────────────
// Static data (walang backend endpoint pa para dito)
// ────────────────────────────────────────────────────────────

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

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  Emergency: { bg: '#FEE2E2', text: '#DC2626' },
  Prevention: { bg: '#FEF3C7', text: '#B45309' },
  Family: { bg: '#ECFDF5', text: '#15803D' },
  Electrical: { bg: '#FFF7ED', text: '#C2410C' },
};

const MAX_LEVEL = 5;

function getLevel(pct: number) {
  if (pct >= 80) return 5;
  if (pct >= 60) return 4;
  if (pct >= 40) return 3;
  if (pct >= 20) return 2;
  return 1;
}

// ────────────────────────────────────────────────────────────
// API helpers
// ────────────────────────────────────────────────────────────

async function fetchJson(url: string) {
  const res = await fetch(url);
  const json = await res.json();
  if (!json.success) throw new Error(json.message || 'Request failed');
  return json.data;
}

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

function BFPShowcaseCard({ info }: { info: StationInfo }) {
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
          <Text style={styles.bfpName}>{info.name}</Text>
          <Text style={styles.bfpTagline}>{info.tagline}</Text>
        </View>
      </View>

      <View style={styles.bfpStatsRow}>
        <View style={styles.bfpStatBox}>
          <Text style={styles.bfpStatValue}>{info.barangaysCovered}</Text>
          <Text style={styles.bfpStatLabel}>Barangays{'\n'}Covered</Text>
        </View>
        <View style={styles.bfpStatDivider} />
        <View style={styles.bfpStatBox}>
          <Text style={styles.bfpStatValue}>24/7</Text>
          <Text style={styles.bfpStatLabel}>Emergency{'\n'}Response</Text>
        </View>
        <View style={styles.bfpStatDivider} />
        <View style={styles.bfpStatBox}>
          <Text style={styles.bfpStatValue}>{info.established}</Text>
          <Text style={styles.bfpStatLabel}>Established</Text>
        </View>
      </View>

      <View style={styles.bfpContactRow}>
        <Ionicons name="location-outline" size={16} color={COLORS.slateText} />
        <Text style={styles.bfpContactText}>{info.address}</Text>
      </View>

      <View style={styles.bfpCallRow}>
        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.bfpCallBtn}
          onPress={() => handleCall(info.contactNumber)}
        >
          <Ionicons name="call-outline" size={15} color="#FFFFFF" />
          <Text style={styles.bfpCallBtnText}>Call Station</Text>
        </TouchableOpacity>
        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.bfpEmergencyBtn}
          onPress={() => handleCall(info.emergencyHotline)}
        >
          <Ionicons name="alert-circle-outline" size={15} color={COLORS.primaryOrange} />
          <Text style={styles.bfpEmergencyBtnText}>Emergency: {info.emergencyHotline}</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        activeOpacity={0.7}
        style={styles.bfpMoreBtn}
        onPress={() => router.push('/about-bfp' as any)}
      >
        <Text style={styles.bfpMoreBtnText}>About BFP Lian</Text>
        <Ionicons name="chevron-forward" size={15} color={COLORS.accentViolet} />
      </TouchableOpacity>
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
      activeOpacity={0.9}
      style={[styles.topicCard, done && styles.topicCardDone]}
      onPress={onPress}
    >
      <View style={styles.topicCardHeader}>
        <View style={[styles.topicIconWrap, done && styles.topicIconWrapDone]}>
          <Ionicons name={topic.icon} size={22} color={done ? COLORS.successGreen : COLORS.primaryOrange} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.topicTitle}>{topic.title}</Text>
          <Text style={styles.topicDescription}>{topic.description}</Text>
        </View>
        <View style={styles.chevronWrap}>
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={15}
            color={COLORS.mutedText}
          />
        </View>
      </View>
      {expanded && (
        <View style={styles.topicExpanded}>
          <Text style={styles.topicContent}>{topic.content}</Text>
          <TouchableOpacity
            activeOpacity={0.8}
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
        <Ionicons name={resource.icon} size={19} color={catColor.text} />
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

function QuizSection({ questions }: { questions: QuizQuestion[] }) {
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [answered, setAnswered] = useState(false);

  if (!questions.length) {
    return (
      <View style={styles.quizCard}>
        <Text style={styles.quizResultSub}>No quiz questions available yet.</Text>
      </View>
    );
  }

  const q = questions[current];

  const handleAnswer = (idx: number) => {
    if (answered) return;
    setSelected(idx);
    setAnswered(true);
    if (idx === q.correct) setScore((s) => s + 1);
  };

  const handleNext = () => {
    if (current < questions.length - 1) {
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
    const pct = Math.round((score / questions.length) * 100);
    return (
      <View style={styles.quizCard}>
        <View style={styles.quizResultIconWrap}>
          <Ionicons name={pct >= 75 ? 'trophy' : 'refresh-circle'} size={34} color={pct >= 75 ? '#F59E0B' : COLORS.primaryOrange} />
        </View>
        <Text style={styles.quizResultTitle}>
          {pct >= 75 ? 'Great job!' : 'Keep learning!'}
        </Text>
        <Text style={styles.quizResultScore}>
          {score} / {questions.length} correct — {pct}%
        </Text>
        <Text style={styles.quizResultSub}>
          {pct >= 75
            ? 'You have a solid understanding of fire safety basics.'
            : 'Review the topics above and try again to improve your score.'}
        </Text>
        <TouchableOpacity activeOpacity={0.85} style={styles.quizRetryBtn} onPress={handleRetry}>
          <Ionicons name="refresh" size={16} color="#fff" />
          <Text style={styles.quizRetryBtnText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.quizCard}>
      <View style={styles.quizHeaderRow}>
        <View style={styles.quizLabelWrap}>
          <View style={styles.quizLabelIconWrap}>
            <Ionicons name="help-circle" size={15} color={COLORS.accentViolet} />
          </View>
          <Text style={styles.quizLabel}>Safety Quiz</Text>
        </View>
        <Text style={styles.quizProgress}>
          {current + 1} / {questions.length}
        </Text>
      </View>

      <View style={styles.quizProgressBar}>
        <View style={[styles.quizProgressFill, { width: `${((current + 1) / questions.length) * 100}%` }]} />
      </View>

      <Text style={styles.quizQuestion}>{q.question}</Text>

      <View style={styles.quizChoices}>
        {q.choices.map((choice, idx) => {
          let choiceStyle = [styles.quizChoice];
          let textStyle: any = styles.quizChoiceText;
          if (answered) {
            if (idx === q.correct) {
              choiceStyle = [styles.quizChoice, styles.quizChoiceCorrect as any];
              textStyle = { ...styles.quizChoiceText, color: '#15803D', fontWeight: '600' };
            } else if (idx === selected && idx !== q.correct) {
              choiceStyle = [styles.quizChoice, styles.quizChoiceWrong as any];
              textStyle = { ...styles.quizChoiceText, color: '#DC2626', fontWeight: '600' };
            }
          }
          return (
            <TouchableOpacity
              key={idx}
              activeOpacity={0.8}
              style={choiceStyle}
              onPress={() => handleAnswer(idx)}
              disabled={answered}
            >
              <Text style={textStyle}>{choice}</Text>
              {answered && idx === q.correct && (
                <Ionicons name="checkmark-circle" size={18} color="#15803D" />
              )}
              {answered && idx === selected && idx !== q.correct && (
                <Ionicons name="close-circle" size={18} color="#DC2626" />
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
            {current < questions.length - 1 ? 'Next Question' : 'See Results'}
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
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  const [stationInfo, setStationInfo] = useState<StationInfo | null>(null);
  const [topics, setTopics] = useState<SafetyTopic[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);

  const [expandedTopic, setExpandedTopic] = useState<string | null>(null);
  const [doneTopic, setDoneTopic] = useState<Set<string>>(new Set());
  const [activeResource, setActiveResource] = useState<string>('');

  const [tipsVisible, setTipsVisible] = useState(false);
  const [resourceModalVisible, setResourceModalVisible] = useState(false);

  const prevLevelRef = useRef(1);

  const loadData = async () => {
    try {
      setLoading(true);
      const uid = await AsyncStorage.getItem('user_id');
      setUserId(uid);

      const topicsUrl = uid
        ? `${API_ENDPOINTS.safetyTopics}?user_id=${uid}`
        : API_ENDPOINTS.safetyTopics;

      const [stationData, topicsData, resourcesData, quizData] = await Promise.all([
        fetchJson(API_ENDPOINTS.bfpStationInfo),
        fetchJson(topicsUrl),
        fetchJson(API_ENDPOINTS.awarenessResources),
        fetchJson(API_ENDPOINTS.quizQuestions),
      ]);

      setStationInfo(stationData);
      setTopics(topicsData);
      setResources(resourcesData);
      setQuizQuestions(quizData);

      const done = new Set<string>(
        topicsData.filter((t: SafetyTopic) => t.done).map((t: SafetyTopic) => t.id)
      );
      setDoneTopic(done);
      prevLevelRef.current = getLevel(
        topicsData.length > 0 ? Math.round((done.size / topicsData.length) * 100) : 0
      );

      if (resourcesData.length > 0) setActiveResource(resourcesData[0].id);
    } catch (err) {
      console.error('Failed to load awareness data:', err);
      Alert.alert('Error', 'Failed to load fire safety data. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const toggleTopic = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedTopic((prev) => (prev === id ? null : id));
  };

  const selectResource = (id: string) => {
    setActiveResource(id);
    setResourceModalVisible(true);
  };

  const markTopicDone = async (id: string) => {
    if (!userId) {
      Alert.alert('Not logged in', 'Please log in to track your progress.');
      return;
    }

    const wasDone = doneTopic.has(id);
    setDoneTopic((prev) => {
      const next = new Set(prev);
      wasDone ? next.delete(id) : next.add(id);

      // ── level-up check ──
      const pct = topics.length > 0 ? Math.round((next.size / topics.length) * 100) : 0;
      const newLevel = getLevel(pct);
      if (newLevel > prevLevelRef.current) {
        prevLevelRef.current = newLevel;
        setTimeout(() => {
          Alert.alert('Level Up! 🔥', `You reached Level ${newLevel} of ${MAX_LEVEL}!`);
        }, 200);
      } else {
        prevLevelRef.current = newLevel;
      }

      return next;
    });

    try {
      const res = await fetch(API_ENDPOINTS.markTopicRead, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, topic_id: id }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
    } catch (err) {
      setDoneTopic((prev) => {
        const next = new Set(prev);
        wasDone ? next.add(id) : next.delete(id);
        return next;
      });
      Alert.alert('Error', 'Failed to update progress. Please try again.');
    }
  };

  if (loading || !stationInfo) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={COLORS.primaryOrange} />
          <Text style={styles.loadingText}>Loading fire safety awareness...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const progress = topics.length > 0 ? Math.round((doneTopic.size / topics.length) * 100) : 0;
  const level = getLevel(progress);
  const selectedResource = resources.find((r) => r.id === activeResource) ?? resources[0];

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <AppHeader
          title="Fire Safety Awareness"
          subtitle="Lian, Batangas"
          showLocation
          showBell
          showBrand
        />

        <BFPShowcaseCard info={stationInfo} />

        {/* ── Hero: immersive gradient + level + progress ── */}
        <View style={styles.heroCard}>
          <LinearGradient
            colors={[COLORS.deepIndigo, '#1B1444', 'rgba(249,115,22,0.55)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFillObject}
          />
          {/* decorative layered glow circles */}
          <View style={styles.heroGlowOne} />
          <View style={styles.heroGlowTwo} />

          <View style={styles.heroTopRow}>
            <View style={styles.heroBadge}>
              <Text style={styles.heroBadgeText}>SAFETY GUIDE</Text>
            </View>
            <View style={styles.heroLevelBadge}>
              <Ionicons name="flame" size={12} color="#FED7AA" />
              <Text style={styles.heroLevelText}>Lv. {level}/{MAX_LEVEL}</Text>
            </View>
          </View>

          <Text style={styles.heroTitle}>Stay Prepared,{'\n'}Stay Protected</Text>

          <View style={styles.heroStatsRow}>
            <View style={styles.heroStatChip}>
              <Text style={styles.heroStatChipValue}>{doneTopic.size}/{topics.length}</Text>
              <Text style={styles.heroStatChipLabel}>Topics Read</Text>
            </View>
            <View style={styles.heroStatChip}>
              <Text style={styles.heroStatChipValue}>{progress}%</Text>
              <Text style={styles.heroStatChipLabel}>Progress</Text>
            </View>
          </View>

          <View style={styles.heroProgressBarBg}>
            <View style={[styles.heroProgressBarFill, { width: `${progress}%` }]} />
          </View>

          {topics.length > 0 && doneTopic.size === topics.length ? (
            <View style={styles.heroProgressComplete}>
              <Ionicons name="trophy" size={14} color="#FBBF24" />
              <Text style={styles.heroProgressCompleteText}>All topics completed! Try the quiz below.</Text>
            </View>
          ) : (
            topics.length > 0 && (
              <TouchableOpacity
                activeOpacity={0.85}
                style={styles.heroButton}
                onPress={() => toggleTopic(topics[0].id)}
              >
                <Text style={styles.heroButtonText}>Start Learning</Text>
                <Ionicons name="arrow-forward" size={15} color={COLORS.deepIndigo} />
              </TouchableOpacity>
            )
          )}
        </View>

        <SectionHeader title="Quick Safety Topics" subtitle="Tap a topic to expand" />
        <View style={styles.topicsList}>
          {topics.map((topic) => (
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

        {/* ── Emergency: vertical timeline ── */}
        <View style={styles.emergencyCard}>
          <View style={styles.emergencyHeaderRow}>
            <View style={styles.emergencyIconWrap}>
              <MaterialCommunityIcons name="fire-alert" size={22} color={COLORS.primaryOrange} />
            </View>
            <Text style={styles.emergencyTitle}>If a Fire Starts Nearby</Text>
          </View>
          <View style={styles.stepsList}>
            {EMERGENCY_STEPS.map((item, idx) => (
              <View key={item.id} style={styles.stepRow}>
                <View style={styles.stepTimelineCol}>
                  <View style={styles.stepNumberWrap}>
                    <Text style={styles.stepNumberText}>{item.step}</Text>
                  </View>
                  {idx < EMERGENCY_STEPS.length - 1 && <View style={styles.stepLine} />}
                </View>
                <Text style={styles.stepText}>{item.text}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── Prevention Tips — modal trigger ── */}
        <SectionHeader title="Home Fire Prevention Tips" subtitle="Tap to view all tips" />
        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.summaryCard}
          onPress={() => setTipsVisible(true)}
        >
          <View style={styles.summaryIconWrap}>
            <Ionicons name="shield-checkmark-outline" size={22} color={COLORS.successGreen} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.summaryTitle}>{PREVENTION_TIPS.length} Prevention Tips</Text>
            <Text style={styles.summarySub}>Simple habits to keep your home fire-safe</Text>
          </View>
          <View style={styles.summaryChevronWrap}>
            <Ionicons name="chevron-forward" size={16} color={COLORS.mutedText} />
          </View>
        </TouchableOpacity>

        <SectionHeader title="Test Your Knowledge" subtitle="Quick fire safety quiz" />
        <QuizSection questions={quizQuestions} />

        {/* ── Resources — Apple-shortcut style grid ── */}
        <SectionHeader title="Resources" subtitle="Tap a card to read" />
        <View style={styles.resourceGrid}>
          {resources.map((resource) => (
            <ResourceTile
              key={resource.id}
              resource={resource}
              active={activeResource === resource.id}
              onPress={() => selectResource(resource.id)}
            />
          ))}
        </View>

        <View style={styles.ctaCard}>
          <View style={styles.ctaIconWrap}>
            <Ionicons name="flame" size={22} color="#FED7AA" />
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
            <Ionicons name="flame" size={17} color={COLORS.primaryOrange} />
            <Text style={styles.ctaButtonText}>Report Fire</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>

      {/* ── Tips Modal ── */}
      <Modal
        visible={tipsVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setTipsVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalHeaderTitle}>Home Fire Prevention Tips</Text>
              <TouchableOpacity activeOpacity={0.7} style={styles.modalCloseBtn} onPress={() => setTipsVisible(false)}>
                <Ionicons name="close" size={18} color={COLORS.slateText} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.tipsCard}>
                {PREVENTION_TIPS.map((tip, index) => (
                  <View key={tip.id}>
                    <View style={styles.tipRow}>
                      <View style={styles.tipIconWrap}>
                        <Ionicons name={tip.icon} size={17} color={COLORS.successGreen} />
                      </View>
                      <Text style={styles.tipText}>{tip.text}</Text>
                    </View>
                    {index < PREVENTION_TIPS.length - 1 && <View style={styles.tipDivider} />}
                  </View>
                ))}
              </View>
              <View style={{ height: 20 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Resource Detail Modal ── */}
      <Modal
        visible={resourceModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setResourceModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalHeaderTitle}>Resource</Text>
              <TouchableOpacity activeOpacity={0.7} style={styles.modalCloseBtn} onPress={() => setResourceModalVisible(false)}>
                <Ionicons name="close" size={18} color={COLORS.slateText} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {selectedResource && <ResourceDetail resource={selectedResource} />}
              <View style={{ height: 20 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ────────────────────────────────────────────────────────────
// Styles — Apple-inspired: soft elevation, generous spacing, refined type
// ────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 12 },

  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 },
  loadingText: { fontSize: 13, color: COLORS.slateText, fontWeight: '500' },

  sectionHeaderWrap: { marginBottom: 16, marginTop: 4 },
  sectionTitle: { fontSize: FONT_SIZES.cardTitle ?? 19, fontWeight: '800', color: COLORS.deepIndigo, letterSpacing: -0.4 },
  sectionSubtitle: { fontSize: 13, color: COLORS.slateText, marginTop: 3, letterSpacing: -0.1 },

  // ── BFP Showcase ──
  bfpCard: {
    backgroundColor: COLORS.card, borderRadius: 26, padding: 22, marginBottom: 22,
    shadowColor: '#0F1235', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.08, shadowRadius: 24, elevation: 3,
  },
  bfpTopRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 20 },
  bfpLogoWrap: { width: 54, height: 54, borderRadius: 18, backgroundColor: COLORS.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  bfpName: { fontSize: 17, fontWeight: '800', color: COLORS.deepIndigo, marginBottom: 3, letterSpacing: -0.3 },
  bfpTagline: { fontSize: 12.5, color: COLORS.slateText, lineHeight: 17 },
  bfpStatsRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surfaceMuted, borderRadius: 18, paddingVertical: 16, marginBottom: 18 },
  bfpStatBox: { flex: 1, alignItems: 'center' },
  bfpStatValue: { fontSize: 17, fontWeight: '800', color: COLORS.primaryOrange, marginBottom: 3, letterSpacing: -0.3 },
  bfpStatLabel: { fontSize: 10, color: COLORS.slateText, textAlign: 'center', lineHeight: 13 },
  bfpStatDivider: { width: 1, height: 32, backgroundColor: 'rgba(0,0,0,0.06)' },
  bfpContactRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  bfpContactText: { fontSize: 12.5, color: COLORS.deepIndigo, flex: 1 },
  bfpCallRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  bfpCallBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
    backgroundColor: COLORS.deepIndigo, borderRadius: 16, paddingVertical: 13,
    shadowColor: COLORS.deepIndigo, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 2,
  },
  bfpCallBtnText: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
  bfpEmergencyBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
    backgroundColor: '#FFF3EA', borderRadius: 16, paddingVertical: 13,
  },
  bfpEmergencyBtnText: { fontSize: 12.5, fontWeight: '700', color: COLORS.primaryOrange },
  bfpMoreBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 18, paddingVertical: 6 },
  bfpMoreBtnText: { fontSize: 13, fontWeight: '700', color: COLORS.accentViolet },

  // ── Hero ──
  heroCard: {
    borderRadius: 28, padding: 24, marginBottom: 24, overflow: 'hidden',
    shadowColor: COLORS.deepIndigo, shadowOffset: { width: 0, height: 14 }, shadowOpacity: 0.28, shadowRadius: 26, elevation: 8,
    minHeight: 260,
  },
  heroGlowOne: {
    position: 'absolute', width: 220, height: 220, borderRadius: 110,
    backgroundColor: 'rgba(249,115,22,0.25)', top: -80, right: -60,
  },
  heroGlowTwo: {
    position: 'absolute', width: 160, height: 160, borderRadius: 80,
    backgroundColor: 'rgba(139,92,246,0.18)', bottom: -50, left: -40,
  },
  heroTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  heroBadge: {
    alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.14)', borderRadius: 999,
    paddingHorizontal: 12, paddingVertical: 6, borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.25)',
  },
  heroBadgeText: { fontSize: 10.5, fontWeight: '800', color: '#FED7AA', letterSpacing: 0.8 },
  heroLevelBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.14)',
    borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.25)',
  },
  heroLevelText: { fontSize: 11, fontWeight: '700', color: '#FFFFFF' },
  heroTitle: { fontSize: 26, fontWeight: '800', color: '#FFFFFF', marginBottom: 20, lineHeight: 32, letterSpacing: -0.6 },

  heroStatsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  heroStatChip: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 16, paddingVertical: 12, paddingHorizontal: 14,
    borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.2)',
  },
  heroStatChipValue: { fontSize: 17, fontWeight: '800', color: '#FFFFFF', marginBottom: 2, letterSpacing: -0.3 },
  heroStatChipLabel: { fontSize: 10.5, color: 'rgba(255,255,255,0.7)', fontWeight: '600' },

  heroProgressBarBg: {
    height: 7, backgroundColor: 'rgba(255,255,255,0.16)', borderRadius: 999, overflow: 'hidden', marginBottom: 16,
  },
  heroProgressBarFill: { height: '100%', backgroundColor: COLORS.primaryOrange, borderRadius: 999 },
  heroButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
    backgroundColor: '#FFFFFF', borderRadius: 16, paddingVertical: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 3,
  },
  heroButtonText: { fontSize: 13.5, fontWeight: '800', color: COLORS.deepIndigo },
  heroProgressComplete: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4 },
  heroProgressCompleteText: { fontSize: 11.5, color: '#FED7AA', fontWeight: '600' },

  // ── Topics ──
  topicsList: { gap: 14, marginBottom: 30 },
  topicCard: {
    backgroundColor: COLORS.card, borderRadius: 22, padding: 18,
    shadowColor: '#0F1235', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.05, shadowRadius: 14, elevation: 2,
  },
  topicCardDone: { backgroundColor: '#F5FBF7' },
  topicCardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  topicIconWrap: { width: 44, height: 44, borderRadius: 15, backgroundColor: '#FFF3EA', alignItems: 'center', justifyContent: 'center' },
  topicIconWrapDone: { backgroundColor: '#E6F8EC' },
  topicTitle: { fontSize: 14.5, fontWeight: '700', color: COLORS.deepIndigo, marginBottom: 3, letterSpacing: -0.2 },
  topicDescription: { fontSize: 12, color: COLORS.slateText, lineHeight: 16.5 },
  chevronWrap: { width: 26, height: 26, borderRadius: 13, backgroundColor: COLORS.surfaceMuted, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  topicExpanded: { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)' },
  topicContent: { fontSize: 13.5, color: COLORS.deepIndigo, lineHeight: 21, marginBottom: 16 },
  markDoneBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 7, alignSelf: 'flex-start',
    paddingVertical: 9, paddingHorizontal: 14, borderRadius: 999, backgroundColor: COLORS.surfaceMuted,
  },
  markDoneBtnDone: { backgroundColor: '#E6F8EC' },
  markDoneBtnText: { fontSize: 12, fontWeight: '700', color: COLORS.slateText },

  // ── Emergency timeline ──
  emergencyCard: {
    backgroundColor: COLORS.card, borderRadius: 24, padding: 22, marginBottom: 30,
    shadowColor: '#0F1235', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.05, shadowRadius: 14, elevation: 2,
  },
  emergencyHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  emergencyIconWrap: { width: 42, height: 42, borderRadius: 15, backgroundColor: '#FFF3EA', alignItems: 'center', justifyContent: 'center' },
  emergencyTitle: { fontSize: 16.5, fontWeight: '800', color: COLORS.deepIndigo, letterSpacing: -0.3 },
  stepsList: {},
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  stepTimelineCol: { alignItems: 'center' },
  stepNumberWrap: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: COLORS.primaryOrange,
    alignItems: 'center', justifyContent: 'center',
  },
  stepLine: { width: 2, flex: 1, minHeight: 22, backgroundColor: 'rgba(0,0,0,0.07)', marginVertical: 4 },
  stepNumberText: { fontSize: 12, fontWeight: '800', color: '#FFFFFF' },
  stepText: { flex: 1, fontSize: 13.5, color: COLORS.deepIndigo, lineHeight: 19, paddingTop: 4, paddingBottom: 18 },

  // ── Prevention summary trigger ──
  summaryCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: COLORS.card, borderRadius: 22, padding: 18, marginBottom: 30,
    shadowColor: '#0F1235', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.05, shadowRadius: 14, elevation: 2,
  },
  summaryIconWrap: { width: 44, height: 44, borderRadius: 15, backgroundColor: '#E6F8EC', alignItems: 'center', justifyContent: 'center' },
  summaryTitle: { fontSize: 14.5, fontWeight: '700', color: COLORS.deepIndigo, marginBottom: 3, letterSpacing: -0.2 },
  summarySub: { fontSize: 12, color: COLORS.slateText },
  summaryChevronWrap: { width: 26, height: 26, borderRadius: 13, backgroundColor: COLORS.surfaceMuted, alignItems: 'center', justifyContent: 'center' },

  // ── Modal shared ──
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,18,53,0.5)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: COLORS.background, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 22, paddingTop: 10, maxHeight: '85%',
  },
  modalHandle: { width: 40, height: 4, borderRadius: 999, backgroundColor: 'rgba(0,0,0,0.12)', alignSelf: 'center', marginBottom: 14 },
  modalHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 },
  modalHeaderTitle: { fontSize: 17, fontWeight: '800', color: COLORS.deepIndigo, letterSpacing: -0.3 },
  modalCloseBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.surfaceMuted, alignItems: 'center', justifyContent: 'center' },

  tipsCard: { backgroundColor: COLORS.card, borderRadius: 22, paddingHorizontal: 18 },
  tipRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, gap: 14 },
  tipIconWrap: { width: 36, height: 36, borderRadius: 14, backgroundColor: '#E6F8EC', alignItems: 'center', justifyContent: 'center' },
  tipText: { flex: 1, fontSize: 13.5, color: COLORS.deepIndigo, fontWeight: '500', lineHeight: 19 },
  tipDivider: { height: 1, backgroundColor: 'rgba(0,0,0,0.05)' },

  // ── Quiz ──
  quizCard: {
    backgroundColor: COLORS.card, borderRadius: 24, padding: 22, marginBottom: 30,
    shadowColor: '#0F1235', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.05, shadowRadius: 14, elevation: 2,
  },
  quizHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  quizLabelWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  quizLabelIconWrap: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#F0EBFE', alignItems: 'center', justifyContent: 'center' },
  quizLabel: { fontSize: 13.5, fontWeight: '800', color: COLORS.accentViolet, letterSpacing: -0.2 },
  quizProgress: { fontSize: 12, fontWeight: '700', color: COLORS.mutedText },
  quizProgressBar: { height: 6, backgroundColor: COLORS.surfaceMuted, borderRadius: 999, overflow: 'hidden', marginBottom: 20 },
  quizProgressFill: { height: '100%', backgroundColor: COLORS.accentViolet, borderRadius: 999 },
  quizQuestion: { fontSize: 16, fontWeight: '700', color: COLORS.deepIndigo, lineHeight: 23, marginBottom: 18, letterSpacing: -0.3 },
  quizChoices: { gap: 11, marginBottom: 16 },
  quizChoice: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10,
    padding: 15, borderRadius: 16, backgroundColor: COLORS.surfaceMuted,
  },
  quizChoiceCorrect: { backgroundColor: '#E6F8EC' },
  quizChoiceWrong: { backgroundColor: '#FDEAEA' },
  quizChoiceText: { flex: 1, fontSize: 13.5, color: COLORS.deepIndigo, fontWeight: '500', lineHeight: 18 },
  quizExplanation: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 9, backgroundColor: '#F0EBFE',
    borderRadius: 16, padding: 14, marginBottom: 16,
  },
  quizExplanationText: { flex: 1, fontSize: 12.5, color: '#4C1D95', lineHeight: 18 },
  quizNextBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: COLORS.deepIndigo, borderRadius: 16, paddingVertical: 15,
    shadowColor: COLORS.deepIndigo, shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.2, shadowRadius: 10, elevation: 3,
  },
  quizNextBtnText: { fontSize: 14.5, fontWeight: '700', color: '#fff' },
  quizResultIconWrap: {
    alignSelf: 'center', width: 72, height: 72, borderRadius: 24, backgroundColor: COLORS.surfaceMuted,
    alignItems: 'center', justifyContent: 'center', marginBottom: 18,
  },
  quizResultTitle: { fontSize: 20, fontWeight: '800', color: COLORS.deepIndigo, textAlign: 'center', marginBottom: 8, letterSpacing: -0.4 },
  quizResultScore: { fontSize: 15.5, fontWeight: '700', color: COLORS.primaryOrange, textAlign: 'center', marginBottom: 10 },
  quizResultSub: { fontSize: 13, color: COLORS.slateText, textAlign: 'center', lineHeight: 19, marginBottom: 24 },
  quizRetryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: COLORS.primaryOrange, borderRadius: 16, paddingVertical: 15,
    shadowColor: COLORS.primaryOrange, shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.25, shadowRadius: 10, elevation: 3,
  },
  quizRetryBtnText: { fontSize: 14.5, fontWeight: '700', color: '#fff' },

  // ── Resources ──
  resourceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginBottom: 30 },
  resourceTile: {
    width: '46.5%', backgroundColor: COLORS.card, borderRadius: 20, padding: 16,
    shadowColor: '#0F1235', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2,
  },
  resourceTileActive: { backgroundColor: '#FFF3EA' },
  resourceTileIconWrap: { width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  resourceTileTitle: { fontSize: 13, fontWeight: '700', color: COLORS.deepIndigo, lineHeight: 17, marginBottom: 5, letterSpacing: -0.2 },
  resourceTileMeta: { fontSize: 10.5, color: COLORS.mutedText, fontWeight: '600' },
  resourceDetailCard: { backgroundColor: COLORS.card, borderRadius: 22, padding: 20 },
  resourceDetailTitle: { fontSize: 16.5, fontWeight: '800', color: COLORS.deepIndigo, marginBottom: 6, marginTop: 4, letterSpacing: -0.3 },
  resourceDetailSummary: { fontSize: 13, color: COLORS.slateText, lineHeight: 19 },
  guideBadge: { alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 11, paddingVertical: 5, marginBottom: 10 },
  guideBadgeText: { fontSize: 10.5, fontWeight: '800', letterSpacing: 0.3 },
  guideDivider: { height: 1, backgroundColor: 'rgba(0,0,0,0.06)', marginVertical: 16 },
  guideStepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 11, marginBottom: 12 },
  guideStepDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.primaryOrange, marginTop: 7 },
  guideStepText: { flex: 1, fontSize: 13.5, color: COLORS.deepIndigo, lineHeight: 20 },

  // ── CTA ──
  ctaCard: {
    backgroundColor: COLORS.deepIndigo, borderRadius: 26, padding: 24, alignItems: 'flex-start',
    shadowColor: COLORS.deepIndigo, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 22, elevation: 6,
  },
  ctaIconWrap: {
    width: 46, height: 46, borderRadius: 16, backgroundColor: 'rgba(249,115,22,0.22)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  ctaTitle: { fontSize: 18, fontWeight: '800', color: '#FFFFFF', marginBottom: 7, letterSpacing: -0.4 },
  ctaDescription: { fontSize: 13, color: 'rgba(255,255,255,0.72)', lineHeight: 19, marginBottom: 20 },
  ctaButton: {
    flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FFFFFF',
    borderRadius: 16, paddingHorizontal: 20, paddingVertical: 14,
  },
  ctaButtonText: { fontSize: 14, fontWeight: '700', color: COLORS.primaryOrange },
});