import { useState, useCallback } from 'react';
import { UserPreferences } from '../types';
import { DEFAULT_PREFERENCES } from '../constants';

const PREFERENCES_KEY = 'checkmate-user-preferences';

export const usePreferences = (): [UserPreferences, (newPrefs: UserPreferences) => void] => {
    const [preferences, setPreferences] = useState<UserPreferences>(() => {
        try {
            const storedPrefs = window.localStorage.getItem(PREFERENCES_KEY);
            if (storedPrefs) {
                // Merge stored preferences with defaults to handle new preference keys gracefully
                const parsedPrefs = JSON.parse(storedPrefs);
                return { 
                    ...DEFAULT_PREFERENCES, 
                    ...parsedPrefs,
                    columnDisplayOptions: {
                        ...DEFAULT_PREFERENCES.columnDisplayOptions,
                        ...(parsedPrefs.columnDisplayOptions || {}),
                    },
                     columnThemes: {
                        ...DEFAULT_PREFERENCES.columnThemes,
                        ...(parsedPrefs.columnThemes || {}),
                    },
                    cardLayout: {
                        ...DEFAULT_PREFERENCES.cardLayout,
                        ...(parsedPrefs.cardLayout || {}),
                    },
                    archiveColumnWidths: {
                        ...DEFAULT_PREFERENCES.archiveColumnWidths,
                        ...(parsedPrefs.archiveColumnWidths || {}),
                    }
                };
            }
        } catch (error) {
            console.error('Error reading preferences from localStorage', error);
        }
        return DEFAULT_PREFERENCES;
    });

    const savePreferences = useCallback((newPrefs: UserPreferences) => {
        try {
            setPreferences(newPrefs);
            window.localStorage.setItem(PREFERENCES_KEY, JSON.stringify(newPrefs));
        } catch (error) {
            console.error('Error saving preferences to localStorage', error);
        }
    }, []);

    return [preferences, savePreferences];
};
