import { useState, useEffect } from 'react';
// FIX: Use compat version of User type
import firebase from 'firebase/compat/app';
import { auth } from '../services/firebase';

export function useAuth() {
    // FIX: Use firebase.User for compatability
    const [user, setUser] = useState<firebase.User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // FIX: Use auth service method for onAuthStateChanged
        const unsubscribe = auth.onAuthStateChanged((user) => {
            setUser(user);
            setLoading(false);
        });

        // Cleanup subscription on unmount
        return () => unsubscribe();
    }, []);

    return { user, loading };
}
