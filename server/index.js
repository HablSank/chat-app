import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import mongoose from 'mongoose'
import cors from 'cors'
import dotenv from 'dotenv'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

// Models
import User from './models/User.js'
import Message from './models/Message.js'
import Conversation from './models/Conversation.js'

// Middleware
import { protect } from './middleware/authMiddleware.js'
import { uploadAvatar, uploadMedia, uploadMediaMulti } from './config/cloudinary.js'

dotenv.config()

const app = express()
const httpServer = createServer(app)

// Middleware setup
app.use(cors())
app.use(express.json())

const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
})

// ── Database Connection ──────────────────────────────────────────────────────
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB Connected'))
  .catch((err) => console.error('❌ MongoDB Connection Error:', err))

// ── REST API: Authentication ─────────────────────────────────────────────────
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password } = req.body

    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' })
    }

    const existingUser = await User.findOne({ username })
    if (existingUser) {
      return res.status(400).json({ message: 'Username already exists' })
    }

    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(password, salt)

    const avatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`

    const newUser = new User({
      username,
      password: hashedPassword,
      avatar,
      presence: 'offline',
    })

    await newUser.save()

    const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET, {
      expiresIn: '7d',
    })

    res.status(201).json({
      token,
      user: {
        id: newUser._id,
        username: newUser.username,
        avatar: newUser.avatar,
      },
    })
  } catch (error) {
    console.error('Register Error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body

    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' })
    }

    const user = await User.findOne({ username })
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' })
    }

    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' })
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: '7d',
    })

    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        avatar: user.avatar,
      },
    })
  } catch (error) {
    console.error('Login Error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// ── REST API: Users ─────────────────────────────────────────────────────────
app.get('/api/users/search', protect, async (req, res) => {
  try {
    const keyword = req.query.q
      ? {
          username: {
            $regex: req.query.q,
            $options: 'i',
          },
        }
      : {}

    // Exclude current user from search
    const users = await User.find({ ...keyword, _id: { $ne: req.user._id } }).select('-password')
    res.json(users)
  } catch (error) {
    console.error('Search Users Error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// ── REST API: Profile Update ─────────────────────────────────────────────────
app.put('/api/users/profile', protect, uploadAvatar.single('avatar'), async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
    if (!user) return res.status(404).json({ message: 'User not found' })

    if (req.body.displayName !== undefined) user.displayName = req.body.displayName
    if (req.body.bio !== undefined) user.bio = req.body.bio
    if (req.file) user.avatar = req.file.path // Cloudinary URL

    await user.save()

    res.json({
      id:          user._id,
      username:    user.username,
      displayName: user.displayName,
      bio:         user.bio,
      avatar:      user.avatar,
    })
  } catch (error) {
    console.error('Profile Update Error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// ── REST API: Custom Presence ────────────────────────────────────────────────
app.put('/api/users/presence', protect, async (req, res) => {
  try {
    const { presence, statusEmoji } = req.body
    const user = await User.findById(req.user._id)
    if (!user) return res.status(404).json({ message: 'User not found' })

    if (presence) {
      user.presence = presence
      if (presence !== 'offline') {
        user.lastActivePresence = presence
      }
    }
    if (statusEmoji !== undefined) user.statusEmoji = statusEmoji
    
    await user.save()

    // Broadcast to everyone
    io.emit('user:presence_update', {
      userId: user._id,
      presence: user.presence,
      statusEmoji: user.statusEmoji
    })

    res.json({ presence: user.presence, statusEmoji: user.statusEmoji })
  } catch (error) {
    console.error('Presence Update Error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})


// ── REST API: Get User Profile by ID (Friend Profile) ─────────────────────
app.get('/api/users/:id', protect, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password')
    if (!user) return res.status(404).json({ message: 'User not found' })
    res.json(user)
  } catch (error) {
    console.error('Get User Error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

app.get('/api/conversations', protect, async (req, res) => {
  try {
    // Get all conversations where user is a participant and status is not rejected
    // Or if rejected, maybe we just exclude them entirely for the receiver, but let's exclude rejected for both for simplicity.
    const conversations = await Conversation.find({
      participants: req.user._id,
      status: { $ne: 'rejected' },
    })
      .populate('participants', '-password')
      .populate('lastMessage')
      .sort({ updatedAt: -1 })

    const conversationsWithUnread = await Promise.all(
      conversations.map(async (conv) => {
        const unreadCount = await Message.countDocuments({
          conversationId: conv._id,
          sender: { $ne: req.user._id },
          status: { $ne: 'read' },
        })
        const convObj = conv.toObject()
        convObj.unreadCount = unreadCount
        return convObj
      })
    )

    res.json(conversationsWithUnread)
  } catch (error) {
    console.error('Fetch Conversations Error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

app.post('/api/conversations/accept/:id', protect, async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.id)
    if (!conversation) return res.status(404).json({ message: 'Not found' })
    
    // Only the non-initiator can accept
    if (conversation.initiator.toString() === req.user._id.toString()) {
      return res.status(403).json({ message: 'Cannot accept own request' })
    }

    conversation.status = 'accepted'
    await conversation.save()

    // Notify the room
    io.to(conversation._id.toString()).emit('chat:request_action', {
      conversationId: conversation._id,
      status: 'accepted'
    })

    res.json(conversation)
  } catch (error) {
    console.error('Accept Conversation Error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

app.post('/api/conversations/reject/:id', protect, async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.id)
    if (!conversation) return res.status(404).json({ message: 'Not found' })
    
    if (conversation.initiator.toString() === req.user._id.toString()) {
      return res.status(403).json({ message: 'Cannot reject own request' })
    }

    conversation.status = 'rejected'
    await conversation.save()

    io.to(conversation._id.toString()).emit('chat:request_action', {
      conversationId: conversation._id,
      status: 'rejected'
    })

    res.json(conversation)
  } catch (error) {
    console.error('Reject Conversation Error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// ── REST API: Messages ───────────────────────────────────────────────────────
app.get('/api/messages/:conversationId', protect, async (req, res) => {
  try {
    // Mark unread messages from other users in this conversation as read
    await Message.updateMany(
      {
        conversationId: req.params.conversationId,
        sender: { $ne: req.user._id },
        status: { $ne: 'read' },
      },
      { $set: { status: 'read' } }
    )

    // Notify room that messages were read
    io.to(req.params.conversationId).emit('chat:messages_read', {
      conversationId: req.params.conversationId,
      readerId: req.user._id.toString(),
    })

    const messages = await Message.find({ conversationId: req.params.conversationId })
      .populate('sender', 'username avatar')
      .sort({ createdAt: 1 })
    res.json(messages)
  } catch (error) {
    console.error('Fetch Messages Error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// ── REST API: Upload Media in Chat (up to 4 images) ────────────────────
app.post('/api/messages/media', protect, uploadMediaMulti.array('images', 4), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) return res.status(400).json({ message: 'No images provided' })
    const imageUrls = req.files.map(f => f.path)
    res.json({ imageUrls })
  } catch (error) {
    console.error('Media Upload Error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// ── Error Handling Middleware (Ensures JSON response for all Multer / API errors) ──
app.use((err, req, res, next) => {
  console.error('🔥 [Server/Multer Error Details]:', err)
  res.status(err.status || 400).json({
    message: err.message || 'Upload failed',
  })
})

// ── Socket.IO Real-time Logic ────────────────────────────────────────────────
const connectedUsers = new Map()

io.on('connection', (socket) => {
  console.log(`[+] Client connected: ${socket.id}`)

  socket.on('user:join', async (userId) => {
    console.log(`[*] User "${userId}" registered on socket ${socket.id}`)
    connectedUsers.set(userId, socket.id)
    socket.userId = userId

    try {
      const u = await User.findById(userId)
      if (u) {
        const newPresence = u.lastActivePresence || 'online'
        await User.findByIdAndUpdate(userId, { presence: newPresence })
        io.emit('user:presence_update', { userId, presence: newPresence, statusEmoji: u.statusEmoji })
      }

      // Phase 8.4: Deliver pending messages & join all conversation rooms
      const userConvs = await Conversation.find({ participants: userId }).select('_id')
      const convIds = userConvs.map(c => c._id)

      // Join all conversation rooms so user receives real-time events even if chat isn't active
      convIds.forEach(cid => socket.join(cid.toString()))

      const updatedMessages = await Message.find({
        conversationId: { $in: convIds },
        sender: { $ne: userId },
        status: 'sent'
      })

      if (updatedMessages.length > 0) {
        await Message.updateMany(
          { _id: { $in: updatedMessages.map(m => m._id) } },
          { $set: { status: 'delivered' } }
        )

        const convMap = {}
        for (const m of updatedMessages) {
          const cid = m.conversationId.toString()
          if (!convMap[cid]) convMap[cid] = []
          convMap[cid].push(m._id.toString())
        }

        for (const [convId, msgIds] of Object.entries(convMap)) {
          io.to(convId).emit('chat:messages_delivered', {
            conversationId: convId,
            messageIds: msgIds
          })
        }
      }
    } catch (err) {
      console.error('Error updating user online status:', err)
    }
  })

  // Join a private conversation room
  socket.on('join_private_room', (conversationId) => {
    socket.join(conversationId)
    console.log(`[+] Socket ${socket.id} joined room: ${conversationId}`)
  })

  socket.on('chat:private_message', async (payload) => {
    // payload: { from, to, text, contactId }
    // First, find or create the conversation
    try {
      let conversation = await Conversation.findOne({
        participants: { $all: [payload.from, payload.to] }
      })

      if (!conversation) {
        // Create new pending conversation
        conversation = new Conversation({
          participants: [payload.from, payload.to],
          initiator: payload.from,
          status: 'pending'
        })
        await conversation.save()
        
        // Let both users know there's a new conversation
        const fromSocket = connectedUsers.get(payload.from)
        const toSocket = connectedUsers.get(payload.to)
        
        // Fetch populated conversation
        const populatedConv = await Conversation.findById(conversation._id).populate('participants', '-password')
        
        if (fromSocket) {
          const socketInstance = io.sockets.sockets.get(fromSocket)
          if (socketInstance) socketInstance.join(conversation._id.toString())
          io.to(fromSocket).emit('conversation:new', populatedConv)
        }
        if (toSocket) {
          const socketInstance = io.sockets.sockets.get(toSocket)
          if (socketInstance) socketInstance.join(conversation._id.toString())
          io.to(toSocket).emit('conversation:new', populatedConv)
        }
      } else if (conversation.status === 'rejected') {
        // If it was rejected, we could optionally allow them to try again by setting it back to pending
        conversation.status = 'pending'
        conversation.initiator = payload.from
        await conversation.save()
        
        const fromSocket = connectedUsers.get(payload.from)
        const toSocket = connectedUsers.get(payload.to)
        const populatedConv = await Conversation.findById(conversation._id).populate('participants', '-password')
        if (fromSocket) io.to(fromSocket).emit('conversation:new', populatedConv)
        if (toSocket) io.to(toSocket).emit('conversation:new', populatedConv)
      }

      // Create message
      const isRecipientOnline = connectedUsers.has(payload.to)
      const isEphemeral = !!payload.isEphemeral
      const expiresAt = isEphemeral ? new Date(Date.now() + 24 * 60 * 60 * 1000) : undefined

      const message = new Message({
        conversationId: conversation._id,
        sender:   payload.from,
        text:     payload.text || '',
        imageUrl: payload.imageUrls?.[0] || '',
        imageUrls: payload.imageUrls || [],
        status:   isRecipientOnline ? 'delivered' : 'sent',
        isEphemeral,
        expiresAt,
      })
      await message.save()

      // Update last message in conversation
      conversation.lastMessage = message._id
      await conversation.save()

      // Populate sender for the frontend
      const populatedMessage = await Message.findById(message._id).populate('sender', 'username avatar')

      // Emit to the conversation room
      io.to(conversation._id.toString()).emit('chat:private_message', {
        ...populatedMessage.toObject(),
        conversationId: conversation._id.toString()
      })
    } catch (err) {
      console.error('Error handling private message:', err)
    }
  })

  socket.on('user:typing', ({ from, conversationId }) => {
    io.to(conversationId).emit('user:typing', { from, conversationId })
  })

  socket.on('user:stop_typing', ({ from, conversationId }) => {
    io.to(conversationId).emit('user:stop_typing', { from, conversationId })
  })

  // ── Emoji Reactions ──────────────────────────────────────────────────────────
  socket.on('chat:react_message', async ({ messageId, emoji, userId, conversationId }) => {
    try {
      const message = await Message.findById(messageId)
      if (!message) return
      // Toggle: remove if same user re-reacted with same emoji, otherwise add/replace
      const existingIdx = message.reactions.findIndex(r => r.userId.toString() === userId)
      if (existingIdx !== -1) {
        if (message.reactions[existingIdx].emoji === emoji) {
          message.reactions.splice(existingIdx, 1)
        } else {
          message.reactions[existingIdx].emoji = emoji
        }
      } else {
        message.reactions.push({ emoji, userId })
      }
      await message.save()
      io.to(conversationId).emit('chat:reaction_update', {
        messageId,
        reactions: message.reactions,
      })
    } catch (err) {
      console.error('Reaction error:', err)
    }
  })

  // ── Read Receipts ────────────────────────────────────────────────────────────
  socket.on('chat:mark_read', async ({ conversationId, readerId }) => {
    try {
      await Message.updateMany(
        { conversationId, sender: { $ne: readerId }, status: { $ne: 'read' } },
        { $set: { status: 'read' } }
      )
      io.to(conversationId).emit('chat:messages_read', { conversationId, readerId })
    } catch (err) {
      console.error('Mark read error:', err)
    }
  })

  socket.on('disconnect', async () => {
    console.log(`[-] Client disconnected: ${socket.id}`)
    if (socket.userId) {
      connectedUsers.delete(socket.userId)
      
      try {
        await User.findByIdAndUpdate(socket.userId, { presence: 'offline' })
        // We only broadcast presence: offline, we do not clear statusEmoji so they keep it when they reconnect
        io.emit('user:presence_update', { userId: socket.userId, presence: 'offline' })
      } catch (err) {
        console.error('Error updating user offline status:', err)
      }
    }
  })
})

const PORT = process.env.PORT || 3001
httpServer.listen(PORT, () => {
  console.log(`\n🚀  Server running on port ${PORT}\n`)
})
