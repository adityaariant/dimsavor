import React, { useState, useEffect } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { apiFetch } from '../api/client';
import { LayoutDashboard, Calendar, FileText, ShoppingBag, ChefHat, DollarSign, Settings } from 'lucide-react';

export default function Layout() {
  const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/sessions', label: 'Sessions', icon: Calendar },
    { to: '/parse', label: 'Order Parser', icon: FileText },
    { to: '/orders', label: 'Orders', icon: ShoppingBag },
    { to: '/kitchen', label: 'Kitchen Board', icon: ChefHat },
    { to: '/finance', label: 'Finance', icon: DollarSign },
    { to: '/alias', label: 'Alias Manager', icon: Settings },
  ];

  const [sessions, setSessions] = useState([]);
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  
  // Global Data Cache
  const [sessionData, setSessionData] = useState({
    orders: [],
    finance: null,
    kitchen: { items: [], bundles: [], aliases: [] },
    expenses: [],
    loading: true
  });

  const refreshSessionData = async (id) => {
    if (!id) return;
    setSessionData(prev => ({ ...prev, loading: true }));
    try {
      const ords = await apiFetch(`/orders/?session_id=${id}`);
      const fin = await apiFetch(`/finance/preview?session_id=${id}`);
      const kitch = await apiFetch(`/kitchen/?session_id=${id}`);
      const exp = await apiFetch(`/expenses?session_id=${id}`);
      setSessionData({
        orders: ords || [],
        finance: fin || null,
        kitchen: kitch || { items: [], bundles: [], aliases: [] },
        expenses: exp || [],
        loading: false
      });
    } catch (err) {
      console.error('Failed to load session data', err);
      setSessionData(prev => ({ ...prev, loading: false }));
    }
  };

  useEffect(() => {
    async function loadSessions() {
      try {
        const data = await apiFetch('/sessions/');
        setSessions(data);
        if (data.length > 0) {
          const active = data.find(s => s.status === 'Active');
          const initialId = active ? active.id_po : data[0].id_po;
          setSelectedSessionId(initialId);
        }
      } catch (err) {
        console.error('Failed to fetch sessions for layout', err);
      }
    }
    loadSessions();
  }, []);

  useEffect(() => {
    if (selectedSessionId) {
      refreshSessionData(selectedSessionId);
    }
  }, [selectedSessionId]);

  const selectedSession = sessions.find(s => s.id_po == selectedSessionId) || null;
  const isReadOnly = selectedSession?.status === 'Closed';

  return (
    <div className="flex h-screen bg-gray-50">
      <aside className="w-64 bg-white border-r flex flex-col">
        <div className="p-4 border-b">
          <h1 className="text-xl font-bold text-orange-600">Dimsavor</h1>
          <div className="mt-2">
            <label className="text-xs text-gray-500 block mb-1">Pilih Sesi PO:</label>
            <select 
              className="w-full text-sm border rounded p-1"
              value={selectedSessionId || ''}
              onChange={e => setSelectedSessionId(e.target.value)}
            >
              {sessions.map(s => (
                <option key={s.id_po} value={s.id_po}>
                  [{s.status}] PO-{s.id_po}
                </option>
              ))}
              {sessions.length === 0 && <option value="">Tidak ada sesi</option>}
            </select>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center px-3 py-2 rounded-md text-sm font-medium ${
                    isActive ? 'bg-orange-50 text-orange-600' : 'text-gray-700 hover:bg-gray-100'
                  }`
                }
              >
                <Icon className="w-5 h-5 mr-3" />
                {item.label}
              </NavLink>
            );
          })}
        </nav>
      </aside>
      <main className="flex-1 overflow-y-auto p-8 relative">
        {isReadOnly && (
          <div className="absolute top-0 left-0 right-0 bg-yellow-100 text-yellow-800 text-center text-xs py-1 font-medium z-10">
            Melihat data historis (Read-Only). Aksi dinonaktifkan.
          </div>
        )}
        <Outlet context={{ 
          selectedSession, 
          isReadOnly, 
          sessionData,
          refreshSessionData: () => refreshSessionData(selectedSessionId),
          refreshSessions: () => {
            apiFetch('/sessions/').then(data => {
              setSessions(data);
              if (!selectedSessionId && data.length > 0) {
                const active = data.find(s => s.status === 'Active');
                setSelectedSessionId(active ? active.id_po : data[0].id_po);
              }
            });
          } 
        }} />
      </main>
    </div>
  );
}
