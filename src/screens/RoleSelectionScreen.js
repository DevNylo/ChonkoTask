import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  ImageBackground,
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
      Alert.alert("Acesso Negado", "PIN incorreto."); setInputPin('');
    }
  };

  const proceedToHome = (profile) => {
    if (profile.role === 'captain') navigation.replace('CaptainHome', { profile: profile });
    else navigation.replace('RecruitHome', { profile: profile });
  };

  const handleLogout = async () => { await signOut(); };

  const renderProfileCard = ({ item }) => {
    const isCaptain = item.role === 'captain';
    const themeColor = isCaptain ? '#F59E0B' : '#10B981'; 
    const iconName = isCaptain ? "crown" : "emoticon-excited-outline";
    const labelText = isCaptain ? 'ADMIN' : 'RECRUTA';
    const needsLock = (isCaptain || isAdult(item.birth_date)) && item.pin;
    
    return (
      <TouchableOpacity style={styles.cardWrapper} activeOpacity={0.9} onPress={() => handleProfileSelect(item)}>
        <View style={[styles.cardFront, { borderColor: isCaptain ? themeColor : 'rgba(0,0,0,0.08)' }]}>
          
          <View style={[styles.avatarCircle, { backgroundColor: isCaptain ? '#FFFBEB' : '#F0FDF4', borderColor: themeColor }]}>
            <MaterialCommunityIcons name={iconName} size={40} color={themeColor} />
          </View>
          
          <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
          
          <View style={[styles.roleBadge, { backgroundColor: isCaptain ? '#FEF3C7' : '#DCFCE7', borderColor: themeColor }]}>
            <Text style={[styles.roleText, { color: isCaptain ? '#B45309' : '#15803D' }]}>{labelText}</Text>
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
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={{color: COLORS.primary, marginTop: 15, fontWeight: 'bold'}}>Carregando Tropa...</Text>
      </View>
    );
  }

  return (
    <ImageBackground 
        source={require('../../assets/GenericBKG.png')} 
        style={styles.container} 
        resizeMode="cover"
    >
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      {/* HEADER VERDE ESCURO CURVO */}
      <View style={styles.topGreenArea}>
          <View style={styles.headerContent}>
              <View>
                  <Text style={styles.headerTitle}>QUEM ESTÁ NO COMANDO?</Text>
                  <Text style={styles.headerSubtitle}>Selecione seu perfil para iniciar.</Text>
              </View>
              <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
                  <MaterialCommunityIcons name="logout" size={24} color="#D1FAE5" />
              </TouchableOpacity>
          </View>
      </View>

      <View style={styles.listContainer}>
        <FlatList
          data={profiles} keyExtractor={(item) => item.id} numColumns={2}
          columnWrapperStyle={styles.listColumns} contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchProfiles(); }} tintColor={COLORS.primary}/>}
          renderItem={renderProfileCard}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
                <View style={styles.emptyCard}>
                    <MaterialCommunityIcons name="account-search" size={60} color={COLORS.placeholder} />
                    <Text style={styles.emptyTitle}>Nenhum Jogador</Text>
                    <Text style={styles.emptyText}>Não encontramos perfis nesta família.</Text>
                    <TouchableOpacity style={styles.retryBtn} onPress={handleLogout}>
                        <Text style={styles.retryText}>SAIR E REINICIAR</Text>
                    </TouchableOpacity>
                </View>
            </View>
          }
        />
      </View>

      {/* MODAL DE PIN */}
      <Modal visible={showPinModal} transparent={true} animationType="fade" onRequestClose={() => setShowPinModal(false)}>
           <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                  <View style={styles.modalIcon}>
                      <MaterialCommunityIcons name="shield-lock" size={40} color={COLORS.primary} />
                  </View>
                  <Text style={styles.modalTitle}>ÁREA RESTRITA</Text>
                  <Text style={styles.modalSubtitle}>Digite o PIN de {selectedProfile?.name}</Text>
                  
                  <View style={styles.pinInputWrapper}>
                      <TextInput 
                        style={styles.pinInput} 
                        value={inputPin} 
                        onChangeText={setInputPin}
                        keyboardType="numeric" 
                        maxLength={8} 
                        secureTextEntry 
                        placeholder="PIN" 
                        placeholderTextColor={COLORS.placeholder} 
                        autoFocus 
                      />
                  </View>
                  
                  <View style={styles.modalButtons}>
                      <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setShowPinModal(false)}>
                          <Text style={styles.modalBtnTextCancel}>VOLTAR</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.modalBtnConfirm} onPress={verifyPin}>
                          <Text style={styles.modalBtnTextConfirm}>ENTRAR</Text>
                      </TouchableOpacity>
                  </View>
              </View>
           </KeyboardAvoidingView>
      </Modal>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background }, 
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F0F9FF' },

  // --- HEADER VERDE ESCURO (COLORS.primary) ---
  topGreenArea: {
      backgroundColor: COLORS.primary, // Verde Escuro solicitado
      paddingTop: 60,
      paddingBottom: 40,
      borderBottomLeftRadius: 35,
      borderBottomRightRadius: 35,
      marginBottom: 20,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 5,
      elevation: 5,
  },
  headerContent: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 25,
  },
  headerTitle: { fontSize: 18, fontFamily: FONTS.bold, color: '#FFF', letterSpacing: 0.5 },
  headerSubtitle: { fontSize: 14, fontFamily: FONTS.regular, color: '#D1FAE5', marginTop: 4 },
  
  logoutBtn: { padding: 10, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12 },

  // --- LISTA ---
  listContainer: { flex: 1 },
  listContent: { paddingHorizontal: 20, paddingBottom: 40 },
  listColumns: { justifyContent: 'space-between' },

  // --- CARDS (Borda Fina e Sombra Suave) ---
  cardWrapper: { 
      width: CARD_WIDTH, 
      height: 190, 
      marginBottom: 20, 
      borderRadius: 24, 
      shadowColor: "#000", 
      shadowOffset: { width: 0, height: 4 }, 
      shadowOpacity: 0.05, 
      shadowRadius: 8, 
      elevation: 3 
  },
  cardFront: { 
      flex: 1, 
      backgroundColor: '#FFF', 
      borderRadius: 24, 
      borderWidth: 1, // Borda fina
      // borderColor definida no render
      alignItems: 'center', 
      justifyContent: 'center', 
      padding: 15 
  },
  
  avatarCircle: { 
      width: 70, height: 70, 
      borderRadius: 35, 
      justifyContent: 'center', alignItems: 'center', 
      marginBottom: 15,
      borderWidth: 1, 
  },
  cardName: { fontSize: 16, fontFamily: FONTS.bold, color: '#1E293B', textAlign: 'center', marginBottom: 10 },
  
  roleBadge: { 
      paddingHorizontal: 12, paddingVertical: 6, 
      borderRadius: 12, 
      borderWidth: 1 
  },
  roleText: { fontSize: 10, fontFamily: FONTS.bold, textTransform: 'uppercase', letterSpacing: 1 },
  
  lockBadge: { 
      position: 'absolute', top: 15, right: 15, 
      backgroundColor: COLORS.error, 
      width: 30, height: 30, borderRadius: 15, 
      justifyContent: 'center', alignItems: 'center',
      borderWidth: 1.5, borderColor: '#FFF',
      elevation: 3
  },

  // --- EMPTY STATE ---
  emptyContainer: { alignItems: 'center', marginTop: 50 },
  emptyCard: {
      backgroundColor: '#FFF', padding: 30, borderRadius: 24,
      alignItems: 'center', width: '100%',
      borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)',
      shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, elevation: 3
  },
  emptyTitle: { fontSize: 20, fontFamily: FONTS.bold, color: '#1E293B', marginTop: 15 },
  emptyText: { color: COLORS.placeholder, textAlign: 'center', marginTop: 5, marginBottom: 20 },
  retryBtn: { paddingVertical: 12, paddingHorizontal: 25, backgroundColor: '#FEE2E2', borderRadius: 12, borderWidth: 1, borderColor: COLORS.error },
  retryText: { color: COLORS.error, fontFamily: FONTS.bold, fontSize: 12 },

  // --- MODAL ---
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { 
      width: '100%', backgroundColor: '#FFF', borderRadius: 28, padding: 30, alignItems: 'center',
      borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)', // Borda fina no modal
      shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.1, elevation: 10
  },
  modalIcon: { 
      width: 70, height: 70, backgroundColor: '#F0FDF4', borderRadius: 35, 
      justifyContent: 'center', alignItems: 'center', marginBottom: 20,
      borderWidth: 1, borderColor: COLORS.primary
  },
  modalTitle: { fontSize: 22, fontFamily: FONTS.bold, color: '#1E293B', marginBottom: 5 },
  modalSubtitle: { fontSize: 14, color: COLORS.placeholder, marginBottom: 25, fontFamily: FONTS.regular },
  
  pinInputWrapper: { width: '100%', marginBottom: 25 },
  pinInput: { 
      width: '100%', height: 60, 
      borderWidth: 1, borderColor: '#E2E8F0', // Input fino
      borderRadius: 16, backgroundColor: '#F8FAFC', 
      textAlign: 'center', fontSize: 28, fontFamily: FONTS.bold, color: COLORS.primary, letterSpacing: 8 
  },

  modalButtons: { flexDirection: 'row', gap: 15, width: '100%' },
  modalBtnCancel: { flex: 1, height: 50, justifyContent: 'center', alignItems: 'center', borderRadius: 16, backgroundColor: '#F1F5F9' },
  modalBtnConfirm: { flex: 1, height: 50, justifyContent: 'center', alignItems: 'center', borderRadius: 16, backgroundColor: COLORS.primary, shadowColor: COLORS.primary, elevation: 3 },
  modalBtnTextCancel: { fontFamily: FONTS.bold, color: '#64748B' },
  modalBtnTextConfirm: { fontFamily: FONTS.bold, color: '#FFF' },
});