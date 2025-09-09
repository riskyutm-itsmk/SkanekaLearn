import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Plus, Search, Edit, Trash2, FileText, Upload, Eye } from 'lucide-react';

interface Material {
  id: string;
  judul: string;
  tipe: 'text' | 'pdf';
  konten: string | null;
  file_url: string | null;
  created_at: string;
  class: {
    nama_kelas: string;
    tingkat: number;
    major: { kode_jurusan: string };
  };
  subject: {
    nama_mapel: string;
  };
}

interface Class {
  id: string;
  nama_kelas: string;
  tingkat: number;
  major: { kode_jurusan: string };
}

interface Subject {
  id: string;
  nama_mapel: string;
}

export function MaterialsPage() {
  const { profile } = useAuth();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [formData, setFormData] = useState({
    judul: '',
    tipe: 'text' as 'text' | 'pdf',
    konten: '',
    file_url: '',
    kelas_id: '',
    mapel_id: ''
  });

  useEffect(() => {
    if (profile) {
      fetchData();
    }
  }, [profile]);

  async function fetchData() {
    try {
      const [materialsData, classesData, subjectsData] = await Promise.all([
        supabase
          .from('materials')
          .select(`
            *,
            class:classes(
              nama_kelas,
              tingkat,
              major:majors(kode_jurusan)
            ),
            subject:subjects(nama_mapel)
          `)
          .eq('guru_id', profile?.id)
          .order('created_at', { ascending: false }),
        
        supabase
          .from('schedules')
          .select(`
            class:classes(
              id,
              nama_kelas,
              tingkat,
              major:majors(kode_jurusan)
            )
          `)
          .eq('guru_id', profile?.id),
        
        supabase
          .from('schedules')
          .select(`
            subject:subjects(id, nama_mapel)
          `)
          .eq('guru_id', profile?.id)
      ]);

      if (materialsData.error) throw materialsData.error;
      if (classesData.error) throw classesData.error;
      if (subjectsData.error) throw subjectsData.error;

      setMaterials(materialsData.data || []);
      
      // Extract unique classes and subjects
      const uniqueClasses = classesData.data?.map(item => item.class).filter(Boolean) || [];
      const uniqueSubjects = subjectsData.data?.map(item => item.subject).filter(Boolean) || [];
      
      setClasses(uniqueClasses);
      setSubjects(uniqueSubjects);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const materialData = {
        guru_id: profile?.id,
        kelas_id: formData.kelas_id,
        mapel_id: formData.mapel_id,
        judul: formData.judul,
        tipe: formData.tipe,
        konten: formData.tipe === 'text' ? formData.konten : null,
        file_url: formData.tipe === 'pdf' ? formData.file_url : null
      };

      if (editingMaterial) {
        const { error } = await supabase
          .from('materials')
          .update(materialData)
          .eq('id', editingMaterial.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('materials')
          .insert(materialData);

        if (error) throw error;
      }

      setShowModal(false);
      setEditingMaterial(null);
      setFormData({
        judul: '',
        tipe: 'text',
        konten: '',
        file_url: '',
        kelas_id: '',
        mapel_id: ''
      });
      fetchData();
    } catch (error: any) {
      alert('Error: ' + error.message);
    }
  }

  async function handleDelete(material: Material) {
    if (!confirm(`Hapus materi "${material.judul}"?`)) return;

    try {
      const { error } = await supabase
        .from('materials')
        .delete()
        .eq('id', material.id);

      if (error) throw error;
      fetchData();
    } catch (error: any) {
      alert('Error: ' + error.message);
    }
  }

  const filteredMaterials = materials.filter(material =>
    material.judul.toLowerCase().includes(searchTerm.toLowerCase()) ||
    material.subject.nama_mapel.toLowerCase().includes(searchTerm.toLowerCase())
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
          <h1 className="text-3xl font-bold text-gray-900">Materi Pembelajaran</h1>
          <p className="text-gray-600 mt-2">Kelola materi untuk siswa Anda</p>
        </div>
        <button
          onClick={() => {
            setEditingMaterial(null);
            setFormData({
              judul: '',
              tipe: 'text',
              konten: '',
              file_url: '',
              kelas_id: '',
              mapel_id: ''
            });
            setShowModal(true);
          }}
          className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors flex items-center space-x-2"
        >
          <Plus size={20} />
          <span>Tambah Materi</span>
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Cari materi..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 w-full max-w-md"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
          {filteredMaterials.map((material) => (
            <div key={material.id} className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-6 border border-purple-100 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                    {material.tipe === 'text' ? (
                      <FileText className="text-purple-600" size={24} />
                    ) : (
                      <Upload className="text-purple-600" size={24} />
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-gray-900">{material.judul}</h3>
                    <p className="text-sm text-gray-600">{material.subject.nama_mapel}</p>
                  </div>
                </div>
                <div className="flex space-x-1">
                  <button
                    onClick={() => {
                      setEditingMaterial(material);
                      setFormData({
                        judul: material.judul,
                        tipe: material.tipe,
                        konten: material.konten || '',
                        file_url: material.file_url || '',
                        kelas_id: '', // Will need to be set based on material's class
                        mapel_id: '' // Will need to be set based on material's subject
                      });
                      setShowModal(true);
                    }}
                    className="text-purple-600 hover:text-purple-900 p-1"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(material)}
                    className="text-red-600 hover:text-red-900 p-1"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              
              <div className="space-y-2">
                <p className="text-sm text-gray-700">
                  <strong>Kelas:</strong> {material.class.tingkat} {material.class.nama_kelas} - {material.class.major.kode_jurusan}
                </p>
                <p className="text-sm text-gray-700">
                  <strong>Tipe:</strong> {material.tipe === 'text' ? 'Teks' : 'PDF'}
                </p>
                {material.tipe === 'text' && material.konten && (
                  <p className="text-sm text-gray-600 line-clamp-3">
                    {material.konten.substring(0, 100)}...
                  </p>
                )}
                {material.tipe === 'pdf' && material.file_url && (
                  <a
                    href={material.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center space-x-1 text-purple-600 hover:text-purple-800 text-sm"
                  >
                    <Eye size={14} />
                    <span>Lihat File</span>
                  </a>
                )}
                <p className="text-xs text-gray-500 mt-3">
                  Dibuat: {new Date(material.created_at).toLocaleDateString('id-ID')}
                </p>
              </div>
            </div>
          ))}
        </div>

        {filteredMaterials.length === 0 && (
          <div className="text-center py-12">
            <FileText className="mx-auto text-gray-400 mb-4" size={48} />
            <p className="text-gray-500">Belum ada materi pembelajaran</p>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">
              {editingMaterial ? 'Edit Materi' : 'Tambah Materi Baru'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Judul Materi
                </label>
                <input
                  type="text"
                  value={formData.judul}
                  onChange={(e) => setFormData({ ...formData, judul: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Kelas
                  </label>
                  <select
                    value={formData.kelas_id}
                    onChange={(e) => setFormData({ ...formData, kelas_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    required
                  >
                    <option value="">Pilih Kelas</option>
                    {classes.map((kelas) => (
                      <option key={kelas.id} value={kelas.id}>
                        {kelas.tingkat} {kelas.nama_kelas} - {kelas.major.kode_jurusan}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mata Pelajaran
                  </label>
                  <select
                    value={formData.mapel_id}
                    onChange={(e) => setFormData({ ...formData, mapel_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    required
                  >
                    <option value="">Pilih Mata Pelajaran</option>
                    {subjects.map((subject) => (
                      <option key={subject.id} value={subject.id}>
                        {subject.nama_mapel}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipe Materi
                </label>
                <select
                  value={formData.tipe}
                  onChange={(e) => setFormData({ ...formData, tipe: e.target.value as 'text' | 'pdf' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  required
                >
                  <option value="text">Teks</option>
                  <option value="pdf">PDF</option>
                </select>
              </div>

              {formData.tipe === 'text' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Konten Materi
                  </label>
                  <textarea
                    value={formData.konten}
                    onChange={(e) => setFormData({ ...formData, konten: e.target.value })}
                    rows={8}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    placeholder="Tulis konten materi di sini..."
                    required
                  />
                </div>
              )}

              {formData.tipe === 'pdf' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    URL File PDF
                  </label>
                  <input
                    type="url"
                    value={formData.file_url}
                    onChange={(e) => setFormData({ ...formData, file_url: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    placeholder="https://example.com/file.pdf"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Masukkan URL file PDF yang dapat diakses secara online
                  </p>
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
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  {editingMaterial ? 'Update' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}