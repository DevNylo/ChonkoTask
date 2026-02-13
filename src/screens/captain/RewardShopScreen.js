import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { COLORS, FONTS } from '../../styles/theme';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 50) / 2; // 2 colunas com espaçamento

// Ícones disponíveis para os prêmios
const REWARD_ICONS = [
  'ice-cream', 'gamepad-variant', 'soccer', 'bicycle', 'tshirt-crew', 
  'cellphone', 'laptop', 'cash', 'ticket-confirmation', 'pizza', 
  'candy-outline', 'gift-outline', 'crown', 'star', 'trophy'
];

export default function RewardShopScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { familyId, profile } = route.params || {}; // profile vem da navegação anterior

  const isCaptain = profile?.role === 'captain';

  const [rewards, setRewards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState(profile?.balance || 0); // Saldo do recruta (se for recruta)

  // Estados para Modal de Criar/Editar (Apenas Admin)
  const [showModal, setShowModal] = useState(false);
  const [editingReward, setEditingReward] = useState(null);
  const [title, setTitle] = useState('');
  const [cost, setCost] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('gift-outline');

  useFocusEffect(
    useCallback(() => {
        fetchShopData();
        if (!isCaptain) fetchMyBalance();
    }, [])
  );

  // Realtime: Escutar mudanças na tabela 'rewards'
  useEffect(() => {
    const subscription = supabase
      .channel('public:rewards')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rewards', filter: `family_id=eq.${familyId}` }, 
      (payload) => {
          fetchShopData(); // Recarrega a lista quando houver mudança
      })
      .subscribe();

    return () => { supabase.removeChannel(subscription); };
  }, []);

  const fetchShopData = async () => {
      try {
          const { data, error } = await supabase
              .from('rewards')
              .select('*')
              .eq('family_id', familyId)
              .order('cost', { ascending: true });
          
          if (error) throw error;
          setRewards(data || []);
      } catch (error) {
          console.log(error);
      } finally {
          setLoading(false);
      }
  };

  const fetchMyBalance = async () => {
      try {
          const { data } = await supabase.from('profiles').select('balance').eq('id', profile.id).single();
          if (data) setBalance(data.balance);
      } catch(e) {}
  };

  // --- AÇÕES DO ADMIN ---
  const handleSaveReward = async () => {
      if (!title || !cost) return Alert.alert("Ops", "Preencha nome e valor.");
      
      const payload = {
          family_id: familyId,
          title,
          cost: parseInt(cost),
          icon: selectedIcon,
          stock: 999 // Estoque infinito por padrão por enquanto
      };

      try {
          setLoading(true);
          if (editingReward) {
              await supabase.from('rewards').update(payload).eq('id', editingReward.id);
          } else {
              await supabase.from('rewards').insert([payload]);
          }
          setShowModal(false);
          resetForm();
          fetchShopData();
      } catch (error) {
          Alert.alert("Erro", "Não foi possível salvar o prêmio.");
      } finally {
          setLoading(false);
      }
  };

  const handleDeleteReward = (id) => {
      Alert.alert("Excluir", "Remover este item da loja?", [
          { text: "Cancelar" },
          { text: "Excluir", style: 'destructive', onPress: async () => {
              await supabase.from('rewards').delete().eq('id', id);
              fetchShopData();
          }}
      ]);
  };

  const openEditModal = (item) => {
      setEditingReward(item);
      setTitle(item.title);
      setCost(String(item.cost));
      setSelectedIcon(item.icon);
      setShowModal(true);
  };

  const resetForm = () => {
      setEditingReward(null);
      setTitle('');
      setCost('');
      setSelectedIcon('gift-outline');
  };

  // --- AÇÕES DO RECRUTA ---
  const handleBuy = (item) => {
      if (balance < item.cost) {
          return Alert.alert("Saldo Insuficiente", `Você precisa de mais ${item.cost - balance} moedas.`);
      }

      Alert.alert("Comprar Prêmino", `Deseja gastar ${item.cost} moedas para comprar "${item.title}"?`, [
          { text: "Cancelar", style: "cancel" },
          { text: "COMPRAR", onPress: () => processPurchase(item) }
      ]);
  };

  const processPurchase = async (item) => {
      setLoading(true);
      try {
          // 1. Criar pedido de resgate
          const { error: requestError } = await supabase.from('reward_requests').insert([{
              family_id: familyId,
              profile_id: profile.id,
              reward_id: item.id,
              cost: item.cost,
              status: 'pending' // Pendente de aprovação/entrega do pai
          }]);

          if (requestError) throw requestError;

          // 2. Deduzir saldo (Opcional: Pode deduzir só quando o pai aprovar, mas deduzir agora evita "gasto duplo")
          const newBalance = balance - item.cost;
          const { error: balanceError } = await supabase.from('profiles').update({ balance: newBalance }).eq('id', profile.id);
          
          if (balanceError) throw balanceError;

          setBalance(newBalance);
          Alert.alert("Sucesso!", "Compra realizada. Peça para o Capitão liberar seu prêmio!");

      } catch (error) {
          Alert.alert("Erro", "Falha na compra. Tente novamente.");
          console.log(error);
      } finally {
          setLoading(false);
      }
  };

  const renderCard = ({ item }) => {
      const canBuy = balance >= item.cost;

      return (
        <TouchableOpacity 
            style={styles.cardWrapper} 
            activeOpacity={0.9} 
            disabled={!isCaptain && !canBuy}
            onPress={() => isCaptain ? openEditModal(item) : handleBuy(item)}
        >
            <View style={styles.cardShadow} />
            
            <View style={[styles.cardFront, (!isCaptain && !canBuy) && {backgroundColor: '#F3F4F6', borderColor: '#E5E7EB'}]}>
                {isCaptain && (
                    <TouchableOpacity style={styles.deleteBadge} onPress={() => handleDeleteReward(item.id)}>
                        <MaterialCommunityIcons name="close" size={14} color="#FFF" />
                    </TouchableOpacity>
                )}

                <View style={[styles.iconBox, (!isCaptain && !canBuy) && {backgroundColor: '#E5E7EB'}]}>
                    <MaterialCommunityIcons name={item.icon} size={32} color={(!isCaptain && !canBuy) ? '#9CA3AF' : COLORS.primary} />
                </View>

                <Text style={[styles.cardTitle, (!isCaptain && !canBuy) && {color: '#9CA3AF'}]} numberOfLines={2}>
                    {item.title}
                </Text>

                <View style={styles.priceTag}>
                    <MaterialCommunityIcons name="diamond-stone" size={14} color="#EC4899" />
                    <Text style={styles.priceText}>{item.cost}</Text>
                </View>

                {!isCaptain && (
                    <View style={[styles.buyButton, canBuy ? {backgroundColor: COLORS.primary} : {backgroundColor: '#E2E8F0'}]}>
                        <Text style={[styles.buyText, !canBuy && {color: '#94A3B8'}]}>
                            {canBuy ? "COMPRAR" : "FALTA GRANA"}
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
      
      {/* HEADER VERDE ESCURO */}
      <View style={styles.topGreenArea}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                <MaterialCommunityIcons name="arrow-left" size={24} color={COLORS.primary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{isCaptain ? "ESTOQUE DA LOJA" : "LOJA DE PRÊMIOS"}</Text>
            <View style={{width: 40}} /> 
          </View>

          {/* Se for Recruta, mostra o Saldo dele Grande no Topo */}
          {!isCaptain && (
              <View style={styles.balanceContainer}>
                  <Text style={styles.balanceLabel}>SEU SALDO</Text>
                  <View style={styles.balanceValueRow}>
                      <MaterialCommunityIcons name="diamond-stone" size={28} color="#EC4899" />
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
                <MaterialCommunityIcons name="storefront-outline" size={60} color="#CBD5E1" />
                <Text style={styles.emptyText}>A loja está vazia.</Text>
                <Text style={styles.emptySub}>{isCaptain ? "Adicione prêmios para motivar a tropa!" : "Peça para o Capitão adicionar prêmios!"}</Text>
            </View>
        }
      />

      {/* FAB para Admin adicionar itens */}
      {isCaptain && (
        <TouchableOpacity style={styles.fab} activeOpacity={0.9} onPress={() => { resetForm(); setShowModal(true); }}>
            <View style={styles.fabInner}>
                <MaterialCommunityIcons name="plus" size={32} color="#FFF" />
            </View>
        </TouchableOpacity>
      )}

      {/* MODAL CRIAR/EDITAR (ADMIN) */}
      <Modal visible={showModal} transparent={true} animationType="fade" onRequestClose={() => setShowModal(false)}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                  <Text style={styles.modalTitle}>{editingReward ? "EDITAR PRÊMIO" : "NOVO PRÊMIO"}</Text>
                  
                  <View style={styles.inputGroup}>
                      <Text style={styles.label}>NOME DO ITEM</Text>
                      <TextInput 
                        style={styles.input} 
                        placeholder="Ex: 30min de Tablet" 
                        placeholderTextColor="#94A3B8"
                        value={title} onChangeText={setTitle}
                      />
                  </View>

                  <View style={styles.inputGroup}>
                      <Text style={styles.label}>PREÇO (MOEDAS)</Text>
                      <View style={styles.currencyInputWrapper}>
                          <MaterialCommunityIcons name="diamond-stone" size={20} color="#EC4899" style={{marginRight:10}} />
                          <TextInput 
                            style={styles.currencyInput} 
                            placeholder="50" 
                            placeholderTextColor="#94A3B8"
                            keyboardType="numeric"
                            value={cost} onChangeText={setCost}
                          />
                      </View>
                  </View>

                  <View style={styles.inputGroup}>
                      <Text style={styles.label}>ÍCONE</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginTop:5}}>
                          {REWARD_ICONS.map(icon => (
                              <TouchableOpacity 
                                key={icon} 
                                style={[styles.iconOption, selectedIcon === icon && styles.iconOptionSelected]}
                                onPress={() => setSelectedIcon(icon)}
                              >
                                  <MaterialCommunityIcons name={icon} size={24} color={selectedIcon === icon ? '#FFF' : COLORS.primary} />
                              </TouchableOpacity>
                          ))}
                      </ScrollView>
                  </View>

                  <View style={styles.modalActions}>
                      <TouchableOpacity style={styles.modalCancel} onPress={() => setShowModal(false)}>
                          <Text style={styles.modalCancelText}>CANCELAR</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.modalConfirm} onPress={handleSaveReward}>
                          <Text style={styles.modalConfirmText}>SALVAR</Text>
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
  
  // --- HEADER VERDE ESCURO ---
  topGreenArea: {
      backgroundColor: COLORS.primary, // #064E3B
      paddingTop: 50,
      paddingBottom: 20,
      borderBottomLeftRadius: 35, // Suave
      borderBottomRightRadius: 35,
      zIndex: 10,
      shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 5, elevation: 5
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 10 },
  headerTitle: { fontFamily: FONTS.bold, fontSize: 16, color: '#D1FAE5', letterSpacing: 1 },
  backBtn: { padding: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 14 },

  // --- BALANCE CARD (Recruit Only) ---
  balanceContainer: { 
      backgroundColor: 'rgba(0,0,0,0.2)', 
      marginHorizontal: 20, 
      borderRadius: 20, 
      padding: 15, 
      alignItems: 'center', 
      flexDirection: 'row', 
      justifyContent: 'space-between',
      borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)'
  },
  balanceLabel: { fontFamily: FONTS.bold, color: '#D1FAE5', fontSize: 12 },
  balanceValueRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  balanceText: { fontFamily: FONTS.bold, color: '#FFF', fontSize: 24 },

  // --- LISTA ---
  listContent: { padding: 20, paddingBottom: 100 },
  listColumns: { justifyContent: 'space-between' },

  // --- CARD DO PRODUTO (Soft Premium) ---
  cardWrapper: { 
      width: CARD_WIDTH, marginBottom: 20, position: 'relative' 
  },
  cardShadow: {
      position: 'absolute', top: 6, left: 0, width: '100%', height: '100%', 
      backgroundColor: COLORS.shadow, borderRadius: 24, opacity: 0.05
  },
  cardFront: { 
      backgroundColor: '#FFF', borderRadius: 24, padding: 15, alignItems: 'center',
      borderWidth: 1, borderColor: COLORS.primary // Borda Verde Escuro 1px
  },
  
  deleteBadge: { position: 'absolute', top: 10, right: 10, backgroundColor: '#EF4444', borderRadius: 12, padding: 4, zIndex: 10 },

  iconBox: { 
      width: 60, height: 60, borderRadius: 30, backgroundColor: '#F0FDF4', 
      justifyContent: 'center', alignItems: 'center', marginBottom: 10,
      borderWidth: 1, borderColor: '#DCFCE7'
  },
  cardTitle: { fontFamily: FONTS.bold, fontSize: 14, color: '#1E293B', textAlign: 'center', height: 40, marginBottom: 5 },
  
  priceTag: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FDF2F8', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginBottom: 10 },
  priceText: { fontFamily: FONTS.bold, color: '#DB2777', marginLeft: 4, fontSize: 14 },

  buyButton: { width: '100%', paddingVertical: 8, borderRadius: 12, alignItems: 'center' },
  buyText: { fontFamily: FONTS.bold, color: '#FFF', fontSize: 12 },

  // --- EMPTY STATE ---
  emptyState: { alignItems: 'center', marginTop: 60, opacity: 0.8 },
  emptyText: { fontFamily: FONTS.bold, fontSize: 18, color: '#64748B', marginTop: 15 },
  emptySub: { fontFamily: FONTS.regular, fontSize: 14, color: '#94A3B8', marginTop: 5, textAlign: 'center' },

  // --- FAB (Admin) ---
  fab: { position: 'absolute', bottom: 30, right: 20, borderRadius: 30, shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 8 },
  fabInner: { width: 60, height: 60, borderRadius: 30, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },

  // --- MODAL (Admin) ---
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { 
      width: '100%', backgroundColor: '#FFF', borderRadius: 24, padding: 20,
      borderWidth: 1, borderColor: COLORS.primary // Borda Verde 1px
  },
  modalTitle: { textAlign: 'center', fontFamily: FONTS.bold, color: '#1E293B', fontSize: 18, marginBottom: 20 },
  
  inputGroup: { marginBottom: 15 },
  label: { fontFamily: FONTS.bold, color: '#64748B', fontSize: 11, marginBottom: 8 },
  input: { backgroundColor: '#F8FAFC', borderRadius: 12, padding: 12, fontFamily: FONTS.medium, color: '#1E293B', borderWidth: 1, borderColor: '#E2E8F0' },
  
  currencyInputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 12, paddingHorizontal: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  currencyInput: { flex: 1, paddingVertical: 12, fontFamily: FONTS.bold, color: '#1E293B', fontSize: 16 },

  iconOption: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center', marginRight: 10, borderWidth: 1, borderColor: '#E2E8F0' },
  iconOptionSelected: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },

  modalActions: { flexDirection: 'row', gap: 15, marginTop: 10 },
  modalCancel: { flex: 1, padding: 14, alignItems: 'center', borderRadius: 14, backgroundColor: '#F1F5F9' },
  modalCancelText: { fontFamily: FONTS.bold, color: '#64748B' },
  modalConfirm: { flex: 1, padding: 14, alignItems: 'center', borderRadius: 14, backgroundColor: COLORS.primary },
  modalConfirmText: { fontFamily: FONTS.bold, color: '#FFF' },
});