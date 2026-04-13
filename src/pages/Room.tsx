import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Play, Share2, Plus, Search as SearchIcon, X, Check, Disc3, MoreVertical, ExternalLink, Trash2, Settings, GripVertical, MessageSquare, Send, Copy, Heart } from "lucide-react";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { collection, doc, getDoc, onSnapshot, query, orderBy, addDoc, updateDoc, deleteDoc, serverTimestamp, setDoc, arrayUnion, arrayRemove, getDocs, writeBatch } from "firebase/firestore";
import { auth, db } from "../firebase";
import { useRoomContext } from "../RoomContext";

interface Track {
  id: string;
  title: string;
  artist: string;
  platform: string;
  url: string;
  addedBy: string;
  addedByName?: string;
  addedAt?: any;
  order: number;
  image?: string;
  reactions?: Record<string, string[]>;
}

interface Message {
  id: string;
  userId: string;
  userName: string;
  text: string;
  createdAt: any;
}

function formatTimeAgo(timestamp: any) {
  if (!timestamp) return '';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  
  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + "y";
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + "mo";
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + "d";
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + "h";
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + "m";
  return Math.floor(seconds) + "s";
}

const SortableTrackItem: React.FC<{ track: Track, onSelect: (t: Track) => void, isCreator: boolean, roomId: string }> = ({ track, onSelect, isCreator, roomId }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: track.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style}
      className={`flex items-center gap-4 p-3 border border-[#222222] bg-[#111111] rounded-xl hover-gradient-border transition-colors group ${isDragging ? 'opacity-50 border-[#9146FF]' : ''}`}
    >
      {isCreator && (
        <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-[#666666] hover:text-[#E4E3E0] p-1 -ml-2">
          <GripVertical size={16} />
        </div>
      )}
      
      <div 
        onClick={() => onSelect(track)}
        className="w-12 h-12 bg-[#222222] rounded-xl flex-shrink-0 relative flex items-center justify-center overflow-hidden cursor-pointer"
      >
        {track.image ? (
          <img src={track.image} alt="Album art" className="absolute inset-0 w-full h-full object-cover opacity-60" referrerPolicy="no-referrer" />
        ) : (
          <img src={`https://picsum.photos/seed/track${track.id}/100/100`} alt="Album art" className="absolute inset-0 w-full h-full object-cover opacity-60" referrerPolicy="no-referrer" />
        )}
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <Play size={20} className="text-[#9146FF] ml-1" />
        </div>
      </div>
      
      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onSelect(track)}>
        <h4 className="font-semibold truncate text-sm">{track.title}</h4>
        <p className="text-[#666666] text-xs truncate mt-0.5">{track.artist}</p>
      </div>
      
      <div className="flex items-center gap-3 mr-2 relative">
        {/* Active Reactions */}
        <div className="flex items-center gap-1">
          {['🔥', '❤️', '👀', '🗑️'].map(emoji => {
            const count = track.reactions?.[emoji]?.length || 0;
            const hasReacted = auth.currentUser && track.reactions?.[emoji]?.includes(auth.currentUser.uid);
            if (count === 0) return null;
            return (
              <button
                key={emoji}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!auth.currentUser) return;
                  const trackRef = doc(db, "rooms", roomId, "tracks", track.id);
                  if (hasReacted) {
                    updateDoc(trackRef, {
                      [`reactions.${emoji}`]: arrayRemove(auth.currentUser.uid)
                    });
                  } else {
                    updateDoc(trackRef, {
                      [`reactions.${emoji}`]: arrayUnion(auth.currentUser.uid)
                    });
                  }
                }}
                className={`px-2 py-1 rounded-full text-xs flex items-center gap-1 transition-colors ${hasReacted ? 'bg-[#222222] border border-[#9146FF]' : 'bg-[#111111] border border-[#222222] hover:bg-[#222222]'}`}
              >
                <span>{emoji}</span>
                <span className="text-[#E4E3E0] font-mono">{count}</span>
              </button>
            );
          })}
        </div>

        {/* Floating Reaction Bar (appears on hover) */}
        <div className="absolute right-full mr-2 top-1/2 -translate-y-1/2 flex items-center gap-1 bg-[#111111]/80 backdrop-blur-md border border-[#333333] p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-200 translate-x-2 group-hover:translate-x-0 pointer-events-none group-hover:pointer-events-auto z-20 shadow-xl">
          {['🔥', '❤️', '👀', '🗑️'].map(emoji => {
            const hasReacted = auth.currentUser && track.reactions?.[emoji]?.includes(auth.currentUser.uid);
            return (
              <button
                key={`picker-${emoji}`}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!auth.currentUser) return;
                  const trackRef = doc(db, "rooms", roomId, "tracks", track.id);
                  if (hasReacted) {
                    updateDoc(trackRef, {
                      [`reactions.${emoji}`]: arrayRemove(auth.currentUser.uid)
                    });
                  } else {
                    updateDoc(trackRef, {
                      [`reactions.${emoji}`]: arrayUnion(auth.currentUser.uid)
                    });
                  }
                }}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm hover:scale-125 transition-transform ${hasReacted ? 'bg-[#333333]' : 'hover:bg-[#222222]'}`}
              >
                {emoji}
              </button>
            );
          })}
        </div>

        {track.platform && (
          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-xl ${getChipColor(track.platform).bg} ${getChipColor(track.platform).text}`}>
            {track.platform}
          </span>
        )}
        <div className="flex items-center gap-2">
          {track.addedAt && (
            <span className="text-[10px] text-[#666666] font-medium hidden sm:inline-block">
              {formatTimeAgo(track.addedAt)}
            </span>
          )}
          <div className="w-6 h-6 rounded-full bg-[#222222] overflow-hidden" title={`Added by ${track.addedByName || 'User'}`}>
            <img src={`https://picsum.photos/seed/${track.addedBy}/100/100`} alt="User" className="w-full h-full object-cover" />
          </div>
        </div>
        <button onClick={() => onSelect(track)} className="p-2 text-[#666666] hover:text-[#E4E3E0] transition-colors -mr-2">
          <MoreVertical size={18} />
        </button>
      </div>
    </div>
  );
}

