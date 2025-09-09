import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { Megaphone, X, Calendar, User, School } from 'lucide-react';

interface Announcement {
  id: string;
  judul: string;
  konten: string;
  tipe: 'umum' | 'kelas';
  target_role: 'semua' | 'guru' | 'siswa';
  created_at: string;
  creator: {
    nama: string;
    role: string;
  };
  class?: {
    nama_kelas: string;
    tingkat: number;
    major: { kode_jurusan: string };
  };
}

interface AnnouncementsListProps {
  limit?: number;
  showViewAll?: boolean;
}

export function AnnouncementsList({ limit, showViewAll = false }: AnnouncementsListProps) {
  const { profile } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (profile) {
      fetchAnnouncements();
    }
  }, [profile]);

  async function fetchAnnouncements() {
    try {
      let query = supabase
        .from('announcements')
        .select(`
          *,
          creator:users!announcements_created_by_fkey(nama, role),
          class:classes(
            nama_kelas,
            tingkat,
            major:majors(kode_jurusan)
          )
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (limit) {
        query = query.limit(limit);
      }

      const { data, error } = await query;

      if (error) throw error;
      setAnnouncements(data || []);
    } catch (error) {
      console.error('Error fetching announcements:', error);
    } finally {
      setLoading(false);
    }
  }

  const getAnnouncementIcon = (announcement: Announcement) => {
    if (announcement.tipe === 'umum') {
      return <Megaphone className="text-blue-600" size={20} />;
    } else {
      return <School className="text-purple-600" size={20} />;
    }
  };

  const getAnnouncementBadge = (announcement: Announcement) => {
    if (announcement.tipe === 'umum') {
      return (
        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
          Umum - {announcement.target_role === 'semua' ? 'Semua' : 
                   announcement.target_role === 'guru' ? 'Guru' : 'Siswa'}
        </span>
      );
    } else {
      return (
        <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs font-medium">
          Kelas - {announcement.target_role === 'guru' ? 'Guru' : 'Siswa'}
        </span>
      );
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-gray-200 h-24 rounded-lg"></div>
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="space-y-4">
        {announcements.map((announcement) => (
          <div key={announcement.id} className="bg-white rounded-xl p-4 border border-gray-200 hover:shadow-md transition-shadow cursor-pointer"
               onClick={() => {
                 setSelectedAnnouncement(announcement);
                 setShowModal(true);
               }}>
            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center">
                {getAnnouncementIcon(announcement)}
              </div>
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <h3 className="font-semibold text-gray-900">{announcement.judul}</h3>
                  {getAnnouncementBadge(announcement)}
                </div>
                <p className="text-gray-600 text-sm line-clamp-2 mb-2">{announcement.konten}</p>
                <div className="flex items-center space-x-4 text-xs text-gray-500">
                  <div className="flex items-center space-x-1">
                    <User size={12} />
                    <span>{announcement.creator.nama}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Calendar size={12} />
                    <span>{format(new Date(announcement.created_at), 'dd MMM yyyy', { locale: id })}</span>
                  </div>
                  {announcement.class && (
                    <div className="flex items-center space-x-1">
                      <School size={12} />
                      <span>{announcement.class.tingkat} {announcement.class.nama_kelas}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {announcements.length === 0 && (
        <div className="text-center py-8">
          <Megaphone className="mx-auto text-gray-400 mb-2" size={32} />
          <p className="text-gray-500 text-sm">Tidak ada pengumuman</p>
        </div>
      )}

      {/* Announcement Detail Modal */}
      {showModal && selectedAnnouncement && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{selectedAnnouncement.judul}</h3>
                  <div className="flex items-center space-x-3 mb-3">
                    {getAnnouncementBadge(selectedAnnouncement)}
                    <span className="text-sm text-gray-500">
                      Oleh: {selectedAnnouncement.creator.nama}
                    </span>
                  </div>
                  {selectedAnnouncement.class && (
                    <p className="text-sm text-gray-600">
                      Kelas: {selectedAnnouncement.class.tingkat} {selectedAnnouncement.class.nama_kelas} - {selectedAnnouncement.class.major.kode_jurusan}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600 p-2"
                >
                  <X size={24} />
                </button>
              </div>
            </div>
            
            <div className="p-6">
              <div className="prose max-w-none">
                <p className="text-gray-800 whitespace-pre-wrap leading-relaxed">
                  {selectedAnnouncement.konten}
                </p>
              </div>
              
              <div className="mt-6 pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-500">
                  Dipublikasikan: {format(new Date(selectedAnnouncement.created_at), 'dd MMMM yyyy HH:mm', { locale: id })}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}