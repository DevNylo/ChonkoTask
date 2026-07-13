import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { View, LogBox, StatusBar, StyleSheet, Dimensions, Platform } from 'react-native';
import * as NavigationBar from 'expo-navigation-bar';
import { AuthProvider } from './src/context/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';

// IMPORTAÇÃO DA FONTE
import { useFonts, Fredoka_400Regular, Fredoka_700Bold } from '@expo-google-fonts/fredoka';
import * as SplashScreen from 'expo-splash-screen';

// Mantém a Splash Screen visível enquanto a fonte carrega
SplashScreen.preventAutoHideAsync();

// --- SILENCIADOR DE LOGS ---
const originalLog = console.log;
const originalWarn = console.warn;
const originalError = console.error;

const ignoredMessages = [
  'gl.pixelStorei',
  'doesn\'t support this parameter',
  'Three.js being imported',
  'TRN: Texture has been resized',
  'Multiple instances of Three.js',
  'EXGL: gl.pixelStorei',
  'Access to the media library',
  'setPositionAsync is not supported', // <- Silenciado aqui!
  'setBackgroundColorAsync is not supported' // <- Silenciado aqui!
];

function shouldIgnore(args) {
  const message = args.join(' ');
  return ignoredMessages.some(ignored => message.includes(ignored));
}

console.log = (...args) => { if (!shouldIgnore(args)) originalLog(...args); };
console.warn = (...args) => { if (!shouldIgnore(args)) originalWarn(...args); };
console.error = (...args) => { if (!shouldIgnore(args)) originalError(...args); };
LogBox.ignoreLogs(ignoredMessages);
// ----------------------------

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('screen');

export default function App() {
  // CARREGANDO A FREDOKA COM APELIDOS EXPLÍCITOS (À PROVA DE FALHAS)
  let [fontsLoaded] = useFonts({
    'Fredoka-Regular': Fredoka_400Regular,
    'Fredoka-Bold': Fredoka_700Bold,
  });

  // CONFIGURAÇÃO DA BARRA DE NAVEGAÇÃO DO ANDROID (Apenas garantindo a cor dos ícones agora)
  useEffect(() => {
    if (Platform.OS === 'android') {
      // Como o Edge-to-Edge já vem habilitado em versões recentes,
      // nós mantemos apenas a estilização dos botões para 'dark'.
      NavigationBar.setButtonStyleAsync('dark').catch(() => {});
    }
  }, []);

  // Esconde a Splash Screen apenas quando as fontes estiverem prontas
  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  // Evita renderizar até que a fonte esteja disponível
  if (!fontsLoaded) {
    return null;
  }

  return (
      <View style={{ flex: 1 }}>
        <AuthProvider>
          {/* StatusBar Transparente */}
          <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />

          <AppNavigator />
        </AuthProvider>
      </View>
  );
}

const styles = StyleSheet.create({
  splashOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: SCREEN_HEIGHT,
    width: SCREEN_WIDTH,
    zIndex: 9999,
    elevation: 9999,
    backgroundColor: '#ECFDF5',
  }
});