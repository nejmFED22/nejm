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

  //-------------------------------------STATES AND VARIABLES-------------------------------------//

  const [loggedInUser, setLoggedInUser] = useState(
    sessionStorage.getItem("username") || ""
  );
  const [currentRoom, setCurrentRoom] = useState<string>();
  const [roomList, setRoomList] = useState<Room[]>([]);
  const [sessionList, setSessonList] = useState<Session[]>([]);
  const [userList, setUserList] = useState<User[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);

  useEffect(() => {
    const localSession = sessionStorage.getItem("sessionID")
    if (localSession) {
      socket.auth = { sessionID: localSession };
      socket.connect();
    }
  }, []);

  //-----------------------------FUNCTIONS-----------------------------//

  function joinRoom(room: string) {
    console.log("Joining room: " + room);
    if (currentRoom) {
      console.log(`Left room: ${currentRoom}`);
      socket.emit("leave", currentRoom as string);
    }
    socket.emit("join", room);
    console.log(`Joined room: ${room}`);
    setCurrentRoom(room);
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
    console.log("Sending message:", currentRoom, message);
    socket.emit("message", currentRoom, message);
  };

  useEffect(() => {
    //-----------CONNECTION AND SESSION MANAGEMENT----------//

    function connect() {
      socket.emit("sessions");
      console.log("Connected to server");
    }

    function handleSessions(sessions: Session[]) {
      console.log("Sessions:", sessions);
      setSessonList(sessions);
    }

    function setUserSession({ sessionID }: { sessionID: string }) {
      socket.auth = { sessionID };
      sessionStorage.setItem("sessionID", sessionID);
    }

    function disconnect() {
      console.log("Disconnected from server");
    }

    //------------------USER------------------//

    function getUsers(users: User[]) {
      setUserList(users);
    }

    //------------------ROOM------------------//

    function rooms(rooms: Room[]) {
      setRoomList(rooms);
    }

    function handleRoomHistory(room: string, history: Message[]) {
      if (room === currentRoom) {
        setMessages(history);
      }
    }

    //------------------MESSAGE------------------//

    function message(room: string, message: Message) {
      console.log("Room and current room", room, currentRoom);
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

    //-------------EVENT LISTENERS------------//

    socket.on("connect", connect);
    socket.on("setSession", setUserSession);
    socket.on("updateSessionList", handleSessions);
    socket.on("disconnect", disconnect);
    socket.on("message", message);
    socket.on("privateMessage", message);
    socket.on("typingStart", typingStart);
    socket.on("typingStop", typingStop);
    socket.on("rooms", rooms);
    socket.on("users", getUsers);
    socket.on("roomHistory", handleRoomHistory);

    return () => {
      socket.off("connect", connect);
      socket.off("setSession", setUserSession);
      socket.off("updateSessionList", handleSessions);
      socket.off("disconnect", disconnect);
      socket.off("message", message);
      socket.off("privateMessage", message);
      socket.off("typingStart", typingStart);
      socket.off("typingStop", typingStop);
      socket.off("rooms", rooms);
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
