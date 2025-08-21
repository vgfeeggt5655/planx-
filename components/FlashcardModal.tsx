import React, { useState, useEffect, useCallback } from 'react';
import { jsPDF } from 'jspdf';
import { Flashcard, Resource } from '../types';
import { generateFlashcards } from '../services/geminiService';
import Spinner from './Spinner';
import { XIcon, RefreshIcon, ArrowLeftIcon, ArrowRightIcon, CloudDownloadIcon } from './Icons';
import * as pdfjsLib from 'pdfjs-dist';

// PDF.js worker setup is required.
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://esm.sh/pdfjs-dist@4.5.136/build/pdf.worker.mjs`;


interface FlashcardModalProps {
  isOpen: boolean;
  onClose: () => void;
  resource: Resource;
}

type FlashcardState = 'loading' | 'active' | 'error';

const extractTextFromPdf = async (pdfUrl: string): Promise<string> => {
    const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(pdfUrl)}`;
    const loadingTask = pdfjsLib.getDocument(proxyUrl);
    const pdf = await loadingTask.promise;
    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => ('str' in item ? item.str : '')).join(' ');
        fullText += pageText + '\n';
    }
    return fullText;
};


const FlashcardModal: React.FC<FlashcardModalProps> = ({ isOpen, onClose, resource }) => {
    const [cardState, setCardState] = useState<FlashcardState>('loading');
    const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);

    const loadFlashcards = useCallback(async () => {
        setCardState('loading');
        setError(null);
        setCurrentIndex(0);
        setIsFlipped(false);
        setFlashcards([]);
        try {
            const pdfText = await extractTextFromPdf(resource.pdf_link);
            if (!pdfText || pdfText.trim().length < 100) {
                throw new Error("Could not extract enough text from the PDF for flashcards.");
            }
            const generatedCards = await generateFlashcards(pdfText);
            if (generatedCards.length === 0) {
                throw new Error("The AI couldn't generate flashcards for this topic.");
            }
            setFlashcards(generatedCards);
            setCardState('active');
        } catch (err: any) {
            setError(err.message || 'An unknown error occurred.');
            setCardState('error');
        }
    }, [resource]);

    useEffect(() => {
        if (isOpen) {
            loadFlashcards();
        }
    }, [isOpen, loadFlashcards]);

    const handleNext = () => {
        if (currentIndex < flashcards.length - 1) {
            setCurrentIndex(prev => prev + 1);
            setIsFlipped(false);
        }
    };

    const handlePrev = () => {
        if (currentIndex > 0) {
            setCurrentIndex(prev => prev - 1);
            setIsFlipped(false);
        }
    };

    const handleDownload = () => {
        if (isDownloading || flashcards.length === 0) return;
        setIsDownloading(true);
        try {
            const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
            
            const PAGE_MARGIN = 15;
            const CARD_GUTTER = 8;
            const TEXT_PADDING = 5;
            const pageWidth = doc.internal.pageSize.width;
            const pageHeight = doc.internal.pageSize.height;
            const contentWidth = pageWidth - (PAGE_MARGIN * 2);
            
            // Store card positions to align Q&A pages
            const pageGroups: { cards: { text: string; y: number; height: number }[] }[] = [];

            let currentY = PAGE_MARGIN;
            let cardsOnPage: { text: string; y: number; height: number }[] = [];
            
            const cardData = flashcards.map(card => {
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(14);
                const frontLines = doc.splitTextToSize(card.front, contentWidth - (TEXT_PADDING * 2));
                const frontHeight = doc.getTextDimensions(frontLines).h;

                doc.setFont('helvetica', 'normal');
                doc.setFontSize(12);
                const backLines = doc.splitTextToSize(card.back, contentWidth - (TEXT_PADDING * 2));
                const backHeight = doc.getTextDimensions(backLines).h;

                const cardHeight = Math.max(frontHeight, backHeight) + (TEXT_PADDING * 2);
                return { front: card.front, back: card.back, height: cardHeight };
            });

            for (const card of cardData) {
                if (currentY + card.height > pageHeight - PAGE_MARGIN) {
                    pageGroups.push({ cards: cardsOnPage });
                    cardsOnPage = [];
                    currentY = PAGE_MARGIN;
                }
                cardsOnPage.push({ text: card.front, y: currentY, height: card.height });
                currentY += card.height + CARD_GUTTER;
            }
            if (cardsOnPage.length > 0) {
                pageGroups.push({ cards: cardsOnPage });
            }

            let cardDataIndex = 0;
            pageGroups.forEach((group, pageIndex) => {
                // --- ADD QUESTION PAGE ---
                if (pageIndex > 0) doc.addPage();
                
                // Watermark
                doc.setFontSize(80);
                doc.setTextColor(225, 225, 225);
                doc.text('Plan X', pageWidth / 2, pageHeight / 2, { angle: -45, align: 'center' });

                // Header
                doc.setFontSize(10);
                doc.setTextColor(150, 150, 150);
                doc.text(`Questions: ${resource.title}`, PAGE_MARGIN, 10);

                group.cards.forEach(cardMeta => {
                    const card = cardData[cardDataIndex++];
                    doc.setDrawColor(200, 200, 200);
                    doc.roundedRect(PAGE_MARGIN, cardMeta.y, contentWidth, cardMeta.height, 3, 3, 'S');
                    
                    doc.setFontSize(14);
                    doc.setFont('helvetica', 'bold');
                    doc.setTextColor(30, 30, 30);
                    const questionText = doc.splitTextToSize(card.front, contentWidth - (TEXT_PADDING * 2));
                    doc.text(questionText, PAGE_MARGIN + TEXT_PADDING, cardMeta.y + TEXT_PADDING + 5); // +5 for font baseline
                });

                // --- ADD ANSWER PAGE ---
                doc.addPage();

                // Watermark
                doc.setFontSize(80);
                doc.setTextColor(225, 225, 225);
                doc.text('Plan X', pageWidth / 2, pageHeight / 2, { angle: -45, align: 'center' });

                // Header
                doc.setFontSize(10);
                doc.setTextColor(150, 150, 150);
                doc.text(`Answers: ${resource.title}`, PAGE_MARGIN, 10);

                cardDataIndex -= group.cards.length; // Reset index for the answer pass
                group.cards.forEach(cardMeta => {
                    const card = cardData[cardDataIndex++];
                    doc.setDrawColor(200, 200, 200);
                    doc.roundedRect(PAGE_MARGIN, cardMeta.y, contentWidth, cardMeta.height, 3, 3, 'S');
                    
                    doc.setFontSize(12);
                    doc.setFont('helvetica', 'normal');
                    doc.setTextColor(60, 60, 60);
                    const answerText = doc.splitTextToSize(card.back, contentWidth - (TEXT_PADDING * 2));
                    doc.text(answerText, PAGE_MARGIN + TEXT_PADDING, cardMeta.y + TEXT_PADDING + 5);
                });
            });

            doc.save(`${resource.title}-flashcards.pdf`);
        } catch (e) {
            console.error("Failed to generate PDF:", e);
            alert("Sorry, there was an error creating the PDF.");
        } finally {
            setIsDownloading(false);
        }
    };


    if (!isOpen) return null;

    const currentCard = flashcards[currentIndex];

    return (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex justify-center items-center p-4">
            <div className="bg-background border border-border-color rounded-lg shadow-2xl w-full max-w-2xl transform transition-all duration-300 animate-fade-in-up flex flex-col overflow-hidden" style={{ minHeight: '450px', maxHeight: '90vh' }}>
                <header className="flex justify-between items-center p-4 border-b border-border-color flex-shrink-0">
                    <h2 className="text-lg font-bold text-text-primary">Flashcards: {resource.title}</h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-600"><XIcon className="h-6 w-6" /></button>
                </header>

                <main className="flex-grow p-6 flex flex-col justify-center items-center relative">
                    {cardState === 'loading' && <Spinner text="Generating flashcards..." />}
                    {cardState === 'error' && <div className="text-center text-red-400 p-8"><p className="font-bold mb-2">Generation Failed</p><p className="text-sm">{error}</p></div>}
                    {cardState === 'active' && currentCard && (
                        <div className="w-full h-full flex flex-col justify-between">
                            <div 
                                className="w-full flex-grow rounded-lg border-2 border-border-color bg-surface p-6 flex items-center justify-center cursor-pointer perspective-1000"
                                onClick={() => setIsFlipped(!isFlipped)}
                            >
                                <div className={`relative w-full h-full preserve-3d transition-transform duration-500 ${isFlipped ? 'rotate-y-180' : ''}`}>
                                    <div className="absolute w-full h-full backface-hidden flex items-center justify-center">
                                        <p className="text-xl text-center text-text-primary">{currentCard.front}</p>
                                    </div>
                                     <div className="absolute w-full h-full backface-hidden rotate-y-180 flex items-center justify-center">
                                        <p className="text-lg text-center text-text-secondary">{currentCard.back}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="flex justify-between items-center mt-4">
                                <button onClick={handlePrev} disabled={currentIndex === 0} className="p-3 rounded-full hover:bg-slate-700 disabled:opacity-30"><ArrowLeftIcon className="h-6 w-6" /></button>
                                <div className="flex items-center gap-4">
                                    <span className="font-semibold">{currentIndex + 1} / {flashcards.length}</span>
                                    <button onClick={() => setIsFlipped(!isFlipped)} className="p-3 rounded-full hover:bg-slate-700 text-primary"><RefreshIcon className="h-6 w-6" /></button>
                                </div>
                                <button onClick={handleNext} disabled={currentIndex === flashcards.length - 1} className="p-3 rounded-full hover:bg-slate-700 disabled:opacity-30"><ArrowRightIcon className="h-6 w-6" /></button>
                            </div>
                        </div>
                    )}
                </main>
                <footer className="p-4 border-t border-border-color flex-shrink-0 flex justify-between items-center">
                    <button 
                        onClick={handleDownload}
                        disabled={isDownloading || cardState !== 'active'}
                        className="bg-primary text-background font-bold py-2 px-6 rounded-md hover:bg-cyan-400 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {isDownloading ? <Spinner text="" /> : <><CloudDownloadIcon className="h-5 w-5" /> Download PDF</>}
                    </button>
                    <button onClick={onClose} className="bg-slate-600 text-text-primary font-bold py-2 px-6 rounded-md hover:bg-slate-500 transition">Close</button>
                </footer>
            </div>
             <style>{`
                .perspective-1000 { perspective: 1000px; }
                .preserve-3d { transform-style: preserve-3d; }
                .rotate-y-180 { transform: rotateY(180deg); }
                .backface-hidden { backface-visibility: hidden; }
            `}</style>
        </div>
    );
};

export default FlashcardModal;