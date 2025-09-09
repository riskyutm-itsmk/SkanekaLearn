import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { id } from 'date-fns/locale';
import { BarChart3, Download, Calendar, Users, GraduationCap, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';
import * as XLSX from 'xlsx';

interface TeacherAttendanceReport {
  teacher_id: string;
  teacher_name: string;
  total_schedules: number;
  attended: number;
  absent: number;
  late: number;
  attendance_percentage: number;
}

interface StudentAttendanceReport {
  student_id: string;
  student_name: string;
  class_name: string;
  total_sessions: number;
  present: number;
  absent: number;
  excused: number;
  sick: number;
  attendance_percentage: number;
}

interface ClassAttendanceReport {
  class_id: string;
  class_name: string;
  total_students: number;
  average_attendance: number;
}

export function AttendanceReportsPage() {
  const [teacherReports, setTeacherReports] = useState<TeacherAttendanceReport[]>([]);
  const [studentReports, setStudentReports] = useState<StudentAttendanceReport[]>([]);
  const [classReports, setClassReports] = useState<ClassAttendanceReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [activeTab, setActiveTab] = useState<'teachers' | 'students' | 'classes'>('teachers');

  useEffect(() => {
    fetchReports();
  }, [selectedMonth]);

  async function fetchReports() {
    setLoading(true);
    try {
      await Promise.all([
        fetchTeacherReports(),
        fetchStudentReports(),
        fetchClassReports()
      ]);
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchTeacherReports() {
    try {
      const startDate = format(startOfMonth(new Date(selectedMonth)), 'yyyy-MM-dd');
      const endDate = format(endOfMonth(new Date(selectedMonth)), 'yyyy-MM-dd');

      // Get all teachers
      const { data: teachers } = await supabase
        .from('users')
        .select('id, nama')
        .eq('role', 'guru');

      if (!teachers) return;

      const reports: TeacherAttendanceReport[] = [];

      for (const teacher of teachers) {
        // Get teacher's schedules for the month
        const { data: schedules } = await supabase
          .from('schedules')
          .select('id')
          .eq('guru_id', teacher.id);

        // Get attendance records
        const { data: attendance } = await supabase
          .from('teacher_attendance')
          .select('status, jam_masuk')
          .eq('guru_id', teacher.id)
          .gte('tanggal', startDate)
          .lte('tanggal', endDate);

        const totalSchedules = schedules?.length || 0;
        const attendanceRecords = attendance || [];
        
        const attended = attendanceRecords.filter(a => a.status === 'hadir' && a.jam_masuk).length;
        const absent = attendanceRecords.filter(a => a.status === 'tidak_hadir').length;
        const late = attendanceRecords.filter(a => a.status === 'hadir' && a.jam_masuk && 
          new Date(`1970-01-01T${a.jam_masuk}`) > new Date(`1970-01-01T08:00:00`)).length;

        const attendancePercentage = totalSchedules > 0 ? Math.round((attended / totalSchedules) * 100) : 0;

        reports.push({
          teacher_id: teacher.id,
          teacher_name: teacher.nama,
          total_schedules: totalSchedules,
          attended,
          absent,
          late,
          attendance_percentage: attendancePercentage
        });
      }

      setTeacherReports(reports.sort((a, b) => b.attendance_percentage - a.attendance_percentage));
    } catch (error) {
      console.error('Error fetching teacher reports:', error);
    }
  }

  async function fetchStudentReports() {
    try {
      const startDate = format(startOfMonth(new Date(selectedMonth)), 'yyyy-MM-dd');
      const endDate = format(endOfMonth(new Date(selectedMonth)), 'yyyy-MM-dd');

      // Get all active students with their classes
      const { data: students } = await supabase
        .from('students_classes')
        .select(`
          siswa_id,
          student:users(nama),
          kelas:classes(
            id,
            nama_kelas,
            tingkat,
            major:majors(kode_jurusan)
          )
        `)
        .eq('status', 'aktif');

      if (!students) return;

      const reports: StudentAttendanceReport[] = [];

      for (const studentClass of students) {
        if (!studentClass.student || !studentClass.kelas) continue;

        // Get attendance records for this student
        const { data: attendance } = await supabase
          .from('attendance')
          .select('status')
          .eq('siswa_id', studentClass.siswa_id)
          .gte('tanggal', startDate)
          .lte('tanggal', endDate);

        const attendanceRecords = attendance || [];
        const totalSessions = attendanceRecords.length;
        
        const present = attendanceRecords.filter(a => a.status === 'hadir').length;
        const absent = attendanceRecords.filter(a => a.status === 'tidak_hadir').length;
        const excused = attendanceRecords.filter(a => a.status === 'izin').length;
        const sick = attendanceRecords.filter(a => a.status === 'sakit').length;

        const attendancePercentage = totalSessions > 0 ? Math.round((present / totalSessions) * 100) : 0;

        reports.push({
          student_id: studentClass.siswa_id,
          student_name: studentClass.student.nama,
          class_name: `${studentClass.kelas.tingkat} ${studentClass.kelas.nama_kelas} - ${studentClass.kelas.major.kode_jurusan}`,
          total_sessions: totalSessions,
          present,
          absent,
          excused,
          sick,
          attendance_percentage: attendancePercentage
        });
      }

      setStudentReports(reports.sort((a, b) => b.attendance_percentage - a.attendance_percentage));
    } catch (error) {
      console.error('Error fetching student reports:', error);
    }
  }

  async function fetchClassReports() {
    try {
      const startDate = format(startOfMonth(new Date(selectedMonth)), 'yyyy-MM-dd');
      const endDate = format(endOfMonth(new Date(selectedMonth)), 'yyyy-MM-dd');

      // Get all classes with student count
      const { data: classes } = await supabase
        .from('classes')
        .select(`
          id,
          nama_kelas,
          tingkat,
          major:majors(kode_jurusan),
          students:students_classes(count)
        `)
        .eq('students_classes.status', 'aktif');

      if (!classes) return;

      const reports: ClassAttendanceReport[] = [];

      for (const classData of classes) {
        // Get students in this class
        const { data: students } = await supabase
          .from('students_classes')
          .select('siswa_id')
          .eq('kelas_id', classData.id)
          .eq('status', 'aktif');

        if (!students || students.length === 0) continue;

        const studentIds = students.map(s => s.siswa_id);

        // Get attendance for all students in this class
        const { data: attendance } = await supabase
          .from('attendance')
          .select('siswa_id, status')
          .in('siswa_id', studentIds)
          .gte('tanggal', startDate)
          .lte('tanggal', endDate);

        const attendanceRecords = attendance || [];
        const totalSessions = attendanceRecords.length;
        const presentSessions = attendanceRecords.filter(a => a.status === 'hadir').length;

        const averageAttendance = totalSessions > 0 ? Math.round((presentSessions / totalSessions) * 100) : 0;

        reports.push({
          class_id: classData.id,
          class_name: `${classData.tingkat} ${classData.nama_kelas} - ${classData.major.kode_jurusan}`,
          total_students: students.length,
          average_attendance: averageAttendance
        });
      }

      setClassReports(reports.sort((a, b) => b.average_attendance - a.average_attendance));
    } catch (error) {
      console.error('Error fetching class reports:', error);
    }
  }

  function exportToExcel() {
    const monthName = format(new Date(selectedMonth), 'MMMM yyyy', { locale: id });
    
    if (activeTab === 'teachers') {
      const worksheetData = [
        ['Laporan Kehadiran Guru - ' + monthName],
        [],
        ['Nama Guru', 'Total Jadwal', 'Hadir', 'Tidak Hadir', 'Terlambat', 'Persentase Kehadiran'],
        ...teacherReports.map(report => [
          report.teacher_name,
          report.total_schedules,
          report.attended,
          report.absent,
          report.late,
          report.attendance_percentage + '%'
        ])
      ];

      const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Kehadiran Guru');
      XLSX.writeFile(workbook, `Laporan_Kehadiran_Guru_${selectedMonth}.xlsx`);
    } else if (activeTab === 'students') {
      const worksheetData = [
        ['Laporan Kehadiran Siswa - ' + monthName],
        [],
        ['Nama Siswa', 'Kelas', 'Total Sesi', 'Hadir', 'Tidak Hadir', 'Izin', 'Sakit', 'Persentase Kehadiran'],
        ...studentReports.map(report => [
          report.student_name,
          report.class_name,
          report.total_sessions,
          report.present,
          report.absent,
          report.excused,
          report.sick,
          report.attendance_percentage + '%'
        ])
      ];

      const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Kehadiran Siswa');
      XLSX.writeFile(workbook, `Laporan_Kehadiran_Siswa_${selectedMonth}.xlsx`);
    } else {
      const worksheetData = [
        ['Laporan Kehadiran Per Kelas - ' + monthName],
        [],
        ['Kelas', 'Total Siswa', 'Rata-rata Kehadiran'],
        ...classReports.map(report => [
          report.class_name,
          report.total_students,
          report.average_attendance + '%'
        ])
      ];

      const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Kehadiran Per Kelas');
      XLSX.writeFile(workbook, `Laporan_Kehadiran_Kelas_${selectedMonth}.xlsx`);
    }
  }

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
          <h1 className="text-3xl font-bold text-gray-900">Laporan Kehadiran</h1>
          <p className="text-gray-600 mt-2">Rekap kehadiran guru dan siswa</p>
        </div>
        <button
          onClick={exportToExcel}
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
        >
          <Download size={20} />
          <span>Export Excel</span>
        </button>
      </div>

      {/* Month Selector */}
      <div className="bg-white rounded-xl p-6 border border-gray-200 mb-6">
        <div className="flex items-center space-x-4">
          <Calendar className="text-blue-600" size={20} />
          <label className="text-sm font-medium text-gray-700">Pilih Bulan:</label>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-gray-200 mb-6">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('teachers')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'teachers'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Users className="inline mr-2" size={16} />
              Kehadiran Guru ({teacherReports.length})
            </button>
            <button
              onClick={() => setActiveTab('students')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'students'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <GraduationCap className="inline mr-2" size={16} />
              Kehadiran Siswa ({studentReports.length})
            </button>
            <button
              onClick={() => setActiveTab('classes')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'classes'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <BarChart3 className="inline mr-2" size={16} />
              Per Kelas ({classReports.length})
            </button>
          </nav>
        </div>

        {/* Teacher Reports */}
        {activeTab === 'teachers' && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nama Guru
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Jadwal
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Hadir
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tidak Hadir
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Terlambat
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Persentase
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {teacherReports.map((report) => (
                  <tr key={report.teacher_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {report.teacher_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {report.total_schedules}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                      <CheckCircle className="inline mr-1" size={14} />
                      {report.attended}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">
                      <XCircle className="inline mr-1" size={14} />
                      {report.absent}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-yellow-600">
                      <Clock className="inline mr-1" size={14} />
                      {report.late}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        report.attendance_percentage >= 90 ? 'bg-green-100 text-green-800' :
                        report.attendance_percentage >= 75 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {report.attendance_percentage}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Student Reports */}
        {activeTab === 'students' && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nama Siswa
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Kelas
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Sesi
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Hadir
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tidak Hadir
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Izin
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sakit
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Persentase
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {studentReports.map((report) => (
                  <tr key={report.student_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {report.student_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {report.class_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {report.total_sessions}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                      <CheckCircle className="inline mr-1" size={14} />
                      {report.present}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">
                      <XCircle className="inline mr-1" size={14} />
                      {report.absent}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-yellow-600">
                      <AlertCircle className="inline mr-1" size={14} />
                      {report.excused}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600">
                      <Clock className="inline mr-1" size={14} />
                      {report.sick}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        report.attendance_percentage >= 90 ? 'bg-green-100 text-green-800' :
                        report.attendance_percentage >= 75 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {report.attendance_percentage}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Class Reports */}
        {activeTab === 'classes' && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Kelas
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Siswa
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rata-rata Kehadiran
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {classReports.map((report) => (
                  <tr key={report.class_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {report.class_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {report.total_students} siswa
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        report.average_attendance >= 90 ? 'bg-green-100 text-green-800' :
                        report.average_attendance >= 75 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {report.average_attendance}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Empty States */}
        {((activeTab === 'teachers' && teacherReports.length === 0) ||
          (activeTab === 'students' && studentReports.length === 0) ||
          (activeTab === 'classes' && classReports.length === 0)) && (
          <div className="text-center py-12">
            <BarChart3 className="mx-auto text-gray-400 mb-4" size={48} />
            <p className="text-gray-500">Tidak ada data kehadiran untuk bulan ini</p>
          </div>
        )}
      </div>
    </div>
  );
}