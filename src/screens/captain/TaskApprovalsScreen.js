import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    Modal,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { COLORS, FONTS } from '../../styles/theme';

export default function TaskApprovalsScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPhotoUrl, setSelectedPhotoUrl] = useState(null);
  
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [selectedAttempt, setSelectedAttempt] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  useFocusEffect(
    useCallback(() => {
      fetchApprovals();
    }, [])
  );

  const fetchApprovals = async () => {
    try {
      setLoading(true);
      // Busca dados completos
      const { data, error } = await supabase
        .from('mission_attempts')
        .select(`
            id, proof_url, created_at, earned_value, mission_id, status,
            missions ( title, icon, is_recurring, reward, reward_type, custom_reward ), 
            profiles ( id, name, avatar, balance )
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      setAttempts(data || []);
    } catch (error) {
      console.log("Erro ao buscar aprovações:", error);
    } finally {
      setLoading(false);
    }
  };

  const getImageUrl = (path) => {
      if (!path) return null;
      const { data } = supabase.storage.from('mission-proofs').getPublicUrl(path);
      return data.publicUrl;
  };

  const deleteProofImage = async (path) => {
      if (!path) return;
      try { await supabase.storage.from('mission-proofs').remove([path]); } catch (e) {}
  };

  const handleApprove = async (attempt) => {
    try {
        console.log("--- INICIANDO APROVAÇÃO ---");
        
        // 1. Lógica de Pagamento
        const isCoins = attempt.missions?.reward_type === 'coins';
        
        if (isCoins) {
            // Busca saldo atualizado do servidor para não ter erro de cache
            const { data: currentProfile, error: fetchError } = await supabase
                .from('profiles')
                .select('balance')
                .eq('id', attempt.profiles.id)
                .single();
            
            if (fetchError) throw new Error("Erro ao buscar saldo do recruta: " + fetchError.message);

            const currentBalance = currentProfile.balance || 0;
            const rewardValue = attempt.earned_value || attempt.missions?.reward || 0;
            const newBalance = currentBalance + rewardValue;

            console.log(`Saldo Atual: ${currentBalance} | Prêmio: ${rewardValue} | Novo Saldo: ${newBalance}`);

            // Atualiza o saldo
            const { error: payError } = await supabase
                .from('profiles')
                .update({ balance: newBalance })
                .eq('id', attempt.profiles.id);

            if (payError) {
                console.error("ERRO NO PAGAMENTO:", payError);
                throw new Error("Não foi possível pagar o recruta. Verifique as permissões (RLS).");
            }
            console.log("Pagamento efetuado com sucesso.");
        }

        // 2. Atualiza status da tentativa
        const { error: attemptError } = await supabase
            .from('mission_attempts')
            .update({ status: 'approved' })
            .eq('id', attempt.id);

        if (attemptError) throw attemptError;
        
        // 3. Atualiza status da Missão (Se não for recorrente)
        const isRecurring = attempt.missions?.is_recurring;
        if (!isRecurring) {
            await supabase
                .from('missions')
                .update({ status: 'completed' })
                .eq('id', attempt.mission_id);
        }

        // 4. Limpeza
        if (attempt.proof_url) await deleteProofImage(attempt.proof_url);

        Alert.alert("SUCESSO!", isCoins ? "Moedas transferidas!" : "Missão personalizada concluída!");
        fetchApprovals(); 

    } catch (error) {
        Alert.alert("Erro na Aprovação", error.message);
        console.log(error);
    }
  };

  const confirmReject = async () => {
      if (!selectedAttempt) return;
      try {
          await supabase.from('mission_attempts').update({ 
              status: 'rejected',
              feedback: rejectReason || 'Refazer' 
          }).eq('id', selectedAttempt.id);
          
          if (selectedAttempt.proof_url) await deleteProofImage(selectedAttempt.proof_url);
          
          setRejectModalVisible(false);
          setRejectReason('');
          fetchApprovals();
      } catch (error) { Alert.alert("Erro", "Falha ao rejeitar."); }
  };

  const renderCard = ({ item }) => {
    const imageUrl = getImageUrl(item.proof_url);
    const mission = item.missions || {};
    
    const isCustom = mission.reward_type === 'custom';
    const rewardValue = item.earned_value || mission.reward || 0;

    return (
        <View style={styles.card}>
            {/* Header */}
            <View style={styles.cardHeader}>
                <View style={{flexDirection:'row', alignItems:'center'}}>
                    <View style={styles.avatarCircle}>
                        <MaterialCommunityIcons name="account" size={20} color={COLORS.primary} />
                    </View>
                    <Text style={styles.recruitName}>{item.profiles?.name || "Recruta"}</Text>
                </View>
                
                {/* TAG RECOMPENSA */}
                <View style={[
                    styles.rewardTag, 
                    isCustom && { backgroundColor: '#fdf2f8', borderColor: '#db2777' } 
                ]}>
                    <MaterialCommunityIcons 
                        name={isCustom ? "gift" : "circle-multiple"} 
                        size={14} 
                        color={isCustom ? '#db2777' : COLORS.gold} 
                    />
                    <Text style={[
                        styles.rewardText, 
                        isCustom && { color: '#db2777' }
                    ]}>
                        {isCustom ? (mission.custom_reward || "Prêmio") : `+${rewardValue}`}
                    </Text>
                </View>
            </View>

            <Text style={styles.missionTitle}>{mission.title || "Missão"}</Text>
            
            {mission.is_recurring && (
                <View style={styles.recurringTag}>
                    <MaterialCommunityIcons name="sync" size={12} color="#666" />
                    <Text style={{fontSize:10, color:'#666', marginLeft:4}}>Recorrente</Text>
                </View>
            )}

            <Text style={styles.dateText}>{new Date(item.created_at).toLocaleString()}</Text>

            {/* Foto */}
            <TouchableOpacity 
                style={styles.photoContainer} 
                onPress={() => imageUrl && setSelectedPhotoUrl(imageUrl)}
                disabled={!imageUrl}
            >
                {imageUrl ? (
                    <Image source={{ uri: imageUrl }} style={styles.proofImage} resizeMode="cover" />
                ) : (
                    <View style={styles.noPhoto}>
                        <MaterialCommunityIcons name="image-off" size={30} color={COLORS.placeholder} />
                        <Text style={styles.noPhotoText}>Sem foto</Text>
                    </View>
                )}
            </TouchableOpacity>

            {/* Ações */}
            <View style={styles.actionRow}>
                <TouchableOpacity 
                    style={styles.rejectBtn} 
                    onPress={() => { setSelectedAttempt(item); setRejectReason(''); setRejectModalVisible(true); }}
                >
                    <MaterialCommunityIcons name="close" size={24} color={COLORS.error} />
                    <Text style={styles.rejectText}>RECUSAR</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                    style={styles.approveBtn} 
                    onPress={() => handleApprove(item)}
                >
                    <MaterialCommunityIcons name="check" size={24} color="#fff" />
                    <Text style={styles.approveText}>APROVAR</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <MaterialCommunityIcons name="arrow-left" size={28} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>VALIDAR MISSÕES</Text>
        <View style={{width: 28}} /> 
      </View>

      <FlatList
        data={attempts}
        keyExtractor={item => item.id}
        renderItem={renderCard}
        contentContainerStyle={{ padding: 20 }}
        ListEmptyComponent={
            <View style={styles.emptyState}>
                {loading ? <ActivityIndicator color={COLORS.primary} /> : (
                    <>
                        <MaterialCommunityIcons name="check-all" size={60} color={COLORS.primary} style={{opacity:0.3}} />
                        <Text style={styles.emptyText}>Tudo limpo, Capitão!</Text>
                        <Text style={styles.emptySubText}>Nenhuma missão pendente de aprovação.</Text>
                    </>
                )}
            </View>
        }
      />

      <Modal visible={!!selectedPhotoUrl} transparent={true} animationType="fade" onRequestClose={() => setSelectedPhotoUrl(null)}>
        <View style={styles.modalPhotoOverlay}>
            <TouchableOpacity style={styles.closePhotoBtn} onPress={() => setSelectedPhotoUrl(null)}>
                <MaterialCommunityIcons name="close" size={30} color="#fff" />
            </TouchableOpacity>
            {selectedPhotoUrl && <Image source={{ uri: selectedPhotoUrl }} style={styles.fullImage} resizeMode="contain" />}
        </View>
      </Modal>

      <Modal visible={rejectModalVisible} transparent={true} animationType="fade" onRequestClose={() => setRejectModalVisible(false)}>
          <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                  <Text style={styles.modalTitle}>RECUSAR MISSÃO</Text>
                  <TextInput 
                    style={styles.input} 
                    placeholder="Motivo..." 
                    value={rejectReason}
                    onChangeText={setRejectReason}
                  />
                  <View style={styles.modalActions}>
                      <TouchableOpacity style={styles.modalCancel} onPress={() => setRejectModalVisible(false)}>
                          <Text style={styles.modalCancelText}>CANCELAR</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.modalConfirm} onPress={confirmReject}>
                          <Text style={styles.modalConfirmText}>CONFIRMAR</Text>
                      </TouchableOpacity>
                  </View>
              </View>
          </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 50, paddingBottom: 15 },
  headerTitle: { fontFamily: FONTS.bold, fontSize: 18, color: COLORS.textPrimary, letterSpacing: 1 },
  backBtn: { padding: 5, backgroundColor: COLORS.surface, borderRadius: 10 },
  card: { backgroundColor: COLORS.surface, borderRadius: 16, padding: 15, marginBottom: 20, borderWidth: 1, borderColor: '#eee', shadowColor: "#000", shadowOffset: {width:0, height:2}, shadowOpacity:0.1, shadowRadius:4, elevation:3 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  avatarCircle: { width: 30, height: 30, borderRadius: 15, backgroundColor: COLORS.surfaceAlt, justifyContent: 'center', alignItems: 'center', marginRight: 8, borderWidth: 1, borderColor: COLORS.primary },
  recruitName: { fontFamily: FONTS.bold, fontSize: 14, color: COLORS.primary },
  rewardTag: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fffbeb', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: COLORS.gold },
  rewardText: { fontFamily: FONTS.bold, fontSize: 14, color: '#b45309', marginLeft: 4 },
  recurringTag: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
  missionTitle: { fontFamily: FONTS.bold, fontSize: 18, color: COLORS.textPrimary, marginBottom: 4 },
  dateText: { fontFamily: FONTS.regular, fontSize: 12, color: COLORS.placeholder, marginBottom: 15 },
  photoContainer: { height: 250, borderRadius: 12, overflow: 'hidden', backgroundColor: '#f0f0f0', marginBottom: 15, position: 'relative', borderWidth: 1, borderColor: '#eee' },
  proofImage: { width: '100%', height: '100%' },
  noPhoto: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  noPhotoText: { fontFamily: FONTS.bold, color: COLORS.placeholder, marginTop: 5 },
  actionRow: { flexDirection: 'row', gap: 10 },
  rejectBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, borderRadius: 12, borderWidth: 2, borderColor: COLORS.error, backgroundColor: '#fff' },
  rejectText: { fontFamily: FONTS.bold, color: COLORS.error, marginLeft: 5 },
  approveBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, borderRadius: 12, backgroundColor: COLORS.primary, borderWidth: 2, borderColor: COLORS.primary },
  approveText: { fontFamily: FONTS.bold, color: '#fff', marginLeft: 5 },
  emptyState: { alignItems: 'center', marginTop: 50 },
  emptyText: { fontFamily: FONTS.bold, fontSize: 18, color: COLORS.textPrimary, marginTop: 15 },
  emptySubText: { fontFamily: FONTS.regular, fontSize: 14, color: COLORS.placeholder, opacity: 0.8 },
  modalPhotoOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' },
  fullImage: { width: '100%', height: '80%' },
  closePhotoBtn: { position: 'absolute', top: 50, right: 20, padding: 10, zIndex: 10 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { width: '100%', backgroundColor: COLORS.surface, borderRadius: 20, padding: 20 },
  modalTitle: { textAlign: 'center', fontFamily: FONTS.bold, color: COLORS.primary, fontSize: 18, marginBottom: 15 },
  input: { backgroundColor: '#F9FAFB', borderRadius: 10, padding: 12, fontFamily: FONTS.bold, color: COLORS.primary, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 20 },
  modalActions: { flexDirection: 'row', gap: 10 },
  modalCancel: { flex: 1, padding: 12, alignItems: 'center', borderRadius: 10, backgroundColor: '#eee' },
  modalCancelText: { fontFamily: FONTS.bold, color: '#666' },
  modalConfirm: { flex: 1, padding: 12, alignItems: 'center', borderRadius: 10, backgroundColor: COLORS.error },
  modalConfirmText: { fontFamily: FONTS.bold, color: '#fff' },
});