import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import {
    ActivityIndicator,
    Alert, KeyboardAvoidingView, Platform,
    ScrollView,
    StyleSheet, Text, TextInput,
    TouchableOpacity, View
} from 'react-native';
import { supabase } from '../../lib/supabase';

export default function JoinFamilyScreen({ navigation }) {
  
  const [inviteCode, setInviteCode] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleJoinRequest = async () => {
    if (!inviteCode || !email || !password || !name) {
      Alert.alert("Campos vazios", "Por favor, preencha todos os dados.");
      return;
    }

    if (inviteCode.length < 6) {
        Alert.alert("Código Inválido", "O código deve ter 6 caracteres (Ex: A4X92Z).");
        return;
    }

    setLoading(true);

    try {
      // 1. Validar convite (Converter para maiúsculo para garantir)
      const formattedCode = inviteCode.toUpperCase();

      const { data: inviteData, error: inviteError } = await supabase
        .from('active_invites')
        .select('family_id, expires_at')
        .eq('code', formattedCode)
        .single();

      if (inviteError || !inviteData) throw new Error("Código inválido ou não encontrado.");
      if (new Date(inviteData.expires_at) < new Date()) throw new Error("Este código expirou.");

      // 2. Criar Usuário Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) throw authError;

      // 3. Criar Solicitação SIMPLES
      const { error: requestError } = await supabase
        .from('join_requests')
        .insert([{
            family_id: inviteData.family_id,
            user_id: authData.user.id,
            email: email,
            name_wanted: name,
            status: 'pending'
        }]);

      if (requestError) throw requestError;

      // 4. Logout e Sucesso
      await supabase.auth.signOut(); 

      Alert.alert(
        "Solicitação Enviada! 🚀", 
        "Agora é só aguardar o Capitão aceitar sua entrada.",
        [{ text: "Entendido", onPress: () => navigation.navigate('Login') }]
      );

    } catch (error) {
      Alert.alert("Erro", error.message);
      // Se falhar na solicitação mas criar user, desloga para tentar de novo
      await supabase.auth.signOut();
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={['#059669', '#10b981']} style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            
            <View style={styles.header}>
                <View style={styles.iconCircle}>
                    <MaterialCommunityIcons name="ticket-account" size={50} color="#fff" />
                </View>
                <Text style={styles.title}>Entrar na Família</Text>
                <Text style={styles.subtitle}>Digite o código que você recebeu</Text>
            </View>

            <View style={styles.glassCard}>
            
            <Text style={styles.sectionTitle}>CÓDIGO DE ACESSO</Text>
            <TextInput 
                style={[styles.input, styles.codeInput]} 
                placeholder="ABC-123" placeholderTextColor="#ddd"
                maxLength={6} textAlign="center"
                autoCapitalize="characters" // Força maiúsculas
                autoCorrect={false}
                value={inviteCode} onChangeText={setInviteCode}
            />

            <View style={styles.divider} />

            <Text style={styles.sectionTitle}>SEUS DADOS</Text>
            
            <Text style={styles.label}>Nome (Apelido na família)</Text>
            <TextInput 
                style={styles.input} placeholder="Ex: Mamãe, Enzo..." placeholderTextColor="#ddd"
                value={name} onChangeText={setName}
            />

            <Text style={styles.label}>Email</Text>
            <TextInput 
                style={styles.input} placeholder="email@exemplo.com" placeholderTextColor="#ddd"
                autoCapitalize="none" keyboardType="email-address"
                value={email} onChangeText={setEmail}
            />

            <Text style={styles.label}>Senha</Text>
            <TextInput 
                style={styles.input} placeholder="Mínimo 6 caracteres" placeholderTextColor="#ddd"
                secureTextEntry value={password} onChangeText={setPassword}
            />

            <TouchableOpacity style={styles.button} onPress={handleJoinRequest} disabled={loading}>
                {loading ? <ActivityIndicator color="#059669" /> : (
                    <>
                        <Text style={styles.buttonText}>Enviar Solicitação</Text>
                        <MaterialCommunityIcons name="send" size={24} color="#059669" style={{marginLeft: 10}} />
                    </>
                )}
            </TouchableOpacity>

            </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  keyboardView: { flex: 1 },
  scrollContent: { padding: 20, paddingTop: 60, paddingBottom: 40, alignItems: 'center' },
  header: { alignItems: 'center', marginBottom: 20 },
  iconCircle: {
    backgroundColor: 'rgba(255,255,255,0.2)', padding: 15, borderRadius: 50, marginBottom: 10,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)'
  },
  title: { fontSize: 28, fontWeight: 'bold', color: '#fff' },
  subtitle: { fontSize: 14, color: '#e0e0e0' },
  
  glassCard: {
    width: '100%', backgroundColor: 'rgba(255, 255, 255, 0.15)', borderRadius: 25,
    padding: 20, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  sectionTitle: { color: '#a7f3d0', fontWeight: 'bold', fontSize: 12, marginBottom: 10, letterSpacing: 1 },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.2)', marginVertical: 15 },
  
  label: { color: '#fff', fontSize: 14, marginBottom: 5, marginLeft: 5, fontWeight: '600' },
  input: {
    backgroundColor: 'rgba(0, 0, 0, 0.2)', borderRadius: 12, padding: 12, color: '#fff',
    marginBottom: 15, fontSize: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  codeInput: { fontSize: 24, fontWeight: 'bold', letterSpacing: 5, backgroundColor: 'rgba(0,0,0,0.3)' },
  
  button: {
    backgroundColor: '#fff', padding: 16, borderRadius: 15, flexDirection: 'row',
    justifyContent: 'center', alignItems: 'center', marginTop: 10,
  },
  buttonText: { color: '#059669', fontWeight: 'bold', fontSize: 18 },
});