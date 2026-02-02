import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
// IMPORTAR ÍCONES
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function CaptainSetupScreen({ navigation }) {
  const [familyName, setFamilyName] = useState('');
  const [captainName, setCaptainName] = useState('');
  const [pin, setPin] = useState('');

  const handleCreateHQ = () => {
    if (!familyName || !captainName || !pin) {
      Alert.alert("Opa!", "Preencha tudo para fundar o QG.");
      return;
    }
    navigation.replace('CaptainHome');
  };

  return (
    <LinearGradient colors={['#4c1d95', '#c026d3']} style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
        
        {/* Ícone de Castelo/QG */}
        <View style={styles.iconCircle}>
            <MaterialCommunityIcons name="castle" size={50} color="#fff" />
        </View>

        <Text style={styles.title}>Fundar QG</Text>
        <Text style={styles.subtitle}>Crie o servidor da sua casa</Text>

        <View style={styles.glassCard}>
          
          <Text style={styles.label}>Nome da Família</Text>
          <TextInput 
            style={styles.input} 
            placeholder="Ex: Família Silva" 
            placeholderTextColor="#ddd"
            value={familyName}
            onChangeText={setFamilyName}
          />

          <Text style={styles.label}>Seu Nome de Capitão</Text>
          <TextInput 
            style={styles.input} 
            placeholder="Ex: Papai Dan" 
            placeholderTextColor="#ddd"
            value={captainName}
            onChangeText={setCaptainName}
          />

          <Text style={styles.label}>PIN de Segurança (4 dígitos)</Text>
          <TextInput 
            style={styles.input} 
            placeholder="****" 
            placeholderTextColor="#ddd"
            keyboardType="numeric"
            maxLength={4}
            secureTextEntry
            value={pin}
            onChangeText={setPin}
          />

          <TouchableOpacity style={styles.button} onPress={handleCreateHQ}>
            <Text style={styles.buttonText}>Criar QG</Text>
            <MaterialCommunityIcons name="arrow-right" size={20} color="#4c1d95" style={{marginLeft: 10}} />
          </TouchableOpacity>

        </View>

      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  keyboardView: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  
  iconCircle: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: 20,
    borderRadius: 50,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)'
  },
  
  title: { fontSize: 32, fontWeight: 'bold', color: '#fff', marginBottom: 5 },
  subtitle: { fontSize: 16, color: '#e0e0e0', marginBottom: 30 },
  
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
  button: {
    backgroundColor: '#fbbf24',
    padding: 18,
    borderRadius: 15,
    flexDirection: 'row', // Para alinhar texto e ícone
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#fbbf24',
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
  buttonText: { color: '#4c1d95', fontWeight: 'bold', fontSize: 18 }
});