import { LinearGradient } from 'expo-linear-gradient';
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

const { width, height } = Dimensions.get('window');
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

export default function SplashScreen({ onFinish }) {
  const [factIndex, setFactIndex] = useState(0);
  const [isImageReady, setIsImageReady] = useState(false);
  const progressWidth = useSharedValue(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setFactIndex((prev) => (prev + 1) % CAPYBARA_FACTS.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  const handleImageLoaded = () => {
    setIsImageReady(true);
    
    // Anima a barra
    progressWidth.value = withTiming(BAR_WIDTH - 8, { 
      duration: 7000, 
      easing: Easing.bezier(0.25, 0.1, 0.25, 1), 
    }, (finished) => {
      if (finished) {
         // --- NAVEGAÇÃO DESTRAVADA (Fluxo Normal) ---
         if (onFinish) {
            runOnJS(onFinish)(); 
         }
      }
    });
  };

  const animatedProgressStyle = useAnimatedStyle(() => {
    return {
      width: progressWidth.value,
    };
  });

  return (
    <ImageBackground
      source={require('../../assets/ChonkoTaskBKG.png')}
      style={styles.container}
      resizeMode="cover"
      onLoad={handleImageLoaded} 
    >
      
      {/* O topo agora está vazio, mostrando apenas a imagem de fundo */}

      {/* --- RODAPÉ (Barra + Fatos juntos) --- */}
      <View style={styles.footerContainer}>

        {/* BARRA DE PROGRESSO TOON */}
        <View style={[styles.loadingWrapper, { opacity: isImageReady ? 1 : 0 }]}>
            <View style={styles.loadingShadowBg} />
            <View style={styles.loadingTrackFront}>
                <Animated.View style={[styles.loadingFillContainer, animatedProgressStyle]}>
                    <LinearGradient
                        colors={['#6EE7B7', '#10B981']}
                        start={{ x: 0, y: 0 }} 
                        end={{ x: 1, y: 0 }}
                        style={styles.gradientFill}
                    />
                    <View style={styles.toonHighlight} />
                </Animated.View>
            </View>
        </View>

        {/* CAIXA DE TEXTO (Fatos) */}
        {isImageReady && (
            <Animated.View 
              key={factIndex}
              entering={FadeIn.duration(300)}
              exiting={FadeOut.duration(300)}
              style={{ width: '100%', alignItems: 'center' }}
            >
             <View style={styles.factWrapper}>
                <View style={styles.factShadowBg} />
                <View style={styles.factBoxFront}>
                    <Text style={styles.factIcon}>💡</Text>
                    {/* APLICAÇÃO DA FONTE NOVA AQUI EMBAIXO */}
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

// --- PALETA ---
const COLORS = {
    outline: '#064E3B',   
    shadow: '#047857',    
    white: '#FFFFFF',
    text: '#065F46'       
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end', 
    paddingBottom: 50, 
  },

  // --- BARRA DE PROGRESSO ---
  loadingWrapper: {
    position: 'relative', 
    width: BAR_WIDTH, 
    height: BAR_HEIGHT, 
    marginBottom: 25 
  },
  loadingShadowBg: {
    position: 'absolute', top: 5, left: 5, width: '100%', height: '100%',
    backgroundColor: COLORS.shadow, borderRadius: BAR_HEIGHT / 2,
  },
  loadingTrackFront: {
    width: '100%', height: '100%', backgroundColor: COLORS.white,
    borderRadius: BAR_HEIGHT / 2, borderWidth: 3, borderColor: COLORS.outline, overflow: 'hidden',
  },
  loadingFillContainer: {
    height: '100%', borderRightWidth: 3, borderColor: COLORS.outline, position: 'relative'
  },
  gradientFill: { flex: 1, width: '100%' },
  toonHighlight: {
    position: 'absolute', top: 4, left: 4, right: 4, height: 6,
    backgroundColor: 'rgba(255,255,255,0.4)', borderRadius: 4
  },

  // --- FOOTER COMPACTO ---
  footerContainer: {
    width: '90%', 
    alignItems: 'center',
  },
  factWrapper: { position: 'relative', width: '100%' },
  factShadowBg: {
    position: 'absolute', top: 5, left: 5, width: '100%', height: '100%',
    backgroundColor: COLORS.shadow, borderRadius: 20,
  },
  factBoxFront: {
    backgroundColor: COLORS.white, borderRadius: 20, borderWidth: 3, borderColor: COLORS.outline,
    padding: 20, alignItems: 'center', width: '100%',
  },
  factIcon: { fontSize: 26, marginBottom: 5 },
  
  // --- A MUDANÇA PRINCIPAL ESTÁ AQUI ---
  factText: {
    textAlign: 'center', 
    color: COLORS.text, 
    fontSize: 16, 
    // fontWeight removido para não conflitar
    fontFamily: 'RobotoCondensed_700Bold', 
  }
});