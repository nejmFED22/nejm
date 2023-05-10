import { createAdapter } from "@socket.io/mongo-adapter";
import { Emitter } from "@socket.io/mongo-emitter";
import { MongoClient } from "mongodb";
import { Server, Socket } from "socket.io";
import { v4 as uuidv4 } from "uuid";
import {
  ClientToServerEvents,
  InterServerEvents,
  ServerToClientEvents,
} from "../communications";
import { Message, Room, Session, SocketData, User } from "../types";
const io = new Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>();

//-------------------------MONGODB SETUP-------------------------//

const DB = "chatterbox";
const COLLECTION = "socket.io-adapter-events";

const mongoClient = new MongoClient(
  // "mongodb+srv://nabl:o8A3Lq7bAFyvlUg1@chatterbox.ugl1wjb.mongodb.net/"
  //"mongodb+srv://jenny:zyqluPwgsy7Scf5H@chatterboxtest.w6o91jx.mongodb.net/"
  "mongodb+srv://marcus:5bgDikBCj7g88b6p@chatterbox.tzxzwxr.mongodb.net/"
);

const main = async () => {
  await mongoClient.connect();

  try {
    await mongoClient.db(DB).createCollection(COLLECTION, {
      capped: true,
      size: 1e6,
    });
  } catch (e) {
    // collection already exists
  }
  const mongoCollection = mongoClient.db(DB).collection(COLLECTION);
  const historyCollection = mongoClient.db(DB).collection("roomHistory");
  const DMHistoryCollection = mongoClient.db(DB).collection("DMroomHistory");
  const sessionCollection = mongoClient.db(DB).collection("session");
  // const sessionEmitter = new Emitter(sessionCollection);

  io.adapter(createAdapter(mongoCollection));

//-----------------SOCKET SESSION SETUP-----------------//

  io.use(async (socket, next) => {
    const sessionID = socket.handshake.auth.sessionID;
    console.log("Session ID: " + sessionID);
    if (sessionID) {
      const session = await sessionCollection.findOne({ sessionID });
      if (session) {
        socket.data.sessionID = session.sessionID;
        socket.data.userID = session.userID;
        socket.data.username = session.username;
        return next();
      }
    }
    const username = socket.handshake.auth.username;
    if (!username) {
      return next(new Error("Not logged in"));
    }
    console.log("Creating user");
    socket.data.sessionID = uuidv4();
    socket.data.userID = uuidv4();
    socket.data.username = username;
    sessionCollection.insertOne({
      sessionID: socket.data.sessionID,
      userID: socket.data.userID,
      username: socket.data.username,
    });
    socket.emit("setSession", {
      username: socket.data.username as string,
      userID: socket.data.userID as string,
      sessionID: socket.data.sessionID as string,
    });
    const sessionList = await updateSessionList();
    io.emit("updateSessionList", sessionList)
    next();
  });

  io.on("connection", async (socket) => {

    //-----------------SOCKET CONNECTION-----------------//

    // Updates session list and room list
    console.log("A user has connected");
    socket.emit("rooms", getRooms());
    const sessionList = await updateSessionList();
    io.emit("updateSessionList", sessionList)
    io.emit("users", getUsers());

    // Disconnecting and leaving all rooms
    socket.on("disconnect", () => {
      io.emit("rooms", getRooms());
      io.emit("users", getUsers());
    });

    //----------------ROOMS----------------//

    // Joins room
    socket.on("join", async (room) => {
      socket.join(room);
      io.emit("rooms", getRooms());
      const roomHistory = await getRoomHistory(room);
      socket.emit("roomHistory", room, roomHistory);
    });

    // Leaves room
    socket.on("leave", (room) => {
      socket.leave(room);
      io.emit("rooms", getRooms());
    });

    // Fetch room history from database
    socket.on("getRoomHistory", async (room: string) => {
      const history = await getRoomHistory(room);
      socket.emit("roomHistory", room, history);
    });

    // Fetch DM room history from database
    // socket.on("getDMRoomHistory", async (room: string) => {
    //   const history = await getDMRoomHistory(room);
    //   socket.emit("roomHistory", room, history);
    // });

    //-----------------MESSAGES-----------------//   

    // Receives and sends out messages
    socket.on("message", async (room: string, message: Message) => {
      console.log(
        `Message received: ${message.content} from ${message.author} in room ${room}`
      );

      // Save message to history collection
      try {
        await historyCollection.insertOne({
          room: room,
          content: message.content,
          author: message.author,
        });
      } catch (e) {
        console.error("Failed to save message to history:", e);
      }

      // Fetch the message from the history collection
      const historyDocs = await historyCollection
        .find({ room, content: message.content, author: message.author })
        .sort({ _id: -1 })
        .limit(1)
        .toArray();
      const retrievedMessage = historyDocs[0];

      io.to(room).emit("message", room, {
        content: retrievedMessage.content,
        author: retrievedMessage.author,
      });
    });

    // Communicate to client that user started typing
    socket.on("typingStart", (room, user) => {
      socket.broadcast.to(room).emit("typingStart", user);
    });

    // Communicate to client that user stopped typing
    socket.on("typingStop", (room, user) => {
      socket.broadcast.to(room).emit("typingStop", user);
    });

    //-----------------PRIVATE MESSAGES-----------------//   

    // Receives and sends out messages
    socket.on("privateMessage", async (room: string, message: Message) => {
      console.log(
        `Message received: ${message.content} from ${message.author} in room ${room}`
      );

      // Save message to history collection
      try {
        await DMHistoryCollection.insertOne({
          room: room,
          content: message.content,
          author: message.author,
        });
      } catch (e) {
        console.error("Failed to save message to history:", e);
      }

      // Fetch the message from the history collection
      const historyDocs = await DMHistoryCollection
        .find({ room, content: message.content, author: message.author })
        .sort({ _id: -1 })
        .limit(1)
        .toArray();
      const retrievedMessage = historyDocs[0];

      io.to(room).emit("message", room, {
        content: retrievedMessage.content,
        author: retrievedMessage.author,
      });
    });    
  });

  //-----------------SERVER FUNCTIONS-----------------//

  // Updates list of rooms
  function getRooms() {
    const { rooms } = io.sockets.adapter;
    const roomList: Room[] = [];

    for (const [name, setOfSocketIds] of rooms) {
      if (!setOfSocketIds.has(name)) {
        roomList.push({
          name: name,
          onlineUsers: setOfSocketIds.size,
        });
      }
    }
    return roomList;
  }

  // Updates list of sessions
  async function updateSessionList(): Promise<Session[]> {
    const sessions = await sessionCollection.find().toArray();
    return sessions.map(({ sessionID, userID, username }) => ({
      sessionID,
      userID,
      username,
    }));
  }

  // Updates list of users
  function getUsers() {
    const userList: User[] = [];
    console.log(userList);
    for (let [id, socket] of io.of("/").sockets) {
      userList.push({
        userID: id,
        username: socket.data.username as string,
        sessionID: socket.data.sessionID as string,
      });
    }
    return userList;
  }

  // Fetches room history from database
  async function getRoomHistory(room: string) {
    const historyDocs = await historyCollection.find({ room }).toArray();
    const history: Message[] = historyDocs.map((doc) => {
      return {
        content: doc.content,
        author: doc.author,
      };
    });
    return history;
  }

  // Starts server
  io.listen(3000);
  console.log("listening on port 3000");
};

main();
