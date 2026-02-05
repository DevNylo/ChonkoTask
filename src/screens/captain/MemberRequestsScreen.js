import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../lib/supabase';

export default function MemberRequestsScreen({ route, navigation }) {
  const { familyId } = route.params; // Recebemos o ID da família
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('join_requests')
        .select('*')
        .eq('family_id', familyId)
        .eq('status', 'pending') // Só os pendentes
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests(data);
    } catch (error) {
      Alert.alert("Erro", "Não foi possível buscar as solicitações.");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (request) => {
    try {
      // 1. Criar o Perfil Oficial (Entra como Recruta por padrão)
      const { error: profileError } = await supabase
        .from('profiles')
        .insert([{
            user_id: request.user_id,
            family_id: request.family_id,
            name: request.name_wanted, // O nome que a pessoa escolheu
            role: 'recruit', // <--- Entra como recruta (segurança), depois você promove.
            avatar: 'face-man-shimmer'
        }]);

      if (profileError) throw profileError;

      // 2. Atualizar o Pedido para Aprovado
      const { error: updateError } = await supabase
        .from('join_requests')
        .update({ status: 'approved' })
        .eq('id', request.id);

      if (updateError) throw updateError;

      Alert.alert("Sucesso", `${request.name_wanted} agora faz parte da família! 🎉`);
      fetchRequests(); // Atualiza a lista

    } catch (error) {
      Alert.alert("Erro ao aprovar", error.message);
    }
  };

  const handleReject = async (id) => {
    try {
      await supabase
        .from('join_requests')
        .update({ status: 'rejected' })
        .eq('id', id);
      
      Alert.alert("Rejeitado", "A solicitação foi recusada.");
      fetchRequests();
    } catch (error) {
      console.log(error);
    }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator color="#4c1d95" size="large"/></View>;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{padding: 10}}>
            <MaterialCommunityIcons name="arrow-left" size={28} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>Solicitações Pendentes</Text>
      </View>

      <FlatList 
        data={requests}
        keyExtractor={item => item.id}
        contentContainerStyle={{paddingBottom: 20}}
        ListEmptyComponent={
            <View style={styles.empty}>
                <MaterialCommunityIcons name="check-decagram" size={60} color="#ddd" />
                <Text style={styles.emptyText}>Tudo limpo por aqui.</Text>
                <Text style={styles.emptySubText}>Nenhum pedido de entrada pendente.</Text>
            </View>
        }
        renderItem={({ item }) => (
            <View style={styles.card}>
                <View style={styles.info}>
                    <Text style={styles.name}>{item.name_wanted}</Text>
                    <Text style={styles.email}>{item.email}</Text>
                    <Text style={styles.date}>Solicitado agora</Text>
                </View>
                <View style={styles.actions}>
                    <TouchableOpacity style={styles.rejectBtn} onPress={() => handleReject(item.id)}>
                        <MaterialCommunityIcons name="close" size={24} color="#ef4444" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.approveBtn} onPress={() => handleApprove(item)}>
                        <MaterialCommunityIcons name="check" size={24} color="#fff" />
                    </TouchableOpacity>
                </View>
            </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6', paddingTop: 50, paddingHorizontal: 20 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#333', marginLeft: 10 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  card: {
    backgroundColor: '#fff', padding: 20, borderRadius: 15, marginBottom: 15,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    elevation: 3, shadowColor: '#000', shadowOpacity: 0.1, shadowOffset: {width:0, height:2}
  },
  info: { flex: 1 },
  name: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  email: { fontSize: 14, color: '#666', marginBottom: 5 },
  date: { fontSize: 12, color: '#999' },
  
  actions: { flexDirection: 'row', gap: 15 },
  approveBtn: { backgroundColor: '#10b981', padding: 12, borderRadius: 12 },
  rejectBtn: { backgroundColor: '#fee2e2', padding: 12, borderRadius: 12 },

  empty: { alignItems: 'center', marginTop: 100 },
  emptyText: { color: '#666', marginTop: 20, fontSize: 18, fontWeight: 'bold' },
  emptySubText: { color: '#999', marginTop: 5 }
});