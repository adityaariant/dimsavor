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
      if (item._unmatched || item.is_custom_price) return item;
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
      
      if (onDiscard) {
        onDiscard();
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      alert("Gagal menyimpan: " + err.message);
    } finally {
      setSaving(false);
      setIsQuotaModalOpen(false);
    }
  };

  const handleAddItem = () => {
    const newItem = {
      nama_produk: '',
      qty: 1,
      topping: '',
      subtotal: 0,
      is_custom_price: false,
      _unmatched: false
    };
    setData({
      ...data,
      items: [...data.items, newItem]
    });
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
      is_custom_price: newProductName === newItems[index].nama_produk ? true : false
    };
    setData({...data, items: newItems});
  };

  const subtotal = data.items.filter(i => !i._unmatched).reduce((s, i) => s + (i.subtotal || 0), 0);
  const total = subtotal + data.ongkir;

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto space-y-[24px] pr-[8px] hide-scrollbar">
        {/* Identitas */}
        <div>
          <h3 className="card-header border-b border-[var(--border)] pb-[8px] mb-[12px]">Identitas Pelanggan</h3>
          <div className="space-y-[12px]">
            <div className="flex items-center">
              <span className="w-24 form-label mb-0">Nama:</span>
              <input 
                className="form-input flex-1 h-[32px] text-[13px]" 
                value={data.nama_pelanggan || ''} 
                onChange={e => setData({...data, nama_pelanggan: e.target.value})} 
              />
            </div>
            <div className="flex items-center">
              <span className="w-24 form-label mb-0">Alamat:</span>
              <input 
                className="form-input flex-1 h-[32px] text-[13px] mr-[8px]" 
                value={data.alamat || ''} 
                onChange={e => setData({...data, alamat: e.target.value})} 
              />
              <span className="bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-secondary)] px-[8px] py-[4px] rounded-[4px] text-[11px] font-['JetBrains_Mono'] whitespace-nowrap">
                🏷️ {data.area_tag || 'Lainnya'}
              </span>
            </div>
            <div className="flex items-start">
              <span className="w-24 form-label mt-[8px]">Jadwal:</span>
              <div className="flex-1 flex flex-col gap-[4px]">
                <div className="flex gap-[8px]">
                  {isCustomSlot ? (
                    <input 
                      className="form-input flex-1 h-[32px] text-[13px]"
                      placeholder="Ketik jadwal baru..."
                      value={customSlotText}
                      onChange={e => setCustomSlotText(e.target.value)}
                    />
                  ) : (
                    <select 
                      className="form-select flex-1 h-[32px] text-[13px]"
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
                      className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-[12px] px-[8px] font-medium"
                    >
                      Batal
                    </button>
                  )}
                </div>
                {isCustomSlot && (
                  <p className="text-[11px] text-[var(--amber)]">
                    Jadwal baru akan otomatis dibuat dan disimpan.
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center">
              <span className="w-24 form-label mb-0">Pembayaran:</span>
              <select 
                className="form-select flex-1 h-[32px] text-[13px]"
                value={data.metode_bayar || 'BCA'}
                onChange={e => setData({...data, metode_bayar: e.target.value})}
              >
                {['QRIS', 'BCA', 'BNI', 'Cash Adit', 'Cash Kila', 'Shopeepay', 'Dana'].map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center">
              <span className="w-24 form-label mb-0">Ongkir:</span>
              <div className="flex-1 flex gap-[8px] items-center">
                <span className="font-['JetBrains_Mono'] text-[12px] text-[var(--text-secondary)]">Rp</span>
                <input 
                  type="number"
                  className={`form-input w-[120px] h-[32px] text-right font-['JetBrains_Mono'] text-[13px] ${isCustomOngkir ? 'border-[var(--amber)]' : ''}`}
                  value={data.ongkir}
                  onChange={e => {
                    setIsCustomOngkir(true);
                    setData({...data, ongkir: parseInt(e.target.value) || 0, ongkir_rule: 'Manual/Tip'});
                  }}
                />
                {!isCustomOngkir ? (
                  data.ongkir === 0 ? (
                    <span className="badge badge-sent bg-opacity-20 ml-2">🟢 Gratis ({data.ongkir_rule})</span>
                  ) : (
                    <span className="badge badge-pending bg-opacity-20 ml-2">🟡 {data.ongkir_rule}</span>
                  )
                ) : (
                  <>
                    <span className="badge badge-pending bg-opacity-20 ml-2">🟠 Manual</span>
                    <button 
                      onClick={() => {
                        setIsCustomOngkir(false);
                      }}
                      className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-[11px] px-[8px] underline"
                    >
                      Reset Otomatis
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Item Pesanan */}
        <div>
          <div className="flex justify-between items-center mb-[12px]">
            <h3 className="card-header border-b-0 pb-0 mb-0">Item Pesanan</h3>
            <button
              type="button"
              onClick={handleAddItem}
              className="text-[12px] text-[var(--amber)] hover:underline font-medium flex items-center gap-[4px]"
            >
              ➕ Tambah Item Baru
            </button>
          </div>
          <div className="border border-[var(--border)] rounded-[6px] overflow-hidden">
            <table className="min-w-full text-left">
              <thead className="bg-[var(--bg-elevated)] border-b border-[var(--border)]">
                <tr>
                  <th className="px-[12px] py-[8px] text-[12px] font-medium text-[var(--text-secondary)]">Produk</th>
                  <th className="px-[12px] py-[8px] text-[12px] font-medium text-[var(--text-secondary)] text-center w-[60px]">Qty</th>
                  <th className="px-[12px] py-[8px] text-[12px] font-medium text-[var(--text-secondary)]">Topping</th>
                  <th className="px-[12px] py-[8px] text-[12px] font-medium text-[var(--text-secondary)] text-right w-[150px]">Subtotal</th>
                  <th className="px-[12px] py-[8px] w-[40px]"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {data.items.map((item, idx) => (
                  <tr key={idx} className={item._unmatched ? 'bg-[var(--status-cancelled)]/10' : ''}>
                    <td className="px-[12px] py-[8px]">
                      {item._unmatched ? (
                        <div className="flex flex-col gap-1.5 p-1">
                          <span className="text-[var(--status-cancelled)] font-medium text-[11px]">⚠️ Teks asli: "{item.nama_produk}"</span>
                          <div className="flex gap-1.5">
                            <select 
                              className="form-select h-[28px] text-[11px] p-1 flex-1 min-w-0"
                              onChange={e => handleUnmatchedResolve(idx, e.target.value)}
                              defaultValue=""
                            >
                              <option value="" disabled>Match ke alias baku...</option>
                              {aliases.map(a => <option key={a} value={a}>{a}</option>)}
                            </select>
                            <button
                              type="button"
                              onClick={() => handleUnmatchedResolve(idx, item.nama_produk)}
                              className="btn-secondary h-[28px] text-[10px] px-2 whitespace-nowrap border border-[var(--border)] bg-[#2A2722] text-[#EDE9E0]"
                            >
                              Gunakan teks asli
                            </button>
                          </div>
                        </div>
                      ) : (
                        <input 
                          list="products-datalist"
                          className="form-input h-[28px] text-[12px] bg-transparent border-transparent px-1 focus:border-[var(--border)] focus:bg-[var(--bg-elevated)] focus:ring-0" 
                          value={item.nama_produk} 
                          placeholder="Pilih atau ketik produk..."
                          onChange={e => {
                            const newItems = [...data.items];
                            newItems[idx].nama_produk = e.target.value;
                            // reset custom price if changed to a standard Baku product
                            const standardPrices = {
                              "Dimsum Original": 16000,
                              "Dimsum Mentai 6pcs": 19000,
                              "Dimsum Mentai 4pcs": 15000,
                              "Bacar Kecil 120ml": 8000,
                              "Bacar Besar 150ml": 10000,
                              "BSweet": 27000,
                              "BAdil": 27000
                            };
                            if (standardPrices[e.target.value]) {
                              newItems[idx].is_custom_price = false;
                            }
                            setData({...data, items: newItems});
                          }}
                        />
                      )}
                    </td>
                    <td className="px-[12px] py-[8px] text-center">
                      <input className="form-input h-[28px] text-[12px] font-['JetBrains_Mono'] px-1 text-center w-full focus:ring-0" type="number" min="1" value={item.qty || 1} onChange={e => {
                        const newItems = [...data.items];
                        newItems[idx].qty = Number(e.target.value);
                        setData({...data, items: newItems});
                      }} />
                    </td>
                    <td className="px-[12px] py-[8px]">
                      {!item._unmatched && (
                        <input 
                          className="form-input h-[28px] text-[12px] w-full focus:ring-0" 
                          value={item.topping || ''} 
                          onChange={e => {
                            const newItems = [...data.items];
                            newItems[idx].topping = e.target.value;
                            setData({...data, items: newItems});
                          }} 
                          placeholder="Cth: Oreo"
                        />
                      )}
                    </td>
                    <td className="px-[12px] py-[8px] text-right text-[12px]">
                      {!item._unmatched && (
                        <div className="flex items-center justify-end gap-1">
                          <span className="text-[10px] text-[var(--text-secondary)]">Rp</span>
                          <input
                            type="number"
                            className={`form-input h-[28px] text-[12px] font-['JetBrains_Mono'] px-1 text-right w-[75px] focus:ring-0 ${
                              item.is_custom_price ? 'border-[var(--amber)] bg-[#3D2A08]/40 text-[var(--amber)] font-bold' : 'border-transparent bg-transparent'
                            }`}
                            value={item.subtotal || 0}
                            onChange={e => {
                              const newItems = [...data.items];
                              newItems[idx].subtotal = parseInt(e.target.value) || 0;
                              newItems[idx].is_custom_price = true;
                              setData({...data, items: newItems});
                            }}
                          />
                          {item.is_custom_price && (
                            <button
                              type="button"
                              title="Reset ke harga otomatis"
                              onClick={() => {
                                const newItems = [...data.items];
                                newItems[idx].is_custom_price = false;
                                setData({...data, items: newItems});
                              }}
                              className="text-[9px] text-[var(--amber)] hover:underline ml-1 font-bold bg-[#3D2A08] px-1 py-0.5 rounded border border-[#7A520F]"
                            >
                              Auto
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-[12px] py-[8px] text-center text-[var(--text-disabled)] hover:text-[var(--status-cancelled)] cursor-pointer" onClick={() => handleItemDelete(idx)}>
                      <Trash2 className="w-4 h-4 mx-auto" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <datalist id="products-datalist">
            {aliases.map(a => (
              <option key={a} value={a} />
            ))}
          </datalist>
        </div>

        {/* Ringkasan */}
        <div>
          <h3 className="card-header border-b border-[var(--border)] pb-[8px] mb-[12px]">Ringkasan</h3>
          <div className="bg-[var(--bg-muted)] p-[16px] rounded-[6px] border border-[var(--border)] text-[13px] font-['Inter'] space-y-[4px]">
            <div className="flex justify-between text-[var(--text-secondary)]"><span>Subtotal items:</span> <span className="font-['JetBrains_Mono'] text-[12px]">{formatRupiah(subtotal)}</span></div>
            <div className="flex justify-between text-[var(--text-secondary)]"><span>Ongkir:</span> <span className="font-['JetBrains_Mono'] text-[12px]">{formatRupiah(data.ongkir)}</span></div>
            <div className="flex justify-between font-medium text-[var(--text-primary)] pt-[8px] border-t border-[var(--border)] mt-[8px]">
              <span>Total:</span> <span className="font-['Space_Grotesk'] text-[18px] text-[var(--amber)] leading-none">{formatRupiah(total)}</span>
            </div>
            <div className="mt-[12px] pt-[12px] border-t border-[var(--border)] border-dashed text-[11px] text-[var(--text-secondary)]">
              Kuota terpakai: <span className="font-medium text-[var(--text-primary)]">{countDimsumBoxes(data.items)} box</span> dimsum
            </div>
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="pt-[16px] mt-auto border-t border-[var(--border)] flex justify-between items-center bg-[var(--bg-surface)]">
        <button onClick={onDiscard} className="btn-secondary px-[16px]">Discard</button>
        <button 
          onClick={checkQuotaAndSave}
          disabled={saving || data.items.length === 0}
          className="btn-primary flex items-center gap-[8px]"
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
