import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { apiFetch } from '../api/client';
import StatusBadge from '../components/StatusBadge';
import ConfirmModal from '../components/ConfirmModal';
import { formatDate } from '../utils/format';

export default function Sessions() {
  const { refreshSessions } = useOutletContext();
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
      alert('Gagal memuat sesi: ' + err.message);
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
      alert('Hanya boleh ada satu sesi aktif.');
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
      alert('Gagal membuat sesi: ' + err.message);
    }
  };

  const loadSlots = async (id_po) => {
    try {
      const data = await apiFetch(`/sessions/${id_po}/slots`);
      setSlots(data);
    } catch (err) {
      alert('Gagal memuat slots: ' + err.message);
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
      alert('Gagal menambah slot: ' + err.message);
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
      alert('Gagal update slot: ' + err.message);
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
      alert('Gagal hapus slot: ' + err.message);
      setSlotToDelete(null);
    }
  };

  if (loading) return <div className="p-8">Loading sessions...</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">PO Sessions</h1>
        <button
          onClick={() => setIsModalOpen(true)}
          disabled={hasActiveSession}
          className={`px-4 py-2 rounded shadow text-sm font-medium ${hasActiveSession ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-orange-600 text-white hover:bg-orange-700'}`}
        >
          + New Session
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left font-medium text-gray-500">ID</th>
              <th className="px-6 py-3 text-left font-medium text-gray-500">Tanggal Buka</th>
              <th className="px-6 py-3 text-left font-medium text-gray-500">Tanggal Tutup</th>
              <th className="px-6 py-3 text-left font-medium text-gray-500">Kuota</th>
              <th className="px-6 py-3 text-left font-medium text-gray-500">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {sessions.map(session => (
              <React.Fragment key={session.id_po}>
                <tr 
                  className={`hover:bg-orange-50 cursor-pointer ${expandedSessionId === session.id_po ? 'bg-orange-50' : ''}`}
                  onClick={() => toggleExpand(session.id_po)}
                >
                  <td className="px-6 py-4 font-medium text-gray-900">PO-{session.id_po}</td>
                  <td className="px-6 py-4 text-gray-500">{formatDate(session.tanggal_buka)}</td>
                  <td className="px-6 py-4 text-gray-500">{formatDate(session.tanggal_tutup)}</td>
                  <td className="px-6 py-4 text-gray-500">{session.kuota_maksimal} box</td>
                  <td className="px-6 py-4">
                    <StatusBadge status={session.status} />
                  </td>
                </tr>
                {/* Expandable slots panel */}
                {expandedSessionId === session.id_po && (
                  <tr>
                    <td colSpan="5" className="bg-gray-50 px-6 py-4 border-t">
                      <div className="mb-2 font-medium text-gray-700">Delivery Slots untuk PO-{session.id_po}</div>
                      <div className="bg-white border rounded shadow-sm">
                        <table className="min-w-full divide-y divide-gray-200 text-sm">
                          <thead className="bg-gray-100">
                            <tr>
                              <th className="px-4 py-2 text-left text-gray-500 font-medium">Jadwal</th>
                              <th className="px-4 py-2 text-center text-gray-500 font-medium">Gratis Ongkir</th>
                              <th className="px-4 py-2 text-right text-gray-500 font-medium">Aksi</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {slots.map(slot => (
                              <tr key={slot.id_slot}>
                                <td className="px-4 py-2 text-gray-700">{slot.jadwal_teks}</td>
                                <td className="px-4 py-2 text-center">
                                  <button 
                                    onClick={() => handleToggleOngkir(slot.id_slot, slot.is_free_ongkir)}
                                    className={`px-3 py-1 rounded-full text-xs font-medium ${slot.is_free_ongkir ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-600'}`}
                                  >
                                    {slot.is_free_ongkir ? 'ON' : 'OFF'}
                                  </button>
                                </td>
                                <td className="px-4 py-2 text-right">
                                  <button onClick={() => setSlotToDelete(slot)} className="text-red-600 hover:underline">Hapus</button>
                                </td>
                              </tr>
                            ))}
                            {/* Add new slot row */}
                            {session.status === 'Active' && (
                              <tr>
                                <td className="px-4 py-2">
                                  <input 
                                    type="text" 
                                    className="w-full border rounded px-2 py-1 text-sm focus:outline-none focus:ring focus:border-orange-500" 
                                    placeholder="Contoh: Rabu 17 Juni 10.00-13.00"
                                    value={newSlotJadwal}
                                    onChange={(e) => setNewSlotJadwal(e.target.value)}
                                  />
                                </td>
                                <td className="px-4 py-2 text-center text-gray-400">OFF (default)</td>
                                <td className="px-4 py-2 text-right">
                                  <button onClick={handleAddSlot} disabled={!newSlotJadwal.trim()} className="text-orange-600 font-medium hover:underline disabled:text-gray-400">
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
          </tbody>
        </table>
      </div>

      {/* Create Session Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-4">Buat Sesi PO Baru</h2>
            <form onSubmit={handleCreateSession} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Buka</label>
                <input 
                  type="date" 
                  required
                  className="w-full border rounded p-2 focus:ring focus:outline-none focus:border-orange-500" 
                  value={newSession.tanggal_buka}
                  onChange={e => setNewSession({...newSession, tanggal_buka: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Tutup</label>
                <input 
                  type="date" 
                  required
                  className="w-full border rounded p-2 focus:ring focus:outline-none focus:border-orange-500" 
                  value={newSession.tanggal_tutup}
                  onChange={e => setNewSession({...newSession, tanggal_tutup: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kuota Maksimal (Box Dimsum)</label>
                <input 
                  type="number" 
                  min="1"
                  required
                  className="w-full border rounded p-2 focus:ring focus:outline-none focus:border-orange-500" 
                  value={newSession.kuota_maksimal}
                  onChange={e => setNewSession({...newSession, kuota_maksimal: parseInt(e.target.value)})}
                />
                <p className="text-xs text-gray-500 mt-1">Bacar tidak dihitung dalam kuota.</p>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border rounded text-gray-600 hover:bg-gray-50">
                  Batal
                </button>
                <button type="submit" className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700">
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
