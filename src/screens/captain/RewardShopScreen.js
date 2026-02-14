import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { useCallback, useEffect, useState } from 'react';
import {
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
import { FONTS } from '../../styles/theme';

const SIGNBOARD_IMG = require('../../../assets/images/ShopSign.png');

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 50) / 2;

const SHOP_THEME = {
  primary: '#4C1D95',   
  secondary: '#7C3AED', 
  light: '#DDD6FE',     
  pale: '#F5F3FF',      
  bg: '#EDE9FE',        
  accent: '#F59E0B',    
  textDark: '#1E1B4B',
  success: '#059669',
  danger: '#DC2626', 
};

const REWARD_ICONS = [
  'ice-cream', 'gamepad-variant', 'soccer', 'bicycle', 'tshirt-crew', 
  'cellphone', 'laptop', 'cash', 'ticket-confirmation', 'pizza', 
  'candy-outline', 'gift-outline', 'crown', 'star', 'trophy',
  'cookie', 'cake-variant', 'movie-open', 'headphones', 'book-open-variant',
  'palette', 'popcorn', 'robot', 'teddy-bear', 'toy-brick', 
  'controller-classic', 'rocket-launch', 'balloon', 'bike', 'cards-playing-outline'
];

export default function RewardShopScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { familyId, profile } = route.params || {}; 

  const isCaptain = profile?.role === 'captain';

  // ESTADOS
  const [activeTab, setActiveTab] = useState('shop'); 
  const [shopName, setShopName] = useState('LOJINHA DO CHONKO');
  const [isShopOpen, setIsShopOpen] = useState(true);
  
  const [rewards, setRewards] = useState([]);
  const [myPurchases, setMyPurchases] = useState([]);
  const [salesList, setSalesList] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState(profile?.balance || 0);

  // MODAIS
  const [showItemModal, setShowItemModal] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  
  // FORMULÁRIOS
  const [editingReward, setEditingReward] = useState(null);
  const [title, setTitle] = useState('');
  const [cost, setCost] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('gift-outline');
  const [newShopName, setNewShopName] = useState('');
  const [stock, setStock] = useState('1'); 
  const [isInfinite, setIsInfinite] = useState(true);

  // CÁLCULO DE PENDÊNCIAS (NOVO)
  const pendingCount = salesList.filter(item => item.status === 'pending').length;

  useFocusEffect(
    useCallback(() => {
        fetchShopData();
        if (isCaptain) {
            fetchSales();
        } else {
            fetchMyBalance();
            fetchMyPurchases();
        }
    }, [activeTab])
  );

  useEffect(() => {
    const rewardsSub = supabase.channel('public:rewards').on('postgres_changes', { event: '*', schema: 'public', table: 'rewards', filter: `family_id=eq.${familyId}` }, () => fetchShopData()).subscribe();
    
    // Listener de Pedidos (Atualiza badge em tempo real)
    const requestsSub = supabase.channel('public:requests').on('postgres_changes', { event: '*', schema: 'public', table: 'reward_requests', filter: `family_id=eq.${familyId}` }, () => {
        if(isCaptain) fetchSales(); else fetchMyPurchases();
    }).subscribe();
    
    const familiesSub = supabase.channel('public:families').on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'families', filter: `id=eq.${familyId}` }, (payload) => {
          setShopName(payload.new.shop_name || 'LOJINHA DO CHONKO');
          if (payload.new.is_shop_open !== undefined) setIsShopOpen(payload.new.is_shop_open);
      }).subscribe();

    return () => { supabase.removeChannel(rewardsSub); supabase.removeChannel(familiesSub); supabase.removeChannel(requestsSub); };
  }, []);

  const fetchShopData = async () => {
      try {
          const { data: items } = await supabase.from('rewards').select('*').eq('family_id', familyId).order('cost', { ascending: true });
          setRewards(items || []);
          const { data: family } = await supabase.from('families').select('shop_name, is_shop_open').eq('id', familyId).single();
          setShopName(family?.shop_name || 'LOJINHA DO CHONKO');
          if (family) setIsShopOpen(family.is_shop_open);
      } catch (error) { console.log(error); } finally { setLoading(false); }
  };

  const fetchMyPurchases = async () => {
      const { data } = await supabase.from('reward_requests').select('*, rewards(title, icon)').eq('profile_id', profile.id).order('created_at', { ascending: false });
      if (data) setMyPurchases(data);
  };

  const fetchSales = async () => {
      const { data } = await supabase.from('reward_requests').select('*, rewards(title, icon), profiles(name)').eq('family_id', familyId).order('created_at', { ascending: false });
      if (data) setSalesList(data);
  };

  const fetchMyBalance = async () => {
      const { data } = await supabase.from('profiles').select('balance').eq('id', profile.id).single();
      if (data) setBalance(data.balance);
  };

  // --- AÇÕES ---
  const handleApproveSale = async (item) => {
      Alert.alert("Confirmar", `Marcar "${item.rewards?.title}" como entregue?`, [
          { text: "Cancelar", style: "cancel" },
          { text: "Sim", onPress: async () => {
              await supabase.from('reward_requests').update({ status: 'approved' }).eq('id', item.id);
              fetchSales();
          }}
      ]);
  };

  const handleRejectSale = async (item) => {
      Alert.alert("Recusar", `Devolver moedas para ${item.profiles?.name}?`, [
          { text: "Cancelar", style: "cancel" },
          { text: "Devolver", style: 'destructive', onPress: async () => {
              await supabase.from('reward_requests').update({ status: 'rejected' }).eq('id', item.id);
              const { data: userProfile } = await supabase.from('profiles').select('balance').eq('id', item.profile_id).single();
              if (userProfile) await supabase.from('profiles').update({ balance: userProfile.balance + item.cost }).eq('id', item.profile_id);
              fetchSales();
          }}
      ]);
  };

  const handleRenameShop = async () => {
      await supabase.from('families').update({ shop_name: newShopName.trim() || 'LOJINHA DO CHONKO' }).eq('id', familyId);
      setShopName(newShopName.trim() || 'LOJINHA DO CHONKO');
      setShowRenameModal(false);
  };

  const toggleShopStatus = async () => {
      const newState = !isShopOpen;
      await supabase.from('families').update({ is_shop_open: newState }).eq('id', familyId);
      setIsShopOpen(newState);
      setShowSettingsMenu(false);
  };

  const handleSaveReward = async () => {
      if (!title || !cost) return Alert.alert("Ops", "Preencha tudo!");
      const payload = { family_id: familyId, title, cost: parseInt(cost), icon: selectedIcon, is_infinite: isInfinite, stock: isInfinite ? 999 : parseInt(stock) };
      try {
          if (editingReward) await supabase.from('rewards').update(payload).eq('id', editingReward.id);
          else await supabase.from('rewards').insert([payload]);
          setShowItemModal(false); resetForm(); fetchShopData();
      } catch (e) { Alert.alert("Erro ao salvar"); }
  };

  const handleDeleteReward = (id) => {
      Alert.alert("Excluir", "Remover da loja?", [
          { text: "Cancelar" },
          { text: "Excluir", style: 'destructive', onPress: async () => {
              await supabase.from('rewards').delete().eq('id', id);
              fetchShopData();
          }}
      ]);
  };

  const openEditModal = (item) => {
      setEditingReward(item); setTitle(item.title); setCost(String(item.cost)); 
      setSelectedIcon(item.icon); setIsInfinite(item.is_infinite); setStock(String(item.stock));
      setShowItemModal(true);
  };

  const resetForm = () => {
      setEditingReward(null); setTitle(''); setCost(''); setSelectedIcon('gift-outline'); setIsInfinite(true); setStock('1');
  };

  const handleBuy = (item) => {
      if (!isShopOpen) return Alert.alert("Fechado", "A lojinha está fechada.");
      if (!item.is_infinite && item.stock <= 0) return Alert.alert("Esgotado", "O estoque acabou!");
      if (balance < item.cost) return Alert.alert("Saldo", "Saldo insuficiente.");
      Alert.alert("Resgatar", `Comprar "${item.title}"?`, [{ text: "Cancelar" }, { text: "Sim", onPress: () => processPurchase(item) }]);
  };

  const processPurchase = async (item) => {
      setLoading(true);
      try {
          const { error } = await supabase.from('reward_requests').insert([{ family_id: familyId, profile_id: profile.id, reward_id: item.id, cost: item.cost, status: 'pending' }]);
          if (error) throw error;
          await supabase.from('profiles').update({ balance: balance - item.cost }).eq('id', profile.id);
          setBalance(balance - item.cost);
          if (!item.is_infinite) await supabase.from('rewards').update({ stock: Math.max(0, item.stock - 1) }).eq('id', item.id);
          fetchShopData();
          Alert.alert("Sucesso!", "Pedido enviado!");
      } catch (error) { Alert.alert("Erro", "Falha na compra."); } finally { setLoading(false); }
  };

  const renderSalesItem = ({ item }) => (
    <View style={styles.historyCard}>
        <View style={styles.historyIconBox}><MaterialCommunityIcons name={item.rewards?.icon || 'gift'} size={24} color={SHOP_THEME.secondary} /></View>
        <View style={{flex: 1, marginLeft: 12}}>
            <Text style={styles.historyTitle}>{item.rewards?.title}</Text>
            <View style={{flexDirection:'row', alignItems:'center'}}>
                <MaterialCommunityIcons name="account" size={12} color="#9CA3AF" />
                <Text style={styles.historyDate}> {item.profiles?.name} • {new Date(item.created_at).toLocaleDateString('pt-BR')}</Text>
            </View>
        </View>
        {item.status === 'pending' ? (
            <View style={{flexDirection: 'row', gap: 8}}>
                <TouchableOpacity style={[styles.actionBtn, {backgroundColor: '#FEE2E2', borderColor: '#FECACA'}]} onPress={() => handleRejectSale(item)}>
                    <MaterialCommunityIcons name="close" size={20} color="#DC2626" />
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionBtn, {backgroundColor: '#D1FAE5', borderColor: '#34D399'}]} onPress={() => handleApproveSale(item)}>
                    <MaterialCommunityIcons name="check" size={20} color="#059669" />
                </TouchableOpacity>
            </View>
        ) : (
            <View style={[styles.statusBadge, { backgroundColor: item.status === 'approved' ? '#ECFDF5' : '#FEF2F2', borderColor: item.status === 'approved' ? '#34D399' : '#F87171' }]}>
                <Text style={[styles.statusText, { color: item.status === 'approved' ? '#059669' : '#DC2626' }]}>{item.status === 'approved' ? 'ENTREGUE' : 'DEVOLVIDO'}</Text>
            </View>
        )}
    </View>
  );

  const renderHistoryItem = ({ item }) => (
    <View style={styles.historyCard}>
        <View style={styles.historyIconBox}><MaterialCommunityIcons name={item.rewards?.icon || 'gift'} size={24} color={SHOP_THEME.secondary} /></View>
        <View style={{flex: 1, marginLeft: 12}}>
            <Text style={styles.historyTitle}>{item.rewards?.title || 'Item Removido'}</Text>
            <Text style={styles.historyDate}>{new Date(item.created_at).toLocaleDateString('pt-BR')}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: item.status === 'approved' ? '#D1FAE5' : item.status === 'pending' ? '#FEF3C7' : '#FEE2E2', borderColor: item.status === 'approved' ? '#34D399' : item.status === 'pending' ? '#FBBF24' : '#F87171' }]}>
            <Text style={[styles.statusText, { color: item.status === 'approved' ? '#065F46' : item.status === 'pending' ? '#92400E' : '#991B1B' }]}>{item.status === 'approved' ? 'ENTREGUE' : item.status === 'pending' ? 'PENDENTE' : 'RECUSADO'}</Text>
        </View>
    </View>
  );

  const renderCard = ({ item }) => {
      if (isCaptain) {
          return (
            <TouchableOpacity style={styles.cardWrapper} activeOpacity={0.9} onPress={() => openEditModal(item)}>
                <View style={styles.cardShadow} />
                <View style={[styles.cardFront, { padding: 0, justifyContent: 'space-between' }]}>
                    <View style={styles.captainPriceBadge}>
                        <MaterialCommunityIcons name="circle-multiple" size={12} color="#B45309" />
                        <Text style={styles.captainPriceText}>{item.cost}</Text>
                    </View>
                    <View style={{ alignItems: 'center', paddingTop: 20, paddingHorizontal: 10 }}>
                        <View style={styles.iconBox}>
                            <MaterialCommunityIcons name={item.icon} size={32} color={SHOP_THEME.secondary} />
                        </View>
                        <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
                    </View>
                    <View style={styles.captainFooter}>
                        <View style={styles.stockInfo}>
                            <MaterialCommunityIcons name={item.is_infinite ? "infinity" : "package-variant"} size={16} color={SHOP_THEME.primary} />
                            <Text style={styles.stockText}>{item.is_infinite ? "Infinito" : `${item.stock} un.`}</Text>
                        </View>
                        <TouchableOpacity style={styles.miniDeleteBtn} onPress={() => handleDeleteReward(item.id)}>
                            <MaterialCommunityIcons name="trash-can-outline" size={16} color="#EF4444" />
                        </TouchableOpacity>
                    </View>
                </View>
            </TouchableOpacity>
          );
      }
      const hasStock = item.is_infinite || item.stock > 0;
      const canBuy = isShopOpen && hasStock && balance >= item.cost;
      const isDisabled = !isShopOpen || !hasStock || !canBuy;

      return (
        <TouchableOpacity style={styles.cardWrapper} activeOpacity={0.9} disabled={isDisabled} onPress={() => handleBuy(item)}>
            <View style={styles.cardShadow} />
            <View style={[styles.cardFront, isDisabled && styles.cardDisabled]}>
                {!item.is_infinite && item.stock > 0 && item.stock <= 3 && <View style={styles.lowStockBadge}><Text style={styles.lowStockText}>RESTAM {item.stock}</Text></View>}
                <View style={[styles.iconBox, isDisabled && styles.iconBoxDisabled]}>
                    <MaterialCommunityIcons name={item.icon} size={32} color={isDisabled ? '#9CA3AF' : SHOP_THEME.secondary} />
                </View>
                <Text style={[styles.cardTitle, isDisabled && {color: '#9CA3AF'}]} numberOfLines={2}>{item.title}</Text>
                <View style={styles.priceTag}><MaterialCommunityIcons name="circle-multiple" size={14} color={SHOP_THEME.accent} /><Text style={styles.priceText}>{item.cost}</Text></View>
                <View style={[styles.buyButton, canBuy ? {backgroundColor: SHOP_THEME.secondary} : {backgroundColor: '#E2E8F0'}]}>
                    <Text style={[styles.buyText, (!canBuy || !hasStock) && {color: '#94A3B8'}]}>{!isShopOpen ? "FECHADO" : !hasStock ? "ESGOTADO" : canBuy ? "COMPRAR" : "FALTA GRANA"}</Text>
                </View>
            </View>
        </TouchableOpacity>
      );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      {/* HEADER */}
      <View style={styles.shopHeaderBackground}>
          <View style={styles.headerTopRow}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
                <MaterialCommunityIcons name="arrow-left" size={24} color="#FFF" />
            </TouchableOpacity>

            {isCaptain ? (
                <TouchableOpacity style={styles.iconBtn} onPress={() => setShowSettingsMenu(true)}>
                    <MaterialCommunityIcons name="cog-outline" size={24} color="#FFF" />
                </TouchableOpacity>
            ) : <View style={{width: 40}} />}
          </View>

          <View style={styles.signContainer}>
              <ImageBackground source={SIGNBOARD_IMG} style={styles.signImage} resizeMode="contain">
                  <Text style={styles.signText} numberOfLines={2} adjustsFontSizeToFit>{shopName}</Text>
              </ImageBackground>
          </View>

          {!isCaptain && activeTab === 'shop' && (
              <View style={styles.balanceContainer}>
                  <Text style={styles.balanceLabel}>SEU SALDO</Text>
                  <View style={styles.balanceValueRow}><MaterialCommunityIcons name="circle-multiple" size={24} color={SHOP_THEME.accent} /><Text style={styles.balanceText}>{balance}</Text></View>
              </View>
          )}
          {!isShopOpen && <View style={styles.closedBanner}><Text style={styles.closedText}>⚠️ LOJA FECHADA TEMPORARIAMENTE ⚠️</Text></View>}
      </View>

      {/* TABS (AGORA COM BADGE VERMELHA) */}
      <View style={styles.tabWrapper}>
          <View style={styles.tabContainer}>
              <TouchableOpacity style={[styles.tab, activeTab === 'shop' && styles.activeTab]} onPress={() => setActiveTab('shop')}>
                  <Text style={[styles.tabText, activeTab === 'shop' && styles.activeTabText]}>VITRINE</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={[styles.tab, (activeTab === 'history' || activeTab === 'sales') && styles.activeTab]} onPress={() => setActiveTab(isCaptain ? 'sales' : 'history')}>
                  <Text style={[styles.tabText, (activeTab === 'history' || activeTab === 'sales') && styles.activeTabText]}>{isCaptain ? 'VENDAS' : 'MEUS PEDIDOS'}</Text>
                  {/* BADGE DE PENDÊNCIAS */}
                  {isCaptain && pendingCount > 0 && (
                      <View style={styles.tabBadge}>
                          <Text style={styles.tabBadgeText}>{pendingCount}</Text>
                      </View>
                  )}
              </TouchableOpacity>
          </View>
      </View>

      {/* CONTEÚDO */}
      {activeTab === 'shop' ? (
          <FlatList 
            key="shop-grid"
            data={rewards}
            keyExtractor={item => item.id}
            numColumns={2}
            columnWrapperStyle={styles.listColumns}
            contentContainerStyle={styles.listContent}
            renderItem={renderCard}
            ListEmptyComponent={
                <View style={styles.emptyState}>
                    <MaterialCommunityIcons name="storefront-outline" size={70} color={SHOP_THEME.primary} style={{opacity: 0.3}} />
                    <Text style={[styles.emptyText, {color: SHOP_THEME.primary}]}>A vitrine está vazia.</Text>
                </View>
            }
          />
      ) : (
          <FlatList 
            key="list-view"
            data={isCaptain ? salesList : myPurchases}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.listContent}
            renderItem={isCaptain ? renderSalesItem : renderHistoryItem}
            ListEmptyComponent={
                <View style={styles.emptyState}>
                    <MaterialCommunityIcons name="shopping-outline" size={70} color={SHOP_THEME.primary} style={{opacity: 0.3}} />
                    <Text style={[styles.emptyText, {color: SHOP_THEME.primary}]}>{isCaptain ? 'Nenhuma venda.' : 'Nada comprado.'}</Text>
                </View>
            }
          />
      )}

      {isCaptain && activeTab === 'shop' && (
        <TouchableOpacity style={styles.fab} activeOpacity={0.9} onPress={() => { resetForm(); setShowItemModal(true); }}>
            <View style={styles.fabInner}><MaterialCommunityIcons name="plus" size={32} color="#FFF" /></View>
        </TouchableOpacity>
      )}

      {/* MODAL SETTINGS */}
      <Modal visible={showSettingsMenu} transparent animationType="fade" onRequestClose={() => setShowSettingsMenu(false)}>
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowSettingsMenu(false)}>
              <View style={styles.settingsMenu}>
                  <Text style={styles.menuHeader}>CONFIGURAÇÕES</Text>
                  <TouchableOpacity style={styles.menuItem} onPress={() => { setShowSettingsMenu(false); setShowRenameModal(true); }}><MaterialCommunityIcons name="pencil" size={22} color={SHOP_THEME.primary} /><Text style={styles.menuText}>Renomear Loja</Text></TouchableOpacity>
                  <View style={styles.menuDivider} />
                  <TouchableOpacity style={styles.menuItem} onPress={toggleShopStatus}><MaterialCommunityIcons name={isShopOpen ? "door-closed" : "door-open"} size={22} color={isShopOpen ? "#EF4444" : "#10B981"} /><Text style={[styles.menuText, {color: isShopOpen ? '#EF4444' : '#10B981'}]}>{isShopOpen ? "Fechar Loja" : "Reabrir Loja"}</Text></TouchableOpacity>
              </View>
          </TouchableOpacity>
      </Modal>

      {/* MODAL ITEM */}
      <Modal visible={showItemModal} transparent animationType="slide" onRequestClose={() => setShowItemModal(false)}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                  <Text style={styles.modalTitle}>{editingReward ? "EDITAR" : "NOVO ITEM"}</Text>
                  
                  <View style={styles.inputGroup}><Text style={styles.label}>NOME</Text><TextInput style={styles.input} value={title} onChangeText={setTitle} /></View>
                  
                  <View style={styles.row}>
                      <View style={{flex: 1, marginRight: 10}}>
                          <View style={styles.labelContainer}><Text style={styles.label}>PREÇO</Text></View>
                          <View style={styles.currencyInputWrapper}>
                              <MaterialCommunityIcons name="circle-multiple" size={20} color={SHOP_THEME.accent} style={{marginRight:10}} />
                              <TextInput style={styles.currencyInput} keyboardType="numeric" value={cost} onChangeText={setCost} />
                          </View>
                      </View>
                      
                      <View style={{flex: 1}}>
                          <View style={styles.labelContainer}>
                              <Text style={styles.label}>{isInfinite ? "INFINITO" : "QTD"}</Text>
                              <Switch trackColor={{ false: "#E2E8F0", true: SHOP_THEME.light }} thumbColor={isInfinite ? SHOP_THEME.primary : "#f4f3f4"} onValueChange={setIsInfinite} value={isInfinite} />
                          </View>
                          {!isInfinite ? (
                              <TextInput style={styles.input} keyboardType="numeric" value={stock} onChangeText={setStock} />
                          ) : (
                              <View style={[styles.input, {backgroundColor: '#F3F4F6', justifyContent:'center', alignItems:'center', borderWidth: 1, borderColor: SHOP_THEME.secondary}]}>
                                  <MaterialCommunityIcons name="infinity" size={24} color="#9CA3AF" />
                              </View>
                          )}
                      </View>
                  </View>

                  <View style={styles.inputGroup}><Text style={styles.label}>ÍCONE</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginTop:8}}>{REWARD_ICONS.map(icon => (<TouchableOpacity key={icon} style={[styles.iconOption, selectedIcon === icon && styles.iconOptionSelected]} onPress={() => setSelectedIcon(icon)}><MaterialCommunityIcons name={icon} size={24} color={selectedIcon === icon ? '#FFF' : SHOP_THEME.primary} /></TouchableOpacity>))}</ScrollView></View>
                  <View style={styles.modalActions}><TouchableOpacity style={styles.modalCancel} onPress={() => setShowItemModal(false)}><Text style={styles.modalCancelText}>CANCELAR</Text></TouchableOpacity><TouchableOpacity style={styles.modalConfirm} onPress={handleSaveReward}><Text style={styles.modalConfirmText}>SALVAR</Text></TouchableOpacity></View>
              </View>
          </KeyboardAvoidingView>
      </Modal>

      <Modal visible={showRenameModal} transparent animationType="fade"><View style={styles.modalOverlay}><View style={styles.modalContent}><Text style={styles.modalTitle}>RENOMEAR</Text><TextInput style={styles.input} value={newShopName} onChangeText={setNewShopName} maxLength={25} autoFocus /><View style={styles.modalActions}><TouchableOpacity style={styles.modalCancel} onPress={() => setShowRenameModal(false)}><Text style={styles.modalCancelText}>CANCELAR</Text></TouchableOpacity><TouchableOpacity style={styles.modalConfirm} onPress={handleRenameShop}><Text style={styles.modalConfirmText}>SALVAR</Text></TouchableOpacity></View></View></View></Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: SHOP_THEME.bg },
  shopHeaderBackground: { backgroundColor: SHOP_THEME.primary, paddingTop: 45, paddingBottom: 25, borderBottomLeftRadius: 35, borderBottomRightRadius: 35, alignItems: 'center', elevation: 8, zIndex: 10 },
  headerTopRow: { flexDirection: 'row', width: '100%', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 10 },
  iconBtn: { padding: 8, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 14 },
  
  signContainer: { marginBottom: 10, alignItems: 'center' },
  signImage: { width: 320, height: 140, justifyContent: 'center', alignItems: 'center', paddingTop: 30 },
  signText: { fontFamily: FONTS.bold, fontSize: 24, color: '#FEF3C7', textAlign: 'center', width: '70%' },

  tabWrapper: { alignItems: 'center', marginTop: 15, marginBottom: 5 },
  tabContainer: { flexDirection: 'row', backgroundColor: '#FFF', borderRadius: 16, padding: 4, width: '90%', elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 12 },
  activeTab: { backgroundColor: SHOP_THEME.secondary },
  tabText: { fontFamily: FONTS.bold, color: '#9CA3AF', fontSize: 12, letterSpacing: 0.5 },
  activeTabText: { color: '#FFF' },
  
  // ESTILO DO BADGE
  tabBadge: { position: 'absolute', top: -5, right: -5, backgroundColor: '#EF4444', borderRadius: 10, width: 20, height: 20, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#FFF' },
  tabBadgeText: { color: '#FFF', fontSize: 9, fontWeight: 'bold' },

  balanceContainer: { backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 5 },
  balanceLabel: { color: '#DDD6FE', fontSize: 10, fontFamily: FONTS.bold },
  balanceText: { color: '#FFF', fontSize: 20, fontFamily: FONTS.bold },
  closedBanner: { backgroundColor: '#EF4444', paddingVertical: 6, paddingHorizontal: 20, borderRadius: 20, marginTop: 10 },
  closedText: { color: '#FFF', fontFamily: FONTS.bold, fontSize: 12 },

  listContent: { padding: 20, paddingBottom: 100 },
  listColumns: { justifyContent: 'space-between' },

  cardWrapper: { width: CARD_WIDTH, marginBottom: 20 },
  cardShadow: { position: 'absolute', top: 6, left: 0, width: '100%', height: '100%', backgroundColor: SHOP_THEME.primary, borderRadius: 24, opacity: 0.1 },
  cardFront: { backgroundColor: SHOP_THEME.pale, borderRadius: 24, padding: 15, alignItems: 'center', borderWidth: 1, borderColor: SHOP_THEME.secondary, overflow: 'hidden' },
  cardDisabled: { backgroundColor: '#F3F4F6', borderColor: '#E5E7EB' },
  iconBox: { width: 65, height: 65, borderRadius: 32.5, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', marginBottom: 10, borderWidth: 2, borderColor: SHOP_THEME.light },
  iconBoxDisabled: { backgroundColor: '#E5E7EB', borderColor: '#D1D5DB' },
  cardTitle: { fontFamily: FONTS.bold, fontSize: 14, color: SHOP_THEME.textDark, textAlign: 'center', height: 40, marginBottom: 5 },
  priceTag: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFBEB', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: '#FCD34D' },
  priceText: { fontFamily: FONTS.bold, color: SHOP_THEME.accent, marginLeft: 4, fontSize: 15 },
  buyButton: { width: '100%', paddingVertical: 10, borderRadius: 14, alignItems: 'center' },
  buyText: { fontFamily: FONTS.bold, color: '#FFF', fontSize: 12 },

  historyCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: 12, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: SHOP_THEME.secondary, shadowColor: SHOP_THEME.primary, shadowOpacity: 0.05, shadowOffset: {width: 0, height: 2}, shadowRadius: 4, elevation: 2 },
  historyIconBox: { width: 50, height: 50, borderRadius: 25, backgroundColor: SHOP_THEME.pale, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: SHOP_THEME.light },
  historyTitle: { fontFamily: FONTS.bold, fontSize: 14, color: SHOP_THEME.textDark, marginBottom: 2 },
  historyDate: { fontFamily: FONTS.medium, fontSize: 11, color: '#6B7280' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  statusText: { fontFamily: FONTS.bold, fontSize: 10 },
  actionBtn: { padding: 8, borderRadius: 10, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },

  captainPriceBadge: { position: 'absolute', top: 8, right: 8, flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF3C7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: '#F59E0B' },
  captainPriceText: { fontSize: 12, fontFamily: FONTS.bold, color: '#B45309', marginLeft: 4 },
  captainFooter: { width: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F3E8FF', paddingVertical: 10, paddingHorizontal: 12, borderTopWidth: 1, borderTopColor: '#E9D5FF' },
  stockInfo: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  stockText: { fontSize: 11, fontFamily: FONTS.medium, color: SHOP_THEME.primary },
  miniDeleteBtn: { padding: 6, backgroundColor: '#FFF', borderRadius: 8, borderWidth: 1, borderColor: '#FECACA' },
  lowStockBadge: { position: 'absolute', top: 8, left: 8, backgroundColor: '#EF4444', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2, zIndex: 5 },
  lowStockText: { color: '#FFF', fontFamily: FONTS.bold, fontSize: 10 },

  emptyState: { alignItems: 'center', marginTop: 70, opacity: 0.9 },
  emptyText: { fontFamily: FONTS.bold, fontSize: 18, color: SHOP_THEME.primary, marginTop: 15 },
  fab: { position: 'absolute', bottom: 30, right: 20, borderRadius: 30, shadowColor: SHOP_THEME.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 8 },
  fabInner: { width: 60, height: 60, borderRadius: 30, backgroundColor: SHOP_THEME.secondary, justifyContent: 'center', alignItems: 'center' },

  settingsMenu: { backgroundColor: '#FFF', width: '80%', borderRadius: 20, padding: 20, alignItems: 'center', elevation: 10 },
  menuHeader: { fontFamily: FONTS.bold, fontSize: 16, color: SHOP_THEME.textDark, marginBottom: 15 },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, width: '100%' },
  menuText: { fontFamily: FONTS.medium, fontSize: 16, color: SHOP_THEME.textDark, marginLeft: 15 },
  menuDivider: { height: 1, width: '100%', backgroundColor: '#F3F4F6' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(76, 29, 149, 0.4)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { width: '100%', backgroundColor: '#FFF', borderRadius: 26, padding: 24, borderWidth: 1.5, borderColor: SHOP_THEME.secondary },
  modalTitle: { textAlign: 'center', fontFamily: FONTS.bold, color: SHOP_THEME.primary, fontSize: 20, marginBottom: 25 },
  inputGroup: { marginBottom: 20 },
  label: { fontFamily: FONTS.bold, color: SHOP_THEME.secondary, fontSize: 11, marginBottom: 8 },
  labelContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, height: 30 },
  input: { backgroundColor: '#F8FAFC', borderRadius: 14, paddingHorizontal: 14, height: 50, fontFamily: FONTS.medium, color: SHOP_THEME.textDark, borderWidth: 1, borderColor: SHOP_THEME.secondary },
  currencyInputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 14, paddingHorizontal: 14, height: 50, borderWidth: 1, borderColor: SHOP_THEME.secondary },
  currencyInput: { flex: 1, height: 50, fontFamily: FONTS.bold, color: SHOP_THEME.textDark, fontSize: 18 },
  iconOption: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center', marginRight: 12, borderWidth: 1, borderColor: SHOP_THEME.light },
  iconOptionSelected: { backgroundColor: SHOP_THEME.secondary, borderColor: SHOP_THEME.secondary },
  modalActions: { flexDirection: 'row', gap: 15, marginTop: 15 },
  modalCancel: { flex: 1, padding: 16, alignItems: 'center', borderRadius: 16, backgroundColor: '#F1F5F9' },
  modalCancelText: { fontFamily: FONTS.bold, color: '#64748B' },
  modalConfirm: { flex: 1, padding: 16, alignItems: 'center', borderRadius: 16, backgroundColor: SHOP_THEME.secondary },
  modalConfirmText: { fontFamily: FONTS.bold, color: '#FFF', fontSize: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
});