import React, { useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { apiFetch } from '../api/client';
import SummaryCard from '../components/SummaryCard';
import ConfirmModal from '../components/ConfirmModal';
import { formatRupiah } from '../utils/format';

export default function Dashboard() {
  const { selectedSession: session, isReadOnly, refreshSessions, sessionData } = useOutletContext();
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
  const navigate = useNavigate();

  if (sessionData.loading) return <div className="p-8">Loading dashboard...</div>;

  if (!session) {
    return (
      <div className="p-8 text-center max-w-lg mx-auto mt-20 bg-white rounded-lg shadow-sm border p-12">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Belum ada sesi PO aktif</h2>
        <p className="text-gray-600 mb-8">Buat sesi PO baru terlebih dahulu untuk mulai menerima pesanan.</p>
        <button
          onClick={() => navigate('/sessions')}
          className="bg-orange-600 text-white px-6 py-2 rounded shadow hover:bg-orange-700 transition-colors"
        >
          Ke Manajemen Sesi
        </button>
      </div>
    );
  }

  const { orders, finance, kitchen } = sessionData;
  const items = kitchen.items || [];

  const handleCloseBatch = async () => {
    try {
      await apiFetch(`/finance/close?session_id=${session.id_po}`, { method: 'POST' });
      setIsCloseModalOpen(false);
      refreshSessions();
      navigate('/finance');
    } catch (err) {
      alert(err.message);
    }
  };


  if (!session) {
    return (
      <div className="p-8 text-center max-w-lg mx-auto mt-20 bg-white rounded-lg shadow-sm border p-12">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Belum ada sesi PO aktif</h2>
        <p className="text-gray-600 mb-8">Buat sesi PO baru terlebih dahulu untuk mulai menerima pesanan.</p>
        <button
          onClick={() => navigate('/sessions')}
          className="bg-orange-600 text-white px-6 py-2 rounded shadow hover:bg-orange-700 transition-colors"
        >
          Ke Manajemen Sesi
        </button>
      </div>
    );
  }

  // Analytics Calculations
  const unpaidOrders = orders.filter(o => o.status_bayar === 'UNPAID');
  const hasUnpaid = unpaidOrders.length > 0;
  
  const totalUnpaid = unpaidOrders.reduce((sum, order) => {
    const orderItems = items.filter(i => i.id_order === order.id_order);
    const subtotal = orderItems.reduce((s, i) => s + i.subtotal, 0);
    return sum + subtotal + order.ongkir;
  }, 0);

  // Approximate production counting (simple sum for summary)
  const totalDimsum = items.reduce((count, item) => {
    const name = item.nama_produk || '';
    const qty = item.qty || 1;
    if (name.includes('Dimsum') || name.includes('Bacar')) {
      return count + qty;
    } else if (name === 'BSweet') {
      return count + (2 * qty); // 1 Mentai + 1 Bacar
    } else if (name === 'BAdil') {
      return count + (3 * qty); // 1 Mentai + 2 Bacar
    }
    return count;
  }, 0);

  // Group by date for Production Board
  const boardDates = {};
  orders.filter(o => o.status_bayar !== 'CANCELLED').forEach(order => {
    const dateText = order.delivery_slots?.jadwal_teks || 'Tanpa Jadwal';
    if (!boardDates[dateText]) boardDates[dateText] = [];
    
    const orderItems = items.filter(i => i.id_order === order.id_order);
    const codes = orderItems.map(i => `${i.qty}${i.nama_produk.includes('Mentai') ? 'M' : i.nama_produk.includes('Bacar') ? 'b' : 'O'}`);
    
    boardDates[dateText].push({
      nama_pelanggan: order.nama_pelanggan,
      codes: codes.join(', ')
    });
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500">Sesi Aktif: PO-{session.id_po}</p>
        </div>
        {!isReadOnly && (
          <div>
            <div className="relative group inline-block">
              <button
                onClick={() => setIsCloseModalOpen(true)}
                disabled={hasUnpaid}
                className={`px-4 py-2 rounded-md font-medium shadow-sm transition-colors ${
                  hasUnpaid 
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                    : 'bg-red-600 text-white hover:bg-red-700'
                }`}
              >
                Close Batch ▼
              </button>
              {hasUnpaid && (
                <div className="absolute top-full right-0 mt-2 w-48 p-2 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                  Ada pesanan UNPAID. Lunasin dulu sebelum tutup batch.
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <SummaryCard 
          title="Produksi" 
          value={`${totalDimsum} / ${session.kuota_maksimal}`} 
          subLabel="box dimsum" 
        />
        <SummaryCard 
          title="Tagihan UNPAID" 
          value={formatRupiah(totalUnpaid)} 
          subLabel={`${unpaidOrders.length} pesanan belum lunas`} 
        />
        <SummaryCard 
          title="Est. Laba Bersih" 
          value={formatRupiah(finance?.laba_bersih || 0)} 
          subLabel="(dari PAID)" 
        />
      </div>

      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="p-4 border-b bg-gray-50">
          <h3 className="font-medium text-gray-900">Production Board</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">
                  Pelanggan
                </th>
                {Object.keys(boardDates).map(date => (
                  <th key={date} className="px-6 py-3 text-center font-medium text-gray-500 uppercase tracking-wider border-l">
                    {date}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {/* Combine all unique customers for the rows */}
              {Array.from(new Set(orders.filter(o => o.status_bayar !== 'CANCELLED').map(o => o.nama_pelanggan))).map(customer => (
                <tr key={customer} className="hover:bg-orange-50 cursor-pointer" onClick={() => navigate('/orders')}>
                  <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                    {customer}
                  </td>
                  {Object.keys(boardDates).map(date => {
                    const found = boardDates[date].find(d => d.nama_pelanggan === customer);
                    return (
                      <td key={date} className="px-6 py-4 whitespace-nowrap text-center text-gray-500 border-l">
                        {found ? found.codes : '-'}
                      </td>
                    );
                  })}
                </tr>
              ))}
              {orders.filter(o => o.status_bayar !== 'CANCELLED').length === 0 && (
                <tr>
                  <td colSpan={Object.keys(boardDates).length + 1} className="px-6 py-8 text-center text-gray-500">
                    Belum ada data produksi untuk sesi ini.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmModal
        isOpen={isCloseModalOpen}
        title="Tutup Batch PO?"
        body="Tindakan ini tidak bisa dibatalkan. Semua data akan dikunci. Pastikan semua orderan dan pengeluaran sudah final."
        confirmText="Ya, Tutup Batch"
        onConfirm={handleCloseBatch}
        onCancel={() => setIsCloseModalOpen(false)}
      />
    </div>
  );
}
