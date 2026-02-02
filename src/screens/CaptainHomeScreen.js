import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Alert, ScrollView, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTasks } from '../context/TasksContext';

export default function CaptainHomeScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { tasks, approveTask, rejectTask } = useTasks();
  
  const { captainName } = route.params || {}; 
  const displayName = captainName || 'Comandante';

  const tasksToApprove = tasks.filter(t => t.status === 'waiting_approval');
  const activeTasks = tasks.filter(t => t.status === 'pending');

  const handleNewTask = () => {
    navigation.navigate('CreateTask');
  };

  const showInviteCode = () => {
    Alert.alert("Convocar Copiloto", "Código: ADMIN-8822");
  };

  const renderApprovalCard = ({ item }) => (
    <View style={styles.approvalCard}>
      
      {/* EXIBE A FOTO SE HOUVER */}
      {item.proof && (
          <Image 
            source={{ uri: item.proof }} 
            style={styles.proofThumb}
          />
      )}

      <View style={styles.approvalInfo}>
        <Text style={styles.approvalTitle}>{item.title}</Text>
        <Text style={styles.approvalReward}>Vale 💰 {item.reward}</Text>
        <Text style={styles.approvalStatus}>📸 Foto recebida</Text>
      </View>
      <View style={styles.approvalActions}>
        <TouchableOpacity style={styles.rejectBtn} onPress={() => rejectTask(item.id)}>
          <MaterialCommunityIcons name="close" size={24} color="#ef4444" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.approveBtn} onPress={() => approveTask(item.id)}>
          <MaterialCommunityIcons name="check" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderTaskCard = ({ item }) => (
    <View style={styles.kidCard}>
      <View style={styles.kidAvatarContainer}>
        <MaterialCommunityIcons name={item.icon} size={28} color="#7c3aed" />
      </View>
      <View style={styles.kidInfo}>
        <Text style={styles.kidName}>{item.title}</Text>
        <Text style={styles.kidPoints}>{item.reward} moedas</Text>
      </View>
      <View style={styles.statusBadge}>
         <Text style={styles.statusText}>Em andamento</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      
      <LinearGradient colors={['#4c1d95', '#7c3aed']} style={styles.header}>
        <View style={styles.headerTopRow}>
            <View>
                <Text style={styles.greeting}>Olá, {displayName} 👋</Text>
                <Text style={styles.familyTitle}>Família Silva</Text>
            </View>
            
            <View style={{flexDirection: 'row', gap: 10}}>
                <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('CaptainShop')}>
                    <MaterialCommunityIcons name="store" size={24} color="#fff" />
                </TouchableOpacity>

                <TouchableOpacity style={styles.iconBtn} onPress={showInviteCode}>
                    <MaterialCommunityIcons name="account-plus" size={24} color="#fff" />
                </TouchableOpacity>
            </View>
        </View>
        
        <View style={styles.summaryCard}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Missões Ativas</Text>
            <Text style={styles.summaryValue}>{activeTasks.length}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Para Aprovar</Text>
            <Text style={tasksToApprove.length > 0 ? styles.summaryValueRed : styles.summaryValue}>
                {tasksToApprove.length}
            </Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView style={styles.body} contentContainerStyle={{ paddingBottom: 100 }}>
        
        {tasksToApprove.length > 0 && (
            <View style={styles.sectionContainer}>
                <Text style={styles.sectionTitleAlert}>⚠️ Requer Atenção</Text>
                <FlatList
                  data={tasksToApprove}
                  keyExtractor={item => item.id}
                  renderItem={renderApprovalCard}
                  scrollEnabled={false}
                />
            </View>
        )}

        <Text style={styles.sectionTitle}>Missões em Andamento</Text>
        {activeTasks.length === 0 ? (
            <Text style={{color: '#999', fontStyle: 'italic'}}>Nenhuma missão ativa no momento.</Text>
        ) : (
            <FlatList
              data={activeTasks}
              keyExtractor={item => item.id}
              renderItem={renderTaskCard}
              scrollEnabled={false}
            />
        )}
        
        <TouchableOpacity 
            style={styles.switchProfileBtn}
            onPress={() => navigation.navigate('RoleSelection')}
        >
            <Text style={{color: '#666'}}>🔄 Trocar de Perfil (Teste)</Text>
        </TouchableOpacity>

      </ScrollView>

      <TouchableOpacity style={styles.fab} onPress={handleNewTask}>
        <MaterialCommunityIcons name="plus" size={36} color="#4c1d95" />
      </TouchableOpacity>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  header: {
    paddingTop: 60, paddingBottom: 40, paddingHorizontal: 20,
    borderBottomLeftRadius: 30, borderBottomRightRadius: 30,
  },
  headerTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'start' },
  iconBtn: { padding: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12 },
  
  greeting: { color: 'rgba(255,255,255,0.8)', fontSize: 16 },
  familyTitle: { color: '#fff', fontSize: 28, fontWeight: 'bold' },
  
  summaryCard: {
    flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.2)', marginTop: 20,
    borderRadius: 15, padding: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  summaryItem: { flex: 1, alignItems: 'center' },
  divider: { width: 1, backgroundColor: 'rgba(255,255,255,0.3)' },
  summaryLabel: { color: '#e9d5ff', fontSize: 12, marginBottom: 4 },
  summaryValue: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  summaryValueRed: { color: '#fca5a5', fontSize: 24, fontWeight: 'bold' }, 

  body: { flex: 1, padding: 20 },
  sectionContainer: { marginBottom: 25 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', color: '#333', marginBottom: 15 },
  sectionTitleAlert: { fontSize: 20, fontWeight: 'bold', color: '#ef4444', marginBottom: 15 },
  
  approvalCard: {
    backgroundColor: '#fff', borderRadius: 20, padding: 15, marginBottom: 15,
    borderLeftWidth: 5, borderLeftColor: '#f59e0b',
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    elevation: 3, shadowColor: '#000', shadowOpacity: 0.1, shadowOffset: {width:0, height:2}
  },
  // ESTILO NOVO PARA FOTO
  proofThumb: {
    width: 60, height: 60, borderRadius: 10, marginRight: 15, backgroundColor: '#eee'
  },
  approvalInfo: { flex: 1 },
  approvalTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  approvalReward: { fontSize: 14, color: '#f59e0b', fontWeight: 'bold', marginTop: 2 },
  approvalStatus: { fontSize: 12, color: '#666', marginTop: 5 },
  approvalActions: { flexDirection: 'row', gap: 10 },
  approveBtn: { backgroundColor: '#10b981', padding: 12, borderRadius: 12 },
  rejectBtn: { backgroundColor: '#fee2e2', padding: 12, borderRadius: 12 },

  kidCard: {
    flexDirection: 'row', backgroundColor: '#fff', padding: 15, borderRadius: 20, marginBottom: 10,
    alignItems: 'center', elevation: 1
  },
  kidAvatarContainer: {
    backgroundColor: '#f3f4f6', width: 50, height: 50, borderRadius: 25,
    justifyContent: 'center', alignItems: 'center', marginRight: 15,
  },
  kidInfo: { flex: 1 },
  kidName: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  kidPoints: { fontSize: 14, color: '#7c3aed', fontWeight: '600' },
  statusBadge: { backgroundColor: '#e0e7ff', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  statusText: { color: '#4c1d95', fontSize: 10, fontWeight: 'bold' },

  switchProfileBtn: { marginTop: 30, alignItems: 'center', padding: 10 },
  
  fab: {
    position: 'absolute', bottom: 30, right: 30,
    backgroundColor: '#fbbf24', width: 60, height: 60, borderRadius: 30,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#fbbf24', shadowOpacity: 0.4, shadowOffset: { width: 0, height: 4 }, elevation: 8,
  },
});