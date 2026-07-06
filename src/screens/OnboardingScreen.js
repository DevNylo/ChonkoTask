import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Image,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';

// TEMA OFICIAL
import { FONTS } from '../styles/theme';

const { width, height } = Dimensions.get('window');

const SLIDES = [
  {
    id: '1',
    title: 'Transforme Deveres\nem Aventuras',
    description: 'Chega de repetir a mesma coisa 10 vezes. Crie missões diárias e motive-os a cumprirem a rotina brincando.',
    image: require('../../assets/Onboarding/Char-1.png'),
    color: '#0ea5e9', // Azul
    shadowColor: '#bae6fd',
  },
  {
    id: '2',
    title: 'A Moeda\ndo Esforço',
    description: 'Defina recompensas reais — como sorvete ou videogame. Ensine que para ganhar, é preciso conquistar. Sem mesada automática.',
    image: require('../../assets/Onboarding/Char-2.png'),
    color: '#f59e0b', // Laranja/Dourado
    shadowColor: '#fde68a',
  },
  {
    id: '3',
    title: 'Controle Total,\nDiversão Real',
    description: 'Você aprova as missões por fotos e os prêmios vão para a Mochila deles. Eles pedem, você aprova a entrega. Organização para você, magia para eles.',
    image: require('../../assets/Onboarding/Char-3.png'),
    color: '#10b981', // Verde
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
      slidesRef.current.scrollToIndex({ index: currentIndex + 1, animated: true });
    } else {
      navigation.replace('WelcomeScreen');
    }
  };

  // Função para pular direto para o final
  const skipToWelcome = () => {
    navigation.replace('WelcomeScreen');
  };

  // O Design individual de cada Aba do Carrossel
  const OnboardingItem = ({ item, index }) => {
    return (
      <View style={styles.itemContainer}>

        {/* PALCO FIXO DA IMAGEM PARA EVITAR PULO DE TELA */}
        <Animated.View
            entering={FadeIn.delay(index * 150).duration(800)}
            style={styles.imageShowcase}
        >
           <Image
              source={item.image}
              style={styles.heroImage}
              resizeMode="contain"
           />
        </Animated.View>

        {/* ÁREA DE TEXTOS COM ESPAÇAMENTO PADRONIZADO */}
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

      {/* CABEÇALHO / BOTÃO PULAR */}
      <View style={styles.header}>
        {currentIndex < SLIDES.length - 1 ? (
          <TouchableOpacity onPress={skipToWelcome} style={styles.skipButton} activeOpacity={0.7}>
            <Text style={styles.skipText}>Pular</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.skipButton} /> // Placeholder para manter a altura do header
        )}
      </View>

      {/* CARROSSEL */}
      <View style={styles.carouselContainer}>
        <FlatList
          data={SLIDES}
          renderItem={({ item, index }) => <OnboardingItem item={item} index={index} />}
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
              <Animated.View
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
        <Animated.View style={styles.buttonAnimWrapper} entering={SlideInDown.duration(600).springify()}>
            <TouchableOpacity
                style={styles.nextButtonWrapper}
                activeOpacity={0.8}
                onPress={scrollToNext}
            >
                {/* Sombra fixada por baixo */}
                <View style={[styles.btnShadow, { backgroundColor: SLIDES[currentIndex].shadowColor }]} />

                {/* Frente do botão sobrepondo a sombra perfeitamente */}
                <View style={[styles.btnFront, { backgroundColor: SLIDES[currentIndex].color }]}>
                    <Text
                        style={styles.btnText}
                        numberOfLines={1}
                        adjustsFontSizeToFit={true}
                    >
                        {currentIndex === SLIDES.length - 1 ? "COMEÇAR AVENTURA" : "PRÓXIMO"}
                    </Text>
                    {currentIndex === SLIDES.length - 1 ? (
                        <MaterialCommunityIcons name="rocket-launch" size={24} color="#FFF" style={styles.btnIcon} />
                    ) : (
                        <MaterialCommunityIcons name="arrow-right-thick" size={24} color="#FFF" style={styles.btnIcon} />
                    )}
                </View>
            </TouchableOpacity>
        </Animated.View>

      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FDFCF8',
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : StatusBar.currentHeight + 10,
    paddingHorizontal: 25,
    height: 90,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  skipButton: {
    padding: 10,
    minHeight: 45,
    justifyContent: 'center',

  },
  skipText: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    color: '#94A3B8',
    letterSpacing: 1,
  },

  carouselContainer: {
    flex: 1,
  },

  // ITENS DO CARROSSEL
  itemContainer: {
    width: width,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: 30,
    paddingTop: 10,
  },

  // ÁREA DA IMAGEM
  imageShowcase: {
    width: width * 0.85,
    height: height * 0.42,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 35,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },

  // TEXTOS
  textContainer: {
    alignItems: 'center',
    width: '100%',
  },
  title: {
    fontFamily: FONTS.bold,
    fontSize: 30,
    textAlign: 'center',
    marginBottom: 15,
    lineHeight: 36,
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
    paddingHorizontal: 30,
    paddingBottom: Platform.OS === 'ios' ? 50 : 35,
    alignItems: 'center',
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 25,
  },
  dot: {
    height: 10,
    borderRadius: 5,
    marginHorizontal: 6,
  },
  dotActive: {
    width: 28,
  },
  dotInactive: {
    width: 10,
  },

  // BOTÃO - ANCORAGEM FIXA
  buttonAnimWrapper: {
    width: '100%',
  },
  nextButtonWrapper: {
    height: 65,
    width: '100%',
    position: 'relative',
  },
  btnShadow: {
    position: 'absolute',
    top: 6,
    left: 0,
    right: 0,
    height: 65,
    borderRadius: 22,
  },
  btnFront: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 65,
    borderRadius: 22,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    // Removido o borderWidth e borderColor para padronizar com a nova tela de Welcome
    paddingHorizontal: 20,
  },
  btnText: {
    fontFamily: FONTS.bold,
    fontSize: 17,
    color: '#FFF',
    letterSpacing: 1,
  },
  btnIcon: {
    marginLeft: 10,
  }
});