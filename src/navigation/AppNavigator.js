import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

// --- COMPONENTES VISUAIS ---
import SplashScreen from '../screens/SplashScreen';

// --- TELAS DE AUTENTICAÇÃO ---
import JoinFamilyScreen from '../screens/auth/JoinFamilyScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterCaptainScreen from '../screens/auth/RegisterCaptainScreen';
import WelcomeScreen from '../screens/auth/WelcomeScreen';

// --- TELAS INTERNAS ---
import CaptainHomeScreen from '../screens/CaptainHomeScreen';
import RoleSelectionScreen from '../screens/RoleSelectionScreen';

// --- TELAS DO CAPITÃO (ADMIN) ---
import CreateMissionScreen from '../screens/captain/CreateMissionScreen';
import MemberRequestsScreen from '../screens/captain/MemberRequestsScreen';
import MissionManagerScreen from '../screens/captain/MissionManagerScreen';
import QuickMissionsScreen from '../screens/captain/QuickMissionsScreen';
import TaskApprovalsScreen from '../screens/captain/TaskApprovalsScreen'; // <--- ADICIONADO

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const { session, loading } = useAuth();
  const [isSplashFinished, setIsSplashFinished] = useState(false);
  const showSplash = loading || !isSplashFinished;

  if (showSplash) {
    return <SplashScreen onFinish={() => setIsSplashFinished(true)} />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        
        {session ? (
          // --- FLUXO LOGADO (PROTEGIDO) ---
          <>
            <Stack.Screen name="RoleSelection" component={RoleSelectionScreen} />
            
            {/* Fluxo Capitão */}
            <Stack.Screen name="CaptainHome" component={CaptainHomeScreen} />
            
            {/* Telas de Gestão do Capitão */}
            <Stack.Screen name="MissionManager" component={MissionManagerScreen} />
            <Stack.Screen name="MemberRequests" component={MemberRequestsScreen} /> 
            <Stack.Screen name="CreateMission" component={CreateMissionScreen} />
            <Stack.Screen name="QuickMissions" component={QuickMissionsScreen} />
            
            
          </>
          
        ) : (
          // --- FLUXO PÚBLICO (AUTH) ---
          <>
            <Stack.Screen name="Welcome" component={WelcomeScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="RegisterCaptain" component={RegisterCaptainScreen} />
            <Stack.Screen name="JoinFamily" component={JoinFamilyScreen} />
          </>
        )}
        
      </Stack.Navigator>
    </NavigationContainer>
  );
}