import React, { useState, useEffect } from 'react';
import { Copy, Trash2, LogIn, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { joinRoom } from '../../services/roomService';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const API_URL = 'http://localhost:5000/api';

// Custom toast styles (same as CreatedRooms for consistency)
const toastStyles = {
  success: {
    style: {
      background: 'rgba(0, 0, 0, 0.8)',
      backdropFilter: 'blur(8px)',
      border: '1px solid rgba(34, 197, 94, 0.3)',
      borderRadius: '8px',
      color: '#fff',
      padding: '16px',
    },
    icon: <CheckCircle2 className="w-5 h-5 text-green-500" />
  },
  error: {
    style: {
      background: 'rgba(0, 0, 0, 0.8)',
      backdropFilter: 'blur(8px)',
      border: '1px solid rgba(239, 68, 68, 0.3)',
      borderRadius: '8px',
      color: '#fff',
      padding: '16px',
    },
    icon: <XCircle className="w-5 h-5 text-red-500" />
  },
  warning: {
    style: {
      background: 'rgba(0, 0, 0, 0.8)',
      backdropFilter: 'blur(8px)',
      border: '1px solid rgba(234, 179, 8, 0.3)',
      borderRadius: '8px',
      color: '#fff',
      padding: '16px',
    },
    icon: <AlertCircle className="w-5 h-5 text-yellow-500" />
  }
};

const RoomHistory = () => {
  const navigate = useNavigate();
  const [recentRooms, setRecentRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const user = JSON.parse(localStorage.getItem('user'));
        if (!user) {
          setRecentRooms([]);
          return;
        }

        const response = await axios.get(`${API_URL}/rooms/history/${user.uid}`);
        setRecentRooms(response.data);
      } catch (err) {
        setError('Failed to fetch room history');
        console.error('Error fetching room history:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, []);

  const handleCopyPasscode = (passcode) => {
    navigator.clipboard.writeText(passcode);
    alert('Passcode copied to clipboard!');
  };

  const showClearHistoryConfirmation = () => {
    toast.warn(
      <div className="flex flex-col gap-4">
        <div className="font-medium">Clear Room History</div>
        <div className="text-sm text-gray-300">
          Are you sure you want to clear your entire room history? This will remove all records of rooms you've joined.
        </div>
        <div className="flex gap-2 mt-2">
          <button
            onClick={() => {
              handleClearHistoryConfirmed();
              toast.dismiss();
            }}
            className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-500 rounded-md text-sm font-medium transition-colors"
          >
            Clear History
          </button>
          <button
            onClick={() => toast.dismiss()}
            className="px-4 py-2 bg-gray-500/20 hover:bg-gray-500/30 text-gray-300 rounded-md text-sm font-medium transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>,
      {
        ...toastStyles.warning,
        autoClose: false,
        closeOnClick: false,
        draggable: false,
      }
    );
  };

  const handleClearHistoryConfirmed = async () => {
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      if (!user) return;

      await axios.delete(`${API_URL}/rooms/history/${user.uid}`);
      setRecentRooms([]);
      
      toast(
        <div className="flex items-start gap-3">
          {toastStyles.success.icon}
          <div>
            <div className="font-medium">History Cleared Successfully</div>
            <div className="text-sm text-gray-300 mt-1">
              Your room history has been cleared
            </div>
          </div>
        </div>,
        {
          ...toastStyles.success,
          autoClose: 3000,
        }
      );
    } catch (err) {
      console.error('Error clearing history:', err);
      
      toast(
        <div className="flex items-start gap-3">
          {toastStyles.error.icon}
          <div>
            <div className="font-medium">Failed to Clear History</div>
            <div className="text-sm text-gray-300 mt-1">
              Unable to clear room history. Please try again.
            </div>
          </div>
        </div>,
        {
          ...toastStyles.error,
          autoClose: 5000,
        }
      );
    }
  };

  const handleClearHistory = () => {
    showClearHistoryConfirmation();
  };

  const handleJoinAgain = async (room) => {
    try {
      const response = await joinRoom(room.roomName, room.passcode);
      navigate(`/room/session/${response.sessionToken}`);
    } catch (err) {
      console.error('Error joining room:', err);
      alert('Failed to join room');
    }
  };

  if (loading) {
    return (
      <div className="w-full max-w-2xl mx-auto bg-black/30 backdrop-blur-md rounded-lg p-6 border border-red-500/30">
        <div className="text-center text-gray-400">Loading room history...</div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto bg-black/30 backdrop-blur-md rounded-lg p-6 border border-red-500/30">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-primary via-red-500 to-primary-light bg-clip-text text-transparent">
          Recent Rooms
        </h2>
        {recentRooms.length > 0 && (
          <button
            onClick={handleClearHistory}
            className="text-sm text-gray-400 hover:text-red-500 transition-colors flex items-center gap-1"
          >
            <Trash2 className="w-4 h-4" />
            Clear History
          </button>
        )}
      </div>
      {recentRooms.length === 0 ? (
        <div className="text-center text-gray-400">
          No recently joined rooms
        </div>
      ) : (
        <div className="space-y-4">
          {recentRooms.map((room) => (
            <div
              key={room._id}
              className="flex items-center justify-between p-4 bg-black/50 rounded-lg border border-red-500/20 hover:border-red-500/30 transition-colors"
            >
              <div>
                <h3 className="font-medium text-lg">{room.roomName}</h3>
                <p className="text-sm text-gray-400">
                  Last joined: {new Date(room.lastJoined).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleCopyPasscode(room.passcode)}
                  className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                  title="Copy Passcode"
                >
                  <Copy className="w-5 h-5" />
                </button>
                <button
                  onClick={() => handleJoinAgain(room)}
                  className="px-4 py-2 bg-red-600/10 hover:bg-red-600/20 text-red-500 rounded-lg transition-all text-sm flex items-center gap-2"
                  title="Join Again"
                >
                  <LogIn className="w-4 h-4" />
                  Join Again
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RoomHistory;
