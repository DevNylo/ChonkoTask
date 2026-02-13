import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  ActivityIndicator, Alert, ImageBackground, KeyboardAvoidingView, Platform, ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput, TouchableOpacity,
  View
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { COLORS, FONTS } from '../../styles/theme';

// Componente de Input
const LoginInput = ({ label, icon, ...props }) => (
    <View style={{ marginBottom: 18 }}>
        <Text style={styles.inputLabel}>{label}</Text>
        <View style={styles.inputWrapper}>
            <MaterialCommunityIcons name={icon} size={24} color={COLORS.primary} style={{ marginLeft: 15 }} />
            <TextInput 
                style={styles.textInput}
                placeholderTextColor={COLORS.placeholder} 
                cursorColor={COLORS.primary}
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
        Alert.alert("✋ Aguardando Aprovação", "Você já pediu para entrar, mas o Capitão ainda não aprovou.");
        return;
      } 
      
      if (request && request.status === 'rejected') {
        await supabase.auth.signOut();
        Alert.alert("Acesso Negado", "Sua solicitação de entrada foi recusada.");
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
        source={require('../../../assets/WelcomeScreenBKG.png')} 
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
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                <MaterialCommunityIcons name="arrow-left" size={28} color={COLORS.primary} />
            </TouchableOpacity>

            {/* Cabeçalho */}
            <View style={styles.header}>
                <Text style={styles.title}>Bem-vindo(a) de volta</Text>
                <Text style={styles.subtitle}>Entre para acessar suas missões</Text>
            </View>

            {/* CARD DE LOGIN */}
            <View style={styles.cardWrapper}>
                <View style={styles.cardShadow} />
                
                <View style={styles.cardFront}>
                    <LoginInput 
                        label="EMAIL" 
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

                    <TouchableOpacity style={styles.forgotBtn} onPress={() => Alert.alert("Dica", "Peça ao Capitão para redefinir ou crie uma nova conta.")}>
                        <Text style={styles.forgotText}>Esqueceu a senha?</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.loginBtn} onPress={handleLogin} disabled={loading} activeOpacity={0.8}>
                        <View style={styles.btnShadow} />
                        <View style={styles.btnFront}>
                            {loading ? <ActivityIndicator color="#fff" /> : (
                                <>
                                    <Text style={styles.loginText}>ENTRAR</Text>
                                    <MaterialCommunityIcons name="login" size={24} color="#fff" style={{marginLeft: 10}} />
                                </>
                            )}
                        </View>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Rodapé */}
            <View style={styles.footer}>
                <Text style={styles.footerText}>Ainda não tem conta?</Text>
                <TouchableOpacity onPress={() => navigation.navigate('Welcome')}>
                    <Text style={styles.footerLink}>Criar ou Entrar em uma Família</Text>
                </TouchableOpacity>
            </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  
  content: { 
      padding: 25, 
      paddingTop: 180, 
      flexGrow: 1, 
      justifyContent: 'center' 
  },
  
  backBtn: { 
      position: 'absolute', top: 50, left: 20, 
      width: 44, height: 44, borderRadius: 14, 
      backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center',
      borderWidth: 1, borderColor: COLORS.primary, zIndex: 10
  },
  
  header: { alignItems: 'center', marginBottom: 30 },
  
  title: { fontSize: 28, fontFamily: FONTS.bold, color: COLORS.primary, textAlign: 'center', marginBottom: 5 },
  subtitle: { fontSize: 16, fontFamily: FONTS.regular, color: COLORS.primary, opacity: 0.7, textAlign: 'center' },

  // --- CARD ---
  cardWrapper: { 
      position: 'relative', 
      marginBottom: 20
  },
  cardShadow: {
      position: 'absolute', 
      top: 6, 
      left: 6, 
      width: '100%', 
      height: '100%', 
      backgroundColor: COLORS.shadow, 
      borderRadius: 24,
      opacity: 0.3
  },
  cardFront: {
      backgroundColor: '#FFF', 
      borderRadius: 24, 
      padding: 25,
      // AQUI ESTÁ: Borda 1px Verde Escuro
      borderWidth: 1, 
      borderColor: COLORS.primary 
  },
  
  // Inputs
  inputLabel: { fontFamily: FONTS.bold, fontSize: 12, color: COLORS.primary, marginBottom: 6, paddingLeft: 2 },
  inputWrapper: { 
      flexDirection: 'row', alignItems: 'center', 
      backgroundColor: '#F8FAFC', 
      borderRadius: 14, 
      height: 56, 
      // AQUI ESTÁ: Borda 1px Verde Escuro
      borderWidth: 1, 
      borderColor: COLORS.primary 
  },
  textInput: { flex: 1, paddingHorizontal: 12, fontSize: 16, fontFamily: FONTS.bold, color: COLORS.primary },
  
  forgotBtn: { alignSelf: 'flex-end', marginBottom: 25 },
  forgotText: { color: COLORS.primary, fontSize: 13, fontFamily: FONTS.bold, textDecorationLine: 'underline' },
  
  // Botão 3D
  loginBtn: { height: 60, position: 'relative' },
  btnShadow: { position: 'absolute', top: 4, left: 0, width: '100%', height: '100%', backgroundColor: COLORS.shadow, borderRadius: 16 },
  btnFront: { 
      width: '100%', height: '100%', backgroundColor: COLORS.primary, 
      borderRadius: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', 
      marginTop: -2, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' 
  },
  loginText: { color: '#fff', fontSize: 18, fontFamily: FONTS.bold, letterSpacing: 1 },

  // Footer
  footer: { marginTop: 20, alignItems: 'center', paddingBottom: 40 },
  footerText: { color: COLORS.primary, marginBottom: 5, fontFamily: FONTS.regular, opacity: 0.7 },
  footerLink: { color: COLORS.primary, fontFamily: FONTS.bold, fontSize: 16 }
});