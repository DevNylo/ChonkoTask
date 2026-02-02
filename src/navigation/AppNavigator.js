import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

// Imports das Telas
import CaptainHomeScreen from '../screens/CaptainHomeScreen';
import CaptainJoinScreen from '../screens/CaptainJoinScreen';
import CaptainSetupScreen from '../screens/CaptainSetupScreen';
import CaptainShopScreen from '../screens/CaptainShopScreen';
import CreateTaskScreen from '../screens/CreateTaskScreen';
import CameraScreen from '../screens/recruit/CameraScreen';
import RecruitLinkScreen from '../screens/RecruitLinkScreen';
import RoleSelectionScreen from '../screens/RoleSelectionScreen';
import SplashScreen from '../screens/SplashScreen';
import RecruitTabNavigator from './RecruitTabNavigator';

const Stack = createStackNavigator();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Splash" screenOptions={{ headerShown: false }}>
        
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="RoleSelection" component={RoleSelectionScreen} />
        
        <Stack.Screen name="CaptainSetup" component={CaptainSetupScreen} />
        <Stack.Screen name="CaptainJoin" component={CaptainJoinScreen} />
        <Stack.Screen name="CaptainHome" component={CaptainHomeScreen} />
        <Stack.Screen name="CaptainShop" component={CaptainShopScreen} />

        <Stack.Screen name="RecruitLink" component={RecruitLinkScreen} />
        <Stack.Screen name="RecruitHomeTab" component={RecruitTabNavigator} />

        <Stack.Group screenOptions={{ presentation: 'modal' }}>
          <Stack.Screen name="CreateTask" component={CreateTaskScreen} />
        </Stack.Group>
        <Stack.Screen name="RecruitCamera" component={CameraScreen} />

      </Stack.Navigator>
    </NavigationContainer>
  );
}