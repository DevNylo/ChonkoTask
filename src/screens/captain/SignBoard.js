import React from 'react';
import { ImageBackground, Text, StyleSheet, View } from 'react-native';
import { useFonts, LilitaOne_400Regular } from '@expo-google-fonts/lilita-one';

// Importe sua imagem local aqui
const signImage = require('../../assets/images/ChonkoTaskPlaca.png'); 

export default function SignBoard() {
  // Carrega a fonte antes de renderizar
  let [fontsLoaded] = useFonts({
    LilitaOne_400Regular,
  });

  if (!fontsLoaded) {
    return null; // Ou um <ActivityIndicator />
  }

  return (
    <View style={styles.container}>
      <ImageBackground 
        source={signImage} 
        style={styles.signBackground}
        resizeMode="contain" // Garante que a placa não distorça
      >
        <Text style={styles.signText}>
          LOJINHA DO PAPAI
        </Text>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20,
  },
  signBackground: {
    width: 300,  // Ajuste a largura conforme necessário
    height: 120, // Ajuste a altura proporcional à imagem original
    justifyContent: 'center', // Centraliza verticalmente
    alignItems: 'center',     // Centraliza horizontalmente
    // Se o texto precisar subir/descer um pouco devido à perspectiva da arte, use padding:
    paddingTop: 10, 
  },
  signText: {
    fontFamily: 'LilitaOne_400Regular', // Nome exato da fonte carregada
    fontSize: 24,
    color: '#FDE047', // Um amarelo claro/creme costuma contrastar bem com madeira
    textAlign: 'center',
    
    // Efeito de sombra para dar leitura na madeira (stroke fake)
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 3,
    
    // Caso precise quebrar linha
    width: '80%', 
  },
});