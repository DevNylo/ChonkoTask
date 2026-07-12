import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Modal,
    RefreshControl,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { COLORS, FONTS } from '../../styles/theme';

const DIFFICULTY_CONFIG = {
    'common':    { label: 'FÁCIL',    color: '#10B981', bg: '#ECFDF5' },
    'rare':      { label: 'MÉDIO',    color: '#3B82F6', bg: '#EFF6FF' },
    'epic':      { label: 'DIFÍCIL',  color: '#8B5CF6', bg: '#F5F3FF' },
    'legendary': { label: 'LENDÁRIO', color: '#F59E0B', bg: '#FFFBEB' },
    'custom':    { label: 'MANUAL',   color: '#64748B', bg: '#F8FAFC' }
};

const DIFFICULTY_TIERS = [
    { id: 'common', label: 'FÁCIL' },
    { id: 'rare', label: 'MÉDIO' },
    { id: 'epic', label: 'DIFÍCIL' },
    { id: 'legendary', label: 'LENDÁRIO' },
];

const STATUS_TABS = [
    { id: 'active', label: 'ATIVAS', icon: 'clipboard-play-outline', color: '#10B981' },
    { id: 'completed', label: 'FEITAS', icon: 'check-circle-outline', color: '#3B82F6' },
    { id: 'expired', label: 'PERDIDAS', icon: 'clock-alert-outline', color: '#F59E0B' },
    { id: 'archived', label: 'LIXEIRA', icon: 'trash-can-outline', color: '#EF4444' },
];

