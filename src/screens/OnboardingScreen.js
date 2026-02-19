import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useRef, useState } from 'react';
import {
    Dimensions,
    FlatList,
    Platform,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

// TEMA OFICIAL
import { FONTS } from '../styles/theme';

const { width, height } = Dimensions.get('window');

// OS DADOS DAS NOSSAS 3 ABAS ESTÃO AQUI
const SLIDES = [
  {
    id: '1',
    title: 'Transforme Deveres\nem Aventuras',
    description: 'Chega de repetir a mesma coisa 10 vezes. Crie missões diárias e deixe que o Chonko motive seus filhos a cumprirem a rotina brincando.',
    icon: 'sword-cross', // Ícone de aventura
    color: '#0ea5e9', // Azul
    bgColor: '#e0f2fe',
    shadowColor: '#bae6fd',
  },
  {
    id: '2',
    title: 'A Moeda\ndo Esforço',
    description: 'Defina recompensas reais — como sorvete ou videogame. Seu filho aprende que para ganhar, é preciso conquistar. Sem mesada automática.',
    icon: 'piggy-bank', // Ícone de cofre/moeda
    color: '#f59e0b', // Laranja/Dourado
    bgColor: '#fef3c7',
    shadowColor: '#fde68a',
  },
  {
    id: '3',
    title: 'Controle Total,\nDiversão Real',
    description: 'Você aprova as missões por fotos e os prêmios vão para a Mochila deles. Eles pedem, você aprova a entrega. Organização para você, magia para eles.',
    icon: 'shield-check', // Ícone de aprovação/controle
    color: '#10b981', // Verde
    bgColor: '#d1fae5',
    shadowColor: '#a7f3d0',
  }
];

export default function OnboardingScreen() {
  const navigation = useNavigation();
  const [currentIndex, setCurrentIndex] = useState(0);
  const slidesRef = useRef(null);

  // Monitora qual aba está visível na tela
  const viewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems && viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index);
    }
  }).current;

  const viewConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  // Função para o botão "Próximo" ou "Começar"
  const scrollToNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      slidesRef.current.scrollToIndex({ index: currentIndex + 1 });
    } else {
      // Se for a última tela, vai para a WelcomeScreen (onde ele escolhe se é Capitão ou Recruta)
      navigation.replace('WelcomeScreen'); 
    }
  };

  // Função para pular direto para o final
  const skipToWelcome = () => {
    navigation.replace('WelcomeScreen');
  };

  // O Design individual de cada Aba do Carrossel
  const OnboardingItem = ({ item }) => {
    return (
      <View style={styles.itemContainer}>
        {/* Ícone com visual Chonko (Borda grossa, sombra) */}
        <View style={styles.iconShowcase}>
          <View style={[styles.iconShadow, { backgroundColor: item.shadowColor }]} />
          <View style={[styles.iconCircle, { backgroundColor: item.bgColor, borderColor: item.color }]}>
            <MaterialCommunityIcons name={item.icon} size={80} color={item.color} />
          </View>
        </View>

        {/* Textos */}
        <View style={styles.textContainer}>
          <Text style={[styles.title, { color: item.color }]}>{item.title}</Text>
          <Text style={styles.description}>{item.description}</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* BOTÃO PULAR */}
      <View style={styles.header}>
        {currentIndex < SLIDES.length - 1 && (
          <TouchableOpacity onPress={skipToWelcome} style={styles.skipButton}>
            <Text style={styles.skipText}>Pular</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* CARROSSEL */}
      <View style={{ flex: 3 }}>
        <FlatList
          data={SLIDES}
          renderItem={({ item }) => <OnboardingItem item={item} />}
          horizontal
          showsHorizontalScrollIndicator={false}
          pagingEnabled
          bounces={false}
          keyExtractor={(item) => item.id}
          onViewableItemsChanged={viewableItemsChanged}
          viewabilityConfig={viewConfig}
          ref={slidesRef}
        />
      </View>

      {/* RODAPÉ (PAGINAÇÃO + BOTÃO) */}
      <View style={styles.footer}>
        {/* Bolinhas de Paginação */}
        <View style={styles.paginationContainer}>
          {SLIDES.map((_, index) => {
            const isActive = currentIndex === index;
            return (
              <View
                key={index.toString()}
                style={[
                  styles.dot,
                  isActive ? styles.dotActive : styles.dotInactive,
                  { backgroundColor: isActive ? SLIDES[currentIndex].color : '#E2E8F0' }
                ]}
              />
            );
          })}
        </View>

        {/* BOTÃO BUBBLY DINÂMICO */}
        <TouchableOpacity 
            style={styles.nextButtonWrapper} 
            activeOpacity={0.8} 
            onPress={scrollToNext}
        >
          <View style={[styles.btnShadow, { backgroundColor: SLIDES[currentIndex].shadowColor }]} />
          <View style={[styles.btnFront, { backgroundColor: SLIDES[currentIndex].color }]}>
            <Animated.Text 
                key={currentIndex} // Faz o texto animar ao trocar
                entering={FadeIn} 
                exiting={FadeOut}
                style={styles.btnText}
            >
              {currentIndex === SLIDES.length - 1 ? "COMEÇAR AVENTURA" : "PRÓXIMO"}
            </Animated.Text>
            {currentIndex === SLIDES.length - 1 ? (
               <MaterialCommunityIcons name="rocket-launch" size={24} color="#FFF" style={{ marginLeft: 8 }} />
            ) : (
               <MaterialCommunityIcons name="arrow-right-thick" size={24} color="#FFF" style={{ marginLeft: 8 }} />
            )}
          </View>
        </TouchableOpacity>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FDFCF8', // Fundo creme suave
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : StatusBar.currentHeight + 20,
    paddingHorizontal: 25,
    height: 100,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  skipButton: {
    padding: 10,
  },
  skipText: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    color: '#94A3B8',
  },
  
  // ITENS DO CARROSSEL
  itemContainer: {
    width: width,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  
  iconShowcase: {
    position: 'relative',
    marginBottom: 50,
    marginTop: -40,
  },
  iconShadow: {
    position: 'absolute',
    top: 15,
    left: 10,
    width: 180,
    height: 180,
    borderRadius: 90,
  },
  iconCircle: {
    width: 180,
    height: 180,
    borderRadius: 90,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
  },
  
  textContainer: {
    alignItems: 'center',
  },
  title: {
    fontFamily: FONTS.bold,
    fontSize: 32,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 38,
  },
  description: {
    fontFamily: FONTS.regular,
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 10,
  },

  // RODAPÉ
  footer: {
    height: 200,
    paddingHorizontal: 30,
    justifyContent: 'space-between',
    paddingBottom: Platform.OS === 'ios' ? 50 : 30,
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  dot: {
    height: 10,
    borderRadius: 5,
    marginHorizontal: 5,
  },
  dotActive: {
    width: 25, // Bolinha estica quando está ativa
  },
  dotInactive: {
    width: 10,
  },

  // BOTÃO
  nextButtonWrapper: {
    position: 'relative',
    height: 65,
    width: '100%',
    marginTop: 20,
  },
  btnShadow: {
    position: 'absolute',
    top: 6,
    left: 0,
    width: '100%',
    height: '100%',
    borderRadius: 20,
  },
  btnFront: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  btnText: {
    fontFamily: FONTS.bold,
    fontSize: 18,
    color: '#FFF',
    letterSpacing: 1,
  }
});