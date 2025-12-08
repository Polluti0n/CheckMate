import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Check, CheckStatus, CheckField, Flag, Theme, CardLayoutZone, CheckCategory, CheckViewOptions, CheckOverlayZone, CheckFooterZone, CheckFontTheme, CheckViewLayoutZone, CardStyle, UserPreferences } from '../types'; // PlusSmallIcon is not used here
import { FlagIcon, DocumentTextIcon, EllipsisVerticalIcon, ChevronUpDownIcon, ArrowSmallUpIcon, ArrowSmallDownIcon, CheckBadgeIcon, PaintBrushIcon, CurrencyDollarIcon, EyeIcon, EyeSlashIcon, ArrowsPointingOutIcon, XMarkIcon } from './icons';
import {
  draggable,
  dropTargetForElements,
  monitorForElements,
} from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';
import { autoScrollWindowForElements } from '@atlaskit/pragmatic-drag-and-drop-auto-scroll/element';
import { ALL_CHECK_FIELDS, CHECK_TYPE_COLORS } from '../constants';
import { categoryConfig } from '../formConfig';
import './CheckDashboard.css'; // <-- IMPORT THE NEW CSS FILE
import { ClassicCard, LedgerCard, ModernCard, CheckStyleCard } from './CardStyles';

const USDollar = new Intl.NumberFormat('en-US', {style: 'currency',currency: 'USD',});

// ... (keep the rest of the initial constants and types like statusColors, DragState, etc.)
const statusColors: Record<CheckStatus, { border: string, bg: string, text: string, dark: { border: string, bg: string, text: string } }> = {
    [CheckStatus.RECEIVED]: { border: 'border-sky-500', bg: 'bg-sky-50', text: 'text-sky-800', dark: { border: 'border-sky-700', bg: 'bg-gradient-to-bl from-sky-900 from-10% to-slate-800 to-50%', text: 'text-sky-300' } },
    [CheckStatus.CONFIRMING_DETAILS]: { border: 'border-amber-500', bg: 'bg-amber-50', text: 'text-amber-800', dark: { border: 'border-amber-700', bg: 'bg-gradient-to-bl from-amber-900 from-10% to-slate-800 to-50%', text: 'text-amber-g-amber-900', text: 'text-amber-300' } },
    [CheckStatus.QUEUED]: { border: 'border-purple-500', bg: 'bg-purple-50', text: 'text-purple-800', dark: { border: 'border-purple-700', bg: 'bg-gradient-to-bl from-purple-900 from-10% to-slate-800 to-50%', text: 'text-purple-300' } },
    [CheckStatus.COMPLETE]: { border: 'border-green-500', bg: 'bg-green-50', text: 'text-green-800', dark: { border: 'border-green-700', bg: 'bg-gradient-to-bl from-green-900 from-10% to-slate-800 to-50%', text: 'text-green-300' } },
    [CheckStatus.ARCHIVED]: { border: 'border-slate-500', bg: 'bg-slate-50', text: 'text-slate-800', dark: { border: 'border-slate-600', bg: 'bg-gradient-to-bl from-slate-900 from-10% to-slate-800 to-50%', text: 'text-slate-200' } },
};

    // Helper function to get CHECK_TYPE_COLORS based on the CheckCategory then extract the base color and use it to create a light border.
    const cardBorder = (category: CheckCategory, darkMode?: boolean) => {
        const colors = CHECK_TYPE_COLORS[category];
        if (!colors) return 'border-slate-500';
        return darkMode ? colors.dark.border : colors.border;
    };

type DragState =
  | { type: 'idle' }
  | { type: 'dragging'; checkId: string }
  | { type: 'preview'; checkId: string; dragTo: { status: CheckStatus, index: number } };

// ... (The rest of your component code remains the same)
// Just make sure the CheckCard component correctly renders CheckCardAsCheck when viewMode is 'check'

