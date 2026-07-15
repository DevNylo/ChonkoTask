import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    Dimensions,
    Easing,
    FlatList,
    Platform,
    RefreshControl,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { FONTS } from '../../styles/theme';

import Chonko3D from '../../components/Chonko3D.js';

const { width } = Dimensions.get('window');

// --- EFEITO MÁGICO: NUVENS EM MOVIMENTO NO FUNDO ---
const MovingClouds = () => {
    const cloudAnim = useRef(new Animated.Value(width)).current;

    useEffect(() => {
        Animated.loop(
            Animated.timing(cloudAnim, {
                toValue: -width,
                duration: 35000,
                useNativeDriver: true,
                easing: Easing.linear
            })
        ).start();
    }, []);

    return (
        <View style={StyleSheet.absoluteFillObject}>
            <Animated.View style={[styles.cloudLayer, { transform: [{ translateX: cloudAnim }] }]}>
                <MaterialCommunityIcons name="cloud" size={80} color="rgba(255,255,255,0.4)" style={{ position: 'absolute', top: 40, left: 50 }} />
                <MaterialCommunityIcons name="cloud" size={120} color="rgba(255,255,255,0.2)" style={{ position: 'absolute', top: 10, left: 250 }} />
                <MaterialCommunityIcons name="cloud" size={60} color="rgba(255,255,255,0.3)" style={{ position: 'absolute', top: 100, left: width + 50 }} />
            </Animated.View>
        </View>
    );
};

// MOEDA LIMPA
const AnimatedCoin = ({ size = 24, style = {} }) => {
    return (
        <View style={[styles.coinContainer, { width: size, height: size }, style]}>
            <View style={styles.coinImageFront}>
                <MaterialCommunityIcons name="circle-multiple" size={size} color="#F59E0B" />
            </View>
        </View>
    );
};

// --- CONFIGURAÇÃO DE DIFICULDADE (RPG) ---
const DIFFICULTY_CONFIG = {
    'common':    { label: 'FÁCIL',    color: '#10B981', bg: '#F0FDF4' },
    'rare':      { label: 'MÉDIO',    color: '#3B82F6', bg: '#EFF6FF' },
    'epic':      { label: 'DIFÍCIL',  color: '#8B5CF6', bg: '#F5F3FF' },
    'legendary': { label: 'LENDÁRIO', color: '#F59E0B', bg: '#FFFBEB' },
    'custom':    { label: 'ESPECIAL', color: '#64748B', bg: '#F8FAFC' }
};

