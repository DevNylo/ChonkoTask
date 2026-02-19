import { MaterialCommunityIcons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { COLORS } from '../styles/theme';

// --- TELAS DE AUTENTICAÇÃO ---
import JoinFamilyScreen from '../screens/auth/JoinFamilyScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterCaptainScreen from '../screens/auth/RegisterCaptainScreen';
import WelcomeScreen from '../screens/auth/WelcomeScreen';

// --- TELAS GERAIS ---
import OnboardingScreen from '../screens/OnboardingScreen'; // <-- JÁ ESTAVA AQUI
import RoleSelectionScreen from '../screens/RoleSelectionScreen';
import MissionDetailScreen from '../screens/recruit/MissionDetailScreen';

// --- TELAS DO RECRUTA (ABAS) ---
import RewardShopScreen from '../screens/captain/RewardShopScreen'; // Loja Compartilhada
import RecruitHomeScreen from '../screens/recruit/RecruitHomeScreen';

// Telas Placeholder (Crie arquivos vazios se não tiver ainda)
import BagScreen from '../screens/recruit/BagScreen';
import CustomizeScreen from '../screens/recruit/CustomizeScreen';
import TrophiesScreen from '../screens/recruit/TrophiesScreen';

// --- TELAS DO CAPITÃO (ADMIN) ---
import CaptainHomeScreen from '../screens/CaptainHomeScreen';
import RankingScreen from '../screens/RankingScreen';
import ReportsScreen from '../screens/ReportsScreen';
import CreateMissionScreen from '../screens/captain/CreateMissionScreen';
import FamilySettingsScreen from '../screens/captain/FamilySettingsScreen';
import MemberRequestsScreen from '../screens/captain/MemberRequestsScreen';
import MissionManagerScreen from '../screens/captain/MissionManagerScreen';
import QuickMissionsScreen from '../screens/captain/QuickMissionsScreen';
import TaskApprovalsScreen from '../screens/captain/TaskApprovalsScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const ChonkoTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: COLORS.background, 
  },
};

