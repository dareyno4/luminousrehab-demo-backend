import React, { createContext, useContext, useState, ReactNode } from 'react';
import { authService } from '../services/auth';

// User as defined in your working code
interface User {
  id: string;
  tenant_id: string;
  email: string;
  role: string;
  first_name: string;
  last_name: string;
  active: boolean;
  mfa_enabled: boolean;
  token?: string;
  agency_name?: string;
}

// Auth context type – merged:
// - keeps your fields (user, isAuthenticated, error, login/logout)
// - adds `role` so other code can do `const { role } = useAuth()`
interface AuthContextType {
  user: User | null;
  role: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // login function using authService (your working behavior)
  const login = async (email: string, password: string) => {
    try {
      setError(null);
      const { user } = await authService.login({ email, password });
      setUser(user);
      setIsAuthenticated(true);
      return user;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
      throw err;
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
      setUser(null);
      setIsAuthenticated(false);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Logout failed');
      throw err;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role ?? null, // <- added for compatibility with his code
        isAuthenticated,
        login,
        logout,
        error,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Exported AuthContext for external usage
export { AuthContext };