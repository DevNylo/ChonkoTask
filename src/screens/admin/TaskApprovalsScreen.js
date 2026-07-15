import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    Modal,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { FONTS } from '../../styles/theme';

export default function TaskApprovalsScreen() {
    const navigation = useNavigation();
    const route = useRoute();
    const { profile } = useAuth();

    const familyId = route.params?.familyId || profile?.family_id;
    const adminTitle = profile?.title_archetype || "Admin";

    const [activeTab, setActiveTab] = useState('pending'); // 'pending' ou 'history'
    const [pendingAttempts, setPendingAttempts] = useState([]);
    const [historyAttempts, setHistoryAttempts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedPhotoUrl, setSelectedPhotoUrl] = useState(null);

    const [rejectModalVisible, setRejectModalVisible] = useState(false);
    const [selectedAttempt, setSelectedAttempt] = useState(null);
    const [rejectReason, setRejectReason] = useState('');

    useFocusEffect(
        useCallback(() => {
            if (familyId) fetchApprovals();
        }, [familyId])
    );

    useEffect(() => {
        if (!familyId) return;

        const subscription = supabase
            .channel('admin_approvals')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'mission_attempts', filter: `family_id=eq.${familyId}` },
                () => { fetchApprovals(); }
            )
            .subscribe();

        return () => { supabase.removeChannel(subscription); };
    }, [familyId]);

    const fetchApprovals = async () => {
        try {
            const { data, error } = await supabase
                .from('mission_attempts')
                .select(`
                    id, proof_url, created_at, earned_value, mission_id, status, family_id, feedback, admin_feedback,
                    missions ( title, icon, is_recurring, reward, reward_type, custom_reward ), 
                    profiles ( id, name, avatar, balance, experience )
                `)
                .eq('family_id', familyId)
                .order('created_at', { ascending: false });

            if (error) throw error;

            const now = new Date();
            const pending = [];
            const history = [];
            const toAutoApprove = [];

            if (data) {
                data.forEach(attempt => {
                    if (attempt.status === 'pending') {
                        const attemptDate = new Date(attempt.created_at);
                        const diffHours = (now - attemptDate) / (1000 * 60 * 60);

                        if (diffHours >= 24) {
                            toAutoApprove.push(attempt);
                        } else {
                            attempt.hoursLeft = Math.ceil(24 - diffHours);
                            pending.push(attempt);
                        }
                    } else {
                        history.push(attempt);
                    }
                });
            }

            // Executa aprovação automática silenciosa para tarefas vencidas (>24h)
            if (toAutoApprove.length > 0) {
                await processAutoApprovals(toAutoApprove);
                return; // O processAutoApprovals vai recarregar a lista no final
            }

            // Ordena pendentes do mais antigo para o mais novo
            pending.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

            setPendingAttempts(pending);
            setHistoryAttempts(history);

        } catch (error) {
            console.log("Erro ao buscar aprovações:", error);
        } finally {
            setLoading(false);
        }
    };

    // --- LÓGICA DE APROVAÇÃO AUTOMÁTICA ---
    const processAutoApprovals = async (expiredAttempts) => {
        try {
            for (const attempt of expiredAttempts) {
                await handleApprove(attempt, true); // true = silent flag
            }
        } catch (error) {
            console.log("Erro na aprovação automática:", error);
        } finally {
            fetchApprovals(); // Recarrega após a limpeza
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

    // --- LÓGICA DE APROVAÇÃO (Manual ou Automática) ---
    const handleApprove = async (attempt, isAuto = false) => {
        try {
            const isCoins = attempt.missions?.reward_type === 'coins';
            const rewardValue = attempt.earned_value || attempt.missions?.reward || 0;
            const xpGained = 25;

            const { data: currentProfile, error: fetchError } = await supabase
                .from('profiles').select('balance, experience').eq('id', attempt.profiles.id).single();

            if (fetchError) throw new Error("Erro ao buscar dados do membro.");

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

            if (!isAuto) {
                Alert.alert("SUCESSO!", `Missão aprovada!\nMembro ganhou +${xpGained} XP${isCoins && rewardValue > 0 ? ` e +${rewardValue} moedas.` : '.'}`);
                fetchApprovals();
            }

        } catch (error) {
            if (!isAuto) Alert.alert("Erro na Aprovação", error.message);
            else console.log("Erro Auto-Aprovação:", error.message);
        }
    };

    const confirmReject = async () => {
        if (!selectedAttempt) return;
        try {
            await supabase.from('mission_attempts').update({
                status: 'rejected',
                admin_feedback: rejectReason.trim() || 'Por favor, revise a tarefa e tente novamente.'
            }).eq('id', selectedAttempt.id);

            if (selectedAttempt.proof_url) await deleteProofImage(selectedAttempt.proof_url);

            setRejectModalVisible(false);
            setRejectReason('');
            fetchApprovals();
        } catch (error) {
            Alert.alert("Erro", "Falha ao recusar.");
        }
    };

    const renderCard = ({ item }) => {
        const imageUrl = getImageUrl(item.proof_url);
        const mission = item.missions || {};

        const isCustom = mission.reward_type === 'custom';
        const rewardValue = item.earned_value || mission.reward || 0;

        const isHistory = activeTab === 'history';
        const isApproved = item.status === 'approved';
        const isRejected = item.status === 'rejected';

        return (
            <View style={styles.cardWrapper}>
                <View style={styles.cardShadow} />
                <View style={[styles.cardFront, isRejected && {borderColor: '#FECACA'}, isApproved && {borderColor: '#A7F3D0'}]}>

                    <View style={styles.cardHeader}>
                        <View style={styles.profileRow}>
                            <View style={styles.avatarCircle}>
                                <MaterialCommunityIcons name="account" size={20} color="#F59E0B" />
                            </View>
                            <Text style={styles.recruitName}>{item.profiles?.name || "Membro"}</Text>
                        </View>

                        <View style={[styles.rewardTag, isCustom ? {backgroundColor:'#FDF2F8', borderColor:'#DB2777'} : {backgroundColor:'#FFFBEB', borderColor: '#F59E0B'}]}>
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
                        <Text style={styles.dateText}>{new Date(item.created_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</Text>

                        {/* AVISO DE AUTO-APROVAÇÃO (Apenas em Pendentes) */}
                        {!isHistory && item.hoursLeft && (
                            <View style={[styles.recurringBadge, {backgroundColor: '#FFF7ED', borderColor: '#F59E0B', borderWidth: 1}]}>
                                <MaterialCommunityIcons name="clock-fast" size={10} color="#D97706" />
                                <Text style={[styles.recurringText, {color: '#D97706'}]}>Aprova em {item.hoursLeft}h</Text>
                            </View>
                        )}

                        {mission.is_recurring && (
                            <View style={styles.recurringBadge}>
                                <MaterialCommunityIcons name="sync" size={10} color="#64748B" />
                                <Text style={styles.recurringText}>Recorrente</Text>
                            </View>
                        )}
                    </View>

                    {/* FOTO E STATUS */}
                    {isHistory ? (
                        <View style={[styles.historyStatusBox, isApproved ? styles.historyApproved : styles.historyRejected]}>
                            <MaterialCommunityIcons name={isApproved ? "check-decagram" : "close-octagon"} size={24} color={isApproved ? "#10B981" : "#EF4444"} />
                            <View style={{marginLeft: 10, flex: 1}}>
                                <Text style={[styles.historyStatusTitle, {color: isApproved ? "#065F46" : "#991B1B"}]}>
                                    {isApproved ? "Aprovada" : "Recusada"}
                                </Text>
                                {isRejected && item.admin_feedback && (
                                    <Text style={styles.historyFeedbackText} numberOfLines={2}>
                                        <Text style={{fontWeight: 'bold'}}>Você disse: </Text>
                                        {item.admin_feedback}
                                    </Text>
                                )}
                            </View>
                        </View>
                    ) : (
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
                    )}

                    {/* BOTÕES DE AÇÃO (Apenas em Pendentes) */}
                    {!isHistory && (
                        <View style={styles.actionRow}>
                            <TouchableOpacity
                                style={styles.rejectBtn}
                                onPress={() => { setSelectedAttempt(item); setRejectReason(''); setRejectModalVisible(true); }}
                            >
                                <MaterialCommunityIcons name="close" size={20} color="#EF4444" />
                                <Text style={styles.rejectText}>RECUSAR</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.approveBtn} onPress={() => handleApprove(item)}>
                                <MaterialCommunityIcons name="check" size={20} color="#FFF" />
                                <Text style={styles.approveText}>APROVAR</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

            {/* --- HEADER LARANJA SÓLIDO --- */}
            <View style={styles.topOrangeArea}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.8}>
                        <MaterialCommunityIcons name="arrow-left" size={24} color={'#FFF'} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>VALIDAR MISSÕES</Text>
                    <View style={{width: 40}} />
                </View>

                {/* ABAS (Tabs) */}
                <View style={styles.tabsContainer}>
                    <TouchableOpacity style={[styles.tab, activeTab === 'pending' && styles.tabActive]} onPress={() => setActiveTab('pending')}>
                        <MaterialCommunityIcons name="timer-sand" size={16} color={activeTab === 'pending' ? '#B45309' : '#FFF'} />
                        <Text style={[styles.tabText, activeTab === 'pending' && {color: '#B45309'}]}>PENDENTES ({pendingAttempts.length})</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.tab, activeTab === 'history' && styles.tabActive]} onPress={() => setActiveTab('history')}>
                        <MaterialCommunityIcons name="history" size={16} color={activeTab === 'history' ? '#B45309' : '#FFF'} />
                        <Text style={[styles.tabText, activeTab === 'history' && {color: '#B45309'}]}>HISTÓRICO ({historyAttempts.length})</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* --- BANNER DE AUTO-APROVAÇÃO --- */}
            {activeTab === 'pending' && pendingAttempts.length > 0 && (
                <View style={styles.infoBanner}>
                    <MaterialCommunityIcons name="information" size={20} color="#0284C7" style={{marginTop: 2}} />
                    <Text style={styles.infoBannerText}>
                        <Text style={{fontFamily: FONTS.bold}}>Lembrete:</Text> Tarefas são aprovadas automaticamente após 24h para não desmotivar os recrutas. Avalie sempre que puder!
                    </Text>
                </View>
            )}

            {/* --- ÁREA DE CONTEÚDO --- */}
            <FlatList
                data={activeTab === 'pending' ? pendingAttempts : historyAttempts}
                keyExtractor={item => item.id}
                renderItem={renderCard}
                contentContainerStyle={{ padding: 20, paddingTop: 10, paddingBottom: 100 }}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        {loading ? <ActivityIndicator color="#F59E0B" size="large" /> : (
                            <>
                                <MaterialCommunityIcons name={activeTab === 'pending' ? "check-decagram" : "text-box-search-outline"} size={60} color="#CBD5E1" />
                                <Text style={styles.emptyText}>{activeTab === 'pending' ? "Tudo limpo, " + adminTitle + "!" : "Nenhum histórico."}</Text>
                                <Text style={styles.emptySubText}>
                                    {activeTab === 'pending' ? "Nenhuma missão pendente de aprovação." : "As tarefas avaliadas aparecerão aqui."}
                                </Text>
                            </>
                        )}
                    </View>
                }
            />

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

                        <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5}}>
                            <Text style={styles.modalSubtitle}>Diga o que precisa melhorar:</Text>
                            <Text style={{fontSize: 10, color: '#94A3B8', fontFamily: FONTS.bold}}>{rejectReason.length}/100</Text>
                        </View>

                        <TextInput
                            style={styles.input}
                            placeholder="Ex: Faltou esticar o lençol..."
                            placeholderTextColor="#94A3B8"
                            value={rejectReason}
                            onChangeText={setRejectReason}
                            maxLength={100}
                            multiline
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
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FDFCF8' },

    topOrangeArea: {
        backgroundColor: '#F59E0B',
        paddingTop: 60,
        paddingBottom: 20,
        borderBottomLeftRadius: 35,
        borderBottomRightRadius: 35,
        zIndex: 10,
        shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 5, elevation: 5
    },

    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20 },
    headerTitle: { fontFamily: FONTS.bold, fontSize: 16, color: '#FFF', letterSpacing: 1 },
    backBtn: { padding: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 14 },

    tabsContainer: { flexDirection: 'row', paddingHorizontal: 20, marginTop: 25, gap: 10 },
    tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', borderWidth: 1, borderColor: 'transparent' },
    tabActive: { backgroundColor: '#FFF', borderColor: '#FDE68A', shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 3, elevation: 2 },
    tabText: { fontFamily: FONTS.bold, fontSize: 12, color: '#FFF', marginLeft: 6 },

    infoBanner: { flexDirection: 'row', backgroundColor: '#F0F9FF', marginHorizontal: 20, marginTop: 20, padding: 12, borderRadius: 16, borderWidth: 1, borderColor: '#BAE6FD', alignItems: 'flex-start' },
    infoBannerText: { flex: 1, marginLeft: 8, fontSize: 11, fontFamily: FONTS.regular, color: '#0369A1', lineHeight: 16 },

    cardWrapper: { marginBottom: 20, borderRadius: 24, position: 'relative', marginTop: 10 },
    cardShadow: { position: 'absolute', top: 6, left: 0, width: '100%', height: '100%', backgroundColor: '#000', borderRadius: 24, opacity: 0.05 },
    cardFront: { borderRadius: 24, borderWidth: 2, borderColor: '#E2E8F0', padding: 16, backgroundColor: '#FFF', overflow: 'hidden' },

    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    profileRow: { flexDirection: 'row', alignItems: 'center' },
    avatarCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#FFFBEB', justifyContent: 'center', alignItems: 'center', marginRight: 8, borderWidth: 1, borderColor: '#FDE68A' },
    recruitName: { fontFamily: FONTS.bold, fontSize: 14, color: '#1E293B' },

    rewardTag: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, borderWidth: 1 },
    rewardText: { fontFamily: FONTS.bold, fontSize: 12, marginLeft: 4 },

    missionTitle: { fontFamily: FONTS.bold, fontSize: 18, color: '#1E293B', marginBottom: 6 },

    metaRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15, gap: 10, flexWrap: 'wrap' },
    dateText: { fontFamily: FONTS.regular, fontSize: 12, color: '#64748B' },
    recurringBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1F5F9', paddingHorizontal: 6, paddingVertical: 4, borderRadius: 6 },
    recurringText: { fontSize: 10, color: '#64748B', marginLeft: 4, fontWeight: 'bold' },

    photoContainer: { height: 220, borderRadius: 16, overflow: 'hidden', backgroundColor: '#F8FAFC', marginBottom: 20, position: 'relative', borderWidth: 1, borderColor: '#F1F5F9' },
    proofImage: { width: '100%', height: '100%' },
    zoomBadge: { position: 'absolute', bottom: 10, right: 10, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 20, padding: 6 },
    noPhoto: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    noPhotoText: { fontFamily: FONTS.bold, color: '#CBD5E1', marginTop: 8 },

    historyStatusBox: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', marginTop: 5 },
    historyApproved: { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' },
    historyRejected: { backgroundColor: '#FEF2F2', borderColor: '#FECACA' },
    historyStatusTitle: { fontFamily: FONTS.bold, fontSize: 14 },
    historyFeedbackText: { fontFamily: FONTS.regular, fontSize: 11, color: '#991B1B', marginTop: 4, lineHeight: 16 },

    actionRow: { flexDirection: 'row', gap: 15 },
    rejectBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 16, borderWidth: 1, borderColor: '#EF4444', backgroundColor: '#FFF' },
    rejectText: { fontFamily: FONTS.bold, color: '#EF4444', marginLeft: 6, fontSize: 14 },
    approveBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 16, backgroundColor: '#10B981', shadowColor: "#10B981", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 4 },
    approveText: { fontFamily: FONTS.bold, color: '#FFF', marginLeft: 6, fontSize: 14 },

    emptyState: { alignItems: 'center', marginTop: 80, opacity: 0.8 },
    emptyText: { fontFamily: FONTS.bold, fontSize: 18, color: '#64748B', marginTop: 15 },
    emptySubText: { fontFamily: FONTS.regular, fontSize: 14, color: '#94A3B8', marginTop: 5 },

    modalPhotoOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' },
    fullImage: { width: '100%', height: '80%' },
    closePhotoBtn: { position: 'absolute', top: 50, right: 20, padding: 10, zIndex: 20, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20 },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 25 },
    modalContent: { width: '100%', backgroundColor: '#FFF', borderRadius: 24, padding: 24, borderWidth: 2, borderColor: '#EF4444' },
    modalTitle: { textAlign: 'center', fontFamily: FONTS.bold, color: '#1E293B', fontSize: 18, marginBottom: 15 },
    modalSubtitle: { fontFamily: FONTS.bold, color: '#64748B', fontSize: 12 },
    input: { backgroundColor: '#F8FAFC', borderRadius: 12, padding: 15, fontFamily: FONTS.medium, color: '#1E293B', borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 25, minHeight: 80, textAlignVertical: 'top' },
    modalActions: { flexDirection: 'row', gap: 15 },
    modalCancel: { flex: 1, padding: 14, alignItems: 'center', borderRadius: 14, backgroundColor: '#F1F5F9' },
    modalCancelText: { fontFamily: FONTS.bold, color: '#64748B' },
    modalConfirm: { flex: 1, padding: 14, alignItems: 'center', borderRadius: 14, backgroundColor: '#EF4444' },
    modalConfirmText: { fontFamily: FONTS.bold, color: '#FFF' },
});