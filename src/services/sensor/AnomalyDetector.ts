import {
  AnomalyDetectionResult,
  SensitivityLevel,
  SensorSnapshot,
} from '../../types';
import { SensorFrame, SensorHub } from './SensorHub';

export interface DetectionThresholds {
  crashAnomalyThreshold: number;
  mechanicalThreshold: number;
  gyroCrashThreshold: number;
  accelJerkCrashThreshold: number;
  speedDropCrashThreshold: number;
  speedDropBreakdownThreshold: number;
  potholeJerkMax: number; // Jerk below which single vertical spikes are treated as potholes
}

const SENSITIVITY_PROFILES: Record<SensitivityLevel, DetectionThresholds> = {
  // Low Sensitivity: Resilient to very rough roads, potholes, speed breakers
  low: {
    crashAnomalyThreshold: 7.5,
    mechanicalThreshold: 3.5,
    gyroCrashThreshold: 6.5,
    accelJerkCrashThreshold: 30.0,
    speedDropCrashThreshold: 40.0,
    speedDropBreakdownThreshold: 25.0,
    potholeJerkMax: 18.0,
  },
  // Medium Sensitivity: Recommended balance for urban & highway driving in India
  medium: {
    crashAnomalyThreshold: 5.5,
    mechanicalThreshold: 2.8,
    gyroCrashThreshold: 4.8,
    accelJerkCrashThreshold: 22.0,
    speedDropCrashThreshold: 28.0,
    speedDropBreakdownThreshold: 18.0,
    potholeJerkMax: 14.0,
  },
  // High Sensitivity: Sensitive to low-speed bike skids, minor collisions, gentle rollovers
  high: {
    crashAnomalyThreshold: 3.8,
    mechanicalThreshold: 2.0,
    gyroCrashThreshold: 3.2,
    accelJerkCrashThreshold: 14.0,
    speedDropCrashThreshold: 18.0,
    speedDropBreakdownThreshold: 12.0,
    potholeJerkMax: 9.0,
  },
};

class AnomalyDetectorService {
  private sensitivity: SensitivityLevel = 'medium';
  private cooldownUntil = 0; // Prevent spamming triggers within 10s of a previous event

  public setSensitivity(level: SensitivityLevel) {
    this.sensitivity = level;
  }

  public getSensitivity(): SensitivityLevel {
    return this.sensitivity;
  }

  public getThresholds(): DetectionThresholds {
    return SENSITIVITY_PROFILES[this.sensitivity];
  }

  public resetCooldown() {
    this.cooldownUntil = 0;
  }

