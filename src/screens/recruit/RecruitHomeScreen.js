import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    Dimensions,
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
import ChonkoCoinIcon from '../../components/icons/ChonkoCoinIcon.js';

const { width } = Dimensions.get('window');

const AnimatedCoin = ({ size = 24, style = {} }) => {
    const glowOpacity = useRef(new Animated.Value(0.1)).current;

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(glowOpacity, { toValue: 0.6, duration: 800, useNativeDriver: true }),
                Animated.timing(glowOpacity, { toValue: 0.2, duration: 800, useNativeDriver: true })
            ])
        ).start();
    }, []);

    return (
        <View style={[styles.coinContainer, { width: size, height: size }, style]}>
            <Animated.View
                style={[
                    styles.coinGlow,
                    { width: size * 1.2, height: size * 1.2, opacity: glowOpacity }
                ]}
            />
            <View style={styles.coinImageFront}>
                <ChonkoCoinIcon width={size} height={size} />
            </View>
        </View>
    );
};

// --- NOVA CONFIGURAÇÃO VISUAL (PADRÃO RPG) ---
const DIFFICULTY_CONFIG = {
    'common':    { label: 'FÁCIL',    color: '#10B981', bg: '#ECFDF5' }, // Verde
    'rare':      { label: 'MÉDIO',    color: '#3B82F6', bg: '#EFF6FF' }, // Azul
    'epic':      { label: 'DIFÍCIL',  color: '#8B5CF6', bg: '#F5F3FF' }, // Roxo
    'legendary': { label: 'LENDÁRIO', color: '#F59E0B', bg: '#FFFBEB' }, // Dourado
    'custom':    { label: 'MANUAL',   color: '#64748B', bg: '#F8FAFC' }  // Cinza
};

