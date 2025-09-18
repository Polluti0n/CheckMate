import React from 'react';
import { CheckMateLogo } from './icons';
const SplashScreen = () => {
    return (<div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-700">
            <div className="flex items-center space-x-4">
                <CheckMateLogo className="h-16 w-16"/>
                <h1 className="text-5xl font-bold">CheckMate</h1>
            </div>
            <p className="mt-4 text-lg text-slate-500">Loading your workspace...</p>
        </div>);
};
export default SplashScreen;
