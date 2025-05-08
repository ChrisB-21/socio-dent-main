import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Users, BadgeHelp, ShoppingBag, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/backend/config/firebase';
import { collection, query, getDocs, doc, updateDoc, deleteDoc, orderBy } from 'firebase/firestore';
import { formatDistance } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface DashboardStat {
  title: string;
  value: string;
  change: string;
  changeType: 'positive' | 'negative';
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  joinDate: string;
}

interface Doctor {
  id: string;
  name: string;
  email: string;
  specialization: string;
  status: 'pending' | 'approved' | 'rejected';
  documents: {
    license?: string;
    certificate?: string;
    id?: string;
  };
}

interface Order {
  id: string;
  createdAt: any;
  userDetails: {
    name: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    zipCode: string;
  };
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

const AdminPortal = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStat[]>([]);

  useEffect(() => {
    if (!user) {
      navigate('/auth?mode=login');
      toast({
        title: "Authentication Required",
        description: "Please log in as admin to access this page",
        variant: "destructive"
      });
      return;
    }

    const fetchData = async () => {
      try {
        // Fetch users
        const usersRef = collection(db, 'users');
        const usersSnapshot = await getDocs(usersRef);
        const usersData = usersSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as User));
        setUsers(usersData);

        // Fetch doctors
        const doctorsRef = collection(db, 'doctors');
        const doctorsSnapshot = await getDocs(doctorsRef);
        const doctorsData = doctorsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Doctor));
        setDoctors(doctorsData);

