import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    FlatList,
    RefreshControl,
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

const PODIUM_COLORS = {
    first: { base: '#F59E0B', light: '#FFFBEB', dark: '#B45309', icon: 'crown' },
    second: { base: '#94A3B8', light: '#F8FAFC', dark: '#475569', icon: 'medal' },
    third: { base: '#D97706', light: '#FEF3C7', dark: '#92400E', icon: 'medal-outline' }
};

export default function RankingScreen() {
    const navigation = useNavigation();
    const route = useRoute();
    const { profile } = useAuth();
    const familyId = route.params?.familyId || profile?.family_id;

    const [profiles, setProfiles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [sortBy, setSortBy] = useState('experience');
    const [refreshing, setRefreshing] = useState(false);

    useFocusEffect(
        useCallback(() => {
            if (familyId) fetchRanking();
        }, [sortBy, familyId])
    );

    const fetchRanking = async () => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('id, name, avatar, experience, balance, role, title_archetype')
                .eq('family_id', familyId)
                .eq('role', 'recruit') // Apenas Recrutas
                .order(sortBy, { ascending: false });

            if (error) throw error;
            setProfiles(data || []);
        } catch (error) {
            console.log("Erro ranking:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const renderPodium = () => {
        if (profiles.length < 2) return null; // Só renderiza o Pódio se tiver 2 ou mais pessoas

        const first = profiles[0];
        const second = profiles[1];
        const third = profiles[2];

        return (
            <View style={styles.podiumContainer}>
                {/* 2º LUGAR */}
                <View style={[styles.podiumPlace, { marginTop: 50 }]}>
                    {second && (
                        <>
                            <Text style={styles.podiumName} numberOfLines={1}>{second.name}</Text>
                            <View style={styles.avatarContainer}>
                                <View style={[styles.avatarBorder, { borderColor: PODIUM_COLORS.second.base }]}>
                                    <MaterialCommunityIcons name="account" size={32} color={PODIUM_COLORS.second.base} />
                                </View>
                                <View style={[styles.rankBadge, { backgroundColor: PODIUM_COLORS.second.base }]}>
                                    <Text style={styles.rankText}>2</Text>
                                </View>
                            </View>
                            <View style={[styles.podiumBar, { height: 110, backgroundColor: PODIUM_COLORS.second.light, borderColor: PODIUM_COLORS.second.base }]}>
                                <Text style={[styles.podiumValue, { color: PODIUM_COLORS.second.dark }]}>
                                    {sortBy === 'experience' ? `${second.experience} XP` : second.balance}
                                </Text>
                            </View>
                        </>
                    )}
                </View>

                {/* 1º LUGAR */}
                <View style={[styles.podiumPlace, { zIndex: 10 }]}>
                    {first && (
                        <>
                            <MaterialCommunityIcons name={PODIUM_COLORS.first.icon} size={36} color={PODIUM_COLORS.first.base} style={{ marginBottom: -8, zIndex: 10, textShadowColor: 'rgba(245, 158, 11, 0.4)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 4 }} />
                            <Text style={[styles.podiumName, { fontSize: 16, color: PODIUM_COLORS.first.dark }]} numberOfLines={1}>{first.name}</Text>
                            <View style={[styles.avatarContainer, { transform: [{ scale: 1.15 }] }]}>
                                <View style={[styles.avatarBorder, { borderColor: PODIUM_COLORS.first.base, borderWidth: 3 }]}>
                                    <MaterialCommunityIcons name="account" size={34} color={PODIUM_COLORS.first.base} />
                                </View>
                                <View style={[styles.rankBadge, { backgroundColor: PODIUM_COLORS.first.base, transform: [{ scale: 1.1 }] }]}>
                                    <Text style={styles.rankText}>1</Text>
                                </View>
                            </View>
                            <View style={[styles.podiumBar, { height: 160, backgroundColor: PODIUM_COLORS.first.light, borderColor: PODIUM_COLORS.first.base, shadowColor: PODIUM_COLORS.first.base, shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.15, shadowRadius: 10, elevation: 5 }]}>
                                <Text style={[styles.podiumValue, { color: PODIUM_COLORS.first.dark, fontSize: 16 }]}>
                                    {sortBy === 'experience' ? `${first.experience} XP` : first.balance}
                                </Text>
                            </View>
                        </>
                    )}
                </View>

                {/* 3º LUGAR */}
                <View style={[styles.podiumPlace, { marginTop: 80 }]}>
                    {third && (
                        <>
                            <Text style={styles.podiumName} numberOfLines={1}>{third.name}</Text>
                            <View style={styles.avatarContainer}>
                                <View style={[styles.avatarBorder, { borderColor: PODIUM_COLORS.third.base }]}>
                                    <MaterialCommunityIcons name="account" size={32} color={PODIUM_COLORS.third.base} />
                                </View>
                                <View style={[styles.rankBadge, { backgroundColor: PODIUM_COLORS.third.base }]}>
                                    <Text style={styles.rankText}>3</Text>
                                </View>
                            </View>
                            <View style={[styles.podiumBar, { height: 80, backgroundColor: PODIUM_COLORS.third.light, borderColor: PODIUM_COLORS.third.base }]}>
                                <Text style={[styles.podiumValue, { color: PODIUM_COLORS.third.dark }]}>
                                    {sortBy === 'experience' ? `${third.experience} XP` : third.balance}
                                </Text>
                            </View>
                        </>
                    )}
                </View>
            </View>
        );
    };

    const renderListItem = ({ item, index }) => {
        if (index < 3) return null;

        return (
            <View style={styles.rankRow}>
                <View style={styles.rankPosition}>
                    <Text style={styles.positionText}>{index + 1}º</Text>
                </View>
                <View style={styles.rankAvatar}>
                    <MaterialCommunityIcons name="account" size={24} color="#10B981" />
                </View>
                <View style={{flex: 1}}>
                    <Text style={styles.rankName} numberOfLines={1}>{item.name}</Text>
                    {item.title_archetype && (
                        <Text style={styles.rankArchetype}>{item.title_archetype}</Text>
                    )}
                </View>
                <View style={styles.rankValueBox}>
                    <Text style={[styles.rankValue, { color: sortBy === 'experience' ? '#10B981' : '#F59E0B' }]}>
                        {sortBy === 'experience' ? `${item.experience} XP` : item.balance}
                    </Text>
                    <MaterialCommunityIcons name={sortBy === 'experience' ? "star" : "circle-multiple"} size={14} color={sortBy === 'experience' ? '#10B981' : '#F59E0B'} style={{marginLeft: 4}} />
                </View>
            </View>
        );
    };

    // Renderiza a Tela do "Herói Solitário" quando só tem 1 criança
    const renderSoloHero = () => {
        const solo = profiles[0];
        return (
            <View style={styles.soloContainer}>
                <View style={styles.soloCard}>
                    <View style={styles.soloIconBg}>
                        <MaterialCommunityIcons name="shield-star" size={50} color="#F59E0B" />
                    </View>
                    <Text style={styles.soloTitle}>Herói Solitário!</Text>
                    <Text style={styles.soloSub}>
                        {solo.name} está desbravando o reino sozinho(a) e acumulando todos os tesouros.
                    </Text>

                    <View style={styles.soloStatsRow}>
                        <View style={styles.soloStatBox}>
                            <MaterialCommunityIcons name="star" size={20} color="#10B981" />
                            <Text style={styles.soloStatValue}>{solo.experience}</Text>
                            <Text style={styles.soloStatLabel}>EXPERIÊNCIA</Text>
                        </View>
                        <View style={styles.soloStatBox}>
                            <MaterialCommunityIcons name="circle-multiple" size={20} color="#F59E0B" />
                            <Text style={styles.soloStatValue}>{solo.balance}</Text>
                            <Text style={styles.soloStatLabel}>MOEDAS</Text>
                        </View>
                    </View>
                </View>

                {/* Banner de incentivo (Agora clicável e com seta) */}
                <TouchableOpacity
                    style={styles.inviteBanner}
                    activeOpacity={0.8}
                    onPress={() => navigation.navigate('FamilySettings', { familyId: familyId, currentProfileId: profile.id })}
                >
                    <MaterialCommunityIcons name="account-plus-outline" size={28} color="#94A3B8" />
                    <View style={{flex: 1, marginLeft: 15, marginRight: 10}}>
                        <Text style={styles.inviteBannerTitle}>O Pódio de Competição</Text>
                        <Text style={styles.inviteBannerText}>
                            Adicione mais um recruta na equipe para desbloquear a disputa pelo pódio principal!
                        </Text>
                    </View>
                    <MaterialCommunityIcons name="chevron-right" size={24} color="#CBD5E1" />
                </TouchableOpacity>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.8}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color="#FFF" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>RANKING</Text>
                <View style={{ width: 40 }} />
            </View>

            <View style={styles.filterContainer}>
                <View style={styles.filterWrapper}>
                    <TouchableOpacity
                        style={[styles.filterBtn, sortBy === 'experience' && styles.filterBtnActiveXP]}
                        activeOpacity={0.8}
                        onPress={() => setSortBy('experience')}
                    >
                        <MaterialCommunityIcons name="star" size={16} color={sortBy === 'experience' ? '#FFF' : '#10B981'} />
                        <Text style={[styles.filterText, { color: '#10B981' }, sortBy === 'experience' && { color: '#FFF' }]}>NÍVEL (XP)</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.filterBtn, sortBy === 'balance' && styles.filterBtnActiveGold]}
                        activeOpacity={0.8}
                        onPress={() => setSortBy('balance')}
                    >
                        <MaterialCommunityIcons name="circle-multiple" size={16} color={sortBy === 'balance' ? '#FFF' : '#F59E0B'} />
                        <Text style={[styles.filterText, { color: '#F59E0B' }, sortBy === 'balance' && { color: '#FFF' }]}>MOEDAS</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.listContainer}>
                {loading ? (
                    <ActivityIndicator color="#10B981" style={{ marginTop: 50 }} size="large" />
                ) : profiles.length === 0 ? (
                    <View style={styles.emptyState}>
                        <View style={styles.emptyIconCircle}>
                            <MaterialCommunityIcons name="podium-silver" size={60} color="#94A3B8" />
                        </View>
                        <Text style={styles.emptyTitle}>Nenhum Recruta!</Text>
                        <Text style={styles.emptySub}>Adicione crianças à família para ver a competição começar.</Text>
                    </View>
                ) : profiles.length === 1 ? (
                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchRanking(); }} tintColor="#10B981" />}
                    >
                        {renderSoloHero()}
                    </ScrollView>
                ) : (
                    <FlatList
                        data={profiles}
                        keyExtractor={item => item.id}
                        ListHeaderComponent={renderPodium}
                        renderItem={renderListItem}
                        contentContainerStyle={styles.flatlistContent}
                        showsVerticalScrollIndicator={false}
                        refreshControl={
                            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchRanking(); }} tintColor="#10B981" />
                        }
                    />
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FDFCF8' },

    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 20, paddingTop: 60, paddingBottom: 35,
        borderBottomLeftRadius: 35, borderBottomRightRadius: 35,
        backgroundColor: '#10B981', zIndex: 10, elevation: 5
    },
    headerTitle: { fontFamily: FONTS.bold, fontSize: 16, color: '#FFF', letterSpacing: 1 },
    backBtn: { padding: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 14 },

    filterContainer: { alignItems: 'center', marginTop: -25, zIndex: 20 },
    filterWrapper: {
        flexDirection: 'row', backgroundColor: '#FFF', borderRadius: 25,
        padding: 4, borderWidth: 1, borderColor: '#E2E8F0',
        shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 5
    },
    filterBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 20, borderRadius: 20, gap: 6 },
    filterBtnActiveXP: { backgroundColor: '#10B981' },
    filterBtnActiveGold: { backgroundColor: '#F59E0B' },
    filterText: { fontFamily: FONTS.bold, fontSize: 12 },

    listContainer: { flex: 1, marginTop: 5, overflow: 'hidden' },
    flatlistContent: { paddingBottom: 100 },

    // PODIUM BUBBLY
    podiumContainer: {
        flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end',
        paddingTop: 30, paddingBottom: 40, paddingHorizontal: 15, gap: 8
    },
    podiumPlace: { alignItems: 'center', width: width / 3.4 },
    podiumName: { fontFamily: FONTS.bold, fontSize: 13, color: '#334155', marginBottom: 6, textAlign: 'center' },

    avatarContainer: { marginBottom: -20, zIndex: 5, alignItems: 'center' },
    avatarBorder: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#FFF', borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
    rankBadge: { position: 'absolute', bottom: -6, width: 22, height: 22, borderRadius: 11, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#FFF' },
    rankText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },

    podiumBar: {
        width: '100%',
        borderTopLeftRadius: 20, borderTopRightRadius: 20,
        borderBottomLeftRadius: 8, borderBottomRightRadius: 8,
        justifyContent: 'flex-end', alignItems: 'center',
        paddingBottom: 15, borderWidth: 1
    },
    podiumValue: { fontFamily: FONTS.bold, fontSize: 14 },

    // LISTA BUBBLY
    rankRow: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#FFF', marginHorizontal: 20, marginBottom: 15,
        padding: 16, borderRadius: 24,
        borderWidth: 1, borderColor: '#F1F5F9',
        shadowColor: '#94A3B8', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 3
    },
    rankPosition: { width: 35, alignItems: 'center' },
    positionText: { fontFamily: FONTS.bold, fontSize: 18, color: '#94A3B8' },
    rankAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#ECFDF5', justifyContent: 'center', alignItems: 'center', marginRight: 15, borderWidth: 1, borderColor: '#A7F3D0' },
    rankName: { fontFamily: FONTS.bold, fontSize: 15, color: '#1E293B' },
    rankArchetype: { fontFamily: FONTS.medium, fontSize: 11, color: '#64748B', marginTop: 2 },
    rankValueBox: { alignItems: 'flex-end', justifyContent: 'center' },
    rankValue: { fontFamily: FONTS.bold, fontSize: 16 },

    // TELA HERÓI SOLITÁRIO (1 Criança)
    soloContainer: { padding: 20, paddingTop: 40, alignItems: 'center' },
    soloCard: {
        backgroundColor: '#FFF', width: '100%', borderRadius: 30, padding: 30,
        alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0',
        shadowColor: '#94A3B8', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 5,
        marginBottom: 25
    },
    soloIconBg: { width: 90, height: 90, borderRadius: 45, backgroundColor: '#FFFBEB', justifyContent: 'center', alignItems: 'center', marginBottom: 20, borderWidth: 2, borderColor: '#FEF3C7' },
    soloTitle: { fontFamily: FONTS.bold, fontSize: 24, color: '#1E293B', marginBottom: 10 },
    soloSub: { fontFamily: FONTS.medium, fontSize: 14, color: '#64748B', textAlign: 'center', lineHeight: 22, marginBottom: 25 },
    soloStatsRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', gap: 15 },
    soloStatBox: { flex: 1, backgroundColor: '#F8FAFC', padding: 15, borderRadius: 20, alignItems: 'center', borderWidth: 1, borderColor: '#F1F5F9' },
    soloStatValue: { fontFamily: FONTS.bold, fontSize: 22, color: '#334155', marginTop: 5 },
    soloStatLabel: { fontFamily: FONTS.bold, fontSize: 10, color: '#94A3B8', marginTop: 2 },

    // BANNER ATUALIZADO
    inviteBanner: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC',
        width: '100%', padding: 20, borderRadius: 24, borderWidth: 2, borderColor: '#E2E8F0', borderStyle: 'dashed'
    },
    inviteBannerTitle: { fontFamily: FONTS.bold, fontSize: 14, color: '#475569', marginBottom: 4 },
    inviteBannerText: { fontFamily: FONTS.medium, fontSize: 12, color: '#94A3B8', lineHeight: 18 },

    // EMPTY STATE (0 Crianças)
    emptyState: { alignItems: 'center', justifyContent: 'center', marginTop: 80, paddingHorizontal: 40 },
    emptyIconCircle: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
    emptyTitle: { fontFamily: FONTS.bold, fontSize: 20, color: '#475569', marginBottom: 10 },
    emptySub: { fontFamily: FONTS.medium, fontSize: 14, color: '#94A3B8', textAlign: 'center', lineHeight: 22 },
});