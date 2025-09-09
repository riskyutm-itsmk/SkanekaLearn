import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, Search, Edit, Trash2, GraduationCap } from 'lucide-react';

interface Major {
  id: string;
  kode_jurusan: string;
  nama_jurusan: string;
  created_at: string;
}

export function MajorsPage() {
  const [majors, setMajors] = useState<Major[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingMajor, setEditingMajor] = useState<Major | null>(null);
  const [formData, setFormData] = useState({
    kode_jurusan: '',
    nama_jurusan: ''
  });

  useEffect(() => {
    fetchMajors();
  }, []);

  async function fetchMajors() {
    try {
      const { data, error } = await supabase
        .from('majors')
        .select('*')
        .order('kode_jurusan', { ascending: true });

      if (error) throw error;
      setMajors(data || []);
    } catch (error) {
      console.error('Error fetching majors:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (editingMajor) {
        // Update existing major
        const { error } = await supabase
          .from('majors')
          .update({
            kode_jurusan: formData.kode_jurusan.toUpperCase(),
            nama_jurusan: formData.nama_jurusan
          })
          .eq('id', editingMajor.id);

        if (error) throw error;
      } else {
        // Create new major
        const { error } = await supabase
          .from('majors')
          .insert({
            kode_jurusan: formData.kode_jurusan.toUpperCase(),
            nama_jurusan: formData.nama_jurusan
          });

        if (error) throw error;
      }

      setShowModal(false);
      setEditingMajor(null);
      setFormData({ kode_jurusan: '', nama_jurusan: '' });
      fetchMajors();
    } catch (error: any) {
      alert('Error: ' + error.message);
    }
  }

  async function handleDelete(major: Major) {
    if (!confirm(`Hapus jurusan ${major.nama_jurusan}?`)) return;

    try {
      const { error } = await supabase
        .from('majors')
        .delete()
        .eq('id', major.id);

      if (error) throw error;
      fetchMajors();
    } catch (error: any) {
      alert('Error: ' + error.message);
    }
  }

  const filteredMajors = majors.filter(major =>
    major.nama_jurusan.toLowerCase().includes(searchTerm.toLowerCase()) ||
    major.kode_jurusan.toLowerCase().includes(searchTerm.toLowerCase())
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
          <h1 className="text-3xl font-bold text-gray-900">Kelola Jurusan</h1>
          <p className="text-gray-600 mt-2">Manajemen data jurusan dan program keahlian</p>
        </div>
        <button
          onClick={() => {
            setEditingMajor(null);
            setFormData({ kode_jurusan: '', nama_jurusan: '' });
            setShowModal(true);
          }}
          className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors flex items-center space-x-2"
        >
          <Plus size={20} />
          <span>Tambah Jurusan</span>
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Cari jurusan..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 w-full max-w-md"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
          {filteredMajors.map((major) => (
            <div key={major.id} className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-6 border border-purple-100 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                    <GraduationCap className="text-purple-600" size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-gray-900">{major.kode_jurusan}</h3>
                    <p className="text-sm text-gray-600">Kode Jurusan</p>
                  </div>
                </div>
                <div className="flex space-x-1">
                  <button
                    onClick={() => {
                      setEditingMajor(major);
                      setFormData({
                        kode_jurusan: major.kode_jurusan,
                        nama_jurusan: major.nama_jurusan
                      });
                      setShowModal(true);
                    }}
                    className="text-purple-600 hover:text-purple-900 p-1"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(major)}
                    className="text-red-600 hover:text-red-900 p-1"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">{major.nama_jurusan}</h4>
                <p className="text-xs text-gray-500">
                  Dibuat: {new Date(major.created_at).toLocaleDateString('id-ID')}
                </p>
              </div>
            </div>
          ))}
        </div>

        {filteredMajors.length === 0 && (
          <div className="text-center py-12">
            <GraduationCap className="mx-auto text-gray-400 mb-4" size={48} />
            <p className="text-gray-500">Tidak ada data jurusan</p>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">
              {editingMajor ? 'Edit Jurusan' : 'Tambah Jurusan Baru'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Kode Jurusan
                </label>
                <input
                  type="text"
                  value={formData.kode_jurusan}
                  onChange={(e) => setFormData({ ...formData, kode_jurusan: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 uppercase"
                  placeholder="Contoh: TJKT"
                  required
                  maxLength={10}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nama Jurusan
                </label>
                <input
                  type="text"
                  value={formData.nama_jurusan}
                  onChange={(e) => setFormData({ ...formData, nama_jurusan: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="Contoh: Teknik Jaringan Komputer dan Telekomunikasi"
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
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  {editingMajor ? 'Update' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}