const DropIndicator = ({ check, flags, theme, cardLayout, preferences, cardStyle, checkViewOptions }: { 
    check: Check; 
    flags: Flag[]; 
    theme?: Theme;
    cardLayout: Partial<Record<CardLayoutZone, CheckField | 'flags' | 'category'>>;
    preferences: UserPreferences;
    cardStyle: CardStyle;
    checkViewOptions: CheckViewOptions;
    }) => {
        
    const renderCardContent = () => {
        switch (cardStyle) {
            case 'check':
                return <CheckStyleCard check={check} allFlags={flags} cardLayout={cardLayout} preferences={preferences} />;
            case 'classic':
                return <ClassicCard check={check} allFlags={flags} cardLayout={cardLayout} preferences={preferences} />;
            case 'ledger':
                return <LedgerCard check={check} allFlags={flags} cardLayout={cardLayout} preferences={preferences} />;
            case 'modern':
                return <ModernCard check={check} allFlags={flags} cardLayout={cardLayout} preferences={preferences} />;
            default:
                return <ClassicCard check={check} allFlags={flags} cardLayout={cardLayout} preferences={preferences} />;
        }
    };

    return (
        <li className="drop-indicator" aria-hidden="true">
            <div className="opacity-50">
                {renderCardContent()}
            </div>
        </li>
    );
};

