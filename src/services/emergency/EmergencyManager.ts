import * as Haptics from 'expo-haptics';
import {
  EmergencyService,
  IncidentReport,
  IncidentStatus,
  SensorSnapshot,
  SituationType,
  TimelineEvent,
  TrustedContact,
  UrgencyLevel,
  UserLocation,
} from '../../types';
import { SensorHub } from '../sensor/SensorHub';
import { AnomalyDetector } from '../sensor/AnomalyDetector';
import { OfflineFallbackService } from './OfflineFallbackService';
import { ServiceRanker } from '../directory/ServiceRanker';
import { SupabaseDataService } from '../supabase/supabaseClient';

export type EmergencyStateListener = (manager: EmergencyManagerClass) => void;

class EmergencyManagerClass {
  private status: IncidentStatus = 'idle';
  private currentIncident: IncidentReport | null = null;
  private timeline: TimelineEvent[] = [];
  private trustedContacts: TrustedContact[] = [
    {
      id: 'tc-1',
      name: 'Priya Sharma (Spouse)',
      phone_number: '+919876543210',
      relation: 'Spouse',
      is_primary: true,
    },
    {
      id: 'tc-2',
      name: 'Amit Verma (Brother)',
      phone_number: '+919811223344',
      relation: 'Brother',
    },
  ];
  private rankedServices: EmergencyService[] = [];

  // Countdown properties
  private countdownRemaining = 20;
  private configuredCountdownSeconds = 20;
  private countdownTimer: any = null;
  private hapticInterval: any = null;

  // Listeners
  private listeners: Set<EmergencyStateListener> = new Set();

  constructor() {
    this.initSensorSubscription();
  }

  private initSensorSubscription() {
    SensorHub.subscribe((frame) => {
      // Only evaluate if idle
      if (this.status !== 'idle') return;

      const history = SensorHub.getHistory();
      const anomaly = AnomalyDetector.evaluateFrame(frame, history);

      if (anomaly.eventType === 'POSSIBLE_ACCIDENT') {
        this.triggerAutoDetection('accident', anomaly.confidenceScore, anomaly.snapshot);
      } else if (anomaly.eventType === 'POSSIBLE_BREAKDOWN') {
        this.triggerAutoDetection('breakdown', anomaly.confidenceScore, anomaly.snapshot);
      }
    });
  }

  public subscribe(listener: EmergencyStateListener): () => void {
    this.listeners.add(listener);
    listener(this);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((l) => l(this));
  }

  // Getters
  public getStatus(): IncidentStatus {
    return this.status;
  }

  public getCurrentIncident(): IncidentReport | null {
    return this.currentIncident;
  }

  public getCountdownRemaining(): number {
    return this.countdownRemaining;
  }

  public getConfiguredCountdown(): number {
    return this.configuredCountdownSeconds;
  }

  public setConfiguredCountdown(seconds: number) {
    this.configuredCountdownSeconds = Math.max(10, Math.min(60, seconds));
    if (this.status === 'idle') {
      this.countdownRemaining = this.configuredCountdownSeconds;
    }
  }

  public getTimeline(): TimelineEvent[] {
    return [...this.timeline];
  }

  public getTrustedContacts(): TrustedContact[] {
    return [...this.trustedContacts];
  }

  public setTrustedContacts(contacts: TrustedContact[]) {
    this.trustedContacts = contacts;
    this.notify();
  }

  public getRankedServices(): EmergencyService[] {
    return [...this.rankedServices];
  }

  /**
   * Auto-Trigger from on-device AnomalyDetector
   */
  public triggerAutoDetection(
    situation: SituationType,
    confidence: number,
    snapshot: SensorSnapshot
  ) {
    if (this.status !== 'idle') return;

    const location = SensorHub.getCurrentLocation();
    const incidentId = `inc_${Date.now()}`;
    const urgency: UrgencyLevel = situation === 'accident' ? 'critical' : 'high';

    this.currentIncident = {
      id: incidentId,
      trigger_type: 'auto_sensor',
      situation_type: situation,
      urgency_level: urgency,
      confidence_score: confidence,
      latitude: location.latitude,
      longitude: location.longitude,
      address_text: location.addressName,
      status: 'confirming',
      sensor_snapshot: snapshot,
      created_at: new Date().toISOString(),
    };

    this.status = 'confirming';
    this.countdownRemaining = this.configuredCountdownSeconds;

    this.addTimelineEvent(
      incidentId,
      'possible_accident_detected',
      `On-device sensors detected possible ${situation} (Confidence: ${(
        confidence * 100
      ).toFixed(0)}%). Countdown started.`
    );

    this.startCountdownLoop();
    this.notify();
  }

  /**
   * Manual SOS Trigger (Bypasses countdown, immediately active)
   */
  public triggerManualSOS(situation: SituationType = 'accident') {
    this.stopCountdownLoop();
    const location = SensorHub.getCurrentLocation();
    const incidentId = `inc_man_${Date.now()}`;

    this.currentIncident = {
      id: incidentId,
      trigger_type: 'manual',
      situation_type: situation,
      urgency_level: 'critical',
      confidence_score: 1.0,
      latitude: location.latitude,
      longitude: location.longitude,
      address_text: location.addressName,
      status: 'active',
      created_at: new Date().toISOString(),
    };

    this.status = 'active';

    this.addTimelineEvent(
      incidentId,
      'manual_sos_triggered',
      'User manually initiated emergency SOS. Immediate rescue dispatch requested.'
    );

    this.escalateAndDispatch();
    this.notify();
  }

