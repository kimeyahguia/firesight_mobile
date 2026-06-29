import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  SafeAreaView,
  Animated,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '@/constants/theme';
import { router } from 'expo-router';
import AppHeader from '@/components/common/AppHeader';

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

interface SafetyGuide {
  id: string;
  title: string;
  summary: string;
  category: string;
  readTime: string;
  fullContent: string[];
}

interface PreventionTip {
  id: string;
  text: string;
  icon: IconName;
}

interface AwarenessArticle {
  id: string;
  title: string;
  summary: string;
  category: string;
  content: string;
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

const FEATURED_GUIDES: SafetyGuide[] = [
  {
    id: 'house-fire-response',
    title: 'What To Do During a House Fire',
    summary: 'A step-by-step guide to staying safe and getting out quickly.',
    category: 'Emergency',
    readTime: '3 min read',
    fullContent: [
      'Activate your smoke alarm or shout "Fire!" to alert everyone in the house.',
      'Feel the door with the back of your hand before opening. If hot, use another exit.',
      'Stay low and crawl under smoke to reach the exit — clean air is near the floor.',
      'Close doors behind you to slow the spread of fire.',
      'Once outside, go to your meeting point and call 911 or BFP Lian.',
      'Never re-enter a burning building for any reason.',
    ],
  },
  {
    id: 'kitchen-fire-guide',
    title: 'Kitchen Fire Response Guide',
    summary: 'How to handle grease fires and stovetop flare-ups safely.',
    category: 'Prevention',
    readTime: '2 min read',
    fullContent: [
      'For a small grease fire: slide a lid over the pan and turn off the heat. Never use water on grease fires.',
      'If the fire grows or spreads, leave immediately and call for help.',
      'Keep a fire extinguisher in your kitchen within easy reach.',
      'Never leave cooking unattended — most kitchen fires start this way.',
      'Keep dish towels, paper, and plastic away from your stovetop.',
    ],
  },
  {
    id: 'extinguisher-basics',
    title: 'Fire Extinguisher Basics for Residents',
    summary: 'Learn the PASS technique and when to use an extinguisher.',
    category: 'Skills',
    readTime: '4 min read',
    fullContent: [
      'PASS stands for: Pull the pin, Aim at the base of the fire, Squeeze the handle, Sweep side to side.',
      'Only attempt to use an extinguisher if the fire is small, contained, and you have a clear exit behind you.',
      'Use the correct type: Class A for ordinary materials, Class B for flammable liquids, Class C for electrical fires.',
      'Check your extinguisher pressure gauge monthly and replace or recharge after any use.',
      'If in doubt, get out — your safety is always more important than property.',
    ],
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
  { id: '3', text: 'Store flammable materials away from heat sources', icon: 'archive-outline' },
  { id: '4', text: 'Keep matches and lighters away from children', icon: 'shield-outline' },
  { id: '5', text: 'Prepare and practice your evacuation plan', icon: 'map-outline' },
];

const AWARENESS_ARTICLES: AwarenessArticle[] = [
  {
    id: '1',
    title: 'Protecting Children During Fire Emergencies',
    summary: 'Practical guidance for keeping kids safe and calm in a fire emergency.',
    category: 'Family Safety',
    content:
      'Teach children to recognize the sound of a smoke alarm and what it means. Practice your escape plan with them so it becomes second nature. Assign a trusted adult to help young children and toddlers during evacuation. Remind them never to hide from firefighters — they are there to help.',
  },
  {
    id: '2',
    title: 'Community Fire Drill Preparation',
    summary: 'How barangay drills work and how residents can get involved.',
    category: 'Community',
    content:
      'Barangay fire drills are coordinated with BFP to simulate real emergency scenarios. Residents are encouraged to participate — drills help identify gaps in evacuation routes and improve response times. Contact your barangay captain or BFP Lian to find out when the next drill is scheduled.',
  },
  {
    id: '3',
    title: 'Fire Safety During Brownouts and Power Surges',
    summary: 'Reduce electrical fire risk when the power is unstable.',
    category: 'Electrical',
    content:
      'During brownouts, avoid using candles near flammable materials. Unplug appliances before a power outage and use surge protectors when power is restored. Power surges can damage wiring and increase fire risk — consider investing in a whole-house surge protector if outages are frequent in your area.',
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
  Skills: { bg: '#EDE9FE', text: '#6D5BD0' },
  'Family Safety': { bg: '#ECFDF5', text: '#15803D' },
  Community: { bg: '#EFF6FF', text: '#1D4ED8' },
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

function GuideCard({
  guide,
  expanded,
  onPress,
}: {
  guide: SafetyGuide;
  expanded: boolean;
  onPress: () => void;
}) {
  const catColor = CATEGORY_COLORS[guide.category] ?? { bg: COLORS.surfaceMuted, text: COLORS.accentViolet };
  return (
    <TouchableOpacity activeOpacity={0.85} style={styles.guideCard} onPress={onPress}>
      <View style={styles.guideTopRow}>
        <View style={styles.guideContent}>
          <View style={[styles.guideBadge, { backgroundColor: catColor.bg }]}>
            <Text style={[styles.guideBadgeText, { color: catColor.text }]}>{guide.category}</Text>
          </View>
          <Text style={styles.guideTitle}>{guide.title}</Text>
          <Text style={styles.guideSummary}>{guide.summary}</Text>
          <View style={styles.guideMetaRow}>
            <Ionicons name="time-outline" size={13} color={COLORS.mutedText} />
            <Text style={styles.guideMetaText}>{guide.readTime}</Text>
          </View>
        </View>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-forward'} size={20} color={COLORS.mutedText} />
      </View>
      {expanded && (
        <View style={styles.guideExpanded}>
          <View style={styles.guideDivider} />
          {guide.fullContent.map((line, i) => (
            <View key={i} style={styles.guideStepRow}>
              <View style={styles.guideStepDot} />
              <Text style={styles.guideStepText}>{line}</Text>
            </View>
          ))}
        </View>
      )}
    </TouchableOpacity>
  );
}

function ArticleCard({
  article,
  expanded,
  onPress,
}: {
  article: AwarenessArticle;
  expanded: boolean;
  onPress: () => void;
}) {
  const catColor = CATEGORY_COLORS[article.category] ?? { bg: COLORS.surfaceMuted, text: COLORS.accentViolet };
  return (
    <TouchableOpacity activeOpacity={0.85} style={styles.articleCard} onPress={onPress}>
      <View style={[styles.articleBadge, { backgroundColor: catColor.bg }]}>
        <Text style={[styles.articleBadgeText, { color: catColor.text }]}>{article.category}</Text>
      </View>
      <Text style={styles.articleTitle}>{article.title}</Text>
      <Text style={styles.articleSummary}>{article.summary}</Text>
      {expanded ? (
        <View style={styles.articleExpanded}>
          <Text style={styles.articleContent}>{article.content}</Text>
          <TouchableOpacity
            activeOpacity={0.7}
            style={styles.collapseBtn}
            onPress={onPress}
          >
            <Text style={styles.collapseBtnText}>Show less</Text>
            <Ionicons name="chevron-up" size={13} color={COLORS.primaryOrange} />
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.articleReadMoreRow}>
          <Text style={styles.articleReadMoreText}>Read More</Text>
          <Ionicons name="arrow-forward" size={14} color={COLORS.primaryOrange} />
        </View>
      )}
    </TouchableOpacity>
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

      {/* Progress bar */}
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
  const [expandedGuide, setExpandedGuide] = useState<string | null>(null);
  const [expandedArticle, setExpandedArticle] = useState<string | null>(null);
  const [doneTopic, setDoneTopic] = useState<Set<string>>(new Set());

  const toggleTopic = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedTopic((prev) => (prev === id ? null : id));
  };

  const toggleGuide = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedGuide((prev) => (prev === id ? null : id));
  };

  const toggleArticle = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedArticle((prev) => (prev === id ? null : id));
  };

  const markTopicDone = (id: string) => {
    setDoneTopic((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const progress = Math.round((doneTopic.size / SAFETY_TOPICS.length) * 100);

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

        {/* Featured Guides — expandable */}
        <SectionHeader title="Featured Guides" subtitle="What you should know" />
        <View style={styles.guidesList}>
          {FEATURED_GUIDES.map((guide) => (
            <GuideCard
              key={guide.id}
              guide={guide}
              expanded={expandedGuide === guide.id}
              onPress={() => toggleGuide(guide.id)}
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

        {/* Learn More Articles — expandable */}
        <SectionHeader title="Learn More" subtitle="Safety resources for your household" />
        <View style={styles.articlesList}>
          {AWARENESS_ARTICLES.map((article) => (
            <ArticleCard
              key={article.id}
              article={article}
              expanded={expandedArticle === article.id}
              onPress={() => toggleArticle(article.id)}
            />
          ))}
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
  sectionTitle: { fontSize: 17, fontWeight: '700', color: COLORS.deepIndigo },
  sectionSubtitle: { fontSize: 12.5, color: COLORS.slateText, marginTop: 2 },

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

  // Guides
  guidesList: { gap: 12, marginBottom: 28 },
  guideCard: { backgroundColor: COLORS.card, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: COLORS.border },
  guideTopRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  guideContent: { flex: 1 },
  guideBadge: { alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3, marginBottom: 8 },
  guideBadgeText: { fontSize: 10, fontWeight: '700' },
  guideTitle: { fontSize: 14.5, fontWeight: '700', color: COLORS.deepIndigo, marginBottom: 4 },
  guideSummary: { fontSize: 12.5, color: COLORS.slateText, lineHeight: 17, marginBottom: 8 },
  guideMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  guideMetaText: { fontSize: 11, color: COLORS.mutedText },
  guideExpanded: { marginTop: 14 },
  guideDivider: { height: 1, backgroundColor: COLORS.border, marginBottom: 14 },
  guideStepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  guideStepDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.primaryOrange, marginTop: 7 },
  guideStepText: { flex: 1, fontSize: 13, color: COLORS.deepIndigo, lineHeight: 19 },

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

  // Articles
  articlesList: { gap: 12, marginBottom: 28 },
  articleCard: { backgroundColor: COLORS.card, borderRadius: 18, padding: 18, borderWidth: 1, borderColor: COLORS.border },
  articleBadge: { alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, marginBottom: 10 },
  articleBadgeText: { fontSize: 10.5, fontWeight: '700' },
  articleTitle: { fontSize: 15, fontWeight: '700', color: COLORS.deepIndigo, marginBottom: 6 },
  articleSummary: { fontSize: 12.5, color: COLORS.slateText, lineHeight: 18, marginBottom: 12 },
  articleReadMoreRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  articleReadMoreText: { fontSize: 12.5, fontWeight: '700', color: COLORS.primaryOrange },
  articleExpanded: { borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 12, marginTop: 0 },
  articleContent: { fontSize: 13, color: COLORS.deepIndigo, lineHeight: 20, marginBottom: 12 },
  collapseBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  collapseBtnText: { fontSize: 12.5, fontWeight: '700', color: COLORS.primaryOrange },

  // CTA
  ctaCard: { backgroundColor: COLORS.deepIndigo, borderRadius: 22, padding: 22, alignItems: 'flex-start', shadowColor: COLORS.deepIndigo, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 16, elevation: 6 },
  ctaIconWrap: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(249,115,22,0.2)', alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  ctaTitle: { fontSize: 17, fontWeight: '800', color: '#FFFFFF', marginBottom: 6 },
  ctaDescription: { fontSize: 13, color: 'rgba(255,255,255,0.75)', lineHeight: 18, marginBottom: 18 },
  ctaButton: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FFFFFF', borderRadius: 14, paddingHorizontal: 18, paddingVertical: 12 },
  ctaButtonText: { fontSize: 13.5, fontWeight: '700', color: COLORS.primaryOrange },
});