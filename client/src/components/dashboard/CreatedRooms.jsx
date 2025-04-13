import React, { useState, useEffect } from 'react';
import { Copy, Trash2, LogIn, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getUserRooms, deleteRoom, joinRoom } from '../../services/roomService';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Custom toast styles
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

const CreatedRooms = () => {
  const navigate = useNavigate();
  const [createdRooms, setCreatedRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingRoomId, setDeletingRoomId] = useState(null);

  // Fetch user's created rooms
  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const user = JSON.parse(localStorage.getItem('user'));
        if (!user) return;

        const rooms = await getUserRooms(user.uid);
        setCreatedRooms(rooms);
      } catch (err) {
        setError('Failed to fetch rooms');
        console.error('Error fetching rooms:', err);
        toast.error('Failed to fetch your rooms', {
          position: 'top-right',
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchRooms();
  }, []);

  const handleCopyPasscode = (passcode) => {
    navigator.clipboard.writeText(passcode);
    toast.success('Passcode copied to clipboard!', {
      position: 'top-right',
      autoClose: 2000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
    });
  };

  const showDeleteConfirmation = (roomId, roomName) => {
    toast.warn(
      <div className="flex flex-col gap-4">
        <div className="font-medium">Delete Room Confirmation</div>
        <div className="text-sm text-gray-300">
          Are you sure you want to delete "{roomName}"? This action cannot be undone.
        </div>
        <div className="flex gap-2 mt-2">
          <button
            onClick={() => {
              handleDeleteConfirmed(roomId);
              toast.dismiss();
            }}
            className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-500 rounded-md text-sm font-medium transition-colors"
          >
            Delete
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

  const handleDeleteConfirmed = async (roomId) => {
    setDeletingRoomId(roomId);
    try {
      await deleteRoom(roomId);
      const room = createdRooms.find(r => r.id === roomId);
      setCreatedRooms(createdRooms.filter(r => r.id !== roomId));
      
      toast(
        <div className="flex items-start gap-3">
          {toastStyles.success.icon}
          <div>
            <div className="font-medium">Room Deleted Successfully</div>
            <div className="text-sm text-gray-300 mt-1">
              "{room.name}" has been permanently removed
            </div>
          </div>
        </div>,
        {
          ...toastStyles.success,
          autoClose: 3000,
        }
      );
    } catch (err) {
      console.error('Error deleting room:', err);
      const errorMessage = err.message === 'Not authorized to delete this room'
        ? 'You do not have permission to delete this room'
        : 'Unable to delete room. Please try again.';

      toast(
        <div className="flex items-start gap-3">
          {toastStyles.error.icon}
          <div>
            <div className="font-medium">Delete Room Failed</div>
            <div className="text-sm text-gray-300 mt-1">{errorMessage}</div>
          </div>
        </div>,
        {
          ...toastStyles.error,
          autoClose: 5000,
        }
      );
    } finally {
      setDeletingRoomId(null);
    }
  };

  const handleDeleteRoom = (roomId, roomName) => {
    showDeleteConfirmation(roomId, roomName);
  };

  const handleDirectJoin = async (room) => {
    try {
      const response = await joinRoom(room.name, room.passcode);
      toast.info('Joining room...', {
        position: 'top-right',
        autoClose: 2000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        theme: 'dark',
      });
      navigate(`/room/session/${response.sessionToken}`);
    } catch (err) {
      console.error('Error joining room:', err);
      toast.error('Failed to join room', {
        position: 'top-right',
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        theme: 'dark',
      });
    }
  };

  if (loading) {
    return (
      <div className="w-full max-w-2xl mx-auto bg-black/30 backdrop-blur-md rounded-lg p-6 border border-red-500/30">
        <div className="text-center text-gray-400">Loading your rooms...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full max-w-2xl mx-auto bg-black/30 backdrop-blur-md rounded-lg p-6 border border-red-500/30">
        <div className="text-center text-red-500">{error}</div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto bg-black/30 backdrop-blur-md rounded-lg p-6 border border-red-500/30">
      <h2 className="text-2xl font-bold mb-6 bg-gradient-to-r from-primary via-red-500 to-primary-light bg-clip-text text-transparent">
        My Created Rooms
      </h2>
      {createdRooms.length === 0 ? (
        <div className="text-center text-gray-400">
          You haven't created any rooms yet.
        </div>
      ) : (
        <div className="space-y-4">
          {createdRooms.map((room) => (
            <div
              key={room.id}
              className="flex items-center justify-between p-4 bg-black/50 rounded-lg border border-red-500/20 hover:border-red-500/30 transition-colors"
            >
              <div>
                <h3 className="font-medium text-lg">{room.name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`w-2 h-2 rounded-full ${room.memberCount > 0 ? 'bg-green-500' : 'bg-gray-500'}`} />
                  <span className="text-sm text-gray-400">
                    {room.memberCount} {room.memberCount === 1 ? 'member' : 'members'}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleDirectJoin(room)}
                  className="px-4 py-2 bg-red-600/10 hover:bg-red-600/20 text-red-500 rounded-lg transition-all text-sm flex items-center gap-2"
                  title="Join room"
                >
                  <LogIn className="w-4 h-4" />
                  Join
                </button>
                <button
                  onClick={() => handleCopyPasscode(room.passcode)}
                  className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                  title="Copy room passcode"
                >
                  <Copy className="w-5 h-5" />
                </button>
                <button
                  onClick={() => handleDeleteRoom(room.id, room.name)}
                  disabled={deletingRoomId === room.id}
                  className={`p-2 text-gray-400 hover:text-red-500 transition-colors ${
                    deletingRoomId === room.id ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                  title="Delete room"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CreatedRooms;
