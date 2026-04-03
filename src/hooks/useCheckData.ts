import { useState, useEffect, useMemo, useRef } from 'react';
// FIX: Use compat version of User type
import firebase from 'firebase/compat/app';
import * as firestoreService from '../services/firestoreService';
// FIX: Added CurrentUser to imports for system user object.
import { Check, Flag, Batch, CheckCategory, CheckStatus, UserProfile } from '../types';

export const useCheckData = (user: firebase.User | null, currentUser: UserProfile | null) => {
    const [checks, setChecks] = useState<Check[]>([]);
    const [flags, setFlags] = useState<Flag[]>([]);
    const [batches, setBatches] = useState<Batch[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeCategoryFilter, setActiveCategoryFilter] = useState<CheckCategory | null>(null);
    const hasArchived = useRef(false); // Ref to prevent re-running the archive logic

    // Set up Firestore listeners when user is logged in
    useEffect(() => {
        if (user && currentUser) {
            const unsubscribeChecks = firestoreService.onChecksSnapshot(currentUser, setChecks);
            const unsubscribeFlags = firestoreService.onFlagsSnapshot(setFlags);
            const unsubscribeBatches = firestoreService.onBatchesSnapshot(setBatches);
            return () => {
                unsubscribeChecks();
                unsubscribeFlags();
                unsubscribeBatches();
            };
        } else {
            // Reset when user logs out
            hasArchived.current = false;
        }
    }, [user, currentUser]);

    // Auto-archive logic
    useEffect(() => {
        if (user && currentUser && checks.length > 0 && !hasArchived.current) {
            const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
            
            const checksToArchive = checks.filter(check => 
                check.status === CheckStatus.COMPLETE && 
                check.statusUpdatedAt && 
                new Date(check.statusUpdatedAt) < tenDaysAgo
            );

            if (checksToArchive.length > 0) {
                firestoreService.bulkUpdateChecksStatus(checksToArchive, CheckStatus.ARCHIVED, currentUser);
            }

            hasArchived.current = true; // Mark as run
        }
    // This now depends on `checks`. The `useRef` flag prevents it from re-running
    // and causing an infinite loop. It will run once when checks are loaded.
    }, [user, currentUser, checks]);

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
    }, [checks, searchTerm, activeCategoryFilter, flags]);

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