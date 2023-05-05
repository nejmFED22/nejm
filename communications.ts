// Servern skickar
export interface ServerToClientEvents {
  message: (message: string) => void;
  roomCreated: (roomId: string) => void;
  typingStart: (user: string) => void;
  typingStop: (suser: string) => void;
}

// Klienten skickar
export interface ClientToServerEvents {
  message: (message: string, room: string) => void;
  join: (room: string) => void;
  leave: (room: string) => void;
  createRoom: (roomName: string, firstUser: string) => void;
  typingStart: (room: string, user: string) => void;
  typingStop: (room: string, user: string) => void;
}

export interface InterServerEvents {
  ping: () => void;
}

export interface SocketData {
  name: string;
  age: number;
}
