// lib/simpleReferralService.ts
// 🎯 VERSION SIMPLIFIÉE POUR DÉBUGGER LE PROBLÈME DE PARRAINAGE

import { supabase } from './supabase';

export class SimpleReferralService {
  
  // 🔍 VALIDER UN CODE - VERSION SIMPLE
  static async validateCode(code: string): Promise<{ valid: boolean; error?: string; user?: any }> {
    try {
      console.log('🔍 Validation du code:', code);
      
      if (!code || code.trim().length === 0) {
        return { valid: false, error: 'Code requis' };
      }

      const cleanCode = code.trim().toUpperCase();
      console.log('🔍 Code nettoyé:', cleanCode);

      // Chercher le code dans la table
      const { data, error } = await supabase
        .from('referral_codes')
        .select('*')
        .eq('code', cleanCode)
        .eq('is_active', true)
        .single();

      console.log('📊 Résultat recherche:', { data, error });

      if (error) {
        console.error('❌ Erreur recherche:', error);
        
        if (error.code === 'PGRST116') {
          return { valid: false, error: 'Code introuvable' };
        }
        
        return { valid: false, error: 'Erreur de validation' };
      }

      if (!data) {
        return { valid: false, error: 'Code introuvable' };
      }

      console.log('✅ Code trouvé:', data);
      return { valid: true, user: data };

    } catch (error) {
      console.error('💥 Exception validation:', error);
      return { valid: false, error: 'Erreur système' };
    }
  }

  // 🧪 TESTER LA CONNEXION À LA BASE
  static async testConnection(): Promise<void> {
    try {
      console.log('🧪 Test de connexion à Supabase...');
      
      // Test 1: Vérifier l'auth
      const { data: authData, error: authError } = await supabase.auth.getUser();
      console.log('👤 Auth status:', { user: authData.user?.id, error: authError });

      // Test 2: Vérifier l'accès à la table
      const { data: tableData, error: tableError } = await supabase
        .from('referral_codes')
        .select('count')
        .limit(1);
      
      console.log('📋 Table access:', { data: tableData, error: tableError });

      // Test 3: Lister tous les codes (pour debug)
      const { data: allCodes, error: allError } = await supabase
        .from('referral_codes')
        .select('*')
        .limit(10);
      
      console.log('📊 Tous les codes:', { count: allCodes?.length, codes: allCodes, error: allError });

    } catch (error) {
      console.error('💥 Erreur test connexion:', error);
    }
  }

  // 🆕 CRÉER UN CODE DE TEST
  static async createTestCode(userId?: string): Promise<string | null> {
    try {
      // Utiliser l'utilisateur connecté ou générer un UUID
      let targetUserId = userId;
      
      if (!targetUserId) {
        const { data: authData } = await supabase.auth.getUser();
        targetUserId = authData.user?.id;
      }

      if (!targetUserId) {
        console.error('❌ Pas d\'utilisateur connecté');
        return null;
      }

      const testCode = 'TEST' + Math.random().toString(36).substr(2, 4).toUpperCase();
      
      const { data, error } = await supabase
        .from('referral_codes')
        .insert({
          user_id: targetUserId,
          code: testCode,
          is_active: true
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Erreur création code test:', error);
        return null;
      }

      console.log('✅ Code de test créé:', testCode);
      return testCode;

    } catch (error) {
      console.error('💥 Exception création code test:', error);
      return null;
    }
  }

  // 🔧 DIAGNOSTIQUER LE PROBLÈME COMPLET
  static async diagnose(): Promise<void> {
    console.log('🩺 === DIAGNOSTIC COMPLET ===');
    
    // Test connexion
    await this.testConnection();
    
    // Test code spécifique
    const result = await this.validateCode('5B2X5F');
    console.log('🎯 Validation 5B2X5F:', result);
    
    // Créer et tester un nouveau code
    const newCode = await this.createTestCode();
    if (newCode) {
      const newResult = await this.validateCode(newCode);
      console.log('🆕 Validation nouveau code:', newResult);
    }
    
    console.log('🩺 === FIN DIAGNOSTIC ===');
  }
}

// 🚀 HOOK REACT SIMPLE
export const useSimpleReferralValidation = (code: string) => {
  const [result, setResult] = React.useState<{ valid: boolean; error?: string; loading: boolean }>({
    valid: false,
    loading: false
  });

  React.useEffect(() => {
    if (!code || code.length < 3) {
      setResult({ valid: false, loading: false });
      return;
    }

    setResult({ valid: false, loading: true });

    const validate = async () => {
      const validation = await SimpleReferralService.validateCode(code);
      setResult({
        valid: validation.valid,
        error: validation.error,
        loading: false
      });
    };

    const timer = setTimeout(validate, 500);
    return () => clearTimeout(timer);
  }, [code]);

  return result;
};

// 🧪 COMPOSANT DE DEBUG
export const ReferralDebugger: React.FC = () => {
  const [testCode, setTestCode] = React.useState('5B2X5F');
  const [results, setResults] = React.useState<string[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);

  const addLog = (message: string) => {
    setResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const runTest = async () => {
    setIsLoading(true);
    setResults([]);
    
    addLog('🚀 Début des tests...');
    
    // Test connexion
    await SimpleReferralService.testConnection();
    
    // Test validation
    const validation = await SimpleReferralService.validateCode(testCode);
    addLog(`Validation ${testCode}: ${JSON.stringify(validation)}`);
    
    // Créer code test
    const newCode = await SimpleReferralService.createTestCode();
    if (newCode) {
      addLog(`Nouveau code créé: ${newCode}`);
      const newValidation = await SimpleReferralService.validateCode(newCode);
      addLog(`Validation nouveau code: ${JSON.stringify(newValidation)}`);
    }
    
    addLog('✅ Tests terminés');
    setIsLoading(false);
  };

  return (
    <View style={{ padding: 20, backgroundColor: '#f5f5f5' }}>
      <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 20 }}>
        🩺 Debugger Parrainage
      </Text>
      
      <TextInput
        style={{
          borderWidth: 1,
          borderColor: '#ddd',
          padding: 10,
          marginBottom: 10,
          backgroundColor: 'white'
        }}
        placeholder="Code à tester"
        value={testCode}
        onChangeText={setTestCode}
      />
      
      <TouchableOpacity
        style={{
          backgroundColor: isLoading ? '#ccc' : '#2196F3',
          padding: 15,
          borderRadius: 5,
          marginBottom: 20
        }}
        onPress={runTest}
        disabled={isLoading}
      >
        <Text style={{ color: 'white', textAlign: 'center', fontWeight: 'bold' }}>
          {isLoading ? 'Test en cours...' : 'Lancer les tests'}
        </Text>
      </TouchableOpacity>
      
      <ScrollView style={{ maxHeight: 300, backgroundColor: 'black', padding: 10 }}>
        {results.map((result, index) => (
          <Text key={index} style={{ color: 'green', fontSize: 12, marginBottom: 2 }}>
            {result}
          </Text>
        ))}
      </ScrollView>
    </View>
  );
};