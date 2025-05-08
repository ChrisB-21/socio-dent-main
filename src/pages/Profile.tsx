// src/pages/Profile.tsx

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { UserCircle, LogOut, Camera } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { db, storage } from "../backend/config/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

interface UserProfile {
  name: string;
  email: string;
  phone?: string;
  role: string;
  profileImage?: string;
  address?: string;
  createdAt: string;
}

const Profile: React.FC = () => {
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!user) {
      navigate('/auth?mode=login');
      return;
    }

    const fetchProfile = async () => {
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          setProfile(userDoc.data() as UserProfile);
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
        toast({
          title: "Error",
          description: "Failed to load profile data",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user, navigate, toast]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/auth?mode=login');
    } catch (error) {
      console.error('Logout error:', error);
      toast({
        title: "Error",
        description: "Failed to log out",
        variant: "destructive"
      });
    }
  };

  const handleProfileUpdate = async (updates: Partial<UserProfile>) => {
    if (!user || !profile) return;

    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, updates);
      setProfile(prev => prev ? { ...prev, ...updates } : null);
      
      toast({
        title: "Success",
        description: "Profile updated successfully"
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive"
      });
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || !event.target.files[0] || !user) return;

    try {
      const file = event.target.files[0];
      const storageRef = ref(storage, `profile-images/${user.uid}`);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);
      
      await handleProfileUpdate({ profileImage: downloadURL });
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        title: "Error",
        description: "Failed to upload profile image",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-sociodent-600"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Profile Not Found</h1>
          <p className="text-gray-600">Please try logging in again.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-20">
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            {/* Profile Header */}
            <div className="relative h-32 bg-gradient-to-r from-sociodent-600 to-sociodent-400">
              <div className="absolute -bottom-12 left-8">
                <div className="relative">
                  <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white bg-white">
                    {profile.profileImage ? (
                      <img
                        src={profile.profileImage}
                        alt={profile.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <UserCircle className="w-full h-full text-gray-400" />
                    )}
                  </div>
                  <label className="absolute bottom-0 right-0 p-1 bg-white rounded-full shadow-md cursor-pointer">
                    <Camera className="w-4 h-4 text-gray-600" />
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={handleImageUpload}
                    />
                  </label>
                </div>
              </div>
            </div>

            {/* Profile Content */}
            <div className="pt-16 pb-8 px-8">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{profile.name}</h1>
                  <p className="text-gray-500">{profile.email}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center text-red-600 hover:text-red-700"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </button>
              </div>

              <div className="space-y-6">
                {isEditing ? (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Full Name
                      </label>
                      <input
                        type="text"
                        value={profile.name}
                        onChange={(e) => handleProfileUpdate({ name: e.target.value })}
                        className="w-full px-3 py-2 border rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        value={profile.phone || ''}
                        onChange={(e) => handleProfileUpdate({ phone: e.target.value })}
                        className="w-full px-3 py-2 border rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Address
                      </label>
                      <textarea
                        value={profile.address || ''}
                        onChange={(e) => handleProfileUpdate({ address: e.target.value })}
                        className="w-full px-3 py-2 border rounded-md"
                        rows={3}
                      />
                    </div>
                    <button
                      onClick={() => setIsEditing(false)}
                      className="bg-sociodent-600 text-white px-4 py-2 rounded-md"
                    >
                      Save Changes
                    </button>
                  </>
                ) : (
                  <>
                    <div>
                      <h2 className="text-lg font-semibold mb-4">Profile Information</h2>
                      <dl className="space-y-4">
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Full Name</dt>
                          <dd className="mt-1 text-sm text-gray-900">{profile.name}</dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Email Address</dt>
                          <dd className="mt-1 text-sm text-gray-900">{profile.email}</dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Phone Number</dt>
                          <dd className="mt-1 text-sm text-gray-900">
                            {profile.phone || 'Not provided'}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Address</dt>
                          <dd className="mt-1 text-sm text-gray-900">
                            {profile.address || 'Not provided'}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Member Since</dt>
                          <dd className="mt-1 text-sm text-gray-900">{profile.createdAt}</dd>
                        </div>
                      </dl>
                      <button
                        onClick={() => setIsEditing(true)}
                        className="mt-6 text-sociodent-600 hover:text-sociodent-700 font-medium"
                      >
                        Edit Profile
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Profile;
