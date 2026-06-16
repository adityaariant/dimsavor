import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { apiFetch } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import ConfirmModal from '../components/ConfirmModal';
import { formatRupiah } from '../utils/format';

export default function Finance() {
  const { selectedSession: session, refreshSessions, sessionData, refreshSessionData } = useOutletContext();
  const { displayName } = useAuth();
  
  const [newExpense, setNewExpense] = useState({
    nama_bahan: '',
    nominal: '',
    dibayar_oleh: displayName || 'Adit'
  });

  useEffect(() => {
    if (displayName) {
      setNewExpense(prev => ({ ...prev, dibayar_oleh: displayName }));
    }
  }, [displayName]);
  
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);

  if (sessionData.loading) return (
    <div className="p-4 md:p-8 flex gap-6">
      <div className="skeleton h-64 w-1/2"></div>
      <div className="skeleton h-64 w-1/2"></div>
    </div>
  );
  
  if (!session) return <div className="p-8 text-center text-[var(--text-secondary)] mt-20 font-['Inter'] text-[13px]">Tidak ada sesi PO.</div>;

  const { finance: preview, expenses } = sessionData;
  const isClosed = session.status === 'Closed';

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
      setNewExpense({ nama_bahan: '', nominal: '', dibayar_oleh: displayName || 'Adit' });
      await refreshSessionData(); 
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
      refreshSessions(); 
    } catch (err) {
      alert("Gagal menutup batch: " + err.message);
      setIsCloseModalOpen(false);
    }
  };

  const aditTotal = expenses.filter(e => e.dibayar_oleh === 'Adit').reduce((s, e) => s + e.nominal, 0);
  const kilaTotal = expenses.filter(e => e.dibayar_oleh === 'Kila').reduce((s, e) => s + e.nominal, 0);

  return (
    <div className="max-w-6xl mx-auto space-y-[20px]">
      <div className="flex justify-between items-center mb-2">
        <div>
          <h1 className="text-[24px] font-semibold text-[var(--text-primary)] font-['Space_Grotesk']">
            Finance & Profit Split 
            <span className="text-[var(--text-secondary)] font-normal text-[18px] ml-2">(PO-{session.id_po})</span>
          </h1>
        </div>
        {isClosed && (
          <span className="badge badge-pending">
            🔒 Batch Ditutup
          </span>
        )}
      </div>

      <div className="flex flex-col lg:flex-row gap-[20px] items-start">
        {/* Expense Tracker */}
        <div className="card w-full lg:w-1/2">
          <div className="card-header">Pengeluaran</div>
          
          <div className="overflow-x-auto mb-4 border border-[var(--border)] rounded-[6px]">
            <table className="min-w-full text-left border-collapse">
              <thead>
                <tr>
                  <th className="table-header-cell">Nama Bahan</th>
                  <th className="table-header-cell">Nominal</th>
                  <th className="table-header-cell">Dibayar</th>
                  {!isClosed && <th className="table-header-cell text-right w-[40px]"></th>}
                </tr>
              </thead>
              <tbody>
                {expenses.map(exp => (
                  <tr key={exp.id_expense} className="table-row">
                    <td className="table-cell">{exp.nama_bahan}</td>
                    <td className="table-cell font-['JetBrains_Mono'] text-[12px]">{formatRupiah(exp.nominal)}</td>
                    <td className="table-cell text-[var(--text-secondary)]">{exp.dibayar_oleh}</td>
                    {!isClosed && (
                      <td className="table-cell text-right">
                        <button onClick={() => handleDeleteExpense(exp.id_expense)} className="text-[var(--status-cancelled)] hover:underline text-[12px]">Hapus</button>
                      </td>
                    )}
                  </tr>
                ))}
                {!isClosed && (
                  <tr className="bg-[var(--bg-elevated)] border-t border-[var(--border)]">
                    <td className="table-cell py-2">
                      <input 
                        type="text" 
                        placeholder="Bahan..." 
                        className="form-input h-[28px] text-[12px]"
                        value={newExpense.nama_bahan}
                        onChange={e => setNewExpense({...newExpense, nama_bahan: e.target.value})}
                      />
                    </td>
                    <td className="table-cell py-2">
                      <input 
                        type="number" 
                        placeholder="Rp..." 
                        className="form-input h-[28px] text-[12px] font-['JetBrains_Mono']"
                        value={newExpense.nominal}
                        onChange={e => setNewExpense({...newExpense, nominal: e.target.value})}
                      />
                    </td>
                    <td className="table-cell py-2">
                      <select 
                        className="form-select h-[28px] text-[12px]"
                        value={newExpense.dibayar_oleh}
                        onChange={e => setNewExpense({...newExpense, dibayar_oleh: e.target.value})}
                      >
                        <option>Adit</option>
                        <option>Kila</option>
                      </select>
                    </td>
                    <td className="table-cell text-right py-2">
                      <button onClick={handleAddExpense} className="text-[var(--amber)] font-medium hover:underline text-[12px] whitespace-nowrap">Simpan</button>
                    </td>
                  </tr>
                )}
                {expenses.length === 0 && (
                  <tr className="table-row">
                    <td colSpan="4" className="table-cell text-center text-[var(--text-secondary)]">Belum ada pengeluaran.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          <div className="bg-[var(--bg-muted)] p-[12px] rounded-[6px] border border-[var(--border)] font-['Inter'] text-[13px] space-y-[4px]">
            <div className="flex justify-between text-[var(--text-secondary)]"><span>Adit total:</span> <span className="font-['JetBrains_Mono'] text-[12px] text-[var(--text-primary)]">{formatRupiah(aditTotal)}</span></div>
            <div className="flex justify-between text-[var(--text-secondary)]"><span>Kila total:</span> <span className="font-['JetBrains_Mono'] text-[12px] text-[var(--text-primary)]">{formatRupiah(kilaTotal)}</span></div>
            <div className="flex justify-between font-medium text-[var(--text-primary)] border-t border-[var(--border)] pt-[8px] mt-[8px]"><span>Total Modal:</span> <span className="font-['JetBrains_Mono'] text-[12px]">{formatRupiah(preview?.total_modal || 0)}</span></div>
          </div>
        </div>

        {/* Profit Split Preview */}
        <div className="card w-full lg:w-1/2 lg:sticky top-[20px]">
          <div className="card-header">Kalkulasi Bagi Hasil</div>
          
          <div className="space-y-[8px] font-['Inter'] text-[14px]">
            <div className="flex justify-between text-[var(--text-secondary)]">
              <span>Total Pendapatan (PAID)</span>
              <span className="font-medium text-[var(--text-primary)] font-['JetBrains_Mono'] text-[13px]">{formatRupiah(preview?.total_revenue || 0)}</span>
            </div>
            <div className="flex justify-between text-[var(--status-cancelled)]">
              <span>Total Modal</span>
              <span className="font-['JetBrains_Mono'] text-[13px]">- {formatRupiah(preview?.total_modal || 0)}</span>
            </div>
            
            <div className="flex justify-between font-bold border-t border-[var(--border)] pt-[16px] mt-[16px]">
              <span className="text-[var(--text-primary)]">Laba Bersih</span>
              <span className="text-[32px] text-[var(--amber)] font-['Space_Grotesk'] leading-none">
                {formatRupiah(preview?.laba_bersih || 0)}
              </span>
            </div>
          </div>

          <div className="mt-[24px] space-y-[12px]">
            <div className="bg-[var(--bg-elevated)] p-[16px] rounded-[6px] border border-[var(--border)]">
              <div className="text-[var(--text-secondary)] text-[11px] uppercase tracking-wider mb-[4px]">Porsi Adit</div>
              <div className="flex justify-between items-end">
                <div className="text-[11px] text-[var(--text-disabled)] font-['JetBrains_Mono']">
                  {formatRupiah(aditTotal)} <span className="font-['Inter']">(modal)</span> + {formatRupiah((preview?.laba_bersih || 0) / 2)} <span className="font-['Inter']">(laba ÷ 2)</span>
                </div>
                <div className="font-semibold text-[24px] text-[var(--text-primary)] font-['Space_Grotesk'] leading-none">{formatRupiah(preview?.adit_receives || 0)}</div>
              </div>
            </div>

            <div className="bg-[var(--bg-elevated)] p-[16px] rounded-[6px] border border-[var(--border)]">
              <div className="text-[var(--text-secondary)] text-[11px] uppercase tracking-wider mb-[4px]">Porsi Kila</div>
              <div className="flex justify-between items-end">
                <div className="text-[11px] text-[var(--text-disabled)] font-['JetBrains_Mono']">
                  {formatRupiah(kilaTotal)} <span className="font-['Inter']">(modal)</span> + {formatRupiah((preview?.laba_bersih || 0) / 2)} <span className="font-['Inter']">(laba ÷ 2)</span>
                </div>
                <div className="font-semibold text-[24px] text-[var(--text-primary)] font-['Space_Grotesk'] leading-none">{formatRupiah(preview?.kila_receives || 0)}</div>
              </div>
            </div>

            {/* Settlement Block */}
            <div className="bg-[var(--bg-muted)] p-[16px] rounded-[6px] border border-[var(--border)] mt-[24px]">
              <div className="text-[var(--text-primary)] font-semibold mb-[12px] text-[14px]">Settlement Akhir</div>
              
              <div className="space-y-[8px] mb-[16px] text-[13px]">
                <div className="flex justify-between text-[var(--text-secondary)]">
                  <span>Uang dipegang Adit:</span>
                  <span className="font-['JetBrains_Mono'] text-[var(--text-primary)]">{formatRupiah(preview?.adit_pegang || 0)}</span>
                </div>
                <div className="flex justify-between text-[var(--text-secondary)]">
                  <span>Uang dipegang Kila:</span>
                  <span className="font-['JetBrains_Mono'] text-[var(--text-primary)]">{formatRupiah(preview?.kila_pegang || 0)}</span>
                </div>
              </div>

              {preview?.adit_transfer_to_kila > 0 && (
                <div className="bg-[var(--amber)]/10 border border-[var(--amber)]/30 rounded-[6px] p-[12px] flex items-center gap-[12px]">
                  <div className="text-[20px]">💸</div>
                  <div>
                    <div className="text-[11px] text-[var(--text-secondary)] uppercase tracking-wider mb-[2px]">Instruksi Transfer</div>
                    <div className="text-[13px] text-[var(--text-primary)]">
                      Adit transfer ke Kila sebesar <span className="font-bold font-['Space_Grotesk'] text-[var(--amber)]">{formatRupiah(preview.adit_transfer_to_kila)}</span>
                    </div>
                  </div>
                </div>
              )}
              
              {preview?.kila_transfer_to_adit > 0 && (
                <div className="bg-[var(--amber)]/10 border border-[var(--amber)]/30 rounded-[6px] p-[12px] flex items-center gap-[12px]">
                  <div className="text-[20px]">💸</div>
                  <div>
                    <div className="text-[11px] text-[var(--text-secondary)] uppercase tracking-wider mb-[2px]">Instruksi Transfer</div>
                    <div className="text-[13px] text-[var(--text-primary)]">
                      Kila transfer ke Adit sebesar <span className="font-bold font-['Space_Grotesk'] text-[var(--amber)]">{formatRupiah(preview.kila_transfer_to_adit)}</span>
                    </div>
                  </div>
                </div>
              )}

              {preview?.adit_transfer_to_kila === 0 && preview?.kila_transfer_to_adit === 0 && (
                <div className="bg-[var(--bg-elevated)] border border-[var(--border)] rounded-[6px] p-[12px] text-center text-[12px] text-[var(--text-secondary)]">
                  Selesai! Tidak ada transfer yang diperlukan.
                </div>
              )}
            </div>
          </div>

          {!isClosed && (
            <button 
              onClick={() => setIsCloseModalOpen(true)}
              className="btn-destructive w-full mt-[24px]"
            >
              Close Batch & Finalisasi
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
