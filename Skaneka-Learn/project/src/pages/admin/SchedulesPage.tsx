import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, Search, Edit, Trash2, Calendar, Clock } from 'lucide-react';

interface Schedule {
  id: string;
  hari: string;
  jam_mulai: string;
  jam_selesai: string;
  mapel_id: string;
  guru_id: string;
  kelas_id: string;
  created_at: string;
  subject: {
    nama_mapel: string;
  };
  guru: {
    nama: string;
  };
  class: {
    tingkat: number;
    nama_kelas: string;
    major: {
      kode_jurusan: string;
    };
  };
}

interface Subject {
  id: string;
  nama_mapel: string;
}

interface Teacher {
  id: string;
  nama: string;
}

interface Class {
  id: string;
  tingkat: number;
  nama_kelas: string;
  major: {
    kode_jurusan: string;
  };
}

const DAYS = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

export function SchedulesPage() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDay, setSelectedDay] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [formData, setFormData] = useState({
    hari: 'Senin',
    jam_mulai: '',
    jam_selesai: '',
    mapel_id: '',
    guru_id: '',
    kelas_id: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const [schedulesData, subjectsData, teachersData, classesData] = await Promise.all([
        supabase
          .from('schedules')
          .select(`
            *,
            subject:subjects(nama_mapel),
            guru:users(nama),
            class:classes(
              tingkat,
              nama_kelas,
              major:majors(kode_jurusan)
            )
          `)
          .order('hari', { ascending: true }),
        supabase
          .from('subjects')
          .select('id, nama_mapel')
          .order('nama_mapel', { ascending: true }),
        supabase
          .from('users')
          .select('id, nama')
          .eq('role', 'guru')
          .order('nama', { ascending: true }),
        supabase
          .from('classes')
          .select(`
            id,
            tingkat,
            nama_kelas,
            major:majors(kode_jurusan)
          `)
          .order('tingkat', { ascending: true })
      ]);

      if (schedulesData.error) throw schedulesData.error;
      if (subjectsData.error) throw subjectsData.error;
      if (teachersData.error) throw teachersData.error;
      if (classesData.error) throw classesData.error;

      setSchedules(schedulesData.data || []);
      setSubjects(subjectsData.data || []);
      setTeachers(teachersData.data || []);
      setClasses(classesData.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (editingSchedule) {
        const { error } = await supabase
          .from('schedules')
          .update(formData)
          .eq('id', editingSchedule.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('schedules')
          .insert(formData);

        if (error) throw error;
      }

      setShowModal(false);
      setEditingSchedule(null);
      setFormData({
        hari: 'Senin',
        jam_mulai: '',
        jam_selesai: '',
        mapel_id: '',
        guru_id: '',
        kelas_id: ''
      });
      fetchData();
    } catch (error: any) {
      alert('Error: ' + error.message);
    }
  }

  async function handleDelete(schedule: Schedule) {
    if (!confirm(`Hapus jadwal ${schedule.subject.nama_mapel}?`)) return;

    try {
      const { error } = await supabase
        .from('schedules')
        .delete()
        .eq('id', schedule.id);

      if (error) throw error;
      fetchData();
    } catch (error: any) {
      alert('Error: ' + error.message);
    }
  }

  const filteredSchedules = schedules.filter(schedule => {
    const matchesSearch = 
      schedule.subject.nama_mapel.toLowerCase().includes(searchTerm.toLowerCase()) ||
      schedule.guru.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
      `${schedule.class.tingkat} ${schedule.class.nama_kelas}`.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDay = selectedDay === '' || schedule.hari === selectedDay;
    
    return matchesSearch && matchesDay;
  });

  const groupedSchedules = DAYS.reduce((acc, day) => {
    acc[day] = filteredSchedules.filter(schedule => schedule.hari === day);
    return acc;
  }, {} as Record<string, Schedule[]>);

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
          <h1 className="text-3xl font-bold text-gray-900">Jadwal Pelajaran</h1>
          <p className="text-gray-600 mt-2">Manajemen jadwal mengajar</p>
        </div>
        <button
          onClick={() => {
            setEditingSchedule(null);
            setFormData({
              hari: 'Senin',
              jam_mulai: '',
              jam_selesai: '',
              mapel_id: '',
              guru_id: '',
              kelas_id: ''
            });
            setShowModal(true);
          }}
          className="bg-pink-600 text-white px-4 py-2 rounded-lg hover:bg-pink-700 transition-colors flex items-center space-x-2"
        >
          <Plus size={20} />
          <span>Tambah Jadwal</span>
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 mb-6">
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Cari jadwal..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 w-full"
              />
            </div>
            <select
              value={selectedDay}
              onChange={(e) => setSelectedDay(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
            >
              <option value="">Semua Hari</option>
              {DAYS.map(day => (
                <option key={day} value={day}>{day}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {DAYS.map(day => (
          <div key={day} className="bg-white rounded-xl border border-gray-200">
            <div className="bg-gradient-to-r from-pink-50 to-rose-50 px-6 py-4 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <Calendar className="text-pink-600" size={24} />
                <h2 className="text-xl font-bold text-gray-900">{day}</h2>
                <span className="bg-pink-100 text-pink-800 px-2 py-1 rounded-full text-sm">
                  {groupedSchedules[day].length} jadwal
                </span>
              </div>
            </div>
            
            {groupedSchedules[day].length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Clock className="mx-auto mb-2" size={32} />
                <p>Tidak ada jadwal</p>
              </div>
            ) : (
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {groupedSchedules[day].map(schedule => (
                    <div key={schedule.id} className="bg-gradient-to-br from-pink-50 to-rose-50 rounded-lg p-4 border border-pink-100 hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center space-x-2">
                          <Clock className="text-pink-600" size={16} />
                          <span className="font-semibold text-pink-800">
                            {schedule.jam_mulai} - {schedule.jam_selesai}
                          </span>
                        </div>
                        <div className="flex space-x-1">
                          <button
                            onClick={() => {
                              setEditingSchedule(schedule);
                              setFormData({
                                hari: schedule.hari,
                                jam_mulai: schedule.jam_mulai,
                                jam_selesai: schedule.jam_selesai,
                                mapel_id: schedule.mapel_id,
                                guru_id: schedule.guru_id,
                                kelas_id: schedule.kelas_id
                              });
                              setShowModal(true);
                            }}
                            className="text-pink-600 hover:text-pink-900 p-1"
                          >
                            <Edit size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(schedule)}
                            className="text-red-600 hover:text-red-900 p-1"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <h4 className="font-bold text-gray-900">{schedule.subject.nama_mapel}</h4>
                        <p className="text-sm text-gray-600">
                          {schedule.class.tingkat} {schedule.class.nama_kelas} - {schedule.class.major.kode_jurusan}
                        </p>
                        <p className="text-sm text-gray-600">{schedule.guru.nama}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">
              {editingSchedule ? 'Edit Jadwal' : 'Tambah Jadwal Baru'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Hari
                </label>
                <select
                  value={formData.hari}
                  onChange={(e) => setFormData({ ...formData, hari: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                  required
                >
                  {DAYS.map(day => (
                    <option key={day} value={day}>{day}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Jam Mulai
                  </label>
                  <input
                    type="time"
                    value={formData.jam_mulai}
                    onChange={(e) => setFormData({ ...formData, jam_mulai: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Jam Selesai
                  </label>
                  <input
                    type="time"
                    value={formData.jam_selesai}
                    onChange={(e) => setFormData({ ...formData, jam_selesai: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mata Pelajaran
                </label>
                <select
                  value={formData.mapel_id}
                  onChange={(e) => setFormData({ ...formData, mapel_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                  required
                >
                  <option value="">Pilih Mata Pelajaran</option>
                  {subjects.map(subject => (
                    <option key={subject.id} value={subject.id}>
                      {subject.nama_mapel}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Guru
                </label>
                <select
                  value={formData.guru_id}
                  onChange={(e) => setFormData({ ...formData, guru_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                  required
                >
                  <option value="">Pilih Guru</option>
                  {teachers.map(teacher => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.nama}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Kelas
                </label>
                <select
                  value={formData.kelas_id}
                  onChange={(e) => setFormData({ ...formData, kelas_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                  required
                >
                  <option value="">Pilih Kelas</option>
                  {classes.map(classItem => (
                    <option key={classItem.id} value={classItem.id}>
                      {classItem.tingkat} {classItem.nama_kelas} - {classItem.major.kode_jurusan}
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
                  className="flex-1 px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors"
                >
                  {editingSchedule ? 'Update' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}