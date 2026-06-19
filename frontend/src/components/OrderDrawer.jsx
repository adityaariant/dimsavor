import React, { useEffect } from 'react';
import { formatRupiah } from '../utils/format';
import ConfirmModal from './ConfirmModal';
import ReviewForm from '../screens/ReviewForm';
import { Button } from './ui/button';
import { X } from 'lucide-react';

export default function OrderDrawer({ order, items, isOpen, onClose, onCancelOrder, isReadOnly, session, refreshSessionData }) {
  const [isCancelModalOpen, setIsCancelModalOpen] = React.useState(false);
  const [isEditMode, setIsEditMode] = React.useState(false);

  useEffect(() => {
    if (!isOpen) {
      setIsEditMode(false);
    }
  }, [isOpen]);

  if (!isOpen || !order) return null;

  const subtotal = items.reduce((sum, item) => sum + (item.subtotal || 0), 0);
  const total = subtotal + order.ongkir;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-foreground/40 backdrop-blur-sm transition-opacity" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-background border-l border-border shadow-paper flex flex-col transform transition-transform">
        <div className="p-[20px] border-b border-border flex justify-between items-center bg-gradient-warm">
          <h2 className="text-[18px] font-bold text-foreground font-display">
            Pesanan #{order.id_order} — {order.nama_pelanggan}
          </h2>
          <Button variant="ghost" size="icon" aria-label="Tutup Order" onClick={onClose} className="h-8 w-8 text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </Button>
        </div>
        
        {!isEditMode ? (
          <>
            <div className="flex-1 overflow-y-auto p-[20px] space-y-[24px] text-[13px] font-sans bg-muted/30">
              <div className="space-y-[8px] bg-card p-[16px] rounded-[10px] shadow-soft border border-border">
                <div className="grid grid-cols-3 text-muted-foreground"><span className="col-span-1">Alamat:</span> <span className="col-span-2 text-foreground font-medium">{order.alamat}</span></div>
                <div className="grid grid-cols-3 text-muted-foreground"><span className="col-span-1">Area:</span> <span className="col-span-2 text-foreground">{order.area_tag || '-'}</span></div>
                <div className="grid grid-cols-3 text-muted-foreground"><span className="col-span-1">Jadwal:</span> <span className="col-span-2 text-foreground">{order.delivery_slots?.jadwal_teks || order.jadwal_kirim_request || 'Tanpa Jadwal'}</span></div>
                <div className="grid grid-cols-3 text-muted-foreground"><span className="col-span-1">Metode:</span> <span className="col-span-2 text-foreground">{order.metode_bayar || 'QRIS'}</span></div>
                <div className="grid grid-cols-3 text-muted-foreground">
                  <span className="col-span-1">Ongkir:</span> 
                  <span className="col-span-2 text-foreground font-mono text-[12px]">
                    {formatRupiah(order.ongkir)} <span className="text-[11px] text-muted-foreground font-sans">({order.ongkir_rule || '-'})</span>
                  </span>
                </div>
              </div>

              <div>
                <table className="w-full">
                  <tbody className="divide-y divide-border">
                    {items.map((item, idx) => (
                      <tr key={idx} className="">
                        <td className="py-[12px] text-foreground font-medium">
                          {item.nama_produk} 
                          {item.topping && <div className="text-[11px] text-muted-foreground font-normal mt-[4px]">Topping: {item.topping}</div>}
                        </td>
                        <td className="py-[12px] text-center text-muted-foreground font-mono text-[12px]">x{item.qty}</td>
                        <td className="py-[12px] text-right text-foreground font-mono text-[12px]">{formatRupiah(item.subtotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="border-t border-border pt-[16px] space-y-[8px] text-right">
                <div className="flex justify-between text-muted-foreground"><span>Subtotal:</span> <span className="font-mono text-[12px]">{formatRupiah(subtotal)}</span></div>
                <div className="flex justify-between text-muted-foreground"><span>Ongkir:</span> <span className="font-mono text-[12px]">{formatRupiah(order.ongkir)}</span></div>
                <div className="flex justify-between font-bold text-[18px] text-foreground font-display mt-[12px] pt-[12px] border-t border-border">
                  <span>Total:</span> 
                  <span className="text-terracotta leading-none">{formatRupiah(total)}</span>
                </div>
              </div>
            </div>

            {!isReadOnly && order.status_bayar !== 'CANCELLED' && (
              <div className="p-[20px] border-t border-border bg-card flex gap-[12px]">
                <Button 
                  variant="outline"
                  onClick={() => setIsEditMode(true)}
                  className="w-1/2"
                >
                  Edit Pesanan
                </Button>
                <Button 
                  variant="destructive"
                  onClick={() => setIsCancelModalOpen(true)}
                  className="w-1/2"
                >
                  Batalkan
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 overflow-y-auto p-[20px] bg-background">
            <ReviewForm 
              isEditMode={true}
              session={session}
              refreshSessionData={refreshSessionData}
              onDiscard={() => setIsEditMode(false)}
              initialData={{
                id_order: order.id_order,
                nama_pelanggan: order.nama_pelanggan,
                alamat: order.alamat,
                area_tag: order.area_tag,
                jadwal_kirim_request: order.jadwal_kirim_request,
                matched_slot: order.delivery_slots ? { id_slot: order.id_slot, jadwal_teks: order.delivery_slots.jadwal_teks } : null,
                metode_bayar: order.metode_bayar,
                ongkir: order.ongkir,
                ongkir_rule: order.ongkir_rule,
                items: items.map(i => ({ ...i, _unmatched: false }))
              }}
            />
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={isCancelModalOpen}
        title="Batalkan Pesanan?"
        body="Pesanan akan dibatalkan permanen dan tidak akan masuk ke perhitungan finansial. Lanjutkan?"
        confirmText="Ya, Batalkan"
        onConfirm={() => {
          setIsCancelModalOpen(false);
          onCancelOrder(order.id_order);
        }}
        onCancel={() => setIsCancelModalOpen(false)}
      />
    </>
  );
}
