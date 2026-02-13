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
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { FONTS } from '../../styles/theme';

// --- CORREÇÃO DO CAMINHO DA IMAGEM ---
// Como o arquivo está em src/screens/captain, precisamos subir 3 níveis
const SIGNBOARD_IMG = require('../../../assets/images/ShopSign.png');

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 50) / 2;

const SHOP_THEME = {
  primary: '#4C1D95',   
  secondary: '#7C3AED', 
  light: '#DDD6FE',     
  pale: '#F5F3FF',      
  accent: '#F59E0B',    
  textDark: '#1E1B4B',  
};

const REWARD_ICONS = [
  'ice-cream', 'gamepad-variant', 'soccer', 'bicycle', 'tshirt-crew', 
  'cellphone', 'laptop', 'cash', 'ticket-confirmation', 'pizza', 
  'candy-outline', 'gift-outline', 'crown', 'star', 'trophy'
];

export default function RewardShopScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { familyId, profile } = route.params || {}; 

  const isCaptain = profile?.role === 'captain';

  // DADOS DA LOJA
  const [shopName, setShopName] = useState('LOJINHA DO CHONKO');
  const [isShopOpen, setIsShopOpen] = useState(true);
  const [rewards, setRewards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState(profile?.balance || 0);

  // MODAL DE ITEM (CRIAR/EDITAR)
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingReward, setEditingReward] = useState(null);
  const [title, setTitle] = useState('');
  const [cost, setCost] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('gift-outline');

  // MODAIS DE CONFIGURAÇÃO
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [newShopName, setNewShopName] = useState('');

  useFocusEffect(
    useCallback(() => {
        fetchShopData();
        if (!isCaptain) fetchMyBalance();
    }, [])
  );

  useEffect(() => {
    // Escuta mudanças nos itens
    const rewardsSub = supabase.channel('public:rewards')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rewards', filter: `family_id=eq.${familyId}` }, 
      () => fetchShopData())
      .subscribe();

    // Escuta mudanças na loja (nome e status)
    const familiesSub = supabase.channel('public:families')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'families', filter: `id=eq.${familyId}` }, 
      (payload) => {
          setShopName(payload.new.shop_name || 'LOJINHA DO CHONKO');
          if (payload.new.is_shop_open !== undefined) setIsShopOpen(payload.new.is_shop_open);
      })
      .subscribe();

    return () => { 
        supabase.removeChannel(rewardsSub); 
        supabase.removeChannel(familiesSub);
    };
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

  const fetchMyBalance = async () => {
      try {
          const { data } = await supabase.from('profiles').select('balance').eq('id', profile.id).single();
          if (data) setBalance(data.balance);
      } catch(e) {}
  };

  // --- CONFIGURAÇÕES DA LOJA ---
  const handleRenameShop = async () => {
      const nameToSave = newShopName.trim() || 'LOJINHA DO CHONKO';
      try {
          await supabase.from('families').update({ shop_name: nameToSave }).eq('id', familyId);
          setShopName(nameToSave);
          setShowRenameModal(false);
      } catch (error) { Alert.alert("Erro", "Falha ao renomear."); }
  };

  const toggleShopStatus = async () => {
      const newState = !isShopOpen;
      try {
          await supabase.from('families').update({ is_shop_open: newState }).eq('id', familyId);
          setIsShopOpen(newState);
          setShowSettingsMenu(false);
          Alert.alert(newState ? "Loja Aberta!" : "Loja Fechada", newState ? "A criançada já pode comprar." : "Ninguém pode comprar nada por enquanto.");
      } catch (error) { Alert.alert("Erro", "Falha ao alterar status."); }
  };

  // --- CRUD DE ITENS (ADMIN) ---
  const handleSaveReward = async () => {
      if (!title || !cost) return Alert.alert("Ops", "Preencha nome e valor.");
      const payload = { family_id: familyId, title, cost: parseInt(cost), icon: selectedIcon, stock: 999 };
      try {
          setLoading(true);
          if (editingReward) {
              await supabase.from('rewards').update(payload).eq('id', editingReward.id);
          } else {
              await supabase.from('rewards').insert([payload]);
          }
          setShowItemModal(false); resetForm(); fetchShopData();
      } catch (error) { Alert.alert("Erro", "Não foi possível salvar."); } finally { setLoading(false); }
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
      setEditingReward(item); setTitle(item.title); setCost(String(item.cost)); setSelectedIcon(item.icon); setShowItemModal(true);
  };

  const resetForm = () => {
      setEditingReward(null); setTitle(''); setCost(''); setSelectedIcon('gift-outline');
  };

  // --- COMPRA (RECRUTA) ---
  const handleBuy = (item) => {
      if (!isShopOpen) return Alert.alert("Loja Fechada", "O Capitão fechou a lojinha temporariamente.");
      if (balance < item.cost) return Alert.alert("Saldo Insuficiente", `Faltam ${item.cost - balance} moedas.`);
      
      Alert.alert("Comprar Prêmio", `Gastar ${item.cost} moedas em "${item.title}"?`, [
          { text: "Cancelar", style: "cancel" },
          { text: "COMPRAR", onPress: () => processPurchase(item) }
      ]);
  };

  const processPurchase = async (item) => {
      setLoading(true);
      try {
          const { error: requestError } = await supabase.from('reward_requests').insert([{
              family_id: familyId, profile_id: profile.id, reward_id: item.id, cost: item.cost, status: 'pending' 
          }]);
          if (requestError) throw requestError;
          const newBalance = balance - item.cost;
          await supabase.from('profiles').update({ balance: newBalance }).eq('id', profile.id);
          setBalance(newBalance);
          Alert.alert("Sucesso!", "Compra realizada. Aguarde o Capitão liberar!");
      } catch (error) { Alert.alert("Erro", "Falha na compra."); } finally { setLoading(false); }
  };

  const renderCard = ({ item }) => {
      const canBuy = isShopOpen && balance >= item.cost;
      const isDisabled = !isCaptain && !canBuy;

      return (
        <TouchableOpacity 
            style={styles.cardWrapper} 
            activeOpacity={0.9} 
            disabled={isDisabled}
            onPress={() => isCaptain ? openEditModal(item) : handleBuy(item)}
        >
            <View style={styles.cardShadow} />
            <View style={[styles.cardFront, isDisabled && styles.cardDisabled]}>
                {isCaptain && (
                    <TouchableOpacity style={styles.deleteBadge} onPress={() => handleDeleteReward(item.id)}>
                        <MaterialCommunityIcons name="close" size={14} color="#FFF" />
                    </TouchableOpacity>
                )}
                <View style={[styles.iconBox, isDisabled && styles.iconBoxDisabled]}>
                    <MaterialCommunityIcons name={item.icon} size={32} color={isDisabled ? '#9CA3AF' : SHOP_THEME.secondary} />
                </View>
                <Text style={[styles.cardTitle, isDisabled && {color: '#9CA3AF'}]} numberOfLines={2}>{item.title}</Text>
                <View style={styles.priceTag}>
                    <MaterialCommunityIcons name="circle-multiple" size={14} color={SHOP_THEME.accent} />
                    <Text style={styles.priceText}>{item.cost}</Text>
                </View>
                {!isCaptain && (
                    <View style={[styles.buyButton, canBuy ? {backgroundColor: SHOP_THEME.secondary} : {backgroundColor: '#E2E8F0'}]}>
                        <Text style={[styles.buyText, !canBuy && {color: '#94A3B8'}]}>
                            {!isShopOpen ? "FECHADO" : canBuy ? "COMPRAR" : "FALTA GRANA"}
                        </Text>
                    </View>
                )}
            </View>
        </TouchableOpacity>
      );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      <View style={styles.shopHeaderBackground}>
          <View style={styles.headerTopRow}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
                <MaterialCommunityIcons name="arrow-left" size={24} color="#FFF" />
            </TouchableOpacity>

            {/* Configurações (SÓ CAPITÃO) */}
            {isCaptain ? (
                <TouchableOpacity 
                    style={styles.iconBtn} 
                    onPress={() => setShowSettingsMenu(true)}
                >
                    <MaterialCommunityIcons name="cog-outline" size={24} color="#FFF" />
                </TouchableOpacity>
            ) : <View style={{width: 40}} />}
          </View>

          <View style={styles.signContainer}>
              <ImageBackground source={SIGNBOARD_IMG} style={styles.signImage} resizeMode="contain">
                  <Text style={styles.signText} numberOfLines={2} adjustsFontSizeToFit>{shopName}</Text>
              </ImageBackground>
          </View>

          {/* Faixa de Loja Fechada */}
          {!isShopOpen && (
              <View style={styles.closedBanner}>
                  <Text style={styles.closedText}>⚠️ LOJA FECHADA TEMPORARIAMENTE ⚠️</Text>
              </View>
          )}

          {!isCaptain && isShopOpen && (
              <View style={styles.balanceContainer}>
                  <Text style={styles.balanceLabel}>SEU SALDO</Text>
                  <View style={styles.balanceValueRow}>
                      <MaterialCommunityIcons name="circle-multiple" size={28} color={SHOP_THEME.accent} />
                      <Text style={styles.balanceText}>{balance}</Text>
                  </View>
              </View>
          )}
      </View>

      <FlatList 
        data={rewards}
        keyExtractor={item => item.id}
        numColumns={2}
        columnWrapperStyle={styles.listColumns}
        contentContainerStyle={styles.listContent}
        renderItem={renderCard}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
            <View style={styles.emptyState}>
                <MaterialCommunityIcons name="storefront-outline" size={70} color={SHOP_THEME.light} />
                <Text style={styles.emptyText}>A lojinha está vazia.</Text>
            </View>
        }
      />

      {isCaptain && (
        <TouchableOpacity style={styles.fab} activeOpacity={0.9} onPress={() => { resetForm(); setShowItemModal(true); }}>
            <View style={styles.fabInner}>
                <MaterialCommunityIcons name="plus" size={32} color="#FFF" />
            </View>
        </TouchableOpacity>
      )}

      {/* --- MENU DE CONFIGURAÇÕES (NOVO) --- */}
      <Modal visible={showSettingsMenu} transparent={true} animationType="fade" onRequestClose={() => setShowSettingsMenu(false)}>
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowSettingsMenu(false)}>
              <View style={styles.settingsMenu}>
                  <Text style={styles.menuHeader}>OPÇÕES DA LOJA</Text>
                  
                  <TouchableOpacity style={styles.menuItem} onPress={() => { setShowSettingsMenu(false); setNewShopName(shopName); setShowRenameModal(true); }}>
                      <MaterialCommunityIcons name="pencil" size={22} color={SHOP_THEME.primary} />
                      <Text style={styles.menuText}>Renomear Loja</Text>
                  </TouchableOpacity>

                  <View style={styles.menuDivider} />

                  <TouchableOpacity style={styles.menuItem} onPress={toggleShopStatus}>
                      <MaterialCommunityIcons name={isShopOpen ? "door-closed" : "door-open"} size={22} color={isShopOpen ? "#EF4444" : "#10B981"} />
                      <Text style={[styles.menuText, {color: isShopOpen ? '#EF4444' : '#10B981'}]}>
                          {isShopOpen ? "Fechar Loja (Castigo)" : "Reabrir Loja"}
                      </Text>
                  </TouchableOpacity>
              </View>
          </TouchableOpacity>
      </Modal>

      {/* MODAL 1: ITEM (ADICIONAR/EDITAR) */}
      <Modal visible={showItemModal} transparent={true} animationType="fade" onRequestClose={() => setShowItemModal(false)}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                  <Text style={styles.modalTitle}>{editingReward ? "EDITAR ITEM" : "NOVO ITEM"}</Text>
                  <View style={styles.inputGroup}>
                      <Text style={styles.label}>NOME DO PRODUTO</Text>
                      <TextInput style={styles.input} placeholder="Ex: 30min de Tablet" placeholderTextColor="#9CA3AF" value={title} onChangeText={setTitle} />
                  </View>
                  <View style={styles.inputGroup}>
                      <Text style={styles.label}>PREÇO</Text>
                      <View style={styles.currencyInputWrapper}>
                          <MaterialCommunityIcons name="circle-multiple" size={20} color={SHOP_THEME.accent} style={{marginRight:10}} />
                          <TextInput style={styles.currencyInput} placeholder="50" placeholderTextColor="#9CA3AF" keyboardType="numeric" value={cost} onChangeText={setCost} />
                      </View>
                  </View>
                  <View style={styles.inputGroup}>
                      <Text style={styles.label}>ÍCONE</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginTop:5}}>
                          {REWARD_ICONS.map(icon => (
                              <TouchableOpacity key={icon} style={[styles.iconOption, selectedIcon === icon && styles.iconOptionSelected]} onPress={() => setSelectedIcon(icon)}>
                                  <MaterialCommunityIcons name={icon} size={24} color={selectedIcon === icon ? '#FFF' : SHOP_THEME.secondary} />
                              </TouchableOpacity>
                          ))}
                      </ScrollView>
                  </View>
                  <View style={styles.modalActions}>
                      <TouchableOpacity style={styles.modalCancel} onPress={() => setShowItemModal(false)}>
                          <Text style={styles.modalCancelText}>CANCELAR</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.modalConfirm} onPress={handleSaveReward}>
                          <Text style={styles.modalConfirmText}>SALVAR</Text>
                      </TouchableOpacity>
                  </View>
              </View>
          </KeyboardAvoidingView>
      </Modal>

      {/* MODAL 2: RENOMEAR LOJA */}
      <Modal visible={showRenameModal} transparent={true} animationType="fade" onRequestClose={() => setShowRenameModal(false)}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
              <View style={[styles.modalContent, {paddingBottom: 30}]}>
                  <Text style={styles.modalTitle}>RENOMEAR LOJA</Text>
                  <Text style={{textAlign:'center', color:'#6B7280', marginBottom:20}}>Como quer chamar a lojinha da sua tropa?</Text>
                  
                  <View style={styles.inputGroup}>
                      <Text style={styles.label}>NOVO NOME (MÁX 25 LETRAS)</Text>
                      <TextInput 
                        style={styles.input} 
                        placeholder="Ex: LOJINHA DO CHONKO" 
                        placeholderTextColor="#9CA3AF" 
                        value={newShopName} 
                        onChangeText={setNewShopName}
                        maxLength={25} 
                        autoFocus
                      />
                      <Text style={{textAlign: 'right', color: '#9CA3AF', fontSize: 11, marginTop: 4, marginRight: 4}}>
                          {newShopName.length}/25
                      </Text>
                  </View>

                  <View style={styles.modalActions}>
                      <TouchableOpacity style={styles.modalCancel} onPress={() => setShowRenameModal(false)}>
                          <Text style={styles.modalCancelText}>CANCELAR</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.modalConfirm} onPress={handleRenameShop}>
                          <Text style={styles.modalConfirmText}>SALVAR NOME</Text>
                      </TouchableOpacity>
                  </View>
              </View>
          </KeyboardAvoidingView>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F9FF' },
  
  shopHeaderBackground: {
      backgroundColor: SHOP_THEME.primary, 
      paddingTop: 45, paddingBottom: 30,
      borderBottomLeftRadius: 35, borderBottomRightRadius: 35,
      zIndex: 10, alignItems: 'center',
      shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 6, elevation: 8,
      position: 'relative'
  },
  
  headerTopRow: {
      flexDirection: 'row', width: '100%', justifyContent: 'space-between', paddingHorizontal: 20,
      position: 'absolute', top: 50, zIndex: 20
  },
  
  iconBtn: { padding: 8, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 14 },

  signContainer: { marginTop: 10, marginBottom: 5, alignItems: 'center', justifyContent: 'center', width: '100%' },
  signImage: { width: 340, height: 150, justifyContent: 'center', alignItems: 'center', paddingTop: 35 },
  signText: { fontFamily: FONTS.bold, fontSize: 26, color: '#fff2bd', textShadowColor: 'rgba(0, 0, 0, 0.6)', textShadowOffset: {width: 2, height: 2}, textShadowRadius: 3, textAlign: 'center', width: '70%', lineHeight: 28 },

  closedBanner: { backgroundColor: '#EF4444', paddingVertical: 5, paddingHorizontal: 15, borderRadius: 20, marginTop: 5 },
  closedText: { color: '#FFF', fontFamily: FONTS.bold, fontSize: 12 },

  balanceContainer: { 
      backgroundColor: 'rgba(0,0,0,0.25)', width: '90%', borderRadius: 24, padding: 12, 
      alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between',
      borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', marginTop: 5
  },
  balanceLabel: { fontFamily: FONTS.bold, color: '#DDD6FE', fontSize: 12, letterSpacing: 0.5, marginLeft: 10 },
  balanceValueRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginRight: 10 },
  balanceText: { fontFamily: FONTS.bold, color: '#FFF', fontSize: 24 },

  listContent: { padding: 20, paddingBottom: 100 },
  listColumns: { justifyContent: 'space-between' },

  cardWrapper: { width: CARD_WIDTH, marginBottom: 20, position: 'relative' },
  cardShadow: { position: 'absolute', top: 6, left: 0, width: '100%', height: '100%', backgroundColor: SHOP_THEME.primary, borderRadius: 24, opacity: 0.1 },
  cardFront: { backgroundColor: SHOP_THEME.pale, borderRadius: 24, padding: 15, alignItems: 'center', borderWidth: 1, borderColor: SHOP_THEME.secondary },
  cardDisabled: { backgroundColor: '#F3F4F6', borderColor: '#E5E7EB' },
  
  deleteBadge: { position: 'absolute', top: 10, right: 10, backgroundColor: '#EF4444', borderRadius: 12, padding: 4, zIndex: 10 },
  iconBox: { width: 65, height: 65, borderRadius: 32.5, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', marginBottom: 10, borderWidth: 2, borderColor: SHOP_THEME.light },
  iconBoxDisabled: { backgroundColor: '#E5E7EB', borderColor: '#D1D5DB' },
  
  cardTitle: { fontFamily: FONTS.bold, fontSize: 14, color: SHOP_THEME.textDark, textAlign: 'center', height: 40, marginBottom: 5 },
  priceTag: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFBEB', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: '#FCD34D' },
  priceText: { fontFamily: FONTS.bold, color: SHOP_THEME.accent, marginLeft: 4, fontSize: 15 },
  
  buyButton: { width: '100%', paddingVertical: 10, borderRadius: 14, alignItems: 'center' },
  buyText: { fontFamily: FONTS.bold, color: '#FFF', fontSize: 12, letterSpacing: 0.5 },

  emptyState: { alignItems: 'center', marginTop: 70, opacity: 0.9 },
  emptyText: { fontFamily: FONTS.bold, fontSize: 20, color: SHOP_THEME.primary, marginTop: 15 },
  emptySub: { fontFamily: FONTS.regular, fontSize: 14, color: '#6B7280', marginTop: 5, textAlign: 'center', paddingHorizontal: 40 },

  fab: { position: 'absolute', bottom: 30, right: 20, borderRadius: 30, shadowColor: SHOP_THEME.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 8 },
  fabInner: { width: 60, height: 60, borderRadius: 30, backgroundColor: SHOP_THEME.secondary, justifyContent: 'center', alignItems: 'center' },

  // --- MENU SETTINGS ---
  settingsMenu: { backgroundColor: '#FFF', width: '80%', borderRadius: 20, padding: 20, alignItems: 'center', elevation: 10 },
  menuHeader: { fontFamily: FONTS.bold, fontSize: 16, color: SHOP_THEME.textDark, marginBottom: 15 },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, width: '100%' },
  menuText: { fontFamily: FONTS.medium, fontSize: 16, color: SHOP_THEME.textDark, marginLeft: 15 },
  menuDivider: { height: 1, width: '100%', backgroundColor: '#F3F4F6' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(76, 29, 149, 0.4)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { width: '100%', backgroundColor: '#FFF', borderRadius: 26, padding: 24, borderWidth: 1.5, borderColor: SHOP_THEME.secondary },
  modalTitle: { textAlign: 'center', fontFamily: FONTS.bold, color: SHOP_THEME.primary, fontSize: 20, marginBottom: 25, letterSpacing: 0.5 },
  inputGroup: { marginBottom: 20 },
  label: { fontFamily: FONTS.bold, color: SHOP_THEME.secondary, fontSize: 11, marginBottom: 8, letterSpacing: 0.5 },
  input: { backgroundColor: '#F8FAFC', borderRadius: 14, padding: 14, fontFamily: FONTS.medium, color: SHOP_THEME.textDark, borderWidth: 1, borderColor: SHOP_THEME.secondary },
  currencyInputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 14, paddingHorizontal: 14, borderWidth: 1, borderColor: SHOP_THEME.secondary },
  currencyInput: { flex: 1, paddingVertical: 14, fontFamily: FONTS.bold, color: SHOP_THEME.textDark, fontSize: 18 },
  iconOption: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center', marginRight: 12, borderWidth: 1, borderColor: SHOP_THEME.light },
  iconOptionSelected: { backgroundColor: SHOP_THEME.secondary, borderColor: SHOP_THEME.secondary },
  modalActions: { flexDirection: 'row', gap: 15, marginTop: 15 },
  modalCancel: { flex: 1, padding: 16, alignItems: 'center', borderRadius: 16, backgroundColor: '#F1F5F9' },
  modalCancelText: { fontFamily: FONTS.bold, color: '#64748B' },
  modalConfirm: { flex: 1, padding: 16, alignItems: 'center', borderRadius: 16, backgroundColor: SHOP_THEME.secondary },
  modalConfirmText: { fontFamily: FONTS.bold, color: '#FFF', fontSize: 16 },
});