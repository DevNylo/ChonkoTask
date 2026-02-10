import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { COLORS, FONTS } from '../../styles/theme';

export default function FamilySettingsScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { session } = useAuth();
  const { familyId, currentProfileId } = route.params;

  const [family, setFamily] = useState(null);
  const [members, setMembers] = useState([]);
  
  // Estados do Código
  const [inviteCode, setInviteCode] = useState(null);
  const [expiresAt, setExpiresAt] = useState(null);
  const [timeLeft, setTimeLeft] = useState('');
  const [isExpired, setIsExpired] = useState(false);
  
  const [loading, setLoading] = useState(true);
  const [generatingCode, setGeneratingCode] = useState(false);
  
  const timerRef = useRef(null);

  useEffect(() => {
    fetchFamilyData();
    generateNewCode(); 

    return () => {
        if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  useEffect(() => {
      if (!expiresAt) return;
      const updateTimer = () => {
          const now = new Date();
          const end = new Date(expiresAt);
          const diff = end - now;

          if (diff <= 0) {
              setIsExpired(true);
              setTimeLeft("00:00");
              if (timerRef.current) clearInterval(timerRef.current);
          } else {
              setIsExpired(false);
              const minutes = Math.floor(diff / 60000);
              const seconds = Math.floor((diff % 60000) / 1000);
              setTimeLeft(`${String(minutes).padStart(2,'0')}:${String(seconds).padStart(2,'0')}`);
          }
      };
      updateTimer();
      timerRef.current = setInterval(updateTimer, 1000);
      return () => clearInterval(timerRef.current);
  }, [expiresAt]);

  const fetchFamilyData = async () => {
    try {
        const { data: familyData } = await supabase.from('families').select('*').eq('id', familyId).single();
        setFamily(familyData);

        const { data: membersData } = await supabase
            .from('profiles')
            .select('*')
            .eq('family_id', familyId)
            .order('role', { ascending: true }); // Captain first
        
        setMembers(membersData || []);
    } catch (error) { console.log(error); } 
    finally { setLoading(false); }
  };

  const generateNewCode = async () => {
      setGeneratingCode(true);
      try {
          const { data, error } = await supabase
            .rpc('request_invite_code', { 
                p_family_id: familyId, 
                p_user_id: session.user.id 
            });
          
          if (error) throw error;
          
          if (data) {
              setInviteCode(data.code);
              setExpiresAt(data.expires_at);
              setIsExpired(false);
          }
      } catch (e) {
          Alert.alert("Erro", "Não foi possível gerar o código.");
      } finally {
          setGeneratingCode(false);
      }
  };

  const copyToClipboard = async () => {
      if (inviteCode && !isExpired) {
          await Clipboard.setStringAsync(inviteCode);
          Alert.alert("Copiado!", "Código na área de transferência.");
      }
  };

  const shareCode = async () => {
      if (inviteCode && !isExpired) {
          await Share.share({
              message: `Entre na minha equipe no Chonko Task! Código: ${inviteCode} (Válido até ${new Date(expiresAt).toLocaleTimeString()})`,
          });
      }
  };

  // --- FUNÇÃO CENTRAL DE GESTÃO (RPC) ---
  const handleManageMember = async (member, action) => {
      try {
          const { error } = await supabase.rpc('manage_family_member', {
              p_target_profile_id: member.id,
              p_action: action
          });

          if (error) throw error;

          Alert.alert("Sucesso!", "Alteração realizada.");
          fetchFamilyData(); // Recarrega a lista

      } catch (error) {
          Alert.alert("Erro", error.message || "Falha na operação.");
      }
  };

  const confirmAction = (member, action) => {
      let title = "";
      let message = "";

      if (action === 'promote') {
          title = "Promover a Capitão?";
          message = `${member.name} terá poder total para criar missões e aprovar tarefas.`;
      } else if (action === 'demote') {
          title = "Rebaixar para Recruta?";
          message = `${member.name} perderá o acesso de admin.`;
      } else if (action === 'remove') {
          title = "Expulsar da Tropa?";
          message = `Tem certeza que deseja remover ${member.name}? Essa ação não pode ser desfeita.`;
      }

      Alert.alert(title, message, [
          { text: "Cancelar", style: "cancel" },
          { 
            text: "Confirmar", 
            style: action === 'remove' ? 'destructive' : 'default',
            onPress: () => handleManageMember(member, action) 
          }
      ]);
  };

  const renderMember = ({ item }) => {
      const isMe = item.id === currentProfileId;
      const isCaptain = item.role === 'captain';

      return (
          <View style={styles.memberCard}>
              <View style={styles.memberInfo}>
                  <View style={[styles.avatarBox, isCaptain ? {borderColor: COLORS.gold} : {borderColor: COLORS.primary}]}>
                      <MaterialCommunityIcons name={isCaptain ? "crown" : "account"} size={24} color={isCaptain ? COLORS.gold : COLORS.primary} />
                  </View>
                  <View>
                      <Text style={styles.memberName}>{item.name} {isMe && "(Você)"}</Text>
                      <Text style={[styles.memberRole, {color: isCaptain ? '#b45309' : '#15803d'}]}>
                          {isCaptain ? "CAPITÃO" : "RECRUTA"}
                      </Text>
                  </View>
              </View>

              {/* Ações (Só mostra se não for eu mesmo) */}
              {!isMe && (
                  <View style={styles.actionsContainer}>
                      {/* Botão Promover/Rebaixar */}
                      <TouchableOpacity 
                        style={styles.actionBtn} 
                        onPress={() => confirmAction(item, isCaptain ? 'demote' : 'promote')}
                      >
                          <MaterialCommunityIcons 
                              name={isCaptain ? "arrow-down-bold-box-outline" : "arrow-up-bold-box-outline"} 
                              size={28} 
                              color={COLORS.placeholder} 
                          />
                      </TouchableOpacity>

                      {/* Botão Remover (Lixeira) */}
                      <TouchableOpacity 
                        style={[styles.actionBtn, {backgroundColor: '#fee2e2'}]} 
                        onPress={() => confirmAction(item, 'remove')}
                      >
                          <MaterialCommunityIcons 
                              name="trash-can-outline" 
                              size={24} 
                              color={COLORS.error} 
                          />
                      </TouchableOpacity>
                  </View>
              )}
          </View>
      );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <MaterialCommunityIcons name="arrow-left" size={28} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>GERENCIAR TROPA</Text>
        <View style={{width: 28}} /> 
      </View>

      {loading ? <ActivityIndicator size="large" color={COLORS.primary} style={{marginTop:50}} /> : (
          <View style={styles.content}>
              
              <View style={styles.codeCard}>
                  {!isExpired && (
                      <View style={styles.timerBadge}>
                          <MaterialCommunityIcons name="timer-sand" size={14} color="#b45309" />
                          <Text style={styles.timerText}>EXPIRA EM {timeLeft}</Text>
                      </View>
                  )}

                  <Text style={styles.codeLabel}>CÓDIGO DE ACESSO</Text>
                  
                  {generatingCode ? (
                      <ActivityIndicator color={COLORS.primary} style={{marginVertical: 10}} />
                  ) : (
                      <>
                          {isExpired ? (
                              <View style={{alignItems: 'center', marginVertical: 10}}>
                                  <MaterialCommunityIcons name="lock-clock" size={40} color={COLORS.placeholder} />
                                  <Text style={styles.expiredText}>O código expirou.</Text>
                                  <TouchableOpacity style={styles.regenerateBtn} onPress={generateNewCode}>
                                      <MaterialCommunityIcons name="refresh" size={20} color="#fff" />
                                      <Text style={styles.regenerateText}>GERAR NOVO CÓDIGO</Text>
                                  </TouchableOpacity>
                              </View>
                          ) : (
                              <>
                                  <TouchableOpacity style={styles.codeBox} onPress={copyToClipboard}>
                                      <Text style={styles.codeText}>{typeof inviteCode === 'string' ? inviteCode : '...'}</Text>
                                      <MaterialCommunityIcons name="content-copy" size={20} color={COLORS.placeholder} style={{position:'absolute', right: 15}}/>
                                  </TouchableOpacity>
                                  <Text style={styles.codeDesc}>Use no dispositivo do seu filho para conectar.</Text>
                                  <TouchableOpacity style={styles.shareBtn} onPress={shareCode}>
                                      <MaterialCommunityIcons name="share-variant" size={20} color="#fff" />
                                      <Text style={styles.shareText}>COMPARTILHAR</Text>
                                  </TouchableOpacity>
                              </>
                          )}
                      </>
                  )}
              </View>

              <Text style={styles.sectionTitle}>MEMBROS DO ESQUADRÃO</Text>
              <FlatList 
                  data={members}
                  keyExtractor={item => item.id}
                  renderItem={renderMember}
                  contentContainerStyle={{paddingBottom: 50}}
                  showsVerticalScrollIndicator={false}
              />

          </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 50, paddingBottom: 15 },
  headerTitle: { fontFamily: FONTS.bold, fontSize: 18, color: COLORS.surface, letterSpacing: 1 },
  backBtn: { padding: 5, backgroundColor: COLORS.surface, borderRadius: 10 },
  content: { padding: 20, flex: 1 },

  // Code Card
  codeCard: { backgroundColor: COLORS.surface, borderRadius: 20, padding: 20, marginBottom: 30, borderWidth: 3, borderColor: COLORS.primary, alignItems: 'center', position: 'relative', minHeight: 180, justifyContent: 'center' },
  timerBadge: { position: 'absolute', top: 10, right: 10, flexDirection: 'row', alignItems: 'center', backgroundColor: '#fffbeb', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: COLORS.gold },
  timerText: { fontSize: 10, fontFamily: FONTS.bold, color: '#b45309', marginLeft: 4 },
  codeLabel: { fontFamily: FONTS.bold, fontSize: 12, color: COLORS.placeholder, marginBottom: 10, marginTop: 10 },
  codeBox: { width: '100%', flexDirection: 'row', backgroundColor: '#F3F4F6', paddingVertical: 15, borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#E5E7EB', marginBottom: 10 },
  codeText: { fontFamily: FONTS.bold, fontSize: 32, color: COLORS.textPrimary, letterSpacing: 6 },
  codeDesc: { fontFamily: FONTS.regular, fontSize: 12, color: '#666', textAlign: 'center', marginBottom: 20, paddingHorizontal: 10 },
  shareBtn: { width: '100%', flexDirection: 'row', backgroundColor: COLORS.primary, paddingVertical: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'center', gap: 8 },
  shareText: { fontFamily: FONTS.bold, color: '#fff', fontSize: 14 },
  expiredText: { fontFamily: FONTS.bold, color: COLORS.placeholder, marginVertical: 10 },
  regenerateBtn: { flexDirection: 'row', backgroundColor: COLORS.secondary, paddingVertical: 12, paddingHorizontal: 20, borderRadius: 12, alignItems: 'center', gap: 8, marginTop: 5 },
  regenerateText: { fontFamily: FONTS.bold, color: '#fff' },

  // Members
  sectionTitle: { fontFamily: FONTS.bold, fontSize: 14, color: COLORS.surface, marginBottom: 15, opacity: 0.8 },
  memberCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.surface, padding: 15, borderRadius: 16, marginBottom: 10, borderWidth: 2, borderColor: COLORS.primary },
  memberInfo: { flexDirection: 'row', alignItems: 'center', gap: 15 },
  avatarBox: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center', borderWidth: 2 },
  memberName: { fontFamily: FONTS.bold, fontSize: 16, color: COLORS.textPrimary },
  memberRole: { fontFamily: FONTS.bold, fontSize: 12 },
  
  // Actions
  actionsContainer: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  actionBtn: { padding: 8, borderRadius: 8, backgroundColor: '#F3F4F6' },
});