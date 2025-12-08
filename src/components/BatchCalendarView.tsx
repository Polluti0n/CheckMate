import React, { useState, useMemo } from 'react';
import { Batch } from '../types';
import { ChevronLeftIcon, ChevronRightIcon } from './icons';

interface BatchCalendarViewProps {
    batches: Batch[];
    onSelectBatch: (batch: Batch) => void;
}

const BatchCalendarView: React.FC<BatchCalendarViewProps> = ({ batches, onSelectBatch }) => {
    const [currentDate, setCurrentDate] = useState(new Date());

    const batchesByDate = useMemo(() => {
        const map = new Map<string, Batch[]>();
        batches.forEach(batch => {
            const dateKey = new Date(batch.createdAt).toISOString().split('T')[0]; // YYYY-MM-DD
            if (!map.has(dateKey)) {
                map.set(dateKey, []);
            }
            map.get(dateKey)!.push(batch);
        });
        return map;
    }, [batches]);

    const handlePrevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const handleNextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const calendarDays = [];
    for (let i = 0; i < firstDayOfMonth; i++) {
        calendarDays.push(<div key={`empty-${i}`} className="border-r border-b dark:border-gray-700 p-2 bg-slate-50 dark:bg-gray-800"></div>);
    }

    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        const dateKey = date.toISOString().split('T')[0];
        const dayBatches = batchesByDate.get(dateKey) || [];
        const isToday = date.getTime() === today.getTime();

        calendarDays.push(
            <div key={day} className="border-r border-b dark:border-gray-700 p-2 min-h-[120px]">
                <div className={`text-sm font-semibold ${isToday ? 'text-white bg-sky-500 rounded-full w-6 h-6 flex items-center justify-center' : 'text-slate-700 dark:text-gray-300'}`}>
                    {day}
                </div>
                <div className="mt-1 space-y-2 max-h-[90px] overflow-y-auto pr-1">
                    {dayBatches.map(batch => (
                        <button 
                            key={batch.id} 
                            onClick={() => onSelectBatch(batch)}
                            className="w-full text-left p-2 bg-sky-50 dark:bg-sky-900 hover:bg-sky-100 dark:hover:bg-sky-800 rounded-lg flex flex-col shadow-sm hover:shadow-md border border-sky-200 dark:border-sky-700 hover:border-sky-600 dark:hover:border-sky-500 transition-all duration-200"
                            title={`Tracking #: ${batch.trackingNumber}\nChecks: ${batch.checkIds.length}\nDate: ${new Date(batch.createdAt).toLocaleDateString()}`}
                        >
                           <div className="flex justify-between items-center w-full">
                               <span className="text-[10px] font-semibold text-slate-500 dark:text-gray-400 uppercase tracking-wide">Tracking</span>
                               <span className="flex-shrink-0 px-1.5 py-0.5 bg-purple-200 dark:bg-purple-800 text-sky-900 dark:text-sky-200 rounded-full font-bold text-[10px]">
                                   {batch.checkIds.length}
                               </span>
                           </div>
                           <p className="text-sm font-mono text-slate-700 dark:text-gray-300 truncate w-full">
                               {batch.trackingNumber}
                           </p>
                        </button>
                    ))}
                </div>
            </div>
        );
    }

    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <button onClick={handlePrevMonth} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-gray-700" title="Previous Month"><ChevronLeftIcon className="h-6 w-6 text-slate-700 dark:text-gray-300" /></button>
                <h2 className="text-xl font-bold text-slate-700 dark:text-white">
                    {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                </h2>
                <button onClick={handleNextMonth} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-gray-700" title="Next Month"><ChevronRightIcon className="h-6 w-6 text-slate-700 dark:text-gray-300" /></button>
            </div>
            <div className="grid grid-cols-7 border-t border-l dark:border-gray-700">
                {daysOfWeek.map(day => (
                    <div key={day} className="py-2 text-center text-xs font-bold text-slate-500 dark:text-gray-400 border-r border-b dark:border-gray-700 bg-slate-50 dark:bg-gray-800">{day}</div>
                ))}
                {calendarDays}
            </div>
        </div>
    );
};

export default BatchCalendarView;
