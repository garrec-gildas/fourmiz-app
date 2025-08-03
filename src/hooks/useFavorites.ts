// src/hooks/useFavorites.ts
import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const FAVORITES_STORAGE_KEY = 'user_favorites_services';

export const useFavorites = () => {
  const [favorites, setFavorites] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);

  // Charger les favoris depuis le stockage local
  useEffect(() => {
    const loadFavorites = async () => {
      try {
        const storedFavorites = await AsyncStorage.getItem(FAVORITES_STORAGE_KEY);
        if (storedFavorites) {
          setFavorites(JSON.parse(storedFavorites));
        }
      } catch (error) {
        console.error('Erreur lors du chargement des favoris:', error);
      } finally {
        setLoading(false);
      }
    };

    loadFavorites();
  }, []);

  // Sauvegarder les favoris dans le stockage local
  const saveFavorites = useCallback(async (newFavorites: number[]) => {
    try {
      await AsyncStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(newFavorites));
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des favoris:', error);
    }
  }, []);

  // Ajouter/retirer un service des favoris
  const toggleFavorite = useCallback(async (serviceId: number) => {
    setFavorites(prevFavorites => {
      const newFavorites = prevFavorites.includes(serviceId)
        ? prevFavorites.filter(id => id !== serviceId)
        : [...prevFavorites, serviceId];
      
      // Sauvegarder de manière asynchrone
      saveFavorites(newFavorites);
      
      return newFavorites;
    });
  }, [saveFavorites]);

  // Vérifier si un service est en favoris
  const isFavorite = useCallback((serviceId: number) => {
    return favorites.includes(serviceId);
  }, [favorites]);

  // Obtenir tous les favoris
  const getFavorites = useCallback(() => {
    return favorites;
  }, [favorites]);

  // Effacer tous les favoris
  const clearFavorites = useCallback(async () => {
    setFavorites([]);
    await saveFavorites([]);
  }, [saveFavorites]);

  return {
    favorites,
    loading,
    toggleFavorite,
    isFavorite,
    getFavorites,
    clearFavorites,
  };
};