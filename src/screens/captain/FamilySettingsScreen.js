import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as Clipboard from 'expo-clipboard';
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
import { FONTS } from '../../styles/theme';

export default function FamilySettingsScreen() {
    const navigation = useNavigation();
    const route = useRoute();
    const { session } = useAuth();
    const { familyId, currentProfileId } = route.params;

    const [family, setFamily] = useState(null);
    const [members, setMembers] = useState([]);

    // Estados do Código de Família
    const [inviteCode, setInviteCode] = useState(null);
    const [expiresAt, setExpiresAt] = useState(null);
    const [timeLeft, setTimeLeft] = useState('');
    const [isExpired, setIsExpired] = useState(true);

    const [loading, setLoading] = useState(true);
    const [generatingCode, setGeneratingCode] = useState(false);

    const timerRef = useRef(null);

    useEffect(() => {
        fetchFamilyData();
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

            if (familyData?.invite_code && familyData?.invite_expires_at) {
                const expireDate = new Date(familyData.invite_expires_at);
                const now = new Date();

                if (expireDate > now && !familyData.invite_code.includes('CHONKO-') && familyData.invite_code.length === 6) {
                    setInviteCode(familyData.invite_code);
                    setExpiresAt(familyData.invite_expires_at);
                    setIsExpired(false);
                } else {
                    setInviteCode(null);
                    setIsExpired(true);
                }
            }

            const { data: membersData } = await supabase
                .from('profiles')
                .select('*')
                .eq('family_id', familyId)
                .order('role', { ascending: true }); // Admin first

            setMembers(membersData || []);
        } catch (error) { console.log(error); }
        finally { setLoading(false); }
    };

    // =========================================================================
    // LÓGICA 1: CÓDIGO DA FAMÍLIA (NOVO MEMBRO)
    // =========================================================================
    const generateNewFamilyCode = async () => {
        setGeneratingCode(true);
        try {
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
            let newCode = '';
            for (let i = 0; i < 6; i++) {
                newCode += chars.charAt(Math.floor(Math.random() * chars.length));
            }

            const expiryDate = new Date();
            expiryDate.setMinutes(expiryDate.getMinutes() + 15); // 15 minutos

            const { error } = await supabase
                .from('families')
                .update({
                    invite_code: newCode,
                    invite_expires_at: expiryDate.toISOString()
                })
                .eq('id', familyId);

            if (error) throw error;

            setInviteCode(newCode);
            setExpiresAt(expiryDate.toISOString());
            setIsExpired(false);

            return newCode;

        } catch (e) {
            Alert.alert("Erro", "Não foi possível gerar o código.");
            return null;
        } finally {
            setGeneratingCode(false);
        }
    };

    const copyToClipboard = async (codeToCopy) => {
        await Clipboard.setStringAsync(codeToCopy);
        Alert.alert("Copiado!", "Código salvo na área de transferência.");
    };

    const handleShareAction = async () => {
        let codeToShare = inviteCode;
        let expiresToShare = expiresAt;

        if (!codeToShare || isExpired || codeToShare.includes('CHONKO-')) {
            codeToShare = await generateNewFamilyCode();
            if (!codeToShare) return;

            const tempDate = new Date();
            tempDate.setMinutes(tempDate.getMinutes() + 15);
            expiresToShare = tempDate.toISOString();
        }

        try {
            const timeString = new Date(expiresToShare).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            await Share.share({
                message: `Venha ganhar prêmios incríveis completando missões em nossa equipe no ChonkoTask! 🎁✨\n\nUse o código de acesso: ${codeToShare}\n\n(Atenção: Válido apenas por 15 minutos, até as ${timeString})`,
            });
        } catch (error) {
            Alert.alert("Erro", "Não foi possível compartilhar.");
        }
    };

    // =========================================================================
    // LÓGICA 2: CÓDIGO DE RECONEXÃO (APARELHO PERDIDO DA CRIANÇA)
    // =========================================================================
    const handleGenerateReconnectCode = async (member) => {
        setGeneratingCode(true);
        try {
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
            let newCode = '';
            for (let i = 0; i < 6; i++) {
                newCode += chars.charAt(Math.floor(Math.random() * chars.length));
            }

            const expiryDate = new Date();
            expiryDate.setMinutes(expiryDate.getMinutes() + 5); // Apenas 5 minutos de validade por segurança

            const { error } = await supabase
                .from('profiles')
                .update({
                    reconnect_code: newCode,
                    reconnect_expires_at: expiryDate.toISOString()
                })
                .eq('id', member.id);

            if (error) throw error;

            Alert.alert(
                "Aparelho Liberado!",
                `O código para reconectar o perfil de ${member.name} é:\n\n${newCode}\n\n(Expira em 5 minutos. Insira este código na tela de entrada do novo celular)`,
                [
                    { text: "Copiar", onPress: () => copyToClipboard(newCode) },
                    { text: "Ok", style: "default" }
                ]
            );

        } catch (error) {
            Alert.alert("Erro", "Não foi possível gerar o código de reconexão.");
        } finally {
            setGeneratingCode(false);
        }
    };

    const confirmReconnect = (member) => {
        Alert.alert(
            "Reconectar Aparelho?",
            `Deseja gerar um código temporário para logar o perfil de ${member.name} em um novo celular ou tablet sem perder o progresso?`,
            [
                { text: "Cancelar", style: "cancel" },
                { text: "Gerar Código", onPress: () => handleGenerateReconnectCode(member) }
            ]
        );
    };

    // =========================================================================
    // GERENCIAMENTO DA EQUIPE
    // =========================================================================
    const handleManageMember = async (member, action) => {
        try {
            let updateData = {};

            if (action === 'promote') updateData = { role: 'admin' };
            if (action === 'demote') updateData = { role: 'recruit' };
            if (action === 'remove') updateData = { family_id: null };

            const { error } = await supabase
                .from('profiles')
                .update(updateData)
                .eq('id', member.id);

            if (error) throw error;

            Alert.alert("Pronto!", "Alteração realizada com sucesso.");
            fetchFamilyData();

        } catch (error) {
            Alert.alert("Erro", "Falha na operação. Verifique suas permissões.");
        }
    };

    const confirmAction = (member, action) => {
        let title = "";
        let message = "";

        if (action === 'promote') {
            title = "Tornar Administrador?";
            message = `${member.name} terá poder total para criar missões e aprovar tarefas na equipe.`;
        } else if (action === 'remove') {
            title = "Remover da Equipe?";
            message = `Tem certeza que deseja remover ${member.name}? Será necessário um novo convite para retornar.`;
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
        const isAdmin = item.role === 'admin';

        const roleLabel = item.title_archetype
            ? item.title_archetype.toUpperCase()
            : (isAdmin ? "ADMIN" : "MEMBRO");

        return (
            <View style={styles.memberCard}>
                <View style={styles.memberInfo}>
                    <View style={[styles.avatarBox, isAdmin ? {backgroundColor: '#FEF3C7', borderColor: '#F59E0B'} : {backgroundColor: '#F8FAFC', borderColor: '#CBD5E1'}]}>
                        <MaterialCommunityIcons name={isAdmin ? "crown" : "account"} size={24} color={isAdmin ? '#F59E0B' : '#64748B'} />
                    </View>
                    <View style={{ flex: 1, paddingRight: 10 }}>
                        <Text style={styles.memberName} numberOfLines={1}>{item.name} {isMe && "(Você)"}</Text>
                        <Text style={[styles.memberRole, {color: isAdmin ? '#B45309' : '#64748B'}]}>
                            {roleLabel}
                        </Text>
                    </View>
                </View>

                {!isMe && (
                    <View style={styles.actionsContainer}>
                        {!isAdmin && (
                            <>
                                {/* NOVO BOTÃO AZUL: GERAR CÓDIGO DE RECONEXÃO */}
                                <TouchableOpacity
                                    style={[styles.actionBtn, {backgroundColor: '#EFF6FF', borderColor: '#BFDBFE'}]}
                                    onPress={() => confirmReconnect(item)}
                                >
                                    <MaterialCommunityIcons name="cellphone-link" size={22} color="#3B82F6" />
                                </TouchableOpacity>

                                {/* BOTÃO DE PROMOVER A ADMIN */}
                                <TouchableOpacity
                                    style={styles.actionBtn}
                                    onPress={() => confirmAction(item, 'promote')}
                                >
                                    <MaterialCommunityIcons name="arrow-up-bold-box-outline" size={22} color="#D97706" />
                                </TouchableOpacity>

                                {/* BOTÃO DE REMOVER DA EQUIPE */}
                                <TouchableOpacity
                                    style={[styles.actionBtn, {backgroundColor: '#FEF2F2', borderColor: '#FECACA'}]}
                                    onPress={() => confirmAction(item, 'remove')}
                                >
                                    <MaterialCommunityIcons name="trash-can-outline" size={22} color="#EF4444" />
                                </TouchableOpacity>
                            </>
                        )}
                    </View>
                )}
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

            <View style={styles.topOrangeArea}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.8}>
                        <MaterialCommunityIcons name="arrow-left" size={24} color={'#FFF'} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>GERENCIAR EQUIPE</Text>
                    <View style={{width: 40}} />
                </View>
            </View>

            {loading && members.length === 0 ? <ActivityIndicator size="large" color="#F59E0B" style={{marginTop:50}} /> : (
                <FlatList
                    data={members}
                    keyExtractor={item => item.id}
                    renderItem={renderMember}
                    contentContainerStyle={styles.content}
                    showsVerticalScrollIndicator={false}
                    ListHeaderComponent={
                        <>
                            <View style={styles.codeCard}>
                                <Text style={styles.codeLabel}>CÓDIGO DE NOVA CONTA</Text>

                                {generatingCode && !inviteCode ? (
                                    <ActivityIndicator color="#F59E0B" style={{marginVertical: 10}} />
                                ) : (
                                    <>
                                        {(!inviteCode || isExpired) ? (
                                            <View style={{alignItems: 'center', marginVertical: 10, width: '100%'}}>
                                                <MaterialCommunityIcons name="account-plus-outline" size={40} color="#CBD5E1" />
                                                <Text style={styles.expiredText}>Use para adicionar novos membros à equipe.</Text>

                                                <TouchableOpacity style={styles.shareBtn} activeOpacity={0.9} onPress={handleShareAction}>
                                                    <MaterialCommunityIcons name="share-variant" size={20} color="#FFF" />
                                                    <Text style={styles.shareText}>GERAR E COMPARTILHAR</Text>
                                                </TouchableOpacity>
                                            </View>
                                        ) : (
                                            <>
                                                <TouchableOpacity style={styles.codeBox} activeOpacity={0.7} onPress={() => copyToClipboard(inviteCode)}>
                                                    <Text style={styles.codeText}>{inviteCode}</Text>
                                                    <MaterialCommunityIcons name="content-copy" size={20} color="#94A3B8" style={{position:'absolute', right: 15}}/>
                                                </TouchableOpacity>

                                                <View style={styles.timerBadge}>
                                                    <MaterialCommunityIcons name="timer-sand" size={14} color="#B45309" />
                                                    <Text style={styles.timerText}>VÁLIDO POR {timeLeft}</Text>
                                                </View>

                                                <Text style={styles.codeDesc}>Compartilhe este código para convidar novos membros para a equipe.</Text>

                                                <TouchableOpacity style={styles.shareBtn} activeOpacity={0.9} onPress={handleShareAction}>
                                                    <MaterialCommunityIcons name="share-variant" size={20} color="#FFF" />
                                                    <Text style={styles.shareText}>COMPARTILHAR CÓDIGO</Text>
                                                </TouchableOpacity>
                                            </>
                                        )}
                                    </>
                                )}
                            </View>

                            <Text style={styles.sectionTitle}>MEMBROS DA EQUIPE</Text>
                        </>
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FDFCF8' },

    topOrangeArea: {
        paddingTop: 60,
        paddingBottom: 25,
        borderBottomLeftRadius: 35,
        borderBottomRightRadius: 35,
        backgroundColor: '#F59E0B',
        zIndex: 10,
        borderWidth: 1,
        borderColor:'#cd7c00'
    },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20 },
    headerTitle: { fontFamily: FONTS.bold, fontSize: 16, color: '#FFF', letterSpacing: 1 },
    backBtn: { padding: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 14 },

    content: { padding: 20, paddingBottom: 50 },

    codeCard: {
        backgroundColor: '#FFF', borderRadius: 24, padding: 20, marginBottom: 30,
        borderWidth: 1, borderColor: 'rgba(0,0,0,0.08)',
        alignItems: 'center', position: 'relative',
        shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 3
    },

    codeLabel: { fontFamily: FONTS.bold, fontSize: 12, color: '#94A3B8', marginBottom: 15, marginTop: 5, letterSpacing: 1 },

    codeBox: { width: '100%', flexDirection: 'row', backgroundColor: '#F8FAFC', paddingVertical: 15, borderRadius: 16, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 10 },
    codeText: { fontFamily: FONTS.bold, fontSize: 32, color: '#1E293B', letterSpacing: 6 },

    timerBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFBEB', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#F59E0B', marginBottom: 15 },
    timerText: { fontSize: 11, fontFamily: FONTS.bold, color: '#B45309', marginLeft: 6 },

    codeDesc: { fontFamily: FONTS.regular, fontSize: 12, color: '#64748B', textAlign: 'center', marginBottom: 20, paddingHorizontal: 10 },

    shareBtn: { width: '100%', flexDirection: 'row', backgroundColor: '#F59E0B', paddingVertical: 14, borderRadius: 16, alignItems: 'center', justifyContent: 'center', gap: 8, shadowColor: "#F59E0B", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 6, elevation: 4, borderBottomWidth: 5, borderColor:'#cd7c00' },
    shareText: { fontFamily: FONTS.bold, color: '#FFF', fontSize: 14 },

    expiredText: { fontFamily: FONTS.regular, color: '#94A3B8', marginVertical: 10, textAlign: 'center', fontSize: 13, paddingHorizontal: 20 },

    sectionTitle: { fontFamily: FONTS.bold, fontSize: 12, color: '#64748B', marginBottom: 15, opacity: 0.8, textTransform: 'uppercase', letterSpacing: 0.5 },

    memberCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFF', padding: 15, borderRadius: 20, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)', shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 4, elevation: 2 },

    memberInfo: { flexDirection: 'row', alignItems: 'center', gap: 15, flex: 1 },
    avatarBox: { width: 48, height: 48, borderRadius: 16, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
    memberName: { fontFamily: FONTS.bold, fontSize: 16, color: '#1E293B' },
    memberRole: { fontFamily: FONTS.bold, fontSize: 11, marginTop: 2 },

    actionsContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    actionBtn: { padding: 8, borderRadius: 12, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0' },
});