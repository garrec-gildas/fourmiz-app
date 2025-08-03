// utils/chatPermissions.ts - Vérifications des permissions
import { supabase } from '@/lib/supabase';

export const chatPermissions = {
  // Vérifier si l'utilisateur peut accéder à un chat
  canAccessChat: async (userId: string, orderId: number): Promise<boolean> => {
    try {
      const { data } = await supabase
        .from('orders')
        .select('client_id, fourmiz_id')
        .eq('id', orderId)
        .single();

      return data ? (data.client_id === userId || data.fourmiz_id === userId) : false;
    } catch {
      return false;
    }
  },

  // Vérifier si l'utilisateur peut envoyer des messages
  canSendMessage: async (userId: string, orderId: number): Promise<boolean> => {
    try {
      const { data } = await supabase
        .from('orders')
        .select('status, client_id, fourmiz_id')
        .eq('id', orderId)
        .single();

      if (!data) return false;

      // Seuls client et fourmiz peuvent envoyer des messages
      const isParticipant = data.client_id === userId || data.fourmiz_id === userId;
      
      // Pas de messages si commande annulée
      const canSend = data.status !== 'annulee';

      return isParticipant && canSend;
    } catch {
      return false;
    }
  },

  // Vérifier si l'utilisateur peut voir l'historique complet
  canViewHistory: async (userId: string, orderId: number): Promise<boolean> => {
    // Même logique que canAccessChat pour l'instant
    return chatPermissions.canAccessChat(userId, orderId);
  }
};