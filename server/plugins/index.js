// server/socket.ts
import { Server } from "socket.io";
import { createServer } from "http";

export default defineNitroPlugin((nitroApp) => {
  // 创建原生 HTTP 服务器并挂载到 Nitro
  const server = createServer(nitroApp.node?.handler);
  const io = new Server(server, {
    cors: {
      origin: "*",
    },
  });

  const rooms = {}; // 存储房间信息
  const socks = {}; // 存储用户 socket 信息

  io.on("connection", (socket) => {
    console.log("客户端连接", socket.id);

    socket.emit("connectionSuccess", socket.id);
    // 用户断开连接
    socket.on("userLeave", ({ userName, roomId, sockId } = user) => {
      console.log(
        `userName:${userName}, roomId:${roomId}, sockId:${sockId} 断开了连接...`
      );
      if (roomId && rooms[roomId] && rooms[roomId].length) {
        rooms[roomId] = rooms[roomId].filter((item) => item.sockId !== sockId);
        io.in(roomId).emit("userLeave", rooms[roomId]);
        console.log(
          `userName:${userName}, roomId:${roomId}, sockId:${sockId} 离开了房间...`
        );
      }
    });
    // 用户加入房间
    socket.on("checkRoom", ({ userName, roomId, sockId }) => {
      rooms[roomId] = rooms[roomId] || [];
      socket.emit("checkRoomSuccess", rooms[roomId]);
      if (rooms[roomId]?.find(item => item.userName === userName)) {
        return false;
      }
      if (rooms[roomId].length > 1) return false;
      rooms[roomId].push({ userName, roomId, sockId });
      socket.join(roomId);
      io.in(roomId).emit("joinRoomSuccess", rooms[roomId]);
      socks[sockId] = socket;
      console.log(
        `userName:${userName}, roomId:${roomId}, sockId:${sockId} 成功加入房间!!!`
      );
    });
    // 发送视频
    socket.on("toSendVideo", (user) => {
      io.in(user.roomId).emit("receiveVideo", user);
    });
    // 取消发送视频
    socket.on("cancelSendVideo", (user) => {
      io.in(user.roomId).emit("cancelSendVideo", user);
    });
    // 接收视频邀请
    socket.on("receiveVideo", (user) => {
      io.in(user.roomId).emit("receiveVideo", user);
    });
    // 拒绝接收视频
    socket.on("rejectReceiveVideo", (user) => {
      io.in(user.roomId).emit("rejectReceiveVideo", user);
    });
    // 接听视频
    socket.on("answerVideo", (user) => {
      io.in(user.roomId).emit("answerVideo", user);
    });
    // 挂断视频
    socket.on("hangupVideo", (user) => {
      io.in(user.roomId).emit("hangupVideo", user);
    });
    // addIceCandidate
    socket.on("addIceCandidate", (data) => {
      const toUser = rooms[data.user.roomId].find(
        (item) => item.sockId !== data.user.sockId
      );
      socks[toUser.sockId].emit("addIceCandidate", data.candidate);
    });
    socket.on("receiveOffer", (data) => {
      const toUser = rooms[data.user.roomId].find(
        (item) => item.sockId !== data.user.sockId
      );
      socks[toUser.sockId].emit("receiveOffer", data.offer);
    });
    socket.on("receiveAnsewer", (data) => {
      const toUser = rooms[data.user.roomId].find(
        (item) => item.sockId !== data.user.sockId
      );
      socks[toUser.sockId].emit("receiveAnsewer", data.answer);
    });

    socket.on("disconnect", () => {
      console.log("用户断开连接");
    });
  });

  server.listen(3001, () => {
    console.log("🔌 Socket.IO 运行在 http://localhost:3001");
  });
});
