import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Alert, FlatList, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useTasks } from '../context/TasksContext';

const ICONS = ['controller-classic', 'ice-cream', 'ticket', 'bed-clock', 'candy', 'soccer', 'cellphone', 'bicycle'];

export default function CaptainShopScreen() {
  const navigation = useNavigation();
  const { rewards, addReward, deleteReward } = useTasks();

  // Estados do formulário
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [selectedIcon, setSelectedIcon] = useState(ICONS[0]);

  const handleAdd = () => {
    if (!title || !price) {
        Alert.alert("Ops", "Preencha o nome e o preço do item.");
        return;
    }

    const newItem = {
        id: Date.now().toString(),
        title,
        price: parseInt(price),
        icon: selectedIcon
    };

    addReward(newItem);
    
    // Limpar campos
    setTitle('');
    setPrice('');
    Alert.alert("Sucesso", "Item adicionado à loja!");
  };

  const handleDelete = (id) => {
    Alert.alert("Remover Item", "Tem certeza?", [
        { text: "Cancelar" },
        { text: "Sim, remover", onPress: () => deleteReward(id) }
    ]);
  };

  const renderItem = ({ item }) => (
    <View style={styles.itemCard}>
        <View style={styles.itemIconBg}>
            <MaterialCommunityIcons name={item.icon} size={24} color="#4c1d95" />
        </View>
        <View style={{flex: 1}}>
            <Text style={styles.itemTitle}>{item.title}</Text>
            <Text style={styles.itemPrice}>💰 {item.price}</Text>
        </View>
        <TouchableOpacity onPress={() => handleDelete(item.id)}>
            <MaterialCommunityIcons name="trash-can-outline" size={24} color="#ef4444" />
        </TouchableOpacity>
    </View>
  );

  return (
    <LinearGradient colors={['#4c1d95', '#7c3aed']} style={styles.container}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{flex: 1}}>
            
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Gerenciar Loja</Text>
                <View style={{width: 24}} /> 
            </View>

            {/* Formulário de Adição */}
            <View style={styles.formCard}>
                <Text style={styles.sectionTitle}>Novo Prêmio</Text>
                
                <TextInput 
                    style={styles.input} 
                    placeholder="Ex: Passeio no Shopping" 
                    placeholderTextColor="#aaa"
                    value={title}
                    onChangeText={setTitle}
                />
                
                <View style={styles.row}>
                    <View style={{flex: 1, marginRight: 10}}>
                        <TextInput 
                            style={styles.input} 
                            placeholder="Preço (100)" 
                            placeholderTextColor="#aaa"
                            keyboardType="numeric"
                            value={price}
                            onChangeText={setPrice}
                        />
                    </View>
                    <TouchableOpacity style={styles.addBtn} onPress={handleAdd}>
                        <Text style={styles.addBtnText}>Adicionar</Text>
                    </TouchableOpacity>
                </View>

                {/* Seletor de Ícones Horizontal */}
                <Text style={styles.label}>Ícone:</Text>
                <FlatList 
                    data={ICONS}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    keyExtractor={i => i}
                    renderItem={({item}) => (
                        <TouchableOpacity 
                            style={[styles.iconOption, selectedIcon === item && styles.iconSelected]}
                            onPress={() => setSelectedIcon(item)}
                        >
                             <MaterialCommunityIcons name={item} size={24} color={selectedIcon === item ? '#fff' : '#4c1d95'} />
                        </TouchableOpacity>
                    )}
                />
            </View>

            {/* Lista de Itens Existentes */}
            <View style={styles.listContainer}>
                <Text style={styles.listTitle}>Itens na Loja ({rewards.length})</Text>
                <FlatList 
                    data={rewards}
                    keyExtractor={item => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={{paddingBottom: 20}}
                />
            </View>

        </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 50, paddingHorizontal: 20, marginBottom: 20 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  backBtn: { padding: 5 },
  
  formCard: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    padding: 20,
    borderRadius: 20,
    elevation: 5,
    marginBottom: 20
  },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 15 },
  input: {
    backgroundColor: '#f3f4f6',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb'
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  addBtn: {
    backgroundColor: '#10b981',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
    height: 50, // Mesma altura do input
    paddingHorizontal: 20,
    marginBottom: 10
  },
  addBtnText: { color: '#fff', fontWeight: 'bold' },
  
  label: { fontSize: 12, color: '#666', marginBottom: 5 },
  iconOption: {
    width: 40, height: 40,
    borderRadius: 20,
    borderWidth: 1, borderColor: '#4c1d95',
    justifyContent: 'center', alignItems: 'center',
    marginRight: 10
  },
  iconSelected: { backgroundColor: '#4c1d95' },

  listContainer: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 20
  },
  listTitle: { fontSize: 16, fontWeight: 'bold', color: '#555', marginBottom: 10 },
  
  itemCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 15,
    alignItems: 'center',
    marginBottom: 10,
    elevation: 2
  },
  itemIconBg: {
    backgroundColor: '#ede9fe',
    width: 40, height: 40,
    borderRadius: 20,
    justifyContent: 'center', alignItems: 'center',
    marginRight: 15
  },
  itemTitle: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  itemPrice: { fontSize: 14, color: '#10b981', fontWeight: 'bold' }
});