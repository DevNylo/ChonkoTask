import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    Dimensions,
    Easing,
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
import { ICONS_CATALOG } from '../../constants/IconsCatalog';
import { supabase } from '../../lib/supabase';
import { FONTS } from '../../styles/theme';

// --- IMPORTAÇÃO DO ÍCONE DE MOEDA ---
import ChonkoCoinIcon from '../../components/icons/ChonkoCoinIcon';

const SIGNBOARD_IMG = require('../../../assets/images/ShopSign.png');
const BACKGROUND_IMG = require('../../../assets/GenericBKG3.png'); 

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;

const SHOP_THEME = {
    primary: '#4C1D95',   
    secondary: '#7C3AED', 
    light: '#C4B5FD', 
    accent: '#F59E0B',    
};

// --- CONFIGURAÇÃO VISUAL DOS TIERS (PREMIUM) ---
const GET_PRICE_TIER = (cost) => {
    // AJUSTE: Comum agora é VERDE (Estilo RPG "Uncommon/Common")
    if (cost < 100) return { 
        label: 'COMUM', 
        colors: ['#ECFDF5', '#34D399', '#059669'], // Verde Esmeralda
        border: '#047857', 
        iconColor: '#064E3B', 
        text: '#022C22',
        glow: 'transparent' // Sem brilho exagerado para comuns
    };
    if (cost < 500) return { 
        label: 'RARO', 
        colors: ['#DBEAFE', '#3B82F6'], // Azul Cristal
        border: '#60A5FA', 
        iconColor: '#1E40AF', 
        text: '#1E3A8A',
        glow: '#3B82F6'
    };
    if (cost < 1000) return { 
        label: 'ÉPICO', 
        colors: ['#F3E8FF', '#9333EA'], // Roxo Místico
        border: '#A855F7', 
        iconColor: '#581C87', 
        text: '#4C1D95',
        glow: '#9333EA'
    };
    return { 
        label: 'LENDÁRIO', 
        colors: ['#FEF08A', '#F59E0B', '#B45309'], // Ouro Puro
        border: '#FBBF24', 
        iconColor: '#78350F', 
        text: '#451A03',
        glow: '#F59E0B'
    };
};

