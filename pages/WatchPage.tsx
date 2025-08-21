import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getResources } from '../services/googleSheetService';
import { updateUser } from '../services/authService';
import { Resource } from '../types';
import Spinner from '../components/Spinner';
import { DocumentIcon, BrainIcon, CloudDownloadIcon, CollectionIcon, SpeedIcon, ChevronDownIcon, CheckIcon } from '../components/Icons';
import PdfViewerModal from '../components/PdfViewerModal';
import MCQTestModal from '../components/MCQTestModal';
import FlashcardModal from '../components/FlashcardModal';
import { useAuth } from '../contexts/AuthContext';

type WatchedProgress = { time: number; duration: number };

const parseWatchedData = (watched: string | undefined | null): Record<string, WatchedProgress> => {
    if (!watched || typeof watched !== 'string' || watched.trim() === '') return {};
    try {
        const data = JSON.parse(watched);
        if (typeof data !== 'object' || data === null || Array.isArray(data)) return {};
        
        const normalizedData: Record<string, WatchedProgress> = {};
        for (const key in data) {
            if (typeof data[key] === 'number') {
                normalizedData[key] = { time: data[key], duration: 0 };
            } else if (typeof data[key] === 'object' && 'time' in data[key] && 'duration' in data[key]) {
                normalizedData[key] = data[key];
            }
        }
        return normalizedData;
    } catch (e) {
        console.error("Failed to parse watched data", e);
        return {};
    }
};

const getYoutubeVideoId = (url: string): string | null => {
    let videoId = null;
    try {
        const urlObj = new URL(url);
        if (urlObj.hostname === 'youtu.be') {
            videoId = urlObj.pathname.slice(1);
        } else if (urlObj.hostname.includes('youtube.com')) {
            videoId = urlObj.searchParams.get('v');
        }
    } catch (e) { console.error("Invalid URL for YouTube parsing", e); }
    return videoId;
};

