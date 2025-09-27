// src/hooks/useNotifications.js
import React, { useState, useEffect, useCallback } from 'react';
import notificationManager from '../services/NotificationManager';

export const useNotifications = () => {
    const [status, setStatus] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    // Met à jour le statut
    const updateStatus = useCallback(() => {
        const currentStatus = notificationManager.getStatus();
        setStatus(currentStatus);
    }, []);

    // Initialise les notifications
    const initialize = useCallback(async (forceRetry = false) => {
        setIsLoading(true);
        try {
            const success = await notificationManager.initializeNotifications(forceRetry);
            updateStatus();
            return success;
        } catch (error) {
            console.error('Erreur lors de l\'initialisation des notifications:', error);
            return false;
        } finally {
            setIsLoading(false);
        }
    }, [updateStatus]);

    // Force une réinitialisation
    const forceReset = useCallback(() => {
        notificationManager.forceReset();
        updateStatus();
    }, [updateStatus]);

    // Met à jour le statut au montage et périodiquement
    useEffect(() => {
        updateStatus();
        
        // Met à jour le statut toutes les 5 secondes
        const interval = setInterval(updateStatus, 5000);
        
        return () => clearInterval(interval);
    }, [updateStatus]);

    return {
        status,
        isLoading,
        initialize,
        forceReset,
        updateStatus
    };
};