// --- COMPONENTE DA BARRA FIXA (DOCK) ---
function CustomTabBar({ state, descriptors, navigation }) {
    return (
      <View style={styles.bottomDockContainer}>
        <View style={styles.dockBackground}>
          {state.routes.map((route, index) => {
            const { options } = descriptors[route.key];
            const isFocused = state.index === index;
            
            let iconName = 'circle';
            let label = route.name;
  
            if (route.name === 'Shop') { iconName = 'storefront-outline'; label = 'Loja'; }
            if (route.name === 'Visual') { iconName = 'palette-outline'; label = 'Visual'; }
            if (route.name === 'Trophies') { iconName = 'medal-outline'; label = 'Troféus'; }
            if (route.name === 'Bag') { iconName = 'bag-personal-outline'; label = 'Bolsa'; }
            if (route.name === 'Home') { iconName = 'format-list-checks'; label = ''; } 
  
            const onPress = () => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });
  
              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            };
  
            if (route.name === 'Home') {
              return (
                 <View key={index} style={{ width: 60, alignItems: 'center' }}>
                    <TouchableOpacity 
                      style={styles.centerDockButton} 
                      activeOpacity={0.9} 
                      onPress={onPress}
                    >
                      <View style={styles.centerBtnInner}>
                          <MaterialCommunityIcons name={iconName} size={28} color="#fff" />
                      </View>
                    </TouchableOpacity>
                 </View>
              );
            }
  
            return (
              <TouchableOpacity
                key={index}
                accessibilityRole="button"
                accessibilityState={isFocused ? { selected: true } : {}}
                onPress={onPress}
                style={styles.dockItem}
              >
                <MaterialCommunityIcons 
                  name={iconName} 
                  size={24} 
                  color={isFocused ? COLORS.primary : "#64748B"} 
                />
                <Text style={[
                    styles.dockLabel, 
                    isFocused && { color: COLORS.primary }
                ]}>
                    {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
}

// --- NAVEGADOR DE ABAS (RECRUTA) ---
function RecruitTabs({ route }) {
    const { profile } = route.params || {};

    return (
      <Tab.Navigator
        tabBar={props => <CustomTabBar {...props} />}
        initialRouteName="Home"
        screenOptions={{
          headerShown: false,
          tabBarHideOnKeyboard: true,
        }}
      >
        <Tab.Screen name="Shop" component={RewardShopScreen} initialParams={{ profile, familyId: profile?.family_id }} />
        <Tab.Screen name="Visual" component={CustomizeScreen || View} initialParams={{ profile }} /> 
        <Tab.Screen name="Home" component={RecruitHomeScreen} initialParams={{ profile }} />
        <Tab.Screen name="Trophies" component={TrophiesScreen || View} initialParams={{ profile }} />
        <Tab.Screen name="Bag" component={BagScreen || View} initialParams={{ profile }} />
      </Tab.Navigator>
    );
}

export default function AppNavigator() {
  const { session, loading, profile } = useAuth();

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
          <Stack.Group>
             {/* SELEÇÃO DE PERFIL / ROTA INICIAL */}
             {profile?.role === 'recruit' ? (
                <Stack.Screen 
                    name="RecruitTabs" 
                    component={RecruitTabs} 
                    initialParams={{ profile: profile }} 
                />
             ) : (
                <Stack.Group>
                    <Stack.Screen name="RoleSelection" component={RoleSelectionScreen} />
                    <Stack.Screen name="CaptainHome" component={CaptainHomeScreen} />
                    <Stack.Screen name="RecruitTabs" component={RecruitTabs} />
                </Stack.Group>
             )}

            {/* --- ROTAS GERAIS (STACK - SEM ABAS) --- */}
            {/* O Capitão acessa a Loja por aqui. O Recruta acessa pelas abas. */}
            <Stack.Screen name="RewardShop" component={RewardShopScreen} />
            <Stack.Screen name="MissionDetail" component={MissionDetailScreen} />
            
            {/* --- ROTAS DO CAPITÃO --- */}
            <Stack.Screen name="MissionManager" component={MissionManagerScreen} />
            <Stack.Screen name="MemberRequests" component={MemberRequestsScreen} /> 
            <Stack.Screen name="CreateMission" component={CreateMissionScreen} />
            <Stack.Screen name="QuickMissions" component={QuickMissionsScreen} />
            <Stack.Screen name="FamilySettings" component={FamilySettingsScreen} />
            <Stack.Screen name="TaskApprovals" component={TaskApprovalsScreen} />
            <Stack.Screen name="Ranking" component={RankingScreen} />
            <Stack.Screen name="Reports" component={ReportsScreen} />
            
          </Stack.Group>
          
        ) : (
          <Stack.Group>
            {/* AQUI ENTRA A TELA DE ONBOARDING */}
            {/* Ela fica antes da WelcomeScreen */}
            <Stack.Screen name="OnboardingScreen" component={OnboardingScreen} /> 
            
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

const styles = StyleSheet.create({
    bottomDockContainer: { 
      position: 'absolute', 
      bottom: 20, 
      left: 20, 
      right: 20, 
      alignItems: 'center', 
      justifyContent: 'flex-end', 
      height: 80,
      backgroundColor: 'transparent'
    },
    dockBackground: { 
      flexDirection: 'row', 
      backgroundColor: '#FFFFFF', 
      borderRadius: 25, 
      height: 65, 
      width: '100%', 
      alignItems: 'center', 
      justifyContent: 'space-between', 
      paddingHorizontal: 10, 
      shadowColor: "#0F172A", 
      shadowOffset: { width: 0, height: 10 }, 
      shadowOpacity: 0.25, 
      shadowRadius: 10, 
      elevation: 10, 
      borderWidth: 1, 
      borderColor: '#F1F5F9' 
    },
    dockItem: { 
      alignItems: 'center', 
      justifyContent: 'center', 
      width: 60, 
      height: 60 
    },
    dockLabel: { 
      fontSize: 9, 
      fontWeight: 'bold', 
      color: '#64748B', 
      marginTop: 2 
    }, 
    centerDockButton: { 
      position: 'absolute', 
      bottom: -10, // AJUSTADO PARA FICAR ALINHADO
      alignSelf: 'center', 
      width: 70, 
      height: 70, 
      borderRadius: 35, 
      backgroundColor: '#F0F9FF', 
      justifyContent: 'center', 
      alignItems: 'center', 
      shadowColor: COLORS.primary || '#10B981', 
      shadowOffset: { width: 0, height: 8 }, 
      shadowOpacity: 0.4, 
      shadowRadius: 8, 
      elevation: 12 
    },
    centerBtnInner: { 
      width: 58, 
      height: 58, 
      borderRadius: 29, 
      backgroundColor: COLORS.primary || '#10B981', 
      justifyContent: 'center', 
      alignItems: 'center', 
      borderWidth: 2, 
      borderColor: '#fff' 
    }
  });