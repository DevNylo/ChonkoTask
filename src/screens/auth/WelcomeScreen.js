import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Dimensions, Platform, StatusBar, StyleSheet, Text, TouchableOpacity, View, ImageBackground } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

// TEMA OFICIAL
import { FONTS } from '../../styles/theme';

const { height } = Dimensions.get('window');

export default function WelcomeScreen() {
  const navigation = useNavigation();

  return (
    <ImageBackground
      source={require('../../../assets/Onboarding/WelcomeScreenBKG.png')}
      style={styles.container}
      resizeMode="cover"
    >
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* ESPAÇADOR E FRASE DE EFEITO */}
      <Animated.View entering={FadeInUp.duration(800)} style={styles.headerSpacer}>
        <Text style={styles.subtitle}>Transforme deveres em aventuras!</Text>
      </Animated.View>

      <View style={styles.contentContainer}>

        <Animated.Text entering={FadeInDown.delay(200).duration(600)} style={styles.questionText}>
          Eu vou...
        </Animated.Text>

        {/* OPÇÃO 1: CAPITÃO (CRIAR FAMÍLIA) */}
        <Animated.View entering={FadeInDown.delay(400).duration(600)} style={{ width: '100%', marginBottom: 25 }}>
            <TouchableOpacity
              style={styles.cardWrapper}
              activeOpacity={0.8}
              onPress={() => navigation.navigate('CreateFamily')}
            >
              {/* Sombra Escura para dar peso 3D */}
              <View style={[styles.cardShadow, { backgroundColor: '#d97706' }]} />

              {/* Frente Sólida Laranja */}
              <View style={[styles.cardFront, { backgroundColor: '#f59e0b' }]}>
                <View style={[styles.iconCircle, { backgroundColor: '#FFF' }]}>
                   <MaterialCommunityIcons name="crown" size={32} color="#f59e0b" />
                </View>

                <View style={styles.cardTextContainer}>
                  <Text style={[styles.cardTitle, { color: '#FFF' }]} numberOfLines={1}>Criar Família</Text>
                  <Text style={[styles.cardDesc, { color: 'rgba(255,255,255,0.9)' }]} numberOfLines={2}>Vou criar e gerenciar missões.</Text>
                </View>

                {/* Círculo da Seta */}
                <View style={[styles.chevronCircle, { backgroundColor: 'rgba(255,255,255,0.25)' }]}>
                    <MaterialCommunityIcons name="chevron-right" size={24} color="#FFF" />
                </View>
              </View>
            </TouchableOpacity>
        </Animated.View>

        {/* OPÇÃO 2: RECRUTA (ENTRAR NA EQUIPE) */}
        <Animated.View entering={FadeInDown.delay(500).duration(600)} style={{ width: '100%' }}>
            <TouchableOpacity
              style={styles.cardWrapper}
              activeOpacity={0.8}
              onPress={() => navigation.navigate('JoinFamily')}
            >
              {/* Sombra Escura para dar peso 3D */}
              <View style={[styles.cardShadow, { backgroundColor: '#059669' }]} />

              {/* Frente Sólida Verde */}
              <View style={[styles.cardFront, { backgroundColor: '#10b981' }]}>
                <View style={[styles.iconCircle, { backgroundColor: '#FFF' }]}>
                   {/* Tamanho igualado ao da coroa para simetria visual */}
                   <MaterialCommunityIcons name="rocket-launch" size={32} color="#10b981" />
                </View>

                <View style={styles.cardTextContainer}>
                  <Text style={[styles.cardTitle, { color: '#FFF' }]} numberOfLines={1}>Entrar na Equipe</Text>
                  <Text style={[styles.cardDesc, { color: 'rgba(255,255,255,0.9)' }]} numberOfLines={2}>Vou cumprir missões e ganhar prêmios.</Text>
                </View>

                {/* Círculo da Seta */}
                <View style={[styles.chevronCircle, { backgroundColor: 'rgba(255,255,255,0.25)' }]}>
                    <MaterialCommunityIcons name="chevron-right" size={24} color="#FFF" />
                </View>
              </View>
            </TouchableOpacity>
        </Animated.View>

      </View>

      {/* LOGIN FOOTER */}
      <Animated.View entering={FadeInDown.delay(700).duration(600)} style={styles.footer}>
        <TouchableOpacity
            style={styles.ghostButton}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('Login')}
        >
            <Text style={styles.ghostButtonText}>Já tenho uma conta</Text>
        </TouchableOpacity>
      </Animated.View>

    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // ÁREA RESERVADA PARA A IMAGEM DE FUNDO E FRASE DE EFEITO
  headerSpacer: {
    height: height * 0.45,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 20,
  },

  subtitle: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    color: '#D97706',
    opacity: 0.9,
    letterSpacing: 0.5,
    textAlign: 'center',
  },

  // --- CONTENT ---
  contentContainer: {
    flex: 1,
    paddingHorizontal: 30,
    justifyContent: 'center',
  },

  questionText: {
    fontSize: 22,
    fontFamily: FONTS.bold,
    color: '#0f172a',
    marginBottom: 25,
    textAlign: 'left',
    letterSpacing: 0.5
  },

  // --- CARDS ---
  cardWrapper: {
      position: 'relative',
      height: 110,
      width: '100%',
  },
  cardShadow: {
      position: 'absolute',
      top: 6,
      left: 0,
      width: '100%',
      height: '100%',
      borderRadius: 24,
  },
  cardFront: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderRadius: 24,
  },

  iconCircle: {
      width: 55,
      height: 55,
      borderRadius: 28,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 15,
  },

  // Controle de bloco de texto para centralização perfeita
  cardTextContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'flex-start', // Força os textos a ficarem sempre alinhados à esquerda de forma uniforme
      paddingRight: 10, // Protege o texto de encostar na seta
  },

  cardTitle: {
      fontSize: 20,
      fontFamily: FONTS.bold,
      marginBottom: 2
  },
  cardDesc: {
      fontSize: 13,
      fontFamily: FONTS.regular,
      lineHeight: 18
  },

  chevronCircle: {
      width: 36,
      height: 36,
      borderRadius: 18,
      justifyContent: 'center',
      alignItems: 'center',
  },

  // --- FOOTER ---
  footer: {
    paddingBottom: Platform.OS === 'ios' ? 50 : 35,
    alignItems: 'center',
    height: 150,
    justifyContent: 'center'
  },

  ghostButton: {
    paddingTop: 18,
    paddingBottom: 15,
    paddingHorizontal: 40,
    borderRadius: 30,
    backgroundColor: '#FFF',
    borderWidth: 3,
    borderColor: 'rgba(0,0,0,0.06)',
    shadowColor: "#000", shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2
  },
  
  ghostButtonText: {
    color: '#64748B', 
    fontFamily: FONTS.bold, 
    fontSize: 16, 
    letterSpacing: 0.5
  },
});