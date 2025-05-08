import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Trash2, CreditCard, Smartphone, Banknote, ShoppingBag, ChevronLeft } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { db } from '../backend/config/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { loadRazorpayScript, createRazorpayOrder, initializeRazorpayPayment } from '@/lib/razorpay';

const RAZORPAY_KEY = import.meta.env.VITE_RAZORPAY_KEY_ID || 'your_razorpay_key_id';

// Mock cart data - this would come from your state management solution (context, redux, etc.)
const cartItems = [
  {
    id: '1',
    name: 'Sonic Pro Electric Toothbrush',
    image: 'https://images.unsplash.com/photo-1559304822-9eb5e14a44ee?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=500&q=80',
    price: 79.99,
    quantity: 1
  },
  {
    id: '3',
    name: 'Organic Mint Dental Floss',
    image: 'https://images.unsplash.com/photo-1612887726773-e64e49123924?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=500&q=80',
    price: 8.99,
    quantity: 2
  }
];

type PaymentMethod = 'razorpay' | 'cash';

const paymentMethods = [
  {
    id: 'razorpay' as PaymentMethod,
    name: 'Pay with Razorpay',
    icon: <CreditCard className="h-5 w-5" />,
  },
  {
    id: 'cash' as PaymentMethod,
    name: 'Cash on Delivery',
    icon: <Banknote className="h-5 w-5" />,
  },
];

