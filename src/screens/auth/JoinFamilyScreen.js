import { MaterialCommunityIcons } from '@expo/vector-icons';
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

    // IMPORTAÇÃO CORRETA: Puxando o reloadProfile do Cérebro
    const { reloadProfile } = useAuth();

    // ESTADOS
    const [step, setStep] = useState(1);
    const [code, setCode] = useState('');
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);

    // Dados retornados pela Fechadura Inteligente
    const [codeType, setCodeType] = useState(null);
    const [familyData, setFamilyData] = useState(null);
    const [profileData, setProfileData] = useState(null);

    // --- PASSO 1: A FECHADURA INTELIGENTE ---
    const handleVerifyCode = async () => {
        const cleanCode = code.trim().toUpperCase();

        if (cleanCode.length < 6) return Alert.alert("Ops", "O código deve ter pelo menos 6 caracteres.");

        setLoading(true);

        try {
            const { data, error } = await supabase.rpc('check_smart_code', { p_code: cleanCode });

            if (error) throw error;

            if (data.type === 'invalid') {
                Alert.alert("Inválido", "Código não encontrado ou já expirou.");
                return;
            }

            if (data.type === 'new_member') {
                setCodeType('new_member');
                setFamilyData({ id: data.family_id, name: data.family_name });
                setStep(2);
            } else if (data.type === 'reconnect') {
                setCodeType('reconnect');
                setProfileData({ id: data.profile_id, name: data.profile_name, family_id: data.family_id });

                // Reconexão: já executa o login anônimo e o vínculo
                await executeAnonymousLink(data.profile_id, data.profile_name);
            }

        } catch (error) {
            Alert.alert("Erro", "Falha ao verificar código.");
            console.log(error);
        } finally {
            setLoading(false);
        }
    };

    // --- PASSO 2 (NOVO MEMBRO): CRIAR PERFIL E ENTRAR NA FILA ---
    const handleJoinNewMember = async () => {
        if (!name.trim()) return Alert.alert("Atenção", "Qual o seu nome?");
        setLoading(true);

        try {
            const { data: authData, error: authError } = await supabase.auth.signInAnonymously();
            if (authError) throw authError;

            const userId = authData.user.id;

            const { error: profileError } = await supabase.from('profiles').insert([{
                user_id: userId,
                family_id: familyData.id,
                name: name.trim(),
                role: 'recruit',
                avatar: 'star-face'
            }]);

            if (profileError) throw profileError;

            // Força o Cérebro a recarregar e entender o novo perfil
            if (reloadProfile) await reloadProfile();

            Alert.alert("BEM-VINDO! 🎉", `Você solicitou entrada na equipe ${familyData.name}. Aguarde o Admin aprovar!`);

        } catch (e) {
            Alert.alert("Erro ao entrar", "Detalhe: " + e.message);
            console.log(e);
            await supabase.auth.signOut();
        } finally {
            setLoading(false);
        }
    };

    // --- EXECUÇÃO (RECONEXÃO): VINCULA O APARELHO NOVO AO PERFIL ANTIGO ---
    const executeAnonymousLink = async (profileId, profileName) => {
        setLoading(true);
        try {
            // 1. Faz Login Fantasma
            const { data: authData, error: authError } = await supabase.auth.signInAnonymously();
            if (authError) throw authError;

            // 2. Registra o vínculo oficial na nova tabela do banco
            const { error: linkError } = await supabase.from('device_links').insert([{
                auth_id: authData.user.id,
                profile_id: profileId
            }]);

            if (linkError) throw linkError;

            // 3. AVISA O CÉREBRO: O vínculo foi feito, puxe os dados agora!
            if (reloadProfile) await reloadProfile();

            Alert.alert("RECONECTADO! 🚀", `Celular vinculado ao aventureiro ${profileName}.`);

        } catch (error) {
            Alert.alert("Erro de Vínculo", error.message);
            console.log(error);
            await supabase.auth.signOut();
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

                <View style={styles.cardWrapper}>
                    <View style={styles.cardShadow} />

                    <View style={styles.cardFront}>
                        {step === 1 && (
                            <>
                                <Text style={styles.title}>CÓDIGO DE ACESSO</Text>
                                <Text style={styles.subtitle}>Peça o código da equipe ou o seu código de reconexão ao Admin.</Text>

                                <TextInput
                                    style={styles.inputCode}
                                    placeholder="EX: A8X9P2"
                                    placeholderTextColor="#94A3B8"
                                    autoCapitalize="characters"
                                    autoCorrect={false}
                                    cursorColor="#10B981"
                                    value={code}
                                    onChangeText={(text) => setCode(text.toUpperCase().trim())}
                                />

                                <TouchableOpacity style={styles.btnPrimary} onPress={handleVerifyCode} disabled={loading} activeOpacity={0.8}>
                                    <View style={styles.btnShadow} />
                                    <View style={styles.btnFront}>
                                        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>VERIFICAR CÓDIGO</Text>}
                                    </View>
                                </TouchableOpacity>
                            </>
                        )}

                        {step === 2 && codeType === 'new_member' && (
                            <>
                                <Text style={styles.title}>QUEM É VOCÊ?</Text>
                                <Text style={styles.subtitle}>Sua equipe: <Text style={{fontWeight:'bold', color: '#10B981'}}>{familyData?.name}</Text></Text>

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

                                <TouchableOpacity style={styles.btnPrimary} onPress={handleJoinNewMember} disabled={loading} activeOpacity={0.8}>
                                    <View style={styles.btnShadow} />
                                    <View style={styles.btnFront}>
                                        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>ENTRAR NA EQUIPE</Text>}
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
    backBtn: { position: 'absolute', top: 50, left: 20, width: 44, height: 44, borderRadius: 14, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0', zIndex: 10, elevation: 2 },

    cardWrapper: { position: 'relative' },
    cardShadow: { position: 'absolute', top: 6, left: 0, width: '100%', height: '100%', backgroundColor: '#D1FAE5', borderRadius: 24 },
    cardFront: { backgroundColor: '#FFF', borderRadius: 24, padding: 30, alignItems: 'center', borderWidth: 2, borderColor: '#10B981' },

    title: { fontFamily: FONTS.bold, fontSize: 22, color: '#1E293B', marginBottom: 5, textAlign: 'center' },
    subtitle: { fontFamily: FONTS.regular, fontSize: 14, color: '#64748B', marginBottom: 25, textAlign: 'center' },

    inputCode: { width: '100%', height: 60, backgroundColor: '#F8FAFC', borderRadius: 14, borderWidth: 1, borderColor: '#E2E8F0', textAlign: 'center', fontSize: 24, fontFamily: FONTS.bold, color: '#1E293B', letterSpacing: 4, marginBottom: 25 },
    inputName: { width: '100%', height: 56, backgroundColor: '#F8FAFC', borderRadius: 14, borderWidth: 1, borderColor: '#E2E8F0', paddingHorizontal: 15, fontSize: 16, fontFamily: FONTS.bold, color: '#1E293B', marginBottom: 25 },
    label: { alignSelf: 'flex-start', fontFamily: FONTS.bold, color: '#64748B', fontSize: 11, marginBottom: 8, paddingLeft: 4, textTransform: 'uppercase' },
    avatarPlaceholder: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#ECFDF5', justifyContent: 'center', alignItems: 'center', marginBottom: 25, borderWidth: 1, borderColor: '#10B981' },

    btnPrimary: { width: '100%', height: 56, position: 'relative' },
    btnShadow: { position: 'absolute', top: 5, left: 0, width: '100%', height: '100%', backgroundColor: '#059669', borderRadius: 16 },
    btnFront: { width: '100%', height: '100%', backgroundColor: '#10B981', borderRadius: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#059669' },
    btnText: { fontFamily: FONTS.bold, color: '#fff', fontSize: 16, letterSpacing: 1 },
    btnSecondary: { marginTop: 20, padding: 10 },
    btnTextSec: { fontFamily: FONTS.bold, color: '#64748B' },
});