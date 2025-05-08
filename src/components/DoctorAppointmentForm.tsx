import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { db } from '../backend/config/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

interface DoctorAppointmentFormProps {
  doctorId: string;
  doctorName: string;
  specialization: string;
}

const DoctorAppointmentForm: React.FC<DoctorAppointmentFormProps> = ({
  doctorId,
  doctorName,
  specialization,
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    date: '',
    time: '',
    reason: '',
    symptoms: '',
    notes: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to book an appointment",
        variant: "destructive"
      });
      navigate('/auth?mode=login');
      return;
    }

    setLoading(true);
    try {
      const appointmentData = {
        doctorId,
        doctorName,
        specialization,
        patientId: user.uid,
        patientName: user.displayName,
        patientEmail: user.email,
        status: 'pending',
        createdAt: serverTimestamp(),
        ...formData
      };

      const appointmentRef = await addDoc(collection(db, 'appointments'), appointmentData);
      
      toast({
        title: "Appointment Booked",
        description: "Your appointment request has been submitted successfully",
      });

      // Reset form
      setFormData({
        date: '',
        time: '',
        reason: '',
        symptoms: '',
        notes: '',
      });

      // Navigate to appointments page
      navigate('/dashboard');
    } catch (error) {
      console.error('Error booking appointment:', error);
      toast({
        title: "Error",
        description: "Failed to book appointment. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Preferred Date
        </label>
        <input
          type="date"
          name="date"
          value={formData.date}
          onChange={handleChange}
          className="w-full px-3 py-2 border rounded-md"
          required
          min={new Date().toISOString().split('T')[0]}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Preferred Time
        </label>
        <input
          type="time"
          name="time"
          value={formData.time}
          onChange={handleChange}
          className="w-full px-3 py-2 border rounded-md"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Reason for Visit
        </label>
        <input
          type="text"
          name="reason"
          value={formData.reason}
          onChange={handleChange}
          className="w-full px-3 py-2 border rounded-md"
          placeholder="E.g., Regular checkup, Tooth pain, etc."
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Symptoms (if any)
        </label>
        <textarea
          name="symptoms"
          value={formData.symptoms}
          onChange={handleChange}
          className="w-full px-3 py-2 border rounded-md"
          rows={3}
          placeholder="Please describe your symptoms"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Additional Notes
        </label>
        <textarea
          name="notes"
          value={formData.notes}
          onChange={handleChange}
          className="w-full px-3 py-2 border rounded-md"
          rows={3}
          placeholder="Any additional information you'd like to share"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-sociodent-600 text-white py-3 rounded-md font-medium hover:bg-sociodent-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Booking Appointment..." : "Book Appointment"}
      </button>
    </form>
  );
};

export default DoctorAppointmentForm;
