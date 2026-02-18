import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient'; // <--- IMPORTADO
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../lib/supabase';
import { COLORS, FONTS } from '../../styles/theme';

export default function MemberRequestsScreen({ route, navigation }) {
  const { familyId } = route.params; 
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
        .eq('status', 'pending') 
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
            name: request.name_wanted, 
            role: 'recruit', 
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
      fetchRequests(); 

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

  const renderRequestCard = ({ item }) => (
    <View style={styles.cardWrapper}>
        <View style={styles.cardFront}>
            <View style={styles.infoRow}>
                <View style={styles.avatarPlaceholder}>
                    <MaterialCommunityIcons name="account-clock" size={28} color={COLORS.primary} />
                </View>
                <View style={styles.infoContent}>
                    <Text style={styles.nameText}>{item.name_wanted}</Text>
                    <Text style={styles.emailText}>{item.email}</Text>
                    <Text style={styles.dateText}>Solicitado agora</Text>
                </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.actionsRow}>
                <TouchableOpacity style={styles.rejectBtn} onPress={() => handleReject(item.id)}>
                    <MaterialCommunityIcons name="close" size={20} color="#EF4444" />
                    <Text style={styles.rejectText}>RECUSAR</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.approveBtn} onPress={() => handleApprove(item)}>
                    <MaterialCommunityIcons name="check" size={20} color="#FFF" />
                    <Text style={styles.approveText}>ACEITAR</Text>
                </TouchableOpacity>
            </View>
        </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      {/* --- HEADER COM GRADIENTE VERDE --- */}
      <LinearGradient
          colors={['#064E3B', '#10B981']} // Verde Escuro -> Verde Chonko
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.topGreenArea}
      >
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                <MaterialCommunityIcons name="arrow-left" size={24} color={'#FFFF'} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>SOLICITAÇÕES</Text>
            <View style={{width: 40}} /> 
          </View>
      </LinearGradient>
      {/* ---------------------------------- */}

      <FlatList 
        data={requests}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 20, paddingBottom: 50 }}
        renderItem={renderRequestCard}
        ListEmptyComponent={
            <View style={styles.emptyState}>
                {loading ? <ActivityIndicator color={COLORS.primary} /> : (
                    <>
                        <MaterialCommunityIcons name="account-check-outline" size={60} color="#CBD5E1" />
                        <Text style={styles.emptyText}>Tudo limpo por aqui.</Text>
                        <Text style={styles.emptySubText}>Nenhum pedido de entrada pendente.</Text>
                    </>
                )}
            </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F9FF' },
  
  // --- HEADER VERDE ESCURO (COM GRADIENTE) ---
  topGreenArea: {
      // backgroundColor removido para o gradiente funcionar
      paddingTop: 50,
      paddingBottom: 25,
      borderBottomLeftRadius: 35,
      borderBottomRightRadius: 35,
      zIndex: 10,
      marginBottom: 10,
      shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 5, elevation: 5
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20 },
  headerTitle: { fontFamily: FONTS.bold, fontSize: 16, color: '#FFF', letterSpacing: 1 }, // Cor ajustada para branco puro
  backBtn: { padding: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 14 },

  // --- CARD ---
  cardWrapper: { 
      marginBottom: 15, borderRadius: 24, 
      shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 3 
  },
  cardFront: { 
      backgroundColor: '#FFF', borderRadius: 24, 
      borderWidth: 1, borderColor: 'rgba(0,0,0,0.08)', 
      padding: 16 
  },
  
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  avatarPlaceholder: { width: 50, height: 50, borderRadius: 20, backgroundColor: '#F0FDF4', justifyContent: 'center', alignItems: 'center', marginRight: 15, borderWidth: 1, borderColor: '#DCFCE7' },
  infoContent: { flex: 1 },
  nameText: { fontFamily: FONTS.bold, fontSize: 16, color: '#1E293B' },
  emailText: { fontFamily: FONTS.regular, fontSize: 13, color: '#64748B', marginVertical: 2 },
  dateText: { fontFamily: FONTS.medium, fontSize: 11, color: '#94A3B8' },

  divider: { height: 1, backgroundColor: '#F1F5F9', marginBottom: 15 },

  actionsRow: { flexDirection: 'row', gap: 12 },
  
  rejectBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 16, borderWidth: 1, borderColor: '#EF4444', backgroundColor: '#FFF' },
  rejectText: { fontFamily: FONTS.bold, color: '#EF4444', marginLeft: 6, fontSize: 13 },
  
  approveBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 16, backgroundColor: '#10B981', shadowColor: "#10B981", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 2 },
  approveText: { fontFamily: FONTS.bold, color: '#FFF', marginLeft: 6, fontSize: 13 },

  // --- EMPTY STATE ---
  emptyState: { alignItems: 'center', marginTop: 80, opacity: 0.8 },
  emptyText: { fontFamily: FONTS.bold, fontSize: 18, color: '#64748B', marginTop: 15 },
  emptySubText: { fontFamily: FONTS.regular, fontSize: 14, color: '#94A3B8', marginTop: 5 },
});