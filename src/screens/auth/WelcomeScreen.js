import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Dimensions, Image, ImageBackground, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// Importa o tema
import { COLORS, FONTS } from '../../styles/theme';

const { height } = Dimensions.get('window');

export default function WelcomeScreen() {
  const navigation = useNavigation();

  return (
    <ImageBackground
      source={require('../../../assets/WelcomeScreenBKG.png')} 
      style={styles.container}
      resizeMode="cover"
    >
      <View style={styles.headerSpacer} />

      <View style={styles.contentContainer}>
        
        <Text style={styles.questionText}>Quem é você?</Text>

        {/* OPÇÃO 1: CAPITÃO */}
        <View style={{ width: '100%' }}>
            <TouchableOpacity 
              style={styles.cardWrapper}
              activeOpacity={0.9}
              onPress={() => navigation.navigate('RegisterCaptain')}
            >
              <View style={styles.cardShadow} />
              <View style={styles.cardFront}>
                <View style={styles.iconWrapper}>
                   <Image 
                     source={require('../../../assets/icons/familly-icon1.png')} 
                     style={styles.customIcon} resizeMode="contain"
                   />
                </View>
                <View style={styles.cardTextContainer}>
                  <Text style={[styles.cardTitle, { color: COLORS.blue }]}>Criar Família</Text>
                  <Text style={styles.cardDesc}>Vou criar e gerenciar missões.</Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={28} color={COLORS.primary} />
              </View>
            </TouchableOpacity>
        </View>

        {/* OPÇÃO 2: RECRUTA (Entrar na equipe) */}
        <View style={{ width: '100%', marginTop: 20 }}>
            <TouchableOpacity 
              style={styles.cardWrapper}
              activeOpacity={0.9}
              // CORREÇÃO: Leva para a tela de entrar com código (JoinFamily) ou Login se preferir
              onPress={() => navigation.navigate('JoinFamily')} 
            >
              <View style={styles.cardShadow} />
              <View style={styles.cardFront}>
                <View style={styles.iconWrapper}>
                   <Image 
                     source={require('../../../assets/icons/rookie-icon1.png')} 
                     style={styles.customIcon} resizeMode="contain"
                   />
                </View>
                <View style={styles.cardTextContainer}>
                  <Text style={[styles.cardTitle, { color: COLORS.secondary }]}>Entrar na Equipe</Text>
                  <Text style={styles.cardDesc}>Vou cumprir missões e ganhar prêmios.</Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={28} color={COLORS.primary} />
              </View>
            </TouchableOpacity>
        </View>
        
      </View>

      {/* LOGIN FOOTER */}
      <View style={styles.footer}>
        <TouchableOpacity 
            style={styles.ghostButton} 
            activeOpacity={0.7}
            // --- CORREÇÃO CRÍTICA AQUI ---
            // Antes estava 'RoleSelection', agora vai para 'Login'
            onPress={() => navigation.navigate('Login')} 
        >
            <Text style={styles.ghostButtonText}>Já tenho uma conta</Text>
        </TouchableOpacity>
      </View>

    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  headerSpacer: { height: height * 0.35 },
  contentContainer: {
    flex: 1, paddingHorizontal: 25, justifyContent: 'flex-start', paddingTop: 10,
  },
  questionText: {
    fontSize: 22, fontFamily: FONTS.bold, color: COLORS.textPrimary,
    marginBottom: 25, textAlign: 'left', marginLeft: 5, 
    textShadowColor: 'rgba(255,255,255,0.5)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 1
  },
  cardWrapper: { position: 'relative', height: 85, width: '100%' },
  cardShadow: {
    position: 'absolute', top: 5, left: 5, width: '100%', height: '100%',
    backgroundColor: COLORS.shadow, borderRadius: 20,
  },
  cardFront: {
    flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, 
    paddingHorizontal: 18, borderRadius: 20, borderWidth: 3, borderColor: COLORS.primary,
  },
  iconWrapper: { marginRight: 15, justifyContent: 'center', alignItems: 'center' },
  customIcon: { width: 48, height: 48 },
  cardTextContainer: { flex: 1 },
  cardTitle: { fontSize: 18, fontFamily: FONTS.bold, marginBottom: 2 },
  cardDesc: { fontSize: 13, color: COLORS.primary, opacity: 0.8, fontFamily: FONTS.regular },
  
  footer: { paddingBottom: 40, alignItems: 'center', height: 150, justifyContent: 'center' },
  ghostButton: {
    paddingVertical: 12, paddingHorizontal: 24, borderRadius: 30, 
    backgroundColor: 'rgba(255, 255, 255, 0.4)', 
    borderWidth: 1.5, borderColor: 'rgba(6, 78, 59, 0.2)', 
  },
  ghostButtonText: {
    color: COLORS.textPrimary, fontFamily: FONTS.bold, fontSize: 16, letterSpacing: 0.5
  },
});