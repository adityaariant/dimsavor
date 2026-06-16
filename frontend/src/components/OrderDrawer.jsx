import React, { useEffect } from 'react';
import { formatRupiah } from '../utils/format';
import ConfirmModal from './ConfirmModal';
import ReviewForm from '../screens/ReviewForm';

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
      <div className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm transition-opacity" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-[var(--bg-surface)] border-l border-[var(--border)] shadow-2xl flex flex-col transform transition-transform">
        <div className="p-[20px] border-b border-[var(--border)] flex justify-between items-center bg-[var(--bg-elevated)]">
          <h2 className="text-[18px] font-bold text-[var(--text-primary)] font-['Space_Grotesk']">
            Pesanan #{order.id_order} — {order.nama_pelanggan}
          </h2>
          <button onClick={onClose} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-2xl leading-none">&times;</button>
        </div>
        
        {!isEditMode ? (
          <>
            <div className="flex-1 overflow-y-auto p-[20px] space-y-[24px] text-[13px] font-['Inter']">
              <div className="space-y-[8px] bg-[var(--bg-muted)] p-[16px] rounded-[6px] border border-[var(--border)]">
                <div className="grid grid-cols-3 text-[var(--text-secondary)]"><span className="col-span-1">Alamat:</span> <span className="col-span-2 text-[var(--text-primary)] font-medium">{order.alamat}</span></div>
                <div className="grid grid-cols-3 text-[var(--text-secondary)]"><span className="col-span-1">Area:</span> <span className="col-span-2 text-[var(--text-primary)]">{order.area_tag || '-'}</span></div>
                <div className="grid grid-cols-3 text-[var(--text-secondary)]"><span className="col-span-1">Jadwal:</span> <span className="col-span-2 text-[var(--text-primary)]">{order.delivery_slots?.jadwal_teks || order.jadwal_kirim_request || 'Tanpa Jadwal'}</span></div>
                <div className="grid grid-cols-3 text-[var(--text-secondary)]"><span className="col-span-1">Metode:</span> <span className="col-span-2 text-[var(--text-primary)]">{order.metode_bayar || 'QRIS'}</span></div>
                <div className="grid grid-cols-3 text-[var(--text-secondary)]">
                  <span className="col-span-1">Ongkir:</span> 
                  <span className="col-span-2 text-[var(--text-primary)] font-['JetBrains_Mono'] text-[12px]">
                    {formatRupiah(order.ongkir)} <span className="text-[11px] text-[var(--text-disabled)] font-['Inter']">({order.ongkir_rule || '-'})</span>
                  </span>
                </div>
              </div>

              <div>
                <table className="w-full">
                  <tbody className="divide-y divide-[var(--border)]">
                    {items.map((item, idx) => (
                      <tr key={idx} className="">
                        <td className="py-[12px] text-[var(--text-primary)] font-medium">
                          {item.nama_produk} 
                          {item.topping && <div className="text-[11px] text-[var(--text-secondary)] font-normal mt-[4px]">Topping: {item.topping}</div>}
                        </td>
                        <td className="py-[12px] text-center text-[var(--text-secondary)] font-['JetBrains_Mono'] text-[12px]">x{item.qty}</td>
                        <td className="py-[12px] text-right text-[var(--text-primary)] font-['JetBrains_Mono'] text-[12px]">{formatRupiah(item.subtotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="border-t border-[var(--border)] pt-[16px] space-y-[8px] text-right">
                <div className="flex justify-between text-[var(--text-secondary)]"><span>Subtotal:</span> <span className="font-['JetBrains_Mono'] text-[12px]">{formatRupiah(subtotal)}</span></div>
                <div className="flex justify-between text-[var(--text-secondary)]"><span>Ongkir:</span> <span className="font-['JetBrains_Mono'] text-[12px]">{formatRupiah(order.ongkir)}</span></div>
                <div className="flex justify-between font-bold text-[18px] text-[var(--text-primary)] font-['Space_Grotesk'] mt-[12px] pt-[12px] border-t border-[var(--border)]">
                  <span>Total:</span> 
                  <span className="text-[var(--amber)] leading-none">{formatRupiah(total)}</span>
                </div>
              </div>
            </div>

            {!isReadOnly && order.status_bayar !== 'CANCELLED' && (
              <div className="p-[20px] border-t border-[var(--border)] bg-[var(--bg-elevated)] flex gap-[12px]">
                <button 
                  onClick={() => setIsEditMode(true)}
                  className="btn-secondary w-1/2"
                >
                  Edit Pesanan
                </button>
                <button 
                  onClick={() => setIsCancelModalOpen(true)}
                  className="btn-destructive w-1/2 bg-[var(--status-cancelled)]/10 text-[var(--status-cancelled)] border border-[var(--status-cancelled)] hover:bg-[var(--status-cancelled)]/20"
                >
                  Batalkan
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 overflow-y-auto p-[20px] bg-[var(--bg-surface)]">
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
