import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Heart, MessageCircle, Disc3, UserPlus } from "lucide-react";
import { collection, query, where, onSnapshot, doc, updateDoc, writeBatch } from "firebase/firestore";
import { db, auth } from "../firebase";

export default function Activity() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let unsubscribe: () => void;

    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (user) {
        const q = query(
          collection(db, "notifications"),
          where("userId", "==", user.uid)
        );

        unsubscribe = onSnapshot(q, (snapshot) => {
          const notifs: any[] = [];
          const unreadDocs: any[] = [];
          
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            notifs.push({ id: docSnap.id, ...data });
            if (!data.read) {
              unreadDocs.push(docSnap.ref);
            }
          });

          // Sort locally
          notifs.sort((a, b) => {
            const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
            const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
            return timeB - timeA;
          });

          setNotifications(notifs);
          setIsLoading(false);

          // Mark unread as read
          if (unreadDocs.length > 0) {
            const batch = writeBatch(db);
            unreadDocs.forEach((ref) => {
              batch.update(ref, { read: true });
            });
            batch.commit().catch(err => console.error("Error marking notifications read:", err));
          }
        });
      } else {
        setIsLoading(false);
        if (unsubscribe) unsubscribe();
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const handleNotificationClick = (notif: any) => {
    if (notif.type === "like") {
      navigate(`/room/${notif.targetId}`);
    } else if (notif.type === "message") {
      navigate(`/messages/${notif.targetId}`);
    } else if (notif.type === "follow") {
      navigate(`/user/${notif.actorId}`);
    }
  };

  return (
    <div className="p-6 font-sans pb-24 md:pb-6 h-full flex flex-col">
      <header className="mb-8 pt-4">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Activity</h1>
        <p className="text-[#666666] text-sm">Stay updated with your network.</p>
      </header>

      {isLoading ? (
        <div className="flex-1 flex justify-center items-center">
          <Disc3 size={48} className="text-[#5D00FF] animate-[spin_4s_linear_infinite]" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center opacity-50">
          <Bell size={48} className="mb-4 text-[#666666]" />
          <h2 className="text-xl font-bold mb-2">No Recent Activity</h2>
          <p className="text-sm text-[#666666] max-w-[200px]">
            When people interact with your rooms or send you messages, you'll see it here.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {notifications.map((notif) => (
            <div 
              key={notif.id}
              onClick={() => handleNotificationClick(notif)}
              className={`p-4 rounded-xl border cursor-pointer transition-colors flex items-start gap-4 ${
                notif.read 
                  ? 'bg-[#111111] border-[#222222] hover:border-[#333333]' 
                  : 'hover-gradient-border bg-[#1A1A1A]'
              }`}
            >
              <div className={`p-3 rounded-full flex-shrink-0 ${notif.type === 'like' ? 'bg-pink-500/10 text-pink-500' : notif.type === 'follow' ? 'bg-[#5D00FF]/10 text-[#5D00FF]' : 'bg-blue-500/10 text-blue-500'}`}>
                {notif.type === 'like' ? <Heart size={20} className="fill-current" /> : notif.type === 'follow' ? <UserPlus size={20} className="fill-current" /> : <MessageCircle size={20} className="fill-current" />}
              </div>
              
              <div className="flex-1 min-w-0">
                <p className="text-[#E4E3E0] text-sm leading-relaxed">
                  <span className="font-bold cursor-pointer hover:underline" onClick={(e) => { e.stopPropagation(); navigate(`/user/${notif.actorId}`); }}>
                    {notif.actorName}
                  </span>
                  {notif.type === 'like' ? ' liked your room ' : notif.type === 'follow' ? ' started following you' : ' sent you a message'}
                  {notif.type !== 'follow' && notif.targetName && <span className="font-bold">"{notif.targetName}"</span>}
                </p>
                <p className="text-[#666666] text-xs mt-1 font-mono">
                  {notif.createdAt?.toDate ? notif.createdAt.toDate().toLocaleString() : 'Just now'}
                </p>
              </div>
              
              {!notif.read && (
                <div className="w-2 h-2 rounded-full bg-[#5D00FF] mt-2 flex-shrink-0" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
