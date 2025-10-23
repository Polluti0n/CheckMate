import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Check, CheckStatus, CheckField, Flag, Theme, CardLayoutZone, CheckCategory, CheckViewOptions, CheckOverlayZone, CheckFooterZone, CheckFontTheme, CheckViewLayoutZone } from '../types'; // PlusSmallIcon is not used here
import { FlagIcon, DocumentTextIcon, EllipsisVerticalIcon, ChevronUpDownIcon, ArrowSmallUpIcon, ArrowSmallDownIcon, CheckBadgeIcon, PaintBrushIcon, CurrencyDollarIcon, EyeIcon, EyeSlashIcon, ArrowsPointingOutIcon, XMarkIcon } from './icons';
import {
  draggable,
  dropTargetForElements,
  monitorForElements,
} from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';
import { ALL_CHECK_FIELDS, CHECK_TYPE_COLORS } from '../constants';
import { categoryConfig } from '../formConfig';
import './CheckDashboard.css'; // <-- IMPORT THE NEW CSS FILE

// ... (keep the rest of the initial constants and types like statusColors, DragState, etc.)
const statusColors: Record<CheckStatus, { border: string, bg: string, text: string }> = {
    [CheckStatus.RECEIVED]: { border: 'border-sky-500', bg: 'bg-sky-50', text: 'text-sky-800' },
    [CheckStatus.CONFIRMING_DETAILS]: { border: 'border-amber-500', bg: 'bg-amber-50', text: 'text-amber-800' },
    [CheckStatus.QUEUED]: { border: 'border-purple-500', bg: 'bg-purple-50', text: 'text-purple-800' },
    [CheckStatus.COMPLETE]: { border: 'border-green-500', bg: 'bg-green-50', text: 'text-green-800' },
    [CheckStatus.ARCHIVED]: { border: 'border-slate-500', bg: 'bg-slate-50', text: 'text-slate-800' },
};

    // Helper function to get CHECK_TYPE_COLORS based on the CheckCategory then extract the base color and use it to create a light border.
    const cardBorder = (category: CheckCategory) => {
        const baseColor = CHECK_TYPE_COLORS[category]?.split('-')[1];
        if (!baseColor) return 'border-slate-500';
        return baseColor ? `border-${baseColor}-500` : 'border-slate-500';
    };

type DragState =
  | { type: 'idle' }
  | { type: 'dragging'; checkId: string }
  | { type: 'preview'; checkId: string; dragTo: { status: CheckStatus, index: number } };

const USDollar = new Intl.NumberFormat('en-US', {style: 'currency',currency: 'USD',});


