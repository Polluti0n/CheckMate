import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Check, CheckStatus, CheckField, Flag, Theme, CardLayoutZone } from '../types';
import { FlagIcon, DocumentTextIcon, EllipsisVerticalIcon, ChevronUpDownIcon, ArrowSmallUpIcon, ArrowSmallDownIcon, CheckBadgeIcon, PaintBrushIcon, EyeIcon, EyeSlashIcon, ArrowsPointingOutIcon, XMarkIcon } from './icons';
import {
  draggable,
  dropTargetForElements,
  monitorForElements,
} from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';
import { ALL_CHECK_FIELDS } from '../constants';

const statusColors: Record<CheckStatus, { border: string, bg: string, text: string }> = {
    [CheckStatus.RECEIVED]: { border: 'border-sky-500', bg: 'bg-sky-50', text: 'text-sky-800' },
    [CheckStatus.CONFIRMING_DETAILS]: { border: 'border-amber-500', bg: 'bg-amber-50', text: 'text-amber-800' },
    [CheckStatus.QUEUED]: { border: 'border-purple-500', bg: 'bg-purple-50', text: 'text-purple-800' },
    [CheckStatus.COMPLETE]: { border: 'border-green-500', bg: 'bg-green-50', text: 'text-green-800' },
    [CheckStatus.ARCHIVED]: { border: 'border-slate-500', bg: 'bg-slate-50', text: 'text-slate-800' },
};

const DropIndicator = () => <li className="drop-indicator" aria-hidden="true"></li>;

const CheckCard = React.memo(({ check, flags, isSelected, onToggleSelection, isMultiSelectMode, theme, cardLayout }: { 
    check: Check; 
    flags: Flag[]; 
    isSelected: boolean;
    onToggleSelection: (checkId: string) => void;
    isMultiSelectMode: boolean;
    theme?: Theme;
    cardLayout: Partial<Record<CardLayoutZone, CheckField>>;
}) => {
    const ref = useRef<HTMLLIElement>(null);
    const checkFlags = flags.filter(f => check.flags.includes(f.id));
    const navigate = useNavigate();
    const location = useLocation();
    
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        return draggable({
            element: el,
            getInitialData: () => ({ checkId: check.id, status: check.status, type: 'check' }),
        });
    }, [check]);

    const handleClick = () => {
        if (isMultiSelectMode) {
            onToggleSelection(check.id);
        } else {
            navigate(`/check/${check.id}`, { state: { backgroundLocation: location } });
        }
    };
    
    const themeBorderColor = theme?.colors.border || statusColors[check.status].border;
    const glowClasses = isSelected && isMultiSelectMode && theme?.colors.glow ? `border-transparent ${theme.colors.glow}` : '';

    const formatValue = (value: any, key: CheckField): string | null => {
        if (value === undefined || value === null || value === '') return null;
        if (key === 'amount') return `$${(value as number).toFixed(2)}`;
        if (key === 'date' || key === 'createdAt') return new Date(value as string).toLocaleDateString();
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
        title: renderField('title'), topRight: renderField('topRight'), subtitle: renderField('subtitle'),
        body1: renderField('body1'), body2: renderField('body2'), footerLeft: renderField('footerLeft'),
        footerRight: renderField('footerRight'),
    };
    
    return (
        <li
            ref={ref}
            onClick={handleClick}
            style={{ touchAction: 'none' }}
            className={`bg-white p-2 rounded-md shadow-sm border border-l-4 hover:shadow-md cursor-pointer active:cursor-grabbing transition-all duration-200 flex flex-col justify-between ${themeBorderColor}
                ${isSelected && isMultiSelectMode ? `bg-sky-50 ${glowClasses}` : 'border-slate-200 hover:border-sky-400'}
                data-[is-dragging=true]:dragging-card`}
        >
            <div className="flex flex-col flex-grow space-y-1">
                {(fields.title || fields.topRight) && <div className="flex justify-between items-start">{fields.title || <div/>}{fields.topRight}</div>}
                {fields.subtitle && <div>{fields.subtitle}</div>}
                {fields.body1 && <div className="pt-1">{fields.body1}</div>}
                {fields.body2 && <div>{fields.body2}</div>}
            </div>
            <div className="flex justify-between items-end mt-1 pt-1 border-t border-slate-100">
                {(fields.footerLeft || fields.footerRight) ? (<div className="flex justify-between items-end w-full">{fields.footerLeft || <div/>}{fields.footerRight}</div>) : <div />}
                <div className="flex justify-end items-center space-x-1 flex-shrink-0 pl-2">
                    {checkFlags.map(flag => (<div key={flag.id} className={`p-0.5 rounded-full ${flag.color}`} title={flag.name}><FlagIcon className={`h-3 w-3 ${flag.textColor}`} /></div>))}
                </div>
            </div>
        </li>
    );
});

