// lib/profileCompletion.js - VERSION AVEC DEBUG
// 🎯 Correction du problème Client → Fourmiz avec logs détaillés

export const checkProfileCompletionStatus = (profile) => {
  console.log('🔍 === DEBUG VÉRIFICATION PROFIL ===');
  console.log('📊 Profil reçu:', profile);
  
  if (!profile) {
    console.log('❌ Pas de profil trouvé');
    return { needsCompletion: false, type: 'none' };
  }

  const isClient = profile.roles?.includes('client') || false;
  const isFourmiz = profile.roles?.includes('fourmiz') || false;
  
  console.log('📊 Rôles détectés:', { isClient, isFourmiz });
  console.log('🔍 Champs Fourmiz dans le profil:');
  console.log('   - rib:', profile.rib);
  console.log('   - id_document_path:', profile.id_document_path);
  console.log('   - fourmiz_profile_completed:', profile.fourmiz_profile_completed);

  // Client qui vient de devenir Fourmiz
  if (isClient && isFourmiz) {
    console.log('🐜 Transition Client → Fourmiz détectée');
    
    // ✅ VÉRIFICATION CORRIGÉE : Utiliser les vrais champs de la DB
    const fourmizComplete = profile.rib && 
                           profile.id_document_path &&
                           profile.fourmiz_profile_completed === true;
    
    console.log('📋 Vérification profil Fourmiz:');
    console.log('   - RIB présent:', !!profile.rib);
    console.log('   - Document ID présent:', !!profile.id_document_path);
    console.log('   - Marqué comme complet:', profile.fourmiz_profile_completed);
    console.log('   - Résultat final:', fourmizComplete);
    
    if (!fourmizComplete) {
      console.log('➡️ Redirection vers complétion Fourmiz');
      return { 
        needsCompletion: true, 
        type: 'fourmiz_upgrade',
        currentRoles: { isClient, isFourmiz }
      };
    } else {
      console.log('✅ Profil Fourmiz complet, pas de redirection');
    }
  }

  // Seulement Fourmiz (nouveau)
  if (isFourmiz && !isClient) {
    const fourmizComplete = profile.rib && profile.id_document_path;
    
    if (!fourmizComplete) {
      console.log('➡️ Nouveau Fourmiz - complétion requise');
      return { needsCompletion: true, type: 'fourmiz_only' };
    }
  }

  // Seulement Client (nouveau)
  if (isClient && !isFourmiz) {
    // Vérifier les champs client selon votre structure
    const clientComplete = profile.firstname && profile.lastname && profile.phone;
    
    if (!clientComplete) {
      console.log('➡️ Nouveau Client - complétion requise');
      return { needsCompletion: true, type: 'client_only' };
    }
  }

  console.log('✅ Profil complet, pas de redirection');
  return { needsCompletion: false, type: 'complete' };
};

export const redirectToAppropriateCompletion = (completionStatus, router) => {
  console.log('🎯 Tentative de redirection:', completionStatus);
  
  if (!completionStatus.needsCompletion) {
    console.log('ℹ️ Pas de redirection nécessaire');
    return;
  }

  try {
    switch (completionStatus.type) {
      case 'fourmiz_upgrade':
        console.log('🚀 Redirection Client → Fourmiz');
        // Essayer d'abord la route spécifique
        router.push('/auth/complete-profile-fourmiz');
        break;
        
      case 'fourmiz_only':
        console.log('🚀 Redirection Fourmiz seul');
        router.push('/auth/complete-profile?type=fourmiz');
        break;
        
      case 'client_only':
        console.log('🚀 Redirection Client seul');
        router.push('/auth/complete-profile?type=client');
        break;
        
      default:
        console.log('❓ Type de redirection inconnu:', completionStatus.type);
        // Fallback vers la page générale
        router.push('/auth/complete-profile');
    }
  } catch (error) {
    console.error('💥 Erreur lors de la redirection:', error);
    // Fallback en cas d'erreur
    router.push('/auth/complete-profile');
  }
};