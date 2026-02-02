import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function RecruitLinkScreen() {
  const [code, setCode] = useState('');

  const handleJoin = () => {
    Alert.alert("Procurando...", `Buscando o QG com código: ${code}`);
  };

  return (
    <LinearGradient colors={['#059669', '#34d399']} style={styles.container}>
        <Text style={styles.emoji}>📡</Text>
        <Text style={styles.title}>Conectar ao QG</Text>
        
        <View style={styles.glassCard}>
          <Text style={styles.description}>
            Peça ao seu Capitão o código de acesso e digite abaixo:
          </Text>
          
          <TextInput 
            style={styles.inputCode} 
            placeholder="XC-99" 
            placeholderTextColor="rgba(255,255,255,0.5)"
            autoCapitalize="characters"
            textAlign="center"
            value={code}
            onChangeText={setCode}
          />

          <TouchableOpacity style={styles.button} onPress={handleJoin}>
            <Text style={styles.buttonText}>Entrar</Text>
          </TouchableOpacity>
        </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  emoji: { fontSize: 60, marginBottom: 10 },
  title: { fontSize: 32, fontWeight: 'bold', color: '#fff', marginBottom: 30 },
  glassCard: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 25,
    padding: 30,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
  },
  description: { color: '#fff', textAlign: 'center', marginBottom: 20, fontSize: 16 },
  inputCode: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    width: '100%',
    borderRadius: 15,
    padding: 15,
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    letterSpacing: 2,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  button: {
    width: '100%',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 15,
    alignItems: 'center',
  },
  buttonText: { color: '#059669', fontWeight: 'bold', fontSize: 18 }
});