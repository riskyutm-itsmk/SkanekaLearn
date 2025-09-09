import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          nama: string;
          email: string;
          role: 'admin' | 'guru' | 'siswa';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          nama: string;
          email: string;
          role: 'admin' | 'guru' | 'siswa';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          nama?: string;
          email?: string;
          role?: 'admin' | 'guru' | 'siswa';
          created_at?: string;
          updated_at?: string;
        };
      };
      majors: {
        Row: {
          id: string;
          kode_jurusan: string;
          nama_jurusan: string;
          created_at: string;
        };
      };
      classes: {
        Row: {
          id: string;
          tingkat: number;
          major_id: string;
          nama_kelas: string;
          wali_kelas: string | null;
          created_at: string;
        };
      };
      schedules: {
        Row: {
          id: string;
          subject_id: string;
          guru_id: string;
          kelas_id: string;
          hari: string;
          jam_mulai: string;
          jam_selesai: string;
          created_at: string;
        };
      };
      tasks: {
        Row: {
          id: string;
          guru_id: string;
          kelas_id: string;
          subject_id: string;
          judul: string;
          tipe: 'biasa' | 'quiz';
          deskripsi: string | null;
          deadline: string | null;
          max_score: number;
          created_at: string;
        };
      };
      location_settings: {
        Row: {
          id: string;
          name: string;
          latitude: number;
          longitude: number;
          radius: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          latitude: number;
          longitude: number;
          radius: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          latitude?: number;
          longitude?: number;
          radius?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
};