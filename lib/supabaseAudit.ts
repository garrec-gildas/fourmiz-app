// lib/supabaseAudit.ts - AUDIT COMPLET SUPABASE
import { supabase } from './supabase';

export const auditSupabaseTables = async () => {
  console.log(' === DÉBUT AUDIT SUPABASE ===');
  
  const expectedTables = [
    'profiles', 'orders', 'services_gains', 'commandes', 'missions', 
    'reviews', 'ratings', 'commission_rates', 'services', 'chats', 'notifications'
  ];

  const auditResults = {
    existingTables: [],
    missingTables: [],
    tableStructures: {},
    errors: []
  };

  //  ÉTAPE 1: Test existence tables
  console.log('\n === VÉRIFICATION EXISTENCE TABLES ===');
  
  for (const tableName of expectedTables) {
    try {
      console.log(` Test table: ${tableName}`);
      
      const { data, error, count } = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        console.log(` Table ${tableName}: ${error.message}`);
        auditResults.missingTables.push({ 
          table: tableName, 
          error: error.message,
          code: error.code 
        });
      } else {
        console.log(` Table ${tableName}: ${count} lignes`);
        auditResults.existingTables.push({ 
          table: tableName, 
          rowCount: count 
        });
      }
    } catch (err) {
      console.log(` Erreur critique ${tableName}:`, err);
      auditResults.errors.push({ 
        table: tableName, 
        error: err.message 
      });
    }
  }

  //  ÉTAPE 2: Analyser structures
  console.log('\n === ANALYSE STRUCTURE TABLES ===');
  
  for (const tableInfo of auditResults.existingTables) {
    const tableName = tableInfo.table;
    
    try {
      console.log(`\n Structure de ${tableName}:`);
      
      const { data: sample, error: sampleError } = await supabase
        .from(tableName)
        .select('*')
        .limit(1);
      
      if (sampleError) {
        console.log(` Erreur échantillon ${tableName}:`, sampleError.message);
        continue;
      }
      
      if (sample && sample.length > 0) {
        const columns = Object.keys(sample[0]);
        console.log(` Colonnes (${columns.length}):`, columns.join(', '));
        
        auditResults.tableStructures[tableName] = {
          columns: columns,
          sampleData: sample[0]
        };
        
        // Analyser types
        const columnTypes = {};
        Object.entries(sample[0]).forEach(([key, value]) => {
          columnTypes[key] = {
            type: typeof value,
            value: value,
            isNull: value === null
          };
        });
        
        console.log(` Types de données:`, columnTypes);
        auditResults.tableStructures[tableName].columnTypes = columnTypes;
        
      } else {
        console.log(` Table ${tableName} vide`);
        auditResults.tableStructures[tableName] = {
          columns: [],
          isEmpty: true
        };
      }
      
    } catch (err) {
      console.log(` Erreur structure ${tableName}:`, err);
    }
  }

  //  ÉTAPE 3: Vérifications spécifiques
  console.log('\n === VÉRIFICATIONS SPÉCIFIQUES APP ===');
  
  // Profiles
  if (auditResults.existingTables.find(t => t.table === 'profiles')) {
    console.log('\n Analyse table PROFILES:');
    
    try {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .limit(3);
      
      if (!error && profiles) {
        console.log(` ${profiles.length} profils trouvés`);
        
        const criticalColumns = [
          'user_id', 'firstname', 'lastname', 'email', 'phone',
          'roles', 'avatar_url', 'id_document_path', 'address',
          'city', 'postal_code', 'profile_completed'
        ];
        
        const firstProfile = profiles[0];
        const missingColumns = criticalColumns.filter(col => !(col in firstProfile));
        const existingColumns = criticalColumns.filter(col => col in firstProfile);
        
        console.log(` Colonnes critiques présentes (${existingColumns.length}):`, existingColumns);
        if (missingColumns.length > 0) {
          console.log(` Colonnes critiques manquantes (${missingColumns.length}):`, missingColumns);
        }
        
        // Analyser rôles
        const rolesAnalysis = profiles.map(p => ({
          id: p.id,
          roles: p.roles,
          rolesType: typeof p.roles,
          rolesLength: Array.isArray(p.roles) ? p.roles.length : 'not array'
        }));
        console.log(` Analyse des rôles:`, rolesAnalysis);
        
      }
    } catch (err) {
      console.log(' Erreur analyse profiles:', err);
    }
  }

  // Orders
  if (auditResults.existingTables.find(t => t.table === 'orders')) {
    console.log('\n Analyse table ORDERS:');
    
    try {
      const { data: orders, error } = await supabase
        .from('orders')
        .select('*')
        .limit(3);
      
      if (!error && orders) {
        console.log(` ${orders.length} commandes trouvées`);
        
        const orderColumns = [
          'id', 'client_id', 'fourmiz_id', 'status', 'proposed_amount',
          'rating', 'urgency_surcharge', 'commission', 'created_at'
        ];
        
        const firstOrder = orders[0];
        const missingOrderColumns = orderColumns.filter(col => !(col in firstOrder));
        const existingOrderColumns = orderColumns.filter(col => col in firstOrder);
        
        console.log(` Colonnes orders présentes (${existingOrderColumns.length}):`, existingOrderColumns);
        if (missingOrderColumns.length > 0) {
          console.log(` Colonnes orders manquantes (${missingOrderColumns.length}):`, missingOrderColumns);
        }
        
        const statusList = [...new Set(orders.map(o => o.status))];
        console.log(` Statuts utilisés:`, statusList);
        
      }
    } catch (err) {
      console.log(' Erreur analyse orders:', err);
    }
  }

  // Services_gains
  if (auditResults.existingTables.find(t => t.table === 'services_gains')) {
    console.log('\n Analyse table SERVICES_GAINS:');
    
    try {
      const { data: gains, error } = await supabase
        .from('services_gains')
        .select('*')
        .limit(3);
      
      if (!error && gains) {
        console.log(` ${gains.length} gains trouvés`);
        console.log(` Première ligne:`, gains[0]);
      } else {
        console.log(' Table services_gains vide ou erreur:', error?.message);
      }
    } catch (err) {
      console.log(' Erreur analyse services_gains:', err);
    }
  }

  //  ÉTAPE 4: Storage buckets
  console.log('\n === VÉRIFICATION STORAGE BUCKETS ===');
  
  const expectedBuckets = ['avatars', 'user-documents'];
  
  for (const bucketName of expectedBuckets) {
    try {
      console.log(`\n Test bucket: ${bucketName}`);
      
      const { data: files, error } = await supabase.storage
        .from(bucketName)
        .list('', { limit: 3 });
      
      if (error) {
        console.log(` Bucket ${bucketName}: ${error.message}`);
      } else {
        console.log(` Bucket ${bucketName}: ${files.length} fichiers/dossiers`);
        if (files.length > 0) {
          console.log(` Premiers éléments:`, files.map(f => f.name));
        }
      }
    } catch (err) {
      console.log(` Erreur bucket ${bucketName}:`, err);
    }
  }

  //  ÉTAPE 5: Résumé
  console.log('\n === RÉSUMÉ AUDIT ===');
  console.log(` Tables existantes: ${auditResults.existingTables.length}`);
  console.log(` Tables manquantes: ${auditResults.missingTables.length}`);
  console.log(` Erreurs critiques: ${auditResults.errors.length}`);
  
  if (auditResults.missingTables.length > 0) {
    console.log('\n TABLES MANQUANTES:');
    auditResults.missingTables.forEach(missing => {
      console.log(`- ${missing.table}: ${missing.error}`);
    });
  }
  
  if (auditResults.errors.length > 0) {
    console.log('\n ERREURS CRITIQUES:');
    auditResults.errors.forEach(err => {
      console.log(`- ${err.table}: ${err.error}`);
    });
  }

  console.log('\n === FIN AUDIT SUPABASE ===');
  
  return auditResults;
};

//  Fonction d'export pour utilisation dans l'app
export const runSupabaseAudit = async () => {
  try {
    const results = await auditSupabaseTables();
    
    return {
      success: true,
      summary: ` Tables: ${results.existingTables.length} |  Manquantes: ${results.missingTables.length} |  Erreurs: ${results.errors.length}`,
      results
    };
  } catch (error) {
    console.error(' Erreur audit:', error);
    return {
      success: false,
      error: error.message
    };
  }
};
