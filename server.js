const express = require("express");
const { chats } = require("./data/data");
const connectDB = require("./config/db");
const colors = require("colors");
const cors = require("cors"); // ✅ Import cors
const userRoutes = require("./routes/userRoutes");
const chatRoutes = require("./routes/chatRoutes");
const messageRoutes = require("./routes/messageRoutes");
const path = require("path");
const { notFound, errorHandler } = require("./middleware/errorMiddleware");

require("dotenv").config({ path: path.resolve(__dirname, "./.env") });

connectDB();
const app = express();

app.use(express.json()); // to accept JSON data

// ✅ Enable CORS for both local and deployed frontend
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "https://talk-a-tive-backend-5lfo.onrender.com", // replace this with your deployed frontend if needed
    ],
    credentials: true,
  })
);

// Routes
app.use("/api/user", userRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/message", messageRoutes);

// Default route
app.get("/", (req, res) => {
  res.send("API RUN SUCCESSFULLY");
});

// Error middleware
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`Server connected on port ${PORT}`.yellow.bold);
});

// ✅ Socket.io CORS also needs to allow frontend origins
const io = require("socket.io")(server, {
  pingTimeout: 60000,
  cors: {
    origin: [
      "http://localhost:3000",
      "https://your-frontend-domain.com", // again replace with actual domain
    ],
    credentials: true,
  },
});

io.on("connection", (socket) => {
  console.log("connected to socket.io");

  socket.on("setup", (userData) => {
    socket.join(userData._id);
    console.log(userData._id);
    socket.emit("connected");
  });

  socket.on("join chat", (room) => {
    socket.join(room);
    console.log("User joined room " + room);
  });

  socket.on("typing", (room) => socket.in(room).emit("typing"));
  socket.on("stop typing", (room) => socket.in(room).emit("stop typing"));

  socket.on("new message", (newMessageRecieved) => {
    var chat = newMessageRecieved.chat;
    if (!chat.users) return console.log("chat.users not defined");

    chat.users.forEach((user) => {
      if (user._id == newMessageRecieved.sender._id) return;
      socket.in(user._id).emit("message recieved", newMessageRecieved);
    });
  });

  socket.off("setup", () => {
    console.log("Disconnected");
    socket.leave(userData._id);
  });
});
