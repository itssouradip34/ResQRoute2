import React, { useState } from 'react';
import {
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  Check,
  Copy,
  ExternalLink,
  MessageSquareShare,
  Plus,
  Send,
  Share2,
  Trash2,
  UserCheck,
  Users,
} from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import * as Linking from 'expo-linking';
import * as SMS from 'expo-sms';
import { TrustedContact } from '../types';
import { useEmergency } from '../context/EmergencyContext';
import { useSettings } from '../context/SettingsContext';
import { OfflineFallbackService } from '../services/emergency/OfflineFallbackService';

export const TrustedContactsScreen: React.FC = () => {
  const {
    trustedContacts,
    addTrustedContact,
    removeTrustedContact,
    userLocation,
    currentIncident,
  } = useEmergency();
  const { settings } = useSettings();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [relationInput, setRelationInput] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [smsPreviewVisible, setSmsPreviewVisible] = useState(false);

  const trackingLink = `https://resqroute.app/track/${
    currentIncident?.id || 'live_session_demo'
  }?lat=${userLocation.latitude}&lng=${userLocation.longitude}`;

  const smsPreviewText = OfflineFallbackService.generateEmergencySMSBody(
    currentIncident || {
      situation_type: 'accident',
      urgency_level: 'critical',
      trigger_type: 'auto_sensor',
    },
    userLocation
  );

  const handleSaveContact = () => {
    if (!nameInput.trim() || !phoneInput.trim()) {
      Alert.alert('Incomplete Details', 'Please provide a name and valid phone number.');
      return;
    }

    addTrustedContact({
      name: nameInput.trim(),
      phone_number: phoneInput.trim(),
      relation: relationInput.trim() || 'Family',
      is_primary: trustedContacts.length === 0,
    });

    setNameInput('');
    setPhoneInput('');
    setRelationInput('');
    setIsAddModalOpen(false);
  };

  const handleCopyLink = async () => {
    await Clipboard.setStringAsync(trackingLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const buildLiveLocationMessage = () =>
    `${smsPreviewText}\n\nLive tracking: ${trackingLink}`;

  // Opens a WhatsApp chat with this contact, prefilled with the live
  // location message. The user still has to tap "Send" inside WhatsApp —
  // wa.me deep links can't silently dispatch a message on their own, and
  // since each one switches away from the app, this is per-contact rather
  // than a single "send to all" action.
  const handleShareViaWhatsApp = async (contact: TrustedContact) => {
    const url = OfflineFallbackService.getWhatsAppShareURL(
      contact.phone_number,
      buildLiveLocationMessage()
    );
    try {
      await Linking.openURL(url);
    } catch (err) {
      Alert.alert(
        'Could not open WhatsApp',
        'Make sure WhatsApp is installed on this device, or use the SMS option instead.'
      );
    }
  };

  // Sends live location to one contact via SMS right now, independent of
  // an active SOS.
  const handleSendSMSNow = async (contact: TrustedContact) => {
    const isAvailable = await SMS.isAvailableAsync();
    if (!isAvailable) {
      Alert.alert('SMS Unavailable', 'This device cannot send SMS messages.');
      return;
    }
    const { success, error } = await OfflineFallbackService.sendManualLocationSMS(
      contact,
      userLocation
    );
    if (!success) {
      Alert.alert('Could not send SMS', error || 'Please try again.');
    }
  };

  // Broadcasts live location via SMS to every trusted contact in one go.
  // (A true one-tap WhatsApp broadcast isn't possible with deep links —
  // WhatsApp requires the user to confirm send in-app each time.)
  const handleBroadcastSMSToAll = async () => {
    if (trustedContacts.length === 0) {
      Alert.alert('No Contacts', 'Add a trusted contact first.');
      return;
    }
    const isAvailable = await SMS.isAvailableAsync();
    if (!isAvailable) {
      Alert.alert('SMS Unavailable', 'This device cannot send SMS messages.');
      return;
    }
    const { success, error } = await OfflineFallbackService.sendEmergencySMS(
      trustedContacts,
      { situation_type: 'other', urgency_level: 'moderate', trigger_type: 'manual' },
      userLocation
    );
    if (!success) {
      Alert.alert('Could not send SMS', error || 'Please try again.');
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Header Info */}
      <View style={styles.headerCard}>
        <Users size={22} color="#58A6FF" />
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>
            {settings.language === 'hi'
              ? 'विश्वसनीय आपातकालीन संपर्क'
              : 'Trusted Emergency Contacts'}
          </Text>
          <Text style={styles.headerSubtitle}>
            {settings.language === 'hi'
              ? 'आपातकाल या ऑटो-SOS के समय लाइव लोकेशन SMS द्वारा भेजी जाएगी'
              : 'Automatically alerted via SMS with live GPS location during any SOS'}
          </Text>
        </View>
      </View>

      {/* Contacts List */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>
          {settings.language === 'hi' ? 'सहेजे गए संपर्क' : 'Configured Contacts'}
        </Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity
            style={styles.broadcastBtn}
            activeOpacity={0.75}
            onPress={handleBroadcastSMSToAll}
          >
            <Share2 size={16} color="#FFFFFF" />
            <Text style={styles.addBtnText}>
              {settings.language === 'hi' ? 'लोकेशन भेजें' : 'Share Location'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.addBtn}
            activeOpacity={0.75}
            onPress={() => setIsAddModalOpen(true)}
          >
            <Plus size={16} color="#FFFFFF" />
            <Text style={styles.addBtnText}>
              {settings.language === 'hi' ? 'नया जोड़ें' : 'Add Contact'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.contactsList}>
        {trustedContacts.map((contact) => (
          <View key={contact.id} style={styles.contactCard}>
            <View style={styles.avatarBox}>
              <Text style={styles.avatarText}>
                {contact.name.charAt(0).toUpperCase()}
              </Text>
            </View>

            <View style={styles.contactDetails}>
              <View style={styles.nameRow}>
                <Text style={styles.contactName}>{contact.name}</Text>
                {contact.is_primary && (
                  <View style={styles.primaryBadge}>
                    <Text style={styles.primaryBadgeText}>PRIMARY</Text>
                  </View>
                )}
              </View>
              <Text style={styles.contactPhone}>{contact.phone_number}</Text>
              <Text style={styles.contactRelation}>{contact.relation}</Text>
            </View>

            <View style={styles.contactActions}>
              <TouchableOpacity
                style={styles.contactActionBtn}
                onPress={() => handleShareViaWhatsApp(contact)}
              >
                <Send size={16} color="#3FB950" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.contactActionBtn}
                onPress={() => handleSendSMSNow(contact)}
              >
                <MessageSquareShare size={16} color="#58A6FF" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.contactActionBtn}
                onPress={() => removeTrustedContact(contact.id)}
              >
                <Trash2 size={16} color="#FF6B6B" />
              </TouchableOpacity>
            </View>
          </View>
        ))}

        {trustedContacts.length === 0 && (
          <View style={styles.emptyContacts}>
            <Text style={styles.emptyText}>
              No trusted contacts added yet. Add family members to receive instant SOS alerts.
            </Text>
          </View>
        )}
      </View>

      {/* Live Tracking Link Generator Card */}
      <View style={styles.trackingCard}>
        <View style={styles.trackingHeader}>
          <Share2 size={18} color="#3FB950" />
          <Text style={styles.trackingTitle}>
            {settings.language === 'hi'
              ? 'शेयर करने योग्य लाइव ट्रैकिंग लिंक'
              : 'Shareable Live Tracking Link'}
          </Text>
        </View>
        <Text style={styles.trackingDesc}>
          {settings.language === 'hi'
            ? 'परिवार के सदस्य बिना ऐप इंस्टॉल किए भी आपका लाइव स्थान और निकटतम सेवाएं देख सकते हैं'
            : 'Family members can view your live GPS coordinates & rescue services in any web browser without installing the app.'}
        </Text>

        <View style={styles.linkBox}>
          <Text style={styles.linkText} numberOfLines={1}>
            {trackingLink}
          </Text>
          <TouchableOpacity
            style={styles.copyBtn}
            onPress={handleCopyLink}
            activeOpacity={0.7}
          >
            {copiedLink ? (
              <Check size={16} color="#3FB950" />
            ) : (
              <Copy size={16} color="#58A6FF" />
            )}
            <Text
              style={[
                styles.copyBtnText,
                copiedLink && { color: '#3FB950' },
              ]}
            >
              {copiedLink ? 'Copied' : 'Copy'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* SMS Alert Format Preview */}
      <TouchableOpacity
        style={styles.smsPreviewCard}
        activeOpacity={0.8}
        onPress={() => setSmsPreviewVisible(true)}
      >
        <MessageSquareShare size={20} color="#FFA500" />
        <View style={{ flex: 1 }}>
          <Text style={styles.smsPreviewTitle}>Preview Emergency SMS Payload</Text>
          <Text style={styles.smsPreviewSubtitle}>
            View exact message dispatched to contacts during low-network fallback
          </Text>
        </View>
        <ExternalLink size={16} color="#8B949E" />
      </TouchableOpacity>

      {/* Add Contact Modal */}
      <Modal visible={isAddModalOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Add Trusted Contact</Text>

            <TextInput
              style={styles.input}
              placeholder="Full Name (e.g. Rahul Sharma)"
              placeholderTextColor="#6E7681"
              value={nameInput}
              onChangeText={setNameInput}
            />

            <TextInput
              style={styles.input}
              placeholder="Mobile Number with +91 (e.g. +919876543210)"
              placeholderTextColor="#6E7681"
              keyboardType="phone-pad"
              value={phoneInput}
              onChangeText={setPhoneInput}
            />

            <TextInput
              style={styles.input}
              placeholder="Relationship (e.g. Spouse, Brother, Parent)"
              placeholderTextColor="#6E7681"
              value={relationInput}
              onChangeText={setRelationInput}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelModalBtn}
                onPress={() => setIsAddModalOpen(false)}
              >
                <Text style={styles.cancelModalText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveModalBtn}
                onPress={handleSaveContact}
              >
                <Text style={styles.saveModalText}>Save Contact</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* SMS Preview Modal */}
      <Modal visible={smsPreviewVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Emergency SMS Draft</Text>
            <View style={styles.smsBox}>
              <Text style={styles.smsBodyText}>{smsPreviewText}</Text>
            </View>
            <TouchableOpacity
              style={styles.closeSmsBtn}
              onPress={() => setSmsPreviewVisible(false)}
            >
              <Text style={styles.closeSmsText}>Close Preview</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

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
  },
  headerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161B22',
    borderColor: '#30363D',
    borderWidth: 1,
    borderRadius: 14,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 16,
    padding: 14,
    gap: 12,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  headerSubtitle: {
    color: '#8B949E',
    fontSize: 12,
    marginTop: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#238636',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  addBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  broadcastBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F6FEB',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  contactActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  contactActionBtn: {
    padding: 8,
  },
  contactsList: {
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 20,
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161B22',
    borderColor: '#30363D',
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    gap: 12,
  },
  avatarBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#21262D',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#30363D',
  },
  avatarText: {
    color: '#58A6FF',
    fontSize: 18,
    fontWeight: '800',
  },
  contactDetails: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  contactName: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  primaryBadge: {
    backgroundColor: 'rgba(63, 185, 80, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  primaryBadgeText: {
    color: '#3FB950',
    fontSize: 9,
    fontWeight: '800',
  },
  contactPhone: {
    color: '#C9D1D9',
    fontSize: 13,
    fontWeight: '600',
  },
  contactRelation: {
    color: '#8B949E',
    fontSize: 11,
    marginTop: 1,
  },
  emptyContacts: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    color: '#8B949E',
    fontSize: 13,
    textAlign: 'center',
  },
  trackingCard: {
    backgroundColor: '#161B22',
    borderColor: '#30363D',
    borderWidth: 1,
    borderRadius: 14,
    marginHorizontal: 16,
    padding: 14,
    marginBottom: 16,
  },
  trackingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  trackingTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  trackingDesc: {
    color: '#8B949E',
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 10,
  },
  linkBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0D1117',
    borderColor: '#30363D',
    borderWidth: 1,
    borderRadius: 8,
    paddingLeft: 10,
    paddingRight: 4,
    paddingVertical: 4,
  },
  linkText: {
    color: '#58A6FF',
    fontSize: 12,
    flex: 1,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#21262D',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  copyBtnText: {
    color: '#58A6FF',
    fontSize: 11,
    fontWeight: '700',
  },
  smsPreviewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161B22',
    borderColor: '#30363D',
    borderWidth: 1,
    borderRadius: 14,
    marginHorizontal: 16,
    padding: 14,
    gap: 12,
  },
  smsPreviewTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  smsPreviewSubtitle: {
    color: '#8B949E',
    fontSize: 11,
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  modalCard: {
    backgroundColor: '#161B22',
    borderColor: '#30363D',
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 16,
  },
  input: {
    backgroundColor: '#0D1117',
    borderColor: '#30363D',
    borderWidth: 1,
    borderRadius: 10,
    color: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    marginBottom: 12,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  cancelModalBtn: {
    flex: 1,
    backgroundColor: '#21262D',
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelModalText: {
    color: '#8B949E',
    fontWeight: '700',
    fontSize: 14,
  },
  saveModalBtn: {
    flex: 1,
    backgroundColor: '#238636',
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveModalText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
  smsBox: {
    backgroundColor: '#0D1117',
    borderColor: '#30363D',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  smsBodyText: {
    color: '#C9D1D9',
    fontSize: 12,
    lineHeight: 18,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  closeSmsBtn: {
    backgroundColor: '#21262D',
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeSmsText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
});
