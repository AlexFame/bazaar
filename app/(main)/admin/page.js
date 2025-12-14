"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import AdminLayout from "@/components/AdminLayout";
import AdminDashboard from "@/components/admin/AdminDashboard";

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState("dashboard"); // Default to dashboard
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    // Skip fetch for dashboard, it handles itself
    if (activeTab === "dashboard") return;

    async function fetchData() {
      setLoading(true);
      setData([]); // Clear previous data
      
      try {
        let query;
        
        if (activeTab === "reports") {
          query = supabase
            .from("reports")
            .select("*")
            .order("created_at", { ascending: false });
        } else if (activeTab === "listings") {
          query = supabase
            .from("listings")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(50);
        } else if (activeTab === "users") {
          query = supabase
            .from("profiles")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(50);
        }

        const { data: result, error } = await query;
        
        if (error) {
          console.error("Admin fetch error:", error);
          if (!cancelled) {
            alert("Ошибка загрузки данных: " + error.message);
          }
          return;
        }
        
        if (!cancelled) {
          setData(result || []);
        }
      } catch (err) {
        console.error("Admin fetch error:", err);
        if (!cancelled) {
          alert("Ошибка загрузки данных");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchData();
    
    return () => {
      cancelled = true;
    };
  }, [activeTab]);

  async function handleAction(action, id, payload = {}) {
    if (!confirm("Вы уверены?")) return;

    try {
      let table = "";
      if (activeTab === "reports") table = "reports";
      if (activeTab === "listings") table = "listings";
      if (activeTab === "users") table = "profiles";

      if (action === "delete") {
        await supabase.from(table).delete().eq("id", id);
      } else if (action === "update") {
        await supabase.from(table).update(payload).eq("id", id);
      }

      fetchData(); // Refresh
    } catch (err) {
      console.error("Action error:", err);
      alert("Ошибка выполнения действия");
    }
  }

  return (
    <AdminLayout>
      <div className="flex gap-4 mb-6 border-b border-gray-200 pb-1">
        {["dashboard", "reports", "listings", "users"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              activeTab === tab
                ? "bg-white border border-gray-200 border-b-white -mb-[1px] text-black"
                : "text-gray-500 hover:text-black"
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {activeTab === "dashboard" ? (
        <AdminDashboard />
      ) : loading ? (
        <div className="text-center py-10 text-gray-500">Загрузка...</div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-700 font-semibold border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3">ID / Date</th>
                  <th className="px-4 py-3">Content</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                      <div>{new Date(item.created_at).toLocaleDateString()}</div>
                      <div className="text-[10px] opacity-70">{item.id.slice(0, 8)}...</div>
                    </td>
                    
                    <td className="px-4 py-3">
                      {activeTab === "reports" && (
                        <div>
                          <div className="font-medium text-red-600 mb-1">{item.reason || "No reason"}</div>
                          <div className="text-xs text-gray-500">
                            Target: {item.target_type || "Unknown"} ({item.target_id ? item.target_id.slice(0, 8) : "N/A"})
                          </div>
                          <div className="text-xs text-gray-400">
                            Reporter ID: {item.reporter_id ? item.reporter_id.slice(0, 8) : "Unknown"}
                          </div>
                        </div>
                      )}

                      {activeTab === "listings" && (
                        <div className="flex gap-3 items-center">
                          {item.main_image_path && (
                             <div className="w-10 h-10 relative rounded bg-gray-100 flex-shrink-0">
                                <Image 
                                    src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/listing-images/${item.main_image_path}`} 
                                    fill className="object-cover rounded" alt=""
                                />
                             </div>
                          )}
                          <div>
                            <Link href={`/listing/${item.id}`} target="_blank" className="font-medium hover:underline text-blue-600">
                                {item.title}
                            </Link>
                            <div className="text-xs text-gray-500">{item.price} €</div>
                          </div>
                        </div>
                      )}

                      {activeTab === "users" && (
                        <div>
                           <div className="font-medium">{item.full_name}</div>
                           <div className="text-xs text-gray-500">@{item.tg_username}</div>
                           <div className="text-[10px] text-gray-400">ID: {item.tg_user_id}</div>
                        </div>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      {activeTab === "reports" && (
                        <span className={`px-2 py-1 rounded-full text-xs ${
                            item.status === 'resolved' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                        }`}>
                            {item.status}
                        </span>
                      )}
                      {activeTab === "listings" && (
                        <span className={`px-2 py-1 rounded-full text-xs ${
                            item.status === 'banned' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                        }`}>
                            {item.status || 'active'}
                        </span>
                      )}
                      {activeTab === "users" && (
                        <span className={`px-2 py-1 rounded-full text-xs ${
                            item.is_admin ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'
                        }`}>
                            {item.is_admin ? 'Admin' : 'User'}
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        {activeTab === "reports" && item.status !== 'resolved' && (
                            <button 
                                onClick={() => handleAction('update', item.id, { status: 'resolved' })}
                                className="px-2 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600"
                            >
                                Resolve
                            </button>
                        )}
                        
                        {activeTab === "listings" && (
                            <>
                                {item.status !== 'banned' ? (
                                    <button 
                                        onClick={() => handleAction('update', item.id, { status: 'banned' })}
                                        className="px-2 py-1 bg-orange-500 text-white text-xs rounded hover:bg-orange-600"
                                    >
                                        Ban
                                    </button>
                                ) : (
                                    <button 
                                        onClick={() => handleAction('update', item.id, { status: 'active' })}
                                        className="px-2 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600"
                                    >
                                        Unban
                                    </button>
                                )}
                                <button 
                                    onClick={() => handleAction('delete', item.id)}
                                    className="px-2 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600"
                                >
                                    Del
                                </button>
                            </>
                        )}

                        {activeTab === "users" && !item.is_admin && (
                             <button 
                                onClick={() => handleAction('update', item.id, { is_admin: true })} // Just for demo, usually we ban users
                                className="px-2 py-1 bg-purple-500 text-white text-xs rounded hover:bg-purple-600"
                            >
                                Make Admin
                            </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}

                {data.length === 0 && (
                    <tr>
                        <td colSpan={4} className="text-center py-8 text-gray-400">
                            No data found
                        </td>
                    </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
