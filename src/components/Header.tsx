import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { PlusIcon, ArchiveBoxIcon, CheckMateLogo, CubeIcon, SearchIcon, AdjustmentsHorizontalIcon, UserCircleIcon, Cog6ToothIcon, HomeIcon, UsersIcon, BuildingOfficeIcon, XMarkIcon } from './icons';
import { CheckCategory, UserProfile } from '../types';
import { auth } from '../services/firebase';

interface HeaderProps {
    onSearchChange: (term: string) => void;
    activeCategory: CheckCategory | null;
    onCategoryFilterChange: (category: CheckCategory | null) => void;
    userProfile: UserProfile | null;
}

const MobileMenu = ({ isOpen, onClose, userProfile, onCategoryFilterChange, activeCategory }: { isOpen: boolean, onClose: () => void, userProfile: UserProfile | null, onCategoryFilterChange: (cat: CheckCategory | null) => void, activeCategory: CheckCategory | null }) => {
    const navigate = useNavigate();
    const handleLogout = () => { auth.signOut(); onClose(); };
    
    const handleNavigation = (path: string) => {
        navigate(path);
        onClose();
    };
    
    return (
        <div className={`fixed inset-0 z-40 transition-opacity duration-300 ${isOpen ? 'bg-black bg-opacity-50' : 'bg-opacity-0 pointer-events-none'}`} onClick={onClose}>
            <div
                className={`fixed top-0 left-0 h-full w-72 bg-white shadow-xl transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="p-4 flex justify-between items-center border-b">
                    <h2 className="text-xl font-bold">Menu</h2>
                    <button onClick={onClose}><XMarkIcon className="h-6 w-6"/></button>
                </div>
                <div className="p-4">
                    <div className="mb-4">
                        <p className="text-sm text-slate-500">Signed in as</p>
                        <p className="font-semibold">{userProfile?.firstName} {userProfile?.lastName}</p>
                    </div>
                    <nav className="flex flex-col space-y-2">
                        <button onClick={() => handleNavigation('/archive')} className="flex items-center gap-3 p-2 rounded-md hover:bg-slate-100"><ArchiveBoxIcon className="h-5 w-5"/><span>View Archive</span></button>
                        <button onClick={() => handleNavigation('/batches')} className="flex items-center gap-3 p-2 rounded-md hover:bg-slate-100"><CubeIcon className="h-5 w-5"/><span>Batch History</span></button>
                        <button onClick={() => handleNavigation('/profile')} className="flex items-center gap-3 p-2 rounded-md hover:bg-slate-100"><Cog6ToothIcon className="h-5 w-5"/><span>Profile & Preferences</span></button>
                    </nav>
                    <div className="mt-4 border-t pt-4">
                         <p className="px-2 text-xs text-gray-500 uppercase">Filter by Category</p>
                         <button onClick={() => onCategoryFilterChange(null)} className={`block w-full text-left p-2 rounded-md text-sm ${!activeCategory ? 'bg-sky-50 text-sky-700 font-semibold' : 'hover:bg-slate-50'}`}>All Categories</button>
                         {Object.values(CheckCategory).map(cat => (
                             <button key={cat} onClick={() => onCategoryFilterChange(cat)} className={`block w-full text-left p-2 rounded-md text-sm ${activeCategory === cat ? 'bg-sky-50 text-sky-700 font-semibold' : 'hover:bg-slate-50'}`}>{cat}</button>
                         ))}
                    </div>

                    <button onClick={handleLogout} className="mt-6 w-full text-left p-2 rounded-md text-sm text-red-600 hover:bg-red-50">Log Out</button>
                </div>
            </div>
        </div>
    );
};


const Header: React.FC<HeaderProps> = ({ 
    onSearchChange,
    activeCategory,
    onCategoryFilterChange,
    userProfile,
}) => {
    const navigate = useNavigate();
    const location = useLocation();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const ProfileIcon = () => (
        <button onClick={() => navigate('/profile')} className="p-1.5 bg-slate-100 text-slate-600 rounded-full hover:bg-slate-200">
            {userProfile?.photoURL ? (
                <img src={userProfile.photoURL} alt="Profile" className="h-6 w-6 rounded-full object-cover" />
            ) : (
                <UserCircleIcon className="h-6 w-6" />
            )}
        </button>
    );

    return (
        <>
            <header className="bg-white shadow-sm sticky top-0 z-20">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        {/* Left Side */}
                        <div className="flex items-center">
                            <Link to="/" className="flex items-center">
                                <CheckMateLogo className="h-8 w-8" />
                                <h1 className="text-2xl font-bold text-slate-800 ml-2 hidden sm:block">CheckMate</h1>
                            </Link>
                        </div>

                        {/* Center: Search */}
                        <div className="flex-1 flex justify-center px-2 lg:ml-6 lg:justify-end">
                            <div className="max-w-lg w-full lg:max-w-xs">
                                <label htmlFor="search" className="sr-only">Search</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><SearchIcon className="h-5 w-5 text-gray-400" /></div>
                                    <input
                                        id="search"
                                        name="search"
                                        className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-md leading-5 bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-300 sm:text-sm"
                                        placeholder="Search payor, memo..."
                                        type="search"
                                        onChange={(e) => onSearchChange(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                        
                        {/* Right Side */}
                        <div className="flex items-center space-x-2">
                            <button
                                onClick={() => navigate('/?modal=add-check', { state: { backgroundLocation: location } })}
                                className="flex items-center justify-center bg-sky-600 hover:bg-sky-700 text-white font-semibold py-2 px-4 rounded-md shadow-sm transition-colors duration-200"
                            >
                                <PlusIcon className="h-5 w-5 sm:mr-2" />
                                <span className="hidden sm:block">Add Check</span>
                            </button>
                            <div className="hidden md:flex items-center space-x-2">
                                <button onClick={() => navigate('/archive')} title="View Archive" className="p-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-600 rounded-md shadow-sm"><ArchiveBoxIcon className="h-5 w-5" /></button>
                                <button onClick={() => navigate('/batches')} title="Batch History" className="p-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-600 rounded-md shadow-sm"><CubeIcon className="h-5 w-5" /></button>
                                <button onClick={() => navigate('/?modal=batching', { state: { backgroundLocation: location } })} className="flex items-center bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-md shadow-sm"><span>Batch</span></button>
                                <ProfileIcon/>
                            </div>
                            <div className="md:hidden">
                                <button onClick={() => setIsMobileMenuOpen(true)} className="p-2"><AdjustmentsHorizontalIcon className="h-6 w-6"/></button>
                            </div>
                        </div>
                    </div>
                </div>
            </header>
            <MobileMenu isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} userProfile={userProfile} onCategoryFilterChange={onCategoryFilterChange} activeCategory={activeCategory} />
        </>
    );
};

export default Header;