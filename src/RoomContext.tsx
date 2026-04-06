import React, { createContext, useContext, useState } from 'react';

interface MinimizedRoom {
  id: string;
  name: string;
  creatorName: string;
  trackCount: number;
}

interface RoomContextType {
  minimizedRooms: MinimizedRoom[];
  addMinimizedRoom: (room: MinimizedRoom) => void;
  removeMinimizedRoom: (id: string) => void;
}

const RoomContext = createContext<RoomContextType | undefined>(undefined);

export function RoomProvider({ children }: { children: React.ReactNode }) {
  const [minimizedRooms, setMinimizedRooms] = useState<MinimizedRoom[]>([]);

  const addMinimizedRoom = (room: MinimizedRoom) => {
    setMinimizedRooms(prev => {
      // Don't add if already exists, just update it
      const exists = prev.find(r => r.id === room.id);
      if (exists) {
        return prev.map(r => r.id === room.id ? room : r);
      }
      return [...prev, room];
    });
  };

  const removeMinimizedRoom = (id: string) => {
    setMinimizedRooms(prev => prev.filter(r => r.id !== id));
  };

  return (
    <RoomContext.Provider value={{ minimizedRooms, addMinimizedRoom, removeMinimizedRoom }}>
      {children}
    </RoomContext.Provider>
  );
}

export function useRoomContext() {
  const context = useContext(RoomContext);
  if (context === undefined) {
    throw new Error('useRoomContext must be used within a RoomProvider');
  }
  return context;
}
