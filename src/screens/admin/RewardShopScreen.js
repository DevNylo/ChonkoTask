import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    Dimensions,
    Easing,
    FlatList,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { ICONS_CATALOG } from '../../constants/IconsCatalog';
import { supabase } from '../../lib/supabase';
import { FONTS } from '../../styles/theme';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;

const SHOP_THEME = { primary: '#8B5CF6', secondary: '#8B5CF6', light: '#F3E8FF', accent: '#F59E0B' };

const RARITY_OPTIONS = [
    { id: 'common', label: 'COMUM', color: '#10B981' },
    { id: 'rare', label: 'RARO', color: '#3B82F6' },
    { id: 'epic', label: 'ÉPICO', color: '#8B5CF6' },
    { id: 'legendary', label: 'LENDÁRIO', color: '#F59E0B' },
];

// MOEDA LIMPA: Usando o ícone nativo do Expo (MaterialCommunityIcons)
const AnimatedCoin = ({ size = 24, style = {} }) => {
    return (
        <View style={[styles.coinContainer, { width: size, height: size }, style]}>
            <View style={styles.coinImageFront}>
                <MaterialCommunityIcons name="circle-multiple" size={size} color="#F59E0B" />
            </View>
        </View>
    );
};

const GET_RARITY_THEME = (rarity) => {
    if (rarity === 'common') return { label: 'COMUM', bg: '#ECFDF5', border: '#047857', iconColor: '#064E3B', text: '#022C22', glow: 'transparent' };
    if (rarity === 'rare') return { label: 'RARO', bg: '#DBEAFE', border: '#60A5FA', iconColor: '#1E40AF', text: '#1E3A8A', glow: '#3B82F6' };
    if (rarity === 'epic') return { label: 'ÉPICO', bg: '#F3E8FF', border: '#A855F7', iconColor: '#581C87', text: '#4C1D95', glow: '#9333EA' };
    if (rarity === 'legendary') return { label: 'LENDÁRIO', bg: '#FEF08A', border: '#FBBF24', iconColor: '#78350F', text: '#451A03', glow: '#F59E0B' };
    return { label: 'COMUM', bg: '#ECFDF5', border: '#047857', iconColor: '#064E3B', text: '#022C22', glow: 'transparent' };
};

const ShimmerEffect = () => {
    const translateX = useRef(new Animated.Value(-CARD_WIDTH)).current;
    useEffect(() => {
        Animated.loop(Animated.sequence([
            Animated.timing(translateX, { toValue: CARD_WIDTH, duration: 2000, useNativeDriver: true, easing: Easing.linear }),
            Animated.delay(3000)
        ])).start();
    }, []);
    return (
        <Animated.View style={[styles.shimmerOverlay, { transform: [{ translateX }] }]}>
            <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.4)' }} />
        </Animated.View>
    );
};

