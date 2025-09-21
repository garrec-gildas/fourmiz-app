import React from 'react';
import { View, Text, Switch, StyleSheet } from 'react-native';

export interface TrackingConsents {
  mission: boolean;
  offDuty: boolean;
  dataRetention: number;
  lastUpdated?: string;
}

interface TrackingConsentSectionProps {
  userId?: string;
  isFourmizRole: boolean;
  isEditMode: boolean;
  onConsentChange: (consents: TrackingConsents) => void;
  disabled?: boolean;
}

export const TrackingConsentSection: React.FC<TrackingConsentSectionProps> = ({
  onConsentChange,
  disabled = false
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Préférences de géolocalisation</Text>
      {/* TODO: Implémenter l'interface */}
    </View>
  );
};

export const useTrackingConsents = (userId?: string) => {
  return {
    saveConsents: async (consents: TrackingConsents) => {
      // TODO: Implémenter la sauvegarde
      return true;
    },
    isLoading: false
  };
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
});