import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
// 1. IMPORTAR A BIBLIOTECA DE ÍCONES DO EXPO
import { MaterialCommunityIcons } from '@expo/vector-icons';

// 2. LISTA DE ÍCONES (Usando nomes da biblioteca MaterialCommunityIcons)
// Você pode buscar nomes aqui: https://icons.expo.fyi/Index
const ICON_OPTIONS = [
  { name: 'broom', label: 'Limpeza' },
  { name: 'bed', label: 'Cama' },
  { name: 'book-open-page-variant', label: 'Estudo' },
  { name: 'dog', label: 'Pet' },
  { name: 'silverware-fork-knife', label: 'Comer' },
  { name: 'shower', label: 'Banho' },
  { name: 'controller-classic', label: 'Lazer' },
  { name: 'trash-can', label: 'Lixo' },
  { name: 'flower', label: 'Jardim' },
  { name: 'tshirt-crew', label: 'Roupa' },
];

export default function CreateTaskScreen() {
  const navigation = useNavigation();
  
  const [title, setTitle] = useState('');
  const [reward, setReward] = useState('');
  // O estado agora guarda o NOME do ícone
  const [selectedIcon, setSelectedIcon] = useState(ICON_OPTIONS[0].name);

  const handleSave = () => {
    if (!title || !reward) {
      Alert.alert("Ops!", "Dê um nome e um valor para a tarefa.");
      return;
    }
    
    Alert.alert("Sucesso!", "Tarefa criada! O Chonko aprovou.", [
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
              autoFocus={false}
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
              {ICON_OPTIONS.map((item) => (
                <TouchableOpacity 
                  key={item.name} 
                  style={[
                    styles.iconButton, 
                    selectedIcon === item.name && styles.iconSelected
                  ]}
                  onPress={() => setSelectedIcon(item.name)}
                >
                  {/* 3. RENDERIZAR O ÍCONE VETORIAL */}
                  <MaterialCommunityIcons 
                    name={item.name} 
                    size={28} 
                    color={selectedIcon === item.name ? '#4c1d95' : '#fff'} 
                  />
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    marginTop: 10, 
  },
  title: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  closeBtn: { color: '#fbbf24', fontSize: 16, fontWeight: 'bold' },
  
  scrollContent: { padding: 20 },
  
  glassCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 25,
    padding: 25,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  label: { color: '#ddd', marginBottom: 10, fontWeight: '600', fontSize: 14 },
  input: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 15,
    padding: 15,
    color: '#fff',
    fontSize: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  
  rewardRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  coinIcon: { fontSize: 30, marginRight: 10 },
  rewardInput: { flex: 1, marginBottom: 0, fontSize: 24, fontWeight: 'bold', color: '#fbbf24' },

  iconContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between', // Espalha bem os ícones
    marginBottom: 30,
  },
  iconButton: {
    width: 55, // Um pouco maior
    height: 55,
    borderRadius: 27.5, // Redondo perfeito
    backgroundColor: 'rgba(255,255,255,0.15)', // Fundo sutil
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  iconSelected: {
    backgroundColor: '#fbbf24', // Fundo Amarelo ao selecionar
    transform: [{ scale: 1.15 }], // Cresce um pouco
    borderColor: '#fff',
    borderWidth: 2,
    // Sombra para destacar
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  saveButton: {
    backgroundColor: '#10b981', 
    padding: 18,
    borderRadius: 15,
    alignItems: 'center',
    shadowColor: '#10b981',
    shadowOpacity: 0.4,
    shadowOffset: { width: 0, height: 4 },
  },
  saveText: { color: '#fff', fontWeight: 'bold', fontSize: 18 }
});