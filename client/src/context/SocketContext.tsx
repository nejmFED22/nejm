import {
  PropsWithChildren,
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";
import { Socket, io } from "socket.io-client";
import { Message } from "../../../types";

interface ContextValues {
  socket: Socket;
  loggedInUser: string | null;
  setLoggedInUser: React.Dispatch<React.SetStateAction<string | null>>;
  joinRoom: (room: string) => void;
  sendMessage: (message: Message) => void;
}

const socket = io();

const SocketContext = createContext<ContextValues>(null as any);
export const useSocket = () => useContext(SocketContext);
// export const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io();

function SocketProvider({ children }: PropsWithChildren) {
   const [loggedInUser, setLoggedInUser] = useState(
    localStorage.getItem("username")
  );

  const [messages, setMessages] = useState<Message[]>([]);

  const sendMessage = (message: Message) => {
    socket.emit('message', { content: message.content, author: loggedInUser });
  }


  function joinRoom(room: string) {
    socket.emit("join", room);
  }

  useEffect(() => {
    function connect() {
      console.log("Connected to server");
    }
    function disconnect() {
      console.log("Disconnected from server");
    }

    function roomConfirmation(roomName: string) {
      console.log("Joined room " + roomName);
    }

    function message(content: string, author: string) {
      setMessages((messages) => [...messages, { content, author }])
    }

    socket.on("connect", connect);
    socket.on("message", message);
    socket.on("roomCreated", roomConfirmation);
    socket.on("disconnect", disconnect);

    return () => {
      socket.off("connect", connect);
      socket.off("message", message);
      socket.off("disconnect", disconnect);
    };
  }, []);

  // function sendMessage(message: string) {
  //   socket.emit("message", message);
  // }

  // function createRoom(roomName: string, firstUser: string) {
  //   socket.emit("createRoom", roomName, firstUser);
  //   console.log(socket.id);
  // }

  return (
    <SocketContext.Provider
      value={{ socket, loggedInUser, setLoggedInUser, joinRoom, sendMessage }}
    >
      {children}
    </SocketContext.Provider>
  );
}

export default SocketProvider;
