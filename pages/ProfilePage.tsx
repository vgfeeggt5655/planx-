import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { updateUser } from '../services/authService';
import Spinner from '../components/Spinner';

const AVATARS = [
    'https://png.pngtree.com/png-vector/20250423/ourmid/pngtree-3d-cartoon-doctor-character-young-male-round-glasses-png-image_16046563.png',
    'https://png.pngtree.com/png-vector/20250210/ourmid/pngtree-male-doctor-showing-a-thumbs-up-sign-symbolizing-approval-in-3d-png-image_15433614.png',
    'https://png.pngtree.com/png-vector/20250409/ourmid/pngtree-3d-male-doctor-character-png-image_15952878.png',
    'https://t4.ftcdn.net/jpg/06/14/96/05/360_F_614960515_mQsF7nS1r3qZ9eCHzqJ5cyCxmjsfJOCQ.jpg',
    'https://img.freepik.com/premium-photo/3d-cartoon-character-female-doctor_299560-352.jpg',
    'https://i.pinimg.com/736x/1f/25/f5/1f25f5903952a2dbca09050725ebae35.jpg',
];

const ProfilePage: React.FC = () => {
    const { user, updateCurrentUser } = useAuth();
    
    // Profile State
    const [name, setName] = useState(user?.name || '');
    const [avatar, setAvatar] = useState(user?.avatar || '');
    const [profileLoading, setProfileLoading] = useState(false);
    const [profileError, setProfileError] = useState<string | null>(null);
    const [profileSuccess, setProfileSuccess] = useState<string | null>(null);

    // Password State
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordLoading, setPasswordLoading] = useState(false);
    const [passwordError, setPasswordError] = useState<string | null>(null);
    const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
    
    const getFormattedVersion = (currentName: string): string => {
        let formatted = currentName.trim();
        if (!/^dr\.?\s/i.test(formatted)) {
            return `Dr. ${formatted}`;
        }
        return formatted;
    };

    const handleProfileSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        if (!name.trim()) {
            setProfileError("Name cannot be empty.");
            return;
        }

        const formattedName = getFormattedVersion(name);

        if (formattedName === user.name && avatar === user.avatar) {
            return; // No changes to submit
        }

        setProfileLoading(true);
        setProfileError(null);
        setProfileSuccess(null);
        
        try {
            const updatedUser = { ...user, name: formattedName, avatar };
            await updateUser(updatedUser);
            updateCurrentUser(updatedUser);
            setProfileSuccess("Your profile has been updated successfully!");
        } catch (err) {
            console.error("Failed to update profile:", err);
            setProfileError("Failed to update your profile. Please try again.");
        } finally {
            setProfileLoading(false);
        }
    };
    
    const handlePasswordSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        
        if (newPassword !== confirmPassword) {
            setPasswordError("New passwords do not match.");
            return;
        }
        if (!newPassword) {
            setPasswordError("New password cannot be empty.");
            return;
        }

        setPasswordLoading(true);
        setPasswordError(null);
        setPasswordSuccess(null);

        try {
            const updatedUser = { ...user, password: newPassword };
            await updateUser(updatedUser);
            updateCurrentUser(updatedUser);
            setPasswordSuccess("Password updated successfully!");
            setNewPassword('');
            setConfirmPassword('');
        } catch (err) {
            console.error("Failed to update password:", err);
            setPasswordError("Failed to update your password. Please try again.");
        } finally {
            setPasswordLoading(false);
        }
    };
    
    const inputClass = "mt-1 block w-full px-3 py-2 bg-surface border border-border-color rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm text-text-primary placeholder-text-secondary transition";
    const isProfileUnchanged = user && getFormattedVersion(name) === user.name && avatar === user.avatar;

    if (!user) {
        return <div className="pt-24"><Spinner text="Loading profile..." /></div>;
    }

    return (
        <div className="container mx-auto px-4 py-8 pt-20 sm:pt-24">
            <div className="max-w-4xl mx-auto space-y-8 animate-fade-in-up">
            
                {/* Profile Details Form */}
                <div className="bg-surface border border-border-color px-4 py-6 sm:p-8 rounded-xl shadow-lg">
                    <h1 className="text-3xl font-bold text-text-primary mb-1">My Profile</h1>
                    <p className="text-text-secondary mb-6">View and edit your personal information.</p>

                    <form onSubmit={handleProfileSubmit} className="space-y-6">
                        {profileError && <div className="bg-red-500/20 border-l-4 border-red-400 text-red-300 p-4 rounded-md" role="alert"><p>{profileError}</p></div>}
                        {profileSuccess && <div className="bg-green-500/20 border-l-4 border-green-400 text-green-300 p-4 rounded-md" role="alert"><p>{profileSuccess}</p></div>}

                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-2">Avatar</label>
                            <div className="flex items-center gap-4 flex-wrap">
                                <img src={avatar} alt="Current Avatar" className="w-20 h-20 rounded-full object-cover border-4 border-primary/50" />
                                <div className="flex flex-wrap gap-2">
                                    {AVATARS.map((av, index) => (
                                        <button type="button" key={index} onClick={() => setAvatar(av)} className={`rounded-full transition-all duration-200 ${avatar === av ? 'ring-4 ring-primary' : 'ring-2 ring-transparent hover:ring-primary/50'}`}>
                                            <img src={av} alt={`Avatar ${index + 1}`} className="w-12 h-12 rounded-full object-cover border-2 border-surface" />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div>
                            <label htmlFor="name" className="block text-sm font-medium text-text-secondary">Full Name</label>
                            <input type="text" id="name" value={name} onChange={(e) => setName(e.target.value)} required className={inputClass} />
                        </div>
                        
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-text-secondary">Email Address</label>
                            <input type="email" id="email" value={user.email} disabled className={`${inputClass} bg-slate-700/50 cursor-not-allowed`} />
                        </div>

                        <div>
                            <button 
                                type="submit" 
                                className="w-full sm:w-auto inline-flex justify-center py-2 px-6 border border-transparent rounded-md shadow-sm text-sm font-medium text-background bg-primary hover:bg-cyan-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-surface focus:ring-primary transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100"
                                disabled={profileLoading || isProfileUnchanged}
                            >
                                {profileLoading ? <Spinner text="" /> : 'Save Profile Changes'}
                            </button>
                        </div>
                    </form>
                </div>

                {/* Password Change Form */}
                <div className="bg-surface border border-border-color px-4 py-6 sm:p-8 rounded-xl shadow-lg">
                    <h2 className="text-2xl font-bold text-text-primary mb-1">Change Password</h2>
                     <p className="text-text-secondary mb-6">Update your password for enhanced security.</p>
                     <form onSubmit={handlePasswordSubmit} className="space-y-4">
                        {passwordError && <div className="bg-red-500/20 border-l-4 border-red-400 text-red-300 p-4 rounded-md" role="alert"><p>{passwordError}</p></div>}
                        {passwordSuccess && <div className="bg-green-500/20 border-l-4 border-green-400 text-green-300 p-4 rounded-md" role="alert"><p>{passwordSuccess}</p></div>}

                         <div>
                            <label htmlFor="newPassword" className="block text-sm font-medium text-text-secondary">New Password</label>
                            <input type="password" id="newPassword" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required className={inputClass} />
                        </div>
                         <div>
                            <label htmlFor="confirmPassword" className="block text-sm font-medium text-text-secondary">Confirm New Password</label>
                            <input type="password" id="confirmPassword" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required className={inputClass} />
                        </div>
                         <div>
                            <button 
                                type="submit" 
                                className="w-full sm:w-auto inline-flex justify-center py-2 px-6 border border-transparent rounded-md shadow-sm text-sm font-medium text-background bg-primary hover:bg-cyan-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-surface focus:ring-primary transition-all transform hover:scale-105 disabled:opacity-50"
                                disabled={passwordLoading}
                            >
                                {passwordLoading ? <Spinner text="" /> : 'Change Password'}
                            </button>
                        </div>
                     </form>
                </div>
            </div>
        </div>
    );
};

export default ProfilePage;