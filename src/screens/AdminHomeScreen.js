import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    Image,
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
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';
import { supabase } from '../lib/supabase';
import { FONTS } from '../styles/theme';

const { width } = Dimensions.get('window');

// Componente de Botão 3D Estilizado para o Menu Principal com suporte a 'Disabled'
const MenuButton = ({ title, subtitle, icon, color, shadowColor, onPress, isDisabled = false }) => (
    <TouchableOpacity
        style={[styles.menuBtnWrapper, isDisabled && { opacity: 0.7 }]}
        activeOpacity={0.9}
        onPress={isDisabled ? null : onPress}
    >
        <View style={[styles.menuBtnShadow, { backgroundColor: isDisabled ? '#94A3B8' : shadowColor }]} />
        <View style={[styles.menuBtnFront, { backgroundColor: isDisabled ? '#CBD5E1' : color }]}>
            <MaterialCommunityIcons name={icon} size={36} color="#FFF" style={{ marginBottom: 5 }} />
            <Text style={styles.menuBtnTitle} numberOfLines={1}>{title}</Text>
            <Text style={styles.menuBtnSubtitle} numberOfLines={1}>{subtitle}</Text>

            {/* Badge de Em Breve */}
            {isDisabled && (
                <View style={styles.disabledBadge}>
                    <Text style={styles.disabledBadgeText}>EM BREVE</Text>
                </View>
            )}
        </View>
    </TouchableOpacity>
);