const getDestinationIndex = (clientY: number, childElements: HTMLElement[]): number => {
  for (let i = 0; i < childElements.length; i++) {
    const child = childElements[i];
    const rect = child.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    if (clientY < midY) return i;
  }
  return childElements.length;
};

const KanbanColumn = ({ status, checks, flags, onMoveCheck, sortConfig, onSort, onSelectAllInColumn, selectedCheckIds, onToggleSelection, displayOptions, themeId, themes, onToggleDisplayOption, onOpenThemePicker, multiSelectColumns, onToggleColumnMultiSelect, cardLayout }: { 
    status: CheckStatus; checks: Check[]; flags: Flag[]; 
    onMoveCheck: (checkId: string, newStatus: CheckStatus, targetIndex: number) => void;
    sortConfig?: { key: keyof Check; direction: 'asc' | 'desc' };
    onSort: (status: CheckStatus, key: keyof Check) => void;
    onSelectAllInColumn: (status: CheckStatus) => void;
    selectedCheckIds: string[]; onToggleSelection: (checkId: string) => void;
    displayOptions: { showCount: boolean; showTotal: boolean };
    themeId: string; themes: Theme[];
    onToggleDisplayOption: (status: CheckStatus, option: 'showCount' | 'showTotal') => void;
    onOpenThemePicker: (status: CheckStatus) => void;
    multiSelectColumns: CheckStatus[]; onToggleColumnMultiSelect: (status: CheckStatus) => void;
    cardLayout: Partial<Record<CardLayoutZone, CheckField>>;
}) => {
    const columnRef = useRef<HTMLDivElement>(null);
    const listRef = useRef<HTMLUListElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isDraggedOver, setIsDraggedOver] = useState(false);
    const navigate = useNavigate();
    
    const theme = themes.find(t => t.id === themeId) || themes.find(t => t.id === 'default');
    const colors = theme?.id !== 'default' ? theme.colors : statusColors[status];
    const isThisColumnMultiSelect = multiSelectColumns.includes(status);

    const columnTotal = useMemo(() => checks.reduce((sum, check) => sum + check.amount, 0), [checks]);

    useEffect(() => {
        const el = columnRef.current;
        if (!el) return;
        return dropTargetForElements({
            element: el,
            getData: () => ({ status }),
            onDragEnter: () => setIsDraggedOver(true),
            onDragLeave: () => setIsDraggedOver(false),
            onDrop: () => setIsDraggedOver(false),
        });
    }, [status]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) setIsMenuOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);
    
    const sortableKeys: { key: keyof Check; label: string }[] = [{ key: 'payor', label: 'Payor' }, { key: 'amount', label: 'Amount' }, { key: 'date', label: 'Date' }];

    return (
        <div ref={columnRef} className={`p-3 rounded-xl shadow-inner transition-colors duration-300 ${isDraggedOver ? 'column-is-over' : colors.bg} flex flex-col h-full border-t-4 ${colors.border}`}>
            <div className="flex justify-between items-center mb-4 px-2 flex-shrink-0">
                <div className="group flex-grow min-w-0"><h2 className={`text-lg font-bold ${colors.text} transition-colors duration-200 truncate`}>{status}{displayOptions.showCount && <span className="text-sm font-normal text-slate-500 ml-2">({checks.length})</span>}{displayOptions.showTotal && <span className="text-sm font-semibold text-slate-600 ml-2 bg-slate-200 px-2 py-0.5 rounded-full">${columnTotal.toFixed(2)}</span>}</h2></div>
                <div className="relative" ref={menuRef}>
                    <button onClick={() => setIsMenuOpen(p => !p)} className="p-1 rounded-full text-slate-500 hover:bg-slate-200"><EllipsisVerticalIcon className="h-5 w-5"/></button>
                    {isMenuOpen && (
                        <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-md shadow-xl z-20 py-1">
                             <p className="px-4 pt-2 pb-1 text-xs text-gray-500 uppercase">Sort</p>
                            {sortableKeys.map(({key, label}) => (<button key={key} onClick={() => { onSort(status, key); setIsMenuOpen(false); }} className="w-full text-left flex justify-between items-center px-4 py-2 text-sm text-gray-700 hover:bg-slate-100"><span>By {label}</span>{sortConfig?.key === key ? (sortConfig.direction === 'asc' ? <ArrowSmallUpIcon className="h-4 w-4"/> : <ArrowSmallDownIcon className="h-4 w-4"/>) : (<ChevronUpDownIcon className="h-4 w-4 text-slate-300"/>)}</button>))}
                            <div className="border-t my-1"></div>
                             <p className="px-4 pt-2 pb-1 text-xs text-gray-500 uppercase">Actions</p>
                             <button onClick={() => { onToggleColumnMultiSelect(status); setIsMenuOpen(false); }} className="w-full text-left flex justify-between items-center px-4 py-2 text-sm text-gray-700 hover:bg-slate-100"><span>{isThisColumnMultiSelect ? 'Done Selecting' : 'Select Checks'}</span>{isThisColumnMultiSelect ? <XMarkIcon className="h-5 w-5"/> : <CheckBadgeIcon className="h-5 w-5"/>}</button>
                            {isThisColumnMultiSelect && (<button onClick={() => { onSelectAllInColumn(status); setIsMenuOpen(false); }} className="w-full text-left flex justify-between items-center px-4 py-2 text-sm text-gray-700 hover:bg-slate-100"><span>Select All</span></button>)}
                            <button onClick={() => { navigate(`/column/${status}`); setIsMenuOpen(false); }} className="w-full text-left flex justify-between items-center px-4 py-2 text-sm text-gray-700 hover:bg-slate-100"><span>Expand View</span><ArrowsPointingOutIcon className="h-5 w-5"/></button>
                            <div className="border-t my-1"></div>
                            <p className="px-4 pt-2 pb-1 text-xs text-gray-500 uppercase">Display</p>
                             <button onClick={() => onToggleDisplayOption(status, 'showCount')} className="w-full text-left flex justify-between items-center px-4 py-2 text-sm text-gray-700 hover:bg-slate-100"><span>Show Check Count</span>{displayOptions.showCount ? <EyeIcon className="h-5 w-5 text-sky-600"/> : <EyeSlashIcon className="h-5 w-5"/>}</button>
                             <button onClick={() => onToggleDisplayOption(status, 'showTotal')} className="w-full text-left flex justify-between items-center px-4 py-2 text-sm text-gray-700 hover:bg-slate-100"><span>Show Column Total</span>{displayOptions.showTotal ? <EyeIcon className="h-5 w-5 text-sky-600"/> : <EyeSlashIcon className="h-5 w-5"/>}</button>
                            <button onClick={() => { onOpenThemePicker(status); setIsMenuOpen(false); }} className="w-full text-left flex justify-between items-center px-4 py-2 text-sm text-gray-700 hover:bg-slate-100"><span>Change Theme</span><PaintBrushIcon className="h-5 w-5"/></button>
                        </div>
                    )}
                </div>
            </div>
            <ul ref={listRef} className="space-y-3 flex-grow overflow-y-auto pr-1 list-none p-0 m-0">
                {checks.length === 0 ? (
                    <div className="text-center py-8 px-4 border-2 border-dashed border-slate-200 rounded-lg flex-grow flex flex-col justify-center h-full"><DocumentTextIcon className="mx-auto h-12 w-12 text-slate-300" /><p className="mt-2 text-sm font-medium text-slate-500">All clear!</p><p className="mt-1 text-sm text-slate-400">Drag a check here.</p></div>
                ) : (
                    checks.map((check) => (
                        <CheckCard 
                            key={check.id} check={check} flags={flags} 
                            isSelected={selectedCheckIds.includes(check.id)} onToggleSelection={onToggleSelection}
                            isMultiSelectMode={isThisColumnMultiSelect} theme={theme} cardLayout={cardLayout}
                        />
                    ))
                )}
            </ul>
        </div>
    );
};

