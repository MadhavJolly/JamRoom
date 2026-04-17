import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search as SearchIcon, Disc3, Lock, X } from "lucide-react";
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { db, auth } from "../firebase";

import { getChipColor } from "../utils/colors";

export default function Search() {
  const [activeFilter, setActiveFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState("");
  const [rooms, setRooms] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  
  // Private Room Access State
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [selectedPrivateRoom, setSelectedPrivateRoom] = useState<any>(null);
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState("");

  const filters = ['All', 'Rooms', 'Spotify', 'YouTube', 'Bandcamp', 'Soundcloud', 'Dices'];

  useEffect(() => {
    // Fetch all rooms (public and private)
    const roomsRef = collection(db, "rooms");
    const q = query(roomsRef);
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const roomsData: any[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        roomsData.push({ id: doc.id, ...data });
      });
      
      // Sort locally to handle both Timestamp and ISO string formats
      roomsData.sort((a, b) => {
        const timeA = a.createdAt ? (a.createdAt.toMillis ? a.createdAt.toMillis() : new Date(a.createdAt).getTime()) : Date.now();
        const timeB = b.createdAt ? (b.createdAt.toMillis ? b.createdAt.toMillis() : new Date(b.createdAt).getTime()) : Date.now();
        return timeB - timeA;
      });
      
      setRooms(roomsData);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching rooms:", error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const filteredRooms = rooms.filter(room => 
    room.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    room.creatorName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    room.tags?.some((tag: string) => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleRoomClick = (room: any) => {
    if (room.isPrivate && room.creatorId !== auth.currentUser?.uid) {
      setSelectedPrivateRoom(room);
      setIsJoinModalOpen(true);
      setInviteCode("");
      setError("");
    } else {
      navigate(`/room/${room.id}`);
    }
  };

  const handleJoinPrivate = () => {
    if (inviteCode.toUpperCase() === selectedPrivateRoom.shareCode) {
      navigate(`/room/${selectedPrivateRoom.id}`);
    } else {
      setError("Invalid invite code. Please try again.");
    }
  };

  return (
    <div className="p-6 font-sans pb-24 md:pb-6 h-full flex flex-col">
      <header className="mb-6 pt-4">
        <h1 className="text-3xl font-bold tracking-tight mb-4">Search</h1>
        
        <div className="relative">
          <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#666666]" size={20} />
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search rooms, users, tracks..." 
            className="w-full bg-[#111111] border border-[#222222] text-[#E4E3E0] text-sm p-3.5 pl-11 rounded-xl focus:outline-none focus:border-[#5D00FF] transition-colors"
          />
        </div>
      </header>

      <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide">
        {filters.map((filter) => {
          const color = getChipColor(filter);
          return (
            <button 
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`px-4 py-1.5 border rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                activeFilter === filter 
                  ? `${color.border} ${color.text} ${color.bg}` 
                  : 'border-[#222222] text-[#666666] hover:border-[#E4E3E0] hover:text-[#E4E3E0] bg-[#111111]'
              }`}
            >
              {filter}
            </button>
          );
        })}
      </div>

      <div className="mt-8">
        <h2 className="text-sm font-medium text-[#666666] mb-4">
          {searchQuery ? 'Search Results' : 'Recommended Rooms'}
        </h2>
        
        {isLoading ? (
          <div className="flex justify-center py-10">
            <Disc3 size={32} className="text-[#5D00FF] animate-[spin_4s_linear_infinite]" />
          </div>
        ) : filteredRooms.length === 0 ? (
          <div className="text-center py-10 text-[#666666]">
            <p className="text-sm">No rooms found.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredRooms.map((room) => (
              <div 
                key={room.id} 
                onClick={() => handleRoomClick(room)}
                className="hover-gradient-border rounded-xl p-5 bg-[#111111] transition-colors cursor-pointer group"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-xl font-bold tracking-tight  transition-colors truncate">
                        {room.name}
                      </h3>
                      {room.isPrivate && (
                        <Lock size={16} className="text-[#666666] flex-shrink-0" />
                      )}
                    </div>
                    <p 
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/user/${room.creatorId}`);
                      }}
                      className="text-[#666666] text-xs mt-1 font-medium hover:text-[#E4E3E0] transition-colors inline-block cursor-pointer"
                    >
                      By <span className="font-mono">@{room.creatorName?.toLowerCase()?.replace(/\s+/g, '_') || 'unknown'}</span>
                    </p>
                    {room.description && (
                      <p className="text-[#E4E3E0] text-sm mt-3 line-clamp-2">
                        {room.description}
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="flex justify-between items-end mt-2">
                  <div className="flex gap-2 flex-wrap">
                    {room.tags?.map((tag: string) => {
                      const color = getChipColor(tag);
                      return (
                        <span key={tag} className={`px-2.5 py-1 ${color.bg} rounded-xl text-[10px] font-medium ${color.text}`}>#{tag}</span>
                      );
                    })}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full border-2 border-[#111111] bg-[#222222] flex items-center justify-center text-[10px] font-medium text-[#E4E3E0]">
                      {room.likes || 0}
                    </div>
                    <span className="text-xs text-[#666666] font-medium">Likes</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Join Private Room Modal */}
      {isJoinModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#111111] border border-[#222222] rounded-xl w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#5D00FF]/10 flex items-center justify-center">
                  <Lock size={20} className="text-[#5D00FF]" />
                </div>
                <div>
                  <h2 className="text-xl font-bold tracking-tight">Private Room</h2>
                  <p className="text-xs text-[#666666]">Enter invite code to join</p>
                </div>
              </div>
              <button 
                onClick={() => setIsJoinModalOpen(false)}
                className="p-2 text-[#666666] hover:text-[#E4E3E0] transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#666666] mb-2 font-mono">
                  Invite Code
                </label>
                <input 
                  type="text"
                  value={inviteCode}
                  onChange={(e) => {
                    setInviteCode(e.target.value);
                    setError("");
                  }}
                  placeholder="JR-XXXX"
                  className="w-full bg-[#0A0A0A] border border-[#222222] rounded-xl p-4 text-lg font-bold tracking-widest text-[#5D00FF] placeholder:text-[#333333] focus:border-[#5D00FF] focus:outline-none transition-colors text-center"
                />
                {error && (
                  <p className="text-xs text-[#FF3366] mt-2 font-medium">{error}</p>
                )}
              </div>

              <button 
                onClick={handleJoinPrivate}
                disabled={!inviteCode.trim()}
                className="w-full bg-[#5D00FF] text-white font-bold py-4 rounded-xl hover:bg-[#4A00CC] transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-2"
              >
                Join Room
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
