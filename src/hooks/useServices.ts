// src/hooks/useServices.ts
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export interface Service {
  id: number;
  title: string;
  description?: string;
  categorie?: string;
  estimatedDuration?: number;
  isEligibleTaxCredit: boolean;
  created_at?: string;
  user_id?: string;
}

export const useServices = (userId?: string) => {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchServices = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setServices(data || []);
    } catch (err: any) {
      console.error('Erreur lors du chargement des services:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const refetch = useCallback(() => {
    fetchServices();
  }, [fetchServices]);

  const updateService = useCallback(async (serviceId: number, updates: Partial<Service>) => {
    try {
      const { error } = await supabase
        .from('services')
        .update(updates)
        .eq('id', serviceId);

      if (error) throw error;
      
      await fetchServices(); // Rafraîchir la liste
    } catch (err: any) {
      console.error('Erreur lors de la mise à jour du service:', err);
      throw err;
    }
  }, [fetchServices]);

  const deleteService = useCallback(async (serviceId: number) => {
    try {
      const { error } = await supabase
        .from('services')
        .delete()
        .eq('id', serviceId);

      if (error) throw error;
      
      await fetchServices(); // Rafraîchir la liste
    } catch (err: any) {
      console.error('Erreur lors de la suppression du service:', err);
      throw err;
    }
  }, [fetchServices]);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  return {
    services,
    loading,
    error,
    refetch,
    updateService,
    deleteService,
  };
};