import React, { useState } from 'react';
import { Flag } from '../types';
import { XMarkIcon, PencilIcon, TrashIcon, PlusIcon } from './icons';
import { v4 as uuidv4 } from 'uuid'; // A robust way to generate unique IDs

interface FlagManagerProps {
  isOpen: boolean;
  flags: Flag[];
  onClose: () => void;
  onUpdateFlags: (updatedFlags: Flag[]) => void;
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

const FlagManager: React.FC<FlagManagerProps> = ({ isOpen, flags, onClose, onUpdateFlags }) => {
    const [editingFlag, setEditingFlag] = useState<Partial<Flag> | null>(null);

    const handleSave = () => {
        if (!editingFlag || !editingFlag.name || !editingFlag.color) return;

        let updatedFlags;
        if (editingFlag.id) {
            updatedFlags = flags.map(f => f.id === editingFlag.id ? editingFlag as Flag : f);
        } else {
            updatedFlags = [...flags, { ...editingFlag, id: `flag-${uuidv4()}` } as Flag];
        }
        onUpdateFlags(updatedFlags);
        setEditingFlag(null);
    };

    const handleDelete = (id: string) => {
        onUpdateFlags(flags.filter(f => f.id !== id));
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity z-50">
            <div className="flex items-center justify-center min-h-screen p-4">
                <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md">
                    <div className="p-6">
                        <div className="flex justify-between items-center">
                            <h3 className="text-lg font-medium text-gray-900">Manage Flags</h3>
                            <button onClick={onClose} className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"><XMarkIcon className="h-6 w-6" /></button>
                        </div>
                        <div className="mt-4 max-h-60 overflow-y-auto pr-2">
                            <ul className="space-y-2">
                                {flags.map(flag => (
                                    <li key={flag.id} className="flex items-center justify-between p-2 bg-slate-50 rounded-md">
                                        <span className={`px-2 py-1 rounded text-sm font-medium ${flag.color} ${flag.textColor}`}>{flag.name}</span>
                                        <div className="flex gap-2">
                                            <button onClick={() => setEditingFlag(flag)} className="text-slate-500 hover:text-slate-700"><PencilIcon className="h-5 w-5"/></button>
                                            <button onClick={() => handleDelete(flag.id)} className="text-red-500 hover:text-red-700"><TrashIcon className="h-5 w-5"/></button>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="mt-6 border-t pt-4">
                            <h4 className="text-md font-medium text-gray-800">{editingFlag?.id ? 'Edit Flag' : 'Add New Flag'}</h4>
                             <div className="mt-2 space-y-3">
                                <input 
                                    type="text" 
                                    placeholder="Flag name"
                                    value={editingFlag?.name || ''} 
                                    onChange={e => setEditingFlag(prev => ({ ...prev, name: e.target.value }))}
                                    className="w-full bg-slate-50 border border-slate-300 text-slate-900 rounded-md shadow-sm py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300 focus:border-sky-500"
                                />
                                <div className="flex flex-wrap gap-2">
                                    {colors.map(color => (
                                        <button 
                                            key={color.bg} 
                                            onClick={() => setEditingFlag(prev => ({ ...prev, color: color.bg, textColor: color.text }))}
                                            className={`w-8 h-8 rounded-full ${color.bg} ${editingFlag?.color === color.bg ? 'ring-2 ring-offset-2 ring-sky-500' : ''}`}
                                        />
                                    ))}
                                </div>
                                <div className="flex justify-end gap-2">
                                    {editingFlag && <button onClick={() => setEditingFlag(null)} className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50">Cancel</button>}
                                    <button onClick={handleSave} className="px-4 py-2 text-sm font-medium text-white bg-sky-600 rounded-md hover:bg-sky-700 flex items-center">
                                        <PlusIcon className="h-4 w-4 mr-1"/> {editingFlag?.id ? 'Save' : 'Add'}
                                    </button>
                                </div>
                             </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FlagManager;
