import { useState } from 'react';
import { X, Download, ZoomIn, ZoomOut } from 'lucide-react';

interface DocumentPreviewProps {
  url: string;
  title: string;
  onClose: () => void;
}

export function DocumentPreview({ url, title, onClose }: DocumentPreviewProps) {
  const [zoom, setZoom] = useState(100);

  const handleDownload = () => {
    window.open(url, '_blank');
  };

  const isImage = url.match(/\.(jpg|jpeg|png|gif|webp)$/i);
  const isPdf = url.match(/\.pdf$/i);

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <div className="flex items-center gap-2">
            {isImage && (
              <>
                <button
                  onClick={() => setZoom(Math.max(50, zoom - 10))}
                  className="p-2 hover:bg-slate-100 rounded-lg transition"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-5 h-5 text-slate-600" />
                </button>
                <span className="text-sm text-slate-600 min-w-[4rem] text-center">
                  {zoom}%
                </span>
                <button
                  onClick={() => setZoom(Math.min(200, zoom + 10))}
                  className="p-2 hover:bg-slate-100 rounded-lg transition"
                  title="Zoom In"
                >
                  <ZoomIn className="w-5 h-5 text-slate-600" />
                </button>
              </>
            )}
            <button
              onClick={handleDownload}
              className="p-2 hover:bg-slate-100 rounded-lg transition"
              title="Download"
            >
              <Download className="w-5 h-5 text-slate-600" />
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-lg transition"
              title="Close"
            >
              <X className="w-5 h-5 text-slate-600" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-4 bg-slate-50">
          {isImage ? (
            <div className="flex items-center justify-center min-h-full">
              <img
                src={url}
                alt={title}
                style={{ width: `${zoom}%` }}
                className="max-w-none rounded-lg shadow-lg"
              />
            </div>
          ) : isPdf ? (
            <iframe
              src={url}
              className="w-full h-full min-h-[600px] rounded-lg shadow-lg"
              title={title}
            />
          ) : (
            <div className="flex flex-col items-center justify-center min-h-full text-center">
              <p className="text-slate-600 mb-4">
                Preview not available for this file type
              </p>
              <button
                onClick={handleDownload}
                className="px-6 py-3 bg-gradient-to-br from-[#0A4A55] to-[#106b7d] text-white rounded-lg hover:shadow-xl hover:scale-[1.02] transition font-medium"
              >
                Download File
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
