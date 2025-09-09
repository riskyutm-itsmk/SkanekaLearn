import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { format, endOfMonth } from 'date-fns';
import { id } from 'date-fns/locale';
import { Calendar, CheckCircle, XCircle, Clock, AlertCircle, TrendingUp, Users } from 'lucide-react';

interface Attendance {
  id: string;
  status: string;
  tanggal: string;
  keterangan: string | null;
  schedule: {
    hari: string;
    jam_mulai: string;
    jam_selesai: string;
    subject: { nama_mapel: string };
    guru: { nama: string };
  };
}

interface AttendanceStats {
  total: number;
  hadir: number;
  tidak_hadir: number;
  izin: number;
  sakit: number;
  percentage: number;
}

export function AttendancePage() {
  const { profile } = useAuth();
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [stats, setStats] = useState<AttendanceStats>({
    total: 0,
    hadir: 0,
    tidak_hadir: 0,
    izin: 0,
    sakit: 0,
    percentage: 0
  });
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile) {
      fetchAttendance();
    }
  }, [profile, selectedMonth]);

  async function fetchAttendance() {
    try {
      // Get attendance records
      const startDate = `${selectedMonth}-01`;
      const endDate = format(endOfMonth(new Date(selectedMonth)), 'yyyy-MM-dd');

      const { data: attendanceData } = await supabase
        .from('attendance')
        .select(`
          id,
          status,
          tanggal,
          keterangan,
          schedule:schedules(
            hari,
            jam_mulai,
            jam_selesai,
            subject:subjects(nama_mapel),
            guru:users(nama)
          )
        `)
        .eq('siswa_id', profile?.id)
        .gte('tanggal', startDate)
        .lte('tanggal', endDate)
        .order('tanggal', { ascending: false });

      setAttendances(attendanceData || []);

      // Calculate stats
      const total = attendanceData?.length || 0;
      const hadir = attendanceData?.filter(a => a.status === 'hadir').length || 0;
      const tidak_hadir = attendanceData?.filter(a => a.status === 'tidak_hadir').length || 0;
      const izin = attendanceData?.filter(a => a.status === 'izin').length || 0;
      const sakit = attendanceData?.filter(a => a.status === 'sakit').length || 0;
      const percentage = total > 0 ? Math.round((hadir / total) * 100) : 0;

      setStats({ total, hadir, tidak_hadir, izin, sakit, percentage });
    } catch (error) {
      console.error('Error fetching attendance:', error);
    } finally {
      setLoading(false);
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'hadir':
        return <CheckCircle className="text-green-600" size={20} />;
      case 'tidak_hadir':
        return <XCircle className="text-red-600" size={20} />;
      case 'izin':
        return <AlertCircle className="text-yellow-600" size={20} />;
      case 'sakit':
        return <Clock className="text-blue-600" size={20} />;
      default:
        return <AlertCircle className="text-gray-600" size={20} />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'hadir':
        return 'bg-green-100 text-green-800';
      case 'tidak_hadir':
        return 'bg-red-100 text-red-800';
      case 'izin':
        return 'bg-yellow-100 text-yellow-800';
      case 'sakit':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
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
        <h1 className="text-3xl font-bold text-gray-900">Presensi Saya</h1>
        <p className="text-gray-600 mt-2">Lihat riwayat kehadiran dan statistik presensi Anda</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <Users className="text-gray-600" size={24} />
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Hadir</p>
              <p className="text-2xl font-bold text-green-600">{stats.hadir}</p>
            </div>
            <CheckCircle className="text-green-600" size={24} />
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Tidak Hadir</p>
              <p className="text-2xl font-bold text-red-600">{stats.tidak_hadir}</p>
            </div>
            <XCircle className="text-red-600" size={24} />
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Izin</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.izin}</p>
            </div>
            <AlertCircle className="text-yellow-600" size={24} />
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Persentase</p>
              <p className="text-2xl font-bold text-blue-600">{stats.percentage}%</p>
            </div>
            <TrendingUp className="text-blue-600" size={24} />
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="bg-white rounded-xl p-6 border border-gray-200 mb-6">
        <div className="flex items-center space-x-4">
          <Calendar className="text-blue-600" size={20} />
          <label className="text-sm font-medium text-gray-700">Pilih Bulan:</label>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Attendance List */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Riwayat Presensi - {format(new Date(selectedMonth), 'MMMM yyyy', { locale: id })}
          </h3>
        </div>

        {attendances.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="mx-auto text-gray-400 mb-4" size={48} />
            <p className="text-gray-500">Tidak ada data presensi untuk bulan ini</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {attendances.map((attendance) => (
              <div key={attendance.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      {getStatusIcon(attendance.status)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h4 className="font-semibold text-gray-900">
                          {attendance.schedule.subject.nama_mapel}
                        </h4>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(attendance.status)}`}>
                          {attendance.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-1">
                        Guru: {attendance.schedule.guru.nama}
                      </p>
                      <p className="text-sm text-gray-600 mb-1">
                        Waktu: {attendance.schedule.jam_mulai} - {attendance.schedule.jam_selesai}
                      </p>
                      {attendance.keterangan && (
                        <p className="text-sm text-gray-600">
                          Keterangan: {attendance.keterangan}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">
                      {format(new Date(attendance.tanggal), 'dd MMM yyyy', { locale: id })}
                    </p>
                    <p className="text-sm text-gray-500">
                      {attendance.schedule.hari}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}