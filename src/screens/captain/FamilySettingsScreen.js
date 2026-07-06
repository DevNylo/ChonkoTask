import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as Clipboard from 'expo-clipboard';
import { LinearGradient } from 'expo-linear-gradient'; // <--- IMPORTADO
import { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Share,
    StatusBar,
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

  const handleManageMember = async (member, action) => {
      try {
          const { error } = await supabase.rpc('manage_family_member', {
              p_target_profile_id: member.id,
              p_action: action
          });

          if (error) throw error;

          Alert.alert("Sucesso!", "Alteração realizada.");
          fetchFamilyData(); 

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
                  <View style={[styles.avatarBox, isCaptain ? {backgroundColor: '#FEF3C7', borderColor: '#F59E0B'} : {backgroundColor: '#F0FDF4', borderColor: '#10B981'}]}>
                      <MaterialCommunityIcons name={isCaptain ? "crown" : "account"} size={24} color={isCaptain ? '#F59E0B' : '#10B981'} />
                  </View>
                  <View>
                      <Text style={styles.memberName}>{item.name} {isMe && "(Você)"}</Text>
                      <Text style={[styles.memberRole, {color: isCaptain ? '#B45309' : '#15803D'}]}>
                          {isCaptain ? "CAPITÃO" : "RECRUTA"}
                      </Text>
                  </View>
              </View>

              {!isMe && (
                  <View style={styles.actionsContainer}>
                      <TouchableOpacity 
                        style={styles.actionBtn} 
                        onPress={() => confirmAction(item, isCaptain ? 'demote' : 'promote')}
                      >
                          <MaterialCommunityIcons 
                              name={isCaptain ? "arrow-down-bold-box-outline" : "arrow-up-bold-box-outline"} 
                              size={24} 
                              color="#007004" 
                          />
                      </TouchableOpacity>

                      <TouchableOpacity 
                        style={[styles.actionBtn, {backgroundColor: '#FEF2F2'}]} 
                        onPress={() => confirmAction(item, 'remove')}
                      >
                          <MaterialCommunityIcons 
                              name="trash-can-outline" 
                              size={24} 
                              color="#EF4444" 
                          />
                      </TouchableOpacity>
                  </View>
              )}
          </View>
      );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      {/* --- HEADER COM GRADIENTE VERDE --- */}
      <LinearGradient
          colors={['#064E3B', '#10B981']} // Verde Escuro -> Verde Chonko
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.topGreenArea}
      >
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                <MaterialCommunityIcons name="arrow-left" size={24} color={'#FFFF'} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>GERENCIAR TROPA</Text>
            <View style={{width: 40}} /> 
          </View>
      </LinearGradient>
      {/* ---------------------------------- */}

      {loading ? <ActivityIndicator size="large" color={COLORS.primary} style={{marginTop:50}} /> : (
          <FlatList 
            data={members}
            keyExtractor={item => item.id}
            renderItem={renderMember}
            contentContainerStyle={styles.content}
            ListHeaderComponent={
                <>
                    <View style={styles.codeCard}>
                        {!isExpired && (
                            <View style={styles.timerBadge}>
                                <MaterialCommunityIcons name="timer-sand" size={14} color="#B45309" />
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
                                        <MaterialCommunityIcons name="lock-clock" size={40} color="#CBD5E1" />
                                        <Text style={styles.expiredText}>O código expirou.</Text>
                                        <TouchableOpacity style={styles.regenerateBtn} onPress={generateNewCode}>
                                            <MaterialCommunityIcons name="refresh" size={20} color="#FFF" />
                                            <Text style={styles.regenerateText}>GERAR NOVO</Text>
                                        </TouchableOpacity>
                                    </View>
                                ) : (
                                    <>
                                        <TouchableOpacity style={styles.codeBox} onPress={copyToClipboard}>
                                            <Text style={styles.codeText}>{typeof inviteCode === 'string' ? inviteCode : '...'}</Text>
                                            <MaterialCommunityIcons name="content-copy" size={20} color="#94A3B8" style={{position:'absolute', right: 15}}/>
                                        </TouchableOpacity>
                                        <Text style={styles.codeDesc}>Use no dispositivo do seu filho para conectar.</Text>
                                        
                                        <TouchableOpacity style={styles.shareBtn} onPress={shareCode}>
                                            <MaterialCommunityIcons name="share-variant" size={20} color="#FFF" />
                                            <Text style={styles.shareText}>COMPARTILHAR CÓDIGO</Text>
                                        </TouchableOpacity>
                                    </>
                                )}
                            </>
                        )}
                    </View>

                    <Text style={styles.sectionTitle}>MEMBROS DO ESQUADRÃO</Text>
                </>
            }
          />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F9FF' },
  
  // --- ESTILO DO HEADER AJUSTADO ---
  topGreenArea: {
      paddingTop: 50,
      paddingBottom: 25,
      borderBottomLeftRadius: 35, // Suave
      borderBottomRightRadius: 35, // Suave
      zIndex: 10,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20 },
  headerTitle: { fontFamily: FONTS.bold, fontSize: 16, color: '#FFFFFF', letterSpacing: 1 }, // Cor ajustada para branco
  backBtn: { padding: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 14 }, // Suave

  content: { padding: 20, paddingBottom: 50 },

  // --- CARD DO CÓDIGO (Suave) ---
  codeCard: { 
      backgroundColor: '#FFF', borderRadius: 24, padding: 20, marginBottom: 30, 
      borderWidth: 1, borderColor: 'rgba(0,0,0,0.08)', // Borda fina
      alignItems: 'center', position: 'relative', 
      shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 3 
  },
  
  timerBadge: { position: 'absolute', top: 15, right: 15, flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFBEB', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: '#F59E0B' },
  timerText: { fontSize: 10, fontFamily: FONTS.bold, color: '#B45309', marginLeft: 4 },
  
  codeLabel: { fontFamily: FONTS.bold, fontSize: 12, color: '#94A3B8', marginBottom: 15, marginTop: 5, letterSpacing: 1 },
  
  codeBox: { width: '100%', flexDirection: 'row', backgroundColor: '#F8FAFC', paddingVertical: 15, borderRadius: 16, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 10 },
  codeText: { fontFamily: FONTS.bold, fontSize: 32, color: '#1E293B', letterSpacing: 6 },
  codeDesc: { fontFamily: FONTS.regular, fontSize: 12, color: '#64748B', textAlign: 'center', marginBottom: 20, paddingHorizontal: 10 },
  
  shareBtn: { width: '100%', flexDirection: 'row', backgroundColor: '#10B981', paddingVertical: 14, borderRadius: 16, alignItems: 'center', justifyContent: 'center', gap: 8, shadowColor: "#10B981", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 6, elevation: 4 },
  shareText: { fontFamily: FONTS.bold, color: '#FFF', fontSize: 14 },
  
  expiredText: { fontFamily: FONTS.bold, color: '#94A3B8', marginVertical: 10 },
  regenerateBtn: { flexDirection: 'row', backgroundColor: '#3B82F6', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 14, alignItems: 'center', gap: 8, marginTop: 5 },
  regenerateText: { fontFamily: FONTS.bold, color: '#FFF' },

  // --- MEMBROS ---
  sectionTitle: { fontFamily: FONTS.bold, fontSize: 12, color: '#64748B', marginBottom: 15, opacity: 0.8, textTransform: 'uppercase', letterSpacing: 0.5 },
  
  memberCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFF', padding: 15, borderRadius: 20, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)', shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 4, elevation: 2 },
  
  memberInfo: { flexDirection: 'row', alignItems: 'center', gap: 15 },
  avatarBox: { width: 48, height: 48, borderRadius: 16, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  memberName: { fontFamily: FONTS.bold, fontSize: 16, color: '#1E293B' },
  memberRole: { fontFamily: FONTS.bold, fontSize: 11, marginTop: 2 },
  
  // --- AÇÕES ---
  actionsContainer: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  actionBtn: { padding: 8, borderRadius: 12, backgroundColor: '#F8FAFC' },
});