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
    View,
    ImageBackground 
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
  const [currentExperience, setCurrentExperience] = useState(0); 
  const [familyId, setFamilyId] = useState(initialProfile?.family_id);
  
  const [todoMissions, setTodoMissions] = useState([]);
  const [missedMissions, setMissedMissions] = useState([]);
  const [completedMissions, setCompletedMissions] = useState([]); 
  
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
            (payload) => {
                setCurrentBalance(payload.new.balance);
                setCurrentExperience(payload.new.experience || 0); 
            })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'missions' }, 
            () => fetchFreshData())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'mission_attempts', filter: `profile_id=eq.${profileId}` }, 
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
            setCurrentExperience(freshProfile.experience || 0); 
            setFamilyId(freshProfile.family_id);
        }

        const { data: activeMissions, error: mError } = await supabase
            .from('missions').select('*')
            .eq('family_id', freshProfile?.family_id || familyId)
            .eq('status', 'active');

        if (mError) throw mError;

        const todayStr = new Date().toISOString().split('T')[0]; 
        const { data: attempts } = await supabase
            .from('mission_attempts')
            .select('mission_id, status, missions(*)')
            .eq('profile_id', profileId).gte('created_at', todayStr);

        const attemptsMap = new Map();
        const attemptedMissions = [];

        if (attempts) {
            attempts.forEach(a => {
                attemptsMap.set(a.mission_id, a.status);
                if (a.missions) attemptedMissions.push(a.missions);
            });
        }

        const allMissionsMap = new Map();
        activeMissions?.forEach(m => allMissionsMap.set(m.id, m));
        attemptedMissions.forEach(m => allMissionsMap.set(m.id, m));

        const combinedMissions = Array.from(allMissionsMap.values());

        processMissions(combinedMissions, attemptsMap, profileId);

    } catch (error) {
        console.log("Erro no refresh:", error.message);
    } finally {
        setLoading(false);
        setRefreshing(false);
    }
  };

  const processMissions = (missions, attemptsMap, myId) => {
      const today = new Date();
      const currentDayIndex = today.getDay(); 
      const nowTime = today.getHours() * 60 + today.getMinutes();

      const listTodo = [];
      const listMissed = [];
      const listCompleted = [];

      missions.forEach(mission => {
          if (mission.assigned_to && mission.assigned_to !== myId) return;

          const attemptStatus = attemptsMap.get(mission.id);

          if (attemptStatus === 'pending' || attemptStatus === 'approved') {
              listCompleted.push(mission);
              return; 
          }

          if (mission.status !== 'active') return;

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
      setCompletedMissions(listCompleted); 
  };

  const calculateLevelInfo = (totalXp) => {
      const XP_PER_LEVEL = 100; 
      const level = Math.floor(totalXp / XP_PER_LEVEL) + 1;
      const currentLevelXp = totalXp % XP_PER_LEVEL;
      const xpProgressPercentage = (currentLevelXp / XP_PER_LEVEL) * 100;

      return { level, currentLevelXp, XP_PER_LEVEL, xpProgressPercentage };
  };

  const { level, currentLevelXp, XP_PER_LEVEL, xpProgressPercentage } = calculateLevelInfo(currentExperience);

  const renderMissionCard = ({ item, tabType }) => {
    const isCustom = item.reward_type === 'custom';
    const isMissed = tabType === 'missed';
    const isCompleted = tabType === 'completed';
    
    let cardBorderColor, cardBg, iconColor, iconBg, iconName, timeText;

    if (isCompleted) {
        cardBorderColor = '#A7F3D0'; 
        cardBg = '#F0FDF4'; 
        iconColor = '#10B981';
        iconBg = '#D1FAE5';
        iconName = "check-decagram";
        timeText = "Finalizada hoje!";
    } else if (isMissed) {
        cardBorderColor = '#CBD5E1';
        cardBg = '#F1F5F9';
        iconColor = '#94A3B8';
        iconBg = '#E2E8F0';
        iconName = "clock-alert-outline";
        timeText = `Perdida às ${item.deadline?.slice(0,5)}`;
    } else {
        cardBorderColor = isCustom ? '#D8B4FE' : '#6EE7B7';
        cardBg = '#FFFFFF';
        iconColor = isCustom ? '#9333EA' : '#059669';
        iconBg = isCustom ? '#F3E8FF' : '#D1FAE5';
        iconName = item.icon || "star-circle";
        timeText = item.deadline ? `Até as ${item.deadline.slice(0,5)}` : "O dia todo";
    }

    return (
        <TouchableOpacity 
            style={[
                styles.card, 
                { borderColor: cardBorderColor, backgroundColor: cardBg },
                tabType === 'todo' && styles.cardActive 
            ]}
            activeOpacity={tabType === 'todo' ? 0.7 : 1}
            onPress={() => {
                if (isCompleted) Alert.alert("Muito bem!", "Você já finalizou esta missão hoje.");
                else if (isMissed) Alert.alert("Ops!", "O tempo acabou. Tente amanhã!");
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
                     <MaterialCommunityIcons 
                        name={isCompleted ? "check-all" : "clock-outline"} 
                        size={12} 
                        color={isCompleted ? '#10B981' : (isMissed ? '#94A3B8' : '#64748B')} 
                     />
                     <Text style={[styles.cardSub, isCompleted && {color: '#10B981'}]}>
                        {timeText}
                    </Text>
                </View>
            </View>

            <View style={styles.rightColumn}>
                <View style={[
                    styles.rewardPill, 
                    isCustom ? styles.rewardCustom : styles.rewardGold,
                    (isCompleted || isMissed) && { opacity: 0.5 } 
                ]}>
                     <Text style={[styles.rewardText, { color: isCustom ? '#9333EA' : '#B45309' }]}>
                        {isCustom ? "🎁" : `+${item.reward}`}
                    </Text>
                </View>
                
                {tabType === 'todo' && (
                    <MaterialCommunityIcons name="chevron-right" size={24} color="#CBD5E1" style={{marginTop: 4}} />
                )}
            </View>
        </TouchableOpacity>
    );
  };

  const handleShop = () => Alert.alert("Loja do Capitão", "Em breve você poderá trocar suas moedas por prêmios reais!");
  const handleCustomize = () => Alert.alert("Estilo Chonko", "Em breve você poderá vestir seu Chonko!");
  const handleProfile = () => Alert.alert("Perfil", "Em breve suas estatísticas!");

  const handleDevSwitchProfile = async () => {
      try {
          if (navigation.canGoBack()) navigation.goBack(); 
          else navigation.navigate('RoleSelection'); 
      } catch (e) {
          Alert.alert("Aviso", "Deslogando para trocar de conta...");
          await supabase.auth.signOut();
      }
  };

  // Ícones e Textos redefinidos para os Empty States
  let currentListData = [];
  let emptyIcon = "shield-star-outline";
  let emptyTextTitle = "Tudo limpo!";
  let emptyTextSub = "Nenhuma missão por enquanto.";

  if (activeTab === 'todo') {
      currentListData = todoMissions;
      emptyIcon = "shield-star-outline"; // Heroico
      emptyTextTitle = "Tudo feito!";
      emptyTextSub = "Você completou suas missões, Recruta!";
  } else if (activeTab === 'missed') {
      currentListData = missedMissions;
      emptyIcon = "emoticon-happy-outline"; // Positivo por não ter perdido
      emptyTextTitle = "Nenhuma missão perdida.";
      emptyTextSub = "Ótimo trabalho mantendo o foco!";
  } else if (activeTab === 'completed') {
      currentListData = completedMissions;
      emptyIcon = "sword-cross"; // Batalha
      emptyTextTitle = "Nenhuma missão feita hoje.";
      emptyTextSub = "Pegue sua espada e vá completar tarefas!";
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      <TouchableOpacity style={styles.devButton} onPress={handleDevSwitchProfile} activeOpacity={0.8}>
          <MaterialCommunityIcons name="account-switch" size={20} color="#FFF" />
      </TouchableOpacity>
      
      <View style={styles.chonkoStage}>
          <ImageBackground source={require('../../../assets/GenericBKG2.png')} style={styles.skyBackground} resizeMode="cover">
              <View style={styles.modelPlaceholder}>
                  <Chonko3D />
              </View>
          </ImageBackground>

          <View style={styles.hudContainer}>
              <View style={styles.profileBadge}>
                  <View style={styles.levelCircle}>
                      <Text style={styles.levelNumber}>{level}</Text>
                  </View>
                  <View style={styles.profileInfoArea}>
                      <Text style={styles.playerName}>{profileName}</Text>
                      <View style={styles.xpBarContainer}>
                          <View style={[styles.xpBarFill, { width: `${xpProgressPercentage}%` }]} />
                          <Text style={styles.xpText}>{currentLevelXp}/{XP_PER_LEVEL} XP</Text>
                      </View>
                  </View>
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
                  <View style={styles.tabInner}>
                      <MaterialCommunityIcons name="target" size={16} color={activeTab === 'todo' ? COLORS.primary : '#94A3B8'} />
                      <Text style={[styles.tabText, activeTab === 'todo' && styles.tabTextActive]} numberOfLines={1}>
                          FAZER ({todoMissions.length})
                      </Text>
                  </View>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.tab, activeTab === 'missed' && styles.tabActive]} 
                onPress={() => setActiveTab('missed')}
              >
                  <View style={styles.tabInner}>
                      <MaterialCommunityIcons name="ghost-outline" size={16} color={activeTab === 'missed' ? COLORS.primary : '#94A3B8'} />
                      <Text style={[styles.tabText, activeTab === 'missed' && styles.tabTextActive]} numberOfLines={1}>
                          PERDIDAS ({missedMissions.length})
                      </Text>
                  </View>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.tab, activeTab === 'completed' && styles.tabActive]} 
                onPress={() => setActiveTab('completed')}
              >
                  <View style={styles.tabInner}>
                      <MaterialCommunityIcons name="check-decagram" size={16} color={activeTab === 'completed' ? COLORS.primary : '#94A3B8'} />
                      <Text style={[styles.tabText, activeTab === 'completed' && styles.tabTextActive]} numberOfLines={1}>
                          FEITAS ({completedMissions.length})
                      </Text>
                  </View>
              </TouchableOpacity>
          </View>

          {loading ? (
              <ActivityIndicator color={COLORS.primary} style={{marginTop: 40}} />
          ) : (
              <FlatList
                  data={currentListData}
                  keyExtractor={item => item.id}
                  renderItem={({item}) => renderMissionCard({ item, tabType: activeTab })}
                  contentContainerStyle={{ paddingBottom: 160, paddingHorizontal: 5, paddingTop: 5 }}
                  showsVerticalScrollIndicator={false}
                  refreshControl={
                      <RefreshControl refreshing={refreshing} onRefresh={() => {setRefreshing(true); fetchFreshData();}} />
                  }
                  ListEmptyComponent={
                      <View style={styles.emptyContainer}>
                          <MaterialCommunityIcons name={emptyIcon} size={60} color="#CBD5E1" />
                          <Text style={styles.emptyText}>{emptyTextTitle}</Text>
                          <Text style={styles.emptySubText}>{emptyTextSub}</Text>
                      </View>
                  }
              />
          )}
      </View>

      <View style={styles.bottomDockContainer}>
        <View style={styles.dockBackground}>
            <TouchableOpacity style={styles.dockItem} onPress={handleShop}>
                <MaterialCommunityIcons name="storefront-outline" size={28} color="#64748B" />
                <Text style={styles.dockLabel}>Loja</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.dockItem} onPress={handleCustomize}>
                <MaterialCommunityIcons name="palette-outline" size={28} color="#64748B" />
                <Text style={styles.dockLabel}>Visual</Text>
            </TouchableOpacity>

            <View style={{ width: 60 }} />

            <TouchableOpacity style={styles.dockItem}>
                <MaterialCommunityIcons name="medal-outline" size={28} color="#64748B" />
                <Text style={styles.dockLabel}>Troféus</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.dockItem} onPress={handleProfile}>
                <MaterialCommunityIcons name="card-account-details-outline" size={28} color="#64748B" />
                <Text style={styles.dockLabel}>Perfil</Text>
            </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.centerDockButton} activeOpacity={0.9} onPress={() => setActiveTab('todo')}>
            <View style={styles.centerBtnInner}>
                {/* Foguete para o botão central de ação */}
                <MaterialCommunityIcons name="rocket-launch" size={30} color="#fff" />
            </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F9FF' }, 
  
  devButton: {
      position: 'absolute',
      top: 100, 
      right: 20,
      backgroundColor: '#EF4444', 
      padding: 10,
      borderRadius: 25,
      zIndex: 999,
      borderWidth: 2,
      borderColor: '#FFF',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 6,
  },
  
  chonkoStage: { height: '45%', position: 'relative' },
  skyBackground: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  modelPlaceholder: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 20 },

  hudContainer: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 50, position: 'absolute', width: '100%', zIndex: 10 },
  
  profileBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)', paddingRight: 15, borderRadius: 30, paddingLeft: 4, paddingVertical: 4, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.3)' },
  levelCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#8B5CF6', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff', zIndex: 2 },
  levelNumber: { color: '#fff', fontWeight: '900', fontSize: 20 },
  
  profileInfoArea: { marginLeft: 8, justifyContent: 'center' },
  playerName: { color: '#fff', fontFamily: FONTS.bold, fontSize: 16, textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: {width: 1, height: 1}, textShadowRadius: 2 },
  
  xpBarContainer: { width: 100, height: 14, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 7, marginTop: 4, overflow: 'hidden', position: 'relative', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  xpBarFill: { height: '100%', backgroundColor: '#10B981', borderRadius: 7 },
  xpText: { position: 'absolute', width: '100%', textAlign: 'center', fontSize: 9, color: '#fff', fontWeight: 'bold', lineHeight: 14, textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: {width: 0, height: 1}, textShadowRadius: 1 },

  coinBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 30, gap: 8, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.3)', height: 44 },
  coinText: { color: '#FFD700', fontSize: 20, fontFamily: FONTS.bold, textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: {width: 1, height: 1}, textShadowRadius: 2 },
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
  tab: { flex: 1, paddingVertical: 8, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  tabActive: { backgroundColor: '#fff', shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  tabInner: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  tabText: { fontSize: 11, fontWeight: 'bold', color: '#94A3B8' },
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
  
  cardActive: {
      shadowColor: "#1E293B",
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
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

  emptyContainer: { alignItems: 'center', marginTop: 40, opacity: 0.6 },
  emptyText: { marginTop: 15, fontSize: 18, fontWeight: 'bold', color: '#64748B', textAlign: 'center' },
  emptySubText: { marginTop: 5, fontSize: 14, fontWeight: '500', color: '#94A3B8', textAlign: 'center' },

  bottomDockContainer: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    right: 20,
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: 80,
  },
  dockBackground: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 25,
    height: 70,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9'
  },
  dockItem: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 60,
    height: 60,
  },
  dockLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#64748B',
    marginTop: 2
  },
  
  centerDockButton: {
    position: 'absolute',
    bottom: 25,
    alignSelf: 'center',
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#F0F9FF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 12,
  },
  centerBtnInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff'
  }
});