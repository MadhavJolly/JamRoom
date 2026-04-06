import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Disc3, Heart, Lock } from "lucide-react";
import { doc, getDoc, collection, query, where, onSnapshot, updateDoc, arrayUnion, arrayRemove, setDoc, serverTimestamp } from "firebase/firestore";
import { db, auth } from "../firebase";

import { getChipColor } from "../utils/colors";

export default function PublicProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [user, setUser] = useState<any>(null);
  const [createdRooms, setCreatedRooms] = useState<any[]>([]);
  const [likedRooms, setLikedRooms] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'created' | 'liked'>('created');
  
  // Follow state
  const [isFollowing, setIsFollowing] = useState(false);
  const [currentUserData, setCurrentUserData] = useState<any>(null);

  useEffect(() => {
    if (!id) return;

    // Fetch public user profile
    const userRef = doc(db, "users", id);
    const unsubscribeUser = onSnapshot(userRef, async (docSnap) => {
      if (docSnap.exists()) {
        const userData = docSnap.data();
        setUser(userData);
        
        // Fetch liked rooms details
        const likedRoomIds = userData.likedRooms || [];
        if (likedRoomIds.length > 0) {
          const likedRoomsData: any[] = [];
          for (const roomId of likedRoomIds) {
            const roomRef = doc(db, "rooms", roomId);
            const roomSnap = await getDoc(roomRef);
            if (roomSnap.exists()) {
              const roomData = roomSnap.data();
              // Only show public rooms or rooms they created
              if (!roomData.isPrivate || roomData.creatorId === auth.currentUser?.uid) {
                likedRoomsData.push({ id: roomSnap.id, ...roomData });
              }
            }
          }
          likedRoomsData.sort((a, b) => {
            const timeA = a.createdAt ? (a.createdAt.toMillis ? a.createdAt.toMillis() : new Date(a.createdAt).getTime()) : Date.now();
            const timeB = b.createdAt ? (b.createdAt.toMillis ? b.createdAt.toMillis() : new Date(b.createdAt).getTime()) : Date.now();
            return timeB - timeA;
          });
          setLikedRooms(likedRoomsData);
        } else {
          setLikedRooms([]);
        }
      } else {
        navigate('/');
      }
      setIsLoading(false);
    });

    // Fetch created rooms
    const createdQuery = query(collection(db, "rooms"), where("creatorId", "==", id));
    const unsubscribeCreated = onSnapshot(createdQuery, (snapshot) => {
      const rooms: any[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        // Only show public rooms
        if (!data.isPrivate) {
          rooms.push({ id: doc.id, ...data });
        }
      });
      
      rooms.sort((a, b) => {
        const timeA = a.createdAt ? (a.createdAt.toMillis ? a.createdAt.toMillis() : new Date(a.createdAt).getTime()) : Date.now();
        const timeB = b.createdAt ? (b.createdAt.toMillis ? b.createdAt.toMillis() : new Date(b.createdAt).getTime()) : Date.now();
        return timeB - timeA;
      });
      
      setCreatedRooms(rooms);
    });

    // Fetch current user data to check follow status
    let unsubscribeCurrentUser = () => {};
    if (auth.currentUser) {
      const currentUserRef = doc(db, "users", auth.currentUser.uid);
      unsubscribeCurrentUser = onSnapshot(currentUserRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setCurrentUserData(data);
          setIsFollowing(data.following?.includes(id) || false);
        }
      });
    }

    return () => {
      unsubscribeUser();
      unsubscribeCreated();
      unsubscribeCurrentUser();
    };
  }, [id, navigate]);

  const handleToggleFollow = async () => {
    if (!auth.currentUser || !id) return;

    try {
      const currentUserRef = doc(db, "users", auth.currentUser.uid);
      const targetUserRef = doc(db, "users", id);

      if (isFollowing) {
        await updateDoc(currentUserRef, { following: arrayRemove(id) });
        await updateDoc(targetUserRef, { followers: arrayRemove(auth.currentUser.uid) });
      } else {
        await updateDoc(currentUserRef, { following: arrayUnion(id) });
        await updateDoc(targetUserRef, { followers: arrayUnion(auth.currentUser.uid) });
      }
    } catch (error) {
      console.error("Error toggling follow:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <Disc3 size={32} className="text-[#CCFF00] animate-[spin_4s_linear_infinite]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col font-sans pb-24 md:pb-6">
      <header className="sticky top-0 bg-[#0A0A0A]/90 backdrop-blur-md border-b border-[#222222] p-4 z-10 flex items-center">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-[#666666] hover:text-[#E4E3E0] transition-colors rounded-full hover:bg-[#111111]">
          <ArrowLeft size={24} />
        </button>
      </header>

      <div className="p-6">
        <div className="flex justify-between items-start mb-6">
          <div>
            <div className="w-24 h-24 bg-[#222222] rounded-full mb-4 border-2 border-[#222222] overflow-hidden">
              <img src={`https://picsum.photos/seed/${user?.name || id}/200/200`} alt="Profile" className="w-full h-full object-cover" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">{user?.name || 'Unknown'}</h1>
            <p className="text-[#666666] text-sm font-medium mt-1">@{user?.name?.toLowerCase()?.replace(/\s+/g, '_') || 'unknown'}</p>
          </div>
          
          {auth.currentUser && auth.currentUser.uid !== id && (
            <div className="flex flex-col gap-2">
              <button 
                onClick={handleToggleFollow}
                className={`px-6 py-2 rounded-full font-bold text-sm transition-colors ${
                  isFollowing 
                    ? 'bg-[#111111] border border-[#222222] text-[#E4E3E0] hover:border-[#CCFF00]' 
                    : 'bg-[#CCFF00] text-[#0A0A0A] hover:bg-[#b3e600]'
                }`}
              >
                {isFollowing ? 'Following' : 'Follow'}
              </button>
              <button 
                onClick={async () => {
                  if (!auth.currentUser || !id) return;
                  try {
                    // Check if conversation exists
                    const convId1 = `${auth.currentUser.uid}_${id}`;
                    const convId2 = `${id}_${auth.currentUser.uid}`;
                    
                    const conv1Ref = doc(db, "conversations", convId1);
                    const conv2Ref = doc(db, "conversations", convId2);
                    
                    const [doc1, doc2] = await Promise.all([getDoc(conv1Ref), getDoc(conv2Ref)]);
                    
                    if (doc1.exists()) {
                      navigate(`/messages/${convId1}`);
                    } else if (doc2.exists()) {
                      navigate(`/messages/${convId2}`);
                    } else {
                      // Create new conversation
                      await setDoc(conv1Ref, {
                        id: convId1,
                        participants: [auth.currentUser.uid, id],
                        updatedAt: serverTimestamp()
                      });
                      navigate(`/messages/${convId1}`);
                    }
                  } catch (e) {
                    console.error("Error creating conversation", e);
                  }
                }}
                className="px-6 py-2 rounded-full font-bold text-sm transition-colors bg-[#222222] text-[#E4E3E0] hover:bg-[#333333]"
              >
                Message
              </button>
            </div>
          )}
        </div>

        <p className="text-[#E4E3E0] mb-8 text-sm leading-relaxed max-w-sm">
          {user?.bio || "No bio yet."}
        </p>

        <div className="flex gap-6 mb-8">
          <div className="flex flex-col">
            <span className="font-bold text-2xl tracking-tight">{user?.followers?.length || 0}</span>
            <span className="text-[#666666] text-xs font-medium mt-1">Followers</span>
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-2xl tracking-tight">{user?.following?.length || 0}</span>
            <span className="text-[#666666] text-xs font-medium mt-1">Following</span>
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-2xl tracking-tight">{createdRooms.length}</span>
            <span className="text-[#666666] text-xs font-medium mt-1">Rooms</span>
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
        <div className="space-y-4">
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
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-end mt-2">
                    <div className="flex gap-2 flex-wrap">
                      {room.tags?.map((tag: string) => {
                        const color = getChipColor(tag);
                        return (
                          <span key={tag} className={`px-2.5 py-1 ${color.bg} rounded-md text-[10px] font-medium ${color.text}`}>#{tag}</span>
                        );
                      })}
                      {(!room.tags || room.tags.length === 0) && (
                        <span className={`px-2.5 py-1 ${getChipColor('jamroom').bg} rounded-md text-[10px] font-medium ${getChipColor('jamroom').text}`}>#jamroom</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full border-2 border-[#111111] bg-[#222222] flex items-center justify-center text-[10px] font-medium text-[#E4E3E0]">
                        {room.likes || 0}
                      </div>
                      <span className="text-xs text-[#666666] font-medium">Likes</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12 border border-dashed border-[#222222] rounded-md bg-[#111111]/50">
                <p className="text-[#E4E3E0] font-medium">No public rooms yet</p>
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
                        <div className="flex items-center gap-2">
                          <h3 className="text-xl font-bold tracking-tight group-hover:text-[#9146FF] transition-colors">{room.name}</h3>
                          {room.isPrivate && <Lock size={14} className="text-[#666666]" />}
                        </div>
                        <p 
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/user/${room.creatorId}`);
                          }}
                          className="text-[#666666] text-xs mt-1 font-medium hover:text-[#E4E3E0] transition-colors cursor-pointer inline-block"
                        >
                          By @{room.creatorName?.toLowerCase()?.replace(/\s+/g, '_') || 'unknown'}
                        </p>
                      </div>
                    </div>
                    <Heart size={20} className="fill-[#9146FF] text-[#9146FF]" />
                  </div>
                  
                  <div className="flex justify-between items-end mt-2">
                    <div className="flex gap-2 flex-wrap">
                      {room.tags?.map((tag: string) => {
                        const color = getChipColor(tag);
                        return (
                          <span key={tag} className={`px-2.5 py-1 ${color.bg} rounded-md text-[10px] font-medium ${color.text}`}>#{tag}</span>
                        );
                      })}
                      {(!room.tags || room.tags.length === 0) && (
                        <span className={`px-2.5 py-1 ${getChipColor('jamroom').bg} rounded-md text-[10px] font-medium ${getChipColor('jamroom').text}`}>#jamroom</span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12 border border-dashed border-[#222222] rounded-md bg-[#111111]/50">
                <p className="text-[#E4E3E0] font-medium">No liked rooms visible</p>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
