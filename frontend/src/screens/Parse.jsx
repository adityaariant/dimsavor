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
    return <div className="p-8">Memuat sesi...</div>;
  }

  const templateText = `Nama: \nPesanan: \nAlamat: \nWaktu: \nBayar: `;
  
  const handleCopyTemplate = () => {
    navigator.clipboard.writeText(templateText);
    alert("Template disalin ke clipboard!");
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Smart Order Parser</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start h-[calc(100vh-8rem)]">
        {/* Input Panel */}
        <div className="bg-white rounded-lg shadow-sm border p-4 flex flex-col h-full">
          <div className="flex justify-between items-center mb-2">
            <h2 className="font-medium text-gray-700">Input Chat WA</h2>
            <button 
              onClick={handleCopyTemplate}
              className="text-xs text-orange-600 hover:text-orange-800 font-medium flex items-center gap-1"
            >
              📋 Salin Template
            </button>
          </div>
          <textarea
            className="flex-1 w-full border rounded-md p-3 focus:outline-none focus:ring focus:border-orange-500 font-mono text-sm resize-none"
            placeholder="Paste chat WA di sini..."
            value={rawText}
            onChange={e => setRawText(e.target.value)}
          />
          <div className="mt-3 text-xs text-gray-500 bg-gray-50 p-3 rounded border font-mono">
            <strong className="text-gray-700 font-sans block mb-1">💡 Contoh Format yang Baik:</strong>
            Nama: Budi<br/>
            Pesanan: 2x Mentai, 1x BAdil<br/>
            Alamat: Perumahan ITS Blok U<br/>
            Waktu: Kamis 18 Juni 10.00-14.00<br/>
            Bayar: QRIS
          </div>
          <div className="mt-4 flex justify-end">
            <button
              onClick={handleParse}
              disabled={loading || !rawText.trim() || isReadOnly}
              className="bg-orange-600 text-white px-6 py-2 rounded shadow font-medium hover:bg-orange-700 disabled:bg-gray-300"
            >
              {loading ? 'Menganalisis...' : 'Parse →'}
            </button>
          </div>
        </div>

        {/* Review Form Panel */}
        <div className="bg-white rounded-lg shadow-sm border p-4 h-full overflow-hidden flex flex-col">
          {parsedData ? (
            <ReviewForm 
              initialData={parsedData} 
              session={session} 
              onDiscard={() => setParsedData(null)}
              refreshSessionData={refreshSessionData}
            />
          ) : (
            <div className="h-full flex items-center justify-center text-gray-400 flex-col">
              <svg className="w-16 h-16 mb-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p>Hasil parsing akan muncul di sini</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
