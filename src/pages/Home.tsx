import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Heart, Disc3, Lock, X, Bell } from "lucide-react";
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, increment, getDoc, arrayUnion, arrayRemove, setDoc, serverTimestamp } from "firebase/firestore";
import { db, auth } from "../firebase";

import { getChipColor } from "../utils/colors";

import { toast } from 'sonner';

export default function Home() {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<any[]>([]);
  const [likedRooms, setLikedRooms] = useState<string[]>([]);
  const [following, setFollowing] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(false);
  const [filter, setFilter] = useState<'new' | 'trending' | 'following'>('new');
  
  // Private Room Access State
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [selectedPrivateRoom, setSelectedPrivateRoom] = useState<any>(null);
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState("");

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

  useEffect(() => {
    // Fetch current user's liked rooms and unread notifications
    let unsubscribeUser: () => void;
    let unsubscribeNotifications: () => void;
    
    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (user) {
        const userRef = doc(db, "users", user.uid);
        unsubscribeUser = onSnapshot(userRef, (docSnap) => {
          if (docSnap.exists()) {
            setLikedRooms(docSnap.data().likedRooms || []);
            setFollowing(docSnap.data().following || []);
          }
        });
        
        const notifQuery = query(
          collection(db, "notifications"),
          where("userId", "==", user.uid),
          where("read", "==", false)
        );
        unsubscribeNotifications = onSnapshot(notifQuery, (snapshot) => {
          setHasUnreadNotifications(!snapshot.empty);
        });
      } else {
        if (unsubscribeUser) unsubscribeUser();
        if (unsubscribeNotifications) unsubscribeNotifications();
      }
    });
    return () => {
      unsubscribeAuth();
      if (unsubscribeUser) unsubscribeUser();
      if (unsubscribeNotifications) unsubscribeNotifications();
    };
  }, []);

  const toggleLike = async (e: React.MouseEvent, room: any) => {
    e.stopPropagation();
    if (!auth.currentUser) return;

    const userRef = doc(db, "users", auth.currentUser.uid);
    const roomRef = doc(db, "rooms", room.id);
    
    const isLiked = likedRooms.includes(room.id);

    try {
      if (isLiked) {
        await updateDoc(userRef, { likedRooms: arrayRemove(room.id) });
        await updateDoc(roomRef, { likes: increment(-1) });
        toast.success("Room unliked");
      } else {
        await updateDoc(userRef, { likedRooms: arrayUnion(room.id) });
        await updateDoc(roomRef, { likes: increment(1) });
        toast.success("Room liked");
        
        // Create notification if liking someone else's room
        if (room.creatorId !== auth.currentUser.uid) {
          const currentUserDoc = await getDoc(userRef);
          const currentUserName = currentUserDoc.exists() ? currentUserDoc.data().name : "Someone";
          
          const notifRef = doc(collection(db, "notifications"));
          await setDoc(notifRef, {
            id: notifRef.id,
            userId: room.creatorId,
            actorId: auth.currentUser.uid,
            actorName: currentUserName,
            type: "like",
            targetId: room.id,
            targetName: room.name,
            read: false,
            createdAt: serverTimestamp()
          });
        }
      }
    } catch (error) {
      console.error("Error toggling like:", error);
      toast.error("Failed to update like status");
    }
  };

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

  const displayedRooms = [...rooms]
    .filter(room => {
      if (filter === 'following') {
        return following.includes(room.creatorId);
      }
      return true;
    })
    .sort((a, b) => {
      if (filter === 'trending') {
        return (b.likes || 0) - (a.likes || 0);
      }
      // 'new' or 'following' default to newest first
      const timeA = a.createdAt ? (a.createdAt.toMillis ? a.createdAt.toMillis() : new Date(a.createdAt).getTime()) : 0;
      const timeB = b.createdAt ? (b.createdAt.toMillis ? b.createdAt.toMillis() : new Date(b.createdAt).getTime()) : 0;
      return timeB - timeA;
    });

  return (
    <div className="p-6 font-sans">
      <header className="mb-6 pt-4 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">The Feed</h1>
          <p className="text-[#666666] text-sm">Curated underground sounds.</p>
        </div>
        <button 
          onClick={() => navigate('/activity')}
          className="p-2 border border-[#222222] rounded-full hover:bg-[#111111] transition-colors relative"
        >
          <Bell size={20} className="text-[#E4E3E0]" />
          {hasUnreadNotifications && (
            <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-[#9146FF] border-2 border-[#0A0A0A] rounded-full"></span>
          )}
        </button>
      </header>

      <div className="flex gap-4 mb-6 border-b border-[#222222]">
        <button 
          onClick={() => setFilter('new')}
          className={`pb-3 text-sm font-medium transition-colors relative ${filter === 'new' ? 'text-[#E4E3E0]' : 'text-[#666666] hover:text-[#E4E3E0]'}`}
        >
          New
          {filter === 'new' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#9146FF]" />}
        </button>
        <button 
          onClick={() => setFilter('trending')}
          className={`pb-3 text-sm font-medium transition-colors relative ${filter === 'trending' ? 'text-[#E4E3E0]' : 'text-[#666666] hover:text-[#E4E3E0]'}`}
        >
          Trending
          {filter === 'trending' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#9146FF]" />}
        </button>
        <button 
          onClick={() => setFilter('following')}
          className={`pb-3 text-sm font-medium transition-colors relative ${filter === 'following' ? 'text-[#E4E3E0]' : 'text-[#666666] hover:text-[#E4E3E0]'}`}
        >
          Following
          {filter === 'following' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#9146FF]" />}
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Disc3 size={48} className="text-[#9146FF] animate-[spin_4s_linear_infinite]" />
        </div>
      ) : displayedRooms.length === 0 ? (
        <div className="text-center py-20 text-[#666666]">
          <p className="text-lg font-medium">No rooms found.</p>
          <p className="text-sm mt-2">Try a different filter or create a new room!</p>
        </div>
      ) : (
        <div className="space-y-4 pb-24 md:pb-6">
          {displayedRooms.map((room) => (
            <div 
              key={room.id} 
              onClick={() => handleRoomClick(room)}
              className="hover-gradient-border rounded-xl p-5 bg-[#111111] transition-colors cursor-pointer group"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-bold tracking-tight group-hover:text-[#9146FF] transition-colors truncate">
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
                <button 
                  onClick={(e) => toggleLike(e, room)}
                  className="p-2 -mr-2 -mt-2 hover:scale-110 transition-transform"
                >
                  <Heart 
                    size={20} 
                    className={likedRooms.includes(room.id) ? "fill-[#9146FF] text-[#9146FF]" : "text-[#666666] hover:text-[#E4E3E0]"} 
                  />
                </button>
              </div>
              
              <div className="flex justify-between items-end mt-6">
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

      {/* Join Private Room Modal */}
      {isJoinModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#111111] border border-[#222222] rounded-xl w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#9146FF]/10 flex items-center justify-center">
                  <Lock size={20} className="text-[#9146FF]" />
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
                  className="w-full bg-[#0A0A0A] border border-[#222222] rounded-xl p-4 text-lg font-bold tracking-widest text-[#9146FF] placeholder:text-[#333333] focus:border-[#9146FF] focus:outline-none transition-colors text-center"
                />
                {error && (
                  <p className="text-xs text-[#FF3366] mt-2 font-medium">{error}</p>
                )}
              </div>

              <button 
                onClick={handleJoinPrivate}
                disabled={!inviteCode.trim()}
                className="w-full bg-[#9146FF] text-white font-bold py-4 rounded-xl hover:bg-[#772ce8] transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-2"
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
