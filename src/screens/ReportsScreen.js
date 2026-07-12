import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    Modal,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { FONTS } from '../styles/theme';

const { width } = Dimensions.get('window');

const DIFFICULTY_CONFIG = {
    'common': { label: 'Fácil', color: '#10B981' },
    'rare': { label: 'Médio', color: '#3B82F6' },
    'epic': { label: 'Difícil', color: '#8B5CF6' },
    'legendary': { label: 'Lendário', color: '#F59E0B' },
    'custom': { label: 'Manual', color: '#64748B' }
};

const normalizeString = (str) => {
    if (!str) return "Desconhecido";
    return str.trim().toLowerCase().replace(/\s+/g, ' ');
};

const capitalizeFirstLetter = (str) => {
    if (!str) return "";
    return str.charAt(0).toUpperCase() + str.slice(1);
};

export default function ReportsScreen() {
    const navigation = useNavigation();
    const route = useRoute();
    const { profile } = useAuth();
    const familyId = route.params?.familyId || profile?.family_id;

    const [loading, setLoading] = useState(true);
    const [profiles, setProfiles] = useState([]);
    const [selectedProfile, setSelectedProfile] = useState(null);
    const [showUserModal, setShowUserModal] = useState(false);

    // Dados Brutos
    const [rawDataAttempts, setRawDataAttempts] = useState([]);
    const [rawDataExpenses, setRawDataExpenses] = useState([]);

    // Dados Processados
    const [summary, setSummary] = useState({ earnings: 0, expenses: 0, totalMissions: 0, missedMissions: 0, successRate: 100, qualityRate: 100 });
    const [weeklyData, setWeeklyData] = useState([]);
    const [topMissions, setTopMissions] = useState([]);
    const [difficultyProfile, setDifficultyProfile] = useState([]);
    const [alertMissions, setAlertMissions] = useState([]);
    const [topRewards, setTopRewards] = useState([]);
    const [heatmap, setHeatmap] = useState({ morning: 0, afternoon: 0, night: 0 });
    const [streaks, setStreaks] = useState({ current: 0, max: 0 });

    useFocusEffect(
        useCallback(() => {
            if (familyId) fetchInitialData();
        }, [familyId])
    );

    useFocusEffect(
        useCallback(() => {
            if (!loading) processStats();
        }, [selectedProfile, rawDataAttempts, rawDataExpenses])
    );

    const fetchInitialData = async () => {
        try {
            setLoading(true);
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            const isoDate = thirtyDaysAgo.toISOString();

            const { data: recruits, error: recruitsError } = await supabase
                .from('profiles')
                .select('id, name, avatar')
                .eq('family_id', familyId)
                .eq('role', 'recruit');

            if (recruitsError) throw recruitsError;
            setProfiles(recruits || []);

            const recruitIds = (recruits || []).map(r => r.id);

            const { data: attempts } = await supabase
                .from('mission_attempts')
                .select('id, created_at, earned_value, profile_id, status, missions(title, difficulty)')
                .in('status', ['approved', 'missed', 'expired', 'rejected'])
                .eq('family_id', familyId)
                .gte('created_at', isoDate);
            setRawDataAttempts(attempts || []);

            if (recruitIds.length > 0) {
                const { data: inventory, error: invError } = await supabase
                    .from('inventory_items')
                    .select('id, purchased_at, profile_id, rewards(title, icon, cost)')
                    .in('profile_id', recruitIds)
                    .gte('purchased_at', isoDate);

                if (invError) throw invError;
                setRawDataExpenses(inventory || []);
            } else {
                setRawDataExpenses([]);
            }

        } catch (error) {
            console.log("Erro relatórios:", error);
        } finally {
            setLoading(false);
        }
    };

    const processStats = () => {
        const filteredAttempts = selectedProfile
            ? rawDataAttempts.filter(a => a.profile_id === selectedProfile.id)
            : rawDataAttempts;

        const filteredExpenses = selectedProfile
            ? rawDataExpenses.filter(e => e.profile_id === selectedProfile.id)
            : rawDataExpenses;

        const approvedAttempts = filteredAttempts.filter(a => a.status === 'approved');
        const missedAttempts = filteredAttempts.filter(a => a.status === 'missed' || a.status === 'expired');
        const rejectedAttempts = filteredAttempts.filter(a => a.status === 'rejected');

        const earnings = approvedAttempts.reduce((acc, curr) => acc + (curr.earned_value || 0), 0);
        const expenses = filteredExpenses.reduce((acc, curr) => acc + (curr.rewards?.cost || 0), 0);

        const totalMissions = approvedAttempts.length;
        const totalMissed = missedAttempts.length;
        const totalRejected = rejectedAttempts.length;

        const totalRegistered = totalMissions + totalMissed;
        const successRate = totalRegistered > 0 ? Math.round((totalMissions / totalRegistered) * 100) : 100;

        const totalEvaluated = totalMissions + totalRejected;
        const qualityRate = totalEvaluated > 0 ? Math.round((totalMissions / totalEvaluated) * 100) : 100;

        const last7Days = Array.from({ length: 7 }, (_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - i);
            return {
                date: d.toISOString().split('T')[0],
                dayName: ['DOM','SEG','TER','QUA','QUI','SEX','SÁB'][d.getDay()],
                count: 0
            };
        }).reverse();

        approvedAttempts.forEach(item => {
            const itemDate = item.created_at.split('T')[0];
            const dayStat = last7Days.find(d => d.date === itemDate);
            if (dayStat) dayStat.count += 1;
        });
        const maxCount = Math.max(...last7Days.map(d => d.count), 1);

        let morning = 0, afternoon = 0, night = 0;
        approvedAttempts.forEach(item => {
            const hour = new Date(item.created_at).getHours();
            if (hour >= 6 && hour < 12) morning++;
            else if (hour >= 12 && hour < 18) afternoon++;
            else night++;
        });
        const totalPeriods = morning + afternoon + night || 1;
        const heatmapData = {
            morning: Math.round((morning / totalPeriods) * 100),
            afternoon: Math.round((afternoon / totalPeriods) * 100),
            night: Math.round((night / totalPeriods) * 100)
        };

        const uniqueDates = [...new Set(approvedAttempts.map(item => item.created_at.split('T')[0]))].sort((a, b) => new Date(b) - new Date(a));

        let currentStreak = 0;
        let maxStreak = 0;

        const todayStr = new Date().toISOString().split('T')[0];
        const yesterdayDate = new Date();
        yesterdayDate.setDate(yesterdayDate.getDate() - 1);
        const yesterdayStr = yesterdayDate.toISOString().split('T')[0];

        if (uniqueDates.length > 0) {
            const ascDates = [...uniqueDates].reverse();
            let tempStreak = 1;
            let bestStreak = 1;
            for (let i = 1; i < ascDates.length; i++) {
                const prev = new Date(ascDates[i - 1]);
                const curr = new Date(ascDates[i]);
                const diffDays = Math.round(Math.abs(curr - prev) / (1000 * 60 * 60 * 24));
                if (diffDays === 1) {
                    tempStreak++;
                } else {
                    if (tempStreak > bestStreak) bestStreak = tempStreak;
                    tempStreak = 1;
                }
            }
            if (tempStreak > bestStreak) bestStreak = tempStreak;
            maxStreak = bestStreak;

            if (uniqueDates[0] === todayStr || uniqueDates[0] === yesterdayStr) {
                currentStreak = 1;
                for (let i = 1; i < uniqueDates.length; i++) {
                    const curr = new Date(uniqueDates[i - 1]);
                    const prev = new Date(uniqueDates[i]);
                    const diffDays = Math.round(Math.abs(curr - prev) / (1000 * 60 * 60 * 24));
                    if (diffDays === 1) {
                        currentStreak++;
                    } else {
                        break;
                    }
                }
            }
        }

        const missionCounts = {};
        approvedAttempts.forEach(item => {
            const normKey = normalizeString(item.missions?.title);
            if (!missionCounts[normKey]) missionCounts[normKey] = 0;
            missionCounts[normKey] += 1;
        });
        const sortedMissions = Object.entries(missionCounts)
            .map(([normKey, count]) => ({ title: capitalizeFirstLetter(normKey), count }))
            .sort((a, b) => b.count - a.count).slice(0, 3);

        const missedCounts = {};
        missedAttempts.forEach(item => {
            const normKey = normalizeString(item.missions?.title);
            if (!missedCounts[normKey]) missedCounts[normKey] = 0;
            missedCounts[normKey] += 1;
        });
        const sortedAlerts = Object.entries(missedCounts)
            .map(([normKey, count]) => ({ title: capitalizeFirstLetter(normKey), count }))
            .sort((a, b) => b.count - a.count).slice(0, 3);

        const diffCounts = { common: 0, rare: 0, epic: 0, legendary: 0, custom: 0 };
        approvedAttempts.forEach(item => {
            const diff = item.missions?.difficulty || 'custom';
            if (diffCounts[diff] !== undefined) diffCounts[diff] += 1;
            else diffCounts['custom'] += 1;
        });
        const diffProfileArray = Object.keys(diffCounts).map(key => ({
            id: key, label: DIFFICULTY_CONFIG[key].label, color: DIFFICULTY_CONFIG[key].color, count: diffCounts[key],
            percentage: totalMissions > 0 ? (diffCounts[key] / totalMissions) * 100 : 0
        })).filter(d => d.count > 0).sort((a, b) => b.count - a.count);

        const rewardCounts = {};
        const rewardIcons = {};
        filteredExpenses.forEach(item => {
            const normKey = normalizeString(item.rewards?.title);
            if (!rewardCounts[normKey]) {
                rewardCounts[normKey] = 0;
                rewardIcons[normKey] = item.rewards?.icon || 'gift-outline';
            }
            rewardCounts[normKey] += 1;
        });
        const sortedRewards = Object.entries(rewardCounts)
            .map(([normKey, count]) => ({ title: capitalizeFirstLetter(normKey), count, icon: rewardIcons[normKey] }))
            .sort((a, b) => b.count - a.count).slice(0, 3);

        setSummary({ totalMissions, missedMissions: totalMissed, earnings, expenses, successRate, qualityRate });
        setWeeklyData(last7Days.map(d => ({ ...d, heightPkg: (d.count / maxCount) * 100 })));
        setTopMissions(sortedMissions);
        setAlertMissions(sortedAlerts);
        setDifficultyProfile(diffProfileArray);
        setTopRewards(sortedRewards);
        setHeatmap(heatmapData);
        setStreaks({ current: currentStreak, max: maxStreak });
    };

    const showInfo = (title, message) => {
        Alert.alert(title, message, [{ text: "Entendi" }]);
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.8}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color={'#FFF'} />
                </TouchableOpacity>

                <Text style={styles.headerTitle}>RELATÓRIOS</Text>

                <TouchableOpacity style={styles.dropdownTrigger} activeOpacity={0.8} onPress={() => setShowUserModal(true)}>
                    <Text style={styles.dropdownText} numberOfLines={1}>
                        {selectedProfile ? selectedProfile.name.toUpperCase() : "TODOS"}
                    </Text>
                    <MaterialCommunityIcons name="chevron-down" size={20} color="#10B981" />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                {loading ? (
                    <View style={{marginTop: 50}}>
                        <ActivityIndicator size="large" color="#10B981" />
                    </View>
                ) : (
                    <>
                        {/* 1. GRID PRINCIPAL (48% para alinhar 2 a 2 perfeitamente) */}
                        <View style={styles.summaryGrid}>
                            <View style={styles.summaryCard}>
                                <View style={[styles.iconCircle, {backgroundColor: '#DCFCE7'}]}>
                                    <MaterialCommunityIcons name="arrow-up-bold" size={24} color="#16A34A" />
                                </View>
                                <Text style={[styles.summaryValue, {color: '#16A34A'}]}>+{summary.earnings}</Text>
                                <TouchableOpacity style={styles.infoLabelRow} onPress={() => showInfo("Ganhos", "Moedas ganhas nos últimos 30 dias.")}>
                                    <Text style={styles.summaryLabel}>Ganhos</Text>
                                    <MaterialCommunityIcons name="information-outline" size={12} color="#64748B" />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.summaryCard}>
                                <View style={[styles.iconCircle, {backgroundColor: '#FEE2E2'}]}>
                                    <MaterialCommunityIcons name="arrow-down-bold" size={24} color="#DC2626" />
                                </View>
                                <Text style={[styles.summaryValue, {color: '#DC2626'}]}>-{summary.expenses}</Text>
                                <TouchableOpacity style={styles.infoLabelRow} onPress={() => showInfo("Gastos", "Moedas gastas na loja nos últimos 30 dias.")}>
                                    <Text style={styles.summaryLabel}>Gastos</Text>
                                    <MaterialCommunityIcons name="information-outline" size={12} color="#64748B" />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.summaryCard}>
                                <View style={[styles.iconCircle, {backgroundColor: '#EFF6FF'}]}>
                                    <MaterialCommunityIcons name="bullseye-arrow" size={24} color="#2563EB" />
                                </View>
                                <Text style={[styles.summaryValue, {color: '#2563EB'}]}>{summary.successRate}%</Text>
                                <TouchableOpacity style={styles.infoLabelRow} onPress={() => showInfo("Taxa de Sucesso", "Compara tarefas feitas com tarefas ignoradas/perdidas.")}>
                                    <Text style={styles.summaryLabel}>Sucesso</Text>
                                    <MaterialCommunityIcons name="information-outline" size={12} color="#64748B" />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.summaryCard}>
                                <View style={[styles.iconCircle, {backgroundColor: '#F5F3FF'}]}>
                                    <MaterialCommunityIcons name="check-decagram" size={24} color="#8B5CF6" />
                                </View>
                                <Text style={[styles.summaryValue, {color: '#8B5CF6'}]}>{summary.qualityRate}%</Text>
                                <TouchableOpacity style={styles.infoLabelRow} onPress={() => showInfo("Taxa de Qualidade", "Mede se as tarefas estão sendo bem feitas de primeira (Aprovadas vs Rejeitadas).")}>
                                    <Text style={styles.summaryLabel}>Qualidade</Text>
                                    <MaterialCommunityIcons name="information-outline" size={12} color="#64748B" />
                                </TouchableOpacity>
                            </View>

                            {/* CONSTÂNCIA (Ocupa a linha inteira) */}
                            <View style={[styles.summaryCard, {width: '100%', flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20}]}>
                                <View style={{flexDirection: 'row', alignItems: 'center', gap: 10}}>
                                    <View style={[styles.iconCircle, {backgroundColor: '#FFFBEB', marginBottom: 0}]}>
                                        <MaterialCommunityIcons name="fire" size={24} color="#F59E0B" />
                                    </View>
                                    <View>
                                        <TouchableOpacity style={{flexDirection: 'row', alignItems: 'center', gap: 4}} onPress={() => showInfo("Constância", "Dias seguidos entregando tarefas.")}>
                                            <Text style={styles.summaryLabel}>Constância (Dias)</Text>
                                            <MaterialCommunityIcons name="information-outline" size={12} color="#64748B" />
                                        </TouchableOpacity>
                                        <Text style={{fontFamily: FONTS.medium, fontSize: 10, color: '#94A3B8', marginTop: 2}}>Recorde Absoluto: {streaks.max}</Text>
                                    </View>
                                </View>
                                <Text style={[styles.summaryValue, {color: '#D97706', fontSize: 24}]}>{streaks.current}</Text>
                            </View>
                        </View>

                        <View style={styles.infoBanner}>
                            <MaterialCommunityIcons name="information" size={20} color="#F59E0B" />
                            <Text style={styles.infoBannerText}>
                                Os dados processam em lotes. Tarefas perdidas hoje podem levar até 1 hora para aparecer aqui.
                            </Text>
                        </View>

                        {/* 2. ATIVIDADE SEMANAL */}
                        <View style={styles.solidCard}>
                            <View style={styles.headerWithInfo}>
                                <View style={styles.sectionHeader}>
                                    <MaterialCommunityIcons name="chart-bar" size={20} color="#10B981" />
                                    <Text style={styles.sectionTitle}>ATIVIDADE (7 DIAS)</Text>
                                </View>
                                <TouchableOpacity onPress={() => showInfo("Atividade", "Volume de tarefas aprovadas em cada dia da última semana.")}>
                                    <MaterialCommunityIcons name="information-outline" size={20} color="#10B981" style={{opacity:0.6}} />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.chartContainer}>
                                {weeklyData.map((day, index) => (
                                    <View key={index} style={styles.barGroup}>
                                        <View style={styles.barTrack}>
                                            <View style={[styles.barFill, { height: `${day.heightPkg}%` }]} />
                                        </View>
                                        <Text style={styles.dayLabel}>{day.dayName.charAt(0)}</Text>
                                    </View>
                                ))}
                            </View>
                        </View>

                        {/* 3. PRODUTIVIDADE */}
                        <View style={styles.solidCard}>
                            <View style={styles.headerWithInfo}>
                                <View style={styles.sectionHeader}>
                                    <MaterialCommunityIcons name="clock-outline" size={20} color="#0EA5E9" />
                                    <Text style={[styles.sectionTitle, {color: '#0EA5E9'}]}>PRODUTIVIDADE</Text>
                                </View>
                                <TouchableOpacity onPress={() => showInfo("Mapa de Horários", "Em qual momento do dia o recruta mais gosta de fazer tarefas.")}>
                                    <MaterialCommunityIcons name="information-outline" size={20} color="#0EA5E9" style={{opacity:0.6}} />
                                </TouchableOpacity>
                            </View>
                            <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
                                <View style={styles.heatBox}>
                                    <MaterialCommunityIcons name="weather-sunset-up" size={24} color="#F59E0B" />
                                    <Text style={styles.heatPercent}>{heatmap.morning}%</Text>
                                    <Text style={styles.heatLabel}>Manhã</Text>
                                </View>
                                <View style={styles.heatBox}>
                                    <MaterialCommunityIcons name="weather-sunny" size={24} color="#F97316" />
                                    <Text style={styles.heatPercent}>{heatmap.afternoon}%</Text>
                                    <Text style={styles.heatLabel}>Tarde</Text>
                                </View>
                                <View style={styles.heatBox}>
                                    <MaterialCommunityIcons name="weather-night" size={24} color="#6366F1" />
                                    <Text style={styles.heatPercent}>{heatmap.night}%</Text>
                                    <Text style={styles.heatLabel}>Noite</Text>
                                </View>
                            </View>
                        </View>

                        {/* 4. O QUE MAIS MOTIVA */}
                        <View style={styles.solidCard}>
                            <View style={styles.headerWithInfo}>
                                <View style={styles.sectionHeader}>
                                    <MaterialCommunityIcons name="shopping" size={20} color="#8B5CF6" />
                                    <Text style={[styles.sectionTitle, {color: '#8B5CF6'}]}>O QUE MAIS MOTIVA</Text>
                                </View>
                                <TouchableOpacity onPress={() => showInfo("O Que Mais Motiva", "Os itens da lojinha que o recruta mais gosta de resgatar. Excelentes ferramentas para negociação na vida real.")}>
                                    <MaterialCommunityIcons name="information-outline" size={20} color="#8B5CF6" style={{opacity:0.6}} />
                                </TouchableOpacity>
                            </View>

                            {topRewards.length === 0 ? (
                                <Text style={styles.emptyText}>Nenhum item foi resgatado na loja ainda.</Text>
                            ) : (
                                topRewards.map((reward, index) => (
                                    <View key={index} style={styles.habitRow}>
                                        <View style={[styles.habitRankCircle, {backgroundColor: '#F3E8FF'}]}>
                                            <MaterialCommunityIcons name={reward.icon} size={16} color="#8B5CF6" />
                                        </View>
                                        <Text style={styles.habitName} numberOfLines={1}>{reward.title}</Text>
                                        <View style={[styles.habitCountBadge, {backgroundColor: '#F5F3FF', borderColor: '#DDD6FE'}]}>
                                            <Text style={[styles.habitCountText, {color: '#7C3AED'}]}>{reward.count}x</Text>
                                        </View>
                                    </View>
                                ))
                            )}
                        </View>

                        {/* 5. SINAIS DE ALERTA */}
                        <View style={styles.solidCard}>
                            <View style={styles.headerWithInfo}>
                                <View style={styles.sectionHeader}>
                                    <MaterialCommunityIcons name="alert-decagram" size={20} color="#EF4444" />
                                    <Text style={[styles.sectionTitle, {color: '#EF4444'}]}>SINAIS DE ALERTA</Text>
                                </View>
                                <TouchableOpacity onPress={() => showInfo("Sinais de Alerta", "As tarefas que mais foram ignoradas ou esquecidas nos últimos 30 dias. Converse com o recruta sobre elas.")}>
                                    <MaterialCommunityIcons name="information-outline" size={20} color="#EF4444" style={{opacity:0.6}} />
                                </TouchableOpacity>
                            </View>

                            {alertMissions.length === 0 ? (
                                <Text style={styles.emptyText}>Tudo em ordem! Nenhuma tarefa sendo ignorada repetidamente.</Text>
                            ) : (
                                alertMissions.map((mission, index) => (
                                    <View key={index} style={styles.habitRow}>
                                        <View style={[styles.habitRankCircle, {backgroundColor: '#FEE2E2'}]}>
                                            <MaterialCommunityIcons name="close" size={16} color="#DC2626" />
                                        </View>
                                        <Text style={styles.habitName} numberOfLines={1}>{mission.title}</Text>
                                        <View style={[styles.habitCountBadge, {backgroundColor: '#FEF2F2', borderColor: '#FECACA'}]}>
                                            <Text style={[styles.habitCountText, {color: '#DC2626'}]}>{mission.count}x falhas</Text>
                                        </View>
                                    </View>
                                ))
                            )}
                        </View>

                        {/* 6. TOP HÁBITOS */}
                        <View style={styles.solidCard}>
                            <View style={styles.headerWithInfo}>
                                <View style={styles.sectionHeader}>
                                    <MaterialCommunityIcons name="star-face" size={20} color="#10B981" />
                                    <Text style={styles.sectionTitle}>TOP HÁBITOS</Text>
                                </View>
                                <TouchableOpacity onPress={() => showInfo("Top Hábitos", "As missões realizadas com maior frequência com sucesso.")}>
                                    <MaterialCommunityIcons name="information-outline" size={20} color="#10B981" style={{opacity:0.6}} />
                                </TouchableOpacity>
                            </View>

                            {topMissions.length === 0 ? (
                                <Text style={styles.emptyText}>Sem dados suficientes na equipe.</Text>
                            ) : (
                                topMissions.map((mission, index) => (
                                    <View key={index} style={styles.habitRow}>
                                        <View style={styles.habitRankCircle}>
                                            <Text style={styles.habitRankText}>{index + 1}</Text>
                                        </View>
                                        <Text style={styles.habitName} numberOfLines={1}>{mission.title}</Text>
                                        <View style={styles.habitCountBadge}>
                                            <Text style={styles.habitCountText}>{mission.count}x</Text>
                                        </View>
                                    </View>
                                ))
                            )}
                        </View>

                        {/* 7. ZONAS DE DESAFIO */}
                        <View style={styles.solidCard}>
                            <View style={styles.headerWithInfo}>
                                <View style={styles.sectionHeader}>
                                    <MaterialCommunityIcons name="sword-cross" size={20} color="#10B981" />
                                    <Text style={styles.sectionTitle}>ZONAS DE DESAFIO</Text>
                                </View>
                                <TouchableOpacity onPress={() => showInfo("Zonas de Desafio", "Mostra o nível de dificuldade das missões que foram concluídas com sucesso. Útil para ver se o recruta está subindo de nível ou preso na zona de conforto.")}>
                                    <MaterialCommunityIcons name="information-outline" size={20} color="#10B981" style={{opacity:0.6}} />
                                </TouchableOpacity>
                            </View>

                            {difficultyProfile.length === 0 ? (
                                <Text style={styles.emptyText}>Sem dados de missões concluídas.</Text>
                            ) : (
                                difficultyProfile.map((diff, index) => (
                                    <View key={index} style={styles.progressRow}>
                                        <View style={styles.progressHeader}>
                                            <Text style={[styles.progressLabel, {color: diff.color}]}>{diff.label}</Text>
                                            <Text style={styles.progressCount}>{diff.count} feitas ({Math.round(diff.percentage)}%)</Text>
                                        </View>
                                        <View style={styles.progressBarBg}>
                                            <View style={[styles.progressBarFill, { width: `${diff.percentage}%`, backgroundColor: diff.color }]} />
                                        </View>
                                    </View>
                                ))
                            )}
                        </View>

                    </>
                )}

            </ScrollView>

            <Modal visible={showUserModal} transparent animationType="fade" onRequestClose={() => setShowUserModal(false)}>
                <TouchableOpacity style={styles.modalOverlay} onPress={() => setShowUserModal(false)} activeOpacity={1}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>FILTRAR RELATÓRIO</Text>
                        <TouchableOpacity style={styles.modalOption} onPress={() => { setSelectedProfile(null); setShowUserModal(false); }}>
                            <Text style={[styles.modalOptionText, !selectedProfile && {color: '#10B981'}]}>TODOS DA EQUIPE</Text>
                            {!selectedProfile && <MaterialCommunityIcons name="check" size={20} color="#10B981" />}
                        </TouchableOpacity>
                        {profiles.map(p => (
                            <TouchableOpacity key={p.id} style={styles.modalOption} onPress={() => { setSelectedProfile(p); setShowUserModal(false); }}>
                                <Text style={[styles.modalOptionText, selectedProfile?.id === p.id && {color: '#10B981'}]}>{p.name}</Text>
                                {selectedProfile?.id === p.id && <MaterialCommunityIcons name="check" size={20} color="#10B981" />}
                            </TouchableOpacity>
                        ))}
                    </View>
                </TouchableOpacity>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FDFCF8' },

    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 20, paddingTop: 60, paddingBottom: 25,
        borderBottomLeftRadius: 35, borderBottomRightRadius: 35,
        backgroundColor: '#10B981',
        zIndex: 10,
        elevation: 5
    },
    headerTitle: { fontFamily: FONTS.bold, fontSize: 16, color: '#FFF', letterSpacing: 1 },
    backBtn: { padding: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 14 },

    dropdownTrigger: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#FFF', paddingHorizontal: 12, paddingVertical: 6,
        borderRadius: 20, gap: 5,
        elevation: 2, maxWidth: 120
    },
    dropdownText: { fontFamily: FONTS.bold, color: '#10B981', fontSize: 10 },

    scrollContent: { padding: 20, paddingBottom: 50 },

    // GRID COM FLEX WRAP (Garante alinhamento)
    summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 5 },

    // ESTILO ORIGINAL DOS CARTÕES MENORES (Com borda forte e sombra)
    summaryCard: {
        width: '48%', height: 110, borderRadius: 20, overflow: 'hidden',
        justifyContent: 'center', alignItems: 'center',
        backgroundColor: '#FFF',
        borderWidth: 2, borderColor: '#E2E8F0', elevation: 2,
        marginBottom: 15
    },
    iconCircle: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
    summaryValue: { fontFamily: FONTS.bold, fontSize: 18 },
    infoLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
    summaryLabel: { fontFamily: FONTS.bold, fontSize: 11, color: '#64748B' },

    infoBanner: {
        flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#FFFBEB',
        padding: 12, borderRadius: 16, borderWidth: 1, borderColor: '#FEF3C7',
        marginBottom: 25, gap: 10
    },
    infoBannerText: { flex: 1, fontFamily: FONTS.medium, fontSize: 11, color: '#D97706', lineHeight: 16 },

    // ESTILO ORIGINAL DOS CARTÕES MAIORES (Borda forte e sombra)
    solidCard: {
        backgroundColor: '#FFF', borderRadius: 24, marginBottom: 25,
        padding: 20, borderWidth: 2, borderColor: '#E2E8F0', elevation: 2
    },
    headerWithInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    sectionTitle: { fontFamily: FONTS.bold, fontSize: 14, color: '#10B981', letterSpacing: 0.5 },

    heatBox: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8FAFC', padding: 15, borderRadius: 16, width: '31%', borderWidth: 1, borderColor: '#E2E8F0' },
    heatPercent: { fontFamily: FONTS.bold, fontSize: 16, color: '#334155', marginTop: 5 },
    heatLabel: { fontFamily: FONTS.bold, fontSize: 10, color: '#94A3B8' },

    progressRow: { marginBottom: 15 },
    progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
    progressLabel: { fontFamily: FONTS.bold, fontSize: 12 },
    progressCount: { fontFamily: FONTS.medium, fontSize: 10, color: '#94A3B8' },
    progressBarBg: { height: 8, backgroundColor: '#F1F5F9', borderRadius: 4, overflow: 'hidden' },
    progressBarFill: { height: '100%', borderRadius: 4 },

    chartContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 150 },
    barGroup: { alignItems: 'center', flex: 1 },
    barTrack: { width: 12, height: '80%', backgroundColor: '#F1F5F9', borderRadius: 6, justifyContent: 'flex-end', overflow: 'hidden' },
    barFill: { width: '100%', backgroundColor: '#10B981', borderRadius: 6, minHeight: 4 },
    dayLabel: { marginTop: 8, fontSize: 10, fontFamily: FONTS.bold, color: '#64748B' },

    habitRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
    habitRankCircle: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#10B981', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    habitRankText: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },
    habitName: { flex: 1, fontFamily: FONTS.bold, fontSize: 14, color: '#334155' },
    habitCountBadge: { backgroundColor: '#ECFDF5', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: '#A7F3D0' },
    habitCountText: { fontSize: 12, fontFamily: FONTS.bold, color: '#059669' },

    emptyText: { textAlign: 'center', color: '#94A3B8', fontFamily: FONTS.medium, marginTop: 10 },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
    modalContent: { width: '100%', backgroundColor: '#FFF', borderRadius: 24, padding: 20, borderWidth: 2, borderColor: '#10B981' },
    modalTitle: { textAlign: 'center', fontFamily: FONTS.bold, color: '#10B981', marginBottom: 15, fontSize: 16 },
    modalOption: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
    modalOptionText: { fontFamily: FONTS.bold, color: '#64748B' },
});