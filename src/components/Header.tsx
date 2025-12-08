import React, { useState, useRef, useEffect } from 'react';
import { PlusIcon, SearchIcon, AdjustmentsHorizontalIcon, UserCircleIcon, Cog6ToothIcon, Bars3Icon, CheckMateLogo, BellIcon } from './icons';
import { CheckCategory, Notification, UserProfile } from '../types';
import { auth } from '../services/firebase';
import * as firestoreService from '../services/firestoreService';
import { useNavigate } from 'react-router-dom';

interface HeaderProps {
    onOpenMainMenu: () => void;
    onAddCheck: () => void;
    onBatching: () => void;
    searchTerm: string;
    onSearchChange: (term: string) => void;
    activeCategory: CheckCategory | null;
    onCategoryFilterChange: (category: CheckCategory | null) => void;
    userEmail: string | null;
    currentUser: UserProfile | null;
    onOpenPreferences: () => void;
    notificationCount: number;
    notifications: Notification[];
}

const Header: React.FC<HeaderProps> = ({ 
    onOpenMainMenu,
    onAddCheck, 
    onBatching, 
    searchTerm, 
    onSearchChange,
    activeCategory,
    onCategoryFilterChange,
    userEmail,
    currentUser,
    onOpenPreferences,
    notificationCount,
    notifications,
}) => {
    const [isProfileMenuOpen, setProfileMenuOpen] = useState(false);
    const [isFilterMenuOpen, setFilterMenuOpen] = useState(false);
    const [isNotificationMenuOpen, setNotificationMenuOpen] = useState(false);
    const navigate = useNavigate();

    const profileMenuRef = useRef<HTMLDivElement>(null);
    const filterMenuRef = useRef<HTMLDivElement>(null);
    const notificationMenuRef = useRef<HTMLDivElement>(null);
    const prevIsNotificationMenuOpen = useRef(isNotificationMenuOpen);
    
    // 1. Create a ref to attach to the search input element
    const searchInputRef = useRef<HTMLInputElement>(null);

    // 2. Use useEffect to add a global event listener for keydown events
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            // Check for Ctrl+K on Windows/Linux or Cmd+K on macOS
            if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
                event.preventDefault(); // Prevent default browser actions
                searchInputRef.current?.focus(); // Focus the search input
            }
        };

        window.addEventListener('keydown', handleKeyDown);

        // Cleanup: remove the event listener when the component unmounts
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, []); // The empty dependency array ensures this runs only once on mount

    useEffect(() => {
        // Effect to automatically clear read notifications when the dropdown is closed.
        // This is more robust than checking the notifications array on the client,
        // as it avoids race conditions if the prop hasn't updated from Firestore yet.
        if (prevIsNotificationMenuOpen.current && !isNotificationMenuOpen && currentUser) {
            firestoreService.deleteReadNotifications(currentUser.uid);
        }
        // Update the ref for the next render cycle.
        prevIsNotificationMenuOpen.current = isNotificationMenuOpen;
    }, [isNotificationMenuOpen, currentUser]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
                setProfileMenuOpen(false);
            }
            if (filterMenuRef.current && !filterMenuRef.current.contains(event.target as Node)) {
                setFilterMenuOpen(false);
            }
            if (notificationMenuRef.current && !notificationMenuRef.current.contains(event.target as Node)) {
                setNotificationMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLogout = () => auth.signOut();
    
    const handleMarkAllAsRead = () => {
        const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
        if (unreadIds.length > 0) {
            firestoreService.markNotificationsAsRead(unreadIds);
        }
        setNotificationMenuOpen(false);
    };

    const handleNotificationClick = (notification: Notification) => {
        if (!notification.read) {
            firestoreService.markNotificationsAsRead([notification.id]);
        }
        navigate(notification.link);
        setNotificationMenuOpen(false);
    }

    return (
        <header className="bg-white dark:bg-gray-800 shadow-sm dark:shadow-lg sticky top-0 z-20">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    {/* Left Side */}
                    <div className="flex items-center">
                        <button onClick={onOpenMainMenu} className="p-2 -ml-2 mr-2 rounded-full text-slate-600 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-gray-700">
                           <Bars3Icon className="h-6 w-6" />
                        </button>
                        <div className="flex items-center">
                            <CheckMateLogo className="h-12 w-12" />
                            <h1 className="text-2xl font-bold text-slate-800 dark:text-white ml-2 hidden sm:block">CheckMate</h1>
                        </div>
                    </div>

                    {/* Center: Search & Filter */}
                    <div className="flex-1 flex justify-center px-2 lg:ml-6 lg:justify-end">
                        <div className="max-w-lg w-full lg:max-w-xs">
                            <label htmlFor="search" className="sr-only">Search</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <SearchIcon className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    // 3. Attach the ref to the input element
                                    ref={searchInputRef}
                                    id="search"
                                    name="search"
                                    className="block w-full pl-10 pr-3 py-2 border border-slate-300 dark:border-gray-600 rounded-md leading-5 bg-slate-50 dark:bg-gray-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-300 focus:border-sky-500 sm:text-sm"
                                    placeholder="Search (Ctrl+K)"
                                    type="search"
                                    value={searchTerm}
                                    onChange={(e) => onSearchChange(e.target.value)}
                                />
                            </div>
                        </div>
                         <div ref={filterMenuRef} className="relative ml-2 hidden sm:block">
                            <button
                                onClick={() => setFilterMenuOpen(prev => !prev)}
                                className="p-2 bg-white dark:bg-gray-800 hover:bg-slate-100 dark:hover:bg-gray-700 border border-slate-300 dark:border-gray-600 text-slate-600 dark:text-gray-300 rounded-md"
                            >
                                <AdjustmentsHorizontalIcon className="h-5 w-5" />
                            </button>
                            {isFilterMenuOpen && (
                                <div className="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black dark:ring-white ring-opacity-5 focus:outline-none border border-slate-200 dark:border-gray-700">
                                    <div className="py-1">
                                        <p className="px-4 py-2 text-xs text-gray-500 dark:text-gray-400 uppercase">Filter by Category</p>
                                        <button onClick={() => onCategoryFilterChange(null)} className={`block w-full text-left px-4 py-2 text-sm ${!activeCategory ? 'bg-sky-50 dark:bg-sky-900 text-sky-700 dark:text-sky-300 font-semibold' : 'text-gray-700 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-gray-700'}`}>All Categories</button>
                                        {Object.values(CheckCategory).map(cat => (
                                             <button key={cat} onClick={() => onCategoryFilterChange(cat)} className={`block w-full text-left px-4 py-2 text-sm ${activeCategory === cat ? 'bg-sky-50 dark:bg-sky-900 text-sky-700 dark:text-sky-300 font-semibold' : 'text-gray-700 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-gray-700'}`}>{cat}</button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                    
                    {/* Right Side */}
                    <div className="flex items-center space-x-2">
                        <div className="hidden sm:flex items-center space-x-2">
                            <button
                                onClick={onBatching}
                                className="flex items-center justify-center bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-md shadow-sm transition-colors duration-200"
                            >
                                <span>Batch</span>
                            </button>
                        </div>
                        <button
                            onClick={onAddCheck}
                            className="flex items-center justify-center bg-sky-600 hover:bg-sky-700 text-white font-semibold py-2 px-4 rounded-md shadow-sm transition-colors duration-200"
                        >
                            <PlusIcon className="h-5 w-5 sm:mr-2" />
                            <span className="hidden sm:block whitespace-nowrap">Add Check</span>
                        </button>
                        {/* Notification Bell */}
                    
                        <div ref={notificationMenuRef} className="relative">
                            <div className="flex justify-center items-center flex-wrap">
                            <button onClick={() => setNotificationMenuOpen(p => !p)} className="group h-8 rounded-md text-slate-500 dark:text-gray-400">
                                <BellIcon className="h-9 w-9 group-hover:fill-yellow-500 transition-colors duration-200" />
                            </button>
                            
                            {notificationCount > 0 && (
                                notificationCount < 100 ? (
                                    <span className="inline-flex items-center justify-center -ml-4 -mt-4 px-2 py-1 text-xs font-bold leading-none text-white bg-red-500 rounded-full">
                                        {notificationCount}
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center justify-center -ml-4 -mt-4 px-2 py-1 text-xs font-bold leading-none text-white bg-red-500 rounded-full">
                                        99+
                                    </span>
                                )
                            )}
                            
                            </div>
                            {isNotificationMenuOpen && (
                                <div className="origin-top-right absolute right-0 mt-2 w-80 rounded-md shadow-xl bg-white dark:bg-gray-800 ring-1 ring-black dark:ring-white ring-opacity-5 focus:outline-none border border-slate-200 dark:border-gray-700 z-30">
                                    <div className="flex justify-between items-center px-4 py-2 border-b">
                                        <p className="text-sm font-semibold text-slate-700 dark:text-white">Notifications</p>
                                        {notificationCount > 0 && (
                                            <button onClick={handleMarkAllAsRead} className="text-xs text-sky-600 dark:text-sky-400 hover:underline">
                                                Mark all as read
                                            </button>
                                        )}
                                    </div>
                                    <div className="py-1 max-h-80 overflow-y-auto">
                                        {notifications.length > 0 ? notifications.map(n => (
                                            <button key={n.id} onClick={() => handleNotificationClick(n)} className={`w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-gray-700 ${!n.read ? 'font-semibold' : ''}`}>
                                                <p>{n.message}</p>
                                                <p className={`text-xs mt-1 ${!n.read ? 'text-sky-600' : 'text-slate-400 dark:text-gray-500'}`}>{new Date(n.timestamp).toLocaleString()}</p>
                                            </button>
                                        )) : (
                                            <p className="px-4 py-3 text-sm text-center text-slate-500">No new notifications</p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                        <div ref={profileMenuRef} className="relative hidden sm:block">
                             <button onClick={() => setProfileMenuOpen(prev => !prev)} className="h-9 w-9 bg-slate-100 dark:bg-gray-700 text-slate-600 dark:text-gray-300 rounded-full hover:bg-slate-200 dark:hover:bg-gray-600 flex items-center justify-center overflow-hidden">
                                {currentUser?.profilePictureUrl ? (
                                    <img src={currentUser.profilePictureUrl} alt="Profile" className="h-full w-full object-cover"/>
                                ) : (
                                    <UserCircleIcon className="h-7 w-7" />
                                )}
                             </button>
                             {isProfileMenuOpen && (
                                <div className="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-xl py-1 bg-white dark:bg-gray-800 ring-1 ring-black dark:ring-white ring-opacity-5 focus:outline-none border border-slate-200 dark:border-gray-700 z-30">
                                    <div className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                                        <p>Signed in as</p>
                                        <p className="font-medium text-gray-700 dark:text-gray-300 truncate" title={userEmail || ''}>{userEmail}</p>
                                    </div>
                                    <div className="border-t my-1"></div>
                                    <button onClick={() => { onOpenPreferences(); setProfileMenuOpen(false); }} className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-gray-700">
                                        <Cog6ToothIcon className="h-5 w-5" />
                                        <span>Preferences</span>
                                    </button>
                                    <div className="border-t my-1"></div>
                                    <button onClick={(e) => {e.preventDefault(); handleLogout();}} className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-gray-700">
                                        Log Out
                                    </button>
                                </div>
                             )}
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Header;
