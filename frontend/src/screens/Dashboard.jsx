import React, { useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { apiFetch } from '../api/client';
import SummaryCard from '../components/SummaryCard';
import ConfirmModal from '../components/ConfirmModal';
import { formatRupiah } from '../utils/format';
import { Lock } from 'lucide-react';

export default function Dashboard() {
  const { selectedSession: session, isReadOnly, refreshSessions, sessionData } = useOutletContext();
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
  const navigate = useNavigate();

  if (sessionData.loading) return (
    <div className="p-4 md:p-8">
      <div className="skeleton h-8 w-1/4 mb-6"></div>
      <div className="flex gap-4 mb-6">
        <div className="skeleton h-24 w-1/3"></div>
        <div className="skeleton h-24 w-1/3"></div>
        <div className="skeleton h-24 w-1/3"></div>
      </div>
      <div className="skeleton h-64 w-full"></div>
    </div>
  );

  if (!session) {
    return (
      <div className="p-8 text-center max-w-lg mx-auto mt-20 card p-[40px]">
        <h2 className="text-[20px] font-bold text-[var(--text-primary)] mb-[12px] font-['Space_Grotesk']">Belum ada sesi PO aktif</h2>
        <p className="text-[14px] text-[var(--text-secondary)] mb-[24px] font-['Inter']">Buat sesi PO baru terlebih dahulu untuk mulai menerima pesanan.</p>
        <button
          onClick={() => navigate('/sessions')}
          className="btn-primary"
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

  const unpaidOrders = orders.filter(o => o.status_bayar === 'UNPAID');
  const hasUnpaid = unpaidOrders.length > 0;
  
  const totalUnpaid = unpaidOrders.reduce((sum, order) => {
    const orderItems = items.filter(i => i.id_order === order.id_order);
    const subtotal = orderItems.reduce((s, i) => s + i.subtotal, 0);
    return sum + subtotal + order.ongkir;
  }, 0);

  const totalDimsum = items.reduce((count, item) => {
    const name = item.nama_produk || '';
    const qty = item.qty || 1;
    if (name.includes('Dimsum') || name.includes('Bacar')) {
      return count + qty;
    } else if (name === 'BSweet') {
      return count + (2 * qty); 
    } else if (name === 'BAdil') {
      return count + (3 * qty); 
    }
    return count;
  }, 0);

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
    <div className="max-w-6xl mx-auto space-y-[24px]">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-[24px] font-semibold text-[var(--text-primary)] font-['Space_Grotesk']">
            Dashboard
            <span className="text-[var(--text-secondary)] font-normal text-[18px] ml-2">(PO-{session.id_po})</span>
          </h1>
        </div>
        {!isReadOnly && (
          <div className="relative group inline-block">
            <button
              onClick={() => setIsCloseModalOpen(true)}
              disabled={hasUnpaid}
              className={`flex items-center gap-[6px] h-[36px] px-[16px] rounded-[6px] font-['Inter'] font-medium text-[13px] transition-colors ${
                hasUnpaid 
                  ? 'bg-[var(--bg-muted)] text-[var(--text-disabled)] cursor-not-allowed border border-[var(--border)]' 
                  : 'bg-[var(--status-cancelled)] text-white hover:bg-red-700'
              }`}
            >
              <Lock className="w-4 h-4" />
              Close Batch
            </button>
            {hasUnpaid && (
              <div className="absolute top-full right-0 mt-2 w-48 p-[12px] bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-primary)] text-[12px] rounded-[6px] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-xl">
                Ada pesanan UNPAID. Lunasin dulu sebelum tutup batch.
              </div>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-[16px]">
        <SummaryCard 
          title="Produksi (Box)" 
          value={`${totalDimsum} / ${session.kuota_maksimal}`} 
          subLabel="Total box dimsum + bacar" 
        />
        <SummaryCard 
          title="Tagihan UNPAID" 
          value={formatRupiah(totalUnpaid)} 
          subLabel={`${unpaidOrders.length} pesanan belum lunas`} 
        />
        <SummaryCard 
          title="Est. Laba Bersih" 
          value={formatRupiah(finance?.laba_bersih || 0)} 
          subLabel="Dari order yang sudah PAID" 
        />
      </div>

      <div className="card overflow-x-auto p-0">
        <div className="card-header border-b border-[var(--border)] p-[16px]">
          Production Board
        </div>
        <table className="min-w-full text-left border-collapse">
          <thead>
            <tr>
              <th className="table-header-cell border-b border-[var(--border)]">Pelanggan</th>
              {Object.keys(boardDates).map(date => (
                <th key={date} className="table-header-cell border-b border-l border-[var(--border)] text-center">
                  {date}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {Array.from(new Set(orders.filter(o => o.status_bayar !== 'CANCELLED').map(o => o.nama_pelanggan))).map(customer => (
              <tr key={customer} className="table-row cursor-pointer" onClick={() => navigate('/orders')}>
                <td className="table-cell font-medium text-[var(--text-secondary)]">
                  {customer}
                </td>
                {Object.keys(boardDates).map(date => {
                  const found = boardDates[date].find(d => d.nama_pelanggan === customer);
                  return (
                    <td key={date} className="table-cell text-center border-l border-[var(--border)] text-[var(--text-primary)] font-['JetBrains_Mono'] text-[13px]">
                      {found ? found.codes : <span className="text-[var(--text-disabled)]">-</span>}
                    </td>
                  );
                })}
              </tr>
            ))}
            {orders.filter(o => o.status_bayar !== 'CANCELLED').length === 0 && (
              <tr className="table-row">
                <td colSpan={Object.keys(boardDates).length + 1} className="table-cell text-center py-[32px] text-[var(--text-secondary)]">
                  Belum ada data produksi untuk sesi ini.
                </td>
              </tr>
            )}
          </tbody>
        </table>
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
