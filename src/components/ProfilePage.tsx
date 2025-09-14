import React, { useState, useRef, ChangeEvent } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { UserProfile } from '../types';
import * as firestoreService from '../services/firestoreService';
import { ArrowUturnLeftIcon, UserCircleIcon, PhotoIcon, ProcessingLoaderIcon, Cog6ToothIcon } from './icons';

interface ProfilePageProps {
    userProfile: UserProfile;
    onUpdateProfile: (uid: string, updates: Partial<UserProfile>) => Promise<void>;
}

const ProfilePage: React.FC<ProfilePageProps> = ({ userProfile, onUpdateProfile }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const [formData, setFormData] = useState({
        firstName: userProfile.firstName || '',
        lastName: userProfile.lastName || '',
        phone: userProfile.phone || '',
    });
    const [photoURL, setPhotoURL] = useState(userProfile.photoURL);
    const [isSaving, setIsSaving] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const newPhotoURL = await firestoreService.uploadCheckImage(file, `profile-pictures/${userProfile.uid}`);
            await onUpdateProfile(userProfile.uid, { photoURL: newPhotoURL });
            setPhotoURL(newPhotoURL);
        } catch (error) {
            console.error("Error uploading profile picture:", error);
        } finally {
            setIsUploading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        setSuccessMessage(null);
        try {
            await onUpdateProfile(userProfile.uid, formData);
            setSuccessMessage("Profile updated successfully!");
            setTimeout(() => setSuccessMessage(null), 3000);
        } catch (error) {
            console.error("Error updating profile:", error);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <main className="container mx-auto p-4 sm:p-6 lg:p-8">
            <div className="bg-white p-6 rounded-xl shadow-md max-w-2xl mx-auto">
                <div className="flex justify-between items-center mb-6 border-b pb-4">
                    <h1 className="text-2xl font-bold text-slate-800">My Profile</h1>
                    <div className="flex items-center gap-2">
                        {/* FIX: Add button to open preferences modal */}
                        <button onClick={() => navigate('/?modal=preferences', { state: { backgroundLocation: location } })} className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-semibold rounded-md shadow-sm">
                            <Cog6ToothIcon className="h-5 w-5" /><span>Preferences</span>
                        </button>
                        <button onClick={() => navigate(-1)} className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-semibold rounded-md shadow-sm">
                            <ArrowUturnLeftIcon className="h-5 w-5" /><span>Back</span>
                        </button>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="flex items-center gap-6">
                        <div className="relative">
                            {photoURL ? (
                                <img src={photoURL} alt="Profile" className="h-24 w-24 rounded-full object-cover ring-4 ring-white shadow-md" />
                            ) : (
                                <UserCircleIcon className="h-24 w-24 text-slate-300" />
                            )}
                            <button type="button" onClick={() => fileInputRef.current?.click()} className="absolute -bottom-1 -right-1 bg-white p-1.5 rounded-full shadow-md border hover:bg-slate-100">
                                {isUploading ? <ProcessingLoaderIcon className="h-5 w-5"/> : <PhotoIcon className="h-5 w-5 text-slate-600" />}
                            </button>
                            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/png, image/jpeg" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-800">{formData.firstName} {formData.lastName}</h2>
                            <p className="text-slate-500">{userProfile.email}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="firstName" className="block text-sm font-medium text-slate-600">First Name</label>
                            <input type="text" name="firstName" id="firstName" value={formData.firstName} onChange={handleChange} className="mt-1 block w-full bg-slate-50 border-slate-300 rounded-md shadow-sm" required />
                        </div>
                         <div>
                            <label htmlFor="lastName" className="block text-sm font-medium text-slate-600">Last Name</label>
                            <input type="text" name="lastName" id="lastName" value={formData.lastName} onChange={handleChange} className="mt-1 block w-full bg-slate-50 border-slate-300 rounded-md shadow-sm" required />
                        </div>
                         <div className="sm:col-span-2">
                            <label htmlFor="phone" className="block text-sm font-medium text-slate-600">Phone Number (Optional)</label>
                            <input type="tel" name="phone" id="phone" value={formData.phone} onChange={handleChange} className="mt-1 block w-full bg-slate-50 border-slate-300 rounded-md shadow-sm" />
                        </div>
                    </div>
                    
                    <div className="flex justify-end items-center gap-4 pt-6 border-t">
                        {successMessage && <p className="text-green-600 text-sm">{successMessage}</p>}
                        <button type="submit" disabled={isSaving} className="px-6 py-2 text-base font-medium text-white bg-sky-600 rounded-md hover:bg-sky-700 disabled:bg-sky-300">
                            {isSaving ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </main>
    );
};

export default ProfilePage;
