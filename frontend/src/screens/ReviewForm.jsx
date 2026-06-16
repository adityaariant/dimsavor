import React, { useState, useEffect } from 'react';
import { apiFetch } from '../api/client';
import ConfirmModal from '../components/ConfirmModal';
import { formatRupiah } from '../utils/format';
import { calculateSubtotal, countDimsumBoxes } from '../utils/pricing';
import { Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function ReviewForm({ initialData, session, onDiscard, refreshSessionData, isEditMode = false }) {
  const [data, setData] = useState(initialData);
  const [slots, setSlots] = useState([]);
  const [aliases, setAliases] = useState([]);
  const [isQuotaModalOpen, setIsQuotaModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  const [isCustomSlot, setIsCustomSlot] = useState(false);
  const [customSlotText, setCustomSlotText] = useState(initialData?.jadwal_kirim_request || '');

  const [isCustomOngkir, setIsCustomOngkir] = useState(false);

  useEffect(() => {
    setData(initialData);
    setCustomSlotText(initialData?.jadwal_kirim_request || '');
    setIsCustomSlot(false);
    setIsCustomOngkir(false);
  }, [initialData]);

  useEffect(() => {
    if (!data) return;
    const area = data.area_tag;
    const slot = isCustomSlot ? null : data.matched_slot;
    
    let newOngkir = isCustomOngkir ? data.ongkir : 2000;
    let newRule = isCustomOngkir ? data.ongkir_rule : 'Flat';
    
    if (!isCustomOngkir) {
      if (area === 'Gunung Anyar' || area === 'Rungkut') {
        newOngkir = 0;
        newRule = 'Area';
      } else if (area === 'ITS' && slot && slot.is_free_ongkir) {
        newOngkir = 0;
        newRule = 'Slot';
      }
    }

    const newItems = data.items.map(item => {
      if (item._unmatched) return item;
      return {
        ...item,
        subtotal: calculateSubtotal(item.nama_produk, item.qty, item.topping)
      };
    });

    const hasItemsChanged = newItems.some((n, i) => n.subtotal !== data.items[i].subtotal);

    if (newOngkir !== data.ongkir || newRule !== data.ongkir_rule || hasItemsChanged) {
      setData(prev => ({ ...prev, ongkir: newOngkir, ongkir_rule: newRule, items: newItems }));
    }
  }, [data?.area_tag, data?.matched_slot, data?.items, isCustomSlot, isCustomOngkir]);

  useEffect(() => {
    async function loadMeta() {
      const [sData, aData] = await Promise.all([
        apiFetch(`/sessions/${session.id_po}/slots`),
        apiFetch(`/alias`)
      ]);
      setSlots(sData);
      const uniqueMenus = Array.from(new Set(aData.map(a => a.nama_produk_baku)));
      setAliases(uniqueMenus);
    }
    loadMeta();
  }, [session.id_po]);

  const checkQuotaAndSave = async () => {
    setIsQuotaModalOpen(true);
  };

  const executeSave = async () => {
    setSaving(true);
    try {
      const cleanItems = data.items
        .filter(i => !i._unmatched)
        .map(i => ({
          nama_produk: i.nama_produk,
          qty: i.qty,
          is_bundle: false, 
          topping: i.topping || null,
          subtotal: i.subtotal || 0
        }));

      if (cleanItems.length === 0) {
        throw new Error("Tidak ada item pesanan yang valid.");
      }

      let finalSlotId = data.matched_slot?.id_slot || null;
      
      // Jika membuat slot baru
      if (isCustomSlot && customSlotText.trim()) {
        const newSlot = await apiFetch(`/sessions/${session.id_po}/slots`, {
          method: 'POST',
          body: JSON.stringify({
            jadwal_teks: customSlotText,
            is_free_ongkir: false
          })
        });
        finalSlotId = newSlot.id_slot;
      }

      const payload = {
        id_po: session.id_po,
        nama_pelanggan: data.nama_pelanggan || "Customer",
        alamat: data.alamat || "-",
        area_tag: data.area_tag,
        id_slot: finalSlotId,
        jadwal_kirim_request: isCustomSlot ? customSlotText : (data.jadwal_kirim_request || null),
        metode_bayar: data.metode_bayar || 'QRIS', 
        ongkir: data.ongkir,
        ongkir_rule: data.ongkir_rule,
        items: cleanItems
      };

      if (isEditMode && data.id_order) {
        await apiFetch(`/orders/${data.id_order}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
      } else {
        await apiFetch('/orders/', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
      }

      if (refreshSessionData) {
        await refreshSessionData();
      }
      
      if (isEditMode && onDiscard) {
        onDiscard(); // act as close drawer
      } else {
        navigate('/orders');
      }
    } catch (err) {
      alert("Gagal menyimpan: " + err.message);
    } finally {
      setSaving(false);
      setIsQuotaModalOpen(false);
    }
  };

  const handleItemDelete = (index) => {
    const newItems = [...data.items];
    newItems.splice(index, 1);
    setData({...data, items: newItems});
  };

  const handleUnmatchedResolve = (index, newProductName) => {
    const newItems = [...data.items];
    newItems[index] = {
      ...newItems[index],
      _unmatched: false,
      nama_produk: newProductName,
      subtotal: 0 // Simplification, would ideally re-price via backend
    };
    setData({...data, items: newItems});
  };

  const subtotal = data.items.filter(i => !i._unmatched).reduce((s, i) => s + (i.subtotal || 0), 0);
  const total = subtotal + data.ongkir;

  return (
    <div className="flex flex-col h-full space-y-4">
      <div className="flex-1 overflow-y-auto space-y-6 pr-2">
        {/* Identitas */}
        <div>
          <h3 className="font-semibold text-gray-800 border-b pb-1 mb-3">Identitas Pelanggan</h3>
          <div className="space-y-3 text-sm">
            <div className="flex items-center">
              <span className="w-24 text-gray-500">Nama:</span>
              <input 
                className="flex-1 border rounded px-2 py-1" 
                value={data.nama_pelanggan || ''} 
                onChange={e => setData({...data, nama_pelanggan: e.target.value})} 
              />
            </div>
            <div className="flex items-center">
              <span className="w-24 text-gray-500">Alamat:</span>
              <input 
                className="flex-1 border rounded px-2 py-1 mr-2" 
                value={data.alamat || ''} 
                onChange={e => setData({...data, alamat: e.target.value})} 
              />
              <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs whitespace-nowrap">🏷️ {data.area_tag || 'Lainnya'}</span>
            </div>
            <div className="flex items-start">
              <span className="w-24 text-gray-500 mt-1">Jadwal:</span>
              <div className="flex-1 flex flex-col gap-1">
                <div className="flex gap-2">
                  {isCustomSlot ? (
                    <input 
                      className="flex-1 border rounded px-2 py-1"
                      placeholder="Ketik jadwal baru..."
                      value={customSlotText}
                      onChange={e => setCustomSlotText(e.target.value)}
                    />
                  ) : (
                    <select 
                      className="flex-1 border rounded px-2 py-1"
                      value={data.matched_slot?.id_slot || ''}
                      onChange={e => {
                        if (e.target.value === "NEW") {
                          setIsCustomSlot(true);
                        } else {
                          const sId = e.target.value;
                          const slot = slots.find(s => s.id_slot == sId);
                          setData({...data, matched_slot: slot || null});
                        }
                      }}
                    >
                      <option value="">Manual / Belum Pilih</option>
                      {slots.map(s => (
                        <option key={s.id_slot} value={s.id_slot}>{s.jadwal_teks}</option>
                      ))}
                      <option value="NEW">✨ Ketik jadwal baru...</option>
                    </select>
                  )}
                  {isCustomSlot && (
                    <button 
                      onClick={() => setIsCustomSlot(false)}
                      className="text-gray-500 hover:text-gray-700 text-xs px-2"
                    >Batal</button>
                  )}
                </div>
                {isCustomSlot && (
                  <p className="text-xs text-orange-600">
                    Jadwal baru akan otomatis dibuat dan disimpan.
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center">
              <span className="w-24 text-gray-500">Ongkir:</span>
              <div className="flex-1 flex gap-2 items-center">
                <span className="font-medium text-gray-500">Rp</span>
                <input 
                  type="number"
                  className={`w-28 border rounded px-2 py-1 text-right ${isCustomOngkir ? 'border-orange-500' : ''}`}
                  value={data.ongkir}
                  onChange={e => {
                    setIsCustomOngkir(true);
                    setData({...data, ongkir: parseInt(e.target.value) || 0, ongkir_rule: 'Manual/Tip'});
                  }}
                />
                {!isCustomOngkir ? (
                  data.ongkir === 0 ? (
                    <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded-full text-xs">🟢 Gratis ({data.ongkir_rule})</span>
                  ) : (
                    <span className="bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full text-xs">🟡 {data.ongkir_rule}</span>
                  )
                ) : (
                  <>
                    <span className="bg-orange-100 text-orange-800 px-2 py-0.5 rounded-full text-xs">🟠 Manual</span>
                    <button 
                      onClick={() => {
                        setIsCustomOngkir(false);
                        // Trigger recalculation on next render
                      }}
                      className="text-gray-500 hover:text-gray-700 text-xs px-2"
                    >Reset ke Otomatis</button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Item Pesanan */}
        <div>
          <h3 className="font-semibold text-gray-800 border-b pb-1 mb-3">Item Pesanan</h3>
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-2 py-1 text-left font-medium">Produk</th>
                <th className="px-2 py-1 text-center font-medium">Qty</th>
                <th className="px-2 py-1 text-left font-medium">Topping</th>
                <th className="px-2 py-1 text-right font-medium">Subtotal</th>
                <th className="px-2 py-1"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.items.map((item, idx) => (
                <tr key={idx} className={item._unmatched ? 'bg-red-50' : ''}>
                  <td className="px-2 py-2">
                    {item._unmatched ? (
                      <div className="flex flex-col">
                        <span className="text-red-600 font-medium">⚠️ "{data.unmatched_tokens?.[0] || 'Unmatched'}"</span>
                        <select 
                          className="mt-1 text-xs border rounded p-1"
                          onChange={e => handleUnmatchedResolve(idx, e.target.value)}
                          defaultValue=""
                        >
                          <option value="" disabled>Pilih Produk...</option>
                          {aliases.map(a => <option key={a} value={a}>{a}</option>)}
                        </select>
                      </div>
                    ) : (
                      <input className="w-full border rounded px-1" value={item.nama_produk} readOnly />
                    )}
                  </td>
                  <td className="px-2 py-2 w-16 text-center">
                    <input className="w-full border rounded px-1 text-center" type="number" min="1" value={item.qty || 1} onChange={e => {
                      const newItems = [...data.items];
                      newItems[idx].qty = Number(e.target.value);
                      setData({...data, items: newItems});
                    }} />
                  </td>
                  <td className="px-2 py-2">
                    {!item._unmatched && (
                      <input 
                        className="w-full border rounded px-1" 
                        value={item.topping || ''} 
                        onChange={e => {
                          const newItems = [...data.items];
                          newItems[idx].topping = e.target.value;
                          setData({...data, items: newItems});
                        }} 
                        placeholder="Cth: Oreo 2k"
                      />
                    )}
                  </td>
                  <td className="px-2 py-2 text-right">
                    {!item._unmatched && formatRupiah(item.subtotal)}
                  </td>
                  <td className="px-2 py-2 text-center text-gray-400 hover:text-red-500 cursor-pointer" onClick={() => handleItemDelete(idx)}>
                    <Trash2 className="w-4 h-4 mx-auto" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Ringkasan */}
        <div>
          <h3 className="font-semibold text-gray-800 border-b pb-1 mb-3">Ringkasan</h3>
          <div className="bg-gray-50 p-3 rounded text-sm space-y-1">
            <div className="flex justify-between"><span>Subtotal items:</span> <span>{formatRupiah(subtotal)}</span></div>
            <div className="flex justify-between"><span>Ongkir:</span> <span>{formatRupiah(data.ongkir)}</span></div>
            <div className="flex justify-between font-bold pt-2 border-t mt-2">
              <span>Total:</span> <span>{formatRupiah(total)}</span>
            </div>
            <div className="mt-2 text-orange-600 text-xs">
              Kuota terpakai: Mengonsumsi {countDimsumBoxes(data.items)} box dimsum
            </div>
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="pt-4 border-t flex justify-between items-center bg-white">
        <button onClick={onDiscard} className="text-gray-500 hover:text-gray-800 text-sm font-medium border px-4 py-2 rounded">Discard</button>
        <button 
          onClick={checkQuotaAndSave}
          disabled={saving || data.items.length === 0}
          className="bg-orange-600 text-white px-6 py-2 rounded shadow font-medium hover:bg-orange-700 disabled:bg-gray-300"
        >
          {saving ? 'Menyimpan...' : '✓ Konfirmasi & Simpan'}
        </button>
      </div>

      <ConfirmModal
        isOpen={isQuotaModalOpen}
        title="Konfirmasi Pesanan"
        body="Pesanan ini akan ditambahkan ke sistem. Pastikan kuota mencukupi. Tetap simpan?"
        confirmText="Simpan"
        onConfirm={executeSave}
        onCancel={() => setIsQuotaModalOpen(false)}
      />
    </div>
  );
}
