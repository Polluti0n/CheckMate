import React, { useState, useEffect } from 'react';
// FIX: Import firebase for types
import firebase from 'firebase/compat/app';
import { auth, db } from '../services/firebase';
import { getBranches } from '../services/branchService';
import { Branch, UserRole } from '../types';
import { CheckMateLogo, ProcessingLoaderIcon } from './icons';

const Login: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [selectedBranchId, setSelectedBranchId] = useState('');
    const [branches, setBranches] = useState<Branch[]>([]);

    const [isLogin, setIsLogin] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleForgotPassword = async () => {
        if (!email) {
            setSuccessMessage(null);
            setError('Please enter your email address to reset your password.');
            return;
        }
        setError(null);
        setSuccessMessage(null);
        setLoading(true);
        try {
            await auth.sendPasswordResetEmail(email);
            setSuccessMessage('Password reset email sent! Check your inbox.');
        } catch (err) {
            const authError = err as firebase.auth.AuthError;
            setError(authError.message || 'Failed to send password reset email.');
        } finally {
            setLoading(false);
        }
    };

    const handleAuthAction = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccessMessage(null);
        setLoading(true);

        try {
            if (isLogin) {
                // FIX: Use auth service method for signInWithEmailAndPassword
                await auth.signInWithEmailAndPassword(email, password);
            } else {
                if (!firstName.trim() || !lastName.trim() || !selectedBranchId) {
                    setError('Please fill in all required fields.');
                    setLoading(false);
                    return;
                }

                // FIX: Use auth service method for createUserWithEmailAndPassword
                const userCredential = await auth.createUserWithEmailAndPassword(email, password);

                if (userCredential.user) {
                    await userCredential.user.updateProfile({
                        displayName: `${firstName.trim()} ${lastName.trim()}`
                    });

                    // Create default preferences + profile for new Member
                    await db.collection('users').doc(userCredential.user.uid).set({
                        profile: {
                            uid: userCredential.user.uid,
                            email: email,
                            firstName: firstName.trim(),
                            lastName: lastName.trim(),
                            role: UserRole.MEMBER,
                            assignedBranches: [selectedBranchId],
                            assignedRegions: []
                        }
                    }, { merge: true });
                }
            }
        } catch (err) {
            // FIX: Use firebase.auth.AuthError for compatability
            const authError = err as firebase.auth.AuthError;
            switch (authError.code) {
                case 'auth/user-not-found':
                case 'auth/invalid-credential':
                    setError('Incorrect email or password. Please try again.');
                    break;
                case 'auth/wrong-password':
                    setError('Incorrect password. Please try again.');
                    break;
                case 'auth/email-already-in-use':
                    setError('An account already exists with this email address.');
                    break;
                case 'auth/weak-password':
                    setError('The password is too weak. It must be at least 6 characters long.');
                    break;
                default:
                    setError('An authentication error occurred. Please try again.');
                    console.error(authError);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-gray-900 p-4">
            <div className="max-w-md w-full bg-white dark:bg-gray-800 shadow-lg rounded-xl p-8 space-y-6 border border-slate-200 dark:border-gray-700">
                <div className="flex flex-col items-center">
                    <CheckMateLogo className="h-12 w-12" />
                    <h2 className="mt-4 text-center text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                        {isLogin ? 'Sign in to your account' : 'Create a new account'}
                    </h2>
                </div>

                <div className="flex flex-col items-center space-y-2 border-b border-slate-200 dark:border-gray-700 pb-4">
                    <span className="text-xs font-semibold text-slate-500 dark:text-gray-400 uppercase tracking-wider">App Version</span>
                    <div className="flex bg-slate-100 dark:bg-gray-700 p-1 rounded-lg w-full max-w-[200px]">
                        <button
                            type="button"
                            disabled
                            className="flex-1 text-center py-1.5 text-xs font-medium rounded-md transition-all bg-white dark:bg-gray-600 text-sky-600 dark:text-sky-400 shadow-sm font-semibold"
                        >
                            Stable
                        </button>
                        <button
                            type="button"
                            onClick={() => window.location.href = '/latest/'}
                            className="flex-1 text-center py-1.5 text-xs font-medium rounded-md transition-all text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white"
                        >
                            Latest
                        </button>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-gray-400 text-center px-2">
                        <strong>Latest (Corporate):</strong> Active overhaul with multi-role accounts, high-density dashboard, and advanced features.
                    </p>
                </div>

                <form className="space-y-6" onSubmit={handleAuthAction}>
                    <div>
                        <label htmlFor="email-address" className="sr-only">Email address</label>
                        <input
                            id="email-address"
                            name="email"
                            type="email"
                            autoComplete="email"
                            required
                            className="relative block w-full appearance-none rounded-md border border-slate-300 dark:border-gray-600 px-3 py-2 text-slate-900 dark:text-white dark:bg-gray-700 placeholder-slate-500 dark:placeholder-gray-400 focus:z-10 focus:border-sky-500 focus:outline-none focus:ring-sky-500 sm:text-sm"
                            placeholder="Email address"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>

                    {!isLogin && (
                        <>
                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <label htmlFor="first-name" className="sr-only">First name</label>
                                    <input
                                        id="first-name"
                                        name="firstName"
                                        type="text"
                                        required={!isLogin}
                                        className="relative block w-full appearance-none rounded-md border border-slate-300 dark:border-gray-600 px-3 py-2 text-slate-900 dark:text-white dark:bg-gray-700 placeholder-slate-500 dark:placeholder-gray-400 focus:z-10 focus:border-sky-500 focus:outline-none focus:ring-sky-500 sm:text-sm"
                                        placeholder="First name"
                                        value={firstName}
                                        onChange={(e) => setFirstName(e.target.value)}
                                    />
                                </div>
                                <div className="flex-1">
                                    <label htmlFor="last-name" className="sr-only">Last name</label>
                                    <input
                                        id="last-name"
                                        name="lastName"
                                        type="text"
                                        required={!isLogin}
                                        className="relative block w-full appearance-none rounded-md border border-slate-300 dark:border-gray-600 px-3 py-2 text-slate-900 dark:text-white dark:bg-gray-700 placeholder-slate-500 dark:placeholder-gray-400 focus:z-10 focus:border-sky-500 focus:outline-none focus:ring-sky-500 sm:text-sm"
                                        placeholder="Last name"
                                        value={lastName}
                                        onChange={(e) => setLastName(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div>
                                <label htmlFor="branch" className="sr-only">Select Branch</label>
                                <select
                                    id="branch"
                                    name="branch"
                                    required={!isLogin}
                                    className="relative block w-full appearance-none rounded-md border border-slate-300 dark:border-gray-600 px-3 py-2 text-slate-900 dark:text-white dark:bg-gray-700 focus:z-10 focus:border-sky-500 focus:outline-none focus:ring-sky-500 sm:text-sm"
                                    value={selectedBranchId}
                                    onChange={(e) => setSelectedBranchId(e.target.value)}
                                >
                                    <option value="" disabled>Select your branch</option>
                                    {branches.map(b => (
                                        <option key={b.id} value={b.id}>{b.name} ({b.designation})</option>
                                    ))}
                                </select>
                            </div>
                        </>
                    )}

                    <div>
                        <label htmlFor="password" className="sr-only">Password</label>
                        <input
                            id="password"
                            name="password"
                            type="password"
                            autoComplete={isLogin ? "current-password" : "new-password"}
                            required
                            className="relative block w-full appearance-none rounded-md border border-slate-300 dark:border-gray-600 px-3 py-2 text-slate-900 dark:text-white dark:bg-gray-700 placeholder-slate-500 dark:placeholder-gray-400 focus:z-10 focus:border-sky-500 focus:outline-none focus:ring-sky-500 sm:text-sm"
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                        {isLogin && (
                            <div className="flex justify-end mt-1.5">
                                <button
                                    type="button"
                                    onClick={handleForgotPassword}
                                    className="text-xs font-medium text-sky-600 hover:text-sky-500 dark:text-sky-400 dark:hover:text-sky-300"
                                >
                                    Forgot password?
                                </button>
                            </div>
                        )}
                    </div>

                    {error && <p className="text-sm text-red-600 dark:text-red-400 text-center">{error}</p>}
                    {successMessage && <p className="text-sm text-emerald-600 dark:text-emerald-400 text-center">{successMessage}</p>}

                    <div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="group relative flex w-full justify-center rounded-md border border-transparent bg-sky-600 py-2 px-4 text-sm font-medium text-white hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 disabled:bg-sky-400 dark:disabled:bg-sky-900 disabled:cursor-not-allowed"
                        >
                            {loading ? <ProcessingLoaderIcon /> : (isLogin ? 'Sign in' : 'Create account')}
                        </button>
                    </div>
                </form>
                <div className="text-sm text-center">
                    <button
                        onClick={() => {
                            setIsLogin(!isLogin);
                            setError(null);
                            setSuccessMessage(null);
                        }}
                        className="font-medium text-sky-600 hover:text-sky-500 dark:text-sky-400 dark:hover:text-sky-300"
                    >
                        {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Login;