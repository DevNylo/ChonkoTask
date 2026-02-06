import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const { width } = Dimensions.get('window');

export default function WelcomeScreen() {
  const navigation = useNavigation();

  return (
    <LinearGradient 
      // Mantendo a consistência visual com a Splash Screen
      colors={['#E0C3FC', '#8EC5FC']} 
      style={styles.container}
    >
      
      {/* --- HEADER --- */}
      <View style={styles.header}>
        {/* Ícone Estilo "Orb" (Esfera de Vidro) */}
        <View style={styles.glassIconContainer}>
          <View style={styles.glossCircle} />
          <MaterialCommunityIcons name="rocket-launch-outline" size={50} color="#fff" />
        </View>
        
        <Text style={styles.title}>Chonko Task</Text>
        <Text style={styles.subtitle}>Transforme deveres em aventuras.</Text>
      </View>

      {/* --- CONTEÚDO --- */}
      <View style={styles.content}>
        <Text style={styles.sectionTitle}>Como quer começar?</Text>

        {/* OPÇÃO 1: CAPITÃO */}
        <TouchableOpacity 
          style={styles.glassCard}
          activeOpacity={0.7}
          onPress={() => navigation.navigate('RegisterCaptain')}
        >
          {/* O "Brilho" superior do vidro */}
          <View style={styles.cardGloss} />
          
          <View style={[styles.iconBox, { backgroundColor: '#FFF5E6' }]}>
             <MaterialCommunityIcons name="crown" size={28} color="#F59E0B" />
          </View>
          
          <View style={styles.cardTextContainer}>
            <Text style={styles.cardTitle}>Criar Família</Text>
            <Text style={styles.cardDesc}>Sou Capitão (Pai/Mãe)</Text>
          </View>
          
          <MaterialCommunityIcons name="chevron-right" size={24} color="rgba(255,255,255,0.6)" />
        </TouchableOpacity>

        {/* OPÇÃO 2: ENTRAR EM FAMÍLIA */}
        <TouchableOpacity 
          style={[styles.glassCard, { marginTop: 15 }]}
          activeOpacity={0.7}
          onPress={() => navigation.navigate('JoinFamily')} 
        >
          <View style={styles.cardGloss} />

          <View style={[styles.iconBox, { backgroundColor: '#E6FFFA' }]}>
             <MaterialCommunityIcons name="ticket-confirmation" size={28} color="#10B981" />
          </View>
          
          <View style={styles.cardTextContainer}>
            <Text style={styles.cardTitle}>Entrar com Código</Text>
            <Text style={styles.cardDesc}>Sou Recruta ou Parceiro</Text>
          </View>
          
          <MaterialCommunityIcons name="chevron-right" size={24} color="rgba(255,255,255,0.6)" />
        </TouchableOpacity>
        
      </View>

      {/* --- RODAPÉ: LOGIN --- */}
      <View style={styles.footer}>
        <TouchableOpacity 
            style={styles.loginButton} 
            onPress={() => navigation.navigate('Login')}
        >
            <Text style={styles.loginText}>Já tenho uma conta</Text>
        </TouchableOpacity>
      </View>

    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    paddingTop: 60, 
    paddingHorizontal: 25 
  },
  
  // --- HEADER ---
  header: { 
    alignItems: 'center', 
    marginBottom: 40 
  },
  glassIconContainer: { 
    width: 90, 
    height: 90, 
    borderRadius: 45, 
    backgroundColor: 'rgba(255, 255, 255, 0.2)', // Vidro limpo
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    justifyContent: 'center', 
    alignItems: 'center', 
    marginBottom: 15,
    // REMOVIDO: elevation e shadowColor (causa da mancha)
  },
  glossCircle: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 25,
    height: 25,
    borderRadius: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.4)', 
  },
  title: { 
    fontSize: 36, 
    fontWeight: '900', 
    color: '#fff', 
    // REMOVIDO: textShadow (deixa o texto sujo em telas low-res)
    letterSpacing: 1
  },
  subtitle: { 
    fontSize: 16, 
    color: '#F3E8FF', // Roxo claríssimo em vez de opacidade
    marginTop: 5,
    fontWeight: '500' 
  },
  
  // --- CONTEÚDO ---
  content: { 
    flex: 1,
    justifyContent: 'center'
  },
  sectionTitle: { 
    fontSize: 18, 
    fontWeight: '700', 
    color: '#5B2C6F', 
    marginBottom: 20,
    marginLeft: 10,
    // Sem opacidade no texto para garantir leitura nítida
  },
  
  // --- GLASS CARDS (CORRIGIDO) ---
  glassCard: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    // Aumentei um pouco a opacidade para o texto ter mais contraste sem sombra
    backgroundColor: 'rgba(255, 255, 255, 0.25)', 
    padding: 20, 
    borderRadius: 24, 
    borderWidth: 1.5, // Borda um pouco mais grossa substitui a necessidade de sombra
    borderColor: 'rgba(255, 255, 255, 0.6)',
    position: 'relative',
    overflow: 'hidden'
    // REMOVIDO: shadowColor, shadowOpacity, elevation (ADEUS MANCHA AZUL)
  },
  cardGloss: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '45%',
    backgroundColor: 'rgba(255, 255, 255, 0.1)', 
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
  },
  iconBox: { 
    width: 50, 
    height: 50, 
    borderRadius: 18, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginRight: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)' // Borda sutil no ícone
  },
  cardTextContainer: { 
    flex: 1 
  },
  cardTitle: { 
    fontSize: 18, 
    fontWeight: '800', 
    color: '#fff', 
    // REMOVIDO: textShadow
  },
  cardDesc: { 
    fontSize: 13, 
    color: '#F3E8FF', // Cor sólida clara
    marginTop: 2,
    fontWeight: '600'
  },

  // --- RODAPÉ ---
  footer: {
    paddingBottom: 40,
    alignItems: 'center'
  },
  loginButton: {
    paddingVertical: 12,
    paddingHorizontal: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)'
  },
  loginText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16
  }
});