import React, { useState, useEffect } from 'react';
import { Flag, CurrentUser } from '../types';
import { XMarkIcon, PencilIcon, TrashIcon, PlusIcon } from './icons';
import * as firestoreService from '../services/firestoreService';

interface FlagManagerProps {
  isOpen: boolean;
  flags: Flag[];
  onClose: () => void;
  currentUser: CurrentUser | null;
}

const colors = [
    { bg: 'bg-red-500', text: 'text-white' },
    { bg: 'bg-amber-500', text: 'text-white' },
    { bg: 'bg-yellow-400', text: 'text-slate-800' },
    { bg: 'bg-lime-500', text: 'text-white' },
    { bg: 'bg-green-500', text: 'text-white' },
    { bg: 'bg-teal-500', text: 'text-white' },
    { bg: 'bg-sky-500', text: 'text-white' },
    { bg: 'bg-indigo-500', text: 'text-white' },
    { bg: 'bg-purple-500', text: 'text-white' },
    { bg: 'bg-pink-500', text: 'text-white' },
];

const FlagManager: React.FC<FlagManagerProps> = ({ isOpen, flags, onClose, currentUser }) => {
    const [editingFlag, setEditingFlag] = useState<Partial<Flag> | null>(null);

    // Manage body scroll locking and reset state on open/close
    useEffect(() => {
        if (isOpen) {
            setEditingFlag(null);
            // Prevent scrolling of the underlying CheckDetailModal and body
            document.body.classList.add('no-doc-scroll');
        } else {
            document.body.classList.remove('no-doc-scroll');
        }
        // Cleanup in case component unmounts while open
        return () => document.body.classList.remove('no-doc-scroll');
    }, [isOpen]);

    // Filter flags to only those created by the current user
    const userFlags = React.useMemo(() => {
        if (!currentUser) return [];
        return flags.filter(f => f.uid === currentUser.uid);
    }, [flags, currentUser]);

    const handleSave = () => {
        if (!editingFlag || !editingFlag.name || !editingFlag.color || !currentUser) return;

        if (editingFlag.id) {
            // Update existing flag
            const { id, ...updates } = editingFlag as Flag;
            // Ensure user can only update their own flags (redundant due to UI filtering, but good for safety)
            if (editingFlag.uid === currentUser.uid) {
                firestoreService.updateFlag(id, updates);
            }
        } else {
            // Add new flag, strictly tying it to the current user
            const newFlag: Omit<Flag, 'id'> = {
                name: editingFlag.name,
                color: editingFlag.color,
                textColor: editingFlag.textColor || 'text-white',
                uid: currentUser.uid,
            };
            firestoreService.addFlag(newFlag);
        }
        setEditingFlag(null);
    };

    const handleDelete = (id: string) => {
        if (window.confirm("Are you sure you want to delete this flag? It will be removed from all checks.")) {
            firestoreService.deleteFlag(id);
        }
    };

    if (!isOpen || !currentUser) return null;

    return (
        // Use z-[60] to ensure it's above CheckDetailModal (usually z-40 or z-50)
        // Use a darker backdrop to distinguish it as a second-level modal
        <div className="fixed inset-0 bg-black/70 transition-opacity z-[60] flex items-center justify-center p-4" onClick={onClose}>
            {/* Stop propagation to prevent closing when clicking inside the modal */}
            <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                    <div>
                        <h3 className="text-xl font-bold text-slate-900">Manage My Flags</h3>
                        <p className="text-sm text-slate-500 mt-1">Create and edit your personal flags.</p>
                    </div>
                    <button onClick={onClose} className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors" aria-label="Close">
                        <XMarkIcon className="h-6 w-6" />
                    </button>
                </div>
                
                <div className="p-6">
                    {userFlags.length > 0 ? (
                        <ul className="space-y-2 max-h-60 overflow-y-auto pr-2">
                            {userFlags.map(flag => (
                                <li key={flag.id} className="flex items-center justify-between p-2 bg-slate-50 border border-slate-200 rounded-lg group">
                                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${flag.color} ${flag.textColor}`}>{flag.name}</span>
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => setEditingFlag(flag)} className="p-1 text-slate-500 hover:text-sky-600 hover:bg-white rounded" title="Edit">
                                            <PencilIcon className="h-4 w-4"/>
                                        </button>
                                        <button onClick={() => handleDelete(flag.id)} className="p-1 text-slate-500 hover:text-red-600 hover:bg-white rounded" title="Delete">
                                            <TrashIcon className="h-4 w-4"/>
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <div className="text-center py-6 border-2 border-dashed border-slate-200 rounded-lg mb-4">
                            <p className="text-sm text-slate-500">You haven't created any flags yet.</p>
                        </div>
                    )}

                    <div className={`mt-6 pt-4 border-t border-slate-100 ${editingFlag ? 'bg-slate-50 -mx-6 px-6 pb-6 -mb-6 mt-4 border-t' : ''}`}>
                        <h4 className="text-sm font-semibold text-slate-800 mb-3">{editingFlag?.id ? 'Edit Flag' : 'Create New Flag'}</h4>
                        <div className="space-y-4">
                            <input 
                                type="text" 
                                placeholder="Flag name (e.g., 'Urgent', 'Review')"
                                value={editingFlag?.name || ''} 
                                onChange={e => setEditingFlag(prev => ({ ...prev, name: e.target.value }))}
                                className="w-full bg-white border border-slate-300 text-slate-900 rounded-md shadow-sm py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300 focus:border-sky-500"
                            />
                            <div>
                                <p className="text-xs text-slate-500 mb-2">Select Color</p>
                                <div className="flex flex-wrap gap-2">
                                    {colors.map(color => (
                                        <button 
                                            key={color.bg} 
                                            type="button"
                                            onClick={() => setEditingFlag(prev => ({ ...prev, color: color.bg, textColor: color.text }))}
                                            className={`w-6 h-6 rounded-full ${color.bg} ring-2 ring-offset-1 transition-all ${editingFlag?.color === color.bg ? 'ring-slate-600 scale-110' : 'ring-transparent hover:ring-slate-300 hover:scale-105'}`}
                                            aria-label={`Select color`}
                                        />
                                    ))}
                                </div>
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                {editingFlag && (
                                    <button onClick={() => setEditingFlag(null)} className="px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50">
                                        Cancel
                                    </button>
                                )}
                                <button 
                                    onClick={handleSave} 
                                    disabled={!editingFlag?.name || !editingFlag?.color}
                                    className="px-4 py-2 text-sm font-medium text-white bg-sky-600 rounded-md hover:bg-sky-700 disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center gap-1"
                                >
                                    {editingFlag?.id ? 'Save Changes' : <><PlusIcon className="h-4 w-4"/> Create Flag</>}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FlagManager;
