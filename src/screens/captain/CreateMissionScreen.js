import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, FlatList, KeyboardAvoidingView,
  Platform, ScrollView, StyleSheet, Text, TextInput,
  TouchableOpacity, View, Modal
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
          status: 'active', // Padrão para a missão real
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
          // 1. ATUALIZAR UM MODELO EXISTENTE
          if (isEditingTemplate && shouldUpdateTemplate) {
              // Mantemos o template com status 'template' para não aparecer pro recruta
              await supabase.from('missions')
                  .update({ ...payload, status: 'template', is_template: true }) 
                  .eq('id', templateData.id);
          }
          
          // 2. SALVAR CÓPIA COMO NOVO MODELO (O FIX ESTÁ AQUI)
          if (!isEditingTemplate && saveAsTemplate) {
              await supabase.from('missions').insert([{ 
                  ...payload, 
                  status: 'template', // <--- MUDANÇA CRUCIAL: Template nasce escondido
                  is_template: true 
              }]);
          }

          // 3. LANÇAR A MISSÃO REAL (ATIVA)
          if (missionToEdit) {
              await supabase.from('missions').update(payload).eq('id', missionToEdit.id);
              Alert.alert("Sucesso", "Missão atualizada!");
          } else {
              // Aqui sim ela vai como 'active'
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

  const getDayLabels = () => {
      if (!isRecurring || selectedDays.length === 0) return "";
      if (selectedDays.length === 7) return "Todos os dias";
      return selectedDays.map(id => WEEKDAYS.find(d => d.id === id)?.label).join(", ");
  };

  const renderIconItem = ({ item }) => (
    <TouchableOpacity style={[styles.iconItem, selectedIcon === item && styles.iconSelected]} onPress={() => setSelectedIcon(item)}>
      <MaterialCommunityIcons name={item} size={32} color={selectedIcon === item ? '#fff' : COLORS.primary} />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
        <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                <MaterialCommunityIcons name="arrow-left" size={28} color={COLORS.primary}/>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{missionToEdit ? "EDITAR MISSÃO" : "NOVA MISSÃO"}</Text>
            <View style={{width:28}}/>
        </View>

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{flex:1}}>
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                
                {/* PREVIEW CARD */}
                <View style={styles.previewSection}>
                    <Text style={styles.sectionLabel}>VISUALIZAÇÃO (PREVIEW):</Text>
                    <View style={styles.previewWrapper}>
                        <View style={styles.cardShadow} />
                        <View style={styles.cardPreview}>
                            <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 10}}>
                                <View style={styles.previewIconBox}>
                                    <MaterialCommunityIcons name={selectedIcon} size={32} color={COLORS.primary} />
                                </View>
                                <View style={{flex: 1}}>
                                    <Text style={styles.previewTitle} numberOfLines={2}>{title || "Título da Missão"}</Text>
                                    <View style={{flexDirection: 'row', marginTop: 4}}>
                                        <View style={[styles.previewTag, {backgroundColor: rewardType === 'coins' ? '#fffbeb' : '#fdf2f8', borderColor: rewardType === 'coins' ? COLORS.gold : '#db2777'}]}>
                                            <MaterialCommunityIcons name={rewardType === 'coins' ? "star" : "gift"} size={12} color={rewardType === 'coins' ? COLORS.gold : '#db2777'} />
                                            <Text style={[styles.previewTagText, {color: rewardType === 'coins' ? '#b45309' : '#db2777'}]}>
                                                {rewardType === 'coins' ? (coinReward || "0") + " moedas" : (customReward || "Item")}
                                            </Text>
                                        </View>
                                    </View>
                                </View>
                            </View>
                            <View style={styles.divider} />
                            <View style={styles.metaInfoContainer}>
                                <View style={[styles.metaTag, { backgroundColor: isRecurring ? '#fff7ed' : '#fee2e2', borderColor: isRecurring ? '#f97316' : '#ef4444' }]}>
                                    <MaterialCommunityIcons name={isRecurring ? "calendar-sync" : "calendar-check"} size={12} color={isRecurring ? '#ea580c' : '#b91c1c'} />
                                    <Text style={[styles.metaText, { color: isRecurring ? '#ea580c' : '#b91c1c' }]}>
                                        {isRecurring ? "Diária" : "Única"}
                                    </Text>
                                </View>
                                {(startTime || deadline) && (
                                    <View style={[styles.metaTag, { backgroundColor: '#eff6ff', borderColor: '#3b82f6' }]}>
                                        <MaterialCommunityIcons name="clock-outline" size={12} color="#2563eb" />
                                        <Text style={[styles.metaText, { color: '#2563eb' }]}>
                                            {startTime || "00:00"} - {deadline || "00:00"}
                                        </Text>
                                    </View>
                                )}
                                <View style={[styles.metaTag, { backgroundColor: '#f0fdf4', borderColor: '#16a34a' }]}>
                                    <MaterialCommunityIcons name={assignee ? "account" : "account-group"} size={12} color="#15803d" />
                                    <Text style={[styles.metaText, { color: '#15803d' }]}>{assigneeName}</Text>
                                </View>
                            </View>
                        </View>
                    </View>
                </View>

                {/* INPUTS */}
                <View style={styles.inputGroup}>
                    <Text style={styles.label}>O QUE DEVE SER FEITO?</Text>
                    <TextInput style={styles.input} placeholder="Ex: Derrotar o Dragão da Louça" placeholderTextColor={COLORS.placeholder} value={title} onChangeText={setTitle} />
                    <TextInput style={[styles.input, {height:60, marginTop:10}]} placeholder="Detalhes da quest..." placeholderTextColor={COLORS.placeholder} multiline value={description} onChangeText={setDescription} />
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>RECOMPENSA</Text>
                    <View style={styles.row}>
                        <TouchableOpacity style={[styles.toggleBtn, rewardType==='coins' && styles.toggleBtnActive]} onPress={()=>setRewardType('coins')}>
                            <Text style={[styles.toggleText, rewardType==='coins' && {color:'#fff'}]}>MOEDA</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.toggleBtn, rewardType==='custom' && styles.toggleBtnActive]} onPress={()=>setRewardType('custom')}>
                            <Text style={[styles.toggleText, rewardType==='custom' && {color:'#fff'}]}>PERSONALIZADO</Text>
                        </TouchableOpacity>
                    </View>
                    {rewardType === 'coins' ? (
                        <TextInput style={styles.input} placeholder="Valor" placeholderTextColor={COLORS.placeholder} keyboardType="numeric" value={coinReward} onChangeText={setCoinReward} />
                    ) : (
                        <TextInput style={styles.input} placeholder="Ex: Sorvete, 1h de videogame..." placeholderTextColor={COLORS.placeholder} value={customReward} onChangeText={setCustomReward} />
                    )}
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>QUEM VAI FAZER?</Text>
                    <TouchableOpacity style={styles.dropdown} onPress={()=>setShowAssigneeModal(true)}>
                        <Text style={styles.dropdownText}>{assigneeName}</Text>
                        <MaterialCommunityIcons name="chevron-down" size={24} color={COLORS.primary} />
                    </TouchableOpacity>
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>RECORRÊNCIA</Text>
                    <View style={styles.row}>
                        <TouchableOpacity style={[styles.toggleBtn, !isRecurring && styles.toggleBtnActive]} onPress={()=>setIsRecurring(false)}>
                            <Text style={[styles.toggleText, !isRecurring && {color:'#fff'}]}>ÚNICA</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.toggleBtn, isRecurring && styles.toggleBtnActive]} onPress={()=>setIsRecurring(true)}>
                            <Text style={[styles.toggleText, isRecurring && {color:'#fff'}]}>DIÁRIA / RECORRENTE</Text>
                        </TouchableOpacity>
                    </View>
                    {isRecurring && (
                        <View style={styles.weekRow}>
                            {WEEKDAYS.map(d => (
                                <TouchableOpacity key={d.id} style={[styles.dayCircle, selectedDays.includes(d.id) && {backgroundColor: COLORS.primary}]} onPress={()=>toggleDay(d.id)}>
                                    <Text style={{fontWeight:'bold', fontSize: 10, color: selectedDays.includes(d.id) ? '#fff' : COLORS.primary}}>{d.label.substring(0,3)}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>HORÁRIOS</Text>
                    <View style={styles.timeRowContainer}>
                        <View style={styles.timeInputWrapper}>
                            <Text style={styles.subLabel}>INÍCIO</Text>
                            <TextInput 
                                style={styles.inputCenter} 
                                placeholder="08:00" placeholderTextColor={COLORS.placeholder} 
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
                                placeholder="17:00" placeholderTextColor={COLORS.placeholder} 
                                value={deadline} 
                                onChangeText={t=>handleTimeChange(t, setDeadline)}
                                onBlur={() => handleTimeBlur(deadline, setDeadline)}
                                keyboardType="numeric" maxLength={5} 
                            />
                        </View>
                    </View>
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>ÍCONE</Text>
                    <FlatList data={ICONS} horizontal showsHorizontalScrollIndicator={false} renderItem={renderIconItem} keyExtractor={i=>i}/>
                </View>

                {!isEditingTemplate && (
                    <TouchableOpacity style={[styles.templateBox, saveAsTemplate && styles.templateBoxActive]} activeOpacity={0.9} onPress={() => setSaveAsTemplate(!saveAsTemplate)}>
                        <View style={styles.checkbox}>{saveAsTemplate && <MaterialCommunityIcons name="check" size={16} color={COLORS.primary} />}</View>
                        <View style={{marginLeft: 10, flex: 1}}><Text style={styles.templateTitle}>SALVAR EM MISSÕES RÁPIDAS</Text><Text style={styles.templateSubtitle}>Cria um atalho para lançar de novo.</Text></View>
                        <MaterialCommunityIcons name="flash" size={24} color={COLORS.primary} />
                    </TouchableOpacity>
                )}

                {isEditingTemplate ? (
                    <View style={{marginBottom: 20}}>
                        <TouchableOpacity style={[styles.createBtn, {backgroundColor: COLORS.gold, marginBottom: 15}]} onPress={() => handleLaunch(true)} disabled={loading}>
                            <View style={[styles.createBtnShadow, {backgroundColor: '#b45309'}]} />
                            <View style={[styles.createBtnFront, {backgroundColor: COLORS.gold, borderColor: '#b45309'}]}>
                                <MaterialCommunityIcons name="sync" size={24} color="#fff" style={{marginRight: 10}} />
                                <Text style={styles.btnText}>ATUALIZAR MODELO & LANÇAR</Text>
                            </View>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.createBtn} onPress={() => handleLaunch(false)} disabled={loading}>
                            <View style={styles.createBtnShadow} />
                            <View style={styles.createBtnFront}>
                                <MaterialCommunityIcons name="rocket-launch-outline" size={24} color="#fff" style={{marginRight: 10}} />
                                <Text style={styles.btnText}>LANÇAR (SEM ATUALIZAR MODELO)</Text>
                            </View>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <TouchableOpacity style={styles.createBtn} onPress={() => handleLaunch(false)} disabled={loading}>
                        <View style={styles.createBtnShadow} />
                        <View style={styles.createBtnFront}>
                            <MaterialCommunityIcons name="rocket-launch-outline" size={24} color="#fff" style={{marginRight: 10}} />
                            <Text style={styles.btnText}>{missionToEdit ? "SALVAR ALTERAÇÕES" : "LANÇAR MISSÃO"}</Text>
                        </View>
                    </TouchableOpacity>
                )}
                <View style={{height: 50}} /> 
            </ScrollView>
        </KeyboardAvoidingView>

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
    container: { flex: 1, backgroundColor: COLORS.background },
    header: { flexDirection:'row', justifyContent:'space-between', padding:20, paddingTop:50, alignItems:'center', backgroundColor: COLORS.surface, borderBottomWidth: 3, borderBottomColor: COLORS.primary },
    headerTitle: { fontFamily: FONTS.bold, fontSize: 18, color: COLORS.primary, letterSpacing: 1 },
    backBtn: { padding: 5, backgroundColor: COLORS.surfaceAlt, borderRadius: 10, borderWidth: 2, borderColor: COLORS.primary },
    content: { padding: 20 },
    previewSection: { marginBottom: 25 },
    sectionLabel: { fontFamily: FONTS.bold, fontSize: 12, color: COLORS.surface, marginBottom: 8, opacity: 0.9 },
    previewWrapper: { position: 'relative' },
    cardShadow: { position: 'absolute', top: 6, left: 6, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 20 },
    cardPreview: { backgroundColor: COLORS.surface, padding: 15, borderRadius: 20, borderWidth: 3, borderColor: COLORS.primary },
    previewIconBox: { width: 50, height: 50, borderRadius: 15, backgroundColor: COLORS.surfaceAlt, justifyContent: 'center', alignItems: 'center', marginRight: 15, borderWidth: 2, borderColor: COLORS.primary },
    previewTitle: { fontFamily: FONTS.bold, fontSize: 18, color: COLORS.textPrimary },
    previewTag: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1, marginRight: 5 },
    previewTagText: { fontSize: 12, fontWeight: 'bold', marginLeft: 4 },
    divider: { height: 2, backgroundColor: COLORS.surfaceAlt, marginVertical: 10 },
    metaInfoContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    metaTag: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1 },
    metaText: { fontSize: 10, fontWeight: 'bold', marginLeft: 4 },
    daysText: { fontSize: 11, color: '#666', marginTop: 8, fontStyle: 'italic' },
    inputGroup: { backgroundColor: COLORS.surface, borderRadius: 16, padding: 15, marginBottom: 15, borderWidth: 3, borderColor: COLORS.primary },
    label: { fontFamily: FONTS.bold, color: COLORS.primary, fontSize: 12, marginBottom: 8 },
    subLabel: { fontFamily: FONTS.regular, color: COLORS.primary, fontSize: 10, marginBottom: 4 },
    input: { backgroundColor: COLORS.surfaceAlt, borderRadius: 10, padding: 12, fontFamily: FONTS.bold, color: COLORS.primary, borderWidth: 2, borderColor: COLORS.primary },
    timeRowContainer: { flexDirection: 'row', gap: 10 },
    timeInputWrapper: { flex: 1 },
    inputCenter: { backgroundColor: COLORS.surfaceAlt, borderRadius: 10, padding: 10, fontFamily: FONTS.bold, color: COLORS.primary, borderWidth: 2, borderColor: COLORS.primary, textAlign: 'center' },
    row: { flexDirection: 'row', gap: 10, marginBottom: 10 },
    toggleBtn: { flex: 1, padding: 12, alignItems: 'center', borderWidth: 2, borderColor: COLORS.primary, borderRadius: 10, backgroundColor: COLORS.surface },
    toggleBtnActive: { backgroundColor: COLORS.primary },
    toggleText: { fontFamily: FONTS.bold, fontSize: 12, color: COLORS.primary },
    dropdown: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, backgroundColor: COLORS.surfaceAlt, borderWidth: 2, borderColor: COLORS.primary, borderRadius: 10 },
    dropdownText: { fontFamily: FONTS.bold, color: COLORS.primary, fontSize: 16 },
    weekRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
    dayCircle: { width: 35, height: 35, borderRadius: 18, borderWidth: 2, borderColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.surface },
    infoBox: { flexDirection: 'row', backgroundColor: '#e0f2fe', padding: 12, borderRadius: 10, marginTop: 15, borderWidth: 2, borderColor: '#0ea5e9', alignItems: 'flex-start' },
    infoText: { fontFamily: FONTS.bold, fontSize: 11, color: '#0369a1', marginLeft: 8, flex: 1 },
    templateBox: { flexDirection: 'row', backgroundColor: '#fffbeb', padding: 15, borderRadius: 16, borderWidth: 3, borderColor: COLORS.gold, alignItems: 'center', marginBottom: 20 },
    templateBoxActive: { backgroundColor: COLORS.gold, borderColor: COLORS.primary },
    checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: COLORS.primary, backgroundColor: COLORS.surface, justifyContent: 'center', alignItems: 'center' },
    templateTitle: { fontFamily: FONTS.bold, fontSize: 14, color: COLORS.primary },
    templateSubtitle: { fontFamily: FONTS.regular, fontSize: 11, color: '#b45309' },
    iconItem: { width: 50, height: 50, borderRadius: 25, backgroundColor: COLORS.surfaceAlt, justifyContent: 'center', alignItems: 'center', marginRight: 10, borderWidth: 2, borderColor: COLORS.primary },
    iconSelected: { backgroundColor: COLORS.primary, borderColor: COLORS.surface },
    createBtn: { height: 60, position: 'relative', marginTop: 10, marginBottom: 20 },
    createBtnShadow: { position: 'absolute', top: 4, left: 0, width: '100%', height: '100%', backgroundColor: COLORS.shadow, borderRadius: 16 },
    createBtnFront: { width: '100%', height: '100%', backgroundColor: COLORS.secondary, borderRadius: 16, borderWidth: 3, borderColor: COLORS.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: -2 },
    btnText: { fontFamily: FONTS.bold, color: COLORS.surface, fontSize: 16, letterSpacing: 1 },
    modalOverlay: { flex: 1, backgroundColor: COLORS.modalOverlay, justifyContent: 'center', alignItems: 'center', padding: 20 },
    modalContent: { width: '100%', backgroundColor: COLORS.surface, borderRadius: 20, padding: 20, borderWidth: 3, borderColor: COLORS.primary },
    modalTitle: { textAlign: 'center', fontFamily: FONTS.bold, color: COLORS.primary, marginBottom: 10, fontSize: 18 },
    modalOption: { flexDirection: 'row', justifyContent: 'space-between', padding: 15, borderBottomWidth: 1, borderColor: '#eee' },
    modalText: { fontFamily: FONTS.bold, color: COLORS.primary },
    closeBtn: { marginTop: 15, padding: 10, alignItems: 'center', backgroundColor: '#eee', borderRadius: 10 }
});