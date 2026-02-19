import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ExpoSplashScreen from 'expo-splash-screen'; // Import renomeado para não conflitar com o nome da sua função
import { useEffect, useState } from 'react';
import { Dimensions, ImageBackground, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
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

// Sub-componente mágico para as estrelinhas piscantes ao redor da barra
const PulsingStar = ({ top, left, right, bottom, size = 16, color = '#FFF' }) => {
  const opacity = useSharedValue(0.1);

  useEffect(() => {
    // Cria um efeito de piscar com velocidades levemente aleatórias para parecer natural
    opacity.value = withRepeat(
      withTiming(1, { duration: 600 + Math.random() * 600 }), 
      -1, 
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View style={[{ position: 'absolute', top, left, right, bottom, zIndex: -1 }, animatedStyle]}>
      <MaterialCommunityIcons name="star-four-points" size={size} color={color} />
    </Animated.View>
  );
};

// NOME RESTAURADO PARA O SEU PADRÃO
export default function SplashScreen({ onFinish }) {
  const [factIndex, setFactIndex] = useState(0);
  const [isImageReady, setIsImageReady] = useState(false);
  const progressWidth = useSharedValue(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setFactIndex((prev) => (prev + 1) % CAPYBARA_FACTS.length);
    }, 3000); 
    return () => clearInterval(interval);
  }, []);

  const handleImageLoaded = async () => {
    await ExpoSplashScreen.hideAsync();
    setIsImageReady(true);
    
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
      onLoad={handleImageLoaded}
    >
      <View style={styles.footerContainer}>
        {/* BARRA DE PROGRESSO COM BRILHO ESTELAR */}
        <View style={[styles.loadingWrapper, { opacity: isImageReady ? 1 : 0 }]}>
            
            {/* Efeito Neon Externo */}
            <View style={styles.loadingNeonGlow} />
            <View style={styles.loadingShadowBg} />

            {/* Estrelas Mágicas flutuando em volta */}
            <PulsingStar top={-15} left={10} size={20} color="#d1edfa" />
            <PulsingStar bottom={-10} left={80} size={14} color="#00aeff" />
            <PulsingStar top={-10} right={40} size={18} color="#FFF" />
            <PulsingStar bottom={-18} right={10} size={22} color="#d1edfa" />

            {/* Trilho da Barra */}
            <View style={styles.loadingTrackFront}>
                <Animated.View style={[styles.loadingFillContainer, animatedProgressStyle]}>
                    <LinearGradient
                        colors={['#d1edfa', '#00aeff', '#0074aa']} 
                        start={{ x: 0, y: 0 }} 
                        end={{ x: 1, y: 0 }}
                        style={styles.gradientFill}
                    />
                    <View style={styles.toonHighlight} />

                    {/* A ESTRELA NA PONTA DA BARRA */}
                    <View style={styles.tipStarContainer}>
                        <MaterialCommunityIcons name="creation" size={24} color="#FFF" />
                    </View>
                </Animated.View>
            </View>
        </View>

        {/* CAIXA DE FATOS */}
        {isImageReady && (
            <Animated.View 
              key={factIndex}
              entering={FadeIn.duration(600)} 
              exiting={FadeOut.duration(600)}
              style={styles.factContainer}
            >
             <View style={styles.factWrapper}>
                <View style={styles.factShadowBg} />
                <View style={styles.factBoxFront}>
                    <MaterialCommunityIcons 
                        name="lightbulb-on-outline" 
                        size={26} 
                        color={'#0074aa'} 
                        style={{ marginRight: 12 }} 
                    />
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end', 
    paddingBottom: 80, 
    backgroundColor: COLORS.background 
  },
  
  // --- ÁREA DE CARREGAMENTO MÁGICA ---
  loadingWrapper: {
    position: 'relative', 
    width: BAR_WIDTH, 
    height: BAR_HEIGHT, 
    marginBottom: 40 
  },
  loadingNeonGlow: {
    position: 'absolute', 
    top: 0, left: 0, 
    width: '100%', height: '100%',
    backgroundColor: '#00aeff',
    borderRadius: BAR_HEIGHT / 2,
    opacity: 0.4,
    transform: [{ scale: 1.1 }],
    shadowColor: '#00aeff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 15,
    elevation: 10,
  },
  loadingShadowBg: {
    position: 'absolute', top: 4, left: 0, width: '100%', height: '100%',
    backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: BAR_HEIGHT / 2, 
    transform: [{ scaleX: 0.98 }] 
  },
  loadingTrackFront: {
    width: '100%', height: '100%', 
    backgroundColor: 'rgba(255,255,255,0.85)', 
    borderRadius: BAR_HEIGHT / 2, 
    borderWidth: 3, borderColor: '#FFF', 
    overflow: 'hidden', 
  },
  loadingFillContainer: {
    height: '100%', 
    borderRightWidth: 2, borderColor: '#d1edfa', 
    position: 'relative',
    overflow: 'visible' // Necessário para a estrela na ponta não ser cortada
  },
  gradientFill: { flex: 1, width: '100%', borderRadius: BAR_HEIGHT / 2 },
  toonHighlight: {
    position: 'absolute', top: 3, left: 3, right: 3, height: 5,
    backgroundColor: 'rgba(255,255,255,0.5)', borderRadius: 4
  },
  tipStarContainer: {
    position: 'absolute',
    right: -10, // Metade do ícone para fora
    top: '50%',
    marginTop: -12, // Centraliza perfeitamente no eixo Y
    textShadowColor: 'rgba(255, 255, 255, 0.8)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },

  // --- CAIXA DE FATOS ---
  footerContainer: {
    width: '100%', alignItems: 'center',
  },
  factContainer: {
    width: '100%', alignItems: 'center', height: 110 
  },
  factWrapper: { position: 'relative', width: '85%', maxWidth: 340 },
  factShadowBg: {
    position: 'absolute', top: 6, left: 0, width: '100%', height: '100%',
    backgroundColor: 'rgba(0,0,0,0.15)', 
    borderRadius: 26,
    transform: [{ scaleX: 0.98 }]
  },
  factBoxFront: {
    backgroundColor: 'rgba(255, 255, 255, 0.92)', 
    borderRadius: 26, 
    borderWidth: 2.5, 
    borderColor: '#0074aa', 
    paddingVertical: 18,
    paddingHorizontal: 20,
    alignItems: 'center', width: '100%', flexDirection: 'row', justifyContent: 'center',
  },
  factText: {
    textAlign: 'left', color: '#0074aa',
    fontSize: 15, 
    fontFamily: FONTS.bold || 'System', flex: 1,
    lineHeight: 20
  }
});