import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient'; // Apenas para os Cartões Mágicos
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    Dimensions,
    Easing,
    FlatList,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { FONTS } from '../../styles/theme';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;

// Baseado na valiosidade (rarity) salva pelo Admin
const GET_VOUCHER_THEME = (rarity, status) => {
    if (status === 'PENDING_DELIVERY') {
        return { label: 'USADO', gradient: ['#334155', '#1E293B', '#0F172A'], border: '#475569', iconColor: '#64748B', textColor: '#94A3B8', btnBg: 'rgba(255,255,255,0.05)', btnText: '#64748B' };
    }
    if (rarity === 'common') return { label: 'COMUM', gradient: ['#34D399', '#10B981', '#059669'], border: '#6EE7B7', iconColor: '#ECFDF5', textColor: '#FFFFFF', btnBg: '#064E3B', btnText: '#A7F3D0' };
    if (rarity === 'rare') return { label: 'RARO', gradient: ['#60A5FA', '#3B82F6', '#1D4ED8'], border: '#93C5FD', iconColor: '#EFF6FF', textColor: '#FFFFFF', btnBg: '#1E3A8A', btnText: '#BFDBFE' };
    if (rarity === 'epic') return { label: 'ÉPICO', gradient: ['#C084FC', '#9333EA', '#6B21A8'], border: '#E9D5FF', iconColor: '#FAF5FF', textColor: '#FFFFFF', btnBg: '#4C1D95', btnText: '#E9D5FF' };
    if (rarity === 'legendary') return { label: 'LENDÁRIO', gradient: ['#FCD34D', '#F59E0B', '#B45309'], border: '#FDE68A', iconColor: '#FFFBEB', textColor: '#FFFFFF', btnBg: '#78350F', btnText: '#FEF3C7' };

    // Fallback de Segurança
    return { label: 'COMUM', gradient: ['#34D399', '#10B981', '#059669'], border: '#6EE7B7', iconColor: '#ECFDF5', textColor: '#FFFFFF', btnBg: '#064E3B', btnText: '#A7F3D0' };
};

const ShinyOverlay = () => {
    const translateX = useRef(new Animated.Value(-CARD_WIDTH)).current;
    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(translateX, { toValue: CARD_WIDTH, duration: 2000, easing: Easing.linear, useNativeDriver: true }),
                Animated.delay(4000)
            ])
        ).start();
    }, []);
    return (
        <Animated.View style={[styles.shimmerOverlay, { transform: [{ translateX }] }]}>
            <LinearGradient colors={['transparent', 'rgba(255,255,255,0.4)', 'transparent']} start={{x:0, y:0}} end={{x:1, y:0}} style={{flex:1}} />
        </Animated.View>
    );
};

