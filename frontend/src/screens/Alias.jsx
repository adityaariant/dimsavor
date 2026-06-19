import React, { useState, useEffect } from 'react';
import { apiFetch } from '../api/client';
import ConfirmModal from '../components/ConfirmModal';
import { useToast } from '../contexts/ToastContext';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { Search } from 'lucide-react';

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
        <h1 className="text-[24px] font-semibold text-foreground font-display">Dictionary Manager</h1>
        <div className="bg-muted p-[4px] rounded-lg border border-border flex font-sans">
          <button 
            className={`px-[16px] py-[6px] rounded-[6px] text-[13px] font-medium transition-colors ${activeTab === 'alias' ? 'bg-background shadow-soft text-foreground border border-border' : 'text-muted-foreground hover:text-foreground border border-transparent'}`}
            onClick={() => setActiveTab('alias')}
          >
            Product Aliases
          </button>
          <button 
            className={`px-[16px] py-[6px] rounded-[6px] text-[13px] font-medium transition-colors ${activeTab === 'area' ? 'bg-background shadow-soft text-foreground border border-border' : 'text-muted-foreground hover:text-foreground border border-transparent'}`}
            onClick={() => setActiveTab('area')}
          >
            Area Keywords
          </button>
        </div>
      </div>

      <div className="flex justify-between items-center bg-card p-[16px] rounded-lg shadow-soft border border-border">
        <div className="relative w-full md:w-[280px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            type="text" 
            placeholder="Cari kata kunci..." 
            className="pl-9"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {activeTab === 'alias' && (
        <Card className="overflow-hidden">
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="w-1/3">Kata Kunci (slang)</TableHead>
                  <TableHead className="w-1/3">Nama Produk Baku</TableHead>
                  <TableHead className="w-1/6">Kitchen Code</TableHead>
                  <TableHead className="w-1/6 text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAliases.map(alias => (
                  <TableRow key={alias.id_alias}>
                    {editingAliasId === alias.id_alias ? (
                      <>
                        <TableCell><Input className="h-[28px] text-[13px]" value={editingAliasData.kata_kunci} onChange={e => setEditingAliasData({...editingAliasData, kata_kunci: e.target.value})} /></TableCell>
                        <TableCell><Input className="h-[28px] text-[13px]" value={editingAliasData.nama_produk_baku} onChange={e => setEditingAliasData({...editingAliasData, nama_produk_baku: e.target.value})} /></TableCell>
                        <TableCell><Input className="h-[28px] text-[13px]" value={editingAliasData.kitchen_code} onChange={e => setEditingAliasData({...editingAliasData, kitchen_code: e.target.value})} /></TableCell>
                        <TableCell className="text-right space-x-2">
                          <button onClick={handleSaveAlias} className="text-terracotta font-medium hover:underline text-[12px]">Simpan</button>
                          <button onClick={() => setEditingAliasId(null)} className="text-muted-foreground hover:underline text-[12px]">Batal</button>
                        </TableCell>
                      </>
                    ) : (
                      <>
                        <TableCell className="font-mono text-foreground bg-muted/30 border-r border-border">{alias.kata_kunci}</TableCell>
                        <TableCell className="text-muted-foreground">{alias.nama_produk_baku}</TableCell>
                        <TableCell className="font-mono font-medium">{alias.kitchen_code}</TableCell>
                        <TableCell className="text-right space-x-3">
                          <button onClick={() => startEditAlias(alias)} className="text-muted-foreground hover:text-foreground hover:underline text-[12px]">Edit</button>
                          <button onClick={() => { setDeleteId(alias.id_alias); setDeleteType('alias'); }} className="text-destructive hover:underline text-[12px]">Hapus</button>
                        </TableCell>
                      </>
                    )}
                  </TableRow>
                ))}
                <TableRow className="bg-muted/30 border-t border-border hover:bg-muted/30">
                  <TableCell className="py-[12px]"><Input placeholder="e.g. badil" className="h-[32px] text-[13px] bg-background" value={newAlias.kata_kunci} onChange={e => setNewAlias({...newAlias, kata_kunci: e.target.value})} /></TableCell>
                  <TableCell className="py-[12px]"><Input placeholder="e.g. BAdil" className="h-[32px] text-[13px] bg-background" value={newAlias.nama_produk_baku} onChange={e => setNewAlias({...newAlias, nama_produk_baku: e.target.value})} /></TableCell>
                  <TableCell className="py-[12px]"><Input placeholder="e.g. BD" className="h-[32px] text-[13px] bg-background" value={newAlias.kitchen_code} onChange={e => setNewAlias({...newAlias, kitchen_code: e.target.value})} /></TableCell>
                  <TableCell className="py-[12px] text-right">
                    <Button onClick={handleAddAlias} size="sm" variant="secondary" className="bg-amber/20 text-amber hover:bg-amber hover:text-white">Tambah</Button>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {activeTab === 'area' && (
        <Card className="overflow-hidden">
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="w-1/2">Keyword (WA text)</TableHead>
                  <TableHead className="w-1/3">Area Tag Resmi</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAreas.map(area => (
                  <TableRow key={area.id_keyword}>
                    <TableCell className="font-mono text-foreground bg-muted/30 border-r border-border">{area.keyword}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-amber/10 border-amber text-amber font-medium shadow-sm font-sans">🏷️ {area.area_tag}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <button onClick={() => { setDeleteId(area.id_keyword); setDeleteType('area'); }} className="text-destructive hover:underline text-[12px]">Hapus</button>
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/30 border-t border-border hover:bg-muted/30">
                  <TableCell className="py-[12px]"><Input placeholder="e.g. itz" className="h-[32px] text-[13px] bg-background" value={newArea.keyword} onChange={e => setNewArea({...newArea, keyword: e.target.value})} /></TableCell>
                  <TableCell className="py-[12px]"><Input placeholder="e.g. ITS" className="h-[32px] text-[13px] bg-background" value={newArea.area_tag} onChange={e => setNewArea({...newArea, area_tag: e.target.value})} /></TableCell>
                  <TableCell className="py-[12px] text-right">
                    <Button onClick={handleAddArea} size="sm" variant="secondary" className="bg-amber/20 text-amber hover:bg-amber hover:text-white">Tambah</Button>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
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
