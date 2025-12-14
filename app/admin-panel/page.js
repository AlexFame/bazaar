"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { 
    UsersIcon, 
    ShoppingBagIcon, 
    CurrencyDollarIcon,
    ArrowTrendingUpIcon 
} from "@heroicons/react/24/outline";

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    users: 0,
    listings: 0,
    activeOffers: 0,
    totalVolume: 0 // Placeholder for now
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
       // Parallel fetching
       const [
           { count: usersCount },
           { count: listingsCount },
           { count: offersCount }
       ] = await Promise.all([
           supabase.from('profiles').select('*', { count: 'exact', head: true }),
           supabase.from('listings').select('*', { count: 'exact', head: true }),
           supabase.from('offers').select('*', { count: 'exact', head: true }).eq('status', 'accepted')
       ]);

       setStats({
           users: usersCount || 0,
           listings: listingsCount || 0,
           activeOffers: offersCount || 0,
           totalVolume: 0 
       });
       setLoading(false);
    };

    fetchStats();
  }, []);

  const cards = [
    { name: 'Total Users', value: stats.users, icon: UsersIcon, color: 'bg-blue-500' },
    { name: 'Total Listings', value: stats.listings, icon: ShoppingBagIcon, color: 'bg-purple-500' },
    { name: 'Completed Offers', value: stats.activeOffers, icon: ArrowTrendingUpIcon, color: 'bg-green-500' },
    // { name: 'Volume', value: '$' + stats.totalVolume, icon: CurrencyDollarIcon, color: 'bg-yellow-500' },
  ];

  if (loading) return <div className="text-gray-500">Loading dashbaord...</div>;

  return (
    <div>
        <h1 className="text-3xl font-bold dark:text-white mb-8">Dashboard Overview</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {cards.map((card) => (
                <div key={card.name} className="bg-white dark:bg-neutral-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-white/10 flex items-center gap-4">
                    <div className={`p-3 rounded-xl ${card.color} text-white`}>
                        <card.icon className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{card.name}</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{card.value}</p>
                    </div>
                </div>
            ))}
        </div>

        {/* Recent Activity Placeholder */}
        <div className="mt-10">
            <h2 className="text-xl font-bold dark:text-white mb-4">Recent Listings</h2>
            <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-sm border border-gray-100 dark:border-white/10 p-6 flex flex-col items-center justify-center text-gray-400 h-64">
                <ShoppingBagIcon className="w-12 h-12 mb-2 opacity-20" />
                <p>Go to Listings tab to manage content</p>
            </div>
        </div>
    </div>
  );
}
