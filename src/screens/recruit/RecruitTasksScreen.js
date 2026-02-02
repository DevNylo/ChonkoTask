import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTasks } from '../../context/TasksContext';
import Chonko3D from '../../components/Chonko3D'; 

export default function RecruitTasksScreen() {
  const { tasks, completeTask, coins } = useTasks();
  
  const myTasks = tasks.filter(t => t.status === 'pending');
  
  const recruitName = "Enzo";

  const handleCameraClick = (task) => {
    Alert.alert(
        "📸 Enviar Prova",
        `Tirar foto de: ${task.title}?`,
        [
            { text: "Cancelar", style: "cancel" },
            { 
                text: "Enviar Foto", 
                onPress: () => {
                    completeTask(task.id);
                    Alert.alert("Sucesso!", "O Capitão recebeu sua foto. Aguarde a aprovação!");
                } 
            }
        ]
    );
  };

  const renderTaskCard = ({ item }) => (
    <View style={styles.taskCard}>
      <View style={styles.taskIconBg}>
        <MaterialCommunityIcons name={item.icon} size={28} color="#fff" />
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
      <LinearGradient colors={['#059669', '#34d399']} style={styles.gradientBackground} />

      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.logoContainer}>
             <MaterialCommunityIcons name="rodent" size={24} color="#059669" />
          </View>
          <Text style={styles.recruitName}>Recruta {recruitName}</Text>
        </View>
        <View style={styles.coinPouch}>
          <MaterialCommunityIcons name="sack" size={20} color="#fbbf24" />
          <Text style={styles.coinCount}>{coins}</Text>
        </View>
      </View>

      <View style={styles.mascotArea}>
        <Chonko3D />
        <View style={styles.speechBubble}>
            <Text style={styles.speechText}>
               {myTasks.length > 0 ? "Quack! Foco na missão!" : "Quack! Tudo limpo."}
            </Text>
        </View>
      </View>

      <View style={styles.tasksContainer}>
        <Text style={styles.sectionTitle}>Missões de Hoje</Text>
        
        {myTasks.length === 0 ? (
            <View style={{alignItems: 'center', marginTop: 50}}>
                <MaterialCommunityIcons name="check-circle-outline" size={60} color="#ccc" />
                <Text style={{color: '#999', marginTop: 10, textAlign: 'center'}}>
                    Nenhuma missão ativa.{'\n'}Peça ao Capitão para criar uma!
                </Text>
            </View>
        ) : (
            <FlatList
              data={myTasks}
              keyExtractor={item => item.id}
              renderItem={renderTaskCard}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 100 }}
            />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  gradientBackground: { position: 'absolute', left: 0, right: 0, top: 0, height: '100%' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 50, paddingHorizontal: 20, paddingBottom: 20 },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  logoContainer: { width: 40, height: 40, backgroundColor: '#fff', borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 10, elevation: 5 },
  recruitName: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  coinPouch: { flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.2)', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  coinCount: { color: '#fbbf24', fontWeight: 'bold', fontSize: 16, marginLeft: 5 },
  mascotArea: { flex: 2, justifyContent: 'center', alignItems: 'center', zIndex: 1 },
  speechBubble: { backgroundColor: '#fff', padding: 10, borderRadius: 15, marginTop: -20, elevation: 3, zIndex: 2 },
  speechText: { color: '#059669', fontWeight: 'bold' },
  tasksContainer: { flex: 3, backgroundColor: '#F3F4F6', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 20 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', color: '#333', marginBottom: 15 },
  taskCard: { flexDirection: 'row', backgroundColor: '#fff', padding: 15, borderRadius: 20, marginBottom: 15, alignItems: 'center', elevation: 2 },
  taskIconBg: { width: 50, height: 50, backgroundColor: '#34d399', borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  taskInfo: { flex: 1 },
  taskTitle: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  taskReward: { fontSize: 14, color: '#059669', fontWeight: '600' },
  cameraButton: { width: 50, height: 50, backgroundColor: '#ecfdf5', borderRadius: 25, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#34d399' }
});