        // Fetch orders
        const ordersRef = collection(db, 'orders');
        const ordersQuery = query(ordersRef, orderBy('createdAt', 'desc'));
        const ordersSnapshot = await getDocs(ordersQuery);
        const ordersData = ordersSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Order));
        setOrders(ordersData);

        // Calculate stats
        const activeUsers = usersData.length;
        const activeDoctors = doctorsData.filter(d => d.status === 'approved').length;
        const pendingDoctors = doctorsData.filter(d => d.status === 'pending').length;
        const recentOrders = ordersData.filter(order => {
          const orderDate = new Date(order.createdAt.seconds * 1000);
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          return orderDate > thirtyDaysAgo;
        }).length;

        setStats([
          { 
            title: 'Active Users', 
            value: activeUsers.toString(), 
            change: '+12%', 
            changeType: 'positive' 
          },
          { 
            title: 'Active Doctors', 
            value: activeDoctors.toString(), 
            change: '+5%', 
            changeType: 'positive' 
          },
          { 
            title: 'Pending Approvals', 
            value: pendingDoctors.toString(), 
            change: '-2%', 
            changeType: 'negative' 
          },
          { 
            title: 'Monthly Orders', 
            value: recentOrders.toString(), 
            change: '+8%', 
            changeType: 'positive' 
          }
        ]);

      } catch (error) {
        console.error('Error fetching data:', error);
        toast({
          title: "Error",
          description: "Failed to load dashboard data",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, navigate, toast]);

  const handleDoctorStatus = async (doctorId: string, status: 'approved' | 'rejected') => {
    try {
      const doctorRef = doc(db, 'doctors', doctorId);
      await updateDoc(doctorRef, { status });
      
      setDoctors(prev => prev.map(doc => 
        doc.id === doctorId ? { ...doc, status } : doc
      ));

      toast({
        title: "Success",
        description: `Doctor ${status === 'approved' ? 'approved' : 'rejected'} successfully`,
      });
    } catch (error) {
      console.error('Error updating doctor status:', error);
      toast({
        title: "Error",
        description: "Failed to update doctor status",
        variant: "destructive"
      });
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;

    try {
      await deleteDoc(doc(db, 'users', userId));
      setUsers(prev => prev.filter(user => user.id !== userId));
      toast({
        title: "Success",
        description: "User deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting user:', error);
      toast({
        title: "Error",
        description: "Failed to delete user",
        variant: "destructive"
      });
    }
  };

  const handleOrderStatus = async (orderId: string, status: Order['status']) => {
    try {
      const orderRef = doc(db, 'orders', orderId);
      await updateDoc(orderRef, { status });
      
      setOrders(prev => prev.map(order => 
        order.id === orderId ? { ...order, status } : order
      ));

      toast({
        title: "Success",
        description: `Order status updated to ${status}`,
      });
    } catch (error) {
      console.error('Error updating order status:', error);
      toast({
        title: "Error",
        description: "Failed to update order status",
        variant: "destructive"
      });
    }
  };

  const getStatusStyles = (status: Order['status']) => {
    switch (status) {
      case 'delivered':
        return "bg-green-100 text-green-800";
      case 'processing':
        return "bg-blue-100 text-blue-800";
      case 'cancelled':
        return "bg-red-100 text-red-800";
      case 'shipped':
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-yellow-100 text-yellow-800";
    }
  };

  const getDoctorStatusStyles = (status: Doctor['status']) => {
    switch (status) {
      case 'approved':
        return "bg-green-100 text-green-800";
      case 'rejected':
        return "bg-red-100 text-red-800";
      default:
        return "bg-yellow-100 text-yellow-800";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-sociodent-600"></div>
      </div>
    );
  }

  const tabs = [
    { id: 'dashboard', name: 'Dashboard', icon: <BarChart className="w-5 h-5 mr-2" /> },
    { id: 'users', name: 'User Management', icon: <Users className="w-5 h-5 mr-2" /> },
    { id: 'doctors', name: 'Doctors', icon: <BadgeHelp className="w-5 h-5 mr-2" /> },
    { id: 'orders', name: 'Orders', icon: <ShoppingBag className="w-5 h-5 mr-2" /> },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex min-h-screen">
        {/* Sidebar */}
        <div className="w-64 bg-white shadow-sm">
          <div className="p-6">
            <h1 className="text-xl font-bold text-gray-900">Admin Portal</h1>
          </div>
          <nav className="mt-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "w-full flex items-center px-6 py-3 text-sm font-medium",
                  activeTab === tab.id
                    ? "text-sociodent-600 bg-sociodent-50 border-r-2 border-sociodent-600"
                    : "text-gray-600 hover:text-sociodent-600 hover:bg-gray-50"
                )}
              >
                {tab.icon}
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1 py-8 px-8 overflow-auto">
          {activeTab === 'dashboard' && (
            <div>
              <h1 className="text-2xl font-bold mb-6">Dashboard Overview</h1>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                {stats.map((stat) => (
                  <div key={stat.title} className="bg-white rounded-xl shadow-sm p-6">
                    <div className="text-sm text-gray-500">{stat.title}</div>
                    <div className="flex items-end justify-between mt-2">
                      <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                      <span className={cn(
                        "text-sm",
                        stat.changeType === 'positive' ? "text-green-600" : "text-red-600"
                      )}>
                        {stat.change}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Recent Orders */}
              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold">Recent Orders</h2>
                  <button 
                    className="text-sociodent-600 hover:text-sociodent-700 text-sm font-medium"
                    onClick={() => setActiveTab('orders')}
                  >
                    View All
                  </button>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="px-4 py-3 text-left font-medium text-gray-700">Order ID</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-700">Customer</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-700">Date</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-700">Amount</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-700">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {orders.slice(0, 5).map((order) => (
                        <tr key={order.id}>
                          <td className="px-4 py-3 font-medium">#{order.id.slice(-6)}</td>
                          <td className="px-4 py-3">{order.userDetails.name}</td>
                          <td className="px-4 py-3 text-gray-500">
                            {formatDistance(order.createdAt.toDate(), new Date(), { addSuffix: true })}
                          </td>
                          <td className="px-4 py-3">${order.total.toFixed(2)}</td>
                          <td className="px-4 py-3">
                            <span className={cn("px-2 py-1 rounded-full text-xs", getStatusStyles(order.status))}>
                              {order.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div>
              <h1 className="text-2xl font-bold mb-6">User Management</h1>
              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="px-4 py-3 text-left font-medium text-gray-700">Name</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-700">Email</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-700">Role</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-700">Join Date</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-700">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {users.map((user) => (
                        <tr key={user.id}>
                          <td className="px-4 py-3">{user.name}</td>
                          <td className="px-4 py-3">{user.email}</td>
                          <td className="px-4 py-3">{user.role}</td>
                          <td className="px-4 py-3">{user.joinDate}</td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => handleDeleteUser(user.id)}
                              className="text-red-600 hover:text-red-800"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'doctors' && (
            <div>
              <h1 className="text-2xl font-bold mb-6">Doctor Management</h1>
              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="px-4 py-3 text-left font-medium text-gray-700">Name</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-700">Email</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-700">Specialization</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-700">Status</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-700">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {doctors.map((doctor) => (
                        <tr key={doctor.id}>
                          <td className="px-4 py-3">{doctor.name}</td>
                          <td className="px-4 py-3">{doctor.email}</td>
                          <td className="px-4 py-3">{doctor.specialization}</td>
                          <td className="px-4 py-3">
                            <span className={cn("px-2 py-1 rounded-full text-xs", getDoctorStatusStyles(doctor.status))}>
                              {doctor.status}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {doctor.status === 'pending' && (
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => handleDoctorStatus(doctor.id, 'approved')}
                                  className="text-green-600 hover:text-green-800"
                                >
                                  <Check className="w-5 h-5" />
                                </button>
                                <button
                                  onClick={() => handleDoctorStatus(doctor.id, 'rejected')}
                                  className="text-red-600 hover:text-red-800"
                                >
                                  <X className="w-5 h-5" />
                                </button>
                              </div>
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

          {activeTab === 'orders' && (
            <div>
              <h1 className="text-2xl font-bold mb-6">Order Management</h1>
              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="px-4 py-3 text-left font-medium text-gray-700">Order ID</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-700">Customer</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-700">Date</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-700">Amount</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-700">Payment</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-700">Status</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-700">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {orders.map((order) => (
                        <tr key={order.id}>
                          <td className="px-4 py-3 font-medium">#{order.id.slice(-6)}</td>
                          <td className="px-4 py-3">
                            <div>
                              <div className="font-medium">{order.userDetails.name}</div>
                              <div className="text-gray-500 text-xs">{order.userDetails.email}</div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-gray-500">
                            {formatDistance(order.createdAt.toDate(), new Date(), { addSuffix: true })}
                          </td>
                          <td className="px-4 py-3">${order.total.toFixed(2)}</td>
                          <td className="px-4 py-3">
                            <div>
                              <div className="font-medium">
                                {order.payment.method === 'razorpay' ? 'Online Payment' : 'Cash on Delivery'}
                              </div>
                              <div className={cn(
                                "text-xs",
                                order.payment.status === 'completed' ? "text-green-600" : "text-yellow-600"
                              )}>
                                {order.payment.status}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={cn("px-2 py-1 rounded-full text-xs", getStatusStyles(order.status))}>
                              {order.status}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <Select
                              defaultValue={order.status}
                              onValueChange={(value) => handleOrderStatus(order.id, value as Order['status'])}
                            >
                              <SelectTrigger className="w-[140px]">
                                <SelectValue placeholder="Update status" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="processing">Processing</SelectItem>
                                <SelectItem value="shipped">Shipped</SelectItem>
                                <SelectItem value="delivered">Delivered</SelectItem>
                                <SelectItem value="cancelled">Cancelled</SelectItem>
                              </SelectContent>
                            </Select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminPortal;
