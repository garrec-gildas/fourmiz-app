// utils/chatUtils.ts - Utilitaires pour le chat
import { ChatMessage } from '@/hooks/useChat';

export const chatUtils = {
  // Formater l'heure d'un message
  formatMessageTime: (timestamp: string): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('fr-FR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  },

  // Formater la date d'un message
  formatMessageDate: (timestamp: string): string => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Aujourd\'hui';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Hier';
    } else {
      return date.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'short'
      });
    }
  },

  // Formater le timestamp relatif (il y a X min/heures)
  formatRelativeTime: (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'À l\'instant';
    if (diffInMinutes < 60) return `Il y a ${diffInMinutes}min`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `Il y a ${diffInHours}h`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `Il y a ${diffInDays}j`;
    
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  },

  // Vérifier si deux messages sont du même jour
  isSameDay: (timestamp1: string, timestamp2: string): boolean => {
    const date1 = new Date(timestamp1);
    const date2 = new Date(timestamp2);
    return date1.toDateString() === date2.toDateString();
  },

  // Vérifier si deux messages sont du même expéditeur et proches dans le temps
  shouldGroupMessages: (msg1: ChatMessage, msg2: ChatMessage, maxMinutes = 5): boolean => {
    if (msg1.sender_id !== msg2.sender_id) return false;
    if (msg1.message_type === 'system' || msg2.message_type === 'system') return false;
    
    const time1 = new Date(msg1.created_at);
    const time2 = new Date(msg2.created_at);
    const diffInMinutes = Math.abs(time2.getTime() - time1.getTime()) / (1000 * 60);
    
    return diffInMinutes <= maxMinutes;
  },

  // Tronquer un long message pour les aperçus
  truncateMessage: (message: string, maxLength = 50): string => {
    if (message.length <= maxLength) return message;
    return message.substring(0, maxLength).trim() + '...';
  },

  // Formater un message selon son type pour l'aperçu
  formatPreviewMessage: (message: ChatMessage): string => {
    switch (message.message_type) {
      case 'image':
        return '📷 Image';
      case 'location':
        return '📍 Position partagée';
      case 'system':
        return `🔔 ${message.message}`;
      default:
        return chatUtils.truncateMessage(message.message);
    }
  },

  // Obtenir l'icône pour un type de message
  getMessageTypeIcon: (type: string): string => {
    switch (type) {
      case 'image': return 'image';
      case 'location': return 'location';
      case 'system': return 'information-circle';
      default: return 'chatbubble';
    }
  },

  // Valider un message avant envoi
  validateMessage: (message: string): { valid: boolean; error?: string } => {
    if (!message.trim()) {
      return { valid: false, error: 'Le message ne peut pas être vide' };
    }
    
    if (message.length > 1000) {
      return { valid: false, error: 'Le message est trop long (max 1000 caractères)' };
    }
    
    return { valid: true };
  },

  // Extraire les mentions d'un message (pour future extension)
  extractMentions: (message: string): string[] => {
    const mentionRegex = /@(\w+)/g;
    const mentions = [];
    let match;
    
    while ((match = mentionRegex.exec(message)) !== null) {
      mentions.push(match[1]);
    }
    
    return mentions;
  },

  // Nettoyer et sécuriser un message
  sanitizeMessage: (message: string): string => {
    return message
      .trim()
      .replace(/\s+/g, ' ') // Réduire les espaces multiples
      .substring(0, 1000); // Limiter la longueur
  }
};