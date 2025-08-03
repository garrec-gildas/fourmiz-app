// src/services/NotificationManager.js
class NotificationManager {
    constructor() {
        this.deviceId = null;
        this.maxRetries = 3;
        this.baseCooldown = 5 * 60 * 1000; // 5 minutes
        this.isInitializing = false;
        this.retryAttempts = new Map();
        this.lastAttemptTime = new Map();
    }

    getDeviceId() {
        if (this.deviceId) return this.deviceId;
        
        this.deviceId = localStorage.getItem('deviceId') || this.generateDeviceId();
        localStorage.setItem('deviceId', this.deviceId);
        return this.deviceId;
    }

    generateDeviceId() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    isInCooldown(deviceId) {
        const lastAttempt = this.lastAttemptTime.get(deviceId);
        if (!lastAttempt) return false;

        const timeSinceLastAttempt = Date.now() - lastAttempt;
        const cooldownPeriod = this.calculateCooldown(deviceId);
        
        return timeSinceLastAttempt < cooldownPeriod;
    }

    calculateCooldown(deviceId) {
        const attempts = this.retryAttempts.get(deviceId) || 0;
        return this.baseCooldown * Math.pow(2, Math.min(attempts, 5));
    }

    hasReachedRetryLimit(deviceId) {
        const attempts = this.retryAttempts.get(deviceId) || 0;
        return attempts >= this.maxRetries;
    }

    incrementRetryCount(deviceId) {
        const current = this.retryAttempts.get(deviceId) || 0;
        this.retryAttempts.set(deviceId, current + 1);
        this.lastAttemptTime.set(deviceId, Date.now());
    }

    resetRetryCount(deviceId) {
        this.retryAttempts.delete(deviceId);
        this.lastAttemptTime.delete(deviceId);
    }

    async checkNotificationPermission() {
        if (!('Notification' in window)) {
            throw new Error('Les notifications ne sont pas supportées par ce navigateur');
        }

        let permission = Notification.permission;
        
        if (permission === 'default') {
            permission = await Notification.requestPermission();
        }

        return permission === 'granted';
    }

    async initializeNotifications(forceRetry = false) {
        const deviceId = this.getDeviceId();
        
        console.log(`🔔 Initialisation sécurisée des notifications pour: ${deviceId}`);

        if (this.isInitializing && !forceRetry) {
            console.log('⚠️ Initialisation déjà en cours, ignorer la demande');
            return false;
        }

        if (this.isInCooldown(deviceId) && !forceRetry) {
            const remainingTime = this.calculateCooldown(deviceId) - (Date.now() - this.lastAttemptTime.get(deviceId));
            console.log(`⏳ Cooldown actif, temps restant: ${Math.ceil(remainingTime / 1000)}s`);
            return false;
        }

        if (this.hasReachedRetryLimit(deviceId) && !forceRetry) {
            console.log('🛑 Limite de tentatives atteinte pour ce dispositif');
            this.scheduleReset(deviceId);
            return false;
        }

        this.isInitializing = true;

        try {
            const hasPermission = await this.checkNotificationPermission();
            if (!hasPermission) {
                throw new Error('Permission de notification refusée');
            }

            // REMPLACEZ cette partie par votre logique d'initialisation réelle
            await this.performNotificationSetup(deviceId);

            console.log('✅ Notifications initialisées avec succès');
            this.resetRetryCount(deviceId);
            this.isInitializing = false;
            return true;

        } catch (error) {
            console.error('❌ Erreur lors de l\'initialisation:', error.message);
            this.incrementRetryCount(deviceId);
            this.isInitializing = false;

            if (!this.hasReachedRetryLimit(deviceId)) {
                this.scheduleRetry(deviceId);
            } else {
                console.log('🛑 Limite de tentatives atteinte, arrêt des essais');
                this.scheduleReset(deviceId);
            }

            return false;
        }
    }

    // REMPLACEZ cette méthode par votre logique réelle
    async performNotificationSetup(deviceId) {
        // Exemple d'appel API - adaptez selon votre backend
        const response = await fetch('/api/notifications/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                deviceId,
                // autres paramètres nécessaires
            }),
        });

        if (!response.ok) {
            throw new Error(`Erreur serveur: ${response.status}`);
        }

        return response.json();
    }

    scheduleRetry(deviceId) {
        const delay = this.calculateCooldown(deviceId);
        const attempts = this.retryAttempts.get(deviceId) || 0;
        
        console.log(`🔄 Nouvelle tentative programmée dans ${delay / 1000}s (tentative ${attempts}/${this.maxRetries})`);
        
        setTimeout(() => {
            console.log('🔄 Tentative de réinitialisation des notifications...');
            this.initializeNotifications();
        }, delay);
    }

    scheduleReset(deviceId) {
        const resetDelay = 30 * 60 * 1000; // 30 minutes
        console.log(`🕐 Réinitialisation complète programmée dans ${resetDelay / 60000} minutes`);
        
        setTimeout(() => {
            console.log('🔄 Réinitialisation complète des compteurs');
            this.resetRetryCount(deviceId);
            this.initializeNotifications();
        }, resetDelay);
    }

    forceReset(deviceId = null) {
        const id = deviceId || this.getDeviceId();
        this.resetRetryCount(id);
        this.isInitializing = false;
        console.log('🔄 Réinitialisation forcée effectuée');
    }

    getStatus(deviceId = null) {
        const id = deviceId || this.getDeviceId();
        const attempts = this.retryAttempts.get(id) || 0;
        const lastAttempt = this.lastAttemptTime.get(id);
        const inCooldown = this.isInCooldown(id);
        const reachedLimit = this.hasReachedRetryLimit(id);

        return {
            deviceId: id,
            attempts,
            maxRetries: this.maxRetries,
            lastAttempt: lastAttempt ? new Date(lastAttempt).toISOString() : null,
            inCooldown,
            reachedLimit,
            isInitializing: this.isInitializing,
            nextRetryIn: inCooldown ? this.calculateCooldown(id) - (Date.now() - lastAttempt) : 0
        };
    }
}

// Instance singleton pour React
const notificationManager = new NotificationManager();

export default notificationManager;