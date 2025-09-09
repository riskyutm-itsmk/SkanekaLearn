import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { Clock, CheckCircle, XCircle, Calendar, Users, BookOpen, AlertCircle, MapPin, Navigation } from 'lucide-react';

interface Schedule {
  id: string;
  hari: string;
  jam_mulai: string;
  jam_selesai: string;
  subject: { nama_mapel: string };
  class: { 
    nama_kelas: string;
    tingkat: number;
    major: { kode_jurusan: string };
  };
}

interface TeacherAttendance {
  id: string;
  schedule_id: string;
  tanggal: string;
  jam_masuk: string | null;
  jam_pulang: string | null;
  status: string;
  keterangan: string | null;
  schedule: {
    hari: string;
    jam_mulai: string;
    jam_selesai: string;
    subject: { nama_mapel: string };
    class: { 
      nama_kelas: string;
      tingkat: number;
      major: { kode_jurusan: string };
    };
  };
}

interface LocationSetting {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radius: number;
  is_active: boolean;
}

export function AttendancePage() {
  const { profile } = useAuth();
  const [todaySchedules, setTodaySchedules] = useState<Schedule[]>([]);
  const [attendances, setAttendances] = useState<TeacherAttendance[]>([]);
  const [locationSettings, setLocationSettings] = useState<LocationSetting[]>([]);
  const [userLocation, setUserLocation] = useState<{latitude: number, longitude: number} | null>(null);
  const [locationError, setLocationError] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    if (profile) {
      fetchTodaySchedules();
      fetchAttendances();
      fetchLocationSettings();
      getCurrentLocation();
    }
    
    // Update current time every second
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, [profile, selectedDate]);

  async function fetchLocationSettings() {
    try {
      const { data, error } = await supabase
        .from('location_settings')
        .select('*')
        .eq('is_active', true);

      if (error) throw error;
      setLocationSettings(data || []);
    } catch (error) {
      console.error('Error fetching location settings:', error);
    }
  }

  function getCurrentLocation() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
          setLocationError('');
        },
        (error) => {
          setLocationError('Tidak dapat mengakses lokasi: ' + error.message);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000 // 5 minutes
        }
      );
    } else {
      setLocationError('Browser tidak mendukung geolocation');
    }
  }

  function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // Distance in meters
  }

  function isWithinAllowedLocation(): { allowed: boolean; nearestLocation?: LocationSetting; distance?: number } {
    if (!userLocation || locationSettings.length === 0) {
      return { allowed: false };
    }

    for (const location of locationSettings) {
      const distance = calculateDistance(
        userLocation.latitude,
        userLocation.longitude,
        location.latitude,
        location.longitude
      );

      if (distance <= location.radius) {
        return { allowed: true, nearestLocation: location, distance };
      }
    }

    // Find nearest location for error message
    const nearestLocation = locationSettings.reduce((nearest, location) => {
      const distance = calculateDistance(
        userLocation.latitude,
        userLocation.longitude,
        location.latitude,
        location.longitude
      );
      
      if (!nearest || distance < nearest.distance) {
        return { location, distance };
      }
      return nearest;
    }, null as { location: LocationSetting; distance: number } | null);

    return { 
      allowed: false, 
      nearestLocation: nearestLocation?.location,
      distance: nearestLocation?.distance 
    };
  }

  async function fetchTodaySchedules() {
    try {
      const dayName = format(new Date(selectedDate), 'EEEE', { locale: id });
      
      const { data, error } = await supabase
        .from('schedules')
        .select(`
          id,
          hari,
          jam_mulai,
          jam_selesai,
          subject:subjects(nama_mapel),
          class:classes(
            nama_kelas,
            tingkat,
            major:majors(kode_jurusan)
          )
        `)
        .eq('guru_id', profile?.id)
        .eq('hari', dayName)
        .order('jam_mulai', { ascending: true });

      if (error) throw error;
      setTodaySchedules(data || []);
    } catch (error) {
      console.error('Error fetching schedules:', error);
    }
  }

  async function fetchAttendances() {
    try {
      const { data, error } = await supabase
        .from('teacher_attendance')
        .select(`
          *,
          schedule:schedules(
            hari,
            jam_mulai,
            jam_selesai,
            subject:subjects(nama_mapel),
            class:classes(
              nama_kelas,
              tingkat,
              major:majors(kode_jurusan)
            )
          )
        `)
        .eq('guru_id', profile?.id)
        .gte('tanggal', format(new Date(selectedDate).setDate(new Date(selectedDate).getDate() - 30), 'yyyy-MM-dd'))
        .lte('tanggal', selectedDate)
        .order('tanggal', { ascending: false });

      if (error) throw error;
      setAttendances(data || []);
    } catch (error) {
      console.error('Error fetching attendances:', error);
    } finally {
      setLoading(false);
    }
  }

  async function markAttendance(scheduleId: string, type: 'masuk' | 'pulang', status?: string, keterangan?: string) {
    // Check location first
    const locationCheck = isWithinAllowedLocation();
    
    if (!locationCheck.allowed) {
      if (locationError) {
        alert('Error lokasi: ' + locationError + '\n\nSilakan aktifkan GPS dan refresh halaman.');
        return;
      }
      
      if (locationCheck.nearestLocation && locationCheck.distance) {
        alert(
          `Anda berada di luar area absensi!\n\n` +
          `Lokasi terdekat: ${locationCheck.nearestLocation.name}\n` +
          `Jarak Anda: ${Math.round(locationCheck.distance)}m\n` +
          `Radius yang diizinkan: ${locationCheck.nearestLocation.radius}m\n\n` +
          `Silakan mendekati lokasi sekolah untuk melakukan absensi.`
        );
      } else {
        alert('Tidak ada lokasi absensi yang tersedia atau Anda berada terlalu jauh dari semua lokasi.');
      }
      return;
    }

    try {
      if (!profile?.id) {
        alert('Error: User tidak valid. Silakan login ulang.');
        return;
      }

      const now = format(new Date(), 'HH:mm:ss');
      const existingAttendance = attendances.find(
        att => att.schedule_id === scheduleId && att.tanggal === selectedDate
      );

      if (existingAttendance) {
        // Update existing attendance
        const updateData: any = {};
        
        if (type === 'masuk') {
          updateData.jam_masuk = now;
          if (status) updateData.status = status;
          if (keterangan) updateData.keterangan = keterangan;
        } else {
          updateData.jam_pulang = now;
        }

        const { error } = await supabase
          .from('teacher_attendance')
          .update(updateData)
          .eq('id', existingAttendance.id);

        if (error) {
          throw error;
        }
      } else {
        // Create new attendance record
        const insertData: any = {
          guru_id: profile.id,
          schedule_id: scheduleId,
          tanggal: selectedDate,
          status: status || 'hadir'
        };

        if (type === 'masuk') {
          insertData.jam_masuk = now;
          if (keterangan) insertData.keterangan = keterangan;
        } else {
          insertData.jam_pulang = now;
        }

        const { error } = await supabase
          .from('teacher_attendance')
          .insert(insertData);

        if (error) {
          throw error;
        }
      }

      fetchAttendances();
    } catch (error) {
      console.error('Error marking attendance:', error);
      alert('Gagal mencatat kehadiran: ' + (error as any).message);
    }
  }

  const getAttendanceForSchedule = (scheduleId: string) => {
    return attendances.find(att => att.schedule_id === scheduleId && att.tanggal === selectedDate);
  };

  const todayAttendances = attendances.filter(att => att.tanggal === selectedDate);

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
        <h1 className="text-3xl font-bold text-gray-900">Absensi Saya</h1>
        <p className="text-gray-600 mt-2">Kelola kehadiran per mata pelajaran yang diampu</p>
      </div>

      {/* Date Selector */}
      <div className="bg-white rounded-xl p-6 border border-gray-200 mb-6">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Pilih Tanggal</h2>
            <p className="text-gray-600">Lihat jadwal dan absensi untuk tanggal tertentu</p>
          </div>
          <div className="flex flex-col lg:flex-row items-start lg:items-center gap-4">
            {/* Location Status */}
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center space-x-2 mb-2">
                <MapPin className="text-blue-600" size={16} />
                <span className="text-sm font-medium text-gray-700">Status Lokasi</span>
              </div>
              {locationError ? (
                <div className="text-xs text-red-600">
                  <p>{locationError}</p>
                  <button
                    onClick={getCurrentLocation}
                    className="text-blue-600 hover:text-blue-800 underline mt-1"
                  >
                    Coba Lagi
                  </button>
                </div>
              ) : userLocation ? (
                (() => {
                  const locationCheck = isWithinAllowedLocation();
                  return (
                    <div className={`text-xs ${locationCheck.allowed ? 'text-green-600' : 'text-red-600'}`}>
                      {locationCheck.allowed ? (
                        <div>
                          <p>✅ Dalam area absensi</p>
                          <p className="text-gray-500">
                            {locationCheck.nearestLocation?.name} 
                            ({Math.round(locationCheck.distance || 0)}m)
                          </p>
                        </div>
                      ) : (
                        <div>
                          <p>❌ Di luar area absensi</p>
                          {locationCheck.nearestLocation && (
                            <p className="text-gray-500">
                              Terdekat: {locationCheck.nearestLocation.name} 
                              ({Math.round(locationCheck.distance || 0)}m)
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })()
              ) : (
                <div className="text-xs text-yellow-600">
                  <p>📍 Mengambil lokasi...</p>
                </div>
              )}
            </div>
            
            <div className="text-left lg:text-right">
              <p className="text-2xl font-bold text-blue-600">
                {format(currentTime, 'HH:mm:ss')}
              </p>
              <p className="text-sm text-gray-500">Waktu Sekarang</p>
            </div>
          </div>
        </div>
      </div>

      {/* Today's Schedules */}
      <div className="bg-white rounded-xl border border-gray-200 mb-8">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <Calendar className="text-blue-600" size={24} />
            <h3 className="text-lg font-semibold text-gray-900">
              Jadwal {format(new Date(selectedDate), 'EEEE, dd MMMM yyyy', { locale: id })}
            </h3>
            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm">
              {todaySchedules.length} mata pelajaran
            </span>
          </div>
        </div>

        {todaySchedules.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="mx-auto text-gray-400 mb-4" size={48} />
            <p className="text-gray-500">Tidak ada jadwal mengajar pada tanggal ini</p>
          </div>
        ) : (
          <div className="p-6">
            <div className="space-y-4">
              {todaySchedules.map((schedule) => {
                const attendance = getAttendanceForSchedule(schedule.id);
                
                return (
                  <div key={schedule.id} className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 sm:p-6 border border-blue-100">
                    <div className="flex flex-col sm:flex-row items-start justify-between mb-4 gap-4">
                      <div className="flex items-center space-x-3 sm:space-x-4 flex-1">
                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                          <BookOpen className="text-blue-600" size={24} />
                        </div>
                        <div>
                          <h4 className="font-bold text-base sm:text-lg text-gray-900">{schedule.subject.nama_mapel}</h4>
                          <p className="text-sm sm:text-base text-gray-600">
                            Kelas {schedule.class.tingkat} {schedule.class.nama_kelas} - {schedule.class.major.kode_jurusan}
                          </p>
                          <p className="text-sm text-gray-500">
                            {schedule.jam_mulai} - {schedule.jam_selesai}
                          </p>
                        </div>
                      </div>
                      
                      <div className={`px-3 py-1 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap ${
                        attendance?.status === 'hadir' ? 'bg-green-100 text-green-800' :
                        attendance?.status === 'izin' ? 'bg-yellow-100 text-yellow-800' :
                        attendance?.status === 'sakit' ? 'bg-blue-100 text-blue-800' :
                        attendance?.status === 'tidak_hadir' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {attendance?.status || 'Belum Absen'}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-4">
                      <div className="bg-white rounded-lg p-4">
                        <div className="flex items-center space-x-3">
                          <Clock className="text-green-600" size={20} />
                          <div>
                            <p className="text-sm text-gray-600">Mulai KBM</p>
                            <p className="font-semibold text-green-800">
                              {attendance?.jam_masuk || '-'}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-white rounded-lg p-4">
                        <div className="flex items-center space-x-3">
                          <Clock className="text-red-600" size={20} />
                          <div>
                            <p className="text-sm text-gray-600">Selesai KBM</p>
                            <p className="font-semibold text-red-800">
                              {attendance?.jam_pulang || '-'}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-white rounded-lg p-4">
                        <div className="flex items-center space-x-3">
                          <AlertCircle className="text-gray-600" size={20} />
                          <div>
                            <p className="text-sm text-gray-600">Keterangan</p>
                            <p className="font-semibold text-gray-800">
                              {attendance?.keterangan || '-'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 sm:gap-3">
                      {!attendance?.jam_masuk && (
                        <>
                          <button
                            onClick={() => markAttendance(schedule.id, 'masuk', 'hadir')}
                            className="bg-green-500 text-white py-2 px-3 sm:px-4 rounded-lg hover:bg-green-600 transition-colors flex items-center space-x-1 sm:space-x-2 text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={!isWithinAllowedLocation().allowed}
                          >
                            <CheckCircle size={16} />
                            <span>Mulai KBM</span>
                          </button>
                          <button
                            onClick={() => {
                              const keterangan = prompt('Keterangan izin:');
                              if (keterangan !== null) {
                                markAttendance(schedule.id, 'masuk', 'izin', keterangan);
                              }
                            }}
                            className="bg-yellow-500 text-white py-2 px-3 sm:px-4 rounded-lg hover:bg-yellow-600 transition-colors flex items-center space-x-1 sm:space-x-2 text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={!isWithinAllowedLocation().allowed}
                          >
                            <AlertCircle size={16} />
                            <span>Izin</span>
                          </button>
                          <button
                            onClick={() => {
                              const keterangan = prompt('Keterangan sakit:');
                              if (keterangan !== null) {
                                markAttendance(schedule.id, 'masuk', 'sakit', keterangan);
                              }
                            }}
                            className="bg-blue-500 text-white py-2 px-3 sm:px-4 rounded-lg hover:bg-blue-600 transition-colors flex items-center space-x-1 sm:space-x-2 text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={!isWithinAllowedLocation().allowed}
                          >
                            <Clock size={16} />
                            <span>Sakit</span>
                          </button>
                        </>
                      )}
                      
                      {attendance?.jam_masuk && !attendance?.jam_pulang && attendance.status === 'hadir' && (
                        <button
                          onClick={() => markAttendance(schedule.id, 'pulang')}
                          className="bg-red-500 text-white py-2 px-3 sm:px-4 rounded-lg hover:bg-red-600 transition-colors flex items-center space-x-1 sm:space-x-2 text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed"
                          disabled={!isWithinAllowedLocation().allowed}
                        >
                          <XCircle size={16} />
                          <span>Selesai Kelas</span>
                        </button>
                      )}
                      
                      {attendance?.jam_masuk && attendance?.jam_pulang && (
                        <div className="bg-gray-100 text-gray-600 py-2 px-3 sm:px-4 rounded-lg flex items-center text-sm sm:text-base">
                          <span>Absensi Lengkap</span>
                        </div>
                      )}
                    </div>
                    
                    {/* Location warning for disabled buttons */}
                    {!isWithinAllowedLocation().allowed && !attendance?.jam_masuk && (
                      <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <div className="flex items-center space-x-2">
                          <MapPin className="text-yellow-600" size={16} />
                          <p className="text-xs text-yellow-800">
                            Anda harus berada di area sekolah untuk melakukan absensi
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Attendance History */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <Users className="text-blue-600" size={24} />
            <h3 className="text-lg font-semibold text-gray-900">Riwayat Kehadiran (30 Hari Terakhir)</h3>
          </div>
        </div>

        <div className="overflow-x-auto -mx-6 sm:mx-0">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tanggal
                </th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Mata Pelajaran
                </th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                  Kelas
                </th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Mulai KBM
                </th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Selesai Kelas
                </th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                  Keterangan
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {attendances.map((attendance) => (
                <tr key={attendance.id} className="hover:bg-gray-50">
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                    {format(new Date(attendance.tanggal), 'dd MMM yyyy', { locale: id })}
                  </td>
                  <td className="px-3 sm:px-6 py-4 text-xs sm:text-sm text-gray-900">
                    <div className="font-medium">{attendance.schedule.subject.nama_mapel}</div>
                    <div className="text-xs text-gray-500 sm:hidden">
                      {attendance.schedule.class.tingkat} {attendance.schedule.class.nama_kelas}
                    </div>
                  </td>
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900 hidden sm:table-cell">
                    {attendance.schedule.class.tingkat} {attendance.schedule.class.nama_kelas}
                  </td>
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                    {attendance.jam_masuk || '-'}
                  </td>
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                    {attendance.jam_pulang || '-'}
                  </td>
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      attendance.status === 'hadir' ? 'bg-green-100 text-green-800' :
                      attendance.status === 'izin' ? 'bg-yellow-100 text-yellow-800' :
                      attendance.status === 'sakit' ? 'bg-blue-100 text-blue-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {attendance.status}
                    </span>
                  </td>
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500 hidden lg:table-cell">
                    {attendance.keterangan || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {attendances.length === 0 && (
          <div className="text-center py-12">
            <Users className="mx-auto text-gray-400 mb-4" size={48} />
            <p className="text-gray-500">Belum ada data kehadiran</p>
          </div>
        )}
      </div>
    </div>
  );
}