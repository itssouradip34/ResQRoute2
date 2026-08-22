import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SensitivityLevel, UserSettings } from '../types';
import { AnomalyDetector } from '../services/sensor/AnomalyDetector';
import { EmergencyManager } from '../services/emergency/EmergencyManager';
import { OfflineFallbackService } from '../services/emergency/OfflineFallbackService';

const SETTINGS_STORAGE_KEY = '@resqroute_settings_v2';

const DEFAULT_SETTINGS: UserSettings = {
  defaultRegion: 'IN-DL',
  sensorSensitivity: 'medium',
  countdownSeconds: 20,
  enableAudioAlarm: true,
  enableVibration: true,
  enableBackgroundMonitoring: true,
  offlineDataDownloaded: true,
  locationConsentGranted: true,
  sensorConsentGranted: true,
  language: 'en',
};

interface SettingsContextType {
  settings: UserSettings;
  isOnline: boolean;
  updateSensitivity: (level: SensitivityLevel) => void;
  updateCountdown: (seconds: number) => void;
  toggleAudioAlarm: () => void;
  toggleVibration: () => void;
  toggleLanguage: () => void;
  downloadRegionalBundle: (regionCode: string) => Promise<boolean>;
  updateConsent: (location: boolean, sensor: boolean) => void;
}

const SettingsContext = createContext<SettingsContextType | null>(null);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [isOnline, setIsOnline] = useState<boolean>(
    OfflineFallbackService.getIsOnline()
  );

  useEffect(() => {
    // Load persisted settings
    const loadSettings = async () => {
      try {
        const raw = await AsyncStorage.getItem(SETTINGS_STORAGE_KEY);
        if (raw) {
          const parsed: UserSettings = JSON.parse(raw);
          setSettings(parsed);
          AnomalyDetector.setSensitivity(parsed.sensorSensitivity);
          EmergencyManager.setConfiguredCountdown(parsed.countdownSeconds);
        }
      } catch (err) {
        console.warn('Failed to load settings:', err);
      }
    };
    loadSettings();

    const unsubNetwork = OfflineFallbackService.subscribeNetworkStatus(
      (online) => {
        setIsOnline(online);
      }
    );

    return () => {
      unsubNetwork();
    };
  }, []);

  const saveSettings = async (newSettings: UserSettings) => {
    setSettings(newSettings);
    try {
      await AsyncStorage.setItem(
        SETTINGS_STORAGE_KEY,
        JSON.stringify(newSettings)
      );
    } catch (err) {
      console.warn('Failed to persist settings:', err);
    }
  };

  const updateSensitivity = (level: SensitivityLevel) => {
    AnomalyDetector.setSensitivity(level);
    const updated = { ...settings, sensorSensitivity: level };
    saveSettings(updated);
  };

  const updateCountdown = (seconds: number) => {
    EmergencyManager.setConfiguredCountdown(seconds);
    const updated = { ...settings, countdownSeconds: seconds };
    saveSettings(updated);
  };

  const toggleAudioAlarm = () => {
    const updated = { ...settings, enableAudioAlarm: !settings.enableAudioAlarm };
    saveSettings(updated);
  };

  const toggleVibration = () => {
    const updated = { ...settings, enableVibration: !settings.enableVibration };
    saveSettings(updated);
  };

  const toggleLanguage = () => {
    const nextLang = settings.language === 'en' ? 'hi' : 'en';
    const updated = { ...settings, language: nextLang as 'en' | 'hi' };
    saveSettings(updated);
  };

  const downloadRegionalBundle = async (regionCode: string) => {
    const success = await OfflineFallbackService.cacheRegionalBundle(regionCode);
    if (success) {
      const updated = { ...settings, offlineDataDownloaded: true };
      saveSettings(updated);
    }
    return success;
  };

  const updateConsent = (location: boolean, sensor: boolean) => {
    const updated = {
      ...settings,
      locationConsentGranted: location,
      sensorConsentGranted: sensor,
    };
    saveSettings(updated);
  };

  return (
    <SettingsContext.Provider
      value={{
        settings,
        isOnline,
        updateSensitivity,
        updateCountdown,
        toggleAudioAlarm,
        toggleVibration,
        toggleLanguage,
        downloadRegionalBundle,
        updateConsent,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