const KanbanBoard = (props: {
    checks: Check[]; flags: Flag[]; themes: Theme[];
    onMoveCheck: (checkId: string, newStatus: CheckStatus, targetIndex: number) => void;
    sortConfig: Record<CheckStatus, { key: keyof Check; direction: 'asc' | 'desc' } | undefined>; onSort: (status: CheckStatus, key: keyof Check) => void;
    onSelectAllInColumn: (status: CheckStatus) => void; selectedCheckIds: string[]; onToggleSelection: (checkId: string) => void;
    columnDisplayOptions: Record<CheckStatus, { showCount: boolean; showTotal: boolean }>; columnThemes: Record<CheckStatus, string>;
    onToggleDisplayOption: (status: CheckStatus, option: 'showCount' | 'showTotal') => void; onOpenThemePicker: (status: CheckStatus) => void;
    multiSelectColumns: CheckStatus[]; onToggleColumnMultiSelect: (status: CheckStatus) => void;
    cardLayout: Partial<Record<CardLayoutZone, CheckField>>;
}) => {
    const { checks, sortConfig, onMoveCheck } = props;
    const boardStatuses: CheckStatus[] = [CheckStatus.RECEIVED, CheckStatus.CONFIRMING_DETAILS, CheckStatus.QUEUED, CheckStatus.COMPLETE];
    
    const checksByStatus = useMemo(() => {
        const grouped = boardStatuses.reduce((acc, status) => ({...acc, [status]: checks.filter(c => c.status === status)}), {} as Record<CheckStatus, Check[]>);
        for (const status of boardStatuses) {
            const config = sortConfig[status];
            if (config) {
                grouped[status].sort((a, b) => {
                    const valA = a[config.key], valB = b[config.key];
                    if (valA === undefined || valB === undefined) return 0;
                    if (typeof valA === 'string' && typeof valB === 'string') return config.direction === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
                    if (typeof valA === 'number' && typeof valB === 'number') return config.direction === 'asc' ? valA - valB : valB - valA;
                    if (config.key === 'date') return config.direction === 'asc' ? new Date(valA as string).getTime() - new Date(valB as string).getTime() : new Date(valB as string).getTime() - new Date(valA as string).getTime();
                    return 0;
                });
            }
        }
        return grouped;
    }, [checks, sortConfig]);

    useEffect(() => {
        return combine(
            monitorForElements({
                onDragStart: ({ source }) => {
                    const el = source.element as HTMLElement;
                    if (el) el.dataset.isDragging = 'true';
                },
                onDrop: ({ location, source }) => {
                    const el = source.element as HTMLElement;
                    if (el) delete el.dataset.isDragging;

                    const destination = location.current.dropTargets.find(t => t.data.status);
                    if (!destination) return;
                    
                    const checkId = source.data.checkId as string;
                    const newStatus = destination.data.status as CheckStatus;
                    const check = checks.find(c => c.id === checkId);
                    
                    const list = (destination.element as HTMLElement).querySelector('ul');
                    if (!list) return;
                    const childElements = Array.from(list.querySelectorAll<HTMLLIElement>('li:not(.drop-indicator)'));
                    const index = getDestinationIndex(location.current.input.clientY, childElements);

                    onMoveCheck(checkId, newStatus, index);
                },
                onDragEnd: ({ source }) => {
                     const el = source.element as HTMLElement;
                    if (el) delete el.dataset.isDragging;
                }
            })
        );
    }, [checks, onMoveCheck]);

    return (
        <main className="container mx-auto p-4 sm:p-6 lg:p-8 flex-grow flex flex-col">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 flex-grow">
                {boardStatuses.map(status => (
                    // FIX: Explicitly pass displayOptions and themeId to KanbanColumn
                    <KanbanColumn 
                        key={status} 
                        status={status} 
                        checks={checksByStatus[status]} 
                        {...props}
                        sortConfig={props.sortConfig[status]}
                        displayOptions={props.columnDisplayOptions[status]}
                        themeId={props.columnThemes[status]}
                    />
                ))}
            </div>
        </main>
    );
};

export default KanbanBoard;
