import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  StatusBar,
  SafeAreaView,
  Alert,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, RISK_COLORS, RiskLevel } from '@/constants/theme';

// ────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────

type SeverityLevel = RiskLevel | 'Critical';

type IncidentType =
  | 'Residential Fire'
  | 'Electrical Fire'
  | 'Grass Fire'
  | 'Smoke Only'
  | 'LPG-Related'
  | 'Vehicle Fire';

type YesNoUnsure = 'Yes' | 'No' | 'Unsure';

interface ToggleQuestion {
  key: 'peopleAtRisk' | 'fireActive' | 'respondersOnSite';
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}

// ────────────────────────────────────────────────────────────
// Mock Data
// ────────────────────────────────────────────────────────────

const SEVERITY_LEVELS: SeverityLevel[] = ['Low', 'Moderate', 'High', 'Critical'];

const SEVERITY_COLORS: Record<SeverityLevel, { bg: string; text: string; dot: string }> = {
  Low: RISK_COLORS.Low,
  Moderate: RISK_COLORS.Moderate,
  High: RISK_COLORS.High,
  Critical: { bg: '#450A0A', text: '#FFFFFF', dot: '#DC2626' },
};

const INCIDENT_TYPES: IncidentType[] = [
  'Residential Fire',
  'Electrical Fire',
  'Grass Fire',
  'Smoke Only',
  'LPG-Related',
  'Vehicle Fire',
];

const TOGGLE_QUESTIONS: ToggleQuestion[] = [
  { key: 'peopleAtRisk', label: 'Are people currently at risk?', icon: 'people' },
  { key: 'fireActive', label: 'Is the fire still active?', icon: 'flame' },
  { key: 'respondersOnSite', label: 'Are responders already on site?', icon: 'shield-checkmark' },
];

// ────────────────────────────────────────────────────────────
// Sub-components
// ────────────────────────────────────────────────────────────

function SectionCard({
  icon,
  title,
  children,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.sectionCard}>
      <View style={styles.sectionTitleRow}>
        <View style={styles.sectionIconWrap}>
          <Ionicons name={icon} size={16} color={COLORS.primaryOrange} />
        </View>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function FieldLabel({ label, optional }: { label: string; optional?: boolean }) {
  return (
    <Text style={styles.fieldLabel}>
      {label}
      {optional ? <Text style={styles.fieldLabelOptional}> (optional)</Text> : null}
    </Text>
  );
}

function SeverityChip({
  level,
  active,
  onPress,
}: {
  level: SeverityLevel;
  active: boolean;
  onPress: () => void;
}) {
  const palette = SEVERITY_COLORS[level];
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={[
        styles.severityChip,
        { borderColor: active ? palette.dot : COLORS.border },
        active && { backgroundColor: palette.dot },
      ]}
    >
      <View
        style={[
          styles.severityDot,
          { backgroundColor: active ? '#FFFFFF' : palette.dot },
        ]}
      />
      <Text
        style={[
          styles.severityChipText,
          { color: active ? '#FFFFFF' : COLORS.deepIndigo },
        ]}
      >
        {level}
      </Text>
    </TouchableOpacity>
  );
}

function IncidentTypeChip({
  type,
  active,
  onPress,
}: {
  type: IncidentType;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={[styles.typeChip, active && styles.typeChipActive]}
    >
      <Text style={[styles.typeChipText, active && styles.typeChipTextActive]}>
        {type}
      </Text>
    </TouchableOpacity>
  );
}

