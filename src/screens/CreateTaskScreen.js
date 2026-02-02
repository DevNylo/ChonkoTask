import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
// IMPORTANTE: Importa o hook da memória global
import { useTasks } from '../context/TasksContext';

const ICONS = ['broom', 'bed', 'book-open-page-variant', 'dog', 'silverware-fork-knife', 'shower', 'controller-classic', 'trash-can', 'flower', 'tshirt-crew'];

export default function CreateTaskScreen() {
  const navigation = useNavigation();
  // Pega a função addTask da nuvem
  const { addTask } = useTasks();
  
  const [title, setTitle] = useState('');
  const [reward, setReward] = useState('');
  const [selectedIcon, setSelectedIcon] = useState(ICONS[0]);

  const handleSave = () => {
    if (!title || !reward) {
      Alert.alert("Ops!", "Dê um nome e um valor para a tarefa.");
      return;
    }
    
    // Cria o objeto da tarefa
    const newTask = {
      id: Date.now().toString(), // Gera ID único
      title: title,
      reward: parseInt(reward), // Converte texto para número
      icon: selectedIcon,
      status: 'pending'
    };

    // Salva na nuvem
    addTask(newTask);
    
    Alert.alert("Sucesso!", "Tarefa enviada para o Recruta!", [
      { text: "OK", onPress: () => navigation.goBack() }
    ]);
  };

  return (
    <LinearGradient colors={['#4c1d95', '#6d28d9']} style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        
        <View style={styles.header}>
          <Text style={styles.title}>Nova Missão</Text>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.closeBtn}>Cancelar</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.glassCard}>
            
            <Text style={styles.label}>O que precisa ser feito?</Text>
            <TextInput 
              style={styles.input} 
              placeholder="Ex: Arrumar a Cama" 
              placeholderTextColor="rgba(255,255,255,0.4)"
              value={title}
              onChangeText={setTitle}
              autoFocus={true}
            />

            <Text style={styles.label}>Recompensa (Chonko Coins)</Text>
            <View style={styles.rewardRow}>
              <Text style={styles.coinIcon}>💰</Text>
              <TextInput 
                style={[styles.input, styles.rewardInput]} 
                placeholder="10" 
                placeholderTextColor="rgba(255,255,255,0.4)"
                keyboardType="numeric"
                value={reward}
                onChangeText={setReward}
              />
            </View>

            <Text style={styles.label}>Escolha um Ícone</Text>
            <View style={styles.iconContainer}>
              {ICONS.map((icon) => (
                <TouchableOpacity 
                  key={icon} 
                  style={[styles.iconButton, selectedIcon === icon && styles.iconSelected]}
                  onPress={() => setSelectedIcon(icon)}
                >
                  <MaterialCommunityIcons name={icon} size={24} color={selectedIcon === icon ? '#4c1d95' : '#fff'} />
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
              <Text style={styles.saveText}>Lançar Missão</Text>
            </TouchableOpacity>

          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, marginTop: 10 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  closeBtn: { color: '#fbbf24', fontSize: 16, fontWeight: 'bold' },
  scrollContent: { padding: 20 },
  glassCard: { backgroundColor: 'rgba(255, 255, 255, 0.1)', borderRadius: 25, padding: 25, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.2)' },
  label: { color: '#ddd', marginBottom: 10, fontWeight: '600', fontSize: 14 },
  input: { backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 15, padding: 15, color: '#fff', fontSize: 18, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  rewardRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  coinIcon: { fontSize: 30, marginRight: 10 },
  rewardInput: { flex: 1, marginBottom: 0, fontSize: 24, fontWeight: 'bold', color: '#fbbf24' },
  iconContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 30 },
  iconButton: { width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  iconSelected: { backgroundColor: '#fbbf24', transform: [{ scale: 1.1 }], borderWidth: 2, borderColor: '#fff' },
  saveButton: { backgroundColor: '#10b981', padding: 18, borderRadius: 15, alignItems: 'center', shadowColor: '#10b981', shadowOpacity: 0.4, shadowOffset: { width: 0, height: 4 } },
  saveText: { color: '#fff', fontWeight: 'bold', fontSize: 18 }
});