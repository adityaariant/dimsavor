import React, { useState, useEffect } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { apiFetch } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { LayoutDashboard, Calendar, FileText, ShoppingBag, ChefHat, DollarSign, Settings, Share2, Menu, X, LogOut } from 'lucide-react';

export default function Layout() {
  const { logout, displayName } = useAuth();
  const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/sessions', label: 'Sessions', icon: Calendar },
    { to: '/parse', label: 'Order Parser', icon: FileText },
    { to: '/orders', label: 'Orders', icon: ShoppingBag },
    { to: '/kitchen', label: 'Kitchen Board', icon: ChefHat },
    { to: '/finance', label: 'Finance', icon: DollarSign },
    { to: '/alias', label: 'Alias Manager', icon: Settings },
    { to: '/assets', label: 'Assets', icon: Share2 },
  ];

  const [sessions, setSessions] = useState([]);
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
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
        } else {
          setSessionData(prev => ({ ...prev, loading: false }));
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

  // Optimistic UI helper
  const updateLocalOrder = (orderId, newOrderData) => {
    setSessionData(prev => ({
      ...prev,
      orders: prev.orders.map(o => o.id_order === orderId ? { ...o, ...newOrderData } : o)
    }));
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-[#0D0C0A]">
      
      {/* Mobile Top Bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-12 bg-[#181612] border-b border-[#302D28] flex items-center justify-between px-4 z-20">
        <button onClick={() => setSidebarOpen(true)} className="text-[#837D74] hover:text-[#EDE9E0]">
          <Menu className="w-6 h-6" />
        </button>
        <span className="font-['Space_Grotesk'] font-semibold text-[#EDE9E0]">DimsaVora</span>
        <div className="text-xs bg-[#2A2722] text-[#EDE9E0] px-2 py-1 rounded">
          {selectedSession ? `PO-${selectedSession.id_po}` : '...'}
        </div>
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/70 backdrop-blur-[2px] z-30" 
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed md:static inset-y-0 left-0 z-40
        w-[220px] bg-[#181612] border-r border-[#302D28] flex flex-col
        transition-transform duration-180 ease-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="h-[52px] px-4 border-b border-[#302D28] flex flex-col justify-center relative">
          <button 
            className="md:hidden absolute top-3 right-3 text-[#837D74]" 
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
          
          <select 
            className="w-full bg-transparent text-[#EDE9E0] font-['Space_Grotesk'] font-semibold text-[14px] appearance-none outline-none cursor-pointer"
            value={selectedSessionId || ''}
            onChange={e => setSelectedSessionId(e.target.value)}
          >
            {sessions.map(s => (
              <option key={s.id_po} value={s.id_po} className="text-black">
                PO-{s.id_po} · {s.status}
              </option>
            ))}
            {sessions.length === 0 && <option value="" className="text-black">Tidak ada sesi</option>}
          </select>
          {selectedSession && (
             <div className="text-[11px] text-[#837D74] font-['Inter']">
               {selectedSession.status === 'Active' ? 'Active' : 'Closed'}
             </div>
          )}
        </div>
        
        <nav className="flex-1 overflow-y-auto space-y-[2px] py-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  `flex items-center h-[34px] px-3 font-['Inter'] text-[13px] transition-colors ${
                    isActive 
                      ? 'bg-[#3D2A08] text-[#F5A623] border-l-[3px] border-[#F5A623] !pl-[9px]' 
                      : 'text-[#837D74] hover:bg-[#2A2722] hover:text-[#EDE9E0]'
                  }`
                }
              >
                <Icon className="w-4 h-4 mr-3" />
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        {/* Footer (User) */}
        <div className="p-4 border-t border-[#302D28] text-sm flex justify-between items-center">
           <div className="text-[#837D74] font-['Inter'] text-[13px]">
             User: <span className="text-[#EDE9E0]">{displayName || 'Admin'}</span>
           </div>
           <button onClick={logout} className="text-[#F87171] hover:text-red-400">
             <LogOut className="w-4 h-4" />
           </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-4 md:p-6 relative mt-12 md:mt-0 bg-[#0D0C0A]">
        {isReadOnly && (
          <div className="absolute top-0 left-0 right-0 bg-[#3D2A08] text-[#F5A623] text-center text-xs py-1 font-medium z-10 border-b border-[#7A520F]">
            Melihat data historis (Read-Only). Aksi dinonaktifkan.
          </div>
        )}
        <Outlet context={{ 
          selectedSession, 
          isReadOnly, 
          sessionData,
          updateLocalOrder,
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
