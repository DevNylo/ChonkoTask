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
      source={require('../../../assets/Onboarding/WelcomeScreenBKG.png')} // Certifique-se de que a nova imagem com a grama está aqui
      style={styles.container}
      resizeMode="cover"
    >
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* ESPAÇADOR E FRASE DE EFEITO COM O "CHAN" */}
      <Animated.View entering={FadeInUp.duration(800)} style={styles.headerSpacer}>
        <View style={styles.subtitleWrapper}>
            <MaterialCommunityIcons name="star-four-points" size={14} color="#F59E0B" style={styles.chanIconLeft} />
            <Text style={styles.subtitle}>Transforme deveres em aventuras!</Text>
            <MaterialCommunityIcons name="star-four-points" size={14} color="#F59E0B" style={styles.chanIconRight} />
        </View>
      </Animated.View>

      <View style={styles.contentContainer}>

        {/* EU VOU COM SUBLINHADO ESTILIZADO */}
        <Animated.View entering={FadeInDown.delay(200).duration(600)} style={styles.questionWrapper}>
          <Text style={styles.questionText}>Eu vou...</Text>
          <View style={styles.questionUnderline} />
        </Animated.View>

        {/* OPÇÃO 1: CAPITÃO (CRIAR FAMÍLIA) */}
        <Animated.View entering={FadeInDown.delay(400).duration(600)} style={{ width: '100%', marginBottom: 20 }}>
            <TouchableOpacity
              style={styles.cardWrapper}
              activeOpacity={0.8}
              onPress={() => navigation.navigate('RegisterCaptain')}
            >
              {/* Sombra Escura para dar peso 3D */}
              <View style={[styles.cardShadow, { backgroundColor: '#D97706' }]} />

              {/* Frente Sólida Laranja */}
              <View style={[styles.cardFront, { backgroundColor: '#F59E0B' }]}>
                <View style={[styles.iconCircle, { backgroundColor: '#FFF' }]}>
                   <MaterialCommunityIcons name="crown" size={32} color="#F59E0B" />
                </View>

                <View style={styles.cardTextContainer}>
                  <Text style={[styles.cardTitle, { color: '#FFF' }]} numberOfLines={1}>Criar Família</Text>
                  <Text style={[styles.cardDesc, { color: 'rgba(255,255,255,0.9)' }]} numberOfLines={2}>Vou criar e gerenciar missões</Text>
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
              <View style={[styles.cardFront, { backgroundColor: '#10B981' }]}>
                <View style={[styles.iconCircle, { backgroundColor: '#FFF' }]}>
                   <MaterialCommunityIcons name="rocket-launch" size={32} color="#10B981" />
                </View>

                <View style={styles.cardTextContainer}>
                  <Text style={[styles.cardTitle, { color: '#FFF' }]} numberOfLines={1}>Entrar na Equipe</Text>
                  <Text style={[styles.cardDesc, { color: 'rgba(255,255,255,0.9)' }]} numberOfLines={2}>Vou cumprir missões e ganhar pontos</Text>
                </View>

                {/* Círculo da Seta */}
                <View style={[styles.chevronCircle, { backgroundColor: 'rgba(255,255,255,0.25)' }]}>
                    <MaterialCommunityIcons name="chevron-right" size={24} color="#FFF" />
                </View>
              </View>
            </TouchableOpacity>
        </Animated.View>

      </View>

      {/* LOGIN FOOTER - BOTÃO GRAFITE */}
      <Animated.View entering={FadeInDown.delay(700).duration(600)} style={styles.footer}>
        <TouchableOpacity
            style={styles.ghostButton}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('Login')}
        >
            <MaterialCommunityIcons name="account" size={24} color="#334155" />
            <Text style={styles.ghostButtonText}>Já tenho uma conta</Text>
            <MaterialCommunityIcons name="chevron-right" size={24} color="#334155" />
        </TouchableOpacity>
      </Animated.View>

    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FDFCF8',
  },

  // ÁREA RESERVADA PARA A IMAGEM DE FUNDO E FRASE DE EFEITO
  headerSpacer: {
    height: height * 0.45,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 20,
  },

  // Estilização do Subtítulo com o "Chan"
  subtitleWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chanIconLeft: {
    marginRight: 8,
    opacity: 0.8,
  },
  chanIconRight: {
    marginLeft: 8,
    opacity: 0.8,
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

  // Container para suportar o sublinhado
  questionWrapper: {
    alignSelf: 'flex-start',
    position: 'relative',
    marginBottom: 25,
  },
  questionText: {
    fontSize: 26,
    fontFamily: FONTS.bold,
    color: '#1E293B', // Grafite escuro
    textAlign: 'left',
    letterSpacing: 0.5,
    zIndex: 2, // Garante que o texto fique por cima da linha
  },
  questionUnderline: {
    position: 'absolute',
    bottom: 2, // Sobe a linha para cruzar a base das letras
    left: 2,
    width: '100%',
    height: 8,
    backgroundColor: '#FDE68A', // Amarelo bem suave
    borderRadius: 4,
    zIndex: 1,
    transform: [{ rotate: '-1deg' }], // Inclinação leve para parecer feito à mão
  },

  // --- CARDS ---
  cardWrapper: {
      position: 'relative',
      height: 105,
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

  // Controle de bloco de texto
  cardTextContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'flex-start',
      paddingRight: 10,
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
    paddingBottom: Platform.OS === 'ios' ? 60 : 45, // Mais espaço para a grama
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 30,
  },

  // Botão Pílula Novo
  ghostButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%', // Pega a mesma largura dos cards
    paddingVertical: 18,
    paddingHorizontal: 25,
    borderRadius: 30,
    backgroundColor: '#FFF',
    borderWidth: 2, // Borda um pouco mais grossa
    borderColor: '#E2E8F0',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2
  },

  ghostButtonText: {
    color: '#334155', // Grafite médio/escuro
    fontFamily: FONTS.bold,
    fontSize: 17,
    letterSpacing: 0.5,
  },
});