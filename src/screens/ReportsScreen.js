import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { BlurView } from 'expo-blur';
import { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    ImageBackground,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { supabase } from '../lib/supabase'; // Ajuste o caminho conforme sua estrutura
import { COLORS, FONTS } from '../styles/theme';

// Se for o tema verde, certifique-se de usar a imagem certa (ex: GenericBKG4.png)
const BACKGROUND_IMG = require('../../assets/GenericBKG.png'); 
const { width } = Dimensions.get('window');

export default function ReportsScreen() {
    const navigation = useNavigation();
    const route = useRoute();
    const { familyId } = route.params || {};

    const [loading, setLoading] = useState(true);
    const [summary, setSummary] = useState({ totalMissions: 0, totalCoins: 0, approvalRate: 0 });
    const [weeklyData, setWeeklyData] = useState([]);
    const [recruitStats, setRecruitStats] = useState([]);

    useFocusEffect(
        useCallback(() => {
            fetchReportData();
        }, [])
    );

    const fetchReportData = async () => {
        try {
            setLoading(true);

            // 1. Buscar tentativas dos últimos 30 dias
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            const { data: attempts, error } = await supabase
                .from('mission_attempts')
                .select('id, status, created_at, earned_value, profile_id, profiles(name, avatar)')
                .eq('status', 'approved') // Apenas aprovadas contam para estatísticas de sucesso
                .gte('created_at', thirtyDaysAgo.toISOString())
                .order('created_at', { ascending: true });

            if (error) throw error;

            processStats(attempts || []);

        } catch (error) {
            console.log("Erro relatórios:", error);
        } finally {
            setLoading(false);
        }
    };

    const processStats = (data) => {
        // --- A. RESUMO GERAL ---
        const totalMissions = data.length;
        const totalCoins = data.reduce((acc, curr) => acc + (curr.earned_value || 0), 0);
        
        // --- B. GRÁFICO SEMANAL (Customizado) ---
        const last7Days = Array.from({ length: 7 }, (_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - i);
            return { 
                date: d.toISOString().split('T')[0], 
                dayName: ['DOM','SEG','TER','QUA','QUI','SEX','SÁB'][d.getDay()],
                count: 0 
            };
        }).reverse();

        data.forEach(item => {
            const itemDate = item.created_at.split('T')[0];
            const dayStat = last7Days.find(d => d.date === itemDate);
            if (dayStat) dayStat.count += 1;
        });

        // Encontrar o valor máximo para escalar as barras do gráfico
        const maxCount = Math.max(...last7Days.map(d => d.count), 1); // Mínimo 1 para não dividir por zero

        // --- C. POR RECRUTA ---
        const recruitMap = {};
        data.forEach(item => {
            const pid = item.profile_id;
            const name = item.profiles?.name || 'Recruta';
            
            if (!recruitMap[pid]) recruitMap[pid] = { name, count: 0, coins: 0 };
            recruitMap[pid].count += 1;
            recruitMap[pid].coins += (item.earned_value || 0);
        });

        setSummary({ totalMissions, totalCoins, approvalRate: 100 }); // Simplificado
        setWeeklyData(last7Days.map(d => ({ ...d, heightPkg: (d.count / maxCount) * 100 })));
        setRecruitStats(Object.values(recruitMap));
    };

    return (
        // MUDANÇA AQUI: resizeMode="cover" garante que cubra tudo
        <ImageBackground source={BACKGROUND_IMG} style={styles.container} resizeMode="cover">
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

            {/* HEADER */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color={COLORS.primary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>RELATÓRIOS</Text>
                <View style={{width: 40}} /> 
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                
                {/* 1. CARDS DE RESUMO */}
                <View style={styles.summaryRow}>
                    <View style={styles.summaryCard}>
                        <BlurView intensity={50} tint="light" style={StyleSheet.absoluteFill} />
                        <View style={[styles.iconCircle, {backgroundColor: '#D1FAE5'}]}>
                            <MaterialCommunityIcons name="check-all" size={24} color="#059669" />
                        </View>
                        <Text style={styles.summaryValue}>{summary.totalMissions}</Text>
                        <Text style={styles.summaryLabel}>Missões</Text>
                    </View>

                    <View style={styles.summaryCard}>
                        <BlurView intensity={50} tint="light" style={StyleSheet.absoluteFill} />
                        <View style={[styles.iconCircle, {backgroundColor: '#FFF7ED'}]}>
                            <MaterialCommunityIcons name="circle-multiple" size={24} color="#F59E0B" />
                        </View>
                        <Text style={styles.summaryValue}>{summary.totalCoins}</Text>
                        <Text style={styles.summaryLabel}>Moedas</Text>
                    </View>
                </View>

                {/* 2. GRÁFICO SEMANAL (Custom Bar Chart) */}
                <View style={styles.sectionContainer}>
                    <BlurView intensity={60} tint="light" style={StyleSheet.absoluteFill} />
                    <View style={styles.sectionHeader}>
                        <MaterialCommunityIcons name="chart-bar" size={20} color={COLORS.primary} />
                        <Text style={styles.sectionTitle}>ATIVIDADE (7 DIAS)</Text>
                    </View>
                    
                    <View style={styles.chartContainer}>
                        {loading ? <ActivityIndicator color={COLORS.primary} /> : (
                            weeklyData.map((day, index) => (
                                <View key={index} style={styles.barGroup}>
                                    <View style={styles.barTrack}>
                                        <View style={[styles.barFill, { height: `${day.heightPkg}%` }]} />
                                    </View>
                                    <Text style={styles.dayLabel}>{day.dayName}</Text>
                                </View>
                            ))
                        )}
                    </View>
                </View>

                {/* 3. LISTA POR RECRUTA */}
                <View style={styles.sectionContainer}>
                    <BlurView intensity={60} tint="light" style={StyleSheet.absoluteFill} />
                    <View style={styles.sectionHeader}>
                        <MaterialCommunityIcons name="account-group" size={20} color={COLORS.primary} />
                        <Text style={styles.sectionTitle}>DESEMPENHO DO TIME</Text>
                    </View>

                    {recruitStats.length === 0 && !loading ? (
                        <Text style={styles.emptyText}>Sem dados no período.</Text>
                    ) : (
                        recruitStats.map((rec, index) => (
                            <View key={index} style={styles.recruitRow}>
                                <View style={styles.recruitInfo}>
                                    <View style={styles.avatarPlaceholder}>
                                        <Text style={styles.avatarText}>{rec.name.charAt(0)}</Text>
                                    </View>
                                    <Text style={styles.recruitName}>{rec.name}</Text>
                                </View>
                                <View style={styles.recruitStats}>
                                    <View style={styles.statTag}>
                                        <MaterialCommunityIcons name="check" size={12} color="#059669" />
                                        <Text style={styles.statText}>{rec.count}</Text>
                                    </View>
                                    <View style={[styles.statTag, {backgroundColor: '#FFFBEB', borderColor: '#FCD34D'}]}>
                                        <MaterialCommunityIcons name="circle-multiple" size={12} color="#B45309" />
                                        <Text style={[styles.statText, {color: '#B45309'}]}>{rec.coins}</Text>
                                    </View>
                                </View>
                            </View>
                        ))
                    )}
                </View>
            </ScrollView>
        </ImageBackground>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 }, // Flex 1 aqui é essencial
    
    // Header Verde (Padrão)
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 20, paddingTop: 50, paddingBottom: 25,
        backgroundColor: COLORS.primary,
        borderBottomLeftRadius: 35, borderBottomRightRadius: 35,
        zIndex: 10,
        shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 5, elevation: 8
    },
    headerTitle: { fontFamily: FONTS.bold, fontSize: 16, color: '#D1FAE5', letterSpacing: 1 },
    backBtn: { padding: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 14 },

    scrollContent: { padding: 20, paddingBottom: 50 },

    // Summary Cards
    summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
    summaryCard: {
        width: '48%', height: 110, borderRadius: 24, overflow: 'hidden',
        justifyContent: 'center', alignItems: 'center',
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.6)',
        backgroundColor: 'rgba(255,255,255,0.3)'
    },
    iconCircle: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
    summaryValue: { fontFamily: FONTS.bold, fontSize: 22, color: COLORS.textDark },
    summaryLabel: { fontFamily: FONTS.regular, fontSize: 12, color: '#64748B' },

    // Section Container (Vidro)
    sectionContainer: {
        borderRadius: 24, overflow: 'hidden',
        marginBottom: 20,
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)',
        backgroundColor: 'rgba(255,255,255,0.4)',
        padding: 20
    },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, gap: 8 },
    sectionTitle: { fontFamily: FONTS.bold, fontSize: 14, color: COLORS.primary, letterSpacing: 0.5 },

    // Custom Bar Chart
    chartContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 150 },
    barGroup: { alignItems: 'center', flex: 1 },
    barTrack: { width: 12, height: '80%', backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: 6, justifyContent: 'flex-end', overflow: 'hidden' },
    barFill: { width: '100%', backgroundColor: COLORS.secondary, borderRadius: 6, minHeight: 6 }, 
    dayLabel: { marginTop: 8, fontSize: 10, fontFamily: FONTS.bold, color: '#64748B' },

    // Recruit List
    recruitRow: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)'
    },
    recruitInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    avatarPlaceholder: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
    avatarText: { color: '#FFF', fontFamily: FONTS.bold },
    recruitName: { fontFamily: FONTS.bold, fontSize: 14, color: '#334155' },
    
    recruitStats: { flexDirection: 'row', gap: 8 },
    statTag: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: '#ECFDF5', borderWidth: 1, borderColor: '#6EE7B7', gap: 4 },
    statText: { fontSize: 12, fontFamily: FONTS.bold, color: '#047857' },
    emptyText: { textAlign: 'center', color: '#94A3B8', fontStyle: 'italic', marginTop: 10 },
});