import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    FlatList,
    KeyboardAvoidingView,
    Modal,
    Platform,
    RefreshControl,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { FONTS } from '../styles/theme';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 50) / 2;

// ============================================================
// DADOS PRÉ-DEFINIDOS (CORES E TÍTULOS)
// ============================================================
const ADMIN_TITLES = ['Admin', 'Rei', 'Rainha', 'Papai', 'Mamãe', 'Vovô', 'Vovó', 'Tio', 'Tia'];
const RECRUIT_TITLES = ['Aventureiro', 'Aventureira', 'Filho', 'Filha', 'Sobrinho', 'Sobrinha', 'Neto', 'Neta', 'Recruta', 'Herói', 'Heroína', 'Aprendiz', 'Explorador', 'Exploradora', 'Guerreiro', 'Guerreira'];

const COLOR_PALETTES = [
    { id: 'emerald', main: '#10B981', bg: '#F0FDF4', border: '#6EE7B7' },
    { id: 'amber',   main: '#F59E0B', bg: '#FFFBEB', border: '#FCD34D' },
    { id: 'blue',    main: '#3B82F6', bg: '#EFF6FF', border: '#93C5FD' },
    { id: 'red',     main: '#EF4444', bg: '#FEF2F2', border: '#FCA5A5' },
    { id: 'purple',  main: '#8B5CF6', bg: '#F5F3FF', border: '#C4B5FD' },
    { id: 'pink',    main: '#EC4899', bg: '#FDF2F8', border: '#F9A8D4' },
    { id: 'teal',    main: '#14B8A6', bg: '#F0FDFA', border: '#5EEAD4' },
    { id: 'orange',  main: '#F97316', bg: '#FFF7ED', border: '#FDBA74' },
    { id: 'indigo',  main: '#6366F1', bg: '#EEF2FF', border: '#A5B4FC' },
    { id: 'fuchsia', main: '#D946EF', bg: '#FDF4FF', border: '#F0ABFC' },
    { id: 'cyan',    main: '#0EA5E9', bg: '#F0F9FF', border: '#7DD3FC' },
    { id: 'lime',    main: '#84CC16', bg: '#ECFCCB', border: '#BEF264' },
    { id: 'yellow',  main: '#EAB308', bg: '#FEFCE8', border: '#FDE047' },
    { id: 'rose',    main: '#F43F5E', bg: '#FFF1F2', border: '#FDA4AF' },
    { id: 'slate',   main: '#64748B', bg: '#F8FAFC', border: '#CBD5E1' }
];

