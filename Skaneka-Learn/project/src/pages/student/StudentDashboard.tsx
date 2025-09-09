import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { Clock, Calendar, BookOpen, ClipboardList, Award, TrendingUp } from 'lucide-react';
import { AnnouncementsList } from '../../components/AnnouncementsList';

interface TodaySchedule {
  id: string;
  hari: string;
  jam_mulai: string;
  jam_selesai: string;
  subject: { nama_mapel: string };
  guru: { nama: string };
}

interface StudentClass {
  id: string;
  kelas: {
    id: string;
    nama_kelas: string;
    tingkat: number;
    major: { nama_jurusan: string };
  };
}

export function StudentDashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [todaySchedules, setTodaySchedules] = useState<TodaySchedule[]>([]);
  const [studentClass, setStudentClass] = useState<StudentClass | null>(null);
  const [stats, setStats] = useState({
    totalTasks: 0,
    completedTasks: 0,
    points: 0,
    attendancePercentage: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile) {
      fetchStudentData();
    }
  }, [profile]);

  async function fetchStudentData() {
    try {
      // Fetch student's current class
      const { data: classData } = await supabase
        .from('students_classes')
        .select(`
          id,
          kelas:classes(
            id,
            nama_kelas,
            tingkat,
            major:majors(nama_jurusan)
          )
        `)
        .eq('siswa_id', profile?.id)
        .eq('status', 'aktif')
        .maybeSingle();

      setStudentClass(classData);

      if (classData) {
        // Fetch today's schedules
        const today = format(new Date(), 'EEEE', { locale: id });
        const { data: schedules } = await supabase
          .from('schedules')
          .select(`
            id,
            hari,
            jam_mulai,
            jam_selesai,
            subject:subjects(nama_mapel),
            guru:users(nama)
          `)
          .eq('kelas_id', classData.kelas.id)
          .eq('hari', today);

        setTodaySchedules(schedules || []);

        // Fetch real statistics
        const [tasksData, submissionsData, pointsData, attendanceData] = await Promise.all([
          // Total tasks for student's class
          supabase
            .from('tasks')
            .select('id', { count: 'exact', head: true })
            .eq('kelas_id', classData.kelas.id),
          
          // Student's completed tasks
          supabase
            .from('task_submissions')
            .select('id', { count: 'exact', head: true })
            .eq('siswa_id', profile?.id),
          
          // Student's points
          supabase
            .from('points')
            .select('poin')
            .eq('siswa_id', profile?.id),
          
          // Student's attendance for percentage calculation
          supabase
            .from('attendance')
            .select('status')
            .eq('siswa_id', profile?.id)
        ]);

        const totalPoints = pointsData.data?.reduce((sum, point) => sum + point.poin, 0) || 0;
        
        // Calculate attendance percentage
        const totalAttendance = attendanceData.data?.length || 0;
        const presentCount = attendanceData.data?.filter(att => att.status === 'hadir').length || 0;
        const attendancePercentage = totalAttendance > 0 ? Math.round((presentCount / totalAttendance) * 100) : 0;

        setStats({
          totalTasks: tasksData.count || 0,
          completedTasks: submissionsData.count || 0,
          points: totalPoints,
          attendancePercentage
        });
      }
    } catch (error) {
      console.error('Error fetching student data:', error);
    } finally {
      setLoading(false);
    }
  }

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
        <h1 className="text-3xl font-bold text-gray-900">Dashboard Siswa</h1>
        <p className="text-gray-600 mt-2">Selamat datang, {profile?.nama}</p>
        {studentClass && (
          <p className="text-sm text-gray-500 mt-1">
            Kelas {studentClass.kelas.tingkat} {studentClass.kelas.nama_kelas} - {studentClass.kelas.major?.nama_jurusan}
          </p>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-8">
        <div className="bg-white rounded-xl p-4 sm:p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-medium text-gray-600">Tugas Selesai</p>
              <p className="text-xl sm:text-3xl font-bold text-green-600">
                {stats.completedTasks}/{stats.totalTasks}
              </p>
            </div>
            <div className="bg-green-100 rounded-full p-2 sm:p-3">
              <ClipboardList size={20} className="text-green-600 sm:w-6 sm:h-6" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 sm:p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-medium text-gray-600">Kehadiran</p>
              <p className="text-xl sm:text-3xl font-bold text-blue-600">{stats.attendancePercentage}%</p>
            </div>
            <div className="bg-blue-100 rounded-full p-2 sm:p-3">
              <TrendingUp size={20} className="text-blue-600 sm:w-6 sm:h-6" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 sm:p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-medium text-gray-600">Total Poin</p>
              <p className="text-xl sm:text-3xl font-bold text-purple-600">{stats.points}</p>
            </div>
            <div className="bg-purple-100 rounded-full p-2 sm:p-3">
              <Award size={20} className="text-purple-600 sm:w-6 sm:h-6" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 sm:p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-medium text-gray-600">Jadwal Hari Ini</p>
              <p className="text-xl sm:text-3xl font-bold text-orange-600">{todaySchedules.length}</p>
            </div>
            <div className="bg-orange-100 rounded-full p-2 sm:p-3">
              <Calendar size={20} className="text-orange-600 sm:w-6 sm:h-6" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Announcements */}
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Pengumuman Terbaru</h3>
          <AnnouncementsList limit={4} />
        </div>

        {/* Today's Schedule */}
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Jadwal Hari Ini</h3>
          {todaySchedules.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Tidak ada jadwal hari ini</p>
          ) : (
            <div className="space-y-3">
              {todaySchedules.map((schedule) => (
                <div key={schedule.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 bg-gray-50 rounded-lg gap-2 sm:gap-0">
                  <div className="flex items-center space-x-3">
                    <Clock className="text-blue-500" size={20} />
                    <div>
                      <p className="font-medium text-sm sm:text-base">{schedule.subject.nama_mapel}</p>
                      <p className="text-sm text-gray-600">{schedule.guru.nama}</p>
                    </div>
                  </div>
                  <div className="text-left sm:text-right ml-8 sm:ml-0">
                    <p className="font-medium text-sm sm:text-base">{schedule.jam_mulai} - {schedule.jam_selesai}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
      </div>
      
      <div className="mt-6">
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Menu Cepat</h3>
          <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={() => navigate('/student/materials')}
              className="flex flex-col items-center p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
            >
              <BookOpen className="text-blue-600 mb-2" size={20} />
              <span className="text-sm font-medium text-blue-900">Materi</span>
            </button>
            <button 
              onClick={() => navigate('/student/tasks')}
              className="flex flex-col items-center p-4 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
            >
              <ClipboardList className="text-green-600 mb-2" size={20} />
              <span className="text-sm font-medium text-green-900">Tugas</span>
            </button>
            <button 
              onClick={() => navigate('/student/schedule')}
              className="flex flex-col items-center p-4 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors"
            >
              <Calendar className="text-purple-600 mb-2" size={20} />
              <span className="text-sm font-medium text-purple-900">Jadwal</span>
            </button>
            <button 
              onClick={() => navigate('/student/points')}
              className="flex flex-col items-center p-4 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors"
            >
              <Award className="text-orange-600 mb-2" size={20} />
              <span className="text-sm font-medium text-orange-900">Poin</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}