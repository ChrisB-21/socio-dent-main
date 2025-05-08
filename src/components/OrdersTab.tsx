import React from 'react';
import { Package, ChevronRight } from 'lucide-react';
import { formatDistance } from 'date-fns';
import { Button } from '@/components/ui/button';

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

interface OrdersTabProps {
  orders: Order[];
}

const OrderStatusBadge = ({ status }: { status: Order['status'] }) => {
  const statusStyles = {
    pending: 'bg-yellow-100 text-yellow-800',
    processing: 'bg-blue-100 text-blue-800',
    shipped: 'bg-purple-100 text-purple-800',
    delivered: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
  };

  return (
    <span className={`px-2 py-1 rounded-full text-xs ${statusStyles[status]}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};

const OrdersTab = ({ orders }: OrdersTabProps) => {
  const sortedOrders = [...orders].sort((a, b) => b.createdAt.seconds - a.createdAt.seconds);

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <h2 className="text-xl font-semibold mb-4">Your Orders</h2>
      {orders.length > 0 ? (
        <div className="space-y-4">
          {sortedOrders.map((order) => (
            <div key={order.id} className="border rounded-lg overflow-hidden">
              <div className="p-4">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-medium text-lg">Order #{order.id.slice(-6)}</h3>
                    <p className="text-sm text-gray-500">
                      Placed {formatDistance(order.createdAt.toDate(), new Date(), { addSuffix: true })}
                    </p>
                  </div>
                  <OrderStatusBadge status={order.status} />
                </div>

                <div className="space-y-2">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span>{item.name} × {item.quantity}</span>
                      <span className="text-gray-600">${(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-4 pt-4 border-t">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal</span>
                    <span>${order.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Shipping</span>
                    <span>{order.shipping === 0 ? 'Free' : `$${order.shipping.toFixed(2)}`}</span>
                  </div>
                  <div className="flex justify-between font-medium mt-2">
                    <span>Total</span>
                    <span className="text-sociodent-600">${order.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="px-4 py-3 bg-gray-50 flex justify-between items-center">
                <div className="text-sm">
                  <span className="text-gray-600">Payment: </span>
                  <span className="font-medium">
                    {order.payment.method === 'razorpay' ? 'Online Payment' : 'Cash on Delivery'}
                  </span>
                  <span className={`ml-2 text-xs ${
                    order.payment.status === 'completed' ? 'text-green-600' : 'text-yellow-600'
                  }`}>
                    ({order.payment.status})
                  </span>
                </div>
                <Button variant="ghost" size="sm" className="text-sociodent-600">
                  View Details
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No orders yet</h3>
          <p className="text-gray-500 mb-4">When you place orders, they will appear here</p>
          <Button variant="outline" onClick={() => window.location.href = '/marketplace'}>
            Start Shopping
          </Button>
        </div>
      )}
    </div>
  );
};

export default OrdersTab;