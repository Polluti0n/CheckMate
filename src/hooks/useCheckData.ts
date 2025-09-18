import { useState, useEffect, useMemo } from 'react';
// FIX: Use compat version of User type
import firebase from 'firebase/compat/app';
import * as firestoreService from '../services/firestoreService';
import { Check, Flag, Batch, CheckCategory, CheckStatus } from '../types';

export const useCheckData = (user: firebase.User | null) => {
    const [checks, setChecks] = useState<Check[]>([]);
    const [flags, setFlags] = useState<Flag[]>([]);
    const [batches, setBatches] = useState<Batch[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeCategoryFilter, setActiveCategoryFilter] = useState<CheckCategory | null>(null);

    // Set up Firestore listeners when user is logged in
    useEffect(() => {
        if (user) {
            const unsubscribeChecks = firestoreService.onChecksSnapshot(setChecks);
            const unsubscribeFlags = firestoreService.onFlagsSnapshot(setFlags);
            const unsubscribeBatches = firestoreService.onBatchesSnapshot(setBatches);
            return () => {
                unsubscribeChecks();
                unsubscribeFlags();
                unsubscribeBatches();
            };
        }
    }, [user]);

    // Auto-archive logic
    useEffect(() => {
        if (checks.length > 0) {
            const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
            checks.forEach(check => {
                if (check.status === CheckStatus.COMPLETE && check.statusUpdatedAt && new Date(check.statusUpdatedAt) < tenDaysAgo) {
                    firestoreService.updateCheck(check.id, { status: CheckStatus.ARCHIVED }, {
                        user: 'System', field: 'status', oldValue: CheckStatus.COMPLETE, newValue: CheckStatus.ARCHIVED
                    });
                }
            });
        }
    }, [checks]); // Depends on the full checks array

    const filteredChecks = useMemo(() => {
        return checks.filter(check => {
            const searchLower = searchTerm.toLowerCase();
            const matchesSearch = searchLower === '' ||
                check.payor.toLowerCase().includes(searchLower) ||
                check.checkNumber.toLowerCase().includes(searchLower) ||
                check.memo.toLowerCase().includes(searchLower);
            const matchesCategory = !activeCategoryFilter || check.category === activeCategoryFilter;
            return matchesSearch && matchesCategory;
        });
    }, [checks, searchTerm, activeCategoryFilter]);

    return {
        checks,
        flags,
        batches,
        filteredChecks,
        searchTerm,
        setSearchTerm,
        activeCategoryFilter,
        setActiveCategoryFilter
    };
};