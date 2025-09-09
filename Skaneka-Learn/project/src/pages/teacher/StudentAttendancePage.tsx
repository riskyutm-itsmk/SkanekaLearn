import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { Users, Calendar, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';

interface Schedule {
  id: string;
  hari: string;
  jam_mulai: string;
  jam_selesai: string;
  subject: { nama_mapel: string };
  class: { 
    id: string;
    nama_kelas: string;
    tingkat: number;
    major: { kode_jurusan: string };
  };
}

interface Student {
  id: string;
  nama: string;
  email: string;
}

interface Attendance {
  id: string;
  siswa_id: string;
  status: string;
  keterangan: string | null;
  student: { nama: string };
}

export function StudentAttendancePage() {
  const { profile } = useAuth();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile) {
      fetchSchedules();
    }
  }, [profile]);

  useEffect(() => {
    if (selectedSchedule) {
      fetchStudentsAndAttendance();
    }
  }, [selectedSchedule, selectedDate]);

  async function fetchSchedules() {
    try {
      const { data, error } = await supabase
        .from('schedules')
        .select(`
          id,
          hari,
          jam_mulai,
          jam_selesai,
          subject:subjects(nama_mapel),
          class:classes(
            id,
            nama_kelas,
            tingkat,
            major:majors(kode_jurusan)
          )
        `)
        .eq('guru_id', profile?.id)
        .order('hari', { ascending: true });

      if (error) throw error;
      setSchedules(data || []);
      
      // Auto select first schedule
      if (data && data.length > 0) {
        setSelectedSchedule(data[0]);
      }
    } catch (error) {
      console.error('Error fetching schedules:', error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchStudentsAndAttendance() {
    if (!selectedSchedule) return;

    try {
      // Fetch students in the class
      const { data: studentsData, error: studentsError } = await supabase
        .from('students_classes')
        .select(`
          siswa_id,
          student:users(id, nama, email)
        `)
        .eq('kelas_id', selectedSchedule.class.id)
        .eq('status', 'aktif');

      if (studentsError) throw studentsError;

      const studentsList = studentsData?.map(sc => sc.student).filter(Boolean) || [];
      setStudents(studentsList);

      // Fetch existing attendance for selected date
      const { data: attendanceData, error: attendanceError } = await supabase
        .from('attendance')
        .select(`
          id,
          siswa_id,
          status,
          keterangan,
          student:users(nama)
        `)
        .eq('schedule_id', selectedSchedule.id)
        .eq('tanggal', selectedDate);

      if (attendanceError) throw attendanceError;
      setAttendances(attendanceData || []);
    } catch (error) {
      console.error('Error fetching students and attendance:', error);
    }
  }

  async function markAttendance(studentId: string, status: string, keterangan?: string) {
    if (!selectedSchedule) return;

    try {
      const existingAttendance = attendances.find(att => att.siswa_id === studentId);

      if (existingAttendance) {
        // Update existing attendance
        const { error } = await supabase
          .from('attendance')
          .update({ status, keterangan: keterangan || null })
          .eq('id', existingAttendance.id);

        if (error) throw error;
      } else {
        // Create new attendance
        const { error } = await supabase
          .from('attendance')
          .insert({
            schedule_id: selectedSchedule.id,
            siswa_id: studentId,
            status,
            tanggal: selectedDate,
            keterangan: keterangan || null
          });

        if (error) throw error;
      }

      fetchStudentsAndAttendance();
    } catch (error) {
      console.error('Error marking attendance:', error);
      alert('Gagal menyimpan absensi');
    }
  }

  async function markAllPresent() {
    if (!selectedSchedule) return;

    try {
      const promises = students.map(student => {
        const existingAttendance = attendances.find(att => att.siswa_id === student.id);
        
        if (existingAttendance) {
          return supabase
            .from('attendance')
            .update({ status: 'hadir' })
            .eq('id', existingAttendance.id);
        } else {
          return supabase
            .from('attendance')
            .insert({
              schedule_id: selectedSchedule.id,
              siswa_id: student.id,
              status: 'hadir',
              tanggal: selectedDate
            });
        }
      });

      await Promise.all(promises);
      fetchStudentsAndAttendance();
    } catch (error) {
      console.error('Error marking all present:', error);
      alert('Gagal menandai semua hadir');
    }
  }

  const getAttendanceStatus = (studentId: string) => {
    return attendances.find(att => att.siswa_id === studentId)?.status || '';
  };

  const getAttendanceNote = (studentId: string) => {
    return attendances.find(att => att.siswa_id === studentId)?.keterangan || '';
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
        <h1 className="text-3xl font-bold text-gray-900">Absensi Siswa</h1>
        <p className="text-gray-600 mt-2">Kelola kehadiran siswa untuk setiap kelas</p>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-xl p-6 border border-gray-200 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Pilih Jadwal
            </label>
            <select
              value={selectedSchedule?.id || ''}
              onChange={(e) => {
                const schedule = schedules.find(s => s.id === e.target.value);
                setSelectedSchedule(schedule || null);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Pilih Jadwal</option>
              {schedules.map(schedule => (
                <option key={schedule.id} value={schedule.id}>
                  {schedule.hari} - {schedule.subject.nama_mapel} - {schedule.class.tingkat} {schedule.class.nama_kelas}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tanggal
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={markAllPresent}
              disabled={!selectedSchedule || students.length === 0}
              className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Tandai Semua Hadir
            </button>
          </div>
        </div>
      </div>

      {selectedSchedule && (
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {selectedSchedule.subject.nama_mapel}
                </h3>
                <p className="text-gray-600">
                  Kelas {selectedSchedule.class.tingkat} {selectedSchedule.class.nama_kelas} - {selectedSchedule.class.major.kode_jurusan}
                </p>
                <p className="text-sm text-gray-500">
                  {selectedSchedule.hari}, {selectedSchedule.jam_mulai} - {selectedSchedule.jam_selesai}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">Total Siswa</p>
                <p className="text-2xl font-bold text-blue-600">{students.length}</p>
              </div>
            </div>
          </div>

          {students.length === 0 ? (
            <div className="text-center py-12">
              <Users className="mx-auto text-gray-400 mb-4" size={48} />
              <p className="text-gray-500">Tidak ada siswa di kelas ini</p>
            </div>
          ) : (
            <div className="p-6">
              <div className="space-y-4">
                {students.map((student, index) => {
                  const status = getAttendanceStatus(student.id);
                  const note = getAttendanceNote(student.id);

                  return (
                    <div key={student.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-blue-600 font-medium">
                            {index + 1}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{student.nama}</p>
                          <p className="text-sm text-gray-600">{student.email}</p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => markAttendance(student.id, 'hadir')}
                          className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                            status === 'hadir'
                              ? 'bg-green-500 text-white'
                              : 'bg-gray-200 text-gray-700 hover:bg-green-100'
                          }`}
                        >
                          <CheckCircle size={16} className="inline mr-1" />
                          Hadir
                        </button>
                        <button
                          onClick={() => markAttendance(student.id, 'tidak_hadir')}
                          className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                            status === 'tidak_hadir'
                              ? 'bg-red-500 text-white'
                              : 'bg-gray-200 text-gray-700 hover:bg-red-100'
                          }`}
                        >
                          <XCircle size={16} className="inline mr-1" />
                          Tidak Hadir
                        </button>
                        <button
                          onClick={() => {
                            const keterangan = prompt('Keterangan izin:', note);
                            if (keterangan !== null) {
                              markAttendance(student.id, 'izin', keterangan);
                            }
                          }}
                          className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                            status === 'izin'
                              ? 'bg-yellow-500 text-white'
                              : 'bg-gray-200 text-gray-700 hover:bg-yellow-100'
                          }`}
                        >
                          <AlertCircle size={16} className="inline mr-1" />
                          Izin
                        </button>
                        <button
                          onClick={() => {
                            const keterangan = prompt('Keterangan sakit:', note);
                            if (keterangan !== null) {
                              markAttendance(student.id, 'sakit', keterangan);
                            }
                          }}
                          className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                            status === 'sakit'
                              ? 'bg-blue-500 text-white'
                              : 'bg-gray-200 text-gray-700 hover:bg-blue-100'
                          }`}
                        >
                          <Clock size={16} className="inline mr-1" />
                          Sakit
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}