// --- COMPONENTE: BRILHO (SHIMMER) ---
const ShimmerEffect = () => {
    const translateX = useRef(new Animated.Value(-CARD_WIDTH)).current;
    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(translateX, { toValue: CARD_WIDTH, duration: 2000, useNativeDriver: true, easing: Easing.linear }),
                Animated.delay(3000)
            ])
        ).start();
    }, []);
    return (
        <Animated.View style={[styles.shimmerOverlay, { transform: [{ translateX }] }]}>
            <LinearGradient colors={['transparent', 'rgba(255,255,255,0.6)', 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ flex: 1 }} />
        </Animated.View>
    );
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
  const [salesList, setSalesList] = useState([]); 
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [balance, setBalance] = useState(profile?.balance || 0);

  // Modais e Forms
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
    return () => { supabase.removeAllChannels(); };
  }, []);

  const loadInitialData = async () => { 
      await fetchShopData(); 
      if (isCaptain) await fetchSales(); 
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
      const { data } = await supabase.from('reward_requests').select('*, rewards(title, icon), profiles(name)').eq('family_id', familyId).order('created_at', { ascending: false }); 
      if (data) setSalesList(data); 
  };

  const fetchMyBalance = async () => { 
      const { data } = await supabase.from('profiles').select('balance').eq('id', profile.id).single(); 
      if (data) setBalance(data.balance); 
  };
  
  // --- COMPRA VIA RPC ---
  const handleBuy = (item) => { 
      if (!isShopOpen || (!item.is_infinite && item.stock <= 0)) return Alert.alert("Esgotado", "Este item acabou :(");
      if (balance < item.cost) return Alert.alert("Ops", "Moedas insuficientes.");

      Alert.alert(
          "💎 Confirmar Compra", 
          `Comprar "${item.title}"?\nPreço: ${item.cost} moedas.`, 
          [
              { text: "Cancelar", style: "cancel" }, 
              { text: "COMPRAR", onPress: () => processPurchaseRPC(item) }
          ]
      ); 
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
          } else {
              Alert.alert("Erro", data.error || "Erro na compra.");
          }
      } catch (error) {
          Alert.alert("Erro", "Falha de conexão.");
      } finally {
          setLoading(false);
      }
  };
  
  // --- ADMIN ACTIONS ---
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
      Alert.alert("Excluir", "Remover este item?", [{ text: "Não" }, { text: "Sim, Excluir", style: 'destructive', onPress: async () => { await supabase.from('rewards').delete().eq('id', id); fetchShopData(); }}]); 
  };
  
  const openEditModal = (item) => { setEditingReward(item); setTitle(item.title); setCost(String(item.cost)); setSelectedIcon(item.icon); setIsInfinite(item.is_infinite); setStock(String(item.stock)); setShowItemModal(true); };
  const resetForm = () => { setEditingReward(null); setTitle(''); setCost(''); setSelectedIcon('gift-outline'); setIsInfinite(true); setStock('1'); };

  const renderSalesItem = ({ item }) => (
    <View style={styles.historyCard}>
        <View style={styles.historyIconBox}><MaterialCommunityIcons name={item.rewards?.icon} size={24} color="#4C1D95" /></View>
        <View style={{flex: 1, marginLeft: 10}}><Text style={styles.historyTitle}>{item.rewards?.title}</Text><Text style={{fontSize:10, color:'#666'}}>{new Date(item.created_at).toLocaleDateString()}</Text></View>
    </View> 
  );

  const renderCard = ({ item }) => {
      const tier = GET_PRICE_TIER(item.cost);
      const hasStock = item.is_infinite || item.stock > 0;
      const canBuy = isShopOpen && hasStock && balance >= item.cost;
      const isDisabled = !isShopOpen || !hasStock || (!canBuy && !isCaptain);
      
      const isLegendary = item.cost >= 500;

      return (
        <TouchableOpacity 
            style={styles.cardWrapper} 
            activeOpacity={0.8} 
            disabled={isDisabled && !isCaptain} 
            onPress={() => isCaptain ? openEditModal(item) : handleBuy(item)}
        >
            {/* Glow Shadow for Legendary Items */}
            {!isDisabled && isLegendary && (
                <View style={[styles.glowShadow, { backgroundColor: tier.glow }]} />
            )}

            <View style={[styles.cardFront, { borderColor: isDisabled ? '#E2E8F0' : tier.border }]}>
                {/* Background Gradient */}
                <LinearGradient 
                    colors={isDisabled ? ['#F8FAFC', '#F1F5F9'] : tier.colors} 
                    style={StyleSheet.absoluteFill} 
                    start={{ x: 0, y: 0 }} 
                    end={{ x: 1, y: 1 }} 
                />
                
                {/* Shimmer para itens caros */}
                {!isDisabled && isLegendary && <ShimmerEffect />}

                <View style={styles.cardContent}>
                    {/* Badge de Raridade/Estoque */}
                    <View style={styles.topBadges}>
                        <View style={[styles.rarityBadge, { backgroundColor: isDisabled ? '#94A3B8' : tier.border }]}>
                            <Text style={styles.rarityText}>{tier.label}</Text>
                        </View>
                        {!item.is_infinite && (
                            <View style={[styles.stockBadge, { backgroundColor: item.stock < 3 ? '#EF4444' : 'rgba(0,0,0,0.5)' }]}>
                                <Text style={styles.stockText}>{item.stock} un</Text>
                            </View>
                        )}
                    </View>

                    {/* Ícone Flutuante */}
                    <View style={styles.iconArea}>
                        <View style={[styles.iconCircle, { borderColor: tier.iconColor, backgroundColor: 'rgba(255,255,255,0.4)' }]}>
                            <MaterialCommunityIcons name={item.icon} size={40} color={isDisabled ? '#94A3B8' : tier.iconColor} />
                        </View>
                    </View>

                    {/* Título */}
                    <Text style={[styles.cardTitle, { color: isDisabled ? '#94A3B8' : tier.text }]} numberOfLines={2}>
                        {item.title}
                    </Text>

                    {/* Botão de Preço */}
                    <View style={[styles.priceButton, { backgroundColor: isDisabled ? '#CBD5E1' : tier.border }]}>
                        {isCaptain ? (
                            <Text style={styles.priceButtonText}>EDITAR</Text>
                        ) : (
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                {/* ÍCONE CUSTOMIZADO SVG AQUI */}
                                <ChonkoCoinIcon width={14} height={14} />
                                <Text style={[styles.priceButtonText, { marginLeft: 4 }]}>{item.cost}</Text>
                            </View>
                        )}
                    </View>
                </View>
            </View>
        </TouchableOpacity>
      );
  };

  return (
    <ImageBackground source={BACKGROUND_IMG} style={styles.container} resizeMode="repeat">
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      {/* --- HEADER PREMIUM --- */}
      <View style={styles.headerContainer}>
          <LinearGradient
              colors={['#312E81', '#4C1D95']}
              style={StyleSheet.absoluteFill}
          />
          
          {/* Top Bar */}
          <View style={styles.topBar}>
            {isCaptain ? (
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.circleBtn}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color="#FFF" />
                </TouchableOpacity>
            ) : <View style={{width:40}} />}
            
            {isCaptain && (
                <TouchableOpacity style={styles.circleBtn} onPress={() => setShowSettingsMenu(true)}>
                    <MaterialCommunityIcons name="cog" size={22} color="#FFF" />
                </TouchableOpacity>
            )}
          </View>

          {/* Shop Sign */}
          <View style={styles.signWrapper}>
              <ImageBackground source={SIGNBOARD_IMG} style={styles.signImg} resizeMode="contain">
                  <Text style={styles.signText} numberOfLines={2}>{shopName}</Text>
              </ImageBackground>
          </View>

          {/* Balance (Recruta) */}
          {!isCaptain && activeTab === 'shop' && (
              <View style={styles.balanceTag}>
                  <View style={styles.balanceInner}>
                      {/* ÍCONE CUSTOMIZADO NO SALDO */}
                      <ChonkoCoinIcon width={18} height={18} />
                      <Text style={styles.balanceLabel}>SALDO:</Text>
                      <Text style={styles.balanceValue}>{balance}</Text>
                  </View>
              </View>
          )}
          
          {!isShopOpen && <View style={styles.closedStrip}><Text style={styles.closedText}>FECHADO PARA BALANÇO</Text></View>}
      </View>

      {/* --- CONTEÚDO --- */}
      <View style={styles.bodyContainer}>
          {/* Tabs */}
          <View style={styles.tabBar}>
              <TouchableOpacity style={[styles.tabItem, activeTab === 'shop' && styles.tabActive]} onPress={() => setActiveTab('shop')}>
                  <Text style={[styles.tabText, activeTab === 'shop' && styles.tabTextActive]}>VITRINE</Text>
              </TouchableOpacity>
              {isCaptain && (
                <TouchableOpacity style={[styles.tabItem, activeTab === 'sales' && styles.tabActive]} onPress={() => setActiveTab('sales')}>
                    <Text style={[styles.tabText, activeTab === 'sales' && styles.tabTextActive]}>HISTÓRICO</Text>
                </TouchableOpacity>
              )}
          </View>

          {activeTab === 'shop' ? (
              <FlatList 
                data={rewards} 
                keyExtractor={item => item.id} 
                numColumns={2} 
                columnWrapperStyle={{ justifyContent: 'space-between' }} 
                contentContainerStyle={styles.gridContent} 
                renderItem={renderCard} 
                ListEmptyComponent={<View style={styles.emptyState}><MaterialCommunityIcons name="store-off" size={40} color="#64748B"/><Text style={styles.emptyText}>Nada na vitrine hoje.</Text></View>} 
              />
          ) : (
              <FlatList 
                data={salesList} 
                keyExtractor={item => item.id} 
                contentContainerStyle={styles.gridContent} 
                renderItem={renderSalesItem} 
              />
          )}
      </View>

      {isCaptain && activeTab === 'shop' && (
          <TouchableOpacity style={styles.fab} activeOpacity={0.9} onPress={() => { resetForm(); setShowItemModal(true); }}>
              <LinearGradient colors={['#7C3AED', '#4C1D95']} style={styles.fabGradient}>
                  <MaterialCommunityIcons name="plus" size={32} color="#FFF" />
              </LinearGradient>
          </TouchableOpacity>
      )}

      {/* --- MODAIS DE ADMIN --- */}
      <Modal visible={showItemModal} transparent animationType="slide" onRequestClose={() => setShowItemModal(false)}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                  <Text style={styles.modalTitle}>{editingReward ? "EDITAR" : "NOVO ITEM"}</Text>
                  <View style={styles.inputGroup}><Text style={styles.label}>NOME DO ITEM</Text><TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="Ex: Sorvete" placeholderTextColor="#9CA3AF" /></View>
                  <View style={styles.row}>
                      <View style={{flex: 1, marginRight: 15}}>
                          <Text style={styles.label}>PREÇO</Text>
                          <View style={[styles.input, {flexDirection: 'row', alignItems: 'center'}]}>
                              {/* ÍCONE CUSTOMIZADO NO INPUT */}
                              <ChonkoCoinIcon width={16} height={16} style={{marginRight: 8}} />
                              <TextInput style={{flex:1, fontWeight: 'bold'}} keyboardType="number-pad" value={cost} onChangeText={setCost} placeholder="0" maxLength={4} />
                          </View>
                      </View>
                      <View style={{flex: 1}}><Text style={styles.label}>ESTOQUE</Text><View style={styles.row}><TextInput style={[styles.input, {flex:1}]} keyboardType="number-pad" value={stock} onChangeText={setStock} placeholder="Qtd" /><Switch value={isInfinite} onValueChange={setIsInfinite} /></View></View>
                  </View>
                  <View style={styles.inputGroup}><Text style={styles.label}>ÍCONE</Text><ScrollView horizontal showsHorizontalScrollIndicator={false}>{ICONS_CATALOG['rpg'].map(icon => (<TouchableOpacity key={icon} style={[styles.iconOption, selectedIcon === icon && styles.iconOptionSelected]} onPress={() => setSelectedIcon(icon)}><MaterialCommunityIcons name={icon} size={28} color={selectedIcon === icon ? '#FFF' : SHOP_THEME.primary} /></TouchableOpacity>))}</ScrollView></View>
                  <View style={styles.modalActions}>
                      {editingReward && (<TouchableOpacity style={[styles.modalBtn, { backgroundColor: '#FEE2E2' }]} onPress={() => handleDeleteReward(editingReward.id)}><MaterialCommunityIcons name="trash-can" size={20} color="#DC2626" /></TouchableOpacity>)}
                      <TouchableOpacity style={[styles.modalBtn, { backgroundColor: '#F1F5F9', flex: 1 }]} onPress={() => setShowItemModal(false)}><Text style={styles.modalCancelText}>CANCELAR</Text></TouchableOpacity>
                      <TouchableOpacity style={[styles.modalBtn, { backgroundColor: SHOP_THEME.secondary, flex: 2 }]} onPress={handleSaveReward}>{saving ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.modalConfirmText}>SALVAR</Text>}</TouchableOpacity>
                  </View>
              </View>
          </KeyboardAvoidingView>
      </Modal>

      <Modal visible={showRenameModal} transparent animationType="fade" statusBarTranslucent><View style={styles.modalOverlay}><View style={styles.modalContent}><Text style={styles.modalTitle}>RENOMEAR</Text><TextInput style={styles.input} value={newShopName} onChangeText={setNewShopName} maxLength={25} autoFocus /><View style={styles.modalActions}><TouchableOpacity style={[styles.modalBtn, {backgroundColor: '#F1F5F9', flex:1}]} onPress={() => setShowRenameModal(false)}><Text style={styles.modalCancelText}>CANCELAR</Text></TouchableOpacity><TouchableOpacity style={[styles.modalBtn, {backgroundColor: SHOP_THEME.secondary, flex:1}]} onPress={handleRenameShop}><Text style={styles.modalConfirmText}>SALVAR</Text></TouchableOpacity></View></View></View></Modal>
      
      <Modal visible={showSettingsMenu} transparent animationType="fade" statusBarTranslucent><TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowSettingsMenu(false)}><View style={styles.settingsMenu}><Text style={styles.menuHeader}>CONFIGURAÇÕES</Text><TouchableOpacity style={styles.menuItem} onPress={() => { setShowSettingsMenu(false); setShowRenameModal(true); }}><Text>Renomear Loja</Text></TouchableOpacity><TouchableOpacity style={styles.menuItem} onPress={toggleShopStatus}><Text style={{color: isShopOpen ? '#EF4444' : '#10B981'}}>{isShopOpen ? "Fechar Loja" : "Reabrir Loja"}</Text></TouchableOpacity></View></TouchableOpacity></Modal>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  
  // HEADER
  headerContainer: { paddingBottom: 20, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, overflow: 'hidden', elevation: 10, zIndex: 10 },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 50 },
  circleBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  signWrapper: { alignItems: 'center', marginTop: -20 },
  signImg: { width: 280, height: 120, justifyContent: 'center', alignItems: 'center', paddingTop: 20 },
  signText: { fontFamily: FONTS.bold, fontSize: 22, color: '#FEF3C7', textAlign: 'center', width: '70%', textShadowColor:'rgba(0,0,0,0.5)', textShadowRadius: 2 },
  balanceTag: { alignSelf: 'center', marginTop: 5 },
  balanceInner: { flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.4)', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  balanceLabel: { color: '#CBD5E1', fontSize: 10, fontFamily: FONTS.bold, marginHorizontal: 6 },
  balanceValue: { color: '#FCD34D', fontSize: 16, fontFamily: FONTS.bold },
  closedStrip: { backgroundColor: '#EF4444', padding: 5, alignItems: 'center', marginTop: 10 },
  closedText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },

  // BODY
  bodyContainer: { flex: 1, marginTop: 15 },
  tabBar: { flexDirection: 'row', justifyContent: 'center', marginBottom: 10 },
  tabItem: { paddingVertical: 8, paddingHorizontal: 20, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', marginHorizontal: 5 },
  tabActive: { backgroundColor: '#FCD34D' },
  tabText: { color: '#94A3B8', fontSize: 12, fontWeight: 'bold' },
  tabTextActive: { color: '#451A03' },
  gridContent: { paddingHorizontal: 16, paddingBottom: 100 },

  // CARDS PREMIUM
  cardWrapper: { width: CARD_WIDTH, marginBottom: 20, borderRadius: 20 },
  cardFront: { borderRadius: 20, overflow: 'hidden', borderWidth: 1.5, minHeight: 200, elevation: 5 },
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
  
  priceButton: { flexDirection: 'row', paddingVertical: 8, paddingHorizontal: 20, borderRadius: 15, alignItems: 'center', justifyContent: 'center', width: '100%', elevation: 2 },
  priceButtonText: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },

  shimmerOverlay: { position: 'absolute', top: 0, left: 0, bottom: 0, width: 100, zIndex: 10, transform: [{ skewX: '-20deg' }] },

  fab: { position: 'absolute', bottom: 30, right: 20, borderRadius: 30, elevation: 8 },
  fabGradient: { width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center' },
  
  // Styles auxiliares (History, Modals) mantidos compactos...
  historyCard: { flexDirection: 'row', backgroundColor: '#FFF', padding: 12, borderRadius: 12, marginBottom: 10, alignItems: 'center' },
  historyIconBox: { width: 40, height: 40, backgroundColor: '#F3E8FF', borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  historyTitle: { fontWeight: 'bold', color: '#333' },
  emptyState: { alignItems: 'center', marginTop: 50 },
  emptyText: { color: '#94A3B8', marginTop: 10 },
  
  // Modal Styles (Simplificados para não estourar o limite de caracteres)
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#FFF', borderRadius: 20, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginBottom: 20, color: SHOP_THEME.primary },
  inputGroup: { marginBottom: 15 },
  label: { fontSize: 12, fontWeight: 'bold', color: '#64748B', marginBottom: 5 },
  input: { backgroundColor: '#F1F5F9', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 20 },
  modalBtn: { padding: 15, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  modalCancelText: { fontWeight: 'bold', color: '#64748B' },
  modalConfirmText: { fontWeight: 'bold', color: '#FFF' },
  iconOption: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: '#DDD', justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  iconOptionSelected: { backgroundColor: SHOP_THEME.secondary, borderColor: SHOP_THEME.secondary },
  settingsMenu: { backgroundColor: '#FFF', width: '70%', borderRadius: 15, padding: 20, elevation: 10 },
  menuHeader: { fontWeight: 'bold', marginBottom: 10, textAlign: 'center' },
  menuItem: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
});