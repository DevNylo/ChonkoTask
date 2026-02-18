import 'react-native-gesture-handler';
import React, { useEffect, useState } from 'react';
import { View, LogBox, StatusBar, StyleSheet, Dimensions } from 'react-native';
import { AuthProvider } from './src/context/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';
import CustomSplashScreen from './src/screens/SplashScreen'; 

import * as SplashScreen from 'expo-splash-screen';
import * as Font from 'expo-font';
import { Asset } from 'expo-asset';
// Importação condicional para evitar erros web/mobile se necessário, mas aqui está padrão
import { RobotoCondensed_400Regular, RobotoCondensed_700Bold } from '@expo-google-fonts/roboto-condensed';
import { useGLTF } from '@react-three/drei/native';

// --- SILENCIADOR DE LOGS (Mantido igual ao seu) ---
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

SplashScreen.preventAutoHideAsync();
const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('screen');

export default function App() {
  const [resourcesLoaded, setResourcesLoaded] = useState(false);
  const [isSplashVisible, setIsSplashVisible] = useState(true);

  useEffect(() => {
    async function prepare() {
      try {
        await Promise.all([
          Font.loadAsync({ RobotoCondensed_400Regular, RobotoCondensed_700Bold }),
          Asset.loadAsync(require('./assets/ChonkoTaskBKG.png')),
          // Asset.loadAsync(require('./assets/3D/Chonko.glb')), // Descomente se o arquivo existir
        ]);
        
        // Tenta pré-carregar o GLTF se possível
        try { 
            // Verifique se o caminho está exato, se der erro aqui ele cai no catch silencioso
            // useGLTF.preload(require('./assets/3D/Chonko.glb')); 
        } catch (e) {}

      } catch (e) {
        originalWarn('Erro no carregamento:', e);
      } finally {
        setResourcesLoaded(true);
      }
    }
    prepare();
  }, []);

  if (!resourcesLoaded) {
    return null;
  }

  return (
    <View style={{ flex: 1 }}>
      <AuthProvider>
         {/* StatusBar Transparente */}
         <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
         
         <AppNavigator />
      </AuthProvider>

      {/* Overlay da Splash Screen */}
      {isSplashVisible && (
        <View style={styles.splashOverlay}>
          <CustomSplashScreen 
            onFinish={() => setIsSplashVisible(false)} 
          />
        </View>
      )}
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