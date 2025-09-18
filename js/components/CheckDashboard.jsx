import React, { useEffect, useRef, useState, useMemo } from 'react';
import { CheckStatus } from '../types';
import { FlagIcon, DocumentTextIcon, EllipsisVerticalIcon, ChevronUpDownIcon, ArrowSmallUpIcon, ArrowSmallDownIcon, CheckBadgeIcon, PaintBrushIcon, EyeIcon, EyeSlashIcon, ArrowsPointingOutIcon, XMarkIcon } from './icons';
import { draggable, dropTargetForElements, monitorForElements, } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';
import { ALL_CHECK_FIELDS } from '../constants';
const statusColors = {
    [CheckStatus.RECEIVED]: { border: 'border-sky-500', bg: 'bg-sky-50', text: 'text-sky-800' },
    [CheckStatus.CONFIRMING_DETAILS]: { border: 'border-amber-500', bg: 'bg-amber-50', text: 'text-amber-800' },
    [CheckStatus.QUEUED]: { border: 'border-purple-500', bg: 'bg-purple-50', text: 'text-purple-800' },
    [CheckStatus.COMPLETE]: { border: 'border-green-500', bg: 'bg-green-50', text: 'text-green-800' },
    [CheckStatus.ARCHIVED]: { border: 'border-slate-500', bg: 'bg-slate-50', text: 'text-slate-800' },
};
const DropIndicator = () => <li className="drop-indicator" aria-hidden="true"></li>;
const USDollar = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', });
const CheckCard = React.memo(({ check, flags, onSelectCheck, isDragging, isSelected, onToggleSelection, isMultiSelectMode, theme, cardLayout }) => {
    const ref = useRef(null);
    const checkFlags = flags.filter(f => check.flags.includes(f.id));
    useEffect(() => {
        const el = ref.current;
        if (!el)
            return;
        return draggable({
            element: el,
            getInitialData: () => ({ checkId: check.id, status: check.status, type: 'check' }),
        });
    }, [check]);
    const handleClick = () => {
        if (isMultiSelectMode) {
            onToggleSelection(check.id);
        }
        else {
            onSelectCheck(check);
        }
    };
    const themeBorderColor = theme?.colors.border || statusColors[check.status].border;
    const glowClasses = isSelected && isMultiSelectMode && theme?.colors.glow ? `border-transparent ${theme.colors.glow}` : '';
    const formatValue = (value, key) => {
        if (value === undefined || value === null || value === '')
            return null;
        if (key === 'amount')
            return USDollar.format(value);
        if (key === 'date' || key === 'createdAt')
            return new Date(value).toLocaleDateString();
        return String(value);
    };
    const renderField = (zone) => {
        const fieldKey = cardLayout[zone];
        if (!fieldKey)
            return null;
        let value;
        if (fieldKey === 'lastComment') {
            if (check.comments.length === 0)
                return null;
            value = check.comments[check.comments.length - 1].text;
        }
        else {
            value = check[fieldKey];
        }
        const formatted = formatValue(value, fieldKey);
        if (!formatted)
            return null;
        const fieldConfig = ALL_CHECK_FIELDS.find(f => f.key === fieldKey);
        const fullTitle = `${fieldConfig?.label}: ${String(value)}`;
        switch (zone) {
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
    return (<li ref={ref} onClick={handleClick} className={`bg-white p-2 rounded-md shadow-sm border border-l-4 hover:shadow-md cursor-pointer active:cursor-grabbing transition-all duration-200 flex flex-col justify-between ${themeBorderColor}
                ${isDragging ? 'dragging-card' : ''}
                ${isSelected && isMultiSelectMode ? `bg-sky-50 ${glowClasses}` : 'border-slate-200 hover:border-sky-400'}`}>
            <div className="flex flex-col flex-grow space-y-1">
                {(fields.title || fields.topRight) && (<div className="flex justify-between items-start">
                        {fields.title || <div />}
                        {fields.topRight}
                    </div>)}
                 {fields.subtitle && <div>{fields.subtitle}</div>}
                 {fields.body1 && <div className="pt-1">{fields.body1}</div>}
                 {fields.body2 && <div>{fields.body2}</div>}
            </div>
            
            <div className="flex justify-between items-end mt-1 pt-1 border-t border-slate-100">
                {(fields.footerLeft || fields.footerRight) ? (<div className="flex justify-between items-end w-full">
                        {fields.footerLeft || <div />}
                        {fields.footerRight}
                    </div>) : <div />}

                <div className="flex justify-end items-center space-x-1 flex-shrink-0 pl-2">
                    {checkFlags.map(flag => (<div key={flag.id} className={`p-0.5 rounded-full ${flag.color}`} title={flag.name}>
                            <FlagIcon className={`h-3 w-3 ${flag.textColor}`}/>
                        </div>))}
                </div>
            </div>
        </li>);
});
const getDestinationIndex = (clientY, childElements) => {
    for (let i = 0; i < childElements.length; i++) {
        const child = childElements[i];
        const rect = child.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        if (clientY < midY) {
            return i;
        }
    }
    return childElements.length;
};
const KanbanColumn = ({ status, checks, flags, onSelectCheck, onExpand, dragState, isOver, sortConfig, onSort, onSelectAllInColumn, selectedCheckIds, onToggleSelection, displayOptions, themeId, themes, onToggleDisplayOption, onOpenThemePicker, multiSelectColumns, onToggleColumnMultiSelect, cardLayout }) => {
    const ref = useRef(null);
    const menuRef = useRef(null);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const theme = themes.find(t => t.id === themeId) || themes.find(t => t.id === 'default');
    const colors = theme && theme.id !== 'default' ? theme.colors : statusColors[status];
    const isThisColumnMultiSelect = multiSelectColumns.includes(status);
    const columnTotal = useMemo(() => checks.reduce((sum, check) => sum + check.amount, 0), [checks]);
    useEffect(() => {
        const el = ref.current;
        if (!el)
            return;
        return dropTargetForElements({
            element: el,
            getData: () => ({ status }),
        });
    }, [status]);
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setIsMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);
    const dropIndex = dragState.type === 'preview' && dragState.dragTo.status === status ? dragState.dragTo.index : null;
    const sortableKeys = [
        { key: 'payor', label: 'Payor' },
        { key: 'amount', label: 'Amount' },
        { key: 'date', label: 'Date' },
    ];
    return (<div className={`p-3 rounded-xl shadow-inner transition-colors duration-300 ${isOver ? 'column-is-over' : colors.bg} flex flex-col h-full border-t-4 ${colors.border}`}>
            <div className="flex justify-between items-center mb-4 px-2 flex-shrink-0">
                <div className="group flex-grow min-w-0">
                    <h2 className={`text-lg font-bold ${colors.text} transition-colors duration-200 truncate`}>
                        {status}
                        {displayOptions.showCount && <span className="text-sm font-normal text-slate-500 ml-2">({checks.length})</span>}
                        {displayOptions.showTotal && <span className="text-sm font-semibold text-slate-600 ml-2 bg-slate-200 px-2 py-0.5 rounded-full">${USDollar.format(columnTotal)}</span>}
                    </h2>
                </div>
                <div className="relative" ref={menuRef}>
                    <button onClick={() => setIsMenuOpen(p => !p)} className="p-1 rounded-full text-slate-500 hover:bg-slate-200">
                        <EllipsisVerticalIcon className="h-5 w-5"/>
                    </button>
                    {isMenuOpen && (<div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-md shadow-xl z-20 py-1">
                             <p className="px-4 pt-2 pb-1 text-xs text-gray-500 uppercase">Sort</p>
                            {sortableKeys.map(({ key, label }) => (<button key={key} onClick={() => { onSort(status, key); setIsMenuOpen(false); }} className="w-full text-left flex justify-between items-center px-4 py-2 text-sm text-gray-700 hover:bg-slate-100">
                                    <span>By {label}</span>
                                    {sortConfig?.key === key ? (sortConfig.direction === 'asc' ? <ArrowSmallUpIcon className="h-4 w-4"/> : <ArrowSmallDownIcon className="h-4 w-4"/>) : (<ChevronUpDownIcon className="h-4 w-4 text-slate-300"/>)}
                                </button>))}
                            <div className="border-t my-1"></div>
                             <p className="px-4 pt-2 pb-1 text-xs text-gray-500 uppercase">Actions</p>
                             <button onClick={() => { onToggleColumnMultiSelect(status); setIsMenuOpen(false); }} className="w-full text-left flex justify-between items-center px-4 py-2 text-sm text-gray-700 hover:bg-slate-100">
                                <span>{isThisColumnMultiSelect ? 'Done Selecting' : 'Select Checks'}</span>
                                {isThisColumnMultiSelect ? <XMarkIcon className="h-5 w-5"/> : <CheckBadgeIcon className="h-5 w-5"/>}
                            </button>
                            {isThisColumnMultiSelect && (<button onClick={() => { onSelectAllInColumn(status); setIsMenuOpen(false); }} className="w-full text-left flex justify-between items-center px-4 py-2 text-sm text-gray-700 hover:bg-slate-100">
                                    <span>Select All in Column</span>
                                </button>)}
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
                        </div>)}
                </div>
            </div>
            <ul ref={ref} className="space-y-3 flex-grow h-full pr-1 list-none p-0 m-0">
                {checks.length === 0 && dropIndex !== null ? (<>
                        <DropIndicator />
                        <div className="opacity-0 text-center py-8 px-4 border-2 border-dashed border-slate-200 rounded-lg flex-grow flex flex-col justify-center h-full">
                        <DocumentTextIcon className="mx-auto h-12 w-12 text-slate-300"/>
                        <p className="mt-2 text-sm font-medium text-slate-500">All clear!</p>
                        <p className="mt-1 text-sm text-slate-400">Drag a check here to get started.</p>
                    </div>
                    </>) : checks.length > 0 ? (<>
                        {dropIndex === 0 && <DropIndicator />}
                        {checks.map((check, index) => (<React.Fragment key={check.id}>
                                <CheckCard check={check} flags={flags} onSelectCheck={onSelectCheck} isDragging={dragState.type !== 'idle' && dragState.checkId === check.id} isSelected={selectedCheckIds.includes(check.id)} onToggleSelection={onToggleSelection} isMultiSelectMode={isThisColumnMultiSelect} theme={theme} cardLayout={cardLayout}/>
                                {dropIndex === index + 1 && <DropIndicator />}
                            </React.Fragment>))}
                    </>) : (<div className="text-center py-8 px-4 border-2 border-dashed border-slate-200 rounded-lg flex-grow flex flex-col justify-center h-full">
                        <DocumentTextIcon className="mx-auto h-12 w-12 text-slate-300"/>
                        <p className="mt-2 text-sm font-medium text-slate-500">All clear!</p>
                        <p className="mt-1 text-sm text-slate-400">Drag a check here to get started.</p>
                    </div>)}
            </ul>
        </div>);
};
const KanbanBoard = (props) => {
    const { checks, flags, themes, onSelectCheck, onMoveCheck, onExpandColumn, sortConfig, onSort, onSelectAllInColumn, selectedCheckIds, onToggleSelection, columnDisplayOptions, columnThemes, onToggleDisplayOption, onOpenThemePicker, multiSelectColumns, onToggleColumnMultiSelect, cardLayout } = props;
    const boardStatuses = [CheckStatus.RECEIVED, CheckStatus.CONFIRMING_DETAILS, CheckStatus.QUEUED, CheckStatus.COMPLETE];
    const checksByStatus = useMemo(() => {
        const grouped = boardStatuses.reduce((acc, status) => {
            acc[status] = checks.filter(c => c.status === status);
            return acc;
        }, {});
        for (const status of boardStatuses) {
            const config = sortConfig[status];
            if (config) {
                grouped[status].sort((a, b) => {
                    const valA = a[config.key];
                    const valB = b[config.key];
                    if (valA === undefined || valB === undefined)
                        return 0;
                    if (typeof valA === 'string' && typeof valB === 'string') {
                        return config.direction === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
                    }
                    if (typeof valA === 'number' && typeof valB === 'number') {
                        return config.direction === 'asc' ? valA - valB : valB - valA;
                    }
                    if (config.key === 'date') {
                        return config.direction === 'asc' ? new Date(valA).getTime() - new Date(valB).getTime() : new Date(valB).getTime() - new Date(valA).getTime();
                    }
                    return 0;
                });
            }
        }
        return grouped;
    }, [checks, sortConfig]);
    const [dragState, setDragState] = useState({ type: 'idle' });
    const [isOverColumn, setIsOverColumn] = useState(null);
    useEffect(() => {
        return combine(monitorForElements({
            onDragStart: ({ source }) => {
                if (source.data.type !== 'check')
                    return;
                setDragState({ type: 'dragging', checkId: source.data.checkId });
            },
            onDrag: ({ location, source }) => {
                if (source.data.type !== 'check')
                    return;
                const over = location.current.dropTargets;
                const overColumnTarget = over.find(t => t.data.status);
                if (!overColumnTarget) {
                    setIsOverColumn(null);
                    setDragState({ type: 'dragging', checkId: source.data.checkId });
                    return;
                }
                const columnStatus = overColumnTarget.data.status;
                setIsOverColumn(columnStatus);
                const columnElement = overColumnTarget.element;
                const checkElements = Array.from(columnElement.querySelectorAll('li:not(.drop-indicator)'));
                const index = getDestinationIndex(location.current.input.clientY, checkElements);
                setDragState({
                    type: 'preview',
                    checkId: source.data.checkId,
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
        }));
    }, [dragState, onMoveCheck]);
    return (<main className="container mx-auto p-4 sm:p-6 lg:p-8 flex-grow flex flex-col">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 flex-grow">
                {boardStatuses.map(status => (<KanbanColumn key={status} status={status} checks={checksByStatus[status]} flags={flags} onSelectCheck={onSelectCheck} onExpand={onExpandColumn} dragState={dragState} isOver={isOverColumn === status} sortConfig={sortConfig[status]} onSort={onSort} onSelectAllInColumn={onSelectAllInColumn} selectedCheckIds={selectedCheckIds} onToggleSelection={onToggleSelection} displayOptions={columnDisplayOptions[status]} themeId={columnThemes[status]} themes={themes} onToggleDisplayOption={onToggleDisplayOption} onOpenThemePicker={onOpenThemePicker} multiSelectColumns={multiSelectColumns} onToggleColumnMultiSelect={onToggleColumnMultiSelect} cardLayout={cardLayout}/>))}
            </div>
        </main>);
};
export default KanbanBoard;
