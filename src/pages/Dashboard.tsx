import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { db } from '../backend/config/firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import OrdersTab from '@/components/OrdersTab';

interface Order {
  id: string;
  createdAt: any;
  items: Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
  }>;
  payment: {
    method: 'razorpay' | 'cash';
    status: 'pending' | 'completed';
    details?: any;
  };
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  total: number;
  shipping: number;
  subtotal: number;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('appointments');
  const [appointments, setAppointments] = useState<any[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/auth?mode=login');
      toast({
        title: "Authentication Required",
        description: "Please log in to access your dashboard",
        variant: "destructive"
      });
      return;
    }

    const fetchData = async () => {
      try {
        // Fetch appointments
        const appointmentsRef = collection(db, 'appointments');
        const appointmentsQuery = query(
          appointmentsRef,
          where('patientId', '==', user.uid),
          orderBy('createdAt', 'desc')
        );
        const appointmentsSnapshot = await getDocs(appointmentsQuery);
        const appointmentsData = appointmentsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setAppointments(appointmentsData);

        // Fetch orders
        const ordersRef = collection(db, 'orders');
        const ordersQuery = query(
          ordersRef,
          where('userId', '==', user.uid),
          orderBy('createdAt', 'desc')
        );
        const ordersSnapshot = await getDocs(ordersQuery);
        const ordersData = ordersSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Order[];
        setOrders(ordersData);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast({
          title: "Error",
          description: "Failed to load your data",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, navigate, toast]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-sociodent-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="pt-20 pb-16">
        <div className="container-custom">
          {/* Welcome Header */}
          <div className="mb-8">
            <div className="bg-sociodent-600 rounded-2xl p-6 flex justify-between items-center">
              <div className="text-white">
                <h1 className="text-2xl font-bold mb-1">Welcome back, {user?.displayName || 'User'}!</h1>
                <p className="text-sociodent-100">Manage your appointments and orders</p>
              </div>
              <button
                onClick={logout}
                className="bg-white text-sociodent-600 hover:bg-sociodent-50 px-4 py-2 rounded-lg border border-sociodent-200"
              >
                Sign Out
              </button>
            </div>
          </div>

          {/* Dashboard Tabs */}
          <Tabs defaultValue={activeTab} value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6">
              <TabsTrigger value="appointments">Appointments</TabsTrigger>
              <TabsTrigger value="orders">Orders</TabsTrigger>
            </TabsList>

            <TabsContent value="appointments">
              {/* Appointments Tab Content */}
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-xl font-semibold mb-4">Your Appointments</h2>
                {appointments.length > 0 ? (
                  <div className="space-y-4">
                    {appointments.map((appointment) => (
                      <div key={appointment.id} className="p-4 border rounded-lg">
                        <div className="flex justify-between items-center">
                          <div>
                            <h3 className="font-medium">{appointment.doctorName}</h3>
                            <p className="text-sm text-gray-500">{appointment.date} at {appointment.time}</p>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-sm ${
                            appointment.status === 'confirmed' 
                              ? 'bg-green-100 text-green-800'
                              : appointment.status === 'completed'
                              ? 'bg-blue-100 text-blue-800'
                              : appointment.status === 'cancelled'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {appointment.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">No appointments scheduled</p>
                )}
              </div>
            </TabsContent>

            <TabsContent value="orders">
              <OrdersTab orders={orders} />
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
