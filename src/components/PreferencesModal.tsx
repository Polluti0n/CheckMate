import React, { useState, useEffect, useMemo, useRef } from 'react';
import { UserPreferences, CheckField, CardLayoutZone } from '../types';
import { XMarkIcon } from './icons';
import { AVAILABLE_CARD_FIELDS, DEFAULT_PREFERENCES } from '../constants';
import {
  draggable,
  dropTargetForElements,
  monitorForElements,
} from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { pointerOutsideOfPreview } from '@atlaskit/pragmatic-drag-and-drop/element/pointer-outside-of-preview';
import { setCustomNativeDragPreview } from '@atlaskit/pragmatic-drag-and-drop/element/set-custom-native-drag-preview';

interface PreferencesModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentPreferences: UserPreferences;
    onSave: (newPreferences: UserPreferences) => void;
}

type DragState = { type: 'idle' } | { type: 'dragging', fieldKey: CheckField, sourceZone?: CardLayoutZone };
type FieldDef = { key: CheckField, label: string };

const DraggableField = ({ field, isDragging, sourceZone }: { field: FieldDef, isDragging: boolean, sourceZone?: CardLayoutZone }) => {
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        return draggable({
            element: el,
            getInitialData: () => ({ type: 'field', fieldKey: field.key, sourceZone }),
             onGenerateDragPreview: ({ nativeSetDragImage }) => {
                setCustomNativeDragPreview({
                    nativeSetDragImage,
                    render: ({ container }) => {
                        const previewEl = document.createElement('div');
                        previewEl.className = "px-3 py-2 bg-white rounded-md shadow-lg ring-1 ring-slate-300 font-medium text-sm text-slate-800";
                        previewEl.textContent = field.label;
                        container.appendChild(previewEl);
                        pointerOutsideOfPreview({ x: '16px', y: '16px' });
                        return () => container.removeChild(previewEl);
                    },
                });
            },
        });
    }, [field.key, sourceZone]);

    return (
        <div ref={ref} className={`px-3 py-2 border rounded-md bg-white hover:bg-slate-50 cursor-grab ${isDragging ? 'opacity-40' : ''}`}>
           <span className="text-sm text-slate-700">{field.label}</span>
        </div>
    );
};

