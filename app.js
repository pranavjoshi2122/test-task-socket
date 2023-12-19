const express = require("express");
const app = express();
const dateTime = require("simple-datetime-formater");
const bodyParser = require("body-parser");
const chatRouter = require("./route/chatroute");
const loginRouter = require("./route/loginRoute");

const http = require("http").Server(app);

const io = require("socket.io");

const port = 5000;

app.use(bodyParser.json());

app.use("/chats", chatRouter);
app.use("/login", loginRouter);

app.use(express.static(__dirname + "/public"));

const socketIo = io(http);

const Chat = require("./models/Chat");
const connect = require("./dbconnect");

function generateRandomName() {
  const prefixes = ['John', 'Jane', 'Alex', 'Emily', 'Chris', 'Sophie'];
  const suffixes = ['son', 'ston', 'ford', 'shire', 'ton', 'field'];

  const randomPrefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const randomSuffix = suffixes[Math.floor(Math.random() * suffixes.length)];

  return randomPrefix + randomSuffix;
}

const SocketUsers = [];

const handleUserConnection = (socket) => {
  const randomName = generateRandomName();
  const user = {
    socketId: socket.id,
    socketName: randomName,
  };

  SocketUsers.push(user);

  socketIo.emit('userlist', SocketUsers);

  socket.on('disconnect', () => {
    const index = SocketUsers.findIndex((e) => e.socketId === socket.id);
    if (index !== -1) {
      SocketUsers.splice(index, 1);
    }

    socketIo.emit('userlist', SocketUsers);
  });

  socket.on('typing', (data) => {
    socket.broadcast.emit('notifyTyping', {
      user: data.user,
      message: data.message,
    });
  });

  socket.on('stopTyping', () => {
    socket.broadcast.emit('notifyStopTyping');
  });

  socket.on('chat message', async (msg) => {
    socket.broadcast.emit('received', { message: msg, name: randomName });

    try {
      const db = await connect;
      console.log('Connected correctly to the server');
      const chatMessage = new Chat({ message: msg, sender: randomName });
      await chatMessage.save();
    } catch (error) {
      console.error('Error saving chat message:', error);
    }
  });
};

socketIo.on('connection', handleUserConnection);

http.listen(port, () => {
  console.log("Running on Port: " + port);
});
