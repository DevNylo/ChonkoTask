import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { supabase } from '../../lib/supabase';

export default function RegisterCaptainScreen() {
  // A função signUp vem do AuthContext, mas aqui usaremos direto o supabase
  // para ter controle total da sequência (Auth -> Family -> Profile)
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [familyName, setFamilyName] = useState('');
  const [captainName, setCaptainName] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreateHQ = async () => {
    if (!email || !password || !familyName || !captainName || !pin) {
      Alert.alert("Atenção", "Preencha todos os campos.");
      return;
    }
    if (pin.length < 4) return Alert.alert("Segurança", "O PIN precisa de 4 dígitos.");

    setLoading(true);

    try {
      // 1. Criar Usuário (Auth)
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("Erro ao criar conta.");

      const userId = authData.user.id;

      // 2. Criar Família (SEM código de convite agora - isso é mais seguro!)
      const { data: familyData, error: familyError } = await supabase
        .from('families')
        .insert([{ 
            name: familyName, 
            created_by: userId 
        }])
        .select()
        .single();

      if (familyError) throw familyError;

      // 3. Criar Perfil do Capitão
      const { error: profileError } = await supabase
        .from('profiles')
        .insert([{
            user_id: userId,
            family_id: familyData.id,
            name: captainName,
            role: 'captain',
            pin: pin,
            avatar: 'face-man-profile'
        }]);

      if (profileError) throw profileError;

      // Sucesso! O AuthContext vai detectar a sessão automaticamente
      // e o AppNavigator vai te levar para a RoleSelectionScreen

    } catch (error) {
      Alert.alert("Erro ao criar QG", error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={['#4c1d95', '#c026d3']} style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            
            <View style={styles.header}>
                <View style={styles.iconCircle}>
                    <MaterialCommunityIcons name="shield-crown" size={50} color="#fff" />
                </View>
                <Text style={styles.title}>Novo QG</Text>
                <Text style={styles.subtitle}>Configure sua base familiar</Text>
            </View>

            <View style={styles.glassCard}>
            
            <Text style={styles.sectionTitle}>ACESSO DO CAPITÃO</Text>
            
            <Text style={styles.label}>Email (Login)</Text>
            <TextInput 
                style={styles.input} 
                placeholder="seu@email.com" 
                placeholderTextColor="#ddd"
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
            />

            <Text style={styles.label}>Senha</Text>
            <TextInput 
                style={styles.input} 
                placeholder="Mínimo 6 caracteres" 
                placeholderTextColor="#ddd"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
            />

            <View style={styles.divider} />
            <Text style={styles.sectionTitle}>CONFIGURAÇÃO DA FAMÍLIA</Text>

            <Text style={styles.label}>Nome da Família</Text>
            <TextInput 
                style={styles.input} 
                placeholder="Ex: Família Incrível" 
                placeholderTextColor="#ddd"
                value={familyName}
                onChangeText={setFamilyName}
            />

            <Text style={styles.label}>Seu Nome no App</Text>
            <TextInput 
                style={styles.input} 
                placeholder="Ex: Papai, Mamãe..." 
                placeholderTextColor="#ddd"
                value={captainName}
                onChangeText={setCaptainName}
            />

            <Text style={styles.label}>PIN de Segurança (4 dígitos)</Text>
            <TextInput 
                style={styles.input} 
                placeholder="1234" 
                placeholderTextColor="#ddd"
                keyboardType="numeric"
                maxLength={4}
                secureTextEntry
                value={pin}
                onChangeText={setPin}
            />

            <TouchableOpacity style={styles.button} onPress={handleCreateHQ} disabled={loading}>
                {loading ? <ActivityIndicator color="#4c1d95" /> : (
                    <>
                        <Text style={styles.buttonText}>Fundar QG</Text>
                        <MaterialCommunityIcons name="check" size={24} color="#4c1d95" style={{marginLeft: 10}} />
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
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: 20,
    borderRadius: 50,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)'
  },
  title: { fontSize: 32, fontWeight: 'bold', color: '#fff', marginBottom: 5 },
  subtitle: { fontSize: 16, color: '#e0e0e0' },
  glassCard: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 25,
    padding: 25,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  sectionTitle: { color: '#fbbf24', fontWeight: 'bold', fontSize: 12, marginBottom: 10, letterSpacing: 1 },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.2)', marginVertical: 15 },
  label: { color: '#fff', fontSize: 14, marginBottom: 5, marginLeft: 5, fontWeight: '600' },
  input: {
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 15,
    padding: 15,
    color: '#fff',
    marginBottom: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  button: {
    backgroundColor: '#fbbf24',
    padding: 18,
    borderRadius: 15,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: { color: '#4c1d95', fontWeight: 'bold', fontSize: 18 },
});