function YesNoSelector({
  value,
  onChange,
}: {
  value: YesNoUnsure;
  onChange: (v: YesNoUnsure) => void;
}) {
  const options: YesNoUnsure[] = ['Yes', 'No', 'Unsure'];
  return (
    <View style={styles.yesNoRow}>
      {options.map((option) => {
        const active = value === option;
        return (
          <TouchableOpacity
            key={option}
            activeOpacity={0.85}
            onPress={() => onChange(option)}
            style={[styles.yesNoOption, active && styles.yesNoOptionActive]}
          >
            <Text style={[styles.yesNoOptionText, active && styles.yesNoOptionTextActive]}>
              {option}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ────────────────────────────────────────────────────────────
// Main Screen
// ────────────────────────────────────────────────────────────

export default function ReportScreen() {
  const [hasPhoto, setHasPhoto] = useState(false);
  const [locationLoading, setLocationLoading] = useState(true);
  const [barangay, setBarangay] = useState('');
  const [streetLandmark, setStreetLandmark] = useState('');
  const [locationDetails, setLocationDetails] = useState('');

  const [whatIsOnFire, setWhatIsOnFire] = useState('');
  const [severity, setSeverity] = useState<SeverityLevel>('Moderate');
  const [incidentType, setIncidentType] = useState<IncidentType>('Residential Fire');
  const [description, setDescription] = useState('');

  const [toggleAnswers, setToggleAnswers] = useState<Record<string, YesNoUnsure>>({
    peopleAtRisk: 'Unsure',
    fireActive: 'Yes',
    respondersOnSite: 'No',
  });

  const [fullName, setFullName] = useState('');
  const [contactNumber, setContactNumber] = useState('');

  const severityPalette = SEVERITY_COLORS[severity];

  // ── Auto-detect location on mount ──
  useEffect(() => {
    setLocationLoading(true);
    // TODO: replace this block with real expo-location when backend is ready:
    // const { status } = await Location.requestForegroundPermissionsAsync();
    // if (status === 'granted') {
    //   const loc = await Location.getCurrentPositionAsync({});
    //   const [place] = await Location.reverseGeocodeAsync(loc.coords);
    //   setBarangay(place.subregion ?? '');
    //   setStreetLandmark(place.street ?? '');
    // }
    setTimeout(() => {
      setBarangay('Lian Proper');
      setStreetLandmark('Near Lian Public Market, Purok 3');
      setLocationDetails('Beside the barangay hall');
      setLocationLoading(false);
    }, 1000);
  }, []);

  // ── Submit handler ──
  function handleSubmit() {
    if (!barangay || !streetLandmark) {
      Alert.alert('Missing Info', 'Please fill in at least the barangay and street/landmark.');
      return;
    }

    const report = {
      photo: hasPhoto,
      barangay,
      streetLandmark,
      locationDetails,
      whatIsOnFire,
      severity,
      incidentType,
      description,
      peopleAtRisk: toggleAnswers.peopleAtRisk,
      fireActive: toggleAnswers.fireActive,
      respondersOnSite: toggleAnswers.respondersOnSite,
      fullName,
      contactNumber,
      submittedAt: new Date().toISOString(),
    };

    console.log('Fire Report Submitted:', JSON.stringify(report, null, 2));

    // TODO: replace Alert with fetch() POST when backend is ready
    Alert.alert(
      '🔥 Report Submitted',
      `Incident: ${incidentType}\nSeverity: ${severity}\nLocation: ${streetLandmark}, ${barangay}\nReporter: ${fullName || 'Anonymous'}\n\nYour report has been forwarded to BFP Lian Fire Station.`,
      [{ text: 'OK', onPress: handleClear }]
    );
  }

  // ── Clear handler ──
  function handleClear() {
    setHasPhoto(false);
    setBarangay('Lian Proper');
    setStreetLandmark('Near Lian Public Market, Purok 3');
    setLocationDetails('Beside the barangay hall');
    setWhatIsOnFire('');
    setSeverity('Moderate');
    setIncidentType('Residential Fire');
    setDescription('');
    setToggleAnswers({ peopleAtRisk: 'Unsure', fireActive: 'Yes', respondersOnSite: 'No' });
    setFullName('');
    setContactNumber('');
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>Report Fire</Text>
            <Text style={styles.headerSubtitle}>
              Submit a fire incident report for faster emergency response
            </Text>
          </View>
          <TouchableOpacity activeOpacity={0.7} style={styles.headerIconButton}>
            <Ionicons name="help-circle-outline" size={20} color={COLORS.deepIndigo} />
          </TouchableOpacity>
        </View>

        {/* Emergency Notice */}
        <View style={styles.noticeCard}>
          <View style={styles.noticeTopRow}>
            <Ionicons name="alert-circle" size={18} color={COLORS.primaryOrange} />
            <Text style={styles.noticeTitle}>Before you continue</Text>
          </View>
          <Text style={styles.noticeText}>
            Use this form to report active fire incidents, smoke, or urgent fire-related
            hazards in your area.
          </Text>
          <Text style={styles.noticeTextStrong}>
            If the fire is actively spreading, call emergency responders immediately while
            submitting this report.
          </Text>
          <View style={styles.hotlineRow}>
            <Ionicons name="call" size={14} color={COLORS.deepIndigo} />
            <Text style={styles.hotlineText}>BFP Lian Fire Station · (043) 740 1234</Text>
          </View>
        </View>

        {/* Incident Photo */}
        <SectionCard icon="camera" title="Incident Photo">
          <View style={styles.uploadArea}>
            {hasPhoto ? (
              <View style={styles.uploadPreview}>
                <Ionicons name="image" size={32} color={COLORS.primaryOrange} />
                <Text style={styles.uploadPreviewText}>Photo attached</Text>
                <TouchableOpacity onPress={() => setHasPhoto(false)} activeOpacity={0.7}>
                  <Text style={styles.uploadRemoveText}>Remove</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.uploadEmpty}>
                <View style={styles.uploadIconCircle}>
                  <Ionicons name="camera-outline" size={26} color={COLORS.accentViolet} />
                </View>
                <Text style={styles.uploadEmptyText}>No photo attached yet</Text>
              </View>
            )}
          </View>

          {/* Camera only — no gallery */}
          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.uploadButtonFull}
            onPress={() => setHasPhoto(true)}
          >
            <Ionicons name="camera" size={16} color={COLORS.deepIndigo} />
            <Text style={styles.uploadButtonSecondaryText}>Take Photo</Text>
          </TouchableOpacity>

          <Text style={styles.helperText}>
            Add a clear image of the fire, smoke, or affected area if it is safe to do so.
          </Text>
        </SectionCard>

        {/* Incident Location */}
        <SectionCard icon="location" title="Incident Location">
          {locationLoading ? (
            <View style={styles.locationLoadingRow}>
              <Ionicons name="locate" size={15} color={COLORS.primaryOrange} />
              <Text style={styles.locationLoadingText}>Detecting your location…</Text>
            </View>
          ) : (
            <View style={styles.locationSummaryRow}>
              <Ionicons name="navigate" size={16} color={COLORS.primaryOrange} />
              <Text style={styles.locationSummaryText}>
                Detected near {streetLandmark}, {barangay}, Batangas
              </Text>
            </View>
          )}

          <View style={styles.miniMapPreview}>
            <View style={styles.miniMapPin}>
              <Ionicons name="location" size={20} color="#FFFFFF" />
            </View>
            <View style={styles.miniMapGrid} />
          </View>

          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.locationUpdateButton}
            onPress={() => {
              setLocationLoading(true);
              setTimeout(() => {
                setBarangay('Lian Proper');
                setStreetLandmark('Near Lian Public Market, Purok 3');
                setLocationDetails('Beside the barangay hall');
                setLocationLoading(false);
              }, 1000);
            }}
          >
            <Ionicons name="locate" size={15} color={COLORS.deepIndigo} />
            <Text style={styles.locationUpdateButtonText}>Refresh Location</Text>
          </TouchableOpacity>

          <FieldLabel label="Barangay" />
          <TextInput
            value={barangay}
            onChangeText={setBarangay}
            placeholder="e.g. Lian Proper"
            placeholderTextColor={COLORS.mutedText}
            style={styles.textInput}
          />

          <FieldLabel label="Street / Landmark" />
          <TextInput
            value={streetLandmark}
            onChangeText={setStreetLandmark}
            placeholder="e.g. Near Lian Public Market"
            placeholderTextColor={COLORS.mutedText}
            style={styles.textInput}
          />

          <FieldLabel label="Additional location details" optional />
          <TextInput
            value={locationDetails}
            onChangeText={setLocationDetails}
            placeholder="e.g. Behind the basketball court"
            placeholderTextColor={COLORS.mutedText}
            style={styles.textInput}
          />
        </SectionCard>

        {/* Incident Details */}
        <SectionCard icon="document-text" title="Incident Details">
          <FieldLabel label="What is on fire?" />
          <TextInput
            value={whatIsOnFire}
            onChangeText={setWhatIsOnFire}
            placeholder="e.g. House, grass, electrical post, vehicle"
            placeholderTextColor={COLORS.mutedText}
            style={styles.textInput}
          />

          <FieldLabel label="Severity level" />
          <View style={styles.severityRow}>
            {SEVERITY_LEVELS.map((level) => (
              <SeverityChip
                key={level}
                level={level}
                active={severity === level}
                onPress={() => setSeverity(level)}
              />
            ))}
          </View>

          <FieldLabel label="Type of incident" />
          <View style={styles.typeChipsWrap}>
            {INCIDENT_TYPES.map((type) => (
              <IncidentTypeChip
                key={type}
                type={type}
                active={incidentType === type}
                onPress={() => setIncidentType(type)}
              />
            ))}
          </View>

          <FieldLabel label="Description / What is happening?" />
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Describe the situation in detail..."
            placeholderTextColor={COLORS.mutedText}
            style={[styles.textInput, styles.textArea]}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </SectionCard>

        {/* Situation Context */}
        <SectionCard icon="warning" title="Situation Context">
          {TOGGLE_QUESTIONS.map((question, index) => (
            <View key={question.key} style={index > 0 ? styles.toggleQuestionSpacer : undefined}>
              <View style={styles.toggleQuestionRow}>
                <Ionicons name={question.icon} size={15} color={COLORS.slateText} />
                <Text style={styles.toggleQuestionLabel}>{question.label}</Text>
              </View>
              <YesNoSelector
                value={toggleAnswers[question.key]}
                onChange={(v) =>
                  setToggleAnswers((prev) => ({ ...prev, [question.key]: v }))
                }
              />
            </View>
          ))}
        </SectionCard>

        {/* Reporter Information */}
        <SectionCard icon="person" title="Your Information">
          <FieldLabel label="Full Name" />
          <TextInput
            value={fullName}
            onChangeText={setFullName}
            placeholder="Juan Dela Cruz"
            placeholderTextColor={COLORS.mutedText}
            style={styles.textInput}
          />

          <FieldLabel label="Contact Number" />
          <TextInput
            value={contactNumber}
            onChangeText={setContactNumber}
            placeholder="09XX XXX XXXX"
            placeholderTextColor={COLORS.mutedText}
            keyboardType="phone-pad"
            style={styles.textInput}
          />

          <Text style={styles.helperText}>
            Responders may contact you if more details are needed.
          </Text>
        </SectionCard>

        {/* Report Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Report Summary</Text>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Photo</Text>
            <Text style={styles.summaryValue}>
              {hasPhoto ? 'Attached' : 'Not attached'}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Location</Text>
            <Text style={styles.summaryValue}>
              {barangay || 'Detecting…'}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Severity</Text>
            <View style={[styles.summarySeverityBadge, { backgroundColor: severityPalette.bg }]}>
              <Text style={[styles.summarySeverityText, { color: severityPalette.text === '#FFFFFF' ? '#FFFFFF' : severityPalette.text }]}>
                {severity}
              </Text>
            </View>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Incident Type</Text>
            <Text style={styles.summaryValue}>{incidentType}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Reporter</Text>
            <Text style={styles.summaryValue}>{fullName || 'Not set'}</Text>
          </View>

          <View style={styles.summaryReadyRow}>
            <Ionicons name="checkmark-circle" size={15} color={COLORS.successGreen} />
            <Text style={styles.summaryReadyText}>Ready to submit</Text>
          </View>
        </View>

        {/* Submit Action */}
        <TouchableOpacity activeOpacity={0.85} style={styles.submitButton} onPress={handleSubmit}>
          <MaterialCommunityIcons name="fire-alert" size={18} color="#FFFFFF" />
          <Text style={styles.submitButtonText}>Submit Report</Text>
        </TouchableOpacity>

        <TouchableOpacity activeOpacity={0.7} style={styles.clearButton} onPress={handleClear}>
          <Text style={styles.clearButtonText}>Clear Form</Text>
        </TouchableOpacity>

        <Text style={styles.submitHelperText}>
          Your report will be forwarded to the appropriate fire response personnel.
        </Text>

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
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.deepIndigo,
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 13,
    color: COLORS.slateText,
    marginTop: 4,
    maxWidth: 250,
    lineHeight: 18,
  },
  headerIconButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: COLORS.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  // Notice card
  noticeCard: {
    backgroundColor: COLORS.surfaceMuted,
    borderRadius: 18,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  noticeTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  noticeTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.deepIndigo,
  },
  noticeText: {
    fontSize: 12.5,
    color: COLORS.slateText,
    lineHeight: 18,
    marginBottom: 8,
  },
  noticeTextStrong: {
    fontSize: 12.5,
    color: COLORS.deepIndigo,
    fontWeight: '600',
    lineHeight: 18,
    marginBottom: 12,
  },
  hotlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  hotlineText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.deepIndigo,
  },

  // Section card
  sectionCard: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  sectionIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: COLORS.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 15.5,
    fontWeight: '700',
    color: COLORS.deepIndigo,
  },

  // Field label
  fieldLabel: {
    fontSize: 12.5,
    fontWeight: '600',
    color: COLORS.deepIndigo,
    marginBottom: 8,
    marginTop: 4,
  },
  fieldLabelOptional: {
    fontWeight: '400',
    color: COLORS.mutedText,
  },

  // Text input
  textInput: {
    backgroundColor: COLORS.surfaceMuted,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 13.5,
    color: COLORS.deepIndigo,
    marginBottom: 14,
  },
  textArea: {
    minHeight: 100,
    paddingTop: 12,
  },

  // Helper text
  helperText: {
    fontSize: 11.5,
    color: COLORS.mutedText,
    lineHeight: 16,
    marginTop: 4,
  },

  // Upload area
  uploadArea: {
    marginBottom: 14,
  },
  uploadEmpty: {
    height: 150,
    borderRadius: 16,
    backgroundColor: COLORS.surfaceMuted,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  uploadIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadEmptyText: {
    fontSize: 12.5,
    color: COLORS.slateText,
    fontWeight: '500',
  },
  uploadPreview: {
    height: 150,
    borderRadius: 16,
    backgroundColor: COLORS.surfaceMuted,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  uploadPreviewText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.deepIndigo,
  },
  uploadRemoveText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.criticalRed,
    marginTop: 4,
  },
  uploadButtonFull: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.surfaceMuted,
    borderRadius: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 10,
  },
  uploadButtonSecondaryText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: COLORS.deepIndigo,
  },

  // Location
  locationLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  locationLoadingText: {
    fontSize: 13,
    color: COLORS.slateText,
    fontStyle: 'italic',
  },
  locationSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  locationSummaryText: {
    fontSize: 13,
    color: COLORS.deepIndigo,
    fontWeight: '500',
    flex: 1,
  },
  miniMapPreview: {
    height: 110,
    borderRadius: 16,
    backgroundColor: COLORS.surfaceMuted,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    overflow: 'hidden',
  },
  miniMapGrid: {
    position: 'absolute',
    width: '140%',
    height: '140%',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  miniMapPin: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.primaryOrange,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: COLORS.card,
  },
  locationUpdateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.surfaceMuted,
    borderRadius: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
  },
  locationUpdateButtonText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: COLORS.deepIndigo,
  },

  // Severity
  severityRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  severityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1.5,
  },
  severityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  severityChipText: {
    fontSize: 12,
    fontWeight: '700',
  },

  // Incident type
  typeChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  typeChip: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: COLORS.surfaceMuted,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  typeChipActive: {
    backgroundColor: COLORS.deepIndigo,
    borderColor: COLORS.deepIndigo,
  },
  typeChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.slateText,
  },
  typeChipTextActive: {
    color: '#FFFFFF',
  },

  // Toggle questions
  toggleQuestionSpacer: {
    marginTop: 18,
  },
  toggleQuestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  toggleQuestionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.deepIndigo,
    flex: 1,
  },
  yesNoRow: {
    flexDirection: 'row',
    gap: 8,
  },
  yesNoOption: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: COLORS.surfaceMuted,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  yesNoOptionActive: {
    backgroundColor: COLORS.primaryOrange,
    borderColor: COLORS.primaryOrange,
  },
  yesNoOptionText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.slateText,
  },
  yesNoOptionTextActive: {
    color: '#FFFFFF',
  },

  // Summary card
  summaryCard: {
    backgroundColor: COLORS.deepIndigo,
    borderRadius: 20,
    padding: 18,
    marginBottom: 20,
  },
  summaryTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 14,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  summaryLabel: {
    fontSize: 12.5,
    color: 'rgba(255,255,255,0.6)',
  },
  summaryValue: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  summarySeverityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  summarySeverityText: {
    fontSize: 11,
    fontWeight: '700',
  },
  summaryReadyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 14,
  },
  summaryReadyText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: COLORS.successGreen,
  },

  // Submit
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primaryOrange,
    borderRadius: 16,
    paddingVertical: 16,
    marginBottom: 12,
    shadowColor: COLORS.primaryOrange,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  submitButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  clearButton: {
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 10,
  },
  clearButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.slateText,
  },
  submitHelperText: {
    fontSize: 11.5,
    color: COLORS.mutedText,
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: 20,
  },
});