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
  const { familyId } = route.params || {}; 

  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPhotoUrl, setSelectedPhotoUrl] = useState(null);
  
  // Rejeição
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [selectedAttempt, setSelectedAttempt] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  useFocusEffect(
    useCallback(() => {
      if (familyId) fetchApprovals();
    }, [familyId])
  );

  const fetchApprovals = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('mission_attempts')
        .select(`
            id, proof_photo, created_at, earned_value, mission_id,
            missions ( title, icon, is_recurring ), 
            profiles ( id, name, avatar )
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: true });
      
      if (error) throw error;

      setAttempts(data || []);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  // --- STORAGE & URL ---
  const getImageUrl = (path) => {
      if (!path) return null;
      const { data } = supabase.storage.from('mission-proofs').getPublicUrl(path);
      return data.publicUrl;
  };

  const deleteProofImage = async (path) => {
      if (!path) return;
      try { await supabase.storage.from('mission-proofs').remove([path]); } catch (e) {}
  };

  // --- AÇÕES ---
  const handleApprove = async (attempt) => {
    try {
        // 1. Aprova a tentativa (muda status do envio)
        const { error: attemptError } = await supabase
            .from('mission_attempts')
            .update({ status: 'approved' })
            .eq('id', attempt.id);

        if (attemptError) throw attemptError;
        
        // 2. Paga o Recruta (Atualiza Saldo do Perfil)
        const { data: profile } = await supabase.from('profiles').select('balance').eq('id', attempt.profiles.id).single();
        const newBalance = (profile?.balance || 0) + (attempt.earned_value || 0);
        await supabase.from('profiles').update({ balance: newBalance }).eq('id', attempt.profiles.id);

        // 3. LÓGICA DE FINALIZAÇÃO (O Ajuste Importante)
        // Se a missão for ÚNICA (não recorrente), marcamos ela como CONCLUÍDA no quadro geral.
        // Se for recorrente, ela continua ativa para amanhã.
        const isRecurring = attempt.missions?.is_recurring;
        
        if (!isRecurring) {
            await supabase
                .from('missions')
                .update({ status: 'completed' })
                .eq('id', attempt.mission_id);
        }

        // 4. Limpa storage (opcional)
        // if (attempt.proof_photo) await deleteProofImage(attempt.proof_photo);

        Alert.alert("Sucesso", "Missão aprovada, moedas pagas e status atualizado!");
        fetchApprovals(); // Recarrega a lista para sumir o card
    } catch (error) {
        Alert.alert("Erro", "Falha ao aprovar.");
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
          
          if (selectedAttempt.proof_photo) await deleteProofImage(selectedAttempt.proof_photo);
          
          setRejectModalVisible(false);
          setRejectReason('');
          fetchApprovals();
      } catch (error) { Alert.alert("Erro", "Falha ao rejeitar."); }
  };

  const renderCard = ({ item }) => {
    const imageUrl = getImageUrl(item.proof_photo);

    return (
        <View style={styles.card}>
            {/* Header do Card */}
            <View style={styles.cardHeader}>
                <View style={{flexDirection:'row', alignItems:'center'}}>
                    <View style={styles.avatarCircle}>
                        <MaterialCommunityIcons name="account" size={20} color={COLORS.primary} />
                    </View>
                    <Text style={styles.recruitName}>{item.profiles?.name || "Recruta"}</Text>
                </View>
                <View style={styles.rewardTag}>
                    <MaterialCommunityIcons name="star" size={12} color={COLORS.gold} />
                    <Text style={styles.rewardText}>+{item.earned_value}</Text>
                </View>
            </View>

            {/* Conteúdo */}
            <Text style={styles.missionTitle}>{item.missions?.title || "Missão"}</Text>
            <Text style={styles.dateText}>{new Date(item.created_at).toLocaleString()}</Text>

            {/* Foto da Prova */}
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
                {imageUrl && (
                    <View style={styles.zoomBadge}>
                        <MaterialCommunityIcons name="magnify-plus" size={16} color="#fff" />
                    </View>
                )}
            </TouchableOpacity>

            {/* Botões de Ação */}
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

      {/* Modal Foto Grande */}
      <Modal visible={!!selectedPhotoUrl} transparent={true} animationType="fade" onRequestClose={() => setSelectedPhotoUrl(null)}>
        <View style={styles.modalPhotoOverlay}>
            <TouchableOpacity style={styles.closePhotoBtn} onPress={() => setSelectedPhotoUrl(null)}>
                <MaterialCommunityIcons name="close" size={30} color="#fff" />
            </TouchableOpacity>
            {selectedPhotoUrl && <Image source={{ uri: selectedPhotoUrl }} style={styles.fullImage} resizeMode="contain" />}
        </View>
      </Modal>

      {/* Modal Rejeição */}
      <Modal visible={rejectModalVisible} transparent={true} animationType="fade" onRequestClose={() => setRejectModalVisible(false)}>
          <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                  <Text style={styles.modalTitle}>RECUSAR MISSÃO</Text>
                  <Text style={styles.modalSub}>Por que essa missão não valeu?</Text>
                  
                  <View style={{flexDirection:'row', flexWrap:'wrap', gap:8, marginBottom:10}}>
                      {['Foto escura', 'Incompleta', 'Refazer'].map(tag => (
                          <TouchableOpacity key={tag} style={styles.tagChip} onPress={() => setRejectReason(tag)}>
                              <Text style={styles.tagText}>{tag}</Text>
                          </TouchableOpacity>
                      ))}
                  </View>

                  <TextInput 
                    style={styles.input} 
                    placeholder="Motivo (ex: Faltou arrumar o travesseiro)" 
                    placeholderTextColor={COLORS.placeholder}
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
  headerTitle: { fontFamily: FONTS.bold, fontSize: 18, color: COLORS.surface, letterSpacing: 1 },
  backBtn: { padding: 5, backgroundColor: COLORS.surface, borderRadius: 10 },

  card: { backgroundColor: COLORS.surface, borderRadius: 16, padding: 15, marginBottom: 20, borderWidth: 3, borderColor: COLORS.primary },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  avatarCircle: { width: 30, height: 30, borderRadius: 15, backgroundColor: COLORS.surfaceAlt, justifyContent: 'center', alignItems: 'center', marginRight: 8, borderWidth: 1, borderColor: COLORS.primary },
  recruitName: { fontFamily: FONTS.bold, fontSize: 14, color: COLORS.primary },
  rewardTag: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fffbeb', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: COLORS.gold },
  rewardText: { fontFamily: FONTS.bold, fontSize: 12, color: '#b45309', marginLeft: 4 },

  missionTitle: { fontFamily: FONTS.bold, fontSize: 18, color: COLORS.textPrimary, marginBottom: 4 },
  dateText: { fontFamily: FONTS.regular, fontSize: 12, color: COLORS.placeholder, marginBottom: 15 },

  photoContainer: { height: 200, borderRadius: 12, overflow: 'hidden', backgroundColor: COLORS.surfaceAlt, marginBottom: 15, position: 'relative', borderWidth: 1, borderColor: '#eee' },
  proofImage: { width: '100%', height: '100%' },
  noPhoto: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  noPhotoText: { fontFamily: FONTS.bold, color: COLORS.placeholder, marginTop: 5 },
  zoomBadge: { position: 'absolute', bottom: 10, right: 10, backgroundColor: 'rgba(0,0,0,0.6)', padding: 5, borderRadius: 8 },

  actionRow: { flexDirection: 'row', gap: 10 },
  rejectBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, borderRadius: 12, borderWidth: 2, borderColor: COLORS.error, backgroundColor: '#fff' },
  rejectText: { fontFamily: FONTS.bold, color: COLORS.error, marginLeft: 5 },
  approveBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, borderRadius: 12, backgroundColor: COLORS.primary, borderWidth: 2, borderColor: COLORS.primary },
  approveText: { fontFamily: FONTS.bold, color: '#fff', marginLeft: 5 },

  emptyState: { alignItems: 'center', marginTop: 50 },
  emptyText: { fontFamily: FONTS.bold, fontSize: 18, color: COLORS.surface, marginTop: 15 },
  emptySubText: { fontFamily: FONTS.regular, fontSize: 14, color: COLORS.surface, opacity: 0.8 },

  // Modal Photo
  modalPhotoOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' },
  fullImage: { width: '100%', height: '80%' },
  closePhotoBtn: { position: 'absolute', top: 50, right: 20, padding: 10 },

  // Modal Reject
  modalOverlay: { flex: 1, backgroundColor: COLORS.modalOverlay, justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { width: '100%', backgroundColor: COLORS.surface, borderRadius: 20, padding: 20, borderWidth: 3, borderColor: COLORS.primary },
  modalTitle: { textAlign: 'center', fontFamily: FONTS.bold, color: COLORS.primary, fontSize: 18 },
  modalSub: { textAlign: 'center', fontFamily: FONTS.regular, color: '#666', marginBottom: 15 },
  tagChip: { paddingHorizontal: 10, paddingVertical: 5, backgroundColor: COLORS.surfaceAlt, borderRadius: 8, borderWidth: 1, borderColor: '#ddd' },
  tagText: { fontFamily: FONTS.bold, fontSize: 12, color: COLORS.primary },
  input: { backgroundColor: '#F9FAFB', borderRadius: 10, padding: 12, fontFamily: FONTS.bold, color: COLORS.primary, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 20 },
  modalActions: { flexDirection: 'row', gap: 10 },
  modalCancel: { flex: 1, padding: 12, alignItems: 'center', borderRadius: 10, backgroundColor: '#eee' },
  modalCancelText: { fontFamily: FONTS.bold, color: '#666' },
  modalConfirm: { flex: 1, padding: 12, alignItems: 'center', borderRadius: 10, backgroundColor: COLORS.error },
  modalConfirmText: { fontFamily: FONTS.bold, color: '#fff' },
});