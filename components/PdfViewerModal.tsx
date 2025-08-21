import React from 'react';
import { XIcon } from './Icons';

interface PdfViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  pdfUrl: string;
  title: string;
}

const PdfViewerModal: React.FC<PdfViewerModalProps> = ({ isOpen, onClose, pdfUrl, title }) => {
  if (!isOpen) return null;
  
  // Use Google Docs viewer for robust embedding that handles CORS and various PDF links
  const embedUrl = `https://docs.google.com/gview?url=${encodeURIComponent(pdfUrl)}&embedded=true`;

  return (
    <div 
      className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex justify-center items-center p-4 transition-opacity duration-300" 
      aria-modal="true" 
      role="dialog"
      onClick={onClose}
    >
      <div 
        className="bg-surface border border-border-color rounded-lg shadow-2xl w-full h-full max-w-6xl flex flex-col transform transition-all duration-300 scale-95 opacity-0 animate-fade-in-scale"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: 'fade-in-scale 0.3s forwards' }}
      >
        <header className="flex justify-between items-center p-4 border-b border-border-color flex-shrink-0">
          <h2 className="text-lg font-bold text-text-primary truncate" title={title}>{title}</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-text-secondary hover:bg-slate-600 hover:text-text-primary transition-colors"
            aria-label="Close PDF viewer"
          >
            <XIcon className="h-6 w-6" />
          </button>
        </header>
        <div className="flex-grow p-1 bg-slate-900">
           <iframe
                src={embedUrl}
                className="w-full h-full border-0"
                title={`PDF Viewer for ${title}`}
                allowFullScreen
            ></iframe>
        </div>
      </div>
       <style>{`
        @keyframes fade-in-scale {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .animate-fade-in-scale {
          animation: fade-in-scale 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </div>
  );
};

export default PdfViewerModal;