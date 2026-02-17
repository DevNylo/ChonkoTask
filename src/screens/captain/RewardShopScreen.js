import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    FlatList,
    ImageBackground,
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
import { supabase } from '../../lib/supabase';
import { FONTS, COLORS } from '../../styles/theme'; 
// AQUI ESTÁ A IMPORTAÇÃO CORRETA:
import { ICONS_CATALOG } from '../../constants/IconsCatalog';

const SIGNBOARD_IMG = require('../../../assets/images/ShopSign.png');
const BACKGROUND_IMG = require('../../../assets/GenericBKG3.png'); 

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 60) / 2;

const SHOP_THEME = {
    primary: '#4C1D95',   
    secondary: '#7C3AED', 
    light: '#C4B5FD', 
    accent: '#F59E0B',    
};

const GET_PRICE_TIER = (cost) => {
    if (cost < 100) return { 
        label: 'COMUM', 
        colors: ['#FFFFFF', '#F0FDF4'], 
        border: '#16A34A', 
        iconColor: '#10B981', 
        text: '#064E3B' 
    };
    if (cost < 500) return { 
        label: 'RARO', 
        colors: ['#F0F9FF', '#DBEAFE'], 
        border: '#60A5FA', 
        iconColor: '#2563EB', 
        text: '#1E3A8A' 
    };
    if (cost < 1000) return { 
        label: 'ÉPICO', 
        colors: ['#F3E8FF', '#D8B4FE'], 
        border: '#A855F7', 
        iconColor: '#9333EA', 
        text: '#581C87' 
    };
    return { 
        label: 'LENDÁRIO', 
        colors: ['#FFF7ED', '#FCD34D'], 
        border: '#D97706', 
        iconColor: '#B45309', 
        text: '#78350F' 
    };
};

