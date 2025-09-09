import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { Trophy, Medal, Award, TrendingUp, TrendingDown, Users, Crown, Star, Target, Eye, X, Calendar, User } from 'lucide-react';

interface StudentRanking {
  student_id: string;
  student_name: string;
  student_email: string;
  total_points: number;
  prestasi_points: number;
  pelanggaran_points: number;
  rank: number;
  recent_points: {
    jenis: string;
    keterangan: string;
    poin: number;
    tanggal: string;
    guru_nama: string;
  }[];
}

interface StudentPointHistory {
  id: string;
  jenis: 'prestasi' | 'pelanggaran';
  keterangan: string;
  poin: number;
  tanggal: string;
  created_at: string;
  guru: {
    nama: string;
  };
}

interface ClassInfo {
  id: string;
  nama_kelas: string;
  tingkat: number;
  major: {
    nama_jurusan: string;
    kode_jurusan: string;
  };
}

export function ClassRankingPage() {
  const { profile } = useAuth();
  const [rankings, setRankings] = useState<StudentRanking[]>([]);
  const [classInfo, setClassInfo] = useState<ClassInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [showAllTime, setShowAllTime] = useState(true);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentRanking | null>(null);
  const [studentHistory, setStudentHistory] = useState<StudentPointHistory[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    if (profile) {
      fetchClassRanking();
    }
  }, [profile, selectedMonth, showAllTime]);

  async function fetchStudentHistory(studentId: string) {
    setHistoryLoading(true);
    try {
      const { data, error } = await supabase
        .from('points')
        .select(`
          id,
          jenis,
          keterangan,
          poin,
          tanggal,
          created_at,
          guru:users!points_guru_id_fkey(nama)
        `)
        .eq('siswa_id', studentId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setStudentHistory(data || []);
    } catch (error) {
      console.error('Error fetching student history:', error);
      alert('Error mengambil riwayat poin: ' + (error as any).message);
    } finally {
      setHistoryLoading(false);
    }
  }

  async function fetchClassRanking() {
    try {
      // Get class where this teacher is homeroom teacher (wali kelas)
      const { data: classData, error: classError } = await supabase
        .from('classes')
        .select(`
          id,
          nama_kelas,
          tingkat,
          major:majors(nama_jurusan, kode_jurusan)
        `)
        .eq('wali_kelas', profile?.id)
        .maybeSingle();

      if (classError) throw classError;
      
      if (!classData) {
        setClassInfo(null);
        setRankings([]);
        return;
      }

      setClassInfo(classData);

      // Get students in this class
      const { data: studentsData, error: studentsError } = await supabase
        .from('students_classes')
        .select(`
          siswa_id,
          student:users!students_classes_siswa_id_fkey(id, nama, email)
        `)
        .eq('kelas_id', classData.id)
        .eq('status', 'aktif');

      if (studentsError) throw studentsError;

      const students = studentsData?.map(sc => sc.student).filter(Boolean) || [];

      // Get points for all students
      let pointsQuery = supabase
        .from('points')
        .select(`
          siswa_id,
          jenis,
          keterangan,
          poin,
          tanggal,
          created_at,
          guru:users!points_guru_id_fkey(nama)
        `)
        .in('siswa_id', students.map(s => s.id));

      // Apply date filter if not showing all time
      if (!showAllTime) {
        const startDate = `${selectedMonth}-01`;
        const endDate = `${selectedMonth}-31`;
        pointsQuery = pointsQuery.gte('tanggal', startDate).lte('tanggal', endDate);
      }

      const { data: pointsData, error: pointsError } = await pointsQuery.order('created_at', { ascending: false });

      if (pointsError) throw pointsError;

      // Calculate rankings
      const studentRankings: StudentRanking[] = students.map(student => {
        const studentPoints = pointsData?.filter(p => p.siswa_id === student.id) || [];
        
        const prestasiPoints = studentPoints
          .filter(p => p.jenis === 'prestasi')
          .reduce((sum, p) => sum + p.poin, 0);
        
        const pelanggaranPoints = studentPoints
          .filter(p => p.jenis === 'pelanggaran')
          .reduce((sum, p) => sum + Math.abs(p.poin), 0);

        const totalPoints = prestasiPoints - pelanggaranPoints;

        // Get recent 3 points for this student
        const recentPoints = studentPoints.slice(0, 3).map(p => ({
          jenis: p.jenis,
          keterangan: p.keterangan,
          poin: p.poin,
          tanggal: p.tanggal,
          guru_nama: p.guru.nama
        }));

        return {
          student_id: student.id,
          student_name: student.nama,
          student_email: student.email,
          total_points: totalPoints,
          prestasi_points: prestasiPoints,
          pelanggaran_points: pelanggaranPoints,
          rank: 0, // Will be set after sorting
          recent_points: recentPoints
        };
      });

      // Sort by total points and assign ranks
      studentRankings.sort((a, b) => b.total_points - a.total_points);
      studentRankings.forEach((student, index) => {
        student.rank = index + 1;
      });

      setRankings(studentRankings);
    } catch (error) {
      console.error('Error fetching class ranking:', error);
      alert('Error mengambil data ranking: ' + (error as any).message);
    } finally {
      setLoading(false);
    }
  }

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="text-yellow-500" size={24} />;
      case 2:
        return <Medal className="text-gray-400" size={24} />;
      case 3:
        return <Award className="text-amber-600" size={24} />;
      default:
        return <Trophy className="text-gray-300" size={24} />;
    }
  };

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1:
        return 'from-yellow-50 to-amber-50 border-yellow-200';
      case 2:
        return 'from-gray-50 to-slate-50 border-gray-200';
      case 3:
        return 'from-amber-50 to-orange-50 border-amber-200';
      default:
        return 'from-blue-50 to-indigo-50 border-blue-100';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!classInfo) {
    return (
      <div className="text-center py-12">
        <Users className="mx-auto text-gray-400 mb-4" size={48} />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Tidak Ada Kelas Wali</h2>
        <p className="text-gray-600">Anda belum ditugaskan sebagai wali kelas</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Ranking Poin Kelas</h1>
        <p className="text-gray-600 mt-2">
          Ranking poin siswa di kelas {classInfo.tingkat} {classInfo.nama_kelas} - {classInfo.major.kode_jurusan}
        </p>
      </div>

      {/* Class Info Card */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl p-6 mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2">
              Kelas {classInfo.tingkat} {classInfo.nama_kelas}
            </h2>
            <p className="text-blue-100">
              {classInfo.major.nama_jurusan} ({classInfo.major.kode_jurusan})
            </p>
            <p className="text-blue-100 mt-1">
              Total Siswa: {rankings.length}
            </p>
          </div>
          <div className="text-right">
            <div className="bg-white bg-opacity-20 rounded-lg p-4">
              <Crown className="text-yellow-300 mb-2" size={32} />
              <p className="text-sm">Wali Kelas</p>
              <p className="font-semibold">{profile?.nama}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-6 border border-gray-200 mb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex items-center space-x-4">
            <label className="flex items-center space-x-2">
              <input
                type="radio"
                name="timeFilter"
                checked={showAllTime}
                onChange={() => setShowAllTime(true)}
                className="text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">Sepanjang Waktu</span>
            </label>
            <label className="flex items-center space-x-2">
              <input
                type="radio"
                name="timeFilter"
                checked={!showAllTime}
                onChange={() => setShowAllTime(false)}
                className="text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">Per Bulan</span>
            </label>
          </div>
          
          {!showAllTime && (
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          )}
        </div>
      </div>

      {/* Top 3 Podium */}
      {rankings.length >= 3 && (
        <div className="bg-white rounded-xl p-8 border border-gray-200 mb-8">
          <h3 className="text-xl font-semibold text-gray-900 mb-6 text-center">🏆 Top 3 Siswa Terbaik</h3>
          <div className="flex justify-center items-end space-x-8">
            {/* 2nd Place */}
            <div className="text-center">
              <div className="bg-gradient-to-br from-gray-100 to-slate-100 rounded-xl p-6 border-2 border-gray-300 mb-4">
                <Medal className="text-gray-400 mx-auto mb-3" size={40} />
                <h4 className="font-bold text-lg text-gray-900">{rankings[1]?.student_name}</h4>
                <p className="text-2xl font-bold text-gray-600 mt-2">{rankings[1]?.total_points}</p>
                <p className="text-sm text-gray-500">poin</p>
                <button
                  onClick={() => {
                    setSelectedStudent(rankings[1]);
                    fetchStudentHistory(rankings[1].student_id);
                    setShowHistoryModal(true);
                  }}
                  className="mt-3 bg-gray-500 text-white px-3 py-1 rounded-lg hover:bg-gray-600 transition-colors flex items-center space-x-1 mx-auto"
                >
                  <Eye size={14} />
                  <span className="text-xs">Detail</span>
                </button>
              </div>
              <div className="bg-gray-300 h-20 w-24 rounded-t-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">2</span>
              </div>
            </div>

            {/* 1st Place */}
            <div className="text-center">
              <div className="bg-gradient-to-br from-yellow-100 to-amber-100 rounded-xl p-8 border-2 border-yellow-400 mb-4 transform scale-110">
                <Crown className="text-yellow-500 mx-auto mb-3" size={48} />
                <h4 className="font-bold text-xl text-gray-900">{rankings[0]?.student_name}</h4>
                <p className="text-3xl font-bold text-yellow-600 mt-2">{rankings[0]?.total_points}</p>
                <p className="text-sm text-yellow-700">poin</p>
                <button
                  onClick={() => {
                    setSelectedStudent(rankings[0]);
                    fetchStudentHistory(rankings[0].student_id);
                    setShowHistoryModal(true);
                  }}
                  className="mt-3 bg-yellow-500 text-white px-3 py-1 rounded-lg hover:bg-yellow-600 transition-colors flex items-center space-x-1 mx-auto"
                >
                  <Eye size={14} />
                  <span className="text-xs">Detail</span>
                </button>
              </div>
              <div className="bg-yellow-400 h-32 w-24 rounded-t-lg flex items-center justify-center">
                <span className="text-white font-bold text-2xl">1</span>
              </div>
            </div>

            {/* 3rd Place */}
            <div className="text-center">
              <div className="bg-gradient-to-br from-amber-100 to-orange-100 rounded-xl p-6 border-2 border-amber-400 mb-4">
                <Award className="text-amber-600 mx-auto mb-3" size={40} />
                <h4 className="font-bold text-lg text-gray-900">{rankings[2]?.student_name}</h4>
                <p className="text-2xl font-bold text-amber-600 mt-2">{rankings[2]?.total_points}</p>
                <p className="text-sm text-amber-700">poin</p>
                <button
                  onClick={() => {
                    setSelectedStudent(rankings[2]);
                    fetchStudentHistory(rankings[2].student_id);
                    setShowHistoryModal(true);
                  }}
                  className="mt-3 bg-amber-500 text-white px-3 py-1 rounded-lg hover:bg-amber-600 transition-colors flex items-center space-x-1 mx-auto"
                >
                  <Eye size={14} />
                  <span className="text-xs">Detail</span>
                </button>
              </div>
              <div className="bg-amber-500 h-16 w-24 rounded-t-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">3</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Full Rankings Table */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">
              Ranking Lengkap - {showAllTime ? 'Sepanjang Waktu' : format(new Date(selectedMonth), 'MMMM yyyy', { locale: id })}
            </h3>
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Users size={16} />
              <span>{rankings.length} siswa</span>
            </div>
          </div>
        </div>

        {rankings.length === 0 ? (
          <div className="text-center py-12">
            <Trophy className="mx-auto text-gray-400 mb-4" size={48} />
            <p className="text-gray-500">Belum ada data poin untuk kelas ini</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {rankings.map((student) => (
              <div key={student.student_id} className={`p-6 hover:bg-gray-50 transition-colors bg-gradient-to-r ${getRankColor(student.rank)}`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4 flex-1">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center border-2 border-gray-200">
                        {getRankIcon(student.rank)}
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-gray-900">#{student.rank}</p>
                      </div>
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-3">
                        <h3 className="text-lg font-bold text-gray-900">{student.student_name}</h3>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          student.total_points >= 0 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {student.total_points >= 0 ? '+' : ''}{student.total_points} poin
                        </span>
                        <button
                          onClick={() => {
                            setSelectedStudent(student);
                            fetchStudentHistory(student.student_id);
                            setShowHistoryModal(true);
                          }}
                          className="bg-blue-500 text-white px-2 py-1 rounded-lg hover:bg-blue-600 transition-colors flex items-center space-x-1"
                          title="Lihat Riwayat Poin"
                        >
                          <Eye size={14} />
                          <span className="text-xs">Riwayat</span>
                        </button>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="bg-white bg-opacity-70 rounded-lg p-3">
                          <div className="flex items-center space-x-2">
                            <TrendingUp className="text-green-600" size={16} />
                            <span className="text-sm font-medium text-gray-700">Prestasi</span>
                          </div>
                          <p className="text-xl font-bold text-green-600">+{student.prestasi_points}</p>
                        </div>
                        <div className="bg-white bg-opacity-70 rounded-lg p-3">
                          <div className="flex items-center space-x-2">
                            <TrendingDown className="text-red-600" size={16} />
                            <span className="text-sm font-medium text-gray-700">Pelanggaran</span>
                          </div>
                          <p className="text-xl font-bold text-red-600">-{student.pelanggaran_points}</p>
                        </div>
                      </div>

                      {/* Recent Points */}
                      {student.recent_points.length > 0 && (
                        <div className="bg-white bg-opacity-70 rounded-lg p-3">
                          <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center space-x-1">
                            <Star size={14} />
                            <span>Aktivitas Terbaru:</span>
                          </h4>
                          <div className="space-y-1">
                            {student.recent_points.map((point, index) => (
                              <div key={index} className="flex items-center justify-between text-xs">
                                <div className="flex items-center space-x-2">
                                  <span className={`w-2 h-2 rounded-full ${
                                    point.jenis === 'prestasi' ? 'bg-green-500' : 'bg-red-500'
                                  }`}></span>
                                  <span className="text-gray-700 truncate max-w-32">{point.keterangan}</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <span className={`font-medium ${
                                    point.jenis === 'prestasi' ? 'text-green-600' : 'text-red-600'
                                  }`}>
                                    {point.poin > 0 ? '+' : ''}{point.poin}
                                  </span>
                                  <span className="text-gray-500">
                                    {format(new Date(point.tanggal), 'dd/MM', { locale: id })}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Statistics Summary */}
      {rankings.length > 0 && (
        <div className="bg-white rounded-xl p-6 border border-gray-200 mt-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Statistik Kelas</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <Target className="text-blue-600 mx-auto mb-2" size={24} />
              <p className="text-sm text-gray-600">Rata-rata Poin</p>
              <p className="text-xl font-bold text-blue-600">
                {Math.round(rankings.reduce((sum, s) => sum + s.total_points, 0) / rankings.length)}
              </p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <TrendingUp className="text-green-600 mx-auto mb-2" size={24} />
              <p className="text-sm text-gray-600">Total Prestasi</p>
              <p className="text-xl font-bold text-green-600">
                +{rankings.reduce((sum, s) => sum + s.prestasi_points, 0)}
              </p>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <TrendingDown className="text-red-600 mx-auto mb-2" size={24} />
              <p className="text-sm text-gray-600">Total Pelanggaran</p>
              <p className="text-xl font-bold text-red-600">
                -{rankings.reduce((sum, s) => sum + s.pelanggaran_points, 0)}
              </p>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <Crown className="text-yellow-600 mx-auto mb-2" size={24} />
              <p className="text-sm text-gray-600">Siswa Terbaik</p>
              <p className="text-lg font-bold text-yellow-600">
                {rankings[0]?.student_name.split(' ')[0]}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Student Points History Modal */}
      {showHistoryModal && selectedStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Riwayat Poin Siswa</h3>
                  <p className="text-gray-600">{selectedStudent.student_name}</p>
                  <p className="text-sm text-gray-500">{selectedStudent.student_email}</p>
                  <div className="flex items-center space-x-4 mt-3">
                    <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-sm font-medium">
                      Prestasi: +{selectedStudent.prestasi_points}
                    </span>
                    <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-sm font-medium">
                      Pelanggaran: -{selectedStudent.pelanggaran_points}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-sm font-medium ${
                      selectedStudent.total_points >= 0 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      Total: {selectedStudent.total_points >= 0 ? '+' : ''}{selectedStudent.total_points}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setShowHistoryModal(false)}
                  className="text-gray-400 hover:text-gray-600 p-2"
                >
                  <X size={24} />
                </button>
              </div>
            </div>
            
            <div className="p-6">
              {historyLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
                </div>
              ) : studentHistory.length === 0 ? (
                <div className="text-center py-12">
                  <Award className="mx-auto text-gray-400 mb-4" size={48} />
                  <p className="text-gray-500">Belum ada riwayat poin</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-900 mb-4">
                    Riwayat Lengkap ({studentHistory.length} entri)
                  </h4>
                  <div className="space-y-3">
                    {studentHistory.map((point) => (
                      <div key={point.id} className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-3 flex-1">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                              point.jenis === 'prestasi' ? 'bg-green-100' : 'bg-red-100'
                            }`}>
                              {point.jenis === 'prestasi' ? (
                                <TrendingUp className="text-green-600" size={20} />
                              ) : (
                                <TrendingDown className="text-red-600" size={20} />
                              )}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center space-x-3 mb-2">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  point.jenis === 'prestasi' 
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-red-100 text-red-800'
                                }`}>
                                  {point.jenis === 'prestasi' ? 'Prestasi' : 'Pelanggaran'}
                                </span>
                                <span className={`font-bold text-lg ${
                                  point.jenis === 'prestasi' ? 'text-green-600' : 'text-red-600'
                                }`}>
                                  {point.poin > 0 ? '+' : ''}{point.poin} poin
                                </span>
                              </div>
                              <p className="text-gray-900 font-medium mb-2">{point.keterangan}</p>
                              <div className="flex items-center space-x-4 text-sm text-gray-500">
                                <div className="flex items-center space-x-1">
                                  <Calendar size={14} />
                                  <span>{format(new Date(point.tanggal), 'dd MMMM yyyy', { locale: id })}</span>
                                </div>
                                <div className="flex items-center space-x-1">
                                  <User size={14} />
                                  <span>Oleh: {point.guru.nama}</span>
                                </div>
                                <span className="text-xs text-gray-400">
                                  {format(new Date(point.created_at), 'HH:mm', { locale: id })}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}