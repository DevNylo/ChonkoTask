import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Alert, FlatList, Image, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../lib/supabase';

export default function TaskApprovalsScreen({ route, navigation }) {
  const { familyId } = route.params;
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPhotoUrl, setSelectedPhotoUrl] = useState(null); // URL Pública para visualização
  
  // Estados para Rejeição
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [selectedAttempt, setSelectedAttempt] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => { fetchApprovals(); }, []);

  const fetchApprovals = async () => {
    try {
      const { data } = await supabase
        .from('mission_attempts')
        .select(`id, proof_photo, created_at, earned_value, missions ( title, icon ), profiles ( id, name, avatar )`)
        .eq('status', 'pending')
        .order('created_at', { ascending: true });
      
      const validData = (data || []).filter(item => item.profiles && item.missions);
      setAttempts(validData);
    } catch (error) { console.log(error); } finally { setLoading(false); }
  };

  // --- FUNÇÃO DELETAR DO STORAGE ---
  const deleteProofImage = async (path) => {
      if (!path) return;
      try {
          // Remove do bucket 'mission-proofs'
          await supabase.storage.from('mission-proofs').remove([path]);
          console.log("Imagem deletada do storage:", path);
      } catch (error) {
          console.log("Erro ao deletar imagem:", error);
      }
  };

  // --- FUNÇÃO PEGAR URL PÚBLICA ---
  const getImageUrl = (path) => {
      if (!path) return null;
      // Transforma o caminho do arquivo em uma URL que a tag <Image> consegue ler
      const { data } = supabase.storage.from('mission-proofs').getPublicUrl(path);
      return data.publicUrl;
  };

  const handleApprove = async (attempt) => {
    try {
        // 1. Atualiza Status
        await supabase.from('mission_attempts').update({ status: 'approved' }).eq('id', attempt.id);
        
        // 2. Paga o Recruta
        const { data: profile } = await supabase.from('profiles').select('balance').eq('id', attempt.profiles.id).single();
        await supabase.from('profiles').update({ balance: (profile.balance || 0) + attempt.earned_value }).eq('id', attempt.profiles.id);

        // 3. LIMPEZA: Deleta a foto do storage para economizar espaço
        if (attempt.proof_photo) await deleteProofImage(attempt.proof_photo);

        Alert.alert("Sucesso", "Aprovado e pago!");
        fetchApprovals();
    } catch (error) { Alert.alert("Erro", "Falha ao aprovar."); }
  };

  const confirmReject = async () => {
      if (!selectedAttempt) return;
      try {
          // 1. Atualiza status com feedback
          await supabase.from('mission_attempts').update({ 
              status: 'rejected',
              feedback: rejectReason || 'Refazer' 
          }).eq('id', selectedAttempt.id);
          
          // 2. LIMPEZA: Deleta a foto também (já que foi rejeitada, terá que mandar outra)
          if (selectedAttempt.proof_photo) await deleteProofImage(selectedAttempt.proof_photo);
          
          setRejectModalVisible(false);
          fetchApprovals();
          Alert.alert("Devolvido", "O recruta terá que refazer.");
      } catch (error) { console.log(error); }
  };

  const isExpired = (dateString) => {
      const created = new Date(dateString);
      const now = new Date();
      const diffHours = Math.abs(now - created) / 36e5;
      return diffHours > 24;
  };

  const handleCleanExpired = async (item) => {
      await supabase.from('mission_attempts').update({ status: 'rejected', feedback: 'Expirou (24h)' }).eq('id', item.id);
      if (item.proof_photo) await deleteProofImage(item.proof_photo);
      fetchApprovals();
  };

  const renderCard = ({ item }) => {
    const expired = isExpired(item.created_at);
    // Transforma o path (ex: user_123.jpg) em URL (https://supabase.../user_123.jpg)
    const imageUrl = getImageUrl(item.proof_photo);

    return (
        <View style={[styles.card, expired && styles.cardExpired]}>
            <View style={styles.headerCard}>
                <Text style={styles.recruitName}>{item.profiles.name}</Text>
                {expired && <View style={styles.badgeExpired}><Text style={styles.expiredText}>EXPIRADO (24h)</Text></View>}
            </View>
            
            <Text style={styles.missionTitle}>{item.missions.title}</Text>
            <Text style={styles.dateInfo}>{new Date(item.created_at).toLocaleString()}</Text>
            
            <TouchableOpacity 
                style={styles.photoContainer} 
                onPress={() => imageUrl && setSelectedPhotoUrl(imageUrl)}
                disabled={!imageUrl}
            >
                {imageUrl ? (
                    <Image source={{ uri: imageUrl }} style={styles.thumb} />
                ) : (
                    <View style={styles.placeholder}><Text>Sem foto</Text></View>
                )}
            </TouchableOpacity>

            <View style={styles.actions}>
                {expired ? (
                    <TouchableOpacity style={styles.btnExpired} onPress={() => handleCleanExpired(item)}>
                        <Text style={styles.btnTextWhite}>Limpar Expiração</Text>
                    </TouchableOpacity>
                ) : (
                    <>
                        <TouchableOpacity style={styles.btnReject} onPress={() => { setSelectedAttempt(item); setRejectReason(''); setRejectModalVisible(true); }}>
                            <Text style={styles.btnTextRed}>Recusar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.btnApprove} onPress={() => handleApprove(item)}>
                            <Text style={styles.btnTextWhite}>Aprovar (+{item.earned_value})</Text>
                        </TouchableOpacity>
                    </>
                )}
            </View>
        </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><MaterialCommunityIcons name="arrow-left" size={28} color="#333" /></TouchableOpacity>
        <Text style={styles.title}>Validar Missões</Text>
      </View>

      <FlatList 
        data={attempts} keyExtractor={item => item.id} renderItem={renderCard} contentContainerStyle={{padding: 20}}
        ListEmptyComponent={<Text style={{textAlign:'center', marginTop:50, color:'#999'}}>Nenhuma pendência.</Text>}
      />

      {/* Modal Foto Grande */}
      <Modal visible={!!selectedPhotoUrl} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
            <TouchableOpacity style={styles.closeModal} onPress={() => setSelectedPhotoUrl(null)}><MaterialCommunityIcons name="close" size={30} color="#fff" /></TouchableOpacity>
            {selectedPhotoUrl && <Image source={{ uri: selectedPhotoUrl }} style={styles.fullImage} resizeMode="contain" />}
        </View>
      </Modal>

      {/* Modal Rejeição */}
      <Modal visible={rejectModalVisible} transparent={true} animationType="slide">
          <View style={styles.modalOverlay}>
              <View style={styles.rejectContent}>
                  <Text style={styles.modalTitle}>Recusar Missão</Text>
                  <View style={styles.tagsRow}>
                      {['Foto escura', 'Incompleto', 'Tente de novo'].map(tag => (
                          <TouchableOpacity key={tag} style={styles.tag} onPress={() => setRejectReason(tag)}>
                              <Text style={styles.tagText}>{tag}</Text>
                          </TouchableOpacity>
                      ))}
                  </View>
                  <TextInput style={styles.input} placeholder="Motivo..." value={rejectReason} onChangeText={setRejectReason} />
                  <View style={styles.actions}>
                    <TouchableOpacity style={[styles.btnReject, {backgroundColor:'#ddd'}]} onPress={() => setRejectModalVisible(false)}><Text>Cancelar</Text></TouchableOpacity>
                    <TouchableOpacity style={styles.btnReject} onPress={confirmReject}><Text style={styles.btnTextRed}>Confirmar</Text></TouchableOpacity>
                  </View>
              </View>
          </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6', paddingTop: 50 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginBottom: 10 },
  title: { fontSize: 24, fontWeight: 'bold', marginLeft: 10 },
  
  card: { backgroundColor: '#fff', borderRadius: 20, padding: 15, marginBottom: 15, elevation: 2 },
  cardExpired: { backgroundColor: '#ffe4e6', borderColor: '#f43f5e', borderWidth: 1 },
  
  headerCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  recruitName: { fontWeight: 'bold', color: '#555', fontSize: 16 },
  badgeExpired: { backgroundColor: '#f43f5e', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 5 },
  expiredText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },

  missionTitle: { fontSize: 18, fontWeight: 'bold', marginTop: 5, color: '#333' },
  dateInfo: { fontSize: 12, color: '#999', marginBottom: 10 },
  
  photoContainer: { height: 200, backgroundColor: '#f3f4f6', borderRadius: 10, marginBottom: 15, overflow: 'hidden', justifyContent: 'center', alignItems: 'center' },
  thumb: { width: '100%', height: '100%' },
  placeholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  actions: { flexDirection: 'row', gap: 10 },
  btnReject: { flex: 1, padding: 12, borderRadius: 12, backgroundColor: '#fee2e2', alignItems: 'center' },
  btnApprove: { flex: 1, padding: 12, borderRadius: 12, backgroundColor: '#10b981', alignItems: 'center' },
  btnExpired: { flex: 1, padding: 12, borderRadius: 12, backgroundColor: '#f43f5e', alignItems: 'center' },
  
  btnTextRed: { color: '#ef4444', fontWeight: 'bold' },
  btnTextWhite: { color: '#fff', fontWeight: 'bold' },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' },
  fullImage: { width: '100%', height: '80%' },
  closeModal: { position: 'absolute', top: 50, right: 30, zIndex: 10 },
  rejectContent: { width: '85%', backgroundColor: '#fff', borderRadius: 20, padding: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 15 },
  tagsRow: { flexDirection: 'row', gap: 10, marginBottom: 15 },
  tag: { backgroundColor: '#f3f4f6', padding: 8, borderRadius: 8 },
  tagText: { fontSize: 12 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 10, marginBottom: 20 },
});