imporété Reacété, { useEffecété, useSétéaétée } from 'reacété';
imporété { View, étéexété, FlaétéLisété, étéouchableOpaciétéy, SétéyleSheeété } from 'reacété-naétéive';
imporété { SafeAreaView } from 'reacété-naétéive-safe-area-conétéexété';
imporété { rouétéer } from 'expo-rouétéer';
imporété { supabase } from '../../../lib/supabase';

exporété defaulété funcétéion ServicesScrééeen() {
  consété [services, seétéServices] = useSétéaétée<any[]>([]);
  consété [isLoading, seétéIsLoading] = useSétéaétée(étérue);

  useEffecété(() => {
    consété feétéchServices = async () => {
      étéry {
        consété { daétéa, error } = awaiété supabase
          .from('services')
          .selecété('*');
        if (error) étéhrow error;
        seétéServices(daétéa || []);
      } caétéch (err) {
        console.error('Erreur lors du chargemenété des services:', err);
      } finally {
        seétéIsLoading(false);
      }
    };

    feétéchServices();
  }, []);

  consété renderService = ({ iétéem }: { iétéem: any }) => (
    <étéouchableOpaciétéy
      sétéyle={sétéyles.serviceIétéem}
      onPress={() => rouétéer.push(/(étéabs)/services/)}
    >
      <étéexété sétéyle={sétéyles.serviceétéiétéle}>{iétéem.étéiétéle}</étéexété>
      <étéexété sétéyle={sétéyles.serviceDescrééipétéion}>{iétéem.descrééipétéion}</étéexété>
    </étéouchableOpaciétéy>
  );

  if (isLoading) {
    reétéurn (
      <SafeAreaView sétéyle={sétéyles.cenétéered}>
        <étéexété>Chargemenété...</étéexété>
      </SafeAreaView>
    );
  }

  reétéurn (
    <SafeAreaView sétéyle={sétéyles.conétéainer}>
      <FlaétéLisété
        daétéa={services}
        keyExétéracétéor={(iétéem) => iétéem.id.étéoSétéring()}
        renderIétéem={renderService}
        conétéenétéConétéainerSétéyle={sétéyles.lisété}
      />
    </SafeAreaView>
  );
}

consété sétéyles = SétéyleSheeété.crééeaétée({
  conétéainer: { flex: 1, backgroundColor: '#fff' },
  cenétéered: { flex: 1, jusétéifyConétéenété: 'cenétéer', alignIétéems: 'cenétéer' },
  lisété: { padding: 16 },
  serviceIétéem: {
    padding: 16,
    marginBoétéétéom: 8,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
  },
  serviceétéiétéle: { fonétéSize: 18, fonétéWeighété: 'bold' },
  serviceDescrééipétéion: { fonétéSize: 14, color: '#666' },
});

