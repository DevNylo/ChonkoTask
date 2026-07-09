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
            // Busca o nome da família usando a RPC segura que criamos no SQL
            const { data: familyNameResult, error } = await supabase
                .rpc('get_family_name_by_invite', { p_code: cleanCode });

            if (error) throw error;

            if (!familyNameResult) {
                Alert.alert("Inválido", "Código não encontrado ou já expirou.");
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
        if (!name.trim()) return Alert.alert("Atenção", "Qual o seu nome?");
        setLoading(true);

        try {
            const cleanCode = code.trim().toUpperCase();

            // 1. Cria o perfil no Banco (usando a segunda RPC segura)
            const { data: newProfile, error } = await supabase
                .rpc('join_family_as_recruit', {
                    p_invite_code: cleanCode,
                    p_name: name.trim()
                });

            if (error) throw error;

            // 2. Monta a sessão "Modo Criança"
            const sessionData = {
                user: { id: 'child_mode' },
                access_token: 'child_mode_token',
            };

            // 3. Salva no Storage do celular
            await AsyncStorage.setItem('chonko_child_session', JSON.stringify({
                session: sessionData,
                profile: newProfile,
                role: 'recruit'
            }));

            Alert.alert("BEM-VINDO! 🎉", `Você entrou na equipe ${familyName}.`);

            // 4. ATUALIZA O ESTADO GLOBAL
            if (setProfile) setProfile(newProfile);
            setSession(sessionData);

        } catch (e) {
            Alert.alert("Erro ao entrar", "Detalhe: " + e.message);
            console.log(e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <ImageBackground
            source={require('../../../assets/Onboarding/ChonkoKid.png')}
            style={styles.container}
            resizeMode="cover"
        >
            <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

            <View style={styles.content}>
                <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
                    <MaterialCommunityIcons name="arrow-left" size={28} color="#10B981" />
                </TouchableOpacity>

                {/* CARD COM SOMBRA SALTADA (Solid Premium Verde) */}
                <View style={styles.cardWrapper}>
                    {/* SOMBRA SÓLIDA */}
                    <View style={styles.cardShadow} />

                    {/* CONTEÚDO DO CARD */}
                    <View style={styles.cardFront}>
                        {step === 1 && (
                            <>
                                <Text style={styles.title}>CÓDIGO DE ACESSO</Text>
                                <Text style={styles.subtitle}>Peça o código de 6 dígitos para o administrador.</Text>

                                <TextInput
                                    style={styles.inputCode}
                                    placeholder="EX: A8X9P2"
                                    placeholderTextColor="#94A3B8"
                                    maxLength={6}
                                    autoCapitalize="characters"
                                    autoCorrect={false}
                                    cursorColor="#10B981"
                                    value={code}
                                    onChangeText={(text) => setCode(text.toUpperCase().trim())}
                                />

                                <TouchableOpacity style={styles.btnPrimary} onPress={handleVerifyCode} disabled={loading} activeOpacity={0.8}>
                                    {/* SOMBRA SÓLIDA DO BOTÃO */}
                                    <View style={styles.btnShadow} />
                                    {/* FRENTE SÓLIDA DO BOTÃO */}
                                    <View style={styles.btnFront}>
                                        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>VALIDAR CÓDIGO</Text>}
                                    </View>
                                </TouchableOpacity>
                            </>
                        )}

                        {step === 2 && (
                            <>
                                <Text style={styles.title}>QUEM É VOCÊ?</Text>
                                <Text style={styles.subtitle}>Entrando na equipe: <Text style={{fontWeight:'bold', color: '#10B981'}}>{familyName}</Text></Text>

                                <View style={styles.avatarPlaceholder}>
                                    <MaterialCommunityIcons name="face-man-shimmer" size={50} color="#10B981" />
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
                                    {/* SOMBRA SÓLIDA DO BOTÃO */}
                                    <View style={styles.btnShadow} />
                                    {/* FRENTE SÓLIDA DO BOTÃO */}
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
    container: { flex: 1 },

    content: { flex: 1, justifyContent: 'center', padding: 25 },

    backBtn: {
        position: 'absolute', top: 50, left: 20,
        width: 44, height: 44, borderRadius: 14,
        backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center',
        borderWidth: 1, borderColor: '#E2E8F0', zIndex: 10,
        elevation: 2
    },

    // --- CARD ---
    cardWrapper: { position: 'relative' },
    cardShadow: {
        position: 'absolute',
        top: 6,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: '#D1FAE5', // Sombra sólida verde claro
        borderRadius: 24,
    },
    cardFront: {
        backgroundColor: '#FFF',
        borderRadius: 24,
        padding: 30,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#10B981' // Borda verde forte
    },

    title: { fontFamily: FONTS.bold, fontSize: 22, color: '#1E293B', marginBottom: 5, textAlign: 'center' },
    subtitle: { fontFamily: FONTS.regular, fontSize: 14, color: '#64748B', marginBottom: 25, textAlign: 'center' },

    // Inputs
    inputCode: {
        width: '100%', height: 60, backgroundColor: '#F8FAFC', borderRadius: 14,
        borderWidth: 1, borderColor: '#E2E8F0',
        textAlign: 'center', fontSize: 24, fontFamily: FONTS.bold, color: '#1E293B', letterSpacing: 4, marginBottom: 25
    },

    inputName: {
        width: '100%', height: 56, backgroundColor: '#F8FAFC', borderRadius: 14,
        borderWidth: 1, borderColor: '#E2E8F0',
        paddingHorizontal: 15, fontSize: 16, fontFamily: FONTS.bold, color: '#1E293B', marginBottom: 25
    },

    label: { alignSelf: 'flex-start', fontFamily: FONTS.bold, color: '#64748B', fontSize: 11, marginBottom: 8, paddingLeft: 4, textTransform: 'uppercase' },

    avatarPlaceholder: {
        width: 80, height: 80, borderRadius: 40, backgroundColor: '#ECFDF5',
        justifyContent: 'center', alignItems: 'center', marginBottom: 25,
        borderWidth: 1, borderColor: '#10B981'
    },

    // Botão 3D Dinâmico
    btnPrimary: { width: '100%', height: 56, position: 'relative' },
    btnShadow: { position: 'absolute', top: 5, left: 0, width: '100%', height: '100%', backgroundColor: '#059669', borderRadius: 16 },
    btnFront: {
        width: '100%', height: '100%', backgroundColor: '#10B981',
        borderRadius: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
        borderWidth: 1, borderColor: '#059669'
    },
    btnText: { fontFamily: FONTS.bold, color: '#fff', fontSize: 16, letterSpacing: 1 },

    btnSecondary: { marginTop: 20, padding: 10 },
    btnTextSec: { fontFamily: FONTS.bold, color: '#64748B' },
});