const PreferencesModal: React.FC<PreferencesModalProps> = ({ isOpen, onClose, currentPreferences, onSave }) => {
    const [prefs, setPrefs] = useState<UserPreferences>(currentPreferences);
    const [dragState, setDragState] = useState<DragState>({ type: 'idle' });

    useEffect(() => setPrefs(currentPreferences), [currentPreferences]);

    useEffect(() => {
        return monitorForElements({
            onDragStart: ({ source }) => {
                if (source.data.type === 'field') {
                    setDragState({ type: 'dragging', fieldKey: source.data.fieldKey as CheckField, sourceZone: source.data.sourceZone as CardLayoutZone | undefined });
                }
            },
            onDrop: () => setDragState({ type: 'idle' }),
            onDragEnd: () => setDragState({ type: 'idle' }),
        });
    }, []);

    const handleSave = () => { onSave(prefs); onClose(); };
    const handleReset = () => setPrefs(DEFAULT_PREFERENCES);

    // --- KANBAN CARD LAYOUT LOGIC ---
    const currentCardLayout = prefs.cardLayout || {};
    const placedFieldKeys = Object.values(currentCardLayout);
    const availableCardFields = useMemo(() => AVAILABLE_CARD_FIELDS.filter(field => !placedFieldKeys.includes(field.key)), [placedFieldKeys]);
    
    const handleDropOnCardZone = (targetZone: CardLayoutZone) => {
        if (dragState.type !== 'dragging') return;

        const { fieldKey, sourceZone } = dragState;

        setPrefs(prev => {
            const newLayout = { ...prev.cardLayout };
            const fieldInTargetZone = newLayout[targetZone];

            // If dragging from another card zone (swapping)
            if (sourceZone) {
                newLayout[targetZone] = fieldKey;
                if (fieldInTargetZone) {
                    newLayout[sourceZone] = fieldInTargetZone;
                } else {
                    delete newLayout[sourceZone];
                }
            } else { // Dragging from available list
                // If target has a field, we need to find where the dragged field was and swap
                const keyOfFieldInTarget = Object.entries(newLayout).find(([_, f]) => f === fieldKey)?.[0];
                if(keyOfFieldInTarget) delete newLayout[keyOfFieldInTarget as CardLayoutZone];

                newLayout[targetZone] = fieldKey;
            }
            return { ...prev, cardLayout: newLayout };
        });
    };

    const handleDropOnAvailable = () => {
        if (dragState.type === 'dragging' && dragState.sourceZone) {
             setPrefs(prev => {
                const newLayout = { ...prev.cardLayout };
                delete newLayout[dragState.sourceZone!];
                return { ...prev, cardLayout: newLayout };
            });
        }
    };

    const DropZone = ({ fields, onDrop, title, className }: { fields: FieldDef[], onDrop: () => void, title: string, className?: string }) => {
        const ref = useRef<HTMLDivElement>(null);
        const [isDraggedOver, setIsDraggedOver] = useState(false);
        useEffect(() => {
            const el = ref.current;
            if (!el) return;
            return dropTargetForElements({
                element: el, getIsSticky: () => true,
                onDragEnter: () => setIsDraggedOver(true), onDragLeave: () => setIsDraggedOver(false),
                onDrop: () => { onDrop(); setIsDraggedOver(false); }
            });
        }, [onDrop]);
        return (
            <div className={className}>
                <h4 className="font-semibold text-slate-700">{title}</h4>
                <div ref={ref} className={`mt-2 p-3 border-2 border-dashed rounded-lg min-h-[150px] transition-colors ${isDraggedOver ? 'border-sky-500 bg-sky-50' : 'border-slate-300'}`}>
                    <div className="flex flex-col gap-2">
                        {fields.map(field => <DraggableField key={field.key} field={field} isDragging={dragState.type === 'dragging' && dragState.fieldKey === field.key} />)}
                        {fields.length === 0 && <span className="text-sm text-slate-400 self-center mt-12">Drop fields here</span>}
                    </div>
                </div>
            </div>
        );
    };

    const CardDropZone = ({ zone, onDrop }: { zone: CardLayoutZone, onDrop: (zone: CardLayoutZone) => void }) => {
        const ref = useRef<HTMLDivElement>(null);
        const [isDraggedOver, setIsDraggedOver] = useState(false);
        const fieldKey = currentCardLayout[zone];
        const field = fieldKey ? AVAILABLE_CARD_FIELDS.find(f => f.key === fieldKey) : null;
        
        useEffect(() => {
            const el = ref.current; if (!el) return;
            return dropTargetForElements({ element: el, getIsSticky: () => true,
                onDragEnter: () => setIsDraggedOver(true), onDragLeave: () => setIsDraggedOver(false),
                onDrop: () => { onDrop(zone); setIsDraggedOver(false); }
            });
        }, [zone, onDrop]);

        const sampleText: Record<CardLayoutZone, string> = { title: "Payor Name", topRight: "$123.45", subtitle: "Category Name", body1: "Longer text for memo that might wrap...", body2: "Another line of body text", footerLeft: "Check #1234", footerRight: "10/26/2023" };

        return (
            <div ref={ref} className={`p-1 border border-dashed rounded-md transition-colors min-h-[2.5rem] flex items-center ${isDraggedOver ? 'border-sky-500 bg-sky-50' : 'border-slate-300'}`}>
                {field ? ( <DraggableField field={field} isDragging={dragState.type === 'dragging' && dragState.fieldKey === field.key} sourceZone={zone} /> ) : ( <span className="text-xs text-slate-400 px-2">{sampleText[zone]}</span> )}
            </div>
        );
    };
    
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity z-50">
            <div className="flex items-start justify-center min-h-screen p-4 overflow-y-auto">
                <div className="relative bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all my-8 sm:max-w-4xl sm:w-full">
                    <div className="p-6">
                        <div className="flex justify-between items-start">
                            <div><h3 className="text-2xl font-bold text-slate-800">User Preferences</h3><p className="text-sm text-slate-500 mt-1">Customize your Kanban card layout.</p></div>
                            <button onClick={onClose} className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100"><XMarkIcon className="h-6 w-6" /></button>
                        </div>
                        <div className="mt-6">
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <DropZone fields={availableCardFields} onDrop={handleDropOnAvailable} title="Available Fields" className="max-h-[60vh] overflow-y-auto pr-2" />
                                <div>
                                    <h4 className="font-semibold text-slate-700">Card Layout Preview</h4>
                                    <div className="mt-2 bg-slate-100 p-4 rounded-lg">
                                        <div className="bg-white p-3 rounded-md shadow-lg border border-slate-200 flex flex-col space-y-2">
                                            <div className="flex justify-between items-start space-x-2">
                                                <div className="flex-grow"><CardDropZone zone="title" onDrop={handleDropOnCardZone} /></div>
                                                <div className="flex-shrink-0"><CardDropZone zone="topRight" onDrop={handleDropOnCardZone} /></div>
                                            </div>
                                            <CardDropZone zone="subtitle" onDrop={handleDropOnCardZone} />
                                            <CardDropZone zone="body1" onDrop={handleDropOnCardZone} />
                                            <CardDropZone zone="body2" onDrop={handleDropOnCardZone} />
                                            <div className="flex justify-between items-end space-x-2 pt-2 border-t">
                                                <div className="flex-grow"><CardDropZone zone="footerLeft" onDrop={handleDropOnCardZone} /></div>
                                                <div className="flex-shrink-0"><CardDropZone zone="footerRight" onDrop={handleDropOnCardZone} /></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                     <div className="bg-gray-50 px-6 py-4 flex justify-between items-center"><button type="button" onClick={handleReset} className="text-sm font-medium text-slate-600 hover:text-red-600">Reset to Default</button><div className="flex gap-3"><button type="button" onClick={onClose} className="rounded-md border border-slate-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-slate-700 hover:bg-slate-50">Cancel</button><button type="button" onClick={handleSave} className="rounded-md border border-transparent shadow-sm px-4 py-2 bg-sky-600 text-base font-medium text-white hover:bg-sky-700">Save Preferences</button></div></div>
                </div>
            </div>
        </div>
    );
};

export default PreferencesModal;