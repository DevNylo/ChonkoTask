import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Chonko3D from '../../components/Chonko3D'; // <--- IMPORTADO O 3D
import { supabase } from '../../lib/supabase';

export default function RecruitTasksScreen({ route }) {
  const navigation = useNavigation();
  const { profile } = route.params;
  
  const [tasks, setTasks] = useState([]);
  const [balance, setBalance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [])
  );

  const fetchData = async () => {
    try {
      // 1. Missões Ativas
      const { data: allMissions } = await supabase.from('missions').select('*').eq('family_id', profile.family_id).eq('status', 'active');
      
      // 2. Tentativas de Hoje
      const today = new Date().toISOString().split('T')[0];
      const { data: todaysAttempts } = await supabase.from('mission_attempts').select('mission_id, status').eq('profile_id', profile.id).gte('created_at', today);

      // 3. Filtrar: Esconder as feitas
      const doneMissionIds = todaysAttempts
        .filter(a => a.status === 'pending' || a.status === 'approved')
        .map(a => a.mission_id);

      const todoMissions = allMissions.filter(m => !doneMissionIds.includes(m.id));

      setTasks(todoMissions);

      // 4. Saldo
      const { data: profileData } = await supabase.from('profiles').select('balance').eq('id', profile.id).single();
      if (profileData) setBalance(profileData.balance);

    } catch (error) { console.log(error); } finally { setRefreshing(false); }
  };

  const handleCameraClick = (task) => {
    navigation.navigate('RecruitCamera', { taskId: task.id, profileId: profile.id });
  };

  const renderTaskCard = ({ item }) => (
    <View style={styles.taskCard}>
      <View style={styles.taskIconBg}>
        <MaterialCommunityIcons name={item.icon || 'star'} size={28} color="#fff" />
      </View>
      <View style={styles.taskInfo}>
        <Text style={styles.taskTitle}>{item.title}</Text>
        <Text style={styles.taskReward}>+{item.reward} moedas</Text>
      </View>
      <TouchableOpacity style={styles.cameraButton} onPress={() => handleCameraClick(item)}>
        <MaterialCommunityIcons name="camera" size={28} color="#059669" />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header com Gradiente Maior para caber o 3D */}
      <LinearGradient colors={['#059669', '#34d399']} style={styles.header}>
        
        {/* Topo: Nome e Saldo */}
        <View style={styles.headerTop}>
            <View>
                <Text style={styles.greeting}>Recruta {profile.name}</Text>
                <View style={styles.coinPouch}>
                    <MaterialCommunityIcons name="sack" size={16} color="#fbbf24" />
                    <Text style={styles.coinCount}>{balance}</Text>
                </View>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('RoleSelection')} style={styles.exitBtn}>
                <MaterialCommunityIcons name="logout" size={20} color="#fff" />
            </TouchableOpacity>
        </View>

        {/* Área do Mascote 3D */}
        <View style={styles.mascotContainer}>
            <Chonko3D /> 
            
            {/* Balão de Fala Flutuante */}
            <View style={styles.speechBubble}>
                <Text style={styles.speechText}>
                    {tasks.length > 0 ? "Quack! Temos trabalho!" : "Quack! Tudo limpo! 🎉"}
                </Text>
                {/* Triângulo do balão */}
                <View style={styles.speechTriangle} />
            </View>
        </View>

      </LinearGradient>

      {/* Lista de Tarefas (Puxada pra cima com margin negativa) */}
      <View style={styles.tasksContainer}>
        <Text style={styles.sectionTitle}>Missões de Hoje</Text>
        <FlatList
          data={tasks}
          keyExtractor={item => item.id}
          renderItem={renderTaskCard}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => {setRefreshing(true); fetchData()}} />}
          ListEmptyComponent={
            <View style={{alignItems: 'center', marginTop: 50}}>
                <MaterialCommunityIcons name="check-decagram" size={60} color="#ccc" />
                <Text style={{color: '#999', marginTop: 10, fontSize: 16}}>Tudo feito por hoje!</Text>
                <Text style={{color: '#bbb', fontSize: 12}}>Aproveite a folga.</Text>
            </View>
          }
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  
  // Header agora é maior para acomodar o Pato
  header: { paddingTop: 50, paddingBottom: 20, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, zIndex: 1 },
  
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 10 },
  greeting: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  coinPouch: { flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.2)', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 15, alignItems: 'center', marginTop: 5, alignSelf: 'flex-start' },
  coinCount: { color: '#fbbf24', fontWeight: 'bold', fontSize: 14, marginLeft: 5 },
  exitBtn: { backgroundColor: 'rgba(255,255,255,0.2)', padding: 10, borderRadius: 12 },
  
  // Mascote
  mascotContainer: { alignItems: 'center', height: 260, marginTop: -20 },
  
  speechBubble: { 
    position: 'absolute', top: 40, right: 30, 
    backgroundColor: '#fff', padding: 12, borderRadius: 15, elevation: 5, zIndex: 10 
  },
  speechText: { color: '#059669', fontWeight: 'bold', fontSize: 14 },
  speechTriangle: {
    position: 'absolute', bottom: -8, left: 20,
    width: 0, height: 0, 
    borderLeftWidth: 8, borderRightWidth: 8, borderTopWidth: 8,
    borderStyle: 'solid', backgroundColor: 'transparent', 
    borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: '#fff'
  },

  // Conteúdo (Lista)
  tasksContainer: { flex: 1, padding: 20, marginTop: -40, backgroundColor: 'transparent', zIndex: 0 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 15, marginLeft: 5 },
  
  taskCard: { flexDirection: 'row', backgroundColor: '#fff', padding: 15, borderRadius: 20, marginBottom: 15, alignItems: 'center', elevation: 2 },
  taskIconBg: { width: 50, height: 50, backgroundColor: '#34d399', borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  taskInfo: { flex: 1 },
  taskTitle: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  taskReward: { fontSize: 14, color: '#059669', fontWeight: '600' },
  cameraButton: { width: 50, height: 50, backgroundColor: '#ecfdf5', borderRadius: 25, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#34d399' }
});