import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { Check, CheckField, Theme } from '../types';
import { DocumentTextIcon, AdjustmentsHorizontalIcon, ArrowSmallUpIcon, ArrowSmallDownIcon, ChevronUpDownIcon, PaintBrushIcon, ArchiveBoxIcon } from './icons';
import { ALL_CHECK_FIELDS } from '../constants';
import {
  draggable,
  dropTargetForElements,
  monitorForElements,
} from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';
import { reorder } from "@atlaskit/pragmatic-drag-and-drop/reorder";
import { getReorderDestinationIndex } from "@atlaskit/pragmatic-drag-and-drop-hitbox/util/get-reorder-destination-index";
import { extractClosestEdge, Edge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge';
import { setCustomNativeDragPreview } from '@atlaskit/pragmatic-drag-and-drop/element/set-custom-native-drag-preview';
import { pointerOutsideOfPreview } from '@atlaskit/pragmatic-drag-and-drop/element/pointer-outside-of-preview';
import { createRoot } from 'react-dom/client';
import { triggerPostMoveFlash } from '@atlaskit/pragmatic-drag-and-drop-flourish/trigger-post-move-flash';


interface ArchiveViewProps {
    checks: Check[];
    onSelectCheck: (check: Check) => void;
    onBack: () => void;
    searchTerm: string;
    visibleColumns: CheckField[];
    onVisibleColumnsChange: (newColumns: CheckField[]) => void;
    columnWidths: Record<string, number>;
    onColumnWidthsChange: (newWidths: Record<string, number>) => void;
    archiveTheme: string;
    themes: Theme[];
    onOpenThemePicker: () => void;
    preferences: UserPreferences;
}

type SortConfig = { key: CheckField; direction: 'asc' | 'desc' } | null;

// Utility to format cell data for display
const formatCell = (check: Check, key: CheckField): string => {
    const value = check[key];
    if (value === undefined || value === null) return 'N/A';
    if (key === 'amount') return `$${(value as number).toFixed(2)}`;
    if (key === 'date' || key === 'createdAt' || key === 'statusUpdatedAt') {
        const date = new Date(value as string);
        if (isNaN(date.getTime())) return 'Invalid Date';
        return date.toLocaleDateString();
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

    return (
        <div
            ref={ref}
            className="absolute top-0 right-0 h-full w-2 cursor-col-resize opacity-0 hover:opacity-100 bg-sky-500/50"
        ></div>
    );
};

interface DraggableHeaderProps {
    column: { key: CheckField; label: string; };
    columnIndex: number;
    sortConfig: SortConfig;
    onSort: (key: CheckField) => void;
    checksForPreview: Check[];
    onResize: (delta: number) => void;
    onResizeEnd: () => void;
    theme?: Theme;
    width: number | undefined;
    preferences: UserPreferences;
}

const DraggableHeader = ({
    column,
    columnIndex,
    sortConfig,
    onSort,
    checksForPreview,
    onResize,
    onResizeEnd,
    theme,
    width,
    preferences,
}: DraggableHeaderProps) => {
    const ref = useRef<HTMLTableCellElement>(null);
    const [dragState, setDragState] = useState<{ closestEdge: Edge | null }>({ closestEdge: null });

    useEffect(() => {
        const el = ref.current;
        if (!el) return;

        return combine(
            draggable({
                element: el,
                getInitialData: () => ({ type: 'column', key: column.key, index: columnIndex }),
                onGenerateDragPreview: ({ nativeSetDragImage }) => {
                    setCustomNativeDragPreview({
                        nativeSetDragImage,
                        render: ({ container }) => {
                            const preview = document.createElement('div');
                            container.appendChild(preview);
                            const root = createRoot(preview);
                            root.render(
                                <div className="bg-white dark:bg-gray-700 rounded-md shadow-lg border border-slate-300 dark:border-gray-600">
                                    <table className="min-w-full">
                                        <thead className="bg-slate-100 dark:bg-gray-800">
                                            <tr><th className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-gray-300">{column.label}</th></tr>
                                        </thead>
                                        <tbody>
                                            {checksForPreview.map(check => (
                                                <tr key={check.id}><td className="px-4 py-1 text-sm text-slate-600 dark:text-gray-400 border-t dark:border-gray-600 truncate">{formatCell(check, column.key)}</td></tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            );
                            pointerOutsideOfPreview({ x: '20px', y: '20px' });
                            return () => root.unmount();
                        },
                    });
                },
            }),
            dropTargetForElements({
                element: el,
                getData: (args) => {
                    const data = { type: 'column', key: column.key, index: columnIndex };
                    const closestEdge = extractClosestEdge(data);
                    return { ...data, closestEdge };
                },
                onDragEnter: (args) => setDragState({ closestEdge: args.self.data.closestEdge as Edge | null }),
                onDrag: (args) => setDragState({ closestEdge: args.self.data.closestEdge as Edge | null }),
                onDragLeave: () => setDragState({ closestEdge: null }),
                onDrop: () => setDragState({ closestEdge: null }),
            })
        );
    }, [column, columnIndex, checksForPreview]);

    const isSorted = sortConfig?.key === column.key;
    const headerTextColorClass = preferences.darkMode 
        ? (theme && theme.id !== 'default' ? theme.colors.dark?.text : 'text-gray-300') 
        : (theme && theme.id !== 'default' ? theme.colors.text : 'text-slate-500');

    return (
        <th
            ref={ref}
            scope="col"
            data-key={column.key}
            className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider select-none transition-colors relative group ${headerTextColorClass}`}
            style={{ width: width ? `${width}px` : 'auto' }}
        >
            <div onClick={() => onSort(column.key)} className="flex items-center justify-between cursor-pointer">
                <span>{column.label}</span>
                {isSorted ? (
                    sortConfig?.direction === 'asc' ? <ArrowSmallUpIcon className="h-4 w-4" /> : <ArrowSmallDownIcon className="h-4 w-4" />
                ) : (
                    <ChevronUpDownIcon className="h-4 w-4 text-slate-300 dark:text-gray-500" />
                )}
            </div>
            {dragState.closestEdge && <div className={`absolute top-0 bottom-0 w-1 bg-sky-500 pointer-events-none ${dragState.closestEdge === 'left' ? 'left-0' : 'right-0'}`}></div>}
            <ColumnResizer onResize={onResize} onResizeEnd={onResizeEnd} />
        </th>
    );
};


const ArchiveView: React.FC<ArchiveViewProps> = ({ checks, onSelectCheck, onBack, searchTerm, visibleColumns, onVisibleColumnsChange, columnWidths: persistedWidths, onColumnWidthsChange, archiveTheme, themes, onOpenThemePicker, preferences }) => {
    const [sortConfig, setSortConfig] = useState<SortConfig>(null);
    const [isColumnDropdownOpen, setIsColumnDropdownOpen] = useState(false);
    const [lastDroppedColumnIndex, setLastDroppedColumnIndex] = useState<number | null>(null);
    const [columnWidths, setColumnWidths] = useState(persistedWidths);
    const [resizingColumn, setResizingColumn] = useState<{ key: CheckField; initialWidth: number } | null>(null);

    const columnDropdownRef = useRef<HTMLDivElement>(null);
    const tableRef = useRef<HTMLTableElement>(null);

    const theme = useMemo(() => themes.find(t => t.id === archiveTheme) || themes.find(t => t.id === 'default'), [themes, archiveTheme]);

    useEffect(() => {
        setColumnWidths(persistedWidths);
    }, [persistedWidths]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (columnDropdownRef.current && !columnDropdownRef.current.contains(event.target as Node)) {
                setIsColumnDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        return monitorForElements({
            onDrop({ source, location }) {
                if (source.data.type !== 'column') return;
                const destination = location.current.dropTargets.find(t => t.data.type === 'column');
                if (!destination) return;
                
                const startIndex = source.data.index as number;
                const indexOfTarget = destination.data.index as number;
                const closestEdgeOfTarget = destination.data.closestEdge as Edge | null;

                const finishIndex = getReorderDestinationIndex({
                    startIndex,
                    indexOfTarget,
                    closestEdgeOfTarget,
                    axis: 'horizontal',
                });
                
                if (finishIndex === startIndex) return;

                setLastDroppedColumnIndex(finishIndex);

                const newColumns = reorder({ list: visibleColumns, startIndex, finishIndex });
                onVisibleColumnsChange(newColumns);
            },
        });
    }, [visibleColumns, onVisibleColumnsChange]);
    
    useEffect(() => {
        if (lastDroppedColumnIndex === null) return;
        
        const table = tableRef.current;
        if (!table) return;

        const th = table.querySelector<HTMLTableCellElement>(`thead th:nth-of-type(${lastDroppedColumnIndex + 1})`);
        if (th) {
            triggerPostMoveFlash(th);
        }
        setLastDroppedColumnIndex(null);
    }, [lastDroppedColumnIndex]);

    const handleResize = useCallback((key: CheckField, delta: number) => {
        if (!resizingColumn || resizingColumn.key !== key) {
            const headerElement = tableRef.current?.querySelector<HTMLElement>(`th[data-key="${key}"]`);
            const initialWidth = headerElement?.offsetWidth || 150;
            setResizingColumn({ key, initialWidth: initialWidth });
            setColumnWidths(prev => ({ ...prev, [key]: Math.max(80, initialWidth + delta) }));
        } else {
             setColumnWidths(prev => ({ ...prev, [key]: Math.max(80, resizingColumn.initialWidth + delta) }));
        }
    }, [resizingColumn]);

    const handleResizeEnd = useCallback(() => {
        onColumnWidthsChange(columnWidths);
        setResizingColumn(null);
    }, [columnWidths, onColumnWidthsChange]);

    const sortedChecks = useMemo(() => {
        let sortableChecks = [...checks];
        if (sortConfig) {
            sortableChecks.sort((a, b) => {
                const aValue = a[sortConfig.key];
                const bValue = b[sortConfig.key];
                if (aValue === null || aValue === undefined) return 1;
                if (bValue === null || bValue === undefined) return -1;
                if (typeof aValue === 'number' && typeof bValue === 'number') {
                    return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
                }
                if (sortConfig.key === 'date' || sortConfig.key === 'createdAt' || sortConfig.key === 'statusUpdatedAt') {
                     const aDate = new Date(aValue as string).getTime();
                     const bDate = new Date(bValue as string).getTime();
                     return sortConfig.direction === 'asc' ? aDate - bDate : bDate - aDate;
                }
                return sortConfig.direction === 'asc' 
                    ? String(aValue).localeCompare(String(bValue))
                    : String(bValue).localeCompare(String(aValue));
            });
        }
        return sortableChecks;
    }, [checks, sortConfig]);

    const filteredChecks = useMemo(() => {
        if (!searchTerm) return sortedChecks;
        const searchLower = searchTerm.toLowerCase();
        return sortedChecks.filter(check => 
            Object.values(check).some(value => 
                String(value).toLowerCase().includes(searchLower)
            )
        );
    }, [sortedChecks, searchTerm]);

    const columns = useMemo(() => 
        visibleColumns
            .map(key => ALL_CHECK_FIELDS.find(f => f.key === key))
            .filter((c): c is { key: CheckField; label: string; isNumeric?: boolean } => Boolean(c)),
        [visibleColumns]
    );

    const handleSort = (key: CheckField) => {
        const newDirection = sortConfig && sortConfig.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc';
        setSortConfig({ key, direction: newDirection });
    };

    const handleToggleColumn = (key: CheckField) => {
        const newColumns = visibleColumns.includes(key)
            ? visibleColumns.filter(k => k !== key)
            : [...visibleColumns, key];
        onVisibleColumnsChange(newColumns);
    };
    
    const darkMode = preferences.darkMode;
    const headerClasses = theme && theme.id !== 'default' 
        ? (darkMode && theme.colors.dark ? "bg-gradient-to-b from-gray-700 from-5% " + theme.colors.dark.bg.replace("bg-", "to-") + " to-20%" : theme.colors.bg) 
        : (darkMode ? 'bg-gray-800' : 'bg-slate-50');

    const rowHoverClass = theme && theme.id !== 'default' 
        ? (darkMode && theme.colors.dark ? `hover:${theme.colors.dark.bg.replace('bg-', 'bg-')}` : `hover:${theme.colors.bg.replace('bg-', 'bg-')}`) 
        : (darkMode ? 'dark:hover:bg-gray-600' : 'hover:bg-slate-50');


    return (
        <main className="container mx-auto p-4 sm:p-6 lg:p-8">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
                <div className="flex justify-between items-center mb-4 border-b dark:border-gray-700 pb-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Archived Checks</h1>
                        <p className="text-slate-500 dark:text-gray-400">{filteredChecks.length} of {checks.length} items found</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={onOpenThemePicker} title="Change Theme" className="p-2 bg-white dark:bg-gray-700 hover:bg-slate-100 dark:hover:bg-gray-600 border border-slate-300 dark:border-gray-600 text-slate-600 dark:text-gray-300 rounded-md shadow-sm">
                            <PaintBrushIcon className="h-5 w-5" />
                        </button>
                        <div className="relative" ref={columnDropdownRef}>
                            <button onClick={() => setIsColumnDropdownOpen(p => !p)} className="p-2 bg-white dark:bg-gray-700 hover:bg-slate-100 dark:hover:bg-gray-600 border border-slate-300 dark:border-gray-600 text-slate-600 dark:text-gray-300 rounded-md shadow-sm">
                                <AdjustmentsHorizontalIcon className="h-5 w-5" />
                            </button>
                            {isColumnDropdownOpen && (
                                <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-700 border dark:border-gray-600 rounded-md shadow-lg z-10 max-h-80 overflow-y-auto">
                                    <p className="px-3 py-2 text-xs font-semibold text-slate-500 dark:text-gray-400 bg-slate-50 dark:bg-gray-800 border-b dark:border-gray-600">Visible Columns</p>
                                    <div className="p-2">
                                        {ALL_CHECK_FIELDS.map(field => (
                                            <label key={field.key} className="flex items-center w-full px-2 py-1.5 text-sm text-slate-700 dark:text-gray-300 rounded-md hover:bg-slate-50 dark:hover:bg-gray-600">
                                                <input
                                                    type="checkbox"
                                                    checked={visibleColumns.includes(field.key)}
                                                    onChange={() => handleToggleColumn(field.key)}
                                                    className="h-4 w-4 rounded border-gray-300 text-sky-600 focus:ring-sky-500"
                                                />
                                                <span className="ml-3">{field.label}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                        <button onClick={onBack} className="px-4 py-2 bg-white dark:bg-gray-700 hover:bg-slate-100 dark:hover:bg-gray-600 border border-slate-300 dark:border-gray-600 text-slate-700 dark:text-gray-300 font-semibold rounded-md shadow-sm transition-colors duration-200">
                            Back to Board
                        </button>
                    </div>
                </div>
                
                {checks.length > 0 ? (
                     <div className="overflow-x-auto">
                        <table ref={tableRef} className="min-w-full divide-y divide-slate-200 dark:divide-gray-700 border-separate border-spacing-0" style={{ tableLayout: 'fixed' }}>
                            <thead className={headerClasses}>
                                <tr>
                                    {columns.map((col, index) => (
                                         <DraggableHeader 
                                            key={col.key}
                                            column={col} 
                                            columnIndex={index}
                                            sortConfig={sortConfig} 
                                            onSort={handleSort}
                                            checksForPreview={filteredChecks.slice(0, 5)}
                                            onResize={(delta) => handleResize(col.key, delta)}
                                            onResizeEnd={handleResizeEnd}
                                            theme={theme}
                                            width={columnWidths[col.key]}
                                            preferences={preferences}
                                         />
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-gray-800 divide-y divide-slate-200 dark:divide-gray-700">
                                {filteredChecks.map(check => (
                                    <tr key={check.id} onClick={() => onSelectCheck(check)} className={`${rowHoverClass} cursor-pointer`}>
                                        {columns.map(col => (
                                            <td 
                                                key={col.key} 
                                                className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 dark:text-gray-300 truncate"
                                            >
                                                {formatCell(check, col.key)}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="text-center py-16 px-4 border-2 border-dashed border-slate-200 dark:border-gray-700 rounded-lg">
                        <ArchiveBoxIcon className="mx-auto h-16 w-16 text-slate-300 dark:text-gray-600" />
                        <h3 className="mt-4 text-lg font-medium text-slate-800 dark:text-white">The Archive is Empty</h3>
                        <p className="mt-1 text-sm text-slate-500 dark:text-gray-400">Checks marked 'Complete' for over 10 days will automatically appear here.</p>
                    </div>
                )}
            </div>
        </main>
    );
};

export default ArchiveView;