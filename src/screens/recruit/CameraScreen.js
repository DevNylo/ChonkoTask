import { useNavigation, useRoute } from '@react-navigation/native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useEffect, useRef, useState } from 'react';
import { Alert, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
// MUDANÇA IMPORTANTE: Usando 'legacy' para corrigir o erro de versão
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import { useTasks } from '../../context/TasksContext';

export default function CameraScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { taskId } = route.params; // Recebe o ID da tarefa
  const { completeTask } = useTasks();

  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef(null);
  const [photo, setPhoto] = useState(null); // Preview da foto

  // Pedir permissão ao abrir
  useEffect(() => {
    if (!permission) requestPermission();
  }, [permission]);

  if (!permission) return <View style={styles.container} />;
  
  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.permText}>Precisamos da câmera para provar a missão!</Text>
        <TouchableOpacity onPress={requestPermission} style={styles.btnPerm}>
            <Text style={styles.btnText}>Dar Permissão</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtnSimple}>
            <Text style={{color:'#fff'}}>Voltar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Função de tirar foto
  const takePicture = async () => {
    if (cameraRef.current) {
      try {
        const photoData = await cameraRef.current.takePictureAsync({
          quality: 0.5, // Qualidade média pra não pesar
          base64: false,
        });
        setPhoto(photoData.uri); // Mostra preview
      } catch (error) {
        Alert.alert("Erro", "Não foi possível tirar a foto.");
      }
    }
  };

  // Função de enviar (Salvar definitivo)
  const sendProof = async () => {
    if (!photo) return;

    try {
        // 1. Cria nome único para o arquivo
        const fileName = photo.split('/').pop();
        const newPath = FileSystem.documentDirectory + fileName;

        // 2. Tenta COPIAR (Mais seguro que mover)
        await FileSystem.copyAsync({
            from: photo,
            to: newPath
        });

        console.log("Foto salva com sucesso em:", newPath);

        // 3. Avisa a nuvem que a tarefa foi feita com essa foto permanente
        completeTask(taskId, newPath);
        
        Alert.alert("Enviado!", "O Capitão vai analisar sua foto.");
        navigation.goBack();

    } catch (error) {
        console.log("Erro ao salvar permanente, usando temporário:", error);
        
        // FALLBACK: Se der erro ao salvar, usa a foto temporária mesmo para não travar o jogo
        completeTask(taskId, photo);
        
        Alert.alert("Enviado!", "Foto enviada (modo temporário).");
        navigation.goBack();
    }
  };

  return (
    <View style={styles.container}>
      {!photo ? (
        // === MODO CÂMERA ===
        <CameraView style={styles.camera} facing="back" ref={cameraRef}>
          <View style={styles.overlay}>
            <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.goBack()}>
                <MaterialCommunityIcons name="close" size={30} color="#fff" />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.captureBtn} onPress={takePicture}>
                <View style={styles.captureInner} />
            </TouchableOpacity>
          </View>
        </CameraView>
      ) : (
        // === MODO PREVIEW (Ver a foto antes de enviar) ===
        <View style={styles.previewContainer}>
            <Image source={{ uri: photo }} style={styles.previewImage} />
            <View style={styles.previewOverlay}>
                <TouchableOpacity style={styles.retakeBtn} onPress={() => setPhoto(null)}>
                    <MaterialCommunityIcons name="trash-can" size={24} color="#fff" />
                    <Text style={styles.btnText}>Refazer</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.sendBtn} onPress={sendProof}>
                    <MaterialCommunityIcons name="send" size={24} color="#fff" />
                    <Text style={styles.btnText}>Enviar Prova</Text>
                </TouchableOpacity>
            </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', justifyContent: 'center' },
  camera: { flex: 1 },
  overlay: { flex: 1, backgroundColor: 'transparent', justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 50 },
  
  closeBtn: { position: 'absolute', top: 60, right: 30, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20, padding: 8 },
  closeBtnSimple: { marginTop: 20 },

  captureBtn: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.3)', justifyContent: 'center', alignItems: 'center', borderWidth: 4, borderColor: '#fff' },
  captureInner: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#fff' },

  previewContainer: { flex: 1 },
  previewImage: { flex: 1 },
  previewOverlay: { flexDirection: 'row', justifyContent: 'space-around', padding: 30, backgroundColor: '#000' },
  
  retakeBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ef4444', padding: 15, borderRadius: 15 },
  sendBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#10b981', padding: 15, borderRadius: 15 },
  
  btnText: { color: '#fff', fontWeight: 'bold', marginLeft: 10 },
  permText: { color: '#fff', textAlign: 'center', marginBottom: 20, fontSize: 16 },
  btnPerm: { backgroundColor: '#10b981', padding: 15, borderRadius: 10 }
});