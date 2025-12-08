import React from 'react';
import { Theme, CheckStatus } from '../types';
import { XMarkIcon } from './icons';

interface ThemePickerModalProps {
    isOpen: boolean;
    onClose: () => void;
    themes: Theme[];
    onSetTheme: (target: CheckStatus | 'ARCHIVE', themeId: string) => void;
    target: CheckStatus | 'ARCHIVE' | null;
}

const ThemeSwatch = ({ theme }: { theme: Theme }) => {
    if (theme.id === 'default') {
        return <div className="w-16 h-16 rounded-full border-2 border-slate-700 dark:border-gray-600 bg-gradient-to-br from-slate-100 to-slate-300 shadow-inner group-hover:scale-110 transition-transform duration-200" title="Default theme"></div>;
    }
    // Use the explicit 'accent' color to ensure the vivid color is always available
    const accentColorClass = theme.colors.accent;
    const bgColorClass = theme.colors.bg;

    return (
        <div className="w-16 h-16 rounded-full border-2 border-slate-700 overflow-hidden shadow-inner group-hover:scale-110 transition-transform duration-200" title={theme.name}>
            <div className="w-full h-full flex">
                <div className={`w-1/2 h-full ${accentColorClass}`}></div>
                <div className={`w-1/2 h-full ${bgColorClass}`}></div>
            </div>
        </div>
    );
};

const ThemePickerModal: React.FC<ThemePickerModalProps> = ({ isOpen, onClose, themes, onSetTheme, target }) => {
    if (!isOpen || !target) return null;

    const handleThemeSelect = (themeId: string) => {
        onSetTheme(target, themeId);
        onClose();
    };
    
    const titleText = target === 'ARCHIVE' ? 'Archive View' : `"${target}" column`;

    return (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity z-50" aria-labelledby="modal-title" role="dialog" aria-modal="true">
            <div className="flex items-start justify-center min-h-screen p-4 text-center overflow-y-auto">
                <div className="relative bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all my-8 sm:max-w-md sm:w-full">
                    <div className="p-6">
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="text-xl font-bold text-slate-800 dark:text-white" id="modal-title">Select Theme</h3>
                                <p className="text-sm text-slate-500 dark:text-gray-400 mt-1">For {titleText}</p>
                            </div>
                            <button onClick={onClose} className="p-1 rounded-full text-slate-400 dark:text-gray-500 hover:text-slate-600 dark:hover:text-gray-300 hover:bg-slate-100 dark:hover:bg-gray-700 transition-colors">
                                <XMarkIcon className="h-6 w-6" />
                            </button>
                        </div>

                        {/* Updated layout for a cleaner, more horizontal appearance */}
                        <div className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-8">
                            {themes.map(theme => (
                                <button
                                    key={theme.id}
                                    onClick={() => handleThemeSelect(theme.id)}
                                    className="flex flex-col items-center gap-3 group focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 rounded-lg p-1 w-24"
                                >
                                    <ThemeSwatch theme={theme} />
                                    <span className="text-sm text-center font-medium text-slate-700 dark:text-gray-300 group-hover:text-sky-600 dark:group-hover:text-sky-400">{theme.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ThemePickerModal;