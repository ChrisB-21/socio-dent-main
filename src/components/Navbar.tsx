import React from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { User as FirebaseUser } from "firebase/auth";
import {
  Menu, X, ShoppingCart, UserCircle, LogOut
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";

// Extend Firebase User type
interface ExtendedUser extends FirebaseUser {
  role?: 'admin' | 'doctor' | 'patient';
}

const getDashboardPath = (user: ExtendedUser | null) => {
  if (!user) return '/dashboard';
  switch (user.role) {
    case 'admin':
      return '/admin-portal';
    case 'doctor':
      return '/doctor-portal';
    default:
      return '/dashboard';
  }
};

const Navbar = () => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [scrolled, setScrolled] = React.useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/auth?mode=login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const commonLinks = [
    { name: 'Home', path: '/' },
    { name: 'Products', path: '/marketplace' },
    { name: 'Doctors', path: '/doctors' },
    { name: 'About', path: '/about' },
  ];

  const authLinks = user ? [
    {
      name: 'Dashboard',
      path: getDashboardPath(user as ExtendedUser)
    },
    { name: 'Profile', path: '/profile' },
  ] : [];

  return (
    <nav className={cn(
      "fixed top-0 w-full z-50 transition-all duration-300",
      scrolled ? "bg-white shadow-md" : "bg-transparent"
    )}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo */}
          <div className="flex-shrink-0 flex items-center">
            <Link to="/" className="text-2xl font-bold text-sociodent-600">
              SocioDent
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex md:items-center md:space-x-8">
            {commonLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={cn(
                  "text-gray-600 hover:text-sociodent-600 px-3 py-2 rounded-md text-sm font-medium",
                  location.pathname === link.path && "text-sociodent-600"
                )}
              >
                {link.name}
              </Link>
            ))}
          </div>

          {/* Desktop Auth Section */}
          <div className="hidden md:flex md:items-center md:space-x-4">
            {user ? (
              <>
                <Link to="/marketplace/cart" className="text-gray-600 hover:text-sociodent-600">
                  <ShoppingCart className="w-6 h-6" />
                </Link>
                <DropdownMenu>
                  <DropdownMenuTrigger className="flex items-center space-x-2">
                    <UserCircle className="w-8 h-8 text-sociodent-600" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {authLinks.map((link) => (
                      <DropdownMenuItem key={link.path} asChild>
                        <Link to={link.path}>{link.name}</Link>
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={handleLogout} className="text-red-600">
                      <LogOut className="w-4 h-4 mr-2" />
                      Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <Link
                to="/auth?mode=login"
                className="bg-sociodent-600 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                Sign In
              </Link>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild>
                <button className="text-gray-600">
                  {isOpen ? (
                    <X className="w-6 h-6" />
                  ) : (
                    <Menu className="w-6 h-6" />
                  )}
                </button>
              </SheetTrigger>
              <SheetContent side="right">
                <SheetHeader>
                  <SheetTitle>Menu</SheetTitle>
                </SheetHeader>
                <div className="mt-6 flex flex-col space-y-4">
                  {commonLinks.map((link) => (
                    <Link
                      key={link.path}
                      to={link.path}
                      className={cn(
                        "text-gray-600 hover:text-sociodent-600 px-3 py-2 rounded-md text-sm font-medium",
                        location.pathname === link.path && "text-sociodent-600"
                      )}
                      onClick={() => setIsOpen(false)}
                    >
                      {link.name}
                    </Link>
                  ))}
                  {user ? (
                    <>
                      {authLinks.map((link) => (
                        <Link
                          key={link.path}
                          to={link.path}
                          className="text-gray-600 hover:text-sociodent-600 px-3 py-2 rounded-md text-sm font-medium"
                          onClick={() => setIsOpen(false)}
                        >
                          {link.name}
                        </Link>
                      ))}
                      <button
                        onClick={() => {
                          handleLogout();
                          setIsOpen(false);
                        }}
                        className="text-red-600 hover:text-red-700 px-3 py-2 rounded-md text-sm font-medium"
                      >
                        Sign Out
                      </button>
                    </>
                  ) : (
                    <Link
                      to="/auth?mode=login"
                      className="bg-sociodent-600 text-white px-4 py-2 rounded-md text-sm font-medium text-center"
                      onClick={() => setIsOpen(false)}
                    >
                      Sign In
                    </Link>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
