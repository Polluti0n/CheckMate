import { useState, useEffect } from 'react';
import { auth } from '../services/firebase';
export function useAuth() {
    // FIX: Use firebase.User for compatability
    const [user, setUser] = useState(null);
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
