import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Dimensions, ImageBackground, Platform, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

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
              activeOpacity={0.8}
              onPress={() => navigation.navigate('RegisterCaptain')}
            >
              {/* Sombra Estilo Bubbly (Off-set sólido) */}
              <View style={styles.cardShadow} />
              
              <View style={[styles.cardFront, { backgroundColor: '#FFFBEB', borderColor: '#FCD34D' }]}>
                <View style={[styles.iconCircle, { backgroundColor: '#FFF', borderColor: '#FCD34D' }]}>
                   <MaterialCommunityIcons name="crown" size={32} color="#F59E0B" />
                </View>
                
                <View style={styles.cardTextContainer}>
                  <Text style={[styles.cardTitle, { color: '#92400E' }]}>Criar Família</Text>
                  <Text style={[styles.cardDesc, { color: '#B45309' }]}>Vou criar e gerenciar missões.</Text>
                </View>
                
                <View style={[styles.chevronCircle, { backgroundColor: '#FEF3C7' }]}>
                    <MaterialCommunityIcons name="chevron-right" size={24} color="#D97706" />
                </View>
              </View>
            </TouchableOpacity>
        </View>

        {/* OPÇÃO 2: RECRUTA / AVENTUREIRO */}
        <View style={{ width: '100%' }}>
            <TouchableOpacity 
              style={styles.cardWrapper}
              activeOpacity={0.8}
              onPress={() => navigation.navigate('JoinFamily')} 
            >
              <View style={styles.cardShadow} />
              
              <View style={[styles.cardFront, { backgroundColor: '#F0FDF4', borderColor: '#6EE7B7' }]}>
                <View style={[styles.iconCircle, { backgroundColor: '#FFF', borderColor: '#6EE7B7' }]}>
                   {/* Ícone de foguete combinando com "Aventureiro/Missões" */}
                   <MaterialCommunityIcons name="rocket-launch" size={30} color="#10B981" />
                </View>
                
                <View style={styles.cardTextContainer}>
                  <Text style={[styles.cardTitle, { color: '#065F46' }]}>Entrar na Equipe</Text>
                  <Text style={[styles.cardDesc, { color: '#059669' }]}>Vou cumprir missões e ganhar prêmios.</Text>
                </View>
                
                <View style={[styles.chevronCircle, { backgroundColor: '#D1FAE5' }]}>
                    <MaterialCommunityIcons name="chevron-right" size={24} color="#059669" />
                </View>
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
  headerSpacer: { height: height * 0.35 }, 
  
  contentContainer: {
    flex: 1, paddingHorizontal: 25, justifyContent: 'flex-start', paddingTop: 20,
  },
  
  questionText: {
    fontSize: 32, 
    fontFamily: FONTS.bold, 
    color: '#064E3B', // Verde bem escuro para contraste
    marginBottom: 25, 
    textAlign: 'left', 
    marginLeft: 5, 
    letterSpacing: 0.5
  },
  
  // --- CARDS (Estilo Chonko Premium) ---
  cardWrapper: { 
      position: 'relative', 
      height: 110,
      width: '100%',
  },
  
  // Sombra sólida e levemente deslocada (estilo jogo)
  cardShadow: {
      position: 'absolute', 
      top: 6, 
      left: 0, 
      width: '100%', 
      height: '100%', 
      backgroundColor: 'rgba(0,0,0,0.1)', 
      borderRadius: 28,
  },
  
  cardFront: {
    flex: 1, 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 16, 
    borderRadius: 28, 
    borderWidth: 3, // Borda grossa
  },
  
  // Círculo customizado para o ícone
  iconCircle: { 
      width: 60, 
      height: 60, 
      borderRadius: 30, 
      justifyContent: 'center', 
      alignItems: 'center',
      borderWidth: 2,
      marginRight: 15,
      shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, elevation: 2
  },
  
  cardTextContainer: { flex: 1, justifyContent: 'center' },
  
  cardTitle: { fontSize: 20, fontFamily: FONTS.bold, marginBottom: 4 },
  
  cardDesc: { fontSize: 13, opacity: 0.85, fontFamily: FONTS.regular, lineHeight: 18, paddingRight: 10 },
  
  // Círculo sutil atrás da setinha
  chevronCircle: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
  },

  // --- FOOTER ---
  footer: { paddingBottom: Platform.OS === 'ios' ? 50 : 30, alignItems: 'center', height: 120, justifyContent: 'center' },
  
  ghostButton: {
    paddingVertical: 16, 
    paddingHorizontal: 35, 
    borderRadius: 30, 
    backgroundColor: '#FFF', 
    borderWidth: 3, 
    borderColor: '#E2E8F0', // Borda cinza suave
    shadowColor: "#000", shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3
  },
  
  ghostButtonText: {
    color: '#64748B', 
    fontFamily: FONTS.bold, 
    fontSize: 16, 
    letterSpacing: 0.5
  },
});