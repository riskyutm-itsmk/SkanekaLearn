import React from 'react';
import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Bell, Search } from 'lucide-react';

interface AppSettings {
  app_name: string;
  logo_url: string | null;
}

export function Header() {
  const { profile } = useAuth();
  const [appSettings, setAppSettings] = useState<AppSettings>({
    app_name: 'LMS School',
    logo_url: null
  });

  useEffect(() => {
    fetchAppSettings();
  }, []);

  async function fetchAppSettings() {
    try {
      const { data } = await supabase
        .from('app_settings')
        .select('app_name, logo_url')
        .single();

      if (data) {
        setAppSettings(data);
      }
    } catch (error) {
      console.error('Error fetching app settings:', error);
    }
  }

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 px-4 sm:px-6 py-4 fixed lg:relative top-0 left-0 right-0 z-30 lg:z-auto">
      <div className="flex items-center justify-between ml-0 lg:ml-0">
        <div className="flex items-center space-x-4 ml-12 lg:ml-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Cari..."
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-48 sm:w-80"
            />
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <button className="relative p-2 text-gray-400 hover:text-gray-600 transition-colors hidden sm:block">
            <Bell size={20} />
            <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              3
            </span>
          </button>

          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-white text-sm font-medium">
                {profile?.nama.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-medium text-gray-900 truncate max-w-32">{profile?.nama}</p>
              <p className="text-xs text-gray-500 capitalize">{profile?.role}</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}