const renderMessageText = (text: string) => {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  return parts.map((part, i) => {
    if (part.match(urlRegex)) {
      return (
        <a 
          key={i} 
          href={part} 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-[#9146FF] hover:underline break-all"
        >
          {part}
        </a>
      );
    }
    return <span key={i}>{part}</span>;
  });
};

import { getChipColor } from '../utils/colors';
import { toast } from 'sonner';

export default function Room() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isPrivate = id === 'new';
  
  const [room, setRoom] = useState<any>(null);
  const [isCreator, setIsCreator] = useState(false);
  const [isModerator, setIsModerator] = useState(false);
  const [canAddTrack, setCanAddTrack] = useState(false);
  const [canModerate, setCanModerate] = useState(false);
  
  const [activeTab, setActiveTab] = useState<'tracks' | 'chat' | 'users'>('tracks');
  const [isAddTrackOpen, setIsAddTrackOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  const [addedTracks, setAddedTracks] = useState<string[]>([]);
  const [isFetchingLink, setIsFetchingLink] = useState(false);
  const [isAddingTrack, setIsAddingTrack] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(true);
  
  // New Modals State
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
  const [isRoomSettingsOpen, setIsRoomSettingsOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedRoomLink, setCopiedRoomLink] = useState(false);
  const [editTags, setEditTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");

  const [roomTracks, setRoomTracks] = useState<Track[]>([]);
  const [currentUserProfile, setCurrentUserProfile] = useState<any>(null);
  const { addMinimizedRoom } = useRoomContext();

  const handleBack = () => {
    if (room && id) {
      addMinimizedRoom({
        id: id,
        name: room.name,
        creatorName: room.creatorName,
        trackCount: roomTracks.length
      });
    }
    navigate(-1);
  };

  const defaultResults: any[] = [
    { id: "101", title: "Glue", artist: "Bicep", platform: "Spotify", url: "https://open.spotify.com/track/101" },
    { id: "102", title: "Gosh", artist: "Jamie xx", platform: "YouTube", url: "https://youtube.com/watch?v=102" },
    { id: "103", title: "Windowlicker", artist: "Aphex Twin", platform: "Bandcamp", url: "https://bandcamp.com/track/103" },
    { id: "104", title: "Blue Monday", artist: "New Order", platform: "Discogs", url: "https://discogs.com/track/104" },
    { id: "105", title: "Born Slippy", artist: "Underworld", platform: "Spotify", url: "https://open.spotify.com/track/105" },
    { id: "106", title: "Halcyon On and On", artist: "Orbital", platform: "YouTube", url: "https://youtube.com/watch?v=106" },
  ];

  const [searchResults, setSearchResults] = useState<any[]>(defaultResults);

  const filters = ['All', 'Spotify', 'YouTube', 'Bandcamp', 'Discogs'];

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Chat State
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const tracksEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = (ref: React.RefObject<HTMLDivElement>) => {
    ref.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (activeTab === 'chat') {
      scrollToBottom(messagesEndRef);
    } else if (activeTab === 'tracks') {
      scrollToBottom(tracksEndRef);
    }
  }, [messages, roomTracks, activeTab]);

  // Presence State
  const [activeUsers, setActiveUsers] = useState<any[]>([]);

  useEffect(() => {
    if (auth.currentUser && id && id !== 'new' && currentUserProfile) {
      const presenceRef = doc(db, "rooms", id, "presence", auth.currentUser.uid);
      setDoc(presenceRef, {
        userId: auth.currentUser.uid,
        userName: currentUserProfile.name || auth.currentUser.displayName || auth.currentUser.email?.split('@')[0] || "Anonymous",
        nameColor: currentUserProfile.nameColor || "#E4E3E0",
        joinedAt: serverTimestamp()
      }, { merge: true }).catch(console.error);
    }
  }, [currentUserProfile, id]);

  useEffect(() => {
    if (!id || id === 'new') return;

    // Fetch current user profile
    if (auth.currentUser) {
      const userRef = doc(db, "users", auth.currentUser.uid);
      getDoc(userRef).then(snap => {
        if (snap.exists()) {
          setCurrentUserProfile(snap.data());
        }
      });
    }

    const roomRef = doc(db, "rooms", id);
    const unsubscribeRoom = onSnapshot(roomRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        
        // Check if user is kicked
        if (data.kickedUsers && auth.currentUser && data.kickedUsers.includes(auth.currentUser.uid)) {
          alert("You have been kicked from this room.");
          navigate('/');
          return;
        }

        setRoom(data);
        const creator = auth.currentUser?.uid === data.creatorId;
        const moderator = auth.currentUser && data.moderators ? data.moderators.includes(auth.currentUser.uid) : false;
        
        setIsCreator(creator);
        setIsModerator(moderator);
        setCanModerate(creator || moderator);
        setCanAddTrack(creator || moderator || data.isCollaborative);
      } else {
        // Room not found, redirect to home
        navigate('/');
      }
    });

    // Presence Logic
    let unsubscribePresence = () => {};
    if (auth.currentUser) {
      const presenceCollection = collection(db, "rooms", id, "presence");
      unsubscribePresence = onSnapshot(presenceCollection, (snapshot) => {
        const users: any[] = [];
        snapshot.forEach((doc) => users.push(doc.data()));
        setActiveUsers(users);
      });
    }

    const tracksRef = collection(db, "rooms", id, "tracks");
    const qTracks = query(tracksRef, orderBy("order", "asc"));
    const unsubscribeTracks = onSnapshot(qTracks, (snapshot) => {
      const tracksData: Track[] = [];
      const addedUrls: string[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data() as Track;
        tracksData.push(data);
        if (data.url) addedUrls.push(data.url);
      });
      setRoomTracks(tracksData);
      setAddedTracks(addedUrls);
    });

    const messagesRef = collection(db, "rooms", id, "messages");
    const qMessages = query(messagesRef, orderBy("createdAt", "asc"));
    const unsubscribeMessages = onSnapshot(qMessages, (snapshot) => {
      const msgsData: Message[] = [];
      snapshot.forEach((doc) => {
        msgsData.push(doc.data() as Message);
      });
      setMessages(msgsData);
    });

    return () => {
      unsubscribeRoom();
      unsubscribeTracks();
      unsubscribeMessages();
      unsubscribePresence();
      if (auth.currentUser && id && id !== 'new') {
        const presenceRef = doc(db, "rooms", id, "presence", auth.currentUser.uid);
        deleteDoc(presenceRef).catch(console.error);
      }
    };
  }, [id]);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id && id && id !== 'new') {
      const oldIndex = roomTracks.findIndex(t => t.id === active.id);
      const newIndex = roomTracks.findIndex(t => t.id === over.id);
      
      const newTracks: Track[] = arrayMove(roomTracks, oldIndex, newIndex);
      setRoomTracks(newTracks);
      
      // Update order in Firestore
      try {
        const batch = newTracks.map((t: Track, index: number) => {
          if (!id) return null;
          const trackRef = doc(db, "rooms", id, "tracks", t.id);
          return updateDoc(trackRef, { order: index });
        }).filter(Boolean);
        await Promise.all(batch as Promise<void>[]);
      } catch (error) {
        console.error("Error updating track order:", error);
      }
    }
  };

  const handleAddTrack = async (track: any) => {
    if (!id || id === 'new' || !auth.currentUser) return;
    
    if (!addedTracks.includes(track.url)) {
      setIsAddingTrack(true);
      const newTrackId = Date.now().toString();
      const trackRef = doc(db, "rooms", id, "tracks", newTrackId);
      
      const newTrackData = {
        id: newTrackId,
        title: track.title,
        artist: track.artist,
        platform: track.platform,
        url: track.url,
        image: track.image || "",
        addedBy: auth.currentUser.uid,
        addedByName: currentUserProfile?.name || auth.currentUser.displayName || auth.currentUser.email?.split('@')[0] || "User",
        addedAt: serverTimestamp(),
        order: -1, // Will be placed at the top
        reactions: {}
      };
      
      try {
        await setDoc(trackRef, newTrackData);
        // Reorder existing tracks
        const batch = roomTracks.map((t, index) => {
          const tRef = doc(db, "rooms", id, "tracks", t.id);
          return updateDoc(tRef, { order: index });
        });
        await Promise.all(batch);
        
        // Add system message to chat
        const messageId = Date.now().toString();
        const messageRef = doc(db, "rooms", id, "messages", messageId);
        await setDoc(messageRef, {
          id: messageId,
          userId: "system",
          userName: "System",
          text: `${currentUserProfile?.name || auth.currentUser.displayName || auth.currentUser.email?.split('@')[0] || "User"} added a track: ${track.title} by ${track.artist}`,
          isSystem: true,
          createdAt: serverTimestamp()
        });
        toast.success("Track added successfully!");
      } catch (error) {
        console.error("Error adding track:", error);
        toast.error("Failed to add track.");
      } finally {
        setIsAddingTrack(false);
      }
    } else {
      toast.error("Track already added to this room.");
    }
  };

  const handleRemoveTrack = async () => {
    if (selectedTrack && id && id !== 'new') {
      try {
        await deleteDoc(doc(db, "rooms", id, "tracks", selectedTrack.id));
        setSelectedTrack(null);
        toast.success("Track removed");
      } catch (error) {
        console.error("Error removing track:", error);
        toast.error("Failed to remove track");
      }
    }
  };

  const handleCopyLink = async () => {
    if (selectedTrack) {
      try {
        await navigator.clipboard.writeText(selectedTrack.url);
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
      } catch (err) {
        // Fallback for iframe environments
        const textArea = document.createElement("textarea");
        textArea.value = selectedTrack.url;
        document.body.appendChild(textArea);
        textArea.select();
        try {
          document.execCommand('copy');
          setCopiedLink(true);
          setTimeout(() => setCopiedLink(false), 2000);
        } catch (e) {
          console.error("Copy failed", e);
        }
        document.body.removeChild(textArea);
      }
    }
  };

  const handleOpenLink = () => {
    if (selectedTrack) {
      window.open(selectedTrack.url, '_blank', 'noopener,noreferrer');
    }
  };

  const handleDeleteRoom = async () => {
    if (id && id !== 'new') {
      try {
        await deleteDoc(doc(db, "rooms", id));
        toast.success("Room deleted successfully");
        navigate('/');
      } catch (error) {
        console.error("Error deleting room:", error);
        toast.error("Failed to delete room");
      }
    }
  };

  const handleShareRoom = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopiedRoomLink(true);
      toast.success("Link copied to clipboard!");
      setTimeout(() => {
        setCopiedRoomLink(false);
      }, 2000);
    } catch (err) {
      const textArea = document.createElement("textarea");
      textArea.value = window.location.href;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        setCopiedRoomLink(true);
        toast.success("Link copied to clipboard!");
        setTimeout(() => {
          setCopiedRoomLink(false);
        }, 2000);
      } catch (e) {
        console.error("Copy failed", e);
        toast.error("Failed to copy link");
      }
      document.body.removeChild(textArea);
    }
  };

  const handleSearchInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);

    if (val.startsWith('http://') || val.startsWith('https://')) {
      setIsFetchingLink(true);
      
      let platform = "Website";
      if (val.includes('spotify.com')) platform = "Spotify";
      else if (val.includes('youtube.com') || val.includes('youtu.be')) platform = "YouTube";
      else if (val.includes('bandcamp.com')) platform = "Bandcamp";
      else if (val.includes('discogs.com')) platform = "Discogs";
      else if (val.includes('soundcloud.com')) platform = "SoundCloud";

      let title = "Imported Track";
      let artist = "Unknown Artist";
      let image = "";
      let finalUrl = val;

      try {
        const res = await fetch(`https://api.microlink.io?url=${encodeURIComponent(val)}`);
        const data = await res.json();
        
        if (data.status === 'success' && data.data) {
          if (data.data.url) {
            finalUrl = data.data.url;
          }
          if (data.data.title) {
            title = data.data.title;
            // Clean up common suffixes and prefixes
            title = title
              .replace(/ - YouTube$/, '')
              .replace(/ \| Spotify$/, '')
              .replace(/ on SoundCloud.*$/, '')
              .replace(/ - Single by .*$/, '')
              .replace(/ - Album by .*$/, '')
              .replace(/ \| Bandcamp$/, '')
              .replace(/^Listen to /, '')
              .replace(/ by .* on SoundCloud.*$/, '');
          } else if (data.data.description) {
            title = data.data.description.split('.')[0]; // Use first sentence
          }
          
          if (data.data.image?.url) {
            image = data.data.image.url;
          } else if (data.data.logo?.url) {
            image = data.data.logo.url;
          }

          if (data.data.publisher) {
            artist = data.data.publisher;
          } else if (data.data.author) {
            artist = data.data.author;
          }

          // Clean up artist name
          artist = artist
            .replace(/ - Topic$/, '')
            .replace(/VEVO$/, '')
            .replace(/ \| Bandcamp$/, '');

          // Special handling for YouTube titles (often Artist - Title)
          if (platform === "YouTube" && title.includes(" - ")) {
            const parts = title.split(" - ");
            if (parts.length >= 2) {
              artist = parts[0].trim();
              title = parts.slice(1).join(" - ").trim();
            }
          }

          // Special handling for SoundCloud (often Artist - Title)
          if (platform === "SoundCloud" && title.includes(" - ")) {
            const parts = title.split(" - ");
            if (parts.length >= 2) {
              artist = parts[0].trim();
              title = parts.slice(1).join(" - ").trim();
            }
          }
        }
      } catch (err) {
        console.error("Failed to fetch metadata", err);
        // Fallback to basic URL parsing
        try {
          const urlObj = new URL(val);
          const pathParts = urlObj.pathname.split('/').filter(Boolean);
          
          if (platform === "YouTube") {
            const videoId = urlObj.searchParams.get('v') || pathParts[0];
            title = `YouTube Video (${videoId || 'Link'})`;
            image = videoId ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg` : "";
          } else if (platform === "Spotify") {
            if (pathParts.includes('track')) title = `Spotify Track`;
            else if (pathParts.includes('album')) title = `Spotify Album`;
            else title = `Spotify Link`;
          } else if (platform === "SoundCloud") {
            if (pathParts.length >= 2) {
              artist = pathParts[0].replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
              title = pathParts[1].replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            } else if (pathParts.length > 0) {
              title = pathParts[0].replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            }
          } else if (platform === "Bandcamp") {
            if (pathParts.length >= 2 && pathParts[0] === 'track') {
              title = pathParts[1].replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            } else if (pathParts.length > 0) {
              title = pathParts[pathParts.length - 1].replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            }
          } else {
            if (pathParts.length > 0) {
              const lastPart = pathParts[pathParts.length - 1];
              title = lastPart.replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            }
          }
        } catch (e) {
          // Ignore URL parsing errors
        }
      }

      setSearchResults([{
        id: Date.now().toString(),
        title: title,
        artist: artist,
        platform: platform,
        url: finalUrl,
        image: image
      }]);
      setIsFetchingLink(false);
    } else {
      setSearchResults(defaultResults);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !id || id === 'new' || !auth.currentUser) return;
    
    const messageId = Date.now().toString();
    const messageRef = doc(db, "rooms", id, "messages", messageId);
    
    try {
      await setDoc(messageRef, {
        id: messageId,
        userId: auth.currentUser.uid,
        userName: currentUserProfile?.name || auth.currentUser.displayName || "User",
        nameColor: currentUserProfile?.nameColor || "#E4E3E0",
        text: newMessage,
        createdAt: serverTimestamp()
      });
      setNewMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col">
      <header className="sticky top-0 bg-[#0A0A0A]/90 backdrop-blur-md border-b border-[#222222] p-4 z-10">
        <div className="flex items-center justify-between mb-4">
          <button onClick={handleBack} className="p-2 -ml-2 text-[#666666] hover:text-[#E4E3E0] transition-colors rounded-full hover:bg-[#111111]">
            <ArrowLeft size={24} />
          </button>
          <div className="flex gap-2">
            <button 
              onClick={() => setIsShareModalOpen(true)}
              className="p-2 border border-[#222222] rounded-full hover:border-[#E4E3E0] transition-colors hover:bg-[#111111]"
            >
              <Share2 size={18} />
            </button>
            {isCreator && (
              <button 
                onClick={() => {
                  setEditTags(room?.tags || []);
                  setIsRoomSettingsOpen(true);
                }}
                className="p-2 border border-[#222222] rounded-full hover:border-[#E4E3E0] transition-colors hover:bg-[#111111]"
              >
                <Settings size={18} />
              </button>
            )}
          </div>
        </div>
        
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold tracking-tight">
              {isPrivate ? 'New Private Room' : (room?.name || 'Loading...')}
            </h1>
            {room?.isPrivate && (
              <span className="px-2.5 py-0.5 bg-[#222222] text-xs font-medium text-[#E4E3E0] rounded-full">
                Private
              </span>
            )}
          </div>
          {room?.description && (
            <p className="text-[#E4E3E0] text-sm mb-2">{room.description}</p>
          )}
          <p 
            onClick={() => navigate(`/user/${room?.creatorId}`)}
            className="text-[#666666] text-sm inline-block hover:text-[#E4E3E0] transition-colors cursor-pointer"
          >
            Curated by <span className="font-mono">@{room?.creatorName?.toLowerCase()?.replace(/\s+/g, '_') || 'unknown'}</span>
          </p>
        </div>
        
        {room?.isPrivate && room?.shareCode && (
          <div className="mt-4 p-4 bg-[#111111] rounded-xl border border-[#222222] flex justify-between items-center">
            <span className="text-sm text-[#666666] font-medium">Invite Code:</span>
            <span className="text-base font-bold tracking-wider text-[#9146FF]">{room.shareCode}</span>
          </div>
        )}

        {/* Tabs (Mobile Only) */}
        <div className="flex lg:hidden gap-4 mt-6 border-b border-[#222222]">
          <button 
            onClick={() => setActiveTab('tracks')}
            className={`pb-3 text-sm font-medium transition-colors relative ${activeTab === 'tracks' ? 'text-[#E4E3E0]' : 'text-[#666666] hover:text-[#E4E3E0]'}`}
          >
            Tracks
            {activeTab === 'tracks' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#9146FF]" />}
          </button>
          <button 
            onClick={() => setActiveTab('chat')}
            className={`pb-3 text-sm font-medium transition-colors relative flex items-center gap-2 ${activeTab === 'chat' ? 'text-[#E4E3E0]' : 'text-[#666666] hover:text-[#E4E3E0]'}`}
          >
            Chat
            <span className="bg-[#222222] text-[#E4E3E0] text-[10px] px-1.5 py-0.5 rounded-full">{messages.length}</span>
            {activeTab === 'chat' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#9146FF]" />}
          </button>
          <button 
            onClick={() => setActiveTab('users')}
            className={`pb-3 text-sm font-medium transition-colors relative flex items-center gap-2 ${activeTab === 'users' ? 'text-[#E4E3E0]' : 'text-[#666666] hover:text-[#E4E3E0]'}`}
          >
            Users
            <span className="bg-[#222222] text-[#E4E3E0] text-[10px] px-1.5 py-0.5 rounded-full">{activeUsers.length}</span>
            {activeTab === 'users' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#9146FF]" />}
          </button>
        </div>
      </header>

      <div className="p-4 flex-1 flex flex-col lg:flex-row gap-6 overflow-hidden relative">
        {/* Tracks Section */}
        <div className={`flex-1 flex flex-col ${activeTab !== 'tracks' ? 'hidden lg:flex' : 'flex'} overflow-hidden relative`}>
          <div className="flex items-center justify-between mb-6 flex-shrink-0">
            <h2 className="text-sm font-medium text-[#666666]">{roomTracks.length} Tracks</h2>
            <button 
              onClick={() => setIsChatOpen(!isChatOpen)}
              className="hidden lg:flex items-center gap-2 text-sm text-[#666666] hover:text-[#E4E3E0] transition-colors"
            >
              <MessageSquare size={16} />
              {isChatOpen ? 'Hide Chat' : 'Show Chat'}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pb-24 lg:pb-24">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={roomTracks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                {roomTracks.map((track: Track) => (
                  <SortableTrackItem 
                    key={track.id} 
                    track={track} 
                    onSelect={setSelectedTrack} 
                    isCreator={isCreator} 
                    roomId={id!}
                  />
                ))}
              </SortableContext>
            </DndContext>
            <div ref={tracksEndRef} />
            
            {roomTracks.length === 0 && (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-[#222222] rounded-2xl m-4">
                <Disc3 size={48} className="text-[#666666] mb-4" />
                <h3 className="text-xl font-bold text-[#E4E3E0] mb-2">The room is quiet</h3>
                <p className="text-[#666666] mb-6 max-w-md">Drop the first track to get the party started. Click the button below to add music.</p>
              </div>
            )}
          </div>

          {canAddTrack && (
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A]/90 to-transparent pt-12 z-20">
              <button 
                onClick={() => setIsAddTrackOpen(true)}
                className="w-full bg-[#9146FF] text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-[#772ce8] transition-colors shadow-[0_0_20px_rgba(145,70,255,0.15)]"
              >
                <Plus size={20} /> Add Track
              </button>
            </div>
          )}
        </div>

        {/* Chat Section */}
        <div className={`w-full lg:w-96 flex flex-col border-l-0 lg:border-l border-[#222222] lg:pl-6 ${(!isChatOpen && activeTab !== 'chat') ? 'hidden' : (activeTab === 'chat' ? 'flex' : 'hidden lg:flex')} overflow-hidden relative`}>
          <div className="flex items-center justify-between mb-4 hidden lg:flex flex-shrink-0">
            <h2 className="text-sm font-medium text-[#666666]">Chat ({messages.length})</h2>
          </div>
          <div className="flex-1 flex flex-col pb-24 lg:pb-24 overflow-hidden">
            {room?.pinnedMessage && (
              <div className="bg-[#9146FF]/10 border border-[#9146FF]/30 rounded-xl p-3 mb-4 flex items-start gap-3 flex-shrink-0">
                <div className="mt-0.5">
                  <span className="text-[10px] uppercase tracking-wider font-bold text-[#9146FF] bg-[#9146FF]/20 px-1.5 py-0.5 rounded font-mono">Pinned</span>
                </div>
                <p className="text-sm text-[#E4E3E0] flex-1">{renderMessageText(room.pinnedMessage)}</p>
                {canModerate && (
                  <button 
                    onClick={async () => {
                      try {
                        await updateDoc(doc(db, "rooms", id!), { pinnedMessage: "" });
                      } catch (e) {
                        console.error("Error removing pin", e);
                      }
                    }}
                    className="text-[#666666] hover:text-[#E4E3E0]"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            )}
            <div className="flex-1 space-y-4 overflow-y-auto mb-4 pr-2">
              {messages.map((msg) => {
                if (msg.isSystem) {
                  return (
                    <div key={msg.id} className="flex justify-center my-2">
                      <div className="bg-[#111111] border border-[#222222] rounded-full px-4 py-1.5 flex items-center gap-2">
                        <span className="text-xs text-[#9146FF] font-medium">System</span>
                        <span className="text-xs text-[#666666]">•</span>
                        <span className="text-xs text-[#E4E3E0]">{msg.text}</span>
                        <span className="text-[10px] text-[#666666] ml-2 font-mono">
                          {msg.createdAt?.toDate ? msg.createdAt.toDate().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Just now'}
                        </span>
                      </div>
                    </div>
                  );
                }
                
                return (
                  <div key={msg.id} className="flex gap-3 group">
                    <div className="w-8 h-8 rounded-full bg-[#222222] flex-shrink-0 overflow-hidden cursor-pointer" onClick={() => navigate(`/user/${msg.userId}`)}>
                      <img src={`https://picsum.photos/seed/${msg.userId}/100/100`} alt={msg.userName} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-baseline gap-2">
                        <span 
                          className="font-bold text-sm cursor-pointer hover:underline font-mono" 
                          style={{ color: msg.nameColor || '#E4E3E0' }}
                          onClick={() => navigate(`/user/${msg.userId}`)}
                        >
                          @{msg.userName?.toLowerCase()?.replace(/\s+/g, '_') || 'user'}
                        </span>
                        <span className="text-[10px] text-[#666666] font-mono">
                          {msg.createdAt?.toDate ? msg.createdAt.toDate().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Just now'}
                        </span>
                      </div>
                      <p className="text-sm text-[#E4E3E0] mt-0.5 leading-relaxed">{renderMessageText(msg.text)}</p>
                    </div>
                    {canModerate && (
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                        <button 
                          onClick={async () => {
                            try {
                              await updateDoc(doc(db, "rooms", id!), { pinnedMessage: msg.text });
                            } catch (e) {
                              console.error("Error pinning", e);
                            }
                          }}
                          className="text-[#666666] hover:text-[#9146FF] text-xs font-medium"
                        >
                          Pin
                        </button>
                        <button 
                          onClick={async () => {
                            if (window.confirm("Delete this message?")) {
                              try {
                                await deleteDoc(doc(db, "rooms", id!, "messages", msg.id));
                              } catch (e) {
                                console.error("Error deleting", e);
                              }
                            }
                          }}
                          className="text-[#666666] hover:text-red-500 text-xs font-medium"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          </div>

          <div className="absolute bottom-0 left-0 right-0 p-4 bg-[#0A0A0A] border-t border-[#222222] z-20 lg:pl-6">
            <form onSubmit={handleSendMessage} className="flex gap-2">
              <input 
                type="text" 
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Say something..." 
                className="flex-1 bg-[#111111] border border-[#222222] text-[#E4E3E0] p-3.5 rounded-xl focus:outline-none focus:border-[#9146FF] transition-colors text-sm"
              />
              <button 
                type="submit"
                disabled={!newMessage.trim()}
                className="w-12 h-12 flex items-center justify-center bg-[#9146FF] text-white rounded-xl disabled:opacity-50 hover:bg-[#772ce8] transition-colors flex-shrink-0"
              >
                <Send size={20} />
              </button>
            </form>
          </div>
        </div>

        {/* Users Section */}
        <div className={`w-full lg:w-96 flex flex-col border-l-0 lg:border-l border-[#222222] lg:pl-6 ${activeTab === 'users' ? 'flex' : 'hidden'} overflow-hidden`}>
          <div className="flex-1 flex flex-col pb-24 md:pb-6 overflow-y-auto">
            <div className="space-y-4">
              {activeUsers.map((user) => (
                <div key={user.userId} className="flex items-center justify-between p-3 bg-[#111111] rounded-xl border border-[#222222]">
                  <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate(`/user/${user.userId}`)}>
                    <div className="w-10 h-10 rounded-full bg-[#222222] overflow-hidden">
                      <img src={`https://picsum.photos/seed/${user.userId}/100/100`} alt={user.userName} className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <p className="font-bold text-sm font-mono" style={{ color: user.nameColor || '#E4E3E0' }}>@{user.userName?.toLowerCase()?.replace(/\s+/g, '_') || 'user'}</p>
                      <div className="flex gap-2 mt-0.5">
                        {user.userId === room?.creatorId && (
                          <span className="text-[10px] text-[#9146FF] font-medium uppercase tracking-wider font-mono">Creator</span>
                        )}
                        {room?.moderators?.includes(user.userId) && (
                          <span className="text-[10px] text-[#00CCFF] font-medium uppercase tracking-wider font-mono">Mod</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {isCreator && user.userId !== auth.currentUser?.uid && (
                      <button 
                        onClick={async () => {
                          try {
                            const roomRef = doc(db, "rooms", id!);
                            if (room?.moderators?.includes(user.userId)) {
                              await updateDoc(roomRef, { moderators: arrayRemove(user.userId) });
                            } else {
                              await updateDoc(roomRef, { moderators: arrayUnion(user.userId) });
                            }
                          } catch (error) {
                            console.error("Error toggling mod:", error);
                          }
                        }}
                        className="px-3 py-1.5 bg-[#222222] text-[#E4E3E0] text-xs font-bold rounded-xl hover:bg-[#333333] transition-colors"
                      >
                        {room?.moderators?.includes(user.userId) ? 'Unmod' : 'Mod'}
                      </button>
                    )}
                    {canModerate && user.userId !== auth.currentUser?.uid && user.userId !== room?.creatorId && (
                      <button 
                        onClick={async () => {
                          if (window.confirm(`Are you sure you want to kick ${user.userName}?`)) {
                            try {
                              const roomRef = doc(db, "rooms", id!);
                              await updateDoc(roomRef, {
                                kickedUsers: arrayUnion(user.userId)
                              });
                            } catch (error) {
                              console.error("Error kicking user:", error);
                            }
                          }
                        }}
                        className="px-3 py-1.5 bg-red-500/10 text-red-500 text-xs font-bold rounded-xl hover:bg-red-500/20 transition-colors"
                      >
                        Kick
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Share Modal */}
      {isShareModalOpen && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-[#0A0A0A] border border-[#222222] w-full max-w-sm p-6 rounded-xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold tracking-tight">Share Room</h2>
              <button onClick={() => setIsShareModalOpen(false)} className="text-[#666666] hover:text-[#E4E3E0] p-1 rounded-full hover:bg-[#111111] transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="flex flex-col items-center mb-6">
              <div className="bg-white p-4 rounded-xl mb-4">
                <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(window.location.href)}`} alt="Room QR Code" className="w-32 h-32" />
              </div>
              <p className="text-sm text-[#666666] text-center">Scan this QR code to join the room</p>
            </div>

            <button 
              onClick={handleShareRoom}
              className="w-full bg-[#111111] border border-[#222222] hover-gradient-border text-[#E4E3E0] font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {copiedRoomLink ? <Check size={18} className="text-[#9146FF]" /> : <Copy size={18} />}
              {copiedRoomLink ? "Copied!" : "Copy Link"}
            </button>
          </div>
        </div>
      )}

      {/* Track Actions Modal */}
      {selectedTrack !== null && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-end sm:items-center justify-center sm:p-4 animate-in fade-in duration-200" onClick={() => setSelectedTrack(null)}>
          <div className="bg-[#0A0A0A] border border-[#222222] w-full max-w-md p-6 rounded-t-xl sm:rounded-xl animate-in slide-in-from-bottom-10 sm:slide-in-from-bottom-0 duration-200" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-4 mb-6 pb-6 border-b border-[#222222]">
              {selectedTrack.image ? (
                <img src={selectedTrack.image} alt="Album art" className="w-16 h-16 rounded-xl object-cover" referrerPolicy="no-referrer" />
              ) : (
                <img src={`https://picsum.photos/seed/track${selectedTrack.id}/100/100`} alt="Album art" className="w-16 h-16 rounded-xl object-cover" referrerPolicy="no-referrer" />
              )}
              <div>
                <h3 className="font-bold text-lg">{selectedTrack.title}</h3>
                <p className="text-[#666666] text-sm">{selectedTrack.artist}</p>
              </div>
            </div>
            
            <div className="space-y-2">
              <button 
                onClick={async () => {
                  if (!auth.currentUser) return;
                  try {
                    const userRef = doc(db, "users", auth.currentUser.uid);
                    const trackKey = `${id}_${selectedTrack.id}`;
                    if (currentUserProfile?.likedTracks?.includes(trackKey)) {
                      await updateDoc(userRef, { likedTracks: arrayRemove(trackKey) });
                      setCurrentUserProfile({
                        ...currentUserProfile,
                        likedTracks: currentUserProfile.likedTracks.filter((k: string) => k !== trackKey)
                      });
                      toast.success("Track unliked");
                    } else {
                      await updateDoc(userRef, { likedTracks: arrayUnion(trackKey) });
                      setCurrentUserProfile({
                        ...currentUserProfile,
                        likedTracks: [...(currentUserProfile.likedTracks || []), trackKey]
                      });
                      toast.success("Track liked");
                    }
                  } catch (error) {
                    console.error("Error liking track:", error);
                    toast.error("Failed to update like status");
                  }
                }}
                className="w-full flex items-center gap-3 p-4 hover:bg-[#111111] rounded-xl transition-colors text-left"
              >
                <Heart size={20} className={currentUserProfile?.likedTracks?.includes(`${id}_${selectedTrack.id}`) ? "fill-[#9146FF] text-[#9146FF]" : "text-[#E4E3E0]"} />
                <span className="font-medium">{currentUserProfile?.likedTracks?.includes(`${id}_${selectedTrack.id}`) ? "Unlike Track" : "Like Track"}</span>
              </button>
              <a href={selectedTrack.url} target="_blank" rel="noopener noreferrer" className="w-full flex items-center gap-3 p-4 hover:bg-[#111111] rounded-xl transition-colors text-left">
                <ExternalLink size={20} className="text-[#9146FF]" />
                <span className="font-medium">Open in {selectedTrack.platform}</span>
              </a>
              <button onClick={handleCopyLink} className="w-full flex items-center gap-3 p-4 hover:bg-[#111111] rounded-xl transition-colors text-left">
                {copiedLink ? <Check size={20} className="text-[#9146FF]" /> : <Share2 size={20} className="text-[#E4E3E0]" />}
                <span className="font-medium">{copiedLink ? "Copied!" : "Copy Link"}</span>
              </button>
              {isCreator && (
                <button 
                  onClick={handleRemoveTrack}
                  className="w-full flex items-center gap-3 p-4 hover:bg-red-500/10 rounded-xl transition-colors text-left text-red-500 mt-4"
                >
                  <Trash2 size={20} />
                  <span className="font-medium">Remove from Room</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Room Settings Modal */}
      {isRoomSettingsOpen && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-end sm:items-center justify-center sm:p-4 animate-in fade-in duration-200">
          <div className="bg-[#0A0A0A] border border-[#222222] w-full max-w-md p-6 rounded-t-xl sm:rounded-xl animate-in slide-in-from-bottom-10 sm:slide-in-from-bottom-0 duration-200">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-bold tracking-tight">Room Settings</h2>
              <button onClick={() => setIsRoomSettingsOpen(false)} className="text-[#666666] hover:text-[#E4E3E0] p-1 rounded-full hover:bg-[#111111] transition-colors">
                <X size={24} />
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-[#666666] text-xs font-medium uppercase tracking-wider mb-2 font-mono">Edit Name</label>
                <input 
                  type="text" 
                  defaultValue={room?.name || ""}
                  onChange={(e) => updateDoc(doc(db, "rooms", id!), { name: e.target.value })}
                  className="w-full bg-[#111111] border border-[#222222] text-[#E4E3E0] p-4 rounded-xl focus:outline-none focus:border-[#9146FF] transition-colors"
                />
              </div>

              <div>
                <label className="block text-[#666666] text-xs font-medium uppercase tracking-wider mb-2 font-mono">Description</label>
                <textarea 
                  defaultValue={room?.description || ""}
                  onChange={(e) => updateDoc(doc(db, "rooms", id!), { description: e.target.value })}
                  placeholder="Add a short description..."
                  className="w-full bg-[#111111] border border-[#222222] text-[#E4E3E0] p-4 rounded-xl focus:outline-none focus:border-[#9146FF] transition-colors resize-none h-24"
                />
              </div>

              <div>
                <label className="block text-[#666666] text-xs font-medium uppercase tracking-wider mb-2 font-mono">Genre Tags (Max 5)</label>
                <div className="bg-[#111111] border border-[#222222] rounded-xl p-2 focus-within:border-[#9146FF] transition-colors">
                  <div className="flex flex-wrap gap-2 mb-2">
                    {editTags.map(tag => (
                      <span key={tag} className="px-2.5 py-1 bg-[#222222] rounded-xl text-xs font-medium text-[#E4E3E0] flex items-center gap-1">
                        #{tag}
                        <button onClick={() => {
                          const newTags = editTags.filter(t => t !== tag);
                          setEditTags(newTags);
                          updateDoc(doc(db, "rooms", id!), { tags: newTags });
                        }} className="hover:text-[#9146FF]"><X size={12} /></button>
                      </span>
                    ))}
                  </div>
                  <input 
                    type="text" 
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && tagInput.trim()) {
                        e.preventDefault();
                        const newTag = tagInput.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
                        if (newTag && editTags.length < 5 && !editTags.includes(newTag)) {
                          const newTags = [...editTags, newTag];
                          setEditTags(newTags);
                          setTagInput("");
                          updateDoc(doc(db, "rooms", id!), { tags: newTags });
                        }
                      }
                    }}
                    disabled={editTags.length >= 5}
                    placeholder={editTags.length >= 5 ? "Max tags reached" : "Type a genre and press Enter..."} 
                    className="w-full bg-transparent text-[#E4E3E0] p-2 text-sm focus:outline-none disabled:opacity-50"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-[#222222]">
                <button 
                  onClick={async () => {
                    if (window.confirm("Are you sure you want to clear the chat? This cannot be undone.")) {
                      try {
                        const messagesRef = collection(db, "rooms", id!, "messages");
                        const messagesSnapshot = await getDocs(messagesRef);
                        const batch = writeBatch(db);
                        messagesSnapshot.docs.forEach((doc) => {
                          batch.delete(doc.ref);
                        });
                        await batch.commit();
                        
                        // Add system message indicating chat was cleared
                        const messageId = Date.now().toString();
                        await setDoc(doc(db, "rooms", id!, "messages", messageId), {
                          id: messageId,
                          userId: "system",
                          userName: "System",
                          text: "Chat history was cleared by the room creator.",
                          isSystem: true,
                          createdAt: serverTimestamp()
                        });
                        
                        setIsRoomSettingsOpen(false);
                        toast.success("Chat history cleared");
                      } catch (error) {
                        console.error("Error clearing chat:", error);
                        toast.error("Failed to clear chat");
                      }
                    }
                  }}
                  className="w-full border border-[#222222] text-[#E4E3E0] font-bold py-4 rounded-xl hover:bg-[#111111] transition-colors flex items-center justify-center gap-2"
                >
                  <MessageSquare size={20} /> Clear Chat
                </button>
              </div>

              <button 
                onClick={handleDeleteRoom}
                className="w-full border border-red-500/50 text-red-500 font-bold py-4 rounded-xl hover:bg-red-500/10 transition-colors flex items-center justify-center gap-2"
              >
                <Trash2 size={20} /> Delete Room
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Track Modal (Existing) */}
      {isAddTrackOpen && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-end sm:items-center justify-center sm:p-4 animate-in fade-in duration-200">
          <div className="bg-[#0A0A0A] border border-[#222222] w-full max-w-md h-[85vh] sm:h-[600px] flex flex-col rounded-t-xl sm:rounded-xl animate-in slide-in-from-bottom-10 sm:slide-in-from-bottom-0 duration-200">
            <div className="p-5 border-b border-[#222222] flex justify-between items-center">
              <h2 className="text-xl font-bold tracking-tight">Add Track</h2>
              <button onClick={() => setIsAddTrackOpen(false)} className="text-[#666666] hover:text-[#E4E3E0] p-1 rounded-full hover:bg-[#111111] transition-colors">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-4 border-b border-[#222222]">
              <div className="relative mb-4">
                <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#666666]" size={20} />
                <input 
                  type="text" 
                  placeholder="Search or paste a link..." 
                  value={searchQuery}
                  onChange={handleSearchInput}
                  className="w-full bg-[#111111] border border-[#222222] text-[#E4E3E0] p-3.5 pl-11 rounded-xl focus:outline-none focus:border-[#9146FF] transition-colors"
                />
              </div>
              
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
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
            </div>

            {isFetchingLink ? (
              <div className="flex-1 flex flex-col items-center justify-center text-[#666666] animate-in fade-in">
                <Disc3 size={32} className="animate-[spin_2s_linear_infinite] mb-4 text-[#9146FF]" />
                <p className="text-sm font-medium">Fetching track data...</p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {searchResults.map((track) => {
                  const color = getChipColor(track.platform);
                  return (
                    <div key={track.id} className="flex items-center gap-3 p-2 hover:bg-[#111111] rounded-xl transition-colors group">
                      <div className="w-12 h-12 bg-[#222222] rounded-xl flex-shrink-0 overflow-hidden">
                        {track.image ? (
                          <img src={track.image} alt="Album art" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Disc3 size={20} className="text-[#333333]" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold truncate text-sm">{track.title}</h4>
                        <p className="text-[#666666] text-xs truncate mt-0.5">{track.artist}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-[10px] font-medium px-2 py-0.5 ${color.bg} ${color.text} rounded-xl`}>
                          {track.platform}
                        </span>
                        <button 
                          onClick={() => handleAddTrack(track)}
                          disabled={addedTracks.includes(track.url) || isAddingTrack}
                          className={`p-2 rounded-full border transition-colors ${
                            addedTracks.includes(track.url) 
                              ? `${color.border} ${color.bg} ${color.text}` 
                              : `border-[#222222] text-[#E4E3E0] ${color.hoverBorder} ${color.hoverText} bg-[#000000]`
                          } disabled:opacity-50`}
                        >
                          {addedTracks.includes(track.url) ? <Check size={16} /> : (isAddingTrack ? <Disc3 size={16} className="animate-spin" /> : <Plus size={16} />)}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
