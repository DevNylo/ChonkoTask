import { MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import {
    Alert,
    FlatList,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { COLORS, FONTS } from '../../styles/theme';
// --- IMPORTAÇÃO DO CATÁLOGO ---
import { ICONS_CATALOG } from '../../constants/IconsCatalog';

// --- CONFIGURAÇÃO ---
const DIFFICULTY_TIERS = [
    { id: 'easy', label: 'FÁCIL', value: 50, color: '#10B981', icon: 'feather', bg: '#ECFDF5' },
    { id: 'medium', label: 'MÉDIO', value: 150, color: '#F59E0B', icon: 'shield-half-full', bg: '#FFFBEB' },
    { id: 'hard', label: 'DIFÍCIL', value: 300, color: '#EF4444', icon: 'skull-outline', bg: '#FEF2F2' },
    { id: 'epic', label: 'ÉPICO', value: 1000, color: '#8B5CF6', icon: 'crown-outline', bg: '#F5F3FF' },
];

const PROBABILITY_OPTIONS = [10, 25, 50, 100];

const WEEKDAYS = [
    { id: 0, label: 'DOM' }, { id: 1, label: 'SEG' }, { id: 2, label: 'TER' }, 
    { id: 3, label: 'QUA' }, { id: 4, label: 'QUI' }, { id: 5, label: 'SEX' }, { id: 6, label: 'SÁB' }
];

export default function CreateMissionScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { missionToEdit, templateData } = route.params || {};
  const paramsFamilyId = route.params?.familyId;
  const initialData = missionToEdit || templateData || {};
  const isEditingTemplate = !!templateData;

  const [loading, setLoading] = useState(false);
  const [profiles, setProfiles] = useState([]);
  const [currentFamilyId, setCurrentFamilyId] = useState(paramsFamilyId || null);

  // Estados Básicos
  const [title, setTitle] = useState(initialData.title || '');
  const [description, setDescription] = useState(initialData.description || '');
  const [rewardType, setRewardType] = useState(initialData.reward_type || 'coins');
  const [coinReward, setCoinReward] = useState(initialData.reward ? String(initialData.reward) : '');
  const [customReward, setCustomReward] = useState(initialData.custom_reward || '');
  
  // Ícone e Categoria (NOVO STATE)
  const [selectedIcon, setSelectedIcon] = useState(initialData.icon || 'star');
  const [selectedCategory, setSelectedCategory] = useState('casa'); // Padrão: Casa (tarefas domésticas)

  const [selectedDifficulty, setSelectedDifficulty] = useState(initialData.difficulty || null); 
  
  // Tesouro Chonko
  const [useCritical, setUseCritical] = useState(initialData.use_critical || false);
  const [criticalType, setCriticalType] = useState(initialData.critical_type || 'bonus_coins'); 
  const [criticalCustomReward, setCriticalCustomReward] = useState(initialData.critical_custom_reward || '');
  const [criticalChance, setCriticalChance] = useState(initialData.critical_chance || 20);

  // Agendamento
  const [assignee, setAssignee] = useState(initialData.assigned_to || null);
  const [assigneeName, setAssigneeName] = useState('TODOS');
  const [showAssigneeModal, setShowAssigneeModal] = useState(false);
  const [isRecurring, setIsRecurring] = useState(initialData.is_recurring || false);
  const [selectedDays, setSelectedDays] = useState(initialData.recurrence_days || []);
  
  // Data (Padrão: Hoje)
  const [missionDate, setMissionDate] = useState(initialData.scheduled_date ? new Date(initialData.scheduled_date + 'T00:00:00') : new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [startTime, setStartTime] = useState(initialData.start_time ? initialData.start_time.substring(0,5) : '');
  const [deadline, setDeadline] = useState(initialData.deadline ? initialData.deadline.substring(0,5) : '');
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);

  useEffect(() => { 
      if (!currentFamilyId) fetchUserFamily();
      else fetchProfiles(currentFamilyId); 
  }, [currentFamilyId]);

  const fetchUserFamily = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
          const { data } = await supabase.from('profiles').select('family_id').eq('id', user.id).single();
          if (data) {
              setCurrentFamilyId(data.family_id);
              fetchProfiles(data.family_id);
          }
      }
  };

  useEffect(() => {
      if (profiles.length > 0) {
          if (assignee) {
              const found = profiles.find(p => p.id === assignee);
              if (found) setAssigneeName(found.name);
          } else { setAssigneeName('TODOS'); }
      }
  }, [profiles, assignee]);

  const fetchProfiles = async (fid) => {
      const { data } = await supabase.from('profiles').select('id, name').eq('family_id', fid).neq('role', 'captain');
      setProfiles(data || []);
  };

  // --- HANDLERS ---
  const handleDifficultySelect = (tier) => {
      setSelectedDifficulty(tier.id);
      if (rewardType === 'coins') setCoinReward(String(tier.value));
      if (tier.id === 'epic') Alert.alert("⚠️ Cuidado Capitão!", "Tarefa ÉPICA selecionada. O esforço deve ser alto!");
  };

  const handleTimeChange = (text, setFunc) => {
      let cleaned = text.replace(/[^0-9:]/g, '');
      if (cleaned.length > 5) return; 
      setFunc(cleaned);
  };

  const handleTimeBlur = (value, setter) => {
      if (!value) return;
      let clean = value.replace(/[^0-9]/g, '');
      let formatted = '';
      if (clean.length === 1) formatted = `0${clean}:00`;       
      else if (clean.length === 2) formatted = parseInt(clean) > 23 ? `0${clean[0]}:${clean[1]}0` : `${clean}:00`;
      else if (clean.length === 3) formatted = `0${clean[0]}:${clean.substring(1)}`; 
      else if (clean.length >= 4) formatted = `${clean.substring(0,2)}:${clean.substring(2,4)}`;
      setter(formatted);
  };

  const handleDateChange = (event, selectedDate) => {
      setShowDatePicker(false);
      if (selectedDate) setMissionDate(selectedDate);
  };

  const toggleDay = (id) => {
      if (selectedDays.includes(id)) setSelectedDays(selectedDays.filter(d => d !== id));
      else setSelectedDays([...selectedDays, id].sort());
  };

  const handleLaunch = async (shouldUpdateTemplate = false) => {
      // VALIDAÇÕES
      if (!title) return Alert.alert("Faltou o Título", "O que deve ser feito?");
      if (!selectedDifficulty) return Alert.alert("Faltou a Dificuldade", "Selecione: Fácil, Média, Difícil ou Épica.");
      
      if (isRecurring && selectedDays.length === 0) return Alert.alert("Recorrência Vazia", "Selecione quais dias da semana essa tarefa repete.");

      if (rewardType === 'coins') {
          if (!coinReward) return Alert.alert("Faltou a Recompensa", "Defina o valor em moedas.");
          if (parseInt(coinReward) > 9999) return Alert.alert("Muita Grana!", "O limite é 9999 moedas para manter a economia saudável.");
      } else {
          if (!customReward) return Alert.alert("Faltou a Recompensa", "Descreva o que a criança vai ganhar.");
      }

      if (useCritical && criticalType === 'custom_item' && !criticalCustomReward) {
           return Alert.alert("Tesouro Vazio", "Você ativou o Item Surpresa mas não disse o que é.");
      }

      setLoading(true);
      
      const formattedDate = missionDate.toISOString().split('T')[0];

      const payload = {
          family_id: currentFamilyId, 
          title, 
          description, 
          icon: selectedIcon, 
          status: 'active',
          assigned_to: assignee,
          reward_type: rewardType, 
          reward: rewardType === 'coins' ? parseInt(coinReward) : 0, 
          custom_reward: rewardType === 'custom' ? customReward : null,
          is_recurring: isRecurring, 
          recurrence_days: isRecurring ? selectedDays : null,
          scheduled_date: isRecurring ? null : formattedDate, 
          start_time: startTime.length === 5 ? startTime : null, 
          deadline: deadline.length === 5 ? deadline : null,
          is_template: false,
          difficulty: selectedDifficulty,
          use_critical: useCritical,
          critical_chance: useCritical ? criticalChance : 0, 
          critical_bonus: (useCritical && criticalType === 'bonus_coins') ? 50 : 0, 
          critical_type: criticalType, 
          critical_custom_reward: (useCritical && criticalType === 'custom_item') ? criticalCustomReward : null
      };

      try {
          if (isEditingTemplate && shouldUpdateTemplate) {
              await supabase.from('missions').update({ ...payload, status: 'template', is_template: true }).eq('id', templateData.id);
          } else if (!isEditingTemplate && saveAsTemplate) {
              await supabase.from('missions').insert([{ ...payload, status: 'template', is_template: true }]);
          }

          if (missionToEdit) {
              await supabase.from('missions').update(payload).eq('id', missionToEdit.id);
              Alert.alert("Sucesso", "Missão atualizada!");
          } else {
              const { error } = await supabase.from('missions').insert([payload]);
              if (error) throw error;
              Alert.alert("Sucesso", "Missão lançada!");
          }
          navigation.goBack();
      } catch (error) { 
          Alert.alert("Erro ao Salvar", error.message); 
      } finally { 
          setLoading(false); 
      }
  };

  // --- PREVIEW CARD ---
  const MissionPreviewCard = () => {
      const diffColor = selectedDifficulty ? DIFFICULTY_TIERS.find(t => t.id === selectedDifficulty)?.color : '#CBD5E1';
      const diffLabel = selectedDifficulty ? DIFFICULTY_TIERS.find(t => t.id === selectedDifficulty)?.label : '???';
      
      let recurrenceText = "Data Única";
      if (isRecurring) {
          if (selectedDays.length === 0) recurrenceText = "Selecione os dias...";
          else if (selectedDays.length === 7) recurrenceText = "Todo dia";
          else recurrenceText = selectedDays.map(d => WEEKDAYS[d].label.substring(0,3)).join(', ');
      } else {
          recurrenceText = missionDate.toLocaleDateString('pt-BR');
      }

      return (
        <View style={styles.previewContainer}>
            <Text style={styles.sectionLabel}>PRÉ-VISUALIZAÇÃO</Text>
            <View style={[styles.cardFront, { borderColor: diffColor }]}>
                <View style={{flexDirection: 'row', alignItems: 'center'}}>
                    <View style={[styles.previewIconBox, { backgroundColor: diffColor + '20' }]}>
                        <MaterialCommunityIcons name={selectedIcon} size={32} color={diffColor} />
                    </View>
                    <View style={{flex: 1}}>
                        <Text style={styles.previewTitle} numberOfLines={1}>{title || "Nova Missão"}</Text>
                        <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4}}>
                            <View style={[styles.tag, { backgroundColor: rewardType === 'coins' ? '#FFFBEB' : '#FDF2F8', borderColor: rewardType === 'coins' ? '#FCD34D' : '#F472B6' }]}>
                                <MaterialCommunityIcons name={rewardType === 'coins' ? "circle-multiple" : "gift"} size={12} color={rewardType === 'coins' ? '#B45309' : '#DB2777'} />
                                <Text style={[styles.tagText, { color: rewardType === 'coins' ? '#B45309' : '#DB2777' }]}>
                                    {rewardType === 'coins' ? (coinReward || "0") : (customReward || "Prêmio")}
                                </Text>
                            </View>
                            {selectedDifficulty && (
                                <View style={[styles.tag, { backgroundColor: diffColor + '20', borderColor: diffColor }]}>
                                    <Text style={[styles.tagText, { color: diffColor }]}>{diffLabel}</Text>
                                </View>
                            )}
                            <View style={[styles.tag, { backgroundColor: '#F0FDF4', borderColor: '#16A34A' }]}>
                                <MaterialCommunityIcons name="account" size={12} color="#15803D" />
                                <Text style={[styles.tagText, { color: '#15803D' }]}>{assigneeName}</Text>
                            </View>
                        </View>
                    </View>
                </View>
                
                <View style={{flexDirection:'row', alignItems:'center', marginTop: 10, paddingTop:10, borderTopWidth:1, borderColor:'#F1F5F9'}}>
                    <MaterialCommunityIcons name={isRecurring ? "calendar-sync" : "calendar"} size={14} color="#64748B" />
                    <Text style={{fontSize:12, color:'#64748B', marginLeft:5, fontWeight:'bold'}}>{recurrenceText}</Text>
                    {(startTime || deadline) && (
                        <Text style={{fontSize:12, color:'#64748B', marginLeft:10}}>
                              •  {startTime || "00:00"} - {deadline || "..."}
                        </Text>
                    )}
                </View>

                {useCritical && (
                    <View style={[styles.previewTreasureBox, criticalType === 'bonus_coins' ? styles.treasureGold : styles.treasurePurple]}>
                        <View style={{flexDirection:'row', alignItems:'center'}}>
                            <MaterialCommunityIcons name={criticalType === 'bonus_coins' ? "arrow-up-bold-circle" : "gift-open"} size={20} color="#FFF" />
                            <Text style={styles.treasureTitle}>
                                {criticalType === 'bonus_coins' ? `BÔNUS (${criticalChance}%)` : `ITEM SURPRESA (${criticalChance}%)`}
                            </Text>
                        </View>
                    </View>
                )}
            </View>
        </View>
      );
  };

  return (
    <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        
        {/* --- HEADER COM GRADIENTE --- */}
        <LinearGradient
            colors={['#064E3B', '#10B981']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.topGreenArea}
        >
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color={'#FFF'}/>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{missionToEdit ? "EDITAR" : "NOVA MISSÃO"}</Text>
                <View style={{width: 40}}/>
            </View>
        </LinearGradient>

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{flex:1}}>
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                
                <MissionPreviewCard />

                <View style={styles.formContainer}>
                    
                    {/* 1. DETALHES */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>O QUE FAZER?</Text>
                        <TextInput style={styles.input} placeholder="Ex: Arrumar Cama" placeholderTextColor="#94A3B8" value={title} onChangeText={setTitle} />
                        <TextInput style={[styles.input, {height:60, marginTop:10, textAlignVertical:'top'}]} placeholder="Descrição (Opcional)" placeholderTextColor="#94A3B8" multiline value={description} onChangeText={setDescription} />
                        
                        <View style={{marginTop: 15}}>
                             <Text style={[styles.label, {marginBottom: 5}]}>QUEM VAI FAZER?</Text>
                             <TouchableOpacity style={styles.dropdown} onPress={()=>setShowAssigneeModal(true)}>
                                <Text style={styles.dropdownText}>{assigneeName}</Text>
                                <MaterialCommunityIcons name="chevron-down" size={24} color="#64748B" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* 2. DIFICULDADE (OBRIGATÓRIO) */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>DIFICULDADE <Text style={{color: '#EF4444'}}>*</Text></Text>
                        <View style={styles.difficultyRow}>
                            {DIFFICULTY_TIERS.map(tier => (
                                <TouchableOpacity key={tier.id} style={[styles.difficultyBtn, { borderColor: tier.color, backgroundColor: selectedDifficulty === tier.id ? tier.color : '#FFF' }]} onPress={() => handleDifficultySelect(tier)}>
                                    <MaterialCommunityIcons name={tier.icon} size={20} color={selectedDifficulty === tier.id ? '#FFF' : tier.color} />
                                    <Text style={[styles.difficultyText, { color: selectedDifficulty === tier.id ? '#FFF' : tier.color }]}>{tier.label}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    {/* 3. RECOMPENSA */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>RECOMPENSA</Text>
                        <View style={styles.row}>
                            <TouchableOpacity style={[styles.toggleBtn, rewardType==='coins' && styles.toggleBtnActive]} onPress={()=>setRewardType('coins')}><Text style={[styles.toggleText, rewardType==='coins' && {color:'#fff'}]}>CHONKO COINS</Text></TouchableOpacity>
                            <TouchableOpacity style={[styles.toggleBtn, rewardType==='custom' && styles.toggleBtnActive]} onPress={()=>setRewardType('custom')}><Text style={[styles.toggleText, rewardType==='custom' && {color:'#fff'}]}>ITEM</Text></TouchableOpacity>
                        </View>
                        {rewardType === 'coins' ? (
                            <View style={styles.currencyInputWrapper}>
                                <MaterialCommunityIcons name="circle-multiple" size={20} color={COLORS.gold} style={{marginRight: 10}}/>
                                <TextInput style={styles.currencyInput} placeholder="0" keyboardType="numeric" maxLength={4} value={coinReward} onChangeText={setCoinReward} />
                            </View>
                        ) : (
                            <TextInput style={styles.input} placeholder="Ex: Sorvete, 1h de videogame..." value={customReward} onChangeText={setCustomReward} />
                        )}
                    </View>

                    {/* 4. AGENDAMENTO E DATA */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>QUANDO? <Text style={{color: '#EF4444'}}>*</Text></Text>
                        <View style={styles.tabSwitchContainer}>
                            <TouchableOpacity style={[styles.tabSwitchBtn, !isRecurring && styles.tabSwitchActive]} onPress={()=>setIsRecurring(false)}>
                                <MaterialCommunityIcons name="calendar" size={16} color={!isRecurring ? '#fff' : COLORS.primary} />
                                <Text style={[styles.tabSwitchText, !isRecurring && {color:'#fff'}]}>DATA ÚNICA</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.tabSwitchBtn, isRecurring && styles.tabSwitchActive]} onPress={()=>setIsRecurring(true)}>
                                <MaterialCommunityIcons name="calendar-sync" size={16} color={isRecurring ? '#fff' : COLORS.primary} />
                                <Text style={[styles.tabSwitchText, isRecurring && {color:'#fff'}]}>RECORRENTE</Text>
                            </TouchableOpacity>
                        </View>

                        {!isRecurring ? (
                            <TouchableOpacity style={styles.datePickerCard} onPress={() => setShowDatePicker(true)}>
                                <View style={styles.dateIconBox}>
                                    <Text style={styles.dateDayText}>{missionDate.getDate()}</Text>
                                    <Text style={styles.dateMonthText}>{missionDate.toLocaleDateString('pt-BR', {month:'short'}).toUpperCase()}</Text>
                                </View>
                                <View style={{flex:1, marginLeft: 15}}>
                                    <Text style={styles.dateLabelText}>Agendado para:</Text>
                                    <Text style={styles.dateValueText}>
                                        {missionDate.toLocaleDateString('pt-BR', {weekday: 'long', year: 'numeric'})}
                                    </Text>
                                </View>
                                <MaterialCommunityIcons name="chevron-down" size={24} color="#CBD5E1" />
                            </TouchableOpacity>
                        ) : (
                            <View style={{marginTop: 10}}>
                                <Text style={styles.subLabel}>REPETIR NOS DIAS:</Text>
                                <View style={styles.weekRow}>
                                    {WEEKDAYS.map(d => (
                                        <TouchableOpacity key={d.id} style={[styles.dayCircle, selectedDays.includes(d.id) && {backgroundColor: COLORS.primary, borderColor: COLORS.primary}]} onPress={()=>toggleDay(d.id)}>
                                            <Text style={{fontWeight:'bold', fontSize: 10, color: selectedDays.includes(d.id) ? '#fff' : '#64748B'}}>{d.label.substring(0,3)}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>
                        )}

                        <View style={{marginTop: 15, paddingTop: 15, borderTopWidth: 1, borderColor: '#F1F5F9'}}>
                            <Text style={styles.subLabel}>HORÁRIO LIMITE (OPCIONAL)</Text>
                            <View style={styles.timeRowContainer}>
                                 <TextInput style={styles.inputCenter} placeholder="Início (08:00)" placeholderTextColor="#94A3B8" value={startTime} onChangeText={t=>handleTimeChange(t, setStartTime)} onBlur={()=>handleTimeBlur(startTime, setStartTime)} maxLength={5} keyboardType="numeric"/>
                                 <Text style={{color:'#CBD5E1'}}>até</Text>
                                 <TextInput style={styles.inputCenter} placeholder="Fim (18:00)" placeholderTextColor="#94A3B8" value={deadline} onChangeText={t=>handleTimeChange(t, setDeadline)} onBlur={()=>handleTimeBlur(deadline, setDeadline)} maxLength={5} keyboardType="numeric"/>
                            </View>
                        </View>

                        {showDatePicker && (
                            <DateTimePicker
                                value={missionDate}
                                mode="date"
                                display="default"
                                onChange={handleDateChange}
                                minimumDate={new Date()}
                            />
                        )}
                    </View>

                    {/* 5. TESOURO DO CHONKO */}
                    <View style={[styles.inputGroup, styles.luckyBox, useCritical && styles.luckyBoxActive]}>
                        <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: useCritical ? 10 : 0}}>
                            <View style={{flexDirection: 'row', alignItems: 'center'}}>
                                <View style={[styles.luckyIcon, useCritical && {backgroundColor: '#FFF'}]}>
                                    <MaterialCommunityIcons name="treasure-chest" size={24} color={useCritical ? COLORS.gold : '#CBD5E1'} />
                                </View>
                                <View style={{marginLeft: 12}}>
                                    <Text style={[styles.luckyTitle, useCritical && {color: '#B45309'}]}>Tesouro do Chonko</Text>
                                    <Text style={[styles.luckySubtitle, useCritical && {color: '#D97706'}]}>
                                        Sorte extra ao completar?
                                    </Text>
                                </View>
                            </View>
                            <TouchableOpacity onPress={() => setUseCritical(!useCritical)}>
                                <MaterialCommunityIcons name={useCritical ? "toggle-switch" : "toggle-switch-off-outline"} size={40} color={useCritical ? COLORS.gold : '#CBD5E1'} />
                            </TouchableOpacity>
                        </View>

                        {useCritical && (
                            <View style={{marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderColor: 'rgba(0,0,0,0.05)'}}>
                                <Text style={styles.subLabel}>TIPO DE PRÊMIO</Text>
                                <View style={styles.row}>
                                    {rewardType === 'coins' ? (
                                        <TouchableOpacity style={[styles.miniBtn, criticalType === 'bonus_coins' && styles.miniBtnActive]} onPress={() => setCriticalType('bonus_coins')}>
                                            <MaterialCommunityIcons name="plus-circle" size={16} color={criticalType === 'bonus_coins' ? '#fff' : '#64748B'} />
                                            <Text style={[styles.miniBtnText, criticalType === 'bonus_coins' && {color:'#fff'}]}>+50% Moedas</Text>
                                        </TouchableOpacity>
                                    ) : null}
                                    <TouchableOpacity style={[styles.miniBtn, criticalType === 'custom_item' && styles.miniBtnActive]} onPress={() => setCriticalType('custom_item')}>
                                        <MaterialCommunityIcons name="gift-outline" size={16} color={criticalType === 'custom_item' ? '#fff' : '#64748B'} />
                                        <Text style={[styles.miniBtnText, criticalType === 'custom_item' && {color:'#fff'}]}>Item Surpresa</Text>
                                    </TouchableOpacity>
                                </View>

                                {criticalType === 'custom_item' && (
                                    <TextInput style={[styles.input, {backgroundColor: '#FFF', marginBottom: 15}]} placeholder="O que é? (Ex: Chocolate)" placeholderTextColor="#94A3B8" value={criticalCustomReward} onChangeText={setCriticalCustomReward} />
                                )}

                                <Text style={styles.subLabel}>PROBABILIDADE (CHANCE)</Text>
                                <View style={styles.probabilityRow}>
                                    {PROBABILITY_OPTIONS.map(opt => (
                                        <TouchableOpacity key={opt} style={[styles.probBtn, criticalChance === opt && styles.probBtnActive]} onPress={() => setCriticalChance(opt)}>
                                            <Text style={[styles.probText, criticalChance === opt && {color: '#FFF'}]}>{opt}%</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>
                        )}
                    </View>

                    {/* 6. ÍCONE COM CATEGORIAS (ATUALIZADO) */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>ÍCONE</Text>
                        
                        {/* Seletor de Categorias */}
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }} contentContainerStyle={{ gap: 8 }}>
                            {Object.keys(ICONS_CATALOG).map(cat => (
                                <TouchableOpacity 
                                    key={cat} 
                                    style={[styles.categoryChip, selectedCategory === cat && styles.categoryChipSelected]} 
                                    onPress={() => setSelectedCategory(cat)}
                                >
                                    <Text style={[styles.categoryText, selectedCategory === cat && styles.categoryTextSelected]}>
                                        {cat.toUpperCase()}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        {/* Grade de Ícones da Categoria Selecionada */}
                        <View style={styles.iconGridContainer}>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 5, paddingHorizontal: 5 }}>
                                {ICONS_CATALOG[selectedCategory].map(icon => (
                                    <TouchableOpacity 
                                        key={icon} 
                                        style={[styles.iconOption, selectedIcon === icon && styles.iconOptionSelected]} 
                                        onPress={() => setSelectedIcon(icon)}
                                    >
                                        <MaterialCommunityIcons name={icon} size={28} color={selectedIcon === icon ? '#FFF' : '#64748B'} />
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>
                    </View>

                    {!isEditingTemplate && (
                        <TouchableOpacity style={[styles.templateBox, saveAsTemplate && styles.templateBoxActive]} activeOpacity={0.9} onPress={() => setSaveAsTemplate(!saveAsTemplate)}>
                            <View style={[styles.checkbox, saveAsTemplate && {backgroundColor: COLORS.primary, borderColor: COLORS.primary}]}>
                                {saveAsTemplate && <MaterialCommunityIcons name="check" size={14} color="#FFF" />}
                            </View>
                            <View style={{marginLeft: 10, flex: 1}}>
                                <Text style={styles.templateTitle}>Salvar Modelo</Text>
                                <Text style={styles.templateSubtitle}>Salvar para usar depois.</Text>
                            </View>
                            <MaterialCommunityIcons name="flash" size={20} color={saveAsTemplate ? COLORS.primary : "#94A3B8"} />
                        </TouchableOpacity>
                    )}

                    <TouchableOpacity style={styles.createBtn} onPress={() => handleLaunch(isEditingTemplate)} disabled={loading}>
                        <View style={styles.createBtnShadow} />
                        <View style={styles.createBtnFront}>
                            <MaterialCommunityIcons name="rocket-launch-outline" size={24} color="#fff" style={{marginRight: 10}} />
                            <Text style={styles.btnText}>LANÇAR MISSÃO</Text>
                        </View>
                    </TouchableOpacity>
                    <View style={{height: 50}} /> 
                </View>
            </ScrollView>
        </KeyboardAvoidingView>

        {/* MODAL ASSIGNEE */}
        <Modal visible={showAssigneeModal} transparent={true} animationType="fade" onRequestClose={()=>setShowAssigneeModal(false)}>
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <Text style={styles.modalTitle}>Quem vai fazer?</Text>
                    {profiles.map(p=>(
                        <TouchableOpacity key={p.id} style={styles.modalOption} onPress={()=>{setAssignee(p.id); setAssigneeName(p.name); setShowAssigneeModal(false)}}>
                            <Text style={styles.modalText}>{p.name}</Text>
                            {assignee === p.id && <MaterialCommunityIcons name="check" size={20} color={COLORS.primary}/>}
                        </TouchableOpacity>
                    ))}
                    <TouchableOpacity style={styles.modalOption} onPress={()=>{setAssignee(null); setAssigneeName('TODOS'); setShowAssigneeModal(false)}}>
                        <Text style={styles.modalText}>TODOS</Text>
                        {assignee === null && <MaterialCommunityIcons name="check" size={20} color={COLORS.primary}/>}
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.closeBtn} onPress={()=>setShowAssigneeModal(false)}><Text style={{fontWeight:'bold', color:'#666'}}>Cancelar</Text></TouchableOpacity>
                </View>
            </View>
        </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F0F9FF' },
    
    // --- CABEÇALHO GRADIENTE ---
    topGreenArea: { 
        paddingTop: 50, 
        paddingBottom: 20, 
        borderBottomLeftRadius: 35, 
        borderBottomRightRadius: 35, 
        zIndex: 10, 
        elevation: 5 
    },

    header: { flexDirection:'row', justifyContent:'space-between', paddingHorizontal:20, alignItems:'center' },
    headerTitle: { fontFamily: FONTS.bold, fontSize: 16, color: '#ffffff', letterSpacing: 1 },
    backBtn: { padding: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 14 },
    content: { padding: 20 },
    
    // Preview
    previewContainer: { marginBottom: 20 },
    sectionLabel: { fontFamily: FONTS.bold, fontSize: 12, color: '#64748B', marginBottom: 10, opacity: 0.8, letterSpacing: 0.5 },
    cardFront: { backgroundColor: '#FFF', borderRadius: 24, borderWidth: 2, borderColor: '#CBD5E1', padding: 16, overflow: 'hidden' },
    previewIconBox: { width: 50, height: 50, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    previewTitle: { fontFamily: FONTS.bold, fontSize: 18, color: '#1E293B' },
    previewDesc: { marginTop: 10, fontSize: 12, color: '#64748B' },
    tag: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1, marginRight: 5, marginBottom: 5 },
    tagText: { fontSize: 10, fontWeight: 'bold', marginLeft: 4 },
    previewTreasureBox: { flexDirection:'row', justifyContent:'space-between', alignItems:'center', padding: 10, borderRadius: 12, marginTop: 12 },
    treasureGold: { backgroundColor: '#F59E0B', borderColor: '#B45309', borderWidth: 1 },
    treasurePurple: { backgroundColor: '#8B5CF6', borderColor: '#5B21B6', borderWidth: 1 },
    treasureTitle: { color: '#FFF', fontWeight: 'bold', fontSize: 12, marginLeft: 6 },

    // Form
    formContainer: { gap: 15 },
    inputGroup: { backgroundColor: '#FFF', borderRadius: 20, padding: 15, borderWidth: 1, borderColor: '#E2E8F0', shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.02, shadowRadius: 4, elevation: 1 },
    label: { fontFamily: FONTS.bold, color: '#64748B', fontSize: 11, marginBottom: 8, textTransform: 'uppercase' },
    subLabel: { fontFamily: FONTS.bold, color: '#94A3B8', fontSize: 10, marginBottom: 8, marginTop: 5 },
    input: { backgroundColor: '#F8FAFC', borderRadius: 12, padding: 12, fontFamily: FONTS.bold, color: '#1E293B', borderWidth: 1, borderColor: '#E2E8F0' },
    
    // NOVO: Switch de Abas (Data vs Recorrente)
    tabSwitchContainer: { flexDirection: 'row', backgroundColor: '#F1F5F9', borderRadius: 12, padding: 4, marginBottom: 15 },
    tabSwitchBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 10, gap: 6 },
    tabSwitchActive: { backgroundColor: COLORS.primary, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 3, elevation: 2 },
    tabSwitchText: { fontFamily: FONTS.bold, fontSize: 12, color: COLORS.primary },

    // NOVO: Card de Data Bonito
    datePickerCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: 12, borderRadius: 16, borderWidth: 1, borderColor: COLORS.primary, shadowColor: COLORS.primary, shadowOpacity: 0.1, shadowRadius: 5, elevation: 2 },
    dateIconBox: { backgroundColor: '#ECFDF5', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: '#A7F3D0' },
    dateDayText: { fontSize: 20, fontWeight: 'bold', color: COLORS.primary },
    dateMonthText: { fontSize: 10, fontWeight: 'bold', color: '#059669' },
    dateLabelText: { fontSize: 12, color: '#94A3B8', fontWeight: '600' },
    dateValueText: { fontSize: 16, color: '#1E293B', fontWeight: 'bold', textTransform: 'capitalize' },

    difficultyRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 5 },
    difficultyBtn: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 12, borderWidth: 1, justifyContent: 'center' },
    difficultyText: { fontSize: 10, fontWeight: 'bold', marginTop: 4 },
    currencyInputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFBEB', borderRadius: 12, paddingHorizontal: 12, borderWidth: 1, borderColor: '#FCD34D' },
    currencyInput: { flex: 1, paddingVertical: 12, fontFamily: FONTS.bold, color: '#B45309', fontSize: 16 },
    row: { flexDirection: 'row', gap: 10, marginBottom: 10 },
    toggleBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: COLORS.primary, borderRadius: 24, backgroundColor: '#F8FAFC' },
    toggleBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
    toggleText: { fontFamily: FONTS.bold, fontSize: 11, color: '#64748B' },
    luckyBox: { borderWidth: 2, borderColor: '#E2E8F0', backgroundColor: '#F8FAFC' },
    luckyBoxActive: { borderColor: COLORS.gold, backgroundColor: '#FFFBEB' },
    luckyIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#E2E8F0', justifyContent: 'center', alignItems: 'center' },
    luckyTitle: { fontFamily: FONTS.bold, color: '#64748B', fontSize: 14 },
    luckySubtitle: { fontFamily: FONTS.regular, color: '#94A3B8', fontSize: 10 },
    miniBtn: { flexDirection: 'row', alignItems: 'center', padding: 8, borderRadius: 8, backgroundColor: '#F1F5F9', marginRight: 10 },
    miniBtnActive: { backgroundColor: COLORS.primary },
    miniBtnText: { fontSize: 11, fontWeight: 'bold', color: '#64748B', marginLeft: 5 },
    probabilityRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 5 },
    probBtn: { width: '22%', paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0', alignItems: 'center', backgroundColor: '#FFF' },
    probBtnActive: { backgroundColor: COLORS.gold, borderColor: COLORS.gold },
    probText: { fontSize: 12, fontWeight: 'bold', color: '#64748B' },
    dropdown: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12 },
    dropdownText: { fontFamily: FONTS.bold, color: '#1E293B', fontSize: 14 },
    weekRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
    dayCircle: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF' },
    inputCenter: { flex:1, backgroundColor: '#F8FAFC', borderRadius: 12, padding: 10, fontFamily: FONTS.bold, color: '#1E293B', borderWidth: 1, borderColor: '#E2E8F0', textAlign: 'center' },
    timeRowContainer: { flexDirection: 'row', gap: 10, alignItems:'center' },
    
    // --- ESTILOS NOVOS PARA O SELETOR DE CATEGORIAS ---
    categoryChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 15, backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0', marginRight: 0 },
    categoryChipSelected: { backgroundColor: COLORS.secondary, borderColor: COLORS.secondary },
    categoryText: { fontSize: 10, fontFamily: FONTS.bold, color: '#64748B' },
    categoryTextSelected: { color: '#FFF' },
    iconGridContainer: { backgroundColor: '#F8FAFC', borderRadius: 12, padding: 8, borderWidth: 1, borderColor: '#E2E8F0' },
    
    iconOption: { 
        width: 50, height: 50, borderRadius: 25, 
        backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', marginRight: 10, 
        borderWidth: 1.5, borderColor: '#E2E8F0' 
    },
    iconOptionSelected: { 
        backgroundColor: COLORS.secondary, borderColor: COLORS.secondary,
        transform: [{scale: 1.1}] 
    },
    // ----------------------------------------------------

    templateBox: { flexDirection: 'row', backgroundColor: '#F0F9FF', padding: 15, borderRadius: 20, borderWidth: 1, borderColor: COLORS.primary, alignItems: 'center', marginBottom: 20 },
    templateBoxActive: { backgroundColor: '#F0FDF4', borderColor: COLORS.primary },
    checkbox: { width: 20, height: 20, borderRadius: 6, borderWidth: 2, borderColor: '#94A3B8', backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
    templateTitle: { fontFamily: FONTS.bold, fontSize: 14, color: '#1E293B' },
    templateSubtitle: { fontFamily: FONTS.regular, fontSize: 11, color: '#64748B' },
    createBtn: { height: 56, position: 'relative', marginTop: 10 },
    createBtnShadow: { position: 'absolute', top: 4, left: 0, width: '100%', height: '100%', backgroundColor: COLORS.shadow, borderRadius: 16 },
    createBtnFront: { width: '100%', height: '100%', backgroundColor: COLORS.secondary, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: -2 },
    btnText: { fontFamily: FONTS.bold, color: '#FFF', fontSize: 14, letterSpacing: 1 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
    modalContent: { width: '100%', backgroundColor: '#FFF', borderRadius: 24, padding: 20, borderWidth: 1, borderColor: COLORS.primary },
    modalTitle: { textAlign: 'center', fontFamily: FONTS.bold, color: '#1E293B', marginBottom: 15, fontSize: 16 },
    modalOption: { flexDirection: 'row', justifyContent: 'space-between', padding: 15, borderBottomWidth: 1, borderColor: '#F1F5F9' },
    modalText: { fontFamily: FONTS.bold, color: '#334155' },
    closeBtn: { marginTop: 15, padding: 12, alignItems: 'center', backgroundColor: '#F1F5F9', borderRadius: 12 }
});