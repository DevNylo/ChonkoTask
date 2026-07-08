import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    FlatList,
    RefreshControl,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { COLORS, FONTS } from '../styles/theme';

const { width } = Dimensions.get('window');

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
                .select('id, name, avatar, experience, balance, role')
                .eq('family_id', familyId)
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
        if (profiles.length === 0) return null;

        const first = profiles[0];
        const second = profiles[1];
        const third = profiles[2];

        return (
            <View style={styles.podiumContainer}>
                {/* 2º LUGAR */}
                <View style={[styles.podiumPlace, { marginTop: 40 }]}>
                    {second && (
                        <>
                            <Text style={styles.podiumName} numberOfLines={1}>{second.name}</Text>
                            <View style={styles.avatarContainer}>
                                <View style={[styles.avatarBorder, { borderColor: '#94A3B8' }]}>
                                    <MaterialCommunityIcons name="account" size={30} color="#94A3B8" />
                                </View>
                                <View style={[styles.rankBadge, { backgroundColor: '#94A3B8' }]}>
                                    <Text style={styles.rankText}>2</Text>
                                </View>
                            </View>
                            <View style={[styles.podiumBar, { height: 100, backgroundColor: '#F1F5F9', borderColor: '#94A3B8' }]}>
                                <Text style={styles.podiumValue}>
                                    {sortBy === 'experience' ? `${second.experience} XP` : second.balance}
                                </Text>
                            </View>
                        </>
                    )}
                </View>

                {/* 1º LUGAR */}
                <View style={styles.podiumPlace}>
                    {first && (
                        <>
                            <MaterialCommunityIcons name="crown" size={32} color="#F59E0B" style={{ marginBottom: -10, zIndex: 10 }} />
                            <Text style={[styles.podiumName, { fontSize: 16, color: '#F59E0B' }]} numberOfLines={1}>{first.name}</Text>
                            <View style={[styles.avatarContainer, { transform: [{ scale: 1.2 }] }]}>
                                <View style={[styles.avatarBorder, { borderColor: '#F59E0B', borderWidth: 3 }]}>
                                    <MaterialCommunityIcons name="account" size={30} color="#F59E0B" />
                                </View>
                                <View style={[styles.rankBadge, { backgroundColor: '#F59E0B' }]}>
                                    <Text style={styles.rankText}>1</Text>
                                </View>
                            </View>
                            <View style={[styles.podiumBar, { height: 140, backgroundColor: '#FFFBEB', borderColor: '#F59E0B' }]}>
                                <Text style={[styles.podiumValue, { color: '#B45309', fontSize: 16 }]}>
                                    {sortBy === 'experience' ? `${first.experience} XP` : first.balance}
                                </Text>
                            </View>
                        </>
                    )}
                </View>

                {/* 3º LUGAR */}
                <View style={[styles.podiumPlace, { marginTop: 60 }]}>
                    {third && (
                        <>
                            <Text style={styles.podiumName} numberOfLines={1}>{third.name}</Text>
                            <View style={styles.avatarContainer}>
                                <View style={[styles.avatarBorder, { borderColor: '#B45309' }]}>
                                    <MaterialCommunityIcons name="account" size={30} color="#B45309" />
                                </View>
                                <View style={[styles.rankBadge, { backgroundColor: '#B45309' }]}>
                                    <Text style={styles.rankText}>3</Text>
                                </View>
                            </View>
                            <View style={[styles.podiumBar, { height: 80, backgroundColor: '#FEF3C7', borderColor: '#B45309' }]}>
                                <Text style={[styles.podiumValue, { color: '#B45309' }]}>
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
                <Text style={styles.rankName}>{item.name}</Text>
                <Text style={[styles.rankValue, { color: sortBy === 'experience' ? '#10B981' : '#F59E0B' }]}>
                    {sortBy === 'experience' ? `${item.experience} XP` : item.balance}
                </Text>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

            {/* HEADER SÓLIDO */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.8}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color="#FFF" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>RANKING DA EQUIPE</Text>
                <View style={{ width: 40 }} />
            </View>

            {/* TABS DE FILTRO */}
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

            {/* CONTEÚDO */}
            <View style={styles.listContainer}>
                {loading ? (
                    <ActivityIndicator color="#10B981" style={{ marginTop: 50 }} />
                ) : (
                    <FlatList
                        data={profiles}
                        keyExtractor={item => item.id}
                        ListHeaderComponent={renderPodium}
                        renderItem={renderListItem}
                        contentContainerStyle={{ paddingBottom: 100 }}
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
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 60,
        paddingBottom: 25,
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
        backgroundColor: '#10B981',
        zIndex: 10,
        elevation: 5
    },
    headerTitle: { fontFamily: FONTS.bold, fontSize: 16, color: '#FFF', letterSpacing: 1 },
    backBtn: { padding: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 14 },

    filterContainer: { alignItems: 'center', marginTop: -20, zIndex: 20 },
    filterWrapper: {
        flexDirection: 'row',
        backgroundColor: '#FFF',
        borderRadius: 25,
        padding: 4,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        elevation: 5
    },
    filterBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 20, borderRadius: 20, gap: 5 },
    filterBtnActiveXP: { backgroundColor: '#10B981' },
    filterBtnActiveGold: { backgroundColor: '#F59E0B' },
    filterText: { fontFamily: FONTS.bold, fontSize: 12 },

    listContainer: {
        flex: 1,
        marginTop: 10,
        overflow: 'hidden',
    },

    // PODIUM
    podiumContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'flex-end',
        paddingTop: 30,
        paddingBottom: 40,
        paddingHorizontal: 20,
        gap: 10
    },
    podiumPlace: { alignItems: 'center', width: width / 3.5 },
    podiumName: { fontFamily: FONTS.bold, fontSize: 12, color: '#334155', marginBottom: 5, textAlign: 'center' },
    avatarContainer: { marginBottom: -15, zIndex: 5, alignItems: 'center' },
    avatarBorder: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#FFF', borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
    rankBadge: { position: 'absolute', bottom: -5, width: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#FFF' },
    rankText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },
    podiumBar: { width: '100%', borderTopLeftRadius: 10, borderTopRightRadius: 10, justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 10, borderWidth: 1 },
    podiumValue: { fontFamily: FONTS.bold, fontSize: 14, color: '#64748B' },

    // LISTA
    rankRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF',
        marginHorizontal: 20,
        marginBottom: 10,
        padding: 15,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        elevation: 2
    },
    rankPosition: { width: 30, alignItems: 'center' },
    positionText: { fontFamily: FONTS.bold, fontSize: 16, color: '#64748B' },
    rankAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
    rankName: { flex: 1, fontFamily: FONTS.bold, fontSize: 14, color: '#1E293B' },
    rankValue: { fontFamily: FONTS.bold, fontSize: 14 },
});