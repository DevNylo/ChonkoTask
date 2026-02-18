import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient'; // <--- IMPORTADO
import { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    ImageBackground,
    Modal,
    RefreshControl,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { COLORS, FONTS } from '../../styles/theme';

const BACKGROUND_IMG = require('../../../assets/GenericBKG4.png');

const DIFFICULTY_CONFIG = {
    'easy':   { label: 'FÁCIL',   color: '#10B981', bg: '#F0FDF9' }, 
    'medium': { label: 'MÉDIO',   color: '#F59E0B', bg: '#FFF7ED' }, 
    'hard':   { label: 'DIFÍCIL', color: '#EF4444', bg: '#FEF2F2' }, 
    'epic':   { label: 'ÉPICO',   color: '#8B5CF6', bg: '#F5F3FF' }, 
    'custom': { label: 'MANUAL',  color: '#64748B', bg: '#F8FAFC' }  
};

const STATUS_TABS = [
    { id: 'active', label: 'ATIVAS', icon: 'clipboard-play-outline', color: '#10B981' }, 
    { id: 'completed', label: 'FEITAS', icon: 'check-circle-outline', color: '#3B82F6' }, 
    { id: 'expired', label: 'PERDIDAS', icon: 'clock-alert-outline', color: '#F59E0B' }, 
    { id: 'archived', label: 'LIXEIRA', icon: 'trash-can-outline', color: '#EF4444' }, 
];

export default function MissionManagerScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { familyId } = route.params; 

  const [activeStatus, setActiveStatus] = useState('active');
  const [profiles, setProfiles] = useState([]);
  const [filterAssignee, setFilterAssignee] = useState(null); 
  const [filterName, setFilterName] = useState('TODOS');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [missions, setMissions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateOptions, setShowCreateOptions] = useState(false);

  const loadScreenData = useCallback(async () => {
        if (!familyId) return;
        setLoading(true);
        try {
            await ensureRecurringActive();
            await checkExpiredOneOffMissions(); 
            
            const { data: profilesData } = await supabase
                .from('profiles').select('id, name').eq('family_id', familyId).neq('role', 'captain');
            setProfiles(profilesData || []);

            const { data: missionsData, error } = await supabase
                .from('missions')
                .select('*')
                .eq('family_id', familyId)
                .eq('status', activeStatus)
                .eq('is_template', false) 
                .order('created_at', { ascending: false });

            if (error) throw error;
            setMissions(missionsData || []);

        } catch (error) {
            console.log("Erro ao carregar:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
  }, [activeStatus, familyId]);

  useFocusEffect(
    useCallback(() => {
        loadScreenData();
    }, [loadScreenData]) 
  );

  const onRefresh = () => {
      setRefreshing(true);
      loadScreenData();
  };

  const ensureRecurringActive = async () => {
      try {
          const { data: recurringMissions } = await supabase
              .from('missions')
              .select('id, status')
              .eq('family_id', familyId)
              .eq('is_recurring', true)
              .neq('status', 'archived');

          if (!recurringMissions || recurringMissions.length === 0) return;

          const toActive = recurringMissions
              .filter(m => m.status !== 'active')
              .map(m => m.id);

          if (toActive.length > 0) {
              await supabase.from('missions').update({ status: 'active' }).in('id', toActive);
          }
      } catch (error) { console.log("Erro Recorrência:", error); }
  };

  const checkExpiredOneOffMissions = async () => {
      const { data: activeMissions } = await supabase
        .from('missions')
        .select('id, deadline, scheduled_date')
        .eq('family_id', familyId)
        .eq('status', 'active')
        .eq('is_recurring', false);

      if (!activeMissions || activeMissions.length === 0) return;

      const now = new Date();
      const today = new Date(); 
      today.setHours(0,0,0,0);
      
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      const expiredIds = [];

      activeMissions.forEach(m => {
          const missionDate = m.scheduled_date ? new Date(m.scheduled_date + 'T00:00:00') : today;
          
          if (missionDate < today) {
              expiredIds.push(m.id);
          } 
          else if (missionDate.getTime() === today.getTime() && m.deadline) {
              const [h, min] = m.deadline.split(':').map(Number);
              const deadlineMinutes = h * 60 + min;
              if (deadlineMinutes < currentMinutes) {
                  expiredIds.push(m.id);
              }
          }
      });

      if (expiredIds.length > 0) {
          await supabase.from('missions').update({ status: 'expired' }).in('id', expiredIds);
      }
  };

  const filteredMissions = missions.filter(m => {
      if (!filterAssignee) return true;
      return m.assigned_to === filterAssignee;
  });

  const handleDelete = (id) => {
      Alert.alert("Arquivar", "Mover para lixeira?", [
          { text: "Não" },
          { text: "Sim", style: 'destructive', onPress: async () => {
              await supabase.from('missions').update({ status: 'archived' }).eq('id', id);
              loadScreenData();
          }}
      ]);
  };

  const getDayLabels = (days) => {
      if (!days || days.length === 0) return "";
      const WEEK_LABELS = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];
      if (days.length === 7) return "Todos os dias";
      return days.map(d => WEEK_LABELS[d]).join(", ");
  };

  const formatDate = (dateString) => {
      if (!dateString) return "Hoje";
      const date = new Date(dateString + 'T00:00:00');
      const today = new Date(); today.setHours(0,0,0,0);
      
      if (date.getTime() === today.getTime()) return "Hoje";
      return date.toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit'});
  };

  const renderMissionCard = ({ item }) => {
      const isCustom = item.reward_type === 'custom';
      const assigneeName = item.assigned_to 
        ? (profiles.find(p => p.id === item.assigned_to)?.name || 'Recruta') 
        : 'TODOS';
      
      const isCompleted = item.status === 'completed';
      const isInactive = item.status === 'expired' || item.status === 'archived'; 
      
      const diffData = DIFFICULTY_CONFIG[item.difficulty] || DIFFICULTY_CONFIG['custom'];
      
      let cardBg, iconColor, titleColor, borderColor;

      if (isCompleted) {
          cardBg = '#F0FDF4'; 
          iconColor = '#16A34A'; 
          titleColor = '#14532D';
          borderColor = '#16A34A';
      } else if (isInactive) {
          cardBg = '#F9FAFB'; 
          iconColor = '#9CA3AF'; 
          titleColor = '#9CA3AF';
          borderColor = '#E5E7EB';
      } else {
          cardBg = diffData.bg; 
          iconColor = diffData.color; 
          titleColor = '#1E293B'; 
          borderColor = diffData.color; 
      }
      
      return (
        <View style={styles.cardWrapper}>
            <View style={styles.cardShadow} />
            
            <View style={[styles.cardFront, { backgroundColor: cardBg, borderColor: borderColor }]}>
                
                <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 10}}>
                    <View style={[styles.iconBox, {backgroundColor: '#FFF', borderWidth: 1, borderColor: isInactive ? '#E5E7EB' : borderColor+'40' }]}>
                        <MaterialCommunityIcons name={isCompleted ? "check-decagram" : item.icon} size={28} color={iconColor} />
                    </View>
                    
                    <View style={{flex:1}}>
                        <Text style={[styles.cardTitle, {color: titleColor}]} numberOfLines={1}>{item.title}</Text>
                        
                        <View style={{flexDirection: 'row', marginTop: 4, gap: 5}}>
                            <View style={[styles.tagBase, { backgroundColor: '#FFF', borderColor: isCustom ? '#DB2777' : '#F59E0B' }]}>
                                <MaterialCommunityIcons name={isCustom ? "gift" : "circle-multiple"} size={10} color={isCustom ? '#DB2777' : '#B45309'} />
                                <Text style={[styles.tagText, { color: isCustom ? '#DB2777' : '#B45309' }]}>
                                    {isCustom ? (item.custom_reward || "Prêmio") : `+${item.reward}`}
                                </Text>
                            </View>

                            {item.difficulty && (
                                <View style={[styles.tagBase, { backgroundColor: '#FFF', borderColor: diffData.color }]}>
                                    <Text style={[styles.tagText, { color: diffData.color }]}>{diffData.label}</Text>
                                </View>
                            )}
                        </View>
                    </View>
                </View>

                {item.use_critical && !isInactive && (
                    <View style={[
                        styles.treasureBadge, 
                        item.critical_type === 'bonus_coins' ? styles.treasureGold : styles.treasurePurple
                    ]}>
                        <MaterialCommunityIcons 
                            name={item.critical_type === 'bonus_coins' ? "arrow-up-bold-circle" : "gift"} 
                            size={14} color="#FFF" style={{marginRight:5}} 
                        />
                        <Text style={styles.treasureText}>
                            {item.critical_type === 'bonus_coins' 
                                ? `+50% Bônus (${item.critical_chance}%)` 
                                : `Item Surpresa (${item.critical_chance}%)`
                            }
                        </Text>
                    </View>
                )}

                <View style={[styles.divider, {backgroundColor: borderColor+'20'}]} />

                <View style={styles.metaInfoContainer}>
                    <View style={[styles.metaTag, { backgroundColor: '#FFF', borderColor: isInactive ? '#E2E8F0' : borderColor+'40' }]}>
                        <MaterialCommunityIcons name={item.is_recurring ? "calendar-sync" : "calendar-check"} size={12} color="#64748B" />
                        <Text style={[styles.metaText, {color: '#64748B'}]}>
                            {item.is_recurring 
                                ? (item.recurrence_days ? getDayLabels(item.recurrence_days) : "Diária") 
                                : `Data: ${formatDate(item.scheduled_date)}`
                            }
                        </Text>
                    </View>

                    {(item.start_time || item.deadline) && (
                        <View style={[styles.metaTag, { backgroundColor: '#FFF', borderColor: isInactive ? '#E2E8F0' : borderColor+'40' }]}>
                            <MaterialCommunityIcons name="clock-outline" size={12} color="#0284C7" />
                            <Text style={[styles.metaText, {color: '#0284C7'}]}>
                                {item.start_time ? item.start_time.substring(0,5) : "00:00"} - {item.deadline ? item.deadline.substring(0,5) : "..."}
                            </Text>
                        </View>
                    )}

                    <View style={[styles.metaTag, { backgroundColor: '#FFF', borderColor: isInactive ? '#E2E8F0' : borderColor+'40' }]}>
                        <MaterialCommunityIcons name="account" size={12} color="#16A34A" />
                        <Text style={[styles.metaText, {color: '#16A34A'}]}>{assigneeName}</Text>
                    </View>
                </View>

                {activeStatus === 'active' && (
                    <View style={styles.cardActions}>
                        <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('CreateMission', { familyId, missionToEdit: item })}>
                            <MaterialCommunityIcons name="pencil-outline" size={18} color={COLORS.primary} />
                            <Text style={styles.actionText}>Editar</Text>
                        </TouchableOpacity>
                        <View style={{width: 1, height: 16, backgroundColor: borderColor+'40'}} />
                        <TouchableOpacity style={styles.actionBtn} onPress={() => handleDelete(item.id)}>
                            <MaterialCommunityIcons name="trash-can-outline" size={18} color={COLORS.error} />
                            <Text style={[styles.actionText, {color: COLORS.error}]}>Cancelar</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        </View>
      );
  };

  return (
    <ImageBackground source={BACKGROUND_IMG} style={styles.container} resizeMode="repeat">
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      {/* --- CABEÇALHO COM GRADIENTE --- */}
      <LinearGradient
          colors={['#064E3B', '#10B981']} // Verde Escuro para Verde Chonko
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.topGreenArea}
      >
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                <MaterialCommunityIcons name="arrow-left" size={24} color={'#ffffff'} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>GERENCIAR MISSÕES</Text>
            <View style={{width: 40}} /> 
          </View>

          <View style={styles.filterContainer}>
             <Text style={styles.filterLabel}>Visualizando de:</Text>
             <TouchableOpacity style={styles.filterButton} onPress={() => setShowFilterModal(true)}>
                 <Text style={styles.filterText}>{filterName}</Text>
                 <MaterialCommunityIcons name="chevron-down" size={20} color={COLORS.primary} />
             </TouchableOpacity>
          </View>
      </LinearGradient>
      {/* -------------------------------- */}

      <View style={styles.contentContainer}>
          <BlurView intensity={115} tint="light" style={StyleSheet.absoluteFill} />
          
          <View style={styles.tabsWrapper}>
             <FlatList 
                data={STATUS_TABS} 
                horizontal 
                showsHorizontalScrollIndicator={false}
                keyExtractor={item => item.id} 
                contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 15 }}
                renderItem={({ item }) => {
                    const isActive = activeStatus === item.id;
                    return (
                        <TouchableOpacity 
                            style={[
                                styles.tabItem, 
                                isActive 
                                    ? { backgroundColor: item.color, borderColor: item.color } 
                                    : { borderColor: COLORS.primary, backgroundColor: '#FFF' }
                            ]}
                            onPress={() => setActiveStatus(item.id)}
                        >
                            <MaterialCommunityIcons name={item.icon} size={16} color={isActive ? '#FFF' : COLORS.primary} />
                            <Text style={[styles.tabText, isActive ? { color: '#FFF' } : { color: COLORS.primary }]}>{item.label}</Text>
                        </TouchableOpacity>
                    )
                }}
             />
          </View>

          <View style={styles.sectionDivider} />

          <FlatList 
            data={filteredMissions} 
            keyExtractor={item => item.id} 
            renderItem={renderMissionCard}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
            }
            ListEmptyComponent={
                <View style={styles.emptyState}>
                    {loading ? <ActivityIndicator color={COLORS.primary} size="large" /> : (
                        <>
                            <MaterialCommunityIcons name="clipboard-text-off-outline" size={60} color="#94A3B8" />
                            <Text style={styles.emptyTitle}>
                                {activeStatus === 'active' ? "Tudo limpo por aqui!" : "Nada nesta lista"}
                            </Text>
                            <Text style={styles.emptySub}>
                                {activeStatus === 'active' 
                                    ? "Toque no + para criar novas missões." 
                                    : "Missões finalizadas ou expiradas aparecerão aqui."}
                            </Text>
                        </>
                    )}
                </View>
            }
          />
      </View>

      {activeStatus === 'active' && (
        <TouchableOpacity style={styles.fab} activeOpacity={0.9} onPress={() => setShowCreateOptions(true)}>
            <View style={styles.fabInner}>
                <MaterialCommunityIcons name="plus" size={32} color="#FFF" />
            </View>
        </TouchableOpacity>
      )}

      {/* FILTROS E MODAIS MANTIDOS IGUAIS */}
      <Modal visible={showFilterModal} transparent={true} animationType="fade" onRequestClose={() => setShowFilterModal(false)}>
          <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                  <Text style={styles.modalTitle}>FILTRAR POR RECRUTA</Text>
                  <TouchableOpacity style={styles.modalOption} onPress={() => { setFilterAssignee(null); setFilterName('TODOS'); setShowFilterModal(false); }}>
                      <Text style={styles.modalOptionText}>TODOS</Text>
                      {filterAssignee === null && <MaterialCommunityIcons name="check" size={20} color={COLORS.primary} />}
                  </TouchableOpacity>
                  <FlatList data={profiles} keyExtractor={item => item.id} style={{ maxHeight: 300 }} renderItem={({ item }) => (
                        <TouchableOpacity style={styles.modalOption} onPress={() => { setFilterAssignee(item.id); setFilterName(item.name); setShowFilterModal(false); }}>
                            <Text style={styles.modalOptionText}>{item.name}</Text>
                            {filterAssignee === item.id && <MaterialCommunityIcons name="check" size={20} color={COLORS.primary} />}
                        </TouchableOpacity>
                    )}
                  />
                  <TouchableOpacity style={styles.closeModalBtn} onPress={() => setShowFilterModal(false)}><Text style={styles.closeModalText}>FECHAR</Text></TouchableOpacity>
              </View>
          </View>
      </Modal>

      <Modal visible={showCreateOptions} transparent={true} animationType="fade" onRequestClose={() => setShowCreateOptions(false)}>
          <View style={styles.modalOverlay}>
              <TouchableOpacity style={{flex:1, width:'100%'}} onPress={() => setShowCreateOptions(false)} />
              <View style={styles.createOptionsContainer}>
                  <View style={styles.createHeader}>
                      <Text style={styles.createOptionsTitle}>CRIAR TAREFA</Text>
                      <TouchableOpacity onPress={() => setShowCreateOptions(false)}>
                          <MaterialCommunityIcons name="close" size={24} color="#94A3B8" />
                      </TouchableOpacity>
                  </View>
                  <TouchableOpacity style={styles.createOptionBtn} onPress={() => { setShowCreateOptions(false); navigation.navigate('QuickMissions', { familyId }); }}>
                      <View style={[styles.createOptionIcon, { backgroundColor: '#FEF3C7' }]}><MaterialCommunityIcons name="flash" size={24} color="#F59E0B" /></View>
                      <View style={{flex: 1}}><Text style={styles.createOptionTitle}>MISSÃO RÁPIDA</Text><Text style={styles.createOptionSubtitle}>Usar modelos prontos</Text></View>
                      <MaterialCommunityIcons name="chevron-right" size={24} color="#CBD5E1" />
                  </TouchableOpacity>
                  <View style={styles.createDivider} />
                  <TouchableOpacity style={styles.createOptionBtn} onPress={() => { setShowCreateOptions(false); navigation.navigate('CreateMission', { familyId }); }}>
                      <View style={[styles.createOptionIcon, { backgroundColor: '#DCFCE7' }]}><MaterialCommunityIcons name="plus" size={24} color="#10B981" /></View>
                      <View style={{flex: 1}}><Text style={styles.createOptionTitle}>NOVA MISSÃO</Text><Text style={styles.createOptionSubtitle}>Criar do zero</Text></View>
                      <MaterialCommunityIcons name="chevron-right" size={24} color="#CBD5E1" />
                  </TouchableOpacity>
              </View>
          </View>
      </Modal>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 }, 
  
  // --- ESTILO DO HEADER AJUSTADO ---
  topGreenArea: {
      // backgroundColor: '#34af61', <--- REMOVIDO
      paddingTop: 50,
      paddingBottom: 30, 
      borderBottomLeftRadius: 35,
      borderBottomRightRadius: 35,
      zIndex: 10,
      shadowColor: "#000", shadowOffset: { width: 2, height: 4 }, shadowOpacity: 0.5, shadowRadius: 5, elevation: 8
  },
  
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 15 },
  headerTitle: { fontFamily: FONTS.bold, fontSize: 16, color: '#FFF', letterSpacing: 0.5 },
  backBtn: { padding: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 14 },
  filterContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 25 },
  filterLabel: { fontFamily: FONTS.regular, fontSize: 15, color: '#E0F2F1' },
  filterButton: { 
      flexDirection: 'row', alignItems: 'center', 
      backgroundColor: '#FFF', 
      paddingHorizontal: 12, paddingVertical: 6, 
      borderRadius: 20, gap: 5,
      shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 3, elevation: 4 
  },
  filterText: { fontFamily: FONTS.bold, fontSize: 12, color: COLORS.primary },
  contentContainer: { 
      flex: 1, marginTop: -25, borderTopLeftRadius: 30, borderTopRightRadius: 30, overflow: 'hidden', paddingTop: 10,
  },
  tabsWrapper: { marginBottom: 5, marginTop: 30 },
  tabItem: { 
      flexDirection: 'row', alignItems: 'center', 
      paddingHorizontal: 14, paddingVertical: 8, marginRight: 10, 
      borderRadius: 24, borderWidth: 1,
      shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 3
  },
  tabText: { fontFamily: FONTS.bold, fontSize: 11, marginLeft: 6 },
  sectionDivider: { height: 1, backgroundColor: '#E2E8F0', marginHorizontal: 20, marginBottom: 20 },
  listContent: { paddingHorizontal: 20, paddingBottom: 100 },
  cardWrapper: { marginBottom: 15, borderRadius: 24, position: 'relative' },
  cardShadow: {
      position: 'absolute', top: 4, left: 0, width: '100%', height: '100%',
      backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: 24
  },
  cardFront: { 
      backgroundColor: '#FFF', borderRadius: 24, 
      borderWidth: 2, 
      padding: 16, overflow: 'hidden' 
  },
  iconBox: { width: 48, height: 48, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  cardTitle: { fontFamily: FONTS.bold, fontSize: 16, color: '#1E293B', flex: 1 },
  tagBase: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1 },
  tagText: { fontFamily: FONTS.bold, fontSize: 10, marginLeft: 4 },
  treasureBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-start', marginLeft: 60, marginBottom: 10 },
  treasureGold: { backgroundColor: '#F59E0B' },
  treasurePurple: { backgroundColor: '#8B5CF6' },
  treasureText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },
  divider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 12 },
  metaInfoContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  metaTag: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  metaText: { fontSize: 10, fontWeight: 'bold', marginLeft: 4 },
  cardActions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginTop: 15, gap: 15 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, padding: 4 },
  actionText: { fontFamily: FONTS.bold, fontSize: 12, color: '#64748B' },
  emptyState: { alignItems: 'center', marginTop: 60, opacity: 0.8 },
  emptyTitle: { fontFamily: FONTS.bold, color: '#64748B', fontSize: 18, marginTop: 15 },
  emptySub: { fontFamily: FONTS.regular, color: '#94A3B8', fontSize: 14, marginTop: 5 },
  fab: { position: 'absolute', bottom: 30, right: 20, borderRadius: 30, shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 8 },
  fabInner: { width: 60, height: 60, borderRadius: 30, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { width: '100%', backgroundColor: '#FFF', borderRadius: 24, padding: 20, borderWidth: 1, borderColor: COLORS.primary },
  modalTitle: { fontFamily: FONTS.bold, fontSize: 16, color: COLORS.primary, marginBottom: 15, textAlign: 'center' },
  modalOption: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  modalOptionText: { fontFamily: FONTS.bold, fontSize: 14, color: '#334155' },
  closeModalBtn: { marginTop: 15, padding: 12, backgroundColor: '#F1F5F9', borderRadius: 14, alignItems: 'center' },
  closeModalText: { fontFamily: FONTS.bold, color: '#64748B' },
  createOptionsContainer: { position: 'absolute', bottom: 30, width: '100%', backgroundColor: '#FFF', borderRadius: 24, padding: 20, borderWidth: 1, borderColor: COLORS.primary },
  createHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  createOptionsTitle: { fontFamily: FONTS.bold, fontSize: 14, color: '#94A3B8' },
  createOptionBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  createOptionIcon: { width: 48, height: 48, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  createOptionTitle: { fontFamily: FONTS.bold, fontSize: 16, color: '#1E293B' },
  createOptionSubtitle: { fontFamily: FONTS.regular, fontSize: 12, color: '#94A3B8' },
  createDivider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 5 },
});