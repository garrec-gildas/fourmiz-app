import { cancelExpiredAuthorizations } from '../services/payment-expiry.service';
import cron from 'node-cron';

// Tous les jours à 2h du matin
cron.schedule('0 2 * * *', async () => {
  console.log('🕐 Nettoyage autorisations expirées...');
  try {
    const result = await cancelExpiredAuthorizations();
    console.log(`✅ Nettoyage terminé: ${result.successfulCancellations} annulées`);
  } catch (error) {
    console.error('❌ Erreur nettoyage:', error);
  }
});