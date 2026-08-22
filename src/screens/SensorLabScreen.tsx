import React, { useEffect, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  Activity,
  AlertOctagon,
  CheckCircle,
  Compass,
  Gauge,
  Play,
  RotateCcw,
  Sliders,
  Zap,
} from 'lucide-react-native';
import { SensorFrame, SensorHub } from '../services/sensor/SensorHub';
import { AnomalyDetector } from '../services/sensor/AnomalyDetector';
import { useEmergency } from '../context/EmergencyContext';
import { useSettings } from '../context/SettingsContext';
import { SensitivityLevel } from '../types';

export const SensorLabScreen: React.FC = () => {
  const { userLocation } = useEmergency();
  const { settings, updateSensitivity } = useSettings();

  const [currentFrame, setCurrentFrame] = useState<SensorFrame>({
    timestamp: Date.now(),
    accel: { x: 0, y: 0, z: 1, magnitude: 1, jerk: 0 },
    gyro: { x: 0, y: 0, z: 0, magnitude: 0 },
    speedKmH: 0,
  });

  const [activeSimulationName, setActiveSimulationName] = useState<string | null>(
    null
  );

  useEffect(() => {
    const unsub = SensorHub.subscribe((frame) => {
      setCurrentFrame(frame);
    });
    return () => unsub();
  }, []);

  const history = SensorHub.getHistory();
  const evaluation = AnomalyDetector.evaluateFrame(currentFrame, history);
  const thresholds = AnomalyDetector.getThresholds();

  // Preset Simulation Scenarios
  const runHighwayCrashSim = () => {
    setActiveSimulationName('Highway High-Speed Collision');
    // Frame 1: Cruising at 80 km/h
    SensorHub.injectSimulatedFrame(
      { x: 0.1, y: 0.2, z: 1.0, jerk: 2 },
      { x: 0.1, y: 0.1, z: 0.1 },
      80
    );

    // Frame 2: Violent Impact (High jerk + High Gyro tumble + Drop to 0 km/h)
    setTimeout(() => {
      SensorHub.injectSimulatedFrame(
        { x: 4.8, y: -6.2, z: 8.5, jerk: 45 },
        { x: 6.2, y: 8.4, z: 5.1 }, // High angular velocity
        0 // Speed drops sharply
      );
    }, 200);
  };

  const runPotholeSim = () => {
    setActiveSimulationName('Rough Road / Pothole Jolt');
    // Vertical jerk on Z axis, zero gyro tumble, speed steady at 45 km/h
    SensorHub.injectSimulatedFrame(
      { x: 0.1, y: 0.2, z: 3.8, jerk: 22 },
      { x: 0.2, y: 0.3, z: 0.1 }, // Low gyro
      45 // No speed drop
    );
  };

  const runPunctureDragSim = () => {
    setActiveSimulationName('Tyre Blowout / Mechanical Drag');
    // Cruising at 70 km/h drops to 20 km/h without violent gyro tumble
    SensorHub.injectSimulatedFrame(
      { x: 0.2, y: 0.3, z: 1.0, jerk: 1 },
      { x: 0.1, y: 0.1, z: 0.1 },
      70
    );

    setTimeout(() => {
      SensorHub.injectSimulatedFrame(
        { x: 0.8, y: -1.2, z: 1.4, jerk: 8 },
        { x: 0.6, y: 0.8, z: 0.4 }, // Moderate gyro (no crash roll)
        18 // Decelerated by 52 km/h
      );
    }, 200);
  };

  const runTwoWheelerFallSim = () => {
    setActiveSimulationName('Two-Wheeler Skid / Roll');
    // Low speed (25 km/h) but high angular rotation as bike falls on side
    SensorHub.injectSimulatedFrame(
      { x: 1.2, y: 2.8, z: 0.4, jerk: 18 },
      { x: 5.5, y: 4.8, z: 3.2 }, // High gyro
      0
    );
  };

  const handleResetSim = () => {
    setActiveSimulationName(null);
    SensorHub.resetSimulation();
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Header Info Banner */}
      <View style={styles.headerBanner}>
        <Activity size={20} color="#58A6FF" />
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>
            {settings.language === 'hi'
              ? 'सेंसर लैब एवं सिमुलेशन स्टूडियो'
              : 'Sensor Lab & Simulation Studio'}
          </Text>
          <Text style={styles.headerDesc}>
            {settings.language === 'hi'
              ? 'दुर्घटना व ब्रेकडाउन का लाइव ऑन-डिवाइस मूल्यांकन'
              : 'Real-time on-device kinematic anomaly scoring'}
          </Text>
        </View>
      </View>

      {/* Live Anomaly Score Meter */}
      <View style={styles.meterCard}>
        <View style={styles.meterTopRow}>
          <Text style={styles.meterLabel}>LIVE ANOMALY SCORE</Text>
          <View
            style={[
              styles.statusBadge,
              evaluation.eventType === 'POSSIBLE_ACCIDENT'
                ? styles.badgeRed
                : evaluation.eventType === 'POSSIBLE_BREAKDOWN'
                ? styles.badgeAmber
                : styles.badgeGreen,
            ]}
          >
            <Text
              style={[
                styles.statusBadgeText,
                evaluation.eventType === 'POSSIBLE_ACCIDENT'
                  ? styles.textRed
                  : evaluation.eventType === 'POSSIBLE_BREAKDOWN'
                  ? styles.textAmber
                  : styles.textGreen,
              ]}
            >
              {evaluation.eventType}
            </Text>
          </View>
        </View>

        <Text style={styles.scoreNumber}>{evaluation.anomalyScore.toFixed(2)}</Text>
        <Text style={styles.scoreReason}>{evaluation.reasoning}</Text>

        {/* Meter Visual Bar */}
        <View style={styles.barTrack}>
          <View
            style={[
              styles.barFill,
              {
                width: `${Math.min(100, (evaluation.anomalyScore / 10) * 100)}%`,
                backgroundColor:
                  evaluation.anomalyScore >= thresholds.crashAnomalyThreshold
                    ? '#FF3B30'
                    : evaluation.anomalyScore >= thresholds.mechanicalThreshold
                    ? '#FFA500'
                    : '#3FB950',
              },
            ]}
          />
        </View>

        {/* Threshold Markers */}
        <View style={styles.thresholdRow}>
          <Text style={styles.thresholdText}>
            Breakdown: ≥{thresholds.mechanicalThreshold}
          </Text>
          <Text style={styles.thresholdText}>
            Crash: ≥{thresholds.crashAnomalyThreshold}
          </Text>
        </View>
      </View>

      {/* Live Kinematic Gauges */}
      <View style={styles.gaugesGrid}>
        {/* Gyro Gauge */}
        <View style={styles.gaugeCard}>
          <Gauge size={20} color="#FF6B6B" />
          <Text style={styles.gaugeTitle}>Gyro Turbulence</Text>
          <Text style={styles.gaugeValue}>
            {currentFrame.gyro.magnitude.toFixed(2)}
            <Text style={styles.gaugeUnit}> rad/s</Text>
          </Text>
          <Text style={styles.gaugeSub}>
            Threshold: {thresholds.gyroCrashThreshold}
          </Text>
        </View>

        {/* Accel Jerk Gauge */}
        <View style={styles.gaugeCard}>
          <Zap size={20} color="#E3B341" />
          <Text style={styles.gaugeTitle}>Accel Jerk</Text>
          <Text style={styles.gaugeValue}>
            {currentFrame.accel.jerk.toFixed(1)}
            <Text style={styles.gaugeUnit}> m/s³</Text>
          </Text>
          <Text style={styles.gaugeSub}>
            Peak: {currentFrame.accel.magnitude.toFixed(2)} g
          </Text>
        </View>

        {/* Speed Gauge */}
        <View style={styles.gaugeCard}>
          <Compass size={20} color="#58A6FF" />
          <Text style={styles.gaugeTitle}>GPS Speed</Text>
          <Text style={styles.gaugeValue}>
            {currentFrame.speedKmH.toFixed(1)}
            <Text style={styles.gaugeUnit}> km/h</Text>
          </Text>
          <Text style={styles.gaugeSub}>
            Drop: {evaluation.speedDropDelta.toFixed(1)} km/h
          </Text>
        </View>
      </View>

      {/* Sensitivity Tuning Selector */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>
          {settings.language === 'hi'
            ? 'सेंसर संवेदनशीलता (Sensitivity)'
            : 'Sensor Sensitivity Level'}
        </Text>
      </View>

      <View style={styles.sensitivityRow}>
        {(['low', 'medium', 'high'] as SensitivityLevel[]).map((lvl) => {
          const isSelected = settings.sensorSensitivity === lvl;
          return (
            <TouchableOpacity
              key={lvl}
              style={[
                styles.sensitivityBtn,
                isSelected && styles.sensitivityBtnActive,
              ]}
              activeOpacity={0.75}
              onPress={() => updateSensitivity(lvl)}
            >
              <Text
                style={[
                  styles.sensitivityBtnText,
                  isSelected && styles.sensitivityBtnTextActive,
                ]}
              >
                {lvl.toUpperCase()}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Simulation Trigger Sandbox */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>
          {settings.language === 'hi'
            ? 'सिमुलेशन सैंडबॉक्स (परीक्षण)'
            : 'Simulation Sandbox Triggers'}
        </Text>
        <Text style={styles.sectionSubtitle}>
          {settings.language === 'hi'
            ? 'बिना वास्तविक खतरे के सेंसर लॉजिक और काउंटडाउन का परीक्षण करें'
            : 'Safely test accident, breakdown, and pothole detection logic'}
        </Text>
      </View>

      <View style={styles.simTriggersContainer}>
        {/* Scenario 1: Highway Crash */}
        <TouchableOpacity
          style={styles.simCard}
          activeOpacity={0.8}
          onPress={runHighwayCrashSim}
        >
          <View style={[styles.simIconBox, { backgroundColor: 'rgba(255, 59, 48, 0.15)' }]}>
            <AlertOctagon size={22} color="#FF3B30" />
          </View>
          <View style={styles.simContent}>
            <Text style={styles.simName}>1. High-Speed Highway Crash</Text>
            <Text style={styles.simDesc}>
              80 km/h → 0 km/h + high gyro roll. Triggers POSSIBLE_ACCIDENT.
            </Text>
          </View>
          <Play size={18} color="#FF3B30" />
        </TouchableOpacity>

        {/* Scenario 2: Pothole Bump */}
        <TouchableOpacity
          style={styles.simCard}
          activeOpacity={0.8}
          onPress={runPotholeSim}
        >
          <View style={[styles.simIconBox, { backgroundColor: 'rgba(63, 185, 80, 0.15)' }]}>
            <CheckCircle size={22} color="#3FB950" />
          </View>
          <View style={styles.simContent}>
            <Text style={styles.simName}>2. Indian Road Pothole / Bump</Text>
            <Text style={styles.simDesc}>
              Sharp Z-jerk with steady speed. Suppressed to avoid false alarms.
            </Text>
          </View>
          <Play size={18} color="#3FB950" />
        </TouchableOpacity>

        {/* Scenario 3: Puncture Drag */}
        <TouchableOpacity
          style={styles.simCard}
          activeOpacity={0.8}
          onPress={runPunctureDragSim}
        >
          <View style={[styles.simIconBox, { backgroundColor: 'rgba(255, 165, 0, 0.15)' }]}>
            <Zap size={22} color="#FFA500" />
          </View>
          <View style={styles.simContent}>
            <Text style={styles.simName}>3. Sudden Tyre Blowout / Drag</Text>
            <Text style={styles.simDesc}>
              70 km/h → 18 km/h without violent roll. Triggers POSSIBLE_BREAKDOWN.
            </Text>
          </View>
          <Play size={18} color="#FFA500" />
        </TouchableOpacity>

        {/* Scenario 4: Two-Wheeler Fall */}
        <TouchableOpacity
          style={styles.simCard}
          activeOpacity={0.8}
          onPress={runTwoWheelerFallSim}
        >
          <View style={[styles.simIconBox, { backgroundColor: 'rgba(210, 153, 34, 0.15)' }]}>
            <Activity size={22} color="#D29922" />
          </View>
          <View style={styles.simContent}>
            <Text style={styles.simName}>4. Two-Wheeler Low-Speed Skid</Text>
            <Text style={styles.simDesc}>
              25 km/h low-speed bike drop with roll. Triggers POSSIBLE_ACCIDENT.
            </Text>
          </View>
          <Play size={18} color="#D29922" />
        </TouchableOpacity>

        {/* Reset Simulation */}
        <TouchableOpacity
          style={styles.resetSimBtn}
          activeOpacity={0.8}
          onPress={handleResetSim}
        >
          <RotateCcw size={18} color="#8B949E" />
          <Text style={styles.resetSimText}>Reset Live Sensors & Simulation</Text>
        </TouchableOpacity>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D1117',
  },
  contentContainer: {
    paddingBottom: 40,
  },
  headerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161B22',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 16,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#30363D',
    gap: 12,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  headerDesc: {
    color: '#8B949E',
    fontSize: 12,
    marginTop: 2,
  },
  meterCard: {
    backgroundColor: '#161B22',
    borderColor: '#30363D',
    borderWidth: 1,
    borderRadius: 16,
    marginHorizontal: 16,
    padding: 16,
    marginBottom: 16,
  },
  meterTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  meterLabel: {
    color: '#8B949E',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  badgeRed: {
    backgroundColor: 'rgba(255, 59, 48, 0.15)',
    borderColor: 'rgba(255, 59, 48, 0.4)',
  },
  badgeAmber: {
    backgroundColor: 'rgba(255, 149, 0, 0.15)',
    borderColor: 'rgba(255, 149, 0, 0.4)',
  },
  badgeGreen: {
    backgroundColor: 'rgba(63, 185, 80, 0.15)',
    borderColor: 'rgba(63, 185, 80, 0.4)',
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  textRed: { color: '#FF4D4D' },
  textAmber: { color: '#FFA500' },
  textGreen: { color: '#3FB950' },
  scoreNumber: {
    color: '#FFFFFF',
    fontSize: 48,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
    marginVertical: 4,
  },
  scoreReason: {
    color: '#C9D1D9',
    fontSize: 13,
    marginBottom: 12,
  },
  barTrack: {
    height: 10,
    backgroundColor: '#21262D',
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 8,
  },
  barFill: {
    height: '100%',
    borderRadius: 5,
  },
  thresholdRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  thresholdText: {
    color: '#6E7681',
    fontSize: 11,
    fontWeight: '600',
  },
  gaugesGrid: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 20,
  },
  gaugeCard: {
    flex: 1,
    backgroundColor: '#161B22',
    borderColor: '#30363D',
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
  },
  gaugeTitle: {
    color: '#8B949E',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 6,
  },
  gaugeValue: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '900',
    marginVertical: 2,
  },
  gaugeUnit: {
    fontSize: 11,
    color: '#8B949E',
    fontWeight: '600',
  },
  gaugeSub: {
    color: '#6E7681',
    fontSize: 10,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  sectionSubtitle: {
    color: '#8B949E',
    fontSize: 12,
    marginTop: 2,
  },
  sensitivityRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 20,
  },
  sensitivityBtn: {
    flex: 1,
    backgroundColor: '#161B22',
    borderColor: '#30363D',
    borderWidth: 1,
    height: 42,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sensitivityBtnActive: {
    backgroundColor: '#238636',
    borderColor: '#2EA043',
  },
  sensitivityBtnText: {
    color: '#8B949E',
    fontSize: 12,
    fontWeight: '800',
  },
  sensitivityBtnTextActive: {
    color: '#FFFFFF',
  },
  simTriggersContainer: {
    paddingHorizontal: 16,
    gap: 10,
  },
  simCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161B22',
    borderColor: '#30363D',
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    gap: 12,
  },
  simIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  simContent: {
    flex: 1,
  },
  simName: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  simDesc: {
    color: '#8B949E',
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },
  resetSimBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#21262D',
    height: 44,
    borderRadius: 12,
    gap: 8,
    marginTop: 6,
  },
  resetSimText: {
    color: '#C9D1D9',
    fontSize: 13,
    fontWeight: '700',
  },
});
