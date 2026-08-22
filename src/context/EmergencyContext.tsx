import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  EmergencyService,
  IncidentReport,
  IncidentStatus,
  SituationType,
  TimelineEvent,
  TrustedContact,
  UserLocation,
} from '../types';
import { EmergencyManager } from '../services/emergency/EmergencyManager';
import { SensorHub } from '../services/sensor/SensorHub';

interface EmergencyContextType {
  status: IncidentStatus;
  currentIncident: IncidentReport | null;
  countdownRemaining: number;
  timeline: TimelineEvent[];
  trustedContacts: TrustedContact[];
  rankedServices: EmergencyService[];
  userLocation: UserLocation;
  triggerManualSOS: (situation?: SituationType) => void;
  cancelEmergency: () => void;
  forceEscalate: () => void;
  resolveEmergency: () => void;
  addTrustedContact: (contact: Omit<TrustedContact, 'id'>) => void;
  removeTrustedContact: (id: string) => void;
}

const EmergencyContext = createContext<EmergencyContextType | null>(null);

export const EmergencyProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [status, setStatus] = useState<IncidentStatus>(EmergencyManager.getStatus());
  const [currentIncident, setCurrentIncident] = useState<IncidentReport | null>(
    EmergencyManager.getCurrentIncident()
  );
  const [countdownRemaining, setCountdownRemaining] = useState<number>(
    EmergencyManager.getCountdownRemaining()
  );
  const [timeline, setTimeline] = useState<TimelineEvent[]>(
    EmergencyManager.getTimeline()
  );
  const [trustedContacts, setTrustedContacts] = useState<TrustedContact[]>(
    EmergencyManager.getTrustedContacts()
  );
  const [rankedServices, setRankedServices] = useState<EmergencyService[]>(
    EmergencyManager.getRankedServices()
  );
  const [userLocation, setUserLocation] = useState<UserLocation>(
    SensorHub.getCurrentLocation()
  );

  useEffect(() => {
    // Start Sensor Hub hardware/GPS listeners
    SensorHub.startListening();

    const unsubManager = EmergencyManager.subscribe((mgr) => {
      setStatus(mgr.getStatus());
      setCurrentIncident(mgr.getCurrentIncident());
      setCountdownRemaining(mgr.getCountdownRemaining());
      setTimeline(mgr.getTimeline());
      setTrustedContacts(mgr.getTrustedContacts());
      setRankedServices(mgr.getRankedServices());
    });

    const unsubSensors = SensorHub.subscribe(() => {
      setUserLocation(SensorHub.getCurrentLocation());
    });

    return () => {
      unsubManager();
      unsubSensors();
    };
  }, []);

  const triggerManualSOS = (situation: SituationType = 'accident') => {
    EmergencyManager.triggerManualSOS(situation);
  };

  const cancelEmergency = () => {
    EmergencyManager.cancelEmergency();
  };

  const forceEscalate = () => {
    EmergencyManager.forceEscalate();
  };

  const resolveEmergency = () => {
    EmergencyManager.resolveEmergency();
  };

  const addTrustedContact = (contact: Omit<TrustedContact, 'id'>) => {
    const updated = [
      ...trustedContacts,
      { ...contact, id: `tc_${Date.now()}` },
    ];
    EmergencyManager.setTrustedContacts(updated);
  };

  const removeTrustedContact = (id: string) => {
    const updated = trustedContacts.filter((c) => c.id !== id);
    EmergencyManager.setTrustedContacts(updated);
  };

  return (
    <EmergencyContext.Provider
      value={{
        status,
        currentIncident,
        countdownRemaining,
        timeline,
        trustedContacts,
        rankedServices,
        userLocation,
        triggerManualSOS,
        cancelEmergency,
        forceEscalate,
        resolveEmergency,
        addTrustedContact,
        removeTrustedContact,
      }}
    >
      {children}
    </EmergencyContext.Provider>
  );
};

export const useEmergency = () => {
  const context = useContext(EmergencyContext);
  if (!context) {
    throw new Error('useEmergency must be used within an EmergencyProvider');
  }
  return context;
};
