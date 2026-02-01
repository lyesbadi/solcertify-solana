/**
 * MetadataGallery - Shared component for displaying images from IPFS metadata
 * Fetches the JSON metadata and displays images with lightbox functionality
 */

import { useEffect, useState } from 'react';
import { Loader2, Watch, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { clsx } from 'clsx';

interface MetadataGalleryProps {
    uri: string;
    compact?: boolean;      // Show single thumbnail with count badge
    size?: 'sm' | 'md' | 'lg';  // Size preset
    className?: string;
}

export const MetadataGallery = ({ uri, compact = true, size = 'md', className }: MetadataGalleryProps) => {
    const [images, setImages] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [previewIndex, setPreviewIndex] = useState<number | null>(null);

    useEffect(() => {
        const fetchImages = async () => {
            if (!uri) {
                setLoading(false);
                return;
            }

            // Convert any IPFS uri to gateway
            const gatewayUrl = uri.replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/');

            // If it looks like a direct image link
            if (gatewayUrl.match(/\.(jpeg|jpg|gif|png|webp)$/i) != null) {
                setImages([gatewayUrl]);
                setLoading(false);
                return;
            }

            try {
                // Otherwise assume it's a JSON metadata file
                const res = await fetch(gatewayUrl);
                const json = await res.json();

                // Support both single image and images array
                let allImages: string[] = [];
                if (json.images && Array.isArray(json.images)) {
                    allImages = json.images.map((img: string) =>
                        img.replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/')
                    );
                } else if (json.properties?.images && Array.isArray(json.properties.images)) {
                    allImages = json.properties.images.map((img: string) =>
                        img.replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/')
                    );
                } else if (json.image) {
                    allImages = [json.image.replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/')];
                }

                setImages(allImages);
            } catch (e) {

            } finally {
                setLoading(false);
            }
        };
        fetchImages();
    }, [uri]);

    // Size classes
    const sizeClasses = {
        sm: 'w-12 h-12',
        md: 'w-20 h-20',
        lg: 'w-32 h-32'
    };

    if (loading) {
        return (
            <div className={clsx(
                "bg-white/5 animate-pulse flex items-center justify-center rounded-lg",
                sizeClasses[size],
                className
            )}>
                <Loader2 className="animate-spin text-slate-600" size={16} />
            </div>
        );
    }

    if (images.length === 0) {
        return (
            <div className={clsx(
                "bg-white/5 flex items-center justify-center rounded-lg",
                sizeClasses[size],
                className
            )}>
                <Watch className="text-slate-600" size={size === 'sm' ? 16 : size === 'md' ? 24 : 32} />
            </div>
        );
    }

    // Compact mode: show first image only with count badge
    if (compact) {
        return (
            <>
                <div
                    className={clsx(
                        "relative cursor-pointer rounded-lg overflow-hidden hover:ring-2 hover:ring-gold-500/50 transition-all",
                        sizeClasses[size],
                        className
                    )}
                    onClick={() => setPreviewIndex(0)}
                >
                    <img
                        src={images[0]}
                        alt="Watch"
                        className="w-full h-full object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                    />
                    {images.length > 1 && (
                        <div className="absolute bottom-0 right-0 bg-black/70 text-white text-[10px] px-1.5 py-0.5 rounded-tl font-medium">
                            +{images.length - 1}
                        </div>
                    )}
                </div>

                {/* Lightbox Modal */}
                {previewIndex !== null && (
                    <div
                        className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
                        onClick={() => setPreviewIndex(null)}
                    >
                        <button
                            className="absolute top-4 right-4 text-white bg-white/10 p-2 rounded-full hover:bg-white/20"
                            onClick={() => setPreviewIndex(null)}
                        >
                            <X size={24} />
                        </button>

                        <div className="flex items-center gap-4 max-w-full">
                            {images.length > 1 && (
                                <button
                                    className="text-white bg-white/10 p-3 rounded-full hover:bg-white/20 disabled:opacity-30"
                                    onClick={(e) => { e.stopPropagation(); setPreviewIndex(prev => Math.max(0, (prev || 0) - 1)); }}
                                    disabled={previewIndex === 0}
                                >
                                    <ChevronLeft size={24} />
                                </button>
                            )}

                            <img
                                src={images[previewIndex]}
                                alt={`Photo ${previewIndex + 1}`}
                                className="max-h-[80vh] max-w-[80vw] object-contain rounded-lg"
                                onClick={(e) => e.stopPropagation()}
                            />

                            {images.length > 1 && (
                                <button
                                    className="text-white bg-white/10 p-3 rounded-full hover:bg-white/20 disabled:opacity-30"
                                    onClick={(e) => { e.stopPropagation(); setPreviewIndex(prev => Math.min(images.length - 1, (prev || 0) + 1)); }}
                                    disabled={previewIndex === images.length - 1}
                                >
                                    <ChevronRight size={24} />
                                </button>
                            )}
                        </div>

                        {/* Image counter */}
                        <div className="absolute top-4 left-1/2 -translate-x-1/2 text-white bg-black/50 px-3 py-1 rounded-full text-sm">
                            {previewIndex + 1} / {images.length}
                        </div>

                        {images.length > 1 && (
                            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                                {images.map((_, idx) => (
                                    <button
                                        key={idx}
                                        className={clsx(
                                            "w-2 h-2 rounded-full transition-colors",
                                            idx === previewIndex ? "bg-gold-500" : "bg-white/30 hover:bg-white/50"
                                        )}
                                        onClick={(e) => { e.stopPropagation(); setPreviewIndex(idx); }}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </>
        );
    }

    // Full gallery mode for expanded view
    return (
        <div className="space-y-2">
            <div className="text-xs text-slate-500 mb-2">{images.length} photo(s)</div>
            <div className="grid grid-cols-4 gap-2">
                {images.map((img, index) => (
                    <img
                        key={index}
                        src={img}
                        alt={`Photo ${index + 1}`}
                        className="w-full aspect-square object-cover rounded-lg border border-white/10 cursor-pointer hover:ring-2 hover:ring-gold-500/50"
                        onClick={() => setPreviewIndex(index)}
                    />
                ))}
            </div>

            {/* Lightbox for gallery mode too */}
            {previewIndex !== null && (
                <div
                    className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
                    onClick={() => setPreviewIndex(null)}
                >
                    <button
                        className="absolute top-4 right-4 text-white bg-white/10 p-2 rounded-full hover:bg-white/20"
                        onClick={() => setPreviewIndex(null)}
                    >
                        <X size={24} />
                    </button>

                    <div className="flex items-center gap-4">
                        {images.length > 1 && (
                            <button
                                className="text-white bg-white/10 p-3 rounded-full hover:bg-white/20 disabled:opacity-30"
                                onClick={(e) => { e.stopPropagation(); setPreviewIndex(prev => Math.max(0, (prev || 0) - 1)); }}
                                disabled={previewIndex === 0}
                            >
                                <ChevronLeft size={24} />
                            </button>
                        )}

                        <img
                            src={images[previewIndex]}
                            alt={`Photo ${previewIndex + 1}`}
                            className="max-h-[80vh] max-w-[80vw] object-contain rounded-lg"
                            onClick={(e) => e.stopPropagation()}
                        />

                        {images.length > 1 && (
                            <button
                                className="text-white bg-white/10 p-3 rounded-full hover:bg-white/20 disabled:opacity-30"
                                onClick={(e) => { e.stopPropagation(); setPreviewIndex(prev => Math.min(images.length - 1, (prev || 0) + 1)); }}
                                disabled={previewIndex === images.length - 1}
                            >
                                <ChevronRight size={24} />
                            </button>
                        )}
                    </div>

                    <div className="absolute top-4 left-1/2 -translate-x-1/2 text-white bg-black/50 px-3 py-1 rounded-full text-sm">
                        {previewIndex + 1} / {images.length}
                    </div>
                </div>
            )}
        </div>
    );
};
