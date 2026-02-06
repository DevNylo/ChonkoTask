import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

// --- COMPONENTES VISUAIS ---
// Certifique-se de ter criado o arquivo SplashScreen.js conforme discutimos
import SplashScreen from '../screens/SplashScreen';

// --- TELAS DE AUTENTICAÇÃO ---
import JoinFamilyScreen from '../screens/auth/JoinFamilyScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterCaptainScreen from '../screens/auth/RegisterCaptainScreen';
import WelcomeScreen from '../screens/auth/WelcomeScreen';

// --- TELAS INTERNAS ---
import CaptainHomeScreen from '../screens/CaptainHomeScreen';
import RoleSelectionScreen from '../screens/RoleSelectionScreen';
import CreateTaskScreen from '../screens/captain/CreateTaskScreen';
import MemberRequestsScreen from '../screens/captain/MemberRequestsScreen';
import TaskApprovalsScreen from '../screens/captain/TaskApprovalsScreen';
import RecruitCameraScreen from '../screens/recruit/RecruitCameraScreen';
import RecruitNavigator from './RecruitNavigator';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const { session, loading } = useAuth();
  
  // Controla se a animação da Capivara já terminou
  const [isSplashFinished, setIsSplashFinished] = useState(false);

  // Lógica de Bloqueio:
  // Mostra Splash enquanto o Supabase carrega OU a animação não acabou.
  const showSplash = loading || !isSplashFinished;

  if (showSplash) {
    return (
      <SplashScreen 
        onFinish={() => setIsSplashFinished(true)} 
      />
    );
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
            <Stack.Screen name="CreateTask" component={CreateTaskScreen} />
            <Stack.Screen name="MemberRequests" component={MemberRequestsScreen} /> 
            <Stack.Screen name="TaskApprovals" component={TaskApprovalsScreen} />
            
            {/* Fluxo Recruta */}
            <Stack.Screen name="RecruitHome" component={RecruitNavigator} />
            <Stack.Screen 
                name="RecruitCamera" 
                component={RecruitCameraScreen} 
                options={{ animation: 'slide_from_bottom' }}
            />
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