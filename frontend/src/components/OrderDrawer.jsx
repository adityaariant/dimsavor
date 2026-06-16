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
      <div className="fixed inset-0 z-40 bg-black bg-opacity-30 transition-opacity" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white shadow-xl flex flex-col transform transition-transform">
        <div className="p-4 border-b flex justify-between items-center bg-gray-50">
          <h2 className="text-lg font-bold text-gray-800">Pesanan #{order.id_order} — {order.nama_pelanggan}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800 text-2xl leading-none">&times;</button>
        </div>
        
        {!isEditMode ? (
          <>
            <div className="flex-1 overflow-y-auto p-6 space-y-6 text-sm">
              <div className="space-y-3 bg-gray-50 p-4 rounded-lg border">
                <div className="grid grid-cols-3 text-gray-500"><span className="col-span-1">Alamat:</span> <span className="col-span-2 text-gray-900 font-medium">{order.alamat}</span></div>
                <div className="grid grid-cols-3 text-gray-500"><span className="col-span-1">Area:</span> <span className="col-span-2 text-gray-900">{order.area_tag || '-'}</span></div>
                <div className="grid grid-cols-3 text-gray-500"><span className="col-span-1">Jadwal:</span> <span className="col-span-2 text-gray-900">{order.delivery_slots?.jadwal_teks || order.jadwal_kirim_request || 'Tanpa Jadwal'}</span></div>
                <div className="grid grid-cols-3 text-gray-500"><span className="col-span-1">Metode:</span> <span className="col-span-2 text-gray-900">{order.metode_bayar || 'QRIS'}</span></div>
                <div className="grid grid-cols-3 text-gray-500"><span className="col-span-1">Ongkir:</span> <span className="col-span-2 text-gray-900">{formatRupiah(order.ongkir)} <span className="text-xs text-gray-400">({order.ongkir_rule || '-'})</span></span></div>
              </div>

              <div className="border-t pt-4">
                <table className="w-full">
                  <tbody>
                    {items.map((item, idx) => (
                      <tr key={idx} className="border-b last:border-0 border-gray-100">
                        <td className="py-2 text-gray-800 font-medium">
                          {item.nama_produk} 
                          {item.topping && <div className="text-xs text-gray-500 font-normal">Topping: {item.topping}</div>}
                        </td>
                        <td className="py-2 text-center text-gray-600">x{item.qty}</td>
                        <td className="py-2 text-right text-gray-800">{formatRupiah(item.subtotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="border-t pt-4 space-y-2 text-right">
                <div className="flex justify-between text-gray-600"><span>Subtotal:</span> <span>{formatRupiah(subtotal)}</span></div>
                <div className="flex justify-between text-gray-600"><span>Ongkir:</span> <span>{formatRupiah(order.ongkir)}</span></div>
                <div className="flex justify-between font-bold text-lg text-gray-900 mt-2 pt-2 border-t border-gray-200"><span>Total:</span> <span className="text-orange-600">{formatRupiah(total)}</span></div>
              </div>
            </div>

            {!isReadOnly && order.status_bayar !== 'CANCELLED' && (
              <div className="p-4 border-t bg-gray-50 flex gap-2">
                <button 
                  onClick={() => setIsEditMode(true)}
                  className="w-1/2 py-2 bg-white border border-gray-300 text-gray-700 font-medium rounded hover:bg-gray-50 transition-colors"
                >
                  Edit Pesanan
                </button>
                <button 
                  onClick={() => setIsCancelModalOpen(true)}
                  className="w-1/2 py-2 bg-red-100 text-red-700 font-medium rounded hover:bg-red-200 transition-colors"
                >
                  Batalkan
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
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
