import React, { createContext, useContext, useEffect, useState } from 'react';
import bcrypt from 'bcryptjs';
import { supabase } from '../lib/supabase';

interface UserProfile {
  id: string;
  nama: string;
  email: string;
  role: 'admin' | 'guru' | 'siswa';
}

interface AuthContextType {
  user: UserProfile | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in from localStorage
    const savedUser = localStorage.getItem('lms_user');
    if (savedUser) {
      const userData = JSON.parse(savedUser);
      setUser(userData);
      setProfile(userData);
    }
    setLoading(false);
  }, []);

  async function signIn(email: string, password: string) {
    try {
      // Query user by email only and include password for comparison
      const { data, error } = await supabase
        .from('users')
        .select('id, nama, email, role, password')
        .eq('email', email)
        .single();

      if (error || !data) {
        throw new Error('Email tidak ditemukan');
      }

      // Check if password is hashed (starts with $2) or plaintext
      let isPasswordValid = false;
      
      if (data.password.startsWith('$2')) {
        // Hashed password - use bcrypt compare
        isPasswordValid = await bcrypt.compare(password, data.password);
      } else {
        // Plaintext password - direct comparison
        isPasswordValid = password === data.password;
      }
      
      if (!isPasswordValid) {
        console.log('Password comparison failed:', {
          inputPassword: password,
          storedPassword: data.password,
          isHashed: data.password.startsWith('$2')
        });
        throw new Error('Password salah');
      }

      // Save user to localStorage and state (without password)
      const userData = {
        id: data.id,
        nama: data.nama,
        email: data.email,
        role: data.role
      };

      localStorage.setItem('lms_user', JSON.stringify(userData));
      setUser(userData);
      setProfile(userData);
    } catch (error: any) {
      throw new Error(error.message || 'Login gagal');
    }
  }

  async function signOut() {
    localStorage.removeItem('lms_user');
    setUser(null);
    setProfile(null);
  }

  const value: AuthContextType = {
    user,
    profile,
    loading,
    signIn,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}