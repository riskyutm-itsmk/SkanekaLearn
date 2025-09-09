import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { ClipboardList, Clock, CheckCircle, Upload, Eye, Send, AlertTriangle } from 'lucide-react';

interface Task {
  id: string;
  judul: string;
  tipe: 'biasa' | 'quiz';
  deskripsi: string;
  deadline: string;
  created_at: string;
  subject: { nama_mapel: string };
  guru: { nama: string };
  submission?: {
    id: string;
    file_url: string | null;
    jawaban_text: string | null;
    nilai: number | null;
    submitted_at: string;
  };
}

interface QuizQuestion {
  id: string;
  pertanyaan: string;
  opsi_a: string;
  opsi_b: string;
  opsi_c: string;
  opsi_d: string;
  urutan: number;
}

export function TasksPage() {
  const { profile } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showQuizModal, setShowQuizModal] = useState(false);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({});
  const [submissionForm, setSubmissionForm] = useState({
    jawaban_text: '',
    file_url: ''
  });

  useEffect(() => {
    if (profile) {
      fetchTasks();
    }
  }, [profile]);

  async function fetchTasks() {
    try {
      // Get student's class first
      const { data: classData } = await supabase
        .from('students_classes')
        .select('kelas_id')
        .eq('siswa_id', profile?.id)
        .eq('status', 'aktif')
        .maybeSingle();

      if (!classData) return;

      // Get tasks for the class with submissions
      const { data: tasksData } = await supabase
        .from('tasks')
        .select(`
          id,
          judul,
          tipe,
          deskripsi,
          deadline,
          created_at,
          subject:subjects(nama_mapel),
          guru:users(nama)
        `)
        .eq('kelas_id', classData.kelas_id)
        .order('created_at', { ascending: false });

      if (tasksData) {
        // Get submissions for each task
        const tasksWithSubmissions = await Promise.all(
          tasksData.map(async (task) => {
            const { data: submission } = await supabase
              .from('task_submissions')
              .select('id, file_url, jawaban_text, nilai, submitted_at')
              .eq('task_id', task.id)
              .eq('siswa_id', profile?.id)
              .maybeSingle();

            return {
              ...task,
              submission: submission || undefined
            };
          })
        );

        setTasks(tasksWithSubmissions);
      }
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchQuizQuestions(taskId: string) {
    try {
      const { data } = await supabase
        .from('quiz_questions')
        .select('*')
        .eq('task_id', taskId)
        .order('urutan', { ascending: true });

      setQuizQuestions(data || []);
    } catch (error) {
      console.error('Error fetching quiz questions:', error);
    }
  }

  async function submitTask(taskId: string) {
    try {
      const { error } = await supabase
        .from('task_submissions')
        .insert({
          task_id: taskId,
          siswa_id: profile?.id,
          jawaban_text: submissionForm.jawaban_text || null,
          file_url: submissionForm.file_url || null,
          submitted_at: new Date().toISOString()
        });

      if (error) throw error;

      setShowModal(false);
      setSubmissionForm({ jawaban_text: '', file_url: '' });
      fetchTasks();
      alert('Tugas berhasil dikumpulkan!');
    } catch (error: any) {
      alert('Error: ' + error.message);
    }
  }

  async function submitQuiz(taskId: string) {
    try {
      // Get quiz questions to calculate score
      const { data: questions } = await supabase
        .from('quiz_questions')
        .select('id, kunci')
        .eq('task_id', taskId);

      if (!questions) throw new Error('Tidak dapat mengambil data soal');

      // Calculate score
      let correctAnswers = 0;
      const totalQuestions = questions.length;

      // Submit quiz answers with auto-correction
      const answers = Object.entries(quizAnswers).map(([questionId, answer]) => {
        const question = questions.find(q => q.id === questionId);
        const isCorrect = question && question.kunci === answer;
        
        if (isCorrect) {
          correctAnswers++;
        }

        return {
          question_id: questionId,
          siswa_id: profile?.id,
          jawaban: answer,
          benar_salah: isCorrect
        };
      });

      const { error: answersError } = await supabase
        .from('quiz_answers')
        .insert(answers);

      if (answersError) throw answersError;

      // Calculate final score (0-100)
      const finalScore = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;

      // Create submission record
      const { error: submissionError } = await supabase
        .from('task_submissions')
        .insert({
          task_id: taskId,
          siswa_id: profile?.id,
          nilai: finalScore,
          submitted_at: new Date().toISOString()
        });

      if (submissionError) throw submissionError;

      setShowQuizModal(false);
      setQuizAnswers({});
      fetchTasks();
      alert(`Quiz berhasil dikumpulkan!\nNilai Anda: ${finalScore}/100\nJawaban benar: ${correctAnswers}/${totalQuestions}`);
    } catch (error: any) {
      alert('Error: ' + error.message);
    }
  }

  const isTaskOverdue = (deadline: string) => {
    return new Date() > new Date(deadline);
  };

  const getTaskStatus = (task: Task) => {
    if (task.submission) {
      return { status: 'submitted', color: 'bg-green-100 text-green-800', text: 'Sudah Dikumpulkan' };
    } else if (isTaskOverdue(task.deadline)) {
      return { status: 'overdue', color: 'bg-red-100 text-red-800', text: 'Terlambat' };
    } else {
      return { status: 'pending', color: 'bg-yellow-100 text-yellow-800', text: 'Belum Dikumpulkan' };
    }
  };

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
        <h1 className="text-3xl font-bold text-gray-900">Tugas & Quiz</h1>
        <p className="text-gray-600 mt-2">Lihat dan kerjakan tugas dari guru Anda</p>
      </div>

      {/* Tasks Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tasks.map((task) => {
          const status = getTaskStatus(task);
          const isOverdue = isTaskOverdue(task.deadline);
          
          return (
            <div key={task.id} className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    task.tipe === 'quiz' ? 'bg-purple-100' : 'bg-blue-100'
                  }`}>
                    <ClipboardList className={`${
                      task.tipe === 'quiz' ? 'text-purple-600' : 'text-blue-600'
                    }`} size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-gray-900">{task.judul}</h3>
                    <p className="text-sm text-gray-600">{task.subject.nama_mapel}</p>
                  </div>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${status.color}`}>
                  {status.text}
                </span>
              </div>
              
              <div className="space-y-2 mb-4">
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    task.tipe === 'quiz' 
                      ? 'bg-purple-100 text-purple-800' 
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {task.tipe === 'quiz' ? 'Quiz' : 'Tugas'}
                  </span>
                  {isOverdue && !task.submission && (
                    <AlertTriangle className="text-red-500" size={16} />
                  )}
                </div>
                <p className="text-sm text-gray-700">
                  <strong>Guru:</strong> {task.guru.nama}
                </p>
                <p className="text-sm text-gray-700">
                  <strong>Deadline:</strong> {format(new Date(task.deadline), 'dd MMM yyyy HH:mm', { locale: id })}
                </p>
                <p className="text-sm text-gray-600 line-clamp-2">
                  {task.deskripsi}
                </p>
                {task.submission && (
                  <div className="bg-green-50 rounded-lg p-3 mt-3">
                    <p className="text-sm text-green-800">
                      <strong>Dikumpulkan:</strong> {format(new Date(task.submission.submitted_at), 'dd MMM yyyy HH:mm', { locale: id })}
                    </p>
                    {task.submission.nilai !== null && (
                      <p className="text-sm text-green-800">
                        <strong>Nilai:</strong> {task.submission.nilai}/100
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="flex space-x-2">
                <button
                  onClick={() => {
                    setSelectedTask(task);
                    setShowModal(true);
                  }}
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
                >
                  <Eye size={16} />
                  <span>Lihat Detail</span>
                </button>
                {!task.submission && !isOverdue && (
                  <button
                    onClick={() => {
                      setSelectedTask(task);
                      if (task.tipe === 'quiz') {
                        fetchQuizQuestions(task.id);
                        setShowQuizModal(true);
                      } else {
                        setShowModal(true);
                      }
                    }}
                    className="bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center space-x-2"
                  >
                    <Send size={16} />
                    <span>{task.tipe === 'quiz' ? 'Kerjakan' : 'Kumpulkan'}</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {tasks.length === 0 && (
        <div className="text-center py-12">
          <ClipboardList className="mx-auto text-gray-400 mb-4" size={48} />
          <p className="text-gray-500">Tidak ada tugas atau quiz</p>
        </div>
      )}

      {/* Task Detail Modal */}
      {showModal && selectedTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{selectedTask.judul}</h3>
                  <p className="text-gray-600">{selectedTask.subject.nama_mapel}</p>
                  <p className="text-sm text-gray-500">Guru: {selectedTask.guru.nama}</p>
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
              <div className="mb-6">
                <h4 className="font-semibold mb-2">Deskripsi Tugas:</h4>
                <p className="text-gray-700 whitespace-pre-wrap">{selectedTask.deskripsi}</p>
              </div>

              <div className="mb-6">
                <p className="text-sm text-gray-600">
                  <strong>Deadline:</strong> {format(new Date(selectedTask.deadline), 'dd MMMM yyyy HH:mm', { locale: id })}
                </p>
              </div>

              {!selectedTask.submission && !isTaskOverdue(selectedTask.deadline) && selectedTask.tipe === 'biasa' && (
                <div className="space-y-4">
                  <h4 className="font-semibold">Kumpulkan Tugas:</h4>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Jawaban (Teks)
                    </label>
                    <textarea
                      value={submissionForm.jawaban_text}
                      onChange={(e) => setSubmissionForm({ ...submissionForm, jawaban_text: e.target.value })}
                      rows={6}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Tulis jawaban Anda di sini..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      URL File (Opsional)
                    </label>
                    <input
                      type="url"
                      value={submissionForm.file_url}
                      onChange={(e) => setSubmissionForm({ ...submissionForm, file_url: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="https://drive.google.com/..."
                    />
                  </div>
                  <button
                    onClick={() => submitTask(selectedTask.id)}
                    disabled={!submissionForm.jawaban_text && !submissionForm.file_url}
                    className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Kumpulkan Tugas
                  </button>
                </div>
              )}

              {selectedTask.submission && (
                <div className="bg-green-50 rounded-lg p-4">
                  <h4 className="font-semibold text-green-800 mb-2">Tugas Sudah Dikumpulkan</h4>
                  <p className="text-sm text-green-700">
                    Dikumpulkan pada: {format(new Date(selectedTask.submission.submitted_at), 'dd MMMM yyyy HH:mm', { locale: id })}
                  </p>
                  {selectedTask.submission.nilai !== null && (
                    <p className="text-sm text-green-700 mt-1">
                      Nilai: {selectedTask.submission.nilai}/100
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Quiz Modal */}
      {showQuizModal && selectedTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{selectedTask.judul}</h3>
                  <p className="text-gray-600">{selectedTask.subject.nama_mapel}</p>
                  <p className="text-sm text-gray-500">
                    {quizQuestions.length} pertanyaan • Deadline: {format(new Date(selectedTask.deadline), 'dd MMM yyyy HH:mm', { locale: id })}
                  </p>
                </div>
                <button
                  onClick={() => setShowQuizModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
            </div>
            
            <div className="p-6">
              <div className="mb-6">
                <p className="text-gray-700">{selectedTask.deskripsi}</p>
              </div>

              <div className="space-y-6">
                {quizQuestions.map((question, index) => (
                  <div key={question.id} className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-semibold mb-4">
                      {index + 1}. {question.pertanyaan}
                    </h4>
                    <div className="space-y-2">
                      {['a', 'b', 'c', 'd'].map((option) => (
                        <label key={option} className="flex items-center space-x-3 cursor-pointer">
                          <input
                            type="radio"
                            name={`question-${question.id}`}
                            value={option}
                            checked={quizAnswers[question.id] === option}
                            onChange={(e) => setQuizAnswers({
                              ...quizAnswers,
                              [question.id]: e.target.value
                            })}
                            className="text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-gray-700">
                            {option.toUpperCase()}. {question[`opsi_${option}` as keyof QuizQuestion]}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-8 pt-6 border-t border-gray-200">
                <button
                  onClick={() => submitQuiz(selectedTask.id)}
                  disabled={Object.keys(quizAnswers).length !== quizQuestions.length}
                  className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Kumpulkan Quiz ({Object.keys(quizAnswers).length}/{quizQuestions.length} terjawab)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}