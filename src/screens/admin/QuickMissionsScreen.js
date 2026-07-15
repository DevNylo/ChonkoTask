import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Keyboard,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { COLORS, FONTS } from '../../styles/theme';

// 1. IMPORTANDO O CATÁLOGO
import { MISSIONS_CATALOG } from '../../constants/MissionsCatalog';

// 2. NOVA CONFIGURAÇÃO VISUAL (PADRÃO RPG)
const DIFFICULTY_CONFIG = {
    'common':    { label: 'FÁCIL',    color: '#10B981', bg: '#ECFDF5' }, // Verde
    'rare':      { label: 'MÉDIO',    color: '#3B82F6', bg: '#EFF6FF' }, // Azul
    'epic':      { label: 'DIFÍCIL',  color: '#8B5CF6', bg: '#F5F3FF' }, // Roxo
    'legendary': { label: 'LENDÁRIO', color: '#F59E0B', bg: '#FFFBEB' }, // Dourado
    'custom':    { label: 'MANUAL',   color: '#64748B', bg: '#F8FAFC' }  // Cinza
};

const WEEKDAYS = [
    { id: 0, label: 'DOM' }, { id: 1, label: 'SEG' }, { id: 2, label: 'TER' },
    { id: 3, label: 'QUA' }, { id: 4, label: 'QUI' }, { id: 5, label: 'SEX' }, { id: 6, label: 'SÁB' }
];

