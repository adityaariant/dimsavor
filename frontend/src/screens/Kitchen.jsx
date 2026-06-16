import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { apiFetch } from '../api/client';
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

  if (sessionData.loading) return <div className="p-8">Loading kitchen board...</div>;
  if (!session) return <div className="p-8 text-center mt-20 text-gray-500">Tidak ada sesi aktif.</div>;

  const ordersForDate = data.orders.filter(o => (o.delivery_slots?.jadwal_teks || 'Manual') === activeDate);
  const orderIdsForDate = ordersForDate.map(o => o.id_order);
  const itemsForDate = data.items.filter(i => orderIdsForDate.includes(i.id_order));

  const getKitchenCode = (nama_produk) => {
    const alias = data.aliases.find(a => a.nama_produk_baku === nama_produk);
    return alias ? alias.kitchen_code : '?';
  };

  const boardRows = itemsForDate.map(item => {
    const order = data.orders.find(o => o.id_order === item.id_order);
    const baseCode = `${item.qty}${getKitchenCode(item.nama_produk)}`;
    
    const bundleComponents = data.bundles.filter(b => b.nama_bundle === item.nama_produk);
    
    let displayCode = baseCode;
    if (bundleComponents.length > 0) {
      const decompString = bundleComponents.map(bc => {
        const compCode = getKitchenCode(bc.nama_produk_komponen);
        return `${item.qty * bc.qty_komponen}${compCode}`;
      }).join('+');
      displayCode = `${baseCode} → ${decompString}`;
    }

    return {
      id_item: item.id_item || Math.random(),
      displayCode,
      customer: order.nama_pelanggan,
      notes: item.topping || '—',
      status: order.status_kirim
    };
  });

  let totalDimsumBoxes = 0;
  let totalDimsumPcs = 0;
  let totalBacar = 0;

  itemsForDate.forEach(item => {
    const bundleComponents = data.bundles.filter(b => b.nama_bundle === item.nama_produk);
    
    if (bundleComponents.length > 0) {
      bundleComponents.forEach(bc => {
        if (bc.nama_produk_komponen.includes('Bacar')) totalBacar += (item.qty * bc.qty_komponen);
        else if (bc.nama_produk_komponen.includes('(pcs)')) totalDimsumPcs += (item.qty * bc.qty_komponen);
        else if (bc.nama_produk_komponen.includes('Dimsum')) totalDimsumBoxes += (item.qty * bc.qty_komponen);
      });
    } else {
      if (item.nama_produk.includes('Bacar')) totalBacar += item.qty;
      else if (item.nama_produk.includes('(pcs)')) totalDimsumPcs += item.qty;
      else if (item.nama_produk.includes('Dimsum')) totalDimsumBoxes += item.qty;
    }
  });

  const finalBoxes = totalDimsumBoxes + Math.floor(totalDimsumPcs / 6);
  const finalPcs = totalDimsumPcs % 6;
  const totalPcsAll = (totalDimsumBoxes * 6) + totalDimsumPcs;

  const dates = Array.from(new Set(data.orders.map(o => o.delivery_slots?.jadwal_teks || 'Manual')));

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Kitchen Board <span className="text-gray-400 font-normal text-lg ml-2">(PO-{session.id_po})</span></h1>
      
      {/* Date Tabs */}
      <div className="flex space-x-2 border-b border-gray-200 overflow-x-auto">
        {dates.map(d => (
          <button 
            key={d}
            onClick={() => setActiveDate(d)}
            className={`px-4 py-3 font-medium text-sm transition-colors whitespace-nowrap ${activeDate === d ? 'border-b-2 border-orange-600 text-orange-600' : 'text-gray-500 hover:text-gray-800'}`}
          >
            {d}
          </button>
        ))}
        {dates.length === 0 && <div className="p-4 text-sm text-gray-500">Belum ada jadwal kirim.</div>}
      </div>

      <div className="bg-orange-50 border border-orange-100 p-6 rounded-lg shadow-sm">
        <h3 className="font-semibold text-orange-800 text-sm mb-2">{activeDate || 'Tidak ada jadwal'}</h3>
        <p className="text-orange-900 text-xl font-light">
          Produksi: <span className="font-bold">{finalBoxes} box {finalPcs > 0 ? `+ ${finalPcs} pcs` : ''} dimsum</span> ({totalPcsAll} pcs) &middot; <span className="font-bold">{totalBacar} cup Bacar</span>
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 text-sm text-left">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 font-medium text-gray-500 uppercase tracking-wider">Kitchen Code</th>
              <th className="px-6 py-3 font-medium text-gray-500 uppercase tracking-wider">Customer</th>
              <th className="px-6 py-3 font-medium text-gray-500 uppercase tracking-wider">Notes</th>
              <th className="px-6 py-3 font-medium text-gray-500 uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {boardRows.map((row, idx) => (
              <tr key={idx} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 font-mono font-bold text-gray-900">{row.displayCode}</td>
                <td className="px-6 py-4 font-medium text-gray-800">{row.customer}</td>
                <td className="px-6 py-4 text-gray-600">{row.notes}</td>
                <td className="px-6 py-4">
                  <StatusBadge status={row.status} />
                </td>
              </tr>
            ))}
            {boardRows.length === 0 && (
              <tr>
                <td colSpan="4" className="px-6 py-12 text-center text-gray-500">Tidak ada produksi untuk jadwal ini.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
