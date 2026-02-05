import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    KeyboardAvoidingView, Platform, ScrollView,
    StyleSheet,
    Text,
    TextInput, TouchableOpacity,
    View
} from 'react-native';
import { supabase } from '../../lib/supabase';

// Lista de ícones divertidos para escolher
const ICONS = [
  'broom', 'bed', 'book-open-variant', 'dog-side', 
  'trash-can-outline', 'water', 'silverware-fork-knife', 
  'flower', 'gamepad-variant', 'tshirt-crew', 'shoe-sneaker', 
  'toothbrush', 'school', 'music-note'
];

export default function CreateTaskScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { familyId } = route.params; // Recebemos o ID da família

  const [title, setTitle] = useState('');
  const [reward, setReward] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('star'); // Ícone padrão
  const [loading, setLoading] = useState(false);

  const handleCreateTask = async () => {
    if (!title || !reward) {
      Alert.alert("Ops!", "Dê um nome para a missão e escolha um valor.");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from('missions')
        .insert([{
            family_id: familyId,
            title: title,
            reward: parseInt(reward),
            icon: selectedIcon,
            status: 'active'
        }]);

      if (error) throw error;

      Alert.alert("Sucesso! 🎉", "Missão criada. Os recrutas já podem vê-la!");
      navigation.goBack(); // Volta para a Home

    } catch (error) {
      Alert.alert("Erro", "Não foi possível criar a missão.");
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  const renderIconItem = ({ item }) => (
    <TouchableOpacity 
      style={[
        styles.iconItem, 
        selectedIcon === item && styles.iconSelected
      ]}
      onPress={() => setSelectedIcon(item)}
    >
      <MaterialCommunityIcons 
        name={item} 
        size={32} 
        color={selectedIcon === item ? '#fff' : '#666'} 
      />
    </TouchableOpacity>
  );

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
      style={styles.container}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <MaterialCommunityIcons name="arrow-left" size={28} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>Nova Missão</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        
        {/* Card de Preview (Como vai ficar) */}
        <View style={styles.previewContainer}>
            <Text style={styles.label}>Como vai aparecer:</Text>
            <View style={styles.cardPreview}>
                <View style={styles.iconBox}>
                    <MaterialCommunityIcons name={selectedIcon} size={30} color="#fff" />
                </View>
                <View style={{flex: 1}}>
                    <Text style={styles.previewTitle}>{title || "Título da Missão"}</Text>
                    <Text style={styles.previewReward}>+{reward || "0"} moedas</Text>
                </View>
            </View>
        </View>

        {/* Formulário */}
        <Text style={styles.label}>O que deve ser feito?</Text>
        <TextInput 
            style={styles.input}
            placeholder="Ex: Arrumar a cama, Lavar a louça..."
            value={title}
            onChangeText={setTitle}
        />

        <Text style={styles.label}>Recompensa (Moedas)</Text>
        <TextInput 
            style={styles.input}
            placeholder="Ex: 50"
            keyboardType="numeric"
            value={reward}
            onChangeText={setReward}
        />

        <Text style={styles.label}>Escolha um Ícone</Text>
        <FlatList
            data={ICONS}
            keyExtractor={item => item}
            renderItem={renderIconItem}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.iconList}
        />

      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.createBtn} onPress={handleCreateTask} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : (
                <>
                    <MaterialCommunityIcons name="plus-circle-outline" size={24} color="#fff" style={{marginRight: 10}} />
                    <Text style={styles.btnText}>Criar Missão</Text>
                </>
            )}
        </TouchableOpacity>
      </View>

    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  header: { 
    flexDirection: 'row', alignItems: 'center', paddingTop: 50, paddingBottom: 20, paddingHorizontal: 20, backgroundColor: '#fff',
    elevation: 2 
  },
  backBtn: { marginRight: 15 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#333' },
  
  content: { padding: 20 },
  label: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 10, marginTop: 10 },
  
  input: { 
    backgroundColor: '#fff', borderRadius: 15, padding: 15, fontSize: 16, marginBottom: 10,
    borderWidth: 1, borderColor: '#ddd'
  },

  // Estilos da Lista de Ícones
  iconList: { paddingVertical: 10 },
  iconItem: {
    width: 60, height: 60, borderRadius: 30, backgroundColor: '#fff',
    justifyContent: 'center', alignItems: 'center', marginRight: 15,
    borderWidth: 1, borderColor: '#ddd'
  },
  iconSelected: {
    backgroundColor: '#4c1d95', borderColor: '#4c1d95'
  },

  // Preview Card
  previewContainer: { marginBottom: 20 },
  cardPreview: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    padding: 15, borderRadius: 20, borderWidth: 2, borderColor: '#e5e7eb', borderStyle: 'dashed'
  },
  iconBox: {
    width: 50, height: 50, borderRadius: 25, backgroundColor: '#4c1d95',
    justifyContent: 'center', alignItems: 'center', marginRight: 15
  },
  previewTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  previewReward: { fontSize: 14, color: '#059669', fontWeight: 'bold' },

  footer: { padding: 20, backgroundColor: '#fff' },
  createBtn: {
    backgroundColor: '#4c1d95', borderRadius: 15, padding: 18,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center'
  },
  btnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' }
});