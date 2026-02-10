import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ImageBackground,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { useAuth } from '../../context/AuthContext'; // <--- IMPORTANTE: Importar o Contexto
import { supabase } from '../../lib/supabase';
import { COLORS, FONTS } from '../../styles/theme';

export default function JoinFamilyScreen() {
  const navigation = useNavigation();
  const { setSession, setProfile } = useAuth(); // <--- IMPORTANTE: Pegar as funções do contexto

  // ESTADOS
  const [step, setStep] = useState(1); 
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [familyName, setFamilyName] = useState('');

  // --- PASSO 1: VERIFICAR CÓDIGO ---
  const handleVerifyCode = async () => {
      const cleanCode = code.trim().toUpperCase();

      if (cleanCode.length < 6) {
          return Alert.alert("Ops", "O código deve ter 6 caracteres.");
      }
      setLoading(true);

      try {
          // Busca o nome da família usando a RPC segura
          const { data: familyNameResult, error } = await supabase
            .rpc('get_family_name_by_invite', { p_code: cleanCode });

          if (error) throw error;

          if (!familyNameResult) {
              Alert.alert("Inválido", "Código não encontrado ou expirado.");
              return;
          }

          setFamilyName(familyNameResult);
          setStep(2);

      } catch (error) {
          Alert.alert("Erro", "Falha ao verificar código.");
          console.log(error);
      } finally {
          setLoading(false);
      }
  };

  // --- PASSO 2: CRIAR PERFIL E ENTRAR ---
  const handleJoin = async () => {
      if (!name.trim()) return Alert.alert("Atenção", "Digite seu nome, soldado!");
      setLoading(true);

      try {
          const cleanCode = code.trim().toUpperCase();

          // 1. Cria o perfil no Banco
          const { data: newProfile, error } = await supabase
            .rpc('join_family_as_recruit', { 
                p_invite_code: cleanCode,
                p_name: name
            });

          if (error) throw error;

          // 2. Monta a sessão "Modo Criança"
          const sessionData = {
              user: { id: 'child_mode' }, // ID Fictício para passar na verificação de "logged in"
              access_token: 'child_mode_token',
          };

          // 3. Salva no Storage
          await AsyncStorage.setItem('chonko_child_session', JSON.stringify({
              session: sessionData,
              profile: newProfile,
              role: 'recruit'
          }));
          
          Alert.alert("BEM-VINDO À TROPA! 🎖️", `Perfil ${newProfile.name} criado com sucesso.`);

          // 4. ATUALIZA O ESTADO GLOBAL
          // Isso fará o AppNavigator recarregar e mostrar a Stack correta (RecruitHome)
          // Não precisamos de navigation.navigate aqui!
          if (setProfile) setProfile(newProfile); // Atualiza o perfil no contexto
          setSession(sessionData); // Atualiza a sessão -> Dispara a troca de tela automática

      } catch (e) {
          Alert.alert("Erro ao entrar", e.message || "Tente novamente.");
          console.log(e);
      } finally {
          setLoading(false);
      }
  };

  return (
    <ImageBackground 
        source={require('../../../assets/WelcomeScreenBKG.png')} 
        style={styles.container} 
        blurRadius={5}
    >
        <View style={styles.overlay} />
        <View style={styles.content}>
            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                <MaterialCommunityIcons name="arrow-left" size={30} color="#fff" />
            </TouchableOpacity>

            {step === 1 && (
                <View style={styles.card}>
                    <Text style={styles.title}>CÓDIGO DA TROPA</Text>
                    <Text style={styles.subtitle}>Peça o código para o Capitão</Text>
                    
                    <TextInput 
                        style={styles.inputCode}
                        placeholder="EX: 7AB50E" 
                        placeholderTextColor={COLORS.placeholder}
                        maxLength={6}
                        autoCapitalize="characters"
                        autoCorrect={false}
                        value={code}
                        onChangeText={(text) => setCode(text.toUpperCase().trim())}
                    />

                    <TouchableOpacity style={styles.btnPrimary} onPress={handleVerifyCode} disabled={loading}>
                        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>VALIDAR CÓDIGO</Text>}
                    </TouchableOpacity>
                </View>
            )}

            {step === 2 && (
                <View style={styles.card}>
                    <Text style={styles.title}>QUEM É VOCÊ?</Text>
                    <Text style={styles.subtitle}>Entrando na família: {familyName}</Text>
                    
                    <View style={styles.avatarPlaceholder}>
                        <MaterialCommunityIcons name="account" size={50} color={COLORS.primary} />
                    </View>

                    <Text style={styles.label}>Qual seu nome (ou apelido)?</Text>
                    <TextInput 
                        style={styles.inputName}
                        placeholder="Ex: Enzo, Campeão..."
                        placeholderTextColor={COLORS.placeholder}
                        value={name}
                        onChangeText={setName}
                    />
                    
                    <TouchableOpacity style={styles.btnPrimary} onPress={handleJoin} disabled={loading}>
                        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>CRIAR E ENTRAR</Text>}
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.btnSecondary} onPress={() => setStep(1)} disabled={loading}>
                        <Text style={styles.btnTextSec}>Voltar</Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  content: { flex: 1, justifyContent: 'center', padding: 20 },
  backBtn: { position: 'absolute', top: 50, left: 20, zIndex: 10 },
  card: { backgroundColor: COLORS.surface, borderRadius: 24, padding: 25, alignItems: 'center', borderWidth: 4, borderColor: COLORS.primary, width: '100%', maxWidth: 400, alignSelf: 'center' },
  title: { fontFamily: FONTS.bold, fontSize: 22, color: COLORS.primary, marginBottom: 5 },
  subtitle: { fontFamily: FONTS.regular, fontSize: 14, color: '#666', marginBottom: 25 },
  inputCode: { width: '100%', height: 60, backgroundColor: COLORS.surfaceAlt, borderRadius: 12, borderWidth: 2, borderColor: COLORS.primary, textAlign: 'center', fontSize: 24, fontFamily: FONTS.bold, color: COLORS.primary, letterSpacing: 4, marginBottom: 20 },
  inputName: { width: '100%', height: 50, backgroundColor: COLORS.surfaceAlt, borderRadius: 12, borderWidth: 1, borderColor: '#ccc', paddingHorizontal: 15, fontSize: 18, fontFamily: FONTS.bold, color: COLORS.textPrimary, marginBottom: 20 },
  label: { alignSelf: 'flex-start', fontFamily: FONTS.bold, color: COLORS.primary, marginBottom: 5, marginLeft: 5 },
  avatarPlaceholder: { width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.surfaceAlt, justifyContent: 'center', alignItems: 'center', marginBottom: 20, borderWidth: 2, borderColor: COLORS.primary },
  btnPrimary: { width: '100%', height: 55, backgroundColor: COLORS.primary, borderRadius: 15, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#064e3b' },
  btnText: { fontFamily: FONTS.bold, color: '#fff', fontSize: 18 },
  btnSecondary: { marginTop: 15, padding: 10 },
  btnTextSec: { fontFamily: FONTS.bold, color: '#666' },
});