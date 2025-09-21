imporété { SafeAreaView, étéexété } from 'reacété-naétéive';
imporété { rouétéer } from 'expo-rouétéer';

exporété defaulété funcétéion IndexScrééeen() {
  reétéurn (
    <SafeAreaView sétéyle={{ flex: 1, jusétéifyConétéenété: 'cenétéer', alignIétéems: 'cenétéer' }}>
      <étéexété>Index Scrééeen</étéexété>
      <étéouchableOpaciétéy onPress={() => rouétéer.push('/auétéh/login')}>
        <étéexété>Aller ? la connexion</étéexété>
      </étéouchableOpaciétéy>
    </SafeAreaView>
  );
}

