"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function AdminLayout({ children }) {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const router = useRouter();

  useEffect(() => {
    async function checkAdmin() {
      // Try Supabase Auth first
      const { data: { user } } = await supabase.auth.getUser();
      
      let profile = null;

      if (user) {
        // Try to find profile by Supabase user ID (if exists)
        const { data: profileData } = await supabase
          .from("profiles")
          .select("is_admin")
          .eq("id", user.id)
          .single();
        
        profile = profileData;
      }

      // If no profile found via Supabase, try Telegram
      if (!profile && typeof window !== "undefined") {
        const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
        if (tgUser?.id) {
          const { data: profileData } = await supabase
            .from("profiles")
            .select("is_admin")
            .eq("tg_user_id", tgUser.id)
            .single();
          
          profile = profileData;
        }
      }

      if (!profile?.is_admin) {
        console.warn("Access denied: User is not admin");
        router.push("/");
        return;
      }

      setIsAdmin(true);
      setLoading(false);
    }

    checkAdmin();
  }, [router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <h1 className="font-bold text-lg">🛡️ Admin Panel</h1>
        <button 
            onClick={() => router.push('/')}
            className="text-sm text-gray-500 hover:text-black"
        >
            Exit
        </button>
      </header>
      <main className="p-4 max-w-5xl mx-auto">
        {children}
      </main>
    </div>
  );
}
