import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { COLORS, FONTS } from '../styles/theme';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 50) / 2; 

export default function RoleSelectionScreen() {
  const navigation = useNavigation();
  const { session, signOut } = useAuth();
  
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [inputPin, setInputPin] = useState('');

  useFocusEffect(
    useCallback(() => { fetchProfiles(); }, [])
  );

  const fetchProfiles = async () => {
    try {
      if (!session?.user) return;
      const { data: myProfile } = await supabase.from('profiles').select('family_id').eq('user_id', session.user.id).maybeSingle();
      let familyId = myProfile?.family_id;

      if (!familyId) {
          const { data: createdFamily } = await supabase.from('families').select('id').eq('created_by', session.user.id).maybeSingle();
          familyId = createdFamily?.id;
      }

      if (!familyId) {
          setProfiles([]); setLoading(false); return;
      }

      const { data: profilesData, error: profilesError } = await supabase.from('profiles').select('*').eq('family_id', familyId).order('role', { ascending: true });
      if (profilesError) throw profilesError;
      setProfiles(profilesData || []);

    } catch (error) { console.log("Erro perfis:", error); } 
    finally { setLoading(false); setRefreshing(false); }
  };

  const isAdult = (dateString) => {
    if (!dateString) return false;
    const birth = new Date(dateString);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) { age--; }
    return age >= 18;
  };

  const handleProfileSelect = (profile) => {
    const needsPin = (profile.role === 'captain' || isAdult(profile.birth_date)) && profile.pin;
    if (needsPin) {
      setSelectedProfile(profile); setInputPin(''); setShowPinModal(true);
    } else {
      proceedToHome(profile);
    }
  };

  const verifyPin = () => {
    if (inputPin === selectedProfile.pin) {
      setShowPinModal(false); proceedToHome(selectedProfile);
    } else {
      Alert.alert("Ops!", "PIN incorreto. Tente novamente."); setInputPin('');
    }
  };

  const proceedToHome = (profile) => {
    if (profile.role === 'captain') navigation.replace('CaptainHome', { profile: profile });
    else navigation.replace('RecruitTabs', { profile: profile });
  };

  const handleLogout = async () => { await signOut(); };

  const renderProfileCard = ({ item }) => {
    const isCaptain = item.role === 'captain';
    
    // Cores dinâmicas baseadas na identidade visual fofa
    const themeColor = isCaptain ? '#F59E0B' : '#10B981'; // Laranja/Verde base
    const bgColor = isCaptain ? '#FFFBEB' : '#F0FDF4'; // Fundo pastel
    const borderColor = isCaptain ? '#FCD34D' : '#6EE7B7'; // Borda vibrante
    const iconName = isCaptain ? "crown" : "star-face"; // star-face combina mais com gamificação
    const labelText = isCaptain ? 'CAPITÃO' : 'AVENTUREIRO'; // Trocado RECRUTA por AVENTUREIRO (seu tema)
    
    const needsLock = (isCaptain || isAdult(item.birth_date)) && item.pin;
    
    return (
      <TouchableOpacity style={styles.cardWrapper} activeOpacity={0.8} onPress={() => handleProfileSelect(item)}>
        <View style={styles.cardShadow} />
        <View style={[styles.cardFront, { backgroundColor: bgColor, borderColor: borderColor }]}>
          
          <View style={[styles.avatarCircle, { backgroundColor: '#FFF', borderColor: borderColor }]}>
            <MaterialCommunityIcons name={iconName} size={42} color={themeColor} />
          </View>
          
          <Text style={[styles.cardName, { color: isCaptain ? '#92400E' : '#065F46' }]} numberOfLines={1}>
            {item.name}
          </Text>
          
          <View style={[styles.roleBadge, { backgroundColor: isCaptain ? '#FEF3C7' : '#D1FAE5' }]}>
            <Text style={[styles.roleText, { color: isCaptain ? '#D97706' : '#059669' }]}>{labelText}</Text>
          </View>
          
          {needsLock && (
            <View style={styles.lockBadge}>
               <MaterialCommunityIcons name="lock" size={14} color="#FFF" />
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#10B981" />
        <Text style={styles.loadingText}>Acordando o Chonko...</Text>
      </View>
    );
  }

  return (
    // MUDANÇA AQUI: ImageBackground removido, agora é uma View comum com cor sólida
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      {/* HEADER GRADIENTE COM BORDA ARREDONDADA */}
      <LinearGradient 
        colors={['#c8e6b2', '#76ce8f']} 
        start={{ x: 1, y: 0}} 
        end={{ x: 1, y: 0 }} 
        style={styles.topGreenArea}
      >
          <View style={styles.headerContent}>
              <View>
                  <Text style={styles.headerTitle}>QUEM ESTÁ NO COMANDO?</Text>
                  <Text style={styles.headerSubtitle}>Escolha seu perfil para começar</Text>
              </View>
              <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
                  <MaterialCommunityIcons name="door-open" size={26} color="#FFF" />
              </TouchableOpacity>
          </View>
      </LinearGradient>

      <View style={styles.listContainer}>
        <FlatList
          data={profiles} keyExtractor={(item) => item.id} numColumns={2}
          columnWrapperStyle={styles.listColumns} contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchProfiles(); }} tintColor="#10B981"/>}
          renderItem={renderProfileCard}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
                <View style={styles.emptyCard}>
                    <MaterialCommunityIcons name="account-group" size={60} color="#94A3B8" />
                    <Text style={styles.emptyTitle}>Família Vazia?</Text>
                    <Text style={styles.emptyText}>Parece que ninguém chegou ainda. Adicione aventureiros!</Text>
                    <TouchableOpacity style={styles.retryBtn} onPress={handleLogout}>
                        <Text style={styles.retryText}>VOLTAR AO INÍCIO</Text>
                    </TouchableOpacity>
                </View>
            </View>
          }
        />
      </View>

      {/* MODAL DE PIN CHONKO-STYLE */}
      <Modal visible={showPinModal} transparent={true} animationType="fade" onRequestClose={() => setShowPinModal(false)}>
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                  <View style={styles.modalIcon}>
                      <MaterialCommunityIcons name="shield-key" size={45} color="#10B981" />
                  </View>
                  <Text style={styles.modalTitle}>ÁREA RESTRITA</Text>
                  <Text style={styles.modalSubtitle}>Digite a senha de {selectedProfile?.name}</Text>
                  
                  <View style={styles.pinInputWrapper}>
                      <TextInput 
                        style={styles.pinInput} 
                        value={inputPin} 
                        onChangeText={setInputPin}
                        keyboardType="numeric" 
                        maxLength={4} // Geralmente PIN de família é 4 dígitos, ajuste se necessário
                        secureTextEntry 
                        placeholder="••••" 
                        placeholderTextColor="#CBD5E1" 
                        autoFocus 
                      />
                  </View>
                  
                  <View style={styles.modalButtons}>
                      <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setShowPinModal(false)}>
                          <Text style={styles.modalBtnTextCancel}>CANCELAR</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.modalBtnConfirm} onPress={verifyPin}>
                          <Text style={styles.modalBtnTextConfirm}>ENTRAR</Text>
                      </TouchableOpacity>
                  </View>
              </View>
            </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  // MUDANÇA AQUI: Cor de fundo creme suave
  container: { flex: 1, backgroundColor: '#FDFCF8' }, 
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F0FDF4' },
  loadingText: { color: '#065F46', marginTop: 15, fontFamily: FONTS.bold, fontSize: 16 },

  // --- HEADER GRADIENTE ---
  topGreenArea: {
      paddingTop: Platform.OS === 'ios' ? 60 : StatusBar.currentHeight + 20,
      paddingBottom: 35,
      borderBottomLeftRadius: 40,
      borderBottomRightRadius: 40,
      marginBottom: 25,
      shadowColor: "#059669",
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 8,
  },
  headerContent: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 25,
  },
  headerTitle: { fontSize: 20, fontFamily: FONTS.bold, color: '#FFF', letterSpacing: 0.5 },
  headerSubtitle: { fontSize: 15, fontFamily: FONTS.regular, color: '#D1FAE5', marginTop: 4 },
  logoutBtn: { padding: 12, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 16 },

  // --- LISTA ---
  listContainer: { flex: 1 },
  listContent: { paddingHorizontal: 20, paddingBottom: 40 },
  listColumns: { justifyContent: 'space-between' },

  // --- CARDS CHONKO (Estilo Bubbly) ---
  cardWrapper: { 
      width: CARD_WIDTH, 
      height: 200, 
      marginBottom: 25, 
      position: 'relative',
  },
  cardShadow: {
      position: 'absolute', top: 6, left: 0, width: '100%', height: '100%',
      backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: 28,
  },
  cardFront: { 
      flex: 1, 
      borderRadius: 28, 
      borderWidth: 3, 
      alignItems: 'center', 
      justifyContent: 'center', 
      padding: 15,
  },
  avatarCircle: { 
      width: 76, height: 76, 
      borderRadius: 38, 
      justifyContent: 'center', alignItems: 'center', 
      marginBottom: 12,
      borderWidth: 3, 
  },
  cardName: { fontSize: 18, fontFamily: FONTS.bold, textAlign: 'center', marginBottom: 8 },
  roleBadge: { 
      paddingHorizontal: 14, paddingVertical: 6, 
      borderRadius: 16, 
  },
  roleText: { fontSize: 11, fontFamily: FONTS.bold, letterSpacing: 0.5 },
  
  lockBadge: { 
      position: 'absolute', top: 12, right: 12, 
      backgroundColor: '#EF4444', 
      width: 32, height: 32, borderRadius: 16, 
      justifyContent: 'center', alignItems: 'center',
      borderWidth: 2, borderColor: '#FFF',
      shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, elevation: 4
  },

  // --- EMPTY STATE ---
  emptyContainer: { alignItems: 'center', marginTop: 40 },
  emptyCard: {
      backgroundColor: 'rgba(255,255,255,0.9)', padding: 35, borderRadius: 30,
      alignItems: 'center', width: '100%',
      borderWidth: 3, borderColor: '#E2E8F0',
  },
  emptyTitle: { fontSize: 22, fontFamily: FONTS.bold, color: '#334155', marginTop: 15 },
  emptyText: { color: '#64748B', textAlign: 'center', marginTop: 8, marginBottom: 25, fontSize: 15, lineHeight: 22 },
  retryBtn: { paddingVertical: 14, paddingHorizontal: 30, backgroundColor: '#F1F5F9', borderRadius: 16, borderWidth: 2, borderColor: '#CBD5E1' },
  retryText: { color: '#475569', fontFamily: FONTS.bold, fontSize: 14 },

  // --- MODAL DE PIN CHONKO ---
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.7)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { 
      width: '95%', maxWidth: 360, backgroundColor: '#FFF', borderRadius: 32, padding: 30, alignItems: 'center',
      borderWidth: 4, borderColor: '#6EE7B7', 
  },
  modalIcon: { 
      width: 80, height: 80, backgroundColor: '#D1FAE5', borderRadius: 40, 
      justifyContent: 'center', alignItems: 'center', marginBottom: 20,
      borderWidth: 3, borderColor: '#34D399', marginTop: -60, // Ícone saindo para fora do modal (efeito premium)
  },
  modalTitle: { fontSize: 24, fontFamily: FONTS.bold, color: '#064E3B', marginBottom: 5 },
  modalSubtitle: { fontSize: 15, color: '#64748B', marginBottom: 25, fontFamily: FONTS.regular, textAlign: 'center' },
  
  pinInputWrapper: { width: '100%', marginBottom: 30 },
  pinInput: { 
      width: '100%', height: 70, 
      borderWidth: 3, borderColor: '#E2E8F0', 
      borderRadius: 20, backgroundColor: '#F8FAFC', 
      textAlign: 'center', fontSize: 34, fontFamily: FONTS.bold, color: '#059669', letterSpacing: 15 
  },

  modalButtons: { flexDirection: 'row', gap: 15, width: '100%' },
  modalBtnCancel: { flex: 1, height: 55, justifyContent: 'center', alignItems: 'center', borderRadius: 18, backgroundColor: '#F1F5F9', borderWidth: 2, borderColor: '#E2E8F0' },
  modalBtnConfirm: { flex: 1, height: 55, justifyContent: 'center', alignItems: 'center', borderRadius: 18, backgroundColor: '#10B981', borderWidth: 2, borderColor: '#059669' },
  modalBtnTextCancel: { fontFamily: FONTS.bold, color: '#64748B', fontSize: 15 },
  modalBtnTextConfirm: { fontFamily: FONTS.bold, color: '#FFF', fontSize: 15 },
});