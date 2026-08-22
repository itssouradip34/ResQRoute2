import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Activity, Globe2, ShieldCheck, Wifi, WifiOff } from 'lucide-react-native';
import { useSettings } from '../context/SettingsContext';

interface HeaderProps {
  title?: string;
  subtitle?: string;
}

export const Header: React.FC<HeaderProps> = ({
  title = 'ResQRoute-A',
  subtitle,
}) => {
  const { settings, isOnline, toggleLanguage } = useSettings();

  return (
    <View style={styles.header}>
      <View>
        <View style={styles.titleRow}>
          <View style={styles.logoBadge}>
            <ShieldCheck size={20} color="#FF4D4D" />
          </View>
          <Text style={styles.titleText}>{title}</Text>
        </View>
        {subtitle ? (
          <Text style={styles.subtitleText}>{subtitle}</Text>
        ) : (
          <View style={styles.statusPillRow}>
            <View style={styles.sensorPill}>
              <Activity size={12} color="#3FB950" />
              <Text style={styles.sensorPillText}>
                {settings.language === 'hi'
                  ? 'सेंसर सुरक्षा चालू'
                  : 'Sensors Active'}
              </Text>
            </View>
          </View>
        )}
      </View>

      <View style={styles.rightActions}>
        {/* Network State Badge */}
        <View
          style={[
            styles.networkBadge,
            isOnline ? styles.badgeOnline : styles.badgeOffline,
          ]}
        >
          {isOnline ? (
            <Wifi size={14} color="#3FB950" />
          ) : (
            <WifiOff size={14} color="#FFA500" />
          )}
          <Text
            style={[
              styles.networkText,
              isOnline ? styles.textOnline : styles.textOffline,
            ]}
          >
            {isOnline ? 'Online' : 'Offline Mode'}
          </Text>
        </View>

        {/* Language Toggle (EN / HI) */}
        <TouchableOpacity
          style={styles.langButton}
          activeOpacity={0.7}
          onPress={toggleLanguage}
        >
          <Globe2 size={14} color="#58A6FF" />
          <Text style={styles.langText}>
            {settings.language === 'en' ? 'हिन्दी' : 'ENG'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: '#0D1117',
    borderBottomWidth: 1,
    borderBottomColor: '#21262D',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoBadge: {
    backgroundColor: 'rgba(255, 77, 77, 0.12)',
    padding: 6,
    borderRadius: 8,
  },
  titleText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  subtitleText: {
    color: '#8B949E',
    fontSize: 12,
    marginTop: 2,
  },
  statusPillRow: {
    flexDirection: 'row',
    marginTop: 3,
  },
  sensorPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(63, 185, 80, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  sensorPillText: {
    color: '#3FB950',
    fontSize: 10,
    fontWeight: '700',
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  networkBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeOnline: {
    backgroundColor: 'rgba(63, 185, 80, 0.12)',
  },
  badgeOffline: {
    backgroundColor: 'rgba(255, 165, 0, 0.15)',
  },
  networkText: {
    fontSize: 11,
    fontWeight: '700',
  },
  textOnline: {
    color: '#3FB950',
  },
  textOffline: {
    color: '#FFA500',
  },
  langButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#21262D',
    borderColor: '#30363D',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  langText: {
    color: '#58A6FF',
    fontSize: 12,
    fontWeight: '700',
  },
});
