import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
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

const ICONS = [
  'sword', 'shield', 'fire', 'flash', 'skull', 'crown', 'trophy',
  'broom', 'bed', 'book-open-variant', 'dog-side', 
  'trash-can-outline', 'water', 'silverware-fork-knife', 
  'flower', 'gamepad-variant', 'tshirt-crew', 'shoe-sneaker', 
  'toothbrush', 'school', 'music-note', 'star', 'emoticon-poop'
];

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

  // --- ESTADOS ---
  const [title, setTitle] = useState(initialData.title || '');
  const [description, setDescription] = useState(initialData.description || '');
  const [rewardType, setRewardType] = useState(initialData.reward_type || 'coins');
  const [coinReward, setCoinReward] = useState(initialData.reward ? String(initialData.reward) : '');
  const [customReward, setCustomReward] = useState(initialData.custom_reward || '');
  const [selectedIcon, setSelectedIcon] = useState(initialData.icon || 'star');
  const [assignee, setAssignee] = useState(initialData.assigned_to || null);
  const [assigneeName, setAssigneeName] = useState('TODOS');
  const [showAssigneeModal, setShowAssigneeModal] = useState(false);
  const [isRecurring, setIsRecurring] = useState(initialData.is_recurring || false);
  const [selectedDays, setSelectedDays] = useState(initialData.recurrence_days || []);
  
  const [startTime, setStartTime] = useState(initialData.start_time ? initialData.start_time.substring(0,5) : '');
  const [deadline, setDeadline] = useState(initialData.deadline ? initialData.deadline.substring(0,5) : '');

  const [saveAsTemplate, setSaveAsTemplate] = useState(false);

  useEffect(() => { 
      if (!currentFamilyId) {
          fetchUserFamily();
      } else {
          fetchProfiles(currentFamilyId); 
      }
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

  const handleLaunch = async (shouldUpdateTemplate = false) => {
      if (!title) return Alert.alert("Ops!", "Título obrigatório.");
      if (rewardType === 'coins' && !coinReward) return Alert.alert("Ops!", "Valor da recompensa obrigatório.");
      if (!currentFamilyId) return Alert.alert("Erro", "Família não identificada. Faça login novamente.");
      
      if (!isRecurring && !isEditingTemplate && !saveAsTemplate) {
          if (deadline && deadline.length === 5) {
              const now = new Date();
              const currentMinutes = now.getHours() * 60 + now.getMinutes();
              const [h, m] = deadline.split(':').map(Number);
              const deadlineMinutes = h * 60 + m;

              if (deadlineMinutes < currentMinutes) {
                  return Alert.alert("Viagem no Tempo?", "O horário final já passou! Ajuste para mais tarde.");
              }
          }
      }

      setLoading(true);
      
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
          start_time: startTime.length === 5 ? startTime : null, 
          deadline: deadline.length === 5 ? deadline : null,
          is_template: false 
      };

      try {
          if (isEditingTemplate && shouldUpdateTemplate) {
              await supabase.from('missions')
                  .update({ ...payload, status: 'template', is_template: true }) 
                  .eq('id', templateData.id);
          }
          
          if (!isEditingTemplate && saveAsTemplate) {
              await supabase.from('missions').insert([{ 
                  ...payload, 
                  status: 'template',
                  is_template: true 
              }]);
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
          console.log(error); 
      } finally { 
          setLoading(false); 
      }
  };

  const handleTimeBlur = (value, setter) => {
      if (!value) return;
      let clean = value.replace(/[^0-9]/g, '');
      let formatted = '';

      if (clean.length === 1) formatted = `0${clean}:00`;
      else if (clean.length === 2) formatted = `${clean}:00`;
      else if (clean.length === 3) formatted = `0${clean[0]}:${clean.substring(1)}`;
      else if (clean.length >= 4) formatted = `${clean.substring(0,2)}:${clean.substring(2,4)}`;

      setter(formatted);
  };

  const handleTimeChange = (txt, setFunc) => {
      let c = txt.replace(/[^0-9:]/g, '');
      if (c.length > 5) return;
      setFunc(c);
  };

  const toggleDay = (id) => {
      if (selectedDays.includes(id)) setSelectedDays(selectedDays.filter(d => d !== id));
      else setSelectedDays([...selectedDays, id].sort());
  };

  const renderIconItem = ({ item }) => (
    <TouchableOpacity style={[styles.iconItem, selectedIcon === item && styles.iconSelected]} onPress={() => setSelectedIcon(item)}>
      <MaterialCommunityIcons name={item} size={28} color={selectedIcon === item ? '#fff' : '#64748B'} />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        
        {/* HEADER VERDE ESCURO */}
        <View style={styles.topGreenArea}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color={'#FFFF'}/>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{missionToEdit ? "EDITAR MISSÃO" : "NOVA MISSÃO"}</Text>
                <View style={{width: 40}}/>
            </View>
        </View>

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{flex:1}}>
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                
                {/* PREVIEW CARD (Borda Verde Escura 1px) */}
                <View style={styles.sectionContainer}>
                    <Text style={styles.sectionLabel}>VISUALIZAÇÃO (PREVIEW)</Text>
                    <View style={styles.cardWrapper}>
                        <View style={styles.cardFront}>
                            <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 10}}>
                                <View style={styles.previewIconBox}>
                                    <MaterialCommunityIcons name={selectedIcon} size={28} color={COLORS.primary} />
                                </View>
                                <View style={{flex: 1}}>
                                    <Text style={styles.previewTitle} numberOfLines={2}>{title || "Título da Missão"}</Text>
                                    <View style={{flexDirection: 'row', marginTop: 4}}>
                                        <View style={[styles.previewTag, {backgroundColor: rewardType === 'coins' ? '#FFFBEB' : '#FDF2F8', borderColor: rewardType === 'coins' ? '#F59E0B' : '#DB2777'}]}>
                                            <MaterialCommunityIcons name={rewardType === 'coins' ? "circle-multiple" : "gift"} size={12} color={rewardType === 'coins' ? '#B45309' : '#DB2777'} />
                                            <Text style={[styles.previewTagText, {color: rewardType === 'coins' ? '#B45309' : '#DB2777'}]}>
                                                {rewardType === 'coins' ? (coinReward || "0") + " Chonko Coins" : (customReward || "Prêmio")}
                                            </Text>
                                        </View>
                                    </View>
                                </View>
                            </View>
                            <View style={styles.divider} />
                            <View style={styles.metaInfoContainer}>
                                <View style={[styles.metaTag, { backgroundColor: isRecurring ? '#FFF7ED' : '#FEF2F2', borderColor: isRecurring ? '#F97316' : '#EF4444' }]}>
                                    <MaterialCommunityIcons name={isRecurring ? "calendar-sync" : "calendar-check"} size={12} color={isRecurring ? '#EA580C' : '#B91C1C'} />
                                    <Text style={[styles.metaText, { color: isRecurring ? '#EA580C' : '#B91C1C' }]}>
                                        {isRecurring ? "Diária" : "Única"}
                                    </Text>
                                </View>
                                {(startTime || deadline) && (
                                    <View style={[styles.metaTag, { backgroundColor: '#EFF6FF', borderColor: '#3B82F6' }]}>
                                            <MaterialCommunityIcons name="clock-outline" size={12} color="#2563EB" />
                                            <Text style={[styles.metaText, { color: '#2563EB' }]}>
                                                {startTime || "00:00"} - {deadline || "00:00"}
                                            </Text>
                                    </View>
                                )}
                                <View style={[styles.metaTag, { backgroundColor: '#F0FDF4', borderColor: '#16A34A' }]}>
                                    <MaterialCommunityIcons name={assignee ? "account" : "account-group"} size={12} color="#15803D" />
                                    <Text style={[styles.metaText, { color: '#15803D' }]}>{assigneeName}</Text>
                                </View>
                            </View>
                        </View>
                    </View>
                </View>

                {/* FORMULÁRIO (Borda Verde Escura 1px) */}
                <View style={styles.formContainer}>
                    
                    {/* TÍTULO E DESCRIÇÃO */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>O QUE DEVE SER FEITO?</Text>
                        <TextInput style={styles.input} placeholder="Ex: Derrotar o Dragão da Louça" placeholderTextColor="#94A3B8" value={title} onChangeText={setTitle} />
                        <TextInput style={[styles.input, {height:80, marginTop:10, textAlignVertical:'top'}]} placeholder="Detalhes da quest..." placeholderTextColor="#94A3B8" multiline value={description} onChangeText={setDescription} />
                    </View>

                    {/* RECOMPENSA */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>RECOMPENSA</Text>
                        <View style={styles.row}>
                            <TouchableOpacity style={[styles.toggleBtn, rewardType==='coins' && styles.toggleBtnActive]} onPress={()=>setRewardType('coins')}>
                                <Text style={[styles.toggleText, rewardType==='coins' && {color:'#fff'}]}>CHONKO COINS</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.toggleBtn, rewardType==='custom' && styles.toggleBtnActive]} onPress={()=>setRewardType('custom')}>
                                <Text style={[styles.toggleText, rewardType==='custom' && {color:'#fff'}]}>PERSONALIZADO</Text>
                            </TouchableOpacity>
                        </View>
                        {rewardType === 'coins' ? (
                            <View style={styles.currencyInputWrapper}>
                                <MaterialCommunityIcons name="circle-multiple" size={20} color={COLORS.gold} style={{marginRight: 10}}/>
                                <TextInput style={styles.currencyInput} placeholder="0" placeholderTextColor="#94A3B8" keyboardType="numeric" value={coinReward} onChangeText={setCoinReward} />
                            </View>
                        ) : (
                            <TextInput style={styles.input} placeholder="Ex: Sorvete, 1h de videogame..." placeholderTextColor="#94A3B8" value={customReward} onChangeText={setCustomReward} />
                        )}
                    </View>

                    {/* ATRIBUIR */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>QUEM VAI FAZER?</Text>
                        <TouchableOpacity style={styles.dropdown} onPress={()=>setShowAssigneeModal(true)}>
                            <Text style={styles.dropdownText}>{assigneeName}</Text>
                            <MaterialCommunityIcons name="chevron-down" size={24} color="#64748B" />
                        </TouchableOpacity>
                    </View>

                    {/* RECORRÊNCIA */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>QUANDO?</Text>
                        <View style={styles.row}>
                            <TouchableOpacity style={[styles.toggleBtn, !isRecurring && styles.toggleBtnActive]} onPress={()=>setIsRecurring(false)}>
                                <Text style={[styles.toggleText, !isRecurring && {color:'#fff'}]}>HOJE / ÚNICA</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.toggleBtn, isRecurring && styles.toggleBtnActive]} onPress={()=>setIsRecurring(true)}>
                                <Text style={[styles.toggleText, isRecurring && {color:'#fff'}]}>RECORRENTE</Text>
                            </TouchableOpacity>
                        </View>
                        {isRecurring && (
                            <View style={styles.weekRow}>
                                {WEEKDAYS.map(d => (
                                    <TouchableOpacity key={d.id} style={[styles.dayCircle, selectedDays.includes(d.id) && {backgroundColor: COLORS.primary, borderColor: COLORS.primary}]} onPress={()=>toggleDay(d.id)}>
                                        <Text style={{fontWeight:'bold', fontSize: 10, color: selectedDays.includes(d.id) ? '#fff' : '#64748B'}}>{d.label.substring(0,3)}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}
                    </View>

                    {/* HORÁRIOS */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>HORÁRIOS (OPCIONAL)</Text>
                        <View style={styles.timeRowContainer}>
                            <View style={styles.timeInputWrapper}>
                                <Text style={styles.subLabel}>INÍCIO</Text>
                                <TextInput 
                                    style={styles.inputCenter} 
                                    placeholder="08:00" placeholderTextColor="#94A3B8" 
                                    value={startTime} 
                                    onChangeText={t=>handleTimeChange(t, setStartTime)}
                                    onBlur={() => handleTimeBlur(startTime, setStartTime)} 
                                    keyboardType="numeric" maxLength={5} 
                                />
                            </View>
                            <View style={styles.timeInputWrapper}>
                                <Text style={styles.subLabel}>LIMITE</Text>
                                <TextInput 
                                    style={styles.inputCenter} 
                                    placeholder="17:00" placeholderTextColor="#94A3B8" 
                                    value={deadline} 
                                    onChangeText={t=>handleTimeChange(t, setDeadline)}
                                    onBlur={() => handleTimeBlur(deadline, setDeadline)}
                                    keyboardType="numeric" maxLength={5} 
                                />
                            </View>
                        </View>
                    </View>

                    {/* ÍCONE */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>ÍCONE</Text>
                        <FlatList data={ICONS} horizontal showsHorizontalScrollIndicator={false} renderItem={renderIconItem} keyExtractor={i=>i} contentContainerStyle={{paddingVertical: 5}}/>
                    </View>

                    {/* TEMPLATE TOGGLE */}
                    {!isEditingTemplate && (
                        <TouchableOpacity style={[styles.templateBox, saveAsTemplate && styles.templateBoxActive]} activeOpacity={0.9} onPress={() => setSaveAsTemplate(!saveAsTemplate)}>
                            <View style={[styles.checkbox, saveAsTemplate && {backgroundColor: COLORS.primary, borderColor: COLORS.primary}]}>
                                {saveAsTemplate && <MaterialCommunityIcons name="check" size={14} color="#FFF" />}
                            </View>
                            <View style={{marginLeft: 10, flex: 1}}>
                                <Text style={styles.templateTitle}>Salvar Modelo</Text>
                                <Text style={styles.templateSubtitle}>Para usar em Missões Rápidas depois.</Text>
                            </View>
                            <MaterialCommunityIcons name="flash" size={20} color={saveAsTemplate ? COLORS.primary : "#94A3B8"} />
                        </TouchableOpacity>
                    )}

                    {/* BOTÃO DE AÇÃO */}
                    {isEditingTemplate ? (
                        <View style={{marginBottom: 20}}>
                            <TouchableOpacity style={[styles.createBtn, {backgroundColor: '#F59E0B', marginBottom: 15}]} onPress={() => handleLaunch(true)} disabled={loading}>
                                <View style={[styles.createBtnShadow, {backgroundColor: '#B45309'}]} />
                                <View style={[styles.createBtnFront, {backgroundColor: '#F59E0B', borderColor: '#B45309'}]}>
                                    <MaterialCommunityIcons name="sync" size={24} color="#fff" style={{marginRight: 10}} />
                                    <Text style={styles.btnText}>ATUALIZAR MODELO & LANÇAR</Text>
                                </View>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.createBtn} onPress={() => handleLaunch(false)} disabled={loading}>
                                <View style={styles.createBtnShadow} />
                                <View style={styles.createBtnFront}>
                                    <MaterialCommunityIcons name="rocket-launch-outline" size={24} color="#fff" style={{marginRight: 10}} />
                                    <Text style={styles.btnText}>LANÇAR (SEM ATUALIZAR)</Text>
                                </View>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <TouchableOpacity style={styles.createBtn} onPress={() => handleLaunch(false)} disabled={loading}>
                            <View style={styles.createBtnShadow} />
                            <View style={styles.createBtnFront}>
                                <MaterialCommunityIcons name={missionToEdit ? "content-save-outline" : "rocket-launch-outline"} size={24} color="#fff" style={{marginRight: 10}} />
                                <Text style={styles.btnText}>{missionToEdit ? "SALVAR ALTERAÇÕES" : "LANÇAR MISSÃO"}</Text>
                            </View>
                        </TouchableOpacity>
                    )}
                    
                    <View style={{height: 50}} /> 
                </View>
            </ScrollView>
        </KeyboardAvoidingView>

        {/* MODAL RECRUTA */}
        <Modal visible={showAssigneeModal} transparent={true} animationType="fade" onRequestClose={()=>setShowAssigneeModal(false)}>
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <Text style={styles.modalTitle}>Quem vai fazer?</Text>
                    <TouchableOpacity style={styles.modalOption} onPress={()=>{setAssignee(null); setAssigneeName('TODOS'); setShowAssigneeModal(false)}}>
                        <Text style={styles.modalText}>TODOS</Text>
                        {assignee === null && <MaterialCommunityIcons name="check" size={20} color={COLORS.primary}/>}
                    </TouchableOpacity>
                    {profiles.map(p=>(
                        <TouchableOpacity key={p.id} style={styles.modalOption} onPress={()=>{setAssignee(p.id); setAssigneeName(p.name); setShowAssigneeModal(false)}}>
                            <Text style={styles.modalText}>{p.name}</Text>
                            {assignee === p.id && <MaterialCommunityIcons name="check" size={20} color={COLORS.primary}/>}
                        </TouchableOpacity>
                    ))}
                    <TouchableOpacity style={styles.closeBtn} onPress={()=>setShowAssigneeModal(false)}><Text style={{fontWeight:'bold', color:'#666'}}>Cancelar</Text></TouchableOpacity>
                </View>
            </View>
        </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F0F9FF' },
    
    // --- HEADER VERDE ESCURO (COLORS.primary) ---
    topGreenArea: {
        backgroundColor: COLORS.primary, // #064E3B
        paddingTop: 50,
        paddingBottom: 20,
        borderBottomLeftRadius: 35, // Arredondamento suave
        borderBottomRightRadius: 35,
        zIndex: 10,
        shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 5, elevation: 5
    },
    header: { flexDirection:'row', justifyContent:'space-between', paddingHorizontal:20, alignItems:'center' },
    headerTitle: { fontFamily: FONTS.bold, fontSize: 16, color: '#D1FAE5', letterSpacing: 1 },
    backBtn: { padding: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 14 },
    
    content: { padding: 20 },
    
    // --- SEÇÃO PREVIEW ---
    sectionContainer: { marginBottom: 25 },
    sectionLabel: { fontFamily: FONTS.bold, fontSize: 12, color: '#64748B', marginBottom: 10, opacity: 0.9, letterSpacing: 0.5 },
    
    // --- PREVIEW CARD (Borda Verde Escura 1px) ---
    cardWrapper: { borderRadius: 24, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 3 },
    cardFront: { 
        backgroundColor: '#FFF', 
        borderRadius: 24, 
        borderWidth: 1, 
        borderColor: COLORS.primary, // <--- AQUI
        padding: 16 
    },
    previewIconBox: { width: 48, height: 48, borderRadius: 16, backgroundColor: '#F0FDF4', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    previewTitle: { fontFamily: FONTS.bold, fontSize: 16, color: '#1E293B' },
    previewTag: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, borderWidth: 1 },
    previewTagText: { fontSize: 11, fontWeight: 'bold', marginLeft: 4 },
    divider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 12 },
    metaInfoContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    metaTag: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
    metaText: { fontSize: 10, fontWeight: 'bold', marginLeft: 4 },

    // --- FORMULÁRIO (Cards com Borda Verde Escura 1px) ---
    formContainer: { gap: 15 },
    inputGroup: { 
        backgroundColor: '#FFF', 
        borderRadius: 20, 
        padding: 15, 
        borderWidth: 1, 
        borderColor: COLORS.primary, // <--- AQUI
        shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.02, shadowRadius: 4, elevation: 1 
    },
    label: { fontFamily: FONTS.bold, color: '#64748B', fontSize: 11, marginBottom: 8, textTransform: 'uppercase' },
    subLabel: { fontFamily: FONTS.bold, color: '#94A3B8', fontSize: 10, marginBottom: 4 },
    
    input: { backgroundColor: '#F8FAFC', borderRadius: 12, padding: 12, fontFamily: FONTS.bold, color: '#1E293B', borderWidth: 1, borderColor: COLORS.primary },
    currencyInputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 12, paddingHorizontal: 12, borderWidth: 1, borderColor: COLORS.primary },
    currencyInput: { flex: 1, paddingVertical: 12, fontFamily: FONTS.bold, color: '#1E293B', fontSize: 16 },
    
    inputCenter: { backgroundColor: '#F8FAFC', borderRadius: 12, padding: 10, fontFamily: FONTS.bold, color: '#1E293B', borderWidth: 1, borderColor: COLORS.primary, textAlign: 'center' },
    timeRowContainer: { flexDirection: 'row', gap: 10 },
    timeInputWrapper: { flex: 1 },
    
    row: { flexDirection: 'row', gap: 10, marginBottom: 10 },
    toggleBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: COLORS.primary, borderRadius: 24, backgroundColor: '#F8FAFC' },
    toggleBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
    toggleText: { fontFamily: FONTS.bold, fontSize: 11, color: '#64748B' },
    
    dropdown: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: COLORS.primary, borderRadius: 12 },
    dropdownText: { fontFamily: FONTS.bold, color: '#1E293B', fontSize: 14 },
    
    weekRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
    dayCircle: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF' },
    
    iconItem: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center', marginRight: 10, borderWidth: 1, borderColor: COLORS.primary },
    iconSelected: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
    
    templateBox: { flexDirection: 'row', backgroundColor: '#F0F9FF', padding: 15, borderRadius: 20, borderWidth: 1, borderColor: COLORS.primary, alignItems: 'center', marginBottom: 20 },
    templateBoxActive: { backgroundColor: '#F0FDF4', borderColor: COLORS.primary },
    checkbox: { width: 20, height: 20, borderRadius: 6, borderWidth: 2, borderColor: '#94A3B8', backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
    templateTitle: { fontFamily: FONTS.bold, fontSize: 14, color: '#1E293B' },
    templateSubtitle: { fontFamily: FONTS.regular, fontSize: 11, color: '#64748B' },
    
    // --- BOTÕES DE AÇÃO ---
    createBtn: { height: 56, position: 'relative', marginTop: 10 },
    createBtnShadow: { position: 'absolute', top: 4, left: 0, width: '100%', height: '100%', backgroundColor: COLORS.shadow, borderRadius: 16 },
    createBtnFront: { width: '100%', height: '100%', backgroundColor: COLORS.secondary, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: -2 },
    btnText: { fontFamily: FONTS.bold, color: '#FFF', fontSize: 14, letterSpacing: 1 },
    
    // --- MODAL ---
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
    modalContent: { 
        width: '100%', backgroundColor: '#FFF', borderRadius: 24, padding: 20,
        borderWidth: 1, borderColor: COLORS.primary // <--- AQUI
    },
    modalTitle: { textAlign: 'center', fontFamily: FONTS.bold, color: '#1E293B', marginBottom: 15, fontSize: 16 },
    modalOption: { flexDirection: 'row', justifyContent: 'space-between', padding: 15, borderBottomWidth: 1, borderColor: '#F1F5F9' },
    modalText: { fontFamily: FONTS.bold, color: '#334155' },
    closeBtn: { marginTop: 15, padding: 12, alignItems: 'center', backgroundColor: '#F1F5F9', borderRadius: 12 }
});