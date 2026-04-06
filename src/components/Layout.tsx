import React, { useState } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { Home, Search, Plus, Bell, User, X, Copy, Check, Disc3, Maximize2, MessageCircle } from "lucide-react";
import { cn } from "../lib/utils";
import { collection, doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db, auth } from "../firebase";
import { useRoomContext } from "../RoomContext";

export default function Layout() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [roomName, setRoomName] = useState("");
  const [description, setDescription] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [isCollaborative, setIsCollaborative] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [copied, setCopied] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const navigate = useNavigate();
  const { minimizedRooms, removeMinimizedRoom } = useRoomContext();

  const shareCode = "JR-" + Math.random().toString(36).substring(2, 6).toUpperCase();

  const handleCreate = async () => {
    if (!roomName || !auth.currentUser) return;
    setIsCreating(true);

    try {
      const newRoomRef = doc(collection(db, "rooms"));
      const roomData: any = {
        id: newRoomRef.id,
        name: roomName,
        description: description,
        isPrivate,
        isCollaborative,
        creatorId: auth.currentUser.uid,
        creatorName: auth.currentUser.displayName || auth.currentUser.email?.split('@')[0] || 'Anonymous',
        createdAt: serverTimestamp(),
        likes: 0,
        tags: tags,
        moderators: [],
        kickedUsers: []
      };

      if (isPrivate) {
        roomData.shareCode = shareCode;
      }

      await setDoc(newRoomRef, roomData);
      
      setIsCreateModalOpen(false);
      setRoomName("");
      setDescription("");
      setTags([]);
      setTagInput("");
      setIsPrivate(false);
      setIsCollaborative(false);
      setIsCreating(false);
      navigate(`/room/${newRoomRef.id}`);
    } catch (error) {
      console.error("Error creating room:", error);
      setIsCreating(false);
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(shareCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && tagInput.trim() && tags.length < 5) {
      e.preventDefault();
      if (!tags.includes(tagInput.trim().toLowerCase())) {
        setTags([...tags, tagInput.trim().toLowerCase()]);
      }
      setTagInput("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  return (
    <div className="flex flex-col md:flex-row h-screen bg-[#0A0A0A] text-[#E4E3E0] font-sans">
      <nav className="fixed bottom-0 left-0 right-0 h-16 bg-[#000000] border-t border-[#222222] flex items-center justify-around px-2 z-40 md:relative md:w-64 md:h-screen md:border-t-0 md:border-r md:flex-col md:justify-start md:pt-8 md:px-4">
        
        <div className="hidden md:flex items-center gap-2 mb-10 px-4 w-full">
          <Disc3 size={28} className="text-[#9146FF]" />
          <span className="font-bold text-xl tracking-tight">JamRoom</span>
        </div>

        <div className="flex md:flex-col items-center md:items-start justify-around md:justify-start w-full md:gap-2 h-full md:h-auto">
          <button 
            onClick={() => setIsCreateModalOpen(true)}
            className="order-3 md:order-none relative -top-5 md:static md:w-full md:h-12 md:mb-4 rounded-full md:rounded-xl bg-[#9146FF] text-white flex items-center justify-center md:justify-start md:px-4 md:gap-3 shadow-[0_0_15px_rgba(145,70,255,0.3)] hover:scale-105 md:hover:scale-100 md:hover:bg-[#772ce8] transition-all active:scale-95 w-14 h-14 flex-shrink-0"
          >
            <Plus size={28} strokeWidth={3} className="md:w-5 md:h-5" />
            <span className="hidden md:block font-bold">Create Room</span>
          </button>

          <NavItem to="/" icon={<Home size={24} />} label="Feed" className="order-1 md:order-none" />
          <NavItem to="/search" icon={<Search size={24} />} label="Search" className="order-2 md:order-none" />
          <NavItem to="/messages" icon={<MessageCircle size={24} />} label="Messages" className="order-4 md:order-none" />
          <NavItem to="/profile" icon={<User size={24} />} label="Profile" className="order-5 md:order-none" />
        </div>
      </nav>

      <main className="flex-1 overflow-y-auto relative">
        <Outlet />
      </main>

      {minimizedRooms.length > 0 && (
        <div className="fixed bottom-16 md:bottom-4 right-0 md:right-4 left-0 md:left-auto md:w-80 p-2 z-30 flex flex-col gap-2 max-h-[40vh] overflow-y-auto pointer-events-none">
          {minimizedRooms.map((room) => (
            <div 
              key={room.id}
              onClick={() => navigate(`/room/${room.id}`)}
              className="bg-[#111111] border border-[#222222] rounded-xl p-3 flex items-center justify-between shadow-lg cursor-pointer hover:bg-[#1A1A1A] transition-colors animate-in slide-in-from-bottom-2 pointer-events-auto"
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="w-10 h-10 rounded-full bg-[#9146FF]/10 flex items-center justify-center flex-shrink-0">
                  <Disc3 size={20} className="text-[#9146FF]" />
                </div>
                <div className="overflow-hidden">
                  <h4 className="font-semibold text-sm truncate">{room.name}</h4>
                  <p className="text-xs text-[#666666] truncate">
                    {room.creatorName} • {room.trackCount} tracks
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/room/${room.id}`);
                  }}
                  className="p-2 text-[#E4E3E0] hover:text-[#CCFF00] transition-colors"
                >
                  <Maximize2 size={18} />
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    removeMinimizedRoom(room.id);
                  }}
                  className="p-2 text-[#666666] hover:text-[#FF3366] transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Room Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-end sm:items-center justify-center sm:p-4 animate-in fade-in duration-200">
          <div className="bg-[#0A0A0A] border border-[#222222] w-full max-w-md p-6 rounded-t-xl sm:rounded-xl animate-in slide-in-from-bottom-10 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold tracking-tight">Create Room</h2>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-[#666666] hover:text-[#E4E3E0] p-1 rounded-full hover:bg-[#111111] transition-colors">
                <X size={24} />
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-[#666666] text-xs font-medium uppercase tracking-wider mb-2">Room Name</label>
                <input 
                  type="text" 
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  placeholder="e.g. Late Night Dub" 
                  className="w-full bg-[#111111] border border-[#222222] text-[#E4E3E0] p-4 rounded-xl focus:outline-none focus:border-[#9146FF] transition-colors"
                />
              </div>

              <div>
                <label className="block text-[#666666] text-xs font-medium uppercase tracking-wider mb-2">Description</label>
                <textarea 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add a short description..." 
                  className="w-full bg-[#111111] border border-[#222222] text-[#E4E3E0] p-4 rounded-xl focus:outline-none focus:border-[#9146FF] transition-colors resize-none h-24"
                />
              </div>

              <div>
                <label className="block text-[#666666] text-xs font-medium uppercase tracking-wider mb-2">Genre Tags (Max 5)</label>
                <div className="bg-[#111111] border border-[#222222] rounded-xl p-2 focus-within:border-[#9146FF] transition-colors">
                  <div className="flex flex-wrap gap-2 mb-2">
                    {tags.map(tag => (
                      <span key={tag} className="px-2.5 py-1 bg-[#222222] rounded-md text-xs font-medium text-[#E4E3E0] flex items-center gap-1">
                        #{tag}
                        <button onClick={() => removeTag(tag)} className="hover:text-[#9146FF]"><X size={12} /></button>
                      </span>
                    ))}
                  </div>
                  <input 
                    type="text" 
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleAddTag}
                    disabled={tags.length >= 5}
                    placeholder={tags.length >= 5 ? "Max tags reached" : "Type a genre and press Enter..."} 
                    className="w-full bg-transparent text-[#E4E3E0] p-2 text-sm focus:outline-none disabled:opacity-50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#666666] text-xs font-medium uppercase tracking-wider mb-2">Privacy</label>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setIsPrivate(false)}
                    className={cn("flex-1 py-3 text-sm font-medium rounded-xl border transition-colors", !isPrivate ? "border-[#9146FF] text-[#9146FF] bg-[#9146FF]/10" : "border-[#222222] text-[#666666] bg-[#111111] hover:border-[#E4E3E0]")}
                  >
                    Public
                  </button>
                  <button 
                    onClick={() => setIsPrivate(true)}
                    className={cn("flex-1 py-3 text-sm font-medium rounded-xl border transition-colors", isPrivate ? "border-[#9146FF] text-[#9146FF] bg-[#9146FF]/10" : "border-[#222222] text-[#666666] bg-[#111111] hover:border-[#E4E3E0]")}
                  >
                    Private
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[#666666] text-xs font-medium uppercase tracking-wider mb-2">Collaboration</label>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setIsCollaborative(false)}
                    className={cn("flex-1 py-3 text-sm font-medium rounded-xl border transition-colors", !isCollaborative ? "border-[#9146FF] text-[#9146FF] bg-[#9146FF]/10" : "border-[#222222] text-[#666666] bg-[#111111] hover:border-[#E4E3E0]")}
                  >
                    Only Me
                  </button>
                  <button 
                    onClick={() => setIsCollaborative(true)}
                    className={cn("flex-1 py-3 text-sm font-medium rounded-xl border transition-colors", isCollaborative ? "border-[#9146FF] text-[#9146FF] bg-[#9146FF]/10" : "border-[#222222] text-[#666666] bg-[#111111] hover:border-[#E4E3E0]")}
                  >
                    Anyone Can Add
                  </button>
                </div>
              </div>

              {isPrivate && (
                <div className="bg-[#111111] border border-[#222222] p-4 rounded-xl flex justify-between items-center animate-in fade-in zoom-in-95">
                  <div>
                    <p className="text-[#666666] text-[10px] font-medium uppercase tracking-wider mb-1">Share Code</p>
                    <p className="text-lg font-bold tracking-wider text-[#9146FF]">{shareCode}</p>
                  </div>
                  <button onClick={copyCode} className="p-2 border border-[#222222] rounded-lg hover:border-[#9146FF] transition-colors text-[#E4E3E0] bg-[#000000]">
                    {copied ? <Check size={20} className="text-[#9146FF]" /> : <Copy size={20} />}
                  </button>
                </div>
              )}

              <button 
                onClick={handleCreate}
                disabled={!roomName || isCreating}
                className="w-full bg-[#9146FF] text-white font-bold py-4 rounded-xl disabled:opacity-50 hover:bg-[#772ce8] transition-colors mt-4"
              >
                {isCreating ? "Creating..." : "Create Room"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function NavItem({ to, icon, label, className }: { to: string; icon: React.ReactNode; label: string; className?: string }) {
  return (
    <NavLink
      to={to}
      end={to === "/"}
      className={({ isActive }) =>
        cn(
          "flex flex-col md:flex-row items-center justify-center md:justify-start w-16 md:w-full h-full md:h-12 gap-1 md:gap-4 md:px-4 md:rounded-xl transition-colors",
          isActive ? "text-[#9146FF] md:bg-[#111111]" : "text-[#666666] hover:text-[#E4E3E0] md:hover:bg-[#111111]",
          className
        )
      }
    >
      {icon}
      <span className="text-[10px] md:text-sm font-medium tracking-wide">{label}</span>
    </NavLink>
  );
}