  private startCountdownLoop() {
    this.stopCountdownLoop();

    // Start audible / tactile pulsing
    this.hapticInterval = setInterval(() => {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      } catch {
        // Fallback
      }
    }, 1000);

    this.countdownTimer = setInterval(() => {
      this.countdownRemaining -= 1;
      this.notify();

      if (this.countdownRemaining <= 0) {
        this.stopCountdownLoop();
        this.handleCountdownExpiry();
      }
    }, 1000);
  }

  private stopCountdownLoop() {
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = null;
    }
    if (this.hapticInterval) {
      clearInterval(this.hapticInterval);
      this.hapticInterval = null;
    }
  }

  /**
   * User taps "I'm OK — Cancel"
   */
  public cancelEmergency() {
    if (this.status !== 'confirming' && this.status !== 'active') return;

    this.stopCountdownLoop();
    const incidentId = this.currentIncident?.id || 'unknown';

    this.addTimelineEvent(
      incidentId,
      'cancelled_by_user',
      'User cancelled emergency ("I\'m OK"). False alarm recorded.'
    );

    if (this.currentIncident) {
      this.currentIncident.status = 'cancelled';
      this.currentIncident.resolved_at = new Date().toISOString();
      OfflineFallbackService.queueForSync('cancellation', this.currentIncident);
    }

    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}

    this.status = 'cancelled';
    this.notify();

    // Reset back to idle after brief confirmation
    setTimeout(() => {
      this.status = 'idle';
      this.countdownRemaining = this.configuredCountdownSeconds;
      this.notify();
    }, 2500);
  }

  /**
   * User taps "Send Help Now" (Immediate escalation)
   */
  public forceEscalate() {
    this.stopCountdownLoop();
    this.handleCountdownExpiry();
  }

  /**
   * Countdown reaches 0 without user cancellation -> Automatic escalation
   */
  private handleCountdownExpiry() {
    if (!this.currentIncident) return;

    this.status = 'active';
    this.currentIncident.status = 'active';

    this.addTimelineEvent(
      this.currentIncident.id,
      'countdown_expired',
      'Countdown elapsed with no user cancellation. Escalating to active emergency rescue.'
    );

    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } catch {}

    this.escalateAndDispatch();
    this.notify();
  }

  private async escalateAndDispatch() {
    if (!this.currentIncident) return;
    const location = SensorHub.getCurrentLocation();

    // 1. Rank nearby relevant emergency services
    this.rankedServices = ServiceRanker.rankServices({
      userLocation: location,
      situationType: this.currentIncident.situation_type,
    });

    // 2. Alert Trusted Contacts via native SMS fallback
    const smsResult = await OfflineFallbackService.sendEmergencySMS(
      this.trustedContacts,
      this.currentIncident,
      location
    );

    if (smsResult.success) {
      this.addTimelineEvent(
        this.currentIncident.id,
        'contact_notified',
        `SMS alert dispatched to ${this.trustedContacts.length} trusted emergency contacts with live GPS coordinates.`
      );
    } else {
      this.addTimelineEvent(
        this.currentIncident.id,
        'sms_fallback_sent',
        `SMS prepared for dispatch: ${smsResult.error || 'Review draft'}`
      );
    }

    // Automatic Telegram alert — fires with zero taps required, unlike
    // the SMS composer above which still needs manual confirmation.
    const telegramResult = await OfflineFallbackService.sendAutoTelegramAlert(
      this.currentIncident,
      location
    );

    if (telegramResult.success) {
      this.addTimelineEvent(
        this.currentIncident.id,
        'contact_notified',
        'Automatic Telegram alert delivered to trusted contacts (no confirmation needed).'
      );
    }

    // 3. Sync to Supabase if connected
    SupabaseDataService.createIncident(this.currentIncident);
    if (this.currentIncident.sensor_snapshot) {
      SupabaseDataService.saveSensorSnapshot(
        this.currentIncident.id,
        this.currentIncident.sensor_snapshot
      );
    }

    this.notify();
  }

  /**
   * Resolve an active emergency
   */
  public resolveEmergency() {
    if (this.currentIncident) {
      this.currentIncident.status = 'resolved';
      this.currentIncident.resolved_at = new Date().toISOString();
      this.addTimelineEvent(
        this.currentIncident.id,
        'resolved',
        'Emergency marked as resolved by user.'
      );
    }
    this.status = 'resolved';
    this.notify();

    setTimeout(() => {
      this.status = 'idle';
      this.currentIncident = null;
      this.countdownRemaining = this.configuredCountdownSeconds;
      this.notify();
    }, 2000);
  }

  private addTimelineEvent(
    incidentId: string,
    type: TimelineEvent['type'],
    message: string
  ) {
    const event: TimelineEvent = {
      id: `tl_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      incident_id: incidentId,
      type,
      message,
      timestamp: new Date().toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
    };

    this.timeline.unshift(event);
    SupabaseDataService.addTimelineEvent(incidentId, type, message);
  }
}

export const EmergencyManager = new EmergencyManagerClass();