export default function MissionManagerScreen() {
    const navigation = useNavigation();
    const route = useRoute();
    const { profile } = useAuth();

    const familyId = route.params?.familyId || profile?.family_id;

    const [activeStatus, setActiveStatus] = useState('active');
    const [profiles, setProfiles] = useState([]);
    const [missions, setMissions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [showCreateOptions, setShowCreateOptions] = useState(false);
    const [showFilterModal, setShowFilterModal] = useState(false);

    const [filterAssignee, setFilterAssignee] = useState(null);
    const [filterRecurrence, setFilterRecurrence] = useState('all');
    const [filterRewardType, setFilterRewardType] = useState('all');
    const [filterDifficulty, setFilterDifficulty] = useState('all');

    const loadScreenData = useCallback(async () => {
        if (!familyId) return;
        setLoading(true);
        try {
            await ensureRecurringActive();
            // A função checkExpiredOneOffMissions() foi removida daqui,
            // pois o CRON Job do banco de dados agora gerencia as expirações nativamente.

            const { data: profilesData } = await supabase
                .from('profiles').select('id, name').eq('family_id', familyId).neq('role', 'admin');
            setProfiles(profilesData || []);

            // Busca as missões no banco com base na aba (excluindo a lixeira caso não estejamos nela)
            let statusFilter = ['active', 'completed', 'expired'];
            if (activeStatus === 'archived') statusFilter = ['archived'];

            const { data: missionsData, error } = await supabase
                .from('missions')
                .select('*')
                .eq('family_id', familyId)
                .in('status', statusFilter)
                .eq('is_template', false)
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Puxa as tentativas do dia para cruzar visualmente as Recorrentes (Inteligência do Frontend)
            const d = new Date();
            const todayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            const bufferDate = new Date();
            bufferDate.setDate(bufferDate.getDate() - 1);
            const fetchBuffer = bufferDate.toISOString();

            const { data: attempts } = await supabase
                .from('mission_attempts')
                .select('mission_id, status, created_at')
                .eq('family_id', familyId)
                .gte('created_at', fetchBuffer);

            const attemptsMap = new Map();
            if (attempts) {
                attempts.forEach(a => {
                    const attemptDate = new Date(a.created_at);
                    const localStr = `${attemptDate.getFullYear()}-${String(attemptDate.getMonth() + 1).padStart(2, '0')}-${String(attemptDate.getDate()).padStart(2, '0')}`;
                    if (localStr === todayStr && (a.status === 'pending' || a.status === 'approved')) {
                        attemptsMap.set(a.mission_id, true);
                    }
                });
            }

            const processedMissions = [];

            (missionsData || []).forEach(m => {
                const doneToday = attemptsMap.has(m.id);
                m.done_today = doneToday;

                if (activeStatus === 'active') {
                    if (m.status === 'active' && !doneToday) processedMissions.push(m);
                }
                else if (activeStatus === 'completed') {
                    if (m.status === 'completed' || (m.status === 'active' && doneToday)) processedMissions.push(m);
                }
                else if (activeStatus === 'expired') {
                    if (m.status === 'expired') processedMissions.push(m);
                }
                else if (activeStatus === 'archived') {
                    if (m.status === 'archived') processedMissions.push(m);
                }
            });

            setMissions(processedMissions);

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

    const filteredMissions = missions.filter(m => {
        let pass = true;
        if (filterAssignee && m.assigned_to !== filterAssignee) pass = false;
        if (filterRecurrence === 'single' && m.is_recurring) pass = false;
        if (filterRecurrence === 'recurring' && !m.is_recurring) pass = false;
        if (filterRewardType !== 'all' && m.reward_type !== filterRewardType) pass = false;
        if (filterDifficulty !== 'all' && m.difficulty !== filterDifficulty) pass = false;
        return pass;
    });

    const activeFiltersCount = [
        filterAssignee !== null,
        filterRecurrence !== 'all',
        filterRewardType !== 'all',
        filterDifficulty !== 'all'
    ].filter(Boolean).length;

    const clearFilters = () => {
        setFilterAssignee(null);
        setFilterRecurrence('all');
        setFilterRewardType('all');
        setFilterDifficulty('all');
        setShowFilterModal(false);
    };

    const handleDelete = (id) => {
        Alert.alert("Arquivar", "Mover para lixeira?", [
            { text: "Não", style: 'cancel' },
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
        const [year, month, day] = dateString.split('-');
        const date = new Date(year, month - 1, day);
        const today = new Date();
        today.setHours(0,0,0,0);

        if (date.getTime() === today.getTime()) return "Hoje";
        return date.toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit'});
    };

    const renderMissionCard = ({ item }) => {
        const isCustom = item.reward_type === 'custom';
        const assigneeName = item.assigned_to
            ? (profiles.find(p => p.id === item.assigned_to)?.name || 'Membro')
            : 'TODOS';

        const isCompleted = activeStatus === 'completed';
        const isInactive = activeStatus === 'expired' || activeStatus === 'archived';

        const diffData = DIFFICULTY_CONFIG[item.difficulty] || DIFFICULTY_CONFIG['custom'];

        let cardBg, iconColor, titleColor, borderColor, iconBgColor;

        if (isCompleted) {
            cardBg = '#F0FDF4'; iconColor = '#16A34A'; titleColor = '#14532D'; borderColor = '#16A34A'; iconBgColor = '#DCFCE7';
        } else if (isInactive) {
            cardBg = '#F9FAFB'; iconColor = '#9CA3AF'; titleColor = '#9CA3AF'; borderColor = '#E5E7EB'; iconBgColor = '#F3F4F6';
        } else {
            cardBg = diffData.bg; iconColor = diffData.color; titleColor = '#1E293B'; borderColor = diffData.color; iconBgColor = diffData.color + '20';
        }

        return (
            <View style={styles.cardWrapper}>
                <View style={[styles.cardShadow, { backgroundColor: isInactive ? 'transparent' : borderColor + '30' }]} />
                <View style={[styles.cardFront, { backgroundColor: cardBg, borderColor: borderColor }]}>

                    <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 10}}>
                        <View style={[styles.iconBox, {backgroundColor: iconBgColor }]}>
                            <MaterialCommunityIcons name={isCompleted ? "check-decagram" : item.icon} size={28} color={iconColor} />
                        </View>

                        <View style={{flex: 1, paddingRight: 10}}>
                            <Text style={[styles.cardTitle, {color: titleColor}]} numberOfLines={2}>{item.title}</Text>
                            {item.difficulty && !isInactive && !isCompleted && (
                                <View style={{flexDirection: 'row', marginTop: 4}}>
                                    <View style={[styles.tagBase, { backgroundColor: '#FFF', borderColor: diffData.color }]}>
                                        <Text style={[styles.tagText, { color: diffData.color }]}>{diffData.label}</Text>
                                    </View>
                                </View>
                            )}
                        </View>

                        <View style={{alignItems: 'flex-end', justifyContent: 'center', maxWidth: '40%'}}>
                            <Text style={{fontFamily: FONTS.bold, fontSize: 10, color: '#94A3B8', marginBottom: 2}}>PRÊMIO</Text>
                            <View style={{flexDirection: 'row', alignItems: 'center'}}>
                                <Text
                                    style={{flexShrink: 1, fontFamily: FONTS.bold, fontSize: isCustom ? 13 : 18, color: isCustom ? '#DB2777' : '#F59E0B', marginRight: 4, textAlign: 'right'}}
                                    numberOfLines={isCustom ? 2 : 1}
                                    ellipsizeMode="tail"
                                >
                                    {isCustom ? (item.custom_reward || "Item") : `+${item.reward}`}
                                </Text>
                                <MaterialCommunityIcons name={isCustom ? "gift" : "circle-multiple"} size={isCustom ? 16 : 18} color={isCustom ? '#DB2777' : '#F59E0B'} />
                            </View>
                        </View>
                    </View>

                    {item.use_critical && !isInactive && (
                        <View style={[styles.treasureBadge, item.critical_type === 'bonus_coins' ? styles.treasureGold : styles.treasurePurple]}>
                            <MaterialCommunityIcons name={item.critical_type === 'bonus_coins' ? "arrow-up-bold-circle" : "gift"} size={14} color="#FFF" style={{marginRight:5}} />
                            <Text style={styles.treasureText}>
                                {item.critical_type === 'bonus_coins' ? `+50% Bônus (${item.critical_chance}%)` : `Item Surpresa (${item.critical_chance}%)`}
                            </Text>
                        </View>
                    )}

                    <View style={[styles.divider, {backgroundColor: borderColor+'30'}]} />

                    <View style={styles.metaInfoContainer}>
                        <View style={{flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, flexWrap: 'wrap'}}>
                            <View style={[styles.metaTag, { backgroundColor: '#FFF', borderColor: isInactive ? '#E2E8F0' : borderColor+'50' }]}>
                                <MaterialCommunityIcons name={item.is_recurring ? "calendar-sync" : "calendar-check"} size={14} color="#64748B" />
                                <Text style={[styles.metaText, {color: '#64748B'}]}>
                                    {item.is_recurring ? (item.recurrence_days ? getDayLabels(item.recurrence_days) : "Diária") : formatDate(item.scheduled_date)}
                                </Text>
                            </View>

                            {(item.start_time || item.deadline) && (
                                <View style={[styles.metaTag, { backgroundColor: '#FFF', borderColor: isInactive ? '#E2E8F0' : borderColor+'50' }]}>
                                    <MaterialCommunityIcons name="clock-outline" size={14} color="#0284C7" />
                                    <Text style={[styles.metaText, {color: '#0284C7'}]}>
                                        {item.start_time ? item.start_time.substring(0,5) : "00:00"} - {item.deadline ? item.deadline.substring(0,5) : "Livre"}
                                    </Text>
                                </View>
                            )}
                        </View>

                        <View style={{flexDirection: 'row', alignItems: 'center', paddingLeft: 10}}>
                            <View style={[styles.avatarMini, {backgroundColor: '#ECFDF5', borderColor: '#10B981'}]}>
                                <MaterialCommunityIcons name="account" size={12} color="#10B981" />
                            </View>
                            <Text style={{fontFamily: FONTS.bold, fontSize: 11, color: '#1E293B', marginLeft: 4}}>{assigneeName}</Text>
                        </View>
                    </View>

                    {activeStatus === 'active' && (
                        <View style={styles.cardActions}>
                            <TouchableOpacity style={[styles.actionBtn, {backgroundColor: '#F1F5F9'}]} onPress={() => navigation.navigate('CreateMission', { familyId, missionToEdit: item })}>
                                <MaterialCommunityIcons name="pencil-outline" size={16} color="#64748B" />
                                <Text style={[styles.actionText, {color: '#64748B'}]}>Editar</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={[styles.actionBtn, {backgroundColor: '#FEF2F2'}]} onPress={() => handleDelete(item.id)}>
                                <MaterialCommunityIcons name="trash-can-outline" size={16} color={COLORS.error} />
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

            <View style={styles.topGreenArea}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.8}>
                        <MaterialCommunityIcons name="arrow-left" size={24} color={'#FFF'} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>GERENCIAR MISSÕES</Text>
                    <View style={{width: 40}} />
                </View>

                <View style={styles.filterBar}>
                    <Text style={styles.filterTitle}>
                        {filteredMissions.length} Tarefa{filteredMissions.length !== 1 && 's'}
                    </Text>
                    <TouchableOpacity style={styles.filterButton} activeOpacity={0.8} onPress={() => setShowFilterModal(true)}>
                        <MaterialCommunityIcons name="filter-variant" size={16} color="#10B981" />
                        <Text style={styles.filterText}>
                            Filtros {activeFiltersCount > 0 ? `(${activeFiltersCount})` : ''}
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>

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
                                    style={[styles.tabItem, isActive ? { backgroundColor: item.color, borderColor: item.color } : { borderColor: '#10B981', backgroundColor: '#FFF' }]}
                                    activeOpacity={0.8}
                                    onPress={() => setActiveStatus(item.id)}
                                >
                                    <MaterialCommunityIcons name={item.icon} size={16} color={isActive ? '#FFF' : '#10B981'} />
                                    <Text style={[styles.tabText, isActive ? { color: '#FFF' } : { color: '#10B981' }]}>{item.label}</Text>
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
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#10B981']} />}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            {loading ? <ActivityIndicator color="#10B981" size="large" /> : (
                                <>
                                    <MaterialCommunityIcons name="clipboard-text-off-outline" size={60} color="#94A3B8" />
                                    <Text style={styles.emptyTitle}>
                                        {activeFiltersCount > 0 ? "Nenhum resultado" : (activeStatus === 'active' ? "Tudo limpo por aqui!" : "Nada nesta lista")}
                                    </Text>
                                    <Text style={styles.emptySub}>
                                        {activeFiltersCount > 0 ? "Tente limpar os filtros para ver mais opções." : "Toque no + para criar novas missões."}
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

            <Modal visible={showFilterModal} transparent={true} animationType="slide" onRequestClose={() => setShowFilterModal(false)}>
                <View style={styles.modalOverlay}>
                    <TouchableOpacity style={{flex: 1, width: '100%'}} onPress={() => setShowFilterModal(false)} />
                    <View style={styles.filterModalContent}>
                        <View style={styles.filterModalHeader}>
                            <Text style={styles.filterModalTitle}>Filtros Avançados</Text>
                            <TouchableOpacity onPress={clearFilters}>
                                <Text style={styles.clearFilterText}>Limpar</Text>
                            </TouchableOpacity>
                        </View>
                        <ScrollView showsVerticalScrollIndicator={false}>

                            <Text style={styles.filterSectionLabel}>MEMBRO</Text>
                            <View style={styles.chipGroup}>
                                <TouchableOpacity style={[styles.filterChip, filterAssignee === null && styles.filterChipActive]} onPress={() => setFilterAssignee(null)}>
                                    <Text style={[styles.filterChipText, filterAssignee === null && styles.filterChipTextActive]}>Todos</Text>
                                </TouchableOpacity>
                                {profiles.map(p => (
                                    <TouchableOpacity key={p.id} style={[styles.filterChip, filterAssignee === p.id && styles.filterChipActive]} onPress={() => setFilterAssignee(p.id)}>
                                        <Text style={[styles.filterChipText, filterAssignee === p.id && styles.filterChipTextActive]}>{p.name}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <Text style={styles.filterSectionLabel}>FREQUÊNCIA</Text>
                            <View style={styles.chipGroup}>
                                <TouchableOpacity style={[styles.filterChip, filterRecurrence === 'all' && styles.filterChipActive]} onPress={() => setFilterRecurrence('all')}>
                                    <Text style={[styles.filterChipText, filterRecurrence === 'all' && styles.filterChipTextActive]}>Todas</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.filterChip, filterRecurrence === 'single' && styles.filterChipActive]} onPress={() => setFilterRecurrence('single')}>
                                    <Text style={[styles.filterChipText, filterRecurrence === 'single' && styles.filterChipTextActive]}>Data Única</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.filterChip, filterRecurrence === 'recurring' && styles.filterChipActive]} onPress={() => setFilterRecurrence('recurring')}>
                                    <Text style={[styles.filterChipText, filterRecurrence === 'recurring' && styles.filterChipTextActive]}>Recorrentes</Text>
                                </TouchableOpacity>
                            </View>

                            <Text style={styles.filterSectionLabel}>TIPO DE PRÊMIO</Text>
                            <View style={styles.chipGroup}>
                                <TouchableOpacity style={[styles.filterChip, filterRewardType === 'all' && styles.filterChipActive]} onPress={() => setFilterRewardType('all')}>
                                    <Text style={[styles.filterChipText, filterRewardType === 'all' && styles.filterChipTextActive]}>Todos</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.filterChip, filterRewardType === 'coins' && styles.filterChipActive]} onPress={() => setFilterRewardType('coins')}>
                                    <Text style={[styles.filterChipText, filterRewardType === 'coins' && styles.filterChipTextActive]}>Moedas</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.filterChip, filterRewardType === 'custom' && styles.filterChipActive]} onPress={() => setFilterRewardType('custom')}>
                                    <Text style={[styles.filterChipText, filterRewardType === 'custom' && styles.filterChipTextActive]}>Item/Manual</Text>
                                </TouchableOpacity>
                            </View>

                            <Text style={styles.filterSectionLabel}>DIFICULDADE</Text>
                            <View style={styles.chipGroup}>
                                <TouchableOpacity style={[styles.filterChip, filterDifficulty === 'all' && styles.filterChipActive]} onPress={() => setFilterDifficulty('all')}>
                                    <Text style={[styles.filterChipText, filterDifficulty === 'all' && styles.filterChipTextActive]}>Todas</Text>
                                </TouchableOpacity>
                                {DIFFICULTY_TIERS.map(tier => (
                                    <TouchableOpacity key={tier.id} style={[styles.filterChip, filterDifficulty === tier.id && styles.filterChipActive]} onPress={() => setFilterDifficulty(tier.id)}>
                                        <Text style={[styles.filterChipText, filterDifficulty === tier.id && styles.filterChipTextActive]}>{tier.label}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <View style={{height: 20}}/>
                        </ScrollView>

                        <TouchableOpacity style={styles.applyFilterBtn} activeOpacity={0.8} onPress={() => setShowFilterModal(false)}>
                            <Text style={styles.applyFilterText}>Ver Resultados</Text>
                        </TouchableOpacity>
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
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FDFCF8' },

    topGreenArea: {
        backgroundColor: '#10B981',
        paddingTop: 60,
        paddingBottom: 25,
        borderBottomLeftRadius: 35,
        borderBottomRightRadius: 35,
        zIndex: 10,
        elevation: 5
    },

    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 15 },
    headerTitle: { fontFamily: FONTS.bold, fontSize: 16, color: '#FFF', letterSpacing: 1 },
    backBtn: { padding: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 14 },

    filterBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 25 },
    filterTitle: { fontFamily: FONTS.bold, fontSize: 14, color: '#D1FAE5' },
    filterButton: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#FFF',
        paddingHorizontal: 12, paddingVertical: 8,
        borderRadius: 20, gap: 6,
        shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 4
    },
    filterText: { fontFamily: FONTS.bold, fontSize: 12, color: '#10B981' },

    contentContainer: { flex: 1, marginTop: -25, overflow: 'hidden', paddingTop: 10 },
    tabsWrapper: { marginBottom: 5, marginTop: 25 },
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
        borderRadius: 24
    },
    cardFront: { backgroundColor: '#FFF', borderRadius: 24, borderWidth: 2, padding: 16, overflow: 'hidden' },
    iconBox: { width: 48, height: 48, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    cardTitle: { fontFamily: FONTS.bold, fontSize: 16, color: '#1E293B', flex: 1 },
    tagBase: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1 },
    tagText: { fontFamily: FONTS.bold, fontSize: 10, marginLeft: 4 },
    treasureBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-start', marginBottom: 10 },
    treasureGold: { backgroundColor: '#F59E0B' },
    treasurePurple: { backgroundColor: '#8B5CF6' },
    treasureText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },
    divider: { height: 1, marginVertical: 12 },

    metaInfoContainer: { flexDirection: 'row', flexWrap: 'nowrap', justifyContent: 'space-between' },
    metaTag: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
    metaText: { fontSize: 10, fontWeight: 'bold', marginLeft: 4 },
    avatarMini: { width: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },

    cardActions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginTop: 15, gap: 10 },
    actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
    actionText: { fontFamily: FONTS.bold, fontSize: 12 },

    emptyState: { alignItems: 'center', marginTop: 60, opacity: 0.8 },
    emptyTitle: { fontFamily: FONTS.bold, color: '#64748B', fontSize: 18, marginTop: 15 },
    emptySub: { fontFamily: FONTS.regular, color: '#94A3B8', fontSize: 14, marginTop: 5 },

    fab: { position: 'absolute', bottom: 30, right: 20, borderRadius: 30, shadowColor: '#10B981', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 8 },
    fabInner: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#10B981', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#FFF' },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    filterModalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, maxHeight: '85%' },
    filterModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    filterModalTitle: { fontFamily: FONTS.bold, fontSize: 18, color: '#1E293B' },
    clearFilterText: { fontFamily: FONTS.bold, fontSize: 14, color: '#EF4444' },
    filterSectionLabel: { fontFamily: FONTS.bold, fontSize: 12, color: '#94A3B8', marginTop: 15, marginBottom: 10 },
    chipGroup: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0' },
    filterChipActive: { backgroundColor: '#ECFDF5', borderColor: '#10B981' },
    filterChipText: { fontFamily: FONTS.bold, fontSize: 12, color: '#64748B' },
    filterChipTextActive: { color: '#10B981' },
    applyFilterBtn: { backgroundColor: '#10B981', paddingVertical: 15, borderRadius: 16, alignItems: 'center', marginTop: 20 },
    applyFilterText: { fontFamily: FONTS.bold, fontSize: 16, color: '#FFF' },

    createOptionsContainer: { position: 'absolute', bottom: 30, width: '90%', alignSelf: 'center', backgroundColor: '#FFF', borderRadius: 24, padding: 20, borderWidth: 1, borderColor: '#10B981', shadowColor: "#000", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 20, elevation: 10 },
    createHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    createOptionsTitle: { fontFamily: FONTS.bold, fontSize: 14, color: '#94A3B8' },
    createOptionBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
    createOptionIcon: { width: 48, height: 48, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
    createOptionTitle: { fontFamily: FONTS.bold, fontSize: 16, color: '#1E293B' },
    createOptionSubtitle: { fontFamily: FONTS.regular, fontSize: 12, color: '#94A3B8' },
    createDivider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 5 },
});