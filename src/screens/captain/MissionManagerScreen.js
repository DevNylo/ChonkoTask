import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { COLORS, FONTS } from '../../styles/theme';

const STATUS_TABS = [
    { id: 'active', label: 'ATIVAS', icon: 'clipboard-play-outline', color: '#10B981' }, 
    { id: 'completed', label: 'FEITAS', icon: 'check-circle-outline', color: '#3B82F6' }, 
    { id: 'expired', label: 'PERDIDAS', icon: 'clock-alert-outline', color: '#F59E0B' }, 
    { id: 'archived', label: 'LIXEIRA', icon: 'trash-can-outline', color: '#EF4444' }, 
];

const WEEKDAYS = [
    { id: 0, label: 'DOM' }, { id: 1, label: 'SEG' }, { id: 2, label: 'TER' }, 
    { id: 3, label: 'QUA' }, { id: 4, label: 'QUI' }, { id: 5, label: 'SEX' }, { id: 6, label: 'SÁB' }
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
  const [showCreateOptions, setShowCreateOptions] = useState(false);

  useFocusEffect(
    useCallback(() => {
        const runRoutine = async () => {
            setLoading(true);
            await processRecurringMissions();
            await checkExpiredMissions();
            await fetchData();
            setLoading(false);
        };
        runRoutine();
    }, [activeStatus]) 
  );

  const processRecurringMissions = async () => {
      const todayIndex = new Date().getDay(); 
      const todayStart = new Date();
      todayStart.setHours(0,0,0,0);
      const todayISO = todayStart.toISOString();

      try {
          const { data: recurringMissions } = await supabase
              .from('missions')
              .select('id, recurrence_days, status')
              .eq('family_id', familyId)
              .eq('is_recurring', true)
              .neq('status', 'archived');

          if (!recurringMissions || recurringMissions.length === 0) return;

          const toActive = [];
          const toSleep = [];

          for (const m of recurringMissions) {
              const isScheduledForToday = m.recurrence_days && m.recurrence_days.includes(todayIndex);

              if (!isScheduledForToday) {
                  if (m.status !== 'expired') toSleep.push(m.id);
              } else {
                  const { count } = await supabase
                      .from('mission_attempts')
                      .select('*', { count: 'exact', head: true })
                      .eq('mission_id', m.id)
                      .gte('created_at', todayISO);

                  if (count === 0 && m.status !== 'active') {
                      toActive.push(m.id);
                  }
              }
          }

          if (toActive.length > 0) await supabase.from('missions').update({ status: 'active' }).in('id', toActive);
          if (toSleep.length > 0) await supabase.from('missions').update({ status: 'expired' }).in('id', toSleep);

      } catch (error) { console.log("Erro Recorrência:", error); }
  };

  const checkExpiredMissions = async () => {
      const { data: activeMissions } = await supabase
        .from('missions')
        .select('id, deadline')
        .eq('family_id', familyId)
        .eq('status', 'active')
        .eq('is_recurring', false)
        .not('deadline', 'is', null);

      if (!activeMissions || activeMissions.length === 0) return;

      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      const expiredIds = [];

      activeMissions.forEach(m => {
          const [h, min] = m.deadline.split(':').map(Number);
          const deadlineMinutes = h * 60 + min;
          if (deadlineMinutes < currentMinutes) {
              expiredIds.push(m.id);
          }
      });

      if (expiredIds.length > 0) {
          await supabase.from('missions').update({ status: 'expired' }).in('id', expiredIds);
      }
  };

  const fetchData = async () => {
      const { data: profilesData } = await supabase
        .from('profiles').select('id, name').eq('family_id', familyId).neq('role', 'captain');
      setProfiles(profilesData || []);

      const { data: missionsData } = await supabase
        .from('missions')
        .select('*')
        .eq('family_id', familyId)
        .eq('status', activeStatus)
        .eq('is_template', false) 
        .order('created_at', { ascending: false });
      
      setMissions(missionsData || []);
  };

  const filteredMissions = missions.filter(m => {
      if (!filterAssignee) return true;
      return m.assigned_to === filterAssignee;
  });

  const handleDelete = (id) => {
      Alert.alert("Arquivar", "Mover para canceladas?", [
          { text: "Não" },
          { text: "Sim", style: 'destructive', onPress: async () => {
              await supabase.from('missions').update({ status: 'archived' }).eq('id', id);
              fetchData();
          }}
      ]);
  };

  const getDayLabels = (days) => {
      if (!days || days.length === 0) return "";
      if (days.length === 7) return "Todos os dias";
      return days.map(id => WEEKDAYS.find(d => d.id === id)?.label.substring(0,3)).join(", ");
  };

  const renderMissionCard = ({ item }) => {
      const isCustom = item.reward_type === 'custom';
      const assigneeName = item.assigned_to 
        ? (profiles.find(p => p.id === item.assigned_to)?.name || 'Recruta') 
        : 'TODOS';
      
      const isCompleted = item.status === 'completed';
      const isInactive = item.status === 'expired' || item.status === 'archived'; 
      
      let cardBg, iconColor, titleColor, tagBg, tagBorder, tagText;

      // Mantemos a borda fixa verde escura, mas mudamos o conteúdo interno
      if (isCompleted) {
          cardBg = '#F0FDF4'; iconColor = '#16A34A'; titleColor = '#14532D'; tagBg = '#DCFCE7'; tagBorder = '#86EFAC'; tagText = '#15803D';
      } else if (isInactive) {
          cardBg = '#F9FAFB'; iconColor = '#9CA3AF'; titleColor = '#9CA3AF'; tagBg = '#F3F4F6'; tagBorder = '#E5E7EB'; tagText = '#9CA3AF';
      } else {
          cardBg = '#FFF'; iconColor = COLORS.primary; titleColor = '#1E293B'; tagBg = isCustom ? '#FDF2F8' : '#FFFBEB'; tagBorder = isCustom ? '#DB2777' : '#F59E0B'; tagText = isCustom ? '#DB2777' : '#B45309';
      }

      return (
        <View style={styles.cardWrapper}>
            {/* Sombra Suave Atrás */}
            <View style={styles.cardShadow} />

            {/* Card Frontal com Borda Verde Escura 1px */}
            <View style={[styles.cardFront, { backgroundColor: cardBg }]}>
                
                <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 10}}>
                    <View style={[styles.iconBox, isInactive ? {backgroundColor: '#E5E7EB'} : (isCompleted ? {backgroundColor: '#DCFCE7'} : {backgroundColor: '#F0FDF4'})]}>
                        <MaterialCommunityIcons name={isCompleted ? "check-decagram" : item.icon} size={28} color={iconColor} />
                    </View>
                    <View style={{flex:1}}>
                        <Text style={[styles.cardTitle, {color: titleColor}]}>{item.title}</Text>
                        <View style={{flexDirection: 'row', marginTop: 4}}>
                            <View style={[styles.tagBase, { backgroundColor: tagBg, borderColor: tagBorder }]}>
                                <MaterialCommunityIcons name={isCustom ? "gift" : "circle-multiple"} size={10} color={tagText} />
                                <Text style={[styles.tagText, { color: tagText }]}>
                                    {isCustom ? (item.custom_reward || "Prêmio") : `+${item.reward}`}
                                </Text>
                            </View>
                        </View>
                    </View>
                </View>

                <View style={styles.divider} />

                <View style={styles.metaInfoContainer}>
                    <View style={[styles.metaTag, isInactive ? {borderColor:'#E5E7EB', backgroundColor:'#F3F4F6'} : (isCompleted ? {backgroundColor:'#F0FDF4', borderColor: '#BBF7D0'} : { backgroundColor: item.is_recurring ? '#FFF7ED' : '#FEF2F2', borderColor: item.is_recurring ? '#F97316' : '#EF4444' })]}>
                        <MaterialCommunityIcons name={item.is_recurring ? "calendar-sync" : "calendar-check"} size={12} color={isInactive ? '#9CA3AF' : (isCompleted ? '#16A34A' : (item.is_recurring ? '#EA580C' : '#B91C1C'))} />
                        <Text style={[styles.metaText, { color: isInactive ? '#9CA3AF' : (isCompleted ? '#16A34A' : (item.is_recurring ? '#EA580C' : '#B91C1C')) }]}>
                            {item.is_recurring ? "Diária" : "Única"}
                        </Text>
                    </View>

                    {(item.start_time || item.deadline) && (
                        <View style={[styles.metaTag, isInactive ? {borderColor:'#E5E7EB', backgroundColor:'#F3F4F6'} : (isCompleted ? {backgroundColor:'#EFF6FF', borderColor: '#BFDBFE'} : { backgroundColor: '#EFF6FF', borderColor: '#3B82F6' })]}>
                            <MaterialCommunityIcons name="clock-outline" size={12} color={isInactive ? '#9CA3AF' : (isCompleted ? '#3B82F6' : "#2563EB")} />
                            <Text style={[styles.metaText, { color: isInactive ? '#9CA3AF' : (isCompleted ? '#3B82F6' : '#2563EB') }]}>
                                {item.start_time ? item.start_time.substring(0,5) : "00:00"} - {item.deadline ? item.deadline.substring(0,5) : "00:00"}
                            </Text>
                        </View>
                    )}

                    <View style={[styles.metaTag, isInactive ? {borderColor:'#E5E7EB', backgroundColor:'#F3F4F6'} : (isCompleted ? {backgroundColor:'#F0FDF4', borderColor: '#BBF7D0'} : { backgroundColor: '#F0FDF4', borderColor: '#16A34A' })]}>
                        <MaterialCommunityIcons name={item.assigned_to ? "account" : "account-group"} size={12} color={isInactive ? '#9CA3AF' : "#15803D"} />
                        <Text style={[styles.metaText, { color: isInactive ? '#9CA3AF' : '#15803D' }]}>{assigneeName}</Text>
                    </View>
                </View>

                {item.is_recurring && item.recurrence_days && (
                    <Text style={[styles.daysText, isInactive && {color: '#9CA3AF'}]}>
                        <MaterialCommunityIcons name="calendar-range" size={12} /> {getDayLabels(item.recurrence_days)}
                    </Text>
                )}

                {activeStatus === 'active' && (
                    <View style={styles.cardActions}>
                        <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('CreateMission', { familyId, missionToEdit: item })}>
                            <MaterialCommunityIcons name="pencil-outline" size={18} color={COLORS.primary} />
                            <Text style={styles.actionText}>Editar</Text>
                        </TouchableOpacity>
                        <View style={{width: 1, height: 16, backgroundColor: '#E5E7EB'}} />
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
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      {/* HEADER VERDE ESCURO (COLORS.primary) */}
      <View style={styles.topGreenArea}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                <MaterialCommunityIcons name="arrow-left" size={24} color={COLORS.primary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>GERENCIAR MISSÕES</Text>
            <View style={{width: 40}} /> 
          </View>

          {/* Filtro com Borda Verde */}
          <View style={styles.filterContainer}>
             <Text style={styles.filterLabel}>Visualizando de:</Text>
             <TouchableOpacity style={styles.filterButton} onPress={() => setShowFilterModal(true)}>
                 <Text style={styles.filterText}>{filterName}</Text>
                 <MaterialCommunityIcons name="chevron-down" size={20} color={COLORS.textPrimary} />
             </TouchableOpacity>
          </View>
      </View>

      {/* CONTEÚDO */}
      <View style={styles.contentContainer}>
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
                                // Se ativo: Fundo colorido e Borda da Cor
                                // Se inativo: Fundo Branco e Borda Verde Escura 1px (Padrão Chonko)
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

          <FlatList 
            data={filteredMissions} 
            keyExtractor={item => item.id} 
            renderItem={renderMissionCard}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
                <View style={styles.emptyState}>
                    {loading ? <ActivityIndicator color={COLORS.primary} /> : (
                        <>
                            <MaterialCommunityIcons name="clipboard-text-off-outline" size={60} color="#CBD5E1" />
                            <Text style={styles.emptyTitle}>
                                {activeStatus === 'active' ? "Tudo limpo por aqui!" : "Nada nesta lista"}
                            </Text>
                            <Text style={styles.emptySub}>
                                {activeStatus === 'active' ? "Crie novas missões para a tropa." : ""}
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

      {/* MODAL FILTRO */}
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

      {/* MODAL CRIAÇÃO */}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F9FF' },
  
  // --- HEADER VERDE ESCURO (COLORS.primary) ---
  topGreenArea: {
      backgroundColor: COLORS.primary, // #064E3B
      paddingTop: 50,
      paddingBottom: 20,
      borderBottomLeftRadius: 35,
      borderBottomRightRadius: 35,
      zIndex: 10,
      shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 5, elevation: 5
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 15 },
  headerTitle: { fontFamily: FONTS.bold, fontSize: 16, color: '#D1FAE5', letterSpacing: 0.5 },
  backBtn: { padding: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 14 },
  
  filterContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 25 },
  filterLabel: { fontFamily: FONTS.regular, fontSize: 12, color: '#D1FAE5' },
  
  // FILTRO: Borda Verde 1px
  filterButton: { 
      flexDirection: 'row', alignItems: 'center', 
      backgroundColor: '#FFF', 
      paddingHorizontal: 12, paddingVertical: 6, 
      borderRadius: 20, gap: 5,
      borderWidth: 1, borderColor: COLORS.primary // <--- AQUI
  },
  filterText: { fontFamily: FONTS.bold, fontSize: 12, color: COLORS.primary },

  // --- CONTEÚDO ---
  contentContainer: { flex: 1 },
  tabsWrapper: { marginBottom: 5 },
  
  // ABAS: Borda Verde 1px
  tabItem: { 
      flexDirection: 'row', alignItems: 'center', 
      paddingHorizontal: 14, paddingVertical: 8, marginRight: 10, 
      borderRadius: 24, 
      borderWidth: 1, // <--- AQUI
      // borderColor definida dinamicamente
  },
  tabText: { fontFamily: FONTS.bold, fontSize: 11, marginLeft: 6 },
  
  listContent: { paddingHorizontal: 20, paddingBottom: 100 },

  // --- CARDS (Borda Verde Escuro 1px) ---
  cardWrapper: { 
      marginBottom: 15, borderRadius: 24, position: 'relative'
  },
  cardShadow: {
      position: 'absolute', top: 6, left: 0, width: '100%', height: '100%',
      backgroundColor: COLORS.shadow, borderRadius: 24, opacity: 0.05
  },
  cardFront: { 
      backgroundColor: '#FFF', 
      borderRadius: 24, 
      borderWidth: 1, borderColor: COLORS.primary, // <--- AQUI: Borda Verde Escuro
      padding: 16, overflow: 'hidden' 
  },
  
  iconBox: { width: 48, height: 48, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  cardTitle: { fontFamily: FONTS.bold, fontSize: 16, color: '#1E293B' },
  
  tagBase: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, borderWidth: 1 },
  tagText: { fontFamily: FONTS.bold, fontSize: 11, marginLeft: 4 },
  
  divider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 12 },
  
  metaInfoContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  metaTag: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  metaText: { fontSize: 10, fontWeight: 'bold', marginLeft: 4 },
  daysText: { fontSize: 11, color: '#64748B', marginTop: 10, marginLeft: 2 },
  
  cardActions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginTop: 15, gap: 15 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, padding: 4 },
  actionText: { fontFamily: FONTS.bold, fontSize: 12, color: '#64748B' },

  // --- EMPTY STATE ---
  emptyState: { alignItems: 'center', marginTop: 60, opacity: 0.8 },
  emptyTitle: { fontFamily: FONTS.bold, color: '#64748B', fontSize: 18, marginTop: 15 },
  emptySub: { fontFamily: FONTS.regular, color: '#94A3B8', fontSize: 14, marginTop: 5 },

  // --- FAB ---
  fab: { position: 'absolute', bottom: 30, right: 20, borderRadius: 30, shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 8 },
  fabInner: { width: 60, height: 60, borderRadius: 30, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },

  // --- MODALS (Borda Verde Escuro 1px) ---
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { 
      width: '100%', backgroundColor: '#FFF', borderRadius: 24, padding: 20,
      borderWidth: 1, borderColor: COLORS.primary // <--- AQUI
  },
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