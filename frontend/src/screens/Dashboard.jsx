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
import { useToast } from '../contexts/ToastContext';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";

export default function Dashboard() {
  const { selectedSession: session, isReadOnly, refreshSessions, refreshSessionData, sessionData, updateLocalOrder } = useOutletContext();
  const { showToast } = useToast();
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
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setCurrentPage(1);
  }, [filter, slotFilter, search]);

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
      <div className="p-8 text-center max-w-lg mx-auto mt-20">
        <Card className="p-10 border-dashed border-2">
          <CardHeader>
            <CardTitle className="text-[20px] font-bold font-display">Belum ada sesi PO aktif</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[14px] text-muted-foreground mb-6 font-sans font-light">Buat sesi PO baru terlebih dahulu untuk mulai menerima pesanan.</p>
            <Button onClick={() => navigate('/sessions')}>
              Ke Manajemen Sesi
            </Button>
          </CardContent>
        </Card>
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
      showToast(err.message, "error");
    }
  };

  const handleParse = async () => {
    if (isReadOnly) {
      showToast("Sesi sudah ditutup, tidak bisa menambah pesanan", "error");
      return;
    }
    if (!rawText.trim()) return;
    
    setParsing(true);
    try {
      const result = await apiFetch('/parse', {
        method: 'POST',
        body: JSON.stringify({ raw_text: rawText, id_po: session.id_po })
      });
      setParsedData(result);
    } catch (err) {
      showToast("Gagal mem-parsing pesanan: " + err.message, "error");
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
      showToast("Gagal update status bayar", "error");
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
      showToast("Gagal update status kirim", "error");
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
      showToast("Gagal membatalkan pesanan", "error");
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

  // Filter items based on filtered orders
  const filteredOrderIds = new Set(filteredOrders.map(o => o.id_order));
  const filteredItems = items.filter(i => filteredOrderIds.has(i.id_order));

  // Calculations
  const unpaidOrders = orders.filter(o => o.status_bayar === 'UNPAID');
  const hasUnpaid = unpaidOrders.length > 0;
  
  const totalUnpaid = unpaidOrders.reduce((sum, order) => {
    const orderItems = items.filter(i => i.id_order === order.id_order);
    const subtotal = orderItems.reduce((s, i) => s + i.subtotal, 0);
    return sum + subtotal + order.ongkir;
  }, 0);

  // Correct Quota Calculation using utility (follows active filters)
  const quotaUsed = countDimsumBoxesDecomposed(filteredItems);

  // Detailed 7-Metrik Production Summary Breakdown (follows active filters)
  const prodSummary = calculateProductionSummary(filteredItems);

  const getShortCode = (item) => {
    // Search kitchen aliases for exact kitchen_code
    const found = kitchen.aliases?.find(a => a.nama_produk_baku === item.nama_produk);
    if (found) {
      return `${item.qty}${found.kitchen_code}`;
    }
    
    // Fallback logic
    const nameLower = item.nama_produk.toLowerCase();
    
    if (nameLower.includes('sweet')) return `${item.qty}BS`;
    if (nameLower.includes('adil')) return `${item.qty}BD`;
    
    if (nameLower.includes('bacar')) {
      if (nameLower.includes('besar') || nameLower.includes('150ml') || nameLower.includes('bb')) {
        return `${item.qty}bB`;
      }
      return `${item.qty}bk`;
    }
    
    if (nameLower.includes('mentai')) {
      if (nameLower.includes('4pcs') || nameLower.includes('4 pcs')) {
        return `${item.qty}M4`;
      }
      if (nameLower.includes('6pcs') || nameLower.includes('6 pcs')) {
        return `${item.qty}M6`;
      }
      return `${item.qty}M`;
    }
    
    if (nameLower.includes('original')) {
      return `${item.qty}O`;
    }
    
    return `${item.qty}`;
  };

  return (
    <div className="max-w-7xl mx-auto space-y-[24px]">
      
      {/* Header Sesi */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-[28px] font-bold text-foreground font-display tracking-tight flex items-baseline">
            Dashboard 
            <span className="text-muted-foreground font-normal text-[22px] italic ml-2 font-sans">PO-{session.id_po}</span>
          </h1>
        </div>
        
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost"
            size="sm"
            onClick={refreshSessionData}
            title="Refresh Data"
            aria-label="Refresh Data"
            className="rounded-full h-[32px] px-4 flex items-center gap-2 text-[12px] text-muted-foreground"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </Button>
          
          {!isReadOnly && (
            <div className="relative group inline-block">
              <Button
                variant={hasUnpaid ? "outline" : "destructive"}
                onClick={() => setIsCloseModalOpen(true)}
                disabled={hasUnpaid}
                className="flex items-center gap-[6px] h-[36px] px-[16px] rounded-[6px] font-sans font-medium text-[13px]"
              >
                <Lock className="w-4 h-4" />
                Close Batch
              </Button>
              {hasUnpaid && (
                <div className="absolute top-full right-0 mt-2 w-48 p-[12px] bg-popover border border-border text-popover-foreground text-[12px] rounded-[6px] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-xl">
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
        <Card className="lg:col-span-6 flex flex-col justify-between p-[16px]">
          <div>
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-sans font-semibold text-[11px] uppercase tracking-widest text-muted-foreground">Ringkasan Produksi</h3>
              <span className="text-[10px] text-muted-foreground font-sans">
                Kuota Terpakai: <span className="text-foreground font-bold">{quotaUsed}</span> / {session.kuota_maksimal} box
              </span>
            </div>
            
            {/* Grid Breakdown */}
            <div className="grid grid-cols-3 gap-[10px]">
              <div className="bg-amber/10 rounded-[8px] p-3 text-center flex flex-col justify-center min-h-[90px]">
                <div className="text-[10px] text-terracotta font-bold font-sans mb-1">Box Mentai</div>
                <div className="text-[20px] font-bold text-terracotta font-mono leading-none">{prodSummary.box_mentai} <span className="text-[10px] font-medium text-terracotta">box</span></div>
                <div className="text-[10px] text-terracotta font-medium font-sans mt-1">({prodSummary.pcs_mentai} pcs)</div>
              </div>
              <div className="bg-sage/10 rounded-[8px] p-3 text-center flex flex-col justify-center min-h-[90px]">
                <div className="text-[10px] text-sage font-bold font-sans mb-1">Box Original</div>
                <div className="text-[20px] font-bold text-sage font-mono leading-none">{prodSummary.box_ori} <span className="text-[10px] font-medium text-sage">box</span></div>
                <div className="text-[10px] text-sage font-medium font-sans mt-1">({prodSummary.pcs_ori} pcs)</div>
              </div>
              <div className="bg-blue-900/10 rounded-[8px] p-3 text-center flex flex-col justify-center min-h-[90px]">
                <div className="text-[10px] text-blue-900 font-bold font-sans mb-1">Box Mix</div>
                <div className="text-[20px] font-bold text-blue-900 font-mono leading-none">{prodSummary.box_mix} <span className="text-[10px] font-medium text-blue-900">box</span></div>
                <div className="text-[10px] text-blue-900 font-medium font-sans mt-1">({prodSummary.box_mix * 3} O / {prodSummary.box_mix * 3} M)</div>
              </div>
            </div>
          </div>
          
          <div className="mt-3 pt-3 border-t border-border flex justify-between items-center">
            <span className="text-[11px] text-muted-foreground font-medium">Cup Bacar:</span>
            <div className="flex gap-4">
              <span className="text-[12px] font-medium text-foreground">
                Bacar Besar (BB): <span className="text-amber font-mono">{prodSummary.cup_bb}</span> cup
              </span>
              <span className="text-[12px] font-medium text-foreground">
                Bacar Kecil (BK): <span className="text-amber font-mono">{prodSummary.cup_bk}</span> cup
              </span>
            </div>
          </div>
        </Card>

        <div className="lg:col-span-3 flex">
          <SummaryCard 
            title="Tagihan UNPAID" 
            value={formatRupiah(totalUnpaid)} 
            subLabel={`${unpaidOrders.length} pesanan belum lunas`} 
            variant="default"
          />
        </div>

        {/* Est Laba Bersih */}
        <div className="lg:col-span-3 flex">
          <SummaryCard 
            title="Est. Laba Bersih" 
            value={formatRupiah(finance?.laba_bersih || 0)} 
            subLabel="Dari order yang sudah PAID" 
            variant="primary"
          />
        </div>

      </div>

      {/* Workspace Area: Parser vs Orders Table */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-[24px] items-start">
        
        {/* Kolom Kiri: Smart Order Parser / Review Form */}
        <div className="lg:col-span-5 space-y-[24px]">
          
          <Card className="flex flex-col min-h-[400px]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b border-border mb-4">
              <CardTitle className="font-bold text-foreground font-display text-[18px] flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-terracotta" />
                {parsedData ? 'Review & Simpan Pesanan' : 'Smart Order Parser'}
              </CardTitle>
              {!parsedData && !isReadOnly && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleManualOrderClick}
                  className="text-[11px] text-terracotta flex items-center gap-[4px] font-medium bg-terracotta/10 border-terracotta/20 hover:bg-terracotta/20 hover:text-terracotta h-7 px-2"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  Order Manual
                </Button>
              )}
            </CardHeader>

            <CardContent className="flex-1 flex flex-col pt-0">
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
                    <p className="text-[13px] text-muted-foreground mb-4 font-sans font-light">
                      Paste teks chat WhatsApp pesanan pelanggan di bawah ini untuk mendeteksi identitas, slot kirim, ongkir, dan item menu otomatis.
                    </p>
                    <Textarea
                      className="flex-1 resize-none font-mono text-[13px] leading-relaxed p-[12px] mb-[16px] min-h-[200px]"
                      placeholder="Contoh format chat:&#10;Nama: Budi&#10;Pesanan: 2 Box Mentai, 1bk&#10;Alamat: ITS Tekkim&#10;Waktu: Rabu 17 Juni Pagi"
                      value={rawText}
                      onChange={(e) => setRawText(e.target.value)}
                      disabled={isReadOnly}
                    />
                  </div>
                  
                  <Button 
                    onClick={handleParse} 
                    disabled={parsing || !rawText.trim() || isReadOnly}
                    className="w-full h-[44px] rounded-[10px] font-sans font-semibold text-[14px] flex items-center justify-center gap-2"
                  >
                    <FileText className="w-4 h-4" />
                    {parsing ? 'Memproses...' : 'Parse Teks Chat'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

        </div>

        {/* Kolom Kanan: Orders List Table */}
        <div className="lg:col-span-7 space-y-[20px]">
          
          <Card className="flex flex-col">
            <CardHeader className="flex flex-col gap-4 pb-4">
              
              {/* Header Kolom */}
              <div className="flex justify-between items-center">
                <CardTitle className="font-bold text-foreground font-display text-[18px] flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-terracotta" />
                  Daftar Pesanan
                </CardTitle>
                <span className="text-[11px] text-muted-foreground font-sans">
                  Menampilkan {filteredOrders.length} dari {orders.length} order
                </span>
              </div>

              {/* Baris Filter & Search */}
              <div className="flex flex-col gap-3">
                
                {/* Status Filter Buttons */}
                <div className="flex space-x-1 overflow-x-auto pb-1 hide-scrollbar">
                  {['Semua', 'UNPAID', 'PAID', 'PENDING', 'SENT', 'CANCELLED'].map(f => (
                    <Button 
                      key={f} 
                      variant={filter === f ? "default" : "outline"}
                      size="sm"
                      onClick={() => setFilter(f)}
                      className="h-7 text-[11px] rounded-[6px]"
                    >
                      {f}
                    </Button>
                  ))}
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  
                  {/* Slot Filter Dropdown */}
                  <Select value={slotFilter} onValueChange={setSlotFilter}>
                    <SelectTrigger className="flex-1 h-8 text-[12px]" aria-label="Filter by Jadwal Kirim">
                      <SelectValue placeholder="Jadwal Kirim" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Semua">Semua Jadwal Kirim</SelectItem>
                      <SelectItem value="Tanpa">Tanpa Jadwal Kirim</SelectItem>
                      {slots.map(s => (
                        <SelectItem key={s.id_slot} value={s.id_slot.toString()}>{s.jadwal_teks}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Search Input */}
                  <div className="relative w-full sm:w-48">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <Input 
                      type="text" 
                      placeholder="Cari pelanggan..." 
                      className="pl-8 h-8 text-[12px]"
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                    />
                  </div>

                </div>

              </div>

            </CardHeader>

            {/* Tabel Konten */}
            <CardContent className="pt-0 p-0 overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="w-[40px] text-[11px] font-medium uppercase tracking-wider text-muted-foreground">#</TableHead>
                      <TableHead className="w-[140px] text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Nama</TableHead>
                      <TableHead className="hidden md:table-cell text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Items</TableHead>
                      <TableHead className="w-[90px] text-center text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Total</TableHead>
                      <TableHead className="w-[70px] text-center text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Bayar</TableHead>
                      <TableHead className="w-[70px] text-center text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Kirim</TableHead>
                      <TableHead className="w-[32px] text-center"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOrders.slice((currentPage - 1) * 5, currentPage * 5).map(order => {
                      const orderItems = items.filter(i => i.id_order === order.id_order);
                      const totalAmount = orderItems.reduce((s, i) => s + (i.subtotal||0), 0) + order.ongkir;
                      const isCancelled = order.status_bayar === 'CANCELLED';
                      
                      const chipsToShow = orderItems.slice(0, 3);
                      const moreCount = orderItems.length - 3;

                      return (
                        <TableRow key={order.id_order} className={isCancelled ? 'opacity-40' : ''}>
                          <TableCell className="font-mono text-muted-foreground text-[11px]">{order.id_order}</TableCell>
                          <TableCell className={`text-[12px] font-medium ${isCancelled ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                            {order.nama_pelanggan}
                            {order.area_tag && (
                              <span className="md:hidden block text-[9px] text-muted-foreground uppercase">
                                [{order.area_tag}]
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <div className="flex flex-wrap gap-1 items-center">
                              {chipsToShow.map((item, idx) => (
                                <KitchenChip 
                                  key={idx} 
                                  code={getShortCode(item)} 
                                  isBacar={item.nama_produk.toLowerCase().includes('bacar')} 
                                />
                              ))}
                              {moreCount > 0 && (
                                <span className="text-[10px] text-muted-foreground ml-1">
                                  +{moreCount}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-[11px] text-center text-foreground">
                            {formatRupiah(totalAmount)}
                          </TableCell>
                          <TableCell className="text-center cursor-pointer" onClick={() => handleToggleBayar(order.id_order, order.status_bayar)}>
                            <StatusBadge status={order.status_bayar} />
                          </TableCell>
                          <TableCell className="text-center cursor-pointer" onClick={() => handleToggleKirim(order.id_order, order.status_kirim)}>
                            <StatusBadge status={order.status_kirim} />
                          </TableCell>
                          <TableCell className="text-center">
                            <Button 
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              aria-label="Lihat Detail Pesanan"
                              onClick={() => setSelectedOrder(order)} 
                            >
                              <ArrowRight className="w-3.5 h-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                    {filteredOrders.length === 0 && orders.length > 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="h-24 text-center text-muted-foreground text-[12px]">
                          Tidak ada pesanan yang sesuai dengan filter.
                        </TableCell>
                      </TableRow>
                    )}
                    {orders.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="h-32 text-center text-muted-foreground text-[12px]">
                          Belum ada pesanan di sesi ini. Gunakan parser di sebelah kiri untuk memulai.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination Controls */}
              {Math.ceil(filteredOrders.length / 5) > 1 && (
                <div className="flex justify-between items-center p-3 border-t border-border font-sans text-[12px]">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                    disabled={currentPage === 1}
                    className="h-7 text-[11px]"
                  >
                    ← Prev
                  </Button>
                  <span className="text-muted-foreground">
                    Halaman <span className="text-foreground font-semibold">{currentPage}</span> dari <span className="text-foreground font-semibold">{Math.ceil(filteredOrders.length / 5)}</span>
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(p + 1, Math.ceil(filteredOrders.length / 5)))}
                    disabled={currentPage === Math.ceil(filteredOrders.length / 5)}
                    className="h-7 text-[11px]"
                  >
                    Next →
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

        </div>

      </div>

      <OrderDrawer 
        isOpen={!!selectedOrder} 
        order={selectedOrder ? orders.find(o => o.id_order === selectedOrder.id_order) : null}
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
