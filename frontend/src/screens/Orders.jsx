import React, { useState } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import { apiFetch } from '../api/client';
import StatusBadge from '../components/StatusBadge';
import OrderDrawer from '../components/OrderDrawer';
import KitchenChip from '../components/KitchenChip';
import { formatRupiah } from '../utils/format';
import { ArrowRight, Search } from 'lucide-react';

export default function Orders() {
  const { selectedSession: session, isReadOnly, sessionData, updateLocalOrder, refreshSessionData } = useOutletContext();
  
  const [filter, setFilter] = useState('Semua');
  const [search, setSearch] = useState('');
  
  const [selectedOrder, setSelectedOrder] = useState(null);

  if (sessionData.loading) return (
    <div className="p-4 md:p-8">
      <div className="skeleton h-8 w-1/4 mb-6"></div>
      <div className="space-y-2">
        <div className="skeleton h-[36px] w-full"></div>
        <div className="skeleton h-[36px] w-full"></div>
        <div className="skeleton h-[36px] w-full"></div>
      </div>
    </div>
  );
  
  if (!session) return (
    <div className="p-8 text-center text-[var(--text-secondary)] mt-20 font-['Inter'] text-[13px]">
      Tidak ada sesi aktif.
    </div>
  );

  const { orders, kitchen } = sessionData;
  const items = kitchen.items || [];

  const handleToggleBayar = async (id_order, currentStatus) => {
    if (isReadOnly || currentStatus === 'CANCELLED') return;
    const newStatus = currentStatus === 'UNPAID' ? 'PAID' : 'UNPAID';
    
    // Optimistic Update
    updateLocalOrder(id_order, { status_bayar: newStatus });
    
    try {
      await apiFetch(`/orders/${id_order}/pay`, { method: 'PATCH' });
      // Background sync
      refreshSessionData();
    } catch (err) {
      alert("Gagal update status bayar");
      // Revert Optimistic Update
      updateLocalOrder(id_order, { status_bayar: currentStatus });
    }
  };

  const handleToggleKirim = async (id_order, currentStatus) => {
    if (isReadOnly || currentStatus === 'CANCELLED') return;
    const newStatus = currentStatus === 'PENDING' ? 'SENT' : 'PENDING';
    
    // Optimistic Update
    updateLocalOrder(id_order, { status_kirim: newStatus });
    
    try {
      await apiFetch(`/orders/${id_order}/send`, { method: 'PATCH' });
      // Background sync
      refreshSessionData();
    } catch (err) {
      alert("Gagal update status kirim");
      // Revert Optimistic Update
      updateLocalOrder(id_order, { status_kirim: currentStatus });
    }
  };

  const handleCancelOrder = async (id_order) => {
    if (isReadOnly) return;
    try {
      await apiFetch(`/orders/${id_order}/cancel`, { method: 'PATCH' });
      await refreshSessionData();
      setSelectedOrder(null);
    } catch (err) {
      alert("Gagal membatalkan pesanan");
    }
  };

  const filteredOrders = orders.filter(o => {
    if (filter === 'UNPAID' || filter === 'PAID') return o.status_bayar === filter;
    if (filter === 'PENDING' || filter === 'SENT') return o.status_kirim === filter;
    if (filter === 'CANCELLED') return o.status_bayar === 'CANCELLED';
    return true;
  }).filter(o => o.nama_pelanggan.toLowerCase().includes(search.toLowerCase()));

  // Helper to generate a short code for items, e.g., "1bk"
  const getShortCode = (item) => {
    const isBacar = item.nama_produk.toLowerCase().includes('bacar');
    const isMentai = item.nama_produk.toLowerCase().includes('mentai');
    let type = isBacar ? 'bk' : (isMentai ? 'M' : 'O');
    return `${item.qty}${type}`;
  };

  return (
    <div className="max-w-7xl mx-auto space-y-[20px]">
      <div className="flex justify-between items-center mb-2">
        <h1 className="text-[24px] font-semibold text-[var(--text-primary)] font-['Space_Grotesk']">
          Orders <span className="text-[var(--text-secondary)] font-normal text-[18px] ml-2">(PO-{session.id_po})</span>
        </h1>
      </div>

      {/* Filters (Compact) */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex space-x-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 hide-scrollbar">
          {['Semua', 'UNPAID', 'PAID', 'PENDING', 'SENT', 'CANCELLED'].map(f => (
            <button 
              key={f} 
              onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded-[4px] text-[12px] font-medium font-['Inter'] transition-colors whitespace-nowrap ${
                filter === f 
                  ? 'bg-[var(--amber)] text-[#0D0C0A]' 
                  : 'bg-[var(--bg-surface)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]" />
          <input 
            type="text" 
            placeholder="Cari pelanggan..." 
            className="form-input pl-9"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-[6px] overflow-x-auto">
        <table className="min-w-full text-left border-collapse">
          <thead>
            <tr>
              <th className="table-header-cell w-[40px]">#</th>
              <th className="table-header-cell w-[160px]">Nama</th>
              <th className="table-header-cell hidden md:table-cell">Items</th>
              <th className="table-header-cell w-[120px] hidden sm:table-cell">Jadwal Kirim</th>
              <th className="table-header-cell w-[90px] text-right">Total</th>
              <th className="table-header-cell w-[80px] text-center">Bayar</th>
              <th className="table-header-cell w-[80px] text-center">Kirim</th>
              <th className="table-header-cell w-[32px] text-center"></th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.map(order => {
              const orderItems = items.filter(i => i.id_order === order.id_order);
              const totalAmount = orderItems.reduce((s, i) => s + (i.subtotal||0), 0) + order.ongkir;
              const isCancelled = order.status_bayar === 'CANCELLED';
              
              const chipsToShow = orderItems.slice(0, 3);
              const moreCount = orderItems.length - 3;

              return (
                <tr key={order.id_order} className={`table-row ${isCancelled ? 'opacity-40' : ''}`}>
                  <td className="table-cell font-['JetBrains_Mono'] text-[var(--text-secondary)] text-[12px]">{order.id_order}</td>
                  <td className={`table-cell font-medium ${isCancelled ? 'line-through text-[var(--text-secondary)]' : 'text-[var(--text-primary)]'}`}>
                    {order.nama_pelanggan}
                    {order.area_tag && (
                      <span className="md:hidden ml-2 text-[10px] text-[var(--text-secondary)] uppercase">
                        [{order.area_tag}]
                      </span>
                    )}
                  </td>
                  <td className="table-cell hidden md:table-cell">
                    <div className="flex flex-wrap gap-2 items-center">
                      {chipsToShow.map((item, idx) => (
                        <KitchenChip 
                          key={idx} 
                          code={getShortCode(item)} 
                          isBacar={item.nama_produk.toLowerCase().includes('bacar')} 
                        />
                      ))}
                      {moreCount > 0 && (
                        <span className="text-[11px] text-[var(--text-secondary)] ml-1">
                          +{moreCount} more
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="table-cell hidden sm:table-cell text-[var(--text-secondary)] text-[12px]">
                    {order.delivery_slots?.jadwal_teks || 'Tanpa Jadwal'}
                  </td>
                  <td className="table-cell font-['JetBrains_Mono'] text-[12px] text-right">
                    {formatRupiah(totalAmount)}
                  </td>
                  <td className="table-cell text-center cursor-pointer" onClick={() => handleToggleBayar(order.id_order, order.status_bayar)}>
                    <StatusBadge status={order.status_bayar} />
                  </td>
                  <td className="table-cell text-center cursor-pointer" onClick={() => handleToggleKirim(order.id_order, order.status_kirim)}>
                    <StatusBadge status={order.status_kirim} />
                  </td>
                  <td className="table-cell text-center">
                    <button 
                      onClick={() => setSelectedOrder(order)} 
                      className="btn-icon"
                    >
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              )
            })}
            {filteredOrders.length === 0 && orders.length > 0 && (
              <tr>
                <td colSpan="8" className="table-cell text-center text-[var(--text-secondary)] py-8">
                  Tidak ada pesanan yang sesuai dengan filter.
                </td>
              </tr>
            )}
            {orders.length === 0 && (
              <tr>
                <td colSpan="8" className="table-cell text-center py-12">
                  <span className="text-[var(--text-secondary)] text-[13px]">
                    Belum ada pesanan di sesi ini. <Link to="/parse" className="text-[var(--amber)] hover:underline ml-1">Paste chat WA untuk mulai. →</Link>
                  </span>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <OrderDrawer 
        isOpen={!!selectedOrder} 
        order={selectedOrder} 
        items={selectedOrder ? items.filter(i => i.id_order === selectedOrder.id_order) : []}
        onClose={() => setSelectedOrder(null)}
        onCancelOrder={handleCancelOrder}
        isReadOnly={isReadOnly}
        session={session}
        refreshSessionData={refreshSessionData}
      />
    </div>
  );
}
