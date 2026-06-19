import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { apiFetch } from '../api/client';
import StatusBadge from '../components/StatusBadge';
import ConfirmModal from '../components/ConfirmModal';
import { formatDate } from '../utils/format';
import { Calendar, Plus } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';

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
        <h1 className="text-[24px] font-semibold text-[var(--text-primary)] font-['Fraunces']">PO Sessions</h1>
        <button
          onClick={() => setIsModalOpen(true)}
          disabled={hasActiveSession}
          className={`flex items-center gap-[6px] h-[36px] px-[16px] rounded-[6px] font-['Inter_Tight_Variable'] font-medium text-[13px] transition-colors ${
            hasActiveSession 
              ? 'bg-[var(--bg-muted)] text-[var(--text-disabled)] cursor-not-allowed border border-[var(--border)]' 
              : 'bg-[var(--amber)] text-black hover:bg-[#d97706]'
          }`}
        >
          <Plus className="w-4 h-4" />
          New Session
        </button>
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="min-w-full border-collapse text-left">
          <thead>
            <tr>
              <th className="table-header-cell">ID</th>
              <th className="table-header-cell">Tanggal Buka</th>
              <th className="table-header-cell">Tanggal Tutup</th>
              <th className="table-header-cell">Kuota</th>
              <th className="table-header-cell">Status</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map(session => (
              <React.Fragment key={session.id_po}>
                <tr 
                  className={`table-row cursor-pointer ${expandedSessionId === session.id_po ? 'bg-[var(--bg-muted)]' : ''}`}
                  onClick={() => toggleExpand(session.id_po)}
                >
                  <td className="table-cell font-['JetBrains_Mono'] font-medium text-[var(--text-primary)]">PO-{session.id_po}</td>
                  <td className="table-cell text-[var(--text-secondary)]">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3 h-3 text-[var(--text-disabled)]" />
                      {formatDate(session.tanggal_buka)}
                    </div>
                  </td>
                  <td className="table-cell text-[var(--text-secondary)]">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3 h-3 text-[var(--text-disabled)]" />
                      {formatDate(session.tanggal_tutup)}
                    </div>
                  </td>
                  <td className="table-cell text-[var(--text-secondary)]">
                    <span className="font-['JetBrains_Mono']">{session.kuota_maksimal}</span> box
                  </td>
                  <td className="table-cell">
                    <StatusBadge status={session.status} />
                  </td>
                </tr>
                {/* Expandable slots panel */}
                {expandedSessionId === session.id_po && (
                  <tr className="bg-[var(--bg-muted)] border-b border-[var(--border)]">
                    <td colSpan="5" className="px-[24px] py-[16px]">
                      <div className="mb-[12px] font-medium text-[var(--text-secondary)] text-[12px] uppercase tracking-wider">
                        Delivery Slots untuk PO-{session.id_po}
                      </div>
                      <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-[6px] overflow-hidden">
                        <table className="min-w-full text-left">
                          <thead className="bg-[var(--bg-elevated)] border-b border-[var(--border)]">
                            <tr>
                              <th className="px-[16px] py-[8px] text-[12px] font-medium text-[var(--text-secondary)]">Jadwal</th>
                              <th className="px-[16px] py-[8px] text-[12px] font-medium text-[var(--text-secondary)] text-center">Gratis Ongkir</th>
                              <th className="px-[16px] py-[8px] text-[12px] font-medium text-[var(--text-secondary)] text-right">Aksi</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[var(--border)]">
                            {slots.map(slot => (
                              <tr key={slot.id_slot} className="hover:bg-[var(--bg-muted)]">
                                <td className="px-[16px] py-[12px] text-[13px] text-[var(--text-primary)] font-medium">{slot.jadwal_teks}</td>
                                <td className="px-[16px] py-[12px] text-center">
                                  <button 
                                    onClick={() => handleToggleOngkir(slot.id_slot, slot.is_free_ongkir)}
                                    className={`px-[8px] py-[2px] rounded-[4px] text-[11px] font-['JetBrains_Mono'] font-medium border ${
                                      slot.is_free_ongkir 
                                        ? 'bg-[var(--status-sent)]/10 text-[var(--status-sent)] border-[var(--status-sent)]/30' 
                                        : 'bg-[var(--bg-elevated)] text-[var(--text-disabled)] border-[var(--border)]'
                                    }`}
                                  >
                                    {slot.is_free_ongkir ? 'ON' : 'OFF'}
                                  </button>
                                </td>
                                <td className="px-[16px] py-[12px] text-right">
                                  <button onClick={() => setSlotToDelete(slot)} className="text-[var(--status-cancelled)] hover:underline text-[12px]">Hapus</button>
                                </td>
                              </tr>
                            ))}
                            {/* Add new slot row */}
                            {session.status === 'Active' && (
                              <tr className="bg-[var(--bg-elevated)]">
                                <td className="px-[16px] py-[8px]">
                                  <input 
                                    type="text" 
                                    className="form-input h-[32px] text-[13px]" 
                                    placeholder="Contoh: Rabu 17 Juni 10.00-13.00"
                                    value={newSlotJadwal}
                                    onChange={(e) => setNewSlotJadwal(e.target.value)}
                                  />
                                </td>
                                <td className="px-[16px] py-[8px] text-center text-[12px] text-[var(--text-disabled)] font-['JetBrains_Mono']">
                                  OFF (default)
                                </td>
                                <td className="px-[16px] py-[8px] text-right">
                                  <button onClick={handleAddSlot} disabled={!newSlotJadwal.trim()} className="text-[var(--amber)] font-medium hover:underline disabled:text-[var(--text-disabled)] text-[12px]">
                                    Simpan
                                  </button>
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
            {sessions.length === 0 && (
              <tr className="table-row">
                <td colSpan="5" className="table-cell text-center text-[var(--text-secondary)]">Belum ada sesi PO.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Create Session Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-[var(--text-primary)]/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-[14px] shadow-paper w-full max-w-md p-[24px]">
            <h2 className="text-[18px] font-bold mb-[20px] font-['Fraunces'] text-[var(--text-primary)]">Buat Sesi PO Baru</h2>
            <form onSubmit={handleCreateSession} className="space-y-[16px]">
              <div>
                <label className="form-label">Tanggal Buka</label>
                <input 
                  type="date" 
                  required
                  className="form-input" 
                  value={newSession.tanggal_buka}
                  onChange={e => setNewSession({...newSession, tanggal_buka: e.target.value})}
                />
              </div>
              <div>
                <label className="form-label">Tanggal Tutup</label>
                <input 
                  type="date" 
                  required
                  className="form-input" 
                  value={newSession.tanggal_tutup}
                  onChange={e => setNewSession({...newSession, tanggal_tutup: e.target.value})}
                />
              </div>
              <div>
                <label className="form-label">Kuota Maksimal (Box Dimsum)</label>
                <input 
                  type="number" 
                  min="1"
                  required
                  className="form-input" 
                  value={newSession.kuota_maksimal}
                  onChange={e => setNewSession({...newSession, kuota_maksimal: parseInt(e.target.value)})}
                />
                <p className="text-[11px] text-[var(--text-disabled)] mt-[6px]">Bacar tidak dihitung dalam kuota.</p>
              </div>
              <div className="flex justify-end space-x-[12px] mt-[24px] pt-[16px] border-t border-[var(--border)]">
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary">
                  Batal
                </button>
                <button type="submit" className="btn-primary">
                  Buat Sesi
                </button>
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
