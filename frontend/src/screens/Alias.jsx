import React, { useState, useEffect } from 'react';
import { apiFetch } from '../api/client';
import ConfirmModal from '../components/ConfirmModal';

export default function Alias() {
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
      alert("Gagal menambah alias: " + err.message);
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
      alert("Gagal update alias: " + err.message);
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
      alert("Gagal menambah area keyword: " + err.message);
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
      alert("Gagal menghapus data: " + err.message);
    }
  };

  if (loading) return <div className="p-8">Loading...</div>;

  const filteredAliases = aliases.filter(a => a.kata_kunci.toLowerCase().includes(search.toLowerCase()) || a.nama_produk_baku.toLowerCase().includes(search.toLowerCase()));
  const filteredAreas = areas.filter(a => a.keyword.toLowerCase().includes(search.toLowerCase()) || a.area_tag.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dictionary Manager</h1>
        <div className="bg-gray-100 p-1 rounded-md flex">
          <button 
            className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${activeTab === 'alias' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
            onClick={() => setActiveTab('alias')}
          >
            Product Aliases
          </button>
          <button 
            className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${activeTab === 'area' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
            onClick={() => setActiveTab('area')}
          >
            Area Keywords
          </button>
        </div>
      </div>

      <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm border">
        <input 
          type="text" 
          placeholder="Cari..." 
          className="border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring focus:border-orange-500 w-full md:w-64"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {activeTab === 'alias' && (
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 text-sm text-left">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 font-medium text-gray-500 w-1/3">Kata Kunci (slang)</th>
                <th className="px-6 py-3 font-medium text-gray-500 w-1/3">Nama Produk Baku</th>
                <th className="px-6 py-3 font-medium text-gray-500 w-1/6">Kitchen Code</th>
                <th className="px-6 py-3 font-medium text-gray-500 w-1/6 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredAliases.map(alias => (
                <tr key={alias.id_alias} className="hover:bg-gray-50">
                  {editingAliasId === alias.id_alias ? (
                    <>
                      <td className="px-6 py-2"><input className="w-full border rounded px-2 py-1 focus:ring-orange-500" value={editingAliasData.kata_kunci} onChange={e => setEditingAliasData({...editingAliasData, kata_kunci: e.target.value})} /></td>
                      <td className="px-6 py-2"><input className="w-full border rounded px-2 py-1 focus:ring-orange-500" value={editingAliasData.nama_produk_baku} onChange={e => setEditingAliasData({...editingAliasData, nama_produk_baku: e.target.value})} /></td>
                      <td className="px-6 py-2"><input className="w-full border rounded px-2 py-1 focus:ring-orange-500" value={editingAliasData.kitchen_code} onChange={e => setEditingAliasData({...editingAliasData, kitchen_code: e.target.value})} /></td>
                      <td className="px-6 py-2 text-right space-x-2">
                        <button onClick={handleSaveAlias} className="text-orange-600 font-medium hover:underline">Simpan</button>
                        <button onClick={() => setEditingAliasId(null)} className="text-gray-500 hover:underline">Batal</button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-6 py-4 font-mono bg-gray-50">{alias.kata_kunci}</td>
                      <td className="px-6 py-4">{alias.nama_produk_baku}</td>
                      <td className="px-6 py-4 font-bold">{alias.kitchen_code}</td>
                      <td className="px-6 py-4 text-right space-x-3">
                        <button onClick={() => startEditAlias(alias)} className="text-blue-600 hover:underline">Edit</button>
                        <button onClick={() => { setDeleteId(alias.id_alias); setDeleteType('alias'); }} className="text-red-500 hover:underline">Hapus</button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
              <tr className="bg-orange-50/30">
                <td className="px-6 py-2"><input placeholder="e.g. badil" className="w-full border rounded px-2 py-1 focus:outline-none focus:border-orange-500" value={newAlias.kata_kunci} onChange={e => setNewAlias({...newAlias, kata_kunci: e.target.value})} /></td>
                <td className="px-6 py-2"><input placeholder="e.g. BAdil" className="w-full border rounded px-2 py-1 focus:outline-none focus:border-orange-500" value={newAlias.nama_produk_baku} onChange={e => setNewAlias({...newAlias, nama_produk_baku: e.target.value})} /></td>
                <td className="px-6 py-2"><input placeholder="e.g. BD" className="w-full border rounded px-2 py-1 focus:outline-none focus:border-orange-500" value={newAlias.kitchen_code} onChange={e => setNewAlias({...newAlias, kitchen_code: e.target.value})} /></td>
                <td className="px-6 py-2 text-right">
                  <button onClick={handleAddAlias} className="text-orange-600 font-medium hover:underline bg-orange-100 px-3 py-1 rounded">Tambah</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'area' && (
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 text-sm text-left">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 font-medium text-gray-500 w-1/2">Keyword (WA text)</th>
                <th className="px-6 py-3 font-medium text-gray-500 w-1/3">Area Tag Resmi</th>
                <th className="px-6 py-3 font-medium text-gray-500 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredAreas.map(area => (
                <tr key={area.id_keyword} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-mono bg-gray-50">{area.keyword}</td>
                  <td className="px-6 py-4"><span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs border">🏷️ {area.area_tag}</span></td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => { setDeleteId(area.id_keyword); setDeleteType('area'); }} className="text-red-500 hover:underline">Hapus</button>
                  </td>
                </tr>
              ))}
              <tr className="bg-blue-50/30">
                <td className="px-6 py-2"><input placeholder="e.g. itz" className="w-full border rounded px-2 py-1 focus:outline-none focus:border-blue-500" value={newArea.keyword} onChange={e => setNewArea({...newArea, keyword: e.target.value})} /></td>
                <td className="px-6 py-2"><input placeholder="e.g. ITS" className="w-full border rounded px-2 py-1 focus:outline-none focus:border-blue-500" value={newArea.area_tag} onChange={e => setNewArea({...newArea, area_tag: e.target.value})} /></td>
                <td className="px-6 py-2 text-right">
                  <button onClick={handleAddArea} className="text-blue-600 font-medium hover:underline bg-blue-100 px-3 py-1 rounded">Tambah</button>
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
