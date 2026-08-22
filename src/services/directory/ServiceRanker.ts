import {
  EmergencyService,
  ServiceCategory,
  SituationType,
  UserLocation,
} from '../../types';
import {
  INDIA_EMERGENCY_SERVICES,
  NATIONAL_HELPLINES,
} from '../../data/indiaEmergencyServices';

export interface RankOptions {
  userLocation: UserLocation;
  situationType?: SituationType;
  categoryFilter?: ServiceCategory | 'all';
  maxDistanceKm?: number;
  regionCode?: string;
}

export class ServiceRanker {
  /**
   * Calculate great-circle distance between two coordinates using Haversine formula (km)
   */
  public static calculateDistanceKm(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371; // Earth radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Number((R * c).toFixed(2));
  }

  /**
   * Calculate realistic ETA in minutes based on distance & urban road conditions
   */
  public static calculateEtaMinutes(distanceKm: number): number {
    // Approx 35 km/h average speed in urban/suburban India
    const baseMinutes = (distanceKm / 35) * 60;
    return Math.max(3, Math.round(baseMinutes + 2)); // Add 2 min dispatch buffer
  }

  /**
   * Map situation type to highest priority service categories
   */
  public static getPriorityCategories(situation: SituationType): ServiceCategory[] {
    switch (situation) {
      case 'accident':
      case 'medical':
        return ['hospital', 'ambulance', 'police', 'towing'];
      case 'flat_tyre':
        return ['puncture_repair', 'mechanic', 'towing'];
      case 'breakdown':
        return ['towing', 'mechanic', 'puncture_repair'];
      case 'fuel_out':
        return ['fuel', 'mechanic', 'towing'];
      case 'other':
      default:
        return ['police', 'hospital', 'towing', 'mechanic'];
    }
  }

  /**
   * Rank and filter emergency services based on weighted model
   */
  public static rankServices(
    options: RankOptions,
    customServiceList?: EmergencyService[]
  ): EmergencyService[] {
    const services = customServiceList || INDIA_EMERGENCY_SERVICES;
    const { userLocation, situationType, categoryFilter, maxDistanceKm = 100 } = options;

    const priorityCategories = situationType
      ? this.getPriorityCategories(situationType)
      : [];

    const scoredServices = services
      .map((service) => {
        const distance = this.calculateDistanceKm(
          userLocation.latitude,
          userLocation.longitude,
          service.latitude,
          service.longitude
        );

        // Bounded Distance factor (0 to 1): decay with half-life ~ 10 km
        const distanceScore = 1.0 / (1.0 + distance / 8.0);

        // Urgency / Category match factor: w2 = 0.45
        let categoryMatchScore = 0.5;
        if (priorityCategories.length > 0) {
          const catIndex = priorityCategories.indexOf(service.category);
          if (catIndex === 0) categoryMatchScore = 1.0;
          else if (catIndex === 1) categoryMatchScore = 0.85;
          else if (catIndex >= 2) categoryMatchScore = 0.65;
          else categoryMatchScore = 0.05; // Unrelated category
        }

        // Availability factor (24x7): w3 = 0.15
        const availabilityScore = service.open_24x7 ? 1.0 : 0.4;

        // Rating & Verification factor: w4 = 0.10
        const ratingScore = (service.rating / 5.0) * (service.is_verified ? 1.0 : 0.8);

        // Weighted total
        const w1 = 0.30;
        const w2 = 0.45;
        const w3 = 0.15;
        const w4 = 0.10;

        const rankScore = Number(
          (
            w1 * distanceScore +
            w2 * categoryMatchScore +
            w3 * availabilityScore +
            w4 * ratingScore
          ).toFixed(3)
        );

        const eta = this.calculateEtaMinutes(distance);

        return {
          ...service,
          distanceKm: distance,
          etaMinutes: eta,
          rankScore,
        };
      })
      .filter((s) => {
        // Filter by category if selected
        if (categoryFilter && categoryFilter !== 'all' && s.category !== categoryFilter) {
          return false;
        }
        // Filter by reasonable regional proximity
        return s.distanceKm! <= maxDistanceKm;
      })
      .sort((a, b) => (b.rankScore || 0) - (a.rankScore || 0));

    return scoredServices;
  }
}
