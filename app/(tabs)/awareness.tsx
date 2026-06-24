import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  SafeAreaView,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, ALERT_COLORS } from '@/constants/theme';

// ────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────

type IconName = keyof typeof Ionicons.glyphMap;
type MCIconName = keyof typeof MaterialCommunityIcons.glyphMap;

interface SafetyTopic {
  id: string;
  title: string;
  description: string;
  icon: IconName;
}

interface SafetyGuide {
  id: string;
  title: string;
  summary: string;
  category: string;
  readTime: string;
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
}

interface EmergencyStep {
  id: string;
  step: number;
  text: string;
}

// ────────────────────────────────────────────────────────────
// Mock Data
// ────────────────────────────────────────────────────────────

const SAFETY_TOPICS: SafetyTopic[] = [
  {
    id: 'home-prevention',
    title: 'Fire Prevention at Home',
    description: 'Everyday habits that reduce household fire risk.',
    icon: 'home-outline',
  },
  {
    id: 'lpg-safety',
    title: 'LPG / Gas Leak Safety',
    description: 'Spot warning signs and respond to gas leaks safely.',
    icon: 'flame-outline',
  },
  {
    id: 'electrical-safety',
    title: 'Electrical Fire Safety',
    description: 'Common wiring hazards and how to avoid them.',
    icon: 'flash-outline',
  },
  {
    id: 'evacuation-basics',
    title: 'Evacuation Basics',
    description: 'Plan safe exit routes before an emergency happens.',
    icon: 'exit-outline',
  },
];

const FEATURED_GUIDES: SafetyGuide[] = [
  {
    id: 'house-fire-response',
    title: 'What To Do During a House Fire',
    summary: 'A step-by-step guide to staying safe and getting out quickly.',
    category: 'Emergency',
    readTime: '3 min read',
  },
  {
    id: 'kitchen-fire-guide',
    title: 'Kitchen Fire Response Guide',
    summary: 'How to handle grease fires and stovetop flare-ups safely.',
    category: 'Prevention',
    readTime: '2 min read',
  },
  {
    id: 'extinguisher-basics',
    title: 'Fire Extinguisher Basics for Residents',
    summary: 'Learn the PASS technique and when to use an extinguisher.',
    category: 'Skills',
    readTime: '4 min read',
  },
];

const EMERGENCY_STEPS: EmergencyStep[] = [
  { id: '1', step: 1, text: 'Stay calm and alert people nearby' },
  { id: '2', step: 2, text: 'Call responders immediately' },
  { id: '3', step: 3, text: 'Evacuate through the safest route' },
  { id: '4', step: 4, text: 'Avoid smoke-filled areas' },
  { id: '5', step: 5, text: 'Only use an extinguisher if the fire is small and manageable' },
];

const PREVENTION_TIPS: PreventionTip[] = [
  { id: '1', text: 'Do not overload outlets', icon: 'flash-outline' },
  { id: '2', text: 'Keep LPG tanks checked regularly', icon: 'flame-outline' },
  { id: '3', text: 'Store flammable materials safely', icon: 'archive-outline' },
  { id: '4', text: 'Keep matches and lighters away from children', icon: 'shield-outline' },
  { id: '5', text: 'Prepare an evacuation plan', icon: 'map-outline' },
];

const AWARENESS_ARTICLES: AwarenessArticle[] = [
  {
    id: '1',
    title: 'Protecting Children During Fire Emergencies',
    summary: 'Practical guidance for keeping kids safe and calm in a fire emergency.',
    category: 'Family Safety',
  },
  {
    id: '2',
    title: 'Community Fire Drill Preparation',
    summary: 'How barangay drills work and how residents can get involved.',
    category: 'Community',
  },
  {
    id: '3',
    title: 'Fire Safety During Brownouts and Power Surges',
    summary: 'Reduce electrical fire risk when the power is unstable.',
    category: 'Electrical',
  },
];

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

function TopicCard({ topic }: { topic: SafetyTopic }) {
  return (
    <TouchableOpacity activeOpacity={0.85} style={styles.topicCard}>
      <View style={styles.topicIconWrap}>
        <Ionicons name={topic.icon} size={22} color={COLORS.primaryOrange} />
      </View>
      <Text style={styles.topicTitle}>{topic.title}</Text>
      <Text style={styles.topicDescription}>{topic.description}</Text>
    </TouchableOpacity>
  );
}

