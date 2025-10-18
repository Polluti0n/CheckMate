import { useState, useEffect, useMemo } from 'react';
// FIX: Use compat version of User type
import firebase from 'firebase/compat/app';
import * as firestoreService from '../services/firestoreService';
// FIX: Added CurrentUser to imports for system user object.
import { Check, Flag, Batch, CheckCategory, CheckStatus, CurrentUser } from '../types';

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
            // FIX: Create a system user object to pass to the update function.
            const systemUser: CurrentUser = { name: 'System', uid: 'system-auto-archive', email: null };
            checks.forEach(check => {
                if (check.status === CheckStatus.COMPLETE && check.statusUpdatedAt && new Date(check.statusUpdatedAt) < tenDaysAgo) {
                    // FIX: Pass all 4 required arguments to updateCheck, including the system user and a complete log object with a UID.
                    firestoreService.updateCheck(check.id, { status: CheckStatus.ARCHIVED }, {
                        user: 'System',
                        uid: 'system-auto-archive',
                        field: 'status',
                        oldValue: CheckStatus.COMPLETE,
                        newValue: CheckStatus.ARCHIVED,
                    }, systemUser);
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
                check.memo.toLowerCase().includes(searchLower) ||
                check.payee.toLowerCase().includes(searchLower) ||
                check.amount.toString().includes(searchLower) ||
                check.date.toLowerCase().includes(searchLower) ||
                check.associationName?.toLowerCase().includes(searchLower) ||
                check.bankAccountNumber?.toLowerCase().includes(searchLower) ||
                check.clientAccountNumber?.toLowerCase().includes(searchLower) ||
                check.chargeType?.toLowerCase().includes(searchLower) ||
                check.department?.toLowerCase().includes(searchLower) ||
                check.glCode?.toLowerCase().includes(searchLower) ||
                check.trackingNumber?.toLowerCase().includes(searchLower) ||
                check.batchId?.toLowerCase().includes(searchLower) ||
                check.createdAt.toLowerCase().includes(searchLower) ||
                check.comments.some(comment => comment.text.toLowerCase().includes(searchLower)) ||
                check.status.toLowerCase().includes(searchLower) ||
                check.flags.some(flagId => {
                    const flag = flags.find(f => f.id === flagId);
                    return flag?.name.toLowerCase().includes(searchLower);
                });
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