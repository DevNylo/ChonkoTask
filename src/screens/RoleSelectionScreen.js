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
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

// IMPORTAÇÃO DO TEMA
import { COLORS, FONTS } from '../styles/theme';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 60) / 2;

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
    const themeColor = isCaptain ? COLORS.gold : COLORS.primary; 
    const iconName = isCaptain ? "crown" : "emoticon-excited-outline";
    const labelText = isCaptain ? 'ADMIN' : 'RECRUTA';
    const needsLock = (isCaptain || isAdult(item.birth_date)) && item.pin;
    
    return (
      <TouchableOpacity style={styles.cardContainer} activeOpacity={0.9} onPress={() => handleProfileSelect(item)}>
        <View style={styles.cardShadow} />
        <View style={[styles.cardFront, { borderColor: themeColor }]}>
          <View style={[styles.avatarCircle, { borderColor: themeColor, backgroundColor: themeColor }]}>
            <MaterialCommunityIcons name={iconName} size={32} color={COLORS.surface} />
          </View>
          <Text style={[styles.cardName, { color: COLORS.primary }]} numberOfLines={1}>{item.name}</Text>
          <View style={[styles.roleBadge, { backgroundColor: themeColor }]}>
            <Text style={styles.roleText}>{labelText}</Text>
          </View>
          {needsLock && (
            <View style={styles.lockBadge}>
               <MaterialCommunityIcons name="lock" size={12} color={COLORS.surface} />
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: COLORS.secondary }]}>
        <ActivityIndicator size="large" color={COLORS.surface} />
        <Text style={{color: COLORS.surface, marginTop: 10, fontWeight: 'bold'}}>Carregando Tropa...</Text>
      </View>
    );
  }

  return (
    <ImageBackground source={require('../../assets/FamillyCreate.png')} style={styles.container} resizeMode="cover">
      <View style={styles.overlay}>
        
        <View style={styles.topBar}>
             <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
                <View style={styles.logoutShadow} />
                <View style={styles.logoutFront}>
                    <MaterialCommunityIcons name="logout" size={20} color={COLORS.surface} />
                </View>
            </TouchableOpacity>
        </View>

        <View style={styles.titleContainer}>
             <Text style={styles.headerTitle}>QUEM ASSUME O COMANDO?</Text>
             <Text style={styles.headerSubtitle}>Escolha seu perfil.</Text>
        </View>

        <FlatList
          data={profiles} keyExtractor={(item) => item.id} numColumns={2}
          columnWrapperStyle={styles.listColumns} contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchProfiles(); }} tintColor={COLORS.primary}/>}
          renderItem={renderProfileCard}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
                <View style={styles.emptyCard}>
                   <MaterialCommunityIcons name="account-search" size={50} color={COLORS.primary} />
                   <Text style={styles.emptyTitle}>Nenhum Jogador</Text>
                   <Text style={styles.emptyText}>Não encontramos perfis nesta família.</Text>
                   <TouchableOpacity style={styles.retryBtn} onPress={handleLogout}>
                      <Text style={styles.retryText}>SAIR E REINICIAR</Text>
                   </TouchableOpacity>
                </View>
            </View>
          }
        />

        <Modal visible={showPinModal} transparent={true} animationType="fade" onRequestClose={() => setShowPinModal(false)}>
           <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                  <View style={styles.modalIcon}>
                     <MaterialCommunityIcons name="shield-check" size={40} color={COLORS.primary} />
                  </View>
                  <Text style={styles.modalTitle}>ACESSO RESTRITO</Text>
                  <Text style={styles.modalSubtitle}>Digite o PIN de {selectedProfile?.name}</Text>
                  <View style={styles.pinInputWrapper}>
                     <TextInput style={styles.pinInput} value={inputPin} onChangeText={setInputPin}
                        keyboardType="numeric" maxLength={8} secureTextEntry placeholder="PIN" placeholderTextColor={COLORS.placeholder} autoFocus />
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

      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  overlay: { flex: 1, backgroundColor: COLORS.overlay, paddingTop: 50 }, 
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  topBar: { width: '100%', alignItems: 'flex-end', paddingHorizontal: 20, marginBottom: 10 },
  logoutBtn: { width: 44, height: 44, position: 'relative' },
  logoutShadow: { position: 'absolute', top: 4, left: 0, width: '100%', height: '100%', backgroundColor: COLORS.shadow, borderRadius: 12 },
  logoutFront: { width: '100%', height: '100%', backgroundColor: COLORS.error, borderRadius: 12, borderWidth: 2, borderColor: COLORS.shadow, justifyContent: 'center', alignItems: 'center', marginTop: -2 },

  titleContainer: { alignItems: 'center', marginBottom: 30, paddingHorizontal: 20 },
  headerTitle: { fontSize: 24, fontFamily: FONTS.bold, color: COLORS.textPrimary, letterSpacing: 0.5, textAlign: 'center' },
  headerSubtitle: { fontSize: 16, fontFamily: FONTS.regular, color: COLORS.textSecondary, marginTop: 2, textAlign: 'center' },

  listContent: { paddingBottom: 40, paddingHorizontal: 20 },
  listColumns: { justifyContent: 'space-between' },

  cardContainer: { width: CARD_WIDTH, height: 190, marginBottom: 20, position: 'relative' },
  cardShadow: { position: 'absolute', top: 6, left: 0, right: 0, bottom: -6, backgroundColor: COLORS.shadow, borderRadius: 24 },
  cardFront: { flex: 1, backgroundColor: COLORS.surface, borderRadius: 24, borderWidth: 3, alignItems: 'center', justifyContent: 'center', padding: 10 },
  
  avatarCircle: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', borderWidth: 0, marginBottom: 12, elevation: 2 },
  cardName: { fontSize: 18, fontFamily: FONTS.bold, textAlign: 'center', marginBottom: 8 },
  roleBadge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12 },
  roleText: { fontSize: 12, fontFamily: FONTS.bold, color: COLORS.surface, textTransform: 'uppercase', letterSpacing: 1 },
  lockBadge: { position: 'absolute', top: 12, right: 12, backgroundColor: COLORS.error, width: 26, height: 26, borderRadius: 13, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: COLORS.surface },

  modalOverlay: { flex: 1, backgroundColor: COLORS.modalOverlay, justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { width: '100%', backgroundColor: COLORS.surface, borderRadius: 24, padding: 24, borderWidth: 3, borderColor: COLORS.primary, alignItems: 'center' },
  modalIcon: { width: 60, height: 60, backgroundColor: COLORS.surfaceAlt, borderRadius: 30, justifyContent: 'center', alignItems: 'center', marginBottom: 15, borderWidth: 2, borderColor: COLORS.primary },
  modalTitle: { fontSize: 22, fontFamily: FONTS.bold, color: COLORS.primary, marginBottom: 5 },
  modalSubtitle: { fontSize: 14, color: '#666', marginBottom: 20, fontFamily: FONTS.regular },
  
  pinInputWrapper: { width: '100%', marginBottom: 20 },
  pinInput: { width: '100%', height: 50, borderWidth: 2, borderColor: COLORS.primary, borderRadius: 12, backgroundColor: COLORS.surfaceAlt, textAlign: 'center', fontSize: 24, fontFamily: FONTS.bold, color: COLORS.primary, letterSpacing: 5 },

  modalButtons: { flexDirection: 'row', gap: 10, width: '100%' },
  modalBtnCancel: { flex: 1, height: 50, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: COLORS.primary, borderRadius: 12, backgroundColor: '#F1F5F9' },
  modalBtnConfirm: { flex: 1, height: 50, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: COLORS.primary, borderRadius: 12, backgroundColor: COLORS.primary },
  modalBtnTextCancel: { fontFamily: FONTS.bold, color: COLORS.primary },
  modalBtnTextConfirm: { fontFamily: FONTS.bold, color: COLORS.surface },

  emptyContainer: { alignItems: 'center', marginTop: 50 },
  emptyCard: { backgroundColor: COLORS.surface, padding: 30, borderRadius: 20, borderWidth: 3, borderColor: COLORS.primary, alignItems: 'center', width: '100%' },
  emptyTitle: { fontSize: 20, fontFamily: FONTS.bold, color: COLORS.primary, marginTop: 10 },
  emptyText: { color: '#666', textAlign: 'center', marginVertical: 10 },
  retryBtn: { marginTop: 10, padding: 10, backgroundColor: COLORS.error, borderRadius: 10 },
  retryText: { color: COLORS.surface, fontFamily: FONTS.bold, fontSize: 12 }
});