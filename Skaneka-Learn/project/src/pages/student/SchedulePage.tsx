import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { Calendar, Clock, BookOpen, User, MapPin } from 'lucide-react';

interface Schedule {
  id: string;
  hari: string;
  jam_mulai: string;
  jam_selesai: string;
  subject: { nama_mapel: string };
  guru: { nama: string };
}

interface StudentClass {
  kelas: {
    id: string;
    nama_kelas: string;
    tingkat: number;
    major: { nama_jurusan: string; kode_jurusan: string };
  };
}

const DAYS = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

export function SchedulePage() {
  const { profile } = useAuth();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [studentClass, setStudentClass] = useState<StudentClass | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState('');

  useEffect(() => {
    if (profile) {
      fetchStudentSchedule();
    }
  }, [profile]);

  async function fetchStudentSchedule() {
    try {
      // Get student's current class
      const { data: classData } = await supabase
        .from('students_classes')
        .select(`
          kelas:classes(
            id,
            nama_kelas,
            tingkat,
            major:majors(nama_jurusan, kode_jurusan)
          )
        `)
        .eq('siswa_id', profile?.id)
        .eq('status', 'aktif')
        .maybeSingle();

      setStudentClass(classData);

      if (classData) {
        // Get schedules for the class
        const { data: schedulesData } = await supabase
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
          .order('hari', { ascending: true });

        setSchedules(schedulesData || []);
      }
    } catch (error) {
      console.error('Error fetching schedule:', error);
    } finally {
      setLoading(false);
    }
  }

  const filteredSchedules = selectedDay 
    ? schedules.filter(schedule => schedule.hari === selectedDay)
    : schedules;

  const groupedSchedules = DAYS.reduce((acc, day) => {
    acc[day] = filteredSchedules.filter(schedule => schedule.hari === day);
    return acc;
  }, {} as Record<string, Schedule[]>);

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
        <h1 className="text-3xl font-bold text-gray-900">Jadwal Pelajaran</h1>
        <p className="text-gray-600 mt-2">Lihat jadwal pelajaran mingguan Anda</p>
        {studentClass && (
          <div className="mt-4 bg-blue-50 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <MapPin className="text-blue-600" size={20} />
              <div>
                <p className="font-semibold text-blue-900">
                  Kelas {studentClass.kelas.tingkat} {studentClass.kelas.nama_kelas}
                </p>
                <p className="text-blue-700 text-sm">
                  {studentClass.kelas.major.nama_jurusan} ({studentClass.kelas.major.kode_jurusan})
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Filter */}
      <div className="bg-white rounded-xl p-6 border border-gray-200 mb-6">
        <div className="flex items-center space-x-4">
          <Calendar className="text-blue-600" size={20} />
          <select
            value={selectedDay}
            onChange={(e) => setSelectedDay(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Semua Hari</option>
            {DAYS.map(day => (
              <option key={day} value={day}>{day}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Schedule Grid */}
      <div className="space-y-6">
        {(selectedDay ? [selectedDay] : DAYS).map(day => (
          <div key={day} className="bg-white rounded-xl border border-gray-200">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Calendar className="text-blue-600" size={24} />
                  <h2 className="text-xl font-bold text-gray-900">{day}</h2>
                </div>
                <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                  {groupedSchedules[day].length} mata pelajaran
                </span>
              </div>
            </div>
            
            {groupedSchedules[day].length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <BookOpen className="mx-auto mb-2" size={32} />
                <p>Tidak ada jadwal</p>
              </div>
            ) : (
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {groupedSchedules[day].map(schedule => (
                    <div key={schedule.id} className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-100 hover:shadow-md transition-shadow">
                      <div className="flex items-center space-x-3 mb-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <BookOpen className="text-blue-600" size={20} />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-bold text-gray-900">{schedule.subject.nama_mapel}</h3>
                          <div className="flex items-center space-x-1 text-sm text-gray-600">
                            <User size={14} />
                            <span>{schedule.guru.nama}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 text-blue-700 bg-blue-100 rounded-lg px-3 py-2">
                        <Clock size={16} />
                        <span className="font-medium">
                          {schedule.jam_mulai} - {schedule.jam_selesai}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}