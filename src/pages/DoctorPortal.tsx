import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Users, MessageSquare, FileText, Settings, ClipboardList } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { db } from '../backend/config/firebase';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';

interface Appointment {
  id: string;
  patientName: string;
  patientEmail: string;
  date: string;
  time: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  notes?: string;
}

interface DoctorProfile {
  id: string;
  name: string;
  email: string;
  specialization: string;
  experience: string;
  bio: string;
  status: string;
  documents: {
    license?: string;
    certificate?: string;
    id?: string;
  };
}

const DoctorPortal = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('appointments');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [profile, setProfile] = useState<DoctorProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/auth?mode=login');
      toast({
        title: "Authentication Required",
        description: "Please log in as a doctor to access this page",
        variant: "destructive"
      });
      return;
    }

    const fetchData = async () => {
      try {
        // Fetch doctor profile
        const doctorsRef = collection(db, 'doctors');
        const q = query(doctorsRef, where('email', '==', user.email));
        const doctorSnapshot = await getDocs(q);
        
        if (!doctorSnapshot.empty) {
          const doctorData = {
            id: doctorSnapshot.docs[0].id,
            ...doctorSnapshot.docs[0].data()
          } as DoctorProfile;
          setProfile(doctorData);

          // Fetch appointments for this doctor
          const appointmentsRef = collection(db, 'appointments');
          const appointmentsQuery = query(appointmentsRef, where('doctorId', '==', doctorData.id));
          const appointmentsSnapshot = await getDocs(appointmentsQuery);
          
          const appointmentsData = appointmentsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          } as Appointment));
          setAppointments(appointmentsData);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        toast({
          title: "Error",
          description: "Failed to load doctor data",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, navigate, toast]);

  const handleAppointmentStatus = async (appointmentId: string, status: Appointment['status']) => {
    try {
      const appointmentRef = doc(db, 'appointments', appointmentId);
      await updateDoc(appointmentRef, { status });
      
      setAppointments(prev => prev.map(apt => 
        apt.id === appointmentId ? { ...apt, status } : apt
      ));

      toast({
        title: "Success",
        description: `Appointment ${status} successfully`,
      });
    } catch (error) {
      console.error('Error updating appointment:', error);
      toast({
        title: "Error",
        description: "Failed to update appointment status",
        variant: "destructive"
      });
    }
  };

  const updateProfile = async (updates: Partial<DoctorProfile>) => {
    if (!profile) return;

    try {
      const doctorRef = doc(db, 'doctors', profile.id);
      await updateDoc(doctorRef, updates);
      setProfile(prev => prev ? { ...prev, ...updates } : null);
      
      toast({
        title: "Success",
        description: "Profile updated successfully",
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
          <p className="text-gray-600">Please contact support if you think this is an error.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        {/* Sidebar */}
        <div className="w-64 bg-white shadow-sm min-h-screen p-4">
          <div className="space-y-4">
            {[
              { id: 'appointments', name: 'Appointments', icon: <Calendar className="w-5 h-5 mr-2" /> },
              { id: 'patients', name: 'Patients', icon: <Users className="w-5 h-5 mr-2" /> },
              { id: 'messages', name: 'Messages', icon: <MessageSquare className="w-5 h-5 mr-2" /> },
              { id: 'documents', name: 'Documents', icon: <FileText className="w-5 h-5 mr-2" /> },
              { id: 'settings', name: 'Settings', icon: <Settings className="w-5 h-5 mr-2" /> },
            ].map((tab) => (
              <button
                key={tab.id}
                className={cn(
                  "flex items-center w-full px-4 py-2 rounded-lg text-left",
                  activeTab === tab.id
                    ? "bg-sociodent-50 text-sociodent-700"
                    : "text-gray-600 hover:bg-gray-50"
                )}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.icon}
                {tab.name}
              </button>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-8">
          {activeTab === 'appointments' && (
            <div>
              <h1 className="text-2xl font-bold mb-6">Appointments</h1>
              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="px-4 py-3 text-left font-medium text-gray-700">Patient</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-700">Date</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-700">Time</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-700">Status</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-700">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {appointments.map((appointment) => (
                        <tr key={appointment.id}>
                          <td className="px-4 py-3">
                            <div>
                              <div className="font-medium">{appointment.patientName}</div>
                              <div className="text-sm text-gray-500">{appointment.patientEmail}</div>
                            </div>
                          </td>
                          <td className="px-4 py-3">{appointment.date}</td>
                          <td className="px-4 py-3">{appointment.time}</td>
                          <td className="px-4 py-3">
                            <span className={cn(
                              "px-2 py-1 rounded-full text-xs",
                              appointment.status === 'confirmed' ? "bg-green-100 text-green-800" :
                              appointment.status === 'completed' ? "bg-blue-100 text-blue-800" :
                              appointment.status === 'cancelled' ? "bg-red-100 text-red-800" :
                              "bg-yellow-100 text-yellow-800"
                            )}>
                              {appointment.status}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {appointment.status === 'pending' && (
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => handleAppointmentStatus(appointment.id, 'confirmed')}
                                  className="text-green-600 hover:text-green-800"
                                >
                                  Confirm
                                </button>
                                <button
                                  onClick={() => handleAppointmentStatus(appointment.id, 'cancelled')}
                                  className="text-red-600 hover:text-red-800"
                                >
                                  Cancel
                                </button>
                              </div>
                            )}
                            {appointment.status === 'confirmed' && (
                              <button
                                onClick={() => handleAppointmentStatus(appointment.id, 'completed')}
                                className="text-blue-600 hover:text-blue-800"
                              >
                                Mark Complete
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div>
              <h1 className="text-2xl font-bold mb-6">Profile Settings</h1>
              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={profile.name}
                      onChange={(e) => updateProfile({ name: e.target.value })}
                      className="w-full px-3 py-2 border rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Specialization
                    </label>
                    <input
                      type="text"
                      value={profile.specialization}
                      onChange={(e) => updateProfile({ specialization: e.target.value })}
                      className="w-full px-3 py-2 border rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Experience
                    </label>
                    <input
                      type="text"
                      value={profile.experience}
                      onChange={(e) => updateProfile({ experience: e.target.value })}
                      className="w-full px-3 py-2 border rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Bio
                    </label>
                    <textarea
                      value={profile.bio}
                      onChange={(e) => updateProfile({ bio: e.target.value })}
                      className="w-full px-3 py-2 border rounded-md"
                      rows={4}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Additional tabs (patients, messages, documents) can be added here */}
        </div>
      </div>
    </div>
  );
};

export default DoctorPortal;
