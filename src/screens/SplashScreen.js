import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withTiming
} from 'react-native-reanimated';

// Importe seu componente SpriteSheet
import ScaledSprite from '../components/SpriteSheet';

const { width } = Dimensions.get('window');
const BAR_WIDTH = width * 0.7; // Largura total da barra (ex: 250px)

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

  // Valor compartilhado para a LARGURA da barra (Começa em 0)
  const progressWidth = useSharedValue(0);

  useEffect(() => {
    // Loop de frases
    const interval = setInterval(() => {
      setFactIndex((prev) => (prev + 1) % CAPYBARA_FACTS.length);
    }, 2500);

    return () => clearInterval(interval);
  }, []);

  const handleImageLoaded = () => {
    setIsImageReady(true);
    
    // INICIA O CARREGAMENTO APENAS QUANDO A IMAGEM APARECE
    // Anima a largura de 0 até BAR_WIDTH em 5 segundos
    progressWidth.value = withTiming(BAR_WIDTH, {
      duration: 5000, 
      easing: Easing.bezier(0.25, 0.1, 0.25, 1), // Começa rápido e desacelera suave no final (mais natural)
    }, (finished) => {
      if (finished) {
        // --- MODO DE TESTE ---
        // Se quiser travar aqui, comente a linha abaixo.
        // Se quiser ir para o app, descomente.
        
        // runOnJS(onFinish)(); 
      }
    });
  };

  // Estilo animado que controla a largura física da barra roxa
  const animatedProgressStyle = useAnimatedStyle(() => {
    return {
      width: progressWidth.value,
    };
  });

  return (
    <LinearGradient
      colors={['#E0C3FC', '#8EC5FC']} 
      style={styles.container}
    >
      {/* --- TOPO --- */}
      <View style={styles.headerContainer}>
        <View style={styles.glassTitle}>
            <Text style={styles.titleText}>CHONKO TASK</Text>
        </View>
      </View>

      {/* --- CENTRO --- */}
      <View style={styles.centerContent}>
        
        <View style={[styles.mascotContainer, { opacity: isImageReady ? 1 : 0 }]}> 
          <View style={styles.shadowBase} />
          <ScaledSprite 
            source={require('../../assets/sprites/chonko_sprite2048.png')} 
            columns={8} rows={8}
            frameWidth={512} frameHeight={512}
            fps={24} displaySize={250}
            onLoad={handleImageLoaded} 
          />
        </View>

        {/* BARRA DE PROGRESSO (ESTILO FILL) */}
        <View style={[styles.loadingTrack, { opacity: isImageReady ? 1 : 0 }]}>
          
          {/* Barra Roxa que Cresce */}
          <Animated.View style={[styles.loadingFill, animatedProgressStyle]}>
            <LinearGradient
              // Gradiente Horizontal para dar volume à barra
              colors={['#7E22CE', '#A855F7']} 
              start={{ x: 0, y: 0 }} 
              end={{ x: 1, y: 0 }}
              style={{ flex: 1 }} 
            />
            {/* Brilho na ponta da barra (opcional, dá um charme) */}
            <View style={styles.leadingEdge} />
          </Animated.View>

        </View>

      </View>

      {/* --- BAIXO --- */}
      <View style={styles.footerContainer}>
        {isImageReady && (
            <Animated.View 
              key={factIndex}
              entering={FadeIn.duration(500)}
              exiting={FadeOut.duration(500)}
              style={styles.factWrapper}
            >
              <Text style={styles.factIcon}>💡</Text>
              <Text style={styles.factText}>
                {CAPYBARA_FACTS[factIndex]}
              </Text>
            </Animated.View>
        )}
      </View>

    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 60,
  },
  headerContainer: { width: '100%', alignItems: 'center', marginTop: 20 },
  glassTitle: {
    paddingHorizontal: 40, paddingVertical: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.25)', 
    borderRadius: 30, borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.65)',
  },
  titleText: {
    fontSize: 24, fontWeight: '900', color: '#4A148C', letterSpacing: 3, 
  },
  
  centerContent: {
    flex: 1, justifyContent: 'center', alignItems: 'center', width: '100%',
  },
  mascotContainer: {
    justifyContent: 'center', alignItems: 'center', position: 'relative', marginBottom: 30,
  },
  shadowBase: {
    position: 'absolute', bottom: '0%', width: 160, height: 18,
    borderRadius: 100, backgroundColor: 'rgba(50, 20, 90, 0.25)',
    transform: [{ scaleX: 1 }] 
  },

  // --- NOVA BARRA DE PROGRESSO ---
  loadingTrack: {
    width: BAR_WIDTH, 
    height: 20, // Um pouco mais fina fica mais elegante
    backgroundColor: 'rgba(255, 255, 255, 0.3)', // Trilho vazio
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    overflow: 'hidden', // Corta a barra interna
    justifyContent: 'center', // Centraliza verticalmente se precisar
  },
  loadingFill: {
    height: '100%',
    // width é controlado pelo Animated
    borderRadius: 10, // Acompanha a borda
    overflow: 'hidden',
    position: 'relative',
  },
  leadingEdge: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: 'rgba(255,255,255,0.8)', // Linha branca na ponta direita
    shadowColor: '#fff',
    shadowOpacity: 1,
    shadowRadius: 5,
    elevation: 5
  },

  footerContainer: {
    height: 120, width: '85%', justifyContent: 'center', alignItems: 'center',
  },
  factWrapper: {
    alignItems: 'center', padding: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.25)', 
    borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.5)'
  },
  factIcon: { fontSize: 28, marginBottom: 8 },
  factText: {
    textAlign: 'center', color: '#3B0764', fontSize: 15, fontWeight: '700', fontStyle: 'italic',
  }
});