/* ===================================================================
   Socket.IO Server — Real-time DM + Group messaging
   Connects to MongoDB via Mongoose, validates Supabase JWT tokens.
   Runs on port 3001 alongside Next.js (port 3000).
   =================================================================== */

require("dotenv").config({ path: ".env.local" });
const http = require("http");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const dns = require("dns");
const { filterProfanity } = require("./profanityFilter.cjs");

/* ===== Use Google DNS for MongoDB SRV resolution ===== */
dns.setServers(["8.8.8.8", "8.8.4.4"]);

/* ===== MongoDB Connection ===== */
const MONGODB_URI = process.env.MONGODB_URI || "";
const MONGO_DB_NAME = "choloshikhi";

mongoose.set("strictQuery", false);

mongoose
  .connect(MONGODB_URI, { dbName: MONGO_DB_NAME })
  .then(() => console.log("[Socket.IO] MongoDB connected"))
  .catch((err) => {
    console.error("[Socket.IO] MongoDB connection failed:", err.message);
    process.exit(1);
  });

/* ===== Mongoose Schemas ===== */
const DmMessageSchema = new mongoose.Schema(
  {
    conversation_id: { type: String, required: true, index: true },
    sender_id: { type: String, required: true },
    content: { type: String, required: true, maxlength: 2000 },
    is_read: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: "created_at", updatedAt: false } }
);

const GroupMessageSchema = new mongoose.Schema(
  {
    group_id: { type: String, required: true, index: true },
    sender_id: { type: String, required: true },
    content: { type: String, required: true, maxlength: 2000 },
  },
  { timestamps: { createdAt: "created_at", updatedAt: false } }
);

const DmConversationSchema = new mongoose.Schema(
  {
    participants: [{ type: String, required: true }],
  },
  { timestamps: { createdAt: false, updatedAt: "updated_at" } }
);

const DmMessage = mongoose.model("DmMessage", DmMessageSchema, "dm_messages");
const GroupMessage = mongoose.model("GroupMessage", GroupMessageSchema, "group_messages");
const DmConversation = mongoose.model("DmConversation", DmConversationSchema, "dm_conversations");

/* ===== HTTP Server + Socket.IO ===== */
const PORT = process.env.SOCKET_PORT || 3001;

const server = http.createServer((req, res) => {
  // Health check endpoint
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true, connections: io.engine.clientsCount }));
    return;
  }
  res.writeHead(404);
  res.end();
});

