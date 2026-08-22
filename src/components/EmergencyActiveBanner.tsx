import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { CheckCircle2, Radio, ShieldAlert } from 'lucide-react-native';
import { useEmergency } from '../context/EmergencyContext';
import { useSettings } from '../context/SettingsContext';

export const EmergencyActiveBanner: React.FC = () => {
  const { status, currentIncident, resolveEmergency, userLocation } = useEmergency();
  const { settings } = useSettings();
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    let interval: any = null;
    if (status === 'active') {
      setElapsedSeconds(0);
      interval = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [status]);

  if (status !== 'active') return null;

  const minutes = Math.floor(elapsedSeconds / 60);
  const seconds = elapsedSeconds % 60;
  const timeFormatted = `${minutes.toString().padStart(2, '0')}:${seconds
    .toString()
    .padStart(2, '0')}`;

  const isAccident = currentIncident?.situation_type === 'accident';

  return (
    <View
      style={[
        styles.container,
        isAccident ? styles.containerRed : styles.containerAmber,
      ]}
    >
      <View style={styles.topRow}>
        <View style={styles.liveIndicator}>
          <Radio size={18} color="#FFFFFF" />
          <Text style={styles.liveText}>
            {settings.language === 'hi' ? 'लाइव रेस्क्यू सक्रिय' : 'EMERGENCY ACTIVE'}
          </Text>
        </View>
        <View style={styles.timerBadge}>
          <Text style={styles.timerText}>{timeFormatted}</Text>
        </View>
      </View>

      <Text style={styles.detailText}>
        {settings.language === 'hi'
          ? `प्रकार: ${currentIncident?.situation_type?.toUpperCase()} | लाइव GPS ट्रैकिंग चालू है`
          : `Incident: ${currentIncident?.situation_type?.toUpperCase()} • Live GPS Broadcasting`}
      </Text>

      <Text style={styles.coordText}>
        📍 {userLocation.addressName || `${userLocation.latitude.toFixed(4)}, ${userLocation.longitude.toFixed(4)}`}
      </Text>

      <TouchableOpacity
        style={styles.resolveButton}
        activeOpacity={0.8}
        onPress={resolveEmergency}
      >
        <CheckCircle2 size={20} color="#FFFFFF" />
        <Text style={styles.resolveButtonText}>
          {settings.language === 'hi' ? 'आपातकाल समाप्त करें (सुरक्षित)' : 'MARK RESOLVED & SAFE'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 12,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  containerRed: {
    backgroundColor: '#3E1010',
    borderColor: '#FF4D4D',
  },
  containerAmber: {
    backgroundColor: '#3B2607',
    borderColor: '#FFA500',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  liveText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  timerBadge: {
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  timerText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    fontSize: 13,
  },
  detailText: {
    color: '#F0F6FC',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  coordText: {
    color: '#8B949E',
    fontSize: 12,
    marginBottom: 12,
  },
  resolveButton: {
    backgroundColor: '#238636',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    borderRadius: 12,
    gap: 8,
  },
  resolveButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
});