export default function RoleSelectionScreen() {
    const navigation = useNavigation();
    const { session, signOut } = useAuth();

    const [profiles, setProfiles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedProfile, setSelectedProfile] = useState(null);

    const [showPinModal, setShowPinModal] = useState(false);
    const [inputPin, setInputPin] = useState('');
    const [forgotMode, setForgotMode] = useState(null);
    const [accountPassword, setAccountPassword] = useState('');
    const [newPin, setNewPin] = useState('');
    const [verifyingReset, setVerifyingReset] = useState(false);

    const [showAdminAuthModal, setShowAdminAuthModal] = useState(false);
    const [adminAuthPin, setAdminAuthPin] = useState('');
    const [showSettingsModal, setShowSettingsModal] = useState(false);
    const [editingProfile, setEditingProfile] = useState(null);

    const [editTitle, setEditTitle] = useState('');
    const [editColorObj, setEditColorObj] = useState(COLOR_PALETTES[0]);
    const [editNewPin, setEditNewPin] = useState('');
    const [savingSettings, setSavingSettings] = useState(false);

    useFocusEffect(
        useCallback(() => {
            // Força a buscar do zero sem pegar do cache do react navigation
            fetchProfiles(0, true);
        }, [])
    );

    // Adicionado parâmetro forceRefresh para garantir a cor mais recente
    const fetchProfiles = async (retryCount = 0, forceRefresh = false) => {
        try {
            if (!session?.user) return;
            if (retryCount === 0 && !forceRefresh) setLoading(true);

            const { data: myProfile } = await supabase.from('profiles').select('family_id').eq('user_id', session.user.id).maybeSingle();
            let familyId = myProfile?.family_id;

            if (!familyId) {
                const { data: createdFamily } = await supabase.from('families').select('id').eq('created_by', session.user.id).maybeSingle();
                familyId = createdFamily?.id;
            }

            if (!familyId) {
                if (retryCount < 3) {
                    setTimeout(() => fetchProfiles(retryCount + 1), 1000);
                    return;
                }
                setProfiles([]);
                setLoading(false);
                return;
            }

            // O .select('*') limpo puxa a última versão do banco
            const { data: profilesData, error: profilesError } = await supabase.from('profiles').select('*').eq('family_id', familyId).order('role', { ascending: true });
            if (profilesError) throw profilesError;

            setProfiles(profilesData || []);

        } catch (error) {
            console.log("Erro perfis:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
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
        const isAdmin = profile.role === 'admin';
        const isAdultProfile = isAdult(profile.birth_date);

        if (isAdmin && !profile.pin) {
            Alert.alert("Segurança Necessária", "Este perfil de Admin ainda não tem uma senha. Peça para alguém da equipe clicar na engrenagem e criar um PIN para ele.");
            return;
        }

        const needsPin = (isAdmin || isAdultProfile) && profile.pin;

        if (needsPin) {
            setSelectedProfile(profile);
            resetModalStates();
            setShowPinModal(true);
        } else {
            proceedToHome(profile);
        }
    };

    const verifyPin = () => {
        if (inputPin === selectedProfile.pin) {
            setShowPinModal(false); proceedToHome(selectedProfile);
        } else {
            Alert.alert("Ops!", "PIN incorreto. Tente novamente."); setInputPin('');
        }
    };

    const proceedToHome = (profile) => {
        if (profile.role === 'admin') navigation.replace('AdminHome', { profile: profile });
        else navigation.replace('RecruitTabs', { profile: profile });
    };

    const handleLogout = async () => { await signOut(); };

    const resetModalStates = () => {
        setInputPin(''); setForgotMode(null); setAccountPassword(''); setNewPin('');
    };

    const closePinModal = () => {
        setShowPinModal(false); resetModalStates();
    };

    const handleForgotPinClick = () => {
        const provider = session?.user?.app_metadata?.provider;
        if (provider && provider !== 'email') {
            Alert.alert("Atenção Admin", `Você criou sua conta usando o ${provider}. Para redefinir o PIN com segurança, você precisará sair do app, clicar em "Esqueci a Senha" na tela inicial e cadastrar uma senha de segurança para o seu e-mail.`);
            return;
        }
        setForgotMode('password');
    };

    const handleVerifyPassword = async () => {
        if (!accountPassword) return Alert.alert("Ops", "Digite a senha da sua conta.");
        setVerifyingReset(true);
        const { error } = await supabase.auth.signInWithPassword({ email: session.user.email, password: accountPassword });
        setVerifyingReset(false);

        if (error) Alert.alert("Acesso Negado", "Senha incorreta.");
        else { setAccountPassword(''); setForgotMode('new_pin'); }
    };

    const handleSaveNewPin = async () => {
        if (newPin.length !== 8) return Alert.alert("Ops", "O novo PIN deve ter exatamente 8 dígitos.");
        setVerifyingReset(true);
        const { error } = await supabase.from('profiles').update({ pin: newPin }).eq('id', selectedProfile.id);
        setVerifyingReset(false);

        if (error) Alert.alert("Erro", "Falha ao atualizar o PIN.");
        else {
            Alert.alert("Sucesso!", "Seu PIN de acesso foi redefinido.");
            selectedProfile.pin = newPin;
            closePinModal();
            proceedToHome(selectedProfile);
        }
    };

    const handleOpenSettingsClick = (profile) => {
        const hasSecureAdmin = profiles.some(p => p.role === 'admin' && p.pin);
        if (!hasSecureAdmin) {
            openProfileSettings(profile);
            return;
        }
        setEditingProfile(profile);
        setAdminAuthPin('');
        setShowAdminAuthModal(true);
    };

    const verifyAdminPinForSettings = () => {
        const admins = profiles.filter(p => p.role === 'admin');
        const isValidAdminPin = admins.some(admin => admin.pin === adminAuthPin);

        if (isValidAdminPin) {
            setShowAdminAuthModal(false);
            openProfileSettings(editingProfile);
        } else {
            Alert.alert("Acesso Negado", "O PIN de Administrador está incorreto.");
            setAdminAuthPin('');
        }
    };

    const openProfileSettings = (profile) => {
        setEditingProfile(profile);
        setEditTitle(profile.title_archetype || (profile.role === 'admin' ? 'Admin' : 'Aventureiro'));

        const currentPalette = COLOR_PALETTES.find(c => c.main === profile.theme_color)
            || (profile.role === 'admin' ? COLOR_PALETTES[1] : COLOR_PALETTES[0]);
        setEditColorObj(currentPalette);
        setEditNewPin('');
        setShowSettingsModal(true);
    };

    const handleSaveSettings = async () => {
        if (editNewPin.length > 0 && editNewPin.length < 8) {
            return Alert.alert("Ops!", "Se for alterar o PIN, ele precisa ter exatamente 8 dígitos.");
        }

        setSavingSettings(true);
        try {
            const updates = {
                title_archetype: editTitle,
                theme_color: editColorObj.main
            };

            if (editNewPin.length === 8) {
                updates.pin = editNewPin;
            }

            const { error } = await supabase.from('profiles').update(updates).eq('id', editingProfile.id);
            if (error) throw error;

            setProfiles(prev => prev.map(p => p.id === editingProfile.id ? { ...p, ...updates } : p));

            Alert.alert("Sucesso!", "Configurações salvas.");
            setShowSettingsModal(false);

        } catch (error) {
            Alert.alert("Erro ao salvar", error.message);
        } finally {
            setSavingSettings(false);
        }
    };

    const renderProfileCard = ({ item }) => {
        const isAdmin = item.role === 'admin';
        const needsLock = (isAdmin || isAdult(item.birth_date)) && item.pin;

        const palette = COLOR_PALETTES.find(c => c.main === item.theme_color)
            || (isAdmin ? COLOR_PALETTES[1] : COLOR_PALETTES[0]);

        const iconName = isAdmin ? "crown" : "star-face";
        const labelText = item.title_archetype ? item.title_archetype.toUpperCase() : (isAdmin ? 'ADMIN' : 'AVENTUREIRO');

        return (
            <TouchableOpacity style={styles.cardWrapper} activeOpacity={0.8} onPress={() => handleProfileSelect(item)}>
                <View style={styles.cardShadow} />
                <View style={[styles.cardFront, { backgroundColor: palette.bg, borderColor: palette.border }]}>

                    <TouchableOpacity
                        style={[styles.gearBtn, { backgroundColor: palette.main, borderColor: palette.border }]}
                        activeOpacity={0.8}
                        onPress={() => handleOpenSettingsClick(item)}
                    >
                        <MaterialCommunityIcons name="cog" size={16} color="#FFF" />
                    </TouchableOpacity>

                    <View style={[styles.avatarCircle, { backgroundColor: '#FFF', borderColor: palette.border }]}>
                        <MaterialCommunityIcons name={iconName} size={42} color={palette.main} />
                    </View>

                    <Text style={[styles.cardName, { color: palette.main }]} numberOfLines={1}>
                        {item.name}
                    </Text>

                    <View style={[styles.roleBadge, { backgroundColor: '#FFF', borderWidth: 1, borderColor: palette.border }]}>
                        <Text style={[styles.roleText, { color: palette.main }]}>{labelText}</Text>
                    </View>

                    {needsLock && (
                        <View style={[styles.lockBadge, { backgroundColor: palette.main }]}>
                            <MaterialCommunityIcons name="lock" size={14} color="#FFF" />
                        </View>
                    )}

                    {isAdmin && !item.pin && (
                        <View style={[styles.lockBadge, { backgroundColor: '#EF4444' }]}>
                            <MaterialCommunityIcons name="shield-alert" size={14} color="#FFF" />
                        </View>
                    )}
                </View>
            </TouchableOpacity>
        );
    };

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#10B981" />
                <Text style={styles.loadingText}>Acordando o Chonko...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

            <LinearGradient
                colors={['#F59E0B', '#F59E0B']}
                start={{ x: 1, y: 0}}
                end={{ x: 1, y: 0 }}
                style={styles.topArea}
            >
                <View style={styles.headerContent}>
                    <View>
                        <Text style={styles.headerTitle}>QUEM ESTÁ NO COMANDO?</Text>
                        <Text style={styles.headerSubtitle}>Escolha um perfil para começar.</Text>
                    </View>
                    <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
                        <MaterialCommunityIcons name="door-open" size={26} color="#FFF" />
                    </TouchableOpacity>
                </View>
            </LinearGradient>

            <View style={styles.listContainer}>
                <FlatList
                    data={profiles} keyExtractor={(item) => item.id} numColumns={2}
                    columnWrapperStyle={styles.listColumns} contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchProfiles(0, true); }} tintColor="#10B981"/>}
                    renderItem={renderProfileCard}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <View style={styles.emptyCard}>
                                <MaterialCommunityIcons name="account-group" size={60} color="#94A3B8" />
                                <Text style={styles.emptyTitle}>Família Vazia?</Text>
                                <Text style={styles.emptyText}>Parece que ninguém chegou ainda. Adicione aventureiros!</Text>
                                <TouchableOpacity style={styles.retryBtn} onPress={handleLogout}>
                                    <Text style={styles.retryText}>VOLTAR AO INÍCIO</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    }
                />
            </View>

            <Modal visible={showPinModal} transparent={true} animationType="fade" onRequestClose={closePinModal}>
                <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalOverlay}>
                    <View style={styles.modalContent}>

                        <View style={styles.modalIcon}>
                            <MaterialCommunityIcons name={forgotMode ? "shield-refresh" : "shield-key"} size={45} color="#10B981" />
                        </View>

                        {forgotMode === null && (
                            <>
                                <Text style={styles.modalTitle}>ÁREA RESTRITA</Text>
                                <Text style={styles.modalSubtitle}>Digite a senha de {selectedProfile?.name}</Text>
                                <View style={styles.pinInputWrapper}>
                                    <TextInput style={styles.pinInput} value={inputPin} onChangeText={setInputPin} keyboardType="numeric" maxLength={8} secureTextEntry placeholder="••••••••" placeholderTextColor="#CBD5E1" autoFocus />
                                </View>
                                <TouchableOpacity onPress={handleForgotPinClick} style={styles.forgotBtnWrapper}>
                                    <Text style={styles.forgotBtnText}>Esqueci meu PIN</Text>
                                </TouchableOpacity>
                                <View style={styles.modalButtons}>
                                    <TouchableOpacity style={styles.modalBtnCancel} onPress={closePinModal}><Text style={styles.modalBtnTextCancel}>CANCELAR</Text></TouchableOpacity>
                                    <TouchableOpacity style={styles.modalBtnConfirm} onPress={verifyPin}><Text style={styles.modalBtnTextConfirm}>ENTRAR</Text></TouchableOpacity>
                                </View>
                            </>
                        )}

                        {forgotMode === 'password' && (
                            <>
                                <Text style={styles.modalTitle}>REDEFINIR PIN</Text>
                                <Text style={styles.modalSubtitle}>Digite a senha da sua conta Chonko para provar que é você.</Text>
                                <View style={styles.pinInputWrapper}>
                                    <TextInput style={styles.passwordInput} value={accountPassword} onChangeText={setAccountPassword} secureTextEntry placeholder="Senha da conta" placeholderTextColor="#94A3B8" autoFocus />
                                </View>
                                <View style={styles.modalButtons}>
                                    <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setForgotMode(null)} disabled={verifyingReset}><Text style={styles.modalBtnTextCancel}>VOLTAR</Text></TouchableOpacity>
                                    <TouchableOpacity style={styles.modalBtnConfirm} onPress={handleVerifyPassword} disabled={verifyingReset}>
                                        {verifyingReset ? <ActivityIndicator color="#FFF" /> : <Text style={styles.modalBtnTextConfirm}>VERIFICAR</Text>}
                                    </TouchableOpacity>
                                </View>
                            </>
                        )}

                        {forgotMode === 'new_pin' && (
                            <>
                                <Text style={styles.modalTitle}>NOVO PIN</Text>
                                <Text style={styles.modalSubtitle}>Crie seu novo PIN de acesso (exatamente 8 dígitos).</Text>
                                <View style={styles.pinInputWrapper}>
                                    <TextInput style={styles.pinInput} value={newPin} onChangeText={setNewPin} keyboardType="numeric" maxLength={8} secureTextEntry placeholder="••••••••" placeholderTextColor="#CBD5E1" autoFocus />
                                </View>
                                <View style={styles.modalButtons}>
                                    <TouchableOpacity style={[styles.modalBtnConfirm, { flex: 1, backgroundColor: '#10B981' }]} onPress={handleSaveNewPin} disabled={verifyingReset}>
                                        {verifyingReset ? <ActivityIndicator color="#FFF" /> : <Text style={styles.modalBtnTextConfirm}>SALVAR E ENTRAR</Text>}
                                    </TouchableOpacity>
                                </View>
                            </>
                        )}
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            <Modal visible={showAdminAuthModal} transparent={true} animationType="fade" onRequestClose={() => setShowAdminAuthModal(false)}>
                <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { borderColor: '#F59E0B' }]}>
                        <View style={[styles.modalIcon, { backgroundColor: '#FEF3C7', borderColor: '#F59E0B' }]}>
                            <MaterialCommunityIcons name="shield-lock" size={45} color="#D97706" />
                        </View>
                        <Text style={[styles.modalTitle, { color: '#92400E' }]}>ÁREA DO ADMIN</Text>
                        <Text style={styles.modalSubtitle}>Digite o PIN de administrador para editar cartões.</Text>

                        <View style={styles.pinInputWrapper}>
                            <TextInput style={[styles.pinInput, { color: '#D97706' }]} value={adminAuthPin} onChangeText={setAdminAuthPin} keyboardType="numeric" maxLength={8} secureTextEntry placeholder="••••••••" placeholderTextColor="#CBD5E1" autoFocus />
                        </View>

                        <View style={styles.modalButtons}>
                            <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setShowAdminAuthModal(false)}><Text style={styles.modalBtnTextCancel}>CANCELAR</Text></TouchableOpacity>
                            <TouchableOpacity style={[styles.modalBtnConfirm, { backgroundColor: '#F59E0B', borderColor: '#D97706' }]} onPress={verifyAdminPinForSettings}><Text style={styles.modalBtnTextConfirm}>VERIFICAR</Text></TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            <Modal visible={showSettingsModal} transparent={true} animationType="slide" onRequestClose={() => setShowSettingsModal(false)}>
                <View style={styles.settingsOverlay}>
                    <View style={styles.settingsContent}>

                        <View style={styles.settingsHeader}>
                            <Text style={styles.settingsTitle}>Configurar {editingProfile?.name}</Text>
                            <TouchableOpacity onPress={() => setShowSettingsModal(false)} style={styles.closeSettingsBtn}>
                                <MaterialCommunityIcons name="close" size={24} color="#64748B" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>

                            <Text style={styles.sectionLabel}>TÍTULO DO CARTÃO</Text>
                            <View style={styles.chipsContainer}>
                                {(editingProfile?.role === 'admin' ? ADMIN_TITLES : RECRUIT_TITLES).map((title, index) => {
                                    const isSelected = editTitle === title;
                                    return (
                                        <TouchableOpacity
                                            key={index}
                                            style={[styles.chip, isSelected && { backgroundColor: editColorObj.bg, borderColor: editColorObj.main, borderWidth: 2 }]}
                                            onPress={() => setEditTitle(title)}
                                            activeOpacity={0.7}
                                        >
                                            <Text style={[styles.chipText, isSelected && { color: editColorObj.main, fontFamily: FONTS.bold }]}>{title}</Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>

                            <View style={styles.divider} />

                            <Text style={styles.sectionLabel}>COR DO TEMA</Text>
                            <View style={styles.colorsContainer}>
                                {COLOR_PALETTES.map((palette, index) => {
                                    const isSelected = editColorObj.id === palette.id;
                                    return (
                                        <TouchableOpacity
                                            key={index}
                                            style={[styles.colorCircle, { backgroundColor: palette.main }, isSelected && styles.colorCircleSelected]}
                                            onPress={() => setEditColorObj(palette)}
                                            activeOpacity={0.8}
                                        >
                                            {isSelected && <MaterialCommunityIcons name="check" size={24} color="#FFF" />}
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>

                            <View style={styles.divider} />

                            <Text style={styles.sectionLabel}>SEGURANÇA</Text>
                            <Text style={styles.sectionDesc}>Digite um novo PIN de 8 dígitos para alterar a senha de {editingProfile?.name}. Ou deixe em branco para manter a atual.</Text>
                            <TextInput
                                style={styles.settingsPinInput}
                                value={editNewPin}
                                onChangeText={setEditNewPin}
                                keyboardType="numeric"
                                maxLength={8}
                                secureTextEntry
                                placeholder="NOVO PIN..."
                                placeholderTextColor="#94A3B8"
                            />

                        </ScrollView>

                        <TouchableOpacity style={[styles.saveBtnWrapper, { opacity: savingSettings ? 0.7 : 1 }]} onPress={handleSaveSettings} disabled={savingSettings} activeOpacity={0.8}>
                            <View style={[styles.saveBtnShadow, { backgroundColor: editColorObj.main }]} />
                            <View style={[styles.saveBtnFront, { backgroundColor: editColorObj.main, borderColor: editColorObj.border }]}>
                                {savingSettings ? <ActivityIndicator color="#FFF" /> : (
                                    <>
                                        <MaterialCommunityIcons name="content-save" size={24} color="#FFF" style={{marginRight: 8}} />
                                        <Text style={styles.saveBtnText}>SALVAR ALTERAÇÕES</Text>
                                    </>
                                )}
                            </View>
                        </TouchableOpacity>

                    </View>
                </View>
            </Modal>

        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FDFCF8' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F0FDF4' },
    loadingText: { color: '#065F46', marginTop: 15, fontFamily: FONTS.bold, fontSize: 16 },

    topArea: {
        paddingTop: Platform.OS === 'ios' ? 60 : StatusBar.currentHeight + 20,
        paddingBottom: 35,
        borderBottomLeftRadius: 40,
        borderBottomRightRadius: 40,
        marginBottom: 25,
        elevation: 8,
        borderWidth:1,
        borderColor:'#CD7C00FF'
    },
    headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 25 },
    headerTitle: { fontSize: 20, fontFamily: FONTS.bold, color: '#FFF', letterSpacing: 0.5 },
    headerSubtitle: { fontSize: 15, fontFamily: FONTS.regular, color: '#FFFFF', marginTop: 4 },
    logoutBtn: { padding: 12, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 16 },

    listContainer: { flex: 1 },
    listContent: { paddingHorizontal: 20, paddingBottom: 40 },
    listColumns: { justifyContent: 'space-between' },

    cardWrapper: { width: CARD_WIDTH, height: 200, marginBottom: 25, position: 'relative' },
    cardShadow: { position: 'absolute', top: 6, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: 28 },
    cardFront: { flex: 1, borderRadius: 28, borderWidth: 3, alignItems: 'center', justifyContent: 'center', padding: 15 },

    gearBtn: { position: 'absolute', top: 12, left: 12, width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', borderWidth: 2, zIndex: 10, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, elevation: 3 },

    avatarCircle: { width: 76, height: 76, borderRadius: 38, justifyContent: 'center', alignItems: 'center', marginBottom: 12, borderWidth: 3 },
    cardName: { fontSize: 18, fontFamily: FONTS.bold, textAlign: 'center', marginBottom: 8 },
    roleBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
    roleText: { fontSize: 10, fontFamily: FONTS.bold, letterSpacing: 0.5 },
    lockBadge: { position: 'absolute', top: 12, right: 12, width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#FFF', shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, elevation: 4 },

    emptyContainer: { alignItems: 'center', marginTop: 40 },
    emptyCard: { backgroundColor: 'rgba(255,255,255,0.9)', padding: 35, borderRadius: 30, alignItems: 'center', width: '100%', borderWidth: 3, borderColor: '#E2E8F0' },
    emptyTitle: { fontSize: 22, fontFamily: FONTS.bold, color: '#334155', marginTop: 15 },
    emptyText: { color: '#64748B', textAlign: 'center', marginTop: 8, marginBottom: 25, fontSize: 15, lineHeight: 22 },
    retryBtn: { paddingVertical: 14, paddingHorizontal: 30, backgroundColor: '#F1F5F9', borderRadius: 16, borderWidth: 2, borderColor: '#CBD5E1' },
    retryText: { color: '#475569', fontFamily: FONTS.bold, fontSize: 14 },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.7)', justifyContent: 'center', alignItems: 'center', padding: 20 },
    modalContent: { width: '95%', maxWidth: 360, backgroundColor: '#FFF', borderRadius: 32, padding: 30, alignItems: 'center', borderWidth: 4, borderColor: '#F59E0B' },
    modalIcon: { width: 80, height: 80, backgroundColor: '#D1FAE5', borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 20, borderWidth: 3, borderColor: '#F59E0B', marginTop: -60 },
    modalTitle: { fontSize: 24, fontFamily: FONTS.bold, color: '#064E3B', marginBottom: 5 },
    modalSubtitle: { fontSize: 14, color: '#64748B', marginBottom: 25, fontFamily: FONTS.regular, textAlign: 'center', lineHeight: 20 },

    pinInputWrapper: { width: '100%', marginBottom: 15 },
    pinInput: { width: '100%', height: 70, borderWidth: 3, borderColor: '#E2E8F0', borderRadius: 20, backgroundColor: '#F8FAFC', textAlign: 'center', fontSize: 34, fontFamily: FONTS.bold, color: '#059669', letterSpacing: 10 },
    passwordInput: { width: '100%', height: 60, borderWidth: 2, borderColor: '#E2E8F0', borderRadius: 16, backgroundColor: '#F8FAFC', paddingHorizontal: 20, fontSize: 16, fontFamily: FONTS.bold, color: '#059669' },

    forgotBtnWrapper: { marginBottom: 25 },
    forgotBtnText: { color: '#10B981', fontFamily: FONTS.bold, fontSize: 14, textDecorationLine: 'underline' },

    modalButtons: { flexDirection: 'row', gap: 15, width: '100%' },
    modalBtnCancel: { flex: 1, height: 55, justifyContent: 'center', alignItems: 'center', borderRadius: 18, backgroundColor: '#F1F5F9', borderWidth: 2, borderColor: '#E2E8F0' },
    modalBtnConfirm: { flex: 1, height: 55, justifyContent: 'center', alignItems: 'center', borderRadius: 18, backgroundColor: '#10B981', borderWidth: 2, borderColor: '#059669' },
    modalBtnTextCancel: { fontFamily: FONTS.bold, color: '#64748B', fontSize: 15 },
    modalBtnTextConfirm: { fontFamily: FONTS.bold, color: '#FFF', fontSize: 15 },

    settingsOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.7)', justifyContent: 'flex-end' },
    settingsContent: { backgroundColor: '#FFF', borderTopLeftRadius: 40, borderTopRightRadius: 40, padding: 25, maxHeight: '85%' },
    settingsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    settingsTitle: { fontSize: 22, fontFamily: FONTS.bold, color: '#1E293B' },
    closeSettingsBtn: { padding: 8, backgroundColor: '#F1F5F9', borderRadius: 16 },

    sectionLabel: { fontSize: 12, fontFamily: FONTS.bold, color: '#94A3B8', letterSpacing: 1, marginBottom: 12 },
    sectionDesc: { fontSize: 13, color: '#64748B', fontFamily: FONTS.regular, marginBottom: 10, lineHeight: 18 },
    divider: { width: '100%', height: 1, backgroundColor: '#E2E8F0', marginVertical: 20 },

    chipsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: { paddingHorizontal: 15, paddingVertical: 8, backgroundColor: '#F1F5F9', borderRadius: 20, borderWidth: 1, borderColor: '#E2E8F0' },
    chipText: { fontSize: 14, fontFamily: FONTS.regular, color: '#475569' },

    colorsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center' },
    colorCircle: { width: 45, height: 45, borderRadius: 25, justifyContent: 'center', alignItems: 'center', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1 },
    colorCircleSelected: { borderWidth: 4, borderColor: '#1E293B' },

    settingsPinInput: { width: '100%', height: 60, backgroundColor: '#F8FAFC', borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', paddingHorizontal: 20, fontSize: 18, fontFamily: FONTS.bold, color: '#1E293B', letterSpacing: 4, textAlign: 'center' },

    saveBtnWrapper: { width: '100%', height: 60, position: 'relative', marginTop: 10 },
    saveBtnShadow: { position: 'absolute', top: 5, left: 0, width: '100%', height: '100%', borderRadius: 16 },
    saveBtnFront: { width: '100%', height: '100%', borderRadius: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
    saveBtnText: { fontFamily: FONTS.bold, color: '#FFF', fontSize: 16, letterSpacing: 0.5 },
});