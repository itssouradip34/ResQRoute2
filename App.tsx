import React, { useState } from 'react';
import {
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import {
  Activity,
  Bot,
  Flame,
  Home,
  ListOrdered,
  Settings,
  ShieldAlert,
  Users,
} from 'lucide-react-native';
import { SettingsProvider, useSettings } from './src/context/SettingsContext';
import { EmergencyProvider, useEmergency } from './src/context/EmergencyContext';
import { Header } from './src/components/Header';
import { CountdownModal } from './src/components/CountdownModal';
import { ManualSOSButton } from './src/components/ManualSOSButton';
import { HomeScreen } from './src/screens/HomeScreen';
import { ServicesListScreen } from './src/screens/ServicesListScreen';
import { AIChatTriageScreen } from './src/screens/AIChatTriageScreen';
import { SensorLabScreen } from './src/screens/SensorLabScreen';
import { TrustedContactsScreen } from './src/screens/TrustedContactsScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { SituationType } from './src/types';

type TabType = 'home' | 'services' | 'chat' | 'sensor_lab' | 'contacts' | 'settings';

const MainApp: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [initialChatSituation, setInitialChatSituation] = useState<SituationType | undefined>(
    undefined
  );
  const { settings } = useSettings();

  const handleNavigateToChat = (situation?: SituationType) => {
    setInitialChatSituation(situation);
    setActiveTab('chat');
  };

  const tabs: { id: TabType; label_en: string; label_hi: string; icon: any }[] = [
    { id: 'home', label_en: 'Rescue', label_hi: 'रेस्क्यू', icon: Home },
    { id: 'services', label_en: 'Services', label_hi: 'सेवाएं', icon: ListOrdered },
    { id: 'chat', label_en: 'AI Triage', label_hi: 'AI चैट', icon: Bot },
    { id: 'sensor_lab', label_en: 'Sensor Lab', label_hi: 'सेंसर लैब', icon: Activity },
    { id: 'contacts', label_en: 'Contacts', label_hi: 'संपर्क', icon: Users },
    { id: 'settings', label_en: 'Settings', label_hi: 'सेटिंग्स', icon: Settings },
  ];

  const renderActiveScreen = () => {
    switch (activeTab) {
      case 'home':
        return (
          <HomeScreen
            onNavigateToServices={() => setActiveTab('services')}
            onNavigateToChat={handleNavigateToChat}
          />
        );
      case 'services':
        return <ServicesListScreen />;
      case 'chat':
        return <AIChatTriageScreen initialSituation={initialChatSituation} />;
      case 'sensor_lab':
        return <SensorLabScreen />;
      case 'contacts':
        return <TrustedContactsScreen />;
      case 'settings':
        return <SettingsScreen />;
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ExpoStatusBar style="light" />
      
      {/* Top Header */}
      <Header
        title="ResQRoute-A"
        subtitle={
          activeTab === 'home'
            ? undefined
            : activeTab === 'services'
            ? 'Nearby Emergency Directory'
            : activeTab === 'chat'
            ? 'AI Triage & Guidance'
            : activeTab === 'sensor_lab'
            ? 'Kinematic Sensor Lab'
            : activeTab === 'contacts'
            ? 'Trusted Contacts & Tracking'
            : 'Preferences & Storage'
        }
      />

      {/* Screen Content */}
      <View style={styles.screenContainer}>{renderActiveScreen()}</View>

      {/* Persistent Manual SOS Floating Button on Home Tab */}
      {activeTab === 'home' && <ManualSOSButton />}

      {/* Bottom Navigation Bar */}
      <View style={styles.bottomNav}>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              style={styles.navItem}
              activeOpacity={0.7}
              onPress={() => {
                if (tab.id === 'chat') setInitialChatSituation(undefined);
                setActiveTab(tab.id);
              }}
            >
              <Icon
                size={20}
                color={isActive ? '#58A6FF' : '#8B949E'}
                strokeWidth={isActive ? 2.5 : 2}
              />
              <Text
                style={[
                  styles.navLabel,
                  isActive && styles.navLabelActive,
                ]}
              >
                {settings.language === 'hi' ? tab.label_hi : tab.label_en}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Global Countdown Modal overlay */}
      <CountdownModal />
    </SafeAreaView>
  );
};

export default function App() {
  return (
    <SettingsProvider>
      <EmergencyProvider>
        <MainApp />
      </EmergencyProvider>
    </SettingsProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0D1117',
    paddingTop: StatusBar.currentHeight || 0,
  },
  screenContainer: {
    flex: 1,
    backgroundColor: '#0D1117',
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: '#161B22',
    borderTopWidth: 1,
    borderTopColor: '#21262D',
    paddingVertical: 8,
    paddingHorizontal: 6,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    paddingHorizontal: 6,
    minWidth: 50,
  },
  navLabel: {
    color: '#8B949E',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 3,
  },
  navLabelActive: {
    color: '#58A6FF',
    fontWeight: '800',
  },
});
