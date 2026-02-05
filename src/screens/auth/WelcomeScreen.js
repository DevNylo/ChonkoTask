import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function WelcomeScreen() {
  const navigation = useNavigation();

  return (
    <LinearGradient colors={['#ffffff', '#f3f4f6']} style={styles.container}>
      
      <View style={styles.header}>
        <View style={styles.iconBg}>
          <MaterialCommunityIcons name="rocket-launch" size={60} color="#4c1d95" />
        </View>
        <Text style={styles.title}>Chonko</Text>
        <Text style={styles.subtitle}>Transforme deveres em aventuras.</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.question}>Como você vai usar o app?</Text>

        {/* OPÇÃO 1: CAPITÃO (CRIAR FAMÍLIA) */}
        <TouchableOpacity 
          style={styles.cardBtn}
          onPress={() => navigation.navigate('RegisterCaptain')}
        >
          <View style={styles.cardIcon}>
             <MaterialCommunityIcons name="crown" size={32} color="#f59e0b" />
          </View>
          <View style={styles.cardText}>
            <Text style={styles.cardTitle}>Criar Nova Família</Text>
            <Text style={styles.cardDesc}>Sou Pai/Mãe e quero delegar tarefas.</Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={24} color="#ccc" />
        </TouchableOpacity>

        {/* OPÇÃO 2: ENTRAR EM FAMÍLIA (COM CÓDIGO) */}
        {/* Ajustei este botão para usar o estilo padrão e levar para JoinFamily */}
        <TouchableOpacity 
          style={[styles.cardBtn, {marginTop: 15}]}
          onPress={() => navigation.navigate('JoinFamily')} 
        >
          <View style={[styles.cardIcon, {backgroundColor: '#d1fae5'}]}>
             <MaterialCommunityIcons name="ticket-account" size={32} color="#10b981" />
          </View>
          <View style={styles.cardText}>
            <Text style={styles.cardTitle}>Entrar em Família</Text>
            <Text style={styles.cardDesc}>Tenho um código de convite.</Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={24} color="#ccc" />
        </TouchableOpacity>
        
        {/* OPÇÃO 3: LOGIN (JÁ TENHO CONTA) */}
        <TouchableOpacity 
            style={{marginTop: 30, padding: 10, alignItems: 'center'}} 
            onPress={() => navigation.navigate('Login')}
        >
            <Text style={{color: '#666', fontWeight: '600'}}>Já tenho conta, quero entrar</Text>
        </TouchableOpacity>

      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 80, paddingHorizontal: 20 },
  header: { alignItems: 'center', marginBottom: 50 },
  iconBg: { width: 100, height: 100, backgroundColor: '#e9d5ff', borderRadius: 50, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 40, fontWeight: 'bold', color: '#4c1d95' },
  subtitle: { fontSize: 16, color: '#666', marginTop: 5 },
  
  content: { flex: 1 },
  question: { fontSize: 20, fontWeight: 'bold', color: '#333', marginBottom: 20 },
  
  cardBtn: { 
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', 
    padding: 20, borderRadius: 20, elevation: 5, shadowColor: '#000', shadowOpacity: 0.1, shadowOffset: {width:0, height:4}
  },
  cardIcon: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#fef3c7', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  cardText: { flex: 1 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  cardDesc: { fontSize: 13, color: '#666', marginTop: 2 }
});