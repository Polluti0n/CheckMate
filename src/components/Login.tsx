import React, { useState } from 'react';
import firebase from 'firebase/compat/app';
import { auth } from '../services/firebase';
import * as firestoreService from '../services/firestoreService';
import { CheckMateLogo, ProcessingLoaderIcon } from './icons';

const Login: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [isLogin, setIsLogin] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleAuthAction = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            if (isLogin) {
                await auth.signInWithEmailAndPassword(email, password);
            } else {
                const userCredential = await auth.createUserWithEmailAndPassword(email, password);
                if (userCredential.user) {
                    const displayName = `${firstName} ${lastName}`.trim();
                    await userCredential.user.updateProfile({ displayName });
                    await firestoreService.createUserProfile(userCredential.user.uid, {
                        email,
                        firstName,
                        lastName,
                    });
                }
            }
        } catch (err) {
            const authError = err as firebase.auth.AuthError;
            switch (authError.code) {
                case 'auth/user-not-found':
                case 'auth/invalid-credential': setError('Incorrect email or password.'); break;
                case 'auth/wrong-password': setError('Incorrect password.'); break;
                case 'auth/email-already-in-use': setError('An account already exists with this email.'); break;
                case 'auth/weak-password': setError('Password must be at least 6 characters long.'); break;
                default: setError('An authentication error occurred. Please try again.'); console.error(authError);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
            <div className="max-w-md w-full bg-white shadow-lg rounded-xl p-8 space-y-6 border border-slate-200">
                <div className="flex flex-col items-center">
                    <CheckMateLogo className="h-12 w-12" />
                    <h2 className="mt-4 text-center text-3xl font-bold tracking-tight text-slate-900">
                        {isLogin ? 'Sign in to your account' : 'Create a new account'}
                    </h2>
                </div>
                <form className="space-y-6" onSubmit={handleAuthAction}>
                    {!isLogin && (
                         <div className="flex flex-col sm:flex-row gap-4">
                            <input name="firstName" type="text" required className="relative block w-full appearance-none rounded-md border border-slate-300 px-3 py-2 text-slate-900 placeholder-slate-500 focus:z-10 focus:border-sky-500 focus:outline-none focus:ring-sky-500 sm:text-sm" placeholder="First Name" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                            <input name="lastName" type="text" required className="relative block w-full appearance-none rounded-md border border-slate-300 px-3 py-2 text-slate-900 placeholder-slate-500 focus:z-10 focus:border-sky-500 focus:outline-none focus:ring-sky-500 sm:text-sm" placeholder="Last Name" value={lastName} onChange={(e) => setLastName(e.target.value)} />
                        </div>
                    )}
                    <input id="email-address" name="email" type="email" autoComplete="email" required className="relative block w-full appearance-none rounded-md border border-slate-300 px-3 py-2 text-slate-900 placeholder-slate-500 focus:z-10 focus:border-sky-500 focus:outline-none focus:ring-sky-500 sm:text-sm" placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} />
                    <input id="password" name="password" type="password" autoComplete={isLogin ? "current-password" : "new-password"} required className="relative block w-full appearance-none rounded-md border border-slate-300 px-3 py-2 text-slate-900 placeholder-slate-500 focus:z-10 focus:border-sky-500 focus:outline-none focus:ring-sky-500 sm:text-sm" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
                    
                    {error && <p className="text-sm text-red-600 text-center">{error}</p>}

                    <button type="submit" disabled={loading} className="group relative flex w-full justify-center rounded-md border border-transparent bg-sky-600 py-2 px-4 text-sm font-medium text-white hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 disabled:bg-sky-400">
                        {loading ? <ProcessingLoaderIcon /> : (isLogin ? 'Sign in' : 'Create account')}
                    </button>
                </form>
                <div className="text-sm text-center">
                    <button onClick={() => { setIsLogin(!isLogin); setError(null); }} className="font-medium text-sky-600 hover:text-sky-500">
                        {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Login;