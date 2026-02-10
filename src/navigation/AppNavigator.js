import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { View, ActivityIndicator } from 'react-native';
import { COLORS } from '../styles/theme';

// --- COMPONENTES VISUAIS ---
import SplashScreen from '../screens/SplashScreen';

// --- TELAS DE AUTENTICAÇÃO ---
import JoinFamilyScreen from '../screens/auth/JoinFamilyScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterCaptainScreen from '../screens/auth/RegisterCaptainScreen';
import WelcomeScreen from '../screens/auth/WelcomeScreen';

// --- TELAS INTERNAS GERAIS ---
import CaptainHomeScreen from '../screens/CaptainHomeScreen';
import RoleSelectionScreen from '../screens/RoleSelectionScreen';
import RecruitHomeScreen from '../screens/recruit/RecruitHomeScreen';
import MissionDetailScreen from '../screens/recruit/MissionDetailScreen';

// --- TELAS DO CAPITÃO (ADMIN) ---
import CreateMissionScreen from '../screens/captain/CreateMissionScreen';
import MemberRequestsScreen from '../screens/captain/MemberRequestsScreen';
import MissionManagerScreen from '../screens/captain/MissionManagerScreen';
import QuickMissionsScreen from '../screens/captain/QuickMissionsScreen';
import TaskApprovalsScreen from '../screens/captain/TaskApprovalsScreen';
import FamilySettingsScreen from '../screens/captain/FamilySettingsScreen';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const { session, loading, profile } = useAuth();
  const [isSplashFinished, setIsSplashFinished] = useState(false);
  
  const showSplash = loading || !isSplashFinished;

  if (showSplash) {
    return <SplashScreen onFinish={() => setIsSplashFinished(true)} />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        
        {session ? (
          <Stack.Group>
             {profile?.role === 'recruit' ? (
                <Stack.Screen 
                    name="RecruitHome" 
                    component={RecruitHomeScreen} 
                    initialParams={{ profile: profile }} 
                />
             ) : (
                <Stack.Group>
                    <Stack.Screen name="RoleSelection" component={RoleSelectionScreen} />
                    <Stack.Screen name="CaptainHome" component={CaptainHomeScreen} />
                    <Stack.Screen name="RecruitHome" component={RecruitHomeScreen} />
                </Stack.Group>
             )}

            <Stack.Screen name="MissionDetail" component={MissionDetailScreen} />
            <Stack.Screen name="MissionManager" component={MissionManagerScreen} />
            <Stack.Screen name="MemberRequests" component={MemberRequestsScreen} /> 
            <Stack.Screen name="CreateMission" component={CreateMissionScreen} />
            <Stack.Screen name="QuickMissions" component={QuickMissionsScreen} />
            <Stack.Screen name="FamilySettings" component={FamilySettingsScreen} />
            <Stack.Screen name="TaskApprovals" component={TaskApprovalsScreen} />
          </Stack.Group>
        ) : (
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