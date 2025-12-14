"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Image from "next/image";
import { MagnifyingGlassIcon, TrashIcon, NoSymbolIcon, CheckCircleIcon } from "@heroicons/react/24/outline";

export default function AdminListings() {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 20;

  const fetchListings = async () => {
    setLoading(true);
    let query = supabase
      .from('listings')
      .select('*, profiles:created_by(full_name, tg_username)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (search) {
      query = query.ilike('title', `%${search}%`);
    }

    const { data, error } = await query;
    if (error) console.error(error);
    else setListings(data || []);
    
    setLoading(false);
  };

  useEffect(() => {
    fetchListings();
  }, [page, search]);

  useEffect(() => {
     const timer = setTimeout(() => {
         setPage(0);
         fetchListings();
     }, 500);
     return () => clearTimeout(timer);
  }, [search]);

  const toggleStatus = async (id, currentStatus) => {
      // Logic: active -> banned -> active? Or closed?
      // Simple toggle for now: if 'banned' -> 'active', else -> 'banned'
      const newStatus = currentStatus === 'banned' ? 'active' : 'banned';
      
      const { error } = await supabase.from('listings').update({ status: newStatus }).eq('id', id);
      if (!error) {
          setListings(prev => prev.map(l => l.id === id ? { ...l, status: newStatus } : l));
      }
  };

  const deleteListing = async (id) => {
      if (!confirm("Are you sure you want to PERMANENTLY delete this listing?")) return;
      const { error } = await supabase.from('listings').delete().eq('id', id);
      if (!error) {
          setListings(prev => prev.filter(l => l.id !== id));
      }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold dark:text-white">Listings Moderation</h1>
        <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            <input 
                type="text" 
                placeholder="Search listings..." 
                className="pl-10 pr-4 py-2 border border-gray-300 dark:border-white/20 rounded-xl bg-white dark:bg-neutral-800 text-sm focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
            />
        </div>
      </div>

      <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-sm border border-gray-200 dark:border-white/10 overflow-hidden">
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-white/10">
            <thead className="bg-gray-50 dark:bg-neutral-800">
                <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Seller</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
            </thead>
            <tbody className="bg-white dark:bg-neutral-900 divide-y divide-gray-200 dark:divide-white/10">
                {loading ? (
                    <tr><td colSpan="5" className="text-center py-10">Loading...</td></tr>
                ) : listings.length === 0 ? (
                    <tr><td colSpan="5" className="text-center py-10">No listings found</td></tr>
                ) : (
                    listings.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                            <div className="h-10 w-10 flex-shrink-0">
                                <div className="h-10 w-10 rounded-lg bg-gray-200 overflow-hidden relative">
                                    {item.main_image_path ? (
                                        <Image src={item.main_image_path} alt="" fill className="object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-xs text-gray-500">
                                            No Img
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900 dark:text-white truncate max-w-[150px]">
                                {item.title}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                                {new Date(item.created_at).toLocaleDateString()}
                            </div>
                            </div>
                        </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          <div>{item.profiles?.full_name || "Unknown"}</div>
                          <div className="text-xs">@{item.profiles?.tg_username || "-"}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white font-medium">
                            {item.price} {item.currency}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                            ${item.status === 'active' ? 'bg-green-100 text-green-800' : 
                              item.status === 'banned' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}`}>
                            {item.status}
                        </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex justify-end gap-2">
                                <button 
                                    onClick={() => toggleStatus(item.id, item.status)}
                                    title={item.status === 'banned' ? "Unban" : "Ban"}
                                    className={`p-1 rounded-md ${item.status === 'banned' ? 'text-green-600 hover:bg-green-100' : 'text-orange-600 hover:bg-orange-100'}`}
                                >
                                    {item.status === 'banned' ? <CheckCircleIcon className="w-5 h-5"/> : <NoSymbolIcon className="w-5 h-5"/>}
                                </button>
                                <button 
                                    onClick={() => deleteListing(item.id)}
                                    title="Delete"
                                    className="p-1 text-red-600 hover:bg-red-100 rounded-md"
                                >
                                    <TrashIcon className="w-5 h-5" />
                                </button>
                            </div>
                        </td>
                    </tr>
                    ))
                )}
            </tbody>
            </table>
        </div>
      </div>

       {/* Pagination Controls */}
       <div className="flex justify-end gap-2 mt-4">
         <button 
            disabled={page === 0}
            onClick={() => setPage(p => Math.max(0, p - 1))}
            className="px-4 py-2 bg-white dark:bg-neutral-900 border border-gray-200 dark:border-white/10 rounded-lg text-sm disabled:opacity-50"
         >
             Previous
         </button>
         <button 
            onClick={() => setPage(p => p + 1)}
            disabled={listings.length < PAGE_SIZE}
            className="px-4 py-2 bg-white dark:bg-neutral-900 border border-gray-200 dark:border-white/10 rounded-lg text-sm disabled:opacity-50"
         >
             Next
         </button>
      </div>
    </div>
  );
}
