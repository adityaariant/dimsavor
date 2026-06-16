import React, { useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { apiFetch } from '../api/client';
import ConfirmModal from '../components/ConfirmModal';
import { formatRupiah } from '../utils/format';

export default function Finance() {
  const { selectedSession: session, refreshSessions, sessionData, refreshSessionData } = useOutletContext();
  
  const [newExpense, setNewExpense] = useState({
    nama_bahan: '',
    nominal: '',
    dibayar_oleh: 'Adit'
  });
  
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
  const navigate = useNavigate();

  if (sessionData.loading) return <div className="p-8">Loading finance data...</div>;
  if (!session) return <div className="p-8 text-center text-gray-500 mt-20">Tidak ada sesi PO.</div>;

  const { finance: preview, expenses } = sessionData;

  const handleAddExpense = async () => {
    if (!newExpense.nama_bahan || !newExpense.nominal) return;
    try {
      await apiFetch('/expenses', {
        method: 'POST',
        body: JSON.stringify({
          id_po: session.id_po,
          nama_bahan: newExpense.nama_bahan,
          nominal: parseInt(newExpense.nominal),
          dibayar_oleh: newExpense.dibayar_oleh
        })
      });
      setNewExpense({ nama_bahan: '', nominal: '', dibayar_oleh: 'Adit' });
      await refreshSessionData(); // Reload to update preview live
    } catch (err) {
      alert("Gagal menambah pengeluaran: " + err.message);
    }
  };

  const handleDeleteExpense = async (id) => {
    try {
      await apiFetch(`/expenses/${id}`, { method: 'DELETE' });
      await refreshSessionData();
    } catch (err) {
      alert("Gagal menghapus pengeluaran: " + err.message);
    }
  };

  const handleCloseBatch = async () => {
    try {
      await apiFetch(`/finance/close?session_id=${session.id_po}`, { method: 'POST' });
      setIsCloseModalOpen(false);
      refreshSessions(); // tell layout to refetch so it's closed globally
    } catch (err) {
      alert("Gagal menutup batch: " + err.message);
      setIsCloseModalOpen(false);
    }
  };

  if (!session) return <div className="p-8 text-center text-gray-500 mt-20">Tidak ada sesi PO.</div>;

  const isClosed = session.status === 'Closed';

  const aditTotal = expenses.filter(e => e.dibayar_oleh === 'Adit').reduce((s, e) => s + e.nominal, 0);
  const kilaTotal = expenses.filter(e => e.dibayar_oleh === 'Kila').reduce((s, e) => s + e.nominal, 0);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Finance & Profit Split</h1>
          <p className="text-gray-500">PO-{session.id_po} ({session.status})</p>
        </div>
        {isClosed && (
          <span className="bg-gray-200 text-gray-800 px-4 py-2 rounded-full font-medium text-sm">
            🔒 Batch Sudah Ditutup
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Expense Tracker */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Modal / Pengeluaran</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left mb-4">
              <thead className="bg-gray-50 text-gray-500 border-b">
                <tr>
                  <th className="py-2 px-3 font-medium">Nama Bahan</th>
                  <th className="py-2 px-3 font-medium">Nominal</th>
                  <th className="py-2 px-3 font-medium">Dibayar</th>
                  {!isClosed && <th className="py-2 px-3 font-medium text-right">Aksi</th>}
                </tr>
              </thead>
              <tbody className="divide-y">
                {expenses.map(exp => (
                  <tr key={exp.id_expense} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-3 text-gray-900">{exp.nama_bahan}</td>
                    <td className="py-3 px-3 text-gray-900">{formatRupiah(exp.nominal)}</td>
                    <td className="py-3 px-3 text-gray-600">{exp.dibayar_oleh}</td>
                    {!isClosed && (
                      <td className="py-3 px-3 text-right">
                        <button onClick={() => handleDeleteExpense(exp.id_expense)} className="text-red-500 hover:text-red-700">Hapus</button>
                      </td>
                    )}
                  </tr>
                ))}
                {!isClosed && (
                  <tr className="bg-orange-50/50">
                    <td className="py-2 px-3">
                      <input 
                        type="text" 
                        placeholder="Bahan..." 
                        className="w-full border rounded px-2 py-1 text-sm focus:outline-none focus:border-orange-500"
                        value={newExpense.nama_bahan}
                        onChange={e => setNewExpense({...newExpense, nama_bahan: e.target.value})}
                      />
                    </td>
                    <td className="py-2 px-3">
                      <input 
                        type="number" 
                        placeholder="Rp..." 
                        className="w-full border rounded px-2 py-1 text-sm focus:outline-none focus:border-orange-500"
                        value={newExpense.nominal}
                        onChange={e => setNewExpense({...newExpense, nominal: e.target.value})}
                      />
                    </td>
                    <td className="py-2 px-3">
                      <select 
                        className="w-full border rounded px-2 py-1 text-sm focus:outline-none focus:border-orange-500"
                        value={newExpense.dibayar_oleh}
                        onChange={e => setNewExpense({...newExpense, dibayar_oleh: e.target.value})}
                      >
                        <option>Adit</option>
                        <option>Kila</option>
                      </select>
                    </td>
                    <td className="py-2 px-3 text-right">
                      <button onClick={handleAddExpense} className="text-orange-600 font-medium hover:underline">Simpan</button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          <div className="bg-gray-50 p-4 rounded-lg border text-sm space-y-1">
            <div className="flex justify-between text-gray-600"><span>Adit total:</span> <span>{formatRupiah(aditTotal)}</span></div>
            <div className="flex justify-between text-gray-600"><span>Kila total:</span> <span>{formatRupiah(kilaTotal)}</span></div>
            <div className="flex justify-between font-bold text-gray-900 border-t pt-2 mt-2"><span>Total Modal:</span> <span>{formatRupiah(preview?.total_modal || 0)}</span></div>
          </div>
        </div>

        {/* Profit Split Preview */}
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 text-white rounded-lg shadow-lg border border-gray-700 p-6 relative overflow-hidden">
          {/* Decorative circles */}
          <div className="absolute -right-10 -top-10 w-40 h-40 bg-orange-500 opacity-10 rounded-full blur-2xl"></div>
          <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-blue-500 opacity-10 rounded-full blur-2xl"></div>

          <h2 className="text-lg font-bold mb-6 flex items-center">
            <span className="bg-orange-500/20 text-orange-400 p-1.5 rounded mr-3">💰</span>
            Kalkulasi Bagi Hasil
          </h2>
          
          <div className="space-y-3 text-sm text-gray-300">
            <div className="flex justify-between">
              <span>Total Pendapatan (PAID)</span>
              <span className="font-medium text-white">{formatRupiah(preview?.total_revenue || 0)}</span>
            </div>
            <div className="flex justify-between text-red-300">
              <span>Total Modal</span>
              <span>- {formatRupiah(preview?.total_modal || 0)}</span>
            </div>
            <div className="flex justify-between font-bold text-xl text-green-400 border-t border-gray-700 pt-3 mt-3">
              <span>Laba Bersih</span>
              <span>{formatRupiah(preview?.laba_bersih || 0)}</span>
            </div>
          </div>

          <div className="mt-8 space-y-4">
            <div className="bg-gray-800/50 p-4 rounded border border-gray-700">
              <div className="text-gray-400 text-xs mb-1">Porsi Adit</div>
              <div className="flex justify-between items-end">
                <div className="text-xs text-gray-500">
                  {formatRupiah(aditTotal)} <span className="mx-1">(modal)</span> + {formatRupiah((preview?.laba_bersih || 0) / 2)} <span className="mx-1">(laba ÷ 2)</span>
                </div>
                <div className="font-bold text-lg text-white">{formatRupiah(preview?.adit_receives || 0)}</div>
              </div>
            </div>

            <div className="bg-gray-800/50 p-4 rounded border border-gray-700">
              <div className="text-gray-400 text-xs mb-1">Porsi Kila</div>
              <div className="flex justify-between items-end">
                <div className="text-xs text-gray-500">
                  {formatRupiah(kilaTotal)} <span className="mx-1">(modal)</span> + {formatRupiah((preview?.laba_bersih || 0) / 2)} <span className="mx-1">(laba ÷ 2)</span>
                </div>
                <div className="font-bold text-lg text-white">{formatRupiah(preview?.kila_receives || 0)}</div>
              </div>
            </div>
          </div>

          {!isClosed && (
            <button 
              onClick={() => setIsCloseModalOpen(true)}
              className="mt-8 w-full py-3 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded shadow-lg transition-colors"
            >
              Close Batch & Finalisasi →
            </button>
          )}
        </div>
      </div>

      <ConfirmModal
        isOpen={isCloseModalOpen}
        title="Tutup Batch PO?"
        body="Tindakan ini tidak bisa dibatalkan. Semua data (orderan dan pengeluaran) akan dikunci permanen. Lanjutkan?"
        confirmText="Ya, Tutup Batch"
        onConfirm={handleCloseBatch}
        onCancel={() => setIsCloseModalOpen(false)}
      />
    </div>
  );
}
