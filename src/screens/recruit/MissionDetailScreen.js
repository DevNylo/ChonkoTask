import { MaterialCommunityIcons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImageManipulator from 'expo-image-manipulator';
import * as MediaLibrary from 'expo-media-library';
// MANTENDO A IMPORTAÇÃO LEGACY QUE FUNCIONOU
import * as FileSystem from 'expo-file-system/legacy';

import { useNavigation, useRoute } from '@react-navigation/native';
import { decode } from 'base64-arraybuffer';
import { BlurView } from 'expo-blur'; // <--- ADICIONADO PARA O VISUAL
import { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    Image,
    ImageBackground,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { COLORS, FONTS } from '../../styles/theme';

// IMAGEM DE FUNDO (A mesma do Recruta ou outra de sua escolha)
const BACKGROUND_IMG = require('../../../assets/GenericBKG2.png'); 

const { width } = Dimensions.get('window');

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
        <ImageBackground source={BACKGROUND_IMG} style={styles.container} resizeMode="cover">
            <View style={styles.permContainer}>
                <BlurView intensity={90} tint="light" style={styles.permCard}>
                    <MaterialCommunityIcons name="camera-off" size={50} color={COLORS.error} />
                    <Text style={styles.permText}>Precisamos da câmera para provar a missão!</Text>
                    <TouchableOpacity onPress={requestPermission} style={styles.btnPermission}>
                        <Text style={styles.btnPermissionText}>PERMITIR CÂMERA</Text>
                    </TouchableOpacity>
                </BlurView>
            </View>
        </ImageBackground>
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

          // 7. Salvar no Banco
          const { error: dbError } = await supabase
            .from('mission_attempts')
            .insert([{
                mission_id: mission.id,
                profile_id: profile.id,
                status: 'pending', 
                proof_url: filePath,
                earned_value: mission.reward // Importante salvar o valor ganho
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

  const isCustom = mission.reward_type === 'custom';

  return (
    <ImageBackground source={BACKGROUND_IMG} style={styles.container} resizeMode="cover">
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      {/* HEADER */}
      <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <MaterialCommunityIcons name="close" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>PROVAR MISSÃO</Text>
          <View style={{width: 40}} /> 
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          {/* CARD DE INFORMAÇÃO (COM EFEITO VIDRO) */}
          <View style={styles.infoCardWrapper}>
              <BlurView intensity={80} tint="light" style={StyleSheet.absoluteFill} />
              <View style={styles.infoCardContent}>
                  <View style={[styles.iconBox, {backgroundColor: isCustom ? '#8B5CF6' : COLORS.primary}]}>
                      <MaterialCommunityIcons name={mission.icon || "star"} size={32} color="#fff" />
                  </View>
                  
                  <View style={{flex: 1}}>
                      <Text style={styles.missionTitle}>{mission.title}</Text>
                      <View style={styles.rewardRow}>
                          <View style={[styles.rewardBadge, isCustom ? {backgroundColor:'#F3E8FF'} : {backgroundColor:'#D1FAE5'}]}>
                              <MaterialCommunityIcons name={isCustom ? "gift" : "circle-multiple"} size={14} color={isCustom ? '#9333EA' : '#059669'} />
                              <Text style={[styles.rewardText, {color: isCustom ? '#9333EA' : '#059669'}]}>
                                  {isCustom ? mission.custom_reward : `+${mission.reward} Moedas`}
                              </Text>
                          </View>
                      </View>
                  </View>
              </View>
              {mission.description && (
                  <Text style={styles.description}>{mission.description}</Text>
              )}
          </View>

          {/* ÁREA DA CÂMERA */}
          <View style={styles.cameraSection}>
              {photo ? (
                  <View style={styles.previewContainer}>
                      <Image source={{ uri: photo.uri }} style={styles.previewImage} />
                      <TouchableOpacity style={styles.retakeBtn} onPress={() => setPhoto(null)}>
                          <MaterialCommunityIcons name="camera-retake" size={20} color="#fff" />
                          <Text style={styles.retakeText}>Tirar Outra</Text>
                      </TouchableOpacity>
                  </View>
              ) : (
                  <View style={styles.cameraWrapper}>
                      <CameraView 
                        ref={cameraRef}
                        style={StyleSheet.absoluteFill} 
                        facing={facing}
                      />
                      {/* Overlay de Guia da Câmera */}
                      <View style={styles.cameraGuide}>
                          <View style={styles.cornerTL} />
                          <View style={styles.cornerTR} />
                          <View style={styles.cornerBL} />
                          <View style={styles.cornerBR} />
                      </View>

                      <TouchableOpacity style={styles.flipBtn} onPress={toggleCameraType}>
                          <MaterialCommunityIcons name="camera-flip" size={24} color="#fff" />
                      </TouchableOpacity>
                  </View>
              )}
          </View>

          <Text style={styles.instructionText}>
              {photo ? "Ficou boa? Se sim, é só enviar!" : "Enquadre bem a tarefa realizada."}
          </Text>

      </ScrollView>

      {/* RODAPÉ COM BOTÃO DE AÇÃO */}
      <View style={styles.footer}>
          {photo ? (
              <TouchableOpacity style={styles.submitBtn} onPress={handleSubmitMission} disabled={uploading} activeOpacity={0.8}>
                  {uploading ? (
                      <ActivityIndicator color="#fff" />
                  ) : (
                      <>
                          <MaterialCommunityIcons name="send" size={24} color="#fff" />
                          <Text style={styles.submitText}>ENVIAR PROVA</Text>
                      </>
                  )}
              </TouchableOpacity>
          ) : (
              <TouchableOpacity style={styles.captureBtn} onPress={takePicture} activeOpacity={0.8}>
                  <View style={styles.captureInner} />
                  <MaterialCommunityIcons name="camera" size={32} color="#fff" style={{position:'absolute'}}/>
              </TouchableOpacity>
          )}
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F0F9FF' },
  
  // PERMISSÕES
  permContainer: { flex: 1, justifyContent: 'center', padding: 20 },
  permCard: { borderRadius: 20, padding: 30, alignItems: 'center', overflow: 'hidden' },
  permText: { textAlign: 'center', marginVertical: 20, fontFamily: FONTS.bold, fontSize: 16, color: '#1E293B' },
  btnPermission: { backgroundColor: COLORS.primary, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12 },
  btnPermissionText: { color: '#fff', fontFamily: FONTS.bold },

  // HEADER
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 50, paddingBottom: 10 },
  headerTitle: { fontFamily: FONTS.bold, fontSize: 16, color: '#FFF', textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: {width: 0, height: 1}, textShadowRadius: 3 },
  backBtn: { padding: 8, backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 12 },

  scrollContent: { padding: 20, paddingBottom: 120 },

  // INFO CARD (Glassmorphism)
  infoCardWrapper: { borderRadius: 24, overflow: 'hidden', marginBottom: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)' },
  infoCardContent: { flexDirection: 'row', padding: 15, alignItems: 'center' },
  iconBox: { width: 50, height: 50, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 15, borderWidth: 2, borderColor: 'rgba(255,255,255,0.5)' },
  missionTitle: { fontFamily: FONTS.bold, fontSize: 18, color: '#1E293B', marginBottom: 4 },
  rewardRow: { flexDirection: 'row' },
  rewardBadge: { flexDirection: 'row', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, alignItems: 'center', gap: 4 },
  rewardText: { fontFamily: FONTS.bold, fontSize: 12 },
  description: { fontFamily: FONTS.regular, fontSize: 14, color: '#475569', paddingHorizontal: 15, paddingBottom: 15, lineHeight: 20 },

  // CÂMERA
  cameraSection: { height: 450, borderRadius: 30, overflow: 'hidden', backgroundColor: '#000', borderWidth: 2, borderColor: '#fff', shadowColor: "#000", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.5, shadowRadius: 10, elevation: 10 },
  cameraWrapper: { flex: 1, position: 'relative' },
  
  // Guia Visual da Câmera (Cantos)
  cameraGuide: { ...StyleSheet.absoluteFillObject, margin: 20 },
  cornerTL: { position: 'absolute', top: 0, left: 0, width: 30, height: 30, borderTopWidth: 4, borderLeftWidth: 4, borderColor: 'rgba(255,255,255,0.5)', borderTopLeftRadius: 10 },
  cornerTR: { position: 'absolute', top: 0, right: 0, width: 30, height: 30, borderTopWidth: 4, borderRightWidth: 4, borderColor: 'rgba(255,255,255,0.5)', borderTopRightRadius: 10 },
  cornerBL: { position: 'absolute', bottom: 0, left: 0, width: 30, height: 30, borderBottomWidth: 4, borderLeftWidth: 4, borderColor: 'rgba(255,255,255,0.5)', borderBottomLeftRadius: 10 },
  cornerBR: { position: 'absolute', bottom: 0, right: 0, width: 30, height: 30, borderBottomWidth: 4, borderRightWidth: 4, borderColor: 'rgba(255,255,255,0.5)', borderBottomRightRadius: 10 },

  flipBtn: { position: 'absolute', top: 15, right: 15, padding: 10, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20 },

  // PREVIEW
  previewContainer: { flex: 1, position: 'relative' },
  previewImage: { flex: 1, width: '100%', height: '100%', resizeMode: 'cover' },
  retakeBtn: { position: 'absolute', top: 15, left: 15, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20, gap: 5 },
  retakeText: { color: '#fff', fontFamily: FONTS.bold, fontSize: 12 },

  instructionText: { textAlign: 'center', color: '#fff', marginTop: 15, fontFamily: FONTS.medium, fontSize: 14, textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: {width: 0, height: 1}, textShadowRadius: 2 },

  // FOOTER
  footer: { position: 'absolute', bottom: 0, width: '100%', padding: 30, alignItems: 'center', justifyContent: 'center' },
  
  captureBtn: { width: 80, height: 80, borderRadius: 40, borderWidth: 4, borderColor: '#fff', padding: 4, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)' },
  captureInner: { width: '100%', height: '100%', borderRadius: 40, backgroundColor: '#fff' },
  
  submitBtn: { width: '100%', height: 60, backgroundColor: '#10B981', borderRadius: 20, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, shadowColor: "#10B981", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 8 },
  submitText: { fontFamily: FONTS.bold, fontSize: 18, color: '#fff', letterSpacing: 1 },
});