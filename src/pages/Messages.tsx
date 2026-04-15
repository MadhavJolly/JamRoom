import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy, doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, Disc3 } from 'lucide-react';
import { UserAvatar } from '../components/UserAvatar';

export default function Messages() {
  const [conversations, setConversations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(
      collection(db, "conversations"),
      where("participants", "array-contains", auth.currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const convos = [];
      for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        const otherUserId = data.participants.find((id: string) => id !== auth.currentUser?.uid);
        
        let otherUser = { name: "Unknown User" };
        if (otherUserId) {
          try {
            const userDoc = await getDoc(doc(db, "users", otherUserId));
            if (userDoc.exists()) {
              otherUser = userDoc.data() as any;
            }
          } catch (e) {
            console.error("Error fetching user", e);
          }
        }

        convos.push({
          id: docSnap.id,
          ...data,
          otherUser
        });
      }
      
      // Sort client-side to avoid needing a composite index
      convos.sort((a, b) => {
        const timeA = a.updatedAt?.toMillis() || 0;
        const timeB = b.updatedAt?.toMillis() || 0;
        return timeB - timeA;
      });
      
      setConversations(convos);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="p-6 font-sans pb-24 md:pb-6 h-full flex flex-col">
      <header className="mb-8 pt-4">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Messages</h1>
        <p className="text-[#666666] text-sm">Connect with other curators.</p>
      </header>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Disc3 size={48} className="text-[#9146FF] animate-[spin_4s_linear_infinite]" />
        </div>
      ) : conversations.length === 0 ? (
        <div className="text-center py-20 text-[#666666]">
          <MessageCircle size={48} className="mx-auto mb-4 opacity-20" />
          <p className="text-lg font-medium">No messages yet.</p>
          <p className="text-sm mt-2">Start a conversation from someone's profile!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {conversations.map((conv) => (
            <div 
              key={conv.id}
              onClick={() => navigate(`/messages/${conv.id}`)}
              className="hover-gradient-border flex items-center gap-4 p-4 bg-[#111111] rounded-xl transition-colors cursor-pointer"
            >
              <div className="w-12 h-12 rounded-full bg-[#222222] overflow-hidden flex-shrink-0">
                <UserAvatar iconName={conv.otherUser.profileIcon} size={24} className="w-full h-full" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline mb-1">
                  <h3 className="font-bold text-[#E4E3E0] truncate">{conv.otherUser.name}</h3>
                  <span className="text-[10px] text-[#666666] flex-shrink-0 ml-2 font-mono">
                    {conv.updatedAt?.toDate ? conv.updatedAt.toDate().toLocaleDateString() : ''}
                  </span>
                </div>
                <p className="text-sm text-[#666666] truncate">
                  {conv.lastMessage || "Started a conversation"}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
