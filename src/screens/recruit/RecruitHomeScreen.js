import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    FlatList,
    RefreshControl,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { COLORS, FONTS } from '../../styles/theme';

// Importe seu componente 3D
import Chonko3D from '../../components/Chonko3D.js';

const { width } = Dimensions.get('window');

export default function RecruitHomeScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  
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

  useFocusEffect(
    useCallback(() => {
      if (profileId) fetchFreshData();
    }, [profileId])
  );

  useEffect(() => {
      if (!profileId) return;
      const channel = supabase.channel('recruit_dashboard')
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${profileId}` }, 
            (payload) => setCurrentBalance(payload.new.balance))
        .on('postgres_changes', { event: '*', schema: 'public', table: 'missions' }, 
            () => fetchFreshData())
        .subscribe();
      return () => { supabase.removeChannel(channel); };
  }, [profileId]);

  const fetchFreshData = async () => {
    try {
        const { data: freshProfile, error: pError } = await supabase
            .from('profiles').select('*').eq('id', profileId).single();

        if (freshProfile) {
            setProfileName(freshProfile.name);
            setCurrentBalance(freshProfile.balance);
            setFamilyId(freshProfile.family_id);
        }

        const { data: allMissions, error: mError } = await supabase
            .from('missions').select('*')
            .eq('family_id', freshProfile?.family_id || familyId)
            .eq('status', 'active');

        if (mError) throw mError;

        const todayStr = new Date().toISOString().split('T')[0]; 
        const { data: attempts } = await supabase
            .from('mission_attempts').select('mission_id')
            .eq('profile_id', profileId).gte('created_at', todayStr);

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
          if (doneIds.has(mission.id)) return;
          if (mission.assigned_to && mission.assigned_to !== myId) return;

          if (mission.is_recurring && mission.recurrence_days) {
              const days = mission.recurrence_days.map(Number);
              if (!days.includes(currentDayIndex)) return;
          }

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
    
    const cardBorderColor = isMissed ? '#CBD5E1' : (isCustom ? '#D8B4FE' : '#6EE7B7');
    const cardBg = isMissed ? '#F1F5F9' : '#FFFFFF';
    const iconColor = isMissed ? '#94A3B8' : (isCustom ? '#9333EA' : '#059669');
    const iconBg = isMissed ? '#E2E8F0' : (isCustom ? '#F3E8FF' : '#D1FAE5');
    const iconName = isMissed ? "clock-alert-outline" : (item.icon || "star-circle");

    return (
        <TouchableOpacity 
            style={[
                styles.card, 
                { borderColor: cardBorderColor, backgroundColor: cardBg },
                !isMissed && styles.cardActive 
            ]}
            activeOpacity={0.7}
            onPress={() => {
                if (isMissed) Alert.alert("Ops!", "O tempo acabou. Tente amanhã!");
                else navigation.navigate('MissionDetail', { mission: item, profile: { id: profileId, family_id: familyId } });
            }}
        >
            <View style={[styles.iconContainer, { backgroundColor: iconBg }]}>
                <MaterialCommunityIcons name={iconName} size={32} color={iconColor} />
            </View>

            <View style={styles.cardInfo}>
                <Text style={[styles.cardTitle, isMissed && styles.textMissed]} numberOfLines={1}>
                    {item.title}
                </Text>
                
                <View style={styles.timeBadge}>
                     <MaterialCommunityIcons name="clock-outline" size={12} color={isMissed ? '#94A3B8' : '#64748B'} />
                     <Text style={styles.cardSub}>
                        {isMissed 
                            ? `Perdida às ${item.deadline?.slice(0,5)}` 
                            : (item.deadline ? `Até as ${item.deadline.slice(0,5)}` : "O dia todo")}
                    </Text>
                </View>
            </View>

            <View style={styles.rightColumn}>
                {!isMissed && (
                    <View style={[styles.rewardPill, isCustom ? styles.rewardCustom : styles.rewardGold]}>
                         <Text style={[styles.rewardText, { color: isCustom ? '#9333EA' : '#B45309' }]}>
                            {isCustom ? "🎁" : `+${item.reward}`}
                        </Text>
                    </View>
                )}
                {!isMissed && (
                    <MaterialCommunityIcons name="chevron-right" size={24} color="#CBD5E1" style={{marginTop: 4}} />
                )}
            </View>
        </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0EA5E9" />
      
      <View style={styles.chonkoStage}>
          <View style={styles.skyBackground}>
              <View style={styles.modelPlaceholder}>
                  <Chonko3D />
              </View>
          </View>

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

      <View style={styles.taskSheet}>
          <View style={styles.dragHandle} />
          
          <View style={styles.tabsContainer}>
              <TouchableOpacity 
                style={[styles.tab, activeTab === 'todo' && styles.tabActive]} 
                onPress={() => setActiveTab('todo')}
              >
                  <Text style={[styles.tabText, activeTab === 'todo' && styles.tabTextActive]}>
                      🚀 MISSÕES ({todoMissions.length})
                  </Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.tab, activeTab === 'missed' && styles.tabActive]} 
                onPress={() => setActiveTab('missed')}
              >
                  <Text style={[styles.tabText, activeTab === 'missed' && styles.tabTextActive]}>
                      💤 PERDIDAS ({missedMissions.length})
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
                  contentContainerStyle={{ paddingBottom: 100, paddingHorizontal: 5, paddingTop: 5 }}
                  showsVerticalScrollIndicator={false}
                  refreshControl={
                      <RefreshControl refreshing={refreshing} onRefresh={() => {setRefreshing(true); fetchFreshData();}} />
                  }
                  ListEmptyComponent={
                      <View style={styles.emptyContainer}>
                          <MaterialCommunityIcons 
                            name={activeTab === 'todo' ? "check-decagram" : "sleep"} 
                            size={70} color="#CBD5E1" 
                          />
                          <Text style={styles.emptyText}>
                              {activeTab === 'todo' ? "Tudo feito! Você é incrível!" : "Nenhuma missão perdida."}
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
  container: { flex: 1, backgroundColor: '#0EA5E9' }, 
  
  chonkoStage: { height: '45%', position: 'relative' },
  skyBackground: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  modelPlaceholder: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 20 },

  hudContainer: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 50, position: 'absolute', width: '100%', zIndex: 10 },
  levelBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.4)', paddingRight: 15, borderRadius: 30, paddingLeft: 4, paddingVertical: 4, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.5)' },
  levelCircle: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#F59E0B', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' },
  levelNumber: { color: '#fff', fontWeight: 'bold', fontSize: 18 },
  playerName: { color: '#fff', fontWeight: 'bold', marginLeft: 10, fontSize: 16, textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: {width: 1, height: 1}, textShadowRadius: 3 },
  coinBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.4)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 30, gap: 8, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.5)' },
  coinText: { color: '#FFD700', fontSize: 20, fontFamily: FONTS.bold },
  plusBtn: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#10B981', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#fff' },

  taskSheet: { 
      flex: 1, 
      backgroundColor: '#F0F9FF',
      borderTopLeftRadius: 32, 
      borderTopRightRadius: 32, 
      paddingHorizontal: 16, 
      paddingTop: 10,
      shadowColor: "#092F47",
      shadowOffset: { width: 0, height: -5 },
      shadowOpacity: 0.2,
      shadowRadius: 15,
      elevation: 20
  },
  dragHandle: { width: 60, height: 6, backgroundColor: '#CBD5E1', borderRadius: 10, alignSelf: 'center', marginBottom: 20, marginTop: 8 },
  
  tabsContainer: { flexDirection: 'row', backgroundColor: '#E2E8F0', borderRadius: 16, padding: 4, marginBottom: 20 },
  tab: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  tabActive: { backgroundColor: '#fff', shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  tabText: { fontSize: 13, fontWeight: 'bold', color: '#94A3B8' },
  tabTextActive: { color: COLORS.primary },

  card: { 
      flexDirection: 'row', 
      alignItems: 'center', 
      padding: 16, 
      borderRadius: 24, 
      marginBottom: 16, 
      borderWidth: 3, 
      minHeight: 90, 
  },
  
  // --- AQUI ESTÁ A CORREÇÃO DA SOMBRA ---
  cardActive: {
      // Sombra para iOS (Mais marcada e escura)
      shadowColor: "#1E293B", // Azul escuro quase preto
      shadowOffset: { width: 0, height: 6 }, // Deslocamento vertical maior
      shadowOpacity: 0.2, // Mais visível
      shadowRadius: 4, // Levemente suave nas bordas
      
      // Sombra para Android
      elevation: 6, 
  },
  
  iconContainer: { 
      width: 60, 
      height: 60, 
      borderRadius: 20, 
      justifyContent: 'center', 
      alignItems: 'center', 
      marginRight: 16 
  },
  
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: 18, fontFamily: FONTS.bold, color: '#1E293B', marginBottom: 6 },
  textMissed: { textDecorationLine: 'line-through', color: '#94A3B8' },
  
  timeBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cardSub: { fontSize: 13, color: '#64748B', fontWeight: '600' },

  rightColumn: { alignItems: 'flex-end', justifyContent: 'center' },
  
  rewardPill: { 
      paddingHorizontal: 10, 
      paddingVertical: 6, 
      borderRadius: 12, 
      borderWidth: 2, 
      marginBottom: 4,
      minWidth: 50,
      alignItems: 'center'
  },
  rewardGold: { backgroundColor: '#FFF7ED', borderColor: '#FDBA74' },
  rewardCustom: { backgroundColor: '#F3E8FF', borderColor: '#D8B4FE' },
  
  rewardText: { fontSize: 15, fontWeight: '900' },

  emptyContainer: { alignItems: 'center', marginTop: 60, opacity: 0.6 },
  emptyText: { marginTop: 15, fontSize: 18, fontWeight: 'bold', color: '#94A3B8', textAlign: 'center' },
});