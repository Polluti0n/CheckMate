import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Check, CheckField, Theme, CheckStatus } from '../types';
import { DocumentTextIcon, AdjustmentsHorizontalIcon, ArrowSmallUpIcon, ArrowSmallDownIcon, ChevronUpDownIcon, PaintBrushIcon, ArchiveBoxIcon, ArrowUturnLeftIcon } from './icons';
import { ALL_CHECK_FIELDS } from '../constants';
import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';
import { dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { monitorForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { draggable } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { reorder } from "@atlaskit/pragmatic-drag-and-drop/reorder";
import { getReorderDestinationIndex } from "@atlaskit/pragmatic-drag-and-drop-hitbox/util/get-reorder-destination-index";
import { extractClosestEdge, Edge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge';
import { setCustomNativeDragPreview } from '@atlaskit/pragmatic-drag-and-drop/element/set-custom-native-drag-preview';
import { pointerOutsideOfPreview } from '@atlaskit/pragmatic-drag-and-drop/element/pointer-outside-of-preview';
import { createRoot } from 'react-dom/client';
import { triggerPostMoveFlash } from '@atlaskit/pragmatic-drag-and-drop-flourish/trigger-post-move-flash';


interface ArchiveViewProps {
    checks: Check[];
    onBack?: () => void;
    searchTerm: string;
    visibleColumns: CheckField[];
    onVisibleColumnsChange: (newColumns: CheckField[]) => void;
    columnWidths: Record<string, number>;
    onColumnWidthsChange: (newWidths: Record<string, number>) => void;
    archiveTheme: string;
    themes: Theme[];
    onOpenThemePicker: () => void;
    onUnarchiveCheck: (check: Check) => void;
}

type SortConfig = { key: CheckField; direction: 'asc' | 'desc' } | null;

const formatCell = (check: Check, key: CheckField): string => {
    const value = check[key];
    if (value === undefined || value === null) return 'N/A';
    if (key === 'amount') return `$${(value as number).toFixed(2)}`;
    if (key === 'date' || key === 'createdAt' || key === 'statusUpdatedAt') {
        const date = new Date(value as string);
        return isNaN(date.getTime()) ? 'Invalid Date' : date.toLocaleDateString();
    }
    return String(value);
};

const ColumnResizer = ({ onResize, onResizeEnd }: { onResize: (delta: number) => void, onResizeEnd: () => void }) => {
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        return draggable({
            element: el,
            onDrag: ({ location }) => onResize(location.current.input.clientX - location.initial.input.clientX),
            onDrop: onResizeEnd,
        });
    }, [onResize, onResizeEnd]);

    return <div ref={ref} className="absolute top-0 right-0 h-full w-2 cursor-col-resize opacity-0 hover:opacity-100 bg-sky-500/50" />;
};

const DraggableHeader = ({ column, columnIndex, sortConfig, onSort, checksForPreview, onResize, onResizeEnd, theme, width }: {
    column: { key: CheckField; label: string; }; columnIndex: number; sortConfig: SortConfig;
    onSort: (key: CheckField) => void; checksForPreview: Check[];
    onResize: (delta: number) => void; onResizeEnd: () => void; theme?: Theme; width?: number;
}) => {
    const ref = useRef<HTMLTableCellElement>(null);
    const [dragState, setDragState] = useState<{ closestEdge: Edge | null }>({ closestEdge: null });

    useEffect(() => {
        const el = ref.current; if (!el) return;
        return combine(
            draggable({
                element: el, getInitialData: () => ({ type: 'column', key: column.key, index: columnIndex }),
                onGenerateDragPreview: ({ nativeSetDragImage }) => {
                    setCustomNativeDragPreview({ nativeSetDragImage, render: ({ container }) => {
                        const root = createRoot(container);
                        root.render(
                            <div className="bg-white rounded-md shadow-lg border border-slate-300">
                                <table className="min-w-full"><thead className="bg-slate-100"><tr><th className="px-4 py-2 text-sm font-medium text-slate-700">{column.label}</th></tr></thead>
                                    <tbody>{checksForPreview.map(check => (<tr key={check.id}><td className="px-4 py-1 text-sm text-slate-600 border-t truncate">{formatCell(check, column.key)}</td></tr>))}</tbody>
                                </table>
                            </div>
                        );
                        pointerOutsideOfPreview({ x: '20px', y: '20px' });
                        return () => root.unmount();
                    }});
                },
            }),
            dropTargetForElements({
                element: el,
                getData: (args) => { const data = { type: 'column', key: column.key, index: columnIndex }; return { ...data, closestEdge: extractClosestEdge(data) }; },
                onDragEnter: (args) => setDragState({ closestEdge: args.self.data.closestEdge as Edge | null }),
                onDrag: (args) => setDragState({ closestEdge: args.self.data.closestEdge as Edge | null }),
                onDragLeave: () => setDragState({ closestEdge: null }),
                onDrop: () => setDragState({ closestEdge: null }),
            })
        );
    }, [column, columnIndex, checksForPreview]);

    const isSorted = sortConfig?.key === column.key;
    const headerTextColorClass = theme?.id !== 'default' ? theme.colors.text : 'text-slate-500';

    return (
        <th ref={ref} scope="col" data-key={column.key} className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider select-none transition-colors relative group ${headerTextColorClass}`} style={{ width: width ? `${width}px` : 'auto' }}>
            <div onClick={() => onSort(column.key)} className="flex items-center justify-between cursor-pointer">
                <span>{column.label}</span>
                {isSorted ? (sortConfig?.direction === 'asc' ? <ArrowSmallUpIcon className="h-4 w-4" /> : <ArrowSmallDownIcon className="h-4 w-4" />) : (<ChevronUpDownIcon className="h-4 w-4 text-slate-300" />)}
            </div>
            {dragState.closestEdge && <div className={`absolute top-0 bottom-0 w-1 bg-sky-500 pointer-events-none ${dragState.closestEdge === 'left' ? 'left-0' : 'right-0'}`}></div>}
            <ColumnResizer onResize={onResize} onResizeEnd={onResizeEnd} />
        </th>
    );
};

const ArchiveView: React.FC<ArchiveViewProps> = ({ checks, onBack, searchTerm, visibleColumns, onVisibleColumnsChange, columnWidths: persistedWidths, onColumnWidthsChange, archiveTheme, themes, onOpenThemePicker, onUnarchiveCheck }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const [sortConfig, setSortConfig] = useState<SortConfig>(null);
    const [isColumnDropdownOpen, setIsColumnDropdownOpen] = useState(false);
    const [lastDroppedColumnIndex, setLastDroppedColumnIndex] = useState<number | null>(null);
    const [columnWidths, setColumnWidths] = useState(persistedWidths);
    const [resizingColumnKey, setResizingColumnKey] = useState<CheckField | null>(null);
    const initialWidthRef = useRef(0);

    const columnDropdownRef = useRef<HTMLDivElement>(null);
    const tableRef = useRef<HTMLTableElement>(null);

    const theme = useMemo(() => themes.find(t => t.id === archiveTheme) || themes.find(t => t.id === 'default'), [themes, archiveTheme]);
    
    useEffect(() => setColumnWidths(persistedWidths), [persistedWidths]);
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => { if (columnDropdownRef.current && !columnDropdownRef.current.contains(event.target as Node)) setIsColumnDropdownOpen(false); };
        document.addEventListener('mousedown', handleClickOutside); return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        return monitorForElements({
            onDrop({ source, location }) {
                if (source.data.type !== 'column') return;
                const destination = location.current.dropTargets.find(t => t.data.type === 'column'); if (!destination) return;
                const startIndex = source.data.index as number;
                const finishIndex = getReorderDestinationIndex({ startIndex, indexOfTarget: destination.data.index as number, closestEdgeOfTarget: destination.data.closestEdge as Edge | null, axis: 'horizontal' });
                if (finishIndex === startIndex) return;
                setLastDroppedColumnIndex(finishIndex);
                onVisibleColumnsChange(reorder({ list: visibleColumns, startIndex, finishIndex }));
            },
        });
    }, [visibleColumns, onVisibleColumnsChange]);
    
    useEffect(() => {
        if (lastDroppedColumnIndex === null) return;
        const th = tableRef.current?.querySelector<HTMLTableCellElement>(`thead th:nth-of-type(${lastDroppedColumnIndex + 1})`);
        if (th) triggerPostMoveFlash(th);
        setLastDroppedColumnIndex(null);
    }, [lastDroppedColumnIndex]);

    const handleResizeStart = useCallback((key: CheckField) => {
        setResizingColumnKey(key);
        const headerElement = tableRef.current?.querySelector<HTMLElement>(`th[data-key="${key}"]`);
        initialWidthRef.current = headerElement?.offsetWidth || 150;
    }, []);

    const handleResize = useCallback((delta: number) => {
        if (!resizingColumnKey) return;
        setColumnWidths(prev => ({ ...prev, [resizingColumnKey]: Math.max(80, initialWidthRef.current + delta) }));
    }, [resizingColumnKey]);

    const handleResizeEnd = useCallback(() => {
        if (resizingColumnKey) onColumnWidthsChange(columnWidths);
        setResizingColumnKey(null);
    }, [columnWidths, onColumnWidthsChange, resizingColumnKey]);
    
    const sortedChecks = useMemo(() => {
        let sortableChecks = [...checks];
        if (sortConfig) {
            sortableChecks.sort((a, b) => {
                const aValue = a[sortConfig.key], bValue = b[sortConfig.key];
                if (aValue === null || aValue === undefined) return 1; if (bValue === null || bValue === undefined) return -1;
                if (typeof aValue === 'number' && typeof bValue === 'number') return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
                if (['date', 'createdAt', 'statusUpdatedAt'].includes(sortConfig.key)) return sortConfig.direction === 'asc' ? new Date(aValue as string).getTime() - new Date(bValue as string).getTime() : new Date(bValue as string).getTime() - new Date(aValue as string).getTime();
                return sortConfig.direction === 'asc' ? String(aValue).localeCompare(String(bValue)) : String(bValue).localeCompare(String(aValue));
            });
        }
        return sortableChecks;
    }, [checks, sortConfig]);

    const filteredChecks = useMemo(() => {
        if (!searchTerm) return sortedChecks;
        const searchLower = searchTerm.toLowerCase();
        return sortedChecks.filter(check => Object.values(check).some(value => String(value).toLowerCase().includes(searchLower)));
    }, [sortedChecks, searchTerm]);

    const columns = useMemo(() => visibleColumns.map(key => ALL_CHECK_FIELDS.find(f => f.key === key)).filter(Boolean as any as (c: any) => c is { key: CheckField; label: string; isNumeric?: boolean }), [visibleColumns]);

    const handleSort = (key: CheckField) => setSortConfig(sc => (sc?.key === key && sc.direction === 'asc' ? { key, direction: 'desc' } : { key, direction: 'asc' }));
    const handleToggleColumn = (key: CheckField) => onVisibleColumnsChange(visibleColumns.includes(key) ? visibleColumns.filter(k => k !== key) : [...visibleColumns, key]);
    
    const headerClasses = theme?.id !== 'default' ? theme.colors.bg : 'bg-slate-50';
    const rowHoverClass = theme?.id !== 'default' ? `hover:${theme.colors.bg.replace('bg-', 'bg-')}` : 'hover:bg-slate-50';

    return (
        <main className="container mx-auto p-4 sm:p-6 lg:p-8">
            <div className="bg-white p-6 rounded-xl shadow-md">
                <div className="flex justify-between items-center mb-4 border-b pb-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">Archived Checks</h1>
                        <p className="text-slate-500">{filteredChecks.length} of {checks.length} items found</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={onOpenThemePicker} title="Change Theme" className="p-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-600 rounded-md shadow-sm"><PaintBrushIcon className="h-5 w-5" /></button>
                        <div className="relative" ref={columnDropdownRef}>
                            <button onClick={() => setIsColumnDropdownOpen(p => !p)} className="p-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-600 rounded-md shadow-sm"><AdjustmentsHorizontalIcon className="h-5 w-5" /></button>
                            {isColumnDropdownOpen && (<div className="absolute right-0 mt-2 w-64 bg-white border rounded-md shadow-lg z-10 max-h-80 overflow-y-auto"><p className="px-3 py-2 text-xs font-semibold text-slate-500 bg-slate-50 border-b">Visible Columns</p><div className="p-2">{ALL_CHECK_FIELDS.map(field => (<label key={field.key} className="flex items-center w-full px-2 py-1.5 text-sm text-slate-700 rounded-md hover:bg-slate-50"><input type="checkbox" checked={visibleColumns.includes(field.key)} onChange={() => handleToggleColumn(field.key)} className="h-4 w-4 rounded border-gray-300 text-sky-600 focus:ring-sky-500"/><span className="ml-3">{field.label}</span></label>))}</div></div>)}
                        </div>
                        <button onClick={() => navigate('/')} className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-semibold rounded-md shadow-sm">Back to Board</button>
                    </div>
                </div>
                {checks.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table ref={tableRef} className="min-w-full divide-y divide-slate-200 border-separate border-spacing-0" style={{ tableLayout: 'fixed' }}>
                            <thead className={headerClasses}>
                                <tr>
                                    {columns.map((col, index) => (
                                        <DraggableHeader key={col.key} column={col} columnIndex={index} sortConfig={sortConfig} onSort={handleSort} checksForPreview={filteredChecks.slice(0, 5)} onResize={(delta) => handleResize(delta)} onResizeEnd={handleResizeEnd} theme={theme} width={columnWidths[col.key]} />
                                    ))}
                                    <th scope="col" className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${headerClasses} ${theme?.id !== 'default' ? theme.colors.text : 'text-slate-500'}`}>Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-slate-200">
                                {filteredChecks.map(check => (
                                    <tr key={check.id} className={`${rowHoverClass} cursor-pointer`} onClick={() => navigate(`/check/${check.id}`, { state: { backgroundLocation: location } })}>
                                        {columns.map(col => (
                                            <td key={col.key} className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 truncate">{formatCell(check, col.key)}</td>
                                        ))}
                                        <td className="px-4 py-2 whitespace-nowrap text-sm text-center">
                                            <button onClick={(e) => { e.stopPropagation(); onUnarchiveCheck(check);}} className="p-2 text-slate-500 hover:bg-slate-100 hover:text-sky-600 rounded-full" title="Unarchive Check"><ArrowUturnLeftIcon className="h-5 w-5"/></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="text-center py-16 px-4 border-2 border-dashed border-slate-200 rounded-lg">
                        <ArchiveBoxIcon className="mx-auto h-16 w-16 text-slate-300" />
                        <h3 className="mt-4 text-lg font-medium text-slate-800">The Archive is Empty</h3>
                        <p className="mt-1 text-sm text-slate-500">Completed checks appear here after 10 days.</p>
                    </div>
                )}
            </div>
        </main>
    );
};

export default ArchiveView;
