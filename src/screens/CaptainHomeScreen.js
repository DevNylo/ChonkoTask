import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// Dados falsos atualizados com nomes de ícones em vez de emojis
const MOCK_KIDS = [
  { id: '1', name: 'Enzo', points: 150, avatarIcon: 'face-man-profile', status: 'pending' },
  { id: '2', name: 'Valentina', points: 320, avatarIcon: 'unicorn-variant', status: 'ok' },
];

export default function CaptainHomeScreen() {
  const navigation = useNavigation();

  const handleNewTask = () => {
    navigation.navigate('CreateTask');
  };

  const renderKidCard = ({ item }) => (
    <TouchableOpacity style={styles.kidCard}>
      <View style={styles.kidAvatarContainer}>
        {/* Renderiza o ícone do filho */}
        <MaterialCommunityIcons name={item.avatarIcon} size={30} color="#7c3aed" />
      </View>
      <View style={styles.kidInfo}>
        <Text style={styles.kidName}>{item.name}</Text>
        <Text style={styles.kidPoints}>{item.points} Chonko Coins</Text>
      </View>
      {item.status === 'pending' && (
        <View style={styles.pendingBadge}>
          <MaterialCommunityIcons name="exclamation" size={16} color="#fff" />
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      
      {/* HEADER GRADIENTE */}
      <LinearGradient colors={['#4c1d95', '#7c3aed']} style={styles.header}>
        <View style={styles.headerTopRow}>
            <View>
                <Text style={styles.greeting}>Olá, Capitão Dan 👋</Text>
                <Text style={styles.familyTitle}>Família Silva</Text>
            </View>
            {/* Ícone de Configurações no topo */}
            <TouchableOpacity style={styles.settingsButton}>
                <MaterialCommunityIcons name="cog" size={24} color="#fff" />
            </TouchableOpacity>
        </View>
        
        {/* Card de Resumo com Ícones */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryItem}>
            <MaterialCommunityIcons name="clipboard-list-outline" size={24} color="#e9d5ff" style={{marginBottom: 5}}/>
            <Text style={styles.summaryLabel}>Tarefas Hoje</Text>
            <Text style={styles.summaryValue}>4</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.summaryItem}>
             <MaterialCommunityIcons name="bell-ring-outline" size={24} color="#fca5a5" style={{marginBottom: 5}}/>
            <Text style={styles.summaryLabel}>Aprovar</Text>
            <Text style={styles.summaryValueRed}>1</Text>
          </View>
        </View>
      </LinearGradient>

      {/* CORPO DA TELA */}
      <View style={styles.body}>
        <Text style={styles.sectionTitle}>Seus Recrutas</Text>
        
        <FlatList
          data={MOCK_KIDS}
          keyExtractor={item => item.id}
          renderItem={renderKidCard}
          contentContainerStyle={{ paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        />
      </View>

      {/* BOTÃO FLUTUANTE (FAB) COM ÍCONE DE MAIS */}
      <TouchableOpacity style={styles.fab} onPress={handleNewTask}>
        <MaterialCommunityIcons name="plus" size={36} color="#4c1d95" />
      </TouchableOpacity>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  header: {
    paddingTop: 60,
    paddingBottom: 40,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'start' },
  settingsButton: { padding: 5, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 10 },
  greeting: { color: 'rgba(255,255,255,0.8)', fontSize: 16 },
  familyTitle: { color: '#fff', fontSize: 28, fontWeight: 'bold' },
  
  summaryCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginTop: 20,
    borderRadius: 15,
    padding: 15,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  summaryItem: { flex: 1, alignItems: 'center' },
  divider: { width: 1, backgroundColor: 'rgba(255,255,255,0.3)' },
  summaryLabel: { color: '#e9d5ff', fontSize: 12, marginBottom: 4 },
  summaryValue: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  summaryValueRed: { color: '#fca5a5', fontSize: 24, fontWeight: 'bold' }, 

  body: { flex: 1, padding: 20 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', color: '#333', marginBottom: 15 },
  
  kidCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 20,
    marginBottom: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 3,
  },
  kidAvatarContainer: {
    backgroundColor: '#f3f4f6',
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  kidInfo: { flex: 1 },
  kidName: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  kidPoints: { fontSize: 14, color: '#7c3aed', fontWeight: '600' },
  
  pendingBadge: {
    backgroundColor: '#ef4444',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    backgroundColor: '#fbbf24', 
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#fbbf24',
    shadowOpacity: 0.4,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
});