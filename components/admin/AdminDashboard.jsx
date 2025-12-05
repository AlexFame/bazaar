"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from "recharts";
import { CATEGORY_DEFS } from "@/lib/categories";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#82ca9d"];

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalListings: 0,
    totalViews: 0,
  });
  const [newUsersData, setNewUsersData] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [listingsTrendData, setListingsTrendData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAnalytics() {
      setLoading(true);
      try {
        // 1. Fetch Users (created_at only)
        // Note: For MVP we fetch all. For scale, use a DB function.
        const { data: users, error: usersError } = await supabase
          .from("profiles")
          .select("created_at");

        if (usersError) throw usersError;

        // 2. Fetch Listings (created_at, category_key, views_count)
        const { data: listings, error: listingsError } = await supabase
          .from("listings")
          .select("created_at, category_key, views_count");

        if (listingsError) throw listingsError;

        // --- Aggregations ---

        // A. Totals
        const totalUsers = users.length;
        const totalListings = listings.length;
        const totalViews = listings.reduce((sum, l) => sum + (l.views_count || 0), 0);

        setStats({ totalUsers, totalListings, totalViews });

        // B. New Users (Last 30 days)
        // Group by Date
        const last30Days = [...Array(30)].map((_, i) => {
          const d = new Date();
          d.setDate(d.getDate() - i);
          return d.toISOString().split("T")[0];
        }).reverse();

        const usersByDate = {};
        users.forEach((u) => {
          const date = new Date(u.created_at).toISOString().split("T")[0];
          usersByDate[date] = (usersByDate[date] || 0) + 1;
        });

        const chartDataUsers = last30Days.map((date) => ({
          date: date.slice(5), // MM-DD
          count: usersByDate[date] || 0,
        }));
        setNewUsersData(chartDataUsers);

        // C. Listings Trend (Last 30 days)
        const listingsByDate = {};
        listings.forEach((l) => {
            const date = new Date(l.created_at).toISOString().split("T")[0];
            listingsByDate[date] = (listingsByDate[date] || 0) + 1;
        });
        const chartDataListings = last30Days.map((date) => ({
            date: date.slice(5),
            count: listingsByDate[date] || 0,
        }));
        setListingsTrendData(chartDataListings);


        // D. Top Categories
        const catCounts = {}; // { 'mobiles': 10, 'cars': 5 }
        listings.forEach((l) => {
          const cat = l.category_key || "other";
          catCounts[cat] = (catCounts[cat] || 0) + 1;
        });

        const chartDataCats = Object.entries(catCounts)
          .map(([key, value]) => {
             const def = CATEGORY_DEFS.find(c => c.key === key);
             return {
                 name: def ? (def.ru || def.en) : key,
                 value: value,
             };
          })
          .sort((a, b) => b.value - a.value); // Descending

        setCategoryData(chartDataCats);

      } catch (err) {
        console.error("Analytics fetch error:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchAnalytics();
  }, []);

  if (loading) {
    return <div className="p-10 text-center text-gray-500">Загрузка аналитики...</div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Top Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title="Всего пользователей" value={stats.totalUsers} icon="👥" color="text-blue-600" bg="bg-blue-50" />
        <StatCard title="Активных объявлений" value={stats.totalListings} icon="📦" color="text-green-600" bg="bg-green-50" />
        <StatCard title="Всего просмотров" value={stats.totalViews} icon="👁️" color="text-purple-600" bg="bg-purple-50" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Growth Chart */}
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Рост пользователей (30 дней)</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={newUsersData}>
                <defs>
                  <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Area type="monotone" dataKey="count" stroke="#3b82f6" fillOpacity={1} fill="url(#colorUsers)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Categories Pie Chart */}
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Распределение по категориям</h3>
          <div className="h-[300px] w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
               <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                     formatter={(value, name) => [value, name]}
                     contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-2 justify-center mt-2 text-xs text-gray-500">
             {categoryData.slice(0, 5).map((entry, index) => (
                 <div key={index} className="flex items-center gap-1">
                     <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                     {entry.name} ({entry.value})
                 </div>
             ))}
          </div>
        </div>

        {/* Listings Creation Trend */}
         <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm col-span-1 lg:col-span-2">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Новые объявления (30 дней)</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={listingsTrendData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                    cursor={{ fill: 'transparent' }}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
}

function StatCard({ title, value, icon, color, bg }) {
  return (
    <div className={`p-6 rounded-xl border border-gray-100 shadow-sm bg-white hover:shadow-md transition-shadow`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
          <h3 className="text-3xl font-bold text-gray-900">{value}</h3>
        </div>
        <div className={`p-3 rounded-xl ${bg} ${color}`}>
          <span className="text-2xl">{icon}</span>
        </div>
      </div>
    </div>
  );
}
