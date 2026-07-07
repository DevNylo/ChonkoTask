import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState } from 'react';
import {
    ActivityIndicator, Alert, Dimensions, ImageBackground, KeyboardAvoidingView, Platform, ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput, TouchableOpacity,
    View
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { FONTS } from '../../styles/theme';

const { width } = Dimensions.get('window');

// Componente de Input Padronizado (Soft Premium)
const LoginInput = ({ label, icon, ...props }) => (
    <View style={{ marginBottom: 20 }}>
        <Text style={styles.inputLabel}>{label}</Text>
        <View style={styles.inputWrapper}>
            <MaterialCommunityIcons name={icon} size={26} color="#0EA5E9" style={{ marginLeft: 15 }} />
            <TextInput
                style={styles.textInput}
                placeholderTextColor="#94A3B8"
                cursorColor="#0EA5E9"
                {...props}
            />
        </View>
    </View>
);

export default function LoginScreen({ navigation }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert("Campos vazios", "Por favor, digite seu email e senha.");
            return;
        }

        setLoading(true);

        try {
            const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (authError) throw new Error("Email ou senha incorretos.");

            const userId = authData.user.id;

            const { data: profile } = await supabase
                .from('profiles')
                .select('id')
                .eq('user_id', userId)
                .single();

            if (profile) {
                return;
            }

            const { data: request } = await supabase
                .from('join_requests')
                .select('status')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            if (request && request.status === 'pending') {
                await supabase.auth.signOut();
                Alert.alert("✋ Aguardando Aprovação", "Você já pediu para entrar, mas o Admin ainda não aprovou.");
                return;
            }

            if (request && request.status === 'rejected') {
                await supabase.auth.signOut();
                Alert.alert("Acesso Negado", "Sua solicitação de entrada foi recusada pelo Admin.");
                return;
            }

            await supabase.auth.signOut();
            Alert.alert("Conta sem Família", "Essa conta existe, mas não está vinculada a nenhuma família.");

        } catch (error) {
            Alert.alert("Erro no Acesso", error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <ImageBackground
            source={require('../../../assets/Onboarding/LoginScreen.png')} // Novo background exclusivo do Login
            style={styles.container}
            resizeMode="cover"
        >
            <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={{flex:1}}
            >
                <ScrollView
                    contentContainerStyle={styles.content}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >

                    {/* Botão Voltar */}
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
                        <MaterialCommunityIcons name="arrow-left" size={28} color="#0EA5E9" />
                    </TouchableOpacity>

                    {/* Cabeçalho */}
                    <View style={styles.header}>
                        <Text style={styles.title}>Olá novamente!</Text>
                        <Text style={styles.subtitle}>Entre para acessar suas missões</Text>
                    </View>

                    {/* CARD COM SOMBRA SALTADA (Soft Premium - Tema Azul) */}
                    <View style={styles.cardWrapper}>
                        <View style={styles.cardShadow} />

                        <View style={styles.cardFront}>
                            <LoginInput
                                label="E-MAIL"
                                icon="email-outline"
                                placeholder="exemplo@email.com"
                                value={email}
                                onChangeText={setEmail}
                                autoCapitalize="none"
                                keyboardType="email-address"
                            />

                            <LoginInput
                                label="SENHA"
                                icon="lock-outline"
                                placeholder="••••••••"
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry
                            />

                            <TouchableOpacity style={styles.forgotBtn} onPress={() => Alert.alert("Dica", "Peça ao Capitão para redefinir ou crie uma nova conta.")} activeOpacity={0.7}>
                                <Text style={styles.forgotText}>Esqueceu a senha?</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.loginBtn} onPress={handleLogin} disabled={loading} activeOpacity={0.8}>
                                {/* SOMBRA SOLIDIA (3D Dinâmico Azul Escuro) */}
                                <View style={styles.btnShadow} />
                                {/* FRENTE SÓLIDA (3D Dinâmico Azul) */}
                                <View style={styles.btnFront}>
                                    {loading ? <ActivityIndicator color="#fff" /> : (
                                        <>
                                            <Text style={styles.loginText}>ENTRAR</Text>
                                            <MaterialCommunityIcons name="login" size={24} color="#FFF" style={{marginLeft: 10}} />
                                        </>
                                    )}
                                </View>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Rodapé */}
                    <View style={styles.footer}>
                        <Text style={styles.footerText}>Ainda não tem conta?</Text>
                        <TouchableOpacity onPress={() => navigation.navigate('Welcome')} activeOpacity={0.7}>
                            <Text style={styles.footerLink}>Criar ou Entrar em uma Família</Text>
                        </TouchableOpacity>
                    </View>

                </ScrollView>
            </KeyboardAvoidingView>
        </ImageBackground>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FDFCF8' },

    content: {
        padding: 25,
        paddingTop: Platform.OS === 'ios' ? 140 : 120,
        flexGrow: 1,
        justifyContent: 'center'
    },

    backBtn: {
        position: 'absolute', top: Platform.OS === 'ios' ? 60 : 50, left: 20,
        width: 44, height: 44, borderRadius: 14,
        backgroundColor: '#F0F9FF', justifyContent: 'center', alignItems: 'center',
        borderWidth: 1, borderColor: '#BAE6FD', zIndex: 10
    },

    header: { alignItems: 'center', marginBottom: 30 },

    title: { fontSize: 32, fontFamily: FONTS.bold, color: '#0ea5e9', textAlign: 'center', marginBottom: 5, letterSpacing: 1},
    subtitle: { fontSize: 16, fontFamily: FONTS.regular, color: '#64748B', textAlign: 'center' },

    // --- CARD COM SOMBRA SALTADA (Soft Premium Azul) ---
    cardWrapper: {
        position: 'relative',
        marginBottom: 20
    },
    cardShadow: {
        position: 'absolute',
        top: 6,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(14, 165, 233, 0.15)',
        borderRadius: 24,
    },
    cardFront: {
        backgroundColor: '#FFF',
        borderRadius: 24,
        padding: 25,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.08)'
    },

    // Inputs (Soft Premium)
    inputLabel: { fontFamily: FONTS.bold, fontSize: 13, color: '#0F172A', marginBottom: 8, paddingLeft: 4, letterSpacing: 0.5 },
    inputWrapper: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#FFF',
        borderRadius: 18,
        height: 60,
        borderWidth: 1,
        borderColor: '#E2E8F0'
    },
    textInput: { flex: 1, paddingHorizontal: 15, fontSize: 16, fontFamily: FONTS.bold, color: '#0F172A' },

    forgotBtn: { alignSelf: 'flex-end', marginBottom: 25 },
    forgotText: { color: '#0EA5E9', fontSize: 14, fontFamily: FONTS.bold, textDecorationLine: 'underline', letterSpacing: .5 },

    // Botão 3D Dinâmico (Azul)
    loginBtn: { width: '100%', height: 60, position: 'relative' },
    btnShadow: { position: 'absolute', top: 5, left: 0, width: '100%', height: '100%', backgroundColor: '#0284C7', borderRadius: 16 },
    btnFront: {
        width: '100%', height: '100%', backgroundColor: '#0EA5E9',
        borderRadius: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)'
    },
    loginText: { color: '#FFF', fontSize: 18, fontFamily: FONTS.bold, letterSpacing: 1 },

    // Footer
    footer: { marginTop: 25, alignItems: 'center', paddingBottom: 40 },
    footerText: { color: '#64748B', marginBottom: 5, fontFamily: FONTS.regular, fontSize: 15 },
    footerLink: { color: '#0EA5E9', fontFamily: FONTS.bold, fontSize: 16 }
});