import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '../context/AuthContext';

// Importação das Telas de Autenticação
import JoinFamilyScreen from '../screens/auth/JoinFamilyScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterCaptainScreen from '../screens/auth/RegisterCaptainScreen';
import WelcomeScreen from '../screens/auth/WelcomeScreen';

// Importação das Telas Internas (Logadas)
import RoleSelectionScreen from '../screens/RoleSelectionScreen';

// Telas do Capitão
import CaptainHomeScreen from '../screens/CaptainHomeScreen';
import CreateTaskScreen from '../screens/captain/CreateTaskScreen';
import MemberRequestsScreen from '../screens/captain/MemberRequestsScreen';
import TaskApprovalsScreen from '../screens/captain/TaskApprovalsScreen';

// Telas do Recruta (NOVO: Navegador de Abas + Câmera)
import RecruitCameraScreen from '../screens/recruit/RecruitCameraScreen';
import RecruitNavigator from './RecruitNavigator';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#4c1d95" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        
        {session ? (
          // --- TELAS PARA USUÁRIOS LOGADOS ---
          <>
            {/* 1. Seleção de Perfil (Quem é você?) */}
            <Stack.Screen name="RoleSelection" component={RoleSelectionScreen} />
            
            {/* 2. Área do Capitão */}
            <Stack.Screen name="CaptainHome" component={CaptainHomeScreen} />
            <Stack.Screen name="CreateTask" component={CreateTaskScreen} />
            <Stack.Screen name="MemberRequests" component={MemberRequestsScreen} /> 
            <Stack.Screen name="TaskApprovals" component={TaskApprovalsScreen} />
            
            {/* 3. Área do Recruta */}
            {/* Agora apontamos para o Navigator de Abas, não para uma tela solta */}
            <Stack.Screen name="RecruitHome" component={RecruitNavigator} />
            
            {/* A Câmera fica fora das abas para ocupar a tela toda */}
            <Stack.Screen 
                name="RecruitCamera" 
                component={RecruitCameraScreen} 
                options={{ animation: 'slide_from_bottom' }} // Efeito de subir a câmera
            />
          </>
        ) : (
          // --- TELAS PÚBLICAS (LOGIN/CADASTRO) ---
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