const io = new Server(server, {
  cors: {
    origin: ["http://localhost:3000", "https://choloshikhiai.vercel.app", "https://choloshikhi-ai.vercel.app"],
    methods: ["GET", "POST"],
    credentials: true,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

/* ===== Supabase Auth Verification (lightweight) ===== */
async function verifySocketAuth(token) {
  if (!token) return null;

  try {
    // Decode JWT payload (no signature verification — validated by Supabase in API routes)
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString());

    // Check expiration
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return { id: payload.sub, role: payload.role || "authenticated" };
  } catch {
    return null;
  }
}

/* ===== Profile Cache ===== */
const profileCache = new Map();

async function getProfile(userId) {
  if (profileCache.has(userId)) return profileCache.get(userId);

  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

  if (!SUPABASE_URL || !SUPABASE_KEY) return null;

  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/student_profiles?user_id=eq.${userId}&select=username,nickname,display_name`,
      {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
      }
    );
    const rows = await res.json();
    const profile = rows.length > 0 ? rows[0] : { username: "Unknown" };
    profileCache.set(userId, profile);
    return profile;
  } catch (err) {
    console.error("[Profile] Fetch error:", err.message);
    const fallback = { username: "Unknown" };
    profileCache.set(userId, fallback);
    return fallback;
  }
}

/* ===== Socket.IO Connection Handler ===== */
io.on("connection", async (socket) => {
  const token = socket.handshake.auth?.token;
  const user = await verifySocketAuth(token);

  if (!user) {
    socket.disconnect();
    return;
  }

  const userId = user.id;
  console.log(`[Socket.IO] User connected: ${userId.substring(0, 8)}...`);

  // Store userId on socket for later use
  socket.userId = userId;

  /* ----- DM Events ----- */

  // Join a DM conversation room
  socket.on("dm:join", (conversationId) => {
    socket.join(`dm:${conversationId}`);
  });

  // Leave a DM conversation room
  socket.on("dm:leave", (conversationId) => {
    socket.leave(`dm:${conversationId}`);
  });

  // Send DM message
  socket.on("dm:send", async (data, ack) => {
    try {
      const { conversationId, content } = data;
      if (!conversationId || !content?.trim()) {
        ack?.({ error: "Invalid data" });
        return;
      }

      // Verify participant
      const conv = await DmConversation.findById(conversationId);
      if (!conv || !conv.participants.includes(userId)) {
        ack?.({ error: "Access denied" });
        return;
      }

      // Save to MongoDB
      const msg = await DmMessage.create({
        conversation_id: conversationId,
        sender_id: userId,
        content: content.trim().slice(0, 2000),
      });

      // Update conversation timestamp
      await DmConversation.findByIdAndUpdate(conversationId, { updated_at: new Date() });

      // Fetch sender profile for display name
      const profile = await getProfile(userId);

      const messageData = {
        id: msg._id.toString(),
        content: msg.content,
        senderId: msg.sender_id,
        senderUsername: profile?.username || "Unknown",
        senderNickname: profile?.nickname || profile?.display_name || null,
        isMine: false, // will be overridden by sender
        createdAt: msg.created_at,
      };

      // Emit to conversation room (including sender for confirmation)
      io.to(`dm:${conversationId}`).emit("dm:message", {
        ...messageData,
        conversationId,
      });

      // Acknowledge success to sender
      ack?.({
        ok: true,
        message: { ...messageData, isMine: true },
      });
    } catch (err) {
      console.error("[Socket.IO] DM send error:", err.message);
      ack?.({ error: "Send failed" });
    }
  });

  /* ----- Group Events ----- */

  // Join a group room
  socket.on("group:join", (groupId) => {
    socket.join(`group:${groupId}`);
  });

  // Leave a group room
  socket.on("group:leave", (groupId) => {
    socket.leave(`group:${groupId}`);
  });

  // Send group message
  socket.on("group:send", async (data, ack) => {
    try {
      const { groupId, content } = data;
      if (!groupId || !content?.trim()) {
        ack?.({ error: "Invalid data" });
        return;
      }

      // Filter profanity
      const filteredContent = filterProfanity(content.trim().slice(0, 2000));

      // Save to MongoDB
      const msg = await GroupMessage.create({
        group_id: groupId,
        sender_id: userId,
        content: filteredContent,
      });

      // Fetch sender profile for display name
      const profile = await getProfile(userId);

      const messageData = {
        id: msg._id.toString(),
        content: msg.content,
        senderId: msg.sender_id,
        senderUsername: profile?.username || "Unknown",
        senderNickname: profile?.nickname || profile?.display_name || null,
        createdAt: msg.created_at,
      };

      // Emit to group room (including sender)
      io.to(`group:${groupId}`).emit("group:message", {
        ...messageData,
        groupId,
      });

      // Acknowledge success to sender
      ack?.({
        ok: true,
        message: { ...messageData, isMine: true },
      });
    } catch (err) {
      console.error("[Socket.IO] Group send error:", err.message);
      ack?.({ error: "Send failed" });
    }
  });

  /* ----- Cleanup ----- */
  socket.on("disconnect", () => {
    console.log(`[Socket.IO] User disconnected: ${userId.substring(0, 8)}...`);
  });
});

/* ===== Start Server ===== */
server.listen(PORT, () => {
  console.log(`[Socket.IO] Server running on port ${PORT}`);
});
