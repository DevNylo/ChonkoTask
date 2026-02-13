import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ImageBackground,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { COLORS, FONTS } from '../../styles/theme';

export default function JoinFamilyScreen() {
  const navigation = useNavigation();
  const { setSession, setProfile } = useAuth(); 

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
              user: { id: 'child_mode' }, 
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
          if (setProfile) setProfile(newProfile); 
          setSession(sessionData); 

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
        resizeMode="cover"
    >
        <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
        
        {/* Overlay leve para legibilidade */}
        <View style={styles.overlay} />
        
        <View style={styles.content}>
            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                <MaterialCommunityIcons name="arrow-left" size={28} color={COLORS.primary} />
            </TouchableOpacity>

            {/* CARD COM SOMBRA SALTADA (Soft Premium) */}
            <View style={styles.cardWrapper}>
                <View style={styles.cardShadow} />
                
                <View style={styles.cardFront}>
                    {step === 1 && (
                        <>
                            <Text style={styles.title}>CÓDIGO DA FAMÍLIA</Text>
                            <Text style={styles.subtitle}>Peça o código para o Admin</Text>
                            
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

                            <TouchableOpacity style={styles.btnPrimary} onPress={handleVerifyCode} disabled={loading} activeOpacity={0.8}>
                                <View style={styles.btnShadow} />
                                <View style={styles.btnFront}>
                                    {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>VALIDAR CÓDIGO</Text>}
                                </View>
                            </TouchableOpacity>
                        </>
                    )}

                    {step === 2 && (
                        <>
                            <Text style={styles.title}>QUEM É VOCÊ?</Text>
                            <Text style={styles.subtitle}>Entrando na família: <Text style={{fontWeight:'bold'}}>{familyName}</Text></Text>
                            
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
                            
                            <TouchableOpacity style={styles.btnPrimary} onPress={handleJoin} disabled={loading} activeOpacity={0.8}>
                                <View style={styles.btnShadow} />
                                <View style={styles.btnFront}>
                                    {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>CRIAR E ENTRAR</Text>}
                                </View>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.btnSecondary} onPress={() => setStep(1)} disabled={loading}>
                                <Text style={styles.btnTextSec}>Voltar</Text>
                            </TouchableOpacity>
                        </>
                    )}
                </View>
            </View>
        </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.3)' }, // Overlay branco leve
  content: { flex: 1, justifyContent: 'center', padding: 25 },
  
  backBtn: { 
      position: 'absolute', top: 50, left: 20, 
      width: 44, height: 44, borderRadius: 14, 
      backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center',
      borderWidth: 1, borderColor: COLORS.primary, zIndex: 10
  },

  // --- CARD (Soft Premium) ---
  cardWrapper: { position: 'relative' },
  cardShadow: {
      position: 'absolute', top: 6, left: 6, width: '100%', height: '100%', 
      backgroundColor: COLORS.shadow, borderRadius: 24, opacity: 0.2
  },
  cardFront: { 
      backgroundColor: '#FFF', borderRadius: 24, padding: 30, alignItems: 'center', 
      borderWidth: 1, borderColor: COLORS.primary 
  },

  title: { fontFamily: FONTS.bold, fontSize: 22, color: COLORS.primary, marginBottom: 5, textAlign: 'center' },
  subtitle: { fontFamily: FONTS.regular, fontSize: 14, color: COLORS.primary, opacity: 0.7, marginBottom: 25, textAlign: 'center' },
  
  // Inputs
  inputCode: { 
      width: '100%', height: 60, backgroundColor: '#F8FAFC', borderRadius: 14, 
      borderWidth: 1, borderColor: COLORS.primary, 
      textAlign: 'center', fontSize: 24, fontFamily: FONTS.bold, color: COLORS.primary, letterSpacing: 4, marginBottom: 25 
  },
  
  inputName: { 
      width: '100%', height: 56, backgroundColor: '#F8FAFC', borderRadius: 14, 
      borderWidth: 1, borderColor: COLORS.primary, 
      paddingHorizontal: 15, fontSize: 16, fontFamily: FONTS.bold, color: COLORS.primary, marginBottom: 25 
  },
  
  label: { alignSelf: 'flex-start', fontFamily: FONTS.bold, color: COLORS.primary, fontSize: 12, marginBottom: 8, paddingLeft: 4 },
  
  avatarPlaceholder: { 
      width: 80, height: 80, borderRadius: 40, backgroundColor: '#F0FDF4', 
      justifyContent: 'center', alignItems: 'center', marginBottom: 25, 
      borderWidth: 1, borderColor: COLORS.primary 
  },
  
  // Botão 3D
  btnPrimary: { width: '100%', height: 56, position: 'relative' },
  btnShadow: { position: 'absolute', top: 4, left: 0, width: '100%', height: '100%', backgroundColor: COLORS.shadow, borderRadius: 16 },
  btnFront: { 
      width: '100%', height: '100%', backgroundColor: COLORS.primary, 
      borderRadius: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', 
      marginTop: -2, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' 
  },
  btnText: { fontFamily: FONTS.bold, color: '#fff', fontSize: 16, letterSpacing: 1 },
  
  btnSecondary: { marginTop: 20, padding: 10 },
  btnTextSec: { fontFamily: FONTS.bold, color: COLORS.primary, opacity: 0.7 },
});