const Checkout = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('razorpay');
  
  // Customer details
  const [name, setName] = useState(user?.displayName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(localStorage.getItem('lastUsedPhone') || '');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [notes, setNotes] = useState('');
  
  // Payment processing state
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [orderId, setOrderId] = useState<string>('');
  
  useEffect(() => {
    // Load Razorpay script when component mounts
    loadRazorpayScript();

    // Auto-fill user details if available
    if (user) {
      setName(user.displayName || '');
      setEmail(user.email || '');
    }
  }, [user]);

  // Calculate totals
  const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const shipping = subtotal > 50 ? 0 : 5.99;
  const total = subtotal + shipping;

  const createOrder = async (paymentDetails?: any) => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to complete your order",
        variant: "destructive"
      });
      navigate('/auth?mode=login');
      return;
    }

    try {
      const orderData = {
        userId: user.uid,
        userDetails: {
          name,
          email,
          phone,
          address,
          city,
          zipCode,
        },
        items: cartItems,
        payment: {
          method: paymentMethod,
          details: paymentDetails,
          status: paymentMethod === 'cash' ? 'pending' : 'completed',
        },
        status: 'pending',
        subtotal,
        shipping,
        total,
        notes,
        createdAt: serverTimestamp(),
      };

      const orderRef = await addDoc(collection(db, 'orders'), orderData);
      setOrderId(orderRef.id);
      
      // Clear cart here (implement according to your cart management system)
      // clearCart();
      
      return orderRef.id;
    } catch (error) {
      console.error('Error creating order:', error);
      throw error;
    }
  };
  
  const handleRazorpayPayment = async () => {
    try {
      setIsProcessingPayment(true);
      
      // Convert USD to INR (approximate conversion) and convert to paise
      const amountInINR = Math.round(total * 83 * 100); // 1 USD = ~83 INR
      
      // Create order on your backend
      const orderData = await createRazorpayOrder(amountInINR);
      
      // Initialize Razorpay payment
      const paymentData = await initializeRazorpayPayment({
        key: RAZORPAY_KEY,
        amount: orderData.amount,
        currency: "INR",
        name: "Socio Smile Market",
        description: "Order payment",
        order_id: orderData.id,
        prefill: {
          name,
          email,
          contact: phone,
        },
        notes: {
          address,
          shipping_address: `${address}, ${city} ${zipCode}`,
        },
        theme: {
          color: "#0F766E",
        },
      });

      // Create order in Firestore with payment details
      await createOrder({
        razorpayOrderId: orderData.id,
        razorpayPaymentId: paymentData.razorpay_payment_id,
        razorpaySignature: paymentData.razorpay_signature,
      });

      setStep(3);
    } catch (error: any) {
      console.error("Payment failed:", error);
      toast({
        title: "Payment Failed",
        description: error.message || "There was an error processing your payment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handleContinue = async () => {
    if (step === 1) {
      // Validate shipping details
      if (!name || !email || !phone || !address || !city || !zipCode) {
        toast({
          title: "Missing Information",
          description: "Please fill in all required fields",
          variant: "destructive"
        });
        return;
      }
      
      // Save phone for future use
      localStorage.setItem('lastUsedPhone', phone);
      setStep(2);
    } else if (step === 2) {
      if (paymentMethod === 'razorpay') {
        handleRazorpayPayment();
      } else {
        // Create order for cash on delivery
        try {
          await createOrder();
          setStep(3);
        } catch (error) {
          toast({
            title: "Error",
            description: "Failed to create order. Please try again.",
            variant: "destructive"
          });
        }
      }
    } else {
      // Order completed, go to orders page
      navigate('/dashboard');
      toast({
        title: "Success!",
        description: "Your order has been placed successfully.",
      });
    }
  };
  
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-grow pt-20">
        <section className="py-12 bg-gray-50">
          <div className="container-custom">
            <div className="max-w-6xl mx-auto">
              {/* Progress Indicator */}
              {step < 3 && (
                <div className="mb-10">
                  <div className="flex items-center justify-between max-w-md mx-auto">
                    {['Shipping', 'Payment', 'Confirmation'].map((label, index) => (
                      <div key={label} className="flex items-center">
                        <div className={`rounded-full h-10 w-10 flex items-center justify-center ${step > index + 1 ? 'bg-green-500 text-white' : step === index + 1 ? 'bg-sociodent-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
                          {step > index + 1 ? '✓' : index + 1}
                        </div>
                        <div className="ml-3">
                          <p className="text-sm font-medium">{label}</p>
                        </div>
                        
                        {index < 2 && (
                          <div className="hidden sm:block w-24 border-t border-gray-200 mx-4"></div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Content */}
                <div className="lg:col-span-2">
                  <div className="glass-card border border-white/50 rounded-2xl overflow-hidden shadow-md bg-white">
                    {step === 1 && (
                      <div className="p-6">
                        <h1 className="text-2xl font-bold text-gray-900 mb-6">Shipping Information</h1>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div>
                            <Label htmlFor="name">Full Name *</Label>
                            <Input 
                              id="name" 
                              value={name} 
                              onChange={(e) => setName(e.target.value)} 
                              placeholder="John Doe" 
                              required 
                            />
                          </div>
                          <div>
                            <Label htmlFor="email">Email Address *</Label>
                            <Input 
                              id="email" 
                              type="email"
                              value={email} 
                              onChange={(e) => setEmail(e.target.value)} 
                              placeholder="you@example.com" 
                              required 
                            />
                          </div>
                        </div>
                        
                        <div className="mb-4">
                          <Label htmlFor="phone">Phone Number *</Label>
                          <Input 
                            id="phone" 
                            value={phone} 
                            onChange={(e) => setPhone(e.target.value)} 
                            placeholder="+1 (555) 123-4567" 
                            required 
                          />
                        </div>
                        
                        <div className="mb-4">
                          <Label htmlFor="address">Address *</Label>
                          <Textarea 
                            id="address" 
                            value={address} 
                            onChange={(e) => setAddress(e.target.value)} 
                            placeholder="Street address" 
                            rows={2}
                            required 
                          />
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div>
                            <Label htmlFor="city">City *</Label>
                            <Input 
                              id="city" 
                              value={city} 
                              onChange={(e) => setCity(e.target.value)} 
                              placeholder="Your city" 
                              required 
                            />
                          </div>
                          <div>
                            <Label htmlFor="zipCode">ZIP / Postal Code *</Label>
                            <Input 
                              id="zipCode" 
                              value={zipCode} 
                              onChange={(e) => setZipCode(e.target.value)} 
                              placeholder="123456" 
                              required 
                            />
                          </div>
                        </div>
                        
                        <div className="mb-6">
                          <Label htmlFor="notes">Order Notes (Optional)</Label>
                          <Textarea 
                            id="notes" 
                            value={notes} 
                            onChange={(e) => setNotes(e.target.value)} 
                            placeholder="Special instructions for delivery" 
                            rows={3}
                          />
                        </div>
                        
                        <div className="flex justify-between">
                          <Link to="/marketplace">
                            <Button variant="outline" className="flex items-center">
                              <ChevronLeft className="mr-1 h-4 w-4" />
                              Continue Shopping
                            </Button>
                          </Link>
                          <Button onClick={handleContinue}>
                            Continue to Payment
                          </Button>
                        </div>
                      </div>
                    )}
                    
                    {step === 2 && (
                      <div className="p-6">
                        <h1 className="text-2xl font-bold text-gray-900 mb-6">Payment Method</h1>
                        
                        <div className="mb-6">
                          <div className="grid grid-cols-1 gap-3">
                            {paymentMethods.map((method) => (
                              <div
                                key={method.id}
                                className={`
                                  border rounded-lg p-4 flex items-center cursor-pointer transition-all
                                  ${paymentMethod === method.id ? 'border-sociodent-600 bg-sociodent-50' : 'border-gray-200 hover:border-sociodent-300'}
                                `}
                                onClick={() => setPaymentMethod(method.id)}
                              >
                                <div className="flex items-center">
                                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center mr-3 ${paymentMethod === method.id ? 'border-sociodent-600' : 'border-gray-300'}`}>
                                    {paymentMethod === method.id && (
                                      <div className="w-3 h-3 rounded-full bg-sociodent-600"></div>
                                    )}
                                  </div>
                                  {method.icon}
                                  <span className="ml-2 font-medium">{method.name}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                        
                        {paymentMethod === 'cash' && (
                          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                            <h2 className="font-semibold mb-4">Cash on Delivery</h2>
                            <p className="text-gray-600">
                              You will pay the full amount in cash when your order is delivered.
                              Please ensure you have the exact change if possible.
                            </p>
                          </div>
                        )}
                        
                        <div className="flex justify-between">
                          <Button variant="outline" onClick={() => setStep(1)}>
                            Back
                          </Button>
                          <Button onClick={handleContinue} disabled={isProcessingPayment}>
                            {isProcessingPayment ? 'Processing...' : 'Complete Order'}
                          </Button>
                        </div>
                      </div>
                    )}
                    
                    {step === 3 && (
                      <div className="p-6 text-center">
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                          </svg>
                        </div>
                        
                        <h1 className="text-2xl font-bold text-gray-900 mb-2">Order Confirmed!</h1>
                        <p className="text-gray-600 mb-6">
                          Your order has been placed successfully and will be processed shortly.
                        </p>
                        
                        <div className="max-w-md mx-auto bg-gray-50 rounded-lg p-4 mb-6 text-left">
                          <h3 className="font-medium mb-3">Order Details</h3>
                          <div className="grid grid-cols-2 gap-y-2 text-sm">
                            <div className="text-gray-600">Order ID:</div>
                            <div className="font-medium">#{orderId}</div>
                            
                            <div className="text-gray-600">Date:</div>
                            <div className="font-medium">{new Date().toLocaleDateString()}</div>
                            
                            <div className="text-gray-600">Payment Method:</div>
                            <div className="font-medium">
                              {paymentMethod === 'razorpay' && 'Pay with Razorpay'}
                              {paymentMethod === 'cash' && 'Cash on Delivery'}
                            </div>
                            
                            <div className="text-gray-600">Total Amount:</div>
                            <div className="font-medium text-sociodent-600">${total.toFixed(2)}</div>
                          </div>
                        </div>
                        
                        <div className="flex flex-col sm:flex-row justify-center gap-3">
                          <Button variant="outline" className="flex items-center justify-center">
                            <ShoppingBag className="mr-2 h-4 w-4" />
                            View Your Orders
                          </Button>
                          <Button onClick={handleContinue}>
                            Continue Shopping
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Order Summary */}
                {step < 3 && (
                  <div className="lg:col-span-1">
                    <div className="glass-card border border-white/50 rounded-2xl overflow-hidden shadow-md bg-white p-6 sticky top-24">
                      <h2 className="text-xl font-bold text-gray-900 mb-4">Order Summary</h2>
                      
                      <div className="mb-4">
                        {cartItems.map((item) => (
                          <div key={item.id} className="flex py-4 border-b">
                            <div className="w-20 h-20 rounded-md overflow-hidden flex-shrink-0">
                              <img
                                src={item.image}
                                alt={item.name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="ml-4 flex-1">
                              <h4 className="font-medium">{item.name}</h4>
                              <div className="flex items-center justify-between mt-1">
                                <div className="text-sm text-gray-500">
                                  Qty: {item.quantity}
                                </div>
                                <div className="font-medium">
                                  ${(item.price * item.quantity).toFixed(2)}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      <div className="py-2 border-b border-dashed">
                        <div className="flex justify-between mb-2">
                          <span className="text-gray-600">Subtotal</span>
                          <span className="font-medium">${subtotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between mb-2">
                          <span className="text-gray-600">Shipping</span>
                          <span className="font-medium">
                            {shipping === 0 ? 'Free' : `$${shipping.toFixed(2)}`}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex justify-between py-3 font-bold text-lg">
                        <span>Total</span>
                        <span className="text-sociodent-600">${total.toFixed(2)}</span>
                      </div>
                      
                      {/* Promotion code input would go here */}
                      
                      <div className="mt-6 text-xs text-gray-500">
                        <p>
                          By completing this order, you agree to our <Link to="/terms" className="text-sociodent-600">Terms of Service</Link> and <Link to="/privacy" className="text-sociodent-600">Privacy Policy</Link>.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
};

export default Checkout;
