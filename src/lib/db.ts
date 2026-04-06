export interface User {
  id: string;
  name: string;
  email: string;
  genres: string[];
}

export interface Track {
  id: string;
  title: string;
  artist: string;
  platform: string;
  url: string;
}

export interface Room {
  id: string;
  name: string;
  isPrivate: boolean;
  shareCode: string;
  creatorId: string;
  tracks: Track[];
}

class Database {
  private get<T>(key: string, defaultValue: T): T {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : defaultValue;
  }

  private set<T>(key: string, value: T) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  // Users
  getUsers(): User[] {
    return this.get<User[]>('jr_users', []);
  }

  getUser(email: string): User | undefined {
    return this.getUsers().find(u => u.email === email);
  }

  getUserById(id: string): User | undefined {
    return this.getUsers().find(u => u.id === id);
  }

  createUser(user: User) {
    const users = this.getUsers();
    users.push(user);
    this.set('jr_users', users);
  }

  // Auth
  getCurrentUser(): User | null {
    return this.get<User | null>('jr_current_user', null);
  }

  setCurrentUser(user: User | null) {
    this.set('jr_current_user', user);
  }

  // Rooms
  getRooms(): Room[] {
    return this.get<Room[]>('jr_rooms', []);
  }

  getRoom(id: string): Room | undefined {
    return this.getRooms().find(r => r.id === id);
  }

  createRoom(room: Room) {
    const rooms = this.getRooms();
    rooms.push(room);
    this.set('jr_rooms', rooms);
  }

  updateRoom(updatedRoom: Room) {
    const rooms = this.getRooms().map(r => r.id === updatedRoom.id ? updatedRoom : r);
    this.set('jr_rooms', rooms);
  }

  deleteRoom(id: string) {
    const rooms = this.getRooms().filter(r => r.id !== id);
    this.set('jr_rooms', rooms);
  }
}

export const db = new Database();
