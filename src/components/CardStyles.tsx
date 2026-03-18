import React from 'react';
import { Check, CheckCategory, Flag, CardLayoutZone, CheckField, UserPreferences } from '../types';
import { AVAILABLE_CARD_FIELDS, CHECK_TYPE_COLORS } from '../constants';
import { categoryConfig } from '../formConfig';
import { getColor } from '../utils/ColorResolver'
import { communityIcon, FlagIcon as FlagFilledIcon } from './icons';

const USDollar = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

// New Interface for the wrapper component (passed from PreferencesModal)
export interface CardZoneProps {
    zone: CardLayoutZone;
    fieldKey: CheckField | 'flags' | 'category' | null;
    formattedValue: string | React.ReactNode | null;
    label: string | null;
    className?: string;
    children?: React.ReactNode;
}

interface CardProps {
    check: Check;
    allFlags: Flag[];
    cardLayout: Partial<Record<CardLayoutZone, CheckField | 'flags' | 'category'>>;
    // Optional: Component to wrap fields (used for Drag-and-Drop in Preferences)
    ZoneComponent?: React.FC<CardZoneProps>;
    preferences: UserPreferences;
}

const formatValue = (value: any, key: CheckField): string | null => {
    if (value === undefined || value === null || value === '') return null;
    if (key === 'amount' && value !== 0) return USDollar.format(value);
    if (key === 'date' || key === 'createdAt' && value !== 0 || key === 'statusUpdatedAt') return new Date(value as string).toLocaleDateString();
    if (key === 'category') return (value as string).replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
    if (key === 'lastComment') return `“${String(value)}”`;
    return String(value);
};

const getField = (check: Check, cardLayout: Partial<Record<CardLayoutZone, CheckField | 'flags' | 'category'>>, zone: CardLayoutZone) => {
    const fieldKey = cardLayout[zone];

    if (!fieldKey) return { value: null, label: null, key: null, icon: null };

    const fieldConfig = AVAILABLE_CARD_FIELDS.find(f => f.key === fieldKey);
    const label = fieldConfig?.label || String(fieldKey);
    const icon = fieldConfig?.icon;

    if (fieldKey === 'flags') {
        // Special handling for flags, `renderFlags` will be used
        return { value: 'flags', label: 'Flags', key: 'flags', icon: icon };
    }

    if (fieldKey === 'category') {
        const formattedValue = formatValue(check.category, 'category');
        return { value: formattedValue, label: 'Category', key: 'category', icon: icon };
    }

    let value: any;
    if (fieldKey === 'lastComment') {
        if (!check.comments || check.comments.length === 0) {
            value = null;
        } else {
            value = check.comments[check.comments.length - 1].text;
        }
    } else {
        value = check[fieldKey as keyof Check];
    }

    const formattedValue = formatValue(value, fieldKey as CheckField);

    return { value: formattedValue, label, key: fieldKey, icon };
};

const FlagTooltip = ({ flag, darkMode }: { flag: Flag, darkMode: boolean }) => (
    <div className="group/flag relative inline-block">
        <div className={`p-1 rounded-full ${flag.color} group-hover/flag:scale-110 transition-transform duration-200 cursor-help ring-1 ring-black/5`}>
            <FlagFilledIcon className={`h-2.5 w-2.5 ${flag.textColor}`} />
        </div>
        <div className={`absolute bottom-full left-1/2 z-[60] mb-2 -translate-x-1/2 whitespace-nowrap rounded shadow-lg ${darkMode ? 'bg-gray-700' : 'bg-slate-800'} px-2 py-1 text-[10px] font-medium text-white opacity-0 transition-opacity group-hover/flag:opacity-100 pointer-events-none`}>
            {flag.name}
            <div className={`absolute top-full left-1/2 -mt-1 h-2 w-2 -translate-x-1/2 rotate-45 ${darkMode ? 'bg-gray-700' : 'bg-slate-800'}`}></div>
        </div>
    </div>
);

const renderFlags = (check: Check, allFlags: Flag[], darkMode: boolean) => {
    const checkFlags = allFlags.filter(f => check.flags?.includes(f.id));
    if (!checkFlags.length) return null;
    return <div className="flex items-center space-x-1">{checkFlags.map(flag => <FlagTooltip key={flag.id} flag={flag} darkMode={darkMode} />)}</div>;
};

