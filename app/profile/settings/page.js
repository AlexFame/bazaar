"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import { ChevronLeftIcon } from "@heroicons/react/24/outline";

export default function SettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [preferences, setPreferences] = useState({
    messages: true,
    price_drops: true,
    news: true,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("notification_preferences")
        .eq("id", user.id)
        .single();

      if (data?.notification_preferences) {
        setPreferences({ ...preferences, ...data.notification_preferences });
      }
      setLoading(false);
    };

    fetchSettings();
  }, [router]);

  const toggleSetting = async (key) => {
    const newPrefs = { ...preferences, [key]: !preferences[key] };
    setPreferences(newPrefs);
    setSaving(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from("profiles")
        .update({ notification_preferences: newPrefs })
        .eq("id", user.id);
    }
    setSaving(false);
  };

  if (loading) return <div className="p-4">Загрузка...</div>;

  return (
    <div className="pb-24 max-w-md mx-auto bg-white dark:bg-black min-h-screen">
      <div className="flex items-center p-4 border-b border-gray-100 dark:border-gray-800 sticky top-0 bg-white/80 dark:bg-black/80 backdrop-blur-md z-10">
        <Link href="/profile" className="mr-4">
          <ChevronLeftIcon className="h-6 w-6" />
        </Link>
        <h1 className="text-xl font-bold">Настройки</h1>
      </div>

      <div className="p-4 space-y-6">
        <div>
          <h2 className="text-lg font-semibold mb-3">Уведомления</h2>
          <div className="bg-gray-50 dark:bg-gray-900 rounded-2xl p-2">
            
            <div className="flex items-center justify-between p-3 border-b border-gray-100 dark:border-gray-800 last:border-0">
              <div>
                <div className="font-medium">Новые сообщения</div>
                <div className="text-xs text-gray-500">Уведомления о сообщениях в чате</div>
              </div>
              <Switch 
                checked={preferences.messages} 
                onChange={() => toggleSetting('messages')} 
              />
            </div>

            <div className="flex items-center justify-between p-3 border-b border-gray-100 dark:border-gray-800 last:border-0">
              <div>
                <div className="font-medium">Снижение цены</div>
                <div className="text-xs text-gray-500">Когда товар в избранном дешевеет</div>
              </div>
              <Switch 
                checked={preferences.price_drops} 
                onChange={() => toggleSetting('price_drops')} 
              />
            </div>

            <div className="flex items-center justify-between p-3 border-b border-gray-100 dark:border-gray-800 last:border-0">
              <div>
                <div className="font-medium">Новости</div>
                <div className="text-xs text-gray-500">Важные обновления сервиса</div>
              </div>
              <Switch 
                checked={preferences.news} 
                onChange={() => toggleSetting('news')} 
              />
            </div>

          </div>
        </div>
        
        {saving && (
            <div className="text-center text-xs text-gray-400">Сохранение...</div>
        )}
      </div>
    </div>
  );
}

function Switch({ checked, onChange }) {
  return (
    <button
      onClick={onChange}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
        checked ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
      }`}
    >
      <span
        className={`${
          checked ? 'translate-x-6' : 'translate-x-1'
        } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
      />
    </button>
  );
}
