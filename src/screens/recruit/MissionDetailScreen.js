import { MaterialCommunityIcons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';
import * as MediaLibrary from 'expo-media-library';

import { useNavigation, useRoute } from '@react-navigation/native';
import { decode } from 'base64-arraybuffer';
import { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    Image,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { FONTS } from '../../styles/theme';

const { width } = Dimensions.get('window');

// --- 1. CONFIGURAÇÃO DE CORES (PASTEL) ---
// Usamos as mesmas cores suaves do card para o fundo da tela
const DIFFICULTY_CONFIG = {
    'easy':   { label: 'FÁCIL',   color: '#10B981', bg: '#F0FDF9' }, 
    'medium': { label: 'MÉDIO',   color: '#F59E0B', bg: '#FFF7ED' }, 
    'hard':   { label: 'DIFÍCIL', color: '#EF4444', bg: '#FEF2F2' }, 
    'epic':   { label: 'ÉPICO',   color: '#8B5CF6', bg: '#F5F3FF' }, 
    'custom': { label: 'MANUAL',  color: '#64748B', bg: '#F8FAFC' }  
};

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

  // --- 2. PEGAR A COR DO TEMA ---
  const diffData = DIFFICULTY_CONFIG[mission.difficulty] || DIFFICULTY_CONFIG['custom'];
  const isCustom = mission.reward_type === 'custom';

  // Se não tiver permissão, usa um fundo neutro
  if (!permission) return <View style={[styles.loadingContainer, {backgroundColor: diffData.bg}]}><ActivityIndicator color={diffData.color}/></View>;

  if (!permission.granted) {
    return (
        <View style={[styles.container, { backgroundColor: diffData.bg }]}>
            <View style={styles.permContainer}>
                <View style={[styles.permCard, { borderColor: diffData.color }]}>
                    <MaterialCommunityIcons name="camera-off" size={50} color={diffData.color} />
                    <Text style={[styles.permText, {color: diffData.color}]}>Precisamos da câmera para provar a missão!</Text>
                    <TouchableOpacity onPress={requestPermission} style={[styles.btnPermission, {backgroundColor: diffData.color}]}>
                        <Text style={styles.btnPermissionText}>PERMITIR CÂMERA</Text>
                    </TouchableOpacity>
                </View>
            </View>
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
          try {
             if (mediaPermission && mediaPermission.granted) {
                 await MediaLibrary.saveToLibraryAsync(photo.uri);
             }
          } catch (e) { console.log("Aviso Galeria:", e); }

          const manipResult = await ImageManipulator.manipulateAsync(
              photo.uri,
              [{ resize: { width: 800 } }],
              { compress: 0.5, format: ImageManipulator.SaveFormat.JPEG }
          );

          const base64 = await FileSystem.readAsStringAsync(manipResult.uri, { encoding: 'base64' });
          const arrayBuffer = decode(base64);

          const fileExt = 'jpg';
          const fileName = `${Date.now()}_${profile.id}.${fileExt}`;
          const filePath = `${profile.family_id}/${fileName}`; 

          const { error: uploadError } = await supabase.storage
            .from('mission-proofs')
            .upload(filePath, arrayBuffer, { contentType: 'image/jpeg', upsert: false });

          if (uploadError) throw uploadError;

          const { error: dbError } = await supabase
            .from('mission_attempts')
            .insert([{
                mission_id: mission.id,
                profile_id: profile.id,
                status: 'pending', 
                proof_url: filePath,
                earned_value: mission.reward 
            }]);

          if (dbError) throw dbError;

          Alert.alert("ENVIADO! 🚀", "O Capitão vai analisar sua prova.", [
              { text: "OK", onPress: () => navigation.goBack() }
          ]);

      } catch (error) {
          Alert.alert("Erro no envio", "Verifique sua internet.\n" + (error.message || ""));
      } finally {
          setUploading(false);
      }
  };

  const toggleCameraType = () => {
      setFacing(current => (current === 'back' ? 'front' : 'back'));
  };

  return (
    // --- 3. APLICANDO A COR PASTEL NO BACKGROUND DA TELA ---
    <View style={[styles.container, { backgroundColor: diffData.bg }]}>
      
      {/* StatusBar escuro para contrastar com o fundo pastel claro */}
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      
      <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backBtn, {backgroundColor: '#FFF'}]}>
              <MaterialCommunityIcons name="close" size={24} color={diffData.color} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: diffData.color }]}>PROVAR MISSÃO</Text>
          <View style={{width: 40}} /> 
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          {/* Card Visualmente "Limpo" (sem fundo, pois a tela já tem cor) */}
          <View style={styles.missionHeader}>
              <View style={[styles.iconBox, { backgroundColor: '#FFF', borderColor: diffData.color }]}>
                  <MaterialCommunityIcons name={mission.icon || "star"} size={40} color={diffData.color} />
              </View>
              
              <Text style={styles.missionTitle}>{mission.title}</Text>
              
              {/* Badge de Tesouro */}
              {mission.use_critical && (
                <View style={[
                    styles.treasureBadge, 
                    mission.critical_type === 'bonus_coins' ? styles.treasureGold : styles.treasurePurple
                ]}>
                    <MaterialCommunityIcons 
                        name={mission.critical_type === 'bonus_coins' ? "arrow-up-bold-circle" : "gift"} 
                        size={14} color="#FFF" style={{marginRight:4}} 
                    />
                    <Text style={styles.treasureBadgeText}>
                        {mission.critical_type === 'bonus_coins' ? `Chance de +50%` : `Chance de Surpresa`}
                    </Text>
                </View>
              )}

              {/* Badge de Recompensa */}
              <View style={[styles.rewardBadge, { backgroundColor: '#FFF', borderColor: isCustom ? '#D8B4FE' : '#F59E0B' }]}>
                  <Text style={[styles.rewardText, {color: isCustom ? '#9333EA' : '#B45309'}]}>
                      {isCustom ? mission.custom_reward : `+${mission.reward} Moedas`}
                  </Text>
              </View>

              {mission.description && (
                  <Text style={styles.description}>{mission.description}</Text>
              )}
          </View>

          {/* CÂMERA */}
          <View style={[styles.cameraSection, { borderColor: diffData.color }]}>
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

          <Text style={[styles.instructionText, { color: diffData.color }]}>
              {photo ? "Ficou boa? Se sim, é só enviar!" : "Tire uma foto para provar que fez."}
          </Text>

      </ScrollView>

      {/* FOOTER */}
      <View style={styles.footer}>
          {photo ? (
              <TouchableOpacity 
                style={[styles.submitBtn, { backgroundColor: diffData.color, shadowColor: diffData.color }]} 
                onPress={handleSubmitMission} 
                disabled={uploading} 
                activeOpacity={0.8}
              >
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
              <TouchableOpacity 
                style={[styles.captureBtn, { borderColor: diffData.color, backgroundColor: '#FFF' }]} 
                onPress={takePicture} 
                activeOpacity={0.8}
              >
                  <View style={[styles.captureInner, { backgroundColor: diffData.color }]} />
                  <MaterialCommunityIcons name="camera" size={32} color="#FFF" style={{position:'absolute'}}/>
              </TouchableOpacity>
          )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 }, // Cor definida dinamicamente
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  permContainer: { flex: 1, justifyContent: 'center', padding: 20 },
  permCard: { borderRadius: 20, padding: 30, alignItems: 'center', backgroundColor: '#FFF', borderWidth: 2 },
  permText: { textAlign: 'center', marginVertical: 20, fontFamily: FONTS.bold, fontSize: 16 },
  btnPermission: { paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12 },
  btnPermissionText: { color: '#fff', fontFamily: FONTS.bold },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 50, paddingBottom: 10 },
  headerTitle: { fontFamily: FONTS.bold, fontSize: 16, letterSpacing: 1 },
  backBtn: { padding: 8, borderRadius: 12, elevation: 2, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, shadowOffset: {width:0, height:2} },

  scrollContent: { padding: 20, paddingBottom: 120, alignItems: 'center' },

  // --- ÁREA DE CABEÇALHO DA MISSÃO ---
  missionHeader: { alignItems: 'center', marginBottom: 25, width: '100%' },
  
  iconBox: { 
      width: 80, height: 80, 
      borderRadius: 25, 
      justifyContent: 'center', alignItems: 'center', 
      marginBottom: 15,
      borderWidth: 2,
      elevation: 4, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5, shadowOffset: {width:0, height:4}
  },
  
  missionTitle: { fontFamily: FONTS.bold, fontSize: 22, color: '#1E293B', textAlign: 'center', marginBottom: 10 },
  
  // Badges
  treasureBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginBottom: 10 },
  treasureGold: { backgroundColor: '#F59E0B' },
  treasurePurple: { backgroundColor: '#8B5CF6' },
  treasureBadgeText: { color: '#FFF', fontSize: 12, fontWeight: 'bold', marginLeft: 4 },

  rewardBadge: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, marginBottom: 15 },
  rewardText: { fontFamily: FONTS.bold, fontSize: 16 },
  
  description: { fontFamily: FONTS.regular, fontSize: 15, color: '#475569', textAlign: 'center', lineHeight: 22, paddingHorizontal: 10 },

  // CÂMERA
  cameraSection: { width: '100%', height: 400, borderRadius: 30, overflow: 'hidden', backgroundColor: '#000', borderWidth: 3, elevation: 10 },
  cameraWrapper: { flex: 1, position: 'relative' },
  cameraGuide: { ...StyleSheet.absoluteFillObject, margin: 20 },
  
  // Cantos da Câmera (Brancos para contraste)
  cornerTL: { position: 'absolute', top: 0, left: 0, width: 40, height: 40, borderTopWidth: 5, borderLeftWidth: 5, borderColor: '#FFF', borderTopLeftRadius: 15 },
  cornerTR: { position: 'absolute', top: 0, right: 0, width: 40, height: 40, borderTopWidth: 5, borderRightWidth: 5, borderColor: '#FFF', borderTopRightRadius: 15 },
  cornerBL: { position: 'absolute', bottom: 0, left: 0, width: 40, height: 40, borderBottomWidth: 5, borderLeftWidth: 5, borderColor: '#FFF', borderBottomLeftRadius: 15 },
  cornerBR: { position: 'absolute', bottom: 0, right: 0, width: 40, height: 40, borderBottomWidth: 5, borderRightWidth: 5, borderColor: '#FFF', borderBottomRightRadius: 15 },

  flipBtn: { position: 'absolute', top: 20, right: 20, padding: 12, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 25 },

  previewContainer: { flex: 1, position: 'relative' },
  previewImage: { flex: 1, width: '100%', height: '100%', resizeMode: 'cover' },
  retakeBtn: { position: 'absolute', top: 20, left: 20, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)', paddingVertical: 10, paddingHorizontal: 15, borderRadius: 25, gap: 5 },
  retakeText: { color: '#fff', fontFamily: FONTS.bold, fontSize: 13 },

  instructionText: { textAlign: 'center', marginTop: 20, fontFamily: FONTS.bold, fontSize: 16, opacity: 0.8 },

  footer: { position: 'absolute', bottom: 0, width: '100%', padding: 30, alignItems: 'center', justifyContent: 'center' },
  
  captureBtn: { width: 80, height: 80, borderRadius: 40, borderWidth: 4, padding: 6, justifyContent: 'center', alignItems: 'center', elevation: 5 },
  captureInner: { width: '100%', height: '100%', borderRadius: 40 },
  
  submitBtn: { width: '100%', height: 60, borderRadius: 20, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 },
  submitText: { fontFamily: FONTS.bold, fontSize: 18, color: '#fff', letterSpacing: 1 },
});