function GuideCard({ guide }: { guide: SafetyGuide }) {
  return (
    <TouchableOpacity activeOpacity={0.85} style={styles.guideCard}>
      <View style={styles.guideContent}>
        <View style={styles.guideBadge}>
          <Text style={styles.guideBadgeText}>{guide.category}</Text>
        </View>
        <Text style={styles.guideTitle}>{guide.title}</Text>
        <Text style={styles.guideSummary}>{guide.summary}</Text>
        <View style={styles.guideMetaRow}>
          <Ionicons name="time-outline" size={13} color={COLORS.mutedText} />
          <Text style={styles.guideMetaText}>{guide.readTime}</Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={20} color={COLORS.mutedText} />
    </TouchableOpacity>
  );
}

function EmergencyStepRow({ item }: { item: EmergencyStep }) {
  return (
    <View style={styles.stepRow}>
      <View style={styles.stepNumberWrap}>
        <Text style={styles.stepNumberText}>{item.step}</Text>
      </View>
      <Text style={styles.stepText}>{item.text}</Text>
    </View>
  );
}

function PreventionTipRow({ tip }: { tip: PreventionTip }) {
  return (
    <View style={styles.tipRow}>
      <View style={styles.tipIconWrap}>
        <Ionicons name={tip.icon} size={16} color={COLORS.successGreen} />
      </View>
      <Text style={styles.tipText}>{tip.text}</Text>
    </View>
  );
}

function ArticleCard({ article }: { article: AwarenessArticle }) {
  return (
    <TouchableOpacity activeOpacity={0.85} style={styles.articleCard}>
      <View style={styles.articleBadge}>
        <Text style={styles.articleBadgeText}>{article.category}</Text>
      </View>
      <Text style={styles.articleTitle}>{article.title}</Text>
      <Text style={styles.articleSummary}>{article.summary}</Text>
      <View style={styles.articleReadMoreRow}>
        <Text style={styles.articleReadMoreText}>Read More</Text>
        <Ionicons name="arrow-forward" size={14} color={COLORS.primaryOrange} />
      </View>
    </TouchableOpacity>
  );
}

// ────────────────────────────────────────────────────────────
// Main Screen
// ────────────────────────────────────────────────────────────

