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

export default function ReportsScreen() {
    const navigation = useNavigation();
    const route = useRoute();
    const { profile } = useAuth();
    const familyId = route.params?.familyId || profile?.family_id;

    const [loading, setLoading] = useState(true);
    const [profiles, setProfiles] = useState([]);
    const [selectedProfile, setSelectedProfile] = useState(null); // null = Todos
    const [showUserModal, setShowUserModal] = useState(false);

    // Dados Brutos
    const [rawDataAttempts, setRawDataAttempts] = useState([]);
    const [rawDataExpenses, setRawDataExpenses] = useState([]);

    // Dados Processados - AGORA COM MÉTRICAS DE SUCESSO/FALHA
    const [summary, setSummary] = useState({ earnings: 0, expenses: 0, totalMissions: 0, missedMissions: 0, successRate: 100 });
    const [weeklyData, setWeeklyData] = useState([]);
    const [topMissions, setTopMissions] = useState([]);

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

            // 1. Buscar Recrutas
            const { data: recruits } = await supabase
                .from('profiles')
                .select('id, name, avatar')
                .eq('family_id', familyId)
                .eq('role', 'recruit');
            setProfiles(recruits || []);

            // 2. Buscar Tentativas (AGORA INCLUINDO AS FALHAS 'missed' QUE O ROBÔ GERA)
            const { data: attempts } = await supabase
                .from('mission_attempts')
                .select('id, created_at, earned_value, profile_id, status, missions(title)')
                .in('status', ['approved', 'missed', 'expired'])
                .gte('created_at', isoDate);
            setRawDataAttempts(attempts || []);

            // 3. Buscar Saídas (Gastos na loja)
            const { data: requests } = await supabase
                .from('reward_requests')
                .select('id, created_at, cost, profile_id')
                .eq('status', 'approved')
                .gte('created_at', isoDate);
            setRawDataExpenses(requests || []);

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

        // A. Resumo Financeiro & Engajamento
        const approvedAttempts = filteredAttempts.filter(a => a.status === 'approved');
        const missedAttempts = filteredAttempts.filter(a => a.status === 'missed' || a.status === 'expired');

        const earnings = approvedAttempts.reduce((acc, curr) => acc + (curr.earned_value || 0), 0);
        const expenses = filteredExpenses.reduce((acc, curr) => acc + (curr.cost || 0), 0);

        const totalMissions = approvedAttempts.length;
        const totalMissed = missedAttempts.length;

        // Cálculo Inteligente da Taxa de Sucesso
        const totalRegistered = totalMissions + totalMissed;
        const successRate = totalRegistered > 0 ? Math.round((totalMissions / totalRegistered) * 100) : 100;

        // B. Gráfico Semanal (Considerando apenas tarefas Aprovadas)
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

        // C. Top Missões
        const missionCounts = {};
        approvedAttempts.forEach(item => {
            const title = item.missions?.title || "Missão Removida";
            if (!missionCounts[title]) missionCounts[title] = 0;
            missionCounts[title] += 1;
        });

        const sortedMissions = Object.entries(missionCounts)
            .map(([title, count]) => ({ title, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 3);

        setSummary({ totalMissions, missedMissions: totalMissed, earnings, expenses, successRate });
        setWeeklyData(last7Days.map(d => ({ ...d, heightPkg: (d.count / maxCount) * 100 })));
        setTopMissions(sortedMissions);
    };

    const showInfo = (title, message) => {
        Alert.alert(title, message, [{ text: "Entendi" }]);
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

            {/* HEADER SÓLIDO */}
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

                {/* 1. RESUMO FINANCEIRO E ENGAJAMENTO (GRID DE MÉTRICAS) */}
                <View style={styles.summaryGrid}>

                    {/* Ganhos */}
                    <View style={styles.summaryCard}>
                        <View style={[styles.iconCircle, {backgroundColor: '#DCFCE7'}]}>
                            <MaterialCommunityIcons name="arrow-up-bold" size={24} color="#16A34A" />
                        </View>
                        <Text style={[styles.summaryValue, {color: '#16A34A'}]}>+{summary.earnings}</Text>

                        <TouchableOpacity style={styles.infoLabelRow} activeOpacity={0.6} onPress={() => showInfo("Ganhos", "Moedas ganhas completando missões nos últimos 30 dias.")}>
                            <Text style={styles.summaryLabel}>Ganhos</Text>
                            <MaterialCommunityIcons name="information-outline" size={12} color="#64748B" />
                        </TouchableOpacity>
                    </View>

                    {/* Gastos */}
                    <View style={styles.summaryCard}>
                        <View style={[styles.iconCircle, {backgroundColor: '#FEE2E2'}]}>
                            <MaterialCommunityIcons name="arrow-down-bold" size={24} color="#DC2626" />
                        </View>
                        <Text style={[styles.summaryValue, {color: '#DC2626'}]}>-{summary.expenses}</Text>

                        <TouchableOpacity style={styles.infoLabelRow} activeOpacity={0.6} onPress={() => showInfo("Gastos", "Moedas gastas na loja de recompensas nos últimos 30 dias.")}>
                            <Text style={styles.summaryLabel}>Gastos</Text>
                            <MaterialCommunityIcons name="information-outline" size={12} color="#64748B" />
                        </TouchableOpacity>
                    </View>

                    {/* Taxa de Sucesso (Consome as falhas geradas pelo robô) */}
                    <View style={[styles.summaryCard, {width: '100%', flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20}]}>
                        <View style={{flexDirection: 'row', alignItems: 'center', gap: 10}}>
                            <View style={[styles.iconCircle, {backgroundColor: '#EFF6FF', marginBottom: 0}]}>
                                <MaterialCommunityIcons name="bullseye-arrow" size={24} color="#2563EB" />
                            </View>
                            <View>
                                <TouchableOpacity style={{flexDirection: 'row', alignItems: 'center', gap: 4}} activeOpacity={0.6} onPress={() => showInfo("Taxa de Sucesso", "Porcentagem de tarefas realizadas vs. as que foram ignoradas/perdidas.")}>
                                    <Text style={styles.summaryLabel}>Taxa de Sucesso</Text>
                                    <MaterialCommunityIcons name="information-outline" size={12} color="#64748B" />
                                </TouchableOpacity>
                                <Text style={{fontFamily: FONTS.medium, fontSize: 10, color: '#94A3B8'}}>
                                    {summary.totalMissions} Feitas / {summary.missedMissions} Perdidas
                                </Text>
                            </View>
                        </View>
                        <Text style={[styles.summaryValue, {color: '#2563EB', fontSize: 24}]}>{summary.successRate}%</Text>
                    </View>

                </View>

                {/* 2. GRÁFICO SEMANAL */}
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
                        {loading ? <ActivityIndicator color="#10B981" /> : (
                            weeklyData.map((day, index) => (
                                <View key={index} style={styles.barGroup}>
                                    <View style={styles.barTrack}>
                                        <View style={[styles.barFill, { height: `${day.heightPkg}%` }]} />
                                    </View>
                                    <Text style={styles.dayLabel}>{day.dayName.charAt(0)}</Text>
                                </View>
                            ))
                        )}
                    </View>
                </View>

                {/* 3. TOP HÁBITOS */}
                <View style={styles.solidCard}>
                    <View style={styles.headerWithInfo}>
                        <View style={styles.sectionHeader}>
                            <MaterialCommunityIcons name="star-face" size={20} color="#10B981" />
                            <Text style={styles.sectionTitle}>TOP HÁBITOS</Text>
                        </View>
                        <TouchableOpacity onPress={() => showInfo("Top Hábitos", "As 3 missões realizadas com maior frequência nos últimos 30 dias.")}>
                            <MaterialCommunityIcons name="information-outline" size={20} color="#10B981" style={{opacity:0.6}} />
                        </TouchableOpacity>
                    </View>

                    {topMissions.length === 0 && !loading ? (
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

            </ScrollView>

            {/* MODAL DE SELEÇÃO DE USUÁRIO */}
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

    summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 10, marginBottom: 20 },
    summaryCard: {
        width: '48%', height: 110, borderRadius: 20, overflow: 'hidden',
        justifyContent: 'center', alignItems: 'center',
        backgroundColor: '#FFF',
        borderWidth: 2,
        borderColor: '#E2E8F0',
        elevation: 2
    },
    iconCircle: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
    summaryValue: { fontFamily: FONTS.bold, fontSize: 18 },
    infoLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
    summaryLabel: { fontFamily: FONTS.bold, fontSize: 11, color: '#64748B' },

    solidCard: {
        backgroundColor: '#FFF',
        borderRadius: 24,
        marginBottom: 25,
        padding: 20,
        borderWidth: 2,
        borderColor: '#E2E8F0',
        elevation: 2
    },
    headerWithInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    sectionTitle: { fontFamily: FONTS.bold, fontSize: 14, color: '#10B981', letterSpacing: 0.5 },

    chartContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 150 },
    barGroup: { alignItems: 'center', flex: 1 },
    barTrack: { width: 12, height: '80%', backgroundColor: '#F1F5F9', borderRadius: 6, justifyContent: 'flex-end', overflow: 'hidden' },
    barFill: { width: '100%', backgroundColor: '#10B981', borderRadius: 6, minHeight: 4 },
    dayLabel: { marginTop: 8, fontSize: 10, fontFamily: FONTS.bold, color: '#64748B' },

    habitRow: {
        flexDirection: 'row', alignItems: 'center',
        paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9'
    },
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