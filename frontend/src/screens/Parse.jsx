import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { apiFetch } from '../api/client';
import ReviewForm from './ReviewForm';

export default function Parse() {
  const { selectedSession: session, isReadOnly, refreshSessionData } = useOutletContext();
  const [rawText, setRawText] = useState('');
  const [parsedData, setParsedData] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleParse = async () => {
    if (!session) return alert("Belum ada sesi PO");
    if (isReadOnly) return alert("Sesi sudah ditutup, tidak bisa menambah pesanan");
    if (!rawText.trim()) return;
    
    setLoading(true);
    try {
      const result = await apiFetch('/parse', {
        method: 'POST',
        body: JSON.stringify({ raw_text: rawText, id_po: session.id_po })
      });
      setParsedData(result);
    } catch (err) {
      alert("Gagal mem-parsing pesanan: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (session === null && !loading) {
    return (
      <div className="p-4 md:p-8">
        <div className="skeleton h-8 w-1/4 mb-6"></div>
        <div className="skeleton h-64 w-full"></div>
      </div>
    );
  }

  const templateText = `Nama: \nPesanan: \nAlamat: \nWaktu: \nBayar: `;
  
  const handleCopyTemplate = () => {
    navigator.clipboard.writeText(templateText);
    alert("Template disalin ke clipboard!");
  };

  return (
    <div className="max-w-6xl mx-auto space-y-[24px] h-full flex flex-col">
      <h1 className="text-[24px] font-semibold text-[var(--text-primary)] font-['Space_Grotesk']">Smart Order Parser</h1>
      
      <div className="flex flex-col lg:flex-row gap-[24px] flex-1 min-h-0">
        {/* Input Panel */}
        <div className="card flex flex-col w-full lg:w-1/2 p-[20px]">
          <div className="flex justify-between items-center mb-[12px]">
            <h2 className="font-medium text-[var(--text-secondary)] font-['Inter'] text-[14px]">Input Chat WA</h2>
            <button 
              onClick={handleCopyTemplate}
              className="text-[12px] text-[var(--amber)] hover:underline font-medium flex items-center gap-[4px]"
            >
              📋 Salin Template
            </button>
          </div>
          <textarea
            className="form-input flex-1 resize-none font-['JetBrains_Mono'] text-[13px] leading-relaxed p-[16px] mb-[16px]"
            placeholder="Paste chat WA di sini..."
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
          />
          <button 
            onClick={handleParse} 
            disabled={loading || !rawText.trim()}
            className="btn-primary w-full h-[44px]"
          >
            {loading ? 'Memproses...' : 'Parse Teks'}
          </button>
        </div>

        {/* Result Panel */}
        <div className="card w-full lg:w-1/2 flex flex-col p-[20px] overflow-y-auto">
          <h2 className="font-medium text-[var(--text-secondary)] font-['Inter'] text-[14px] mb-[16px]">Hasil Parsing</h2>
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
            <div className="flex-1 border-2 border-dashed border-[var(--border)] rounded-[6px] flex flex-col items-center justify-center text-[var(--text-disabled)] p-[32px] text-center font-['Inter'] text-[13px]">
              <span className="text-[48px] mb-[16px] opacity-50">🤖</span>
              <p>Hasil parsing akan muncul di sini.</p>
              <p className="mt-[8px]">Periksa kembali sebelum menyimpannya ke database.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
