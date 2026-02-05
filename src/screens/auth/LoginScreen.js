import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView,
  StyleSheet,
  Text,
  TextInput, TouchableOpacity,
  View
} from 'react-native';
import { supabase } from '../../lib/supabase';
// import { useAuth } from '../../context/AuthContext'; // Pode manter se quiser usar o contexto global depois

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
      // 1. Tentar Login (Verifica senha)
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw new Error("Email ou senha incorretos.");

      const userId = authData.user.id;

      // 2. Verificar se já tem Perfil Aprovado (Membro Oficial)
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (profile) {
        // SUCESSO: Tem perfil, o AuthContext vai detectar a sessão e liberar o acesso.
        // Se não redirecionar automático, descomente a linha abaixo:
        // navigation.replace('RoleSelection');
        return; 
      }

      // 3. Se não tem perfil, verificar se está na Fila de Espera
      const { data: request } = await supabase
        .from('join_requests')
        .select('status')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      // 🛑 LÓGICA DE BARRAGEM
      if (request && request.status === 'pending') {
        await supabase.auth.signOut(); // Chuta para fora
        Alert.alert(
          "✋ Aguardando Aprovação", 
          "Você já pediu para entrar, mas o Capitão ainda não aprovou.\n\nPeça para ele liberar seu acesso no app dele!"
        );
        return;
      } 
      
      if (request && request.status === 'rejected') {
        await supabase.auth.signOut();
        Alert.alert("Acesso Negado", "Sua solicitação de entrada foi recusada.");
        return;
      }

      // 4. Caso Raro: Logou mas não tem nada (Conta órfã)
      await supabase.auth.signOut();
      Alert.alert(
        "Conta sem Família", 
        "Essa conta existe, mas não está vinculada a nenhuma família. Volte e use um código de convite."
      );

    } catch (error) {
      Alert.alert("Erro no Acesso", error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#4c1d95', '#F3F4F6', '#F3F4F6']} style={styles.background} />
      
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{flex:1}}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            
            {/* Botão Voltar */}
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                <MaterialCommunityIcons name="arrow-left" size={28} color="#fff" />
            </TouchableOpacity>

            {/* Cabeçalho */}
            <View style={styles.header}>
                <View style={styles.iconCircle}>
                    <MaterialCommunityIcons name="shield-key" size={50} color="#4c1d95" />
                </View>
                <Text style={styles.title}>Bem-vindo de volta</Text>
                <Text style={styles.subtitle}>Entre para acessar suas missões</Text>
            </View>

            {/* Formulário */}
            <View style={styles.formCard}>
                
                <Text style={styles.label}>Seu Email</Text>
                <View style={styles.inputContainer}>
                    <MaterialCommunityIcons name="email-outline" size={20} color="#666" style={styles.inputIcon} />
                    <TextInput 
                        style={styles.input}
                        placeholder="exemplo@email.com"
                        placeholderTextColor="#999"
                        value={email}
                        onChangeText={setEmail}
                        autoCapitalize="none"
                        keyboardType="email-address"
                    />
                </View>

                <Text style={styles.label}>Sua Senha</Text>
                <View style={styles.inputContainer}>
                    <MaterialCommunityIcons name="lock-outline" size={20} color="#666" style={styles.inputIcon} />
                    <TextInput 
                        style={styles.input}
                        placeholder="••••••••"
                        placeholderTextColor="#999"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                    />
                </View>

                <TouchableOpacity style={styles.forgotBtn} onPress={() => Alert.alert("Dica", "Peça ao Capitão para redefinir ou crie uma nova conta.")}>
                    <Text style={styles.forgotText}>Esqueceu a senha?</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.loginBtn} onPress={handleLogin} disabled={loading}>
                    {loading ? <ActivityIndicator color="#fff" /> : (
                        <>
                            <Text style={styles.loginText}>Acessar QG</Text>
                            <MaterialCommunityIcons name="arrow-right" size={24} color="#fff" style={{marginLeft: 10}} />
                        </>
                    )}
                </TouchableOpacity>

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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  background: { position: 'absolute', left: 0, right: 0, top: 0, height: '40%' }, // Fundo roxo só em cima
  
  content: { padding: 20, paddingTop: 50, flexGrow: 1, justifyContent: 'center' },
  backBtn: { marginBottom: 20, width: 40 },
  
  header: { alignItems: 'center', marginBottom: 30 },
  iconCircle: { 
    width: 90, height: 90, backgroundColor: '#fff', borderRadius: 45, 
    justifyContent: 'center', alignItems: 'center', marginBottom: 15,
    elevation: 10, shadowColor: '#000', shadowOpacity: 0.2, shadowOffset: {width:0, height:4}
  },
  title: { fontSize: 28, fontWeight: 'bold', color: '#4c1d95', textAlign: 'center' }, // Cor roxa escura para contraste
  subtitle: { fontSize: 16, color: '#6b7280', marginTop: 5, textAlign: 'center' },

  formCard: {
    backgroundColor: '#fff', borderRadius: 25, padding: 25,
    elevation: 4, shadowColor: '#000', shadowOpacity: 0.05, shadowOffset: {width:0, height:2}
  },
  
  label: { fontSize: 14, fontWeight: 'bold', color: '#374151', marginBottom: 8, marginLeft: 4 },
  inputContainer: { 
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', 
    borderRadius: 15, paddingHorizontal: 15, height: 55, marginBottom: 20,
    borderWidth: 1, borderColor: '#E5E7EB'
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 16, color: '#333', height: '100%' },
  
  forgotBtn: { alignSelf: 'flex-end', marginBottom: 20 },
  forgotText: { color: '#6b7280', fontSize: 13, fontWeight: '500' },
  
  loginBtn: {
    backgroundColor: '#4c1d95', borderRadius: 15, height: 58,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    elevation: 5, shadowColor: '#4c1d95', shadowOpacity: 0.4, shadowOffset: {width:0, height:4}
  },
  loginText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },

  footer: { marginTop: 40, alignItems: 'center' },
  footerText: { color: '#6b7280', marginBottom: 5 },
  footerLink: { color: '#4c1d95', fontWeight: 'bold', fontSize: 16 }
});