'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

interface UserProfile {
  id: string;
  email: string;
  runs_used: number;
  max_runs: number;
  created_at: string;
}

const ADMIN_EMAILS = ['shravan@naum.systems'];

export default function AdminPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [user, setUser] = useState<any>(null);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setUser(user);
      
      if (!ADMIN_EMAILS.includes(user.email || '')) {
        router.push('/dashboard');
        return;
      }
      setIsAdmin(true);
      loadUsers();
    };
    init();
  }, [supabase, router]);

  const loadUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (data) setUsers(data);
    setLoading(false);
  };

  const updateMaxRuns = async (userId: string, newMax: number) => {
    await supabase
      .from('profiles')
      .update({ max_runs: newMax })
      .eq('id', userId);
    loadUsers();
  };

  const resetRuns = async (userId: string) => {
    await supabase
      .from('profiles')
      .update({ runs_used: 0 })
      .eq('id', userId);
    loadUsers();
  };

  const giveUnlimited = async (userId: string) => {
    await supabase
      .from('profiles')
      .update({ max_runs: 9999 })
      .eq('id', userId);
    loadUsers();
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">Checking permissions...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <header className="border-b border-gray-800 bg-black/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 bg-clip-text text-transparent">SignalForge</h1>
            <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs font-medium rounded">ADMIN</span>
          </div>
          <div className="flex items-center gap-4">
            <a href="/dashboard" className="text-gray-400 hover:text-white text-sm">Dashboard</a>
            <span className="text-gray-400 text-sm">{user?.email}</span>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-12">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-white mb-2">Admin Panel</h2>
          <p className="text-gray-400">Manage user access and search limits</p>
        </div>

        <div className="mb-6 flex gap-4">
          <button onClick={loadUsers} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
            Refresh
          </button>
          <div className="text-gray-400 flex items-center">
            Total users: {users.length}
          </div>
        </div>

        {loading ? (
          <div className="text-gray-400">Loading users...</div>
        ) : (
          <div className="bg-gray-900/50 border border-gray-800 rounded-2xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left px-6 py-4 text-gray-400 font-medium">Email</th>
                  <th className="text-left px-6 py-4 text-gray-400 font-medium">Runs Used</th>
                  <th className="text-left px-6 py-4 text-gray-400 font-medium">Max Runs</th>
                  <th className="text-left px-6 py-4 text-gray-400 font-medium">Status</th>
                  <th className="text-left px-6 py-4 text-gray-400 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((profile) => (
                  <tr key={profile.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                    <td className="px-6 py-4 text-white">{profile.email}</td>
                    <td className="px-6 py-4 text-white">{profile.runs_used || 0}</td>
                    <td className="px-6 py-4">
                      <input
                        type="number"
                        value={profile.max_runs || 3}
                        onChange={(e) => updateMaxRuns(profile.id, parseInt(e.target.value))}
                        className="w-20 px-2 py-1 bg-gray-800 border border-gray-700 rounded text-white"
                      />
                    </td>
                    <td className="px-6 py-4">
                      {(profile.runs_used || 0) >= (profile.max_runs || 3) ? (
                        <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded">Limited</span>
                      ) : (profile.max_runs || 3) >= 9999 ? (
                        <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded">Unlimited</span>
                      ) : (
                        <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded">Active</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => resetRuns(profile.id)}
                          className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                        >
                          Reset
                        </button>
                        <button
                          onClick={() => giveUnlimited(profile.id)}
                          className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                        >
                          Unlimited
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
