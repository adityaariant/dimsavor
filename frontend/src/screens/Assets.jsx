import React, { useState } from 'react';
import { Download, X } from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';

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
        <h1 className="text-[24px] font-semibold text-foreground font-display">
          Assets Library
        </h1>
        <p className="text-[14px] text-muted-foreground font-sans mt-[4px]">
          Kumpulan QRIS dan materi promosi.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[24px]">
        {ASSETS.map((asset) => (
          <Card key={asset.id} className="overflow-hidden flex flex-col group p-0">
            <div 
              className="relative aspect-square bg-muted overflow-hidden cursor-pointer"
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
            
            <CardContent className="p-[16px] flex flex-col flex-1">
              <div className="flex justify-between items-start mb-[8px]">
                <h3 className="font-semibold text-foreground text-[16px] font-display">{asset.title}</h3>
                <Badge variant="secondary" className="bg-amber/10 text-amber font-sans text-[10px]">{asset.category}</Badge>
              </div>
              <p className="text-[13px] text-muted-foreground font-sans mb-[16px] flex-1">
                {asset.description}
              </p>
              
              <Button 
                variant="outline"
                onClick={(e) => { e.stopPropagation(); handleDownload(asset); }}
                className="w-full flex justify-center items-center gap-[8px]"
              >
                <Download className="w-[14px] h-[14px]" />
                Download
              </Button>
            </CardContent>
          </Card>
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
                  className="text-white hover:text-amber flex items-center gap-[6px] text-[13px]"
                >
                  <Download className="w-[16px] h-[16px]" />
                  Download
                </button>
                <button onClick={() => setSelectedAsset(null)} aria-label="Tutup Preview" className="text-white hover:text-destructive text-[24px] leading-none">
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto bg-muted rounded-[8px]">
              <img src={selectedAsset.url} alt={selectedAsset.title} className="max-w-full h-auto mx-auto object-contain" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
