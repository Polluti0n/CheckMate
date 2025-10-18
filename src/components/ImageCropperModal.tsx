import React, { useState, useRef, useEffect, useCallback } from 'react';
import { XMarkIcon, CheckCircleIcon } from './icons';
import { cropImageToSquare } from '../utils/imageProcessor';

interface ImageCropperModalProps {
    isOpen: boolean;
    imageSrc: string | null;
    onClose: () => void;
    onConfirmCrop: (blob: Blob) => void;
}

interface Crop {
    x: number;
    y: number;
    width: number;
    height: number;
}

const ImageCropperModal: React.FC<ImageCropperModalProps> = ({ isOpen, imageSrc, onClose, onConfirmCrop }) => {
    const imageRef = useRef<HTMLImageElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [crop, setCrop] = useState<Crop>({ x: 0, y: 0, width: 100, height: 100 });
    const [dragState, setDragState] = useState<{ type: 'move' | 'resize' | null, startX: number, startY: number, startCrop: Crop }>({ type: null, startX: 0, startY: 0, startCrop: crop });

    const resetCrop = useCallback(() => {
        if (imageRef.current) {
            const { naturalWidth, naturalHeight } = imageRef.current;
            const size = Math.min(naturalWidth, naturalHeight) * 0.8;
            setCrop({
                x: (naturalWidth - size) / 2,
                y: (naturalHeight - size) / 2,
                width: size,
                height: size,
            });
        }
    }, []);

    useEffect(() => {
        if (imageSrc) {
            const img = new Image();
            img.src = imageSrc;
            img.onload = resetCrop;
        }
    }, [imageSrc, resetCrop]);

    const getEventPosition = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
        return 'touches' in e ? e.touches[0] : e;
    };

    const handleMouseDown = (e: React.MouseEvent | React.TouchEvent, type: 'move' | 'resize') => {
        e.preventDefault();
        if (type === 'resize') {
            e.stopPropagation(); // Prevent move from firing on resize handle
        }
        const { clientX, clientY } = getEventPosition(e);
        setDragState({ type, startX: clientX, startY: clientY, startCrop: crop });
    };

    const handleMouseMove = useCallback((e: MouseEvent | TouchEvent) => {
        if (!dragState.type || !imageRef.current) return;
        
        const { clientX, clientY } = getEventPosition(e);
        const imgRect = imageRef.current.getBoundingClientRect();
        const scaleX = imageRef.current.naturalWidth / imgRect.width;
        const scaleY = imageRef.current.naturalHeight / imgRect.height;

        const dx = (clientX - dragState.startX) * scaleX;
        const dy = (clientY - dragState.startY) * scaleY;

        const { naturalWidth, naturalHeight } = imageRef.current;

        setCrop(prevCrop => {
            let newCrop = { ...prevCrop };
            if (dragState.type === 'move') {
                newCrop.x = Math.max(0, Math.min(naturalWidth - prevCrop.width, dragState.startCrop.x + dx));
                newCrop.y = Math.max(0, Math.min(naturalHeight - prevCrop.height, dragState.startCrop.y + dy));
            } else if (dragState.type === 'resize') {
                const delta = Math.abs(dx) > Math.abs(dy) ? dx : dy;
                let newSize = dragState.startCrop.width + delta;
                
                newSize = Math.max(50, newSize); 
                const maxSize = Math.min(naturalWidth - dragState.startCrop.x, naturalHeight - dragState.startCrop.y);
                newSize = Math.min(newSize, maxSize);

                newCrop.width = newSize;
                newCrop.height = newSize;
            }
            return newCrop;
        });
    }, [dragState]);

    const handleMouseUp = useCallback(() => {
        setDragState(prev => ({ ...prev, type: null }));
    }, []);
    
    useEffect(() => {
        if (dragState.type) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('touchmove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
            window.addEventListener('touchend', handleMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('touchmove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
            window.removeEventListener('touchend', handleMouseUp);
        };
    }, [dragState.type, handleMouseMove, handleMouseUp]);


    const handleConfirm = async () => {
        if (imageSrc) {
            try {
                const blob = await cropImageToSquare(imageSrc, crop);
                onConfirmCrop(blob);
            } catch (error) {
                console.error("Error cropping image:", error);
            }
        }
    };

    if (!isOpen || !imageSrc) return null;
    
    let selectionStyle: React.CSSProperties = {};
    if (imageRef.current && containerRef.current) {
        const imgRect = imageRef.current.getBoundingClientRect();
        const containerRect = containerRef.current.getBoundingClientRect();
        const scaleX = imgRect.width / imageRef.current.naturalWidth;
        const scaleY = imgRect.height / imageRef.current.naturalHeight;
        
        selectionStyle = {
            left: `${(crop.x * scaleX) + (imgRect.left - containerRect.left)}px`,
            top: `${(crop.y * scaleY) + (imgRect.top - containerRect.top)}px`,
            width: `${crop.width * scaleX}px`,
            height: `${crop.height * scaleY}px`,
        };
    }
    
    return (
        <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg flex flex-col max-h-[90vh]">
                <div className="p-4 border-b flex justify-between items-center flex-shrink-0">
                    <h3 className="text-lg font-semibold text-slate-800">Crop Profile Picture</h3>
                    <button onClick={onClose} className="p-1 rounded-full text-slate-400 hover:bg-slate-100"><XMarkIcon className="h-6 w-6" /></button>
                </div>
                
                <div className="p-4 flex-grow flex justify-center items-center overflow-hidden">
                    <div ref={containerRef} className="relative select-none w-full h-full flex justify-center items-center">
                        <img 
                            ref={imageRef} 
                            src={imageSrc} 
                            alt="To be cropped" 
                            className="block max-w-full max-h-full object-contain"
                            onLoad={resetCrop}
                        />
                        {imageRef.current && (
                            <div 
                                className="absolute border-2 border-white cursor-move"
                                style={{
                                    ...selectionStyle,
                                    boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)'
                                }}
                                onMouseDown={e => handleMouseDown(e, 'move')}
                                onTouchStart={e => handleMouseDown(e, 'move')}
                            >
                                <div 
                                    className="absolute -bottom-2 -right-2 w-4 h-4 bg-white rounded-full cursor-nwse-resize border-2 border-slate-300" 
                                    onMouseDown={e => handleMouseDown(e, 'resize')} 
                                    onTouchStart={e => handleMouseDown(e, 'resize')}
                                />
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-4 bg-slate-50 border-t flex justify-end gap-3 flex-shrink-0">
                    <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50">Cancel</button>
                    <button onClick={handleConfirm} className="px-4 py-2 text-sm font-medium text-white bg-sky-600 rounded-md hover:bg-sky-700 flex items-center gap-2">
                        <CheckCircleIcon className="h-5 w-5"/>
                        Confirm & Save
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ImageCropperModal;
