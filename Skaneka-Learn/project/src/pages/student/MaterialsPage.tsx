import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { BookOpen, FileText, Download, Eye, Search, Filter } from 'lucide-react';

interface Material {
  id: string;
  judul: string;
  tipe: 'text' | 'pdf';
  konten: string | null;
  file_url: string | null;
  created_at: string;
  subject: { nama_mapel: string };
  guru: { nama: string };
}

export function MaterialsPage() {
  const { profile } = useAuth();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedType, setSelectedType] = useState<'all' | 'text' | 'pdf'>('all');
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (profile) {
      fetchMaterials();
    }
  }, [profile]);

  async function fetchMaterials() {
    try {
      // Get student's class first
      const { data: classData } = await supabase
        .from('students_classes')
        .select('kelas_id')
        .eq('siswa_id', profile?.id)
        .eq('status', 'aktif')
        .maybeSingle();

      if (!classData) return;

      // Get materials for the class
      const { data: materialsData } = await supabase
        .from('materials')
        .select(`
          id,
          judul,
          tipe,
          konten,
          file_url,
          created_at,
          subject:subjects(nama_mapel),
          guru:users(nama)
        `)
        .eq('kelas_id', classData.kelas_id)
        .order('created_at', { ascending: false });

      setMaterials(materialsData || []);
    } catch (error) {
      console.error('Error fetching materials:', error);
    } finally {
      setLoading(false);
    }
  }

  const filteredMaterials = materials.filter(material => {
    const matchesSearch = 
      material.judul.toLowerCase().includes(searchTerm.toLowerCase()) ||
      material.subject.nama_mapel.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesSubject = selectedSubject === '' || material.subject.nama_mapel === selectedSubject;
    const matchesType = selectedType === 'all' || material.tipe === selectedType;
    
    return matchesSearch && matchesSubject && matchesType;
  });

  const uniqueSubjects = [...new Set(materials.map(m => m.subject.nama_mapel))];

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
        <h1 className="text-3xl font-bold text-gray-900">Materi Pembelajaran</h1>
        <p className="text-gray-600 mt-2">Akses materi pembelajaran dari guru Anda</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-6 border border-gray-200 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Cari materi..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full"
            />
          </div>
          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Semua Mata Pelajaran</option>
            {uniqueSubjects.map(subject => (
              <option key={subject} value={subject}>{subject}</option>
            ))}
          </select>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value as 'all' | 'text' | 'pdf')}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">Semua Tipe</option>
            <option value="text">Teks</option>
            <option value="pdf">PDF</option>
          </select>
        </div>
      </div>

      {/* Materials Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredMaterials.map((material) => (
          <div key={material.id} className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  {material.tipe === 'text' ? (
                    <FileText className="text-blue-600" size={24} />
                  ) : (
                    <Download className="text-blue-600" size={24} />
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-lg text-gray-900">{material.judul}</h3>
                  <p className="text-sm text-gray-600">{material.subject.nama_mapel}</p>
                </div>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                material.tipe === 'text' 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-purple-100 text-purple-800'
              }`}>
                {material.tipe === 'text' ? 'Teks' : 'PDF'}
              </span>
            </div>
            
            <div className="space-y-2 mb-4">
              <p className="text-sm text-gray-700">
                <strong>Guru:</strong> {material.guru.nama}
              </p>
              <p className="text-sm text-gray-500">
                Dibuat: {format(new Date(material.created_at), 'dd MMM yyyy', { locale: id })}
              </p>
              {material.tipe === 'text' && material.konten && (
                <p className="text-sm text-gray-600 line-clamp-3">
                  {material.konten.substring(0, 100)}...
                </p>
              )}
            </div>

            <div className="flex space-x-2">
              <button
                onClick={() => {
                  setSelectedMaterial(material);
                  setShowModal(true);
                }}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
              >
                <Eye size={16} />
                <span>Lihat</span>
              </button>
              {material.tipe === 'pdf' && material.file_url && (
                <a
                  href={material.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center"
                >
                  <Download size={16} />
                </a>
              )}
            </div>
          </div>
        ))}
      </div>

      {filteredMaterials.length === 0 && (
        <div className="text-center py-12">
          <BookOpen className="mx-auto text-gray-400 mb-4" size={48} />
          <p className="text-gray-500">Tidak ada materi pembelajaran</p>
        </div>
      )}

      {/* Material Detail Modal */}
      {showModal && selectedMaterial && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{selectedMaterial.judul}</h3>
                  <p className="text-gray-600">{selectedMaterial.subject.nama_mapel}</p>
                  <p className="text-sm text-gray-500">Guru: {selectedMaterial.guru.nama}</p>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
            </div>
            
            <div className="p-6">
              {selectedMaterial.tipe === 'text' && selectedMaterial.konten ? (
                <div className="prose max-w-none">
                  <div className="whitespace-pre-wrap text-gray-800">
                    {selectedMaterial.konten}
                  </div>
                </div>
              ) : selectedMaterial.tipe === 'pdf' && selectedMaterial.file_url ? (
                <div className="text-center">
                  <div className="mb-4">
                    <Download className="mx-auto text-blue-600 mb-2" size={48} />
                    <p className="text-gray-600">File PDF tersedia untuk diunduh</p>
                  </div>
                  <a
                    href={selectedMaterial.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center space-x-2"
                  >
                    <Download size={20} />
                    <span>Unduh PDF</span>
                  </a>
                </div>
              ) : (
                <p className="text-gray-500 text-center">Konten tidak tersedia</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}