export default function AdminHomeScreen() {
    const navigation = useNavigation();
    const route = useRoute();
    const { profile } = route.params || {};

    const [family, setFamily] = useState(null);
    const [pendingAttempts, setPendingAttempts] = useState(0);
    const [activeMissionsCount, setActiveMissionsCount] = useState(0);
    const [chonkoGems, setChonkoGems] = useState(0);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Estados do Modal de Feedback
    const [showFeedbackModal, setShowFeedbackModal] = useState(false);
    const [feedbackSubject, setFeedbackSubject] = useState('bug');
    const [feedbackMessage, setFeedbackMessage] = useState('');
    const [feedbackImages, setFeedbackImages] = useState([]); // Array de objetos { uri, base64 }
    const [sendingFeedback, setSendingFeedback] = useState(false);

    useFocusEffect(
        useCallback(() => {
            if (profile?.family_id) fetchDashboardData();
        }, [profile])
    );

    useEffect(() => {
        if (!profile?.family_id) return;

        const channel = supabase.channel('admin_dashboard_attempts')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'mission_attempts' },
                () => {
                    fetchDashboardData();
                })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [profile?.family_id]);

    const fetchDashboardData = async () => {
        try {
            const { data: familyData } = await supabase
                .from('families')
                .select('*')
                .eq('id', profile.family_id)
                .single();
            if (familyData) setFamily(familyData);

            const { count: pendingCount } = await supabase
                .from('mission_attempts')
                .select('id, profiles!inner(family_id)', { count: 'exact', head: true })
                .eq('status', 'pending')
                .eq('profiles.family_id', profile.family_id);
            setPendingAttempts(pendingCount || 0);

            const { count: activeCount } = await supabase
                .from('missions')
                .select('id', { count: 'exact', head: true })
                .eq('family_id', profile.family_id)
                .eq('status', 'active');
            setActiveMissionsCount(activeCount || 0);

            const { data: captainData } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', profile.id)
                .single();
            setChonkoGems(captainData?.chonko_gems || 0);

        } catch (error) {
            // Tratamento silencioso
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleCardPress = (routeItem, title) => {
        if (routeItem === 'MissionManager') {
            navigation.navigate('MissionManager', { familyId: profile.family_id });
        } else if (routeItem === 'RewardShop') {
            navigation.navigate('RewardShop', { familyId: profile.family_id, profile: profile });
        } else {
            Alert.alert("Em Breve", `A tela "${title}" está em desenvolvimento.`);
        }
    };

    const handleDevSwitchProfile = async () => {
        try {
            navigation.replace('RoleSelection');
        } catch (e) {
            await supabase.auth.signOut();
        }
    };

    // FUNÇÃO PARA PEGAR MÚLTIPLAS IMAGENS (Até 3) COM BASE64
    const handlePickImage = async () => {
        const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (permissionResult.granted === false) {
            Alert.alert("Permissão necessária", "Precisamos de acesso à sua galeria para anexar fotos.");
            return;
        }

        const limit = 3 - feedbackImages.length;
        if (limit <= 0) return;

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsMultipleSelection: true,
            selectionLimit: limit,
            quality: 0.5,
            base64: true, // EXTREMAMENTE IMPORTANTE PARA O SUPABASE
        });

        if (!result.canceled) {
            const newAssets = result.assets.map(asset => ({
                uri: asset.uri,
                base64: asset.base64
            }));
            setFeedbackImages(prev => [...prev, ...newAssets]);
        }
    };

    const handleRemoveImage = (indexToRemove) => {
        setFeedbackImages(prev => prev.filter((_, index) => index !== indexToRemove));
    };

    // INTEGRAÇÃO COM SUPABASE USANDO BASE64-ARRAYBUFFER (Padrão Ouro para React Native)
    const handleSendFeedback = async () => {
        if (!feedbackMessage.trim()) {
            Alert.alert("Ops!", "Por favor, escreva uma mensagem antes de enviar.");
            return;
        }

        setSendingFeedback(true);
        let uploadedUrls = [];

        try {
            // 1. Faz upload das imagens base64 decodificadas
            if (feedbackImages.length > 0) {
                for (let i = 0; i < feedbackImages.length; i++) {
                    const imageAsset = feedbackImages[i];
                    const fileExt = imageAsset.uri.split('.').pop() || 'jpeg';
                    const fileName = `${profile.id}_${Date.now()}_${i}.${fileExt}`;
                    const filePath = `prints/${fileName}`;

                    // Sobe o arquivo pro Bucket decodificando o base64
                    const { error: uploadError } = await supabase.storage
                        .from('feedbacks')
                        .upload(filePath, decode(imageAsset.base64), {
                            contentType: `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`
                        });

                    if (uploadError) {
                        throw new Error(`Falha ao subir a imagem ${i + 1}`);
                    }

                    // Pega a URL pública
                    const { data: publicUrlData } = supabase.storage
                        .from('feedbacks')
                        .getPublicUrl(filePath);

                    uploadedUrls.push(publicUrlData.publicUrl);
                }
            }

            // 2. Salva o registro na Tabela de Feedbacks
            const payload = {
                profile_id: profile.id,
                family_id: profile.family_id,
                subject: feedbackSubject,
                message: feedbackMessage.trim(),
                status: 'new',
                image_url: uploadedUrls.length > 0 ? uploadedUrls.join(',') : null
            };

            const { error: dbError } = await supabase.from('app_feedbacks').insert([payload]);

            if (dbError) throw dbError;

            // Sucesso Total! Limpa tudo
            setShowFeedbackModal(false);
            setFeedbackMessage('');
            setFeedbackImages([]);
            Alert.alert(
                "Feedback Enviado! 🚀",
                "Muito obrigado por ajudar a construir o Chonko. Sua opinião é fundamental para nós!"
            );
        } catch (error) {
            Alert.alert("Erro", "Não foi possível enviar o feedback agora. " + error.message);
        } finally {
            setSendingFeedback(false);
        }
    };

    const handleCloseModal = () => {
        setShowFeedbackModal(false);
        setFeedbackMessage('');
        setFeedbackImages([]);
    };

    if (loading && !refreshing) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#F59E0B" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

            <View style={styles.topOrangeArea}>
                <View style={styles.headerRow}>
                    <View style={styles.headerLeft}>
                        <Text style={styles.qgLabel}>PAINEL DE ADMIN</Text>
                        <Text style={styles.familyTitle} numberOfLines={1}>
                            {family?.name || 'Seu Grupo'}
                        </Text>
                    </View>

                    <View style={styles.headerRight}>
                        <TouchableOpacity onPress={handleDevSwitchProfile} style={styles.iconBtn}>
                            <MaterialCommunityIcons name="face-man-profile" size={24} color="#FFF" />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.iconBtn}
                            onPress={() => navigation.navigate('FamilySettings', { familyId: profile.family_id, currentProfileId: profile.id })}
                        >
                            <MaterialCommunityIcons name="cog-outline" size={24} color="#FFF" />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.iconBtn}
                            onPress={() => {
                                if (pendingAttempts > 0) {
                                    navigation.navigate('TaskApprovals', { familyId: profile.family_id });
                                } else {
                                    Alert.alert("Tudo limpo!", "Não há tarefas precisando de aprovação.");
                                }
                            }}
                        >
                            <MaterialCommunityIcons name={pendingAttempts > 0 ? "bell-ring" : "bell"} size={24} color="#FFF" />
                            {pendingAttempts > 0 && (
                                <View style={styles.badgeTop}>
                                    <Text style={styles.badgeTextTop}>{pendingAttempts}</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.listContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchDashboardData(); }} tintColor="#F59E0B"/>
                }
            >
                <View style={styles.statsRow}>
                    <View style={styles.statBox}>
                        <MaterialCommunityIcons name="cards-playing-diamond" size={24} color="#EC4899" />
                        <Text style={styles.statNumber}>{chonkoGems}</Text>
                        <Text style={styles.statLabel}>CHONKO GEMS</Text>
                    </View>
                    <View style={styles.statBox}>
                        <MaterialCommunityIcons name="format-list-checks" size={24} color="#3B82F6" />
                        <Text style={styles.statNumber}>{activeMissionsCount}</Text>
                        <Text style={styles.statLabel}>ATIVAS</Text>
                    </View>
                    <TouchableOpacity
                        style={styles.statBox}
                        activeOpacity={0.8}
                        onPress={() => {
                            if (pendingAttempts > 0) {
                                navigation.navigate('TaskApprovals', { familyId: profile.family_id });
                            } else {
                                Alert.alert("Tudo limpo!", "Não há tarefas precisando de aprovação.");
                            }
                        }}
                    >
                        <MaterialCommunityIcons name="bell-ring" size={24} color={pendingAttempts > 0 ? "#EF4444" : "#F59E0B"} />
                        <Text style={[styles.statNumber, pendingAttempts > 0 && { color: '#EF4444' }]}>{pendingAttempts}</Text>
                        <Text style={[styles.statLabel, pendingAttempts > 0 && { color: '#EF4444' }]}>PENDÊNCIAS</Text>
                    </TouchableOpacity>
                </View>

                {/* BANNER BETA */}
                <View style={styles.betaBanner}>
                    <View style={styles.betaBannerIconBg}>
                        <MaterialCommunityIcons name="flask-outline" size={24} color="#F59E0B" />
                    </View>
                    <View style={{flex: 1}}>
                        <Text style={styles.betaBannerTitle}>Versão Beta</Text>
                        <Text style={styles.betaBannerText}>Você está usando uma versão de testes. Encontrou um bug ou tem uma ideia? Conta pra gente no botão flutuante!</Text>
                    </View>
                </View>

                <Text style={styles.sectionTitle}>CENTRAL DE COMANDO</Text>

                <View style={styles.menuGrid}>
                    <MenuButton
                        title="MISSÕES" subtitle="Gerenciar Tarefas"
                        icon="clipboard-list-outline"
                        color="#10B981" shadowColor="#059669"
                        onPress={() => handleCardPress('MissionManager', 'MISSÕES')}
                    />
                    <MenuButton
                        title="LOJA" subtitle="Recompensas"
                        icon="storefront-outline"
                        color="#8B5CF6" shadowColor="#6D28D9"
                        onPress={() => handleCardPress('RewardShop', 'LOJA')}
                    />
                    <MenuButton
                        title="PASSE" subtitle="Temporada 1"
                        icon="ticket-percent-outline"
                        color="#F59E0B" shadowColor="#D97706"
                        onPress={() => handleCardPress('SeasonPass', 'PASSE')}
                        isDisabled={true}
                    />
                    <MenuButton
                        title="DICAS" subtitle="Tutoriais"
                        icon="school-outline"
                        color="#3B82F6" shadowColor="#1D4ED8"
                        onPress={() => handleCardPress('Tutorials', 'DICAS')}
                    />
                    <MenuButton
                        title="GEMS" subtitle="Comprar"
                        icon="cards-playing-diamond"
                        color="#EC4899" shadowColor="#BE185D"
                        onPress={() => handleCardPress('PremiumStore', 'GEMS')}
                        isDisabled={true}
                    />
                </View>
            </ScrollView>

            <View style={styles.dockContainer}>
                <View style={styles.dockBar}>
                    <TouchableOpacity style={styles.dockBtn}>
                        <MaterialCommunityIcons name="home" size={28} color="#D97706" />
                        <Text style={[styles.dockLabel, {color: '#D97706'}]}>Início</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.dockBtn} onPress={() => navigation.navigate('FamilySettings', { familyId: profile.family_id, currentProfileId: profile.id })}>
                        <MaterialCommunityIcons name="account-group-outline" size={28} color="#64748B" />
                        <Text style={styles.dockLabel}>Equipe</Text>
                    </TouchableOpacity>

                    <View style={{ width: 60 }} />

                    <TouchableOpacity style={styles.dockBtn} onPress={() => navigation.navigate('Reports', { familyId: profile.family_id })}>
                        <MaterialCommunityIcons name="chart-bar" size={28} color="#64748B" />
                        <Text style={styles.dockLabel}>Relatórios</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.dockBtn} onPress={() => navigation.navigate('Ranking', { familyId: profile.family_id })}>
                        <MaterialCommunityIcons name="podium" size={28} color="#64748B" />
                        <Text style={styles.dockLabel}>Ranking</Text>
                    </TouchableOpacity>
                </View>

                <TouchableOpacity
                    style={styles.centerDockBtn}
                    activeOpacity={0.9}
                    onPress={() => navigation.navigate('QuickMissions', { familyId: profile.family_id })}
                >
                    <View style={styles.centerDockInner}>
                        <MaterialCommunityIcons name="flash" size={32} color="#FFF" />
                    </View>
                </TouchableOpacity>
            </View>

            {/* BOTÃO FLUTUANTE DE FEEDBACK */}
            <TouchableOpacity
                style={styles.fabFeedback}
                activeOpacity={0.9}
                onPress={() => setShowFeedbackModal(true)}
            >
                <MaterialCommunityIcons name="message-alert" size={24} color="#FFF" />
            </TouchableOpacity>

            {/* MODAL DE FEEDBACK BETA */}
            <Modal visible={showFeedbackModal} transparent animationType="slide" onRequestClose={handleCloseModal}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <MaterialCommunityIcons name="flask" size={28} color="#F59E0B" />
                            <Text style={styles.modalTitle}>Enviar Feedback</Text>
                        </View>

                        <Text style={styles.modalSub}>Como estamos na versão Beta, sua opinião vale ouro. Encontrou um erro ou tem uma sugestão genial?</Text>

                        <Text style={styles.inputLabel}>ASSUNTO</Text>
                        <View style={styles.subjectRow}>
                            <TouchableOpacity
                                style={[styles.subjectBtn, feedbackSubject === 'bug' && styles.subjectBtnActive]}
                                onPress={() => setFeedbackSubject('bug')}
                            >
                                <MaterialCommunityIcons name="bug" size={18} color={feedbackSubject === 'bug' ? '#FFF' : '#EF4444'} />
                                <Text style={[styles.subjectText, feedbackSubject === 'bug' && {color: '#FFF'}]}>Erro</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.subjectBtn, feedbackSubject === 'idea' && styles.subjectBtnActive]}
                                onPress={() => setFeedbackSubject('idea')}
                            >
                                <MaterialCommunityIcons name="lightbulb-on" size={18} color={feedbackSubject === 'idea' ? '#FFF' : '#F59E0B'} />
                                <Text style={[styles.subjectText, feedbackSubject === 'idea' && {color: '#FFF'}]}>Ideia</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.subjectBtn, feedbackSubject === 'other' && styles.subjectBtnActive]}
                                onPress={() => setFeedbackSubject('other')}
                            >
                                <MaterialCommunityIcons name="chat-question" size={18} color={feedbackSubject === 'other' ? '#FFF' : '#3B82F6'} />
                                <Text style={[styles.subjectText, feedbackSubject === 'other' && {color: '#FFF'}]}>Dúvida</Text>
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.inputLabel}>MENSAGEM</Text>
                        <TextInput
                            style={styles.textInputArea}
                            placeholder="Descreva aqui com o máximo de detalhes..."
                            placeholderTextColor="#94A3B8"
                            multiline
                            textAlignVertical="top"
                            value={feedbackMessage}
                            onChangeText={setFeedbackMessage}
                            maxLength={500}
                        />

                        {/* LISTA DE FOTOS SELECIONADAS */}
                        <View style={styles.photosContainer}>
                            <View style={styles.photosHeader}>
                                <Text style={styles.inputLabel}>ANEXOS (OPCIONAL)</Text>
                                <Text style={styles.photoCounterText}>{feedbackImages.length}/3 fotos</Text>
                            </View>

                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photosScroll}>
                                {feedbackImages.map((asset, index) => (
                                    <View key={index} style={styles.imagePreviewContainer}>
                                        <Image source={{ uri: asset.uri }} style={styles.imagePreview} />
                                        <TouchableOpacity
                                            style={styles.removeImageBtn}
                                            activeOpacity={0.8}
                                            onPress={() => handleRemoveImage(index)}
                                        >
                                            <MaterialCommunityIcons name="close" size={14} color="#FFF" />
                                        </TouchableOpacity>
                                    </View>
                                ))}

                                {feedbackImages.length < 3 && (
                                    <TouchableOpacity style={styles.addMorePhotoBtn} activeOpacity={0.7} onPress={handlePickImage}>
                                        <MaterialCommunityIcons name="camera-plus" size={24} color="#94A3B8" />
                                        <Text style={styles.addMorePhotoText}>Adicionar</Text>
                                    </TouchableOpacity>
                                )}
                            </ScrollView>
                        </View>

                        <View style={styles.modalActions}>
                            <TouchableOpacity style={[styles.actionBtn, {backgroundColor: '#F1F5F9'}]} onPress={handleCloseModal}>
                                <Text style={[styles.actionBtnText, {color: '#64748B'}]}>CANCELAR</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.actionBtn, {backgroundColor: '#F59E0B'}]} onPress={handleSendFeedback} disabled={sendingFeedback}>
                                {sendingFeedback ? (
                                    <ActivityIndicator color="#FFF" size="small" />
                                ) : (
                                    <Text style={[styles.actionBtnText, {color: '#FFF'}]}>ENVIAR</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FDFCF8' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

    topOrangeArea: {
        paddingTop: 60,
        paddingBottom: 30,
        paddingHorizontal: 20,
        borderBottomLeftRadius: 35,
        borderBottomRightRadius: 35,
        backgroundColor: '#F59E0B',
        borderColor: '#D97706',
        zIndex: 10,
        borderWidth: 2,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%',
        marginBottom: 10
    },
    headerLeft: { flex: 1, justifyContent: 'center' },
    headerRight: { flexDirection: 'row', gap: 10, alignItems: 'center' },

    qgLabel: { fontFamily: FONTS.bold, fontSize: 12, color: '#FEF3C7', letterSpacing: 1, marginBottom: 2 },
    familyTitle: { fontFamily: FONTS.bold, fontSize: 24, color: '#FFF', letterSpacing: 1 },

    iconBtn: {
        width: 44, height: 44,
        borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.15)',
        justifyContent: 'center', alignItems: 'center',
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)'
    },
    badgeTop: {
        position: 'absolute', top: -4, right: -4,
        backgroundColor: '#EF4444',
        width: 20, height: 20, borderRadius: 10,
        justifyContent: 'center', alignItems: 'center',
        borderWidth: 1.5, borderColor: '#F59E0B'
    },
    badgeTextTop: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },

    listContent: { padding: 25, paddingBottom: 150 },

    statsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
    statBox: {
        flex: 1,
        backgroundColor: '#FFF',
        borderRadius: 20,
        padding: 15,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#E2E8F0',

    },
    statNumber: { fontFamily: FONTS.regular, fontSize: 18, color: '#1E293B', marginTop: 5 },
    statLabel: { fontFamily: FONTS.regular, fontSize: 10, color: '#64748B', textAlign: 'center', marginTop: 2 },

    // BANNER BETA
    betaBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFBEB',
        padding: 15,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#FDE68A',
        marginBottom: 30,
        gap: 15
    },
    betaBannerIconBg: {
        width: 44, height: 44, borderRadius: 22, backgroundColor: '#FEF3C7',
        justifyContent: 'center', alignItems: 'center'
    },
    betaBannerTitle: { fontFamily: FONTS.bold, fontSize: 14, color: '#D97706', marginBottom: 2 },
    betaBannerText: { fontFamily: FONTS.medium, fontSize: 11, color: '#B45309', lineHeight: 16 },

    sectionTitle: { fontFamily: FONTS.bold, fontSize: 14, color: '#94A3B8', letterSpacing: 1.5, marginBottom: 20 },

    menuGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
    menuBtnWrapper: { width: (width - 65) / 2, height: 120, marginBottom: 20, position: 'relative' },
    menuBtnShadow: { position: 'absolute', bottom: -5, width: '100%', height: '100%', borderRadius: 24 },
    menuBtnFront: {
        flex: 1,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 10,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    menuBtnTitle: { fontFamily: FONTS.bold, fontSize: 15, color: '#FFF', marginTop: 5, textAlign: 'center', letterSpacing: 1.2 },
    menuBtnSubtitle: { fontFamily: FONTS.regular, fontSize: 12, color: 'rgba(255,255,255,0.8)', textAlign: 'center' },

    // BADGE EM BREVE
    disabledBadge: {
        position: 'absolute',
        top: 10, right: -5,
        backgroundColor: '#EF4444',
        paddingHorizontal: 8, paddingVertical: 3,
        borderRadius: 8,
        transform: [{ rotate: '10deg' }],
        borderWidth: 1, borderColor: '#FFF',
        shadowColor: '#000', shadowOffset: {width:0, height:2}, shadowOpacity: 0.2, shadowRadius: 2, elevation: 3
    },
    disabledBadgeText: { fontFamily: FONTS.bold, color: '#FFF', fontSize: 8 },

    dockContainer: {
        position: 'absolute',
        bottom: 45,
        left: 20, right: 20,
        height: 80,
        justifyContent: 'flex-end'
    },

    dockBar: {
        marginBottom:5,
        flexDirection: 'row',
        backgroundColor: '#FFF',
        height: 70,
        borderRadius: 35,
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 15,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.1)',
        borderBottomWidth: 5
    },

    dockBtn: { alignItems: 'center', justifyContent: 'center', width: 60 },
    dockLabel: { fontSize: 10, fontFamily: FONTS.bold, color: '#64748B', marginTop: 3 },

    centerDockBtn: {
        position: 'absolute', bottom: 25, alignSelf: 'center',
        width: 76, height: 76, borderRadius: 38,
        backgroundColor: '#FEF3C7',
        justifyContent: 'center', alignItems: 'center',
        elevation: 10
    },
    centerDockInner: {
        width: 64, height: 64, borderRadius: 32,
        backgroundColor: '#F59E0B',
        justifyContent: 'center', alignItems: 'center',
        borderWidth: 2, borderColor: '#FFF'
    },

    fabFeedback: {
        position: 'absolute',
        bottom: 140,
        right: 20,
        width: 50, height: 50, borderRadius: 25,
        backgroundColor: '#3B82F6',
        justifyContent: 'center', alignItems: 'center',
        borderWidth: 2, borderColor: '#FFF',
        shadowColor: '#1D4ED8', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 5, elevation: 6
    },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    modalContent: {
        backgroundColor: '#FFF',
        borderTopLeftRadius: 30, borderTopRightRadius: 30,
        padding: 25,
        maxHeight: Dimensions.get('window').height * 0.90
    },
    modalHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
    modalTitle: { fontFamily: FONTS.bold, fontSize: 20, color: '#1E293B' },
    modalSub: { fontFamily: FONTS.medium, fontSize: 13, color: '#64748B', lineHeight: 18, marginBottom: 25 },

    inputLabel: { fontFamily: FONTS.bold, fontSize: 11, color: '#94A3B8', marginBottom: 8, letterSpacing: 1 },

    subjectRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
    subjectBtn: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
        paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#F8FAFC'
    },
    subjectBtnActive: { backgroundColor: '#334155', borderColor: '#334155' },
    subjectText: { fontFamily: FONTS.bold, fontSize: 12, color: '#64748B' },

    textInputArea: {
        backgroundColor: '#F8FAFC',
        borderWidth: 1, borderColor: '#E2E8F0',
        borderRadius: 16,
        padding: 15,
        height: 120,
        fontFamily: FONTS.medium, color: '#1E293B',
        marginBottom: 15
    },

    // SISTEMA DE MÚLTIPLAS FOTOS
    photosContainer: { marginBottom: 20 },
    photosHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    photoCounterText: { fontFamily: FONTS.bold, fontSize: 10, color: '#94A3B8' },
    photosScroll: { gap: 12, paddingVertical: 5 },

    imagePreviewContainer: {
        position: 'relative',
        width: 80, height: 80,
    },
    imagePreview: {
        width: '100%', height: '100%',
        borderRadius: 14,
        borderWidth: 1, borderColor: '#E2E8F0'
    },
    removeImageBtn: {
        position: 'absolute',
        top: -8, right: -8,
        backgroundColor: '#EF4444',
        width: 24, height: 24, borderRadius: 12,
        justifyContent: 'center', alignItems: 'center',
        borderWidth: 2, borderColor: '#FFF', elevation: 3,
    },

    addMorePhotoBtn: {
        width: 80, height: 80,
        borderRadius: 14,
        backgroundColor: '#F8FAFC',
        borderWidth: 2, borderColor: '#E2E8F0', borderStyle: 'dashed',
        justifyContent: 'center', alignItems: 'center'
    },
    addMorePhotoText: { fontFamily: FONTS.bold, fontSize: 10, color: '#94A3B8', marginTop: 4 },

    modalActions: { flexDirection: 'row', gap: 15, paddingBottom: Platform.OS === 'ios' ? 20 : 0 },
    actionBtn: { flex: 1, paddingVertical: 16, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    actionBtnText: { fontFamily: FONTS.bold, fontSize: 14, letterSpacing: 1 }
});