export default function RecruitHomeScreen() {
    const navigation = useNavigation();
    const route = useRoute();

    const { profile: initialProfile } = route.params || {};
    const profileId = initialProfile?.id;

    const [profileName, setProfileName] = useState(initialProfile?.name || "Aventureiro");
    const [currentBalance, setCurrentBalance] = useState(0);
    const [currentExperience, setCurrentExperience] = useState(0);
    const [currentStreak, setCurrentStreak] = useState(0);
    const [familyId, setFamilyId] = useState(initialProfile?.family_id);
    const [adminTitle, setAdminTitle] = useState("Responsável");

    const [todoMissions, setTodoMissions] = useState([]);
    const [missedMissions, setMissedMissions] = useState([]);
    const [completedMissions, setCompletedMissions] = useState([]);

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState('todo');

    useFocusEffect(
        useCallback(() => {
            if (profileId) fetchFreshData();
        }, [profileId])
    );

    useEffect(() => {
        if (!profileId) return;
        const channel = supabase.channel('child_dashboard')
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${profileId}` },
                (payload) => {
                    setCurrentBalance(payload.new.balance);
                    setCurrentExperience(payload.new.experience || 0);
                    setCurrentStreak(payload.new.current_streak || 0);
                })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'missions' },
                () => fetchFreshData())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'mission_attempts', filter: `profile_id=eq.${profileId}` },
                () => fetchFreshData())
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [profileId]);

    const fetchFreshData = async () => {
        try {
            const { data: freshProfile } = await supabase
                .from('profiles').select('*').eq('id', profileId).single();

            let currentFamId = familyId;

            if (freshProfile) {
                setProfileName(freshProfile.name);
                setCurrentBalance(freshProfile.balance);
                setCurrentExperience(freshProfile.experience || 0);
                setCurrentStreak(freshProfile.current_streak || 0);
                setFamilyId(freshProfile.family_id);
                currentFamId = freshProfile.family_id;
            }

            if (currentFamId) {
                const { data: admins } = await supabase
                    .from('profiles')
                    .select('title_archetype')
                    .eq('family_id', currentFamId)
                    .eq('role', 'admin');

                if (admins && admins.length > 0) {
                    setAdminTitle(admins[0].title_archetype || "Responsável");
                }
            }

            const { data: activeMissions, error: mError } = await supabase
                .from('missions').select('*')
                .eq('family_id', currentFamId)
                .eq('status', 'active');

            if (mError) throw mError;

            const d = new Date();
            const todayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

            const bufferDate = new Date();
            bufferDate.setDate(bufferDate.getDate() - 2);
            const fetchBuffer = bufferDate.toISOString();

            const { data: attempts } = await supabase
                .from('mission_attempts')
                .select('mission_id, status, admin_feedback, created_at')
                .eq('profile_id', profileId)
                .gte('created_at', fetchBuffer);

            const attemptsMap = new Map();

            if (attempts) {
                attempts.forEach(a => {
                    const attemptDate = new Date(a.created_at);
                    const localStr = `${attemptDate.getFullYear()}-${String(attemptDate.getMonth() + 1).padStart(2, '0')}-${String(attemptDate.getDate()).padStart(2, '0')}`;

                    if (localStr === todayStr) {
                        attemptsMap.set(a.mission_id, { status: a.status, feedback: a.admin_feedback });
                    }
                });
            }

            processMissions(activeMissions || [], attemptsMap, profileId, todayStr);

        } catch (error) {
            // Silenciado
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const processMissions = (missions, attemptsMap, myId, todayStr) => {
        const d = new Date();
        const currentDayIndex = d.getDay();
        const nowMinutes = d.getHours() * 60 + d.getMinutes();

        const listTodo = [];
        const listMissed = [];
        const listCompleted = [];

        missions.forEach(mission => {
            if (mission.assigned_to && mission.assigned_to !== myId) return;

            const attemptData = attemptsMap.get(mission.id);

            if (attemptData?.status === 'pending' || attemptData?.status === 'approved') {
                mission.customAttemptStatus = attemptData.status;
                listCompleted.push(mission);
                return;
            }

            if (attemptData?.status === 'rejected') {
                mission.customAttemptStatus = 'rejected';
                mission.adminFeedback = attemptData.feedback;
            }

            let isToday = false;
            let isPast = false;

            if (mission.is_recurring) {
                if (mission.recurrence_days && Array.isArray(mission.recurrence_days)) {
                    const days = mission.recurrence_days.map(Number);
                    if (days.includes(currentDayIndex)) {
                        isToday = true;
                    }
                }
            } else {
                if (mission.scheduled_date) {
                    if (mission.scheduled_date === todayStr) {
                        isToday = true;
                    } else if (mission.scheduled_date < todayStr) {
                        isPast = true;
                    }
                } else {
                    isToday = true;
                }
            }

            if (isPast) {
                listMissed.push(mission);
                return;
            }

            if (!isToday) return;

            let isExpired = false;
            if (mission.deadline) {
                const [h, m] = mission.deadline.split(':').map(Number);
                if (nowMinutes >= (h * 60 + m)) {
                    isExpired = true;
                }
            }

            if (isExpired) listMissed.push(mission);
            else listTodo.push(mission);
        });

        setTodoMissions(listTodo);
        setMissedMissions(listMissed);
        setCompletedMissions(listCompleted);
    };

    // --- CÁLCULO DE NÍVEL COM LIMITE (MÁXIMO 100) ---
    const calculateLevelInfo = (totalXp) => {
        const XP_PER_LEVEL = 100;
        let level = Math.floor(totalXp / XP_PER_LEVEL) + 1;
        let currentLevelXp = totalXp % XP_PER_LEVEL;
        let xpProgressPercentage = (currentLevelXp / XP_PER_LEVEL) * 100;

        // Limita o nível ao 100
        if (level >= 100) {
            level = 100;
            currentLevelXp = XP_PER_LEVEL; // Mantém a barra visualmente cheia
            xpProgressPercentage = 100;
        }

        return { level, currentLevelXp, XP_PER_LEVEL, xpProgressPercentage };
    };

    const { level, currentLevelXp, XP_PER_LEVEL, xpProgressPercentage } = calculateLevelInfo(currentExperience);

    const handleSwitchProfile = () => {
        navigation.navigate('RoleSelection');
    };

    const renderMissionCard = ({ item, tabType }) => {
        const isCustom = item.reward_type === 'custom';
        const isTodo = tabType === 'todo';
        const isMissed = tabType === 'missed';

        const isPending = item.customAttemptStatus === 'pending';
        const isApproved = item.customAttemptStatus === 'approved';
        const isRejected = item.customAttemptStatus === 'rejected';

        let cardBorderColor, cardBg, iconColor, iconBg, iconName, timeText, diffLabel;

        const baseDiff = DIFFICULTY_CONFIG[item.difficulty] || DIFFICULTY_CONFIG['custom'];

        if (isPending) {
            cardBorderColor = '#F59E0B'; cardBg = '#FFFBEB'; iconColor = '#F59E0B'; iconBg = '#FFF'; iconName = "timer-sand"; timeText = "Em Análise..."; diffLabel = "AGUARDANDO";
        } else if (isApproved) {
            cardBorderColor = '#10B981'; cardBg = '#ECFDF5'; iconColor = '#10B981'; iconBg = '#FFF'; iconName = "check-decagram"; timeText = "Concluída!"; diffLabel = "APROVADA";
        } else if (isMissed) {
            cardBorderColor = '#94A3B8'; cardBg = '#F8FAFC'; iconColor = '#94A3B8'; iconBg = '#FFF'; iconName = "clock-alert-outline"; timeText = `Perdida às ${item.deadline?.slice(0,5) || 'ontem'}`; diffLabel = "EXPIRADA";
        } else if (isRejected) {
            cardBorderColor = '#EF4444'; cardBg = '#FEF2F2'; iconColor = '#EF4444'; iconBg = '#FFF'; iconName = "alert-circle-outline"; timeText = "Precisa refazer!"; diffLabel = "REJEITADA";
        } else {
            cardBorderColor = baseDiff.color; cardBg = '#FFF'; iconColor = baseDiff.color; iconBg = baseDiff.bg; iconName = item.icon || "star-circle"; timeText = item.deadline ? `Tempo limite: ${item.deadline.slice(0,5)}` : "O dia todo"; diffLabel = baseDiff.label;
        }

        return (
            <TouchableOpacity
                style={[
                    styles.questCard,
                    { borderColor: cardBorderColor, backgroundColor: cardBg },
                    isTodo && !isRejected && styles.questCard3D
                ]}
                activeOpacity={isTodo ? 0.8 : 1}
                onPress={() => {
                    if (isPending) Alert.alert("Aguarde!", `Sua missão está sendo verificada pelo ${adminTitle}.`);
                    else if (isApproved) Alert.alert("Muito bem!", "Você já finalizou esta missão hoje.");
                    else if (isMissed) Alert.alert("Poxa...", "O tempo acabou. Fica para a próxima!");
                    else navigation.navigate('MissionDetail', { mission: item, profile: { id: profileId, family_id: familyId } });
                }}
            >
                <View style={styles.questHeader}>
                    <View style={[styles.questBadge, { backgroundColor: cardBorderColor + '1A' }]}>
                        <Text style={[styles.questBadgeText, { color: cardBorderColor }]}>{diffLabel}</Text>
                    </View>

                    {item.use_critical && !isPending && !isApproved && !isMissed && !isRejected && (
                        <View style={[styles.magicBadge, item.critical_type === 'bonus_coins' ? {backgroundColor: '#F59E0B'} : {backgroundColor: '#8B5CF6'}]}>
                            <MaterialCommunityIcons name={item.critical_type === 'bonus_coins' ? "star-shooting" : "gift"} size={12} color="#FFF" style={{marginRight: 4}} />
                            <Text style={styles.magicBadgeText}>MÁGICA ({item.critical_chance}%)</Text>
                        </View>
                    )}
                </View>

                <View style={styles.questBody}>
                    <View style={[styles.questIconBox, { backgroundColor: iconBg, borderColor: cardBorderColor + '40' }]}>
                        <MaterialCommunityIcons name={iconName} size={36} color={iconColor} />
                    </View>

                    <View style={styles.questInfo}>
                        <Text style={[styles.questTitle, isMissed && {textDecorationLine: 'line-through', color: '#94A3B8'}]} numberOfLines={2}>
                            {item.title}
                        </Text>
                        <View style={styles.questTimeRow}>
                            <MaterialCommunityIcons name="clock-outline" size={14} color={isMissed ? '#94A3B8' : (isRejected ? '#EF4444' : '#64748B')} />
                            <Text style={[styles.questTimeText, isMissed && {color: '#94A3B8'}, isRejected && {color: '#EF4444'}]}>{timeText}</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.questFooter}>
                    <View style={styles.questRewardBox}>
                        <Text style={styles.questRewardLabel}>Recompensa</Text>
                        <View style={styles.questRewardValueRow}>
                            {isCustom ? (
                                <MaterialCommunityIcons name="gift" size={18} color="#8B5CF6" style={{marginRight: 4}}/>
                            ) : (
                                <AnimatedCoin size={18} style={{marginRight: 4}}/>
                            )}
                            <Text style={[styles.questRewardAmount, isCustom && {color: '#8B5CF6'}, (isMissed || isPending || isApproved) && {color: '#94A3B8'}]}>
                                {isCustom ? "Item Especial" : `+${item.reward}`}
                            </Text>
                        </View>
                    </View>

                    {isTodo && (
                        <View style={[styles.questActionBtn, { backgroundColor: cardBorderColor }]}>
                            <Text style={styles.questActionBtnText}>{isRejected ? "REFAZER" : "COMEÇAR"}</Text>
                            <MaterialCommunityIcons name="arrow-right-thick" size={16} color="#FFF" style={{marginLeft: 4}} />
                        </View>
                    )}
                </View>

                {isRejected && (
                    <View style={styles.questFeedbackBox}>
                        <MaterialCommunityIcons name="message-alert" size={18} color="#991B1B" />
                        <Text style={styles.questFeedbackText} numberOfLines={3}>
                            <Text style={{fontWeight: 'bold'}}>{adminTitle}: </Text>
                            {item.adminFeedback || "A tarefa precisa ser refeita."}
                        </Text>
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    let currentListData = [];
    let emptyIcon = "shield-star-outline";
    let emptyTextTitle = "Tudo limpo!";
    let emptyTextSub = "Nenhuma missão por enquanto.";

    if (activeTab === 'todo') { currentListData = todoMissions; emptyIcon = "treasure-chest"; emptyTextTitle = "Tudo feito!"; emptyTextSub = "Você arrasou hoje, Aventureiro!"; }
    else if (activeTab === 'missed') { currentListData = missedMissions; emptyIcon = "ghost-outline"; emptyTextTitle = "Uau, nenhuma perdida!"; emptyTextSub = "Ótimo trabalho mantendo o foco!"; }
    else if (activeTab === 'completed') { currentListData = completedMissions; emptyIcon = "sword-cross"; emptyTextTitle = "Lista vazia."; emptyTextSub = "Pegue sua espada e vá fazer as tarefas!"; }

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

            <TouchableOpacity style={styles.devButton} onPress={handleSwitchProfile} activeOpacity={0.8}>
                <MaterialCommunityIcons name="compass-outline" size={26} color="#FFF" />
            </TouchableOpacity>

            <View style={styles.chonkoStage}>
                <View style={styles.skyBackground}>
                    <MovingClouds />

                    <View style={styles.modelPlaceholder}>
                        <Chonko3D />
                    </View>
                </View>

                <View style={styles.hudContainer}>
                    <View style={styles.profileBadge}>
                        <View style={styles.levelCircle}>
                            {/* ÍCONE DE NÍVEL REDUZIDO DE SIZE 56 PARA 48 */}
                            <MaterialCommunityIcons name="decagram" size={48} color="#F59E0B" style={{position: 'absolute'}}/>
                            <Text style={styles.levelNumber}>{level}</Text>
                        </View>
                        <View style={styles.profileInfoArea}>
                            <Text style={styles.playerName}>{profileName}</Text>
                            <View style={styles.xpBarContainer}>
                                <View style={[styles.xpBarFill, { width: `${Math.min(100, Math.max(0, xpProgressPercentage))}%` }]} />
                                <Text style={styles.xpText}>{currentLevelXp}/{XP_PER_LEVEL} XP</Text>
                            </View>
                        </View>
                    </View>

                    <View style={styles.rightStatsArea}>
                        <View style={styles.streakBadge}>
                            <MaterialCommunityIcons name="fire" size={22} color="#EF4444" />
                            <Text style={styles.streakText}>{currentStreak}</Text>
                        </View>

                        <TouchableOpacity style={styles.coinBadge} onPress={fetchFreshData} activeOpacity={0.8}>
                            <AnimatedCoin size={22} style={{ marginRight: 4 }} />
                            <Text style={styles.coinText}>{currentBalance}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>

            <View style={styles.taskSheet}>
                <View style={styles.dragHandle} />

                <View style={styles.tabsContainer}>
                    <TouchableOpacity style={[styles.tab, activeTab === 'todo' && styles.tabActiveTodo]} onPress={() => setActiveTab('todo')}>
                        <MaterialCommunityIcons name="sword" size={18} color={activeTab === 'todo' ? '#FFF' : '#94A3B8'} />
                        <Text style={[styles.tabText, activeTab === 'todo' && {color: '#FFF'}]} numberOfLines={1}>FAZER ({todoMissions.length})</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={[styles.tab, activeTab === 'missed' && styles.tabActiveMissed]} onPress={() => setActiveTab('missed')}>
                        <MaterialCommunityIcons name="skull-outline" size={18} color={activeTab === 'missed' ? '#FFF' : '#94A3B8'} />
                        <Text style={[styles.tabText, activeTab === 'missed' && {color: '#FFF'}]} numberOfLines={1}>PERDIDAS ({missedMissions.length})</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={[styles.tab, activeTab === 'completed' && styles.tabActiveCompleted]} onPress={() => setActiveTab('completed')}>
                        <MaterialCommunityIcons name="check-decagram" size={18} color={activeTab === 'completed' ? '#FFF' : '#94A3B8'} />
                        <Text style={[styles.tabText, activeTab === 'completed' && {color: '#FFF'}]} numberOfLines={1}>FEITAS ({completedMissions.length})</Text>
                    </TouchableOpacity>
                </View>

                {loading ? (<ActivityIndicator color="#0EA5E9" style={{marginTop: 40}} size="large" />) : (
                    <FlatList
                        data={currentListData}
                        keyExtractor={item => item.id}
                        renderItem={({item}) => renderMissionCard({ item, tabType: activeTab })}
                        contentContainerStyle={{ paddingBottom: 160, paddingHorizontal: 5, paddingTop: 10 }}
                        showsVerticalScrollIndicator={false}
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => {setRefreshing(true); fetchFreshData();}} colors={['#0EA5E9']} />}
                        ListEmptyComponent={
                            <View style={styles.emptyContainer}>
                                <MaterialCommunityIcons name={emptyIcon} size={60} color="#CBD5E1" />
                                <Text style={styles.emptyText}>{emptyTextTitle}</Text>
                                <Text style={styles.emptySubText}>{emptyTextSub}</Text>
                            </View>
                        }
                    />
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    coinContainer: { justifyContent: 'center', alignItems: 'center', position: 'relative' },
    coinImageFront: { zIndex: 2 },

    container: { flex: 1, backgroundColor: '#38BDF8' },

    devButton: { position: 'absolute', top: Platform.OS === 'ios' ? 60 : 50, right: 20, backgroundColor: 'rgba(255,255,255,0.2)', width: 44, height: 44, justifyContent: 'center', alignItems: 'center', borderRadius: 22, zIndex: 999, borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)' },

    chonkoStage: { height: '45%', position: 'relative', backgroundColor: '#38BDF8' },
    skyBackground: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#38BDF8', overflow: 'hidden' },
    cloudLayer: { width: width * 2, height: '100%', position: 'absolute', top: 0, left: 0 },

    modelPlaceholder: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 30 },

    hudContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 20, paddingTop: 50, position: 'absolute', width: '100%', zIndex: 10 },

    profileBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.95)', paddingRight: 15, borderRadius: 30, paddingLeft: 4, paddingVertical: 4, borderWidth: 2, borderColor: '#FFF', elevation: 5 },
    levelCircle: { width: 46, height: 46, justifyContent: 'center', alignItems: 'center', zIndex: 2 }, // AJUSTADO
    levelNumber: { color: '#FFF', fontFamily: FONTS.bold, fontSize: 14, zIndex: 3, marginTop: -1 }, // FONTE REDUZIDA

    profileInfoArea: { marginLeft: 2, justifyContent: 'center' },
    playerName: { color: '#1E293B', fontFamily: FONTS.bold, fontSize: 14, marginBottom: 2 },
    xpBarContainer: { width: 90, height: 12, backgroundColor: '#E2E8F0', borderRadius: 8, overflow: 'hidden', position: 'relative', borderWidth: 1, borderColor: '#CBD5E1' },
    xpBarFill: { height: '100%', backgroundColor: '#10B981', borderRadius: 8 },
    xpText: { position: 'absolute', width: '100%', textAlign: 'center', fontSize: 8, color: '#FFF', fontFamily: FONTS.bold, lineHeight: 12, textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: {width: 0, height: 1}, textShadowRadius: 1 },

    rightStatsArea: { flexDirection: 'row', alignItems: 'center', marginRight: 55, gap: 8 },

    streakBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.95)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20, borderWidth: 2, borderColor: '#FFF', elevation: 5 },
    streakText: { color: '#EF4444', fontSize: 16, fontFamily: FONTS.bold, marginLeft: 2 },

    coinBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.95)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 2, borderColor: '#FFF', elevation: 5 },
    coinText: { color: '#B45309', fontSize: 16, fontFamily: FONTS.bold, marginLeft: 2 },

    taskSheet: { flex: 1, backgroundColor: '#FDFCF8', borderTopLeftRadius: 35, borderTopRightRadius: 35, paddingHorizontal: 20, paddingTop: 10, elevation: 20, shadowColor: '#000', shadowOffset: {width: 0, height: -10}, shadowOpacity: 0.1, shadowRadius: 10 },
    dragHandle: { width: 60, height: 6, backgroundColor: '#CBD5E1', borderRadius: 10, alignSelf: 'center', marginBottom: 20, marginTop: 8 },

    tabsContainer: { flexDirection: 'row', backgroundColor: '#F1F5F9', borderRadius: 20, padding: 6, marginBottom: 20, borderWidth: 1, borderColor: '#E2E8F0' },
    tab: { flex: 1, paddingVertical: 10, borderRadius: 16, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 },

    tabActiveTodo: { backgroundColor: '#10B981', elevation: 2, borderRadius: 16 },
    tabActiveMissed: { backgroundColor: '#F59E0B', elevation: 2, borderRadius: 16 },
    tabActiveCompleted: { backgroundColor: '#3B82F6', elevation: 2, borderRadius: 16 },
    tabText: { fontSize: 11, fontFamily: FONTS.bold, color: '#94A3B8' },

    questCard: { borderRadius: 24, borderWidth: 2, padding: 16, marginBottom: 18 },
    questCard3D: { borderBottomWidth: 6, transform: [{ translateY: -2 }] },

    questHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    questBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    questBadgeText: { fontSize: 10, fontFamily: FONTS.bold, textTransform: 'uppercase' },

    magicBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, elevation: 2 },
    magicBadgeText: { fontSize: 9, fontFamily: FONTS.bold, color: '#FFF' },

    questBody: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    questIconBox: { width: 64, height: 64, borderRadius: 18, borderWidth: 2, justifyContent: 'center', alignItems: 'center', marginRight: 15, transform: [{rotate: '-4deg'}] },

    questInfo: { flex: 1 },
    questTitle: { fontSize: 17, fontFamily: FONTS.bold, color: '#1E293B', marginBottom: 6, lineHeight: 22 },
    questTimeRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    questTimeText: { fontSize: 13, fontFamily: FONTS.medium, color: '#64748B' },

    questFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 2, borderTopColor: 'rgba(0,0,0,0.04)', paddingTop: 12 },
    questRewardBox: { justifyContent: 'center' },
    questRewardLabel: { fontSize: 10, fontFamily: FONTS.bold, color: '#94A3B8', marginBottom: 2 },
    questRewardValueRow: { flexDirection: 'row', alignItems: 'center' },
    questRewardAmount: { fontSize: 18, fontFamily: FONTS.bold, color: '#F59E0B' },

    questActionBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 14, borderBottomWidth: 3, borderBottomColor: 'rgba(0,0,0,0.2)' },
    questActionBtnText: { color: '#FFF', fontFamily: FONTS.bold, fontSize: 13 },

    questFeedbackBox: { marginTop: 12, backgroundColor: '#FECACA', padding: 12, borderRadius: 14, flexDirection: 'row', alignItems: 'flex-start', borderWidth: 1, borderColor: '#FCA5A5' },
    questFeedbackText: { fontSize: 12, color: '#991B1B', fontFamily: FONTS.regular, marginLeft: 6, flex: 1, lineHeight: 16 },

    emptyContainer: { alignItems: 'center', marginTop: 50, opacity: 0.8 },
    emptyText: { marginTop: 15, fontSize: 20, fontFamily: FONTS.bold, color: '#1E293B', textAlign: 'center' },
    emptySubText: { marginTop: 5, fontSize: 14, fontFamily: FONTS.regular, color: '#64748B', textAlign: 'center' },
});