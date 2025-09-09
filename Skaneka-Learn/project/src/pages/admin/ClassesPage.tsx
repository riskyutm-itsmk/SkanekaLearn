import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, Search, Edit, Trash2, School, Users } from 'lucide-react';

interface Class {
  id: string;
  tingkat: number;
  nama_kelas: string;
  wali_kelas: string | null;
  major_id: string;
  created_at: string;
  major: {
    nama_jurusan: string;
    kode_jurusan: string;
  };
  wali: {
    nama: string;
  } | null;
}

interface Major {
  id: string;
  kode_jurusan: string;
  nama_jurusan: string;
}

interface Teacher {
  id: string;
  nama: string;
}

export function ClassesPage() {
  const [classes, setClasses] = useState<Class[]>([]);
  const [majors, setMajors] = useState<Major[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingClass, setEditingClass] = useState<Class | null>(null);
  const [formData, setFormData] = useState({
    tingkat: 1,
    nama_kelas: '',
    major_id: '',
    wali_kelas: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const [classesData, majorsData, teachersData] = await Promise.all([
        supabase
          .from('classes')
          .select(`
            *,
            major:majors(nama_jurusan, kode_jurusan),
            wali:users!classes_wali_kelas_fkey(nama)
          `)
          .order('tingkat', { ascending: true }),
        supabase
          .from('majors')
          .select('*')
          .order('kode_jurusan', { ascending: true }),
        supabase
          .from('users')
          .select('id, nama')
          .eq('role', 'guru')
          .order('nama', { ascending: true })
      ]);

      if (classesData.error) throw classesData.error;
      if (majorsData.error) throw majorsData.error;
      if (teachersData.error) throw teachersData.error;

      setClasses(classesData.data || []);
      setMajors(majorsData.data || []);
      setTeachers(teachersData.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const classData = {
        tingkat: formData.tingkat,
        nama_kelas: formData.nama_kelas,
        major_id: formData.major_id,
        wali_kelas: formData.wali_kelas || null
      };

      if (editingClass) {
        const { error } = await supabase
          .from('classes')
          .update(classData)
          .eq('id', editingClass.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('classes')
          .insert(classData);

        if (error) throw error;
      }

      setShowModal(false);
      setEditingClass(null);
      setFormData({ tingkat: 1, nama_kelas: '', major_id: '', wali_kelas: '' });
      fetchData();
    } catch (error: any) {
      alert('Error: ' + error.message);
    }
  }

  async function handleDelete(classItem: Class) {
    if (!confirm(`Hapus kelas ${classItem.tingkat} ${classItem.nama_kelas}?`)) return;

    try {
      const { error } = await supabase
        .from('classes')
        .delete()
        .eq('id', classItem.id);

      if (error) throw error;
      fetchData();
    } catch (error: any) {
      alert('Error: ' + error.message);
    }
  }

  const filteredClasses = classes.filter(classItem =>
    classItem.nama_kelas.toLowerCase().includes(searchTerm.toLowerCase()) ||
    classItem.major?.nama_jurusan.toLowerCase().includes(searchTerm.toLowerCase()) ||
    classItem.major?.kode_jurusan.toLowerCase().includes(searchTerm.toLowerCase())
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
          <h1 className="text-3xl font-bold text-gray-900">Kelola Kelas</h1>
          <p className="text-gray-600 mt-2">Manajemen kelas dan wali kelas</p>
        </div>
        <button
          onClick={() => {
            setEditingClass(null);
            setFormData({ tingkat: 1, nama_kelas: '', major_id: '', wali_kelas: '' });
            setShowModal(true);
          }}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors flex items-center space-x-2"
        >
          <Plus size={20} />
          <span>Tambah Kelas</span>
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Cari kelas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 w-full max-w-md"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
          {filteredClasses.map((classItem) => (
            <div key={classItem.id} className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl p-6 border border-indigo-100 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
                    <School className="text-indigo-600" size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-gray-900">
                      {classItem.tingkat} {classItem.nama_kelas}
                    </h3>
                    <p className="text-sm text-gray-600">{classItem.major?.kode_jurusan}</p>
                  </div>
                </div>
                <div className="flex space-x-1">
                  <button
                    onClick={() => {
                      setEditingClass(classItem);
                      setFormData({
                        tingkat: classItem.tingkat,
                        nama_kelas: classItem.nama_kelas,
                        major_id: classItem.major_id,
                        wali_kelas: classItem.wali_kelas || ''
                      });
                      setShowModal(true);
                    }}
                    className="text-indigo-600 hover:text-indigo-900 p-1"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(classItem)}
                    className="text-red-600 hover:text-red-900 p-1"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-gray-700">
                  <strong>Jurusan:</strong> {classItem.major?.nama_jurusan}
                </p>
                <p className="text-sm text-gray-700">
                  <strong>Wali Kelas:</strong> {classItem.wali?.nama || 'Belum ditentukan'}
                </p>
                <div className="flex items-center space-x-2 text-xs text-gray-500 mt-3">
                  <Users size={14} />
                  <span>Dibuat: {new Date(classItem.created_at).toLocaleDateString('id-ID')}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredClasses.length === 0 && (
          <div className="text-center py-12">
            <School className="mx-auto text-gray-400 mb-4" size={48} />
            <p className="text-gray-500">Tidak ada data kelas</p>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">
              {editingClass ? 'Edit Kelas' : 'Tambah Kelas Baru'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tingkat
                </label>
                <select
                  value={formData.tingkat}
                  onChange={(e) => setFormData({ ...formData, tingkat: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  required
                >
                  <option value={1}>1</option>
                  <option value={2}>2</option>
                  <option value={3}>3</option>
                  <option value={4}>4</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nama Kelas
                </label>
                <input
                  type="text"
                  value={formData.nama_kelas}
                  onChange={(e) => setFormData({ ...formData, nama_kelas: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Contoh: A, B, C"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Jurusan
                </label>
                <select
                  value={formData.major_id}
                  onChange={(e) => setFormData({ ...formData, major_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  required
                >
                  <option value="">Pilih Jurusan</option>
                  {majors.map((major) => (
                    <option key={major.id} value={major.id}>
                      {major.kode_jurusan} - {major.nama_jurusan}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Wali Kelas (Opsional)
                </label>
                <select
                  value={formData.wali_kelas}
                  onChange={(e) => setFormData({ ...formData, wali_kelas: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">Pilih Wali Kelas</option>
                  {teachers.map((teacher) => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.nama}
                    </option>
                  ))}
                </select>
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
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  {editingClass ? 'Update' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}