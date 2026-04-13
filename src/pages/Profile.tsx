import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Settings, X, Heart, Edit2, Disc3 } from "lucide-react";
import { signOut } from "firebase/auth";
import { doc, getDoc, updateDoc, collection, query, where, onSnapshot, arrayRemove, arrayUnion, increment, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../firebase";

import { getChipColor } from "../utils/colors";

import { toast } from 'sonner';

export default function Profile() {
  const navigate = useNavigate();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'created' | 'liked'>('created');
  
  const [likedRooms, setLikedRooms] = useState<any[]>([]);
  const [createdRooms, setCreatedRooms] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Edit Profile State
  const [editName, setEditName] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editNameColor, setEditNameColor] = useState("#E4E3E0");
  const [editError, setEditError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      if (auth.currentUser) {
        const userRef = doc(db, "users", auth.currentUser.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const userData = userSnap.data();
          setUser(userData);
          setEditName(userData.name || "");
          setEditBio(userData.bio || "");
          setEditNameColor(userData.nameColor || "#E4E3E0");
        }
      }
    };
    fetchUser();
  }, []);

  useEffect(() => {
    if (!auth.currentUser) return;

    // Fetch created rooms
    const createdQuery = query(collection(db, "rooms"), where("creatorId", "==", auth.currentUser.uid));
    const unsubscribeCreated = onSnapshot(createdQuery, (snapshot) => {
      const rooms: any[] = [];
      snapshot.forEach((doc) => rooms.push({ id: doc.id, ...doc.data() }));
      
      // Sort locally to handle both Timestamp and ISO string formats
      rooms.sort((a, b) => {
        const timeA = a.createdAt ? (a.createdAt.toMillis ? a.createdAt.toMillis() : new Date(a.createdAt).getTime()) : Date.now();
        const timeB = b.createdAt ? (b.createdAt.toMillis ? b.createdAt.toMillis() : new Date(b.createdAt).getTime()) : Date.now();
        return timeB - timeA;
      });
      
      setCreatedRooms(rooms);
    }, (error) => {
      console.error("Error fetching created rooms:", error);
    });

    // Fetch liked rooms
    const userRef = doc(db, "users", auth.currentUser.uid);
    const unsubscribeUser = onSnapshot(userRef, async (docSnap) => {
      if (docSnap.exists()) {
        const likedRoomIds = docSnap.data().likedRooms || [];
        
        if (likedRoomIds.length === 0) {
          setLikedRooms([]);
          setIsLoading(false);
          return;
        }

        // Fetch details for each liked room
        const likedRoomsData: any[] = [];
        for (const roomId of likedRoomIds) {
          const roomRef = doc(db, "rooms", roomId);
          const roomSnap = await getDoc(roomRef);
          if (roomSnap.exists()) {
            likedRoomsData.push({ id: roomSnap.id, ...roomSnap.data() });
          }
        }
        
        // Sort locally
        likedRoomsData.sort((a, b) => {
          const timeA = a.createdAt ? (a.createdAt.toMillis ? a.createdAt.toMillis() : new Date(a.createdAt).getTime()) : Date.now();
          const timeB = b.createdAt ? (b.createdAt.toMillis ? b.createdAt.toMillis() : new Date(b.createdAt).getTime()) : Date.now();
          return timeB - timeA;
        });
        
        setLikedRooms(likedRoomsData);
      }
      setIsLoading(false);
    });

    return () => {
      unsubscribeCreated();
      unsubscribeUser();
    };
  }, []);

  const handleToggleLike = async (e: React.MouseEvent, room: any) => {
    e.stopPropagation();
    if (!auth.currentUser || !user) return;

    const isLiked = user.likedRooms?.includes(room.id);

    try {
      const userRef = doc(db, "users", auth.currentUser.uid);
      const roomRef = doc(db, "rooms", room.id);
      
      if (isLiked) {
        await updateDoc(userRef, { likedRooms: arrayRemove(room.id) });
        await updateDoc(roomRef, { likes: increment(-1) });
        toast.success("Room unliked");
      } else {
        await updateDoc(userRef, { likedRooms: arrayUnion(room.id) });
        await updateDoc(roomRef, { likes: increment(1) });
        toast.success("Room liked");
        
        if (room.creatorId !== auth.currentUser.uid) {
          const notifRef = doc(collection(db, "notifications"));
          await setDoc(notifRef, {
            id: notifRef.id,
            userId: room.creatorId,
            actorId: auth.currentUser.uid,
            actorName: user.name || "Someone",
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

  const handleLogout = async () => {
    try {
      await signOut(auth);
      window.location.href = "/";
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  const handleSaveProfile = async () => {
    setEditError("");
    if (!editName.trim()) {
      setEditError("Display name is required.");
      return;
    }
    if (auth.currentUser) {
      setIsSaving(true);
      try {
        const userRef = doc(db, "users", auth.currentUser.uid);
        await updateDoc(userRef, {
          name: editName,
          bio: editBio,
          nameColor: editNameColor
        });
        setUser({ ...user, name: editName, bio: editBio, nameColor: editNameColor });
        setIsEditProfileOpen(false);
        toast.success("Profile updated successfully");
      } catch (error) {
        console.error("Error updating profile:", error);
        setEditError("Failed to update profile.");
        toast.error("Failed to update profile");
      } finally {
        setIsSaving(false);
      }
    }
  };

  return (
    <div className="p-6 font-sans pb-24 md:pb-6 h-full flex flex-col">
      <header className="flex justify-between items-start mb-8 pt-4">
        <div>
          <div className="w-24 h-24 bg-[#222222] rounded-full mb-4 border-2 border-[#9146FF] overflow-hidden relative group">
            <img src={`https://picsum.photos/seed/${auth.currentUser?.uid || 'user'}/200/200`} alt="Profile" className="w-full h-full object-cover" />
            <div 
              onClick={() => setIsEditProfileOpen(true)}
              className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
            >
              <Edit2 size={24} className="text-[#9146FF]" />
            </div>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">{user?.name || "Loading..."}</h1>
          <p className="text-[#9146FF] text-sm font-medium mt-1 font-mono">@{user?.name?.toLowerCase()?.replace(/\s+/g, '_') || "loading"}</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setIsEditProfileOpen(true)}
            className="p-2.5 border border-[#222222] rounded-full hover:bg-[#111111] transition-colors"
          >
            <Edit2 size={20} />
          </button>
          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="p-2.5 border border-[#222222] rounded-full hover:bg-[#111111] transition-colors"
          >
            <Settings size={20} />
          </button>
        </div>
      </header>

      <p className="text-[#E4E3E0] mb-8 text-sm leading-relaxed max-w-sm">
        {user?.bio || "No bio yet."}
      </p>

      <div className="flex gap-6 mb-8">
        <div className="flex flex-col">
          <span className="font-bold text-2xl tracking-tight font-mono">{user?.followers?.length || 0}</span>
          <span className="text-[#666666] text-xs font-medium mt-1 font-mono uppercase tracking-wider">Followers</span>
        </div>
        <div className="flex flex-col">
          <span className="font-bold text-2xl tracking-tight font-mono">{user?.following?.length || 0}</span>
          <span className="text-[#666666] text-xs font-medium mt-1 font-mono uppercase tracking-wider">Following</span>
        </div>
        <div className="flex flex-col">
          <span className="font-bold text-2xl tracking-tight font-mono">{createdRooms.length}</span>
          <span className="text-[#666666] text-xs font-medium mt-1 font-mono uppercase tracking-wider">Rooms</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-[#222222] mb-6">
        <button 
          onClick={() => setActiveTab('created')}
          className={`pb-3 text-sm font-medium transition-colors relative ${activeTab === 'created' ? 'text-[#E4E3E0]' : 'text-[#666666] hover:text-[#E4E3E0]'}`}
        >
          Created Rooms
          {activeTab === 'created' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#9146FF]" />}
        </button>
        <button 
          onClick={() => setActiveTab('liked')}
          className={`pb-3 text-sm font-medium transition-colors relative ${activeTab === 'liked' ? 'text-[#E4E3E0]' : 'text-[#666666] hover:text-[#E4E3E0]'}`}
        >
          Liked Rooms
          {activeTab === 'liked' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#9146FF]" />}
        </button>
      </div>

      {/* Tab Content */}
      {isLoading ? (
        <div className="flex justify-center py-10">
          <Disc3 size={32} className="text-[#9146FF] animate-[spin_4s_linear_infinite]" />
        </div>
      ) : (
        <div className="space-y-4 pb-24 md:pb-6">
          {activeTab === 'created' && (
            createdRooms.length > 0 ? (
              createdRooms.map((room) => (
                <div 
                  key={room.id} 
                  onClick={() => navigate(`/room/${room.id}`)}
                  className="hover-gradient-border rounded-xl p-5 bg-[#111111] transition-colors cursor-pointer group"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div>
                        <h3 className="text-xl font-bold tracking-tight group-hover:text-[#9146FF] transition-colors">{room.name}</h3>
                        <p className="text-[#666666] text-xs mt-1 font-medium">{room.isPrivate ? 'Private Room' : 'Public Room'}</p>
                        {room.description && (
                          <p className="text-[#E4E3E0] text-sm mt-3 line-clamp-2">
                            {room.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <button 
                      onClick={(e) => handleToggleLike(e, room)}
                      className="p-2 -mr-2 -mt-2 hover:scale-110 transition-transform z-10"
                    >
                      <Heart size={20} className={user?.likedRooms?.includes(room.id) ? "fill-[#9146FF] text-[#9146FF]" : "text-[#666666] hover:text-[#E4E3E0]"} />
                    </button>
                  </div>
                  
                  <div className="flex justify-between items-end mt-2">
                    <div className="flex gap-2 flex-wrap">
                      {room.tags?.map((tag: string) => {
                        const color = getChipColor(tag);
                        return (
                          <span key={tag} className={`px-2.5 py-1 ${color.bg} rounded-xl text-[10px] font-medium ${color.text}`}>#{tag}</span>
                        );
                      })}
                      {(!room.tags || room.tags.length === 0) && (
                        <span className={`px-2.5 py-1 ${getChipColor('jamroom').bg} rounded-xl text-[10px] font-medium ${getChipColor('jamroom').text}`}>#jamroom</span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12 border border-dashed border-[#222222] rounded-xl bg-[#111111]/50">
                <p className="text-[#E4E3E0] font-medium">No created rooms yet</p>
                <p className="text-[#666666] text-sm mt-1">Rooms you create will appear here.</p>
              </div>
            )
          )}

          {activeTab === 'liked' && (
            likedRooms.length > 0 ? (
              likedRooms.map((room) => (
                <div 
                  key={room.id} 
                  onClick={() => navigate(`/room/${room.id}`)}
                  className="hover-gradient-border rounded-xl p-5 bg-[#111111] transition-colors cursor-pointer group"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div>
                        <h3 className="text-xl font-bold tracking-tight group-hover:text-[#9146FF] transition-colors">{room.name}</h3>
                        <p 
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/user/${room.creatorId}`);
                          }}
                          className="text-[#666666] text-xs mt-1 font-medium hover:text-[#E4E3E0] transition-colors cursor-pointer inline-block"
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
                    <button 
                      onClick={(e) => handleToggleLike(e, room)}
                      className="p-2 -mr-2 -mt-2 hover:scale-110 transition-transform z-10"
                    >
                      <Heart size={20} className="fill-[#9146FF] text-[#9146FF]" />
                    </button>
                  </div>
                  
                  <div className="flex justify-between items-end mt-2">
                    <div className="flex gap-2 flex-wrap">
                      {room.tags?.map((tag: string) => {
                        const color = getChipColor(tag);
                        return (
                          <span key={tag} className={`px-2.5 py-1 ${color.bg} rounded-xl text-[10px] font-medium ${color.text}`}>#{tag}</span>
                        );
                      })}
                      {(!room.tags || room.tags.length === 0) && (
                        <span className={`px-2.5 py-1 ${getChipColor('jamroom').bg} rounded-xl text-[10px] font-medium ${getChipColor('jamroom').text}`}>#jamroom</span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12 border border-dashed border-[#222222] rounded-xl bg-[#111111]/50">
                <Heart size={32} className="mx-auto text-[#666666] mb-3" />
                <p className="text-[#E4E3E0] font-medium">No liked rooms yet</p>
                <p className="text-[#666666] text-sm mt-1">Rooms you like will appear here.</p>
              </div>
            )
          )}
        </div>
      )}

      {/* Edit Profile Modal */}
      {isEditProfileOpen && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-end sm:items-center justify-center sm:p-4 animate-in fade-in duration-200">
          <div className="bg-[#0A0A0A] border border-[#222222] w-full max-w-md p-6 rounded-t-xl sm:rounded-xl animate-in slide-in-from-bottom-10 sm:slide-in-from-bottom-0 duration-200">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-bold tracking-tight">Edit Profile</h2>
              <button onClick={() => setIsEditProfileOpen(false)} className="text-[#666666] hover:text-[#E4E3E0] p-1 rounded-full hover:bg-[#111111] transition-colors">
                <X size={24} />
              </button>
            </div>

            <div className="space-y-6">
              {editError && <p className="text-red-500 text-sm text-center bg-red-500/10 p-2 rounded-lg">{editError}</p>}
              <div className="flex justify-center mb-6">
                <div className="w-24 h-24 bg-[#222222] rounded-full border-2 border-[#9146FF] overflow-hidden relative group cursor-pointer">
                  <img src={`https://picsum.photos/seed/${auth.currentUser?.uid || 'user'}/200/200`} alt="Profile" className="w-full h-full object-cover opacity-50" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Edit2 size={24} className="text-[#9146FF]" />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[#666666] text-xs font-medium uppercase tracking-wider mb-2 font-mono">Display Name</label>
                <input 
                  type="text" 
                  value={editName}
                  onChange={(e) => {
                    setEditName(e.target.value);
                    if (editError) setEditError("");
                  }}
                  className={`w-full bg-[#111111] border ${editError ? 'border-red-500' : 'border-[#222222]'} text-[#E4E3E0] p-4 rounded-xl focus:outline-none focus:border-[#9146FF] transition-colors`}
                />
              </div>

              <div>
                <label className="block text-[#666666] text-xs font-medium uppercase tracking-wider mb-2 font-mono">Bio</label>
                <textarea 
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  rows={3}
                  className="w-full bg-[#111111] border border-[#222222] text-[#E4E3E0] p-4 rounded-xl focus:outline-none focus:border-[#9146FF] transition-colors resize-none"
                />
              </div>

              <div>
                <label className="block text-[#666666] text-xs font-medium uppercase tracking-wider mb-2 font-mono">Chat Name Color</label>
                <div className="flex items-center gap-4 bg-[#111111] border border-[#222222] p-4 rounded-xl">
                  <input 
                    type="color" 
                    value={editNameColor}
                    onChange={(e) => setEditNameColor(e.target.value)}
                    className="w-8 h-8 rounded cursor-pointer bg-transparent border-none p-0"
                  />
                  <span className="text-[#E4E3E0] font-medium" style={{ color: editNameColor }}>
                    {editName}
                  </span>
                </div>
              </div>

              <button 
                onClick={handleSaveProfile}
                disabled={isSaving}
                className="w-full bg-[#9146FF] text-white font-bold py-4 rounded-xl hover:bg-[#772ce8] transition-colors mt-4 disabled:opacity-50"
              >
                {isSaving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-end sm:items-center justify-center sm:p-4 animate-in fade-in duration-200">
          <div className="bg-[#0A0A0A] border border-[#222222] w-full max-w-md p-6 rounded-t-xl sm:rounded-xl animate-in slide-in-from-bottom-10 sm:slide-in-from-bottom-0 duration-200">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
              <button onClick={() => setIsSettingsOpen(false)} className="text-[#666666] hover:text-[#E4E3E0] p-1 rounded-full hover:bg-[#111111] transition-colors">
                <X size={24} />
              </button>
            </div>

            <div className="space-y-8">
              <div>
                <h3 className="text-xs font-medium text-[#666666] uppercase tracking-wider mb-4 font-mono">Account</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center border-b border-[#222222] pb-4">
                    <span className="text-sm font-medium">Email</span>
                    <span className="text-[#666666] text-sm">{user?.email || "alex@example.com"}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-[#222222] pb-4">
                    <span className="text-sm font-medium">Password</span>
                    <button className="text-[#9146FF] text-xs font-medium border border-[#9146FF] px-3 py-1.5 rounded-xl hover:bg-[#9146FF]/10 transition-colors">Change</button>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xs font-medium text-[#666666] uppercase tracking-wider mb-4 font-mono">Appearance</h3>
                <div className="flex gap-2">
                  <button className="flex-1 py-2.5 rounded-xl border border-[#9146FF] text-[#9146FF] bg-[#9146FF]/10 text-xs font-medium">Dark</button>
                  <button className="flex-1 py-2.5 rounded-xl border border-[#222222] text-[#666666] hover:border-[#E4E3E0] bg-[#111111] text-xs font-medium">Pitch Black</button>
                </div>
              </div>

              <button 
                onClick={handleLogout}
                className="w-full border border-red-500/50 text-red-500 font-bold py-4 rounded-xl hover:bg-red-500/10 transition-colors mt-8"
              >
                Log Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
