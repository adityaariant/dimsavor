import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import KitchenChip from '../components/KitchenChip';
import StatusBadge from '../components/StatusBadge';

export default function Kitchen() {
  const { selectedSession: session, sessionData } = useOutletContext();
  const [activeDate, setActiveDate] = useState('');

  const data = sessionData.kitchen;

  useEffect(() => {
    if (data?.orders?.length > 0 && !activeDate) {
      const dates = Array.from(new Set(data.orders.map(o => o.delivery_slots?.jadwal_teks || 'Manual')));
      if (dates.length > 0) setActiveDate(dates[0]);
    }
  }, [data, activeDate]);

  if (sessionData.loading) return (
    <div className="p-4 md:p-8">
      <div className="skeleton h-8 w-1/3 mb-6"></div>
      <div className="skeleton h-12 w-full mb-4"></div>
      <div className="skeleton h-32 w-full"></div>
    </div>
  );
  
  if (!session) return <div className="p-8 text-center text-[var(--text-secondary)] mt-20 font-['Inter'] text-[13px]">Tidak ada sesi aktif.</div>;

  const ordersForDate = data.orders.filter(o => (o.delivery_slots?.jadwal_teks || 'Manual') === activeDate);
  const orderIdsForDate = ordersForDate.map(o => o.id_order);
  
  // Items are already decomposed by the backend
  const itemsForDate = data.items.filter(i => {
    const oId = i.id_order || i.source_order_id;
    return orderIdsForDate.includes(oId);
  });

  const getKitchenCode = (nama_produk) => {
    const alias = data.aliases.find(a => a.nama_produk_baku === nama_produk);
    return alias ? alias.kitchen_code : '?';
  };

  let totalDimsumPcs = 0;
  let totalBacar = 0;

  itemsForDate.forEach(item => {
    if (item.nama_produk.toLowerCase().includes('bacar')) {
      totalBacar += item.qty;
    } else {
      totalDimsumPcs += item.qty;
    }
  });

  const finalBoxes = Math.floor(totalDimsumPcs / 6);
  const finalPcs = totalDimsumPcs % 6;
  const totalPcsAll = totalDimsumPcs;

  const dates = Array.from(new Set(data.orders.map(o => o.delivery_slots?.jadwal_teks || 'Manual')));

  // Group items by order
  const groupedItems = {};
  itemsForDate.forEach(item => {
    const oId = item.id_order || item.source_order_id;
    if (!groupedItems[oId]) {
      const order = data.orders.find(o => o.id_order === oId);
      groupedItems[oId] = { order, items: [] };
    }
    groupedItems[oId].items.push(item);
  });

  return (
    <div className="max-w-6xl mx-auto space-y-[20px]">
      <h1 className="text-[24px] font-semibold text-[var(--text-primary)] font-['Space_Grotesk']">
        Kitchen Board <span className="text-[var(--text-secondary)] font-normal text-[18px] ml-2">(PO-{session.id_po})</span>
      </h1>
      
      {/* Date Tabs */}
      <div className="flex border-b border-[var(--border)] overflow-x-auto hide-scrollbar touch-pan-x">
        {dates.map(d => (
          <button 
            key={d}
            onClick={() => setActiveDate(d)}
            className={`px-4 py-[10px] font-['Inter'] font-medium text-[13px] transition-colors whitespace-nowrap border-b-[2px] ${
              activeDate === d 
                ? 'border-[var(--amber)] text-[var(--amber)]' 
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            {d}
          </button>
        ))}
        {dates.length === 0 && <div className="py-2 text-[13px] text-[var(--text-secondary)]">Belum ada jadwal kirim.</div>}
      </div>

      {/* Summary Header */}
      {dates.length > 0 && (
        <div className="bg-[var(--amber-dim)] rounded-[6px] border border-[var(--border)] p-4 flex flex-col md:flex-row md:items-center justify-between">
          <div>
            <h3 className="font-['Space_Grotesk'] font-medium text-[12px] uppercase tracking-wider text-[var(--text-primary)] mb-1">
              {activeDate}
            </h3>
            <p className="text-[14px] text-[var(--text-secondary)] font-['Inter']">
              <span className="text-[var(--amber)] font-medium font-['JetBrains_Mono']">{finalBoxes}</span> box 
              {finalPcs > 0 && <span className="text-[var(--amber)] font-medium font-['JetBrains_Mono']"> + {finalPcs}</span>} dimsum
              <span className="mx-2">·</span>
              <span className="text-[var(--amber)] font-medium font-['JetBrains_Mono']">{totalPcsAll}</span> pcs
              <span className="mx-2">·</span>
              <span className="text-[var(--amber)] font-medium font-['JetBrains_Mono']">{totalBacar}</span> cup Bacar
            </p>
          </div>
        </div>
      )}

      {/* Decomposed Production Table */}
      <div className="bg-[var(--bg-surface)] rounded-[6px] border border-[var(--border)] overflow-x-auto">
        <table className="min-w-full text-left border-collapse">
          <thead>
            <tr>
              <th className="table-header-cell w-[180px]">Customer</th>
              <th className="table-header-cell">Items</th>
              <th className="table-header-cell w-[160px]">Topping</th>
              <th className="table-header-cell w-[100px] text-center">Status</th>
            </tr>
          </thead>
          <tbody>
            {Object.values(groupedItems).map(({ order, items }, idx) => (
              <tr key={idx} className="table-row">
                <td className="table-cell font-medium text-[var(--text-secondary)]">
                  {order.nama_pelanggan}
                </td>
                <td className="table-cell">
                  <div className="flex flex-wrap gap-[8px]">
                    {items.map((item, i) => {
                      const code = `${item.qty}${getKitchenCode(item.nama_produk)}`;
                      return (
                        <KitchenChip 
                          key={i} 
                          code={code} 
                          isBacar={item.nama_produk.toLowerCase().includes('bacar')}
                          sourceBundle={item.source_bundle}
                        />
                      );
                    })}
                  </div>
                </td>
                <td className="table-cell text-[var(--text-secondary)]">
                  {items.some(i => i.topping) ? items.filter(i => i.topping).map(i => i.topping).join(', ') : '—'}
                </td>
                <td className="table-cell text-center">
                  <StatusBadge status={order.status_kirim} />
                </td>
              </tr>
            ))}
            {Object.keys(groupedItems).length === 0 && (
              <tr>
                <td colSpan="4" className="table-cell text-center py-8 text-[var(--text-secondary)]">
                  Tidak ada produksi untuk jadwal ini.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
