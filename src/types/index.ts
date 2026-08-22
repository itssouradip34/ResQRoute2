export type SensitivityLevel = 'low' | 'medium' | 'high';

export type SituationType =
  | 'accident'
  | 'breakdown'
  | 'medical'
  | 'flat_tyre'
  | 'fuel_out'
  | 'other';

export type UrgencyLevel = 'critical' | 'high' | 'moderate';

export type IncidentStatus =
  | 'idle'
  | 'detected'
  | 'confirming'
  | 'cancelled'
  | 'active'
  | 'classified'
  | 'dispatched'
  | 'tracking'
  | 'resolved';

export type ServiceCategory =
  | 'hospital'
  | 'police'
  | 'ambulance'
  | 'towing'
  | 'puncture_repair'
  | 'mechanic'
  | 'fuel'
  | 'other';

export interface UserLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
  speed?: number; // in km/h or m/s
  heading?: number;
  addressName?: string;
  regionCode?: string;
  timestamp?: number;
}

export interface SensorSnapshot {
  accel_peak: number; // in g or m/s^2
  gyro_peak: number; // in rad/s or deg/s
  speed_before: number; // in km/h
  speed_after: number; // in km/h
  raw_anomaly_score: number;
  threshold_used: number;
  captured_at: string;
}

export interface AnomalyDetectionResult {
  eventType: 'POSSIBLE_ACCIDENT' | 'POSSIBLE_BREAKDOWN' | 'NO_ANOMALY';
  confidenceScore: number; // 0 to 1
  anomalyScore: number;
  gyroTurbulence: number;
  accelJerk: number;
  speedDropDelta: number;
  snapshot: SensorSnapshot;
  reasoning: string;
}

export interface EmergencyService {
  id: string;
  name: string;
  category: ServiceCategory;
  latitude: number;
  longitude: number;
  phone_number: string;
  address: string;
  region_code: string; // e.g. 'IN-DL', 'IN-KA', 'IN-MH'
  source: string;
  is_verified: boolean;
  rating: number; // 1-5
  open_24x7: boolean;
  emergency_level?: 'trauma_center' | 'icu' | 'standard' | 'highway_patrol' | 'heavy_towing';
  distanceKm?: number;
  etaMinutes?: number;
  rankScore?: number;
  specialty?: string;
}

export interface TrustedContact {
  id: string;
  name: string;
  phone_number: string;
  relation: string;
  is_primary?: boolean;
}

export interface TimelineEvent {
  id: string;
  incident_id: string;
  type:
    | 'possible_accident_detected'
    | 'possible_breakdown_detected'
    | 'manual_sos_triggered'
    | 'countdown_started'
    | 'countdown_expired'
    | 'cancelled_by_user'
    | 'ai_classified'
    | 'service_dispatched'
    | 'contact_notified'
    | 'sms_fallback_sent'
    | 'responder_enroute'
    | 'resolved';
  message: string;
  timestamp: string;
}

export interface IncidentReport {
  id: string;
  user_id?: string;
  trigger_type: 'manual' | 'auto_sensor';
  situation_type: SituationType;
  urgency_level: UrgencyLevel;
  confidence_score: number;
  latitude: number;
  longitude: number;
  address_text?: string;
  description_text?: string;
  status: IncidentStatus;
  sensor_snapshot?: SensorSnapshot;
  created_at: string;
  resolved_at?: string;
  selected_service_id?: string;
}

export interface AIChatMessage {
  id: string;
  sender: 'user' | 'assistant' | 'system';
  text: string;
  timestamp: number;
  categorySuggestion?: ServiceCategory;
  extractedFacts?: {
    injuries?: boolean;
    vehicleType?: string;
    passengerCount?: number;
    hazardLevel?: UrgencyLevel;
  };
  followUpOptions?: string[];
  isSafetyGuidance?: boolean;
  recommendedServices?: EmergencyService[];
}

export interface UserSettings {
  defaultRegion: string;
  sensorSensitivity: SensitivityLevel;
  countdownSeconds: number; // default 20 (range 10-60)
  enableAudioAlarm: boolean;
  enableVibration: boolean;
  enableBackgroundMonitoring: boolean;
  offlineDataDownloaded: boolean;
  locationConsentGranted: boolean;
  sensorConsentGranted: boolean;
  language: 'en' | 'hi';
}
