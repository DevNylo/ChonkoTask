import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    ImageBackground
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { FONTS } from '../../styles/theme';

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
        source={require('../../../assets/Onboarding/ChonkoKid.png')} // <-- AJUSTE O NOME AQUI SE NECESSÁRIO
        style={styles.container}
        resizeMode="cover"
    >
        <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

        <View style={styles.content}>
            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
                <MaterialCommunityIcons name="arrow-left" size={28} color="#059669" />
            </TouchableOpacity>

            {/* CARD COM SOMBRA SALTADA (Soft Premium Verde) */}
            <View style={styles.cardWrapper}>
                {/* SOMBRA SÓLIDA (Soft Premium) */}
                <View style={styles.cardShadow} />

                {/* CONTEÚDO DO CARD (Soft Premium) */}
                <View style={styles.cardFront}>
                    {step === 1 && (
                        <>
                            <Text style={styles.title}>CÓDIGO DA FAMÍLIA</Text>
                            <Text style={styles.subtitle}>Peça o código para o Admin</Text>

                            <TextInput
                                style={styles.inputCode}
                                placeholder="EX: 7AB50E"
                                placeholderTextColor="#94A3B8"
                                maxLength={6}
                                autoCapitalize="characters"
                                autoCorrect={false}
                                cursorColor="#10B981"
                                value={code}
                                onChangeText={(text) => setCode(text.toUpperCase().trim())}
                            />

                            <TouchableOpacity style={styles.btnPrimary} onPress={handleVerifyCode} disabled={loading} activeOpacity={0.8}>
                                {/* SOMBRA SOLIDIA (3D Dinâmico Verde Escuro) */}
                                <View style={styles.btnShadow} />
                                {/* FRENTE SÓLIDA (3D Dinâmico Verde) */}
                                <View style={styles.btnFront}>
                                    {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>VALIDAR CÓDIGO</Text>}
                                </View>
                            </TouchableOpacity>
                        </>
                    )}

                    {step === 2 && (
                        <>
                            <Text style={styles.title}>QUEM É VOCÊ?</Text>
                            <Text style={styles.subtitle}>Entrando na família: <Text style={{fontWeight:'bold', color: '#064E3B'}}>{familyName}</Text></Text>

                            <View style={styles.avatarPlaceholder}>
                                <MaterialCommunityIcons name="account" size={50} color="#10B981" />
                            </View>

                            <Text style={styles.label}>Qual seu nome (ou apelido)?</Text>
                            <TextInput
                                style={styles.inputName}
                                placeholder="Ex: Enzo, Campeão..."
                                placeholderTextColor="#94A3B8"
                                cursorColor="#10B981"
                                value={name}
                                onChangeText={setName}
                            />

                            <TouchableOpacity style={styles.btnPrimary} onPress={handleJoin} disabled={loading} activeOpacity={0.8}>
                                {/* SOMBRA SOLIDIA (3D Dinâmico Verde Escuro) */}
                                <View style={styles.btnShadow} />
                                {/* FRENTE SÓLIDA (3D Dinâmico Verde) */}
                                <View style={styles.btnFront}>
                                    {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>CRIAR E ENTRAR</Text>}
                                </View>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.btnSecondary} onPress={() => setStep(1)} disabled={loading} activeOpacity={0.7}>
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
  container: { flex: 1 }, // A ImageBackground agora cuida de flex e preenchimento

  content: { flex: 1, justifyContent: 'center', padding: 25 },

  backBtn: {
      position: 'absolute', top: 50, left: 20,
      width: 44, height: 44, borderRadius: 14,
      backgroundColor: '#F0FDF4', justifyContent: 'center', alignItems: 'center',
      borderWidth: 1, borderColor: '#6EE7B7', zIndex: 10 // Borda Fina
  },

  // --- CARD COM SOMBRA SALTADA (Soft Premium Verde) ---
  cardWrapper: { position: 'relative' },
  cardShadow: {
      position: 'absolute',
      top: 6, // Sombra Sólida
      left: 0,
      width: '100%',
      height: '100%',
      backgroundColor: 'rgba(5, 150, 105, 0.15)', // Sombra Sólida Translúcida do Verde Primário
      borderRadius: 24, // Cantos Suaves
  },
  cardFront: {
      backgroundColor: '#FFF',
      borderRadius: 24, // Cantos Suaves
      padding: 30,
      alignItems: 'center',
      borderWidth: 1, // Borda Fina
      borderColor: 'rgba(0,0,0,0.08)'
  },

  title: { fontFamily: FONTS.bold, fontSize: 22, color: '#064E3B', marginBottom: 5, textAlign: 'center' },
  subtitle: { fontFamily: FONTS.regular, fontSize: 14, color: '#059669', opacity: 0.8, marginBottom: 25, textAlign: 'center' },

  // Inputs (Soft Premium)
  inputCode: {
      width: '100%', height: 60, backgroundColor: '#FFF', borderRadius: 14,
      borderWidth: 1, borderColor: '#10B981', // Borda Fina Verde
      textAlign: 'center', fontSize: 24, fontFamily: FONTS.bold, color: '#064E3B', letterSpacing: 4, marginBottom: 25
  },

  inputName: {
      width: '100%', height: 56, backgroundColor: '#FFF', borderRadius: 14,
      borderWidth: 1, borderColor: '#10B981', // Borda Fina Verde
      paddingHorizontal: 15, fontSize: 16, fontFamily: FONTS.bold, color: '#064E3B', marginBottom: 25
  },

  label: { alignSelf: 'flex-start', fontFamily: FONTS.bold, color: '#064E3B', fontSize: 13, marginBottom: 8, paddingLeft: 4 },

  avatarPlaceholder: {
      width: 80, height: 80, borderRadius: 40, backgroundColor: '#F0FDF4',
      justifyContent: 'center', alignItems: 'center', marginBottom: 25,
      borderWidth: 1, borderColor: '#10B981' // Borda Fina Verde
  },

  // Botão 3D Dinâmico (Verde)
  btnPrimary: { width: '100%', height: 56, position: 'relative' },
  btnShadow: { position: 'absolute', top: 5, left: 0, width: '100%', height: '100%', backgroundColor: '#059669', borderRadius: 16 }, // Sombra Sólida Escura
  btnFront: {
      width: '100%', height: '100%', backgroundColor: '#10B981',
      borderRadius: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
      borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' // Borda Fina Clara
  },
  btnText: { fontFamily: FONTS.bold, color: '#fff', fontSize: 16, letterSpacing: 1 },

  btnSecondary: { marginTop: 20, padding: 10 },
  btnTextSec: { fontFamily: FONTS.bold, color: '#059669', opacity: 0.8 },
});