import { DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { COLORS } from '../styles/theme';

// --- TELAS DE AUTENTICAÇÃO ---
import JoinFamilyScreen from '../screens/auth/JoinFamilyScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterCaptainScreen from '../screens/auth/RegisterCaptainScreen';
import WelcomeScreen from '../screens/auth/WelcomeScreen';

// --- TELAS INTERNAS GERAIS ---
import CaptainHomeScreen from '../screens/CaptainHomeScreen';
import MissionDetailScreen from '../screens/recruit/MissionDetailScreen';
import RecruitHomeScreen from '../screens/recruit/RecruitHomeScreen';
import RoleSelectionScreen from '../screens/RoleSelectionScreen';

// --- TELAS DO CAPITÃO (ADMIN) ---
import CreateMissionScreen from '../screens/captain/CreateMissionScreen';
import FamilySettingsScreen from '../screens/captain/FamilySettingsScreen';
import MemberRequestsScreen from '../screens/captain/MemberRequestsScreen';
import MissionManagerScreen from '../screens/captain/MissionManagerScreen';
import QuickMissionsScreen from '../screens/captain/QuickMissionsScreen';
import TaskApprovalsScreen from '../screens/captain/TaskApprovalsScreen'; // Aprovação de Missões

// --- TELAS DA LOJA ---
import RewardShopScreen from '../screens/captain/RewardShopScreen';

const Stack = createNativeStackNavigator();

// 1. TEMA PERSONALIZADO
const ChonkoTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: COLORS.background, 
  },
};

export default function AppNavigator() {
  const { session, loading, profile } = useAuth();

  // 2. LOADING STATE
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer theme={ChonkoTheme}>
      <Stack.Navigator 
        screenOptions={{ 
          headerShown: false,
          contentStyle: { backgroundColor: COLORS.background },
          animation: 'slide_from_right' 
        }}
      >
        
        {session ? (
          // --- ÁREA LOGADA ---
          <Stack.Group>
             {/* LÓGICA DE ROTAS BASEADA NO PERFIL */}
             {profile?.role === 'recruit' ? (
                // Rota única para Recruta
                <Stack.Screen 
                    name="RecruitHome" 
                    component={RecruitHomeScreen} 
                    initialParams={{ profile: profile }} 
                />
             ) : (
                // Rotas para Capitão ou quem ainda não tem role definida
                <Stack.Group>
                    <Stack.Screen name="RoleSelection" component={RoleSelectionScreen} />
                    <Stack.Screen name="CaptainHome" component={CaptainHomeScreen} />
                    <Stack.Screen name="RecruitHome" component={RecruitHomeScreen} />
                </Stack.Group>
             )}

            {/* --- TELAS COMUNS / COMPARTILHADAS --- */}
            <Stack.Screen name="MissionDetail" component={MissionDetailScreen} />
            
            {/* --- LOJA DE PRÊMIOS --- */}
            <Stack.Screen name="RewardShop" component={RewardShopScreen} />
            
            {/* --- TELAS EXCLUSIVAS DO CAPITÃO --- */}
            <Stack.Screen name="MissionManager" component={MissionManagerScreen} />
            <Stack.Screen name="MemberRequests" component={MemberRequestsScreen} /> 
            <Stack.Screen name="CreateMission" component={CreateMissionScreen} />
            <Stack.Screen name="QuickMissions" component={QuickMissionsScreen} />
            <Stack.Screen name="FamilySettings" component={FamilySettingsScreen} />
            
            {/* Aprovação de Tarefas (Missões) */}
            <Stack.Screen name="TaskApprovals" component={TaskApprovalsScreen} />
            
          </Stack.Group>
          
        ) : (
          // --- ÁREA DE GUEST (NÃO LOGADO) ---
          <Stack.Group>
            <Stack.Screen name="Welcome" component={WelcomeScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="RegisterCaptain" component={RegisterCaptainScreen} />
            <Stack.Screen name="JoinFamily" component={JoinFamilyScreen} />
          </Stack.Group>
        )}
        
      </Stack.Navigator>
    </NavigationContainer>
  );
}