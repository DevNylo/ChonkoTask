import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
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

// IMPORTAÇÕES PARA O POPUP DO GOOGLE/APPLE FUNCIONAR
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';

import { FONTS } from '../../styles/theme';

const { width } = Dimensions.get('window');

// Diz para o Expo que, se a tela do navegador sobrou aberta por engano, ele deve fechar
WebBrowser.maybeCompleteAuthSession();

// Componente de Input Padronizado (Solid Premium Azul)
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
    const [socialLoading, setSocialLoading] = useState(false);

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
                // Login com sucesso, navegação ou ação tratada pela AuthContext
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

    const handleSocialLogin = async (provider) => {
        setSocialLoading(true);
        try {
            const redirectUrl = makeRedirectUri();

            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: provider.toLowerCase(), // 'google' ou 'apple'
                options: {
                    redirectTo: redirectUrl,
                },
            });

            if (error) throw error;

            if (data?.url) {
                const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);

                if (result.type === 'success') {
                    // Após a pessoa logar na web, puxamos a sessão real para validar se tem família
                    const { data: sessionData } = await supabase.auth.getSession();
                    const userId = sessionData?.session?.user?.id;

                    if (userId) {
                        const { data: profile } = await supabase
                            .from('profiles')
                            .select('id')
                            .eq('user_id', userId)
                            .single();

                        if (profile) {
                            return; // AuthContext cuida do resto
                        }

                        // Lógica de verificação caso seja a primeira vez ou aguarde aprovação
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
                        Alert.alert("Conta sem Família", "Você entrou pelo Google, mas não pertence a nenhuma equipe. Crie uma nova na tela inicial.");
                    }
                }
            }
        } catch (error) {
            Alert.alert(`Erro no ${provider}`, error.message || "Não foi possível conectar.");
        } finally {
            setSocialLoading(false);
        }
    };

    return (
        <ImageBackground
            source={require('../../../assets/Onboarding/LoginScreen.png')}
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

                    {/* CARD COM SOMBRA E BORDA AZUL SÓLIDA */}
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
                                maxLength={100}
                            />

                            <LoginInput
                                label="SENHA"
                                icon="lock-outline"
                                placeholder="••••••••"
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry
                                maxLength={32}
                            />

                            <TouchableOpacity style={styles.forgotBtn} onPress={() => Alert.alert("Dica", "Peça ao Capitão para redefinir ou crie uma nova conta.")} activeOpacity={0.7}>
                                <Text style={styles.forgotText}>Esqueceu a senha?</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.loginBtn} onPress={handleLogin} disabled={loading} activeOpacity={0.8}>
                                <View style={styles.btnShadow} />
                                <View style={styles.btnFront}>
                                    {loading ? <ActivityIndicator color="#fff" /> : (
                                        <>
                                            <Text style={styles.loginText}>ENTRAR</Text>
                                            <MaterialCommunityIcons name="login" size={24} color="#FFF" style={{marginLeft: 10}} />
                                        </>
                                    )}
                                </View>
                            </TouchableOpacity>

                            {/* ÁREA SOCIAL ABAIXO DO BOTÃO DE ENTRAR */}
                            <View style={styles.socialArea}>
                                <View style={styles.dividerRow}>
                                    <View style={styles.solidLine} />
                                    <Text style={styles.dividerText}>OU ENTRAR COM</Text>
                                    <View style={styles.solidLine} />
                                </View>

                                {socialLoading ? (
                                    <ActivityIndicator color="#0EA5E9" size="large" style={{ marginVertical: 10 }} />
                                ) : (
                                    <View style={styles.socialButtonsRow}>
                                        <TouchableOpacity style={styles.socialBtn} onPress={() => handleSocialLogin('Google')} activeOpacity={0.8}>
                                            <MaterialCommunityIcons name="google" size={24} color="#DB4437" />
                                            <Text style={styles.socialBtnText}>GOOGLE</Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity style={styles.socialBtn} onPress={() => handleSocialLogin('Apple')} activeOpacity={0.8}>
                                            <MaterialCommunityIcons name="apple" size={24} color="#000000" />
                                            <Text style={styles.socialBtnText}>APPLE</Text>
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </View>

                        </View>
                    </View>

                    {/* Rodapé */}
                    <View style={styles.footer}>
                        <Text style={styles.footerText}>Ainda não tem conta?</Text>
                        <TouchableOpacity onPress={() => navigation.navigate('Welcome')} activeOpacity={0.7}>
                            <Text style={styles.footerLink}>Criar ou Entrar em uma Equipe</Text>
                        </TouchableOpacity>
                    </View>

                </ScrollView>
            </KeyboardAvoidingView>
        </ImageBackground>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },

    content: {
        padding: 25,
        paddingTop: Platform.OS === 'ios' ? 140 : 120,
        flexGrow: 1,
        justifyContent: 'center'
    },

    backBtn: {
        position: 'absolute', top: Platform.OS === 'ios' ? 60 : 50, left: 20,
        width: 44, height: 44, borderRadius: 14,
        backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center',
        borderWidth: 1, borderColor: '#E2E8F0', zIndex: 10,
        elevation: 2
    },

    header: { alignItems: 'center', marginBottom: 30 },

    title: { fontSize: 32, fontFamily: FONTS.bold, color: '#0EA5E9', textAlign: 'center', marginBottom: 5, letterSpacing: 1},
    subtitle: { fontSize: 16, fontFamily: FONTS.regular, color: '#1E293B', textAlign: 'center' },

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
        backgroundColor: '#BAE6FD',
        borderRadius: 24,
    },
    cardFront: {
        backgroundColor: '#FFF',
        borderRadius: 24,
        padding: 25,
        borderWidth: 2,
        borderColor: '#0EA5E9',
    },

    inputLabel: { fontFamily: FONTS.bold, fontSize: 13, color: '#1E293B', marginBottom: 8, paddingLeft: 4, letterSpacing: 0.5 },
    inputWrapper: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#F8FAFC',
        borderRadius: 18,
        height: 60,
        borderWidth: 1,
        borderColor: '#E2E8F0'
    },
    // FONTE REGULAR NO PREENCHIMENTO
    textInput: { flex: 1, paddingHorizontal: 15, fontSize: 16, fontFamily: FONTS.regular, color: '#1E293B' },

    forgotBtn: { alignSelf: 'flex-end', marginBottom: 25 },
    forgotText: { color: '#0EA5E9', fontSize: 14, fontFamily: FONTS.bold, textDecorationLine: 'underline', letterSpacing: .5 },

    loginBtn: { width: '100%', height: 60, position: 'relative' },
    btnShadow: { position: 'absolute', top: 5, left: 0, width: '100%', height: '100%', backgroundColor: '#0284C7', borderRadius: 16 },
    btnFront: {
        width: '100%', height: '100%', backgroundColor: '#0EA5E9',
        borderRadius: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
        borderWidth: 1, borderColor: '#0284C7'
    },
    loginText: { color: '#FFF', fontSize: 18, fontFamily: FONTS.bold, letterSpacing: 1 },

    // Estilos Sociais
    socialArea: { marginTop: 25, alignItems: 'center', width: '100%' },
    dividerRow: { flexDirection: 'row', alignItems: 'center', width: '100%', marginBottom: 15, gap: 10 },
    solidLine: { flex: 1, height: 2, backgroundColor: '#E0F2FE' },
    dividerText: { fontSize: 11, fontFamily: FONTS.bold, color: '#0EA5E9', letterSpacing: 1 },

    socialButtonsRow: { flexDirection: 'row', gap: 15, width: '100%' },
    socialBtn: { flex: 1, height: 50, borderRadius: 16, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
    socialBtnText: { fontFamily: FONTS.bold, fontSize: 13, color: '#475569', letterSpacing: 0.5 },

    footer: { marginTop: 25, alignItems: 'center', paddingBottom: 40 },
    footerText: { color: '#64748B', marginBottom: 5, fontFamily: FONTS.regular, fontSize: 15 },
    footerLink: { color: '#0EA5E9', fontFamily: FONTS.bold, fontSize: 16 }
});