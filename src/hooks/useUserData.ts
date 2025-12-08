import { useState, useCallback, useEffect } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { User, UserPreferences } from '../types';
import { DEFAULT_PREFERENCES } from '../constants';
import * as firestoreService from '../services/firestoreService';
import { useAuth } from './useAuth';
import merge from 'lodash.merge';
import isEqual from 'lodash.isequal';

// This hook is now the single source of truth for user preferences, combining
// UI settings from localStorage with live profile data from Firestore.
export const useUserData = (): [UserPreferences | null, (newPrefs: Partial<UserPreferences>) => void, () => void] => {
    const { user: firebaseUser } = useAuth(); // Get user from the new AuthContext
    const [userData, setUserData] = useState<UserPreferences | null>(null);

    // This effect loads preferences from localStorage and then subscribes to live
    // profile updates from Firestore, merging them into the state.
    useEffect(() => {
        if (!firebaseUser) {
            console.debug('[useUserData] no firebase user - clearing data.');
            setUserData(null); // Clear data on logout
            return;
        }

        const { uid } = firebaseUser;
        const PREFERENCES_KEY = `checkmate-user-preferences-${uid}`;
        let unsubscribeFromProfile: (() => void) | undefined;

        const initializeUserData = async (auth_user: FirebaseUser) => {
            try {
                // This is now the safe place to ensure a profile exists.
                const profile = await firestoreService.getOrCreateUserProfile(auth_user);

                // Load UI preferences from localStorage first for a fast UI response.
                const storedUiPrefs = window.localStorage.getItem(PREFERENCES_KEY);
                const localUiPrefs = storedUiPrefs ? JSON.parse(storedUiPrefs) : {};

                // Set initial state with a deep merge
                setUserData(merge({}, profile, localUiPrefs));

                // Now, subscribe to live Firestore updates for the user's profile.
                unsubscribeFromProfile = await firestoreService.onUserProfileSnapshot(uid, (profileData) => {
                    if (profileData) {
                        
                        // Deep merge Firestore data with defaults to ensure all keys are present.
                        const mergedPrefs = merge({}, DEFAULT_PREFERENCES, profileData);

                        // If the merge resulted in changes, update Firestore.
                        // This ensures that legacy user objects are updated with new preference fields.
                        if (!isEqual(mergedPrefs, profileData)) {
                            firestoreService.updateUserProfile(uid, mergedPrefs);
                        }

                        // Update the local state with the complete, merged preferences.
                        setUserData(mergedPrefs);
                    } else {
                        // If no profile exists, something is wrong, but we can still provide defaults.
                        setUserData(DEFAULT_PREFERENCES);
                    }
                });

            } catch (error) {
                console.error('Error initializing user data:', error);
            }
        };

        initializeUserData(firebaseUser);

        // Cleanup listener on UID change or component unmount.
        return () => {
            if (unsubscribeFromProfile) {
                unsubscribeFromProfile();
            }
        };
    }, [firebaseUser]);

    const saveUserData = useCallback(async (newPrefs: Partial<UserPreferences>) => {
        if (!firebaseUser || !userData) return;
        
        const { uid } = firebaseUser;
        const PREFERENCES_KEY = `checkmate-user-preferences-${uid}`;

        try {
            // lodash.merge doesn't handle removals, so we do a shallow merge on the top level,
            // but need to be careful with nested objects.
            const updatedUser = merge({}, userData, newPrefs);

            // If cardLayout is explicitly passed in newPrefs, it should be a full replacement.
            if (newPrefs.hasOwnProperty('cardLayout')) {
                updatedUser.cardLayout = newPrefs.cardLayout;
            }


            // Update the React state immediately for a responsive UI
            setUserData(updatedUser);
            
            // Persist only the UI-related settings to localStorage.
            const { profile, ...uiPrefs } = updatedUser;
            window.localStorage.setItem(PREFERENCES_KEY, JSON.stringify(uiPrefs));

            // Save the entire updated user object to Firestore.
            await firestoreService.updateUserProfile(uid, updatedUser);
        } catch (error) {
            console.error('Error saving preferences', error);
        }
    }, [firebaseUser, userData]);
    
    // Explicitly reset preferences to default, used for logout.
    const clearUserData = useCallback(() => {
        if (firebaseUser) {
            const PREFERENCES_KEY = `checkmate-user-preferences-${firebaseUser.uid}`;
            window.localStorage.removeItem(PREFERENCES_KEY);
        }
        setUserData(DEFAULT_PREFERENCES);
    }, [firebaseUser]);

    return [userData, saveUserData, clearUserData];
};