import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { ReadChaptersMap } from '../utils/readingProgressStorage';

export interface User {
  id: string;
  email: string;
  name: string;
  picture?: string;
  role: 'admin' | 'user';
  isBlocked: boolean;
  createdAt: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  isLoginModalOpen: boolean;
  loginPromptMessage: string | null;
  openLoginModal: (message?: string) => void;
  closeLoginModal: () => void;
  loginWithGoogleCredential: (credential: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  syncReadingProgressToAccount: (
    bookId: string,
    lastChapterId?: string,
    readChapters?: string[]
  ) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{
  children: React.ReactNode;
  onProgressLoaded?: (remoteMap: ReadChaptersMap) => void;
}> = ({ children, onProgressLoaded }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);
  const [loginPromptMessage, setLoginPromptMessage] = useState<string | null>(null);

  const openLoginModal = (message?: string) => {
    setLoginPromptMessage(
      message || 'Faça login com sua conta Google para enviar novos livros ou editar a biblioteca.'
    );
    setIsLoginModalOpen(true);
  };

  const closeLoginModal = () => {
    setIsLoginModalOpen(false);
    setLoginPromptMessage(null);
  };

  // Check current session on mount
  useEffect(() => {
    let isMounted = true;
    async function checkSession() {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            setUser(data.user || null);
            if (data.readingProgress && onProgressLoaded) {
              const remoteMap: ReadChaptersMap = {};
              for (const [bookId, p] of Object.entries(data.readingProgress as Record<string, any>)) {
                if (Array.isArray(p.readChapters)) {
                  remoteMap[bookId] = p.readChapters;
                }
              }
              onProgressLoaded(remoteMap);
            }
          }
        }
      } catch (err) {
        console.error('Erro ao verificar sessão:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    checkSession();
    return () => {
      isMounted = false;
    };
  }, [onProgressLoaded]);

  const loginWithGoogleCredential = async (credential: string) => {
    try {
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Falha ao autenticar com o Google.' };
      }

      setUser(data.user);
      if (data.readingProgress && onProgressLoaded) {
        const remoteMap: ReadChaptersMap = {};
        for (const [bookId, p] of Object.entries(data.readingProgress as Record<string, any>)) {
          if (Array.isArray(p.readChapters)) {
            remoteMap[bookId] = p.readChapters;
          }
        }
        onProgressLoaded(remoteMap);
      }

      closeLoginModal();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Erro de conexão com o servidor.' };
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // ignore
    }
    setUser(null);
  };

  const syncReadingProgressToAccount = useCallback(
    async (bookId: string, lastChapterId?: string, readChapters?: string[]) => {
      if (!user) return;
      try {
        await fetch('/api/auth/progress', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bookId, lastChapterId, readChapters }),
        });
      } catch (err) {
        console.warn('Erro ao sincronizar progresso na conta:', err);
      }
    },
    [user]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAdmin: user?.role === 'admin',
        isLoginModalOpen,
        loginPromptMessage,
        openLoginModal,
        closeLoginModal,
        loginWithGoogleCredential,
        logout,
        syncReadingProgressToAccount,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser utilizado dentro de um AuthProvider');
  }
  return context;
}
