import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Image, ActivityIndicator } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';

export default function RecruitCameraScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { taskId, profileId } = route.params;
  
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef(null);
  const [photoUri, setPhotoUri] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!permission) requestPermission();
  }, [permission]);

  if (!permission || !permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={{color:'#fff'}}>Precisamos da câmera!</Text>
      </View>
    );
  }

  const takePicture = async () => {
    if (cameraRef.current) {
      const data = await cameraRef.current.takePictureAsync({ 
          quality: 0.3, 
          skipProcessing: true 
      });
      setPhotoUri(data.uri);
    }
  };

  const uploadAndSend = async () => {
    setLoading(true);
    try {
        const ext = photoUri.substring(photoUri.lastIndexOf('.') + 1);
        const fileName = `${profileId}_${taskId}_${Date.now()}.${ext}`;
        
        const formData = new FormData();
        formData.append('file', {
            uri: photoUri,
            name: fileName,
            type: `image/${ext}`
        });

        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('mission-proofs') 
            .upload(fileName, formData, {
                contentType: `image/${ext}`,
            });

        if (uploadError) throw uploadError;

        const imagePath = uploadData.path;

        const { data: mission } = await supabase.from('missions').select('reward').eq('id', taskId).single();

        const { error: dbError } = await supabase
            .from('mission_attempts')
            .insert([{
                mission_id: taskId,
                profile_id: profileId,
                status: 'pending',
                earned_value: mission.reward,
                proof_photo: imagePath,
                created_at: new Date()
            }]);

        if (dbError) throw dbError;

        Alert.alert("Enviado! 🚀", "O Capitão vai analisar sua foto.");
        navigation.goBack();

    } catch (error) {
        Alert.alert("Erro no envio", "Tente novamente.");
        console.log(error);
    } finally {
        setLoading(false);
    }
  };

  // --- RENDERIZAÇÃO: MODO PREVIEW (FOTO TIRADA) ---
  if (photoUri) {
      return (
        <View style={styles.container}>
            <Image source={{ uri: photoUri }} style={styles.fullScreen} />
            
            {loading ? (
                <View style={styles.loadingOverlay}>
                    <ActivityIndicator size="large" color="#10b981" />
                    <Text style={styles.loadingText}>Enviando prova...</Text>
                </View>
            ) : (
                <View style={styles.previewControls}>
                    {/* Botões LADO A LADO */}
                    <TouchableOpacity style={styles.btnRed} onPress={() => setPhotoUri(null)}>
                        <MaterialCommunityIcons name="trash-can-outline" size={24} color="#fff" style={{marginRight:5}} />
                        <Text style={styles.btnText}>Refazer</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity style={styles.btnGreen} onPress={uploadAndSend}>
                        <Text style={styles.btnText}>Enviar</Text>
                        <MaterialCommunityIcons name="send" size={24} color="#fff" style={{marginLeft:5}} />
                    </TouchableOpacity>
                </View>
            )}
        </View>
      );
  }

  // --- RENDERIZAÇÃO: MODO CÂMERA (TIRAR FOTO) ---
  return (
    <View style={styles.container}>
      <CameraView 
        style={styles.fullScreen} 
        facing="back" 
        ref={cameraRef} 
      />

      <View style={styles.cameraControls}>
         <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
            <MaterialCommunityIcons name="close" size={30} color="#fff" />
         </TouchableOpacity>

         <TouchableOpacity onPress={takePicture} style={styles.captureBtn}>
            <View style={styles.innerCircle}/>
         </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' },
  
  fullScreen: { ...StyleSheet.absoluteFillObject },

  // Controles da Câmera (Tirar Foto)
  cameraControls: { 
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 50,
    zIndex: 10
  },

  // Controles do Preview (Enviar/Refazer)
  previewControls: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 40,
    paddingHorizontal: 20,
    zIndex: 10,
    flexDirection: 'row', // <--- IMPORTANTE: Coloca lado a lado
    justifyContent: 'space-between', // Separa um em cada ponta
    gap: 20 // Espaço entre eles
  },

  closeBtn: { 
    position: 'absolute', 
    top: 50, 
    right: 20, 
    padding: 10,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 20
  },

  captureBtn: { 
    width: 80, height: 80, borderRadius: 40, 
    borderWidth: 5, borderColor: '#fff', 
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)'
  },
  innerCircle: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#fff' },

  btnRed: { 
    flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#ef4444', padding: 15, borderRadius: 15, elevation: 5 
  },
  btnGreen: { 
    flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#10b981', padding: 15, borderRadius: 15, elevation: 5
  },
  btnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },

  loadingOverlay: { 
    ...StyleSheet.absoluteFillObject, 
    backgroundColor: 'rgba(0,0,0,0.7)', 
    justifyContent: 'center', alignItems: 'center',
    zIndex: 20
  },
  loadingText: { color:'#fff', marginTop:10, fontWeight:'bold', fontSize: 16 }
});