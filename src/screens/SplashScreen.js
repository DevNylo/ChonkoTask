import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function SplashScreen({ navigation }) {
  
  // Simula o carregamento (3 segundos) e vai pra próxima tela
  useEffect(() => {
    const timer = setTimeout(() => {
      navigation.replace('RoleSelection'); // .replace impede de voltar pra splash
    }, 3000);
    return () => clearTimeout(timer);
  }, [navigation]);

  return (
    <LinearGradient
      // Fundo roxo suave (noite)
      colors={['#4c1d95', '#8b5cf6']}
      style={styles.container}
    >
      <Text style={styles.emoji}>💤🦦</Text>
      <Text style={styles.title}>Chonko Task</Text>
      <Text style={styles.loading}>Acordando a capivara...</Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 80,
    marginBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  loading: {
    marginTop: 20,
    color: '#ddd',
  }
});