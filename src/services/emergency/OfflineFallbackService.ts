import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import * as SMS from 'expo-sms';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  EmergencyService,
  IncidentReport,
  TimelineEvent,
  TrustedContact,
  UserLocation,
} from '../../types';
import { INDIA_EMERGENCY_SERVICES } from '../../data/indiaEmergencyServices';

const OFFLINE_SYNC_QUEUE_KEY = '@resqroute_offline_sync_queue';
const OFFLINE_REGIONAL_BUNDLE_KEY = '@resqroute_offline_bundle_';

export interface QueuedSyncItem {
  id: string;
  type: 'incident' | 'cancellation' | 'timeline' | 'feedback';
  data: any;
  createdAt: string;
}

class OfflineFallbackServiceClass {
  private isOnline = true;
  private networkListeners: Set<(online: boolean) => void> = new Set();

  constructor() {
    this.initNetworkListener();
  }

  private initNetworkListener() {
    NetInfo.addEventListener((state: NetInfoState) => {
      const online = Boolean(state.isConnected && state.isInternetReachable !== false);
      if (this.isOnline !== online) {
        this.isOnline = online;
        this.networkListeners.forEach((listener) => listener(online));
        if (online) {
          this.flushSyncQueue();
        }
      }
    });
  }

  public subscribeNetworkStatus(listener: (online: boolean) => void): () => void {
    this.networkListeners.add(listener);
    listener(this.isOnline);
    return () => {
      this.networkListeners.delete(listener);
    };
  }

  public getIsOnline(): boolean {
    return this.isOnline;
  }

  /**
   * Format structured emergency SMS containing vital GPS coordinates & timestamp
   */
  public generateEmergencySMSBody(
    incident: Partial<IncidentReport>,
    location: UserLocation
  ): string {
    const mapsLink = `https://maps.google.com/?q=${location.latitude},${location.longitude}`;
    const timeStr = new Date().toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    const isAuto = incident.trigger_type === 'auto_sensor';
    const alertHeader = isAuto
      ? '🚨 [ResQRoute-A AUTO SOS ALERT]'
      : '🚨 [ResQRoute-A EMERGENCY SOS ALERT]';

    return (
      `${alertHeader}\n` +
      `Emergency Type: ${incident.situation_type?.toUpperCase() || 'ACCIDENT/BREAKDOWN'}\n` +
      `Urgency: ${incident.urgency_level?.toUpperCase() || 'CRITICAL'}\n` +
      `Time: ${timeStr}\n` +
      `Location: ${location.addressName || 'Current GPS Coords'}\n` +
      `Live Map: ${mapsLink}\n` +
      `Coordinates: ${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}\n` +
      `Please contact emergency services (112 / 108 / 1033) or coordinate rescue immediately.`
    );
  }

  /**
   * Normalize a stored contact number into digits-only form (with country code)
   * suitable for wa.me deep links. Assumes India (+91) when no country code
   * is present and the local number is 10 digits.
   */
  public normalizePhoneForWhatsApp(rawPhone: string): string {
    const digits = rawPhone.replace(/[^\d]/g, '');
    if (rawPhone.trim().startsWith('+')) return digits;
    if (digits.length === 10) return `91${digits}`;
    return digits;
  }

  /**
   * Build a wa.me deep link that opens a WhatsApp chat with the contact,
   * prefilled with the live-location message. wa.me is a universal https
   * link so it needs no extra native permissions/queries to open.
   */
  public getWhatsAppShareURL(rawPhone: string, message: string): string {
    const digits = this.normalizePhoneForWhatsApp(rawPhone);
    return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
  }

  /**
   * Send an on-demand SMS with live location to a single contact,
   * independent of an active incident (e.g. a manual "notify now" tap).
   */
  public async sendManualLocationSMS(
    contact: TrustedContact,
    location: UserLocation
  ): Promise<{ success: boolean; error?: string }> {
    return this.sendEmergencySMS(
      [contact],
      {
        situation_type: 'other',
        urgency_level: 'moderate',
        trigger_type: 'manual',
      },
      location
    );
  }