export default function RewardShopScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { familyId, profile } = route.params || {}; 
  const isCaptain = profile?.role === 'captain';

  const [activeTab, setActiveTab] = useState('shop'); 
  const [shopName, setShopName] = useState('LOJINHA DO CHONKO');
  const [isShopOpen, setIsShopOpen] = useState(true);
  
  const [rewards, setRewards] = useState([]);
  const [myPurchases, setMyPurchases] = useState([]);
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
  const [selectedCategory, setSelectedCategory] = useState('rpg'); 
  const [newShopName, setNewShopName] = useState('');
  const [stock, setStock] = useState('1'); 
  const [isInfinite, setIsInfinite] = useState(true);

  const pendingCount = salesList.filter(item => item.status === 'pending').length;

  useFocusEffect(useCallback(() => { loadInitialData(); }, [activeTab]));

  useEffect(() => {
    const rewardsSub = supabase.channel('public:rewards').on('postgres_changes', { event: '*', schema: 'public', table: 'rewards', filter: `family_id=eq.${familyId}` }, () => fetchShopData()).subscribe();
    const requestsSub = supabase.channel('public:requests').on('postgres_changes', { event: '*', schema: 'public', table: 'reward_requests', filter: `family_id=eq.${familyId}` }, () => { if(isCaptain) fetchSales(); else fetchMyPurchases(); }).subscribe();
    const familiesSub = supabase.channel('public:families').on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'families', filter: `id=eq.${familyId}` }, (payload) => {
        if (payload.new.shop_name) setShopName(payload.new.shop_name);
        if (payload.new.is_shop_open !== undefined) setIsShopOpen(payload.new.is_shop_open);
    }).subscribe();
    return () => { supabase.removeChannel(rewardsSub); supabase.removeChannel(familiesSub); supabase.removeChannel(requestsSub); };
  }, []);

  const loadInitialData = async () => { await fetchShopData(); if (isCaptain) await fetchSales(); else { await fetchMyBalance(); await fetchMyPurchases(); } setLoading(false); };
  const fetchShopData = async () => { try { const { data: items } = await supabase.from('rewards').select('*').eq('family_id', familyId).order('cost', { ascending: true }); setRewards(items || []); const { data: family } = await supabase.from('families').select('shop_name, is_shop_open').eq('id', familyId).single(); if (family) { setShopName(family.shop_name || 'LOJINHA DO CHONKO'); setIsShopOpen(family.is_shop_open); } } catch (error) { console.log(error); } };
  const fetchMyPurchases = async () => { const { data } = await supabase.from('reward_requests').select('*, rewards(title, icon)').eq('profile_id', profile.id).order('created_at', { ascending: false }); if (data) setMyPurchases(data); };
  const fetchSales = async () => { const { data } = await supabase.from('reward_requests').select('*, rewards(title, icon), profiles(name)').eq('family_id', familyId).order('created_at', { ascending: false }); if (data) setSalesList(data); };
  const fetchMyBalance = async () => { const { data } = await supabase.from('profiles').select('balance').eq('id', profile.id).single(); if (data) setBalance(data.balance); };
  
  const handleBuy = (item) => { if (!isShopOpen || (!item.is_infinite && item.stock <= 0) || balance < item.cost) return Alert.alert("Ops", "Não é possível comprar."); Alert.alert("Resgatar", `Comprar "${item.title}"?`, [{ text: "Cancelar" }, { text: "Sim", onPress: () => processPurchase(item) }]); };
  const processPurchase = async (item) => { setLoading(true); try { await supabase.from('reward_requests').insert([{ family_id: familyId, profile_id: profile.id, reward_id: item.id, cost: item.cost, status: 'pending' }]); const newBalance = balance - item.cost; await supabase.from('profiles').update({ balance: newBalance }).eq('id', profile.id); setBalance(newBalance); if (!item.is_infinite) await supabase.from('rewards').update({ stock: item.stock - 1 }).eq('id', item.id); fetchShopData(); Alert.alert("Sucesso!", "Pedido enviado!"); } catch (error) { Alert.alert("Erro", "Falha na compra."); } finally { setLoading(false); } };
  
  const handleApproveSale = async (item) => { await supabase.from('reward_requests').update({ status: 'approved' }).eq('id', item.id); fetchSales(); };
  const handleRejectSale = async (item) => { await supabase.from('reward_requests').update({ status: 'rejected' }).eq('id', item.id); const { data: userProfile } = await supabase.from('profiles').select('balance').eq('id', item.profile_id).single(); if (userProfile) await supabase.from('profiles').update({ balance: userProfile.balance + item.cost }).eq('id', item.profile_id); fetchSales(); };
  const handleRenameShop = async () => { if (!newShopName.trim()) return; await supabase.from('families').update({ shop_name: newShopName.trim() }).eq('id', familyId); setShopName(newShopName.trim()); setShowRenameModal(false); };
  const toggleShopStatus = async () => { const newState = !isShopOpen; await supabase.from('families').update({ is_shop_open: newState }).eq('id', familyId); setIsShopOpen(newState); setShowSettingsMenu(false); };
  
  const handleSaveReward = async () => { 
      if (!title.trim() || !cost) return Alert.alert("Ops", "Preencha tudo."); 
      setSaving(true); 
      const payload = { family_id: familyId, title: title.trim(), cost: parseInt(cost)||0, icon: selectedIcon, is_infinite: isInfinite, stock: isInfinite ? 999 : (parseInt(stock)||0) }; 
      try { 
          if (editingReward) await supabase.from('rewards').update(payload).eq('id', editingReward.id); 
          else await supabase.from('rewards').insert([payload]); 
          setShowItemModal(false); resetForm(); fetchShopData(); 
      } catch (e) { } finally { setSaving(false); } 
  };
  const handleDeleteReward = (id) => { 
      setShowItemModal(false);
      Alert.alert("Excluir Item", "Tem certeza que deseja remover este item?", [
          { text: "Cancelar", style: "cancel", onPress: () => setShowItemModal(true) },
          { text: "Excluir", style: 'destructive', onPress: async () => { await supabase.from('rewards').delete().eq('id', id); fetchShopData(); }}
      ]); 
  };
  
  const openEditModal = (item) => { setEditingReward(item); setTitle(item.title); setCost(String(item.cost)); setSelectedIcon(item.icon); setIsInfinite(item.is_infinite); setStock(String(item.stock)); setShowItemModal(true); };
  const resetForm = () => { setEditingReward(null); setTitle(''); setCost(''); setSelectedIcon('gift-outline'); setIsInfinite(true); setStock('1'); };

  const renderSalesItem = ({ item }) => (
    <View style={styles.historyCard}>
        <View style={styles.historyIconBox}><MaterialCommunityIcons name={item.rewards?.icon || 'gift'} size={24} color={SHOP_THEME.secondary} /></View>
        <View style={{flex: 1, marginLeft: 12}}><Text style={styles.historyTitle}>{item.rewards?.title}</Text><View style={{flexDirection:'row', alignItems:'center'}}><MaterialCommunityIcons name="account" size={12} color="#9CA3AF" /><Text style={styles.historyDate}> {item.profiles?.name}</Text></View></View>
        {item.status === 'pending' ? (<View style={{flexDirection: 'row', gap: 8}}><TouchableOpacity style={[styles.actionBtn, {backgroundColor: '#FEE2E2', borderColor: '#FECACA'}]} onPress={() => handleRejectSale(item)}><MaterialCommunityIcons name="close" size={20} color="#DC2626" /></TouchableOpacity><TouchableOpacity style={[styles.actionBtn, {backgroundColor: '#D1FAE5', borderColor: '#34D399'}]} onPress={() => handleApproveSale(item)}><MaterialCommunityIcons name="check" size={20} color="#059669" /></TouchableOpacity></View>) : <View style={[styles.statusBadge, { backgroundColor: item.status === 'approved' ? '#ECFDF5' : '#FEF2F2', borderColor: item.status === 'approved' ? '#34D399' : '#F87171' }]}><Text style={[styles.statusText, { color: item.status === 'approved' ? '#059669' : '#DC2626' }]}>{item.status === 'approved' ? 'ENTREGUE' : 'DEVOLVIDO'}</Text></View>}
    </View>
  );

  const renderHistoryItem = ({ item }) => (
    <View style={styles.historyCard}>
        <View style={styles.historyIconBox}><MaterialCommunityIcons name={item.rewards?.icon || 'gift'} size={24} color={SHOP_THEME.secondary} /></View>
        <View style={{flex: 1, marginLeft: 12}}><Text style={styles.historyTitle}>{item.rewards?.title}</Text><Text style={styles.historyDate}>{new Date(item.created_at).toLocaleDateString('pt-BR')}</Text></View>
        <View style={[styles.statusBadge, { backgroundColor: item.status === 'approved' ? '#D1FAE5' : item.status === 'pending' ? '#FEF3C7' : '#FEE2E2', borderColor: item.status === 'approved' ? '#34D399' : item.status === 'pending' ? '#FBBF24' : '#F87171' }]}>
            <Text style={[styles.statusText, { color: item.status === 'approved' ? '#065F46' : item.status === 'pending' ? '#92400E' : '#991B1B' }]}>{item.status === 'approved' ? 'CHEGOU!' : item.status === 'pending' ? 'ESPERANDO' : 'RECUSADO'}</Text>
        </View>
    </View>
  );

  const renderCard = ({ item }) => {
      const tier = GET_PRICE_TIER(item.cost);
      const hasStock = item.is_infinite || item.stock > 0;
      const canBuy = isShopOpen && hasStock && balance >= item.cost;
      const isDisabled = !isShopOpen || !hasStock || (!canBuy && !isCaptain);
      const gradientColors = isDisabled ? ['#F3F4F6', '#E5E7EB'] : tier.colors;
      const borderColor = isDisabled ? '#D1D5DB' : tier.border;
      const textColor = isDisabled ? '#9CA3AF' : tier.text;
      const iconColor = isDisabled ? '#9CA3AF' : tier.iconColor;

      return (
        <TouchableOpacity style={styles.cardWrapper} activeOpacity={0.9} disabled={isDisabled && !isCaptain} onPress={() => isCaptain ? openEditModal(item) : handleBuy(item)}>
            <View style={[styles.cardShadow, { backgroundColor: iconColor, opacity: item.cost > 500 ? 0.3 : 0.15 }]} />
            <View style={[styles.cardFront, { borderColor: borderColor }]}>
                <LinearGradient colors={gradientColors} style={StyleSheet.absoluteFill} start={{ x: 0.1, y: 0.1 }} end={{ x: 0.9, y: 0.9 }} />
                <View style={styles.cardContentContainer}>
                    <View style={{alignItems: 'center', width: '100%'}}>
                        {!item.is_infinite && item.stock > 0 && item.stock <= 3 && <View style={styles.lowStockBadge}><Text style={styles.lowStockText}>RESTAM {item.stock}</Text></View>}
                        {isCaptain && (
                            <View style={[styles.stockBadge, { backgroundColor: '#FFF', borderColor: tier.iconColor }]}>
                                <Text style={[styles.stockText, { color: tier.text }]}>{item.is_infinite ? "∞" : `${item.stock}`}</Text>
                            </View>
                        )}
                        <View style={[styles.pedestalContainer, isDisabled && { opacity: 0.6 }]}>
                            {!isDisabled && item.cost >= 500 && <View style={[styles.glowEffect, { backgroundColor: iconColor }]} />}
                            <MaterialCommunityIcons name={item.icon} size={42} color={iconColor} style={{zIndex: 2}} />
                        </View>
                        <Text style={[styles.cardTitle, { color: textColor }]} numberOfLines={2}>{item.title}</Text>
                    </View>
                    <View style={{width: '100%', alignItems: 'center'}}>
                        <View style={[styles.priceTag, { backgroundColor: isDisabled ? 'rgba(255,255,255,0.5)' : '#FFF', borderColor: borderColor }]}>
                            <MaterialCommunityIcons name="treasure-chest" size={16} color={isDisabled ? '#9CA3AF' : '#F59E0B'} />
                            <Text style={[styles.priceText, { color: isDisabled ? '#9CA3AF' : '#B45309' }]}>{item.cost}</Text>
                        </View>
                        <View style={[styles.buyButton, { backgroundColor: iconColor }]}>
                            {isCaptain ? <Text style={styles.buyText}>EDITAR</Text> : <Text style={[styles.buyText, isDisabled && {color: '#FFF'}]}>{!isShopOpen ? "FECHADO" : !hasStock ? "ESGOTADO" : canBuy ? "COMPRAR" : "FALTA GRANA"}</Text>}
                        </View>
                    </View>
                </View>
            </View>
        </TouchableOpacity>
      );
  };

  return (
    <ImageBackground source={BACKGROUND_IMG} style={styles.container} resizeMode="repeat">
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <View style={styles.shopHeaderBackground}>
          <View style={styles.headerTopRow}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn} hitSlop={{top:15, bottom:15, left:15, right:15}}><MaterialCommunityIcons name="arrow-left" size={24} color="#FFF" /></TouchableOpacity>
            {isCaptain && <TouchableOpacity style={styles.iconBtn} onPress={() => setShowSettingsMenu(true)} hitSlop={{top:15, bottom:15, left:15, right:15}}><MaterialCommunityIcons name="cog-outline" size={24} color="#FFF" /></TouchableOpacity>}
          </View>
          <View style={styles.signContainer} pointerEvents="none"><ImageBackground source={SIGNBOARD_IMG} style={styles.signImage} resizeMode="contain"><Text style={styles.signText} numberOfLines={2} adjustsFontSizeToFit>{shopName}</Text></ImageBackground></View>
          {!isCaptain && activeTab === 'shop' && <View style={styles.balanceContainer}><Text style={styles.balanceLabel}>SEU SALDO</Text><View style={styles.balanceValueRow}><MaterialCommunityIcons name="circle-multiple" size={24} color="#F59E0B" /><Text style={styles.balanceText}>{balance}</Text></View></View>}
          {!isShopOpen && <View style={styles.closedBanner}><Text style={styles.closedText}>⚠️ LOJA FECHADA ⚠️</Text></View>}
      </View>
      <View style={styles.glassContainer}>
          <BlurView intensity={80} tint="light" style={StyleSheet.absoluteFill} />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255,255,255,0.4)' }]} />
          <View style={styles.tabWrapper}><View style={styles.tabContainer}><TouchableOpacity style={[styles.tab, activeTab === 'shop' && styles.activeTab]} onPress={() => setActiveTab('shop')}><Text style={[styles.tabText, activeTab === 'shop' ? styles.activeTabText : styles.inactiveTabText]}>VITRINE</Text></TouchableOpacity><TouchableOpacity style={[styles.tab, (activeTab === 'history' || activeTab === 'sales') && styles.activeTab]} onPress={() => setActiveTab(isCaptain ? 'sales' : 'history')}><Text style={[styles.tabText, (activeTab === 'history' || activeTab === 'sales') ? styles.activeTabText : styles.inactiveTabText]}>{isCaptain ? 'VENDAS' : 'MEUS PEDIDOS'}</Text>{isCaptain && pendingCount > 0 && <View style={styles.tabBadge}><Text style={styles.tabBadgeText}>{pendingCount}</Text></View>}</TouchableOpacity></View></View>
          {activeTab === 'shop' ? (<FlatList key="shop-grid" data={rewards} keyExtractor={item => item.id} numColumns={2} columnWrapperStyle={styles.listColumns} contentContainerStyle={styles.listContent} renderItem={renderCard} ListEmptyComponent={<View style={styles.emptyState}>{loading ? <ActivityIndicator color={SHOP_THEME.primary} /> : <Text style={[styles.emptyText, {color: SHOP_THEME.primary}]}>A vitrine está vazia.</Text>}</View>} />) : (<FlatList key="list-view" data={isCaptain ? salesList : myPurchases} keyExtractor={item => item.id} contentContainerStyle={styles.listContent} renderItem={isCaptain ? renderSalesItem : renderHistoryItem} ListEmptyComponent={<View style={styles.emptyState}><Text style={[styles.emptyText, {color: SHOP_THEME.primary}]}>{isCaptain ? 'Nenhuma venda.' : 'Nada comprado.'}</Text></View>} />)}
      </View>
      {isCaptain && activeTab === 'shop' && <TouchableOpacity style={styles.fab} activeOpacity={0.9} onPress={() => { resetForm(); setShowItemModal(true); }}><View style={styles.fabInner}><MaterialCommunityIcons name="plus" size={32} color="#FFF" /></View></TouchableOpacity>}

      <Modal visible={showItemModal} transparent animationType="slide" onRequestClose={() => setShowItemModal(false)}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                  <Text style={styles.modalTitle}>{editingReward ? "EDITAR" : "NOVO ITEM"}</Text>
                  <View style={styles.inputGroup}><Text style={styles.label}>NOME DO ITEM</Text><TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="Ex: Sorvete" placeholderTextColor="#9CA3AF" /></View>
                  <View style={styles.row}>
                      <View style={{flex: 1, marginRight: 15}}><Text style={styles.label}>PREÇO</Text><View style={styles.currencyInputWrapper}><MaterialCommunityIcons name="circle-multiple" size={20} color={SHOP_THEME.accent} style={{marginRight:8}} /><TextInput style={styles.currencyInput} keyboardType="number-pad" value={cost} onChangeText={(text) => { const numeric = text.replace(/[^0-9]/g, ''); if (Number(numeric) > 9999) { setCost('9999'); } else { setCost(numeric); } }} placeholder="0" placeholderTextColor="#9CA3AF" maxLength={4} /></View></View>
                      <View style={{flex: 1}}><Text style={styles.label}>ESTOQUE</Text><View style={styles.stockInputWrapper}>{isInfinite ? (<View style={styles.infinitePlaceholder}><MaterialCommunityIcons name="infinity" size={24} color="#9CA3AF" /></View>) : (<TextInput style={styles.stockInput} keyboardType="number-pad" value={stock} onChangeText={(text) => { const numeric = text.replace(/[^0-9]/g, ''); if (Number(numeric) > 99) { setStock('99'); } else { setStock(numeric); } }} placeholder="Qtd" placeholderTextColor="#9CA3AF" maxLength={3} />)}<View style={styles.verticalDivider} /><View style={{ transform: [{ scale: 0.8 }] }}><Switch trackColor={{ false: "#E2E8F0", true: SHOP_THEME.secondary }} thumbColor={"#FFF"} onValueChange={setIsInfinite} value={isInfinite} /></View></View></View>
                  </View>
                  <View style={styles.inputGroup}>
                      <Text style={styles.label}>ÍCONE</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }} contentContainerStyle={{ gap: 8 }}>
                          {Object.keys(ICONS_CATALOG).map(cat => (
                              <TouchableOpacity key={cat} style={[styles.categoryChip, selectedCategory === cat && styles.categoryChipSelected]} onPress={() => setSelectedCategory(cat)}><Text style={[styles.categoryText, selectedCategory === cat && styles.categoryTextSelected]}>{cat.toUpperCase()}</Text></TouchableOpacity>
                          ))}
                      </ScrollView>
                      <View style={styles.iconGridContainer}>
                          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 5, paddingHorizontal: 5 }}>
                              {ICONS_CATALOG[selectedCategory].map(icon => (
                                  <TouchableOpacity key={icon} style={[styles.iconOption, selectedIcon === icon && styles.iconOptionSelected]} onPress={() => setSelectedIcon(icon)}><MaterialCommunityIcons name={icon} size={28} color={selectedIcon === icon ? '#FFF' : SHOP_THEME.primary} /></TouchableOpacity>
                              ))}
                          </ScrollView>
                      </View>
                  </View>
                  <View style={styles.modalActions}>
                      {editingReward && (<TouchableOpacity style={[styles.modalBtn, { backgroundColor: '#FEE2E2' }]} onPress={() => handleDeleteReward(editingReward.id)}><MaterialCommunityIcons name="trash-can-outline" size={20} color="#DC2626" /></TouchableOpacity>)}
                      <TouchableOpacity style={[styles.modalBtn, { backgroundColor: '#F1F5F9', flex: 1 }]} onPress={() => setShowItemModal(false)}><Text style={styles.modalCancelText}>CANCELAR</Text></TouchableOpacity>
                      <TouchableOpacity style={[styles.modalBtn, { backgroundColor: SHOP_THEME.secondary, flex: 2 }]} onPress={handleSaveReward}>{saving ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.modalConfirmText}>SALVAR</Text>}</TouchableOpacity>
                  </View>
              </View>
          </KeyboardAvoidingView>
      </Modal>

      <Modal visible={showSettingsMenu} transparent animationType="fade" onRequestClose={() => setShowSettingsMenu(false)} statusBarTranslucent>
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowSettingsMenu(false)}>
              <View style={styles.settingsMenu}>
                  <Text style={styles.menuHeader}>CONFIGURAÇÕES</Text>
                  <TouchableOpacity style={styles.menuItem} onPress={() => { setShowSettingsMenu(false); setShowRenameModal(true); }}><MaterialCommunityIcons name="pencil" size={22} color={SHOP_THEME.primary} /><Text style={styles.menuText}>Renomear Loja</Text></TouchableOpacity>
                  <View style={styles.menuDivider} />
                  <TouchableOpacity style={styles.menuItem} onPress={toggleShopStatus}><MaterialCommunityIcons name={isShopOpen ? "door-closed" : "door-open"} size={22} color={isShopOpen ? "#EF4444" : "#10B981"} /><Text style={[styles.menuText, {color: isShopOpen ? '#EF4444' : '#10B981'}]}>{isShopOpen ? "Fechar Loja" : "Reabrir Loja"}</Text></TouchableOpacity>
              </View>
          </TouchableOpacity>
      </Modal>

      <Modal visible={showRenameModal} transparent animationType="fade" statusBarTranslucent><View style={styles.modalOverlay}><View style={styles.modalContent}><Text style={styles.modalTitle}>RENOMEAR</Text><TextInput style={styles.input} value={newShopName} onChangeText={setNewShopName} maxLength={25} autoFocus /><View style={styles.modalActions}><TouchableOpacity style={[styles.modalBtn, {backgroundColor: '#F1F5F9', flex:1}]} onPress={() => setShowRenameModal(false)}><Text style={styles.modalCancelText}>CANCELAR</Text></TouchableOpacity><TouchableOpacity style={[styles.modalBtn, {backgroundColor: SHOP_THEME.secondary, flex:1}]} onPress={handleRenameShop}><Text style={styles.modalConfirmText}>SALVAR</Text></TouchableOpacity></View></View></View></Modal>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 }, 
  shopHeaderBackground: { backgroundColor: SHOP_THEME.primary, paddingTop: 55, paddingBottom: 25, borderBottomLeftRadius: 35, borderBottomRightRadius: 35, alignItems: 'center', elevation: 8, zIndex: 10 },
  headerTopRow: { flexDirection: 'row', width: '100%', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 10, zIndex: 50, elevation: 50 }, 
  iconBtn: { padding: 8, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 14 },
  
  signContainer: { marginBottom: 10, alignItems: 'center', marginTop: -35, zIndex: 0 },
  signImage: { width: 320, height: 140, justifyContent: 'center', alignItems: 'center', paddingTop: 30 },
  signText: { fontFamily: FONTS.bold, fontSize: 24, color: '#FEF3C7', textAlign: 'center', width: '70%' },
  
  glassContainer: { flex: 1, marginTop: 0, borderTopLeftRadius: 30, borderTopRightRadius: 30, overflow: 'hidden', paddingTop: 10 },
  tabWrapper: { alignItems: 'center', marginTop: 15, marginBottom: 5 },
  tabContainer: { flexDirection: 'row', backgroundColor: 'rgb(255, 255, 255)', borderRadius: 16, padding: 4, width: '90%', borderWidth: 1, borderColor: '#4C1D95' },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 12 },
  activeTab: { backgroundColor: SHOP_THEME.secondary },
  tabText: { fontFamily: FONTS.bold, fontSize: 12, letterSpacing: 0.5 },
  activeTabText: { color: '#FFF' },
  inactiveTabText: { color: SHOP_THEME.primary }, 
  tabBadge: { position: 'absolute', top: -5, right: -5, backgroundColor: '#EF4444', borderRadius: 10, width: 20, height: 20, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#FFF' },
  tabBadgeText: { color: '#FFF', fontSize: 9, fontWeight: 'bold' },
  balanceContainer: { backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 5 },
  balanceLabel: { color: '#DDD6FE', fontSize: 10, fontFamily: FONTS.bold },
  balanceValueRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  balanceText: { color: '#FFF', fontSize: 20, fontFamily: FONTS.bold },
  closedBanner: { backgroundColor: '#EF4444', paddingVertical: 6, paddingHorizontal: 20, borderRadius: 20, marginTop: 10 },
  closedText: { color: '#FFF', fontFamily: FONTS.bold, fontSize: 12 },
  
  listContent: { padding: 20, paddingBottom: 100 },
  listColumns: { justifyContent: 'space-between' },

  cardWrapper: { width: CARD_WIDTH, marginBottom: 20 },
  cardShadow: { position: 'absolute', top: 6, left: 0, width: '100%', height: '100%', borderRadius: 22, opacity: 0.2 },
  cardFront: { borderRadius: 22, borderWidth: 1.5, overflow: 'hidden', minHeight: 210 },
  cardContentContainer: { flex: 1, padding: 12, alignItems: 'center', justifyContent: 'space-between' },
  pedestalContainer: { width: 60, height: 60, justifyContent: 'center', alignItems: 'center', marginTop: 15, marginBottom: 8 },
  glowEffect: { position: 'absolute', width: 55, height: 55, borderRadius: 27.5, opacity: 0.5, transform: [{scale: 1.3}] },
  cardTitle: { fontFamily: FONTS.bold, fontSize: 13, textAlign: 'center', minHeight: 36, marginBottom: 8, paddingHorizontal: 4 },
  priceTag: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12, borderWidth: 1, gap: 6, marginBottom: 10 },
  priceText: { fontFamily: FONTS.bold, fontSize: 15 },
  buyButton: { width: '100%', paddingVertical: 10, borderRadius: 12, alignItems: 'center' },
  buyText: { fontFamily: FONTS.bold, color: '#FFF', fontSize: 12, letterSpacing: 0.5 },
  lowStockBadge: { position: 'absolute', top: 0, left: 0, backgroundColor: '#EF4444', borderBottomRightRadius: 10, paddingHorizontal: 8, paddingVertical: 3, zIndex: 5 },
  lowStockText: { color: '#FFF', fontFamily: FONTS.bold, fontSize: 9 },
  
  stockBadge: { 
      position: 'absolute', top: 0, right: 0, 
      paddingHorizontal: 8, paddingVertical: 3, 
      borderBottomLeftRadius: 10, 
      borderTopRightRadius: 15, 
      zIndex: 5, 
      borderBottomWidth: 1, borderLeftWidth: 1
  },
  stockText: { fontSize: 12, fontFamily: FONTS.bold },
  
  historyCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: 12, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: '#DDD6FE', elevation: 2 },
  historyIconBox: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F5F3FF', justifyContent: 'center', alignItems: 'center' },
  historyTitle: { fontFamily: FONTS.bold, fontSize: 14, color: '#4C1D95' },
  historyDate: { fontFamily: FONTS.medium, fontSize: 11, color: '#6B7280' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontFamily: FONTS.bold, fontSize: 10 },
  actionBtn: { padding: 8, borderRadius: 10, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },

  emptyState: { alignItems: 'center', marginTop: 70 },
  emptyText: { fontFamily: FONTS.bold, fontSize: 16, marginTop: 15 },
  fab: { position: 'absolute', bottom: 30, right: 20, borderRadius: 30, shadowColor: '#4C1D95', elevation: 8 },
  fabInner: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#7C3AED', justifyContent: 'center', alignItems: 'center' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#FFF', borderRadius: 20, padding: 20 },
  modalTitle: { fontFamily: FONTS.bold, fontSize: 18, color: '#4C1D95', textAlign: 'center', marginBottom: 20 },
  inputGroup: { marginBottom: 15 },
  label: { fontFamily: FONTS.bold, fontSize: 12, color: '#7C3AED', marginBottom: 5 },
  input: { backgroundColor: '#F8FAFC', borderRadius: 10, paddingHorizontal: 12, borderWidth: 1, borderColor: '#DDD6FE', fontFamily: FONTS.regular, color: SHOP_THEME.primary, height: 50, textAlignVertical: 'center' },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  currencyInputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 10, paddingHorizontal: 12, borderWidth: 1, borderColor: '#DDD6FE', height: 50 },
  currencyInput: { flex: 1, fontFamily: FONTS.bold, fontSize: 16, color: SHOP_THEME.primary, textAlignVertical: 'center' },
  stockInputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 10, paddingHorizontal: 10, borderWidth: 1, borderColor: '#DDD6FE', height: 50, justifyContent: 'space-between' },
  stockInput: { flex: 1, fontFamily: FONTS.regular, fontSize: 16, color: SHOP_THEME.primary, minWidth: 60, textAlignVertical: 'center' }, 
  infinitePlaceholder: { flex: 1, justifyContent: 'center' },
  verticalDivider: { width: 1, height: '60%', backgroundColor: '#DDD6FE', marginHorizontal: 10 },
  
  categoryChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 15, backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0', marginRight: 0 },
  categoryChipSelected: { backgroundColor: SHOP_THEME.light, borderColor: SHOP_THEME.secondary },
  categoryText: { fontSize: 10, fontFamily: FONTS.bold, color: '#64748B' },
  categoryTextSelected: { color: SHOP_THEME.primary },
  iconGridContainer: { backgroundColor: '#F8FAFC', borderRadius: 12, padding: 8, borderWidth: 1, borderColor: '#E2E8F0' },
  
  iconOption: { 
      width: 50, height: 50, borderRadius: 25, 
      backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', marginRight: 10, 
      borderWidth: 1.5, borderColor: SHOP_THEME.light 
  },
  iconOptionSelected: { 
      backgroundColor: SHOP_THEME.secondary, borderColor: SHOP_THEME.secondary,
      transform: [{scale: 1.1}] 
  },

  modalActions: { flexDirection: 'row', gap: 10, marginTop: 20 },
  modalBtn: { padding: 15, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  modalCancelText: { fontFamily: FONTS.bold, color: '#64748B' },
  modalConfirmText: { fontFamily: FONTS.bold, color: '#FFF' },
  settingsMenu: { backgroundColor: '#FFF', width: '80%', borderRadius: 20, padding: 20, alignItems: 'center', elevation: 10 },
  menuHeader: { fontFamily: FONTS.bold, fontSize: 16, color: SHOP_THEME.textDark, marginBottom: 15 },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, width: '100%' },
  menuText: { fontFamily: FONTS.medium, fontSize: 16, color: SHOP_THEME.textDark, marginLeft: 15 },
  menuDivider: { height: 1, width: '100%', backgroundColor: '#F3F4F6' },
});