  /**
   * Evaluate rolling sensor frames for accident/breakdown anomalies
   */
  public evaluateFrame(
    currentFrame: SensorFrame,
    history: SensorFrame[]
  ): AnomalyDetectionResult {
    const now = Date.now();
    const thresholds = this.getThresholds();

    // 1. Calculate Gyro Turbulence (Magnitude of rotational velocity rad/s)
    const gyroTurbulence = currentFrame.gyro.magnitude;

    // 2. Calculate Accelerometer Jerk (Instantaneous impact force derivative)
    const accelJerk = currentFrame.accel.jerk;

    // 3. Calculate Speed Drop Delta over sliding window (last ~1.5 - 2s)
    let speedBefore = currentFrame.speedKmH;
    if (history.length > 0) {
      const windowStartFrame = history[0];
      speedBefore = windowStartFrame.speedKmH;
    }
    const speedAfter = currentFrame.speedKmH;
    const speedDropDelta = Math.max(0, speedBefore - speedAfter);

    // 4. Calculate Weighted Anomaly Score (PRD Formula)
    // w1=0.45 (gyro turbulence), w2=0.35 (accel jerk scaled), w3=0.20 (speed drop scaled)
    const normalizedGyro = gyroTurbulence; // typical range 0 to 10
    const normalizedJerk = accelJerk / 5.0; // scale jerk to ~0 to 10
    const normalizedSpeedDrop = speedDropDelta / 10.0; // scale drop to ~0 to 10

    const w1 = 0.45;
    const w2 = 0.35;
    const w3 = 0.2;

    const anomalyScore = Number(
      (
        w1 * normalizedGyro +
        w2 * normalizedJerk +
        w3 * normalizedSpeedDrop
      ).toFixed(2)
    );

    // Peak metrics for snapshot
    let accelPeak = currentFrame.accel.magnitude;
    let gyroPeak = currentFrame.gyro.magnitude;
    history.forEach((f) => {
      if (f.accel.magnitude > accelPeak) accelPeak = f.accel.magnitude;
      if (f.gyro.magnitude > gyroPeak) gyroPeak = f.gyro.magnitude;
    });

    const snapshot: SensorSnapshot = {
      accel_peak: Number(accelPeak.toFixed(2)),
      gyro_peak: Number(gyroPeak.toFixed(2)),
      speed_before: Number(speedBefore.toFixed(1)),
      speed_after: Number(speedAfter.toFixed(1)),
      raw_anomaly_score: anomalyScore,
      threshold_used: thresholds.crashAnomalyThreshold,
      captured_at: new Date().toISOString(),
    };

    // Check Cooldown
    if (now < this.cooldownUntil) {
      return {
        eventType: 'NO_ANOMALY',
        confidenceScore: 0,
        anomalyScore,
        gyroTurbulence,
        accelJerk,
        speedDropDelta,
        snapshot,
        reasoning: 'Within trigger cooldown window',
      };
    }

    // =========================================================================
    // FALSE-POSITIVE FILTER: Pothole & Speed Breaker Suppression
    // Sharp jerk on Z-axis with almost zero gyro turbulence and no speed drop
    // =========================================================================
    const isPotholePattern =
      accelJerk > 0 &&
      accelJerk <= thresholds.potholeJerkMax * 2 &&
      gyroTurbulence < 1.2 &&
      speedDropDelta < 5.0;

    if (isPotholePattern) {
      return {
        eventType: 'NO_ANOMALY',
        confidenceScore: 0.1,
        anomalyScore,
        gyroTurbulence,
        accelJerk,
        speedDropDelta,
        snapshot,
        reasoning: 'Road surface irregularity (pothole/bump) suppressed',
      };
    }

    // =========================================================================
    // BRANCH 1: POSSIBLE ACCIDENT (High Confidence Crash / Rollover / Fall)
    // Condition A: High Gyro Turbulence + Deceleration
    // Condition B: Massive Anomaly Score exceeding crash threshold
    // =========================================================================
    const isHighImpactCollision =
      gyroTurbulence >= thresholds.gyroCrashThreshold &&
      speedDropDelta >= thresholds.speedDropCrashThreshold;

    const isHighEnergyTumble =
      gyroTurbulence >= thresholds.gyroCrashThreshold * 1.3;

    const isAnomalyScoreCrash = anomalyScore >= thresholds.crashAnomalyThreshold;

    if (isHighImpactCollision || isHighEnergyTumble || isAnomalyScoreCrash) {
      const confidence = Math.min(
        0.98,
        Math.max(
          0.65,
          anomalyScore / (thresholds.crashAnomalyThreshold * 1.4)
        )
      );

      this.cooldownUntil = now + 12000; // 12s cooldown
      return {
        eventType: 'POSSIBLE_ACCIDENT',
        confidenceScore: Number(confidence.toFixed(2)),
        anomalyScore,
        gyroTurbulence,
        accelJerk,
        speedDropDelta,
        snapshot,
        reasoning:
          gyroTurbulence >= thresholds.gyroCrashThreshold
            ? 'High angular rotation / vehicle tumble detected with deceleration'
            : 'Combined kinematic impact force exceeded accident threshold',
      };
    }

    // =========================================================================
    // BRANCH 2: POSSIBLE BREAKDOWN (Tyre Puncture / Drag / Mechanical Event)
    // Speed-drop pattern without violent gyro turbulence
    // =========================================================================
    const isSuddenSpeedDropWithoutTumble =
      speedDropDelta >= thresholds.speedDropBreakdownThreshold &&
      gyroTurbulence < thresholds.gyroCrashThreshold;

    const isMechanicalAnomaly =
      anomalyScore >= thresholds.mechanicalThreshold &&
      gyroTurbulence < thresholds.gyroCrashThreshold * 0.7;

    if (isSuddenSpeedDropWithoutTumble || isMechanicalAnomaly) {
      const confidence = Math.min(
        0.88,
        Math.max(
          0.5,
          anomalyScore / (thresholds.mechanicalThreshold * 1.5)
        )
      );

      this.cooldownUntil = now + 10000; // 10s cooldown
      return {
        eventType: 'POSSIBLE_BREAKDOWN',
        confidenceScore: Number(confidence.toFixed(2)),
        anomalyScore,
        gyroTurbulence,
        accelJerk,
        speedDropDelta,
        snapshot,
        reasoning:
          'Sharp deceleration / mechanical resistance detected without severe rollover',
      };
    }

    // No anomaly
    return {
      eventType: 'NO_ANOMALY',
      confidenceScore: 0,
      anomalyScore,
      gyroTurbulence,
      accelJerk,
      speedDropDelta,
      snapshot,
      reasoning: 'Normal motion within safe operational parameters',
    };
  }
}

export const AnomalyDetector = new AnomalyDetectorService();
