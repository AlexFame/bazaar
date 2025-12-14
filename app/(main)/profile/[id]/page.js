import { supabase } from "@/lib/supabaseClient";
import ProfilePageClient from "@/components/ProfilePageClient";

export async function generateMetadata({ params }) {
  const { id } = params;
  
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, tg_username")
    .eq("id", id)
    .single();

  if (!profile) {
    return {
      title: "Пользователь не найден | Bazaar",
    };
  }

  const name = profile.full_name || profile.tg_username || "Пользователь";

  return {
    title: `${name} | Профиль на Bazaar`,
    description: `Смотрите объявления пользователя ${name} на Bazaar.`,
  };
}

export default function ProfilePage({ params }) {
  return <ProfilePageClient profileId={params.id} />;
}
