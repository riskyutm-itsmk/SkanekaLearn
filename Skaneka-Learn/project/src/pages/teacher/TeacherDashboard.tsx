import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { Clock, Calendar, Users, ClipboardList, CheckCircle, XCircle, BookOpen, FileText, Award, Crown } from 'lucide-react';
import { AnnouncementsList } from '../../components/AnnouncementsList';

interface TodaySchedule {
  id: string;
  hari: string;
  jam_mulai: string;
  jam_selesai: string;
  subject: { nama_mapel: string };
  class: { nama_kelas: string };
}

interface ScheduleAttendance {
  id: string;
  schedule_id: string;
  status: string;
  jam_masuk: string | null;
  jam_pulang: string | null;
}

interface TeacherStats {
  totalStudents: number;
  totalTasks: number;
  totalMaterials: number;
  totalClasses: number;
  attendanceToday: number;
}
export function TeacherDashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [todaySchedules, setTodaySchedules] = useState<TodaySchedule[]>([]);
  const [scheduleAttendances, setScheduleAttendances] = useState<ScheduleAttendance[]>([]);
  const [stats, setStats] = useState<TeacherStats>({
    totalStudents: 0,
    totalTasks: 0,
    totalMaterials: 0,
    totalClasses: 0,
    attendanceToday: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile) {
      fetchTodayData();
      fetchTeacherStats();
    }
  }, [profile]);

  async function fetchTodayData() {
    try {
      const today = format(new Date(), 'EEEE', { locale: id });
      const todayDate = format(new Date(), 'yyyy-MM-dd');

      // Fetch today's schedules
      const { data: schedules } = await supabase
        .from('schedules')
        .select(`
          id,
          hari,
          jam_mulai,
          jam_selesai,
          subject:subjects(nama_mapel),
          class:classes(nama_kelas)
        `)
        .eq('guru_id', profile?.id)
        .eq('hari', today);

      setTodaySchedules(schedules || []);

      // Fetch today's attendance for all schedules
      const { data: attendanceData } = await supabase
        .from('teacher_attendance')
        .select('id, schedule_id, status, jam_masuk, jam_pulang')
        .eq('guru_id', profile?.id)
        .eq('tanggal', todayDate);

      setScheduleAttendances(Array.isArray(attendanceData) ? attendanceData : []);
    } catch (error) {
      console.error('Error fetching today data:', error);
    }
  }

  async function fetchTeacherStats() {
    try {
      // Get unique classes taught by this teacher
      const { data: classesData } = await supabase
        .from('schedules')
        .select('kelas_id')
        .eq('guru_id', profile?.id);

      const uniqueClassIds = [...new Set(classesData?.map(s => s.kelas_id) || [])];

      // Get total students from all classes taught
      let totalStudents = 0;
      if (uniqueClassIds.length > 0) {
        const { count } = await supabase
          .from('students_classes')
          .select('siswa_id', { count: 'exact', head: true })
          .in('kelas_id', uniqueClassIds)
          .eq('status', 'aktif');
        totalStudents = count || 0;
      }

      // Get total tasks created by this teacher
      const { count: tasksCount } = await supabase
        .from('tasks')
        .select('id', { count: 'exact', head: true })
        .eq('guru_id', profile?.id);

      // Get total materials created by this teacher
      const { count: materialsCount } = await supabase
        .from('materials')
        .select('id', { count: 'exact', head: true })
        .eq('guru_id', profile?.id);

      // Get attendance count for today
      const todayDate = format(new Date(), 'yyyy-MM-dd');
      const { count: attendanceCount } = await supabase
        .from('teacher_attendance')
        .select('id', { count: 'exact', head: true })
        .eq('guru_id', profile?.id)
        .eq('tanggal', todayDate)
        .not('jam_masuk', 'is', null);

      setStats({
        totalStudents,
        totalTasks: tasksCount || 0,
        totalMaterials: materialsCount || 0,
        totalClasses: uniqueClassIds.length,
        attendanceToday: attendanceCount || 0
      });
    } catch (error) {
      console.error('Error fetching teacher stats:', error);
    } finally {
      setLoading(false);
    }
  }

  async function markAttendance(scheduleId: string, type: 'masuk' | 'pulang') {
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      const now = format(new Date(), 'HH:mm:ss');
      
      const existingAttendance = scheduleAttendances.find(att => att.schedule_id === scheduleId);

      if (existingAttendance) {
        // Update existing attendance
        const updateData = type === 'masuk' 
          ? { jam_masuk: now }
          : { jam_pulang: now };

        const { error } = await supabase
          .from('teacher_attendance')
          .update(updateData)
          .eq('id', existingAttendance.id);

        if (error) throw error;
      } else {
        // Create new attendance record
        const { error } = await supabase
          .from('teacher_attendance')
          .insert({
            guru_id: profile?.id,
            schedule_id: scheduleId,
            tanggal: today,
            [type === 'masuk' ? 'jam_masuk' : 'jam_pulang']: now,
            status: 'hadir'
          });

        if (error) throw error;
      }

      fetchTodayData();
    } catch (error) {
      console.error('Error marking attendance:', error);
    }
  }

  const getAttendanceForSchedule = (scheduleId: string) => {
    return scheduleAttendances.find(att => att.schedule_id === scheduleId);
  };

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
        <h1 className="text-3xl font-bold text-gray-900">Dashboard Guru</h1>
        <p className="text-gray-600 mt-2">Selamat datang, {profile?.nama}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Today's Schedule with Attendance */}
        <div className="lg:col-span-3 bg-white rounded-xl p-4 sm:p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Jadwal Hari Ini</h3>
          {todaySchedules.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Tidak ada jadwal hari ini</p>
          ) : (
            <div className="space-y-3">
              {todaySchedules.map((schedule) => (
                <div key={schedule.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-gray-50 rounded-lg gap-3">
                  <div className="flex items-center space-x-3 flex-1">
                    <BookOpen className="text-blue-500" size={20} />
                    <div>
                      <p className="font-medium text-sm sm:text-base">{schedule.subject.nama_mapel}</p>
                      <p className="text-sm text-gray-600">{schedule.class.nama_kelas}</p>
                      <p className="text-xs text-gray-500">{schedule.jam_mulai} - {schedule.jam_selesai}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 w-full sm:w-auto">
                    {(() => {
                      const attendance = getAttendanceForSchedule(schedule.id);
                      
                      if (!attendance?.jam_masuk) {
                        return (
                          <button
                            onClick={() => markAttendance(schedule.id, 'masuk')}
                            className="bg-green-500 text-white py-2 px-3 rounded text-sm hover:bg-green-600 transition-colors flex items-center space-x-1 flex-1 sm:flex-none justify-center"
                          >
                            <CheckCircle size={14} />
                            <span>Mulai KBM</span>
                          </button>
                        );
                      } else if (!attendance?.jam_pulang) {
                        return (
                          <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-2 w-full sm:w-auto">
                            <span className="text-xs text-green-600 font-medium whitespace-nowrap">
                              Mulai: {attendance.jam_masuk}
                            </span>
                            <button
                              onClick={() => markAttendance(schedule.id, 'pulang')}
                              className="bg-red-500 text-white py-2 px-3 rounded text-sm hover:bg-red-600 transition-colors flex items-center space-x-1 flex-1 sm:flex-none justify-center"
                            >
                              <XCircle size={14} />
                              <span>Selesai</span>
                            </button>
                          </div>
                        );
                      } else {
                        return (
                          <div className="text-xs text-gray-600 text-right">
                            <div>Mulai: {attendance.jam_masuk}</div>
                            <div>Selesai: {attendance.jam_pulang}</div>
                          </div>
                        );
                      }
                    })()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Announcements */}
        <div className="bg-white rounded-xl p-4 sm:p-6 border border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Pengumuman Terbaru</h3>
            <button 
              onClick={() => navigate('/teacher/announcements')}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              Kelola
            </button>
          </div>
          <AnnouncementsList limit={3} />
        </div>

        <div className="bg-white rounded-xl p-4 sm:p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Menu Cepat</h3>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            <button 
              onClick={() => navigate('/teacher/student-attendance')}
              className="flex flex-col items-center p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
            >
              <Users className="text-blue-600 mb-2" size={24} />
              <span className="text-sm font-medium text-blue-900">Absensi Siswa</span>
            </button>
            <button 
              onClick={() => navigate('/teacher/tasks')}
              className="flex flex-col items-center p-4 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
            >
              <ClipboardList className="text-green-600 mb-2" size={24} />
              <span className="text-sm font-medium text-green-900">Buat Tugas</span>
            </button>
            <button 
              onClick={() => navigate('/teacher/journals')}
              className="flex flex-col items-center p-4 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors"
            >
              <Calendar className="text-purple-600 mb-2" size={24} />
              <span className="text-sm font-medium text-purple-900">Jurnal</span>
            </button>
            <button 
              onClick={() => navigate('/teacher/materials')}
              className="flex flex-col items-center p-4 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors"
            >
              <FileText className="text-orange-600 mb-2" size={24} />
              <span className="text-sm font-medium text-orange-900">Materi</span>
            </button>
            <button 
              onClick={() => navigate('/teacher/class-ranking')}
              className="flex flex-col items-center p-4 bg-yellow-50 hover:bg-yellow-100 rounded-lg transition-colors"
            >
              <Crown className="text-yellow-600 mb-2" size={24} />
              <span className="text-sm font-medium text-yellow-900">Ranking Kelas</span>
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 sm:p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Statistik</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Absen Hari Ini</span>
              <span className="font-bold text-2xl text-green-600">
                {stats.attendanceToday}/{todaySchedules.length}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Kelas Diajar</span>
              <span className="font-bold text-2xl text-blue-600">{stats.totalClasses}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Total Siswa</span>
              <span className="font-bold text-2xl text-purple-600">{stats.totalStudents}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Total Tugas</span>
              <span className="font-bold text-2xl text-orange-600">{stats.totalTasks}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Total Materi</span>
              <span className="font-bold text-2xl text-indigo-600">{stats.totalMaterials}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}