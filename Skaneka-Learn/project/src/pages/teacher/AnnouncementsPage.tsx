import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Plus, Search, Edit, Trash2, Megaphone, Eye, EyeOff } from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

interface Announcement {
  id: string;
  judul: string;
  konten: string;
  tipe: 'umum' | 'kelas';
  target_role: 'semua' | 'guru' | 'siswa';
  kelas_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  class?: {
    nama_kelas: string;
    tingkat: number;
    major: { kode_jurusan: string };
  };
}

interface Class {
  id: string;
  nama_kelas: string;
  tingkat: number;
  major: { kode_jurusan: string };
}

export function AnnouncementsPage() {
  const { profile } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [formData, setFormData] = useState({
    judul: '',
    konten: '',
    target_role: 'siswa' as 'siswa',
    kelas_id: ''
  });

  useEffect(() => {
    if (profile) {
      fetchData();
    }
  }, [profile]);

  async function fetchData() {
    try {
      // Get teacher's classes
      const { data: schedulesData } = await supabase
        .from('schedules')
        .select(`
          class:classes(
            id,
            nama_kelas,
            tingkat,
            major:majors(kode_jurusan)
          )
        `)
        .eq('guru_id', profile?.id);

      const uniqueClasses = schedulesData
        ?.map(s => s.class)
        .filter((cls, index, self) => 
          cls && self.findIndex(c => c?.id === cls.id) === index
        ) || [];

      setClasses(uniqueClasses);

      // Get announcements created by this teacher
      const { data: announcementsData } = await supabase
        .from('announcements')
        .select(`
          *,
          class:classes(
            nama_kelas,
            tingkat,
            major:majors(kode_jurusan)
          )
        `)
        .eq('created_by', profile?.id)
        .order('created_at', { ascending: false });

      setAnnouncements(announcementsData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const announcementData = {
        judul: formData.judul,
        konten: formData.konten,
        tipe: 'kelas' as const,
        target_role: formData.target_role,
        kelas_id: formData.kelas_id,
        created_by: profile?.id,
        is_active: true
      };

      if (editingAnnouncement) {
        const { error } = await supabase
          .from('announcements')
          .update(announcementData)
          .eq('id', editingAnnouncement.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('announcements')
          .insert(announcementData);

        if (error) throw error;
      }

      setShowModal(false);
      setEditingAnnouncement(null);
      setFormData({
        judul: '',
        konten: '',
        target_role: 'siswa',
        kelas_id: ''
      });
      fetchData();
    } catch (error: any) {
      alert('Error: ' + error.message);
    }
  }

  async function handleDelete(announcement: Announcement) {
    if (!confirm(`Hapus pengumuman "${announcement.judul}"?`)) return;

    try {
      const { error } = await supabase
        .from('announcements')
        .delete()
        .eq('id', announcement.id);

      if (error) throw error;
      fetchData();
    } catch (error: any) {
      alert('Error: ' + error.message);
    }
  }

  async function toggleActive(announcement: Announcement) {
    try {
      const { error } = await supabase
        .from('announcements')
        .update({ is_active: !announcement.is_active })
        .eq('id', announcement.id);

      if (error) throw error;
      fetchData();
    } catch (error: any) {
      alert('Error: ' + error.message);
    }
  }

  const filteredAnnouncements = announcements.filter(announcement =>
    announcement.judul.toLowerCase().includes(searchTerm.toLowerCase()) ||
    announcement.konten.toLowerCase().includes(searchTerm.toLowerCase())
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
          <h1 className="text-3xl font-bold text-gray-900">Pengumuman Kelas</h1>
          <p className="text-gray-600 mt-2">Buat pengumuman untuk kelas yang Anda ajar</p>
        </div>
        <button
          onClick={() => {
            setEditingAnnouncement(null);
            setFormData({
              judul: '',
              konten: '',
              target_role: 'siswa',
              kelas_id: ''
            });
            setShowModal(true);
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
        >
          <Plus size={20} />
          <span>Buat Pengumuman</span>
        </button>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl p-6 border border-gray-200 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Cari pengumuman..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full max-w-md"
          />
        </div>
      </div>

      {/* Announcements List */}
      <div className="space-y-4">
        {filteredAnnouncements.map((announcement) => (
          <div key={announcement.id} className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-start space-x-4 flex-1">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <Megaphone className="text-blue-600" size={24} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-lg font-bold text-gray-900">{announcement.judul}</h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      announcement.target_role === 'guru' ? 'bg-orange-100 text-orange-800' :
                      'bg-indigo-100 text-indigo-800'
                    }`}>
                      {announcement.target_role === 'guru' ? 'Guru' : 'Siswa'}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      announcement.is_active 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {announcement.is_active ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </div>
                  <p className="text-gray-700 mb-3">{announcement.konten}</p>
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    {announcement.class && (
                      <span>
                        Kelas: {announcement.class.tingkat} {announcement.class.nama_kelas} - {announcement.class.major.kode_jurusan}
                      </span>
                    )}
                    <span>{format(new Date(announcement.created_at), 'dd MMM yyyy HH:mm', { locale: id })}</span>
                  </div>
                </div>
              </div>
              
              <div className="flex space-x-2">
                <button
                  onClick={() => toggleActive(announcement)}
                  className={`p-2 rounded-lg transition-colors ${
                    announcement.is_active 
                      ? 'text-green-600 hover:bg-green-100' 
                      : 'text-red-600 hover:bg-red-100'
                  }`}
                  title={announcement.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                >
                  {announcement.is_active ? <Eye size={16} /> : <EyeOff size={16} />}
                </button>
                <button
                  onClick={() => {
                    setEditingAnnouncement(announcement);
                    setFormData({
                      judul: announcement.judul,
                      konten: announcement.konten,
                      target_role: announcement.target_role as 'siswa',
                      kelas_id: announcement.kelas_id || ''
                    });
                    setShowModal(true);
                  }}
                  className="text-blue-600 hover:text-blue-900 p-2"
                >
                  <Edit size={16} />
                </button>
                <button
                  onClick={() => handleDelete(announcement)}
                  className="text-red-600 hover:text-red-900 p-2"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredAnnouncements.length === 0 && (
        <div className="text-center py-12">
          <Megaphone className="mx-auto text-gray-400 mb-4" size={48} />
          <p className="text-gray-500">Belum ada pengumuman</p>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">
              {editingAnnouncement ? 'Edit Pengumuman' : 'Buat Pengumuman Baru'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Judul Pengumuman
                </label>
                <input
                  type="text"
                  value={formData.judul}
                  onChange={(e) => setFormData({ ...formData, judul: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Target Audience
                </label>
                <select
                  value={formData.target_role}
                  onChange={(e) => setFormData({ ...formData, target_role: e.target.value as 'siswa' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="siswa">Siswa</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Guru hanya dapat membuat pengumuman untuk siswa di kelas yang diajar
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Pilih Kelas
                </label>
                <select
                  value={formData.kelas_id}
                  onChange={(e) => setFormData({ ...formData, kelas_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                  Konten Pengumuman
                </label>
                <textarea
                  value={formData.konten}
                  onChange={(e) => setFormData({ ...formData, konten: e.target.value })}
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Tulis konten pengumuman di sini..."
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
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {editingAnnouncement ? 'Update' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}