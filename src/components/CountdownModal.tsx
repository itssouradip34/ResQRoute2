import React, { useEffect } from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { AlertTriangle, CheckCircle, ShieldAlert, Zap } from 'lucide-react-native';
import { useEmergency } from '../context/EmergencyContext';
import { useSettings } from '../context/SettingsContext';
import { AudioAlertPlayer } from './AudioAlertPlayer';

const { width } = Dimensions.get('window');
const RING_SIZE = Math.min(width * 0.65, 240);
const STROKE_WIDTH = 12;
const RADIUS = (RING_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export const CountdownModal: React.FC = () => {
  const {
    status,
    currentIncident,
    countdownRemaining,
    cancelEmergency,
    forceEscalate,
  } = useEmergency();
  const { settings } = useSettings();

  const isVisible = status === 'confirming';
  const totalSeconds = settings.countdownSeconds || 20;
  const progress = Math.max(0, countdownRemaining / totalSeconds);
  const strokeDashoffset = CIRCUMFERENCE * (1 - progress);

  const isAccident = currentIncident?.situation_type === 'accident';
  const confidencePercent = Math.round(
    (currentIncident?.confidence_score || 0.85) * 100
  );

  useEffect(() => {
    if (isVisible && settings.enableAudioAlarm) {
      AudioAlertPlayer.startAlarm();
    } else {
      AudioAlertPlayer.stopAlarm();
    }
    return () => {
      AudioAlertPlayer.stopAlarm();
    };
  }, [isVisible, settings.enableAudioAlarm]);

  if (!isVisible) return null;

  return (
    <Modal
      visible={isVisible}
      animationType="fade"
      transparent={false}
      statusBarTranslucent
    >
      <SafeAreaView style={styles.container}>
        {/* Background Ambient Glow */}
        <View
          style={[
            styles.glowBackground,
            isAccident ? styles.glowRed : styles.glowAmber,
          ]}
        />

        <View style={styles.content}>
          {/* Header Warning Badge */}
          <View
            style={[
              styles.badgeContainer,
              isAccident ? styles.badgeRed : styles.badgeAmber,
            ]}
          >
            <ShieldAlert
              size={22}
              color={isAccident ? '#FF4D4D' : '#FFA500'}
            />
            <Text
              style={[
                styles.badgeText,
                isAccident ? styles.textRed : styles.textAmber,
              ]}
            >
              {isAccident
                ? settings.language === 'hi'
                  ? 'संभावित दुर्घटना का पता चला'
                  : 'POSSIBLE ACCIDENT DETECTED'
                : settings.language === 'hi'
                ? 'संभावित ब्रेकडाउन / खराबी'
                : 'POSSIBLE BREAKDOWN DETECTED'}
            </Text>
          </View>

          {/* Subtitle with Confidence Indicator */}
          <Text style={styles.confidenceText}>
            {settings.language === 'hi'
              ? `सेंसर आत्मविश्वास: ${confidencePercent}% | सहायता भेजने से पहले उलटी गिनती`
              : `Sensor Confidence: ${confidencePercent}% • Auto-SOS initiating soon`}
          </Text>

          {/* Animated Countdown Circular Ring */}
          <View style={styles.ringWrapper}>
            <Svg width={RING_SIZE} height={RING_SIZE}>
              {/* Background Circle */}
              <Circle
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                r={RADIUS}
                stroke="#21262D"
                strokeWidth={STROKE_WIDTH}
                fill="none"
              />
              {/* Animated Progress Circle */}
              <Circle
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                r={RADIUS}
                stroke={isAccident ? '#FF3B30' : '#FF9500'}
                strokeWidth={STROKE_WIDTH}
                strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="none"
                transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
              />
            </Svg>

            {/* Centered Timer Number */}
            <View style={styles.timerInnerContent}>
              <Text style={styles.timerNumber}>{countdownRemaining}</Text>
              <Text style={styles.timerUnit}>
                {settings.language === 'hi' ? 'सेकंड' : 'SECONDS'}
              </Text>
            </View>
          </View>

          {/* Explanatory Safety Copy */}
          <View style={styles.infoCard}>
            <AlertTriangle size={20} color="#8B949E" style={styles.infoIcon} />
            <Text style={styles.infoText}>
              {settings.language === 'hi'
                ? 'यदि आप ठीक हैं, तो तुरंत "मैं ठीक हूँ" पर टैप करें। यदि कोई उत्तर नहीं मिला तो आपातकालीन संपर्क व 112 सहायता को लाइव लोकेशन भेजी जाएगी।'
                : 'If you are safe, tap "I\'m OK — Cancel". If no response is received, an emergency SOS with live GPS location will be auto-dispatched.'}
            </Text>
          </View>

          {/* Action Buttons (Large, high-contrast, one-handed touch targets) */}
          <View style={styles.buttonGroup}>
            {/* Primary Cancel Button (Neutral / Green for safety) */}
            <TouchableOpacity
              style={styles.cancelButton}
              activeOpacity={0.8}
              onPress={cancelEmergency}
            >
              <CheckCircle size={28} color="#FFFFFF" />
              <Text style={styles.cancelButtonText}>
                {settings.language === 'hi' ? 'मैं ठीक हूँ — रद्द करें' : "I'M OK — CANCEL"}
              </Text>
            </TouchableOpacity>

            {/* Instant Escalate Button (Vibrant Red) */}
            <TouchableOpacity
              style={styles.escalateButton}
              activeOpacity={0.8}
              onPress={forceEscalate}
            >
              <Zap size={24} color="#FFD1D1" />
              <Text style={styles.escalateButtonText}>
                {settings.language === 'hi'
                  ? 'अभी मदद भेजें (तत्काल SOS)'
                  : 'SEND HELP NOW'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D1117',
  },
  glowBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 380,
    opacity: 0.25,
  },
  glowRed: {
    backgroundColor: '#FF3B30',
  },
  glowAmber: {
    backgroundColor: '#FF9500',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 20,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1,
    marginTop: 10,
  },
  badgeRed: {
    backgroundColor: 'rgba(255, 59, 48, 0.15)',
    borderColor: 'rgba(255, 59, 48, 0.4)',
  },
  badgeAmber: {
    backgroundColor: 'rgba(255, 149, 0, 0.15)',
    borderColor: 'rgba(255, 149, 0, 0.4)',
  },
  badgeText: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginLeft: 8,
  },
  textRed: {
    color: '#FF4D4D',
  },
  textAmber: {
    color: '#FFA500',
  },
  confidenceText: {
    color: '#8B949E',
    fontSize: 13,
    fontWeight: '500',
    marginTop: 8,
    textAlign: 'center',
  },
  ringWrapper: {
    position: 'relative',
    width: RING_SIZE,
    height: RING_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 18,
  },
  timerInnerContent: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timerNumber: {
    fontSize: 64,
    fontWeight: '900',
    color: '#FFFFFF',
    fontVariant: ['tabular-nums'],
  },
  timerUnit: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8B949E',
    letterSpacing: 1.5,
    marginTop: -4,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#161B22',
    borderColor: '#30363D',
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    width: '100%',
  },
  infoIcon: {
    marginRight: 12,
  },
  infoText: {
    color: '#C9D1D9',
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
  },
  buttonGroup: {
    width: '100%',
    gap: 12,
    marginBottom: 10,
  },
  cancelButton: {
    backgroundColor: '#238636',
    flexDirection: 'row',
    height: 64,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#238636',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  cancelButtonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginLeft: 10,
  },
  escalateButton: {
    backgroundColor: '#DA3633',
    flexDirection: 'row',
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F85149',
  },
  escalateButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginLeft: 8,
  },
});
