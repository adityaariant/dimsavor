import React, { useState, useEffect } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { apiFetch } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { LayoutDashboard, Calendar, DollarSign, Settings, Share2, Menu, X, LogOut } from 'lucide-react';

export default function Layout() {
  const { logout, displayName } = useAuth();
  const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/sessions', label: 'Sessions', icon: Calendar },
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
    <div className="flex h-screen bg-[var(--bg-base)]">
      
      {/* Mobile Top Bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-12 bg-[var(--bg-elevated)] border-b border-[var(--border)] flex items-center justify-between px-4 z-20">
        <button onClick={() => setSidebarOpen(true)} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
          <Menu className="w-6 h-6" />
        </button>
        <span className="font-['Fraunces'] font-semibold text-[var(--text-primary)]">Dimsavor</span>
        <div className="text-xs bg-[var(--bg-muted)] text-[var(--text-primary)] px-2 py-1 rounded font-['Inter_Tight_Variable']">
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

      <aside className={`
        fixed md:static inset-y-0 left-0 z-40
        w-[220px] bg-[var(--color-sidebar)] border-r border-sidebar-border flex flex-col
        transition-transform duration-180 ease-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="h-[56px] px-4 border-b border-sidebar-border flex items-center relative">
          <button 
            className="md:hidden absolute top-3 right-3 text-sidebar-foreground/70" 
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="flex-1 min-w-0 pl-2">
            <h1 className="text-[20px] font-bold text-sidebar-foreground font-display tracking-tight">Amara.</h1>
            {selectedSession ? (
               <div className="text-[10px] text-sidebar-foreground/70 font-medium font-sans uppercase tracking-widest mt-1">
                 PO-{selectedSession.id_po} • {selectedSession.status}
               </div>
            ) : (
               <div className="text-[10px] text-sidebar-foreground/70 font-medium font-sans uppercase tracking-widest mt-1">
                 Tidak ada sesi
               </div>
            )}
          </div>
        </div>
        
        <nav className="flex-1 overflow-y-auto space-y-[2px] py-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  `flex items-center h-[38px] px-3 font-sans text-[13px] transition-colors mx-2 mb-1 rounded-[6px] ${
                    isActive 
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium border-l-[3px] border-terracotta !pl-[9px]' 
                      : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
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
        <div className="p-4 border-t border-sidebar-border text-sm flex justify-between items-center bg-sidebar">
           <div className="text-sidebar-foreground/70 font-sans text-[13px]">
             User: <span className="text-sidebar-foreground font-medium">{displayName || 'Admin'}</span>
           </div>
           <button onClick={logout} className="text-terracotta hover:text-rust transition-colors">
             <LogOut className="w-4 h-4" />
           </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto relative mt-12 md:mt-0 bg-background">
        {isReadOnly && (
          <div className="sticky top-0 bg-rust/10 text-rust text-center text-xs py-1.5 font-medium z-10 border-b border-rust/20 font-sans">
            Melihat data historis (Read-Only). Aksi dinonaktifkan.
          </div>
        )}
        <div className="p-4 md:p-6">
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
        </div>
      </main>
    </div>
  );
}