const CheckCard = React.memo(({ check, flags, isDragging, isSelected, isMultiSelectMode, onSelectCheck, onCheckSelection, theme, cardLayout, cardStyle, checkViewOptions, preferences }: { 
    check: Check; 
    flags: Flag[]; 
    isDragging: boolean;
    isSelected: boolean;
    isMultiSelectMode: boolean;
    onSelectCheck: (check: Check) => void;
    onCheckSelection: (checkId: string, event: React.MouseEvent) => void;
    theme?: Theme;
    cardLayout: Partial<Record<CardLayoutZone, CheckField | 'flags' | 'category'>>;
    cardStyle: CardStyle;
    checkViewOptions: CheckViewOptions;
    preferences: UserPreferences;
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
    
    const renderCardContent = () => {
        switch (cardStyle) {
            case 'check':
                return <CheckStyleCard check={check} allFlags={flags} cardLayout={cardLayout} preferences={preferences} />;
            case 'classic':
                return <ClassicCard check={check} allFlags={flags} cardLayout={cardLayout} preferences={preferences} />;
            case 'ledger':
                return <LedgerCard check={check} allFlags={flags} cardLayout={cardLayout} preferences={preferences} />;
            case 'modern':
                return <ModernCard check={check} allFlags={flags} cardLayout={cardLayout} preferences={preferences} />;
            default:
                return <ClassicCard check={check} allFlags={flags} cardLayout={cardLayout} preferences={preferences} />;
        }
    };

    return (
        <li
            ref={ref}
            onClick={handleClick}
            className={`${isDragging ? 'dragging-card' : ''} ${isSelected && isMultiSelectActive ? `bg-sky-500 ${glowClasses} select-glow rounded-md shadow-sm  hover:shadow-md` : ''}`}
            style={{ ['--glow-color' as string]: glowColor } as React.CSSProperties}
        >
           {renderCardContent()}
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


const KanbanColumn = ({ status, checks, flags, onExpand, onSelectCheck, dragState, draggingCheck, isOver, sortConfig, onSort, onSelectAllInColumn, selectedCheckIds, displayOptions, themeId, themes, onToggleDisplayOption, onOpenThemePicker, isMultiSelectMode, onCheckSelection, cardLayout, cardStyle, checkViewOptions, preferences }: { 
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
    cardLayout: Partial<Record<CardLayoutZone, CheckField | 'flags' | 'category'>>;
    cardStyle: CardStyle;
    checkViewOptions: CheckViewOptions;
    preferences: UserPreferences;
}) => {
    const ref = useRef<HTMLUListElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    
    const theme = themes.find(t => t.id === themeId) || themes.find(t => t.id === 'default');
    const darkMode = preferences.darkMode;
    const colors = darkMode && theme?.colors.dark
        ? (theme.id !== 'default' ? theme.colors.dark : statusColors[status].dark)
        : (theme ? theme.colors : statusColors[status]);
    const columnBgClass = darkMode && theme?.colors.dark && theme.id !== 'default' && theme.colors.dark.bg && theme.colors.dark.bg.startsWith('bg-')
        ? `bg-gradient-to-bl ${theme.colors.dark.bg.replace("bg-", "from-")} from-10% to-slate-800 to-50%`
        : colors.bg;


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
        <div className={`p-3 rounded-xl shadow-inner transition-colors duration-300 ${isOver ? 'column-is-over' : ''} ${columnBgClass} flex flex-col h-full border-t-4 ${colors.border}`}>
            <div className="flex justify-between items-center mb-4 px-2 flex-shrink-0">
                <div className="group flex-grow min-w-0">
                    <h2 className={`text-lg font-bold ${colors.text} transition-colors duration-200 truncate`}>
                        {status}
                        {displayOptions.showCount && <span className="text-sm font-normal text-slate-500 dark:text-slate-400 ml-2">({checks.length})</span>}
                        {displayOptions.showTotal && <span className="text-sm font-semibold text-slate-600 dark:text-slate-300 ml-2 bg-slate-200 dark:bg-gray-700 px-2 py-0.5 rounded-full">{USDollar.format(columnTotal)}</span>}
                    </h2>
                </div>
                <div className="relative" ref={menuRef}>
                    <button onClick={() => setIsMenuOpen(p => !p)} className="p-1 rounded-full text-slate-500 dark:text-gray-400 hover:bg-slate-200 dark:hover:bg-gray-700">
                        <EllipsisVerticalIcon className="h-5 w-5"/>
                    </button>
                    {isMenuOpen && (
                        <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-md shadow-xl z-20 py-1">
                             <p className={`px-4 pt-2 pb-1 text-xs ${colors.text} uppercase`}>Sort</p>
                            {sortableKeys.map(({key, label}) => (
                                <button key={key} onClick={() => { onSort(status, key); setIsMenuOpen(false); }} className={`w-full text-left flex justify-between items-center px-4 py-2 text-sm ${colors.text} hover:bg-slate-100 dark:hover:bg-gray-700`}>
                                    <span>By {label}</span>
                                    {sortConfig?.key === key ? (
                                        sortConfig.direction === 'asc' ? <ArrowSmallUpIcon className="h-4 w-4"/> : <ArrowSmallDownIcon className="h-4 w-4"/>
                                    ) : (
                                        <ChevronUpDownIcon className="h-4 w-4 text-slate-300 dark:text-gray-500"/>
                                    )}
                                </button>
                            ))}
                            <div className="border-t my-1 dark:border-gray-700"></div>
                             <p className={`px-4 pt-2 pb-1 text-xs ${colors.text} uppercase`}>Actions</p>
                            <button onClick={() => { onSelectAllInColumn(status); setIsMenuOpen(false); }} className={`w-full text-left flex justify-between items-center px-4 py-2 text-sm ${colors.text} hover:bg-slate-100 dark:hover:bg-gray-700`}>
                                <span>Select All in Column</span>
                            </button>
                            <button onClick={() => { onExpand(status); setIsMenuOpen(false); }} className={`w-full text-left flex justify-between items-center px-4 py-2 text-sm ${colors.text} hover:bg-slate-100 dark:hover:bg-gray-700`}>
                                <span>Expand View</span>
                                <ArrowsPointingOutIcon className="h-5 w-5"/>
                            </button>
                            <div className="border-t my-1 dark:border-gray-700"></div>
                            <p className={`px-4 pt-2 pb-1 text-xs ${colors.text} uppercase`}>Display</p>
                             <button onClick={() => onToggleDisplayOption(status, 'showCount')} className={`w-full text-left flex justify-between items-center px-4 py-2 text-sm ${colors.text} hover:bg-slate-100 dark:hover:bg-gray-700`}>
                                <span>Show Check Count</span>
                                {displayOptions.showCount ? <EyeIcon className="h-5 w-5 text-sky-600"/> : <EyeSlashIcon className="h-5 w-5"/>}
                            </button>
                             <button onClick={() => onToggleDisplayOption(status, 'showTotal')} className={`w-full text-left flex justify-between items-center px-4 py-2 text-sm ${colors.text} hover:bg-slate-100 dark:hover:bg-gray-700`}>
                                <span>Show Column Total</span>
                                {displayOptions.showTotal ? <EyeIcon className="h-5 w-5 text-sky-600"/> : <EyeSlashIcon className="h-5 w-5"/>}
                            </button>
                            <button onClick={() => { onOpenThemePicker(status); setIsMenuOpen(false); }} className={`w-full text-left flex justify-between items-center px-4 py-2 text-sm ${colors.text} hover:bg-slate-100 dark:hover:bg-gray-700`}>
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
                        <DropIndicator check={draggingCheck} flags={flags} theme={theme} cardLayout={cardLayout} preferences={preferences} cardStyle={cardStyle} checkViewOptions={checkViewOptions} />
                    </>
                ) : checks.length > 0 ? (
                    <>
                        {dropIndex === 0 && draggingCheck && (
                            <DropIndicator check={draggingCheck} flags={flags} theme={theme} cardLayout={cardLayout} preferences={preferences} cardStyle={cardStyle} checkViewOptions={checkViewOptions} />
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
                                    cardStyle={cardStyle}
                                    checkViewOptions={checkViewOptions}
                                    preferences={preferences}
                                />
                                {dropIndex === index + 1 && draggingCheck && <DropIndicator check={draggingCheck} flags={flags} theme={theme} cardLayout={cardLayout} preferences={preferences} cardStyle={cardStyle} checkViewOptions={checkViewOptions} />}
                            </React.Fragment>
                        ))}
                    </>
                ) : (
                    <div className="text-center py-4 lg:py-8 px-4 border-2 border-dashed border-slate-200 dark:border-gray-700 rounded-lg flex-grow flex flex-col h-full">
                        <div className="justified-center flex-grow flex flex-col h-full max-h-[75dvh]">
                        <DocumentTextIcon className="mx-auto h-10 w-10 text-slate-300 dark:text-gray-600" />
                        <p className="mt-1 text-sm text-slate-400 dark:text-gray-500">Drag a check here to get started.</p>
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
    cardLayout: Partial<Record<CardLayoutZone, CheckField | 'flags' | 'category'>>;
    cardStyle: CardStyle;
    checkViewOptions: CheckViewOptions;
    preferences: UserPreferences;
}

const KanbanBoard: React.FC<KanbanBoardProps> = (props) => {
    const { 
        checks, flags, themes, onSelectCheck, onMoveCheck, onExpandColumn, sortConfig, onSort, 
        onSelectAllInColumn, selectedCheckIds, isMultiSelectMode, columnDisplayOptions, 
        columnThemes, onToggleDisplayOption, onOpenThemePicker, onCheckSelection, checkViewOptions,
        cardLayout,
        cardStyle,
        preferences,
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
                // The `onDragStart` and subsequent events are what we need to hook into.
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
            }),
            // This is the new part: it enables auto-scrolling of the window
            // when a draggable element is near the top or bottom edge.
            autoScrollWindowForElements({
                // You can customize options here if needed, but the defaults are great for a start.
            }),
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
                        cardStyle={cardStyle}
                        checkViewOptions={checkViewOptions}
                        preferences={preferences}
                    />
                ))}
            </div>
        </main>
    );
};

export default KanbanBoard;