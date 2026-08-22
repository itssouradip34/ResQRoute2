import React, { useState } from 'react';
import {
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  AlertTriangle,
  Car,
  ChevronRight,
  Clock,
  Compass,
  Edit3,
  Flame,
  Fuel,
  HeartPulse,
  MapPin,
  PhoneCall,
  Shield,
  Wrench,
} from 'lucide-react-native';
import { useEmergency } from '../context/EmergencyContext';
import { useSettings } from '../context/SettingsContext';
import { SituationType } from '../types';
import { NATIONAL_HELPLINES } from '../data/indiaEmergencyServices';
import { EmergencyActiveBanner } from '../components/EmergencyActiveBanner';
import { TEST_MODE, TEST_HELPLINE_OVERRIDE, TEST_PHONE_NUMBERS } from '../config/testMode';

interface HomeScreenProps {
  onNavigateToServices: () => void;
  onNavigateToChat: (initialSituation?: SituationType) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  onNavigateToServices,
  onNavigateToChat,
}) => {
  const { userLocation, triggerManualSOS, timeline } = useEmergency();
  const { settings } = useSettings();

  const [isEditingLocation, setIsEditingLocation] = useState(false);
  const [customAddress, setCustomAddress] = useState(userLocation.addressName || '');

  const situations: {
    type: SituationType;
    label_en: string;
    label_hi: string;
    desc_en: string;
    desc_hi: string;
    icon: React.ReactNode;
    color: string;
  }[] = [
    {
      type: 'accident',
      label_en: 'Accident / Crash',
      label_hi: 'सड़क दुर्घटना',
      desc_en: 'Vehicle collision, trauma, rollover',
      desc_hi: 'टक्कर, गंभीर चोट, तत्काल बचाव',
      icon: <Flame size={24} color="#FF4D4D" />,
      color: 'rgba(255, 77, 77, 0.12)',
    },
    {
      type: 'medical',
      label_en: 'Medical Emergency',
      label_hi: 'चिकित्सीय आपातकाल',
      desc_en: 'Chest pain, unconscious, bleeding',
      desc_hi: 'बेहोशी, गंभीर दर्द, 108 एम्बुलेंस',
      icon: <HeartPulse size={24} color="#FF6B6B" />,
      color: 'rgba(255, 107, 107, 0.12)',
    },
    {
      type: 'breakdown',
      label_en: 'Breakdown / Towing',
      label_hi: 'ब्रेकडाउन / टोइंग',
      desc_en: 'Engine fail, stuck, battery dead',
      desc_hi: 'इंजन खराबी, क्रेन, टोइंग सहायता',
      icon: <Car size={24} color="#E3B341" />,
      color: 'rgba(227, 179, 65, 0.12)',
    },
    {
      type: 'flat_tyre',
      label_en: 'Flat Tyre / Puncture',
      label_hi: 'टायर पंचर',
      desc_en: 'Tyre burst, mobile puncture fix',
      desc_hi: 'टायर बर्स्ट, ऑन-स्पॉट पंचर रिपेयर',
      icon: <Wrench size={24} color="#3FB950" />,
      color: 'rgba(63, 185, 80, 0.12)',
    },
    {
      type: 'fuel_out',
      label_en: 'Fuel Out',
      label_hi: 'ईंधन समाप्त',
      desc_en: 'Petrol / diesel empty, delivery',
      desc_hi: 'पेट्रोल/डीजल खत्म, फ्यूल डिलीवरी',
      icon: <Fuel size={24} color="#D29922" />,
      color: 'rgba(210, 153, 34, 0.12)',
    },
    {
      type: 'other',
      label_en: 'Other Emergency',
      label_hi: 'अन्य आपात स्थिति',
      desc_en: 'Police help, harassment, road hazard',
      desc_hi: 'पुलिस सहायता, सुरक्षा, सड़क खतरा',
      icon: <Shield size={24} color="#58A6FF" />,
      color: 'rgba(88, 166, 255, 0.12)',
    },
  ];

  const handleCallHelpline = (code: string) => {
    const target = TEST_MODE
      ? TEST_HELPLINE_OVERRIDE[code] || TEST_PHONE_NUMBERS[0]
      : code;
    Linking.openURL(`tel:${target}`).catch(() => {});
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Emergency Active Status Banner */}
      <EmergencyActiveBanner />

      {/* Location Strip & Region Badge */}
      <View style={styles.locationCard}>
        <View style={styles.locationHeader}>
          <View style={styles.locationTitleRow}>
            <Compass size={18} color="#58A6FF" />
            <Text style={styles.locationHeaderTitle}>
              {settings.language === 'hi' ? 'वर्तमान स्थान' : 'CURRENT GPS LOCATION'}
            </Text>
          </View>
          <View style={styles.regionBadge}>
            <Text style={styles.regionBadgeText}>
              {userLocation.regionCode || 'IN-DL'}
            </Text>
          </View>
        </View>

        {isEditingLocation ? (
          <View style={styles.editLocationRow}>
            <TextInput
              style={styles.locationInput}
              value={customAddress}
              onChangeText={setCustomAddress}
              placeholder="Enter landmark / highway KM marker"
              placeholderTextColor="#6E7681"
            />
            <TouchableOpacity
              style={styles.saveLocationBtn}
              onPress={() => setIsEditingLocation(false)}
            >
              <Text style={styles.saveLocationText}>Save</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.locationDetailRow}
            onPress={() => setIsEditingLocation(true)}
            activeOpacity={0.7}
          >
            <MapPin size={16} color="#8B949E" style={{ marginTop: 2 }} />
            <Text style={styles.locationAddress} numberOfLines={2}>
              {customAddress ||
                userLocation.addressName ||
                `GPS: ${userLocation.latitude.toFixed(4)}, ${userLocation.longitude.toFixed(4)}`}
            </Text>
            <Edit3 size={14} color="#58A6FF" />
          </TouchableOpacity>
        )}
      </View>

      {/* Quick Situation Selector Grid */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>
          {settings.language === 'hi'
            ? 'अपनी स्थिति चुनें (त्वरित सहायता)'
            : 'Select Your Situation'}
        </Text>
        <Text style={styles.sectionSubtitle}>
          {settings.language === 'hi'
            ? 'AI तुरंत संबंधित निकटतम सेवा और सुरक्षा निर्देश दिखाएगा'
            : 'AI classifies urgency and prioritizes nearest responder services'}
        </Text>
      </View>

      <View style={styles.gridContainer}>
        {situations.map((item) => (
          <TouchableOpacity
            key={item.type}
            style={styles.gridCard}
            activeOpacity={0.75}
            onPress={() => {
              if (item.type === 'accident') {
                triggerManualSOS('accident');
              } else {
                onNavigateToChat(item.type);
              }
            }}
          >
            <View style={[styles.cardIconBox, { backgroundColor: item.color }]}>
              {item.icon}
            </View>
            <Text style={styles.cardTitle}>
              {settings.language === 'hi' ? item.label_hi : item.label_en}
            </Text>
            <Text style={styles.cardDesc} numberOfLines={2}>
              {settings.language === 'hi' ? item.desc_hi : item.desc_en}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* National Emergency Helplines Carousel */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>
          {settings.language === 'hi'
            ? 'भारत राष्ट्रीय आपातकालीन नंबर'
            : 'India National Emergency Helplines'}
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.helplineScroll}
        contentContainerStyle={styles.helplineContainer}
      >
        {NATIONAL_HELPLINES.map((helpline) => (
          <TouchableOpacity
            key={helpline.code}
            style={styles.helplineCard}
            activeOpacity={0.8}
            onPress={() => handleCallHelpline(helpline.code)}
          >
            <View style={styles.helplineTop}>
              <View style={styles.helplineCodeBadge}>
                <Text style={styles.helplineCodeText}>{helpline.code}</Text>
              </View>
              <View style={styles.callCircle}>
                <PhoneCall size={16} color="#FFFFFF" />
              </View>
            </View>
            <Text style={styles.helplineName} numberOfLines={2}>
              {settings.language === 'hi' ? helpline.name_hi : helpline.name}
            </Text>
            <Text style={styles.helplineDesc} numberOfLines={2}>
              {settings.language === 'hi'
                ? helpline.description_hi
                : helpline.description}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Recent Incident Timeline / Log */}
      {timeline.length > 0 && (
        <View style={styles.timelineSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {settings.language === 'hi' ? 'घटना टाइमलाइन' : 'Incident Timeline'}
            </Text>
          </View>
          <View style={styles.timelineCard}>
            {timeline.slice(0, 3).map((item) => (
              <View key={item.id} style={styles.timelineItem}>
                <Clock size={14} color="#58A6FF" style={{ marginTop: 2 }} />
                <View style={styles.timelineContent}>
                  <Text style={styles.timelineMsg}>{item.message}</Text>
                  <Text style={styles.timelineTime}>{item.timestamp}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Spacing for persistent SOS button */}
      <View style={{ height: 90 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D1117',
  },
  contentContainer: {
    paddingBottom: 20,
  },
  locationCard: {
    backgroundColor: '#161B22',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 16,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#30363D',
  },
  locationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  locationTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  locationHeaderTitle: {
    color: '#8B949E',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  regionBadge: {
    backgroundColor: 'rgba(88, 166, 255, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  regionBadgeText: {
    color: '#58A6FF',
    fontSize: 11,
    fontWeight: '800',
  },
  locationDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  locationAddress: {
    color: '#F0F6FC',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  editLocationRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  locationInput: {
    flex: 1,
    backgroundColor: '#0D1117',
    borderColor: '#30363D',
    borderWidth: 1,
    borderRadius: 8,
    color: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 13,
  },
  saveLocationBtn: {
    backgroundColor: '#238636',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  saveLocationText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  sectionSubtitle: {
    color: '#8B949E',
    fontSize: 12,
    marginTop: 2,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    gap: 8,
    marginBottom: 20,
  },
  gridCard: {
    width: '48%',
    backgroundColor: '#161B22',
    borderColor: '#30363D',
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
  },
  cardIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 4,
  },
  cardDesc: {
    color: '#8B949E',
    fontSize: 11,
    lineHeight: 15,
  },
  helplineScroll: {
    marginBottom: 20,
  },
  helplineContainer: {
    paddingHorizontal: 16,
    gap: 12,
  },
  helplineCard: {
    width: 200,
    backgroundColor: '#161B22',
    borderColor: '#30363D',
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
  },
  helplineTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  helplineCodeBadge: {
    backgroundColor: '#DA3633',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  helplineCodeText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 16,
  },
  callCircle: {
    backgroundColor: '#238636',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  helplineName: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
  },
  helplineDesc: {
    color: '#8B949E',
    fontSize: 11,
    lineHeight: 15,
  },
  timelineSection: {
    marginHorizontal: 16,
    marginTop: 10,
  },
  timelineCard: {
    backgroundColor: '#161B22',
    borderColor: '#30363D',
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    gap: 12,
  },
  timelineItem: {
    flexDirection: 'row',
    gap: 8,
  },
  timelineContent: {
    flex: 1,
  },
  timelineMsg: {
    color: '#C9D1D9',
    fontSize: 12,
    lineHeight: 16,
  },
  timelineTime: {
    color: '#6E7681',
    fontSize: 10,
    marginTop: 2,
  },
});