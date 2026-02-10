import { useEffect, useState } from 'react';
import { Dimensions, LogBox, Platform, StatusBar, StyleSheet, View } from 'react-native';
import 'react-native-gesture-handler';
import { AuthProvider } from './src/context/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';
import CustomSplashScreen from './src/screens/SplashScreen';

import { RobotoCondensed_400Regular, RobotoCondensed_700Bold } from '@expo-google-fonts/roboto-condensed';
import { useGLTF } from '@react-three/drei/native';
import { Asset } from 'expo-asset';
import * as Font from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';

// 1. IMPORTAÇÃO DA BIBLIOTECA QUE CONTROLA A BARRA DE BAIXO
import * as NavigationBar from 'expo-navigation-bar';

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
  'EXGL: gl.pixelStorei'
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
        // 2. CONFIGURAÇÃO DA BARRA DE NAVEGAÇÃO (ANDROID)
        // Isso remove o fundo branco dos botões de baixo
        if (Platform.OS === 'android') {
          // Faz a barra flutuar sobre o app em vez de empurrar o conteúdo
          await NavigationBar.setPositionAsync('absolute');
          // Define a cor como totalmente transparente
          await NavigationBar.setBackgroundColorAsync('#ffffff00');
          // (Opcional) Deixa os ícones (triângulo, bola, quadrado) escuros ou claros
          // Use 'dark' se seu fundo for claro, ou 'light' se for escuro
          await NavigationBar.setButtonStyleAsync('dark'); 
        }

        await Promise.all([
          Font.loadAsync({ RobotoCondensed_400Regular, RobotoCondensed_700Bold }),
          Asset.loadAsync(require('./assets/3D/Chonko.glb')),
          Asset.loadAsync(require('./assets/ChonkoTaskBKG.png')),
        ]);
        
        try { useGLTF.preload(require('./assets/3D/Chonko.glb')); } catch (e) {}

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
         {/* StatusBar Transparente (Barra de Cima) */}
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
    // Garante que ocupe a tela REAL do dispositivo
    height: SCREEN_HEIGHT, 
    width: SCREEN_WIDTH,
    zIndex: 9999,      
    elevation: 9999,   
    backgroundColor: '#ECFDF5', 
  }
});