import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Menu, X, User, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const NavItems = [
  
];

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  
  // Check authentication status
  const isGuest = Boolean(localStorage.getItem('guestId'));
  const googleUser = JSON.parse(localStorage.getItem('user'));
  const isAuthenticated = isGuest || Boolean(googleUser);

  // Handle click outside dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('guestId');
    localStorage.removeItem('user');
    setShowDropdown(false);
    navigate('/login');
  };

  const AuthSection = () => {
    if (isAuthenticated) {
      return (
        <div className="flex items-center gap-4">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/dashboard')}
            className="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-lg font-semibold transition-colors"
          >
            Dashboard
          </motion.button>
          <div className="relative" ref={dropdownRef}>
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center cursor-pointer"
              onClick={() => setShowDropdown(!showDropdown)}
            >
              <User className="w-6 h-6 text-primary" />
            </motion.div>
            {showDropdown && (
              <div className="absolute right-0 mt-2 w-48 rounded-lg bg-black bg-opacity-90 backdrop-blur-sm border border-primary/10 shadow-lg py-1 z-50">
                <div className="px-4 py-2 text-sm text-gray-300 border-b border-primary/10">
                  {isGuest ? `Guest_${localStorage.getItem('guestId').slice(-6)}` : googleUser?.displayName}
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-primary/20 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      );
    }

    return (
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => navigate('/login')}
        className="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-lg font-semibold transition-colors"
      >
        Get Started
      </motion.button>
    );
  };

  return (
    <nav className="fixed top-0 w-full z-50 bg-black bg-opacity-50 backdrop-blur-md border-b border-primary/10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center"
          >
            <a href="/" className="text-2xl font-bold text-primary">ConnectX</a>
          </motion.div>

          {/* Desktop Navigation */}
          <div className="hidden md:block">
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="ml-10 flex items-center space-x-8"
            >
              <AuthSection />
            </motion.div>
          </div>

          {/* Mobile Navigation Button */}
          <div className="md:hidden">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setIsOpen((prev) => !prev)}
              className="text-gray-300 hover:text-primary"
            >
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </motion.button>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        <motion.div
          initial={false}
          animate={isOpen ? { height: 'auto', opacity: 1 } : { height: 0, opacity: 0 }}
          transition={{ duration: 0.3 }}
          className={`md:hidden overflow-hidden ${isOpen ? 'block' : 'hidden'}`}
        >
          <div className="space-y-4 pb-4 pt-2">
            {isAuthenticated ? (
              <>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => navigate('/dashboard')}
                  className="w-full bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-lg font-semibold transition-colors"
                >
                  Dashboard
                </motion.button>
                <div className="flex items-center justify-center gap-2 text-sm text-gray-300">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                    <User className="w-4 h-4 text-primary" />
                  </div>
                  <span>{isGuest ? `Guest_${localStorage.getItem('guestId').slice(-6)}` : googleUser?.displayName}</span>
                </div>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={handleLogout}
                  className="w-full border border-primary text-primary hover:bg-primary/10 px-4 py-2 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </motion.button>
              </>
            ) : (
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate('/login')}
                className="w-full bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-lg font-semibold transition-colors"
              >
                Get Started
              </motion.button>
            )}
          </div>
        </motion.div>
      </div>
    </nav>
  );
}