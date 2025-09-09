import React from 'react';
import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  BookOpen,
  Calendar,
  FileText,
  ClipboardList,
  Award,
  Settings,
  LogOut,
  School,
  UserCheck,
  Upload,
  MessageSquare,
  TrendingUp,
  MapPin,
  BarChart3,
  Crown,
  Megaphone,
} from 'lucide-react';

interface AppSettings {
  app_name: string;
  logo_url: string | null;
}

const menuItems = {
  admin: [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
    { icon: Users, label: 'Kelola Guru', path: '/admin/teachers' },
    { icon: GraduationCap, label: 'Kelola Siswa', path: '/admin/students' },
    { icon: TrendingUp, label: 'Kelola Jurusan', path: '/admin/majors' },
    { icon: School, label: 'Kelola Kelas', path: '/admin/classes' },
    { icon: BookOpen, label: 'Mata Pelajaran', path: '/admin/subjects' },
    { icon: Calendar, label: 'Jadwal', path: '/admin/schedules' },
    { icon: MapPin, label: 'Lokasi Absensi', path: '/admin/location-settings' },
    { icon: Megaphone, label: 'Pengumuman', path: '/admin/announcements' },
    { icon: BarChart3, label: 'Laporan Kehadiran', path: '/admin/attendance-reports' },
    { icon: Settings, label: 'Pengaturan', path: '/admin/settings' },
  ],
  guru: [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
    { icon: UserCheck, label: 'Absensi Saya', path: '/teacher/attendance' },
    { icon: Users, label: 'Absensi Siswa', path: '/teacher/student-attendance' },
    { icon: Upload, label: 'Materi', path: '/teacher/materials' },
    { icon: ClipboardList, label: 'Tugas & Quiz', path: '/teacher/tasks' },
    { icon: MessageSquare, label: 'Jurnal', path: '/teacher/journals' },
    { icon: Award, label: 'Poin Siswa', path: '/teacher/points' },
    { icon: Megaphone, label: 'Pengumuman', path: '/teacher/announcements' },
    { icon: Crown, label: 'Ranking Kelas', path: '/teacher/class-ranking' },
  ],
  siswa: [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
    { icon: Calendar, label: 'Jadwal', path: '/student/schedule' },
    { icon: UserCheck, label: 'Presensi Saya', path: '/student/attendance' },
    { icon: BookOpen, label: 'Materi', path: '/student/materials' },
    { icon: ClipboardList, label: 'Tugas', path: '/student/tasks' },
    { icon: Award, label: 'Poin Saya', path: '/student/points' },
    { icon: MessageSquare, label: 'Jurnal', path: '/student/journals' },
  ],
};

export function Sidebar() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [appSettings, setAppSettings] = useState<AppSettings>({
    app_name: 'LMS School',
    logo_url: null
  });

  useEffect(() => {
    fetchAppSettings();
  }, []);

  async function fetchAppSettings() {
    try {
      const { data } = await supabase
        .from('app_settings')
        .select('app_name, logo_url')
        .single();

      if (data) {
        setAppSettings(data);
      }
    } catch (error) {
      console.error('Error fetching app settings:', error);
    }
  }

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (!profile) return null;

  const items = menuItems[profile.role] || [];

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 bg-slate-900 text-white p-2 rounded-lg"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`bg-slate-900 text-white w-64 min-h-screen flex flex-col fixed lg:relative z-40 transform transition-transform duration-300 ease-in-out ${
        isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}>
        <div className="p-4 lg:p-6 border-b border-slate-700">
          <div className="flex items-center space-x-3">
            {appSettings.logo_url && (
              <img
                src={appSettings.logo_url}
                alt="Logo"
                className="h-8 w-8 object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            )}
            <h1 className="text-lg lg:text-xl font-bold">{appSettings.app_name}</h1>
          </div>
          <p className="text-xs lg:text-sm text-slate-300 mt-1">
            {profile.role === 'admin' ? 'Administrator' : 
             profile.role === 'guru' ? 'Guru' : 'Siswa'}
          </p>
        </div>

        <nav className="flex-1 p-4">
          <div className="space-y-2">
            {items.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              
              return (
                <button
                  key={item.path}
                  onClick={() => {
                    navigate(item.path);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <Icon size={18} />
                  <span className="text-sm lg:text-base">{item.label}</span>
                </button>
              );
            })}
          </div>
        </nav>

        <div className="p-4 border-t border-slate-700">
          <div className="mb-4">
            <p className="text-sm font-medium truncate">{profile.nama}</p>
            <p className="text-xs text-slate-400 truncate">{profile.email}</p>
          </div>
          <button
            onClick={() => {
              handleSignOut();
              setIsMobileMenuOpen(false);
            }}
            className="w-full flex items-center space-x-3 px-3 py-2 text-slate-300 hover:bg-slate-800 hover:text-white rounded-lg transition-colors"
          >
            <LogOut size={18} />
            <span className="text-sm lg:text-base">Keluar</span>
          </button>
        </div>
      </div>
    </>
  );
}