export default function QuickMissionsScreen() {
    const navigation = useNavigation();
    const route = useRoute();
    const { profile } = useAuth();

    const familyId = route.params?.familyId || profile?.family_id;

    const [templates, setTemplates] = useState([]);
    const [combinedList, setCombinedList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchText, setSearchText] = useState('');

    const [selectedIds, setSelectedIds] = useState([]);
    const isSelectionMode = selectedIds.length > 0;

    useEffect(() => {
        if (familyId) fetchData();
    }, [familyId]);

    // LÓGICA DE COMBINAÇÃO E SEPARADOR
    useEffect(() => {
        const lowerSearch = searchText.toLowerCase();

        // 1. Meus Modelos (Filtrados do Banco)
        const filteredTemplates = templates.filter(t =>
            t.title.toLowerCase().includes(lowerSearch)
        );

        // 2. Sugestões do Sistema (Filtrados do Catálogo Estático)
        const filteredIdeas = MISSIONS_CATALOG.filter(t =>
            t.title.toLowerCase().includes(lowerSearch)
        );

        let finalList = [...filteredTemplates];

        if (filteredIdeas.length > 0) {
            finalList.push({ id: 'SEPARATOR_HEADER', is_separator: true, title: 'Sugestões do Chonko' });
            finalList = [...finalList, ...filteredIdeas];
        }

        setCombinedList(finalList);
    }, [templates, searchText]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase.from('missions')
                .select('*')
                .eq('family_id', familyId)
                .eq('is_template', true)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setTemplates(data || []);
        } catch (error) {
            console.log("Erro ao carregar modelos:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectMission = (item) => {
        if (item.is_separator) return;

        if (isSelectionMode) {
            if (item.is_system) return;
            toggleSelection(item.id);
        } else {
            // Se for do sistema, removemos o ID para que ao salvar na próxima tela seja criado um NOVO registro
            const templateData = item.is_system ? { ...item, id: null } : item;
            navigation.navigate('CreateMission', { familyId, templateData });
        }
    };

    const handleLongPress = (item) => {
        if (item.is_system || item.is_separator) return;
        toggleSelection(item.id);
    };

    const toggleSelection = (id) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(selectedIds.filter(i => i !== id));
        } else {
            setSelectedIds([...selectedIds, id]);
        }
    };

    const handleBatchDelete = () => {
        Alert.alert("Excluir Modelos", `Apagar ${selectedIds.length} modelo(s) selecionado(s)?`, [
            { text: "Cancelar", style: "cancel" },
            { text: "Apagar", style: 'destructive', onPress: async () => {
                    setLoading(true);
                    try {
                        await supabase.from('missions').delete().in('id', selectedIds);
                        setSelectedIds([]);
                        fetchData();
                    } catch (error) {
                        Alert.alert("Erro", "Não foi possível apagar os modelos.");
                        setLoading(false);
                    }
                }}
        ]);
    };

    const cancelSelection = () => {
        setSelectedIds([]);
    };

    const getDayLabels = (days) => {
        if (!days || days.length === 0) return "";
        if (days.length === 7) return "Todos os dias";
        return days.map(id => WEEKDAYS.find(d => d.id === id)?.label.substring(0,3)).join(", ");
    };

    const renderItem = ({ item }) => {
        // --- RENDERIZAÇÃO DO SEPARADOR ---
        if (item.is_separator) {
            return (
                <View style={styles.separatorContainer}>
                    <View style={styles.separatorLine} />
                    <View style={styles.separatorBadge}>
                        <MaterialCommunityIcons name="star-face" size={16} color="#FFF" style={{marginRight: 5}} />
                        <Text style={styles.separatorText}>{item.title}</Text>
                    </View>
                    <View style={styles.separatorLine} />
                </View>
            );
        }

        // --- RENDERIZAÇÃO DO CARD ---
        const isCustom = item.reward_type === 'custom';
        const isSystem = item.is_system;
        const isSelected = selectedIds.includes(item.id);

        const diffData = DIFFICULTY_CONFIG[item.difficulty] || DIFFICULTY_CONFIG['custom'];
        const borderColor = diffData.color;
        const cardBg = diffData.bg;
        const iconBgColor = diffData.color + '20';

        return (
            <TouchableOpacity
                style={[styles.cardWrapper, isSelected && styles.cardSelectedScale]}
                activeOpacity={0.8}
                onPress={() => handleSelectMission(item)}
                onLongPress={() => handleLongPress(item)}
            >
                {isSelectionMode && !isSystem && (
                    <View style={styles.selectionOverlay}>
                        <MaterialCommunityIcons
                            name={isSelected ? "checkbox-marked-circle" : "checkbox-blank-circle-outline"}
                            size={24}
                            color={isSelected ? '#10B981' : "#CBD5E1"}
                        />
                    </View>
                )}

                <View style={styles.cardShadow} />

                <View style={[
                    styles.cardFront,
                    { borderColor: borderColor, backgroundColor: cardBg },
                    isSelected && { backgroundColor: '#F0FDF4', borderColor: '#10B981' }
                ]}>

                    {/* PARTE SUPERIOR */}
                    <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 10}}>

                        <View style={[styles.iconBox, {backgroundColor: iconBgColor }]}>
                            <MaterialCommunityIcons name={item.icon || 'star'} size={28} color={borderColor} />
                        </View>

                        {/* Título blindado com flex: 1 */}
                        <View style={{flex: 1, paddingRight: 10}}>
                            <View style={{flexDirection:'row', alignItems:'center', flexWrap: 'wrap'}}>
                                <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
                                {isSystem && (
                                    <View style={styles.systemBadge}>
                                        <Text style={styles.systemBadgeText}>SUGESTÃO</Text>
                                    </View>
                                )}
                            </View>

                            {item.difficulty && (
                                <View style={{flexDirection: 'row', marginTop: 4}}>
                                    <View style={[styles.tagBase, { backgroundColor: '#FFF', borderColor: diffData.color }]}>
                                        <Text style={[styles.tagText, { color: diffData.color }]}>{diffData.label}</Text>
                                    </View>
                                </View>
                            )}
                        </View>

                        {/* Recompensa blindada com maxWidth 40% */}
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

                    {item.use_critical && (
                        <View style={[styles.treasureBadge, item.critical_type === 'bonus_coins' ? styles.treasureGold : styles.treasurePurple]}>
                            <MaterialCommunityIcons name={item.critical_type === 'bonus_coins' ? "arrow-up-bold-circle" : "gift-open"} size={14} color="#FFF" style={{marginRight:5}} />
                            <Text style={styles.treasureText}>
                                {item.critical_type === 'bonus_coins' ? `+50% Bônus (${item.critical_chance}%)` : `Surpresa (${item.critical_chance}%)`}
                            </Text>
                        </View>
                    )}

                    <View style={[styles.divider, {backgroundColor: borderColor+'30'}]} />

                    {/* RODAPÉ */}
                    <View style={styles.metaInfoContainer}>
                        <View style={[styles.metaTag, { backgroundColor: '#FFF', borderColor: borderColor+'50' }]}>
                            <MaterialCommunityIcons name={item.is_recurring ? "calendar-sync" : "calendar-check"} size={14} color="#64748B" />
                            <Text style={[styles.metaText, {color: '#64748B'}]}>
                                {item.is_recurring ? (item.recurrence_days ? getDayLabels(item.recurrence_days) : "Recorrente") : "Única"}
                            </Text>
                        </View>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.container}>
                <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

                {/* --- HEADER SÓLIDO --- */}
                <View style={[styles.topArea, isSelectionMode ? styles.topAreaRed : styles.topAreaGreen]}>
                    <View style={styles.header}>
                        {isSelectionMode ? (
                            <View style={{flexDirection:'row', alignItems:'center', flex:1}}>
                                <TouchableOpacity onPress={cancelSelection} style={styles.backBtn} activeOpacity={0.8}>
                                    <MaterialCommunityIcons name="close" size={24} color="#FFF" />
                                </TouchableOpacity>
                                <Text style={styles.headerTitle}>{selectedIds.length} Selecionados</Text>
                                <TouchableOpacity onPress={handleBatchDelete} style={styles.deleteHeaderBtn} activeOpacity={0.8}>
                                    <MaterialCommunityIcons name="trash-can" size={24} color="#FFF" />
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <>
                                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.8}>
                                    <MaterialCommunityIcons name="arrow-left" size={24} color={'#FFF'} />
                                </TouchableOpacity>
                                <Text style={styles.headerTitle}>IDEIAS E MODELOS</Text>
                                <View style={{width: 40}} />
                            </>
                        )}
                    </View>

                    {!isSelectionMode && (
                        <View style={styles.searchContainer}>
                            <MaterialCommunityIcons name="magnify" size={20} color="#10B981" style={{marginLeft: 10}} />
                            <TextInput
                                style={styles.searchInput}
                                placeholder="Buscar missão..."
                                placeholderTextColor="#94A3B8"
                                value={searchText}
                                onChangeText={setSearchText}
                            />
                            {searchText.length > 0 && (
                                <TouchableOpacity onPress={() => setSearchText('')}>
                                    <MaterialCommunityIcons name="close-circle" size={18} color="#CBD5E1" style={{marginRight: 10}} />
                                </TouchableOpacity>
                            )}
                        </View>
                    )}
                </View>

                <FlatList
                    data={combinedList}
                    keyExtractor={item => item.id}
                    contentContainerStyle={{padding: 20, paddingBottom: 50}}
                    showsVerticalScrollIndicator={false}
                    ListHeaderComponent={() => (
                        <Text style={styles.listHeader}>
                            {searchText ? `Resultados para "${searchText}"` : "Modelos Salvos & Sugestões"}
                        </Text>
                    )}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            {loading ? <ActivityIndicator color="#10B981" /> : (
                                <Text style={styles.emptyText}>Nenhuma missão encontrada.</Text>
                            )}
                        </View>
                    }
                    renderItem={renderItem}
                />
            </View>
        </TouchableWithoutFeedback>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FDFCF8' },

    topArea: {
        paddingTop: 60,
        paddingBottom: 25,
        borderBottomLeftRadius: 35,
        borderBottomRightRadius: 35,
        zIndex: 10,
        shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 5, elevation: 5,
        borderWidth:2, borderColor:'#01a36a'
    },
    topAreaGreen: { backgroundColor: '#10B981' },
    topAreaRed: { backgroundColor: '#EF4444' },

    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 15 },
    headerTitle: { fontFamily: FONTS.bold, fontSize: 16, color: '#FFF', letterSpacing: 1, flex: 1, textAlign: 'center' },
    backBtn: { padding: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 14 },
    deleteHeaderBtn: { padding: 8, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 14 },

    searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', marginHorizontal: 20, borderRadius: 16, height: 50, paddingHorizontal: 5 },
    searchInput: { flex: 1, fontFamily: FONTS.regular, fontSize: 14, color: '#1E293B', marginLeft: 10 },
    listHeader: { fontFamily: FONTS.bold, fontSize: 14, color: '#64748B', marginBottom: 15, marginLeft: 5 },

    separatorContainer: { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
    separatorLine: { flex: 1, height: 1, backgroundColor: '#CBD5E1' },
    separatorBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#3B82F6', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginHorizontal: 10 },
    separatorText: { fontFamily: FONTS.bold, fontSize: 12, color: '#FFF', textTransform: 'uppercase', letterSpacing: 0.5 },

    cardWrapper: { marginBottom: 15, borderRadius: 24, position: 'relative' },
    cardShadow: { position: 'absolute', top: 6, left: 0, width: '100%', height: '100%', backgroundColor: '#000', borderRadius: 24, opacity: 0.05 },

    cardFront: {
        borderRadius: 24,
        borderWidth: 2,
        padding: 16, overflow: 'hidden'
    },
    cardSelectedScale: { transform: [{scale: 0.98}], opacity: 0.9 },
    selectionOverlay: { position: 'absolute', top: 15, right: 15, zIndex: 10 },

    iconBox: { width: 48, height: 48, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    cardTitle: { fontFamily: FONTS.bold, fontSize: 16, color: '#1E293B', flexShrink: 1 },

    systemBadge: { backgroundColor: '#F1F5F9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginLeft: 8, marginBottom: 4, alignSelf: 'flex-start', borderWidth: 1, borderColor: '#E2E8F0' },
    systemBadgeText: { fontSize: 9, fontWeight: 'bold', color: '#475569' },

    tagBase: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1 },
    tagText: { fontFamily: FONTS.bold, fontSize: 10, marginLeft: 4 },

    treasureBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-start', marginBottom: 10 },
    treasureGold: { backgroundColor: '#F59E0B' },
    treasurePurple: { backgroundColor: '#8B5CF6' },
    treasureText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },

    divider: { height: 1, marginVertical: 12 },
    metaInfoContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    metaTag: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
    metaText: { fontSize: 10, fontWeight: 'bold', marginLeft: 4 },

    emptyContainer: { alignItems: 'center', marginTop: 40, opacity: 0.7 },
    emptyText: { fontFamily: FONTS.bold, fontSize: 16, color: '#64748B', marginTop: 10 },
});