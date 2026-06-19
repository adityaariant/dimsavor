import React, { useState, useEffect } from 'react';
import { apiFetch } from '../api/client';
import ConfirmModal from '../components/ConfirmModal';
import { useToast } from '../contexts/ToastContext';

export default function Alias() {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState('alias'); // 'alias' | 'area'
  const [aliases, setAliases] = useState([]);
  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Add states
  const [newAlias, setNewAlias] = useState({ kata_kunci: '', nama_produk_baku: '', kitchen_code: '' });
  const [newArea, setNewArea] = useState({ keyword: '', area_tag: '' });

  // Edit states
  const [editingAliasId, setEditingAliasId] = useState(null);
  const [editingAliasData, setEditingAliasData] = useState(null);

  // Delete modal states
  const [deleteId, setDeleteId] = useState(null);
  const [deleteType, setDeleteType] = useState(null); // 'alias' | 'area'

  const loadData = async () => {
    try {
      const [aliasData, areaData] = await Promise.all([
        apiFetch('/alias'),
        apiFetch('/area-keywords')
      ]);
      setAliases(aliasData);
      setAreas(areaData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // --- ALIAS HANDLERS ---
  const handleAddAlias = async () => {
    if (!newAlias.kata_kunci || !newAlias.nama_produk_baku || !newAlias.kitchen_code) return;
    try {
      await apiFetch('/alias', { method: 'POST', body: JSON.stringify(newAlias) });
      setNewAlias({ kata_kunci: '', nama_produk_baku: '', kitchen_code: '' });
      loadData();
    } catch (err) {
      showToast("Gagal menambah alias: " + err.message, "error");
    }
  };

  const startEditAlias = (alias) => {
    setEditingAliasId(alias.id_alias);
    setEditingAliasData(alias);
  };

  const handleSaveAlias = async () => {
    try {
      await apiFetch(`/alias/${editingAliasId}`, { 
        method: 'PATCH', 
        body: JSON.stringify(editingAliasData) 
      });
      setEditingAliasId(null);
      setEditingAliasData(null);
      loadData();
    } catch (err) {
      showToast("Gagal update alias: " + err.message, "error");
    }
  };

  // --- AREA HANDLERS ---
  const handleAddArea = async () => {
    if (!newArea.keyword || !newArea.area_tag) return;
    try {
      await apiFetch('/area-keywords', { method: 'POST', body: JSON.stringify(newArea) });
      setNewArea({ keyword: '', area_tag: '' });
      loadData();
    } catch (err) {
      showToast("Gagal menambah area keyword: " + err.message, "error");
    }
  };

  // --- DELETE HANDLER ---
  const confirmDelete = async () => {
    try {
      if (deleteType === 'alias') {
        await apiFetch(`/alias/${deleteId}`, { method: 'DELETE' });
      } else {
        await apiFetch(`/area-keywords/${deleteId}`, { method: 'DELETE' });
      }
      setDeleteId(null);
      loadData();
    } catch (err) {
      showToast("Gagal menghapus data: " + err.message, "error");
    }
  };

  if (loading) return (
    <div className="p-4 md:p-8">
      <div className="skeleton h-12 w-full mb-4"></div>
      <div className="skeleton h-64 w-full"></div>
    </div>
  );

  const filteredAliases = aliases.filter(a => a.kata_kunci.toLowerCase().includes(search.toLowerCase()) || a.nama_produk_baku.toLowerCase().includes(search.toLowerCase()));
  const filteredAreas = areas.filter(a => a.keyword.toLowerCase().includes(search.toLowerCase()) || a.area_tag.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="max-w-5xl mx-auto space-y-[24px]">
      <div className="flex justify-between items-center mb-[12px]">
        <h1 className="text-[24px] font-semibold text-[var(--text-primary)] font-['Fraunces']">Dictionary Manager</h1>
        <div className="bg-[var(--bg-muted)] p-[4px] rounded-[8px] border border-[var(--border)] flex font-['Inter_Tight_Variable']">
          <button 
            className={`px-[16px] py-[6px] rounded-[6px] text-[13px] font-medium transition-colors ${activeTab === 'alias' ? 'bg-[var(--bg-surface)] shadow-soft text-[var(--text-primary)] border border-[var(--border)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-transparent'}`}
            onClick={() => setActiveTab('alias')}
          >
            Product Aliases
          </button>
          <button 
            className={`px-[16px] py-[6px] rounded-[6px] text-[13px] font-medium transition-colors ${activeTab === 'area' ? 'bg-[var(--bg-surface)] shadow-soft text-[var(--text-primary)] border border-[var(--border)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-transparent'}`}
            onClick={() => setActiveTab('area')}
          >
            Area Keywords
          </button>
        </div>
      </div>

      <div className="flex justify-between items-center bg-[var(--bg-surface)] p-[16px] rounded-[10px] shadow-soft border border-[var(--border)]">
        <input 
          type="text" 
          placeholder="Cari kata kunci..." 
          className="form-input w-full md:w-[280px]"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {activeTab === 'alias' && (
        <div className="card overflow-x-auto p-0">
          <table className="min-w-full text-left border-collapse">
            <thead>
              <tr>
                <th className="table-header-cell w-1/3">Kata Kunci (slang)</th>
                <th className="table-header-cell w-1/3">Nama Produk Baku</th>
                <th className="table-header-cell w-1/6">Kitchen Code</th>
                <th className="table-header-cell w-1/6 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {filteredAliases.map(alias => (
                <tr key={alias.id_alias} className="table-row">
                  {editingAliasId === alias.id_alias ? (
                    <>
                      <td className="table-cell"><input className="form-input h-[28px] text-[13px]" value={editingAliasData.kata_kunci} onChange={e => setEditingAliasData({...editingAliasData, kata_kunci: e.target.value})} /></td>
                      <td className="table-cell"><input className="form-input h-[28px] text-[13px]" value={editingAliasData.nama_produk_baku} onChange={e => setEditingAliasData({...editingAliasData, nama_produk_baku: e.target.value})} /></td>
                      <td className="table-cell"><input className="form-input h-[28px] text-[13px]" value={editingAliasData.kitchen_code} onChange={e => setEditingAliasData({...editingAliasData, kitchen_code: e.target.value})} /></td>
                      <td className="table-cell text-right space-x-2">
                        <button onClick={handleSaveAlias} className="text-[var(--amber)] font-medium hover:underline text-[12px]">Simpan</button>
                        <button onClick={() => setEditingAliasId(null)} className="text-[var(--text-secondary)] hover:underline text-[12px]">Batal</button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="table-cell font-['JetBrains_Mono'] text-[var(--text-primary)] bg-[var(--bg-muted)] border-r border-[var(--border)]">{alias.kata_kunci}</td>
                      <td className="table-cell text-[var(--text-secondary)]">{alias.nama_produk_baku}</td>
                      <td className="table-cell font-['JetBrains_Mono'] font-medium">{alias.kitchen_code}</td>
                      <td className="table-cell text-right space-x-3">
                        <button onClick={() => startEditAlias(alias)} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:underline text-[12px]">Edit</button>
                        <button onClick={() => { setDeleteId(alias.id_alias); setDeleteType('alias'); }} className="text-[var(--status-cancelled)] hover:underline text-[12px]">Hapus</button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
              <tr className="bg-[var(--bg-elevated)] border-t border-[var(--border)]">
                <td className="table-cell py-[12px]"><input placeholder="e.g. badil" className="form-input h-[32px] text-[13px]" value={newAlias.kata_kunci} onChange={e => setNewAlias({...newAlias, kata_kunci: e.target.value})} /></td>
                <td className="table-cell py-[12px]"><input placeholder="e.g. BAdil" className="form-input h-[32px] text-[13px]" value={newAlias.nama_produk_baku} onChange={e => setNewAlias({...newAlias, nama_produk_baku: e.target.value})} /></td>
                <td className="table-cell py-[12px]"><input placeholder="e.g. BD" className="form-input h-[32px] text-[13px]" value={newAlias.kitchen_code} onChange={e => setNewAlias({...newAlias, kitchen_code: e.target.value})} /></td>
                <td className="table-cell py-[12px] text-right">
                  <button onClick={handleAddAlias} className="bg-[var(--amber-dim)] text-[var(--amber)] px-[12px] py-[6px] rounded-[4px] font-medium hover:bg-[var(--amber)] hover:text-[var(--bg-base)] transition-colors text-[12px]">Tambah</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'area' && (
        <div className="card overflow-x-auto p-0">
          <table className="min-w-full text-left border-collapse">
            <thead>
              <tr>
                <th className="table-header-cell w-1/2">Keyword (WA text)</th>
                <th className="table-header-cell w-1/3">Area Tag Resmi</th>
                <th className="table-header-cell text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {filteredAreas.map(area => (
                <tr key={area.id_keyword} className="table-row">
                  <td className="table-cell font-['JetBrains_Mono'] text-[var(--text-primary)] bg-[var(--bg-muted)] border-r border-[var(--border)]">{area.keyword}</td>
                  <td className="table-cell">
                    <span className="bg-[var(--amber-dim)] border border-[var(--amber)] text-[var(--amber)] px-[8px] py-[4px] rounded-[6px] text-[11px] font-medium font-['Inter_Tight_Variable'] shadow-sm">🏷️ {area.area_tag}</span>
                  </td>
                  <td className="table-cell text-right">
                    <button onClick={() => { setDeleteId(area.id_keyword); setDeleteType('area'); }} className="text-[var(--status-cancelled)] hover:underline text-[12px]">Hapus</button>
                  </td>
                </tr>
              ))}
              <tr className="bg-[var(--bg-elevated)] border-t border-[var(--border)]">
                <td className="table-cell py-[12px]"><input placeholder="e.g. itz" className="form-input h-[32px] text-[13px]" value={newArea.keyword} onChange={e => setNewArea({...newArea, keyword: e.target.value})} /></td>
                <td className="table-cell py-[12px]"><input placeholder="e.g. ITS" className="form-input h-[32px] text-[13px]" value={newArea.area_tag} onChange={e => setNewArea({...newArea, area_tag: e.target.value})} /></td>
                <td className="table-cell py-[12px] text-right">
                  <button onClick={handleAddArea} className="bg-[var(--amber-dim)] text-[var(--amber)] px-[12px] py-[6px] rounded-[4px] font-medium hover:bg-[var(--amber)] hover:text-[var(--bg-base)] transition-colors text-[12px]">Tambah</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      <ConfirmModal
        isOpen={!!deleteId}
        title="Hapus Data?"
        body="Data yang dihapus tidak bisa dikembalikan. Parser mungkin tidak akan mengenali keyword ini lagi di masa depan."
        confirmText="Hapus Permanen"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
