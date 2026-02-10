import { MaterialCommunityIcons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImageManipulator from 'expo-image-manipulator';
import * as MediaLibrary from 'expo-media-library';

// MANTENDO A IMPORTAÇÃO LEGACY QUE FUNCIONOU
import * as FileSystem from 'expo-file-system/legacy';

import { useNavigation, useRoute } from '@react-navigation/native';
import { decode } from 'base64-arraybuffer';
import { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { COLORS, FONTS } from '../../styles/theme';

export default function MissionDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { mission, profile } = route.params;

  const [permission, requestPermission] = useCameraPermissions();
  const [mediaPermission, requestMediaPermission] = MediaLibrary.usePermissions();
  
  const cameraRef = useRef(null);
  const [photo, setPhoto] = useState(null);
  const [facing, setFacing] = useState('back');
  
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    (async () => {
        if (permission && !permission.granted) await requestPermission();
        if (mediaPermission && !mediaPermission.granted) await requestMediaPermission();
    })();
  }, [permission, mediaPermission]);

  if (!permission) {
    return <View style={styles.loadingContainer}><ActivityIndicator color={COLORS.primary}/></View>;
  }

  if (!permission.granted) {
    return (
        <View style={styles.container}>
            <Text style={styles.permText}>Precisamos da câmera para provar a missão!</Text>
            <TouchableOpacity onPress={requestPermission} style={styles.btnPermission}>
                <Text style={styles.btnPermissionText}>Permitir Câmera</Text>
            </TouchableOpacity>
        </View>
    );
  }

  const takePicture = async () => {
    if (cameraRef.current) {
        try {
            const data = await cameraRef.current.takePictureAsync({
                quality: 0.5, 
                skipProcessing: false, 
                exif: false,
            });
            console.log("Foto tirada:", data.uri);
            setPhoto(data);
        } catch (e) {
            Alert.alert("Erro", "Não foi possível tirar a foto.");
        }
    }
  };

  const handleSubmitMission = async () => {
      if (!photo) return;
      setUploading(true);

      try {
          // 1. Salvar na Galeria (Opcional)
          try {
             if (mediaPermission && mediaPermission.granted) {
                 await MediaLibrary.saveToLibraryAsync(photo.uri);
             }
          } catch (e) { console.log("Aviso Galeria:", e); }

          // 2. Redimensionar
          const manipResult = await ImageManipulator.manipulateAsync(
              photo.uri,
              [{ resize: { width: 800 } }],
              { compress: 0.5, format: ImageManipulator.SaveFormat.JPEG }
          );

          // 3. Ler arquivo como BASE64 (Legacy)
          const base64 = await FileSystem.readAsStringAsync(manipResult.uri, {
              encoding: 'base64', 
          });

          // 4. Converter para ArrayBuffer
          const arrayBuffer = decode(base64);

          // 5. Configurar Caminho
          const fileExt = 'jpg';
          const fileName = `${Date.now()}_${profile.id}.${fileExt}`;
          const filePath = `${profile.family_id}/${fileName}`; 

          // 6. Upload
          const { error: uploadError } = await supabase.storage
            .from('mission-proofs')
            .upload(filePath, arrayBuffer, {
                contentType: 'image/jpeg',
                upsert: false
            });

          if (uploadError) {
              console.error("Erro Upload Supabase:", uploadError);
              throw uploadError;
          }

          // 7. Salvar no Banco (CORRIGIDO: REMOVIDO photo_local_uri)
          const { error: dbError } = await supabase
            .from('mission_attempts')
            .insert([{
                mission_id: mission.id,
                profile_id: profile.id,
                status: 'pending', 
                proof_url: filePath
                // REMOVIDO: photo_local_uri (Pois não existe no banco)
            }]);

          if (dbError) throw dbError;

          Alert.alert("ENVIADO! 🚀", "O Capitão vai analisar sua prova.", [
              { text: "OK", onPress: () => navigation.goBack() }
          ]);

      } catch (error) {
          Alert.alert("Erro no envio", "Verifique sua internet.\n" + (error.message || ""));
          console.log("Erro Catch:", error);
      } finally {
          setUploading(false);
      }
  };

  const toggleCameraType = () => {
      setFacing(current => (current === 'back' ? 'front' : 'back'));
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <MaterialCommunityIcons name="close" size={28} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>PROVAR MISSÃO</Text>
          <View style={{width: 28}} />
      </View>

      <ScrollView contentContainerStyle={{flexGrow: 1}} showsVerticalScrollIndicator={false}>
          <View style={styles.infoCard}>
              <View style={[styles.iconBox, {backgroundColor: mission.reward_type === 'custom' ? '#8B5CF6' : COLORS.primary}]}>
                  <MaterialCommunityIcons name={mission.icon || "star"} size={40} color="#fff" />
              </View>
              <Text style={styles.missionTitle}>{mission.title}</Text>
              
              <View style={styles.rewardTag}>
                  {mission.reward_type === 'custom' ? (
                      <>
                        <MaterialCommunityIcons name="gift" size={16} color="#fff" />
                        <Text style={styles.rewardText}>{mission.custom_reward}</Text>
                      </>
                  ) : (
                      <>
                        <MaterialCommunityIcons name="circle-multiple" size={16} color="#fff" />
                        <Text style={styles.rewardText}>+{mission.reward} MOEDAS</Text>
                      </>
                  )}
              </View>
              <Text style={styles.description}>
                  {mission.description || "Tire uma foto para provar que completou esta tarefa."}
              </Text>
          </View>

          <View style={styles.cameraContainer}>
              {photo ? (
                  <View style={styles.previewContainer}>
                      <Image source={{ uri: photo.uri }} style={styles.previewImage} />
                      <TouchableOpacity style={styles.retakeBtn} onPress={() => setPhoto(null)}>
                          <MaterialCommunityIcons name="camera-retake" size={24} color="#fff" />
                          <Text style={styles.retakeText}>Tirar Outra</Text>
                      </TouchableOpacity>
                  </View>
              ) : (
                  <View style={{flex: 1, position: 'relative'}}>
                      <CameraView 
                        ref={cameraRef}
                        style={StyleSheet.absoluteFill} 
                        facing={facing}
                      />
                      <View style={styles.cameraOverlay}>
                          <TouchableOpacity style={styles.flipBtn} onPress={toggleCameraType}>
                              <MaterialCommunityIcons name="camera-flip" size={24} color="#fff" />
                          </TouchableOpacity>
                      </View>
                  </View>
              )}
          </View>
      </ScrollView>

      <View style={styles.footer}>
          {photo ? (
              <TouchableOpacity style={styles.submitBtn} onPress={handleSubmitMission} disabled={uploading}>
                  {uploading ? (
                      <ActivityIndicator color="#fff" />
                  ) : (
                      <>
                          <Text style={styles.submitText}>ENVIAR PROVA</Text>
                          <MaterialCommunityIcons name="send" size={24} color="#fff" />
                      </>
                  )}
              </TouchableOpacity>
          ) : (
              <TouchableOpacity style={styles.captureBtn} onPress={takePicture}>
                  <View style={styles.captureInner} />
              </TouchableOpacity>
          )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 50 },
  headerTitle: { fontFamily: FONTS.bold, fontSize: 16, color: COLORS.textPrimary },
  backBtn: { padding: 5, backgroundColor: COLORS.surface, borderRadius: 10 },
  
  permText: { textAlign: 'center', marginTop: 50, padding: 20, fontFamily: FONTS.regular },
  btnPermission: { marginTop: 20, backgroundColor: COLORS.primary, padding: 15, borderRadius: 10, alignSelf: 'center' },
  btnPermissionText: { color: '#fff', fontWeight: 'bold' },
  
  infoCard: { alignItems: 'center', padding: 20 },
  iconBox: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 15, borderWidth: 4, borderColor: COLORS.surface, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 5, elevation: 5 },
  missionTitle: { fontFamily: FONTS.bold, fontSize: 24, color: COLORS.textPrimary, textAlign: 'center', marginBottom: 10 },
  rewardTag: { flexDirection: 'row', backgroundColor: '#10B981', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, alignItems: 'center', gap: 5, marginBottom: 15 },
  rewardText: { fontFamily: FONTS.bold, color: '#fff', fontSize: 14 },
  description: { fontFamily: FONTS.regular, fontSize: 14, color: COLORS.placeholder, textAlign: 'center', paddingHorizontal: 20 },
  
  cameraContainer: { height: 400, margin: 20, borderRadius: 24, overflow: 'hidden', backgroundColor: '#000', borderWidth: 2, borderColor: COLORS.surface, position: 'relative' },
  cameraOverlay: { position: 'absolute', bottom: 15, right: 15, zIndex: 10 }, 
  flipBtn: { padding: 10, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20 },
  
  previewContainer: { flex: 1, position: 'relative' },
  previewImage: { flex: 1, width: '100%', height: '100%', resizeMode: 'cover', backgroundColor: '#000' },
  retakeBtn: { position: 'absolute', top: 15, left: 15, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)', padding: 10, borderRadius: 20, gap: 5 },
  retakeText: { color: '#fff', fontFamily: FONTS.bold },
  
  footer: { padding: 20, paddingBottom: 40, alignItems: 'center', backgroundColor: COLORS.surface, borderTopLeftRadius: 30, borderTopRightRadius: 30 },
  captureBtn: { width: 80, height: 80, borderRadius: 40, borderWidth: 4, borderColor: COLORS.primary, padding: 4, justifyContent: 'center', alignItems: 'center' },
  captureInner: { width: '100%', height: '100%', borderRadius: 40, backgroundColor: COLORS.primary },
  submitBtn: { width: '100%', height: 60, backgroundColor: '#10B981', borderRadius: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 },
  submitText: { fontFamily: FONTS.bold, fontSize: 18, color: '#fff' },
});