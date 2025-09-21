// components/TestReferralComponent.tsx
// 🔧 COMPOSANT TEMPORAIRE POUR DÉBUGGER LES CODES DE PARRAINAGE

import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { supabase } from '../lib/supabase';

export const TestReferralComponent: React.FC = () => {
  const [testCode, setTestCode] = useState('5B2X5F');
  const [logs, setLogs] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [`${timestamp}: ${message}`, ...prev].slice(0, 50));
    console.log(message);
  };

  const clearLogs = () => {
    setLogs([]);
  };

  // Test 1: Vérifier si les tables existent 
  const testTablesExist = async () => {
    addLog('🔍 Test existence des tables...');
    
    try {
      // Test table referral_codes
      const { data: refData, error: refError } = await supabase
        .from('referral_codes')
        .select('count')
        .limit(1);
      
      if (refError) {
        addLog(`❌ Table referral_codes: ${refError.message}`);
      } else {
        addLog('✅ Table referral_codes existe');
      }

      // Test table push_tokens
      const { data: pushData, error: pushError } = await supabase
        .from('push_tokens')
        .select('count')
        .limit(1);
      
      if (pushError) {
        addLog(`❌ Table push_tokens: ${pushError.message}`);
      } else {
        addLog('✅ Table push_tokens existe');
      }

    } catch (error) {
      addLog(`💥 Erreur test tables: ${error}`);
    }
  };

  // Test 2: Lister les codes existants
  const listExistingCodes = async () => {
    addLog('📋 Liste des codes existants...');
    
    try {
      const { data, error } = await supabase
        .from('referral_codes')
        .select('*')
        .limit(10);
      
      if (error) {
        addLog(`❌ Erreur liste codes: ${error.message}`);
        return;
      }

      if (!data || data.length === 0) {
        addLog('⚠️ Aucun code de parrainage trouvé');
        return;
      }

      addLog(`📊 ${data.length} codes trouvés:`);
      data.forEach(code => {
        addLog(`  - Code: ${code.code}, Actif: ${code.is_active}, User: ${code.user_id?.substring(0, 8)}...`);
      });

    } catch (error) {
      addLog(`💥 Exception liste codes: ${error}`);
    }
  };

  // Test 3: Chercher le code spécifique
  const searchSpecificCode = async (code: string) => {
    addLog(`🔍 Recherche du code: ${code}`);
    
    try {
      const cleanCode = code.trim().toUpperCase();
      
      const { data, error } = await supabase
        .from('referral_codes')
        .select('*')
        .eq('code', cleanCode);
      
      if (error) {
        addLog(`❌ Erreur recherche: ${error.message} (Code: ${error.code})`);
        return;
      }

      if (!data || data.length === 0) {
        addLog(`🔍 Code ${cleanCode} introuvable`);
        return;
      }

      addLog(`✅ Code ${cleanCode} trouvé!`);
      addLog(`   User ID: ${data[0].user_id}`);
      addLog(`   Actif: ${data[0].is_active}`);
      addLog(`   Créé: ${data[0].created_at}`);

    } catch (error) {
      addLog(`💥 Exception recherche: ${error}`);
    }
  };

  // Test 4: Créer le code manquant 
  const createMissingCode = async () => {
    addLog('🔨 Création du code 5B2X5F...');
    
    try {
      // Récupérer l'utilisateur connecté
      const { data: authData, error: authError } = await supabase.auth.getUser();
      
      if (authError || !authData.user) {
        addLog('❌ Aucun utilisateur connecté');
        return;
      }

      const userId = authData.user.id;
      addLog(`👤 Utilisateur connecté: ${userId.substring(0, 8)}...`);

      // Créer le code
      const { data, error } = await supabase
        .from('referral_codes')
        .insert({
          user_id: userId,
          code: '5B2X5F',
          is_active: true
        })
        .select()
        .single();

      if (error) {
        addLog(`❌ Erreur création: ${error.message}`);
        
        if (error.code === '23505') {
          addLog('🔄 Le code existe déjà - tentative de mise à jour...');
          
          const { error: updateError } = await supabase
            .from('referral_codes')
            .update({ is_active: true })
            .eq('code', '5B2X5F');
          
          if (updateError) {
            addLog(`❌ Erreur mise à jour: ${updateError.message}`);
          } else {
            addLog('✅ Code réactivé avec succès');
          }
        }
        return;
      }

      addLog('✅ Code 5B2X5F créé avec succès!');

    } catch (error) {
      addLog(`💥 Exception création: ${error}`);
    }
  };

  // Test 5: Test complet de validation
  const fullValidationTest = async (code: string) => {
    addLog(`🧪 Test complet de validation: ${code}`);
    
    try {
      const cleanCode = code.trim().toUpperCase();
      
      // Étape 1: Chercher le code
      const { data, error } = await supabase
        .from('referral_codes')
        .select('*')
        .eq('code', cleanCode)
        .eq('is_active', true)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          addLog('🔍 Résultat: Code introuvable');
        } else {
          addLog(`❌ Résultat: Erreur DB - ${error.message}`);
        }
        return;
      }

      addLog('✅ Résultat: Code valide!');
      addLog(`   Propriétaire: ${data.user_id}`);
      
      // Étape 2: Vérifier que le propriétaire existe
      const { data: userData, error: userError } = await supabase.auth.admin.getUserById(data.user_id);
      
      if (userError) {
        addLog('⚠️ Impossible de vérifier le propriétaire');
      } else {
        addLog(`✅ Propriétaire confirmé: ${userData.user.email}`);
      }

    } catch (error) {
      addLog(`💥 Exception validation: ${error}`);
    }
  };

  // Lancer tous les tests
  const runAllTests = async () => {
    if (isLoading) return;
    
    setIsLoading(true);
    clearLogs();
    
    addLog('🚀 Début des tests de diagnostic...');
    
    await testTablesExist();
    await listExistingCodes();
    await searchSpecificCode(testCode);
    await fullValidationTest(testCode);
    
    addLog('🎉 Tests terminés!');
    setIsLoading(false);
  };

  return (
    <View style={{ flex: 1, padding: 20, backgroundColor: '#f5f5f5' }}>
      <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' }}>
        🔧 Diagnostic Parrainage
      </Text>

      {/* Input du code à tester */}
      <View style={{ marginBottom: 20 }}>
        <Text style={{ marginBottom: 5, fontWeight: 'bold' }}>Code à tester:</Text>
        <TextInput 
          style={{
            borderWidth: 1,
            borderColor: '#ddd',
            padding: 15,
            borderRadius: 8,
            backgroundColor: 'white',
            fontSize: 16,
          }}
          value={testCode}
          onChangeText={setTestCode}
          placeholder="Entrez le code"
          autoCapitalize="characters"
        />
      </View>

      {/* Boutons d'action */}
      <View style={{ flexDirection: 'row', marginBottom: 20, gap: 10 }}>
        <TouchableOpacity
          style={{
            flex: 1,
            backgroundColor: isLoading ? '#ccc' : '#2196F3',
            padding: 15,
            borderRadius: 8,
          }}
          onPress={runAllTests}
          disabled={isLoading}
        >
          <Text style={{ color: 'white', textAlign: 'center', fontWeight: 'bold' }}>
            {isLoading ? 'Tests...' : 'Tous les tests'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={{
            flex: 1,
            backgroundColor: '#FF9800',
            padding: 15,
            borderRadius: 8,
          }}
          onPress={createMissingCode}
        >
          <Text style={{ color: 'white', textAlign: 'center', fontWeight: 'bold' }}>
            Créer 5B2X5F
          </Text>
        </TouchableOpacity>
      </View>

      <View style={{ flexDirection: 'row', marginBottom: 20, gap: 10 }}>
        <TouchableOpacity
          style={{
            flex: 1,
            backgroundColor: '#4CAF50',
            padding: 10,
            borderRadius: 8,
          }}
          onPress={() => searchSpecificCode(testCode)}
        >
          <Text style={{ color: 'white', textAlign: 'center', fontSize: 12 }}>
            Chercher code
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={{
            flex: 1,
            backgroundColor: '#9C27B0',
            padding: 10,
            borderRadius: 8,
          }}
          onPress={listExistingCodes}
        >
          <Text style={{ color: 'white', textAlign: 'center', fontSize: 12 }}>
            Lister codes
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={{
            flex: 1,
            backgroundColor: '#607D8B',
            padding: 10,
            borderRadius: 8,
          }}
          onPress={clearLogs}
        >
          <Text style={{ color: 'white', textAlign: 'center', fontSize: 12 }}>
            Effacer
          </Text>
        </TouchableOpacity>
      </View>

      {/* Zone de logs */}
      <View style={{ flex: 1 }}>
        <Text style={{ fontWeight: 'bold', marginBottom: 10 }}>📝 Logs de diagnostic:</Text>
        <ScrollView 
          style={{ 
            flex: 1, 
            backgroundColor: '#1a1a1a', 
            padding: 15,
            borderRadius: 8 
          }}
        >
          {logs.map((log, index) => (
            <Text 
              key={index} 
              style={{ 
                color: log.includes('❌') ? '#ff6b6b' : 
                       log.includes('✅') ? '#51cf66' : 
                       log.includes('⚠️') ? '#ffd43b' : '#74c0fc',
                fontSize: 12,
                marginBottom: 3,
                fontFamily: 'monospace'
              }}
            >
              {log}
            </Text>
          ))}
          {logs.length === 0 && (
            <Text style={{ color: '#888', fontStyle: 'italic' }}>
              Appuyez sur "Tous les tests" pour commencer le diagnostic
            </Text>
          )}
        </ScrollView>
      </View>
    </View>
  );
};

export default TestReferralComponent;