import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { 
    UsersIcon, 
    ShoppingBagIcon, 
    ArrowTrendingUpIcon,
    EyeIcon
} from "@heroicons/react/24/outline";
import { 
    AreaChart, 
    Area, 
    XAxis, 
    YAxis, 
    CartesianGrid, 
    Tooltip, 
    ResponsiveContainer 
} from 'recharts';
import Image from "next/image";
import AdminLayout from "@/components/admin/AdminLayout";

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    users: 0,
    listings: 0,
    activeOffers: 0,
  });
  const [productStats, setProductStats] = useState({
    homeOpen: 0,
    swipeOpen: 0,
    swipeOpenListing: 0,
    createListingStart: 0,
    createListingSuccess: 0,
    repeatVisit: 0,
  });
  const [chartData, setChartData] = useState([]);
  const [topListings, setTopListings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
       try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.access_token) return;

            const res = await fetch('/api/admin/stats', {
                headers: {
                    'Authorization': `Bearer ${session.access_token}`
                }
            });
            if (!res.ok) throw new Error("Failed to fetch stats");
            
            const data = await res.json();
            setStats(data.stats);
            setChartData(data.chartData);
            setTopListings(data.topListings);
            setProductStats(data.productStats || {
              homeOpen: 0,
              swipeOpen: 0,
              swipeOpenListing: 0,
              createListingStart: 0,
              createListingSuccess: 0,
              repeatVisit: 0,
            });

       } catch (e) {
           console.error("Dashboard error:", e);
       } finally {
           setLoading(false);
       }
    };

    fetchStats();
  }, []);

  const cards = [
    { name: 'Total Users', value: stats.users, icon: UsersIcon, color: 'bg-blue-500' },
    { name: 'Total Listings', value: stats.listings, icon: ShoppingBagIcon, color: 'bg-purple-500' },
    { name: 'Completed Deals', value: stats.activeOffers, icon: ArrowTrendingUpIcon, color: 'bg-green-500' },
  ];
  const funnelCards = [
    { name: 'Home Opens', value: productStats.homeOpen },
    { name: 'Swipe Opens', value: productStats.swipeOpen },
    { name: 'Swipe Detail Opens', value: productStats.swipeOpenListing },
    { name: 'Create Starts', value: productStats.createListingStart },
    { name: 'Create Success', value: productStats.createListingSuccess },
    { name: 'Repeat Visits', value: productStats.repeatVisit },
  ];

  if (loading) return (
      <AdminLayout>
        <div className="flex h-[80vh] items-center justify-center text-gray-400">
            <div className="animate-pulse">Loading analytics...</div>
        </div>
      </AdminLayout>
  );

  return (
    <AdminLayout>
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold dark:text-white mb-2">Dashboard</h1>
                <p className="text-gray-500 dark:text-gray-400">Platform overview and analytics</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {cards.map((card) => (
                    <div key={card.name} className="bg-white dark:bg-neutral-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-white/10 flex items-center gap-4">
                        <div className={`p-3 rounded-xl ${card.color} text-white shadow-lg shadow-${card.color.split('-')[1]}-500/30`}>
                            <card.icon className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{card.name}</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">{card.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-sm border border-gray-100 dark:border-white/10 p-6">
                <div className="flex items-center justify-between gap-4 mb-6">
                    <div>
                        <h2 className="text-lg font-bold dark:text-white">Product Funnel</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Last 30 days, product-level events</p>
                    </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
                    {funnelCards.map((card) => (
                        <div key={card.name} className="rounded-2xl border border-gray-100 dark:border-white/10 bg-gray-50/70 dark:bg-white/[0.03] p-4">
                            <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">{card.name}</p>
                            <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">{card.value}</p>
                        </div>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-white dark:bg-neutral-900 rounded-2xl shadow-sm border border-gray-100 dark:border-white/10 p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-bold dark:text-white">Traffic Overview</h2>
                        <div className="flex gap-2 text-xs">
                            <span className="flex items-center gap-1 text-gray-500"><div className="w-2 h-2 rounded-full bg-blue-500"></div> Views</span>
                            <span className="flex items-center gap-1 text-gray-500"><div className="w-2 h-2 rounded-full bg-green-500"></div> Clicks</span>
                        </div>
                    </div>
                    <div className="h-[300px] w-full">
                        {chartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData}>
                                    <defs>
                                        <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                        </linearGradient>
                                        <linearGradient id="colorClicks" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#22c55e" stopOpacity={0.1}/>
                                            <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                    <XAxis 
                                        dataKey="date" 
                                        tick={{fontSize: 12, fill: '#9CA3AF'}} 
                                        axisLine={false}
                                        tickLine={false}
                                        tickFormatter={(val) => new Date(val).toLocaleDateString(undefined, {month:'short', day:'numeric'})}
                                    />
                                    <YAxis 
                                        tick={{fontSize: 12, fill: '#9CA3AF'}} 
                                        axisLine={false}
                                        tickLine={false}
                                    />
                                    <Tooltip 
                                        contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                                    />
                                    <Area type="monotone" dataKey="views" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorViews)" />
                                    <Area type="monotone" dataKey="clicks" stroke="#22c55e" strokeWidth={2} fillOpacity={1} fill="url(#colorClicks)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-gray-400 text-sm">
                                <ArrowTrendingUpIcon className="w-8 h-8 mb-2 opacity-20" />
                                No data for last 30 days
                            </div>
                        )}
                    </div>
                </div>

                <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-sm border border-gray-100 dark:border-white/10 p-6">
                    <h2 className="text-lg font-bold dark:text-white mb-6">Trending Content</h2>
                    <div className="space-y-4">
                        {topListings.length > 0 ? (
                            topListings.map((item, idx) => (
                                <div key={item.id} className="flex items-center gap-3 pb-4 border-b border-gray-100 dark:border-white/5 last:border-0 last:pb-0">
                                    <span className="text-sm font-bold text-gray-300 w-4">{idx + 1}</span>
                                    <div className="w-10 h-10 rounded-lg bg-gray-100 relative overflow-hidden flex-shrink-0">
                                        {item.main_image_path ? (
                                            <Image 
                                                src={item.main_image_path.startsWith('http') ? item.main_image_path : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/listings/${item.main_image_path}`} 
                                                alt="" 
                                                fill 
                                                className="object-cover" 
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-gray-300 text-[10px]">NA</div>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{item.title}</p>
                                        <p className="text-xs text-gray-500">{item.price} {item.currency}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-bold text-black dark:text-white flex items-center gap-1">
                                            <EyeIcon className="w-3 h-3 text-gray-400" />
                                            {item.total_views}
                                        </p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-10 text-gray-400 text-sm">
                                No trending data
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    </AdminLayout>
  );
}
