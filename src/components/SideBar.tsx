import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
    CheckMateLogo, 
    HomeIcon, 
    DocumentTextIcon, 
    AdjustmentsHorizontalIcon, 
    ArchiveBoxIcon, 
    CubeIcon, 
    Cog6ToothIcon,
    UserCircleIcon
} from './icons';
import { UserProfile, UserRole } from '../types';

interface SideBarProps {
    currentUser: UserProfile | null;
    userEmail: string | null;
}

const SideBar: React.FC<SideBarProps> = ({ currentUser, userEmail }) => {
    const navigate = useNavigate();
    const location = useLocation();

    const navItems = [
        { name: 'Dashboard', path: '/', icon: HomeIcon },
        { name: 'Kanban Board', path: '/kanban', icon: DocumentTextIcon },
        { name: 'Data List', path: '/table', icon: AdjustmentsHorizontalIcon },
        { name: 'Batch History', path: '/batch-history', icon: CubeIcon },
        { name: 'Archive', path: '/archive', icon: ArchiveBoxIcon },
    ];

    const isAdmin = ([UserRole.GLOBAL_ADMIN, UserRole.EXECUTIVE, UserRole.STAKEHOLDER, UserRole.AR_MANAGER] as string[]).includes(currentUser?.role || '');

    return (
        <aside className="w-64 bg-slate-900 dark:bg-gray-950 text-slate-400 flex flex-col h-full shrink-0 z-20">
            <div className="p-6 flex items-center gap-3">
                <CheckMateLogo className="h-10 w-10 text-sky-500" />
                <span className="text-xl font-black text-white tracking-tight uppercase">CheckMate</span>
            </div>

            <nav className="flex-grow px-4 py-6 space-y-1">
                <p className="px-4 text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Workspace</p>
                {navItems.map((item) => {
                    const isActive = location.pathname === item.path;
                    return (
                        <button
                            key={item.path}
                            onClick={() => navigate(item.path)}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${
                                isActive 
                                    ? 'bg-sky-600 text-white shadow-lg shadow-sky-600/20' 
                                    : 'hover:bg-slate-800 hover:text-white'
                            }`}
                        >
                            <item.icon className={`h-5 w-5 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                            <span>{item.name}</span>
                        </button>
                    );
                })}

                {isAdmin && (
                    <div className="pt-8 space-y-1">
                        <p className="px-4 text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Administration</p>
                        <button
                            onClick={() => navigate('/admin')}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${
                                location.pathname === '/admin' 
                                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20' 
                                    : 'hover:bg-slate-800 hover:text-white'
                            }`}
                        >
                            <Cog6ToothIcon className={`h-5 w-5 ${location.pathname === '/admin' ? 'text-white' : 'text-slate-500'}`} />
                            <span>System Admin</span>
                        </button>
                    </div>
                )}
            </nav>

            <div className="p-6 border-t border-slate-800">
                <div className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-2xl border border-slate-700/50">
                    <div className="h-10 w-10 rounded-full bg-sky-500/20 flex items-center justify-center border border-sky-500/30">
                        <UserCircleIcon className="h-6 w-6 text-sky-500" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-xs font-black text-white truncate">{currentUser?.firstName || 'User'}</p>
                        <p className="text-[10px] font-medium text-slate-500 truncate">{userEmail}</p>
                    </div>
                </div>
            </div>
        </aside>
    );
};

export default SideBar;
