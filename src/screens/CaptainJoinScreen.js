import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function CaptainJoinScreen() {
  const navigation = useNavigation();
  const [inviteCode, setInviteCode] = useState('');
  const [myName, setMyName] = useState('');

  const handleJoin = () => {
    if (!inviteCode || !myName) {
      Alert.alert("Campos vazios", "Preencha seu nome e o código que seu parceiro(a) te passou.");
      return;
    }
    
    // AQUI ESTÁ A MUDANÇA: Passando o nome escolhido para a Home
    Alert.alert("Bem-vindo(a) a bordo!", `Você agora administra a família como ${myName}.`, [
        { 
          text: "Vamos lá", 
          onPress: () => navigation.replace('CaptainHome', { captainName: myName }) 
        }
    ]);
  };

  return (
    <LinearGradient colors={['#4c1d95', '#c026d3']} style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.content}>
        
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
             <MaterialCommunityIcons name="arrow-left" size={28} color="#fff" />
        </TouchableOpacity>

        <View style={styles.iconCircle}>
            <MaterialCommunityIcons name="account-group" size={50} color="#fff" />
        </View>

        <Text style={styles.title}>Entrar no QG</Text>
        <Text style={styles.subtitle}>Gerencie junto com seu parceiro(a)</Text>

        <View style={styles.glassCard}>
          
          <Text style={styles.label}>Seu Nome (Copiloto/a)</Text>
          <TextInput 
            style={styles.input} 
            placeholder="Ex: Titia Ana, Vovô..." 
            placeholderTextColor="#ddd"
            value={myName}
            onChangeText={setMyName}
          />

          <Text style={styles.label}>Código do QG</Text>
          <TextInput 
            style={[styles.input, styles.codeInput]} 
            placeholder="VIP-CODE" 
            placeholderTextColor="rgba(255,255,255,0.5)"
            autoCapitalize="characters"
            value={inviteCode}
            onChangeText={setInviteCode}
          />

          <TouchableOpacity style={styles.button} onPress={handleJoin}>
            <Text style={styles.buttonText}>Entrar na Família</Text>
            <MaterialCommunityIcons name="check" size={24} color="#fff" style={{ marginLeft: 10 }}/>
          </TouchableOpacity>

        </View>

      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  
  backButton: { 
    position: 'absolute', 
    top: 60, 
    left: 20, 
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 20,
    padding: 8
  },
  
  iconCircle: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: 20,
    borderRadius: 50,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)'
  },
  
  title: { fontSize: 32, fontWeight: 'bold', color: '#fff', marginBottom: 5 },
  subtitle: { fontSize: 16, color: '#e0e0e0', marginBottom: 30, textAlign: 'center' },
  
  glassCard: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 25,
    padding: 25,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  label: { color: '#fff', fontSize: 14, marginBottom: 5, marginLeft: 5, fontWeight: '600' },
  input: {
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 15,
    padding: 15,
    color: '#fff',
    marginBottom: 20,
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  codeInput: { letterSpacing: 2, fontWeight: 'bold', textAlign: 'center' },
  
  button: {
    backgroundColor: '#d946ef', 
    padding: 18,
    borderRadius: 15,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#d946ef',
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 18 }
});