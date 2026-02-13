import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Dimensions, Image, ImageBackground, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// Importa o tema OFICIAL
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
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      
      <View style={styles.headerSpacer} />

      <View style={styles.contentContainer}>
        
        <Text style={styles.questionText}>Quem é você?</Text>

        {/* OPÇÃO 1: CAPITÃO */}
        <View style={{ width: '100%', marginBottom: 25 }}>
            <TouchableOpacity 
              style={styles.cardWrapper}
              activeOpacity={0.9}
              onPress={() => navigation.navigate('RegisterCaptain')}
            >
              {/* Sombra Suave Saltada */}
              <View style={styles.cardShadow} />
              
              <View style={styles.cardFront}>
                <View style={styles.iconWrapper}>
                   <Image 
                     source={require('../../../assets/icons/familly-icon1.png')} 
                     style={styles.customIcon} resizeMode="contain"
                   />
                </View>
                <View style={styles.cardTextContainer}>
                  <Text style={styles.cardTitle}>Criar Família</Text>
                  <Text style={styles.cardDesc}>Vou criar e gerenciar missões.</Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={24} color={COLORS.primary} />
              </View>
            </TouchableOpacity>
        </View>

        {/* OPÇÃO 2: RECRUTA */}
        <View style={{ width: '100%' }}>
            <TouchableOpacity 
              style={styles.cardWrapper}
              activeOpacity={0.9}
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
                  <Text style={styles.cardTitle}>Entrar na Equipe</Text>
                  <Text style={styles.cardDesc}>Vou cumprir missões e ganhar prêmios.</Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={24} color={COLORS.primary} />
              </View>
            </TouchableOpacity>
        </View>
        
      </View>

      {/* LOGIN FOOTER */}
      <View style={styles.footer}>
        <TouchableOpacity 
            style={styles.ghostButton} 
            activeOpacity={0.8}
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
  headerSpacer: { height: height * 0.40 }, 
  
  contentContainer: {
    flex: 1, paddingHorizontal: 25, justifyContent: 'flex-start', paddingTop: 20,
  },
  
  questionText: {
    fontSize: 28, fontFamily: FONTS.bold, color: COLORS.primary, // Verde Escuro
    marginBottom: 30, textAlign: 'left', marginLeft: 5, letterSpacing: 0.5
  },
  
  // --- CARDS (Soft Premium) ---
  cardWrapper: { 
      position: 'relative', 
      height: 100,
      width: '100%',
  },
  
  // Sombra mais suave e difusa
  cardShadow: {
      position: 'absolute', 
      top: 6, 
      left: 6, 
      width: '100%', 
      height: '100%', 
      backgroundColor: COLORS.shadow, 
      borderRadius: 24,
      opacity: 0.2 // Opacidade reduzida para suavidade
  },
  
  cardFront: {
    flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, 
    paddingHorizontal: 20, borderRadius: 24, 
    // Borda Fina (1px) e Sutil
    borderWidth: 1, 
    borderColor: COLORS.primary, 
  },
  
  iconWrapper: { 
      marginRight: 15, justifyContent: 'center', alignItems: 'center',
  },
  
  customIcon: { width: 56, height: 56 },
  
  cardTextContainer: { flex: 1 },
  
  // Títulos em Verde Escuro
  cardTitle: { fontSize: 18, fontFamily: FONTS.bold, marginBottom: 4, color: COLORS.primary },
  
  // Descrição
  cardDesc: { fontSize: 13, color: COLORS.primary, opacity: 0.7, fontFamily: FONTS.regular },
  
  // --- FOOTER ---
  footer: { paddingBottom: 50, alignItems: 'center', height: 120, justifyContent: 'center' },
  
  ghostButton: {
    paddingVertical: 14, paddingHorizontal: 30, borderRadius: 30, 
    backgroundColor: 'rgba(255, 255, 255, 0.95)', 
    // Borda Fina
    borderWidth: 1, borderColor: COLORS.primary,
    shadowColor: COLORS.shadow, shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.15, shadowRadius: 8, elevation: 3
  },
  
  ghostButtonText: {
    color: COLORS.primary, fontFamily: FONTS.bold, fontSize: 14, letterSpacing: 0.5
  },
});