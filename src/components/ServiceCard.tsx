import React from 'react';
import {
  Linking,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  Ambulance,
  Building2,
  Car,
  Fuel,
  MapPin,
  Navigation,
  PhoneCall,
  Shield,
  Star,
  Wrench,
} from 'lucide-react-native';
import { EmergencyService } from '../types';
import { useSettings } from '../context/SettingsContext';

interface ServiceCardProps {
  service: EmergencyService;
}

export const ServiceCard: React.FC<ServiceCardProps> = ({ service }) => {
  const { settings } = useSettings();

  const handleCall = () => {
    const cleanNumber = service.phone_number.replace(/[^0-9+]/g, '');
    Linking.openURL(`tel:${cleanNumber}`).catch((err) =>
      console.warn('Failed to make call:', err)
    );
  };

  const handleNavigate = () => {
    const lat = service.latitude;
    const lng = service.longitude;
    const label = encodeURIComponent(service.name);

    const url = Platform.select({
      ios: `maps:0,0?q=${label}@${lat},${lng}`,
      android: `geo:0,0?q=${lat},${lng}(${label})`,
      web: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
      default: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
    });

    Linking.openURL(url!).catch((err) =>
      console.warn('Failed to open map navigation:', err)
    );
  };

  const getCategoryIcon = () => {
    switch (service.category) {
      case 'hospital':
        return <Building2 size={20} color="#FF4D4D" />;
      case 'ambulance':
        return <Ambulance size={20} color="#FF6B6B" />;
      case 'police':
        return <Shield size={20} color="#58A6FF" />;
      case 'towing':
        return <Car size={20} color="#E3B341" />;
      case 'puncture_repair':
      case 'mechanic':
        return <Wrench size={20} color="#3FB950" />;
      case 'fuel':
        return <Fuel size={20} color="#D29922" />;
      default:
        return <Building2 size={20} color="#8B949E" />;
    }
  };

  const getCategoryName = () => {
    switch (service.category) {
      case 'hospital':
        return settings.language === 'hi' ? 'अस्पताल' : 'Hospital';
      case 'ambulance':
        return settings.language === 'hi' ? 'एम्बुलेंस' : 'Ambulance';
      case 'police':
        return settings.language === 'hi' ? 'पुलिस स्टेशन' : 'Police';
      case 'towing':
        return settings.language === 'hi' ? 'टोइंग क्रेन' : 'Towing';
      case 'puncture_repair':
        return settings.language === 'hi' ? 'पंचर रिपेयर' : 'Puncture Repair';
      case 'mechanic':
        return settings.language === 'hi' ? 'मैकेनिक' : 'Mechanic';
      case 'fuel':
        return settings.language === 'hi' ? 'पेट्रोल पंप' : 'Fuel';
      default:
        return service.category;
    }
  };

  return (
    <View style={styles.card}>
      {/* Top Meta row */}
      <View style={styles.topRow}>
        <View style={styles.categoryBadge}>
          {getCategoryIcon()}
          <Text style={styles.categoryText}>{getCategoryName()}</Text>
        </View>

        <View style={styles.ratingBadge}>
          <Star size={14} color="#E3B341" fill="#E3B341" />
          <Text style={styles.ratingText}>{service.rating.toFixed(1)}</Text>
          {service.is_verified && (
            <Text style={styles.verifiedTag}>
              {settings.language === 'hi' ? 'सत्यापित' : 'VERIFIED'}
            </Text>
          )}
        </View>
      </View>

      {/* Service Title */}
      <Text style={styles.serviceName}>{service.name}</Text>

      {/* Specialty or Emergency Level */}
      {service.specialty && (
        <Text style={styles.specialtyText} numberOfLines={2}>
          {service.specialty}
        </Text>
      )}

      {/* Address */}
      <View style={styles.addressRow}>
        <MapPin size={14} color="#8B949E" />
        <Text style={styles.addressText} numberOfLines={2}>
          {service.address}
        </Text>
      </View>

      {/* Distance & ETA Strip */}
      <View style={styles.metricsStrip}>
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>
            {settings.language === 'hi' ? 'दूरी' : 'DISTANCE'}
          </Text>
          <Text style={styles.metricValue}>
            {service.distanceKm ? `${service.distanceKm} km` : 'Near'}
          </Text>
        </View>
        <View style={styles.metricDivider} />
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>
            {settings.language === 'hi' ? 'पहुंच समय (ETA)' : 'EST. ETA'}
          </Text>
          <Text style={styles.metricValue}>
            {service.etaMinutes ? `~${service.etaMinutes} mins` : 'Immediate'}
          </Text>
        </View>
        <View style={styles.metricDivider} />
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>
            {settings.language === 'hi' ? 'उपलब्धता' : 'TIMINGS'}
          </Text>
          <Text
            style={[
              styles.metricValue,
              service.open_24x7 ? styles.openText : styles.metricValue,
            ]}
          >
            {service.open_24x7 ? '24x7 OPEN' : 'Day Service'}
          </Text>
        </View>
      </View>

      {/* Action Buttons: One-Tap Call & Navigate */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={styles.callButton}
          activeOpacity={0.8}
          onPress={handleCall}
        >
          <PhoneCall size={18} color="#FFFFFF" />
          <Text style={styles.callButtonText}>
            {settings.language === 'hi' ? 'कॉल करें' : 'CALL NOW'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navigateButton}
          activeOpacity={0.8}
          onPress={handleNavigate}
        >
          <Navigation size={18} color="#58A6FF" />
          <Text style={styles.navigateButtonText}>
            {settings.language === 'hi' ? 'नेविगेट' : 'NAVIGATE'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#161B22',
    borderColor: '#30363D',
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#21262D',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 6,
  },
  categoryText: {
    color: '#F0F6FC',
    fontSize: 12,
    fontWeight: '700',
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    color: '#F0F6FC',
    fontSize: 13,
    fontWeight: '700',
  },
  verifiedTag: {
    backgroundColor: 'rgba(63, 185, 80, 0.15)',
    color: '#3FB950',
    fontSize: 10,
    fontWeight: '800',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 4,
  },
  serviceName: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 4,
  },
  specialtyText: {
    color: '#A5D6FF',
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 8,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  addressText: {
    color: '#8B949E',
    fontSize: 12,
    flex: 1,
  },
  metricsStrip: {
    flexDirection: 'row',
    backgroundColor: '#0D1117',
    borderRadius: 10,
    padding: 10,
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: 14,
  },
  metricItem: {
    alignItems: 'center',
  },
  metricLabel: {
    color: '#6E7681',
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 2,
  },
  metricValue: {
    color: '#F0F6FC',
    fontSize: 13,
    fontWeight: '800',
  },
  openText: {
    color: '#3FB950',
  },
  metricDivider: {
    width: 1,
    height: 20,
    backgroundColor: '#21262D',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  callButton: {
    flex: 1.2,
    backgroundColor: '#238636',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    height: 44,
    borderRadius: 10,
    gap: 6,
  },
  callButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  navigateButton: {
    flex: 1,
    backgroundColor: '#21262D',
    borderColor: '#30363D',
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    height: 44,
    borderRadius: 10,
    gap: 6,
  },
  navigateButtonText: {
    color: '#58A6FF',
    fontSize: 13,
    fontWeight: '700',
  },
});
