import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTasks } from '../../context/TasksContext';

export default function RecruitProfileScreen() {
  const { tasks } = useTasks();
  
  // --- LÓGICA DE GAMIFICATION ---
  const history = tasks.filter(t => t.status === 'approved');
  
  const totalTasksDone = history.length;
  const totalEarnings = history.reduce((acc, curr) => acc + curr.reward, 0);
  
  const LEVEL_THRESHOLD = 500;
  const currentLevel = Math.floor(totalEarnings / LEVEL_THRESHOLD) + 1;
  
  const currentXP = totalEarnings % LEVEL_THRESHOLD;
  const progressPercent = (currentXP / LEVEL_THRESHOLD) * 100;

  const renderStatCard = (icon, label, value, color) => (
    <View style={styles.statCard}>
      <View style={[styles.iconBg, { backgroundColor: color }]}>
        <MaterialCommunityIcons name={icon} size={24} color="#fff" />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#4c1d95', '#7c3aed']} style={styles.header}>
        <View style={styles.profileHeader}>
            <View style={styles.avatarCircle}>
                <MaterialCommunityIcons name="face-man-shimmer" size={50} color="#4c1d95" />
            </View>
            <View>
                <Text style={styles.name}>Recruta Enzo</Text>
                <View style={styles.levelBadge}>
                    <MaterialCommunityIcons name="star" size={12} color="#fbbf24" />
                    <Text style={styles.levelText}>Nível {currentLevel}</Text>
                </View>
            </View>
        </View>

        <View style={styles.xpContainer}>
            <View style={styles.xpRow}>
                <Text style={styles.xpText}>XP: {currentXP}/{LEVEL_THRESHOLD}</Text>
                <Text style={styles.xpText}>Próximo Nível</Text>
            </View>
            <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
            </View>
        </View>
      </LinearGradient>

      <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
        
        <Text style={styles.sectionTitle}>Suas Estatísticas</Text>
        <View style={styles.statsGrid}>
            {renderStatCard('check-circle', 'Missões', totalTasksDone, '#10b981')}
            {renderStatCard('fire', 'Sequência', '3 Dias', '#f59e0b')}
            {renderStatCard('sack', 'Ganho Total', totalEarnings, '#fbbf24')}
        </View>

        <Text style={styles.sectionTitle}>Histórico de Conquistas</Text>
        {history.length === 0 ? (
            <View style={styles.emptyState}>
                <Text style={styles.emptyText}>Nenhuma missão finalizada ainda.</Text>
            </View>
        ) : (
            history.map((task, index) => (
                <View key={index} style={styles.historyCard}>
                    <MaterialCommunityIcons name="check-decagram" size={24} color="#10b981" />
                    <Text style={styles.historyTitle}>{task.title}</Text>
                    <Text style={styles.historyReward}>+{task.reward}</Text>
                </View>
            ))
        )}
        
        <View style={{height: 100}} />

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  header: {
    paddingTop: 60, paddingBottom: 30, paddingHorizontal: 20,
    borderBottomLeftRadius: 30, borderBottomRightRadius: 30,
  },
  profileHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  avatarCircle: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: '#fff',
    justifyContent: 'center', alignItems: 'center', marginRight: 15,
    borderWidth: 3, borderColor: '#fbbf24'
  },
  name: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  levelBadge: { 
    flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginTop: 5, alignSelf: 'flex-start'
  },
  levelText: { color: '#fbbf24', fontWeight: 'bold', marginLeft: 5 },

  xpContainer: { marginTop: 10 },
  xpRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  xpText: { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: '600' },
  progressBarBg: { height: 10, backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 5, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#fbbf24', borderRadius: 5 },

  body: { flex: 1, padding: 20 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 15, marginTop: 10 },
  
  statsGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  statCard: {
    backgroundColor: '#fff', width: '31%', padding: 10, borderRadius: 15,
    alignItems: 'center', elevation: 2
  },
  iconBg: { padding: 8, borderRadius: 10, marginBottom: 5 },
  statValue: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  statLabel: { fontSize: 11, color: '#666' },

  historyCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    padding: 15, borderRadius: 15, marginBottom: 10, elevation: 1
  },
  historyTitle: { flex: 1, marginLeft: 10, fontSize: 15, color: '#333', fontWeight: '500' },
  historyReward: { color: '#10b981', fontWeight: 'bold' },

  emptyState: { alignItems: 'center', padding: 20 },
  emptyText: { color: '#999', fontStyle: 'italic' }
});