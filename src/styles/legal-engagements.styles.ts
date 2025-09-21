// styles/legal-engagements.styles.ts
// Styles dédiés pour les engagements légaux

import { StyleSheet } from 'react-native';

export const legalEngagementsStyles = StyleSheet.create({
  // Section principale
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 8,
    color: '#000000',
  },
  sectionDescription: {
    fontSize: 13,
    color: '#666666',
    marginBottom: 16,
    lineHeight: 20,
    fontWeight: '400',
  },

  // États de chargement et d'erreur
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 20,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
  },
  loadingText: {
    fontSize: 13,
    color: '#666666',
    fontWeight: '400',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFF5F5',
    borderRadius: 6,
    padding: 12,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: '#ff4444',
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: '#cc0000',
    lineHeight: 18,
    fontWeight: '400',
  },
  noEngagementsContainer: {
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    padding: 20,
    alignItems: 'center',
  },
  noEngagementsText: {
    fontSize: 13,
    color: '#666666',
    textAlign: 'center',
    fontWeight: '400',
  },

  // Container des engagements
  engagementsContainer: {
    gap: 16,
    marginBottom: 20,
  },

  // Items d'engagement individuels
  engagementItem: {
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  engagementItemVoluntary: {
    backgroundColor: '#f0f0f0',
    borderColor: '#d0d0d0',
  },
  engagementItemDisabled: {
    opacity: 0.6,
    backgroundColor: '#f5f5f5',
  },

  // Header de l'engagement
  engagementHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },

  // Checkbox
  checkboxContainer: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  checkboxContainerChecked: {
    backgroundColor: '#000000',
    borderColor: '#000000',
  },
  checkboxContainerVoluntary: {
    borderColor: '#d0d0d0',
  },
  checkboxContainerDisabled: {
    backgroundColor: '#f5f5f5',
    borderColor: '#cccccc',
  },

  // Contenu de l'engagement
  engagementContent: {
    flex: 1,
  },
  engagementTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  engagementTitleDisabled: {
    color: '#999999',
  },
  engagementDescription: {
    fontSize: 13,
    color: '#333333',
    lineHeight: 18,
    fontWeight: '400',
    marginBottom: 6,
  },
  engagementDescriptionDisabled: {
    color: '#999999',
  },
  engagementDetails: {
    fontSize: 12,
    color: '#666666',
    lineHeight: 16,
    fontWeight: '400',
    fontStyle: 'italic',
    marginBottom: 4,
  },
  engagementDetailsDisabled: {
    color: '#999999',
  },
  engagementVersion: {
    fontSize: 11,
    color: '#999999',
    fontStyle: 'italic',
    marginTop: 4,
  },

  // Label volontaire
  voluntaryLabel: {
    fontSize: 11,
    color: '#999999',
    fontWeight: '400',
  },

  // Progression des engagements
  engagementProgress: {
    backgroundColor: '#f0f0f0',
    borderRadius: 6,
    padding: 12,
    marginBottom: 16,
    alignItems: 'center',
    gap: 12,
  },
  engagementProgressText: {
    fontSize: 13,
    color: '#666666',
    fontWeight: '500',
    textAlign: 'center',
  },
  engagementProgressTextComplete: {
    color: '#000000',
    fontWeight: '600',
  },

  // Bouton "Accepter tout"
  acceptAllButton: {
    backgroundColor: '#000000',
    borderRadius: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignItems: 'center',
    minHeight: 36,
    justifyContent: 'center',
  },
  acceptAllButtonDisabled: {
    backgroundColor: '#cccccc',
  },
  acceptAllButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },

  // Notices grandfathered
  grandfatheredNotice: {
    backgroundColor: '#E8F5E8',
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 20,
    borderLeftWidth: 3,
    borderLeftColor: '#4CAF50',
  },
  grandfatheredContent: {
    flex: 1,
  },
  grandfatheredTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2E7D32',
    marginBottom: 4,
  },
  grandfatheredText: {
    fontSize: 13,
    color: '#388E3C',
    lineHeight: 18,
    marginBottom: 8,
    fontWeight: '400',
  },
  grandfatheredSubtext: {
    fontSize: 12,
    color: '#4CAF50',
    fontStyle: 'italic',
  },

  // Bouton acceptation volontaire
  voluntaryAcceptanceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8f8f8',
    borderRadius: 6,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  voluntaryAcceptanceText: {
    fontSize: 13,
    color: '#666666',
    fontWeight: '500',
  },

  // Notice nouveau profil
  newProfileNotice: {
    backgroundColor: '#E3F2FD',
    borderRadius: 6,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: '#2196F3',
  },
  newProfileNoticeText: {
    flex: 1,
    fontSize: 12,
    color: '#1976D2',
    lineHeight: 16,
    fontWeight: '400',
  },

  // Notice légale
  legalNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#f8f8f8',
    borderRadius: 6,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#000000',
    marginTop: 8,
  },
  legalNoticeText: {
    flex: 1,
    fontSize: 12,
    color: '#666666',
    lineHeight: 16,
    fontWeight: '400',
  },

  // Styles pour l'état compact/réduit
  compactSection: {
    marginBottom: 16,
  },
  compactTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 6,
  },
  compactSummary: {
    fontSize: 12,
    color: '#666666',
    backgroundColor: '#f8f8f8',
    padding: 10,
    borderRadius: 6,
    textAlign: 'center',
  },
  compactSummarySuccess: {
    backgroundColor: '#E8F5E8',
    color: '#2E7D32',
  },
  compactSummaryWarning: {
    backgroundColor: '#FFF8E1',
    color: '#F57C00',
  },

  // Boutons d'action rapide
  quickActionButton: {
    backgroundColor: '#f8f8f8',
    borderRadius: 6,
    padding: 10,
    alignItems: 'center',
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  quickActionButtonText: {
    fontSize: 13,
    color: '#000000',
    fontWeight: '500',
  },

  // Styles pour l'animation de transition
  collapsibleContent: {
    overflow: 'hidden',
  },
  fadeIn: {
    opacity: 1,
  },
  fadeOut: {
    opacity: 0.5,
  },

  // Indicateurs visuels
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusIndicatorSuccess: {
    backgroundColor: '#4CAF50',
  },
  statusIndicatorWarning: {
    backgroundColor: '#FF9800',
  },
  statusIndicatorError: {
    backgroundColor: '#F44336',
  },
  statusIndicatorInfo: {
    backgroundColor: '#2196F3',
  },

  // Styles responsive pour différentes tailles d'écran
  responsiveContainer: {
    paddingHorizontal: 16,
  },
  responsiveContainerTablet: {
    paddingHorizontal: 32,
    maxWidth: 600,
    alignSelf: 'center',
    width: '100%',
  },

  // Styles pour l'accessibilité
  accessibleFocusRing: {
    borderWidth: 2,
    borderColor: '#2196F3',
  },
  screenReaderOnly: {
    position: 'absolute',
    left: -10000,
    top: 'auto',
    width: 1,
    height: 1,
    overflow: 'hidden',
  }
});