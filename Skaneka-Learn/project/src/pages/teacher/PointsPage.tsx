import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Plus, Search, Edit, Trash2, Award, TrendingUp, TrendingDown, Users } from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

interface Point {
  id: string;
  jenis: 'prestasi' | 'pelanggaran';
  keterangan: string;
  poin: number;
  tanggal: string;
  created_at: string;
  student: {
    nama: string;
    email: string;
  };
}

interface Student {
  id: string;
  nama: string;
  email: string;
}

interface StudentPoint {
  student_id: string;
  student_name: string;
  total_points: number;
  prestasi_points: number;
  pelanggaran_points: number;
}

export function PointsPage() {
  const { profile } = useAuth();
  const [points, setPoints] = useState<Point[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [studentPoints, setStudentPoints] = useState<StudentPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState('');
  const [selectedType, setSelectedType] = useState<'all' | 'prestasi' | 'pelanggaran'>('all');
  const [showModal, setShowModal] = useState(false);
  const [editingPoint, setEditingPoint] = useState<Point | null>(null);
  const [formData, setFormData] = useState({
    siswa_id: '',
    jenis: 'prestasi' as 'prestasi' | 'pelanggaran',
    keterangan: '',
    poin: 0,
    tanggal: format(new Date(), 'yyyy-MM-dd')
  });

  useEffect(() => {
    if (profile) {
      fetchData();
    }
  }, [profile]);

  async function fetchData() {
    try {
      // Fetch students from classes taught by this teacher
      const { data: schedulesData, error: schedulesError } = await supabase
        .from('schedules')
        .select('kelas_id')
        .eq('guru_id', profile?.id);

      if (schedulesError) throw schedulesError;

      const classIds = [...new Set(schedulesData?.map(s => s.kelas_id) || [])];
      
      if (classIds.length === 0) {
        setStudents([]);
        setPoints([]);
        setStudentPoints([]);
        return;
      }

      const { data: studentsData, error: studentsError } = await supabase
        .from('students_classes')
        .select(`
          student:users(id, nama, email)
        `)
        .in('kelas_id', classIds)
        .eq('status', 'aktif');

      if (studentsError) throw studentsError;

      const uniqueStudents = studentsData
        ?.map(sc => sc.student)
        .filter((student, index, self) => 
          student && self.findIndex(s => s?.id === student.id) === index
        ) || [];

      setStudents(uniqueStudents);

      // Fetch points
      const { data: pointsData, error: pointsError } = await supabase
        .from('points')
        .select(`
          *,
          student:users!points_siswa_id_fkey(nama, email)
        `)
        .eq('guru_id', profile?.id)
        .order('created_at', { ascending: false });

      if (pointsError) throw pointsError;
      setPoints(pointsData || []);

      // Calculate student points summary
      const pointsSummary = uniqueStudents.map(student => {
        const studentPointsData = pointsData?.filter(p => p.siswa_id === student.id) || [];
        const prestasiPoints = studentPointsData
          .filter(p => p.jenis === 'prestasi')
          .reduce((sum, p) => sum + p.poin, 0);
        const pelanggaranPoints = studentPointsData
          .filter(p => p.jenis === 'pelanggaran')
          .reduce((sum, p) => sum + Math.abs(p.poin), 0);

        return {
          student_id: student.id,
          student_name: student.nama,
          total_points: prestasiPoints - pelanggaranPoints,
          prestasi_points: prestasiPoints,
          pelanggaran_points: pelanggaranPoints
        };
      });

      setStudentPoints(pointsSummary.sort((a, b) => b.total_points - a.total_points));
    } catch (error) {
      console.error('Error fetching data:', error);
      alert('Error mengambil data: ' + (error as any).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const pointData = {
        guru_id: profile?.id,
        siswa_id: formData.siswa_id,
        jenis: formData.jenis,
        keterangan: formData.keterangan,
        poin: formData.jenis === 'pelanggaran' ? -Math.abs(formData.poin) : Math.abs(formData.poin),
        tanggal: formData.tanggal
      };

      if (editingPoint) {
        const { error } = await supabase
          .from('points')
          .update(pointData)
          .eq('id', editingPoint.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('points')
          .insert(pointData);

        if (error) throw error;
      }

      setShowModal(false);
      setEditingPoint(null);
      setFormData({
        siswa_id: '',
        jenis: 'prestasi',
        keterangan: '',
        poin: 0,
        tanggal: format(new Date(), 'yyyy-MM-dd')
      });
      fetchData();
    } catch (error: any) {
      alert('Error: ' + error.message);
    }
  }

  async function handleDelete(point: Point) {
    if (!confirm(`Hapus poin ${point.jenis} untuk ${point.student.nama}?`)) return;

    try {
      const { error } = await supabase
        .from('points')
        .delete()
        .eq('id', point.id);

      if (error) throw error;
      fetchData();
    } catch (error: any) {
      alert('Error: ' + error.message);
    }
  }

  const filteredPoints = points.filter(point => {
    const matchesSearch = 
      point.student.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
      point.keterangan.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStudent = selectedStudent === '' || point.siswa_id === selectedStudent;
    const matchesType = selectedType === 'all' || point.jenis === selectedType;
    
    return matchesSearch && matchesStudent && matchesType;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Poin Siswa</h1>
          <p className="text-gray-600 mt-2">Kelola poin prestasi dan pelanggaran siswa</p>
        </div>
        <button
          onClick={() => {
            setEditingPoint(null);
            setFormData({
              siswa_id: '',
              jenis: 'prestasi',
              keterangan: '',
              poin: 0,
              tanggal: format(new Date(), 'yyyy-MM-dd')
            });
            setShowModal(true);
          }}
          className="bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-700 transition-colors flex items-center space-x-2"
        >
          <Plus size={20} />
          <span>Tambah Poin</span>
        </button>
      </div>

      {/* Student Points Summary */}
      <div className="bg-white rounded-xl border border-gray-200 mb-6">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Rangkuman Poin Siswa</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {studentPoints.slice(0, 6).map((studentPoint) => (
              <div key={studentPoint.student_id} className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg p-4 border border-amber-100">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900">{studentPoint.student_name}</h4>
                  <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                    studentPoint.total_points >= 0 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {studentPoint.total_points >= 0 ? '+' : ''}{studentPoint.total_points}
                  </div>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span className="flex items-center space-x-1">
                    <TrendingUp size={14} className="text-green-500" />
                    <span>+{studentPoint.prestasi_points}</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <TrendingDown size={14} className="text-red-500" />
                    <span>-{studentPoint.pelanggaran_points}</span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Filters and Points List */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Cari siswa atau keterangan..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 w-full"
              />
            </div>
            <select
              value={selectedStudent}
              onChange={(e) => setSelectedStudent(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            >
              <option value="">Semua Siswa</option>
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.nama}
                </option>
              ))}
            </select>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as 'all' | 'prestasi' | 'pelanggaran')}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            >
              <option value="all">Semua Jenis</option>
              <option value="prestasi">Prestasi</option>
              <option value="pelanggaran">Pelanggaran</option>
            </select>
          </div>
        </div>

        <div className="divide-y divide-gray-200">
          {filteredPoints.map((point) => (
            <div key={point.id} className="p-6 hover:bg-gray-50 transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    point.jenis === 'prestasi' 
                      ? 'bg-green-100' 
                      : 'bg-red-100'
                  }`}>
                    {point.jenis === 'prestasi' ? (
                      <TrendingUp className="text-green-600" size={24} />
                    ) : (
                      <TrendingDown className="text-red-600" size={24} />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="font-semibold text-gray-900">{point.student.nama}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        point.jenis === 'prestasi' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {point.jenis === 'prestasi' ? 'Prestasi' : 'Pelanggaran'}
                      </span>
                      <span className={`font-bold ${
                        point.jenis === 'prestasi' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {point.poin > 0 ? '+' : ''}{point.poin} poin
                      </span>
                    </div>
                    <p className="text-gray-700 mb-2">{point.keterangan}</p>
                    <p className="text-sm text-gray-500">
                      {format(new Date(point.tanggal), 'dd MMMM yyyy', { locale: id })}
                    </p>
                  </div>
                </div>
                
                <div className="flex space-x-2">
                  <button
                    onClick={() => {
                      setEditingPoint(point);
                      setFormData({
                        siswa_id: point.siswa_id,
                        jenis: point.jenis,
                        keterangan: point.keterangan,
                        poin: Math.abs(point.poin),
                        tanggal: point.tanggal
                      });
                      setShowModal(true);
                    }}
                    className="text-amber-600 hover:text-amber-900 p-1"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(point)}
                    className="text-red-600 hover:text-red-900 p-1"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredPoints.length === 0 && (
          <div className="text-center py-12">
            <Award className="mx-auto text-gray-400 mb-4" size={48} />
            <p className="text-gray-500">Belum ada data poin</p>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">
              {editingPoint ? 'Edit Poin' : 'Tambah Poin Baru'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Siswa
                </label>
                <select
                  value={formData.siswa_id}
                  onChange={(e) => setFormData({ ...formData, siswa_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  required
                >
                  <option value="">Pilih Siswa</option>
                  {students.map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.nama}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Jenis
                  </label>
                  <select
                    value={formData.jenis}
                    onChange={(e) => setFormData({ ...formData, jenis: e.target.value as 'prestasi' | 'pelanggaran' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    required
                  >
                    <option value="prestasi">Prestasi</option>
                    <option value="pelanggaran">Pelanggaran</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Poin
                  </label>
                  <input
                    type="number"
                    value={formData.poin}
                    onChange={(e) => setFormData({ ...formData, poin: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    min="1"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tanggal
                </label>
                <input
                  type="date"
                  value={formData.tanggal}
                  onChange={(e) => setFormData({ ...formData, tanggal: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Keterangan
                </label>
                <textarea
                  value={formData.keterangan}
                  onChange={(e) => setFormData({ ...formData, keterangan: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  placeholder="Jelaskan alasan pemberian poin..."
                  required
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
                >
                  {editingPoint ? 'Update' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}