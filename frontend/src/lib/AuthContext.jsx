import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api, getToken } from './api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!getToken()) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const { user } = await api.me();
      setUser(user);
    } catch {
      localStorage.removeItem('dot40_token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const login = async (identifier, password) => {
    const { token, user } = await api.login({ identifier, password });
    localStorage.setItem('dot40_token', token);
    setUser(user);
  };

  const signup = async (username, email, password) => {
    const { token, user } = await api.signup({ username, email, password });
    localStorage.setItem('dot40_token', token);
    setUser(user);
  };

  const logout = () => {
    localStorage.removeItem('dot40_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