// Helper to render either the simple text or the DropZone component
const renderZoneContent = (
    check: Check,
    allFlags: Flag[],
    layout: Partial<Record<CardLayoutZone, CheckField | 'flags' | 'category'>>,
    zone: CardLayoutZone,
    classes: string,
    ZoneComponent?: React.FC<CardZoneProps>,
    wrapperClasses?: string, // Wrapper div classes if needed for structure
    darkMode: boolean = false
) => {
    const fieldData = getField(check, layout, zone);

    // If we have a custom ZoneComponent (Edit Mode), use it
    if (ZoneComponent) {
        return (
            <ZoneComponent
                zone={zone}
                fieldKey={fieldData.key as any}
                formattedValue={fieldData.key === 'flags' ? renderFlags(check, allFlags, darkMode) : fieldData.value}
                label={fieldData.label}
                className={`${classes} ${wrapperClasses || ''}`}
            />
        );
    }

    // Standard Read-Only Mode
    if (!fieldData.value) return null;
    if (fieldData.key === 'flags') {
        return renderFlags(check, allFlags, darkMode);
    }

    return (
        <div className={wrapperClasses}>
            <p className={classes} title={`${fieldData.label}: ${fieldData.value}`}>
                {fieldData.value}
            </p>
        </div>
    );
};

// ==========================================
// STYLE 1: CLASSIC CARD
// ==========================================
export const ClassicCard: React.FC<CardProps> = ({ check, allFlags, cardLayout, ZoneComponent, preferences }) => {
    const { category } = check;
    const categoryInfo = CHECK_TYPE_COLORS[category];
    const darkMode = preferences.darkMode || false;
    const borderColor = categoryInfo ? (darkMode ? categoryInfo.dark.border : categoryInfo.border) : (darkMode ? 'border-slate-600' : 'border-slate-500');

    return (
        <div className={`bg-white dark:bg-gray-800 p-2 rounded-md shadow-sm border border-l-4 hover:shadow-lg cursor-pointer active:cursor-grabbing transition-all duration-200 flex flex-col justify-between ${borderColor} hover:scale-105 min-h-[140px]`}>
            <div className="flex flex-col flex-grow space-y-1">
                <div className="flex justify-between items-start gap-2">
                    {/* Title */}
                    <div className="flex items-center gap-2 flex-grow min-w-0">
                        {check.isNew && (
                            <span className="flex-shrink-0 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-sky-500 text-white shadow-sm animate-pulse">
                                NEW
                            </span>
                        )}
                        {renderZoneContent(check, allFlags, cardLayout, 'title', "font-semibold text-slate-800 dark:text-white text-base truncate", ZoneComponent, "min-w-0", darkMode)}
                    </div>
                    {/* TopRight */}
                    {renderZoneContent(check, allFlags, cardLayout, 'topRight', "font-bold text-slate-900 dark:text-white text-base", ZoneComponent, "flex-shrink-0", darkMode)}
                </div>
                {/* Subtitle */}
                {renderZoneContent(check, allFlags, cardLayout, 'subtitle', "text-xs text-slate-500 dark:text-gray-400 font-medium truncate", ZoneComponent, undefined, darkMode)}
                {/* Body1 */}
                {renderZoneContent(check, allFlags, cardLayout, 'body1', "text-sm text-slate-700 dark:text-gray-300 break-words pt-1", ZoneComponent, undefined, darkMode)}
            </div>
            <div className="flex justify-between items-end mt-1 pt-1 border-t border-slate-100 dark:border-gray-700 gap-2">
                {/* FooterLeft */}
                {renderZoneContent(check, allFlags, cardLayout, 'footerLeft', "text-xs text-slate-500 dark:text-gray-400 truncate", ZoneComponent, "flex-grow min-w-0", darkMode)}

                {/* FooterRight */}
                {renderZoneContent(check, allFlags, cardLayout, 'footerRight', "text-xs text-slate-500 dark:text-gray-400 font-mono ml-2", ZoneComponent, "flex-shrink-0", darkMode)}
            </div>
        </div>
    );
};

