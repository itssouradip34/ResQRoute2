import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AlertOctagon } from 'lucide-react-native';
import { useEmergency } from '../context/EmergencyContext';
import { useSettings } from '../context/SettingsContext';

export const ManualSOSButton: React.FC = () => {
  const { status, triggerManualSOS } = useEmergency();
  const { settings } = useSettings();

  // Hide button if countdown is currently showing or already in active mode
  if (status === 'confirming' || status === 'active') return null;

  return (
    <View style={styles.floatingContainer}>
      <TouchableOpacity
        style={styles.sosButton}
        activeOpacity={0.85}
        onPress={() => triggerManualSOS('accident')}
      >
        <View style={styles.innerPulse}>
          <AlertOctagon size={28} color="#FFFFFF" />
          <Text style={styles.sosText}>
            {settings.language === 'hi' ? 'आपातकालीन SOS' : 'EMERGENCY SOS'}
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  floatingContainer: {
    position: 'absolute',
    bottom: 24,
    left: 20,
    right: 20,
    alignItems: 'center',
    zIndex: 999,
  },
  sosButton: {
    backgroundColor: '#E53E3E',
    width: '100%',
    height: 58,
    borderRadius: 29,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#E53E3E',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 2,
    borderColor: '#FEB2B2',
  },
  innerPulse: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sosText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 1.2,
    marginLeft: 10,
  },
});
