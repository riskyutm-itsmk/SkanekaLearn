import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, Search, Edit, Trash2, Users } from 'lucide-react';

interface Student {
  id: string;
  nama: string;
  email: string;
  created_at: string;
  auth_id: string | null;
  current_class?: {
    id: string;
    kelas_id: string;
    kelas: {
      id: string;
      nama_kelas: string;
      tingkat: number;
      major: { nama_jurusan: string; kode_jurusan: string };
    };
  };
}

interface Class {
  id: string;
  nama_kelas: string;
  tingkat: number;
  major: {
    nama_jurusan: string;
  };
}

export function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [formData, setFormData] = useState({
    nama: '',
    email: '',
    password: '',
    kelas_id: '',
    current_kelas_id: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const [studentsData, classesData] = await Promise.all([
        supabase
          .from('users')
          .select(`
            *,
            current_class:students_classes!inner(
              id,
              kelas_id,
              kelas:classes(
                id,
                nama_kelas,
                tingkat,
                major:majors(nama_jurusan, kode_jurusan)
              )
            )
          `)
          .eq('role', 'siswa')
          .eq('students_classes.status', 'aktif')
          .order('created_at', { ascending: false }),
        supabase
          .from('classes')
          .select(`
            id,
            nama_kelas,
            tingkat,
            major:majors(nama_jurusan, kode_jurusan)
          `)
          .order('tingkat', { ascending: true })
      ]);

      if (studentsData.error) throw studentsData.error;
      if (classesData.error) throw classesData.error;

      // Process students data to handle the nested relationship
      const processedStudents = (studentsData.data || []).map(student => ({
        ...student,
        current_class: Array.isArray(student.current_class) && student.current_class.length > 0 
          ? student.current_class[0] 
          : undefined
      }));
      
      setStudents(processedStudents);
      setClasses(classesData.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      // Fallback: fetch students without class info if the join fails
      try {
        const { data: fallbackStudents } = await supabase
          .from('users')
          .select('*')
          .eq('role', 'siswa')
          .order('created_at', { ascending: false });
        
        setStudents(fallbackStudents || []);
      } catch (fallbackError) {
        console.error('Fallback fetch also failed:', fallbackError);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (editingStudent) {
        // Update existing student
        const updateData: any = {
          nama: formData.nama,
          email: formData.email,
          updated_at: new Date().toISOString()
        };
        
        if (formData.password) {
          updateData.password = formData.password;
        }
        
        const { error } = await supabase
          .from('users')
          .update(updateData)
          .eq('id', editingStudent.id);

        if (error) throw error;
      } else {
        // Create new student directly in users table
        const { data, error } = await supabase
          .from('users')
          .insert({
            nama: formData.nama,
            email: formData.email,
            password: formData.password,
            role: 'siswa',
            auth_id: null
          })
          .select()
          .single();

        if (error) throw error;

        // Update class assignment if changed
        if (formData.current_kelas_id && formData.current_kelas_id !== editingStudent.current_class?.kelas_id) {
          const currentYear = new Date().getFullYear();
          
          // Deactivate current class assignment
          if (editingStudent.current_class) {
            await supabase
              .from('students_classes')
              .update({ status: 'pindah' })
              .eq('id', editingStudent.current_class.id);
          }
          
          // Create new class assignment
          await supabase
            .from('students_classes')
            .insert({
              siswa_id: editingStudent.id,
              kelas_id: formData.current_kelas_id,
              tahun_ajaran: `${currentYear}/${currentYear + 1}`,
              status: 'aktif'
            });
        }
        // Assign to class if selected
        if (formData.kelas_id && data) {
          const currentYear = new Date().getFullYear();
          const { error: classError } = await supabase
            .from('students_classes')
            .insert({
              siswa_id: data.id,
              kelas_id: formData.kelas_id,
              tahun_ajaran: `${currentYear}/${currentYear + 1}`,
              status: 'aktif'
            });

          if (classError) {
            console.error('Error assigning to class:', classError);
            // Don't throw error here, student is already created
          }
        }
      }

      setShowModal(false);
      setEditingStudent(null);
      setFormData({ nama: '', email: '', password: '', kelas_id: '', current_kelas_id: '' });
      fetchData();
    } catch (error: any) {
      console.error('Error saving student:', error);
      alert('Error: ' + (error.message || 'Gagal menyimpan data siswa'));
    }
  }

  async function handleDelete(student: Student) {
    if (!confirm(`Hapus siswa ${student.nama}?`)) return;

    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', student.id);

      if (error) throw error;
      fetchData();
    } catch (error: any) {
      alert('Error: ' + error.message);
    }
  }

  const filteredStudents = students.filter(student =>
    student.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
          <h1 className="text-3xl font-bold text-gray-900">Kelola Siswa</h1>
          <p className="text-gray-600 mt-2">Manajemen data siswa dan penempatan kelas</p>
        </div>
        <button
          onClick={() => {
            setEditingStudent(null);
            setFormData({ nama: '', email: '', password: '', kelas_id: '', current_kelas_id: '' });
            setShowModal(true);
          }}
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
        >
          <Plus size={20} />
          <span>Tambah Siswa</span>
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Cari siswa..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 w-full max-w-md"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nama
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Kelas
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tanggal Dibuat
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredStudents.map((student) => (
                <tr key={student.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                        <span className="text-green-600 font-medium">
                          {student.nama.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{student.nama}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {student.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {student.current_class ? (
                      <div>
                        <div className="font-medium">
                          {student.current_class.kelas.tingkat} {student.current_class.kelas.nama_kelas}
                        </div>
                        <div className="text-xs text-gray-500">
                          {student.current_class.kelas.major.kode_jurusan}
                        </div>
                      </div>
                    ) : (
                      <span className="text-gray-400 italic">Belum ada kelas</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(student.created_at).toLocaleDateString('id-ID')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => {
                          setEditingStudent(student);
                          setFormData({
                            nama: student.nama,
                            email: student.email,
                            password: '',
                            kelas_id: '',
                            current_kelas_id: student.current_class?.kelas_id || ''
                          });
                          setShowModal(true);
                        }}
                        className="text-green-600 hover:text-green-900 p-1"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(student)}
                        className="text-red-600 hover:text-red-900 p-1"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredStudents.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">Tidak ada data siswa</p>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">
              {editingStudent ? 'Edit Siswa' : 'Tambah Siswa Baru'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nama Lengkap
                </label>
                <input
                  type="text"
                  value={formData.nama}
                  onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  required
                />
              </div>
              
              {editingStudent && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Kelas Saat Ini
                  </label>
                  <select
                    value={formData.current_kelas_id}
                    onChange={(e) => setFormData({ ...formData, current_kelas_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  >
                    <option value="">Pilih Kelas</option>
                    {classes.map((kelas) => (
                      <option key={kelas.id} value={kelas.id}>
                        {kelas.tingkat} {kelas.nama_kelas} - {kelas.major?.nama_jurusan}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Mengubah kelas akan memindahkan siswa ke kelas baru
                  </p>
                </div>
              )}
              
              {!editingStudent && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Password
                    </label>
                    <input
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      required
                      minLength={6}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Kelas (Opsional)
                    </label>
                    <select
                      value={formData.kelas_id}
                      onChange={(e) => setFormData({ ...formData, kelas_id: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    >
                      <option value="">Pilih Kelas</option>
                      {classes.map((kelas) => (
                        <option key={kelas.id} value={kelas.id}>
                          {kelas.tingkat} {kelas.nama_kelas} - {kelas.major?.nama_jurusan}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}
              {editingStudent && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password Baru (Kosongkan jika tidak ingin mengubah)
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    minLength={6}
                  />
                </div>
              )}
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
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  {editingStudent ? 'Update' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}