import React, { useState, useEffect } from 'react';
import { apiFetch } from '../api/client';
import ConfirmModal from '../components/ConfirmModal';
import { formatRupiah } from '../utils/format';
import { calculateSubtotal, countDimsumBoxes } from '../utils/pricing';
import { Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../contexts/ToastContext';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';

export default function ReviewForm({ initialData, session, onDiscard, refreshSessionData, isEditMode = false }) {
  const [data, setData] = useState(initialData);
  const [slots, setSlots] = useState([]);
  const [aliases, setAliases] = useState([]);
  const [isQuotaModalOpen, setIsQuotaModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();
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
      showToast("Gagal menyimpan: " + err.message, "error");
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
          <h3 className="font-display font-semibold text-[14px] uppercase tracking-wide text-muted-foreground border-b border-border pb-[8px] mb-[12px]">Identitas Pelanggan</h3>
          <div className="space-y-[12px]">
            <div className="flex items-center">
              <span className="w-24 text-[13px] font-medium text-muted-foreground mb-0">Nama:</span>
              <Input 
                className="flex-1 h-[32px] text-[13px]" 
                value={data.nama_pelanggan || ''} 
                onChange={e => setData({...data, nama_pelanggan: e.target.value})} 
              />
            </div>
            <div className="flex items-center">
              <span className="w-24 text-[13px] font-medium text-muted-foreground mb-0">Alamat:</span>
              <Input 
                className="flex-1 h-[32px] text-[13px] mr-[8px]" 
                value={data.alamat || ''} 
                onChange={e => setData({...data, alamat: e.target.value})} 
              />
              <span className="bg-amber/10 border border-amber/20 text-amber px-[8px] py-[4px] rounded-[6px] text-[11px] font-medium font-sans whitespace-nowrap shadow-sm">
                🏷️ {data.area_tag || 'Lainnya'}
              </span>
            </div>
            <div className="flex items-start">
              <span className="w-24 text-[13px] font-medium text-muted-foreground mt-[8px]">Jadwal:</span>
              <div className="flex-1 flex flex-col gap-[4px]">
                <div className="flex gap-[8px]">
                  {isCustomSlot ? (
                    <Input 
                      className="flex-1 h-[32px] text-[13px]"
                      placeholder="Ketik jadwal baru..."
                      value={customSlotText}
                      onChange={e => setCustomSlotText(e.target.value)}
                    />
                  ) : (
                    <Select 
                      value={data.matched_slot?.id_slot?.toString() || 'manual'}
                      onValueChange={value => {
                        if (value === "NEW") {
                          setIsCustomSlot(true);
                        } else if (value === "manual") {
                          setData({...data, matched_slot: null});
                        } else {
                          const slot = slots.find(s => s.id_slot.toString() === value);
                          setData({...data, matched_slot: slot || null});
                        }
                      }}
                    >
                      <SelectTrigger className="flex-1 h-[32px] text-[13px]">
                        <SelectValue placeholder="Manual / Belum Pilih" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="manual">Manual / Belum Pilih</SelectItem>
                        {slots.map(s => (
                          <SelectItem key={s.id_slot} value={s.id_slot.toString()}>{s.jadwal_teks}</SelectItem>
                        ))}
                        <SelectItem value="NEW">✨ Ketik jadwal baru...</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                  {isCustomSlot && (
                    <Button 
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsCustomSlot(false)}
                      className="text-muted-foreground hover:text-foreground text-[12px] px-[8px] font-medium h-[32px]"
                    >
                      Batal
                    </Button>
                  )}
                </div>
                {isCustomSlot && (
                  <p className="text-[11px] text-terracotta">
                    Jadwal baru akan otomatis dibuat dan disimpan.
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center">
              <span className="w-24 text-[13px] font-medium text-muted-foreground mb-0">Pembayaran:</span>
              <Select 
                value={data.metode_bayar || 'BCA'}
                onValueChange={value => setData({...data, metode_bayar: value})}
              >
                <SelectTrigger className="flex-1 h-[32px] text-[13px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {['QRIS', 'BCA', 'BNI', 'Cash Adit', 'Cash Kila', 'Shopeepay', 'Dana'].map(m => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center">
              <span className="w-24 text-[13px] font-medium text-muted-foreground mb-0">Ongkir:</span>
              <div className="flex-1 flex gap-[8px] items-center">
                <span className="font-mono text-[12px] text-muted-foreground">Rp</span>
                <Input 
                  type="number"
                  className={`w-[120px] h-[32px] text-right font-mono text-[13px] ${isCustomOngkir ? 'border-terracotta' : ''}`}
                  value={data.ongkir}
                  onChange={e => {
                    setIsCustomOngkir(true);
                    setData({...data, ongkir: parseInt(e.target.value) || 0, ongkir_rule: 'Manual/Tip'});
                  }}
                />
                {!isCustomOngkir ? (
                  data.ongkir === 0 ? (
                    <Badge variant="sent" className="ml-2">🟢 Gratis ({data.ongkir_rule})</Badge>
                  ) : (
                    <Badge variant="pending" className="ml-2">🟡 {data.ongkir_rule}</Badge>
                  )
                ) : (
                  <>
                    <Badge variant="pending" className="ml-2">🟠 Manual</Badge>
                    <button 
                      onClick={() => {
                        setIsCustomOngkir(false);
                      }}
                      className="text-muted-foreground hover:text-foreground text-[11px] px-[8px] underline"
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
            <h3 className="font-display font-semibold text-[14px] uppercase tracking-wide text-muted-foreground">Item Pesanan</h3>
            <button
              type="button"
              onClick={handleAddItem}
              className="text-[12px] text-terracotta hover:underline font-medium flex items-center gap-[4px]"
            >
              ➕ Tambah Item Baru
            </button>
          </div>
          <div className="border border-border rounded-[6px] overflow-hidden">
            <table className="min-w-full text-left">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="px-[12px] py-[8px] text-[12px] font-medium text-muted-foreground">Produk</th>
                  <th className="px-[12px] py-[8px] text-[12px] font-medium text-muted-foreground text-center w-[60px]">Qty</th>
                  <th className="px-[12px] py-[8px] text-[12px] font-medium text-muted-foreground">Topping</th>
                  <th className="px-[12px] py-[8px] text-[12px] font-medium text-muted-foreground text-right w-[150px]">Subtotal</th>
                  <th className="px-[12px] py-[8px] w-[40px]"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.items.map((item, idx) => (
                  <tr key={idx} className={item._unmatched ? 'bg-destructive/10' : ''}>
                    <td className="px-[12px] py-[8px]">
                      {item._unmatched ? (
                        <div className="flex flex-col gap-1.5 p-1">
                          <span className="text-destructive font-medium text-[11px]">⚠️ Teks asli: "{item.nama_produk}"</span>
                          <div className="flex gap-1.5">
                            <select 
                              className="flex h-7 w-full items-center justify-between rounded-md border border-input bg-background px-2 py-1 text-[11px]"
                              onChange={e => handleUnmatchedResolve(idx, e.target.value)}
                              defaultValue=""
                            >
                              <option value="" disabled>Match ke alias baku...</option>
                              {aliases.map(a => <option key={a} value={a}>{a}</option>)}
                            </select>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleUnmatchedResolve(idx, item.nama_produk)}
                              className="h-7 text-[10px] px-2 whitespace-nowrap"
                            >
                              Gunakan teks asli
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <Input 
                          list="products-datalist"
                          className="h-[28px] text-[12px] bg-transparent border-transparent px-1 focus-visible:border-border focus-visible:bg-muted" 
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
                      <Input className="h-[28px] text-[12px] font-mono px-1 text-center w-full" type="number" min="1" value={item.qty || 1} onChange={e => {
                        const newItems = [...data.items];
                        newItems[idx].qty = Number(e.target.value);
                        setData({...data, items: newItems});
                      }} />
                    </td>
                    <td className="px-[12px] py-[8px]">
                      {!item._unmatched && (
                        <Input 
                          className="h-[28px] text-[12px] w-full" 
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
                          <span className="text-[10px] text-muted-foreground">Rp</span>
                          <Input
                            type="number"
                            className={`h-[28px] text-[12px] font-mono px-1 text-right w-[75px] ${
                              item.is_custom_price ? 'border-terracotta bg-terracotta/10 text-terracotta font-bold' : 'border-transparent bg-transparent'
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
                              className="text-[9px] text-terracotta hover:underline ml-1 font-bold bg-terracotta/10 px-1 py-0.5 rounded border border-terracotta/30"
                            >
                              Auto
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-[12px] py-[8px] text-center text-muted-foreground hover:text-destructive cursor-pointer" onClick={() => handleItemDelete(idx)}>
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
          <h3 className="font-display font-semibold text-[14px] uppercase tracking-wide text-muted-foreground border-b border-border pb-[8px] mb-[12px]">Ringkasan</h3>
          <div className="bg-card p-[16px] rounded-[10px] shadow-soft border border-border text-[13px] font-sans space-y-[4px]">
            <div className="flex justify-between text-muted-foreground"><span>Subtotal items:</span> <span className="font-mono text-[12px]">{formatRupiah(subtotal)}</span></div>
            <div className="flex justify-between text-muted-foreground"><span>Ongkir:</span> <span className="font-mono text-[12px]">{formatRupiah(data.ongkir)}</span></div>
            <div className="flex justify-between font-bold text-foreground pt-[8px] border-t border-border mt-[8px]">
              <span>Total:</span> <span className="font-display text-[18px] text-terracotta leading-none">{formatRupiah(total)}</span>
            </div>
            <div className="mt-[12px] pt-[12px] border-t border-border border-dashed text-[11px] text-muted-foreground">
              Kuota terpakai: <span className="font-medium text-foreground">{countDimsumBoxes(data.items)} box</span> dimsum
            </div>
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="pt-[16px] mt-auto border-t border-border flex justify-between items-center bg-background">
        <Button variant="outline" onClick={onDiscard} className="px-[16px]">Discard</Button>
        <Button 
          onClick={checkQuotaAndSave}
          disabled={saving || data.items.length === 0}
          className="flex items-center gap-[8px]"
        >
          {saving ? 'Menyimpan...' : '✓ Konfirmasi & Simpan'}
        </Button>
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
