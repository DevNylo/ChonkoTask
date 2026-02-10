import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    RefreshControl,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { COLORS, FONTS } from '../../styles/theme';

export default function RecruitHomeScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  
  // Pegamos apenas o ID para garantir que buscaremos dados frescos
  const { profile: initialProfile } = route.params || {};
  const profileId = initialProfile?.id;

  const [profileName, setProfileName] = useState(initialProfile?.name || "Recruta");
  const [currentBalance, setCurrentBalance] = useState(0); 
  const [familyId, setFamilyId] = useState(initialProfile?.family_id);
  
  const [todoMissions, setTodoMissions] = useState([]);
  const [missedMissions, setMissedMissions] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('todo'); 

  // --- 1. CARREGAMENTO INICIAL ---
  useFocusEffect(
    useCallback(() => {
      if (profileId) fetchFreshData();
    }, [profileId])
  );

  // --- 2. REALTIME (Ouvido Biônico) ---
  useEffect(() => {
      if (!profileId) return;

      console.log("🔌 Radar do Recruta Ativado...");

      const channel = supabase.channel('recruit_dashboard')
        // Escuta MUDANÇAS NO MEU PERFIL (Saldo)
        .on(
            'postgres_changes', 
            { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${profileId}` }, 
            (payload) => {
                console.log(`💰 SALDO ALTERADO: ${payload.new.balance}`);
                setCurrentBalance(payload.new.balance); // Atualiza na hora
            }
        )
        // Escuta MUDANÇAS NAS MISSÕES (Novas ou Aprovadas)
        .on(
            'postgres_changes', 
            { event: '*', schema: 'public', table: 'missions' }, 
            () => {
                console.log("📜 Missões alteradas! Recarregando...");
                fetchFreshData(); 
            }
        )
        .subscribe();

      return () => { supabase.removeChannel(channel); };
  }, [profileId]);

  const fetchFreshData = async () => {
    try {
        // A. Busca Saldo Fresquinho
        const { data: freshProfile, error: pError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', profileId)
            .single();

        if (freshProfile) {
            setProfileName(freshProfile.name);
            setCurrentBalance(freshProfile.balance); // <--- AQUI MOSTRA O 73
            setFamilyId(freshProfile.family_id);
        }

        // B. Busca Missões
        const { data: allMissions, error: mError } = await supabase
            .from('missions')
            .select('*')
            .eq('family_id', freshProfile?.family_id || familyId)
            .eq('status', 'active');

        if (mError) throw mError;

        // C. Filtra o que já fiz hoje
        const todayStr = new Date().toISOString().split('T')[0]; 
        const { data: attempts } = await supabase
            .from('mission_attempts')
            .select('mission_id')
            .eq('profile_id', profileId)
            .gte('created_at', todayStr);

        const doneIds = new Set(attempts?.map(a => a.mission_id));
        
        processMissions(allMissions, doneIds, profileId);

    } catch (error) {
        console.log("Erro no refresh:", error.message);
    } finally {
        setLoading(false);
        setRefreshing(false);
    }
  };

  const processMissions = (missions, doneIds, myId) => {
      const today = new Date();
      const currentDayIndex = today.getDay(); 
      const nowTime = today.getHours() * 60 + today.getMinutes();

      const listTodo = [];
      const listMissed = [];

      missions.forEach(mission => {
          if (doneIds.has(mission.id)) return; // Já fiz
          if (mission.assigned_to && mission.assigned_to !== myId) return; // Não é pra mim

          // Recorrência
          if (mission.is_recurring && mission.recurrence_days) {
              const days = mission.recurrence_days.map(Number);
              if (!days.includes(currentDayIndex)) return;
          }

          // Prazo
          let isExpired = false;
          if (mission.deadline) {
              const [h, m] = mission.deadline.split(':').map(Number);
              if (nowTime > (h * 60 + m)) isExpired = true;
          }

          if (isExpired) listMissed.push(mission);
          else listTodo.push(mission);
      });

      setTodoMissions(listTodo);
      setMissedMissions(listMissed);
  };

  const renderMissionCard = ({ item, isMissed }) => {
    const isCustom = item.reward_type === 'custom';
    const accentColor = isMissed ? '#94A3B8' : (isCustom ? '#A855F7' : '#10B981');
    const iconName = isMissed ? "clock-alert" : (item.icon || "star");

    return (
        <TouchableOpacity 
            style={[styles.card, isMissed && styles.cardMissed]}
            activeOpacity={0.9}
            onPress={() => {
                if (isMissed) Alert.alert("Ops!", "O tempo acabou. Tente amanhã!");
                else navigation.navigate('MissionDetail', { mission: item, profile: { id: profileId, family_id: familyId } });
            }}
        >
            <View style={[styles.iconContainer, { backgroundColor: isMissed ? '#E2E8F0' : (isCustom ? '#F3E8FF' : '#D1FAE5') }]}>
                <MaterialCommunityIcons name={iconName} size={28} color={accentColor} />
            </View>

            <View style={styles.cardInfo}>
                <Text style={[styles.cardTitle, isMissed && {textDecorationLine:'line-through', color:'#94A3B8'}]} numberOfLines={1}>
                    {item.title}
                </Text>
                <Text style={styles.cardSub}>
                    {isMissed 
                        ? `Perdida às ${item.deadline?.slice(0,5)}` 
                        : (item.deadline ? `Até as ${item.deadline.slice(0,5)}` : "Disponível hoje")}
                </Text>
            </View>

            {!isMissed && (
                <View style={styles.rewardPill}>
                    {isCustom ? (
                        <MaterialCommunityIcons name="gift" size={14} color="#A855F7" />
                    ) : (
                        <MaterialCommunityIcons name="circle-multiple" size={14} color="#B45309" />
                    )}
                    <Text style={[styles.rewardText, { color: isCustom ? '#A855F7' : '#B45309' }]}>
                        {isCustom ? "Prêmio" : item.reward}
                    </Text>
                </View>
            )}
        </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0EA5E9" />
      
      {/* === ÁREA 3D / CENÁRIO === */}
      <View style={styles.chonkoStage}>
          {/* Fundo do Cenário */}
          <View style={styles.skyBackground}>
              {/* Espaço reservado para o Modelo 3D */}
              <View style={styles.modelPlaceholder}>
                  {/* Ícone temporário até você por o 3D */}
                  <Image 
                    source={{uri: 'https://cdn-icons-png.flaticon.com/512/4140/4140048.png'}} 
                    style={{width: 140, height: 140, opacity: 0.9}}
                  />
                  <View style={styles.shadowOval} />
              </View>
          </View>

          {/* HUD (Interface Flutuante) */}
          <View style={styles.hudContainer}>
              <View style={styles.levelBadge}>
                  <View style={styles.levelCircle}>
                      <Text style={styles.levelNumber}>1</Text>
                  </View>
                  <Text style={styles.playerName}>{profileName}</Text>
              </View>

              <TouchableOpacity style={styles.coinBadge} onPress={fetchFreshData}>
                  <MaterialCommunityIcons name="circle-multiple" size={24} color="#FFD700" />
                  <Text style={styles.coinText}>{currentBalance}</Text>
                  <View style={styles.plusBtn}>
                      <MaterialCommunityIcons name="plus" size={14} color="#fff" />
                  </View>
              </TouchableOpacity>
          </View>
      </View>

      {/* === PAINEL DE MISSÕES === */}
      <View style={styles.taskSheet}>
          <View style={styles.dragHandle} />
          
          <View style={styles.tabsContainer}>
              <TouchableOpacity 
                style={[styles.tab, activeTab === 'todo' && styles.tabActive]} 
                onPress={() => setActiveTab('todo')}
              >
                  <Text style={[styles.tabText, activeTab === 'todo' && styles.tabTextActive]}>
                      MISSÕES ({todoMissions.length})
                  </Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.tab, activeTab === 'missed' && styles.tabActive]} 
                onPress={() => setActiveTab('missed')}
              >
                  <Text style={[styles.tabText, activeTab === 'missed' && styles.tabTextActive]}>
                      PERDIDAS ({missedMissions.length})
                  </Text>
              </TouchableOpacity>
          </View>

          {loading ? (
              <ActivityIndicator color={COLORS.primary} style={{marginTop: 40}} />
          ) : (
              <FlatList
                  data={activeTab === 'todo' ? todoMissions : missedMissions}
                  keyExtractor={item => item.id}
                  renderItem={({item}) => renderMissionCard({ item, isMissed: activeTab === 'missed' })}
                  contentContainerStyle={{ paddingBottom: 80, paddingHorizontal: 5 }}
                  showsVerticalScrollIndicator={false}
                  refreshControl={
                      <RefreshControl refreshing={refreshing} onRefresh={() => {setRefreshing(true); fetchFreshData();}} />
                  }
                  ListEmptyComponent={
                      <View style={styles.emptyContainer}>
                          <MaterialCommunityIcons 
                            name={activeTab === 'todo' ? "star-face" : "check-circle-outline"} 
                            size={60} color="#CBD5E1" 
                          />
                          <Text style={styles.emptyText}>
                              {activeTab === 'todo' ? "Tudo limpo por aqui!" : "Nenhuma missão perdida."}
                          </Text>
                      </View>
                  }
              />
          )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0EA5E9' }, // Azul Céu Vibrante
  
  // --- CHONKO STAGE ---
  chonkoStage: { height: '45%', position: 'relative' },
  skyBackground: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  modelPlaceholder: { alignItems: 'center', justifyContent: 'center', marginTop: 20 },
  shadowOval: { width: 100, height: 20, backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 50, marginTop: -10, transform: [{scaleX: 1.5}] },

  // HUD
  hudContainer: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 50, position: 'absolute', width: '100%', zIndex: 10 },
  
  levelBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.25)', paddingRight: 15, borderRadius: 30, paddingLeft: 4, paddingVertical: 4, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  levelCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F59E0B', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' },
  levelNumber: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  playerName: { color: '#fff', fontWeight: 'bold', marginLeft: 10, fontSize: 16, textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: {width: 1, height: 1}, textShadowRadius: 3 },

  coinBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.25)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 30, gap: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  coinText: { color: '#FFD700', fontSize: 20, fontFamily: FONTS.bold, textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: {width: 1, height: 1}, textShadowRadius: 2 },
  plusBtn: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#10B981', justifyContent: 'center', alignItems: 'center' },

  // --- TASK SHEET ---
  taskSheet: { 
      flex: 1, 
      backgroundColor: '#F8FAFC', 
      borderTopLeftRadius: 32, 
      borderTopRightRadius: 32, 
      paddingHorizontal: 20, 
      paddingTop: 10,
      shadowColor: "#092F47",
      shadowOffset: { width: 0, height: -5 },
      shadowOpacity: 0.2,
      shadowRadius: 15,
      elevation: 20
  },
  dragHandle: { width: 50, height: 5, backgroundColor: '#CBD5E1', borderRadius: 10, alignSelf: 'center', marginBottom: 20, marginTop: 8 },

  tabsContainer: { flexDirection: 'row', backgroundColor: '#E2E8F0', borderRadius: 16, padding: 4, marginBottom: 20 },
  tab: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  tabActive: { backgroundColor: '#fff', shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  tabText: { fontSize: 13, fontWeight: 'bold', color: '#94A3B8' },
  tabTextActive: { color: COLORS.primary },

  // Cards
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 16, borderRadius: 20, marginBottom: 12, borderWidth: 1, borderColor: '#F1F5F9', shadowColor: "#64748B", shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  cardMissed: { opacity: 0.6, backgroundColor: '#F8FAFC' },
  iconContainer: { width: 54, height: 54, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: 16, fontFamily: FONTS.bold, color: COLORS.textPrimary, marginBottom: 4 },
  cardSub: { fontSize: 12, color: '#94A3B8', fontWeight: '500' },
  
  rewardPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF7ED', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: '#FFEDD5', gap: 6 },
  rewardText: { fontSize: 14, fontWeight: 'bold' },

  emptyContainer: { alignItems: 'center', marginTop: 60, opacity: 0.6 },
  emptyText: { marginTop: 15, fontSize: 16, fontWeight: 'bold', color: '#94A3B8' },
});