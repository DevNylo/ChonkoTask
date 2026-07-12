import { MaterialCommunityIcons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';

import { useIsFocused, useNavigation, useRoute } from '@react-navigation/native';
import { decode } from 'base64-arraybuffer';
import { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    Image,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { FONTS } from '../../styles/theme';

const { width } = Dimensions.get('window');

// CORES PASTEL & VIBRANTES - PADRÃO RPG
const DIFFICULTY_CONFIG = {
    'common':    { label: 'FÁCIL',    color: '#10B981', bg: '#ECFDF5', shadow: '#059669' }, // Verde
    'rare':      { label: 'MÉDIO',    color: '#3B82F6', bg: '#EFF6FF', shadow: '#2563EB' }, // Azul
    'epic':      { label: 'DIFÍCIL',  color: '#8B5CF6', bg: '#F5F3FF', shadow: '#6D28D9' }, // Roxo
    'legendary': { label: 'LENDÁRIO', color: '#F59E0B', bg: '#FFFBEB', shadow: '#D97706' }, // Dourado
    'custom':    { label: 'MANUAL',   color: '#0EA5E9', bg: '#F0F9FF', shadow: '#0284C7' }  // Azul Claro
};

export default function MissionDetailScreen() {
    const navigation = useNavigation();
    const route = useRoute();
    const isFocused = useIsFocused(); // <-- DETECTA SE A TELA TERMINOU DE ABRIR
    const { mission, profile } = route.params;

    const [permission, requestPermission] = useCameraPermissions();

    const cameraRef = useRef(null);
    const [photo, setPhoto] = useState(null);
    const [facing, setFacing] = useState('back');

    const [isCapturing, setIsCapturing] = useState(false);
    const [uploading, setUploading] = useState(false);

    // ESTADO DO ANTI-BUG DO EXPO CAMERA
    const [isCameraReadyToMount, setIsCameraReadyToMount] = useState(false);

    useEffect(() => {
        (async () => {
            if (permission && !permission.granted) await requestPermission();
        })();
    }, [permission]);

    // --- BLINDAGEM CONTRA O ERRO WEAKMAP ---
    // Só monta a câmera 300ms depois que a animação da tela terminar
    useEffect(() => {
        if (isFocused) {
            const timer = setTimeout(() => {
                setIsCameraReadyToMount(true);
            }, 300);
            return () => clearTimeout(timer);
        } else {
            // Desmonta a câmera se sair da tela para não gastar memória
            setIsCameraReadyToMount(false);
        }
    }, [isFocused]);

    const diffData = DIFFICULTY_CONFIG[mission.difficulty] || DIFFICULTY_CONFIG['custom'];
    const isCustom = mission.reward_type === 'custom';

    if (!permission) return <View style={[styles.loadingContainer, {backgroundColor: diffData.bg}]}><ActivityIndicator color={diffData.color} size="large"/></View>;

    if (!permission.granted) {
        return (
            <View style={[styles.container, { backgroundColor: diffData.bg }]}>
                <View style={styles.permContainer}>
                    <View style={[styles.permCard, { borderColor: diffData.color }]}>
                        <MaterialCommunityIcons name="camera-off" size={60} color={diffData.color} />
                        <Text style={[styles.permText, {color: diffData.color}]}>Precisamos da câmera para provar a missão!</Text>

                        <TouchableOpacity style={styles.btnPermissionWrapper} onPress={requestPermission} activeOpacity={0.8}>
                            <View style={[styles.btnPermissionShadow, { backgroundColor: diffData.shadow }]} />
                            <View style={[styles.btnPermissionFront, { backgroundColor: diffData.color }]}>
                                <Text style={styles.btnPermissionText}>PERMITIR CÂMERA</Text>
                            </View>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        );
    }

    const takePicture = async () => {
        if (cameraRef.current && !isCapturing) {
            setIsCapturing(true);
            try {
                const data = await cameraRef.current.takePictureAsync({
                    quality: 0.5,
                    skipProcessing: false,
                    exif: false,
                });
                setPhoto(data);
            } catch (e) {
                Alert.alert("Erro", "Não foi possível tirar a foto.");
            } finally {
                setIsCapturing(false);
            }
        }
    };

    const handleSubmitMission = async () => {
        if (!photo) return;
        setUploading(true);

        try {
            const manipResult = await ImageManipulator.manipulateAsync(
                photo.uri,
                [{ resize: { width: 800 } }],
                { compress: 0.5, format: ImageManipulator.SaveFormat.JPEG }
            );

            const base64 = await FileSystem.readAsStringAsync(manipResult.uri, { encoding: 'base64' });
            const arrayBuffer = decode(base64);

            const fileExt = 'jpg';
            const fileName = `${Date.now()}_${profile.id}.${fileExt}`;
            const filePath = `${profile.family_id}/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('mission-proofs')
                .upload(filePath, arrayBuffer, { contentType: 'image/jpeg', upsert: false });

            if (uploadError) throw uploadError;

            const { data: rpcData, error: rpcError } = await supabase.rpc('submit_mission_attempt', {
                p_mission_id: mission.id,
                p_profile_id: profile.id,
                p_family_id: profile.family_id,
                p_proof_url: filePath,
                p_earned_value: mission.reward || 0
            });

            if (rpcError) throw rpcError;

            Alert.alert("ENVIADO! 🚀", "Sua prova foi enviada para análise.", [
                { text: "OK", onPress: () => navigation.goBack() }
            ]);

        } catch (error) {
            Alert.alert("Erro no envio", "Verifique sua internet.\n" + (error.message || ""));
        } finally {
            setUploading(false);
        }
    };

    const toggleCameraType = () => {
        setFacing(current => (current === 'back' ? 'front' : 'back'));
    };

    return (
        <View style={[styles.container, { backgroundColor: diffData.bg }]}>

            <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backBtn, { borderColor: diffData.color }]}>
                    <MaterialCommunityIcons name="close" size={24} color={diffData.color} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: diffData.color }]}>PROVAR MISSÃO</Text>
                <View style={{width: 40}} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                <View style={[styles.missionHeader, { borderColor: diffData.color }]}>
                    <View style={[styles.iconBox, { backgroundColor: diffData.color }]}>
                        <MaterialCommunityIcons name={mission.icon || "star"} size={40} color="#FFF" />
                    </View>

                    <Text style={[styles.missionTitle, { color: diffData.shadow }]}>{mission.title}</Text>

                    <View style={styles.badgeRow}>
                        {mission.use_critical && (
                            <View style={[styles.treasureBadge, mission.critical_type === 'bonus_coins' ? styles.treasureGold : styles.treasurePurple]}>
                                <MaterialCommunityIcons name={mission.critical_type === 'bonus_coins' ? "arrow-up-bold-circle" : "gift"} size={14} color="#FFF" style={{marginRight:4}} />
                                <Text style={styles.treasureBadgeText}>
                                    {mission.critical_type === 'bonus_coins' ? `CHANCE +50%` : `SURPRESA`}
                                </Text>
                            </View>
                        )}

                        <View style={[styles.rewardBadge, { borderColor: isCustom ? '#D8B4FE' : '#F59E0B' }]}>
                            <Text style={[styles.rewardText, {color: isCustom ? '#9333EA' : '#B45309'}]}>
                                {isCustom ? mission.custom_reward : `+${mission.reward} Moedas`}
                            </Text>
                        </View>
                    </View>

                    {mission.description && (
                        <Text style={styles.description}>{mission.description}</Text>
                    )}
                </View>

                {/* CÂMERA BLINDADA COM DELAY DE MONTAGEM */}
                <View style={[styles.cameraSection, { borderColor: diffData.color }]}>

                    {!isCameraReadyToMount && !photo && (
                        <View style={styles.cameraLoading}>
                            <ActivityIndicator size="large" color="#FFF" />
                            <Text style={styles.cameraLoadingText}>Preparando a lente...</Text>
                        </View>
                    )}

                    {isCameraReadyToMount && !photo && (
                        <>
                            <CameraView
                                ref={cameraRef}
                                style={styles.cameraFill}
                                facing={facing}
                            />
                            <View style={styles.cameraGuide}>
                                <View style={styles.cornerTL} />
                                <View style={styles.cornerTR} />
                                <View style={styles.cornerBL} />
                                <View style={styles.cornerBR} />
                            </View>

                            <TouchableOpacity style={styles.flipBtn} onPress={toggleCameraType} activeOpacity={0.8}>
                                <MaterialCommunityIcons name="camera-flip" size={24} color="#fff" />
                            </TouchableOpacity>
                        </>
                    )}

                    {/* SE TIVER FOTO, O PREVIEW COBRE TUDO */}
                    {photo && (
                        <View style={styles.previewContainer}>
                            <Image source={{ uri: photo.uri }} style={styles.previewImage} />
                            <TouchableOpacity style={styles.retakeBtn} onPress={() => setPhoto(null)} activeOpacity={0.8}>
                                <MaterialCommunityIcons name="camera-retake" size={20} color="#fff" />
                                <Text style={styles.retakeText}>TIRAR OUTRA</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                </View>

                <Text style={[styles.instructionText, { color: diffData.shadow }]}>
                    {photo ? "Ficou boa? Se sim, é só enviar!" : "Tire uma foto para provar que fez."}
                </Text>

            </ScrollView>

            {/* FOOTER */}
            <View style={styles.footer}>
                {photo ? (
                    <TouchableOpacity style={styles.submitBtnWrapper} onPress={handleSubmitMission} disabled={uploading} activeOpacity={0.9}>
                        <View style={[styles.submitBtnShadow, { backgroundColor: diffData.shadow }]} />
                        <View style={[styles.submitBtnFront, { backgroundColor: diffData.color }]}>
                            {uploading ? (
                                <ActivityIndicator color="#fff" size="large"/>
                            ) : (
                                <>
                                    <MaterialCommunityIcons name="rocket-launch" size={26} color="#fff" style={{marginRight: 10}}/>
                                    <Text style={styles.submitText}>ENVIAR PROVA</Text>
                                </>
                            )}
                        </View>
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity style={styles.captureBtnWrapper} onPress={takePicture} disabled={isCapturing || !isCameraReadyToMount} activeOpacity={0.8}>
                        <View style={[styles.captureBtnShadow, { backgroundColor: diffData.shadow }]} />
                        <View style={[styles.captureBtnFront, { borderColor: diffData.color }]}>
                            {isCapturing ? (
                                <ActivityIndicator color={diffData.color} size="large" />
                            ) : (
                                <MaterialCommunityIcons name="camera" size={38} color={diffData.color} />
                            )}
                        </View>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

    permContainer: { flex: 1, justifyContent: 'center', padding: 20 },
    permCard: { borderRadius: 24, padding: 30, alignItems: 'center', backgroundColor: '#FFF', borderWidth: 2 },
    permText: { textAlign: 'center', marginVertical: 20, fontFamily: FONTS.bold, fontSize: 18 },

    btnPermissionWrapper: { width: '100%', height: 56, marginTop: 10 },
    btnPermissionShadow: { position: 'absolute', top: 5, left: 0, width: '100%', height: '100%', borderRadius: 16 },
    btnPermissionFront: { width: '100%', height: '100%', borderRadius: 16, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
    btnPermissionText: { color: '#fff', fontFamily: FONTS.bold, fontSize: 16, letterSpacing: 1 },

    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 10 },
    headerTitle: { fontFamily: FONTS.bold, fontSize: 18, letterSpacing: 1 },
    backBtn: { padding: 8, borderRadius: 14, backgroundColor: '#FFF', borderWidth: 2 },

    scrollContent: { padding: 20, paddingBottom: 140, alignItems: 'center' },

    missionHeader: { alignItems: 'center', marginBottom: 25, width: '100%', backgroundColor: '#FFF', borderRadius: 24, padding: 20, borderWidth: 2 },
    iconBox: { width: 70, height: 70, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 15, borderWidth: 2, borderColor: 'rgba(255,255,255,0.5)' },
    missionTitle: { fontFamily: FONTS.bold, fontSize: 24, textAlign: 'center', marginBottom: 15 },

    badgeRow: { flexDirection: 'row', gap: 10, marginBottom: 15, flexWrap: 'wrap', justifyContent: 'center' },
    treasureBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
    treasureGold: { backgroundColor: '#F59E0B' },
    treasurePurple: { backgroundColor: '#8B5CF6' },
    treasureBadgeText: { color: '#FFF', fontSize: 12, fontFamily: FONTS.bold },

    rewardBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 2, backgroundColor: '#FFF' },
    rewardText: { fontFamily: FONTS.bold, fontSize: 12 },

    description: { fontFamily: FONTS.medium, fontSize: 15, color: '#64748B', textAlign: 'center', lineHeight: 22 },

    cameraSection: { width: '100%', height: 400, borderRadius: 32, overflow: 'hidden', backgroundColor: '#1E293B', borderWidth: 4, elevation: 10, position: 'relative' },
    cameraFill: { flex: 1, width: '100%', height: '100%' },

    cameraLoading: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1E293B' },
    cameraLoadingText: { color: '#FFF', fontFamily: FONTS.bold, marginTop: 10, opacity: 0.8 },

    cameraGuide: { ...StyleSheet.absoluteFillObject, margin: 20, zIndex: 5 },

    cornerTL: { position: 'absolute', top: 0, left: 0, width: 40, height: 40, borderTopWidth: 6, borderLeftWidth: 6, borderColor: '#FFF', borderTopLeftRadius: 20 },
    cornerTR: { position: 'absolute', top: 0, right: 0, width: 40, height: 40, borderTopWidth: 6, borderRightWidth: 6, borderColor: '#FFF', borderTopRightRadius: 20 },
    cornerBL: { position: 'absolute', bottom: 0, left: 0, width: 40, height: 40, borderBottomWidth: 6, borderLeftWidth: 6, borderColor: '#FFF', borderBottomLeftRadius: 20 },
    cornerBR: { position: 'absolute', bottom: 0, right: 0, width: 40, height: 40, borderBottomWidth: 6, borderRightWidth: 6, borderColor: '#FFF', borderBottomRightRadius: 20 },

    flipBtn: { position: 'absolute', top: 20, right: 20, padding: 12, backgroundColor: '#0F172A', borderRadius: 16, borderWidth: 2, borderColor: '#334155', zIndex: 10 },

    previewContainer: { ...StyleSheet.absoluteFillObject, backgroundColor: '#000', zIndex: 20 },
    previewImage: { flex: 1, width: '100%', height: '100%', resizeMode: 'cover' },
    retakeBtn: { position: 'absolute', top: 20, left: 20, flexDirection: 'row', alignItems: 'center', backgroundColor: '#0F172A', paddingVertical: 10, paddingHorizontal: 15, borderRadius: 16, borderWidth: 2, borderColor: '#334155', gap: 5 },
    retakeText: { color: '#fff', fontFamily: FONTS.bold, fontSize: 13 },

    instructionText: { textAlign: 'center', marginTop: 20, fontFamily: FONTS.bold, fontSize: 18 },

    footer: { position: 'absolute', bottom: 0, width: '100%', padding: 20, paddingBottom: 40, alignItems: 'center', justifyContent: 'center' },

    captureBtnWrapper: { width: 86, height: 86, position: 'relative' },
    captureBtnShadow: { position: 'absolute', top: 4, left: 0, width: '100%', height: '100%', borderRadius: 50 },
    captureBtnFront: { width: '100%', height: '100%', borderRadius: 43, backgroundColor: '#FFF', borderWidth: 4, justifyContent: 'center', alignItems: 'center' },

    submitBtnWrapper: { width: '100%', height: 65, position: 'relative' },
    submitBtnShadow: { position: 'absolute', top: 6, left: 0, width: '100%', height: '100%', borderRadius: 20 },
    submitBtnFront: { width: '100%', height: '100%', borderRadius: 20, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.2)' },
    submitText: { fontFamily: FONTS.bold, fontSize: 18, color: '#fff', letterSpacing: 1 },
});