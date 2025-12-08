import { UserPreferences } from '../types';
import { useUserData } from './useUserData';
import { DEFAULT_PREFERENCES } from '../constants';

export const usePreferences = (): [UserPreferences, (newPrefs: Partial<UserPreferences>) => void, () => void] => {
    const [userData, saveUserData, clearUserData] = useUserData();

    // The old usePreferences hook did not return null, so we'll return default preferences
    // to maintain the existing contract and avoid breaking components during the refactor.
    const preferences = userData || DEFAULT_PREFERENCES;

    return [preferences, saveUserData, clearUserData];
};
