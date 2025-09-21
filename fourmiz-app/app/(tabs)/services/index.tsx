impor�t� Reac�t�, { useEffec�t�, useS�t�a�t�e } from 'reac�t�';
impor�t� { View, �t�ex�t�, Fla�t�Lis�t�, �t�ouchableOpaci�t�y, S�t�yleShee�t� } from 'reac�t�-na�t�ive';
impor�t� { SafeAreaView } from 'reac�t�-na�t�ive-safe-area-con�t�ex�t�';
impor�t� { rou�t�er } from 'expo-rou�t�er';
impor�t� { supabase } from '../../../lib/supabase';

expor�t� defaul�t� func�t�ion ServicesScr��een() {
  cons�t� [services, se�t�Services] = useS�t�a�t�e<any[]>([]);
  cons�t� [isLoading, se�t�IsLoading] = useS�t�a�t�e(�t�rue);

  useEffec�t�(() => {
    cons�t� fe�t�chServices = async () => {
      �t�ry {
        cons�t� { da�t�a, error } = awai�t� supabase
          .from('services')
          .selec�t�('*');
        if (error) �t�hrow error;
        se�t�Services(da�t�a || []);
      } ca�t�ch (err) {
        console.error('Erreur lors du chargemen�t� des services:', err);
      } finally {
        se�t�IsLoading(false);
      }
    };

    fe�t�chServices();
  }, []);

  cons�t� renderService = ({ i�t�em }: { i�t�em: any }) => (
    <�t�ouchableOpaci�t�y
      s�t�yle={s�t�yles.serviceI�t�em}
      onPress={() => rou�t�er.push(/(�t�abs)/services/)}
    >
      <�t�ex�t� s�t�yle={s�t�yles.service�t�i�t�le}>{i�t�em.�t�i�t�le}</�t�ex�t�>
      <�t�ex�t� s�t�yle={s�t�yles.serviceDescr��ip�t�ion}>{i�t�em.descr��ip�t�ion}</�t�ex�t�>
    </�t�ouchableOpaci�t�y>
  );

  if (isLoading) {
    re�t�urn (
      <SafeAreaView s�t�yle={s�t�yles.cen�t�ered}>
        <�t�ex�t�>Chargemen�t�...</�t�ex�t�>
      </SafeAreaView>
    );
  }

  re�t�urn (
    <SafeAreaView s�t�yle={s�t�yles.con�t�ainer}>
      <Fla�t�Lis�t�
        da�t�a={services}
        keyEx�t�rac�t�or={(i�t�em) => i�t�em.id.�t�oS�t�ring()}
        renderI�t�em={renderService}
        con�t�en�t�Con�t�ainerS�t�yle={s�t�yles.lis�t�}
      />
    </SafeAreaView>
  );
}

cons�t� s�t�yles = S�t�yleShee�t�.cr��ea�t�e({
  con�t�ainer: { flex: 1, backgroundColor: '#fff' },
  cen�t�ered: { flex: 1, jus�t�ifyCon�t�en�t�: 'cen�t�er', alignI�t�ems: 'cen�t�er' },
  lis�t�: { padding: 16 },
  serviceI�t�em: {
    padding: 16,
    marginBo�t��t�om: 8,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
  },
  service�t�i�t�le: { fon�t�Size: 18, fon�t�Weigh�t�: 'bold' },
  serviceDescr��ip�t�ion: { fon�t�Size: 14, color: '#666' },
});