const WatchPage: React.FC = () => {
    const { resourceId } = useParams<{ resourceId: string }>();
    const { user, updateCurrentUser } = useAuth();
    
    const [allResources, setAllResources] = useState<Resource[]>([]);
    const [resource, setResource] = useState<Resource | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [isPdfOpen, setPdfOpen] = useState(false);
    const [isTestOpen, setTestOpen] = useState(false);
    const [isFlashcardOpen, setFlashcardOpen] = useState(false);
    const [isPdfDownloading, setIsPdfDownloading] = useState(false);
    const [isVideoDownloading, setIsVideoDownloading] = useState(false);
    
    // State for progress tracking (works for both players)
    const [isPlaying, setIsPlaying] = useState(false);
    const [playbackRate, setPlaybackRate] = useState(1);
    const [isSpeedMenuOpen, setIsSpeedMenuOpen] = useState(false);

    // Refs for players
    const videoRef = useRef<HTMLVideoElement>(null); // For direct video links
    const ytPlayerRef = useRef<any>(null); // For YouTube player instance
    const speedMenuRef = useRef<HTMLDivElement>(null);
    
    // Refs for performant progress tracking
    const currentTimeRef = useRef(0);
    const durationRef = useRef(0);
    const watchedDataRef = useRef<Record<string, WatchedProgress>>({});

    const isYoutubeVideo = useMemo(() => {
        if (!resource) return false;
        return resource.video_link.includes('youtube.com') || resource.video_link.includes('youtu.be');
    }, [resource]);

    useEffect(() => {
        const fetchResourceData = async () => {
            if (!resourceId) { setError("Resource ID is missing."); setLoading(false); return; }
            setLoading(true);
            try {
                const resourcesData = await getResources();
                setAllResources(resourcesData);
                const foundResource = resourcesData.find(r => r.id === resourceId);
                setResource(foundResource || null);
                if (!foundResource) setError('Resource not found.');
            } catch (err) { setError('Failed to load resource data.'); console.error(err); } 
            finally { setLoading(false); }
        };
        fetchResourceData();
    }, [resourceId]);
    
    useEffect(() => {
        if (!resource) return;

        const restoreProgress = (player: any, isYt: boolean) => {
             if (user && resourceId) {
                const watchedData = parseWatchedData(user.watched);
                const savedProgress = watchedData[resourceId];
                if (savedProgress?.time) {
                    if (isYt) player.seekTo(savedProgress.time, true);
                    else player.currentTime = savedProgress.time;
                }
            }
        };

        if (isYoutubeVideo) {
            const videoId = getYoutubeVideoId(resource.video_link);
            if (!videoId) { setError("Invalid YouTube URL"); return; }
            
            const createPlayer = () => {
                if (ytPlayerRef.current) { ytPlayerRef.current.destroy(); }
                
                ytPlayerRef.current = new (window as any).YT.Player('youtube-player-container', {
                    videoId,
                    playerVars: { autoplay: 0, controls: 1, rel: 0, modestbranding: 1, playsinline: 1 },
                    events: {
                        onReady: (e: any) => {
                            const player = e.target;
                            durationRef.current = player.getDuration() || 0;
                            restoreProgress(player, true);
                        },
                        onStateChange: (e: any) => {
                            const state = e.data;
                            const playerState = (window as any).YT.PlayerState;
                            setIsPlaying(state === playerState.PLAYING);
                        },
                        onError: (e: any) => {
                            console.error('YouTube Player Error:', e.data);
                            setError(`A YouTube player error occurred (code: ${e.data}). This video may be private, deleted, or unavailable for embedding.`);
                        }
                    }
                });
            };
            
            if ((window as any).YT && (window as any).YT.Player) createPlayer();
            else (window as any).onYouTubeIframeAPIReady = createPlayer;

        } else { // For direct video links, use the standard player but track its state
            const video = videoRef.current;
            if (!video) return;
            
            const onLoadedMetadata = () => { 
                durationRef.current = video.duration;
                restoreProgress(video, false); 
            };
            const onPlay = () => setIsPlaying(true);
            const onPause = () => setIsPlaying(false);

            video.addEventListener('loadedmetadata', onLoadedMetadata);
            video.addEventListener('play', onPlay);
            video.addEventListener('pause', onPause);
            
            if (video.readyState >= 1) onLoadedMetadata(); // If metadata is already loaded

             return () => {
                video.removeEventListener('loadedmetadata', onLoadedMetadata);
                video.removeEventListener('play', onPlay);
                video.removeEventListener('pause', onPause);
            };
        }

        return () => {
            if (ytPlayerRef.current && typeof ytPlayerRef.current.destroy === 'function') {
                ytPlayerRef.current.destroy();
                ytPlayerRef.current = null;
            }
        };
    }, [resource, isYoutubeVideo, user, resourceId]);

    // Effect to handle video playback speed
    useEffect(() => {
        if (!isYoutubeVideo && videoRef.current) {
            videoRef.current.playbackRate = playbackRate;
        }
    }, [playbackRate, isYoutubeVideo]);

    // Effect to handle closing speed menu on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (speedMenuRef.current && !speedMenuRef.current.contains(event.target as Node)) {
                setIsSpeedMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // This effect continuously polls for the current time for progress saving.
    useEffect(() => {
        const intervalId = setInterval(() => {
            if (isYoutubeVideo && ytPlayerRef.current?.getCurrentTime) {
                currentTimeRef.current = ytPlayerRef.current.getCurrentTime() || 0;
            } else if (!isYoutubeVideo && videoRef.current) {
                currentTimeRef.current = videoRef.current.currentTime || 0;
            }
        }, 1000);
        return () => clearInterval(intervalId);
    }, [isYoutubeVideo]);

     // New performant progress saving logic
    useEffect(() => {
        if (user) {
            watchedDataRef.current = parseWatchedData(user.watched);
        }

        const saveFinalProgress = () => {
            if (!user) return;
            const finalWatchedJSON = JSON.stringify(watchedDataRef.current);
            if (user.watched === finalWatchedJSON) return;
            const updatedUser = { ...user, watched: finalWatchedJSON };
            updateCurrentUser(updatedUser);
            updateUser(updatedUser).catch(err => console.error("Failed to save progress on exit:", err));
        };

        const progressUpdateInterval = setInterval(() => {
            if (!resourceId) return;
            const localCurrentTime = currentTimeRef.current;
            const localDuration = durationRef.current;

            if (isPlaying && localCurrentTime > 0 && localDuration > 0) {
                const isComplete = (localCurrentTime / localDuration) > 0.95;
                if (isComplete) {
                    if (watchedDataRef.current[resourceId]) {
                        delete watchedDataRef.current[resourceId];
                    }
                } else {
                    watchedDataRef.current[resourceId] = { time: localCurrentTime, duration: localDuration };
                }
            }
        }, 3000);

        window.addEventListener('beforeunload', saveFinalProgress);

        return () => {
            clearInterval(progressUpdateInterval);
            window.removeEventListener('beforeunload', saveFinalProgress);
            saveFinalProgress();
        };
    }, [user, resourceId, updateCurrentUser, isPlaying]);
    
    const relatedResources = useMemo(() => {
        if (!resource) return [];
        return allResources.filter(r => r.Subject_Name === resource.Subject_Name && r.id !== resource.id).reverse();
    }, [resource, allResources]);
    
    const forceDownload = async (url: string, fileName: string) => {
        const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
        try {
            const res = await fetch(proxyUrl);
            if (!res.ok) throw new Error('Download failed: ' + res.status);
            const blob = await res.blob();
            const objectUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = objectUrl; a.download = fileName;
            document.body.appendChild(a); a.click(); a.remove();
            setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
        } catch (err) {
            console.error("Download Error:", err);
            alert("Could not download the file. This may be due to a network issue or browser restrictions. Please try again later.");
        }
    };
    
    const handleDownloadPdf = async () => {
        if (!resource) return;
        setIsPdfDownloading(true);
        await forceDownload(resource.pdf_link, `${resource.title}.pdf`);
        setIsPdfDownloading(false);
    };

    const handleDownloadVideo = async () => {
        if (!resource) return;
        setIsVideoDownloading(true);
        await forceDownload(resource.video_link, `${resource.title}.mp4`);
        setIsVideoDownloading(false);
    };

    if (loading) return <div className="flex justify-center items-center h-[calc(100vh-10rem)]"><Spinner text="Loading course..." /></div>;
    if (error || !resource) return <div className="pt-24 container mx-auto px-4 text-center text-red-500 text-xl">{error || 'Could not load the resource.'}</div>;

    return (
      <>
        <div className="container mx-auto px-2 sm:px-4 py-8 pt-20 sm:pt-24">
            <div className="grid grid-cols-1 lg:grid-cols-3 lg:gap-8 xl:gap-12">
                <main className="lg:col-span-2 animate-fade-in-up">
                    <div className="relative aspect-video bg-black rounded-lg overflow-hidden shadow-2xl shadow-primary/20 border border-border-color">
                        {isYoutubeVideo ? (
                            <div id="youtube-player-container" className="w-full h-full" />
                        ) : (
                            <video ref={videoRef} src={resource.video_link} poster={resource.image_url} className="w-full h-full" controls controlsList="nodownload">
                                Your browser does not support the video tag.
                            </video>
                        )}
                    </div>
                    <div className="mt-6 px-2">
                        <p className="text-sm font-bold text-primary uppercase tracking-wider">{resource.Subject_Name}</p>
                        <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-text-primary mt-1 mb-4">{resource.title}</h1>
                        <div className="flex flex-wrap gap-3">
                            <button onClick={() => setPdfOpen(true)} className="inline-flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-background bg-primary hover:bg-cyan-400 transition-transform hover:scale-105 shadow-lg shadow-primary/20"><DocumentIcon className="h-5 w-5 mr-2" /> View PDF</button>
                            <button onClick={() => setFlashcardOpen(true)} className="inline-flex items-center justify-center px-5 py-3 border border-border-color text-base font-medium rounded-md text-text-primary bg-surface hover:bg-slate-600 transition-transform hover:scale-105 shadow-lg"><CollectionIcon className="h-5 w-5 mr-2" /> Flashcards</button>
                            <button onClick={() => setTestOpen(true)} className="inline-flex items-center justify-center px-5 py-3 border border-secondary/50 text-base font-medium rounded-md text-secondary bg-secondary/10 hover:bg-secondary/20 transition-transform hover:scale-105 shadow-lg shadow-secondary/10"><BrainIcon className="h-5 w-5 mr-2" /> Test Me</button>
                        </div>
                         <div className="mt-4 flex flex-wrap gap-3 items-center">
                            <button onClick={handleDownloadPdf} disabled={isPdfDownloading} className="inline-flex items-center justify-center px-5 py-2 border border-border-color/50 text-sm font-medium rounded-full text-text-secondary bg-surface/50 hover:bg-slate-700 transition-transform hover:scale-105 shadow-md disabled:opacity-50">{isPdfDownloading ? <Spinner text="" /> : <><CloudDownloadIcon className="h-5 w-5 mr-2" /> Download PDF</>}</button>
                            {!isYoutubeVideo && (
                                <>
                                    <button onClick={handleDownloadVideo} disabled={isVideoDownloading} className="inline-flex items-center justify-center px-5 py-2 border border-border-color/50 text-sm font-medium rounded-full text-text-secondary bg-surface/50 hover:bg-slate-700 transition-transform hover:scale-105 shadow-md disabled:opacity-50">{isVideoDownloading ? <Spinner text="" /> : <><CloudDownloadIcon className="h-5 w-5 mr-2" /> Download Video</>}</button>
                                    <div className="relative" ref={speedMenuRef}>
                                        <button
                                            onClick={() => setIsSpeedMenuOpen(!isSpeedMenuOpen)}
                                            className="inline-flex items-center justify-center px-5 py-2 border border-border-color/50 text-sm font-medium rounded-full text-text-secondary bg-surface/50 hover:bg-slate-700 transition-transform hover:scale-105 shadow-md"
                                            aria-haspopup="true"
                                            aria-expanded={isSpeedMenuOpen}
                                        >
                                            <SpeedIcon className="h-5 w-5 mr-2" />
                                            <span>{playbackRate}x</span>
                                            <ChevronDownIcon className={`h-4 w-4 ml-1 transition-transform ${isSpeedMenuOpen ? 'rotate-180' : ''}`} />
                                        </button>
                                        {isSpeedMenuOpen && (
                                            <div className="absolute bottom-full mb-2 w-28 bg-surface border border-border-color rounded-md shadow-lg py-1 z-10 animate-fade-in-up" style={{ animationDuration: '0.2s' }} role="menu">
                                                {[1, 1.25, 1.5, 1.75, 2, 2.5, 3].map(speed => (
                                                    <button
                                                        key={speed}
                                                        onClick={() => { setPlaybackRate(speed); setIsSpeedMenuOpen(false); }}
                                                        className="w-full flex items-center justify-between px-4 py-2 text-sm text-text-primary hover:bg-primary/20 hover:text-primary transition-colors"
                                                        role="menuitem"
                                                    >
                                                        <span>{speed}x</span>
                                                        {playbackRate === speed && <CheckIcon className="h-4 w-4 text-primary" />}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </main>
                
                {relatedResources.length > 0 && (
                    <aside className="lg:col-span-1 mt-12 lg:mt-0 animate-fade-in-up" style={{animationDelay: '0.2s'}}>
                        <h2 className="text-2xl font-bold text-text-primary mb-4 px-2">More from {resource.Subject_Name}</h2>
                        <div className="flex flex-col gap-4 max-h-[calc(100vh-8rem)] overflow-y-auto scrollbar-thin pr-2">
                             {relatedResources.map((res) => (
                               <Link to={`/watch/${res.id}`} key={res.id} className="flex gap-4 bg-surface p-3 rounded-lg hover:bg-slate-700 transition-colors border border-transparent hover:border-border-color">
                                    <img src={res.image_url} alt={res.title} className="w-32 aspect-video rounded object-cover flex-shrink-0" onError={(e) => { (e.target as HTMLImageElement).src = `https://picsum.photos/seed/${encodeURIComponent(res.title)}/1280/720`; }}/>
                                    <div className="flex flex-col justify-center">
                                        <p className="text-xs font-bold text-secondary uppercase tracking-wide">{res.Subject_Name}</p>
                                        <h3 className="text-sm font-bold text-text-primary leading-tight line-clamp-2">{res.title}</h3>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </aside>
                )}
            </div>
        </div>
        <PdfViewerModal isOpen={isPdfOpen} onClose={() => setPdfOpen(false)} pdfUrl={resource.pdf_link} title={resource.title}/>
        <MCQTestModal isOpen={isTestOpen} onClose={() => setTestOpen(false)} resource={resource}/>
        <FlashcardModal isOpen={isFlashcardOpen} onClose={() => setFlashcardOpen(false)} resource={resource}/>
         <style>{`
            #youtube-player-container,
            #youtube-player-container iframe {
              width: 100%;
              height: 100%;
            }
        `}</style>
      </>
    );
};

export default WatchPage;