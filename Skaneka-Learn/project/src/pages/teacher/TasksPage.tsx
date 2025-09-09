import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Plus, Search, Edit, Trash2, ClipboardList, Clock, Users, Eye, CheckCircle, FileText, Download, Star } from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import * as XLSX from 'xlsx';

interface Task {
  id: string;
  judul: string;
  tipe: 'biasa' | 'quiz';
  deskripsi: string;
  deadline: string;
  created_at: string;
  class: {
    nama_kelas: string;
    tingkat: number;
    major: { kode_jurusan: string };
  };
  subject: {
    nama_mapel: string;
  };
  _count?: {
    submissions: number;
  };
}

interface TaskSubmission {
  id: string;
  siswa_id: string;
  file_url: string | null;
  jawaban_text: string | null;
  nilai: number | null;
  submitted_at: string;
  graded_at: string | null;
  student: {
    nama: string;
    email: string;
  };
}

interface QuizSubmission {
  id: string;
  siswa_id: string;
  nilai: number | null;
  submitted_at: string;
  student: {
    nama: string;
    email: string;
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

interface QuizQuestion {
  id: string;
  pertanyaan: string;
  opsi_a: string;
  opsi_b: string;
  opsi_c: string;
  opsi_d: string;
  kunci: string;
  urutan: number;
}

export function TasksPage() {
  const { profile } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showQuizModal, setShowQuizModal] = useState(false);
  const [showSubmissionsModal, setShowSubmissionsModal] = useState(false);
  const [showQuizSubmissionsModal, setShowQuizSubmissionsModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [taskSubmissions, setTaskSubmissions] = useState<TaskSubmission[]>([]);
  const [quizSubmissions, setQuizSubmissions] = useState<QuizSubmission[]>([]);
  const [gradingSubmission, setGradingSubmission] = useState<TaskSubmission | null>(null);
  const [gradeValue, setGradeValue] = useState('');
  const [formData, setFormData] = useState({
    judul: '',
    tipe: 'biasa' as 'biasa' | 'quiz',
    deskripsi: '',
    deadline: '',
    kelas_id: '',
    mapel_id: ''
  });

  const [questionForm, setQuestionForm] = useState({
    pertanyaan: '',
    opsi_a: '',
    opsi_b: '',
    opsi_c: '',
    opsi_d: '',
    kunci: 'a' as 'a' | 'b' | 'c' | 'd'
  });

  useEffect(() => {
    if (profile) {
      fetchData();
    }
  }, [profile]);

  async function fetchData() {
    try {
      const [tasksData, classesData, subjectsData] = await Promise.all([
        supabase
          .from('tasks')
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

      if (tasksData.error) throw tasksData.error;
      if (classesData.error) throw classesData.error;
      if (subjectsData.error) throw subjectsData.error;

      setTasks(tasksData.data || []);
      
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
      const taskData = {
        guru_id: profile?.id,
        kelas_id: formData.kelas_id,
        mapel_id: formData.mapel_id,
        judul: formData.judul,
        tipe: formData.tipe,
        deskripsi: formData.deskripsi,
        deadline: formData.deadline
      };

      if (editingTask) {
        const { error } = await supabase
          .from('tasks')
          .update(taskData)
          .eq('id', editingTask.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('tasks')
          .insert(taskData);

        if (error) throw error;
      }

      setShowModal(false);
      setEditingTask(null);
      setFormData({
        judul: '',
        tipe: 'biasa',
        deskripsi: '',
        deadline: '',
        kelas_id: '',
        mapel_id: ''
      });
      fetchData();
    } catch (error: any) {
      alert('Error: ' + error.message);
    }
  }

  async function handleDelete(task: Task) {
    if (!confirm(`Hapus tugas "${task.judul}"?`)) return;

    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', task.id);

      if (error) throw error;
      fetchData();
    } catch (error: any) {
      alert('Error: ' + error.message);
    }
  }

  async function fetchTaskSubmissions(taskId: string) {
    try {
      const { data, error } = await supabase
        .from('task_submissions')
        .select(`
          id,
          siswa_id,
          file_url,
          jawaban_text,
          nilai,
          submitted_at,
          graded_at,
          student:users(nama, email)
        `)
        .eq('task_id', taskId)
        .order('submitted_at', { ascending: false });

      if (error) throw error;
      setTaskSubmissions(data || []);
    } catch (error) {
      console.error('Error fetching task submissions:', error);
    }
  }

  async function fetchQuizSubmissions(taskId: string) {
    try {
      const { data, error } = await supabase
        .from('task_submissions')
        .select(`
          id,
          siswa_id,
          nilai,
          submitted_at,
          student:users(nama, email)
        `)
        .eq('task_id', taskId)
        .order('submitted_at', { ascending: false });

      if (error) throw error;
      setQuizSubmissions(data || []);
    } catch (error) {
      console.error('Error fetching quiz submissions:', error);
    }
  }

  async function gradeSubmission(submissionId: string, nilai: number) {
    try {
      const { error } = await supabase
        .from('task_submissions')
        .update({
          nilai: nilai,
          graded_at: new Date().toISOString()
        })
        .eq('id', submissionId);

      if (error) throw error;

      setGradingSubmission(null);
      setGradeValue('');
      if (selectedTask) {
        fetchTaskSubmissions(selectedTask.id);
      }
      alert('Nilai berhasil disimpan!');
    } catch (error: any) {
      alert('Error: ' + error.message);
    }
  }

  function exportToExcel(task: Task, submissions: (TaskSubmission | QuizSubmission)[]) {
    const worksheetData = [
      ['Nama Siswa', 'Email', 'Tanggal Submit', 'Nilai', 'Status'],
      ...submissions.map(submission => [
        submission.student.nama,
        submission.student.email,
        format(new Date(submission.submitted_at), 'dd/MM/yyyy HH:mm'),
        submission.nilai || 'Belum dinilai',
        submission.nilai !== null ? 'Sudah dinilai' : 'Belum dinilai'
      ])
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Nilai');

    // Auto-size columns
    const colWidths = [
      { wch: 25 }, // Nama Siswa
      { wch: 30 }, // Email
      { wch: 20 }, // Tanggal Submit
      { wch: 15 }, // Nilai
      { wch: 15 }  // Status
    ];
    worksheet['!cols'] = colWidths;

    const fileName = `${task.judul}_${format(new Date(), 'dd-MM-yyyy')}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  }

  async function fetchQuizQuestions(taskId: string) {
    try {
      const { data, error } = await supabase
        .from('quiz_questions')
        .select('*')
        .eq('task_id', taskId)
        .order('urutan', { ascending: true });

      if (error) throw error;
      setQuizQuestions(data || []);
    } catch (error) {
      console.error('Error fetching quiz questions:', error);
    }
  }

  async function addQuizQuestion() {
    if (!selectedTask) return;

    try {
      const { error } = await supabase
        .from('quiz_questions')
        .insert({
          task_id: selectedTask.id,
          ...questionForm,
          urutan: quizQuestions.length + 1
        });

      if (error) throw error;

      setQuestionForm({
        pertanyaan: '',
        opsi_a: '',
        opsi_b: '',
        opsi_c: '',
        opsi_d: '',
        kunci: 'a'
      });

      fetchQuizQuestions(selectedTask.id);
    } catch (error: any) {
      alert('Error: ' + error.message);
    }
  }

  async function deleteQuizQuestion(questionId: string) {
    if (!confirm('Hapus pertanyaan ini?')) return;

    try {
      const { error } = await supabase
        .from('quiz_questions')
        .delete()
        .eq('id', questionId);

      if (error) throw error;
      if (selectedTask) {
        fetchQuizQuestions(selectedTask.id);
      }
    } catch (error: any) {
      alert('Error: ' + error.message);
    }
  }

  async function viewQuizSubmissions(taskId: string) {
    try {
      const { data: submissions } = await supabase
        .from('task_submissions')
        .select(`
          id,
          siswa_id,
          nilai,
          submitted_at,
          student:users(nama)
        `)
        .eq('task_id', taskId)
        .order('submitted_at', { ascending: false });

      console.log('Quiz submissions:', submissions);
      // You can add a modal to show submissions here
    } catch (error) {
      console.error('Error fetching quiz submissions:', error);
    }
  }
  const filteredTasks = tasks.filter(task =>
    task.judul.toLowerCase().includes(searchTerm.toLowerCase()) ||
    task.subject.nama_mapel.toLowerCase().includes(searchTerm.toLowerCase())
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
          <h1 className="text-3xl font-bold text-gray-900">Tugas & Quiz</h1>
          <p className="text-gray-600 mt-2">Kelola tugas dan quiz untuk siswa</p>
        </div>
        <button
          onClick={() => {
            setEditingTask(null);
            setFormData({
              judul: '',
              tipe: 'biasa',
              deskripsi: '',
              deadline: '',
              kelas_id: '',
              mapel_id: ''
            });
            setShowModal(true);
          }}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors flex items-center space-x-2"
        >
          <Plus size={20} />
          <span>Buat Tugas/Quiz</span>
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Cari tugas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 w-full max-w-md"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
          {filteredTasks.map((task) => (
            <div key={task.id} className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl p-6 border border-indigo-100 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    task.tipe === 'quiz' ? 'bg-purple-100' : 'bg-indigo-100'
                  }`}>
                    <ClipboardList className={`${
                      task.tipe === 'quiz' ? 'text-purple-600' : 'text-indigo-600'
                    }`} size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-gray-900">{task.judul}</h3>
                    <p className="text-sm text-gray-600">{task.subject.nama_mapel}</p>
                  </div>
                </div>
                <div className="flex space-x-1">
                  {task.tipe === 'quiz' && (
                    <button
                      onClick={() => {
                        setSelectedTask(task);
                        fetchQuizQuestions(task.id);
                        setShowQuizModal(true);
                      }}
                      className="text-purple-600 hover:text-purple-900 p-1"
                      title="Kelola Pertanyaan"
                    >
                      <Eye size={16} />
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setSelectedTask(task);
                      if (task.tipe === 'quiz') {
                        fetchQuizSubmissions(task.id);
                        setShowQuizSubmissionsModal(true);
                      } else {
                        fetchTaskSubmissions(task.id);
                        setShowSubmissionsModal(true);
                      }
                    }}
                    className="text-green-600 hover:text-green-900 p-1"
                    title="Lihat Pengumpulan"
                  >
                    <FileText size={16} />
                  </button>
                  <button
                    onClick={() => {
                      setEditingTask(task);
                      setFormData({
                        judul: task.judul,
                        tipe: task.tipe,
                        deskripsi: task.deskripsi,
                        deadline: task.deadline,
                        kelas_id: '',
                        mapel_id: ''
                      });
                      setShowModal(true);
                    }}
                    className="text-indigo-600 hover:text-indigo-900 p-1"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(task)}
                    className="text-red-600 hover:text-red-900 p-1"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    task.tipe === 'quiz' 
                      ? 'bg-purple-100 text-purple-800' 
                      : 'bg-indigo-100 text-indigo-800'
                  }`}>
                    {task.tipe === 'quiz' ? 'Quiz' : 'Tugas'}
                  </span>
                  {task.tipe === 'quiz' && (
                    <span className="text-xs text-gray-500">
                      Klik ikon mata untuk mengelola soal
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-700">
                  <strong>Kelas:</strong> {task.class.tingkat} {task.class.nama_kelas} - {task.class.major.kode_jurusan}
                </p>
                <p className="text-sm text-gray-700">
                  <strong>Deadline:</strong> {format(new Date(task.deadline), 'dd MMM yyyy HH:mm', { locale: id })}
                </p>
                <p className="text-sm text-gray-600 line-clamp-2">
                  {task.deskripsi}
                </p>
                <div className="flex items-center space-x-2 text-xs text-gray-500 mt-3">
                  <Clock size={14} />
                  <span>Dibuat: {format(new Date(task.created_at), 'dd MMM yyyy', { locale: id })}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredTasks.length === 0 && (
          <div className="text-center py-12">
            <ClipboardList className="mx-auto text-gray-400 mb-4" size={48} />
            <p className="text-gray-500">Belum ada tugas atau quiz</p>
          </div>
        )}
      </div>

      {/* Task Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">
              {editingTask ? 'Edit Tugas/Quiz' : 'Buat Tugas/Quiz Baru'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Judul
                </label>
                <input
                  type="text"
                  value={formData.judul}
                  onChange={(e) => setFormData({ ...formData, judul: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipe
                  </label>
                  <select
                    value={formData.tipe}
                    onChange={(e) => setFormData({ ...formData, tipe: e.target.value as 'biasa' | 'quiz' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  >
                    <option value="biasa">Tugas Biasa</option>
                    <option value="quiz">Quiz</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Deadline
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.deadline}
                    onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Kelas
                  </label>
                  <select
                    value={formData.kelas_id}
                    onChange={(e) => setFormData({ ...formData, kelas_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
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
                  Deskripsi
                </label>
                <textarea
                  value={formData.deskripsi}
                  onChange={(e) => setFormData({ ...formData, deskripsi: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Deskripsi tugas atau instruksi quiz..."
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
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  {editingTask ? 'Update' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quiz Questions Modal */}
      {showQuizModal && selectedTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-lg font-semibold">Kelola Pertanyaan Quiz</h3>
                <p className="text-gray-600">{selectedTask.judul}</p>
              </div>
              <button
                onClick={() => setShowQuizModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            {/* Add Question Form */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h4 className="font-medium mb-4">Tambah Pertanyaan Baru</h4>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Pertanyaan"
                  value={questionForm.pertanyaan}
                  onChange={(e) => setQuestionForm({ ...questionForm, pertanyaan: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="Opsi A"
                    value={questionForm.opsi_a}
                    onChange={(e) => setQuestionForm({ ...questionForm, opsi_a: e.target.value })}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  <input
                    type="text"
                    placeholder="Opsi B"
                    value={questionForm.opsi_b}
                    onChange={(e) => setQuestionForm({ ...questionForm, opsi_b: e.target.value })}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  <input
                    type="text"
                    placeholder="Opsi C"
                    value={questionForm.opsi_c}
                    onChange={(e) => setQuestionForm({ ...questionForm, opsi_c: e.target.value })}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  <input
                    type="text"
                    placeholder="Opsi D"
                    value={questionForm.opsi_d}
                    onChange={(e) => setQuestionForm({ ...questionForm, opsi_d: e.target.value })}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div className="flex items-center space-x-4">
                  <label className="text-sm font-medium text-gray-700">Jawaban Benar:</label>
                  <select
                    value={questionForm.kunci}
                    onChange={(e) => setQuestionForm({ ...questionForm, kunci: e.target.value as 'a' | 'b' | 'c' | 'd' })}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="a">A</option>
                    <option value="b">B</option>
                    <option value="c">C</option>
                    <option value="d">D</option>
                  </select>
                  <button
                    onClick={addQuizQuestion}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    Tambah Pertanyaan
                  </button>
                </div>
              </div>
            </div>

            {/* Questions List */}
            <div className="space-y-4">
              <h4 className="font-medium">Daftar Pertanyaan ({quizQuestions.length})</h4>
              {quizQuestions.map((question, index) => (
                <div key={question.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <h5 className="font-medium">Pertanyaan {index + 1}</h5>
                    <button
                      onClick={() => deleteQuizQuestion(question.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <p className="mb-3">{question.pertanyaan}</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className={`p-2 rounded ${question.kunci === 'a' ? 'bg-green-100 text-green-800' : 'bg-gray-100'}`}>
                      A. {question.opsi_a}
                    </div>
                    <div className={`p-2 rounded ${question.kunci === 'b' ? 'bg-green-100 text-green-800' : 'bg-gray-100'}`}>
                      B. {question.opsi_b}
                    </div>
                    <div className={`p-2 rounded ${question.kunci === 'c' ? 'bg-green-100 text-green-800' : 'bg-gray-100'}`}>
                      C. {question.opsi_c}
                    </div>
                    <div className={`p-2 rounded ${question.kunci === 'd' ? 'bg-green-100 text-green-800' : 'bg-gray-100'}`}>
                      D. {question.opsi_d}
                    </div>
                  </div>
                </div>
              ))}
              
              {quizQuestions.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  Belum ada pertanyaan. Tambahkan pertanyaan untuk quiz ini.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Task Submissions Modal */}
      {showSubmissionsModal && selectedTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-6xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-lg font-semibold">Pengumpulan Tugas</h3>
                <p className="text-gray-600">{selectedTask.judul}</p>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => exportToExcel(selectedTask, taskSubmissions)}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
                >
                  <Download size={16} />
                  <span>Export Excel</span>
                </button>
                <button
                  onClick={() => setShowSubmissionsModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Siswa
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tanggal Submit
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Jawaban
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nilai
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {taskSubmissions.map((submission) => (
                    <tr key={submission.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{submission.student.nama}</div>
                          <div className="text-sm text-gray-500">{submission.student.email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {format(new Date(submission.submitted_at), 'dd MMM yyyy HH:mm', { locale: id })}
                      </td>
                      <td className="px-6 py-4">
                        <div className="max-w-xs">
                          {submission.jawaban_text && (
                            <p className="text-sm text-gray-900 line-clamp-3">{submission.jawaban_text}</p>
                          )}
                          {submission.file_url && (
                            <a
                              href={submission.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 text-sm flex items-center space-x-1"
                            >
                              <FileText size={14} />
                              <span>Lihat File</span>
                            </a>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {submission.nilai !== null ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            {submission.nilai}/100
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            Belum dinilai
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => {
                            setGradingSubmission(submission);
                            setGradeValue(submission.nilai?.toString() || '');
                          }}
                          className="text-indigo-600 hover:text-indigo-900 flex items-center space-x-1"
                        >
                          <Star size={14} />
                          <span>Beri Nilai</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {taskSubmissions.length === 0 && (
              <div className="text-center py-12">
                <FileText className="mx-auto text-gray-400 mb-4" size={48} />
                <p className="text-gray-500">Belum ada pengumpulan tugas</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Quiz Submissions Modal */}
      {showQuizSubmissionsModal && selectedTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-lg font-semibold">Hasil Quiz</h3>
                <p className="text-gray-600">{selectedTask.judul}</p>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => exportToExcel(selectedTask, quizSubmissions)}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
                >
                  <Download size={16} />
                  <span>Export Excel</span>
                </button>
                <button
                  onClick={() => setShowQuizSubmissionsModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Siswa
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tanggal Mengerjakan
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nilai
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {quizSubmissions.map((submission) => (
                    <tr key={submission.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{submission.student.nama}</div>
                          <div className="text-sm text-gray-500">{submission.student.email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {format(new Date(submission.submitted_at), 'dd MMM yyyy HH:mm', { locale: id })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          submission.nilai !== null 
                            ? submission.nilai >= 75 
                              ? 'bg-green-100 text-green-800' 
                              : submission.nilai >= 60 
                                ? 'bg-yellow-100 text-yellow-800' 
                                : 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {submission.nilai !== null ? `${submission.nilai}/100` : 'N/A'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          submission.nilai !== null 
                            ? submission.nilai >= 75 
                              ? 'bg-green-100 text-green-800' 
                              : submission.nilai >= 60 
                                ? 'bg-yellow-100 text-yellow-800' 
                                : 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {submission.nilai !== null 
                            ? submission.nilai >= 75 
                              ? 'Lulus' 
                              : submission.nilai >= 60 
                                ? 'Cukup' 
                                : 'Perlu Perbaikan'
                            : 'Belum Selesai'
                          }
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {quizSubmissions.length === 0 && (
              <div className="text-center py-12">
                <ClipboardList className="mx-auto text-gray-400 mb-4" size={48} />
                <p className="text-gray-500">Belum ada yang mengerjakan quiz</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Grading Modal */}
      {gradingSubmission && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Beri Nilai</h3>
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">Siswa: {gradingSubmission.student.nama}</p>
              <p className="text-sm text-gray-600 mb-4">Tugas: {selectedTask?.judul}</p>
              
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nilai (0-100)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={gradeValue}
                onChange={(e) => setGradeValue(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Masukkan nilai..."
              />
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setGradingSubmission(null);
                  setGradeValue('');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={() => {
                  const nilai = parseInt(gradeValue);
                  if (nilai >= 0 && nilai <= 100) {
                    gradeSubmission(gradingSubmission.id, nilai);
                  } else {
                    alert('Nilai harus antara 0-100');
                  }
                }}
                disabled={!gradeValue || parseInt(gradeValue) < 0 || parseInt(gradeValue) > 100}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Simpan Nilai
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}