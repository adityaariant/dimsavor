import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { apiFetch } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import ConfirmModal from '../components/ConfirmModal';
import { formatRupiah } from '../utils/format';
import { useToast } from '../contexts/ToastContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { Banknote, Lock } from 'lucide-react';

export default function Finance() {
  const { selectedSession: session, refreshSessions, sessionData, refreshSessionData } = useOutletContext();
  const { displayName } = useAuth();
  const { showToast } = useToast();
  
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
      showToast("Gagal menambah pengeluaran: " + err.message, "error");
    }
  };

  const handleDeleteExpense = async (id) => {
    try {
      await apiFetch(`/expenses/${id}`, { method: 'DELETE' });
      await refreshSessionData();
    } catch (err) {
      showToast("Gagal menghapus pengeluaran: " + err.message, "error");
    }
  };

  const handleCloseBatch = async () => {
    try {
      await apiFetch(`/finance/close?session_id=${session.id_po}`, { method: 'POST' });
      setIsCloseModalOpen(false);
      refreshSessions(); 
    } catch (err) {
      showToast("Gagal menutup batch: " + err.message, "error");
      setIsCloseModalOpen(false);
    }
  };

  const aditTotal = expenses.filter(e => e.dibayar_oleh === 'Adit').reduce((s, e) => s + e.nominal, 0);
  const kilaTotal = expenses.filter(e => e.dibayar_oleh === 'Kila').reduce((s, e) => s + e.nominal, 0);

  return (
    <div className="max-w-6xl mx-auto space-y-[20px]">
      <div className="flex justify-between items-center mb-2">
        <div>
          <h1 className="text-[24px] font-semibold text-foreground font-display flex items-center gap-3">
            Finance & Profit Split 
            <span className="text-muted-foreground font-normal text-[18px] font-sans">(PO-{session.id_po})</span>
          </h1>
        </div>
        {isClosed && (
          <Badge variant="outline" className="bg-muted text-muted-foreground border-border gap-1">
            <Lock className="w-3 h-3" /> Batch Ditutup
          </Badge>
        )}
      </div>

      <div className="flex flex-col lg:flex-row gap-[20px] items-start">
        {/* Expense Tracker */}
        <Card className="w-full lg:w-1/2">
          <CardHeader className="pb-3 border-b border-border mb-4">
            <CardTitle className="text-lg">Pengeluaran</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto mb-4 border border-border rounded-md">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="text-muted-foreground">Nama Bahan</TableHead>
                    <TableHead className="text-muted-foreground">Nominal</TableHead>
                    <TableHead className="text-muted-foreground">Dibayar</TableHead>
                    {!isClosed && <TableHead className="text-right w-[60px]"></TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses.map(exp => (
                    <TableRow key={exp.id_expense}>
                      <TableCell className="font-medium">{exp.nama_bahan}</TableCell>
                      <TableCell className="font-mono text-[12px] text-muted-foreground">{formatRupiah(exp.nominal)}</TableCell>
                      <TableCell className="text-muted-foreground">{exp.dibayar_oleh}</TableCell>
                      {!isClosed && (
                        <TableCell className="text-right">
                          <button onClick={() => handleDeleteExpense(exp.id_expense)} className="text-destructive hover:underline text-[12px]">Hapus</button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                  {!isClosed && (
                    <TableRow className="bg-muted/30 hover:bg-muted/30">
                      <TableCell className="p-2">
                        <Input 
                          type="text" 
                          placeholder="Bahan..." 
                          className="h-8 text-[12px] bg-background"
                          value={newExpense.nama_bahan}
                          onChange={e => setNewExpense({...newExpense, nama_bahan: e.target.value})}
                        />
                      </TableCell>
                      <TableCell className="p-2">
                        <Input 
                          type="number" 
                          placeholder="Rp..." 
                          className="h-8 text-[12px] font-mono bg-background"
                          value={newExpense.nominal}
                          onChange={e => setNewExpense({...newExpense, nominal: e.target.value})}
                        />
                      </TableCell>
                      <TableCell className="p-2">
                        <select 
                          className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 text-[12px]"
                          value={newExpense.dibayar_oleh}
                          onChange={e => setNewExpense({...newExpense, dibayar_oleh: e.target.value})}
                        >
                          <option>Adit</option>
                          <option>Kila</option>
                        </select>
                      </TableCell>
                      <TableCell className="text-right p-2">
                        <button onClick={handleAddExpense} className="text-terracotta font-medium hover:underline text-[12px] whitespace-nowrap">Simpan</button>
                      </TableCell>
                    </TableRow>
                  )}
                  {expenses.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8">Belum ada pengeluaran.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            
            <div className="bg-muted p-[12px] rounded-lg border border-border font-sans text-[13px] space-y-[4px]">
              <div className="flex justify-between text-muted-foreground"><span>Adit total:</span> <span className="font-mono text-[12px] text-foreground">{formatRupiah(aditTotal)}</span></div>
              <div className="flex justify-between text-muted-foreground"><span>Kila total:</span> <span className="font-mono text-[12px] text-foreground">{formatRupiah(kilaTotal)}</span></div>
              <div className="flex justify-between font-bold text-foreground border-t border-border pt-[8px] mt-[8px]"><span>Total Modal:</span> <span className="font-mono text-[12px]">{formatRupiah(preview?.total_modal || 0)}</span></div>
            </div>
          </CardContent>
        </Card>

        {/* Profit Split Preview */}
        <div className="w-full lg:w-1/2 lg:sticky top-[20px]">
          <Card>
            <CardHeader className="pb-3 border-b border-border mb-4">
              <CardTitle className="text-lg">Kalkulasi Bagi Hasil</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-[8px] font-sans text-[14px]">
                <div className="flex justify-between text-muted-foreground">
                  <span>Total Pendapatan (PAID)</span>
                  <span className="font-medium text-foreground font-mono text-[13px]">{formatRupiah(preview?.total_revenue || 0)}</span>
                </div>
                <div className="flex justify-between text-destructive">
                  <span>Total Modal</span>
                  <span className="font-mono text-[13px]">- {formatRupiah(preview?.total_modal || 0)}</span>
                </div>
                
                <div className="flex justify-between font-bold border-t border-border pt-[16px] mt-[16px]">
                  <span className="text-foreground">Laba Bersih</span>
                  <span className="text-[32px] text-terracotta font-display leading-none">
                    {formatRupiah(preview?.laba_bersih || 0)}
                  </span>
                </div>
              </div>

              <div className="mt-[24px] space-y-[12px]">
                <div className="bg-card p-[16px] rounded-lg border border-border">
                  <div className="text-muted-foreground font-sans text-[11px] uppercase tracking-wider mb-[4px]">Porsi Adit</div>
                  <div className="flex justify-between items-end">
                    <div className="text-[11px] text-muted-foreground font-mono">
                      {formatRupiah(aditTotal)} <span className="font-sans">(modal)</span> + {formatRupiah((preview?.laba_bersih || 0) / 2)} <span className="font-sans">(laba ÷ 2)</span>
                    </div>
                    <div className="font-semibold text-[24px] text-foreground font-display leading-none">{formatRupiah(preview?.adit_receives || 0)}</div>
                  </div>
                </div>

                <div className="bg-card p-[16px] rounded-lg border border-border">
                  <div className="text-muted-foreground font-sans text-[11px] uppercase tracking-wider mb-[4px]">Porsi Kila</div>
                  <div className="flex justify-between items-end">
                    <div className="text-[11px] text-muted-foreground font-mono">
                      {formatRupiah(kilaTotal)} <span className="font-sans">(modal)</span> + {formatRupiah((preview?.laba_bersih || 0) / 2)} <span className="font-sans">(laba ÷ 2)</span>
                    </div>
                    <div className="font-semibold text-[24px] text-foreground font-display leading-none">{formatRupiah(preview?.kila_receives || 0)}</div>
                  </div>
                </div>

                {/* Settlement Block */}
                <div className="bg-gradient-warm p-[16px] rounded-lg border border-amber/20 mt-[24px]">
                  <div className="text-foreground font-bold mb-[12px] text-[15px] font-display flex items-center gap-2">
                    <Banknote className="h-5 w-5 text-amber" />
                    Settlement Akhir
                  </div>
                  
                  <div className="space-y-[8px] mb-[16px] text-[13px] font-sans">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Uang dipegang Adit:</span>
                      <span className="font-mono text-foreground">{formatRupiah(preview?.adit_pegang || 0)}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Uang dipegang Kila:</span>
                      <span className="font-mono text-foreground">{formatRupiah(preview?.kila_pegang || 0)}</span>
                    </div>
                  </div>

                  {preview?.adit_transfer_to_kila > 0 && (
                    <div className="bg-background border border-amber/40 rounded-lg p-[12px] flex items-center gap-[12px] shadow-sm">
                      <div className="text-[20px]">💸</div>
                      <div>
                        <div className="text-[11px] text-muted-foreground font-sans uppercase tracking-wider mb-[2px]">Instruksi Transfer</div>
                        <div className="text-[13px] text-foreground font-sans">
                          Adit transfer ke Kila sebesar <span className="font-bold font-display text-terracotta text-[15px]">{formatRupiah(preview.adit_transfer_to_kila)}</span>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {preview?.kila_transfer_to_adit > 0 && (
                    <div className="bg-background border border-amber/40 rounded-lg p-[12px] flex items-center gap-[12px] shadow-sm">
                      <div className="text-[20px]">💸</div>
                      <div>
                        <div className="text-[11px] text-muted-foreground font-sans uppercase tracking-wider mb-[2px]">Instruksi Transfer</div>
                        <div className="text-[13px] text-foreground font-sans">
                          Kila transfer ke Adit sebesar <span className="font-bold font-display text-terracotta text-[15px]">{formatRupiah(preview.kila_transfer_to_adit)}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {preview?.adit_transfer_to_kila === 0 && preview?.kila_transfer_to_adit === 0 && (
                    <div className="bg-muted border border-border rounded-[6px] p-[12px] text-center text-[12px] text-muted-foreground">
                      Selesai! Tidak ada transfer yang diperlukan.
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {!isClosed && (
            <Button 
              variant="destructive"
              onClick={() => setIsCloseModalOpen(true)}
              className="w-full mt-[24px]"
            >
              Close Batch & Finalisasi
            </Button>
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