export default function RewardShopScreen() {
    const navigation = useNavigation();
    const route = useRoute();
    const { profile: authProfile } = useAuth();

    const profile = route.params?.profile || authProfile;
    const familyId = route.params?.familyId || profile?.family_id;
    const isAdmin = profile?.role === 'admin';

    const [activeTab, setActiveTab] = useState('shop');
    const [shopName, setShopName] = useState('LOJINHA DO CHONKO');
    const [isShopOpen, setIsShopOpen] = useState(true);
    const [rewards, setRewards] = useState([]);
    const [salesList, setSalesList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [balance, setBalance] = useState(profile?.balance || 0);

    const [showItemModal, setShowItemModal] = useState(false);
    const [showSettingsMenu, setShowSettingsMenu] = useState(false);
    const [showRenameModal, setShowRenameModal] = useState(false);
    const [editingReward, setEditingReward] = useState(null);

    const [title, setTitle] = useState('');
    const [cost, setCost] = useState('');
    const [selectedIcon, setSelectedIcon] = useState('gift-outline');
    const [selectedCategory, setSelectedCategory] = useState(ICONS_CATALOG ? Object.keys(ICONS_CATALOG)[0] : 'rpg');
    const [selectedRarity, setSelectedRarity] = useState('common');
    const [stock, setStock] = useState('1');
    const [isInfinite, setIsInfinite] = useState(true);
    const [newShopName, setNewShopName] = useState('');

    useFocusEffect(useCallback(() => { loadInitialData(); }, [activeTab]));

    const loadInitialData = async () => {
        await fetchShopData();
        if (isAdmin) await fetchSales();
        else await fetchMyBalance();
        setLoading(false);
    };

    const fetchShopData = async () => {
        try {
            const { data: items } = await supabase.from('rewards').select('*').eq('family_id', familyId).order('cost', { ascending: true });
            setRewards(items || []);
            const { data: family } = await supabase.from('families').select('shop_name, is_shop_open').eq('id', familyId).single();
            if (family) { setShopName(family.shop_name || 'LOJINHA DO CHONKO'); setIsShopOpen(family.is_shop_open); }
        } catch (error) { console.log(error); }
    };

    const fetchSales = async () => {
        const { data } = await supabase
            .from('reward_requests')
            .select('*, rewards(title, icon, cost), profiles(name)')
            .eq('family_id', familyId)
            .order('created_at', { ascending: false });
        if (data) setSalesList(data);
    };

    const fetchMyBalance = async () => {
        const { data } = await supabase.from('profiles').select('balance').eq('id', profile.id).single();
        if (data) setBalance(data.balance);
    };

    const handleBuy = (item) => {
        if (!isShopOpen || (!item.is_infinite && item.stock <= 0)) return Alert.alert("Esgotado", "Este item acabou :(");
        if (balance < item.cost) return Alert.alert("Ops", "Moedas insuficientes.");
        Alert.alert("💎 Confirmar Compra", `Comprar "${item.title}"?\nPreço: ${item.cost} moedas.`, [
            { text: "Cancelar", style: "cancel" },
            { text: "COMPRAR", onPress: () => processPurchaseRPC(item) }
        ]);
    };

    const processPurchaseRPC = async (item) => {
        setLoading(true);
        try {
            const { data, error } = await supabase.rpc('buy_item', { p_profile_id: profile.id, p_reward_id: item.id });
            if (error) throw error;
            if (data.success) {
                setBalance(data.new_balance);
                Alert.alert("✨ Sucesso!", `"${item.title}" foi enviado para sua Bolsa!`);
                fetchShopData();
            } else { Alert.alert("Erro", data.error || "Erro na compra."); }
        } catch (error) { Alert.alert("Erro", "Falha de conexão."); } finally { setLoading(false); }
    };

    const handleRenameShop = async () => {
        if (!newShopName.trim()) return;
        await supabase.from('families').update({ shop_name: newShopName.trim() }).eq('id', familyId);
        setShopName(newShopName.trim());
        setShowRenameModal(false);
    };

    const toggleShopStatus = async () => {
        const newState = !isShopOpen;
        await supabase.from('families').update({ is_shop_open: newState }).eq('id', familyId);
        setIsShopOpen(newState);
        setShowSettingsMenu(false);
    };

    const handleSaveReward = async () => {
        if (!title.trim() || !cost) return Alert.alert("Ops", "Preencha tudo.");
        setSaving(true);
        const payload = {
            family_id: familyId,
            title: title.trim(),
            cost: parseInt(cost)||0,
            icon: selectedIcon,
            rarity: selectedRarity,
            is_infinite: isInfinite,
            stock: isInfinite ? 999 : (parseInt(stock)||0)
        };
        try {
            if (editingReward) await supabase.from('rewards').update(payload).eq('id', editingReward.id);
            else {
                const { error } = await supabase.from('rewards').insert([payload]);
                if (error) throw error;
            }
            setShowItemModal(false); resetForm(); fetchShopData();
        } catch (e) { Alert.alert("Erro ao salvar", e.message); } finally { setSaving(false); }
    };

    const handleDeleteReward = (id) => {
        setShowItemModal(false);
        Alert.alert("Excluir", "Remover este item?", [
            { text: "Não", style: 'cancel' },
            { text: "Sim, Excluir", style: 'destructive', onPress: async () => {
                    await supabase.from('rewards').delete().eq('id', id); fetchShopData();
                }}
        ]);
    };

    const handleDeliverItem = (item) => {
        if (item.status === 'completed') return;
        Alert.alert(
            "Entregar Prêmio",
            `Você já entregou "${item.rewards?.title || 'este item'}" para ${item.profiles?.name || 'o recruta'}?`,
            [
                { text: "Ainda Não", style: "cancel" },
                { text: "Sim, Entregue", onPress: async () => {
                        await supabase.from('reward_requests').update({ status: 'completed' }).eq('id', item.id);
                        fetchSales();
                    }}
            ]
        );
    };

    const openEditModal = (item) => {
        setEditingReward(item); setTitle(item.title); setCost(String(item.cost));
        setSelectedIcon(item.icon); setIsInfinite(item.is_infinite); setStock(String(item.stock));
        setSelectedRarity(item.rarity || 'common');
        setShowItemModal(true);
    };

    const resetForm = () => {
        setEditingReward(null); setTitle(''); setCost(''); setSelectedIcon('gift-outline');
        setIsInfinite(true); setStock('1'); setSelectedRarity('common');
    };

    const renderSalesItem = ({ item }) => {
        const itemCost = item.rewards?.cost || item.cost || 0;
        const purchaseDate = new Date(item.created_at);
        const formattedDate = `${purchaseDate.getDate().toString().padStart(2, '0')}/${(purchaseDate.getMonth()+1).toString().padStart(2, '0')} às ${purchaseDate.getHours().toString().padStart(2, '0')}:${purchaseDate.getMinutes().toString().padStart(2, '0')}`;

        const isDelivered = item.status === 'completed';

        return (
            <TouchableOpacity
                style={[styles.historyCard, isDelivered && { opacity: 0.6 }]}
                activeOpacity={0.7}
                onPress={() => handleDeliverItem(item)}
            >
                <View style={[styles.historyIconBox, isDelivered && { backgroundColor: '#F1F5F9', borderColor: '#E2E8F0' }]}>
                    <MaterialCommunityIcons
                        name={isDelivered ? "check-circle" : (item.rewards?.icon || 'gift')}
                        size={28}
                        color={isDelivered ? '#10B981' : SHOP_THEME.primary}
                    />
                </View>

                <View style={styles.historyInfo}>
                    <Text style={[styles.historyTitle, isDelivered && { textDecorationLine: 'line-through', color: '#94A3B8' }]} numberOfLines={1}>
                        {item.rewards?.title || "Item Removido"}
                    </Text>
                    <View style={[styles.historyBuyerRow, isDelivered && { backgroundColor: 'transparent', paddingHorizontal: 0 }]}>
                        <MaterialCommunityIcons name="account" size={12} color="#64748B" />
                        <Text style={styles.historyBuyerText}>{item.profiles?.name || "Recruta"}</Text>

                        {!isDelivered && (
                            <View style={styles.pendingBadge}>
                                <Text style={styles.pendingBadgeText}>Pendente</Text>
                            </View>
                        )}
                    </View>
                </View>

                <View style={styles.historyCostBox}>
                    <View style={styles.historyCostRow}>
                        <Text style={[styles.historyCostText, isDelivered && { color: '#94A3B8' }]}>-{itemCost}</Text>
                        <AnimatedCoin size={14} style={{marginLeft: 2}} />
                    </View>
                    <Text style={styles.historyDate}>{formattedDate}</Text>
                </View>
            </TouchableOpacity>
        );
    };

    const renderCard = ({ item }) => {
        const rarityTheme = GET_RARITY_THEME(item.rarity || 'common');
        const hasStock = item.is_infinite || item.stock > 0;
        const canBuy = isShopOpen && hasStock && balance >= item.cost;
        const isDisabled = !isShopOpen || !hasStock || (!canBuy && !isAdmin);
        const isEpicOrLeg = item.rarity === 'legendary' || item.rarity === 'epic';

        return (
            <TouchableOpacity style={styles.cardWrapper} activeOpacity={0.8} disabled={isDisabled && !isAdmin} onPress={() => isAdmin ? openEditModal(item) : handleBuy(item)}>
                {!isDisabled && isEpicOrLeg && (<View style={[styles.glowShadow, { backgroundColor: rarityTheme.glow }]} />)}

                <View style={[styles.cardFront, { borderColor: isDisabled ? '#E2E8F0' : rarityTheme.border, backgroundColor: isDisabled ? '#F8FAFC' : rarityTheme.bg }]}>
                    {!isDisabled && isEpicOrLeg && <ShimmerEffect />}
                    <View style={styles.cardContent}>
                        <View style={styles.topBadges}>
                            <View style={[styles.rarityBadge, { backgroundColor: isDisabled ? '#94A3B8' : rarityTheme.border }]}>
                                <Text style={styles.rarityText}>{rarityTheme.label}</Text>
                            </View>
                            {!item.is_infinite && (
                                <View style={[styles.stockBadge, { backgroundColor: item.stock < 3 ? '#EF4444' : 'rgba(0,0,0,0.5)' }]}>
                                    <Text style={styles.stockText}>{item.stock} un</Text>
                                </View>
                            )}
                        </View>
                        <View style={styles.iconArea}>
                            <View style={[styles.iconCircle, { borderColor: rarityTheme.iconColor, backgroundColor: 'rgba(255,255,255,0.4)' }]}>
                                <MaterialCommunityIcons name={item.icon} size={40} color={isDisabled ? '#94A3B8' : rarityTheme.iconColor} />
                            </View>
                        </View>
                        <Text style={[styles.cardTitle, { color: isDisabled ? '#94A3B8' : rarityTheme.text }]} numberOfLines={2}>{item.title}</Text>

                        <View style={[styles.priceButton, { backgroundColor: isDisabled ? '#CBD5E1' : rarityTheme.border }]}>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                {isAdmin && <MaterialCommunityIcons name="pencil" size={14} color="#FFF" style={{ marginRight: 6 }} />}
                                <AnimatedCoin size={16} style={{ marginRight: 6 }} />
                                <Text style={styles.priceButtonText}>{item.cost}</Text>
                            </View>
                        </View>

                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

            <View style={styles.headerContainer}>
                <View style={styles.topBar}>
                    {isAdmin ? (
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.circleBtn} activeOpacity={0.8}>
                            <MaterialCommunityIcons name="arrow-left" size={24} color="#FFF" />
                        </TouchableOpacity>
                    ) : (
                        <View style={{ height: 40 }} />
                    )}

                    {isAdmin && (
                        <TouchableOpacity style={styles.circleBtn} onPress={() => setShowSettingsMenu(true)} activeOpacity={0.8}>
                            <MaterialCommunityIcons name="cog" size={22} color="#FFF" />
                        </TouchableOpacity>
                    )}
                </View>

                <View style={styles.signWrapper}>
                    <View style={styles.solidSign}>
                        <Text style={styles.signText} numberOfLines={2}>{shopName}</Text>
                    </View>
                </View>

                {!isAdmin && activeTab === 'shop' && (
                    <View style={styles.balanceTag}>
                        <View style={styles.balanceInner}>
                            <AnimatedCoin size={22} style={{ marginRight: 8 }} />
                            <Text style={styles.balanceLabel}>SALDO:</Text>
                            <Text style={styles.balanceValue}>{balance}</Text>
                        </View>
                    </View>
                )}

                {!isShopOpen && <View style={styles.closedStrip}><Text style={styles.closedText}>FECHADO PARA BALANÇO</Text></View>}
            </View>

            <View style={styles.bodyContainer}>

                <View style={styles.tabContainer}>
                    <View style={styles.tabBar}>
                        <TouchableOpacity style={[styles.tabItem, activeTab === 'shop' && styles.tabActive]} onPress={() => setActiveTab('shop')} activeOpacity={0.8}>
                            <Text style={[styles.tabText, activeTab === 'shop' && styles.tabTextActive]}>VITRINE</Text>
                        </TouchableOpacity>
                        {isAdmin && (
                            <TouchableOpacity style={[styles.tabItem, activeTab === 'sales' && styles.tabActive]} onPress={() => setActiveTab('sales')} activeOpacity={0.8}>
                                <Text style={[styles.tabText, activeTab === 'sales' && styles.tabTextActive]}>HISTÓRICO</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                {activeTab === 'shop' && (
                    <FlatList
                        key="shop-grid-view"
                        data={rewards}
                        keyExtractor={item => item.id}
                        numColumns={2}
                        columnWrapperStyle={{ justifyContent: 'space-between' }}
                        contentContainerStyle={styles.gridContent}
                        showsVerticalScrollIndicator={false}
                        renderItem={renderCard}
                        ListEmptyComponent={<View style={styles.emptyState}><MaterialCommunityIcons name="store-off" size={40} color="#64748B"/><Text style={styles.emptyText}>Nada na vitrine hoje.</Text></View>}
                    />
                )}

                {activeTab === 'sales' && (
                    <FlatList
                        key="sales-list-view"
                        data={salesList}
                        keyExtractor={item => item.id}
                        contentContainerStyle={styles.listContent}
                        showsVerticalScrollIndicator={false}
                        renderItem={renderSalesItem}
                        ListHeaderComponent={
                            salesList.length > 0 ? (
                                <Text style={styles.historyInstruction}>Toque num pedido pendente para marcá-lo como entregue.</Text>
                            ) : null
                        }
                        ListEmptyComponent={<View style={styles.emptyState}><MaterialCommunityIcons name="history" size={40} color="#64748B"/><Text style={styles.emptyText}>Nenhuma venda ainda.</Text></View>}
                    />
                )}
            </View>

            {isAdmin && activeTab === 'shop' && (
                <TouchableOpacity style={styles.fab} activeOpacity={0.9} onPress={() => { resetForm(); setShowItemModal(true); }}>
                    <View style={styles.fabSolid}>
                        <MaterialCommunityIcons name="plus" size={32} color="#FFF" />
                    </View>
                </TouchableOpacity>
            )}

            <Modal visible={showItemModal} transparent animationType="slide" onRequestClose={() => setShowItemModal(false)}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>{editingReward ? "EDITAR ITEM" : "NOVO ITEM"}</Text>

                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>NOME DO ITEM</Text>
                            <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="Ex: Sorvete" placeholderTextColor="#94A3B8" maxLength={30} />
                        </View>

                        <View style={styles.row}>
                            <View style={{flex: 1, marginRight: 10}}>
                                <Text style={styles.label}>PREÇO</Text>
                                <View style={styles.inputWithIcon}>
                                    <View style={styles.iconInputContainer}><AnimatedCoin size={20} /></View>
                                    <TextInput style={styles.inputClean} keyboardType="number-pad" value={cost} onChangeText={setCost} placeholder="0" maxLength={5} />
                                </View>
                            </View>

                            <View style={{flex: 1}}>
                                <Text style={styles.label}>ESTOQUE</Text>
                                <View style={[styles.inputWithIcon, { justifyContent: 'space-between' }]}>
                                    {isInfinite ? <MaterialCommunityIcons name="infinity" size={24} color="#64748B" /> : <TextInput style={styles.inputClean} keyboardType="number-pad" value={stock} onChangeText={setStock} placeholder="Qtd" maxLength={3} />}
                                    <Switch trackColor={{ false: "#E2E8F0", true: SHOP_THEME.light }} thumbColor={isInfinite ? SHOP_THEME.secondary : "#f4f3f4"} value={isInfinite} onValueChange={setIsInfinite} />
                                </View>
                            </View>
                        </View>

                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>VALIOSIDADE DO PRÊMIO</Text>
                            <View style={styles.rarityRow}>
                                {RARITY_OPTIONS.map(opt => (
                                    <TouchableOpacity
                                        key={opt.id}
                                        style={[styles.rarityBtn, selectedRarity === opt.id && { backgroundColor: opt.color, borderColor: opt.color }]}
                                        onPress={() => setSelectedRarity(opt.id)}
                                        activeOpacity={0.8}
                                    >
                                        <Text style={[styles.rarityBtnText, selectedRarity === opt.id && { color: '#FFF' }]}>{opt.label}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>CATEGORIA & ÍCONE</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 10 }}>
                                {ICONS_CATALOG && Object.keys(ICONS_CATALOG).map(cat => (
                                    <TouchableOpacity key={cat} style={[styles.categoryChip, selectedCategory === cat && styles.categoryChipSelected]} onPress={() => setSelectedCategory(cat)}>
                                        <Text style={[styles.categoryText, selectedCategory === cat && styles.categoryTextSelected]}>{cat.toUpperCase()}</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>

                            <View style={styles.iconGridContainer}>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{paddingVertical: 5}}>
                                    {ICONS_CATALOG && ICONS_CATALOG[selectedCategory] ? ICONS_CATALOG[selectedCategory].map(icon => (
                                        <TouchableOpacity key={icon} style={[styles.iconOption, selectedIcon === icon && styles.iconOptionSelected]} onPress={() => setSelectedIcon(icon)}>
                                            <MaterialCommunityIcons name={icon} size={28} color={selectedIcon === icon ? '#FFF' : SHOP_THEME.primary} />
                                        </TouchableOpacity>
                                    )) : <Text style={{color: '#999'}}>Carregando...</Text>}
                                </ScrollView>
                            </View>
                        </View>

                        <View style={styles.modalActions}>
                            {editingReward && (
                                <TouchableOpacity style={[styles.modalBtn, { backgroundColor: '#FEE2E2', width: 50 }]} onPress={() => handleDeleteReward(editingReward.id)}>
                                    <MaterialCommunityIcons name="trash-can-outline" size={24} color="#DC2626" />
                                </TouchableOpacity>
                            )}
                            <TouchableOpacity style={[styles.modalBtn, { backgroundColor: '#F1F5F9', flex: 1 }]} onPress={() => setShowItemModal(false)}>
                                <Text style={styles.modalCancelText}>CANCELAR</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.modalBtn, { backgroundColor: SHOP_THEME.secondary, flex: 2 }]} onPress={handleSaveReward}>
                                {saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.modalConfirmText}>SALVAR</Text>}
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            <Modal visible={showRenameModal} transparent animationType="fade" statusBarTranslucent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>RENOMEAR LOJA</Text>
                        <TextInput style={styles.input} value={newShopName} onChangeText={setNewShopName} maxLength={25} autoFocus />
                        <View style={styles.modalActions}>
                            <TouchableOpacity style={[styles.modalBtn, {backgroundColor: '#F1F5F9', flex:1}]} onPress={() => setShowRenameModal(false)}>
                                <Text style={styles.modalCancelText}>CANCELAR</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.modalBtn, {backgroundColor: SHOP_THEME.secondary, flex:1}]} onPress={handleRenameShop}>
                                <Text style={styles.modalConfirmText}>SALVAR</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            <Modal visible={showSettingsMenu} transparent animationType="fade" statusBarTranslucent>
                <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowSettingsMenu(false)}>
                    <View style={styles.settingsMenu}>
                        <Text style={styles.menuHeader}>CONFIGURAÇÕES</Text>
                        <TouchableOpacity style={styles.menuItem} onPress={() => { setShowSettingsMenu(false); setShowRenameModal(true); }}>
                            <MaterialCommunityIcons name="pencil" size={24} color="#64748B" />
                            <Text style={styles.menuText}>Renomear Loja</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.menuItem} onPress={toggleShopStatus}>
                            <MaterialCommunityIcons name={isShopOpen ? "door-closed" : "door-open"} size={24} color={isShopOpen ? "#EF4444" : "#10B981"} />
                            <Text style={[styles.menuText, {color: isShopOpen ? '#EF4444' : '#10B981'}]}>{isShopOpen ? "Fechar Loja" : "Reabrir Loja"}</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    coinContainer: { justifyContent: 'center', alignItems: 'center', position: 'relative' },
    coinImageFront: { zIndex: 2 },

    container: { flex: 1, backgroundColor: '#FDFCF8' },

    headerContainer: {
        backgroundColor: SHOP_THEME.primary,
        paddingBottom: 20,
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
        borderWidth: 2,
        borderColor: '#6D28D9',
        elevation: 8,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 5,
        zIndex: 10
    },

    topBar: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 50 },
    circleBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },

    signWrapper: { alignItems: 'center', marginTop: 10, marginBottom: 15 },
    solidSign: { backgroundColor: '#F59E0B', paddingHorizontal: 30, paddingVertical: 15, borderRadius: 20, borderWidth: 3, borderColor: '#B45309', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 5, elevation: 5 },
    signText: { fontFamily: FONTS.bold, fontSize: 22, color: '#451A03', textAlign: 'center', letterSpacing: 1 },

    balanceTag: { alignSelf: 'center', marginTop: 5 },
    balanceInner: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
    balanceLabel: { color: '#E2E8F0', fontSize: 10, fontFamily: FONTS.bold, marginHorizontal: 6 },
    balanceValue: { color: '#FCD34D', fontSize: 16, fontFamily: FONTS.bold },
    closedStrip: { backgroundColor: '#EF4444', padding: 5, alignItems: 'center', marginTop: 10 },
    closedText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },

    bodyContainer: { flex: 1, marginTop: 15 },

    tabContainer: { alignItems: 'center', marginBottom: 10 },
    tabBar: {
        flexDirection: 'row',
        justifyContent: 'center',
        backgroundColor: '#FFF',
        borderRadius: 25,
        padding: 4,
        borderWidth: 1,
        borderColor: '#E2E8F0'
    },
    tabItem: {
        paddingVertical: 8,
        paddingHorizontal: 25,
        borderRadius: 20,
        marginHorizontal: 2,
        backgroundColor: 'transparent'
    },
    tabActive: {
        backgroundColor: SHOP_THEME.light,
        borderWidth: 1,
        borderColor: SHOP_THEME.secondary
    },
    tabText: { color: '#64748B', fontSize: 12, fontWeight: 'bold' },
    tabTextActive: { color: SHOP_THEME.primary },

    gridContent: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 100 },
    listContent: { paddingHorizontal: 20, paddingBottom: 100, paddingTop: 10 },

    historyInstruction: { fontFamily: FONTS.medium, fontSize: 11, color: '#94A3B8', textAlign: 'center', marginBottom: 15 },
    historyCard: { flexDirection: 'row', backgroundColor: '#FFF', padding: 15, borderRadius: 16, marginBottom: 12, alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0', elevation: 2 },
    historyIconBox: { width: 48, height: 48, backgroundColor: '#F8FAFC', borderRadius: 16, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0' },
    historyInfo: { flex: 1, marginLeft: 15, justifyContent: 'center' },
    historyTitle: { fontFamily: FONTS.bold, fontSize: 15, color: '#1E293B', marginBottom: 4 },
    historyBuyerRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1F5F9', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    historyBuyerText: { fontSize: 10, fontFamily: FONTS.bold, color: '#64748B', marginLeft: 4 },
    historyCostBox: { alignItems: 'flex-end', justifyContent: 'center' },
    historyCostRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
    historyCostText: { fontFamily: FONTS.bold, fontSize: 16, color: '#EF4444' },
    historyDate: { fontSize: 10, fontFamily: FONTS.regular, color: '#94A3B8' },

    pendingBadge: { backgroundColor: '#FEF3C7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginLeft: 8, borderWidth: 1, borderColor: '#FDE68A' },
    pendingBadgeText: { fontSize: 8, fontFamily: FONTS.bold, color: '#D97706' },

    cardWrapper: { width: CARD_WIDTH, marginBottom: 20, borderRadius: 20, marginTop: 10 },
    cardFront: { borderRadius: 20, overflow: 'hidden', borderWidth: 1.5, minHeight: 200, elevation: 2 },
    glowShadow: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 20, opacity: 0.6, transform: [{scale: 1.05}] },
    cardContent: { flex: 1, padding: 10, alignItems: 'center', justifyContent: 'space-between' },
    topBadges: { width: '100%', flexDirection: 'row', justifyContent: 'space-between' },
    rarityBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
    rarityText: { fontSize: 8, fontWeight: 'bold', color: '#FFF' },
    stockBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
    stockText: { fontSize: 8, fontWeight: 'bold', color: '#FFF' },
    iconArea: { marginTop: 10, marginBottom: 10, alignItems: 'center', justifyContent: 'center' },
    iconCircle: { width: 70, height: 70, borderRadius: 35, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
    cardTitle: { fontSize: 14, fontFamily: FONTS.bold, textAlign: 'center', marginBottom: 10 },
    priceButton: { flexDirection: 'row', paddingVertical: 8, paddingHorizontal: 20, borderRadius: 15, alignItems: 'center', justifyContent: 'center', width: '100%', elevation: 1 },
    priceButtonText: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },
    shimmerOverlay: { position: 'absolute', top: 0, left: 0, bottom: 0, width: 100, zIndex: 10, transform: [{ skewX: '-20deg' }] },

    fab: { position: 'absolute', bottom: 30, right: 20, borderRadius: 30, elevation: 8 },
    fabSolid: { width: 60, height: 60, borderRadius: 30, backgroundColor: SHOP_THEME.secondary, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#FFF' },

    emptyState: { alignItems: 'center', marginTop: 50 },
    emptyText: { color: '#94A3B8', marginTop: 10, fontFamily: FONTS.bold },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 20 },
    modalContent: { backgroundColor: '#FFF', borderRadius: 24, padding: 20, elevation: 5 },
    modalTitle: { fontSize: 18, fontFamily: FONTS.bold, textAlign: 'center', marginBottom: 20, color: SHOP_THEME.primary },
    inputContainer: { marginBottom: 15 },
    label: { fontSize: 12, fontFamily: FONTS.bold, color: '#64748B', marginBottom: 6 },
    input: { backgroundColor: '#F1F5F9', borderRadius: 12, paddingHorizontal: 12, height: 50, borderWidth: 1, borderColor: '#E2E8F0', color: '#334155', fontFamily: FONTS.medium },
    inputWithIcon: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1F5F9', borderRadius: 12, paddingHorizontal: 12, height: 50, borderWidth: 1, borderColor: '#E2E8F0' },
    iconInputContainer: { width: 24, height: 24, justifyContent: 'center', alignItems: 'center', marginRight: 8, backgroundColor: 'transparent' },
    inputClean: { flex: 1, color: '#334155', fontFamily: FONTS.bold, height: '100%' },
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },

    rarityRow: { flexDirection: 'row', gap: 5 },
    rarityBtn: { flex: 1, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', alignItems: 'center', backgroundColor: '#F8FAFC' },
    rarityBtnText: { fontSize: 10, fontFamily: FONTS.bold, color: '#64748B' },

    categoryChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 15, backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0', marginRight: 0 },
    categoryChipSelected: { backgroundColor: SHOP_THEME.light, borderColor: SHOP_THEME.secondary },
    categoryText: { fontSize: 10, fontFamily: FONTS.bold, color: '#64748B' },
    categoryTextSelected: { color: SHOP_THEME.primary },
    iconGridContainer: { backgroundColor: '#F8FAFC', borderRadius: 12, padding: 8, borderWidth: 1, borderColor: '#E2E8F0', minHeight: 60 },
    iconOption: { width: 50, height: 50, borderRadius: 25, borderWidth: 1, borderColor: '#DDD', justifyContent: 'center', alignItems: 'center', marginRight: 10, backgroundColor: '#FFF' },
    iconOptionSelected: { backgroundColor: SHOP_THEME.secondary, borderColor: SHOP_THEME.secondary, borderWidth: 0 },
    modalActions: { flexDirection: 'row', gap: 10, marginTop: 15 },
    modalBtn: { paddingVertical: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    modalCancelText: { fontFamily: FONTS.bold, color: '#64748B' },
    modalConfirmText: { fontFamily: FONTS.bold, color: '#FFF' },

    settingsMenu: { backgroundColor: '#FFF', width: '80%', borderRadius: 24, padding: 20, elevation: 10, alignSelf: 'center' },
    menuHeader: { fontFamily: FONTS.bold, marginBottom: 15, textAlign: 'center', color: '#334155', fontSize: 16 },
    menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
    menuText: { marginLeft: 10, fontFamily: FONTS.bold, color: '#334155', fontSize: 14 }
});