export default function AwarenessScreen() {
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
          <View style={styles.headerTextWrap}>
            <Text style={styles.headerTitle}>Fire Safety Awareness</Text>
            <Text style={styles.headerSubtitle}>
              Learn prevention tips, emergency response basics, and home fire safety practices.
            </Text>
          </View>
          <TouchableOpacity activeOpacity={0.7} style={styles.headerIconButton}>
            <Ionicons name="bookmark-outline" size={20} color={COLORS.deepIndigo} />
          </TouchableOpacity>
        </View>

        {/* Hero Awareness Card */}
        <View style={styles.heroCard}>
          <View style={styles.heroBadge}>
            <Text style={styles.heroBadgeText}>Safety Guide</Text>
          </View>
          <Text style={styles.heroTitle}>Stay Prepared, Stay Protected</Text>
          <Text style={styles.heroDescription}>
            Build everyday habits that prevent fires before they start, and know exactly what to do
            if an emergency happens in your home or barangay.
          </Text>
          <TouchableOpacity activeOpacity={0.85} style={styles.heroButton}>
            <Text style={styles.heroButtonText}>Read Fire Basics</Text>
            <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Quick Safety Topics */}
        <SectionHeader title="Quick Safety Topics" />
        <View style={styles.topicsGrid}>
          {SAFETY_TOPICS.map((topic) => (
            <TopicCard key={topic.id} topic={topic} />
          ))}
        </View>

        {/* Featured Guides */}
        <SectionHeader title="Featured Guides" subtitle="What you should know" />
        <View style={styles.guidesList}>
          {FEATURED_GUIDES.map((guide) => (
            <GuideCard key={guide.id} guide={guide} />
          ))}
        </View>

        {/* Emergency Response Steps */}
        <View style={styles.emergencyCard}>
          <View style={styles.emergencyHeaderRow}>
            <View style={styles.emergencyIconWrap}>
              <MaterialCommunityIcons name="fire-alert" size={20} color={COLORS.primaryOrange} />
            </View>
            <Text style={styles.emergencyTitle}>If a Fire Starts Nearby</Text>
          </View>
          <View style={styles.stepsList}>
            {EMERGENCY_STEPS.map((item) => (
              <EmergencyStepRow key={item.id} item={item} />
            ))}
          </View>
        </View>

        {/* Household Fire Prevention Tips */}
        <SectionHeader title="Home Fire Prevention Tips" />
        <View style={styles.tipsCard}>
          {PREVENTION_TIPS.map((tip, index) => (
            <View key={tip.id}>
              <PreventionTipRow tip={tip} />
              {index < PREVENTION_TIPS.length - 1 && <View style={styles.tipDivider} />}
            </View>
          ))}
        </View>

        {/* Learn More / Awareness Articles */}
        <SectionHeader title="Learn More" subtitle="Safety resources for your household" />
        <View style={styles.articlesList}>
          {AWARENESS_ARTICLES.map((article) => (
            <ArticleCard key={article.id} article={article} />
          ))}
        </View>

        {/* Bottom CTA */}
        <View style={styles.ctaCard}>
          <View style={styles.ctaIconWrap}>
            <Ionicons name="alert-circle-outline" size={24} color="#FFFFFF" />
          </View>
          <Text style={styles.ctaTitle}>See smoke or active fire?</Text>
          <Text style={styles.ctaDescription}>
            Report it immediately through FIRESIGHT so responders can act fast.
          </Text>
          <TouchableOpacity activeOpacity={0.85} style={styles.ctaButton}>
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
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },

  // Header
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 22,
    gap: 12,
  },
  headerTextWrap: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.deepIndigo,
    marginBottom: 6,
  },
  headerSubtitle: {
    fontSize: 13,
    color: COLORS.slateText,
    lineHeight: 18,
  },
  headerIconButton: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: COLORS.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  // Hero
  heroCard: {
    backgroundColor: COLORS.deepIndigo,
    borderRadius: 22,
    padding: 22,
    marginBottom: 28,
    shadowColor: COLORS.deepIndigo,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 6,
  },
  heroBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(249,115,22,0.2)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginBottom: 14,
  },
  heroBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FED7AA',
    letterSpacing: 0.4,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 10,
  },
  heroDescription: {
    fontSize: 13.5,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 19,
    marginBottom: 18,
  },
  heroButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primaryOrange,
    borderRadius: 14,
    paddingVertical: 13,
  },
  heroButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Section header
  sectionHeaderWrap: {
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.deepIndigo,
  },
  sectionSubtitle: {
    fontSize: 12.5,
    color: COLORS.slateText,
    marginTop: 2,
  },

  // Topics grid
  topicsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 28,
  },
  topicCard: {
    width: '48%',
    backgroundColor: COLORS.card,
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.deepIndigo,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  topicIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: COLORS.contactIconBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  topicTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: COLORS.deepIndigo,
    marginBottom: 4,
  },
  topicDescription: {
    fontSize: 11.5,
    color: COLORS.slateText,
    lineHeight: 15,
  },

  // Guides
  guidesList: {
    gap: 12,
    marginBottom: 28,
  },
  guideCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 12,
  },
  guideContent: {
    flex: 1,
  },
  guideBadge: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.surfaceMuted,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 3,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  guideBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.accentViolet,
  },
  guideTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: COLORS.deepIndigo,
    marginBottom: 4,
  },
  guideSummary: {
    fontSize: 12.5,
    color: COLORS.slateText,
    lineHeight: 17,
    marginBottom: 8,
  },
  guideMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  guideMetaText: {
    fontSize: 11,
    color: COLORS.mutedText,
  },

  // Emergency steps card
  emergencyCard: {
    backgroundColor: COLORS.surfaceMuted,
    borderRadius: 20,
    padding: 20,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emergencyHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  emergencyIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: COLORS.contactIconBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emergencyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.deepIndigo,
  },
  stepsList: {
    gap: 14,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  stepNumberWrap: {
    width: 24,
    height: 24,
    borderRadius: 8,
    backgroundColor: COLORS.primaryOrange,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  stepNumberText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  stepText: {
    flex: 1,
    fontSize: 13.5,
    color: COLORS.deepIndigo,
    lineHeight: 19,
  },

  // Prevention tips
  tipsCard: {
    backgroundColor: COLORS.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 16,
    marginBottom: 28,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 12,
  },
  tipIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipText: {
    flex: 1,
    fontSize: 13.5,
    color: COLORS.deepIndigo,
    fontWeight: '500',
  },
  tipDivider: {
    height: 1,
    backgroundColor: COLORS.border,
  },

  // Articles
  articlesList: {
    gap: 12,
    marginBottom: 28,
  },
  articleCard: {
    backgroundColor: COLORS.card,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  articleBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(109,91,208,0.1)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 10,
  },
  articleBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: COLORS.accentViolet,
  },
  articleTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.deepIndigo,
    marginBottom: 6,
  },
  articleSummary: {
    fontSize: 12.5,
    color: COLORS.slateText,
    lineHeight: 18,
    marginBottom: 12,
  },
  articleReadMoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  articleReadMoreText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: COLORS.primaryOrange,
  },

  // Bottom CTA
  ctaCard: {
    backgroundColor: COLORS.deepIndigo,
    borderRadius: 22,
    padding: 22,
    alignItems: 'flex-start',
    shadowColor: COLORS.deepIndigo,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 6,
  },
  ctaIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(249,115,22,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  ctaTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  ctaDescription: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
    lineHeight: 18,
    marginBottom: 18,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  ctaButtonText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: COLORS.primaryOrange,
  },
});