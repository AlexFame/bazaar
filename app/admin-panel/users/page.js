"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Image from "next/image";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 20;

  const fetchUsers = async () => {
    setLoading(true);
    let query = supabase
      .from('profiles')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (search) {
      query = query.or(`full_name.ilike.%${search}%,tg_username.ilike.%${search}%`);
    }

    const { data, error } = await query;
    if (error) console.error(error);
    else setUsers(data || []);
    
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, [page, search]);

  // Debounce search
  useEffect(() => {
     const timer = setTimeout(() => {
         setPage(0);
         fetchUsers();
     }, 500);
     return () => clearTimeout(timer);
  }, [search]);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold dark:text-white">Users Management</h1>
        <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            <input 
                type="text" 
                placeholder="Search users..." 
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
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Telegram ID</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Joined</th>
                </tr>
            </thead>
            <tbody className="bg-white dark:bg-neutral-900 divide-y divide-gray-200 dark:divide-white/10">
                {loading ? (
                    <tr><td colSpan="4" className="text-center py-10">Loading...</td></tr>
                ) : users.length === 0 ? (
                    <tr><td colSpan="4" className="text-center py-10">No users found</td></tr>
                ) : (
                    users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                            <div className="h-10 w-10 flex-shrink-0">
                                <div className="h-10 w-10 rounded-full bg-gray-200 overflow-hidden relative">
                                    {user.avatar_url ? (
                                        <Image src={user.avatar_url} alt="" fill className="object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-sm font-bold text-gray-500">
                                            {(user.full_name || "U")[0]}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                                {user.full_name || "Unknown User"}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                                @{user.tg_username || "no_username"}
                            </div>
                            </div>
                        </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {user.tg_user_id}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.is_admin ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'}`}>
                            {user.is_admin ? 'Admin' : 'User'}
                        </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {new Date(user.created_at).toLocaleDateString()}
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
            // Simplistic next pagination (if less than page size, assume end)
            disabled={users.length < PAGE_SIZE}
            className="px-4 py-2 bg-white dark:bg-neutral-900 border border-gray-200 dark:border-white/10 rounded-lg text-sm disabled:opacity-50"
         >
             Next
         </button>
      </div>
    </div>
  );
}
