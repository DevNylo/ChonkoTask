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

    // Escuta mudanças no Supabase (Login Admin, Login Anônimo, Logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, currentSession) => {
      setSession(currentSession);
      setUser(currentSession?.user || null);

      if (currentSession) {
        await fetchProfile(currentSession.user.id);
      } else {
        setProfile(null);
      }

      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // --- 1. LÓGICA DE CARREGAMENTO OFICIAL ---
  const loadSessionData = async () => {
    try {
      // Puxa a sessão do Supabase (seja de Admin com e-mail ou Anônima de criança)
      const { data: { session: supabaseSession } } = await supabase.auth.getSession();

      if (supabaseSession) {
        setSession(supabaseSession);
        setUser(supabaseSession.user);
        await fetchProfile(supabaseSession.user.id);
      }
    } catch (error) {
      console.log('Erro ao carregar sessão:', error);
    } finally {
      setLoading(false);
    }
  };

  // --- 2. O CÉREBRO DA BUSCA DUPLA ---
  const fetchProfile = async (userId) => {
    try {
      // TENTATIVA A: Procura o perfil direto (Geralmente o Admin criador da conta)
      const { data: directProfile } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();

      if (directProfile) {
        setProfile(directProfile);
        return;
      }

      // TENTATIVA B: Não tem perfil direto? Então verifica se é um Aparelho Pareado (Criança/Reconexão)
      const { data: linkData } = await supabase
          .from('device_links')
          .select('profile_id')
          .eq('auth_id', userId)
          .maybeSingle();

      if (linkData && linkData.profile_id) {
        // Achou o vínculo! Agora puxa os dados do perfil verdadeiro da criança
        const { data: linkedProfile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', linkData.profile_id)
            .maybeSingle();

        if (linkedProfile) {
          setProfile(linkedProfile);
          return;
        }
      }

      // Se chegou até aqui, é um usuário que logou mas ainda não tem perfil (ex: acabou de digitar o código mas a internet caiu)
      setProfile(null);

    } catch (error) {
      console.log('Erro na busca dupla do perfil:', error);
    }
  };

  // --- 3. FUNÇÕES EXPOSTAS ---

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
      // Desloga do Supabase (serve tanto para Admin quanto para Anônimo)
      await supabase.auth.signOut();

      // Limpa os estados da memória
      setSession(null);
      setUser(null);
      setProfile(null);
    } catch (error) {
      console.error("Erro ao sair:", error);
    } finally {
      setLoading(false);
    }
  };

  // Função extra para permitir que telas forcem a recarga do perfil (útil na tela de Join)
  const reloadProfile = async () => {
    if (session?.user?.id) {
      await fetchProfile(session.user.id);
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
        setSession,
        setProfile,
        reloadProfile
      }}>
        {children}
      </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);