import React, { useState, useEffect, useRef } from 'react';
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
  Animated,
  Image,
  Linking,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
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

type SubmitState = 'idle' | 'submitting' | 'done';

interface ToggleQuestion {
  key: 'peopleAtRisk' | 'fireActive' | 'respondersOnSite';
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}

// ────────────────────────────────────────────────────────────
// Mock Data
// ────────────────────────────────────────────────────────────

const STEPS = ['Photo', 'Details', 'Review'] as const;

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
  { key: 'peopleAtRisk', label: 'Are people trapped or at risk?', icon: 'people' },
  { key: 'fireActive', label: 'Is the fire still active?', icon: 'flame' },
  { key: 'respondersOnSite', label: 'Are responders already on site?', icon: 'shield-checkmark' },
];

function generateReferenceId() {
  const date = new Date();
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `FS-${y}${m}${d}-${rand}`;
}

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

function StepProgress({ currentStep }: { currentStep: number }) {
  return (
    <View style={styles.progressWrap}>
      <View style={styles.progressTopRow}>
        <Text style={styles.progressStepText}>
          Step {currentStep + 1} of {STEPS.length}
        </Text>
        <Text style={styles.progressLabelText}>{STEPS[currentStep]}</Text>
      </View>
      <View style={styles.progressTrack}>
        {STEPS.map((_, index) => (
          <View
            key={index}
            style={[
              styles.progressSegment,
              index <= currentStep && styles.progressSegmentActive,
              index === STEPS.length - 1 && { marginRight: 0 },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

// ────────────────────────────────────────────────────────────
// Main Screen
// ────────────────────────────────────────────────────────────

export default function ReportScreen() {
  const [step, setStep] = useState(0);
  const [submitState, setSubmitState] = useState<SubmitState>('idle');
  const [referenceId, setReferenceId] = useState('');

  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [cameraLoading, setCameraLoading] = useState(false);

  const [locationLoading, setLocationLoading] = useState(true);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [barangay, setBarangay] = useState('');
  const [streetLandmark, setStreetLandmark] = useState('');
  const [locationDetails, setLocationDetails] = useState('');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

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
  const scrollRef = useRef<ScrollView>(null);
  const spinValue = useRef(new Animated.Value(0)).current;

  // ── Real GPS location fetch ──
  async function fetchRealLocation() {
    setLocationLoading(true);
    setLocationError(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationError('Location permission denied. Enable it in settings to auto-detect your location.');
        setLocationLoading(false);
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      setCoords({ lat: position.coords.latitude, lng: position.coords.longitude });

      const [place] = await Location.reverseGeocodeAsync({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });

      if (place) {
        setBarangay(place.district || place.subregion || place.city || '');
        setStreetLandmark(
          [place.street, place.name].filter(Boolean).join(', ') || 'Unknown street'
        );
      }
    } catch (err) {
      setLocationError('Could not detect your location. Please check your GPS and try again.');
    } finally {
      setLocationLoading(false);
    }
  }

  useEffect(() => {
    fetchRealLocation();
  }, []);

  // ── Loading spinner animation while submitting ──
  useEffect(() => {
    if (submitState === 'submitting') {
      Animated.loop(
        Animated.timing(spinValue, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        })
      ).start();
    } else {
      spinValue.setValue(0);
    }
  }, [submitState]);

  function goToStep(index: number) {
    setStep(index);
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  }

  function handleNext() {
    if (step === 0) {
      goToStep(1);
      return;
    }
    if (step === 1) {
      if (!barangay || !streetLandmark) {
        Alert.alert('Missing Info', 'Please fill in at least the barangay and street/landmark.');
        return;
      }
      goToStep(2);
      return;
    }
  }

  function handleBack() {
    if (step > 0) goToStep(step - 1);
  }

  // ── Camera-only photo capture ──
  async function handleTakePhoto() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Camera Permission Needed',
        'FIRESIGHT needs camera access to capture proof of the incident. Gallery uploads are disabled to keep reports authentic.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings() },
        ]
      );
      return;
    }

    setCameraLoading(true);
    try {
      const result = await ImagePicker.launchCameraAsync({
        quality: 0.7,
        exif: false,
        allowsEditing: false,
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        setPhotoUri(result.assets[0].uri);
      }
    } catch (err) {
      Alert.alert('Camera Error', 'Something went wrong while opening the camera.');
    } finally {
      setCameraLoading(false);
    }
  }

  // ── Submit handler ──
  function handleSubmit() {
    setSubmitState('submitting');

    const report = {
      photo: photoUri,
      barangay,
      streetLandmark,
      locationDetails,
      locationCoords: coords,
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

    // TODO: replace this timeout with real fetch() POST when backend is ready
    setTimeout(() => {
      setReferenceId(generateReferenceId());
      setSubmitState('done');
    }, 1600);
  }

  // ── Clear / reset handler ──
  function handleClear() {
    setPhotoUri(null);
    fetchRealLocation();
    setLocationDetails('');
    setWhatIsOnFire('');
    setSeverity('Moderate');
    setIncidentType('Residential Fire');
    setDescription('');
    setToggleAnswers({ peopleAtRisk: 'Unsure', fireActive: 'Yes', respondersOnSite: 'No' });
    setFullName('');
    setContactNumber('');
    setSubmitState('idle');
    setReferenceId('');
    goToStep(0);
  }

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  // ── Submission success screen ──
  if (submitState === 'done') {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
        <View style={styles.successContainer}>
          <View style={styles.successIconCircle}>
            <Ionicons name="checkmark" size={40} color="#FFFFFF" />
          </View>
          <Text style={styles.successTitle}>Report Sent to Responders</Text>
          <Text style={styles.successSubtitle}>
            BFP Lian Fire Station has received your report and will respond as soon as possible.
          </Text>

          <View style={styles.refCard}>
            <Text style={styles.refCardLabel}>Reference ID</Text>
            <Text style={styles.refCardValue}>{referenceId}</Text>
            <View style={styles.refCardDivider} />
            <View style={styles.refStatusRow}>
              <View style={styles.refStatusDot} />
              <Text style={styles.refStatusText}>Status: Submitted — awaiting dispatch</Text>
            </View>
          </View>

          <View style={styles.successSummaryBox}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabelDark}>Incident</Text>
              <Text style={styles.summaryValueDark}>{incidentType}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabelDark}>Severity</Text>
              <Text style={styles.summaryValueDark}>{severity}</Text>
            </View>
            <View style={[styles.summaryRow, { borderBottomWidth: 0 }]}>
              <Text style={styles.summaryLabelDark}>Location</Text>
              <Text style={styles.summaryValueDark}>{streetLandmark}, {barangay}</Text>
            </View>
          </View>

          <TouchableOpacity activeOpacity={0.85} style={styles.submitButton} onPress={handleClear}>
            <Ionicons name="add-circle-outline" size={18} color="#FFFFFF" />
            <Text style={styles.submitButtonText}>Submit Another Report</Text>
          </TouchableOpacity>

          <Text style={styles.submitHelperText}>
            Keep your reference ID for tracking and follow-up.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      {/* Header + Step progress (fixed, outside scroll) */}
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

      <StepProgress currentStep={step} />

      <ScrollView
        ref={scrollRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── STEP 1: Photo ── */}
        {step === 0 && (
          <>
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

            <SectionCard icon="camera" title="Incident Photo">
              <View style={styles.uploadArea}>
                {photoUri ? (
                  <View style={styles.uploadPreview}>
                    <Image source={{ uri: photoUri }} style={styles.photoPreviewImage} />
                    <TouchableOpacity
                      onPress={() => setPhotoUri(null)}
                      activeOpacity={0.7}
                      style={styles.uploadRemoveBadge}
                    >
                      <Ionicons name="close-circle" size={22} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.uploadEmpty}>
                    <View style={styles.uploadIconCircle}>
                      <Ionicons name="camera-outline" size={26} color={COLORS.accentViolet} />
                    </View>
                    <Text style={styles.uploadEmptyText}>No photo captured yet</Text>
                  </View>
                )}
              </View>

              <TouchableOpacity
                activeOpacity={0.85}
                style={[styles.uploadButtonFull, styles.uploadButtonPrimary]}
                onPress={handleTakePhoto}
                disabled={cameraLoading}
              >
                <Ionicons name="camera" size={16} color="#FFFFFF" />
                <Text style={styles.uploadButtonPrimaryText}>
                  {cameraLoading ? 'Opening camera…' : photoUri ? 'Retake Photo' : 'Take Photo'}
                </Text>
              </TouchableOpacity>

              <View style={styles.integrityNote}>
                <Ionicons name="shield-checkmark-outline" size={13} color={COLORS.mutedText} />
                <Text style={styles.helperText}>
                  Camera only — gallery uploads are disabled to ensure photo authenticity.
                </Text>
              </View>
            </SectionCard>

            <SectionCard icon="location" title="Location">
              {locationLoading ? (
                <View style={styles.locationLoadingRow}>
                  <Ionicons name="locate" size={15} color={COLORS.primaryOrange} />
                  <Text style={styles.locationLoadingText}>Detecting your location…</Text>
                </View>
              ) : locationError ? (
                <View style={styles.locationLoadingRow}>
                  <Ionicons name="warning" size={15} color={COLORS.criticalRed} />
                  <Text style={[styles.locationLoadingText, { color: COLORS.criticalRed, fontStyle: 'normal' }]}>
                    {locationError}
                  </Text>
                </View>
              ) : (
                <View style={styles.locationSummaryRow}>
                  <Ionicons name="navigate" size={16} color={COLORS.primaryOrange} />
                  <Text style={styles.locationSummaryText}>
                    Detected near {streetLandmark || 'your area'}, {barangay}, Batangas
                  </Text>
                </View>
              )}

              <View style={styles.miniMapPreview}>
                <View style={styles.miniMapPin}>
                  <Ionicons name="location" size={20} color="#FFFFFF" />
                </View>
                <View style={styles.miniMapGrid} />
              </View>

              <View style={styles.gpsChipRow}>
                <View style={styles.gpsChip}>
                  <Ionicons
                    name={locationLoading ? 'ellipse' : locationError ? 'close-circle' : 'checkmark-circle'}
                    size={13}
                    color={locationLoading ? COLORS.mutedText : locationError ? COLORS.criticalRed : COLORS.successGreen}
                  />
                  <Text style={styles.gpsChipText}>
                    {locationLoading ? 'Locating via GPS…' : locationError ? 'GPS unavailable' : 'GPS location locked'}
                  </Text>
                </View>

                <TouchableOpacity
                  activeOpacity={0.85}
                  style={styles.refreshIconButton}
                  onPress={fetchRealLocation}
                >
                  <Ionicons name="refresh" size={15} color={COLORS.deepIndigo} />
                </TouchableOpacity>
              </View>
            </SectionCard>
          </>
        )}

        {/* ── STEP 2: Incident Details ── */}
        {step === 1 && (
          <>
            <SectionCard icon="location" title="Confirm Location">
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

            <SectionCard icon="person" title="Your Information">
              <FieldLabel label="Full Name" optional />
              <TextInput
                value={fullName}
                onChangeText={setFullName}
                placeholder="Juan Dela Cruz"
                placeholderTextColor={COLORS.mutedText}
                style={styles.textInput}
              />

              <FieldLabel label="Contact Number" optional />
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
          </>
        )}

        {/* ── STEP 3: Review Summary ── */}
        {step === 2 && (
          <>
            <SectionCard icon="image" title="Photo Preview">
              <View style={styles.uploadArea}>
                {photoUri ? (
                  <View style={styles.uploadPreview}>
                    <Image source={{ uri: photoUri }} style={styles.photoPreviewImage} />
                  </View>
                ) : (
                  <View style={styles.uploadEmpty}>
                    <Ionicons name="image-outline" size={26} color={COLORS.mutedText} />
                    <Text style={styles.uploadEmptyText}>No photo attached</Text>
                  </View>
                )}
              </View>
            </SectionCard>

            <SectionCard icon="map" title="Map Pin">
              <View style={styles.miniMapPreview}>
                <View style={styles.miniMapPin}>
                  <Ionicons name="location" size={20} color="#FFFFFF" />
                </View>
                <View style={styles.miniMapGrid} />
              </View>
              <Text style={styles.locationSummaryText}>
                {streetLandmark}, {barangay}, Batangas
              </Text>
            </SectionCard>

            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Report Summary</Text>

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>What's on fire</Text>
                <Text style={styles.summaryValue}>{whatIsOnFire || 'Not specified'}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Severity</Text>
                <View style={[styles.summarySeverityBadge, { backgroundColor: severityPalette.bg }]}>
                  <Text style={[styles.summarySeverityText, { color: '#FFFFFF' }]}>
                    {severity}
                  </Text>
                </View>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Incident Type</Text>
                <Text style={styles.summaryValue}>{incidentType}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>People at risk</Text>
                <Text style={styles.summaryValue}>{toggleAnswers.peopleAtRisk}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Fire active</Text>
                <Text style={styles.summaryValue}>{toggleAnswers.fireActive}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Reporter</Text>
                <Text style={styles.summaryValue}>{fullName || 'Anonymous'}</Text>
              </View>

              <View style={styles.summaryEmergencyNote}>
                <Ionicons name="alert-circle" size={14} color={COLORS.primaryOrange} />
                <Text style={styles.summaryEmergencyText}>
                  If the fire is still spreading, call BFP Lian directly while this report is sent.
                </Text>
              </View>

              <View style={styles.summaryReadyRow}>
                <Ionicons name="checkmark-circle" size={15} color={COLORS.successGreen} />
                <Text style={styles.summaryReadyText}>Ready to submit</Text>
              </View>
            </View>
          </>
        )}

        <View style={{ height: 16 }} />
      </ScrollView>

      {/* Fixed bottom nav buttons */}
      <View style={styles.bottomBar}>
        {step > 0 && (
          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.backButton}
            onPress={handleBack}
            disabled={submitState === 'submitting'}
          >
            <Ionicons name="chevron-back" size={18} color={COLORS.deepIndigo} />
          </TouchableOpacity>
        )}

        {step < 2 ? (
          <TouchableOpacity activeOpacity={0.85} style={styles.nextButton} onPress={handleNext}>
            <Text style={styles.nextButtonText}>Continue</Text>
            <Ionicons name="chevron-forward" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            activeOpacity={0.85}
            style={[styles.nextButton, styles.submitButtonBottom]}
            onPress={handleSubmit}
            disabled={submitState === 'submitting'}
          >
            {submitState === 'submitting' ? (
              <>
                <Animated.View style={{ transform: [{ rotate: spin }] }}>
                  <Ionicons name="sync" size={18} color="#FFFFFF" />
                </Animated.View>
                <Text style={styles.nextButtonText}>Sending report…</Text>
              </>
            ) : (
              <>
                <MaterialCommunityIcons name="fire-alert" size={18} color="#FFFFFF" />
                <Text style={styles.nextButtonText}>Submit Report</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
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

  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 12,
    marginBottom: 4,
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

  progressWrap: {
    paddingHorizontal: 20,
    marginTop: 14,
    marginBottom: 6,
  },
  progressTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressStepText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: COLORS.mutedText,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  progressLabelText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: COLORS.primaryOrange,
  },
  progressTrack: {
    flexDirection: 'row',
    gap: 6,
  },
  progressSegment: {
    flex: 1,
    height: 4,
    borderRadius: 999,
    backgroundColor: COLORS.surfaceMuted,
  },
  progressSegmentActive: {
    backgroundColor: COLORS.primaryOrange,
  },

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

  helperText: {
    fontSize: 11.5,
    color: COLORS.mutedText,
    lineHeight: 16,
    marginTop: 4,
    flex: 1,
  },

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
    overflow: 'hidden',
    position: 'relative',
  },
  photoPreviewImage: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
  },
  uploadRemoveBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 12,
  },
  uploadButtonFull: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 14,
    paddingVertical: 12,
    marginBottom: 10,
  },
  uploadButtonPrimary: {
    backgroundColor: COLORS.primaryOrange,
  },
  uploadButtonPrimaryText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  integrityNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 4,
    marginTop: 4,
  },

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
    flex: 1,
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
    marginBottom: 12,
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
  gpsChipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  gpsChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.surfaceMuted,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  gpsChipText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: COLORS.deepIndigo,
  },
  refreshIconButton: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: COLORS.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },

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
    maxWidth: '60%',
    textAlign: 'right',
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
  summaryEmergencyNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    padding: 10,
    marginTop: 14,
  },
  summaryEmergencyText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.85)',
    flex: 1,
    lineHeight: 15,
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

  bottomBar: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  backButton: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: COLORS.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  nextButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primaryOrange,
    borderRadius: 16,
    paddingVertical: 16,
    shadowColor: COLORS.primaryOrange,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  submitButtonBottom: {
    backgroundColor: COLORS.primaryOrange,
  },
  nextButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  successContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 40,
    alignItems: 'center',
  },
  successIconCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: COLORS.successGreen,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.deepIndigo,
    textAlign: 'center',
    marginBottom: 8,
  },
  successSubtitle: {
    fontSize: 13,
    color: COLORS.slateText,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 24,
    paddingHorizontal: 12,
  },
  refCard: {
    width: '100%',
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
  },
  refCardLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    color: COLORS.mutedText,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  refCardValue: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.primaryOrange,
    letterSpacing: 0.5,
  },
  refCardDivider: {
    width: '100%',
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 14,
  },
  refStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  refStatusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: COLORS.warningAmber,
  },
  refStatusText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.deepIndigo,
  },
  successSummaryBox: {
    width: '100%',
    backgroundColor: COLORS.deepIndigo,
    borderRadius: 20,
    padding: 18,
    marginBottom: 24,
  },
  summaryLabelDark: {
    fontSize: 12.5,
    color: 'rgba(255,255,255,0.6)',
  },
  summaryValueDark: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#FFFFFF',
    maxWidth: '60%',
    textAlign: 'right',
  },
  submitButton: {
    width: '100%',
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
  submitHelperText: {
    fontSize: 11.5,
    color: COLORS.mutedText,
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: 20,
  },
});