export default function BagScreen({ route }) {
    const { profile } = route.params || {};
    const [inventory, setInventory] = useState([]);
    const [filteredInventory, setFilteredInventory] = useState([]);
    const [loading, setLoading] = useState(true);

    const [searchText, setSearchText] = useState('');
    const [activeFilter, setActiveFilter] = useState('ALL');

    useFocusEffect(useCallback(() => { fetchInventory(); }, []));

    useEffect(() => {
        let result = inventory;
        if (searchText) {
            result = result.filter(item => item.rewards.title.toLowerCase().includes(searchText.toLowerCase()));
        }
        if (activeFilter !== 'ALL') {
            result = result.filter(item => {
                const rarity = item.rewards.rarity || 'common';
                if (activeFilter === 'PENDING') return item.status === 'PENDING_DELIVERY';
                if (activeFilter === 'COMUM') return rarity === 'common';
                if (activeFilter === 'RARO') return rarity === 'rare';
                if (activeFilter === 'EPICO') return rarity === 'epic';
                if (activeFilter === 'LENDARIO') return rarity === 'legendary';
                return true;
            });
        }
        setFilteredInventory(result);
    }, [searchText, activeFilter, inventory]);

    const fetchInventory = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('inventory_items')
                .select(`*, rewards (title, icon, description, cost, rarity)`)
                .eq('profile_id', profile.id)
                .neq('status', 'DELIVERED')
                .order('purchased_at', { ascending: false });

            if (error) throw error;
            setInventory(data || []);
            setFilteredInventory(data || []);
        } catch (error) { console.log(error); }
        finally { setLoading(false); }
    };

    const handleUseItem = (item) => {
        Alert.alert(
            "💎 Resgatar Voucher",
            `Deseja usar "${item.rewards.title}" agora?`,
            [
                { text: "Cancelar", style: "cancel" },
                { text: "USAR!", onPress: async () => {
                        try {
                            const { error } = await supabase.from('inventory_items').update({ status: 'PENDING_DELIVERY', used_at: new Date() }).eq('id', item.id);
                            if (error) throw error;
                            fetchInventory();
                        } catch (e) { Alert.alert("Erro", "Falha ao usar."); }
                    }}
            ]
        );
    };

    const renderVoucherCard = ({ item }) => {
        const isPending = item.status === 'PENDING_DELIVERY';
        const rarity = item.rewards.rarity || 'common';
        const theme = GET_VOUCHER_THEME(rarity, item.status);

        return (
            <View style={styles.cardContainer}>
                {!isPending && <View style={[styles.cardGlow, { backgroundColor: theme.gradient[1] }]} />}

                <View style={[styles.ticketVertical, { borderColor: theme.border }]}>
                    <LinearGradient colors={theme.gradient} style={StyleSheet.absoluteFill} start={{x: 0, y: 0}} end={{x: 1, y: 1}} />
                    {!isPending && <ShinyOverlay />}

                    <View style={styles.cardTop}>
                        <View style={styles.rarityPill}><Text style={styles.rarityText}>{theme.label}</Text></View>
                        <MaterialCommunityIcons name={item.rewards.icon} size={48} color={theme.iconColor} />
                    </View>

                    <View style={styles.dividerRow}>
                        <View style={styles.cutoutLeft} />
                        <View style={styles.dashedLine} />
                        <View style={styles.cutoutRight} />
                    </View>

                    <View style={styles.cardBottom}>
                        <Text style={[styles.cardTitle, { color: theme.textColor }]} numberOfLines={2}>{item.rewards.title}</Text>
                        <TouchableOpacity style={[styles.useButton, { backgroundColor: theme.btnBg }]} disabled={isPending} onPress={() => handleUseItem(item)}>
                            <Text style={[styles.useButtonText, { color: theme.btnText }]}>{isPending ? "EM ANÁLISE" : "RESGATAR"}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        );
    };

    const FilterChip = ({ label, value }) => (
        <TouchableOpacity style={[styles.filterChip, activeFilter === value && styles.filterChipActive]} onPress={() => setActiveFilter(value)}>
            <Text style={[styles.filterText, activeFilter === value && styles.filterTextActive]}>{label}</Text>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />

            {/* --- HEADER FIXO --- */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Minha Mochila</Text>

                <View style={styles.searchContainer}>
                    <MaterialCommunityIcons name="magnify" size={20} color="#94A3B8" />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Pesquisar item..."
                        placeholderTextColor="#64748B"
                        value={searchText}
                        onChangeText={setSearchText}
                    />
                    {searchText.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchText('')}>
                            <MaterialCommunityIcons name="close-circle" size={18} color="#64748B" />
                        </TouchableOpacity>
                    )}
                </View>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersScroll}>
                    <FilterChip label="Tudo" value="ALL" />
                    <FilterChip label="Usados" value="PENDING" />
                    <FilterChip label="Comum" value="COMUM" />
                    <FilterChip label="Raro" value="RARO" />
                    <FilterChip label="Épico" value="EPICO" />
                    <FilterChip label="Lendário" value="LENDARIO" />
                </ScrollView>
            </View>

            {/* --- LISTA DE CARDS --- */}
            {loading ? (
                <ActivityIndicator size="large" color="#FCD34D" style={{ marginTop: 50 }} />
            ) : (
                <FlatList
                    data={filteredInventory}
                    keyExtractor={item => item.id}
                    renderItem={renderVoucherCard}
                    numColumns={2}
                    columnWrapperStyle={{ justifyContent: 'space-between' }}
                    contentContainerStyle={styles.gridList}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <MaterialCommunityIcons name="package-variant-closed" size={60} color="#334155" />
                            <Text style={styles.emptyText}>Nenhum item na mochila.</Text>
                        </View>
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0F172A' }, // Fundo Mágico Sólido! Escuro para destacar as figurinhas

    header: { paddingTop: 60, paddingBottom: 15, paddingHorizontal: 20, backgroundColor: '#0F172A', zIndex: 10 },
    headerTitle: { fontSize: 24, fontFamily: FONTS.bold, color: '#FFF', marginBottom: 15 },

    // Search
    searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1E293B', borderRadius: 12, paddingHorizontal: 12, height: 45, marginBottom: 15, borderWidth: 1, borderColor: '#334155' },
    searchInput: { flex: 1, color: '#FFF', marginLeft: 10, fontFamily: FONTS.medium },

    // Filters
    filtersScroll: { gap: 8, paddingRight: 20 },
    filterChip: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, backgroundColor: '#334155', borderWidth: 1, borderColor: '#475569' },
    filterChipActive: { backgroundColor: '#FCD34D', borderColor: '#F59E0B' },
    filterText: { fontSize: 12, fontFamily: FONTS.bold, color: '#94A3B8' },
    filterTextActive: { color: '#451A03' },

    // Grid List
    gridList: { paddingHorizontal: 20, paddingBottom: 100, paddingTop: 10 },

    // --- CARD 2x2 STYLES ---
    cardContainer: { width: CARD_WIDTH, marginBottom: 20, alignItems: 'center' },
    cardGlow: { position: 'absolute', top: 5, width: '90%', height: '90%', borderRadius: 20, opacity: 0.6, blurRadius: 10 },

    ticketVertical: { width: '100%', height: 220, borderRadius: 16, overflow: 'hidden', borderWidth: 1.5 },

    // Topo (Ícone)
    cardTop: { flex: 3, justifyContent: 'center', alignItems: 'center', position: 'relative' },
    rarityPill: { position: 'absolute', top: 8, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, backgroundColor: 'rgba(0,0,0,0.3)' },
    rarityText: { color: '#FFF', fontSize: 8, fontFamily: FONTS.bold, letterSpacing: 1 },

    // Meio (Picote)
    dividerRow: { flexDirection: 'row', alignItems: 'center', height: 20, overflow: 'hidden' },
    cutoutLeft: { width: 16, height: 16, borderRadius: 8, backgroundColor: '#0F172A', marginLeft: -8 },
    dashedLine: { flex: 1, height: 1, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', borderStyle: 'dashed', marginHorizontal: 2 },
    cutoutRight: { width: 16, height: 16, borderRadius: 8, backgroundColor: '#0F172A', marginRight: -8 },

    // Base (Info)
    cardBottom: { flex: 2, padding: 10, justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.1)' },
    cardTitle: { fontSize: 13, fontFamily: FONTS.bold, color: '#FFF', textAlign: 'center', textTransform: 'uppercase' },

    useButton: { width: '100%', paddingVertical: 8, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
    useButtonText: { fontSize: 10, fontFamily: FONTS.bold },

    shimmerOverlay: { position: 'absolute', top: 0, left: 0, bottom: 0, width: 60, zIndex: 10, transform: [{ skewX: '-20deg' }] },

    emptyState: { alignItems: 'center', marginTop: 80, width: width - 40 },
    emptyText: { color: '#64748B', marginTop: 10, fontFamily: FONTS.medium }
});