// NEW AND IMPROVED CheckCardAsCheck component
export const CheckCardAsCheck = React.memo(({ 
    check, isSelected, flags, options, isPreview = false, onVisibilityChange,
    draggableFieldComponent: DraggableField,
    dropZoneComponent: DropZone,
    onDropOnZone,
    dragState
}: { 
    check: Check; 
    isSelected: boolean; 
    flags: Flag[]; 
    options: CheckViewOptions;
    isPreview?: boolean;
    onVisibilityChange?: (element: keyof CheckViewOptions) => void;
    draggableFieldComponent?: React.ComponentType<any>;
    dropZoneComponent?: React.ComponentType<any>;
    onDropOnZone?: (zone: CheckViewLayoutZone) => void; // This is passed but not used inside CheckCardAsCheck directly
    dragState?: { type: 'dragging', fieldKey: CheckField | 'flags' | 'category' } | { type: 'idle' };
}) => {
    const themeBorderColor = statusColors[check.status].border;
    // Function to convert number to words for the dollar amount line
    const numberToWords = (num: number): string => {
        // This is a simplified version. For a full implementation, you'd use a library.
        const ones = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
        const teens = ['ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
        const tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

        if (num === 0) return 'zero';
        // For simplicity, we'll just return the number as a string for this example
        return num.toLocaleString('en-US');
    };


    
    const amountInWords = `${numberToWords(Math.floor(check.amount))} and ${String((check.amount % 1).toFixed(2)).substring(2)}/100`;

    const fontTheme: CheckFontTheme = options.fontTheme || 'cursive';
    const backgroundClass = `check-bg-${options.background || 'classic'}`;

    const formatValue = (value: any, key: CheckField): string | null => {
        if (value === undefined || value === null || value === '') return null;
        if (key === 'amount') return USDollar.format(value);
        if (key === 'date' || key === 'createdAt' || key === 'statusUpdatedAt') return new Date(value as string).toLocaleDateString();
        if (key === 'category') return (value as CheckCategory).replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
        if (key === 'lastComment') return `“${String(value)}”`;
        return String(value);
    };

    const renderDataField = (fieldKey: CheckField | 'flags' | 'category' | 'none' | undefined) => {
        if (!fieldKey || fieldKey === 'none') return { label: null, content: null };

        let content: React.ReactNode;
        let label: string;

        if (fieldKey === 'flags') {
            const checkFlags = flags.filter(f => check.flags?.includes(f.id));
            label = 'Flags';
            content = checkFlags.length > 0 ? (
                    <div className="flex items-center space-x-1">
                        {checkFlags.map(flag => (
                            <div key={flag.id} className={`p-0.5 rounded-full ${flag.color}`} title={flag.name}>
                                <FlagIcon className={`h-3 w-3 ${flag.textColor}`} />
                            </div>
                        ))}
                    </div>
            ) : <span className="text-slate-400 italic">None</span>;
        } else if (fieldKey === 'category') {
            label = 'Category';
            content = <span className="font-medium text-slate-700">{check.category}</span>;
        } else {
            const fieldConfig = ALL_CHECK_FIELDS.find(f => f.key === fieldKey);
            label = fieldConfig?.label || String(fieldKey);
            const value = (check as any)[fieldKey as keyof Check];
            content = <span className="font-medium text-slate-700 truncate">{formatValue(value, fieldKey) || <span className="text-slate-400 italic">N/A</span>}</span>;
        }

        return { label, content };
    };

    const TogglableElement = ({ target, children }: { target: keyof CheckViewOptions, children: React.ReactNode }) => {
        const isVisible = options[target as keyof typeof options] !== false; // Default to true if undefined
        if (!isPreview) {
            return isVisible ? <>{children}</> : null;
        }

        return (
            <div className={`relative group p-1 -m-1 rounded-md transition-colors ${isVisible ? 'hover:bg-sky-100/50' : 'hover:bg-slate-100/50'}`}>
                <div className={`${isVisible ? '' : 'opacity-20'}`}>{children}</div>
                <button 
                    onClick={() => onVisibilityChange?.(target)}
                    className="absolute top-0 right-0 z-10 p-0.5 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                >
                    {isVisible ? <EyeIcon className="h-3 w-3 text-sky-600"/> : <EyeSlashIcon className="h-3 w-3 text-slate-500"/>}
                </button>
            </div>
        );
    };

    const renderPreviewZone = (zone: CheckViewLayoutZone, fieldKey: CheckField | 'flags' | 'category' | 'none' | undefined) => {
        if (!DraggableField || !DropZone || !onDropOnZone || !dragState) return null;
        
        const { label, content } = renderDataField(fieldKey);
        
        if (label && content) {
            const field = { key: fieldKey, label };
            return (
                <DraggableField
                    field={field}
                    isDragging={dragState.type === 'dragging' && dragState.fieldKey === field.key}
                    sourceZone={zone}
                />
            );
        }
        return null;
    };

    const { label: overlayTopRightLabel, content: overlayTopRightContent } = renderDataField(options.overlays?.overlayTopRight);
    const { label: overlayBottomLeftLabel, content: overlayBottomLeftContent } = renderDataField(options.overlays?.overlayBottomLeft);
    const { label: footerLeftLabel, content: footerLeftContent } = renderDataField(options.footer?.footerLeft);
    const { label: footerRightLabel, content: footerRightContent } = renderDataField(options.footer?.footerRight);

    const overlayTopRightNode = isPreview ? renderPreviewZone('overlayTopRight', options.overlays?.overlayTopRight) : overlayTopRightContent;
    const overlayBottomLeftNode = isPreview ? renderPreviewZone('overlayBottomLeft', options.overlays?.overlayBottomLeft) : overlayBottomLeftContent;
    const footerLeftNode = isPreview ? renderPreviewZone('footerLeft', options.footer?.footerLeft) : footerLeftContent;
    const footerRightNode = isPreview ? renderPreviewZone('footerRight', options.footer?.footerRight) : footerRightContent;

    return (
        <div className={`bg-white rounded-lg p-2 shadow-sm border ${isSelected ? `ring-2 ring-offset-2 ring-blue-500` : 'border-slate-200'}`}>
            <div className={`check-aspect-ratio relative w-full transition-all duration-200 ${backgroundClass}`}>
                <div className={`check-aspect-ratio relative w-full shadow-inner flex flex-col p-2 text-black transition-all duration-200 border ${themeBorderColor} check-card-bg font-${fontTheme}-printed`}>
                    <div className={`p-2 text-black border-2 ${themeBorderColor} h-full flex flex-col`}>
                        <div className="flex justify-between items-start leading-tight">
                            <div className="w-1/2 min-w-0">
                                <p className="font-semibold truncate text-[3cqw]">{check.payor || 'Payor Name'}</p>
                                <TogglableElement target="showPayorAddress">
                                    <p className="truncate text-[2.6cqw]">123 Market Street</p>
                                    <p className="truncate text-[2.5cqw]">New Urban, ST 01234</p>
                                </TogglableElement>
                            </div>
                            <div className="text-right">
                                <p className={`text-[3.5cqw] text-gray-700 font-typed-handwritten`}>{check.checkNumber || '101'}</p>
                                <p className="text-gray-500 text-[1.8cqw]">{new Date(check.date).toLocaleDateString()}</p>
                            </div>
                        </div>
                        
                        <div className="flex-grow flex flex-col justify-around my-1">
                            <div className="flex items-center">
                                <div className="flex flex-col mr-2">
                                    <span className="text-[1.5cqw] leading-none whitespace-nowrap">PAY TO THE</span>
                                    <span className="text-[1.5cqw] leading-none whitespace-nowrap">ORDER OF</span>
                                </div>
                                <p className={`flex-grow border-b border-dotted border-gray-400 text-[4cqw] truncate pl-2 ${`font-${fontTheme}-handwritten`}`}>{check.payee || 'Payee Name Here'}</p>
                                <div className={`ml-2 flex-shrink-0 flex items-center px-1 border border-gray-500 rounded-sm ${`font-${fontTheme}-handwritten`}`}>
                                    <span className="text-[3cqw] font-mono">$</span>
                                    <span className="text-[4cqw] tracking-tight">{USDollar.format(check.amount).replace('$', '')}</span>
                                </div>
                            </div>
                            <TogglableElement target="showAmountInWords">
                                <div className="flex items-center">
                                    <p className={`capitalize flex-grow border-b border-dotted border-gray-400 pb-1 text-[3.2cqw] truncate ${`font-${fontTheme}-handwritten`}`}>{amountInWords} Dollars</p>
                                </div>
                            </TogglableElement>
                        </div>

                        <div className="flex justify-between items-end flex-shrink-0">
                            <div className="w-1/3">
                                <TogglableElement target="showMemo">
                                    <span className="text-gray-500 text-[1.5cqw]">MEMO</span>
                                    <p className={`border-b border-dotted border-gray-400 text-[3.2cqw] truncate ${`font-${fontTheme}-handwritten`}`}>{check.memo || ''}</p>
                                </TogglableElement>
                            </div>
                            <div className="w-1/2 flex items-end">
                                <TogglableElement target="showSignature">
                                    <p className={`flex-grow border-b border-dotted border-gray-400 text-[4cqw] text-center truncate pb-0 leading-tight ${`font-${fontTheme}-signature`}`}>
                                        {check.payor}
                                    </p>
                                </TogglableElement>
                            </div>
                        </div>
                    </div>
                    {isPreview && DropZone ? (
                        <>
                            <DropZone zone="overlayTopRight" onDrop={onDropOnZone} className="check-overlay top-1 right-1">{overlayTopRightNode}</DropZone>
                            <DropZone zone="overlayBottomLeft" onDrop={onDropOnZone} className="check-overlay bottom-1 left-1">{overlayBottomLeftNode}</DropZone>
                        </>
                    ) : (
                        <>
                            {overlayTopRightContent && <div className="check-overlay top-1 -translate-y-full right-0 bg-slate-200 rounded-full border border-slate-500">{overlayTopRightContent}</div>} 
                            {overlayBottomLeftContent && <div className="check-overlay top-1 -translate-y-full left-0 bg-slate-200 rounded-full border border-slate-500">{overlayBottomLeftContent}</div>} 
                        </>
                    )}
                </div>
            </div>
            {(footerLeftNode || footerRightNode || isPreview) && (
                <div className="grid grid-cols-2 gap-x-4 mt-2 px-1">
                    {isPreview && DropZone ? (
                        <>
                            <DropZone zone="footerLeft" onDrop={onDropOnZone} className="text-[0.6rem] leading-tight text-left truncate min-h-[1rem] p-1">{footerLeftNode}</DropZone>
                            <DropZone zone="footerRight" onDrop={onDropOnZone} className="text-[0.6rem] leading-tight text-right truncate min-h-[1rem] p-1">{footerRightNode}</DropZone>
                        </>
                    ) : (
                        <>
                            <div className="text-[0.6rem] leading-tight text-left truncate">{footerLeftContent && <><span className="text-slate-500 uppercase font-semibold">{footerLeftLabel}:</span> <span className="text-slate-700">{footerLeftContent}</span></>}</div>
                            <div className="text-[0.6rem] leading-tight text-right truncate">{footerRightContent && <><span className="text-slate-500 uppercase font-semibold">{footerRightLabel}:</span> <span className="text-slate-700">{footerRightContent}</span></>}</div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
});

// ... (The rest of your component code remains the same)
// Just make sure the CheckCard component correctly renders CheckCardAsCheck when viewMode is 'check'

const CheckCardContent = ({ check, flags, theme, cardLayout, isSelected }: {
    check: Check;
    flags: Flag[];
    theme?: Theme;
    cardLayout: Partial<Record<CardLayoutZone, CheckField>>;
    isSelected: boolean;
}) => {
    const checkFlags = flags.filter(f => check.flags.includes(f.id));
   // const themeBorderColor = theme?.colors.border || statusColors[check.status].border;
   const checkBorder = cardBorder(check.category);


    const formatValue = (value: any, key: CheckField): string | null => {
        if (value === undefined || value === null || value === '') return null;
        if (key === 'amount') return USDollar.format(value);
        if (key === 'date' || key === 'createdAt') return new Date(value as string).toLocaleDateString();
        if (key === 'category') return (value as CheckCategory).replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
        if (key === 'lastComment') return `“${String(value)}”`;
        return String(value);
    };

    const renderField = (zone: CardLayoutZone): React.ReactNode | null => {
        const fieldKey = cardLayout[zone];
        if (!fieldKey) return null;
        
        let value: any;
        if (fieldKey === 'lastComment') {
            if (check.comments.length === 0) return null;
            value = check.comments[check.comments.length - 1].text;
        } else {
            value = check[fieldKey as keyof Check];
        }

        const formatted = formatValue(value, fieldKey);
        if (!formatted) return null;

        const fieldConfig = ALL_CHECK_FIELDS.find(f => f.key === fieldKey);
        const fullTitle = `${fieldConfig?.label}: ${String(value)}`;

        switch(zone) {
            case 'title': return <p className="font-semibold text-slate-800 text-base flex-grow pr-2 truncate" title={fullTitle}>{formatted}</p>;
            case 'topRight': return <p className="font-bold text-slate-900 text-base flex-shrink-0" title={fullTitle}>{formatted}</p>;
            case 'subtitle': return <p className="text-xs text-slate-500 font-medium truncate" title={fullTitle}>{formatted}</p>;
            case 'body1':
            case 'body2':
                return <p className="text-sm text-slate-700 break-words" title={fullTitle}>{formatted}</p>;
            case 'footerLeft': return <p className="text-xs text-slate-500 flex-grow pr-2 truncate" title={fullTitle}>{formatted}</p>;
            case 'footerRight': return <p className="text-xs text-slate-500 flex-shrink-0 font-mono" title={fullTitle}>{formatted}</p>;
            default: return null;
        }
    };
    
    const fields = {
        title: renderField('title'),
        topRight: renderField('topRight'),
        subtitle: renderField('subtitle'),
        body1: renderField('body1'),
        body2: renderField('body2'),
        footerLeft: renderField('footerLeft'),
        footerRight: renderField('footerRight'),
    };
    
    return (
        <div className={`bg-white p-2 rounded-md shadow-sm ${isSelected ? '' : 'border border-l-4' } hover:shadow- cursor-pointer active:cursor-grabbing transition-all duration-200 flex flex-col justify-between ${checkBorder} hover:border-sky-500 hover:scale-105`}>
             <div className="flex flex-col flex-grow space-y-1">
                {(fields.title || fields.topRight) && (
                    <div className="flex justify-between items-start">
                        {fields.title || <div/>}
                        {fields.topRight}
                    </div>
                )}
                 {fields.subtitle && <div>{fields.subtitle}</div>}
                 {fields.body1 && <div className="pt-1">{fields.body1}</div>}
                 {fields.body2 && <div>{fields.body2}</div>}
            </div>
            
            <div className="flex justify-between items-end mt-1 pt-1 border-t border-slate-100">
                {(fields.footerLeft || fields.footerRight) ? (
                     <div className="flex justify-between items-end w-full">
                        {fields.footerLeft || <div/>}
                        {fields.footerRight}
                    </div>
                ) : <div />}

                <div className="flex items-center justify-end px-2">
                    {/* Render only the first 5 flags, then a count if more */
                    checkFlags.slice(0, 5).map(flag => (
                        <div key={flag.id} className='group relative inline-block'>
                        <div className={`p-1 -mr-2 rounded-full ${flag.color} group-hover:scale-110 transition-all duration-200`} title={flag.name}>
                            <FlagIcon className={`h-2.5 w-2.5 ${flag.textColor} group-hover:scale-110 transition-all duration-200`} />
                        </div>
                        <div className={`absolute bottom-2/3 left-1/2 z-20 mb-3 -translate-x-1/2 whitespace-nowrap rounded-[5px] ${flag.color} px-3 py-2 text-xs font-medium ${flag.textColor} opacity-0 group-hover:opacity-100`}>
                            <span className={`absolute bottom-[-3px] left-1/2 -z-10 h-2 w-2 -translate-x-1/2 rotate-45 rounded-xs ${flag.color}`}></span>
                            {flag.name}
                        </div>
                    </div>
                    ))}
                    {checkFlags.length > 5 && (
                        <div className="ml-2 text-xs text-slate-500">+{checkFlags.length - 5}</div>
                    )}
                </div>
            </div>
        </div>
    );
};

const DropIndicator = ({ check, flags, theme, cardLayout }: { 
    check: Check; 
    flags: Flag[]; 
    theme?: Theme;
    cardLayout: Partial<Record<CardLayoutZone, CheckField>>;
    }) => (
        <li className="drop-indicator" aria-hidden="true">
            <div className="opacity-50">
                <CheckCardContent 
                    check={check} 
                    flags={flags} 
                    theme={theme}
                    cardLayout={cardLayout}
                    isSelected
                />
            </div>
        </li>
    );

const CheckCard = React.memo(({ check, flags, isDragging, isSelected, isMultiSelectMode, onSelectCheck, onCheckSelection, theme, cardLayout, viewMode, checkViewOptions }: { 
    check: Check; 
    flags: Flag[]; 
    isDragging: boolean;
    isSelected: boolean;
    isMultiSelectMode: boolean;
    onSelectCheck: (check: Check) => void;
    onCheckSelection: (checkId: string, event: React.MouseEvent) => void;
    theme?: Theme;
    cardLayout: Partial<Record<CardLayoutZone, CheckField>>;
    viewMode: 'card' | 'check';
    checkViewOptions: CheckViewOptions;
}) => {
    const ref = useRef<HTMLLIElement>(null);
    
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        return draggable({
            element: el,
            getInitialData: () => ({ checkId: check.id, status: check.status, type: 'check' }),
        });
    }, [check]);

    const handleClick = (event: React.MouseEvent) => {
        const { ctrlKey, metaKey, shiftKey } = event;
        // If we are in multi-select mode OR a modifier key is pressed, it's a selection action.
        if (isMultiSelectMode || ctrlKey || metaKey || shiftKey) {
            onCheckSelection(check.id, event);
        } else {
            // Otherwise, it's a single click to open the details.
            onSelectCheck(check);
        }
    };
    
    const isMultiSelectActive = isMultiSelectMode || isSelected;
    const glowClasses = isSelected && isMultiSelectActive && theme?.colors.glow ? `select-glow` : '';
    const glowColor = isSelected && isMultiSelectActive && theme?.colors.glow ? theme.colors.glow : '';
    
    return (
        <li
            ref={ref}
            onClick={handleClick}
            className={`${isDragging ? 'dragging-card' : ''} ${isSelected && isMultiSelectActive ? `bg-sky-500 ${glowClasses} select-glow rounded-md shadow-sm  hover:shadow-md` : ''}`}
            style={{ ['--glow-color' as string]: glowColor } as React.CSSProperties}
        >
           {viewMode === 'check' ? (
                <CheckCardAsCheck
                    check={check}
                    isSelected={isSelected}
                    flags={flags}
                    options={checkViewOptions} />
            ) : (
                <CheckCardContent
                    check={check}
                    flags={flags}
                    theme={theme}
                    cardLayout={cardLayout}
                    isSelected={isSelected}
                />
            )}
        </li>
    );
});

const getDestinationIndex = (
  clientY: number,
  childElements: HTMLElement[]
): number => {
  if (childElements.length === 0) {
    return 0;
  }

  const closest = childElements.reduce(
    (acc, child, index) => {
      const rect = child.getBoundingClientRect();
      const midY = rect.top + rect.height / 2;
      const distance = Math.abs(clientY - midY);

      if (distance < acc.distance) {
        return { distance, index, rect };
      }
      return acc;
    },
    { distance: Infinity, index: -1, rect: null as DOMRect | null }
  );

  if (!closest.rect) {
    return childElements.length;
  }

  const isAfter = clientY > closest.rect.top + closest.rect.height / 2;

  return isAfter ? closest.index + 1 : closest.index;
};


const KanbanColumn = ({ status, checks, flags, onExpand, onSelectCheck, dragState, draggingCheck, isOver, sortConfig, onSort, onSelectAllInColumn, selectedCheckIds, displayOptions, themeId, themes, onToggleDisplayOption, onOpenThemePicker, isMultiSelectMode, onCheckSelection, cardLayout, viewMode, checkViewOptions }: { 
    status: CheckStatus;
    checks: Check[]; 
    flags: Flag[]; 
    onExpand: (status: CheckStatus) => void;
    onSelectCheck: (check: Check) => void;
    dragState: DragState;
    draggingCheck?: Check 
    isOver: boolean;
    sortConfig: { key: keyof Check; direction: 'asc' | 'desc' } | undefined;
    onSort: (status: CheckStatus, key: keyof Check) => void;
    onSelectAllInColumn: (status: CheckStatus) => void;
    selectedCheckIds: string[];
    displayOptions: { showCount: boolean; showTotal: boolean };
    themeId: string;
    themes: Theme[];
    onToggleDisplayOption: (status: CheckStatus, option: 'showCount' | 'showTotal') => void;
    onOpenThemePicker: (status: CheckStatus) => void;
    isMultiSelectMode: boolean;
    onCheckSelection: (checkId: string, event: React.MouseEvent) => void;
    cardLayout: Partial<Record<CardLayoutZone, CheckField>>;
    viewMode: 'card' | 'check';
    checkViewOptions: CheckViewOptions;
}) => {
    const ref = useRef<HTMLUListElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    
    const theme = themes.find(t => t.id === themeId) || themes.find(t => t.id === 'default');
    const colors = theme && theme.id !== 'default' ? theme.colors : statusColors[status];

    const columnTotal = useMemo(() => checks.reduce((sum, check) => sum + check.amount, 0), [checks]);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;

        return dropTargetForElements({
            element: el,
            getData: () => ({ status }),
        });
    }, [status]);

     useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);
    
    const dropIndex = dragState.type === 'preview' && dragState.dragTo.status === status ? dragState.dragTo.index : null;
    const sortableKeys: { key: keyof Check; label: string }[] = [
        { key: 'payor', label: 'Payor' },
        { key: 'amount', label: 'Amount' },
        { key: 'date', label: 'Date' },
    ];

    return (
        <div className={`p-3 rounded-xl shadow-inner transition-colors duration-300 ${isOver ? 'column-is-over' : colors.bg} flex flex-col h-full border-t-4 ${colors.border}`}>
            <div className="flex justify-between items-center mb-4 px-2 flex-shrink-0">
                <div className="group flex-grow min-w-0">
                    <h2 className={`text-lg font-bold ${colors.text} transition-colors duration-200 truncate`}>
                        {status}
                        {displayOptions.showCount && <span className="text-sm font-normal text-slate-500 ml-2">({checks.length})</span>}
                        {displayOptions.showTotal && <span className="text-sm font-semibold text-slate-600 ml-2 bg-slate-200 px-2 py-0.5 rounded-full">{USDollar.format(columnTotal)}</span>}
                    </h2>
                </div>
                <div className="relative" ref={menuRef}>
                    <button onClick={() => setIsMenuOpen(p => !p)} className="p-1 rounded-full text-slate-500 hover:bg-slate-200">
                        <EllipsisVerticalIcon className="h-5 w-5"/>
                    </button>
                    {isMenuOpen && (
                        <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-md shadow-xl z-20 py-1">
                             <p className="px-4 pt-2 pb-1 text-xs text-gray-500 uppercase">Sort</p>
                            {sortableKeys.map(({key, label}) => (
                                <button key={key} onClick={() => { onSort(status, key); setIsMenuOpen(false); }} className="w-full text-left flex justify-between items-center px-4 py-2 text-sm text-gray-700 hover:bg-slate-100">
                                    <span>By {label}</span>
                                    {sortConfig?.key === key ? (
                                        sortConfig.direction === 'asc' ? <ArrowSmallUpIcon className="h-4 w-4"/> : <ArrowSmallDownIcon className="h-4 w-4"/>
                                    ) : (
                                        <ChevronUpDownIcon className="h-4 w-4 text-slate-300"/>
                                    )}
                                </button>
                            ))}
                            <div className="border-t my-1"></div>
                             <p className="px-4 pt-2 pb-1 text-xs text-gray-500 uppercase">Actions</p>
                            <button onClick={() => { onSelectAllInColumn(status); setIsMenuOpen(false); }} className="w-full text-left flex justify-between items-center px-4 py-2 text-sm text-gray-700 hover:bg-slate-100">
                                <span>Select All in Column</span>
                            </button>
                            <button onClick={() => { onExpand(status); setIsMenuOpen(false); }} className="w-full text-left flex justify-between items-center px-4 py-2 text-sm text-gray-700 hover:bg-slate-100">
                                <span>Expand View</span>
                                <ArrowsPointingOutIcon className="h-5 w-5"/>
                            </button>
                            <div className="border-t my-1"></div>
                            <p className="px-4 pt-2 pb-1 text-xs text-gray-500 uppercase">Display</p>
                             <button onClick={() => onToggleDisplayOption(status, 'showCount')} className="w-full text-left flex justify-between items-center px-4 py-2 text-sm text-gray-700 hover:bg-slate-100">
                                <span>Show Check Count</span>
                                {displayOptions.showCount ? <EyeIcon className="h-5 w-5 text-sky-600"/> : <EyeSlashIcon className="h-5 w-5"/>}
                            </button>
                             <button onClick={() => onToggleDisplayOption(status, 'showTotal')} className="w-full text-left flex justify-between items-center px-4 py-2 text-sm text-gray-700 hover:bg-slate-100">
                                <span>Show Column Total</span>
                                {displayOptions.showTotal ? <EyeIcon className="h-5 w-5 text-sky-600"/> : <EyeSlashIcon className="h-5 w-5"/>}
                            </button>
                            <button onClick={() => { onOpenThemePicker(status); setIsMenuOpen(false); }} className="w-full text-left flex justify-between items-center px-4 py-2 text-sm text-gray-700 hover:bg-slate-100">
                                <span>Change Theme</span>
                                <PaintBrushIcon className="h-5 w-5"/>
                            </button>
                        </div>
                    )}
                </div>
            </div>
            <ul ref={ref} className="space-y-3 flex-grow min-h-30 h-full pr-1 list-none p-0 m-0">
                {checks.length === 0 && dropIndex !== null && draggingCheck ? (
                    <>
                        <DropIndicator check={draggingCheck} flags={flags} theme={theme} cardLayout={cardLayout} />
                    </>
                ) : checks.length > 0 ? (
                    <>
                        {dropIndex === 0 && draggingCheck && (
                            <DropIndicator check={draggingCheck} flags={flags} theme={theme} cardLayout={cardLayout} />
                        )}
                        {checks.map((check, index) => (
                            <React.Fragment key={check.id}>
                                <CheckCard 
                                    check={check} 
                                    flags={flags} 
                                    onSelectCheck={onSelectCheck}
                                    isDragging={dragState.type !== 'idle' && dragState.checkId === check.id}
                                    isSelected={selectedCheckIds.includes(check.id)}
                                    onCheckSelection={onCheckSelection}
                                    isMultiSelectMode={isMultiSelectMode}
                                    theme={theme}
                                    cardLayout={cardLayout}
                                    viewMode={viewMode}
                                    checkViewOptions={checkViewOptions}
                                />
                                {dropIndex === index + 1 && draggingCheck && <DropIndicator check={draggingCheck} flags={flags} theme={theme} cardLayout={cardLayout} />}
                            </React.Fragment>
                        ))}
                    </>
                ) : (
                    <div className="text-center py-4 lg:py-8 px-4 border-2 border-dashed border-slate-200 rounded-lg flex-grow flex flex-col h-full">
                        <div className="justified-center flex-grow flex flex-col h-full max-h-[75dvh]">
                        <DocumentTextIcon className="mx-auto h-10 w-10 text-slate-300" />
                        <p className="mt-1 text-sm text-slate-400">Drag a check here to get started.</p>
                        </div>
                    </div>
                        )}
            </ul>
        </div>
    );
};

interface KanbanBoardProps {
    checks: Check[];
    flags: Flag[];
    themes: Theme[];
    onSelectCheck: (check: Check) => void;
    onMoveCheck: (checkId: string, newStatus: CheckStatus, targetIndex: number) => void;
    onExpandColumn: (status: CheckStatus) => void;
    sortConfig: Record<CheckStatus, { key: keyof Check; direction: 'asc' | 'desc' } | undefined>;
    onSort: (status: CheckStatus, key: keyof Check) => void;
    onSelectAllInColumn: (status: CheckStatus) => void;
    selectedCheckIds: string[];
    isMultiSelectMode: boolean;
    onCheckSelection: (clickedCheckId: string, event: React.MouseEvent, allChecksInOrder: Check[]) => void;
    columnDisplayOptions: Record<CheckStatus, { showCount: boolean; showTotal: boolean }>;
    columnThemes: Record<CheckStatus, string>;
    onToggleDisplayOption: (status: CheckStatus, option: 'showCount' | 'showTotal') => void;
    onOpenThemePicker: (status: CheckStatus) => void;
    cardLayout: Partial<Record<CardLayoutZone, CheckField>>;
    viewMode: 'card' | 'check';
    checkViewOptions: CheckViewOptions;
}

const KanbanBoard: React.FC<KanbanBoardProps> = (props) => {
    const { 
        checks, flags, themes, onSelectCheck, onMoveCheck, onExpandColumn, sortConfig, onSort, 
        onSelectAllInColumn, selectedCheckIds, isMultiSelectMode, columnDisplayOptions, 
        columnThemes, onToggleDisplayOption, onOpenThemePicker, onCheckSelection, checkViewOptions,
        cardLayout,
        viewMode
    } = props;

    const boardStatuses: CheckStatus[] = [CheckStatus.RECEIVED, CheckStatus.CONFIRMING_DETAILS, CheckStatus.QUEUED, CheckStatus.COMPLETE];
    
    const checksByStatus = useMemo(() => {
        const grouped = boardStatuses.reduce((acc, status) => {
            acc[status] = checks.filter(c => c.status === status);
            return acc;
        }, {} as Record<CheckStatus, Check[]>);

        for (const status of boardStatuses) {
            const config = sortConfig[status];
            if (config) {
                grouped[status].sort((a, b) => {
                    const valA = a[config.key];
                    const valB = b[config.key];
                    if (valA === undefined || valB === undefined) return 0;
                    if (valA === null) return 1;
                    if (valB === null) return -1;
                    if (typeof valA === 'string' && typeof valB === 'string') {
                        return config.direction === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
                    }
                    if (typeof valA === 'number' && typeof valB === 'number') {
                         return config.direction === 'asc' ? valA - valB : valB - valA;
                    }
                     if (config.key === 'date') {
                        return config.direction === 'asc' ? new Date(valA as string).getTime() - new Date(valB as string).getTime() : new Date(valB as string).getTime() - new Date(valA as string).getTime();
                    }
                    return 0;
                });
            } else {
                grouped[status].sort((a, b) => (a.boardOrder || 0) - (b.boardOrder || 0));
            }
        }
        return grouped;
    }, [checks, sortConfig]);
    
    const allChecksInOrder = useMemo(() => {
        return boardStatuses.flatMap(status => checksByStatus[status]);
    }, [checksByStatus]);

    const [dragState, setDragState] = useState<DragState>({ type: 'idle' });
    const [isOverColumn, setIsOverColumn] = useState<CheckStatus | null>(null);

    const draggingCheck = useMemo(() => {
        if (dragState.type !== 'idle') {
            return checks.find(c => c.id === dragState.checkId);
        }
        return undefined;
    }, [dragState, checks]);
    
    useEffect(() => {
        return combine(
            monitorForElements({
                onDragStart: ({ source }) => {
                    if (source.data.type !== 'check') return;
                    setDragState({ type: 'dragging', checkId: source.data.checkId as string });
                },
                onDrag: ({ location, source }) => {
                     if (source.data.type !== 'check') return;
                     const over = location.current.dropTargets;
                     const overColumnTarget = over.find(t => t.data.status);
                     
                     if (!overColumnTarget) {
                         setIsOverColumn(null);
                         setDragState({ type: 'dragging', checkId: source.data.checkId as string });
                         return;
                     }
                     
                     const columnStatus = overColumnTarget.data.status as CheckStatus;
                     setIsOverColumn(columnStatus);
                     
                     const columnElement = overColumnTarget.element as HTMLElement;
                     const directChildren = Array.from(columnElement.children) as HTMLLIElement[];
                     const checkElements = directChildren.filter(
                         child => !child.classList.contains('drop-indicator')
                     );

                     const index = getDestinationIndex(
                         location.current.input.clientY,
                         checkElements
                     );

                     setDragState({
                         type: 'preview',
                         checkId: source.data.checkId as string,
                         dragTo: { status: columnStatus, index }
                     });
                },
                onDrop: () => {
                    if (dragState.type === 'preview') {
                        onMoveCheck(dragState.checkId, dragState.dragTo.status, dragState.dragTo.index);
                    }
                    setDragState({ type: 'idle' });
                    setIsOverColumn(null);
                },
                 onDragEnd: () => {
                    setDragState({ type: 'idle' });
                    setIsOverColumn(null);
                }
            })
        );
    }, [dragState, onMoveCheck]);

    return (
        <main className="container mx-auto p-4 sm:p-6 lg:p-8 flex-grow flex flex-col">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 flex-grow">
                {boardStatuses.map(status => (
                    <KanbanColumn 
                        key={status}
                        status={status}
                        checks={checksByStatus[status]} 
                        flags={flags} 
                        onSelectCheck={onSelectCheck}
                        onExpand={onExpandColumn}
                        dragState={dragState}
                        draggingCheck={draggingCheck}
                        isOver={isOverColumn === status}
                        sortConfig={sortConfig[status]}
                        onSort={onSort}
                        onSelectAllInColumn={onSelectAllInColumn}
                        selectedCheckIds={selectedCheckIds}
                        displayOptions={columnDisplayOptions[status]}
                        themeId={columnThemes[status]}
                        themes={themes}
                        onToggleDisplayOption={onToggleDisplayOption}
                        onOpenThemePicker={onOpenThemePicker}
                        isMultiSelectMode={isMultiSelectMode}
                        onCheckSelection={(checkId, event) => onCheckSelection(checkId, event, allChecksInOrder)}
                        cardLayout={cardLayout}
                        viewMode={viewMode}
                        checkViewOptions={checkViewOptions}
                    />
                ))}
            </div>
        </main>
    );
};

export default KanbanBoard;