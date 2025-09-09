import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Plus, Search, Edit, Trash2, MessageSquare, Calendar, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

interface Journal {
  id: string;
  catatan: string;
  tanggal: string;
  created_at: string;
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

export function JournalsPage() {
  const { profile } = useAuth();
  const [journals, setJournals] = useState<Journal[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [showModal, setShowModal] = useState(false);
  const [editingJournal, setEditingJournal] = useState<Journal | null>(null);
  const [formData, setFormData] = useState({
    schedule_id: '',
    catatan: '',
    tanggal: format(new Date(), 'yyyy-MM-dd')
  });

  useEffect(() => {
    if (profile) {
      fetchData();
    }
  }, [profile]);

  useEffect(() => {
    if (profile) {
      fetchJournals();
    }
  }, [selectedDate, profile]);

  async function fetchData() {
    try {
      const { data: schedulesData, error } = await supabase
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
        .order('hari', { ascending: true });

      if (error) throw error;
      setSchedules(schedulesData || []);
    } catch (error) {
      console.error('Error fetching schedules:', error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchJournals() {
    try {
      const { data, error } = await supabase
        .from('journals')
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
        .gte('tanggal', selectedDate)
        .lte('tanggal', selectedDate)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setJournals(data || []);
    } catch (error) {
      console.error('Error fetching journals:', error);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const journalData = {
        guru_id: profile?.id,
        schedule_id: formData.schedule_id,
        catatan: formData.catatan,
        tanggal: formData.tanggal
      };

      if (editingJournal) {
        const { error } = await supabase
          .from('journals')
          .update(journalData)
          .eq('id', editingJournal.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('journals')
          .insert(journalData);

        if (error) throw error;
      }

      setShowModal(false);
      setEditingJournal(null);
      setFormData({
        schedule_id: '',
        catatan: '',
        tanggal: format(new Date(), 'yyyy-MM-dd')
      });
      fetchJournals();
    } catch (error: any) {
      alert('Error: ' + error.message);
    }
  }

  async function handleDelete(journal: Journal) {
    if (!confirm('Hapus jurnal ini?')) return;

    try {
      const { error } = await supabase
        .from('journals')
        .delete()
        .eq('id', journal.id);

      if (error) throw error;
      fetchJournals();
    } catch (error: any) {
      alert('Error: ' + error.message);
    }
  }

  const filteredJournals = journals.filter(journal =>
    journal.catatan.toLowerCase().includes(searchTerm.toLowerCase()) ||
    journal.schedule.subject.nama_mapel.toLowerCase().includes(searchTerm.toLowerCase())
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
          <h1 className="text-3xl font-bold text-gray-900">Jurnal Mengajar</h1>
          <p className="text-gray-600 mt-2">Catat aktivitas dan progress pembelajaran</p>
        </div>
        <button
          onClick={() => {
            setEditingJournal(null);
            setFormData({
              schedule_id: '',
              catatan: '',
              tanggal: format(new Date(), 'yyyy-MM-dd')
            });
            setShowModal(true);
          }}
          className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors flex items-center space-x-2"
        >
          <Plus size={20} />
          <span>Tulis Jurnal</span>
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 mb-6">
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Cari jurnal..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 w-full"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Calendar className="text-gray-400" size={20} />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        {filteredJournals.length === 0 ? (
          <div className="text-center py-12">
            <MessageSquare className="mx-auto text-gray-400 mb-4" size={48} />
            <p className="text-gray-500">
              {selectedDate === format(new Date(), 'yyyy-MM-dd') 
                ? 'Belum ada jurnal hari ini' 
                : 'Tidak ada jurnal pada tanggal ini'
              }
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredJournals.map((journal) => (
              <div key={journal.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-3">
                      <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                        <MessageSquare className="text-emerald-600" size={20} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {journal.schedule.subject.nama_mapel}
                        </h3>
                        <p className="text-sm text-gray-600">
                          Kelas {journal.schedule.class.tingkat} {journal.schedule.class.nama_kelas} - {journal.schedule.class.major.kode_jurusan}
                        </p>
                      </div>
                    </div>
                    
                    <div className="bg-gray-50 rounded-lg p-4 mb-3">
                      <p className="text-gray-800 whitespace-pre-wrap">{journal.catatan}</p>
                    </div>
                    
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <div className="flex items-center space-x-1">
                        <Calendar size={14} />
                        <span>{format(new Date(journal.tanggal), 'dd MMMM yyyy', { locale: id })}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Clock size={14} />
                        <span>{journal.schedule.jam_mulai} - {journal.schedule.jam_selesai}</span>
                      </div>
                      <span>•</span>
                      <span>{journal.schedule.hari}</span>
                    </div>
                  </div>
                  
                  <div className="flex space-x-2 ml-4">
                    <button
                      onClick={() => {
                        setEditingJournal(journal);
                        setFormData({
                          schedule_id: journal.schedule_id,
                          catatan: journal.catatan,
                          tanggal: journal.tanggal
                        });
                        setShowModal(true);
                      }}
                      className="text-emerald-600 hover:text-emerald-900 p-1"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(journal)}
                      className="text-red-600 hover:text-red-900 p-1"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">
              {editingJournal ? 'Edit Jurnal' : 'Tulis Jurnal Baru'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Jadwal Mengajar
                  </label>
                  <select
                    value={formData.schedule_id}
                    onChange={(e) => setFormData({ ...formData, schedule_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    required
                  >
                    <option value="">Pilih Jadwal</option>
                    {schedules.map((schedule) => (
                      <option key={schedule.id} value={schedule.id}>
                        {schedule.hari} - {schedule.subject.nama_mapel} - {schedule.class.tingkat} {schedule.class.nama_kelas}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tanggal
                  </label>
                  <input
                    type="date"
                    value={formData.tanggal}
                    onChange={(e) => setFormData({ ...formData, tanggal: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Catatan Jurnal
                </label>
                <textarea
                  value={formData.catatan}
                  onChange={(e) => setFormData({ ...formData, catatan: e.target.value })}
                  rows={8}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="Tulis catatan pembelajaran, materi yang disampaikan, kendala, atau hal penting lainnya..."
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Contoh: Materi yang disampaikan, metode pembelajaran, respon siswa, kendala, dll.
                </p>
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
                  className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                >
                  {editingJournal ? 'Update' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}