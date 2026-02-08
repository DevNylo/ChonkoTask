import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { COLORS, FONTS } from '../../styles/theme';

const STATUS_TABS = [
    { id: 'active', label: 'ATIVAS', icon: 'clipboard-play-outline' },
    { id: 'completed', label: 'CONCLUÍDAS', icon: 'check-circle-outline' },
    { id: 'expired', label: 'NÃO FEITAS', icon: 'clock-alert-outline' },
    { id: 'archived', label: 'CANCELADAS', icon: 'trash-can-outline' },
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

  // --- CICLO DE VIDA ---
  // Roda toda vez que a tela ganha foco ou a aba muda
  useFocusEffect(
    useCallback(() => {
        const runRoutine = async () => {
            setLoading(true);
            await processRecurringMissions(); // 1. Acorda/Adormece missões recorrentes
            await checkExpiredMissions();     // 2. Verifica horários das missões únicas
            await fetchData();                // 3. Carrega a lista atualizada
            setLoading(false);
        };
        runRoutine();
    }, [activeStatus]) 
  );

  // --- ROBÔ 1: GERENCIAR RECORRÊNCIA (DIÁRIAS) ---
  const processRecurringMissions = async () => {
      const todayIndex = new Date().getDay(); 
      const todayStart = new Date();
      todayStart.setHours(0,0,0,0);
      const todayISO = todayStart.toISOString();

      try {
          // Busca todas as missões recorrentes da família (exceto as excluídas)
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
                  // Se não é dia, ela deve "dormir" (expired) para sair da lista de ativas
                  if (m.status !== 'expired') toSleep.push(m.id);
              } else {
                  // É dia! Verificamos se já foi feita HOJE
                  const { count } = await supabase
                      .from('mission_attempts')
                      .select('*', { count: 'exact', head: true })
                      .eq('mission_id', m.id)
                      .gte('created_at', todayISO);

                  if (count === 0 && m.status !== 'active') {
                      // Ninguém fez hoje e ela não está ativa -> ACORDAR!
                      toActive.push(m.id);
                  }
                  // Se count > 0, deixamos ela como está (completed ou pending)
              }
          }

          if (toActive.length > 0) await supabase.from('missions').update({ status: 'active' }).in('id', toActive);
          if (toSleep.length > 0) await supabase.from('missions').update({ status: 'expired' }).in('id', toSleep);

      } catch (error) { console.log("Erro Recorrência:", error); }
  };

  // --- ROBÔ 2: GERENCIAR EXPIRAÇÃO (HORÁRIO DE TAREFAS ÚNICAS) ---
  const checkExpiredMissions = async () => {
      // Busca apenas missões ÚNICAS e ATIVAS que tenham horário limite
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

  // --- BUSCA DE DADOS ---
  const fetchData = async () => {
      // Busca perfis para o filtro
      const { data: profilesData } = await supabase
        .from('profiles').select('id, name').eq('family_id', familyId).neq('role', 'captain');
      setProfiles(profilesData || []);

      // Busca missões da aba atual (NUNCA TRAZ TEMPLATES)
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

  // --- RENDERIZAÇÃO DO CARD ---
  const renderMissionCard = ({ item }) => {
      const isCustom = item.reward_type === 'custom';
      const assigneeName = item.assigned_to 
        ? (profiles.find(p => p.id === item.assigned_to)?.name || 'Recruta') 
        : 'TODOS';
      
      const isExpired = item.status === 'expired';

      return (
        <View style={styles.cardWrapper}>
            <View style={[styles.cardShadow, isExpired && {backgroundColor: '#ccc'}]} />
            <View style={[styles.cardFront, isExpired && {borderColor: '#999', backgroundColor: '#f0f0f0'}]}>
                
                {/* Header do Card */}
                <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 10}}>
                    <View style={[styles.iconBox, isExpired && {backgroundColor: '#ddd', borderColor: '#999'}]}>
                        <MaterialCommunityIcons name={item.icon} size={28} color={isExpired ? '#999' : COLORS.primary} />
                    </View>
                    <View style={{flex:1}}>
                        <Text style={[styles.cardTitle, isExpired && {color: '#999'}]}>{item.title}</Text>
                        <View style={{flexDirection: 'row', marginTop: 4}}>
                            <View style={[styles.tagBase, { backgroundColor: isExpired ? '#eee' : (isCustom ? '#fdf2f8' : '#fffbeb'), borderColor: isExpired ? '#ccc' : (isCustom ? '#db2777' : COLORS.gold) }]}>
                                <MaterialCommunityIcons name={isCustom ? "gift" : "star"} size={10} color={isExpired ? '#999' : (isCustom ? '#db2777' : COLORS.gold)} />
                                <Text style={[styles.tagText, { color: isExpired ? '#999' : (isCustom ? '#db2777' : '#b45309') }]}>
                                    {isCustom ? item.custom_reward : item.reward}
                                </Text>
                            </View>
                        </View>
                    </View>
                </View>

                <View style={styles.divider} />

                {/* Informações detalhadas (Rich Info) */}
                <View style={styles.metaInfoContainer}>
                    {/* Tag Recorrência */}
                    <View style={[styles.metaTag, isExpired ? {borderColor:'#999', backgroundColor:'#eee'} : { backgroundColor: item.is_recurring ? '#fff7ed' : '#fee2e2', borderColor: item.is_recurring ? '#f97316' : '#ef4444' }]}>
                        <MaterialCommunityIcons name={item.is_recurring ? "calendar-sync" : "calendar-check"} size={12} color={isExpired ? '#999' : (item.is_recurring ? '#ea580c' : '#b91c1c')} />
                        <Text style={[styles.metaText, { color: isExpired ? '#999' : (item.is_recurring ? '#ea580c' : '#b91c1c') }]}>
                            {item.is_recurring ? "Diária" : "Única"}
                        </Text>
                    </View>

                    {/* Tag Horário */}
                    {(item.start_time || item.deadline) && (
                        <View style={[styles.metaTag, isExpired ? {borderColor:'#999', backgroundColor:'#eee'} : { backgroundColor: '#eff6ff', borderColor: '#3b82f6' }]}>
                            <MaterialCommunityIcons name="clock-outline" size={12} color={isExpired ? '#999' : "#2563eb"} />
                            <Text style={[styles.metaText, { color: isExpired ? '#999' : '#2563eb' }]}>
                                {item.start_time ? item.start_time.substring(0,5) : "00:00"} - {item.deadline ? item.deadline.substring(0,5) : "00:00"}
                            </Text>
                        </View>
                    )}

                    {/* Tag Atribuído */}
                    <View style={[styles.metaTag, isExpired ? {borderColor:'#999', backgroundColor:'#eee'} : { backgroundColor: '#f0fdf4', borderColor: '#16a34a' }]}>
                        <MaterialCommunityIcons name={item.assigned_to ? "account" : "account-group"} size={12} color={isExpired ? '#999' : "#15803d"} />
                        <Text style={[styles.metaText, { color: isExpired ? '#999' : '#15803d' }]}>{assigneeName}</Text>
                    </View>
                </View>

                {/* Dias da semana (se recorrente) */}
                {item.is_recurring && item.recurrence_days && (
                    <Text style={styles.daysText}>
                        <MaterialCommunityIcons name="calendar-range" size={12} /> {getDayLabels(item.recurrence_days)}
                    </Text>
                )}

                {/* Ações (Editar/Cancelar) */}
                {activeStatus !== 'archived' && !isExpired && (
                    <View style={styles.cardActions}>
                        <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('CreateMission', { familyId, missionToEdit: item })}>
                            <MaterialCommunityIcons name="pencil" size={18} color={COLORS.primary} />
                            <Text style={styles.actionText}>Editar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.actionBtn} onPress={() => handleDelete(item.id)}>
                            <MaterialCommunityIcons name="close-circle-outline" size={18} color={COLORS.error} />
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
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <MaterialCommunityIcons name="arrow-left" size={28} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>GERENCIAR MISSÕES</Text>
        <View style={{width: 28}} /> 
      </View>

      {/* Filtro Dropdown */}
      <View style={styles.filterSection}>
          <Text style={styles.sectionLabel}>VISUALIZANDO MISSÕES DE:</Text>
          <TouchableOpacity style={styles.dropdownButton} onPress={() => setShowFilterModal(true)} activeOpacity={0.8}>
              <Text style={styles.dropdownText} numberOfLines={1}>{filterName}</Text>
              <MaterialCommunityIcons name="chevron-down" size={24} color={COLORS.primary} />
          </TouchableOpacity>
      </View>

      {/* Abas */}
      <View style={styles.tabsContainer}>
          <FlatList 
            data={STATUS_TABS} horizontal showsHorizontalScrollIndicator={false}
            keyExtractor={item => item.id} contentContainerStyle={{ paddingHorizontal: 20 }}
            renderItem={({ item }) => {
                const isActive = activeStatus === item.id;
                return (
                    <TouchableOpacity 
                        style={[styles.tabItem, { backgroundColor: isActive ? COLORS.primary : COLORS.surface, borderColor: COLORS.primary }]}
                        onPress={() => setActiveStatus(item.id)}
                    >
                        <MaterialCommunityIcons name={item.icon} size={18} color={isActive ? COLORS.white : COLORS.primary} />
                        <Text style={[styles.tabText, { color: isActive ? COLORS.white : COLORS.primary }]}>{item.label}</Text>
                    </TouchableOpacity>
                )
            }}
          />
      </View>
      <View style={styles.tabsDivider} />

      {/* Lista */}
      <FlatList 
        data={filteredMissions} keyExtractor={item => item.id} renderItem={renderMissionCard}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
            <View style={styles.emptyState}>
                {loading ? <ActivityIndicator color={COLORS.primary} /> : (
                    <>
                        <MaterialCommunityIcons name="clipboard-text-off-outline" size={50} color={COLORS.primary} style={{opacity:0.3}} />
                        <Text style={styles.emptyText}>Nenhuma missão aqui.</Text>
                    </>
                )}
            </View>
        }
      />

      {/* FAB */}
      <TouchableOpacity style={styles.fab} activeOpacity={0.8} onPress={() => setShowCreateOptions(true)}>
        <View style={styles.fabShadow} />
        <View style={styles.fabFront}>
             <MaterialCommunityIcons name="plus" size={40} color={COLORS.white} />
        </View>
      </TouchableOpacity>

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
                  <Text style={styles.createOptionsTitle}>O QUE VAMOS LANÇAR?</Text>
                  <TouchableOpacity style={styles.createOptionBtn} onPress={() => { setShowCreateOptions(false); navigation.navigate('QuickMissions', { familyId }); }}>
                      <View style={[styles.createOptionIcon, { backgroundColor: COLORS.gold, borderColor: COLORS.primary }]}><MaterialCommunityIcons name="flash" size={24} color={COLORS.white} /></View>
                      <View style={{flex: 1}}><Text style={styles.createOptionTitle}>MISSÃO RÁPIDA</Text><Text style={styles.createOptionSubtitle}>Usar um modelo salvo</Text></View>
                      <MaterialCommunityIcons name="chevron-right" size={24} color={COLORS.primary} />
                  </TouchableOpacity>
                  <View style={styles.divider} />
                  <TouchableOpacity style={styles.createOptionBtn} onPress={() => { setShowCreateOptions(false); navigation.navigate('CreateMission', { familyId }); }}>
                      <View style={[styles.createOptionIcon, { backgroundColor: COLORS.secondary, borderColor: COLORS.primary }]}><MaterialCommunityIcons name="plus" size={24} color={COLORS.white} /></View>
                      <View style={{flex: 1}}><Text style={styles.createOptionTitle}>NOVA MISSÃO</Text><Text style={styles.createOptionSubtitle}>Criar do zero</Text></View>
                      <MaterialCommunityIcons name="chevron-right" size={24} color={COLORS.primary} />
                  </TouchableOpacity>
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
  filterSection: { paddingHorizontal: 20, marginBottom: 15 },
  sectionLabel: { fontFamily: FONTS.bold, fontSize: 10, color: COLORS.surface, marginBottom: 5, opacity: 0.9 },
  dropdownButton: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: COLORS.surface, paddingHorizontal: 15, paddingVertical: 10, borderRadius: 12, borderWidth: 2, borderColor: COLORS.primary, elevation: 2 },
  dropdownText: { fontFamily: FONTS.bold, fontSize: 14, color: COLORS.primary },
  tabsContainer: { marginBottom: 10, height: 45 },
  tabItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, paddingVertical: 8, marginRight: 10, borderRadius: 20, borderWidth: 2 },
  tabText: { fontFamily: FONTS.bold, fontSize: 12, marginLeft: 6 },
  tabsDivider: { height: 2, backgroundColor: 'rgba(255,255,255,0.2)', marginHorizontal: 20, marginBottom: 10, borderRadius: 1 },
  listContent: { padding: 20, paddingBottom: 100 },
  
  cardWrapper: { marginBottom: 15, position: 'relative' },
  cardShadow: { position: 'absolute', top: 6, left: 6, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 20 },
  cardFront: { backgroundColor: COLORS.surface, borderRadius: 20, borderWidth: 3, borderColor: COLORS.primary, padding: 15 },
  iconBox: { width: 45, height: 45, backgroundColor: COLORS.surfaceAlt, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12, borderWidth: 2, borderColor: COLORS.primary },
  cardTitle: { fontFamily: FONTS.bold, fontSize: 16, color: COLORS.textPrimary },
  tagBase: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, borderWidth: 1 },
  tagText: { fontFamily: FONTS.bold, fontSize: 10, marginLeft: 4 },
  divider: { height: 2, backgroundColor: COLORS.surfaceAlt, marginVertical: 10 },
  
  metaInfoContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  metaTag: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1 },
  metaText: { fontSize: 10, fontWeight: 'bold', marginLeft: 4 },
  daysText: { fontSize: 11, color: '#666', marginTop: 8, fontStyle: 'italic' },
  
  cardActions: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#eee' },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  actionText: { fontFamily: FONTS.bold, fontSize: 12, color: COLORS.primary },
  
  emptyState: { alignItems: 'center', marginTop: 50 },
  emptyText: { fontFamily: FONTS.bold, color: COLORS.surface, fontSize: 16, marginTop: 10, opacity: 0.8 },
  fab: { position: 'absolute', bottom: 30, right: 20, width: 64, height: 64 },
  fabShadow: { position: 'absolute', top: 5, left: 0, width: '100%', height: '100%', backgroundColor: COLORS.shadow, borderRadius: 20 },
  fabFront: { width: '100%', height: '100%', backgroundColor: COLORS.gold, borderRadius: 20, borderWidth: 3, borderColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', marginTop: -2 },
  
  modalOverlay: { flex: 1, backgroundColor: COLORS.modalOverlay, justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { width: '100%', backgroundColor: COLORS.surface, borderRadius: 24, padding: 20, borderWidth: 3, borderColor: COLORS.primary, elevation: 10 },
  modalTitle: { fontFamily: FONTS.bold, fontSize: 18, color: COLORS.primary, marginBottom: 15, textAlign: 'center' },
  modalOption: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#eee' },
  modalOptionText: { fontFamily: FONTS.bold, fontSize: 16, color: COLORS.primary },
  closeModalBtn: { marginTop: 15, padding: 12, backgroundColor: '#eee', borderRadius: 10, alignItems: 'center' },
  closeModalText: { fontFamily: FONTS.bold, color: '#666' },
  createOptionsContainer: { position: 'absolute', bottom: 100, right: 20, width: 300, backgroundColor: COLORS.surface, borderRadius: 20, padding: 20, borderWidth: 3, borderColor: COLORS.primary, elevation: 10 },
  createOptionsTitle: { fontFamily: FONTS.bold, fontSize: 14, color: COLORS.placeholder, marginBottom: 15, textAlign: 'center' },
  createOptionBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  createOptionIcon: { width: 45, height: 45, borderRadius: 22.5, justifyContent: 'center', alignItems: 'center', marginRight: 15, borderWidth: 2 },
  createOptionTitle: { fontFamily: FONTS.bold, fontSize: 16, color: COLORS.primary },
  createOptionSubtitle: { fontFamily: FONTS.regular, fontSize: 12, color: COLORS.placeholder },
});