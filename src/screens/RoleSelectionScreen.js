import { useNavigation } from '@react-navigation/native';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
// IMPORTAR ÍCONES
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function RoleSelectionScreen() {
  const navigation = useNavigation();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Quem é você?</Text>

      {/* Botão Pai - Capitão */}
      <TouchableOpacity 
        style={[styles.card, styles.cardCaptain]}
        onPress={() => navigation.navigate('CaptainSetup')} 
      >
        <MaterialCommunityIcons name="shield-crown" size={50} color="#4c1d95" style={styles.icon} />
        <Text style={styles.text}>Sou o Capitão</Text>
        <Text style={styles.subtext}>Gerenciar QG</Text>
      </TouchableOpacity>

      {/* Botão Filho - Recruta */}
      <TouchableOpacity 
        style={[styles.card, styles.cardRecruit]}
        onPress={() => navigation.navigate('RecruitLink')}
      >
        <MaterialCommunityIcons name="controller-classic" size={50} color="#059669" style={styles.icon} />
        <Text style={styles.text}>Sou o Recruta</Text>
        <Text style={styles.subtext}>Cumprir Missões</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 40,
  },
  card: {
    width: '100%',
    padding: 25,
    borderRadius: 20,
    marginBottom: 20,
    alignItems: 'center',
    backgroundColor: '#fff',
    elevation: 5, 
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardCaptain: {
    borderLeftWidth: 6,
    borderLeftColor: '#4c1d95', 
  },
  cardRecruit: {
    borderLeftWidth: 6,
    borderLeftColor: '#10b981', 
  },
  icon: {
    marginBottom: 10,
  },
  text: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  subtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 4
  }
});