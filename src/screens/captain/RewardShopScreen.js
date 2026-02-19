import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
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

import ChonkoCoinIcon from '../../components/icons/ChonkoCoinIcon.js';

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

// COMPONENTE MOEDA COM CORREÇÃO DE ESTILO E BRILHO REDUZIDO
const AnimatedCoin = ({ size = 24, style = {} }) => { // CORREÇÃO WEAKMAP AQUI
    const glowOpacity = useRef(new Animated.Value(0.1)).current;

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(glowOpacity, {
                    toValue: 0.5,
                    duration: 1000,
                    useNativeDriver: true,
                }),
                Animated.timing(glowOpacity, {
                    toValue: 0.2,
                    duration: 1000,
                    useNativeDriver: true,
                })
            ])
        ).start();
    }, []);

    return (
        <View style={[styles.coinContainer, { width: size, height: size }, style]}>
            <Animated.View 
                style={[
                    styles.coinGlow, 
                    { 
                        width: size * 1.1, // Brilho reduzido
                        height: size * 1.1,
                        opacity: glowOpacity 
                    }
                ]} 
            />
            <View style={styles.coinImageFront}>
                <ChonkoCoinIcon width={size} height={size} />
            </View>
        </View>
    );
};

const GET_PRICE_TIER = (cost) => {
    if (cost < 100) return { 
        label: 'COMUM', 
        colors: ['#ECFDF5', '#34D399', '#059669'], 
        border: '#047857', 
        iconColor: '#064E3B', 
        text: '#022C22',
        glow: 'transparent'
    };
    if (cost < 500) return { 
        label: 'RARO', 
        colors: ['#DBEAFE', '#3B82F6'], 
        border: '#60A5FA', 
        iconColor: '#1E40AF', 
        text: '#1E3A8A',
        glow: '#3B82F6'
    };
    if (cost < 1000) return { 
        label: 'ÉPICO', 
        colors: ['#F3E8FF', '#9333EA'], 
        border: '#A855F7', 
        iconColor: '#581C87', 
        text: '#4C1D95',
        glow: '#9333EA'
    };
    return { 
        label: 'LENDÁRIO', 
        colors: ['#FEF08A', '#F59E0B', '#B45309'], 
        border: '#FBBF24', 
        iconColor: '#78350F', 
        text: '#451A03',
        glow: '#F59E0B'
    };
};

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

  const [showItemModal, setShowItemModal] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [editingReward, setEditingReward] = useState(null);
  const [title, setTitle] = useState('');
  const [cost, setCost] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('gift-outline');
  
  const initialCategory = ICONS_CATALOG ? Object.keys(ICONS_CATALOG)[0] : 'rpg';
  const [selectedCategory, setSelectedCategory] = useState(initialCategory); 

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
  
  const handleBuy = (item) => { 
      if (!isShopOpen || (!item.is_infinite && item.stock <= 0)) return Alert.alert("Esgotado", "Este item acabou :(");
      if (balance < item.cost) return Alert.alert("Ops", "Moedas insuficientes.");
      Alert.alert("💎 Confirmar Compra", `Comprar "${item.title}"?\nPreço: ${item.cost} moedas.`, [{ text: "Cancelar", style: "cancel" }, { text: "COMPRAR", onPress: () => processPurchaseRPC(item) }]); 
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
            {!isDisabled && isLegendary && (<View style={[styles.glowShadow, { backgroundColor: tier.glow }]} />)}
            <View style={[styles.cardFront, { borderColor: isDisabled ? '#E2E8F0' : tier.border }]}>
                <LinearGradient colors={isDisabled ? ['#F8FAFC', '#F1F5F9'] : tier.colors} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
                {!isDisabled && isLegendary && <ShimmerEffect />}
                <View style={styles.cardContent}>
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
                    <View style={styles.iconArea}>
                        <View style={[styles.iconCircle, { borderColor: tier.iconColor, backgroundColor: 'rgba(255,255,255,0.4)' }]}>
                            <MaterialCommunityIcons name={item.icon} size={40} color={isDisabled ? '#94A3B8' : tier.iconColor} />
                        </View>
                    </View>
                    <Text style={[styles.cardTitle, { color: isDisabled ? '#94A3B8' : tier.text }]} numberOfLines={2}>{item.title}</Text>
                    <View style={[styles.priceButton, { backgroundColor: isDisabled ? '#CBD5E1' : tier.border }]}>
                        {isCaptain ? (
                            <Text style={styles.priceButtonText}>EDITAR</Text>
                        ) : (
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <AnimatedCoin size={16} style={{ marginRight: 6 }} />
                                <Text style={styles.priceButtonText}>{item.cost}</Text>
                            </View>
                        )}
                    </View>
                </View>
            </View>
        </TouchableOpacity>
      );
  };

  return (
    <ImageBackground source={BACKGROUND_IMG} style={styles.container} resizeMode="cover">
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      <View style={styles.headerContainer}>
          <LinearGradient colors={['#312E81', '#4C1D95']} style={[StyleSheet.absoluteFill, { zIndex: -1 }]} />
          
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

          <View style={styles.signWrapper}>
              <ImageBackground source={SIGNBOARD_IMG} style={styles.signImg} resizeMode="contain">
                  <Text style={styles.signText} numberOfLines={2}>{shopName}</Text>
              </ImageBackground>
          </View>

          {!isCaptain && activeTab === 'shop' && (
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
                key="shop-grid" 
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
                key="list-view" 
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

      {/* --- MODAL EDITAR/CRIAR --- */}
      <Modal visible={showItemModal} transparent animationType="slide" onRequestClose={() => setShowItemModal(false)}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                  <Text style={styles.modalTitle}>{editingReward ? "EDITAR ITEM" : "NOVO ITEM"}</Text>
                  
                  <View style={styles.inputContainer}>
                      <Text style={styles.label}>NOME DO ITEM</Text>
                      <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="Ex: Sorvete" placeholderTextColor="#94A3B8" />
                  </View>

                  <View style={styles.row}>
                      <View style={{flex: 1, marginRight: 10}}>
                          <Text style={styles.label}>PREÇO</Text>
                          <View style={styles.inputWithIcon}>
                              <View style={styles.iconInputContainer}>
                                  <AnimatedCoin size={30} />
                              </View>
                              <TextInput style={styles.inputClean} keyboardType="number-pad" value={cost} onChangeText={setCost} placeholder="0" maxLength={5} />
                          </View>
                      </View>
                      
                      <View style={{flex: 1}}>
                          <Text style={styles.label}>ESTOQUE</Text>
                          <View style={[styles.inputWithIcon, { justifyContent: 'space-between' }]}>
                              {isInfinite ? (
                                  <MaterialCommunityIcons name="infinity" size={24} color="#64748B" />
                              ) : (
                                  <TextInput style={styles.inputClean} keyboardType="number-pad" value={stock} onChangeText={setStock} placeholder="Qtd" />
                              )}
                              <Switch trackColor={{ false: "#E2E8F0", true: "#C4B5FD" }} thumbColor={isInfinite ? "#7C3AED" : "#f4f3f4"} value={isInfinite} onValueChange={setIsInfinite} />
                          </View>
                      </View>
                  </View>

                  <View style={styles.inputContainer}>
                      <Text style={styles.label}>CATEGORIA</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 10 }}>
                          {ICONS_CATALOG && Object.keys(ICONS_CATALOG).map(cat => (
                              <TouchableOpacity 
                                  key={cat} 
                                  style={[styles.categoryChip, selectedCategory === cat && styles.categoryChipSelected]} 
                                  onPress={() => setSelectedCategory(cat)}
                              >
                                  <Text style={[styles.categoryText, selectedCategory === cat && styles.categoryTextSelected]}>{cat.toUpperCase()}</Text>
                              </TouchableOpacity>
                          ))}
                      </ScrollView>

                      <Text style={styles.label}>ÍCONE</Text>
                      <View style={styles.iconGridContainer}>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{paddingVertical: 5}}>
                            {ICONS_CATALOG && ICONS_CATALOG[selectedCategory] ? ICONS_CATALOG[selectedCategory].map(icon => (
                                <TouchableOpacity 
                                    key={icon} 
                                    style={[styles.iconOption, selectedIcon === icon && styles.iconOptionSelected]} 
                                    onPress={() => setSelectedIcon(icon)}
                                >
                                    <MaterialCommunityIcons name={icon} size={28} color={selectedIcon === icon ? '#FFF' : SHOP_THEME.primary} />
                                </TouchableOpacity>
                            )) : <Text style={{color: '#999'}}>Carregando ícones...</Text>}
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

      <Modal visible={showRenameModal} transparent animationType="fade" statusBarTranslucent><View style={styles.modalOverlay}><View style={styles.modalContent}><Text style={styles.modalTitle}>RENOMEAR LOJA</Text><TextInput style={styles.input} value={newShopName} onChangeText={setNewShopName} maxLength={25} autoFocus /><View style={styles.modalActions}><TouchableOpacity style={[styles.modalBtn, {backgroundColor: '#F1F5F9', flex:1}]} onPress={() => setShowRenameModal(false)}><Text style={styles.modalCancelText}>CANCELAR</Text></TouchableOpacity><TouchableOpacity style={[styles.modalBtn, {backgroundColor: SHOP_THEME.secondary, flex:1}]} onPress={handleRenameShop}><Text style={styles.modalConfirmText}>SALVAR</Text></TouchableOpacity></View></View></View></Modal>
      <Modal visible={showSettingsMenu} transparent animationType="fade" statusBarTranslucent><TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowSettingsMenu(false)}><View style={styles.settingsMenu}><Text style={styles.menuHeader}>CONFIGURAÇÕES</Text><TouchableOpacity style={styles.menuItem} onPress={() => { setShowSettingsMenu(false); setShowRenameModal(true); }}><MaterialCommunityIcons name="pencil" size={20} color="#64748B" /><Text style={styles.menuText}>Renomear Loja</Text></TouchableOpacity><TouchableOpacity style={styles.menuItem} onPress={toggleShopStatus}><MaterialCommunityIcons name={isShopOpen ? "door-closed" : "door-open"} size={20} color={isShopOpen ? "#EF4444" : "#10B981"} /><Text style={[styles.menuText, {color: isShopOpen ? '#EF4444' : '#10B981'}]}>{isShopOpen ? "Fechar Loja" : "Reabrir Loja"}</Text></TouchableOpacity></View></TouchableOpacity></Modal>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  coinContainer: { justifyContent: 'center', alignItems: 'center', position: 'relative' },
  coinImageFront: { zIndex: 2 },
  coinGlow: { position: 'absolute', backgroundColor: '#FFD700', borderRadius: 50, zIndex: 1, shadowColor: "#FFD700", shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 10, elevation: 10 },
  
  container: { flex: 1, backgroundColor: '#0F172A' },
  headerContainer: { paddingBottom: 20, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, overflow: 'hidden', elevation: 10, zIndex: 10 },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 50 },
  circleBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  signWrapper: { alignItems: 'center', marginTop: -15 },
  signImg: { width: 280, height: 120, justifyContent: 'center', alignItems: 'center', paddingTop: 20 },
  signText: { fontFamily: FONTS.bold, fontSize: 22, color: '#FEF3C7', textAlign: 'center', width: '70%', textShadowColor:'rgba(0,0,0,0.5)', textShadowRadius: 2 },
  balanceTag: { alignSelf: 'center', marginTop: 5 },
  balanceInner: { flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.4)', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  balanceLabel: { color: '#CBD5E1', fontSize: 10, fontFamily: FONTS.bold, marginHorizontal: 6 },
  balanceValue: { color: '#FCD34D', fontSize: 16, fontFamily: FONTS.bold },
  closedStrip: { backgroundColor: '#EF4444', padding: 5, alignItems: 'center', marginTop: 10 },
  closedText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },
  bodyContainer: { flex: 1, marginTop: 15 },
  tabBar: { flexDirection: 'row', justifyContent: 'center', marginBottom: 10 },
  tabItem: { paddingVertical: 8, paddingHorizontal: 20, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', marginHorizontal: 5 },
  tabActive: { backgroundColor: '#FCD34D' },
  tabText: { color: '#94A3B8', fontSize: 12, fontWeight: 'bold' },
  tabTextActive: { color: '#451A03' },
  gridContent: { paddingHorizontal: 16, paddingBottom: 100 },
  cardWrapper: { width: CARD_WIDTH, marginBottom: 20, borderRadius: 20 },
  cardFront: { borderRadius: 20, overflow: 'hidden', borderWidth: 1.5, minHeight: 200, elevation: 5 },
  glowShadow: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 20, opacity: 0.6, transform: [{scale: 1.05}] },
  cardContent: { flex: 1, padding: 10, alignItems: 'center', justifyContent: 'space-between' },
  topBadges: { width: '100%', flexDirection: 'row', justifyContent: 'space-between' },
  rarityBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  rarityText: { fontSize: 8, fontWeight: 'bold' },
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
  historyCard: { flexDirection: 'row', backgroundColor: '#FFF', padding: 12, borderRadius: 12, marginBottom: 10, alignItems: 'center' },
  historyIconBox: { width: 40, height: 40, backgroundColor: '#F3E8FF', borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  historyTitle: { fontWeight: 'bold', color: '#333' },
  emptyState: { alignItems: 'center', marginTop: 50 },
  emptyText: { color: '#94A3B8', marginTop: 10 },
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
  categoryChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 15, backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0', marginRight: 0 },
  categoryChipSelected: { backgroundColor: SHOP_THEME.light, borderColor: SHOP_THEME.secondary },
  categoryText: { fontSize: 10, fontFamily: FONTS.bold, color: '#64748B' },
  categoryTextSelected: { color: SHOP_THEME.primary },
  iconGridContainer: { backgroundColor: '#F8FAFC', borderRadius: 12, padding: 8, borderWidth: 1, borderColor: '#E2E8F0', minHeight: 60 },
  iconOption: { width: 50, height: 50, borderRadius: 25, borderWidth: 1, borderColor: '#DDD', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  iconOptionSelected: { backgroundColor: SHOP_THEME.secondary, borderColor: SHOP_THEME.secondary, borderWidth: 0 },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 15 },
  modalBtn: { paddingVertical: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  modalCancelText: { fontFamily: FONTS.bold, color: '#64748B' },
  modalConfirmText: { fontFamily: FONTS.bold, color: '#FFF' },
  settingsMenu: { backgroundColor: '#FFF', width: '80%', borderRadius: 20, padding: 20, elevation: 10, alignSelf: 'center' },
  menuHeader: { fontFamily: FONTS.bold, marginBottom: 15, textAlign: 'center', color: '#334155' },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  menuText: { marginLeft: 10, fontFamily: FONTS.medium, color: '#334155' }
});