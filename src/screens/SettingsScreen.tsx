import React, { useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  Bell,
  Clock,
  Database,
  Download,
  Eye,
  Globe2,
  Lock,
  Radio,
  Shield,
  Sliders,
  Smartphone,
  Volume2,
} from 'lucide-react-native';
import { useSettings } from '../context/SettingsContext';
import { SensitivityLevel } from '../types';

export const SettingsScreen: React.FC = () => {
  const {
    settings,
    updateSensitivity,
    updateCountdown,
    toggleAudioAlarm,
    toggleVibration,
    toggleLanguage,
    downloadRegionalBundle,
    updateConsent,
  } = useSettings();

  const [downloading, setDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  const countdownOptions = [10, 15, 20, 30, 45, 60];

  const handleDownloadRegionalData = async () => {
    setDownloading(true);
    const success = await downloadRegionalBundle(settings.defaultRegion);
    setDownloading(false);
    if (success) {
      setDownloadSuccess(true);
      Alert.alert(
        'Offline Bundle Ready',
        'India regional emergency directory and national helpline cache downloaded for zero-connectivity rescue.'
      );
      setTimeout(() => setDownloadSuccess(false), 3000);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* 1. SOS Countdown Duration */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Clock size={18} color="#FF6B6B" />
          <Text style={styles.sectionTitle}>
            {settings.language === 'hi'
              ? 'SOS उलटी गिनती समय (Countdown)'
              : 'SOS Cancellation Countdown'}
          </Text>
        </View>
        <Text style={styles.sectionDesc}>
          {settings.language === 'hi'
            ? 'ऑटो-SOS भेजने से पहले रद्द करने के लिए मिलने वाला समय (डिफ़ॉल्ट 20s)'
            : 'Duration allowed to cancel a detected crash before auto-alerting contacts (default 20s).'}
        </Text>

        <View style={styles.countdownChipsRow}>
          {countdownOptions.map((sec) => {
            const isSelected = settings.countdownSeconds === sec;
            return (
              <TouchableOpacity
                key={sec}
                style={[
                  styles.countdownChip,
                  isSelected && styles.countdownChipActive,
                ]}
                onPress={() => updateCountdown(sec)}
              >
                <Text
                  style={[
                    styles.countdownChipText,
                    isSelected && styles.countdownChipTextActive,
                  ]}
                >
                  {sec}s
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* 2. Sensor Sensitivity */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Sliders size={18} color="#E3B341" />
          <Text style={styles.sectionTitle}>
            {settings.language === 'hi'
              ? 'सेंसर संवेदनशीलता (Thresholds)'
              : 'Sensor Detection Sensitivity'}
          </Text>
        </View>
        <Text style={styles.sectionDesc}>
          {settings.language === 'hi'
            ? 'गड्ढों और खराब सड़कों पर गलत अलर्ट से बचने के लिए ट्यून करें'
            : 'Tune thresholds to balance rapid detection vs. suppressing potholes and road noise.'}
        </Text>

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
      </View>

      {/* 3. Audio & Haptics */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Volume2 size={18} color="#3FB950" />
          <Text style={styles.sectionTitle}>
            {settings.language === 'hi' ? 'ध्वनि एवं कंपन' : 'Audio & Haptic Alerts'}
          </Text>
        </View>

        <View style={styles.switchRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.switchLabel}>
              {settings.language === 'hi'
                ? 'आपातकालीन सायरन अलार्म'
                : 'Audible Emergency Siren'}
            </Text>
            <Text style={styles.switchSub}>
              {settings.language === 'hi'
                ? 'काउंटडाउन के दौरान तेज अलार्म बजाएं'
                : 'Play loud pulse siren during accident countdown'}
            </Text>
          </View>
          <Switch
            value={settings.enableAudioAlarm}
            onValueChange={toggleAudioAlarm}
            trackColor={{ false: '#21262D', true: '#238636' }}
            thumbColor="#FFFFFF"
          />
        </View>

        <View style={styles.divider} />

        <View style={styles.switchRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.switchLabel}>
              {settings.language === 'hi'
                ? 'हैंडहेल्ड कंपन (Vibration)'
                : 'Tactile Haptic Pulsing'}
            </Text>
            <Text style={styles.switchSub}>
              {settings.language === 'hi'
                ? 'अलर्ट के दौरान डिवाइस को वाइब्रेट करें'
                : 'Vibrate device rhythmically during alert state'}
            </Text>
          </View>
          <Switch
            value={settings.enableVibration}
            onValueChange={toggleVibration}
            trackColor={{ false: '#21262D', true: '#238636' }}
            thumbColor="#FFFFFF"
          />
        </View>
      </View>

      {/* 4. Offline Emergency Data Bundle */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Database size={18} color="#58A6FF" />
          <Text style={styles.sectionTitle}>
            {settings.language === 'hi'
              ? 'ऑफलाइन आपातकालीन डेटा'
              : 'Offline Emergency Cache Bundle'}
          </Text>
        </View>
        <Text style={styles.sectionDesc}>
          {settings.language === 'hi'
            ? 'बिना इंटरनेट के भी अस्पताल व टोइंग सेवाओं की जानकारी तुरंत उपलब्ध रहेगी'
            : 'Pre-cache state directories and helpline numbers for seamless zero-network operation.'}
        </Text>

        <TouchableOpacity
          style={[
            styles.downloadBtn,
            downloadSuccess && styles.downloadBtnSuccess,
          ]}
          disabled={downloading}
          onPress={handleDownloadRegionalData}
        >
          <Download size={18} color="#FFFFFF" />
          <Text style={styles.downloadBtnText}>
            {downloading
              ? 'Downloading Bundle...'
              : downloadSuccess
              ? 'Regional Bundle Cached ✓'
              : 'Download India Regional Bundle'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* 5. Privacy & Permissions (DPDP Act Compliance) */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Lock size={18} color="#A5D6FF" />
          <Text style={styles.sectionTitle}>
            {settings.language === 'hi'
              ? 'डेटा सुरक्षा एवं सहमति'
              : 'Privacy & Granular Consent'}
          </Text>
        </View>
        <Text style={styles.sectionDesc}>
          India Digital Personal Data Protection (DPDP) Act Compliant. Continuous raw sensor streams are NEVER stored long-term — only snapshots on detected events.
        </Text>

        <View style={styles.switchRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.switchLabel}>GPS Location Access</Text>
            <Text style={styles.switchSub}>
              Used exclusively for emergency responder navigation
            </Text>
          </View>
          <Switch
            value={settings.locationConsentGranted}
            onValueChange={(val) =>
              updateConsent(val, settings.sensorConsentGranted)
            }
            trackColor={{ false: '#21262D', true: '#238636' }}
            thumbColor="#FFFFFF"
          />
        </View>

        <View style={styles.divider} />

        <View style={styles.switchRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.switchLabel}>Motion Sensor Monitoring</Text>
            <Text style={styles.switchSub}>
              On-device gyroscope & accelerometer kinematic anomaly evaluation
            </Text>
          </View>
          <Switch
            value={settings.sensorConsentGranted}
            onValueChange={(val) =>
              updateConsent(settings.locationConsentGranted, val)
            }
            trackColor={{ false: '#21262D', true: '#238636' }}
            thumbColor="#FFFFFF"
          />
        </View>
      </View>

      {/* App Version Info */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          ResQRoute-A v2.0 • AI-Powered Roadside Emergency & Rescue Navigator
        </Text>
        <Text style={styles.footerSub}>
          Antigravity Mobile Engine • Supabase Postgres PostGIS
        </Text>
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
    paddingTop: 12,
  },
  sectionCard: {
    backgroundColor: '#161B22',
    borderColor: '#30363D',
    borderWidth: 1,
    borderRadius: 16,
    marginHorizontal: 16,
    padding: 16,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  sectionDesc: {
    color: '#8B949E',
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 14,
  },
  countdownChipsRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  countdownChip: {
    backgroundColor: '#0D1117',
    borderColor: '#30363D',
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    minWidth: 46,
    alignItems: 'center',
  },
  countdownChipActive: {
    backgroundColor: '#DA3633',
    borderColor: '#F85149',
  },
  countdownChipText: {
    color: '#8B949E',
    fontSize: 13,
    fontWeight: '800',
  },
  countdownChipTextActive: {
    color: '#FFFFFF',
  },
  sensitivityRow: {
    flexDirection: 'row',
    gap: 10,
  },
  sensitivityBtn: {
    flex: 1,
    backgroundColor: '#0D1117',
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
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  switchLabel: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  switchSub: {
    color: '#8B949E',
    fontSize: 11,
  },
  divider: {
    height: 1,
    backgroundColor: '#21262D',
    marginVertical: 10,
  },
  downloadBtn: {
    backgroundColor: '#1F6FEB',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    height: 46,
    borderRadius: 12,
    gap: 8,
  },
  downloadBtnSuccess: {
    backgroundColor: '#238636',
  },
  downloadBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 20,
    gap: 4,
  },
  footerText: {
    color: '#6E7681',
    fontSize: 11,
    fontWeight: '600',
  },
  footerSub: {
    color: '#484F58',
    fontSize: 10,
  },
});
