import { supabase } from "@/lib/supabaseClient";
import ProfilePageClient from "@/components/ProfilePageClient";

export async function generateMetadata({ params }) {
  const { id } = params;
  
  const { data: profile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", id)
    .single();

  if (!profile) {
    return {
      title: "Пользователь не найден | Bazaar",
    };
  }

  return {
    title: `${profile.username} | Профиль на Bazaar`,
    description: `Смотрите объявления пользователя ${profile.username} на Bazaar.`,
  };
}

export default function ProfilePage({ params }) {
  return <ProfilePageClient profileId={params.id} />;
}