export default function RecruitHomeScreen() {
    const navigation = useNavigation();
    const route = useRoute();

    const { profile: initialProfile } = route.params || {};
    const profileId = initialProfile?.id;

    const [profileName, setProfileName] = useState(initialProfile?.name || "Recruta");
    const [currentBalance, setCurrentBalance] = useState(0);
    const [currentExperience, setCurrentExperience] = useState(0);
    const [familyId, setFamilyId] = useState(initialProfile?.family_id);
    const [adminTitle, setAdminTitle] = useState("Admin"); // Novo estado para o título do responsável

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
        const channel = supabase.channel('recruit_dashboard')
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${profileId}` },
                (payload) => {
                    setCurrentBalance(payload.new.balance);
                    setCurrentExperience(payload.new.experience || 0);
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
                setFamilyId(freshProfile.family_id);
                currentFamId = freshProfile.family_id;
            }

            // Busca o título do Admin (Papai, Mamãe, etc)
            if (currentFamId) {
                const { data: admins } = await supabase
                    .from('profiles')
                    .select('title_archetype')
                    .eq('family_id', currentFamId)
                    .eq('role', 'admin');

                if (admins && admins.length > 0) {
                    setAdminTitle(admins[0].title_archetype || "Admin");
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
            console.log("Erro no refresh:", error.message);
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

    const calculateLevelInfo = (totalXp) => {
        const XP_PER_LEVEL = 100;
        const level = Math.floor(totalXp / XP_PER_LEVEL) + 1;
        const currentLevelXp = totalXp % XP_PER_LEVEL;
        const xpProgressPercentage = (currentLevelXp / XP_PER_LEVEL) * 100;

        return { level, currentLevelXp, XP_PER_LEVEL, xpProgressPercentage };
    };

    const { level, currentLevelXp, XP_PER_LEVEL, xpProgressPercentage } = calculateLevelInfo(currentExperience);

    const handleSwitchProfile = () => {
        navigation.navigate('RoleSelection');
    };

    const renderMissionCard = ({ item, tabType }) => {
        const isCustom = item.reward_type === 'custom';
        const isMissed = tabType === 'missed';

        const isPending = item.customAttemptStatus === 'pending';
        const isApproved = item.customAttemptStatus === 'approved';
        const isRejected = item.customAttemptStatus === 'rejected';

        let cardBorderColor, cardBg, iconColor, iconBg, iconName, timeText;

        if (isPending) {
            cardBorderColor = '#F59E0B'; cardBg = '#FFFBEB'; iconColor = '#F59E0B'; iconBg = '#FFF'; iconName = "timer-sand"; timeText = "Em Análise...";
        } else if (isApproved) {
            cardBorderColor = '#10B981'; cardBg = '#ECFDF5'; iconColor = '#10B981'; iconBg = '#FFF'; iconName = "check-decagram"; timeText = "Aprovada!";
        } else if (isMissed) {
            cardBorderColor = '#CBD5E1'; cardBg = '#F8FAFC'; iconColor = '#94A3B8'; iconBg = '#FFF'; iconName = "clock-alert-outline"; timeText = `Perdida às ${item.deadline?.slice(0,5) || 'ontem'}`;
        } else if (isRejected) {
            cardBorderColor = '#EF4444'; cardBg = '#FEF2F2'; iconColor = '#EF4444'; iconBg = '#FFF'; iconName = "alert-circle-outline"; timeText = "Refazer Tarefa!";
        } else {
            const diffData = DIFFICULTY_CONFIG[item.difficulty] || DIFFICULTY_CONFIG['custom'];
            cardBorderColor = diffData.color; cardBg = '#FFF'; iconColor = diffData.color; iconBg = diffData.bg; iconName = item.icon || "star-circle"; timeText = item.deadline ? `Até as ${item.deadline.slice(0,5)}` : "O dia todo";
        }

        return (
            <TouchableOpacity
                style={[
                    styles.card,
                    { borderColor: cardBorderColor, backgroundColor: cardBg },
                    tabType === 'todo' && { shadowColor: cardBorderColor, shadowOpacity: 0.2, shadowRadius: 8, elevation: 5 },
                    isRejected && { flexDirection: 'column', alignItems: 'stretch' }
                ]}
                activeOpacity={tabType === 'todo' ? 0.7 : 1}
                onPress={() => {
                    if (isPending) Alert.alert("Aguarde!", "Sua missão está sendo verificada.");
                    else if (isApproved) Alert.alert("Muito bem!", "Você já finalizou esta missão hoje e ganhou sua recompensa.");
                    else if (isMissed) Alert.alert("Poxa...", "O tempo acabou. Fica para a próxima!");
                    else navigation.navigate('MissionDetail', { mission: item, profile: { id: profileId, family_id: familyId } });
                }}
            >
                <View style={{flexDirection: 'row', alignItems: 'center'}}>
                    <View style={[styles.iconContainer, { backgroundColor: iconBg, borderWidth: 2, borderColor: isPending || isApproved || isMissed || isRejected ? 'transparent' : iconColor + '40' }]}>
                        <MaterialCommunityIcons name={iconName} size={30} color={iconColor} />
                    </View>

                    <View style={styles.cardInfo}>
                        <Text style={[styles.cardTitle, { color: isMissed ? '#94A3B8' : (isRejected ? '#991B1B' : '#1E293B') }, isMissed && styles.textMissed]} numberOfLines={1}>{item.title}</Text>

                        {item.use_critical && !isPending && !isApproved && !isMissed && !isRejected && (
                            <View style={[styles.treasureBadge, item.critical_type === 'bonus_coins' ? styles.treasureGold : styles.treasurePurple]}>
                                <MaterialCommunityIcons name={item.critical_type === 'bonus_coins' ? "arrow-up-bold-circle" : "gift"} size={10} color="#FFF" style={{marginRight:4}} />
                                <Text style={styles.treasureText}>{item.critical_type === 'bonus_coins' ? `+BÔNUS (${item.critical_chance}%)` : `SURPRESA (${item.critical_chance}%)`}</Text>
                            </View>
                        )}

                        <View style={styles.timeBadge}>
                            <MaterialCommunityIcons name={isPending ? "clock-outline" : (isApproved ? "check-all" : (isRejected ? "alert-outline" : "clock-outline"))} size={14} color={isPending ? '#F59E0B' : (isApproved ? '#10B981' : (isMissed ? '#94A3B8' : (isRejected ? '#EF4444' : '#64748B')))} />
                            <Text style={[styles.cardSub, isPending && {color: '#F59E0B'}, isApproved && {color: '#10B981'}, isRejected && {color: '#EF4444', fontFamily: FONTS.bold}]}>{timeText}</Text>
                        </View>
                    </View>

                    <View style={styles.rightColumn}>
                        <View style={[styles.rewardPill, isCustom ? { backgroundColor: '#F3E8FF', borderColor: '#D8B4FE' } : { backgroundColor: '#FFFBEB', borderColor: '#F59E0B' }, (isPending || isApproved || isMissed) && { opacity: 0.5, borderColor: '#E2E8F0', backgroundColor: '#F1F5F9' }]}>

                            {!isCustom && !(isPending || isApproved || isMissed) && (<AnimatedCoin size={16} />)}

                            {isCustom ? (
                                <MaterialCommunityIcons name="gift" size={16} color={(isPending || isApproved || isMissed) ? '#94A3B8' : '#9333EA'} style={{marginRight: 4}} />
                            ) : null}

                            <Text style={[styles.rewardText, { color: isCustom ? '#9333EA' : ((isPending || isApproved || isMissed) ? '#94A3B8' : '#B45309') }]}>
                                {isCustom ? "Item" : `+${item.reward}`}
                            </Text>
                        </View>
                        {tabType === 'todo' && (
                            <View style={[styles.goBtn, { backgroundColor: cardBorderColor }]}>
                                <MaterialCommunityIcons name={isRejected ? "refresh" : "play"} size={16} color="#FFF" />
                            </View>
                        )}
                    </View>
                </View>

                {isRejected && (
                    <View style={styles.feedbackBox}>
                        <MaterialCommunityIcons name="message-alert" size={16} color="#991B1B" />
                        <Text style={styles.feedbackText} numberOfLines={3} ellipsizeMode="tail">
                            <Text style={{fontWeight: 'bold'}}>{adminTitle} diz: </Text>
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

    if (activeTab === 'todo') { currentListData = todoMissions; emptyIcon = "gamepad-variant-outline"; emptyTextTitle = "Tudo feito!"; emptyTextSub = "Você arrasou hoje, Campeão!"; }
    else if (activeTab === 'missed') { currentListData = missedMissions; emptyIcon = "emoticon-happy-outline"; emptyTextTitle = "Uau, nenhuma perdida!"; emptyTextSub = "Ótimo trabalho mantendo o foco!"; }
    else if (activeTab === 'completed') { currentListData = completedMissions; emptyIcon = "sword-cross"; emptyTextTitle = "Lista vazia."; emptyTextSub = "Pegue sua espada e vá fazer as tarefas!"; }

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

            <TouchableOpacity style={styles.devButton} onPress={handleSwitchProfile} activeOpacity={0.8} hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
                <MaterialCommunityIcons name="account-switch" size={24} color="#FFF" />
            </TouchableOpacity>

            <View style={styles.chonkoStage}>
                <View style={styles.skyBackground}>
                    <View style={styles.modelPlaceholder}>
                        <Chonko3D />
                    </View>
                </View>

                <View style={styles.hudContainer}>
                    <View style={styles.profileBadge}>
                        <View style={styles.levelCircle}><Text style={styles.levelNumber}>{level}</Text></View>
                        <View style={styles.profileInfoArea}>
                            <Text style={styles.playerName}>{profileName}</Text>
                            <View style={styles.xpBarContainer}>
                                <View style={[styles.xpBarFill, { width: `${Math.min(100, Math.max(0, xpProgressPercentage))}%` }]} />
                                <Text style={styles.xpText}>{currentLevelXp}/{XP_PER_LEVEL} XP</Text>
                            </View>
                        </View>
                    </View>

                    <TouchableOpacity style={styles.coinBadge} onPress={fetchFreshData} activeOpacity={0.8}>
                        <AnimatedCoin size={26} style={{ marginRight: 6 }} />
                        <Text style={styles.coinText}>{currentBalance}</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.taskSheet}>
                <View style={styles.dragHandle} />

                <View style={styles.tabsContainer}>
                    <TouchableOpacity style={[styles.tab, activeTab === 'todo' && styles.tabActiveTodo]} onPress={() => setActiveTab('todo')}>
                        <MaterialCommunityIcons name="target" size={18} color={activeTab === 'todo' ? '#FFF' : '#94A3B8'} />
                        <Text style={[styles.tabText, activeTab === 'todo' && {color: '#FFF'}]} numberOfLines={1}>FAZER ({todoMissions.length})</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={[styles.tab, activeTab === 'missed' && styles.tabActiveMissed]} onPress={() => setActiveTab('missed')}>
                        <MaterialCommunityIcons name="ghost-outline" size={18} color={activeTab === 'missed' ? '#FFF' : '#94A3B8'} />
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
    coinGlow: { position: 'absolute', backgroundColor: '#FFD700', borderRadius: 50, zIndex: 1, shadowColor: "#FFD700", shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.9, shadowRadius: 10, elevation: 10 },

    container: { flex: 1, backgroundColor: '#38BDF8' },

    devButton: { position: 'absolute', top: Platform.OS === 'ios' ? 60 : 50, right: 20, backgroundColor: '#EF4444', width: 44, height: 44, justifyContent: 'center', alignItems: 'center', borderRadius: 14, zIndex: 999, borderWidth: 2, borderColor: '#FFF', elevation: 5 },

    chonkoStage: { height: '42%', position: 'relative', backgroundColor: '#38BDF8' },
    skyBackground: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#38BDF8' },
    modelPlaceholder: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 10 },

    hudContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 50, position: 'absolute', width: '100%', zIndex: 10 },
    profileBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', paddingRight: 15, borderRadius: 30, paddingLeft: 4, paddingVertical: 4, borderWidth: 2, borderColor: '#E2E8F0', elevation: 5 },
    levelCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#8B5CF6', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff', zIndex: 2 },
    levelNumber: { color: '#fff', fontWeight: '900', fontSize: 20 },
    profileInfoArea: { marginLeft: 10, justifyContent: 'center' },
    playerName: { color: '#1E293B', fontFamily: FONTS.bold, fontSize: 16 },
    xpBarContainer: { width: 100, height: 16, backgroundColor: '#F1F5F9', borderRadius: 8, marginTop: 2, overflow: 'hidden', position: 'relative', borderWidth: 1, borderColor: '#E2E8F0' },
    xpBarFill: { height: '100%', backgroundColor: '#10B981', borderRadius: 8 },
    xpText: { position: 'absolute', width: '100%', textAlign: 'center', fontSize: 10, color: '#334155', fontFamily: FONTS.bold, lineHeight: 16 },

    coinBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 30, borderWidth: 2, borderColor: '#FCD34D', height: 48, elevation: 5, marginRight: 55 },
    coinText: { color: '#B45309', fontSize: 20, fontFamily: FONTS.bold, marginLeft: 4 },

    taskSheet: { flex: 1, backgroundColor: '#FDFCF8', borderTopLeftRadius: 35, borderTopRightRadius: 35, paddingHorizontal: 20, paddingTop: 10, elevation: 20, shadowColor: '#000', shadowOffset: {width: 0, height: -10}, shadowOpacity: 0.1, shadowRadius: 10 },
    dragHandle: { width: 60, height: 6, backgroundColor: '#CBD5E1', borderRadius: 10, alignSelf: 'center', marginBottom: 20, marginTop: 8 },

    tabsContainer: { flexDirection: 'row', backgroundColor: '#F1F5F9', borderRadius: 20, padding: 6, marginBottom: 20, borderWidth: 1, borderColor: '#E2E8F0' },
    tab: { flex: 1, paddingVertical: 10, borderRadius: 16, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 },

    tabActiveTodo: { backgroundColor: '#10B981', elevation: 2, borderRadius: 16 },
    tabActiveMissed: { backgroundColor: '#F59E0B', elevation: 2, borderRadius: 16 },
    tabActiveCompleted: { backgroundColor: '#3B82F6', elevation: 2, borderRadius: 16 },
    tabText: { fontSize: 11, fontFamily: FONTS.bold, color: '#94A3B8' },

    card: { padding: 16, borderRadius: 24, marginBottom: 16, borderWidth: 3, minHeight: 90 },
    iconContainer: { width: 56, height: 56, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
    cardInfo: { flex: 1 },
    cardTitle: { fontSize: 18, fontFamily: FONTS.bold, marginBottom: 6, color: '#1E293B' },
    textMissed: { textDecorationLine: 'line-through', color: '#94A3B8' },
    timeBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    cardSub: { fontSize: 13, color: '#64748B', fontFamily: FONTS.bold },

    rightColumn: { alignItems: 'flex-end', justifyContent: 'center' },
    rewardPill: { flexDirection: 'row', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, borderWidth: 2, marginBottom: 6, minWidth: 60, alignItems: 'center', justifyContent: 'center' },
    rewardText: { fontSize: 14, fontFamily: FONTS.bold },
    goBtn: { width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },

    treasureBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-start', marginBottom: 6 },
    treasureGold: { backgroundColor: '#F59E0B' },
    treasurePurple: { backgroundColor: '#8B5CF6' },
    treasureText: { color: '#FFF', fontSize: 10, fontFamily: FONTS.bold },

    feedbackBox: { marginTop: 12, backgroundColor: '#FECACA', padding: 10, borderRadius: 12, flexDirection: 'row', alignItems: 'flex-start', borderWidth: 1, borderColor: '#FCA5A5' },
    feedbackText: { fontSize: 12, color: '#991B1B', fontFamily: FONTS.regular, marginLeft: 6, flex: 1, lineHeight: 16 },

    emptyContainer: { alignItems: 'center', marginTop: 50, opacity: 0.8 },
    emptyText: { marginTop: 15, fontSize: 20, fontFamily: FONTS.bold, color: '#1E293B', textAlign: 'center' },
    emptySubText: { marginTop: 5, fontSize: 14, fontFamily: FONTS.regular, color: '#64748B', textAlign: 'center' },
});