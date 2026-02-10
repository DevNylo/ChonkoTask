import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext({});

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSessionData();

    // Escuta mudanças no Supabase (Login/Logout de Pai)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session) {
        // Se entrou via Supabase (Pai), carrega perfil do banco
        setSession(session);
        setUser(session.user);
        await fetchProfile(session.user.id);
      } else {
        // Se saiu do Supabase, verifica se não é um login de criança antes de zerar tudo
        // (Isso evita logout acidental ao recarregar o app)
        checkLocalChildSession();
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // --- 1. LÓGICA DE CARREGAMENTO (HÍBRIDA) ---
  const loadSessionData = async () => {
    try {
      // A. Tenta sessão oficial (Supabase - Pai)
      const { data: { session: supabaseSession } } = await supabase.auth.getSession();

      if (supabaseSession) {
        setSession(supabaseSession);
        setUser(supabaseSession.user);
        await fetchProfile(supabaseSession.user.id);
      } else {
        // B. Se não tem Pai, tenta sessão LOCAL (Criança/Recruta)
        await checkLocalChildSession();
      }
    } catch (error) {
      console.log('Erro ao carregar sessão:', error);
    } finally {
      setLoading(false);
    }
  };

  // Verifica se existe um login de criança salvo no celular
  const checkLocalChildSession = async () => {
    try {
      const childData = await AsyncStorage.getItem('chonko_child_session');
      
      if (childData) {
        const parsed = JSON.parse(childData);
        // Restaura a sessão fake e o perfil real
        if (parsed.session) setSession(parsed.session);
        if (parsed.profile) setProfile(parsed.profile);
        setUser({ id: 'child_mode' }); // Usuário fake
      } else {
        // Se não tem nada, aí sim zera tudo
        setSession(null);
        setProfile(null);
        setUser(null);
      }
    } catch (e) {
      console.log("Erro ao ler sessão local:", e);
    }
  };

  // Busca perfil no banco (Apenas para Pai/Supabase)
  const fetchProfile = async (userId) => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();
      
      if (data) setProfile(data);
    } catch (error) {
      console.log('Erro ao buscar perfil:', error);
    }
  };

  // --- 2. FUNÇÕES EXPOSTAS ---

  const signIn = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signUp = async (email, password) => {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
  };

  const signOut = async () => {
    setLoading(true);
    try {
      // 1. Logout do Supabase
      await supabase.auth.signOut();
      // 2. Limpeza Local (Criança)
      await AsyncStorage.removeItem('chonko_child_session');
      
      // 3. Limpa Estados
      setSession(null);
      setUser(null);
      setProfile(null);
    } catch (error) {
      console.error("Erro ao sair:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ 
        session, 
        user, 
        profile, 
        loading, 
        signIn, 
        signUp, 
        signOut,
        // Expondo setters para telas como JoinFamilyScreen usarem manualmente
        setSession, 
        setProfile 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);