import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { collection, query, orderBy, onSnapshot, doc, getDoc, setDoc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { ArrowLeft, Send, Disc3, Trash2 } from 'lucide-react';

export default function Conversation() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [otherUser, setOtherUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!id || !auth.currentUser) return;

    const fetchOtherUser = async () => {
      try {
        const convDoc = await getDoc(doc(db, "conversations", id));
        if (convDoc.exists()) {
          const data = convDoc.data();
          const otherUserId = data.participants.find((p: string) => p !== auth.currentUser?.uid);
          if (otherUserId) {
            const userDoc = await getDoc(doc(db, "users", otherUserId));
            if (userDoc.exists()) {
              setOtherUser(userDoc.data());
            }
          }
        }
      } catch (e) {
        console.error("Error fetching conversation details", e);
      }
    };

    fetchOtherUser();

    const q = query(
      collection(db, "conversations", id, "messages"),
      orderBy("createdAt", "asc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = [];
      for (const doc of snapshot.docs) {
        msgs.push({ id: doc.id, ...doc.data() });
      }
      setMessages(msgs);
      setIsLoading(false);
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    });

    return () => unsubscribe();
  }, [id]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !id || !auth.currentUser) return;

    const messageId = Date.now().toString();
    const messageRef = doc(db, "conversations", id, "messages", messageId);
    const convRef = doc(db, "conversations", id);

    try {
      await setDoc(messageRef, {
        id: messageId,
        conversationId: id,
        senderId: auth.currentUser.uid,
        text: newMessage,
        createdAt: serverTimestamp()
      });

      await setDoc(convRef, {
        lastMessage: newMessage,
        updatedAt: serverTimestamp()
      }, { merge: true });
      
      if (otherUser && otherUser.uid) {
        const currentUserDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
        const currentUserName = currentUserDoc.exists() ? currentUserDoc.data().name : "Someone";
        
        const notifRef = doc(collection(db, "notifications"));
        await setDoc(notifRef, {
          id: notifRef.id,
          userId: otherUser.uid,
          actorId: auth.currentUser.uid,
          actorName: currentUserName,
          type: "message",
          targetId: id,
          read: false,
          createdAt: serverTimestamp()
        });
      }

      setNewMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!id || !window.confirm("Delete this message?")) return;
    try {
      await deleteDoc(doc(db, "conversations", id, "messages", messageId));
    } catch (e) {
      console.error("Error deleting message", e);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col font-sans">
      <header className="sticky top-0 bg-[#0A0A0A]/90 backdrop-blur-md border-b border-[#222222] p-4 z-10 flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-[#666666] hover:text-[#E4E3E0] transition-colors rounded-full hover:bg-[#111111]">
          <ArrowLeft size={24} />
        </button>
        {otherUser && (
          <div 
            className="flex items-center gap-3 cursor-pointer"
            onClick={() => navigate(`/user/${otherUser.uid}`)}
          >
            <div className="w-10 h-10 rounded-full bg-[#222222] overflow-hidden">
              <img src={`https://picsum.photos/seed/${otherUser.uid || otherUser.id}/100/100`} alt={otherUser.name} className="w-full h-full object-cover" />
            </div>
            <div>
              <h2 className="font-bold text-[#E4E3E0] leading-tight">{otherUser.name}</h2>
              <p className="text-xs text-[#666666] font-mono">@{otherUser.name?.toLowerCase()?.replace(/\s+/g, '_')}</p>
            </div>
          </div>
        )}
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-24 md:pb-6">
        {isLoading ? (
          <div className="flex justify-center py-10">
            <Disc3 size={32} className="text-[#9146FF] animate-[spin_4s_linear_infinite]" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-10 text-[#666666]">
            <p className="text-sm">No messages yet. Say hi!</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.senderId === auth.currentUser?.uid;
            return (
              <div key={msg.id} className={`flex gap-3 group ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                {!isMe && (
                  <div className="w-8 h-8 rounded-full bg-[#222222] flex-shrink-0 overflow-hidden self-end border border-[#333333]">
                    <img src={`https://picsum.photos/seed/${otherUser?.uid || otherUser?.id}/100/100`} alt="Avatar" className="w-full h-full object-cover" />
                  </div>
                )}
                {isMe && (
                  <div className="w-8 h-8 rounded-full bg-[#222222] flex-shrink-0 overflow-hidden self-end border border-[#333333]">
                    <img src={`https://picsum.photos/seed/${auth.currentUser?.uid}/100/100`} alt="Avatar" className="w-full h-full object-cover" />
                  </div>
                )}
                
                <div className={`flex flex-col max-w-[75%] ${isMe ? 'items-end' : 'items-start'}`}>
                  <div className="relative group/bubble">
                    <div 
                      className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm ${
                        isMe 
                          ? 'bg-[#9146FF] text-white rounded-br-none' 
                          : 'bg-[#1A1A1A] text-[#E4E3E0] border border-[#222222] rounded-bl-none'
                      }`}
                    >
                      <p>{msg.text}</p>
                    </div>
                    
                    <div className={`
                      absolute top-0 opacity-0 group-hover/bubble:opacity-100 transition-opacity flex gap-1 p-1 bg-[#0A0A0A]/80 backdrop-blur-sm rounded-lg border border-[#222222] z-10
                      ${isMe ? 'right-full mr-2' : 'left-full ml-2'}
                    `}>
                      {isMe && (
                        <button 
                          onClick={() => handleDeleteMessage(msg.id)}
                          className="p-1 text-[#666666] hover:text-red-500 transition-colors"
                          title="Delete message"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                  
                  <div className={`mt-1 ${isMe ? 'mr-1' : 'ml-1'}`}>
                    <span className="text-[10px] text-[#666666] font-mono">
                      {msg.createdAt?.toDate ? msg.createdAt.toDate().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Just now'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-[#0A0A0A] border-t border-[#222222] z-20">
        <form onSubmit={handleSendMessage} className="flex gap-2 max-w-md mx-auto">
          <input 
            type="text" 
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..." 
            className="flex-1 bg-[#111111] border border-[#222222] text-[#E4E3E0] p-3 rounded-xl focus:outline-none focus:border-[#9146FF] transition-colors text-sm"
          />
          <button 
            type="submit"
            disabled={!newMessage.trim()}
            className="bg-[#9146FF] text-white p-3 rounded-xl disabled:opacity-50 hover:bg-[#772ce8] transition-colors flex-shrink-0"
          >
            <Send size={20} />
          </button>
        </form>
      </div>
    </div>
  );
}
