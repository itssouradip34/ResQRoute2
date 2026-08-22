import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  EmergencyService,
  IncidentReport,
  SensorSnapshot,
  TimelineEvent,
  TrustedContact,
} from '../../types';

// Replace with your project Supabase credentials or use environment variables
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://resqroute-mock.supabase.co';
const SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.resqroute_demo_key';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export class SupabaseDataService {
  /**
   * Create or update incident report in Supabase
   */
  public static async createIncident(
    incident: Partial<IncidentReport>
  ): Promise<{ data: IncidentReport | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('incident_reports')
        .insert([incident])
        .select()
        .single();

      return { data, error };
    } catch (err) {
      return { data: null, error: err };
    }
  }

  /**
   * Save sensor snapshot linked to incident
   */
  public static async saveSensorSnapshot(
    incidentId: string,
    snapshot: SensorSnapshot
  ): Promise<void> {
    try {
      await supabase.from('sensor_snapshots').insert([
        {
          incident_id: incidentId,
          ...snapshot,
        },
      ]);
    } catch (err) {
      console.warn('Supabase snapshot save fallback (local only):', err);
    }
  }

  /**
   * Add timeline event
   */
  public static async addTimelineEvent(
    incidentId: string,
    type: TimelineEvent['type'],
    message: string
  ): Promise<void> {
    try {
      await supabase.from('timeline_events').insert([
        {
          incident_id: incidentId,
          type,
          message,
          timestamp: new Date().toISOString(),
        },
      ]);
    } catch (err) {
      console.warn('Timeline event save (local only):', err);
    }
  }
}
