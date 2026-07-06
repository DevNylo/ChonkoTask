import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient'; // <--- IMPORTADO
import { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    ImageBackground,
    Modal,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { COLORS, FONTS } from '../../styles/theme';

const BACKGROUND_IMG = require('../../../assets/GenericBKG2.png');

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

  useEffect(() => {
    const subscription = supabase
      .channel('captain_approvals')
      .on(
        'postgres_changes', 
        { event: '*', schema: 'public', table: 'mission_attempts' }, 
        (payload) => {
          fetchApprovals();
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(subscription); };
  }, []);

  const fetchApprovals = async () => {
    try {
      const { data, error } = await supabase
        .from('mission_attempts')
        .select(`
            id, proof_url, created_at, earned_value, mission_id, status,
            missions ( title, icon, is_recurring, reward, reward_type, custom_reward ), 
            profiles ( id, name, avatar, balance, experience )
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
        const isCoins = attempt.missions?.reward_type === 'coins';
        const rewardValue = attempt.earned_value || attempt.missions?.reward || 0;
        const xpGained = 25; 

        const { data: currentProfile, error: fetchError } = await supabase
            .from('profiles').select('balance, experience').eq('id', attempt.profiles.id).single();
        
        if (fetchError) throw new Error("Erro ao buscar dados do recruta.");

        const currentBalance = currentProfile.balance || 0;
        const currentExperience = currentProfile.experience || 0;

        const newBalance = isCoins ? (currentBalance + rewardValue) : currentBalance;
        const newExperience = currentExperience + xpGained;

        const { error: updateProfileError } = await supabase
            .from('profiles')
            .update({ balance: newBalance, experience: newExperience })
            .eq('id', attempt.profiles.id);

        if (updateProfileError) throw new Error("Erro ao transferir recompensas.");

        const { error: attemptError } = await supabase
            .from('mission_attempts').update({ status: 'approved' }).eq('id', attempt.id);

        if (attemptError) throw attemptError;
        
        const isRecurring = attempt.missions?.is_recurring;
        if (!isRecurring) {
            await supabase.from('missions').update({ status: 'completed' }).eq('id', attempt.mission_id);
        }

        if (attempt.proof_url) await deleteProofImage(attempt.proof_url);

        Alert.alert("SUCESSO!", `Missão aprovada!\nRecruta ganhou +${xpGained} XP${isCoins && rewardValue > 0 ? ` e +${rewardValue} moedas.` : '.'}`);
        fetchApprovals(); 

    } catch (error) {
        Alert.alert("Erro na Aprovação", error.message);
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
        <View style={styles.cardWrapper}>
            <View style={styles.cardShadow} />
            <View style={[styles.cardFront, { backgroundColor: 'rgba(255, 255, 255, 0.95)' }]}>
                
                <View style={styles.cardHeader}>
                    <View style={styles.profileRow}>
                        <View style={styles.avatarCircle}>
                            <MaterialCommunityIcons name="account" size={20} color={COLORS.primary} />
                        </View>
                        <Text style={styles.recruitName}>{item.profiles?.name || "Recruta"}</Text>
                    </View>
                    
                    <View style={[styles.rewardTag, isCustom ? {backgroundColor:'#FDF2F8', borderColor:'#DB2777'} : {backgroundColor:'#FFFBEB', borderColor: COLORS.gold}]}>
                        <MaterialCommunityIcons 
                            name={isCustom ? "gift" : "circle-multiple"} 
                            size={14} 
                            color={isCustom ? '#DB2777' : '#B45309'} 
                        />
                        <Text style={[styles.rewardText, {color: isCustom ? '#DB2777' : '#B45309'}]}>
                            {isCustom ? (mission.custom_reward || "Prêmio") : `+${rewardValue}`}
                        </Text>
                    </View>
                </View>
                
                <Text style={styles.missionTitle}>{mission.title || "Missão Sem Título"}</Text>
                
                <View style={styles.metaRow}>
                    <Text style={styles.dateText}>{new Date(item.created_at).toLocaleString()}</Text>
                    {mission.is_recurring && (
                        <View style={styles.recurringBadge}>
                            <MaterialCommunityIcons name="sync" size={10} color="#64748B" />
                            <Text style={styles.recurringText}>Recorrente</Text>
                        </View>
                    )}
                </View>

                <TouchableOpacity 
                    style={styles.photoContainer} 
                    onPress={() => imageUrl && setSelectedPhotoUrl(imageUrl)}
                    disabled={!imageUrl}
                    activeOpacity={0.9}
                >
                    {imageUrl ? (
                        <>
                            <Image source={{ uri: imageUrl }} style={styles.proofImage} resizeMode="cover" />
                            <View style={styles.zoomBadge}>
                                <MaterialCommunityIcons name="magnify-plus-outline" size={20} color="#FFF" />
                            </View>
                        </>
                    ) : (
                        <View style={styles.noPhoto}>
                            <MaterialCommunityIcons name="image-off-outline" size={32} color="#CBD5E1" />
                            <Text style={styles.noPhotoText}>Sem foto anexada</Text>
                        </View>
                    )}
                </TouchableOpacity>

                <View style={styles.actionRow}>
                    <TouchableOpacity 
                        style={styles.rejectBtn} 
                        onPress={() => { setSelectedAttempt(item); setRejectReason(''); setRejectModalVisible(true); }}
                    >
                        <MaterialCommunityIcons name="close" size={20} color="#EF4444" />
                        <Text style={styles.rejectText}>RECUSAR</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                        style={styles.approveBtn} 
                        onPress={() => handleApprove(item)}
                    >
                        <MaterialCommunityIcons name="check" size={20} color="#FFF" />
                        <Text style={styles.approveText}>APROVAR</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
  };

  return (
    <ImageBackground source={BACKGROUND_IMG} style={styles.container} resizeMode="repeat">
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
                <MaterialCommunityIcons name="arrow-left" size={24} color={COLORS.primary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>VALIDAR MISSÕES</Text>
            <View style={{width: 40}} /> 
          </View>
      </LinearGradient>
      {/* ---------------------------------- */}

      {/* --- ÁREA DE CONTEÚDO COM VIDRO FOSCO --- */}
      <View style={styles.glassContainer}>
          <BlurView intensity={100} tint="light" style={StyleSheet.absoluteFill} />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255, 255, 255, 0.4)' }]} />

          <FlatList
            data={attempts}
            keyExtractor={item => item.id}
            renderItem={renderCard}
            contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
            ListEmptyComponent={
                <View style={styles.emptyState}>
                    {loading ? <ActivityIndicator color={COLORS.primary} /> : (
                        <>
                            <MaterialCommunityIcons name="check-decagram" size={60} color="#64748B" />
                            <Text style={styles.emptyText}>Tudo limpo, Capitão!</Text>
                            <Text style={styles.emptySubText}>Nenhuma missão pendente de aprovação.</Text>
                        </>
                    )}
                </View>
            }
          />
      </View>

      {/* MODAL DE FOTO */}
      <Modal visible={!!selectedPhotoUrl} transparent={true} animationType="fade" onRequestClose={() => setSelectedPhotoUrl(null)}>
        <View style={styles.modalPhotoOverlay}>
            <TouchableOpacity style={styles.closePhotoBtn} onPress={() => setSelectedPhotoUrl(null)}>
                <MaterialCommunityIcons name="close" size={28} color="#FFF" />
            </TouchableOpacity>
            {selectedPhotoUrl && <Image source={{ uri: selectedPhotoUrl }} style={styles.fullImage} resizeMode="contain" />}
        </View>
      </Modal>

      {/* MODAL DE REJEIÇÃO */}
      <Modal visible={rejectModalVisible} transparent={true} animationType="fade" onRequestClose={() => setRejectModalVisible(false)}>
        <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>RECUSAR MISSÃO</Text>
                <Text style={styles.modalSubtitle}>Diga ao recruta o que precisa melhorar:</Text>
                <TextInput 
                  style={styles.input} 
                  placeholder="Ex: A cama ainda está bagunçada..." 
                  placeholderTextColor="#94A3B8"
                  value={rejectReason}
                  onChangeText={setRejectReason}
                  autoFocus
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
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 }, 
  
  // --- HEADER GRADIENTE ---
  topGreenArea: {
      paddingTop: 50,
      paddingBottom: 30, // Espaço extra para o vidro
      borderBottomLeftRadius: 35,
      borderBottomRightRadius: 35,
      zIndex: 10,
      shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 5, elevation: 5
  },
  
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20 },
  headerTitle: { fontFamily: FONTS.bold, fontSize: 16, color: '#D1FAE5', letterSpacing: 1 },
  backBtn: { padding: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 14 },

  // --- EFEITO DE VIDRO ---
  glassContainer: {
      flex: 1,
      marginTop: -25, // Sobreposição
      borderTopLeftRadius: 30,
      borderTopRightRadius: 30,
      overflow: 'hidden',
      paddingTop: 10,
  },

  cardWrapper: { marginBottom: 20, borderRadius: 24, position: 'relative', shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 4.65, elevation: 8 },
  cardShadow: { position: 'absolute', top: 6, left: 0, width: '100%', height: '100%', backgroundColor: COLORS.shadow, borderRadius: 24, opacity: 0.05 },
  cardFront: { borderRadius: 24, borderWidth: 1, borderColor: COLORS.primary, padding: 16, overflow: 'hidden' },
  
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  profileRow: { flexDirection: 'row', alignItems: 'center' },
  avatarCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F0FDF4', justifyContent: 'center', alignItems: 'center', marginRight: 8, borderWidth: 1, borderColor: '#DCFCE7' },
  recruitName: { fontFamily: FONTS.bold, fontSize: 14, color: '#1E293B' },
  
  rewardTag: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, borderWidth: 1 },
  rewardText: { fontFamily: FONTS.bold, fontSize: 12, marginLeft: 4 },

  missionTitle: { fontFamily: FONTS.bold, fontSize: 18, color: '#1E293B', marginBottom: 6 },
  
  metaRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15, gap: 10 },
  dateText: { fontFamily: FONTS.regular, fontSize: 12, color: '#64748B' },
  recurringBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1F5F9', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  recurringText: { fontSize: 10, color: '#64748B', marginLeft: 4, fontWeight: 'bold' },

  photoContainer: { height: 220, borderRadius: 16, overflow: 'hidden', backgroundColor: '#F8FAFC', marginBottom: 20, position: 'relative', borderWidth: 1, borderColor: '#F1F5F9' },
  proofImage: { width: '100%', height: '100%' },
  zoomBadge: { position: 'absolute', bottom: 10, right: 10, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 20, padding: 6 },
  noPhoto: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  noPhotoText: { fontFamily: FONTS.bold, color: '#CBD5E1', marginTop: 8 },

  actionRow: { flexDirection: 'row', gap: 15 },
  rejectBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 16, borderWidth: 1, borderColor: '#EF4444', backgroundColor: '#FFF' },
  rejectText: { fontFamily: FONTS.bold, color: '#EF4444', marginLeft: 6, fontSize: 14 },
  approveBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 16, backgroundColor: '#10B981', shadowColor: "#10B981", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 4 },
  approveText: { fontFamily: FONTS.bold, color: '#FFF', marginLeft: 6, fontSize: 14 },

  emptyState: { alignItems: 'center', marginTop: 60, opacity: 0.8 },
  emptyText: { fontFamily: FONTS.bold, fontSize: 18, color: '#64748B', marginTop: 15 },
  emptySubText: { fontFamily: FONTS.regular, fontSize: 14, color: '#94A3B8', marginTop: 5 },

  modalPhotoOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' },
  fullImage: { width: '100%', height: '80%' },
  closePhotoBtn: { position: 'absolute', top: 50, right: 20, padding: 10, zIndex: 20, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20 },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 25 },
  modalContent: { width: '100%', backgroundColor: '#FFF', borderRadius: 24, padding: 24, borderWidth: 1, borderColor: COLORS.primary },
  modalTitle: { textAlign: 'center', fontFamily: FONTS.bold, color: '#1E293B', fontSize: 18, marginBottom: 5 },
  modalSubtitle: { textAlign: 'center', fontFamily: FONTS.regular, color: '#64748B', fontSize: 14, marginBottom: 20 },
  input: { backgroundColor: '#F8FAFC', borderRadius: 12, padding: 15, fontFamily: FONTS.medium, color: '#1E293B', borderWidth: 1, borderColor: '#F1F5F9', marginBottom: 25, minHeight: 80, textAlignVertical: 'top' },
  modalActions: { flexDirection: 'row', gap: 15 },
  modalCancel: { flex: 1, padding: 14, alignItems: 'center', borderRadius: 14, backgroundColor: '#F1F5F9' },
  modalCancelText: { fontFamily: FONTS.bold, color: '#64748B' },
  modalConfirm: { flex: 1, padding: 14, alignItems: 'center', borderRadius: 14, backgroundColor: '#EF4444' },
  modalConfirmText: { fontFamily: FONTS.bold, color: '#FFF' },
});