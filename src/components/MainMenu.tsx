import React, { useState, useRef, useEffect } from 'react';
import { CheckMateLogo, ArchiveBoxIcon, CubeIcon, AdjustmentsHorizontalIcon, CheckBadgeIcon, UserCircleIcon, XMarkIcon, Cog6ToothIcon, PlusIcon } from './icons';
import { CheckCategory } from '../types';
import { auth } from '../services/firebase';

interface MainMenuProps {
    isOpen: boolean;
    onClose: () => void;
    onNavigate: (path: string) => void;
    onToggleMultiSelect: () => void;
    isMultiSelectModeActive: boolean;
    userEmail: string | null;
    activeCategory: CheckCategory | null;
    onCategoryFilterChange: (category: CheckCategory | null) => void;
}

const MainMenu: React.FC<MainMenuProps> = ({ 
    isOpen, 
    onClose, 
    onNavigate, 
    onToggleMultiSelect, 
    isMultiSelectModeActive,
    userEmail,
    activeCategory,
    onCategoryFilterChange
}) => {
    const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
    const filterDropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (filterDropdownRef.current && !filterDropdownRef.current.contains(event.target as Node)) {
                setIsFilterDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);
    
    const handleLogout = () => {
        auth.signOut();
        onClose();
    };

    const handleNavigation = (path: string) => {
        onNavigate(path);
        onClose();
    };
    
    const handleCategorySelect = (category: CheckCategory | null) => {
        onCategoryFilterChange(category);
        setIsFilterDropdownOpen(false); // Close dropdown after selection
    };
    
    const categoryFilter = (
        <div ref={filterDropdownRef} className="relative px-4">
            <button 
                onClick={() => setIsFilterDropdownOpen(p => !p)} 
                className="w-full flex items-center justify-between gap-3 px-4 py-2.5 text-slate-700 dark:text-gray-300 rounded-md hover:bg-slate-200 dark:hover:bg-gray-700 bg-white dark:bg-gray-700 border border-slate-300 dark:border-gray-600 text-sm font-medium"
            >
                <div className="flex items-center gap-3">
                    <AdjustmentsHorizontalIcon className="h-6 w-6 text-slate-500 dark:text-gray-400" />
                    <span>Filter by Category</span>
                </div>
                <svg className={`w-4 h-4 text-slate-500 dark:text-gray-400 transition-transform ${isFilterDropdownOpen ? 'rotate-180' : ''}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
            </button>
            {isFilterDropdownOpen && (
                <div className="absolute left-4 right-4 mt-2 w-auto bg-white dark:bg-gray-700 border dark:border-gray-600 rounded-md shadow-lg z-10">
                    <div className="p-2">
                        <button onClick={() => handleCategorySelect(null)} className={`block w-full text-left px-3 py-1.5 text-sm rounded-md ${!activeCategory ? 'bg-sky-100 dark:bg-sky-900 text-sky-800 dark:text-sky-300 font-semibold' : 'text-gray-700 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-gray-600'}`}>All Categories</button>
                        {Object.values(CheckCategory).map(cat => (
                             <button key={cat} onClick={() => handleCategorySelect(cat)} className={`block w-full text-left px-3 py-1.5 text-sm rounded-md ${activeCategory === cat ? 'bg-sky-100 dark:bg-sky-900 text-sky-800 dark:text-sky-300 font-semibold' : 'text-gray-700 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-gray-600'}`}>{cat}</button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );

    return (
        <>
            <div
                className={`fixed inset-0 bg-black/60 z-40 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={onClose}
                aria-hidden="true"
            />
            <div className={`fixed top-0 left-0 bottom-0 w-72 bg-slate-50 dark:bg-gray-800 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="flex flex-col h-full">
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
                        <div className="flex items-center gap-2">
                            <CheckMateLogo className="h-10 w-10" />
                            <span className="text-xl font-bold text-slate-800 dark:text-white">CheckMate</span>
                        </div>
                        <button onClick={onClose} className="p-1 rounded-full text-slate-600 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-gray-700"><XMarkIcon className="h-6 w-6" /></button>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-grow p-4 space-y-4 overflow-y-auto">
                        <div className="space-y-1">
                            <h3 className="px-4 text-xs font-semibold text-slate-400 dark:text-gray-500 uppercase tracking-wider">Actions</h3>
                             <button onClick={onToggleMultiSelect} className="w-full flex items-center gap-3 px-4 py-2.5 text-slate-700 dark:text-gray-300 rounded-md hover:bg-slate-200 dark:hover:bg-gray-700 text-sm font-medium">
                                <CheckBadgeIcon className="h-6 w-6 text-slate-500 dark:text-gray-400" />
                                <span>{isMultiSelectModeActive ? 'Cancel Selection' : 'Select Multiple'}</span>
                            </button>
                        </div>
                         <div className="space-y-1">
                             <h3 className="px-4 text-xs font-semibold text-slate-400 dark:text-gray-500 uppercase tracking-wider">Views</h3>
                            <button onClick={() => handleNavigation('/archive')} className="w-full flex items-center gap-3 px-4 py-2.5 text-slate-700 dark:text-gray-300 rounded-md hover:bg-slate-200 dark:hover:bg-gray-700 text-sm font-medium">
                                <ArchiveBoxIcon className="h-6 w-6 text-slate-500 dark:text-gray-400" />
                                <span>View Archive</span>
                            </button>
                             <button onClick={() => handleNavigation('/batch-history')} className="w-full flex items-center gap-3 px-4 py-2.5 text-slate-700 dark:text-gray-300 rounded-md hover:bg-slate-200 dark:hover:bg-gray-700 text-sm font-medium">
                                <CubeIcon className="h-6 w-6 text-slate-500 dark:text-gray-400" />
                                <span>Batch History</span>
                            </button>
                        </div>

                        {/* Mobile-only section */}
                        <div className="sm:hidden space-y-4 pt-2 border-t dark:border-gray-700">
                             <div className="space-y-1">
                                <h3 className="px-4 text-xs font-semibold text-slate-400 dark:text-gray-500 uppercase tracking-wider">Mobile Tools</h3>
                                {categoryFilter}
                            </div>
                            <div className="px-4">
                                <button
                                    onClick={() => handleNavigation('/batching')}
                                    className="w-full flex items-center justify-center bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-md shadow-sm"
                                >
                                    <span>Process Batch</span>
                                </button>
                            </div>
                        </div>
                    </nav>

                    {/* Footer / Profile */}
                    <div className="p-4 border-t dark:border-gray-700 sm:hidden">
                        <div className="space-y-1">
                            <p className="px-4 text-xs text-slate-500 dark:text-gray-400">Signed in as</p>
                            <p className="px-4 font-medium text-slate-700 dark:text-gray-300 truncate">{userEmail}</p>
                            <button onClick={() => handleNavigation('/preferences')} className="w-full flex items-center gap-3 px-4 py-2.5 text-slate-700 dark:text-gray-300 rounded-md hover:bg-slate-200 dark:hover:bg-gray-700 text-sm font-medium">
                                <Cog6ToothIcon className="h-6 w-6 text-slate-500 dark:text-gray-400" />
                                <span>Preferences</span>
                            </button>
                             <button onClick={handleLogout} className="w-full text-left px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-gray-700 rounded-md">
                                Log Out
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default MainMenu;