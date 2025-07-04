import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw, CheckCircle2, XCircle } from 'lucide-react';
import axios from 'axios';
import { API_URL } from '../../services/api';
import { toast } from 'react-toastify';

const GuestLogin = () => {
  const navigate = useNavigate();
  const [suggestedNames, setSuggestedNames] = useState([]);
  const [selectedName, setSelectedName] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch suggested names
  const fetchSuggestedNames = async () => {
    try {
      setRefreshing(true);
      const response = await axios.get(`${API_URL}/auth/guest/suggest-names?count=5`);
      setSuggestedNames(response.data.suggestions);
      setSelectedName(''); // Clear selection when refreshing
    } catch (error) {
      console.error('Error fetching suggested names:', error);
      toast.error('Failed to fetch name suggestions');
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuggestedNames();
  }, []);

  const handleContinueAsGuest = async () => {
    if (!selectedName) {
      toast.warn('Please select a name to continue');
      return;
    }

    try {
      // Check if name is still available
      const checkResponse = await axios.get(`${API_URL}/auth/guest/check-name?name=${selectedName}`);
      if (!checkResponse.data.isAvailable) {
        toast.error('This name is no longer available. Please choose another one.');
        await fetchSuggestedNames();
        return;
      }

      // Store guest info
      const guestInfo = {
        uid: `guest_${Date.now()}`,
        displayName: selectedName,
        isGuest: true
      };
      localStorage.setItem('guestId', guestInfo.uid);
      localStorage.setItem('user', JSON.stringify(guestInfo));

      // Show success message
      toast.success('Welcome! Redirecting to dashboard...');
      navigate('/dashboard');
    } catch (error) {
      console.error('Error logging in as guest:', error);
      toast.error('Failed to log in. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center space-y-4">
        <div className="animate-spin">
          <RefreshCw className="w-6 h-6 text-red-500" />
        </div>
        <p className="text-gray-400">Loading name suggestions...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Choose your guest name:</h3>
        <button
          onClick={fetchSuggestedNames}
          disabled={refreshing}
          className="p-2 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
          title="Get new suggestions"
        >
          <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="grid gap-3">
        {suggestedNames.map((name) => (
          <button
            key={name}
            onClick={() => setSelectedName(name)}
            className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
              selectedName === name
                ? 'bg-red-500/10 border-red-500/50 text-red-500'
                : 'bg-black/20 border-gray-700/50 text-gray-300 hover:bg-black/30'
            }`}
          >
            <span className="font-medium">{name}</span>
            {selectedName === name ? (
              <CheckCircle2 className="w-5 h-5" />
            ) : (
              <div className="w-5 h-5" /> // Placeholder for layout consistency
            )}
          </button>
        ))}
      </div>

      <button
        onClick={handleContinueAsGuest}
        disabled={!selectedName}
        className="w-full py-3 px-4 bg-red-500/10 hover:bg-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed text-red-500 rounded-lg transition-colors font-medium"
      >
        Continue as Guest
      </button>
    </div>
  );
};

export default GuestLogin;
