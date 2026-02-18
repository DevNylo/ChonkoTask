import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient'; // <--- IMPORTANTE
import { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    FlatList,
    ImageBackground,
    RefreshControl,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { supabase } from '../lib/supabase'; 
import { COLORS, FONTS } from '../styles/theme';

const BACKGROUND_IMG = require('../../assets/GenericBKG.png');
const { width } = Dimensions.get('window');

export default function RankingScreen() {
    const navigation = useNavigation();
    const route = useRoute();
    const { familyId } = route.params || {};

    const [profiles, setProfiles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [sortBy, setSortBy] = useState('experience'); 
    const [refreshing, setRefreshing] = useState(false);

    useFocusEffect(
        useCallback(() => {
            fetchRanking();
        }, [sortBy])
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

    // --- RENDERIZADORES ---

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
                                <View style={[styles.avatarBorder, { borderColor: '#C0C0C0' }]}>
                                    <MaterialCommunityIcons name="account" size={30} color="#C0C0C0" />
                                </View>
                                <View style={[styles.rankBadge, { backgroundColor: '#C0C0C0' }]}>
                                    <Text style={styles.rankText}>2</Text>
                                </View>
                            </View>
                            <View style={[styles.podiumBar, { height: 100, backgroundColor: 'rgba(192, 192, 192, 0.4)', borderColor: '#C0C0C0' }]}>
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
                            <MaterialCommunityIcons name="crown" size={32} color="#FFD700" style={{ marginBottom: -10, zIndex: 10 }} />
                            <Text style={[styles.podiumName, { fontSize: 16, color: '#FFD700' }]} numberOfLines={1}>{first.name}</Text>
                            <View style={[styles.avatarContainer, { transform: [{ scale: 1.2 }] }]}>
                                <View style={[styles.avatarBorder, { borderColor: '#FFD700', borderWidth: 3 }]}>
                                    <MaterialCommunityIcons name="account" size={30} color="#FFD700" />
                                </View>
                                <View style={[styles.rankBadge, { backgroundColor: '#FFD700' }]}>
                                    <Text style={styles.rankText}>1</Text>
                                </View>
                            </View>
                            <View style={[styles.podiumBar, { height: 140, backgroundColor: 'rgba(255, 215, 0, 0.4)', borderColor: '#FFD700' }]}>
                                <Text style={[styles.podiumValue, { color: '#FFD700', fontSize: 16 }]}>
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
                                <View style={[styles.avatarBorder, { borderColor: '#CD7F32' }]}>
                                    <MaterialCommunityIcons name="account" size={30} color="#CD7F32" />
                                </View>
                                <View style={[styles.rankBadge, { backgroundColor: '#CD7F32' }]}>
                                    <Text style={styles.rankText}>3</Text>
                                </View>
                            </View>
                            <View style={[styles.podiumBar, { height: 80, backgroundColor: 'rgba(205, 127, 50, 0.4)', borderColor: '#CD7F32' }]}>
                                <Text style={styles.podiumValue}>
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
                    <MaterialCommunityIcons name="account" size={24} color={COLORS.primary} />
                </View>
                <Text style={styles.rankName}>{item.name}</Text>
                <Text style={styles.rankValue}>
                    {sortBy === 'experience' ? `${item.experience} XP` : item.balance}
                </Text>
            </View>
        );
    };

    return (
        <ImageBackground source={BACKGROUND_IMG} style={styles.container} resizeMode="cover">
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

            {/* HEADER GRADIENTE */}
            <LinearGradient
                colors={['#064E3B', '#10B981']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.header}
            >
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color="#FFF" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>RANKING DA TROPA</Text>
                <View style={{ width: 40 }} />
            </LinearGradient>

            {/* TABS DE FILTRO */}
            <View style={styles.filterContainer}>
                <View style={styles.filterWrapper}>
                    <TouchableOpacity
                        style={[styles.filterBtn, sortBy === 'experience' && styles.filterBtnActive]}
                        onPress={() => setSortBy('experience')}
                    >
                        <MaterialCommunityIcons name="star" size={16} color={sortBy === 'experience' ? '#FFF' : COLORS.primary} />
                        <Text style={[styles.filterText, sortBy === 'experience' && { color: '#FFF' }]}>NÍVEL (XP)</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.filterBtn, sortBy === 'balance' && styles.filterBtnActive]}
                        onPress={() => setSortBy('balance')}
                    >
                        <MaterialCommunityIcons name="circle-multiple" size={16} color={sortBy === 'balance' ? '#FFF' : COLORS.primary} />
                        <Text style={[styles.filterText, sortBy === 'balance' && { color: '#FFF' }]}>MOEDAS</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* CONTEÚDO COM VIDRO */}
            <View style={styles.glassContainer}>
                <BlurView intensity={70} tint="light" style={StyleSheet.absoluteFill} />
                <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255, 255, 255, 0.3)' }]} />

                {loading ? (
                    <ActivityIndicator color={COLORS.primary} style={{ marginTop: 50 }} />
                ) : (
                    <FlatList
                        data={profiles}
                        keyExtractor={item => item.id}
                        ListHeaderComponent={renderPodium}
                        renderItem={renderListItem}
                        contentContainerStyle={{ paddingBottom: 100 }}
                        refreshControl={
                            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchRanking(); }} tintColor={COLORS.primary} />
                        }
                    />
                )}
            </View>
        </ImageBackground>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },

    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 50,
        paddingBottom: 25,
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
        zIndex: 10,
        shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 5, elevation: 5
    },
    headerTitle: { fontFamily: FONTS.bold, fontSize: 18, color: '#FFF', letterSpacing: 1 },
    backBtn: { padding: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 14 },

    filterContainer: { alignItems: 'center', marginTop: -20, zIndex: 20 },
    filterWrapper: {
        flexDirection: 'row',
        backgroundColor: '#FFF',
        borderRadius: 25,
        padding: 4,
        shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 5
    },
    filterBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 20, borderRadius: 20, gap: 5 },
    filterBtnActive: { backgroundColor: COLORS.primary },
    filterText: { fontFamily: FONTS.bold, fontSize: 12, color: COLORS.primary },

    glassContainer: {
        flex: 1,
        marginTop: 20,
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
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
    podiumName: { fontFamily: FONTS.bold, fontSize: 12, color: '#FFF', marginBottom: 5, textAlign: 'center', textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: {width: 1, height: 1}, textShadowRadius: 2 },
    avatarContainer: { marginBottom: -15, zIndex: 5, alignItems: 'center' },
    avatarBorder: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#FFF', borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
    rankBadge: { position: 'absolute', bottom: -5, width: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#FFF' },
    rankText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },
    podiumBar: { width: '100%', borderTopLeftRadius: 10, borderTopRightRadius: 10, justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 10, borderWidth: 1 },
    podiumValue: { fontFamily: FONTS.bold, fontSize: 14, color: '#334155' },

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
        borderColor: 'rgba(0,0,0,0.05)',
        shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2
    },
    rankPosition: { width: 30, alignItems: 'center' },
    positionText: { fontFamily: FONTS.bold, fontSize: 16, color: '#64748B' },
    rankAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
    rankName: { flex: 1, fontFamily: FONTS.bold, fontSize: 14, color: '#1E293B' },
    rankValue: { fontFamily: FONTS.bold, fontSize: 14, color: COLORS.primary },
});