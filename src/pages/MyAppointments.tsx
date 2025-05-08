import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { db } from '../backend/config/firebase';
import { collection, query, where, getDocs, doc, deleteDoc, orderBy } from 'firebase/firestore';
import { cn } from '@/lib/utils';

interface Appointment {
  id: string;
  doctorId: string;
  doctorName: string;
  specialization: string;
  date: string;
  time: string;
  reason: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  symptoms?: string;
  notes?: string;
  createdAt: any;
}

const MyAppointments = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/auth?mode=login');
      return;
    }

    const fetchAppointments = async () => {
      try {
        const appointmentsRef = collection(db, 'appointments');
        const q = query(
          appointmentsRef,
          where('patientId', '==', user.uid),
          orderBy('createdAt', 'desc')
        );
        
        const snapshot = await getDocs(q);
        const appointmentsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Appointment));
        
        setAppointments(appointmentsData);
      } catch (error) {
        console.error('Error fetching appointments:', error);
        toast({
          title: "Error",
          description: "Failed to load appointments",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchAppointments();
  }, [user, navigate, toast]);

  const handleCancelAppointment = async (appointmentId: string) => {
    if (!confirm('Are you sure you want to cancel this appointment?')) return;

    try {
      await deleteDoc(doc(db, 'appointments', appointmentId));
      setAppointments(prev => prev.filter(apt => apt.id !== appointmentId));
      
      toast({
        title: "Success",
        description: "Appointment cancelled successfully",
      });
    } catch (error) {
      console.error('Error cancelling appointment:', error);
      toast({
        title: "Error",
        description: "Failed to cancel appointment",
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

  return (
    <div className="min-h-screen bg-gray-50 pt-20">
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">My Appointments</h1>

          {appointments.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm p-6 text-center">
              <p className="text-gray-600">You don't have any appointments yet.</p>
              <button
                onClick={() => navigate('/doctors')}
                className="mt-4 text-sociodent-600 hover:text-sociodent-700 font-medium"
              >
                Book an Appointment
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {appointments.map((appointment) => (
                <div
                  key={appointment.id}
                  className="bg-white rounded-xl shadow-sm p-6"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        Dr. {appointment.doctorName}
                      </h3>
                      <p className="text-sm text-gray-500">{appointment.specialization}</p>
                    </div>
                    <span className={cn(
                      "px-3 py-1 rounded-full text-sm",
                      appointment.status === 'confirmed' ? "bg-green-100 text-green-800" :
                      appointment.status === 'completed' ? "bg-blue-100 text-blue-800" :
                      appointment.status === 'cancelled' ? "bg-red-100 text-red-800" :
                      "bg-yellow-100 text-yellow-800"
                    )}>
                      {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Date & Time</p>
                      <p className="text-sm text-gray-900">
                        {new Date(appointment.date).toLocaleDateString()} at {appointment.time}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Reason for Visit</p>
                      <p className="text-sm text-gray-900">{appointment.reason}</p>
                    </div>
                    {appointment.symptoms && (
                      <div className="md:col-span-2">
                        <p className="text-sm font-medium text-gray-500">Symptoms</p>
                        <p className="text-sm text-gray-900">{appointment.symptoms}</p>
                      </div>
                    )}
                    {appointment.notes && (
                      <div className="md:col-span-2">
                        <p className="text-sm font-medium text-gray-500">Additional Notes</p>
                        <p className="text-sm text-gray-900">{appointment.notes}</p>
                      </div>
                    )}
                  </div>

                  {appointment.status === 'pending' && (
                    <div className="mt-4 flex justify-end">
                      <button
                        onClick={() => handleCancelAppointment(appointment.id)}
                        className="text-red-600 hover:text-red-700 text-sm font-medium"
                      >
                        Cancel Appointment
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default MyAppointments;