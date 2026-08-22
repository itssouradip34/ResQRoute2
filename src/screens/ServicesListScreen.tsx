import React, { useMemo, useState } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Search, SlidersHorizontal } from 'lucide-react-native';
import { ServiceCategory } from '../types';
import { useEmergency } from '../context/EmergencyContext';
import { useSettings } from '../context/SettingsContext';
import { ServiceRanker } from '../services/directory/ServiceRanker';
import { ServiceCard } from '../components/ServiceCard';
import { INDIA_EMERGENCY_SERVICES } from '../data/indiaEmergencyServices';

export const ServicesListScreen: React.FC = () => {
  const { userLocation, currentIncident } = useEmergency();
  const { settings } = useSettings();

  const [selectedCategory, setSelectedCategory] = useState<ServiceCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const categories: { id: ServiceCategory | 'all'; label_en: string; label_hi: string }[] = [
    { id: 'all', label_en: 'All Services', label_hi: 'सभी सेवाएं' },
    { id: 'hospital', label_en: 'Hospitals', label_hi: 'अस्पताल' },
    { id: 'ambulance', label_en: 'Ambulance', label_hi: 'एम्बुलेंस' },
    { id: 'police', label_en: 'Police', label_hi: 'पुलिस' },
    { id: 'towing', label_en: 'Towing', label_hi: 'टोइंग' },
    { id: 'puncture_repair', label_en: 'Puncture', label_hi: 'पंचर' },
    { id: 'mechanic', label_en: 'Mechanic', label_hi: 'मैकेनिक' },
  ];

  const rankedList = useMemo(() => {
    const list = ServiceRanker.rankServices(
      {
        userLocation,
        situationType: currentIncident?.situation_type,
        categoryFilter: selectedCategory,
        maxDistanceKm: 150,
      },
      INDIA_EMERGENCY_SERVICES
    );

    if (!searchQuery.trim()) return list;

    const q = searchQuery.toLowerCase();
    return list.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.address.toLowerCase().includes(q) ||
        (s.specialty && s.specialty.toLowerCase().includes(q))
    );
  }, [userLocation, currentIncident, selectedCategory, searchQuery]);

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Search size={18} color="#8B949E" />
          <TextInput
            style={styles.searchInput}
            placeholder={
              settings.language === 'hi'
                ? 'अस्पताल, क्रेन, मैकेनिक खोजें...'
                : 'Search hospital, trauma, towing, mechanic...'
            }
            placeholderTextColor="#6E7681"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Category Pills Strip */}
      <View style={styles.categoriesContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={categories}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.categoriesContent}
          renderItem={({ item }) => {
            const isSelected = selectedCategory === item.id;
            return (
              <TouchableOpacity
                style={[
                  styles.categoryPill,
                  isSelected && styles.categoryPillActive,
                ]}
                activeOpacity={0.75}
                onPress={() => setSelectedCategory(item.id)}
              >
                <Text
                  style={[
                    styles.categoryPillText,
                    isSelected && styles.categoryPillTextActive,
                  ]}
                >
                  {settings.language === 'hi' ? item.label_hi : item.label_en}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* Service Ranking List */}
      <FlatList
        data={rankedList}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => <ServiceCard service={item} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>
              {settings.language === 'hi'
                ? 'कोई सेवा नहीं मिली'
                : 'No Services Found'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {settings.language === 'hi'
                ? 'कृपया अपनी श्रेणी या खोज शब्द बदलकर देखें'
                : 'Try adjusting your search query or category filter'}
            </Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D1117',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161B22',
    borderColor: '#30363D',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 46,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
  },
  categoriesContainer: {
    paddingBottom: 10,
  },
  categoriesContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  categoryPill: {
    backgroundColor: '#161B22',
    borderColor: '#30363D',
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  categoryPillActive: {
    backgroundColor: '#238636',
    borderColor: '#2EA043',
  },
  categoryPillText: {
    color: '#8B949E',
    fontSize: 12,
    fontWeight: '700',
  },
  categoryPillTextActive: {
    color: '#FFFFFF',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 80,
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 6,
  },
  emptySubtitle: {
    color: '#8B949E',
    fontSize: 13,
    textAlign: 'center',
  },
});