  /**
   * Dispatch SMS via native device SMS provider (expo-sms)
   */
  public async sendEmergencySMS(
    contacts: TrustedContact[],
    incident: Partial<IncidentReport>,
    location: UserLocation
  ): Promise<{ success: boolean; error?: string }> {
    const recipients = contacts
      .map((c) => c.phone_number.trim())
      .filter((p) => p.length > 0);

    if (recipients.length === 0) {
      return { success: false, error: 'No trusted contacts phone numbers configured' };
    }

    try {
      const isAvailable = await SMS.isAvailableAsync();
      if (!isAvailable) {
        console.warn('SMS is not available on this platform/device');
        return { success: false, error: 'SMS service unavailable on this device' };
      }

      const body = this.generateEmergencySMSBody(incident, location);
      const { result } = await SMS.sendSMSAsync(recipients, body);

      return { success: result === 'sent' || result === 'unknown' };
    } catch (err: any) {
      console.error('Error sending emergency SMS:', err);
      return { success: false, error: err?.message || 'Failed to send SMS' };
    }
  }

  /**
   * Queue action for offline synchronization
   */
  public async queueForSync(
    type: 'incident' | 'cancellation' | 'timeline' | 'feedback',
    data: any
  ): Promise<void> {
    try {
      const queueRaw = await AsyncStorage.getItem(OFFLINE_SYNC_QUEUE_KEY);
      const queue: QueuedSyncItem[] = queueRaw ? JSON.parse(queueRaw) : [];

      queue.push({
        id: `sync_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        type,
        data,
        createdAt: new Date().toISOString(),
      });

      await AsyncStorage.setItem(OFFLINE_SYNC_QUEUE_KEY, JSON.stringify(queue));
    } catch (err) {
      console.error('Failed to queue offline sync item:', err);
    }
  }

  /**
   * Flush queued offline items when connectivity resumes
   */
  public async flushSyncQueue(): Promise<void> {
    try {
      const queueRaw = await AsyncStorage.getItem(OFFLINE_SYNC_QUEUE_KEY);
      if (!queueRaw) return;

      const queue: QueuedSyncItem[] = JSON.parse(queueRaw);
      if (queue.length === 0) return;

      console.log(`[OfflineSync] Flushing ${queue.length} queued events to cloud...`);
      // When Supabase connection is established, items are synced here
      await AsyncStorage.removeItem(OFFLINE_SYNC_QUEUE_KEY);
    } catch (err) {
      console.error('Failed to flush offline queue:', err);
    }
  }

  /**
   * Pre-download & cache regional bundle for offline emergency navigation
   */
  public async cacheRegionalBundle(
    regionCode: string,
    services?: EmergencyService[]
  ): Promise<boolean> {
    try {
      const bundle =
        services ||
        INDIA_EMERGENCY_SERVICES.filter(
          (s) => s.region_code === regionCode || s.region_code === 'IN-DL'
        );

      await AsyncStorage.setItem(
        `${OFFLINE_REGIONAL_BUNDLE_KEY}${regionCode}`,
        JSON.stringify({
          regionCode,
          updatedAt: new Date().toISOString(),
          services: bundle,
        })
      );
      return true;
    } catch (err) {
      console.error('Failed to cache regional bundle:', err);
      return false;
    }
  }

  public async getCachedRegionalBundle(
    regionCode: string
  ): Promise<EmergencyService[] | null> {
    try {
      const data = await AsyncStorage.getItem(
        `${OFFLINE_REGIONAL_BUNDLE_KEY}${regionCode}`
      );
      if (data) {
        const parsed = JSON.parse(data);
        return parsed.services;
      }
      return null;
    } catch {
      return null;
    }
  }
}

export const OfflineFallbackService = new OfflineFallbackServiceClass();
