import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { apiFetch } from '../api/client';
import StatusBadge from '../components/StatusBadge';
import OrderDrawer from '../components/OrderDrawer';
import { formatRupiah } from '../utils/format';

export default function Orders() {
  const { selectedSession: session, isReadOnly, sessionData, refreshSessionData } = useOutletContext();
  
  const [filter, setFilter] = useState('Semua');
  const [search, setSearch] = useState('');
  
  const [selectedOrder, setSelectedOrder] = useState(null);

  if (sessionData.loading) return <div className="p-8">Loading orders...</div>;
  if (!session) return <div className="p-8 text-center text-gray-500 mt-20">Tidak ada sesi aktif.</div>;

  const { orders, kitchen } = sessionData;
  const items = kitchen.items || [];

  const handleToggleBayar = async (id_order, currentStatus) => {
    if (isReadOnly || currentStatus === 'CANCELLED') return;
    try {
      await apiFetch(`/orders/${id_order}/pay`, { method: 'PATCH' });
      await refreshSessionData();
    } catch (err) {
      alert("Gagal update status bayar");
    }
  };

  const handleToggleKirim = async (id_order, currentStatus) => {
    if (isReadOnly || currentStatus === 'CANCELLED') return;
    try {
      await apiFetch(`/orders/${id_order}/send`, { method: 'PATCH' });
      await refreshSessionData();
    } catch (err) {
      alert("Gagal update status kirim");
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

  if (!session) return <div className="p-8 text-center text-gray-500 mt-20">Tidak ada sesi aktif.</div>;

  return (
    <div className="max-w-7xl mx-auto space-y-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Orders <span className="text-gray-400 font-normal text-lg ml-2">(PO-{session.id_po})</span></h1>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-lg shadow-sm border">
        <div className="flex space-x-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0">
          {['Semua', 'UNPAID', 'PAID', 'PENDING', 'SENT', 'CANCELLED'].map(f => (
            <button 
              key={f} 
              onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${filter === f ? 'bg-orange-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              {f}
            </button>
          ))}
        </div>
        <input 
          type="text" 
          placeholder="Cari pelanggan..." 
          className="border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring focus:border-orange-500 w-full md:w-64"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      <div className="bg-white shadow-sm border rounded-lg overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 text-sm text-left">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 font-medium text-gray-500">#</th>
              <th className="px-6 py-3 font-medium text-gray-500">Nama</th>
              <th className="px-6 py-3 font-medium text-gray-500">Items</th>
              <th className="px-6 py-3 font-medium text-gray-500">Jadwal Kirim</th>
              <th className="px-6 py-3 font-medium text-gray-500 text-right">Total</th>
              <th className="px-6 py-3 font-medium text-gray-500 text-center">Bayar</th>
              <th className="px-6 py-3 font-medium text-gray-500 text-center">Kirim</th>
              <th className="px-6 py-3 font-medium text-gray-500 text-center">Detail</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {filteredOrders.map(order => {
              const orderItems = items.filter(i => i.id_order === order.id_order);
              const totalAmount = orderItems.reduce((s, i) => s + (i.subtotal||0), 0) + order.ongkir;
              const isCancelled = order.status_bayar === 'CANCELLED';
              const codes = orderItems.map(i => `${i.qty}${i.nama_produk.includes('Mentai') ? 'M' : i.nama_produk.includes('Bacar') ? 'b' : 'O'}`).join(', ');

              return (
                <tr key={order.id_order} className={`transition-colors ${isCancelled ? 'bg-gray-50 opacity-60' : 'hover:bg-orange-50'}`}>
                  <td className="px-6 py-4 text-gray-500 whitespace-nowrap">{order.id_order}</td>
                  <td className={`px-6 py-4 font-medium text-gray-900 whitespace-nowrap ${isCancelled ? 'line-through text-gray-400' : ''}`}>{order.nama_pelanggan}</td>
                  <td className="px-6 py-4 text-gray-600 font-mono text-xs">{codes || '-'}</td>
                  <td className="px-6 py-4 text-gray-500 whitespace-nowrap">{order.delivery_slots?.jadwal_teks || 'Tanpa Jadwal'}</td>
                  <td className="px-6 py-4 font-medium text-right text-gray-900 whitespace-nowrap">{formatRupiah(totalAmount)}</td>
                  <td className="px-6 py-4 text-center whitespace-nowrap">
                    <button 
                      onClick={() => handleToggleBayar(order.id_order, order.status_bayar)}
                      disabled={isCancelled}
                      className="focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-orange-500 rounded-full"
                    >
                      <StatusBadge status={order.status_bayar} className={!isCancelled ? "cursor-pointer hover:opacity-80 transition-opacity" : ""} />
                    </button>
                  </td>
                  <td className="px-6 py-4 text-center whitespace-nowrap">
                    <button 
                      onClick={() => handleToggleKirim(order.id_order, order.status_kirim)}
                      disabled={isCancelled}
                      className="focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-orange-500 rounded-full"
                    >
                      <StatusBadge status={order.status_kirim} className={!isCancelled ? "cursor-pointer hover:opacity-80 transition-opacity" : ""} />
                    </button>
                  </td>
                  <td className="px-6 py-4 text-center whitespace-nowrap">
                    <button 
                      onClick={() => setSelectedOrder(order)} 
                      className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-gray-500 hover:bg-orange-100 hover:text-orange-600 transition-colors focus:outline-none"
                    >
                      <span className="font-bold">→</span>
                    </button>
                  </td>
                </tr>
              )
            })}
            {filteredOrders.length === 0 && (
              <tr>
                <td colSpan="8" className="px-6 py-8 text-center text-gray-500">
                  Tidak ada pesanan yang sesuai dengan filter.
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
