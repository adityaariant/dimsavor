import React, { useState, useEffect } from 'react';
import { useNavigate, useOutletContext, Link } from 'react-router-dom';
import { apiFetch } from '../api/client';
import SummaryCard from '../components/SummaryCard';
import ConfirmModal from '../components/ConfirmModal';
import StatusBadge from '../components/StatusBadge';
import OrderDrawer from '../components/OrderDrawer';
import KitchenChip from '../components/KitchenChip';
import ReviewForm from './ReviewForm';
import { formatRupiah } from '../utils/format';
import { countDimsumBoxesDecomposed, calculateProductionSummary } from '../utils/pricing';
import { Lock, Search, FileText, ShoppingBag, ArrowRight, RefreshCw, Sparkles, PlusCircle } from 'lucide-react';

export default function Dashboard() {
  const { selectedSession: session, isReadOnly, refreshSessions, refreshSessionData, sessionData, updateLocalOrder } = useOutletContext();
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
  const navigate = useNavigate();

  // Parser States
  const [rawText, setRawText] = useState('');
  const [parsedData, setParsedData] = useState(null);
  const [parsing, setParsing] = useState(false);

  // Orders Table States
  const [filter, setFilter] = useState('Semua');
  const [slotFilter, setSlotFilter] = useState('Semua');
  const [search, setSearch] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [slots, setSlots] = useState([]);

  useEffect(() => {
    if (session) {
      apiFetch(`/sessions/${session.id_po}/slots`)
        .then(data => setSlots(data))
        .catch(err => console.error("Failed to load slots", err));
    }
  }, [session?.id_po]);

  if (sessionData.loading) return (
    <div className="p-4 md:p-8">
      <div className="skeleton h-8 w-1/4 mb-6"></div>
      <div className="flex gap-4 mb-6">
        <div className="skeleton h-24 w-1/3"></div>
        <div className="skeleton h-24 w-1/3"></div>
        <div className="skeleton h-24 w-1/3"></div>
      </div>
      <div className="skeleton h-64 w-full"></div>
    </div>
  );

  if (!session) {
    return (
      <div className="p-8 text-center max-w-lg mx-auto mt-20 card p-[40px]">
        <h2 className="text-[20px] font-bold text-[var(--text-primary)] mb-[12px] font-['Space_Grotesk']">Belum ada sesi PO aktif</h2>
        <p className="text-[14px] text-[var(--text-secondary)] mb-[24px] font-['Inter'] font-light">Buat sesi PO baru terlebih dahulu untuk mulai menerima pesanan.</p>
        <button
          onClick={() => navigate('/sessions')}
          className="btn-primary"
        >
          Ke Manajemen Sesi
        </button>
      </div>
    );
  }

  const { orders, finance, kitchen } = sessionData;
  const items = kitchen.items || [];

  const handleCloseBatch = async () => {
    try {
      await apiFetch(`/finance/close?session_id=${session.id_po}`, { method: 'POST' });
      setIsCloseModalOpen(false);
      refreshSessions();
      navigate('/finance');
    } catch (err) {
      alert(err.message);
    }
  };

  const handleParse = async () => {
    if (isReadOnly) return alert("Sesi sudah ditutup, tidak bisa menambah pesanan");
    if (!rawText.trim()) return;
    
    setParsing(true);
    try {
      const result = await apiFetch('/parse', {
        method: 'POST',
        body: JSON.stringify({ raw_text: rawText, id_po: session.id_po })
      });
      setParsedData(result);
    } catch (err) {
      alert("Gagal mem-parsing pesanan: " + err.message);
    } finally {
      setParsing(false);
    }
  };

  const handleToggleBayar = async (id_order, currentStatus) => {
    if (isReadOnly || currentStatus === 'CANCELLED') return;
    const newStatus = currentStatus === 'UNPAID' ? 'PAID' : 'UNPAID';
    
    updateLocalOrder(id_order, { status_bayar: newStatus });
    
    try {
      await apiFetch(`/orders/${id_order}/pay`, { method: 'PATCH' });
      refreshSessionData();
    } catch (err) {
      alert("Gagal update status bayar");
      updateLocalOrder(id_order, { status_bayar: currentStatus });
    }
  };

  const handleToggleKirim = async (id_order, currentStatus) => {
    if (isReadOnly || currentStatus === 'CANCELLED') return;
    const newStatus = currentStatus === 'PENDING' ? 'SENT' : 'PENDING';
    
    updateLocalOrder(id_order, { status_kirim: newStatus });
    
    try {
      await apiFetch(`/orders/${id_order}/send`, { method: 'PATCH' });
      refreshSessionData();
    } catch (err) {
      alert("Gagal update status kirim");
      updateLocalOrder(id_order, { status_kirim: currentStatus });
    }
  };

  const handleCancelOrder = async (id_order) => {
    if (isReadOnly) return;
    try {
      await apiFetch(`/orders/${id_order}/cancel`, { method: 'PATCH' });
      await refreshSessionData();
      setSelectedOrder(null);
    } catch (err) {
      alert("Gagal membatalkan pesanan");
    }
  };

  const handleManualOrderClick = () => {
    // Prefill an empty ReviewFormObject for manual creation
    const emptyForm = {
      nama_pelanggan: '',
      alamat: '',
      area_tag: 'Lainnya',
      jadwal_kirim_request: '',
      matched_slot: null,
      metode_bayar: 'QRIS',
      ongkir: 2000,
      ongkir_rule: 'Flat',
      items: [],
      total: 2000,
      quota_impact: 0,
      unmatched_tokens: []
    };
    setParsedData(emptyForm);
  };

  // Calculations
  const unpaidOrders = orders.filter(o => o.status_bayar === 'UNPAID');
  const hasUnpaid = unpaidOrders.length > 0;
  
  const totalUnpaid = unpaidOrders.reduce((sum, order) => {
    const orderItems = items.filter(i => i.id_order === order.id_order);
    const subtotal = orderItems.reduce((s, i) => s + i.subtotal, 0);
    return sum + subtotal + order.ongkir;
  }, 0);

  // Correct Quota Calculation using utility
  const quotaUsed = countDimsumBoxesDecomposed(items);

  // Detailed 7-Metrik Production Summary Breakdown
  const prodSummary = calculateProductionSummary(items);

  // Filtering orders
  const filteredOrders = orders.filter(o => {
    if (filter === 'UNPAID' || filter === 'PAID') return o.status_bayar === filter;
    if (filter === 'PENDING' || filter === 'SENT') return o.status_kirim === filter;
    if (filter === 'CANCELLED') return o.status_bayar === 'CANCELLED';
    return true;
  }).filter(o => {
    if (slotFilter === 'Semua') return true;
    if (slotFilter === 'Tanpa') return !o.id_slot;
    return o.id_slot === Number(slotFilter);
  }).filter(o => o.nama_pelanggan.toLowerCase().includes(search.toLowerCase()));

  const getShortCode = (item) => {
    const isBacar = item.nama_produk.toLowerCase().includes('bacar');
    const isMentai = item.nama_produk.toLowerCase().includes('mentai');
    let type = isBacar ? 'bk' : (isMentai ? 'M' : 'O');
    return `${item.qty}${type}`;
  };

  return (
    <div className="max-w-7xl mx-auto space-y-[24px]">
      
      {/* Header Sesi */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-[24px] font-semibold text-[var(--text-primary)] font-['Space_Grotesk']">
            Dashboard
            <span className="text-[var(--text-secondary)] font-normal text-[18px] ml-2">(PO-{session.id_po})</span>
          </h1>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={refreshSessionData}
            title="Refresh Data"
            className="btn-secondary p-2 rounded-[6px] h-[36px] w-[36px] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          
          {!isReadOnly && (
            <div className="relative group inline-block">
              <button
                onClick={() => setIsCloseModalOpen(true)}
                disabled={hasUnpaid}
                className={`flex items-center gap-[6px] h-[36px] px-[16px] rounded-[6px] font-['Inter'] font-medium text-[13px] transition-colors ${
                  hasUnpaid 
                    ? 'bg-[var(--bg-muted)] text-[var(--text-disabled)] cursor-not-allowed border border-[var(--border)]' 
                    : 'bg-[var(--status-cancelled)] text-white hover:bg-red-700'
                }`}
              >
                <Lock className="w-4 h-4" />
                Close Batch
              </button>
              {hasUnpaid && (
                <div className="absolute top-full right-0 mt-2 w-48 p-[12px] bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-primary)] text-[12px] rounded-[6px] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-xl">
                  Ada pesanan UNPAID. Lunasin dulu sebelum tutup batch.
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Baris Ringkasan Utama */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-[16px]">
        
        {/* Ringkasan Produksi Premium (Breakdown 7-Metrik) */}
        <div className="lg:col-span-6 card p-[16px] flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-['Space_Grotesk'] font-bold text-[13px] uppercase tracking-wider text-[var(--text-secondary)]">Ringkasan Produksi</h3>
              <span className="text-[11px] text-[var(--text-secondary)] font-['Inter']">
                Kuota Terpakai: <span className="text-[var(--text-primary)] font-semibold">{quotaUsed}</span> / {session.kuota_maksimal} box
              </span>
            </div>
            
            {/* Grid Breakdown */}
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-[#181612] border border-[var(--border)] rounded-[4px] p-2 text-center">
                <div className="text-[10px] text-[var(--text-secondary)] font-medium">Box Mentai</div>
                <div className="text-[15px] font-bold text-[var(--amber)] font-['JetBrains_Mono']">{prodSummary.box_mentai} <span className="text-[10px] font-normal text-[var(--text-secondary)]">box</span></div>
                <div className="text-[9px] text-[var(--text-disabled)] font-['Inter']">({prodSummary.pcs_mentai} pcs)</div>
              </div>
              <div className="bg-[#181612] border border-[var(--border)] rounded-[4px] p-2 text-center">
                <div className="text-[10px] text-[var(--text-secondary)] font-medium">Box Original</div>
                <div className="text-[15px] font-bold text-[#34D399] font-['JetBrains_Mono']">{prodSummary.box_ori} <span className="text-[10px] font-normal text-[var(--text-secondary)]">box</span></div>
                <div className="text-[9px] text-[var(--text-disabled)] font-['Inter']">({prodSummary.pcs_ori} pcs)</div>
              </div>
              <div className="bg-[#181612] border border-[var(--border)] rounded-[4px] p-2 text-center">
                <div className="text-[10px] text-[var(--text-secondary)] font-medium">Box Mix</div>
                <div className="text-[15px] font-bold text-[#60A5FA] font-['JetBrains_Mono']">{prodSummary.box_mix} <span className="text-[10px] font-normal text-[var(--text-secondary)]">box</span></div>
                <div className="text-[9px] text-[var(--text-disabled)] font-['Inter']">({prodSummary.box_mix * 3} O / {prodSummary.box_mix * 3} M)</div>
              </div>
            </div>
          </div>
          
          <div className="mt-3 pt-3 border-t border-[var(--border)] flex justify-between items-center">
            <span className="text-[11px] text-[var(--text-secondary)] font-medium">Cup Bacar:</span>
            <div className="flex gap-4">
              <span className="text-[12px] font-medium text-[var(--text-primary)]">
                Bacar Besar (BB): <span className="text-[var(--amber)] font-['JetBrains_Mono']">{prodSummary.cup_bb}</span> cup
              </span>
              <span className="text-[12px] font-medium text-[var(--text-primary)]">
                Bacar Kecil (BK): <span className="text-[var(--amber)] font-['JetBrains_Mono']">{prodSummary.cup_bk}</span> cup
              </span>
            </div>
          </div>
        </div>

        {/* Tagihan UNPAID */}
        <div className="lg:col-span-3 flex">
          <SummaryCard 
            title="Tagihan UNPAID" 
            value={formatRupiah(totalUnpaid)} 
            subLabel={`${unpaidOrders.length} pesanan belum lunas`} 
          />
        </div>

        {/* Est Laba Bersih */}
        <div className="lg:col-span-3 flex">
          <SummaryCard 
            title="Est. Laba Bersih" 
            value={formatRupiah(finance?.laba_bersih || 0)} 
            subLabel="Dari order yang sudah PAID" 
          />
        </div>

      </div>

      {/* Workspace Area: Parser vs Orders Table */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-[24px] items-start">
        
        {/* Kolom Kiri: Smart Order Parser / Review Form */}
        <div className="lg:col-span-5 space-y-[24px]">
          
          <div className="card p-[20px] flex flex-col min-h-[400px]">
            <div className="flex justify-between items-center mb-[16px] border-b border-[var(--border)] pb-[12px]">
              <h2 className="font-bold text-[var(--text-primary)] font-['Space_Grotesk'] text-[15px] flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[var(--amber)]" />
                {parsedData ? 'Review & Simpan Pesanan' : 'Smart Order Parser'}
              </h2>
              {!parsedData && !isReadOnly && (
                <button
                  onClick={handleManualOrderClick}
                  className="text-[11px] text-[var(--amber)] hover:underline flex items-center gap-[4px] font-medium bg-[#3D2A08] border border-[#7A520F] px-2 py-1 rounded"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  Order Manual
                </button>
              )}
            </div>

            {parsedData ? (
              <ReviewForm 
                initialData={parsedData} 
                session={session}
                onDiscard={() => setParsedData(null)}
                refreshSessionData={() => {
                  setParsedData(null);
                  setRawText('');
                  refreshSessionData();
                }}
              />
            ) : (
              <div className="flex-1 flex flex-col justify-between">
                <div className="flex-1 flex flex-col">
                  <p className="text-[12px] text-[var(--text-secondary)] mb-2 font-['Inter'] font-light">
                    Paste teks chat WhatsApp pesanan pelanggan di bawah ini untuk mendeteksi identitas, slot kirim, ongkir, dan item menu otomatis.
                  </p>
                  <textarea
                    className="form-input flex-1 resize-none font-['JetBrains_Mono'] text-[13px] leading-relaxed p-[12px] mb-[16px] min-h-[200px]"
                    placeholder="Contoh format chat:&#10;Nama: Budi&#10;Pesanan: 2 Box Mentai, 1bk&#10;Alamat: ITS Tekkim&#10;Waktu: Rabu 17 Juni Pagi"
                    value={rawText}
                    onChange={(e) => setRawText(e.target.value)}
                    disabled={isReadOnly}
                  />
                </div>
                
                <button 
                  onClick={handleParse} 
                  disabled={parsing || !rawText.trim() || isReadOnly}
                  className="btn-primary w-full h-[40px] flex items-center justify-center gap-2"
                >
                  <FileText className="w-4 h-4" />
                  {parsing ? 'Memproses...' : 'Parse Teks Chat'}
                </button>
              </div>
            )}
          </div>

        </div>

        {/* Kolom Kanan: Orders List Table */}
        <div className="lg:col-span-7 space-y-[20px]">
          
          <div className="card p-[20px]">
            <div className="flex flex-col gap-4 mb-4">
              
              {/* Header Kolom */}
              <div className="flex justify-between items-center">
                <h2 className="font-bold text-[var(--text-primary)] font-['Space_Grotesk'] text-[15px] flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-[var(--amber)]" />
                  Daftar Pesanan
                </h2>
                <span className="text-[11px] text-[var(--text-secondary)] font-['Inter']">
                  Menampilkan {filteredOrders.length} dari {orders.length} order
                </span>
              </div>

              {/* Baris Filter & Search */}
              <div className="flex flex-col gap-2">
                
                {/* Status Filter Buttons */}
                <div className="flex space-x-1 overflow-x-auto pb-1 hide-scrollbar">
                  {['Semua', 'UNPAID', 'PAID', 'PENDING', 'SENT', 'CANCELLED'].map(f => (
                    <button 
                      key={f} 
                      onClick={() => setFilter(f)}
                      className={`px-2.5 py-1 rounded-[4px] text-[11px] font-medium font-['Inter'] transition-colors whitespace-nowrap ${
                        filter === f 
                          ? 'bg-[var(--amber)] text-[#0D0C0A]' 
                          : 'bg-[#181612] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  
                  {/* Slot Filter Dropdown */}
                  <select
                    className="form-select flex-1 h-[34px] text-[12px] p-1 bg-[#181612] border border-[var(--border)] text-[#EDE9E0]"
                    value={slotFilter}
                    onChange={e => setSlotFilter(e.target.value)}
                  >
                    <option value="Semua">Semua Jadwal Kirim</option>
                    <option value="Tanpa">Tanpa Jadwal Kirim</option>
                    {slots.map(s => (
                      <option key={s.id_slot} value={s.id_slot}>{s.jadwal_teks}</option>
                    ))}
                  </select>

                  {/* Search Input */}
                  <div className="relative w-full sm:w-48">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-secondary)]" />
                    <input 
                      type="text" 
                      placeholder="Cari pelanggan..." 
                      className="form-input pl-8 h-[34px] text-[12px]"
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                    />
                  </div>

                </div>

              </div>

            </div>

            {/* Tabel Konten */}
            <div className="border border-[var(--border)] rounded-[6px] overflow-x-auto">
              <table className="min-w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[var(--bg-elevated)] border-b border-[var(--border)]">
                    <th className="px-[12px] py-[8px] text-[12px] font-medium text-[var(--text-secondary)] w-[40px]">#</th>
                    <th className="px-[12px] py-[8px] text-[12px] font-medium text-[var(--text-secondary)] w-[140px]">Nama</th>
                    <th className="px-[12px] py-[8px] text-[12px] font-medium text-[var(--text-secondary)] hidden md:table-cell">Items</th>
                    <th className="px-[12px] py-[8px] text-[12px] font-medium text-[var(--text-secondary)] w-[90px] text-right">Total</th>
                    <th className="px-[12px] py-[8px] text-[12px] font-medium text-[var(--text-secondary)] text-center w-[70px]">Bayar</th>
                    <th className="px-[12px] py-[8px] text-[12px] font-medium text-[var(--text-secondary)] text-center w-[70px]">Kirim</th>
                    <th className="px-[12px] py-[8px] w-[32px] text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {filteredOrders.map(order => {
                    const orderItems = items.filter(i => i.id_order === order.id_order);
                    const totalAmount = orderItems.reduce((s, i) => s + (i.subtotal||0), 0) + order.ongkir;
                    const isCancelled = order.status_bayar === 'CANCELLED';
                    
                    const chipsToShow = orderItems.slice(0, 3);
                    const moreCount = orderItems.length - 3;

                    return (
                      <tr key={order.id_order} className={`table-row ${isCancelled ? 'opacity-40' : ''}`}>
                        <td className="px-[12px] py-[10px] font-['JetBrains_Mono'] text-[var(--text-secondary)] text-[11px]">{order.id_order}</td>
                        <td className={`px-[12px] py-[10px] text-[12px] font-medium ${isCancelled ? 'line-through text-[var(--text-secondary)]' : 'text-[var(--text-primary)]'}`}>
                          {order.nama_pelanggan}
                          {order.area_tag && (
                            <span className="md:hidden block text-[9px] text-[var(--text-secondary)] uppercase">
                              [{order.area_tag}]
                            </span>
                          )}
                        </td>
                        <td className="px-[12px] py-[10px] hidden md:table-cell">
                          <div className="flex flex-wrap gap-1 items-center">
                            {chipsToShow.map((item, idx) => (
                              <KitchenChip 
                                key={idx} 
                                code={getShortCode(item)} 
                                isBacar={item.nama_produk.toLowerCase().includes('bacar')} 
                              />
                            ))}
                            {moreCount > 0 && (
                              <span className="text-[10px] text-[var(--text-secondary)] ml-1">
                                +{moreCount}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-[12px] py-[10px] font-['JetBrains_Mono'] text-[11px] text-right">
                          {formatRupiah(totalAmount)}
                        </td>
                        <td className="px-[12px] py-[10px] text-center cursor-pointer" onClick={() => handleToggleBayar(order.id_order, order.status_bayar)}>
                          <StatusBadge status={order.status_bayar} />
                        </td>
                        <td className="px-[12px] py-[10px] text-center cursor-pointer" onClick={() => handleToggleKirim(order.id_order, order.status_kirim)}>
                          <StatusBadge status={order.status_kirim} />
                        </td>
                        <td className="px-[12px] py-[10px] text-center">
                          <button 
                            onClick={() => setSelectedOrder(order)} 
                            className="btn-icon p-1"
                          >
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                  {filteredOrders.length === 0 && orders.length > 0 && (
                    <tr>
                      <td colSpan="7" className="px-[12px] py-8 text-center text-[var(--text-secondary)] text-[12px]">
                        Tidak ada pesanan yang sesuai dengan filter.
                      </td>
                    </tr>
                  )}
                  {orders.length === 0 && (
                    <tr>
                      <td colSpan="7" className="px-[12px] py-12 text-center">
                        <span className="text-[var(--text-secondary)] text-[12px]">
                          Belum ada pesanan di sesi ini. Gunakan parser di sebelah kiri untuk memulai.
                        </span>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

          </div>

        </div>

      </div>

      <OrderDrawer 
        isOpen={!!selectedOrder} 
        order={selectedOrder} 
        items={selectedOrder ? items.filter(i => i.id_order === selectedOrder.id_order) : []}
        onClose={() => setSelectedOrder(null)}
        onCancelOrder={handleCancelOrder}
        isReadOnly={isReadOnly}
        session={session}
        refreshSessionData={refreshSessionData}
      />

      <ConfirmModal
        isOpen={isCloseModalOpen}
        title="Tutup Batch PO?"
        body="Tindakan ini tidak bisa dibatalkan. Semua data akan dikunci. Pastikan semua orderan dan pengeluaran sudah final."
        confirmText="Ya, Tutup Batch"
        onConfirm={handleCloseBatch}
        onCancel={() => setIsCloseModalOpen(false)}
      />

    </div>
  );
}
