import { useState, useCallback, useEffect } from 'react';
import { UserPreferences, UserProfile } from '../types';
import { DEFAULT_PREFERENCES } from '../constants';
import * as firestoreService from '../services/firestoreService';

// This hook is now the single source of truth for user preferences, combining
// UI settings from localStorage with live profile data from Firestore.
export const usePreferences = (uid: string | null): [UserPreferences, (newPrefs: UserPreferences) => void, () => void] => {
    const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES);
    
    // This effect loads preferences from localStorage and then subscribes to live
    // profile updates from Firestore, merging them into the state.
    useEffect(() => {
        if (!uid) {
            setPreferences(DEFAULT_PREFERENCES);
            return;
        }

        const PREFERENCES_KEY = `checkmate-user-preferences-${uid}`;
        let unsubscribeFromProfile: () => void = () => {};

        try {
            // 1. Load initial UI state from localStorage
            const storedPrefs = window.localStorage.getItem(PREFERENCES_KEY);
            const basePrefs = storedPrefs ? JSON.parse(storedPrefs) : {};

            // 2. Deep merge with defaults to ensure all keys exist
            const mergedPrefs = {
                ...DEFAULT_PREFERENCES,
                ...basePrefs,
                profile: { ...DEFAULT_PREFERENCES.profile, ...(basePrefs.profile || {}) },
                notifications: { ...DEFAULT_PREFERENCES.notifications, ...(basePrefs.notifications || {}) },
                columnDisplayOptions: { ...DEFAULT_PREFERENCES.columnDisplayOptions, ...(basePrefs.columnDisplayOptions || {}) },
                columnThemes: { ...DEFAULT_PREFERENCES.columnThemes, ...(basePrefs.columnThemes || {}) },
                cardLayout: { ...DEFAULT_PREFERENCES.cardLayout, ...(basePrefs.cardLayout || {}) },
                archiveColumnWidths: { ...DEFAULT_PREFERENCES.archiveColumnWidths, ...(basePrefs.archiveColumnWidths || {}) },
            };
            setPreferences(mergedPrefs);

            // 3. Listen for live profile updates from Firestore to get the most current data
            unsubscribeFromProfile = firestoreService.onUserProfileSnapshot(uid, (profile) => {
                if (profile) {
                    // Merge live Firestore profile into the current state, ensuring it's always up-to-date.
                    setPreferences(prev => ({
                        ...prev,
                        profile: {
                            ...prev.profile, // Keep any non-persistent local state if needed
                            ...profile,     // Overwrite with fresh data from Firestore
                        },
                    }));
                }
            });

        } catch (error) {
            console.error('Error initializing preferences', error);
            setPreferences(DEFAULT_PREFERENCES);
        }

        // Cleanup listener on UID change or component unmount
        return () => unsubscribeFromProfile();

    }, [uid]);

    const savePreferences = useCallback((newPrefs: UserPreferences) => {
        if (!uid) return;
        const PREFERENCES_KEY = `checkmate-user-preferences-${uid}`;
        try {
            // Update the React state immediately for a responsive UI
            setPreferences(newPrefs);
            
            // Persist only the UI-related settings to localStorage.
            // The 'profile' object is mastered in Firestore and is updated separately.
            const { profile, ...uiPrefs } = newPrefs;
            window.localStorage.setItem(PREFERENCES_KEY, JSON.stringify(uiPrefs));
        } catch (error) {
            console.error('Error saving preferences to localStorage', error);
        }
    }, [uid]);
    
    // Explicitly reset preferences to default, used for logout.
    const clearPreferences = useCallback(() => {
        setPreferences(DEFAULT_PREFERENCES);
    }, []);

    return [preferences, savePreferences, clearPreferences];
};
