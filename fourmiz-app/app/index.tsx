impor�t� { SafeAreaView, �t�ex�t� } from 'reac�t�-na�t�ive';
impor�t� { rou�t�er } from 'expo-rou�t�er';

expor�t� defaul�t� func�t�ion IndexScr��een() {
  re�t�urn (
    <SafeAreaView s�t�yle={{ flex: 1, jus�t�ifyCon�t�en�t�: 'cen�t�er', alignI�t�ems: 'cen�t�er' }}>
      <�t�ex�t�>Index Scr��een</�t�ex�t�>
      <�t�ouchableOpaci�t�y onPress={() => rou�t�er.push('/au�t�h/login')}>
        <�t�ex�t�>Aller ? la connexion</�t�ex�t�>
      </�t�ouchableOpaci�t�y>
    </SafeAreaView>
  );
}

