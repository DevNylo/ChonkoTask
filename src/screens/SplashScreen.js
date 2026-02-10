import { LinearGradient } from 'expo-linear-gradient';
import * as SplashScreen from 'expo-splash-screen'; // 1. Importar isso
import { useEffect, useState } from 'react';
import { Dimensions, ImageBackground, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming
} from 'react-native-reanimated';

import { COLORS, FONTS } from '../styles/theme';

const { width } = Dimensions.get('window');
const BAR_WIDTH = width * 0.8; 
const BAR_HEIGHT = 32;

const CAPYBARA_FACTS = [
  "Sabia que capivaras dormem na água para se esconder?",
  "O nome Capivara significa 'Comedor de Capim' em Tupi.",
  "Chonko está carregando sua barra de preguiça...",
  "Capivaras são amigas de pássaros e tartarugas.",
  "Verificando estoque de Fortunium...",
  "Limpando o habitat...",
  "Afiando os dentes..."
];

export default function CustomSplashScreen({ onFinish }) {
  const [factIndex, setFactIndex] = useState(0);
  const [isImageReady, setIsImageReady] = useState(false);
  const progressWidth = useSharedValue(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setFactIndex((prev) => (prev + 1) % CAPYBARA_FACTS.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  const handleImageLoaded = async () => {
    // 2. O PULO DO GATO:
    // A imagem de fundo carregou na memória do React.
    // Agora sim é seguro esconder a splash nativa estática.
    // O usuário nem percebe a troca.
    await SplashScreen.hideAsync();

    setIsImageReady(true);
    
    // Inicia a animação da barra
    progressWidth.value = withTiming(BAR_WIDTH - 8, { 
      duration: 8000, 
      easing: Easing.bezier(0.25, 0.1, 0.25, 1), 
    }, (finished) => {
      if (finished && onFinish) {
         runOnJS(onFinish)(); 
      }
    });
  };

  const animatedProgressStyle = useAnimatedStyle(() => ({
      width: progressWidth.value,
  }));

  return (
    <ImageBackground
      source={require('../../assets/ChonkoTaskBKG.png')}
      style={styles.container}
      resizeMode="cover"
      onLoad={handleImageLoaded} // 3. Chama a função que esconde a nativa e inicia a animação
    >
      <View style={styles.footerContainer}>
        {/* BARRA DE PROGRESSO */}
        <View style={[styles.loadingWrapper, { opacity: isImageReady ? 1 : 0 }]}>
            <View style={styles.loadingShadowBg} />
            <View style={styles.loadingTrackFront}>
                <Animated.View style={[styles.loadingFillContainer, animatedProgressStyle]}>
                    <LinearGradient
                        colors={['#6EE7B7', COLORS.secondary]} 
                        start={{ x: 0, y: 0 }} 
                        end={{ x: 1, y: 0 }}
                        style={styles.gradientFill}
                    />
                    <View style={styles.toonHighlight} />
                </Animated.View>
            </View>
        </View>

        {/* FATOS */}
        {isImageReady && (
            <Animated.View 
              key={factIndex}
              entering={FadeIn.duration(500)}
              exiting={FadeOut.duration(500)}
              style={styles.factContainer}
            >
             <View style={styles.factWrapper}>
                <View style={styles.factShadowBg} />
                <View style={styles.factBoxFront}>
                    <Text style={styles.factIcon}>💡</Text>
                    <Text style={styles.factText}>
                    {CAPYBARA_FACTS[factIndex]}
                    </Text>
                </View>
             </View>
            </Animated.View>
        )}
      </View>
    </ImageBackground>
  );
}

// ... (Mantenha os estilos iguais) ...
const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end', 
    paddingBottom: 80, 
    backgroundColor: COLORS.background 
  },
  loadingWrapper: {
    position: 'relative', width: BAR_WIDTH, height: BAR_HEIGHT, marginBottom: 30 
  },
  loadingShadowBg: {
    position: 'absolute', top: 5, left: 5, width: '100%', height: '100%',
    backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: BAR_HEIGHT / 2, 
  },
  loadingTrackFront: {
    width: '100%', height: '100%', backgroundColor: '#FFF',
    borderRadius: BAR_HEIGHT / 2, borderWidth: 3, borderColor: COLORS.primary, overflow: 'hidden',
  },
  loadingFillContainer: {
    height: '100%', borderRightWidth: 3, borderColor: COLORS.primary, position: 'relative'
  },
  gradientFill: { flex: 1, width: '100%' },
  toonHighlight: {
    position: 'absolute', top: 4, left: 4, right: 4, height: 6,
    backgroundColor: 'rgba(255,255,255,0.4)', borderRadius: 4
  },
  footerContainer: {
    width: '100%', alignItems: 'center',
  },
  factContainer: {
    width: '100%', alignItems: 'center', height: 100 
  },
  factWrapper: { position: 'relative', width: '85%' },
  factShadowBg: {
    position: 'absolute', top: 5, left: 5, width: '100%', height: '100%',
    backgroundColor: COLORS.shadow || 'rgba(0,0,0,0.2)', borderRadius: 20,
  },
  factBoxFront: {
    backgroundColor: '#FFF', borderRadius: 20, borderWidth: 3, borderColor: COLORS.primary,
    padding: 15, alignItems: 'center', width: '100%', flexDirection: 'row', justifyContent: 'center'
  },
  factIcon: { fontSize: 24, marginRight: 10 },
  factText: {
    textAlign: 'left', color: COLORS.textPrimary || '#333', fontSize: 14, 
    fontFamily: FONTS.bold || 'System', flex: 1
  }
});