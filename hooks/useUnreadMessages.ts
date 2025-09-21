// hooks/useUnreadMessages.ts - Hook pour compter les messages non lus
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export const useUnreadMessages = (userId: string) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const loadUnreadCount = useCallback(async () => {
    if (!userId) return;

    try {
      const { data, error } = await supabase.rpc('get_unread_messages_count', {
        p_user_id: userId
      });

      if (error) throw error;
      setUnreadCount(data || 0);
    } catch (error) {
      console.error('❌ Erreur comptage messages non lus:', error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadUnreadCount();

    // S'abonner aux changements de messages
    const subscription = supabase
      .channel('unread_messages')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_messages'
        },
        () => {
          loadUnreadCount();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [loadUnreadCount]);

  return { unreadCount, loading, refresh: loadUnreadCount };
};
