import React, { useState } from 'react';
import { Download } from 'lucide-react';

const ASSETS = [
  {
    id: 1,
    title: 'QRIS',
    category: 'Payment',
    url: '../../images/QRIS.jpeg',
    description: 'QRIS Dimsavor (BCA a.n Amara Dimsum)'
  },
  {
    id: 2,
    title: 'Poster',
    category: 'Marketing',
    url: '../../images/Poster.png',
    description: 'Poster untuk post'
  }
];

export default function Assets() {
  const [selectedAsset, setSelectedAsset] = useState(null);

  const handleDownload = (asset) => {
    // In a real scenario, this would trigger a download of the actual file
    // Since we're using placeholders, we'll just open in a new tab for now
    window.open(asset.url, '_blank');
  };

  return (
    <div className="max-w-6xl mx-auto space-y-[24px]">
      <div>
        <h1 className="text-[24px] font-semibold text-[var(--text-primary)] font-['Fraunces']">
          Assets Library
        </h1>
        <p className="text-[14px] text-[var(--text-secondary)] font-['Inter_Tight_Variable'] mt-[4px]">
          Kumpulan QRIS dan materi promosi.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[24px]">
        {ASSETS.map((asset) => (
          <div key={asset.id} className="card overflow-hidden p-0 flex flex-col group border-[var(--border)] shadow-soft rounded-[12px]">
            <div 
              className="relative aspect-square bg-[var(--bg-muted)] overflow-hidden cursor-pointer"
              onClick={() => setSelectedAsset(asset)}
            >
              <img 
                src={asset.url} 
                alt={asset.title}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <span className="text-white font-medium text-[13px] bg-black/50 px-[16px] py-[8px] rounded-[4px] backdrop-blur-sm">Lihat Penuh</span>
              </div>
            </div>
            
            <div className="p-[16px] flex flex-col flex-1">
              <div className="flex justify-between items-start mb-[8px]">
                <h3 className="font-semibold text-[var(--text-primary)] text-[16px] font-['Fraunces']">{asset.title}</h3>
                <span className="badge badge-pending bg-opacity-20 text-[10px] font-['Inter_Tight_Variable']">{asset.category}</span>
              </div>
              <p className="text-[13px] text-[var(--text-secondary)] font-['Inter_Tight_Variable'] mb-[16px] flex-1">
                {asset.description}
              </p>
              
              <button 
                onClick={(e) => { e.stopPropagation(); handleDownload(asset); }}
                className="btn-secondary w-full flex justify-center items-center gap-[8px] h-[36px]"
              >
                <Download className="w-[14px] h-[14px]" />
                Download
              </button>
            </div>
          </div>
        ))}
      </div>

      {selectedAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-[24px]" onClick={() => setSelectedAsset(null)}>
          <div className="absolute inset-0 bg-black/90 backdrop-blur-sm"></div>
          <div className="relative max-w-4xl max-h-full flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-[16px]">
              <h2 className="text-white font-medium text-[16px]">{selectedAsset.title}</h2>
              <div className="flex items-center gap-[16px]">
                <button 
                  onClick={() => handleDownload(selectedAsset)}
                  className="text-white hover:text-[var(--amber)] flex items-center gap-[6px] text-[13px]"
                >
                  <Download className="w-[16px] h-[16px]" />
                  Download
                </button>
                <button onClick={() => setSelectedAsset(null)} className="text-white hover:text-[var(--status-cancelled)] text-[24px] leading-none">&times;</button>
              </div>
            </div>
            <div className="flex-1 overflow-auto bg-[var(--bg-muted)] rounded-[8px]">
              <img src={selectedAsset.url} alt={selectedAsset.title} className="max-w-full h-auto mx-auto object-contain" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
