import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Settings, Save, Upload, Palette, Type } from 'lucide-react';

interface AppSettings {
  id: string;
  app_name: string;
  logo_url: string | null;
  primary_color: string;
  updated_at: string;
}

export function SettingsPage() {
  const { profile } = useAuth();
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    app_name: '',
    logo_url: '',
    primary_color: '#3B82F6'
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  async function fetchSettings() {
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('*')
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (data) {
        setSettings(data);
        setFormData({
          app_name: data.app_name,
          logo_url: data.logo_url || '',
          primary_color: data.primary_color
        });
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      const settingsData = {
        app_name: formData.app_name,
        logo_url: formData.logo_url || null,
        primary_color: formData.primary_color,
        updated_by: profile?.id
      };

      if (settings) {
        const { error } = await supabase
          .from('app_settings')
          .update(settingsData)
          .eq('id', settings.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('app_settings')
          .insert(settingsData);

        if (error) throw error;
      }

      fetchSettings();
      alert('Pengaturan berhasil disimpan!');
    } catch (error: any) {
      alert('Error: ' + error.message);
    } finally {
      setSaving(false);
    }
  }

  const colorOptions = [
    { name: 'Biru', value: '#3B82F6' },
    { name: 'Hijau', value: '#10B981' },
    { name: 'Ungu', value: '#8B5CF6' },
    { name: 'Merah', value: '#EF4444' },
    { name: 'Orange', value: '#F59E0B' },
    { name: 'Pink', value: '#EC4899' },
    { name: 'Indigo', value: '#6366F1' },
    { name: 'Teal', value: '#14B8A6' }
  ];

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
        <h1 className="text-3xl font-bold text-gray-900">Pengaturan Aplikasi</h1>
        <p className="text-gray-600 mt-2">Kelola tampilan dan konfigurasi aplikasi</p>
      </div>

      <div className="max-w-2xl">
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex items-center space-x-3 mb-6">
            <Settings className="text-blue-600" size={24} />
            <h2 className="text-xl font-semibold text-gray-900">Pengaturan Umum</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Type className="inline mr-2" size={16} />
                Nama Aplikasi
              </label>
              <input
                type="text"
                value={formData.app_name}
                onChange={(e) => setFormData({ ...formData, app_name: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Nama aplikasi Anda"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Nama ini akan muncul di header dan halaman login
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Upload className="inline mr-2" size={16} />
                URL Logo
              </label>
              <input
                type="url"
                value={formData.logo_url}
                onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="https://example.com/logo.png"
              />
              <p className="text-xs text-gray-500 mt-1">
                URL gambar logo yang akan ditampilkan di aplikasi (opsional)
              </p>
              {formData.logo_url && (
                <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-2">Preview Logo:</p>
                  <img
                    src={formData.logo_url}
                    alt="Logo Preview"
                    className="h-12 w-auto object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Palette className="inline mr-2" size={16} />
                Warna Utama
              </label>
              <div className="grid grid-cols-4 gap-3 mb-3">
                {colorOptions.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, primary_color: color.value })}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      formData.primary_color === color.value
                        ? 'border-gray-400 ring-2 ring-gray-300'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div
                      className="w-full h-8 rounded"
                      style={{ backgroundColor: color.value }}
                    ></div>
                    <p className="text-xs text-gray-600 mt-1 text-center">{color.name}</p>
                  </button>
                ))}
              </div>
              <input
                type="color"
                value={formData.primary_color}
                onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                className="w-full h-12 border border-gray-300 rounded-lg cursor-pointer"
              />
              <p className="text-xs text-gray-500 mt-1">
                Warna ini akan digunakan untuk tombol dan elemen utama aplikasi
              </p>
            </div>

            <div className="pt-4 border-t border-gray-200">
              <button
                type="submit"
                disabled={saving}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                <Save size={20} />
                <span>{saving ? 'Menyimpan...' : 'Simpan Pengaturan'}</span>
              </button>
            </div>
          </form>

          {settings && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <p className="text-sm text-gray-500">
                Terakhir diperbarui: {new Date(settings.updated_at).toLocaleString('id-ID')}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}