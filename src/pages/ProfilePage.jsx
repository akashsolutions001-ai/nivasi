import React, { useState, useEffect } from 'react';
import { User, Phone, Mail, Building, Save, Loader2, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { db } from '../firebase.js';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';

const ProfilePage = () => {
    const { user, isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);

    const [formData, setFormData] = useState({
        displayName: '',
        phone: '',
        college: '',
        email: ''
    });

    useEffect(() => {
        if (!isAuthenticated) {
            navigate('/'); // Redirect if not logged in
            return;
        }

        const fetchUserProfile = async () => {
            if (user?.uid) {
                try {
                    const userDocRef = doc(db, 'users', user.uid);
                    const userDoc = await getDoc(userDocRef);

                    if (userDoc.exists()) {
                        const data = userDoc.data();
                        setFormData({
                            displayName: data.displayName || user.displayName || '',
                            email: user.email || '',
                            phone: data.phone || '',
                            college: data.college || ''
                        });
                    } else {
                        // Initialize with auth data
                        setFormData({
                            displayName: user.displayName || '',
                            email: user.email || '',
                            phone: '',
                            college: ''
                        });
                    }
                } catch (error) {
                    console.error("Error fetching profile:", error);
                } finally {
                    setIsLoading(false);
                }
            }
        };

        fetchUserProfile();
    }, [user, isAuthenticated, navigate]);

    const handleInputChange = (field, value) => {
        if (field === 'phone') {
            // Only allow numbers
            const cleanValue = value.replace(/\D/g, '').slice(0, 10);
            setFormData(prev => ({ ...prev, [field]: cleanValue }));
        } else {
            setFormData(prev => ({ ...prev, [field]: value }));
        }
        setSaveSuccess(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        setSaveSuccess(false);

        try {
            const userDocRef = doc(db, 'users', user.uid);
            await setDoc(userDocRef, {
                displayName: formData.displayName,
                email: formData.email,
                phone: formData.phone,
                college: formData.college,
                updatedAt: new Date().toISOString()
            }, { merge: true });

            setSaveSuccess(true);
        } catch (error) {
            console.error("Error saving profile:", error);
            alert("Failed to save profile.");
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-100 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto">
                <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                    {/* Header Banner */}
                    <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-8 py-10 text-white">
                        <div className="flex items-center gap-4">
                            <div className="bg-white/20 p-3 rounded-full backdrop-blur-sm">
                                <User className="w-8 h-8 text-white" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold">My Profile</h1>
                                <p className="text-orange-100 mt-1">Manage your personal information</p>
                            </div>
                        </div>
                    </div>

                    {/* Form Section */}
                    <div className="p-8">
                        <form onSubmit={handleSubmit} className="space-y-6">

                            {/* Success Message */}
                            {saveSuccess && (
                                <div className="bg-green-50 text-green-700 p-4 rounded-lg flex items-center gap-3 border border-green-200 animate-in fade-in slide-in-from-top-2">
                                    <CheckCircle className="w-5 h-5" />
                                    <span>Profile updated successfully!</span>
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Full Name */}
                                <div className="space-y-2">
                                    <Label htmlFor="displayName" className="text-gray-700">Full Name</Label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                                        <Input
                                            id="displayName"
                                            value={formData.displayName}
                                            onChange={(e) => handleInputChange('displayName', e.target.value)}
                                            className="pl-10 border-gray-200 focus:border-orange-500 focus:ring-orange-500"
                                            placeholder="Enter your full name"
                                        />
                                    </div>
                                </div>

                                {/* Email (Read-only) */}
                                <div className="space-y-2">
                                    <Label htmlFor="email" className="text-gray-700">Email Address</Label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                                        <Input
                                            id="email"
                                            value={formData.email}
                                            readOnly
                                            className="pl-10 bg-gray-50 text-gray-500 border-gray-200 cursor-not-allowed"
                                        />
                                    </div>
                                    <p className="text-xs text-gray-500">Email cannot be changed.</p>
                                </div>

                                {/* Phone Number */}
                                <div className="space-y-2">
                                    <Label htmlFor="phone" className="text-gray-700">Phone Number</Label>
                                    <div className="relative">
                                        <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                                        <Input
                                            id="phone"
                                            value={formData.phone}
                                            onChange={(e) => handleInputChange('phone', e.target.value)}
                                            className="pl-10 border-gray-200 focus:border-orange-500 focus:ring-orange-500"
                                            placeholder="Enter 10-digit number"
                                            type="tel"
                                            maxLength={10}
                                        />
                                    </div>
                                </div>

                                {/* College Name */}
                                <div className="space-y-2">
                                    <Label htmlFor="college" className="text-gray-700">Your College / University</Label>
                                    <div className="relative">
                                        <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                                        <Input
                                            id="college"
                                            value={formData.college}
                                            onChange={(e) => handleInputChange('college', e.target.value)}
                                            className="pl-10 border-gray-200 focus:border-orange-500 focus:ring-orange-500"
                                            placeholder="Enter your college name"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="pt-6 border-t border-gray-100 flex justify-end">
                                <Button
                                    type="submit"
                                    className="bg-orange-600 hover:bg-orange-700 text-white min-w-[150px]"
                                    disabled={isSaving}
                                >
                                    {isSaving ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="w-4 h-4 mr-2" />
                                            Save Changes
                                        </>
                                    )}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProfilePage;
