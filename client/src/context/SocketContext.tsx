import {
  PropsWithChildren,
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";
import { Socket, io } from "socket.io-client";
import { Message, Room, Session, User } from "../../../types";

// Context setup
interface ContextValues {
  socket: Socket;
  loggedInUser: string;
  setLoggedInUser: React.Dispatch<React.SetStateAction<string>>;
  typingUsers: string[];
  typingStart: () => void;
  typingStop: () => void;
  joinRoom: (room: string) => void;
  leaveAllRooms: () => void;
  messages: Message[];
  sendMessage: (message: Message) => void;
  currentRoom?: string;
  roomList?: Room[];
  userList: User[];
  sessionList: Session[];
}

const SocketContext = createContext<ContextValues>(null as any);
export const useSocket = () => useContext(SocketContext);
const socket = io({ autoConnect: false });

function SocketProvider({ children }: PropsWithChildren) {
  // States and variables

  // TODO: Create a sessionStorage-hook

  //-------------------------------------STATES AND VARIABLES-------------------------------------//

  const [loggedInUser, setLoggedInUser] = useState(
    sessionStorage.getItem("username") || ""
  );
  const [localSession, setLocalSession] = useState<string>(
    sessionStorage.getItem("sessionID") || ""
  );
  const [currentRoom, setCurrentRoom] = useState<string>();
  const [roomList, setRoomList] = useState<Room[]>([]);
  const [sessionList, setSessonList] = useState<Session[]>([]);
  const [userList, setUserList] = useState<User[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);

  useEffect(() => {
    socket.auth = { sessionID: localSession };
    socket.connect();
  }, [localSession]);

  // useEffect(() => {
  //   socket.emit("rooms");
  // });

  //-------------------------------------FUNCTIONS-------------------------------------//

  function joinRoom(room: string) {
    //console.log("Context joining room: " + room);
    if (currentRoom) {
      console.log(`Context left room: ${currentRoom}`);
      socket.emit("leave", currentRoom as string);
    }
    socket.emit("join", room);
    setCurrentRoom(room);
    //console.log(`Joined room: ${room}`);
    // socket.once("joined", (joinedRoom: string) => {
    //   setCurrentRoom(joinedRoom);
    //   //console.log(`Joined room: ${joinedRoom}`);
    // });
    socket.emit("getRoomHistory", room);
  }

  function leaveAllRooms() {
    socket.emit("leave", currentRoom as string);
    setCurrentRoom(undefined);
  }

  function typingStart() {
    socket.emit("typingStart", currentRoom, loggedInUser);
  }

  function typingStop() {
    socket.emit("typingStop", currentRoom, loggedInUser);
  }

  const sendMessage = (message: Message) => {
    if (!currentRoom) throw Error("Can't send message without a room");
    socket.emit("message", currentRoom, message);
  };

  // Listening from server
  useEffect(() => {
    //------------------CONNECTION------------------//

    function connect() {
      socket.emit("sessions");
    }

    // Vad gör den här funktionen?
    function handleSessions(sessions: Session[]) {
      setSessonList(sessions);
    }

    function disconnect() {
      console.log("Disconnected from server");
    }

    //------------------USERS------------------//

    function getUsers(users: User[]) {
      setUserList(users.map(user => ({ ...user, isConnected: true })));
    }

    //------------------ROOM------------------//

    function rooms(rooms: Room[]) {
      console.log("CONTEXT Received rooms list:", rooms);
      setRoomList(rooms);
      console.log(rooms);
    }

    function handleRoomHistory(room: string, history: Message[]) {
      if (room === currentRoom) {
        setMessages(history);
      }
    }

    //------------------MESSAGE------------------//

    function message(room: string, message: Message) {
      if (room === currentRoom) {
        setMessages((messages) => [...messages, message]);
      }
    }

    function typingStart(user: string) {
      setTypingUsers((users) => [...users, user]);
    }

    function typingStop(user: string) {
      setTypingUsers((users) => users.filter((u) => u !== user));
    }

    socket.on("session", ({ sessionID }) => {
      socket.auth = { sessionID };
      sessionStorage.setItem("sessionID", sessionID);
    });

    socket.on("connect", connect);
    socket.on("sessions", handleSessions);
    socket.on("disconnect", disconnect);
    socket.on("message", message);
    socket.on("typingStart", typingStart);
    socket.on("typingStop", typingStop);
    socket.on("rooms", rooms);
    socket.on("users", getUsers);
    socket.on("roomHistory", handleRoomHistory);

    return () => {
      socket.off("connect", connect);
      socket.off("sessions", handleSessions);
      socket.off("disconnect", disconnect);
      socket.off("message", message);
      socket.off("typingStart", typingStart);
      socket.off("typingStop", typingStop);
      socket.off("getRooms", rooms);
      socket.off("users", getUsers);
      socket.off("roomHistory", handleRoomHistory);
    };
  }, [currentRoom]);

  return (
    <SocketContext.Provider
      value={{
        socket,
        loggedInUser,
        setLoggedInUser,
        leaveAllRooms,
        typingUsers,
        typingStart,
        typingStop,
        joinRoom,
        messages,
        currentRoom,
        roomList,
        userList,
        sendMessage,
        sessionList,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}

export default SocketProvider;
