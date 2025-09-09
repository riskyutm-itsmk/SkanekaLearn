import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Users, GraduationCap, BookOpen, Calendar, School, TrendingUp } from 'lucide-react';
import { AnnouncementsList } from '../../components/AnnouncementsList';

interface Stats {
  totalTeachers: number;
  totalStudents: number;
  totalClasses: number;
  totalSubjects: number;
  totalSchedules: number;
  totalMajors: number;
}

export function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats>({
    totalTeachers: 0,
    totalStudents: 0,
    totalClasses: 0,
    totalSubjects: 0,
    totalSchedules: 0,
    totalMajors: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  async function fetchStats() {
    try {
      const [teachers, students, classes, subjects, schedules, majors] = await Promise.all([
        supabase.from('users').select('id', { count: 'exact', head: true }).eq('role', 'guru'),
        supabase.from('users').select('id', { count: 'exact', head: true }).eq('role', 'siswa'),
        supabase.from('classes').select('id', { count: 'exact', head: true }),
        supabase.from('subjects').select('id', { count: 'exact', head: true }),
        supabase.from('schedules').select('id', { count: 'exact', head: true }),
        supabase.from('majors').select('id', { count: 'exact', head: true }),
      ]);

      setStats({
        totalTeachers: teachers.count || 0,
        totalStudents: students.count || 0,
        totalClasses: classes.count || 0,
        totalSubjects: subjects.count || 0,
        totalSchedules: schedules.count || 0,
        totalMajors: majors.count || 0,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  }

  const statCards = [
    {
      title: 'Total Guru',
      value: stats.totalTeachers,
      icon: Users,
      color: 'bg-blue-500',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Total Siswa',
      value: stats.totalStudents,
      icon: GraduationCap,
      color: 'bg-green-500',
      bgColor: 'bg-green-50',
    },
    {
      title: 'Total Kelas',
      value: stats.totalClasses,
      icon: School,
      color: 'bg-purple-500',
      bgColor: 'bg-purple-50',
    },
    {
      title: 'Mata Pelajaran',
      value: stats.totalSubjects,
      icon: BookOpen,
      color: 'bg-orange-500',
      bgColor: 'bg-orange-50',
    },
    {
      title: 'Total Jadwal',
      value: stats.totalSchedules,
      icon: Calendar,
      color: 'bg-indigo-500',
      bgColor: 'bg-indigo-50',
    },
    {
      title: 'Total Jurusan',
      value: stats.totalMajors,
      icon: TrendingUp,
      color: 'bg-pink-500',
      bgColor: 'bg-pink-50',
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard Admin</h1>
        <p className="text-gray-600 mt-2">Selamat datang di panel administrasi LMS School</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {statCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <div key={index} className={`${card.bgColor} rounded-xl p-6 border border-gray-100`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{card.title}</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{card.value}</p>
                </div>
                <div className={`${card.color} rounded-full p-3`}>
                  <Icon size={24} className="text-white" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Announcements */}
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Pengumuman Terbaru</h3>
            <button 
              onClick={() => navigate('/admin/announcements')}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              Lihat Semua
            </button>
          </div>
          <AnnouncementsList limit={3} />
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Aksi Cepat</h3>
          <div className="space-y-3">
            <button 
              onClick={() => navigate('/admin/teachers')}
              className="w-full flex items-center justify-between p-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
            >
              <span className="font-medium text-blue-900">Tambah Guru Baru</span>
              <Users className="text-blue-600" size={18} />
            </button>
            <button 
              onClick={() => navigate('/admin/students')}
              className="w-full flex items-center justify-between p-3 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
            >
              <span className="font-medium text-green-900">Tambah Siswa Baru</span>
              <GraduationCap className="text-green-600" size={18} />
            </button>
            <button 
              onClick={() => navigate('/admin/classes')}
              className="w-full flex items-center justify-between p-3 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors"
            >
              <span className="font-medium text-purple-900">Buat Kelas Baru</span>
              <School className="text-purple-600" size={18} />
            </button>
            <button 
              onClick={() => navigate('/admin/announcements')}
              className="w-full flex items-center justify-between p-3 bg-yellow-50 hover:bg-yellow-100 rounded-lg transition-colors"
            >
              <span className="font-medium text-yellow-900">Buat Pengumuman</span>
              <Megaphone className="text-yellow-600" size={18} />
            </button>
            <button 
              onClick={() => navigate('/admin/attendance-reports')}
              className="w-full flex items-center justify-between p-3 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors"
            >
              <span className="font-medium text-orange-900">Lihat Laporan</span>
              <TrendingUp className="text-orange-600" size={18} />
            </button>
          </div>
        </div>
      </div>
      
      <div className="mt-6">
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Aktivitas Terbaru</h3>
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
              <div>
                <p className="text-sm font-medium text-gray-900">Guru baru bergabung</p>
                <p className="text-xs text-gray-500">2 jam yang lalu</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
              <div>
                <p className="text-sm font-medium text-gray-900">10 siswa baru terdaftar</p>
                <p className="text-xs text-gray-500">5 jam yang lalu</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-purple-500 rounded-full mt-2"></div>
              <div>
                <p className="text-sm font-medium text-gray-900">Jadwal baru dibuat</p>
                <p className="text-xs text-gray-500">1 hari yang lalu</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}