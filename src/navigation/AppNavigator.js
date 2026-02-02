import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

// Importando as Telas
import SplashScreen from '../screens/SplashScreen';
import RoleSelectionScreen from '../screens/RoleSelectionScreen';
import CaptainSetupScreen from '../screens/CaptainSetupScreen';
import RecruitLinkScreen from '../screens/RecruitLinkScreen';
import CaptainHomeScreen from '../screens/CaptainHomeScreen';
import CreateTaskScreen from '../screens/CreateTaskScreen'; // Nova tela

const Stack = createStackNavigator();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator 
        initialRouteName="Splash" 
        screenOptions={{ headerShown: false }}
      >
        {/* Telas Normais (Navegação Padrão) */}
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="RoleSelection" component={RoleSelectionScreen} />
        <Stack.Screen name="CaptainSetup" component={CaptainSetupScreen} />
        <Stack.Screen name="RecruitLink" component={RecruitLinkScreen} />
        <Stack.Screen name="CaptainHome" component={CaptainHomeScreen} />

        {/* Telas Modais (Popups que sobem de baixo para cima) */}
        <Stack.Group screenOptions={{ presentation: 'modal' }}>
          <Stack.Screen name="CreateTask" component={CreateTaskScreen} />
        </Stack.Group>

      </Stack.Navigator>
    </NavigationContainer>
  );
}