import { LilitaOne_400Regular, useFonts } from '@expo-google-fonts/lilita-one';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export default function SignBoard({ title = "LOJINHA DO PAPAI" }) {
  // Carrega a fonte antes de renderizar
  let [fontsLoaded] = useFonts({
    LilitaOne_400Regular,
  });

  if (!fontsLoaded) {
    return null; // O App vai aguardar o carregamento silenciosamente
  }

  return (
      <View style={styles.container}>

        {/* Cordinhas/Hastes de sustentação da placa */}
        <View style={styles.ropesContainer}>
          <View style={styles.rope} />
          <View style={styles.rope} />
        </View>

        {/* Placa Sólida */}
        <View style={styles.solidSign}>
          <Text style={styles.signText} numberOfLines={2}>
            {title}
          </Text>
        </View>

      </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
  },

  // --- HASTES/CORDAS ---
  ropesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: 140, // Distância entre as cordas
    marginBottom: -6, // Faz a corda "entrar" na placa
    zIndex: 1,
  },
  rope: {
    width: 10,
    height: 25,
    backgroundColor: '#78350F', // Marrom escuro da madeira/corda
    borderRadius: 5,
  },

  // --- PLACA SÓLIDA ---
  solidSign: {
    backgroundColor: '#F59E0B', // Laranja Sólido
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderRadius: 16,
    borderWidth: 4,
    borderColor: '#B45309', // Borda mais escura para dar profundidade

    // Sombra para destacar do fundo
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 8,

    minWidth: 260,
    alignItems: 'center',
    zIndex: 2,
  },

  // --- TEXTO ---
  signText: {
    fontFamily: 'LilitaOne_400Regular',
    fontSize: 26,
    color: '#FEF3C7', // Amarelo bem clarinho (creme) para contraste
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 1,

    // Efeito de sombra no texto para imitar entalhe/profundidade
    textShadowColor: 'rgba(69, 26, 3, 0.5)',
    textShadowOffset: { width: 1, height: 2 },
    textShadowRadius: 2,
  },
});