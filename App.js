import 'react-native-gesture-handler';
import React, { useEffect, useState } from 'react';
import { View, LogBox, StatusBar, StyleSheet, Dimensions } from 'react-native';
import { AuthProvider } from './src/context/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';

import { Asset } from 'expo-asset';
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
  'setPositionAsync is not supported',
  'setBackgroundColorAsync is not supported'
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
  const [resourcesLoaded, setResourcesLoaded] = useState(false);

  // CARREGANDO A FREDOKA COM APELIDOS EXPLÍCITOS (À PROVA DE FALHAS)
  let [fontsLoaded] = useFonts({
    'Fredoka-Regular': Fredoka_400Regular,
    'Fredoka-Bold': Fredoka_700Bold,
  });

  useEffect(() => {
    async function prepare() {
      try {
        await Promise.all([
          Asset.loadAsync(require('./assets/ChonkoTaskBKG.png')),
        ]);
      } catch (e) {
        originalWarn('Erro no carregamento dos assets:', e);
      } finally {
        setResourcesLoaded(true);
      }
    }
    prepare();
  }, []);

  // Esconde a Splash Screen apenas quando os assets e as fontes estiverem prontos
  useEffect(() => {
    if (resourcesLoaded && fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [resourcesLoaded, fontsLoaded]);

  // Evita renderizar até que a fonte esteja disponível
  if (!resourcesLoaded || !fontsLoaded) {
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