// ==========================================
// STYLE 2: LEDGER CARD
// ==========================================
export const LedgerCard: React.FC<CardProps> = ({ check, allFlags, cardLayout, ZoneComponent, preferences }) => {
    const darkMode = preferences.darkMode || false;
    // For Ledger, we need to handle the list items differently because of the dotted lines
    const listZones: CardLayoutZone[] = ['subtitle', 'body1', 'footerLeft', 'footerRight'];

    // If in Edit Mode (ZoneComponent exists), show all zones. If View Mode, only show populated ones.
    const activeZones = ZoneComponent
        ? listZones
        : listZones.filter(z => getField(check, cardLayout, z).value);

    return (
        <div className="relative bg-[#fcfbf9] dark:bg-gray-800 rounded shadow-sm hover:shadow-md border border-stone-200 dark:border-gray-700 cursor-pointer transition-transform duration-200 hover:scale-[1.02] group font-mono min-h-[180px]">
            <div className="absolute top-0 left-0 right-0 h-1 bg-stone-200 dark:bg-gray-700 opacity-50 bg-[length:12px_12px] bg-[radial-gradient(circle,transparent_20%,#e7e5e4_33.333%,#e7e5e4_66.667%,transparent_66.667%)] dark:bg-[radial-gradient(circle,transparent_20%,theme(colors.gray.700)_33.333%,theme(colors.gray.700)_66.667%,transparent_66.667%)] bg-[position:top_center] -mt-1.5 rounded-t-sm"></div>

            <div className="p-3 flex flex-col gap-2">
                <div className="flex justify-between items-baseline border-b-2 border-dashed border-stone-300 dark:border-gray-600 pb-2 mb-1 gap-2">
                    <div className="flex flex-col flex-grow min-w-0 gap-1">
                        {/* Using title zone for the main header text */}
                        <div className="flex items-center gap-2">
                            {check.isNew && (
                                <span className="flex-shrink-0 inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-sky-600 text-white shadow-sm leading-none">
                                    NEW
                                </span>
                            )}
                            {renderZoneContent(check, allFlags, cardLayout, 'title', "font-bold text-stone-800 dark:text-white text-sm truncate", ZoneComponent, undefined, darkMode)}
                        </div>
                    </div>
                    {/* Top Right (Amount) */}
                    {renderZoneContent(check, allFlags, cardLayout, 'topRight', "text-lg font-bold text-stone-900 dark:text-white tabular-nums tracking-tight", ZoneComponent, "flex-shrink-0", darkMode)}
                </div>

                <div className="space-y-1.5 text-xs text-stone-600 dark:text-gray-300">
                    {activeZones.map((zone) => {
                        const fieldData = getField(check, cardLayout, zone);

                        if (ZoneComponent) {
                            const content = fieldData.key === 'flags' ? renderFlags(check, allFlags, darkMode) : fieldData.value;
                            return (
                                <div key={zone} className="flex flex-col mb-1">
                                    <ZoneComponent
                                        zone={zone}
                                        fieldKey={fieldData.key as any}
                                        formattedValue={content}
                                        label={fieldData.label}
                                        className="text-right truncate"
                                    />
                                </div>
                            );
                        }

                        if (!fieldData.value) return null;

                        const content = fieldData.key === 'flags' ? renderFlags(check, allFlags, darkMode) : fieldData.value;

                        return (
                            <div key={zone} className="flex justify-between items-center gap-2">
                                <span className="uppercase text-[10px] font-bold text-stone-400 dark:text-gray-500 shrink-0 tracking-wide">{fieldData.label}</span>
                                <div className="flex-grow border-b border-dotted border-stone-300 dark:border-gray-600 h-1 mx-1 relative -top-1"></div>
                                <span className="text-right truncate max-w-[60%]">{content}</span>
                            </div>
                        );
                    })}
                </div>

                <div className="mt-2 pt-2 border-t-2 border-dashed border-stone-300 dark:border-gray-600 flex justify-between items-center">
                    <div className="scale-90 origin-left opacity-80 flex items-center">
                        {renderFlags(check, allFlags, darkMode)}
                    </div>
                    {/* Footer Right area usually used for Verified/Date in ledger. We map it above, but this slot is decorative */}
                    <div className="text-[10px] text-stone-400 dark:text-gray-400 italic">
                        TRANSACTION RECORD
                    </div>
                </div>
            </div>

            <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-[linear-gradient(45deg,transparent_33.333%,#fcfbf9_33.333%,#fcfbf9_66.667%,transparent_66.667%),linear-gradient(-45deg,transparent_33.333%,#fcfbf9_33.333%,#fcfbf9_66.667%,transparent_66.667%)] dark:bg-[linear-gradient(45deg,transparent_33.333%,theme(colors.gray.800)_33.333%,theme(colors.gray.800)_66.667%,transparent_66.667%),linear-gradient(-45deg,transparent_33.333%,theme(colors.gray.800)_33.333%,theme(colors.gray.800)_66.667%,transparent_66.667%)] bg-[length:10px_20px] bg-[position:0_100%] translate-y-full drop-shadow-sm"></div>
        </div>
    );
};

// ==========================================
// STYLE 3: MODERN CARD (Auto-Sorted)
// ==========================================

const FLAG_THEMES: Record<string, { wrapper: string; text: string; border: string; dot: string, dark: { wrapper: string; text: string; border: string; dot: string } }> = {
    red: { wrapper: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', dot: 'bg-red-500', dark: { wrapper: 'bg-red-900', text: 'text-red-300', border: 'border-red-700', dot: 'bg-red-500' } },
    orange: { wrapper: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', dot: 'bg-orange-500', dark: { wrapper: 'bg-orange-900', text: 'text-orange-300', border: 'border-orange-700', dot: 'bg-orange-500' } },
    amber: { wrapper: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500', dark: { wrapper: 'bg-amber-900', text: 'text-amber-300', border: 'border-amber-700', dot: 'bg-amber-500' } },
    yellow: { wrapper: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200', dot: 'bg-yellow-500', dark: { wrapper: 'bg-yellow-900', text: 'text-yellow-300', border: 'border-yellow-700', dot: 'bg-yellow-500' } },
    lime: { wrapper: 'bg-lime-50', text: 'text-lime-700', border: 'border-lime-200', dot: 'bg-lime-500', dark: { wrapper: 'bg-lime-900', text: 'text-lime-300', border: 'border-lime-700', dot: 'bg-lime-500' } },
    green: { wrapper: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', dot: 'bg-green-500', dark: { wrapper: 'bg-green-900', text: 'text-green-300', border: 'border-green-700', dot: 'bg-green-500' } },
    emerald: { wrapper: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500', dark: { wrapper: 'bg-emerald-900', text: 'text-emerald-300', border: 'border-emerald-700', dot: 'bg-emerald-500' } },
    teal: { wrapper: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200', dot: 'bg-teal-500', dark: { wrapper: 'bg-teal-900', text: 'text-teal-300', border: 'border-teal-700', dot: 'bg-teal-500' } },
    cyan: { wrapper: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200', dot: 'bg-cyan-500', dark: { wrapper: 'bg-cyan-900', text: 'text-cyan-300', border: 'border-cyan-700', dot: 'bg-cyan-500' } },
    sky: { wrapper: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200', dot: 'bg-sky-500', dark: { wrapper: 'bg-sky-900', text: 'text-sky-300', border: 'border-sky-700', dot: 'bg-sky-500' } },
    blue: { wrapper: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-500', dark: { wrapper: 'bg-blue-900', text: 'text-blue-300', border: 'border-blue-700', dot: 'bg-blue-500' } },
    indigo: { wrapper: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', dot: 'bg-indigo-500', dark: { wrapper: 'bg-indigo-900', text: 'text-indigo-300', border: 'border-indigo-700', dot: 'bg-indigo-500' } },
    violet: { wrapper: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200', dot: 'bg-violet-500', dark: { wrapper: 'bg-violet-900', text: 'text-violet-300', border: 'border-violet-700', dot: 'bg-violet-500' } },
    purple: { wrapper: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', dot: 'bg-purple-500', dark: { wrapper: 'bg-purple-900', text: 'text-purple-300', border: 'border-purple-700', dot: 'bg-purple-500' } },
    fuchsia: { wrapper: 'bg-fuchsia-50', text: 'text-fuchsia-700', border: 'border-fuchsia-200', dot: 'bg-fuchsia-500', dark: { wrapper: 'bg-fuchsia-900', text: 'text-fuchsia-300', border: 'border-fuchsia-700', dot: 'bg-fuchsia-500' } },
    pink: { wrapper: 'bg-pink-50', text: 'text-pink-700', border: 'border-pink-200', dot: 'bg-pink-500', dark: { wrapper: 'bg-pink-900', text: 'text-pink-300', border: 'border-pink-700', dot: 'bg-pink-500' } },
    rose: { wrapper: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', dot: 'bg-rose-500', dark: { wrapper: 'bg-rose-900', text: 'text-rose-300', border: 'border-rose-700', dot: 'bg-rose-500' } },
    default: { wrapper: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200', dot: 'bg-slate-500', dark: { wrapper: 'bg-gray-800', text: 'text-gray-300', border: 'border-gray-700', dot: 'bg-gray-500' } },
};

const getChipStyles = (bgClass: string, darkMode: boolean) => {
    const match = bgClass.match(/bg-([a-z]+)-?/);
    const colorName = match ? match[1] : 'default';
    const styles = FLAG_THEMES[colorName] || FLAG_THEMES.default;
    return darkMode && styles.dark ? styles.dark : styles;
};

export const ModernCard: React.FC<CardProps> = ({ check, allFlags, cardLayout, ZoneComponent, preferences }) => {
    const { category } = check;
    const categoryInfo = CHECK_TYPE_COLORS[category];
    const darkMode = preferences.darkMode || false;

    const defaultColors = {
        bg: 'bg-slate-500',
        border: 'border-slate-500',
        text: 'text-slate-700',
        bgLight: 'bg-slate-200',
        glow: 'shadow-slate-500/20',
        borderLight: 'border-slate-200',
        dark: { bg: 'bg-gray-700', border: 'border-gray-700', text: 'text-gray-300', bgLight: 'bg-gray-800', glow: 'shadow-gray-700/20', borderLight: 'border-gray-700' }
    };

    const colorSet = categoryInfo || defaultColors;
    const finalColor = darkMode ? colorSet.dark.bg : colorSet.border.replace('border', 'bg');

    const Icon = categoryInfo ? categoryConfig[category].icon : communityIcon;
    const subtitle = getField(check, cardLayout, 'subtitle');
    const body1 = getField(check, cardLayout, 'body1');
    const footerLeft = getField(check, cardLayout, 'footerLeft');
    const footerRight = getField(check, cardLayout, 'footerRight');

    const checkFlags = allFlags.filter(f => check.flags?.includes(f.id));
    const sortedFlags = [...checkFlags].sort((a, b) => a.name.length - b.name.length);
    const hasFlags = sortedFlags.length > 0;

    return (
        <div className="relative hover:scale-[1.02] transition-transform duration-200 cursor-pointer group min-h-[100px] shadow-md">
            <div className="bg-slate-100 dark:bg-gray-800 relative rounded-lg overflow-hidden flex flex-col h-full border-2 border-slate-300 dark:border-gray-700">

                {/* Header */}
                <div className={`px-4 py-3 relative flex justify-between items-center ${finalColor}`}>
                    <div className="absolute inset-0 bg-gradient-to-br from-slate-600/30 to-slate-400/30 dark:from-slate-200/30 dark:to-slate-400/30"></div>
                    <div className="relative flex items-center gap-2">
                        <Icon className={`w-6 h-6 text-white drop-shadow-md opacity-95`} />
                        {check.isNew && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-white text-sky-600 shadow-sm leading-none">
                                NEW
                            </span>
                        )}
                    </div>
                    <div>
                        {renderZoneContent(check, allFlags, cardLayout, 'topRight', "uppercase tracking-widest text-xs text-white bg-black/30 backdrop-blur-sm py-1 px-2 rounded shadow-lg font-bold", ZoneComponent, undefined, darkMode)}
                    </div>
                </div>

                {/* Body */}
                <div className="px-4 py-3 text-slate-700 dark:text-gray-300 flex flex-col flex-grow justify-between gap-4">
                    <div className="w-full space-y-2">
                        {renderZoneContent(check, allFlags, cardLayout, 'title', "text-sm font-bold text-slate-900 dark:text-white leading-tight", ZoneComponent, undefined, darkMode)}

                        {(ZoneComponent || subtitle.value) && (
                            <div className="flex items-center gap-1">
                                {subtitle.icon && React.createElement(subtitle.icon, { className: "w-3 h-3 inline-block mr-1 text-slate-400 dark:text-gray-500" })}
                                {renderZoneContent(check, allFlags, cardLayout, 'subtitle', "text-xs uppercase font-bold tracking-wide text-slate-500 dark:text-gray-400", ZoneComponent, undefined, darkMode)}
                            </div>
                        )}

                        {(ZoneComponent || body1.value) && (
                            <div className="flex items-center gap-1">
                                {body1.icon && React.createElement(body1.icon, { className: "w-3 h-3 inline-block mr-1 text-slate-400 dark:text-gray-500" })}
                                {renderZoneContent(check, allFlags, cardLayout, 'body1', "text-xs text-slate-600 dark:text-gray-300 leading-snug line-clamp-3", ZoneComponent, undefined, darkMode)}
                            </div>
                        )}
                    </div>

                    {/* Flags (Sorted Short -> Long) */}
                    {hasFlags && (
                        <div className="flex flex-wrap gap-2 pt-2">
                            {sortedFlags.map(flag => {
                                const styles = getChipStyles(flag.color || '', darkMode);
                                return (
                                    <span
                                        key={flag.id}
                                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border ${styles.wrapper} ${styles.text} ${styles.border}`}
                                        title={flag.name}
                                    >
                                        <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${flag.color || styles.dot}`}></span>
                                        {flag.name}
                                    </span>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex justify-between items-center px-4 py-1 border-t border-slate-200 dark:border-gray-700 bg-slate-200 dark:bg-gray-700 text-slate-600 dark:text-gray-300 gap-2">
                    {(ZoneComponent || footerLeft.value) && (
                        <div className="flex items-center gap-1">
                            {footerLeft.icon && React.createElement(footerLeft.icon, { className: "w-3 h-3 inline-block mr-1 text-slate-400 dark:text-gray-500" })}
                            {renderZoneContent(check, allFlags, cardLayout, 'footerLeft', "text-xs font-bold text-slate-900 dark:text-white flex items-center", ZoneComponent, undefined, darkMode)}
                        </div>
                    )}
                    {(ZoneComponent || footerRight.value) && (
                        <div className="flex items-center gap-1">
                            {footerRight.icon && React.createElement(footerRight.icon, { className: "w-3 h-3 inline-block ml-1 text-slate-400 dark:text-gray-500" })}
                            {renderZoneContent(check, allFlags, cardLayout, 'footerRight', "text-xs font-bold text-slate-900 dark:text-white flex items-center", ZoneComponent, undefined, darkMode)}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// ==========================================
// STYLE 4: CHECK STYLE CARD
// ==========================================

const numberToWords = (num: number): string => {
    const ones = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
    const teens = ['ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
    const tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

    if (num === 0) return 'zero';
    if (num < 10) return ones[num];
    if (num < 20) return teens[num - 10];
    if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 !== 0 ? '-' + ones[num % 10] : '');

    return num.toLocaleString('en-US');
};

export const CheckStyleCard: React.FC<CardProps> = ({ check, allFlags, cardLayout, ZoneComponent, preferences }) => {
    const { category } = check;
    const darkMode = preferences.darkMode || false;
    const categoryInfo = CHECK_TYPE_COLORS[category];
    const themeBorderColor = darkMode ? categoryInfo?.dark.border : categoryInfo?.border;
    const options = preferences.checkViewOptions;
    const amountInWords = `${numberToWords(Math.floor(check.amount))} and ${String((check.amount % 1).toFixed(2)).substring(2)}/100`;
    const fontTheme = options.fontTheme || 'cursive';
    const backgroundClass = `check-bg-modern`;

    const bgColor = getColor(darkMode ? categoryInfo?.dark.bg : categoryInfo.bg);

    const renderContent = (zone: CardLayoutZone, classes: string) => {
        return renderZoneContent(check, allFlags, cardLayout, zone, classes, ZoneComponent, undefined, darkMode);
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-2 shadow-sm border border-slate-200 dark:border-gray-700">
            <div className={`check-aspect-ratio relative w-full transition-all duration-200 ${backgroundClass}`} style={bgColor as React.CSSProperties}>
                <div className={`check-aspect-ratio relative w-full shadow-inner flex flex-col p-2 ${darkMode ? 'text-white' : 'text-black'} transition-all duration-200 border ${themeBorderColor} font-${fontTheme}-printed`}>
                    <div className={`p-2 border-2 ${themeBorderColor} h-full flex flex-col`}>
                        <div className="flex justify-between items-start leading-tight">
                            <div className="w-1/2 min-w-0 flex items-center gap-2">
                                {check.isNew && (
                                    <span className="flex-shrink-0 inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-sky-500 text-white shadow-sm">
                                        NEW
                                    </span>
                                )}
                                <p className="font-semibold truncate text-[3cqw]">{check.payor || 'Payor Name'}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-[3.5cqw] text-gray-700 font-typed-handwritten">{check.checkNumber || '101'}</p>
                                <p className="text-gray-500 text-[1.8cqw]">{new Date(check.date).toLocaleDateString()}</p>
                            </div>
                        </div>

                        {options.showPayorAddress && (
                            <div className="text-left leading-tight">
                                <p className="truncate text-[2.6cqw]">{check.payorAddress?.street || '123 Market Street'}</p>
                                <p className="truncate text-[2.5cqw]">{check.payorAddress?.city || 'New Urban'}, {check.payorAddress?.state || 'ST'} {check.payorAddress?.zip || '01234'}</p>
                            </div>
                        )}

                        <div className="flex-grow flex flex-col justify-around my-1">
                            <div className="flex items-center">
                                <div className="flex flex-col mr-2">
                                    <span className="text-[1.5cqw] leading-none whitespace-nowrap">PAY TO THE</span>
                                    <span className="text-[1.5cqw] leading-none whitespace-nowrap">ORDER OF</span>
                                </div>
                                <p className={`flex-grow border-b border-dotted border-gray-400 text-[4cqw] truncate pl-2 font-${fontTheme}-handwritten`}>{check.payee || 'Payee Name Here'}</p>
                                <div className={`ml-2 flex-shrink-0 flex items-center px-1 border border-gray-500 rounded-sm font-${fontTheme}-handwritten`}>
                                    <span className="text-[3cqw] font-mono">$</span>
                                    <span className="text-[4cqw] tracking-tight">{USDollar.format(check.amount).replace('$', '')}</span>
                                </div>
                            </div>
                            {options.showAmountInWords && (
                                <div className="flex items-center">
                                    <p className={`capitalize flex-grow border-b border-dotted border-gray-400 text-[3.2cqw] truncate font-${fontTheme}-handwritten`}>{amountInWords} Dollars</p>
                                </div>
                            )}
                        </div>

                        <div className="flex justify-between items-end flex-shrink-0">
                            <div className="flex flex-col w-1/2">
                                {options.showMemo && (
                                    <>
                                        <span className="text-gray-500 text-[1.5cqw]">MEMO</span>
                                        <p className={`border-b border-dotted border-gray-400 text-[3.2cqw] truncate font-${fontTheme}-handwritten`}>{check.memo || ''}</p>
                                    </>
                                )}
                            </div>
                            <div className="w-1/3 flex items-end">
                                {options.showSignature && (
                                    <p className={`flex-grow border-b border-dotted border-gray-400 text-[4cqw] text-center truncate pb-0 leading-tight font-${fontTheme}-signature`}>
                                        {check.payor}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Customizable overlays */}
                    <div className="absolute top-1 right-1 px-1 py-0.5 text-slate-900 dark:text-slate-300 rounded-full bg-slate-400/75 dark:bg-slate-600/75 shadow-lg border border-slate-200 dark:border-gray-700">
                        {renderContent('overlayTopRight', 'text-xs')}
                    </div>
                    <div className="absolute bottom-1 left-1 px-1 py-0.5 text-slate-900 dark:text-slate-300 rounded-full bg-slate-400/75 dark:bg-slate-600/75 shadow-lg border border-slate-200 dark:border-gray-700">
                        {renderContent('overlayBottomLeft', 'text-xs')}
                    </div>
                </div>
            </div>

            {/* Customizable footer */}
            <div className="grid grid-cols-2 gap-x-4 mt-2 px-1 text-slate-900 dark:text-slate-300">
                <div className="text-[0.6rem] leading-tight text-left truncate min-h-[1rem] p-1">
                    {renderContent('footerLeft', 'text-xs')}
                </div>
                <div className="text-[0.6rem] leading-tight text-right truncate min-h-[1rem] p-1">
                    {renderContent('footerRight', 'text-xs')}
                </div>
            </div>
        </div>
    );
};