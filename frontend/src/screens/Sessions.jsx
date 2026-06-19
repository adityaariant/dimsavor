import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { apiFetch } from '../api/client';
import StatusBadge from '../components/StatusBadge';
import ConfirmModal from '../components/ConfirmModal';
import { formatDate } from '../utils/format';
import { Calendar, Plus } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';

export default function Sessions() {
  const { refreshSessions } = useOutletContext();
  const { showToast } = useToast();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedSessionId, setExpandedSessionId] = useState(null);
  
  // New session modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newSession, setNewSession] = useState({
    tanggal_buka: '',
    tanggal_tutup: '',
    kuota_maksimal: 10
  });

  // Slots state
  const [slots, setSlots] = useState([]);
  const [newSlotJadwal, setNewSlotJadwal] = useState('');
  const [slotToDelete, setSlotToDelete] = useState(null);

  const fetchSessions = async () => {
    try {
      const data = await apiFetch('/sessions/');
      setSessions(data);
    } catch (err) {
      showToast('Gagal memuat sesi: ' + err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const hasActiveSession = sessions.some(s => s.status === 'Active');

  const handleCreateSession = async (e) => {
    e.preventDefault();
    if (hasActiveSession) {
      showToast('Hanya boleh ada satu sesi aktif.', "error");
      return;
    }
    try {
      await apiFetch('/sessions/', {
        method: 'POST',
        body: JSON.stringify(newSession)
      });
      setIsModalOpen(false);
      fetchSessions();
      refreshSessions(); // Tell layout to update
      setNewSession({ tanggal_buka: '', tanggal_tutup: '', kuota_maksimal: 10 });
    } catch (err) {
      showToast('Gagal membuat sesi: ' + err.message, "error");
    }
  };

  const loadSlots = async (id_po) => {
    try {
      const data = await apiFetch(`/sessions/${id_po}/slots`);
      setSlots(data);
    } catch (err) {
      showToast('Gagal memuat slots: ' + err.message, "error");
    }
  };

  const toggleExpand = (id_po) => {
    if (expandedSessionId === id_po) {
      setExpandedSessionId(null);
      setSlots([]);
    } else {
      setExpandedSessionId(id_po);
      loadSlots(id_po);
    }
  };

  const handleAddSlot = async () => {
    if (!newSlotJadwal.trim()) return;
    try {
      await apiFetch(`/sessions/${expandedSessionId}/slots`, {
        method: 'POST',
        body: JSON.stringify({ jadwal_teks: newSlotJadwal, is_free_ongkir: false })
      });
      setNewSlotJadwal('');
      loadSlots(expandedSessionId);
    } catch (err) {
      showToast('Gagal menambah slot: ' + err.message, "error");
    }
  };

  const handleToggleOngkir = async (id_slot, currentVal) => {
    try {
      // Optimistic update
      setSlots(slots.map(s => s.id_slot === id_slot ? { ...s, is_free_ongkir: !currentVal } : s));
      await apiFetch(`/slots/${id_slot}`, {
        method: 'PATCH',
        body: JSON.stringify({ is_free_ongkir: !currentVal })
      });
    } catch (err) {
      showToast('Gagal update slot: ' + err.message, "error");
      // Revert optimistic update
      setSlots(slots.map(s => s.id_slot === id_slot ? { ...s, is_free_ongkir: currentVal } : s));
    }
  };

  const handleDeleteSlot = async () => {
    try {
      await apiFetch(`/slots/${slotToDelete.id_slot}`, { method: 'DELETE' });
      setSlotToDelete(null);
      loadSlots(expandedSessionId);
    } catch (err) {
      showToast('Gagal hapus slot: ' + err.message, "error");
      setSlotToDelete(null);
    }
  };

  if (loading) return (
    <div className="p-4 md:p-8">
      <div className="skeleton h-12 w-full mb-4"></div>
      <div className="skeleton h-32 w-full"></div>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto space-y-[20px]">
      <div className="flex justify-between items-center mb-2">
        <h1 className="text-[24px] font-semibold text-foreground font-display">PO Sessions</h1>
        <Button
          onClick={() => setIsModalOpen(true)}
          disabled={hasActiveSession}
          className="flex items-center gap-[6px] h-[36px] px-[16px] rounded-[6px]"
        >
          <Plus className="w-4 h-4" />
          New Session
        </Button>
      </div>

      <Card className="overflow-hidden">
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="text-muted-foreground uppercase text-[11px] font-medium tracking-wider">ID</TableHead>
                <TableHead className="text-muted-foreground uppercase text-[11px] font-medium tracking-wider">Tanggal Buka</TableHead>
                <TableHead className="text-muted-foreground uppercase text-[11px] font-medium tracking-wider">Tanggal Tutup</TableHead>
                <TableHead className="text-muted-foreground uppercase text-[11px] font-medium tracking-wider">Kuota</TableHead>
                <TableHead className="text-muted-foreground uppercase text-[11px] font-medium tracking-wider">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessions.map(session => (
                <React.Fragment key={session.id_po}>
                  <TableRow 
                    className={`cursor-pointer ${expandedSessionId === session.id_po ? 'bg-muted/50' : ''}`}
                    onClick={() => toggleExpand(session.id_po)}
                  >
                    <TableCell className="font-mono font-medium text-foreground">PO-{session.id_po}</TableCell>
                    <TableCell className="text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3 h-3 text-muted-foreground/60" />
                        {formatDate(session.tanggal_buka)}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3 h-3 text-muted-foreground/60" />
                        {formatDate(session.tanggal_tutup)}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      <span className="font-mono">{session.kuota_maksimal}</span> box
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={session.status} />
                    </TableCell>
                  </TableRow>
                  {/* Expandable slots panel */}
                  {expandedSessionId === session.id_po && (
                    <TableRow className="bg-muted/50 hover:bg-muted/50 border-b border-border">
                      <TableCell colSpan={5} className="px-[24px] py-[16px]">
                        <div className="mb-[12px] font-medium text-muted-foreground text-[12px] uppercase tracking-wider">
                          Delivery Slots untuk PO-{session.id_po}
                        </div>
                        <div className="bg-card border border-border rounded-[6px] overflow-hidden">
                          <Table>
                            <TableHeader className="bg-muted/30">
                              <TableRow>
                                <TableHead className="text-[12px] font-medium text-muted-foreground">Jadwal</TableHead>
                                <TableHead className="text-[12px] font-medium text-muted-foreground text-center">Gratis Ongkir</TableHead>
                                <TableHead className="text-[12px] font-medium text-muted-foreground text-right">Aksi</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody className="divide-y divide-border">
                              {slots.map(slot => (
                                <TableRow key={slot.id_slot} className="hover:bg-muted/50 border-border">
                                  <TableCell className="text-[13px] text-foreground font-medium">{slot.jadwal_teks}</TableCell>
                                  <TableCell className="text-center">
                                    <button 
                                      onClick={() => handleToggleOngkir(slot.id_slot, slot.is_free_ongkir)}
                                      className={`px-[8px] py-[2px] rounded-[4px] text-[11px] font-mono font-medium border ${
                                        slot.is_free_ongkir 
                                          ? 'bg-sent/10 text-sent border-sent/30' 
                                          : 'bg-muted text-muted-foreground border-border'
                                      }`}
                                    >
                                      {slot.is_free_ongkir ? 'ON' : 'OFF'}
                                    </button>
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <button onClick={() => setSlotToDelete(slot)} className="text-destructive hover:underline text-[12px]">Hapus</button>
                                  </TableCell>
                                </TableRow>
                              ))}
                              {/* Add new slot row */}
                              {session.status === 'Active' && (
                                <TableRow className="bg-muted/30">
                                  <TableCell>
                                    <Input 
                                      type="text" 
                                      className="h-[32px] text-[13px] bg-background" 
                                      placeholder="Contoh: Rabu 17 Juni 10.00-13.00"
                                      value={newSlotJadwal}
                                      onChange={(e) => setNewSlotJadwal(e.target.value)}
                                    />
                                  </TableCell>
                                  <TableCell className="text-center text-[12px] text-muted-foreground font-mono">
                                    OFF (default)
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <button onClick={handleAddSlot} disabled={!newSlotJadwal.trim()} className="text-terracotta font-medium hover:underline disabled:text-muted-foreground/50 text-[12px]">
                                      Simpan
                                    </button>
                                  </TableCell>
                                </TableRow>
                              )}
                            </TableBody>
                          </Table>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              ))}
              {sessions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">Belum ada sesi PO.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Session Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-foreground/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-card border border-border rounded-[14px] shadow-paper w-full max-w-md p-[24px]">
            <h2 className="text-[18px] font-bold mb-[20px] font-display text-foreground">Buat Sesi PO Baru</h2>
            <form onSubmit={handleCreateSession} className="space-y-[16px]">
              <div className="space-y-2">
                <label className="text-[13px] font-medium text-foreground">Tanggal Buka</label>
                <Input 
                  type="date" 
                  required
                  value={newSession.tanggal_buka}
                  onChange={e => setNewSession({...newSession, tanggal_buka: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[13px] font-medium text-foreground">Tanggal Tutup</label>
                <Input 
                  type="date" 
                  required
                  value={newSession.tanggal_tutup}
                  onChange={e => setNewSession({...newSession, tanggal_tutup: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[13px] font-medium text-foreground">Kuota Maksimal (Box Dimsum)</label>
                <Input 
                  type="number" 
                  min="1"
                  required
                  value={newSession.kuota_maksimal}
                  onChange={e => setNewSession({...newSession, kuota_maksimal: parseInt(e.target.value)})}
                />
                <p className="text-[11px] text-muted-foreground mt-[6px]">Bacar tidak dihitung dalam kuota.</p>
              </div>
              <div className="flex justify-end space-x-[12px] mt-[24px] pt-[16px] border-t border-border">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                  Batal
                </Button>
                <Button type="submit">
                  Buat Sesi
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Delete Slot Modal */}
      <ConfirmModal
        isOpen={!!slotToDelete}
        title="Hapus Delivery Slot?"
        body={`Yakin ingin menghapus jadwal "${slotToDelete?.jadwal_teks}"? Aksi ini akan gagal jika sudah ada pesanan di slot ini.`}
        confirmText="Hapus Slot"
        onConfirm={handleDeleteSlot}
        onCancel={() => setSlotToDelete(null)}
      />
    </div>
  );
}
