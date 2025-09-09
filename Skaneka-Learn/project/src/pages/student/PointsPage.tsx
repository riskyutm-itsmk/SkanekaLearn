import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { Award, TrendingUp, TrendingDown, Calendar, User, Trophy } from 'lucide-react';

interface Point {
  id: string;
  jenis: 'prestasi' | 'pelanggaran';
  keterangan: string;
  poin: number;
  tanggal: string;
  created_at: string;
  guru: {
    nama: string;
  };
}

interface PointsSummary {
  total_points: number;
  prestasi_points: number;
  pelanggaran_points: number;
  recent_points: Point[];
}

export function PointsPage() {
  const { profile } = useAuth();
  const [points, setPoints] = useState<Point[]>([]);
  const [summary, setSummary] = useState<PointsSummary>({
    total_points: 0,
    prestasi_points: 0,
    pelanggaran_points: 0,
    recent_points: []
  });
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [selectedType, setSelectedType] = useState<'all' | 'prestasi' | 'pelanggaran'>('all');

  useEffect(() => {
    if (profile) {
      fetchPoints();
    }
  }, [profile, selectedMonth]);

  async function fetchPoints() {
    try {
      // Get all points for summary (all time)
      const { data: allPointsData, error: allPointsError } = await supabase
        .from('points')
        .select(`
          id,
          jenis,
          keterangan,
          poin,
          tanggal,
          created_at,
          guru:users!points_guru_id_fkey(nama)
        `)
        .eq('siswa_id', profile?.id)
        .order('created_at', { ascending: false });

      if (allPointsError) throw allPointsError;

      // Get points for selected month
      const startDate = `${selectedMonth}-01`;
      const endDate = `${selectedMonth}-31`;

      const { data: monthlyPointsData, error: monthlyPointsError } = await supabase
        .from('points')
        .select(`
          id,
          jenis,
          keterangan,
          poin,
          tanggal,
          created_at,
          guru:users!points_guru_id_fkey(nama)
        `)
        .eq('siswa_id', profile?.id)
        .gte('tanggal', startDate)
        .lte('tanggal', endDate)
        .order('created_at', { ascending: false });

      if (monthlyPointsError) throw monthlyPointsError;

      setPoints(monthlyPointsData || []);

      // Calculate summary from all points
      if (allPointsData) {
        const prestasiPoints = allPointsData
          .filter(p => p.jenis === 'prestasi')
          .reduce((sum, p) => sum + Math.abs(p.poin), 0);
        
        const pelanggaranPoints = allPointsData
          .filter(p => p.jenis === 'pelanggaran')
          .reduce((sum, p) => sum + Math.abs(p.poin), 0);

        const totalPoints = prestasiPoints - pelanggaranPoints;

        setSummary({
          total_points: totalPoints,
          prestasi_points: prestasiPoints,
          pelanggaran_points: pelanggaranPoints,
          recent_points: allPointsData.slice(0, 5)
        });
      }
    } catch (error) {
      console.error('Error fetching points:', error);
    } finally {
      setLoading(false);
    }
  }

  const filteredPoints = points.filter(point => {
    return selectedType === 'all' || point.jenis === selectedType;
  });

  const getPointIcon = (jenis: string) => {
    return jenis === 'prestasi' ? (
      <TrendingUp className="text-green-600" size={20} />
    ) : (
      <TrendingDown className="text-red-600" size={20} />
    );
  };

  const getPointColor = (jenis: string) => {
    return jenis === 'prestasi' 
      ? 'bg-green-100 text-green-800' 
      : 'bg-red-100 text-red-800';
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
        <h1 className="text-3xl font-bold text-gray-900">Poin Saya</h1>
        <p className="text-gray-600 mt-2">Lihat poin prestasi dan pelanggaran Anda</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Poin</p>
              <p className={`text-3xl font-bold ${
                summary.total_points >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {summary.total_points >= 0 ? '+' : ''}{summary.total_points}
              </p>
            </div>
            <div className="bg-blue-100 rounded-full p-3">
              <Trophy className="text-blue-600" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Poin Prestasi</p>
              <p className="text-3xl font-bold text-green-600">+{summary.prestasi_points}</p>
            </div>
            <div className="bg-green-100 rounded-full p-3">
              <TrendingUp className="text-green-600" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Poin Pelanggaran</p>
              <p className="text-3xl font-bold text-red-600">-{summary.pelanggaran_points}</p>
            </div>
            <div className="bg-red-100 rounded-full p-3">
              <TrendingDown className="text-red-600" size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Recent Points */}
      <div className="bg-white rounded-xl p-6 border border-gray-200 mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Poin Terbaru</h3>
        {summary.recent_points.length === 0 ? (
          <p className="text-gray-500 text-center py-4">Belum ada poin</p>
        ) : (
          <div className="space-y-3">
            {summary.recent_points.map((point) => (
              <div key={point.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    {getPointIcon(point.jenis)}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{point.keterangan}</p>
                    <p className="text-sm text-gray-600">
                      {format(new Date(point.tanggal), 'dd MMM yyyy', { locale: id })} • {point.guru.nama}
                    </p>
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  point.jenis === 'prestasi' ? 'text-green-600 bg-green-100' : 'text-red-600 bg-red-100'
                }`}>
                  {point.poin > 0 ? '+' : ''}{point.poin}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-6 border border-gray-200 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex items-center space-x-2">
            <Calendar className="text-blue-600" size={20} />
            <label className="text-sm font-medium text-gray-700">Bulan:</label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value as 'all' | 'prestasi' | 'pelanggaran')}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">Semua Jenis</option>
            <option value="prestasi">Prestasi</option>
            <option value="pelanggaran">Pelanggaran</option>
          </select>
        </div>
      </div>

      {/* Points List */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Riwayat Poin - {format(new Date(selectedMonth), 'MMMM yyyy', { locale: id })}
          </h3>
        </div>

        {filteredPoints.length === 0 ? (
          <div className="text-center py-12">
            <Award className="mx-auto text-gray-400 mb-4" size={48} />
            <p className="text-gray-500">Tidak ada data poin untuk periode ini</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredPoints.map((point) => (
              <div key={point.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      point.jenis === 'prestasi' ? 'bg-green-100' : 'bg-red-100'
                    }`}>
                      {getPointIcon(point.jenis)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPointColor(point.jenis)}`}>
                          {point.jenis === 'prestasi' ? 'Prestasi' : 'Pelanggaran'}
                        </span>
                        <span className={`font-bold text-lg ${
                          point.jenis === 'prestasi' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {point.poin > 0 ? '+' : ''}{point.poin} poin
                        </span>
                      </div>
                      <p className="text-gray-900 font-medium mb-1">{point.keterangan}</p>
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <div className="flex items-center space-x-1">
                          <Calendar size={14} />
                          <span>{format(new Date(point.tanggal), 'dd MMMM yyyy', { locale: id })}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <User size={14} />
                          <span>{point.guru.nama}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}