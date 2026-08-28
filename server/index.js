import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import mongoose from 'mongoose'
import cors from 'cors'
import dotenv from 'dotenv'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import path from 'path'
import { fileURLToPath } from 'url'
import compression from 'compression'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Models
import User from './models/User.js'
import Message from './models/Message.js'
import Conversation from './models/Conversation.js'

// Middleware
import { protect } from './middleware/authMiddleware.js'
import { uploadAvatar, uploadMedia, uploadMediaMulti, uploadAudio } from './config/cloudinary.js'

dotenv.config()

const app = express()
const httpServer = createServer(app)

// Enable Gzip HTTP compression for fast tunnel responses
app.use(compression())

// Middleware setup - Permissive CORS for Cloudflare / Serveo tunnels & dynamic origins
app.use(
  cors({
    origin: true, // Echo request origin (allows credentials & any tunnel domain)
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
)
app.use(express.json({ limit: '10mb' }))

const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  // Enable WebSocket payload compression
  perMessageDeflate: {
    threshold: 1024,
  },
  httpCompression: true,
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
        id:          newUser._id,
        username:    newUser.username,
        displayName: newUser.displayName || '',
        bio:         newUser.bio || 'Hey there! I am using Chat App.',
        avatar:      newUser.avatar,
        presence:    newUser.presence || 'offline',
        statusEmoji: newUser.statusEmoji || '',
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
        id:          user._id,
        username:    user.username,
        displayName: user.displayName || '',
        bio:         user.bio || 'Hey there! I am using Chat App.',
        avatar:      user.avatar,
        presence:    user.presence || 'offline',
        statusEmoji: user.statusEmoji || '',
      },
    })
  } catch (error) {
    console.error('Login Error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// ── REST API: Check Auth / Get Current User Session ────────────────────────
app.get('/api/auth/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password')
    if (!user) return res.status(404).json({ message: 'User not found' })

    res.json({
      id:          user._id,
      username:    user.username,
      displayName: user.displayName || '',
      bio:         user.bio || 'Hey there! I am using Chat App.',
      avatar:      user.avatar,
      presence:    user.presence || 'online',
      statusEmoji: user.statusEmoji || '',
    })
  } catch (error) {
    console.error('Check Auth Error:', error)
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
    
    // Find accepted 1-on-1 conversations for current user
    const acceptedConvs = await Conversation.find({
      participants: req.user._id,
      status: 'accepted',
      isGroup: { $ne: true },
    }).select('participants')

    const acceptedFriendIds = new Set(
      acceptedConvs.flatMap(c => c.participants.map(p => p.toString())).filter(id => id !== req.user._id.toString())
    )

    const sanitizedUsers = users.map(u => {
      const isAccepted = acceptedFriendIds.has(u._id.toString())
      if (isAccepted) return u
      return {
        _id: u._id,
        username: u.username,
        displayName: u.displayName || u.username,
        avatar: u.avatar,
        presence: 'offline',
        statusEmoji: '',
        isLocked: true,
      }
    })

    res.json(sanitizedUsers)
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
    if (req.body.statusEmoji !== undefined) user.statusEmoji = req.body.statusEmoji
    if (req.file) user.avatar = req.file.path // Cloudinary URL

    await user.save()

    res.json({
      id:          user._id,
      username:    user.username,
      displayName: user.displayName,
      bio:         user.bio,
      avatar:      user.avatar,
      presence:    user.presence,
      statusEmoji: user.statusEmoji,
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
        user.isOnline = true
      } else {
        user.isOnline = false
        user.lastSeen = new Date()
      }
    }
    if (statusEmoji !== undefined) user.statusEmoji = statusEmoji
    
    await user.save()

    // Broadcast to everyone
    io.emit('user:presence_update', {
      userId: user._id,
      presence: user.presence,
      statusEmoji: user.statusEmoji,
      isOnline: user.isOnline,
      lastSeen: user.lastSeen,
    })

    res.json({
      presence: user.presence,
      statusEmoji: user.statusEmoji,
      isOnline: user.isOnline,
      lastSeen: user.lastSeen,
    })
  } catch (error) {
    console.error('Presence Update Error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})


// ── REST API: Get User Profile by ID (Friend Profile) ─────────────────────
app.get('/api/users/:id', protect, async (req, res) => {
  try {
    const targetUserId = req.params.id
    const user = await User.findById(targetUserId).select('-password')
    if (!user) return res.status(404).json({ message: 'User not found' })

    const isSelf = req.user._id.toString() === targetUserId
    if (isSelf) {
      return res.json(user)
    }

    // Check if there is an accepted conversation or shared group
    const acceptedConv = await Conversation.findOne({
      participants: { $all: [req.user._id, targetUserId] },
      status: { $in: ['accepted', undefined] },
    })

    if (!acceptedConv) {
      return res.json({
        _id: user._id,
        username: user.username,
        displayName: user.displayName || user.username,
        avatar: user.avatar,
        bio: 'Profil dan bio disembunyikan sampai permintaan pesan diterima.',
        isOnline: false,
        presence: 'offline',
        statusEmoji: '',
        isLocked: true,
      })
    }

    res.json(user)
  } catch (error) {
    console.error('Get User Error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// ── REST API: Find Existing 1-on-1 Conversation by Target User ID ───────────
app.get('/api/conversations/find/:userId', protect, async (req, res) => {
  try {
    const targetUserId = req.params.userId
    const conversation = await Conversation.findOne({
      isGroup: { $ne: true },
      participants: { $all: [req.user._id, targetUserId] },
      status: { $ne: 'rejected' },
    })
      .populate('participants', '-password')
      .populate('lastMessage')

    if (!conversation) {
      return res.json({ conversation: null })
    }

    res.json({ conversation })
  } catch (error) {
    console.error('Find Conversation Error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

app.get('/api/conversations', protect, async (req, res) => {
  try {
    const userId = req.user._id
    // Get all conversations where user is a participant OR has a pending group invitation
    const conversations = await Conversation.find({
      $or: [
        { participants: userId },
        { isGroup: true, pendingMembers: userId },
      ],
      status: { $ne: 'rejected' },
    })
      .populate('participants', '-password')
      .populate('pendingMembers', '-password')
      .populate('groupAdmin', '-password')
      .populate('groupAdmins', '-password')
      .populate('lastMessage')
      .sort({ updatedAt: -1 })

    const conversationsWithUnread = await Promise.all(
      conversations.map(async (conv) => {
        const unreadCount = await Message.countDocuments({
          conversationId: conv._id,
          sender: { $ne: userId },
          status: { $ne: 'read' },
        })
        const convObj = conv.toObject()
        convObj.unreadCount = unreadCount
        if (conv.isGroup && (conv.pendingMembers || []).some(p => (p._id?.toString() || p.toString()) === userId.toString())) {
          convObj.isPendingInvite = true
          convObj.status = 'pending'
        }
        return convObj
      })
    )

    res.json(conversationsWithUnread)
  } catch (error) {
    console.error('Fetch Conversations Error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// ── REST API: Create Group Conversation ─────────────────────────────────────
app.post('/api/conversations/group', protect, async (req, res) => {
  try {
    const { groupName, memberIds, groupAvatar } = req.body

    if (!groupName || !groupName.trim()) {
      return res.status(400).json({ message: 'Group name is required' })
    }

    if (!Array.isArray(memberIds) || memberIds.length < 1) {
      return res.status(400).json({ message: 'At least one other member is required' })
    }

    // Pending invited members (excluding creator)
    const invitedUserIds = Array.from(
      new Set(memberIds.map(id => id.toString()).filter(id => id !== req.user._id.toString()))
    )

    const avatarUrl = groupAvatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(groupName.trim())}`
    const now = new Date()

    const newGroup = new Conversation({
      isGroup: true,
      groupName: groupName.trim(),
      groupAvatar: avatarUrl,
      groupAdmin: req.user._id,
      groupAdmins: [req.user._id],
      memberDetails: [{ user: req.user._id, joinedAt: now }],
      initiator: req.user._id,
      participants: [req.user._id],
      pendingMembers: invitedUserIds,
      status: 'accepted',
    })

    await newGroup.save()

    // Create system message for group creation
    const creatorName = req.user.displayName || req.user.username
    const systemMsg = new Message({
      conversationId: newGroup._id,
      sender: req.user._id,
      isSystem: true,
      systemText: `${creatorName} created group "${groupName.trim()}"`,
      status: 'delivered',
    })
    await systemMsg.save()

    newGroup.lastMessage = systemMsg._id
    await newGroup.save()

    const populatedGroup = await Conversation.findById(newGroup._id)
      .populate('participants', '-password')
      .populate('pendingMembers', '-password')
      .populate('groupAdmin', '-password')
      .populate('groupAdmins', '-password')
      .populate('lastMessage')

    const groupObj = populatedGroup.toObject()
    groupObj.unreadCount = 0

    // Auto-join creator socket room
    const creatorSockets = connectedUsers.get(req.user._id.toString())
    if (creatorSockets) {
      creatorSockets.forEach(sockId => {
        const s = io.sockets.sockets.get(sockId)
        if (s) s.join(newGroup._id.toString())
      })
    }

    // Notify creator
    io.to(newGroup._id.toString()).emit('group:created', groupObj)

    // Notify invited members with pending invite state
    invitedUserIds.forEach(uid => {
      const uSockets = connectedUsers.get(uid)
      if (uSockets) {
        const inviteObj = { ...groupObj, status: 'pending', isPendingInvite: true }
        uSockets.forEach(sockId => {
          io.to(sockId).emit('conversation:new', inviteObj)
          io.to(sockId).emit('group:created', inviteObj)
        })
      }
    })

    res.status(201).json(groupObj)
  } catch (error) {
    console.error('Create Group Error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// ── REST API: Update Group Members & Settings ────────────────────────────────
app.put('/api/conversations/:id/members', protect, async (req, res) => {
  try {
    const { memberIds, groupName, groupAvatar } = req.body
    const conversation = await Conversation.findById(req.params.id)

    if (!conversation) return res.status(404).json({ message: 'Conversation not found' })
    if (!conversation.isGroup) return res.status(400).json({ message: 'Not a group conversation' })

    const currentUserId = req.user._id.toString()
    const currentAdmins = (conversation.groupAdmins && conversation.groupAdmins.length > 0)
      ? conversation.groupAdmins.map(a => a.toString())
      : [conversation.groupAdmin?.toString()].filter(Boolean)

    if (!currentAdmins.includes(currentUserId)) {
      return res.status(403).json({ message: 'Only group admins can modify group settings' })
    }

    let systemNotifications = []
    const actorName = req.user.displayName || req.user.username

    if (groupName && groupName.trim() && groupName.trim() !== conversation.groupName) {
      conversation.groupName = groupName.trim()
      systemNotifications.push(`${actorName} changed the group name to "${groupName.trim()}"`)
    }
    if (groupAvatar && groupAvatar !== conversation.groupAvatar) {
      conversation.groupAvatar = groupAvatar
      systemNotifications.push(`${actorName} changed the group icon`)
    }

    let newlyInvitedIds = []
    if (Array.isArray(memberIds)) {
      const oldParticipantIds = conversation.participants.map(p => (p._id?.toString() || p.toString()))
      const oldPendingIds = (conversation.pendingMembers || []).map(p => (p._id?.toString() || p.toString()))

      const requestedIds = Array.from(
        new Set([req.user._id.toString(), ...memberIds.map(id => id.toString())])
      )

      // Newly invited members (not in participants, not already in pending)
      const addedIds = requestedIds.filter(id => !oldParticipantIds.includes(id) && !oldPendingIds.includes(id))
      // Removed members (were in participants, but omitted from memberIds)
      const removedIds = oldParticipantIds.filter(id => !requestedIds.includes(id))

      // Update pendingMembers with added members (do NOT put directly into participants)
      if (addedIds.length > 0) {
        newlyInvitedIds = addedIds
        const addedUsers = await User.find({ _id: { $in: addedIds } }).select('username displayName')
        const addedNames = addedUsers.map(u => u.displayName || u.username).join(', ')

        if (!conversation.pendingMembers) conversation.pendingMembers = []
        addedIds.forEach(uid => {
          if (!conversation.pendingMembers.some(p => (p._id?.toString() || p.toString()) === uid)) {
            conversation.pendingMembers.push(uid)
          }
        })

        systemNotifications.push(`${actorName} mengundang ${addedNames} ke grup`)
      }

      // Handle removed members
      if (removedIds.length > 0) {
        const initiatorId = conversation.initiator?.toString()
        if (removedIds.includes(initiatorId)) {
          return res.status(403).json({ message: 'The group owner/creator cannot be removed from the group' })
        }

        const removedUsers = await User.find({ _id: { $in: removedIds } }).select('username displayName')
        const removedNames = removedUsers.map(u => u.displayName || u.username).join(', ')

        // Remove from participants, admins, and memberDetails
        conversation.participants = conversation.participants.filter(p => !removedIds.includes(p._id?.toString() || p.toString()))
        conversation.groupAdmins = conversation.groupAdmins.filter(a => !removedIds.includes(a._id?.toString() || a.toString()))
        if (conversation.memberDetails) {
          conversation.memberDetails = conversation.memberDetails.filter(m => !removedIds.includes(m.user?.toString() || m.user?._id?.toString()))
        }

        systemNotifications.push(`${actorName} removed ${removedNames}`)
      }
    }

    await conversation.save()

    // Save and broadcast system messages
    for (const text of systemNotifications) {
      const sysMsg = new Message({
        conversationId: conversation._id,
        sender: req.user._id,
        isSystem: true,
        systemText: text,
        status: 'delivered',
      })
      await sysMsg.save()
      conversation.lastMessage = sysMsg._id
      await conversation.save()

      io.to(conversation._id.toString()).emit('chat:private_message', {
        ...sysMsg.toObject(),
        sender: {
          _id: req.user._id,
          username: req.user.username,
          displayName: req.user.displayName,
          avatar: req.user.avatar,
        },
        conversationId: conversation._id.toString(),
      })
    }

    const populatedGroup = await Conversation.findById(conversation._id)
      .populate('participants', '-password')
      .populate('pendingMembers', '-password')
      .populate('groupAdmin', '-password')
      .populate('groupAdmins', '-password')
      .populate('lastMessage')

    io.to(conversation._id.toString()).emit('group:updated', populatedGroup)

    // Notify newly invited members with pending invite state
    if (newlyInvitedIds.length > 0) {
      const groupObj = populatedGroup.toObject()
      newlyInvitedIds.forEach(uid => {
        const uSockets = connectedUsers.get(uid)
        if (uSockets) {
          const inviteObj = { ...groupObj, status: 'pending', isPendingInvite: true }
          uSockets.forEach(sockId => {
            io.to(sockId).emit('conversation:new', inviteObj)
            io.to(sockId).emit('group_invite_sent', inviteObj)
            io.to(sockId).emit('group:created', inviteObj)
          })
        }
      })
    }

    res.json(populatedGroup)
  } catch (error) {
    console.error('Update Group Error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// ── REST API: Manage Group Admin Roles (Grant / Revoke) ──────────────────────
app.put('/api/conversations/:id/admin', protect, async (req, res) => {
  try {
    const { targetUserId, action = 'grant' } = req.body
    const conversation = await Conversation.findById(req.params.id)

    if (!conversation) return res.status(404).json({ message: 'Conversation not found' })
    if (!conversation.isGroup) return res.status(400).json({ message: 'Not a group conversation' })

    const currentUserId = req.user._id.toString()
    const currentAdmins = (conversation.groupAdmins && conversation.groupAdmins.length > 0)
      ? conversation.groupAdmins.map(a => a.toString())
      : [conversation.groupAdmin?.toString()].filter(Boolean)

    if (!currentAdmins.includes(currentUserId)) {
      return res.status(403).json({ message: 'Only group admins can manage admin roles' })
    }

    if (!conversation.participants.some(p => p.toString() === targetUserId.toString())) {
      return res.status(400).json({ message: 'User must be an existing group member' })
    }

    const targetUser = await User.findById(targetUserId)
    if (!targetUser) return res.status(404).json({ message: 'Target user not found' })

    const actorName = req.user.displayName || req.user.username
    const targetName = targetUser.displayName || targetUser.username
    let systemText = ''
    const targetIdStr = targetUserId.toString()

    if (action === 'revoke') {
      const initiatorId = conversation.initiator?.toString()
      if (targetIdStr === initiatorId) {
        return res.status(403).json({ message: 'The group owner/creator cannot be dismissed as admin' })
      }
      if (currentAdmins.length <= 1 && currentAdmins.includes(targetIdStr)) {
        return res.status(400).json({ message: 'Group must have at least one admin' })
      }
      conversation.groupAdmins = currentAdmins.filter(id => id !== targetIdStr)
      if (conversation.groupAdmin?.toString() === targetIdStr) {
        conversation.groupAdmin = conversation.groupAdmins[0]
      }
      systemText = `${actorName} dismissed ${targetName} as group admin`
    } else {
      // Grant admin role
      if (!currentAdmins.includes(targetIdStr)) {
        conversation.groupAdmins = [...currentAdmins, targetUserId]
      }
      systemText = `${actorName} made ${targetName} a group admin`
    }

    await conversation.save()

    // Save and broadcast system notification
    const sysMsg = new Message({
      conversationId: conversation._id,
      sender: req.user._id,
      isSystem: true,
      systemText,
      status: 'delivered',
    })
    await sysMsg.save()
    conversation.lastMessage = sysMsg._id
    await conversation.save()

    const populatedGroup = await Conversation.findById(conversation._id)
      .populate('participants', '-password')
      .populate('groupAdmin', '-password')
      .populate('groupAdmins', '-password')
      .populate('lastMessage')

    io.to(conversation._id.toString()).emit('chat:private_message', {
      ...sysMsg.toObject(),
      sender: {
        _id: req.user._id,
        username: req.user.username,
        displayName: req.user.displayName,
        avatar: req.user.avatar,
      },
      conversationId: conversation._id.toString(),
    })

    io.to(conversation._id.toString()).emit('group:updated', populatedGroup)
    res.json(populatedGroup)
  } catch (error) {
    console.error('Admin Role Error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// ── REST API: Upload Group Avatar (Cloudinary) ──────────────────────────────
app.post('/api/conversations/:id/avatar', protect, uploadAvatar.single('avatar'), async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.id)
    if (!conversation) return res.status(404).json({ message: 'Conversation not found' })
    if (!conversation.isGroup) return res.status(400).json({ message: 'Not a group conversation' })

    const currentUserId = req.user._id.toString()
    const currentAdmins = (conversation.groupAdmins && conversation.groupAdmins.length > 0)
      ? conversation.groupAdmins.map(a => a.toString())
      : [conversation.groupAdmin?.toString()].filter(Boolean)

    if (!currentAdmins.includes(currentUserId)) {
      return res.status(403).json({ message: 'Only group admins can update group avatar' })
    }
    if (!req.file) return res.status(400).json({ message: 'Avatar image is required' })

    conversation.groupAvatar = req.file.path
    await conversation.save()

    const actorName = req.user.displayName || req.user.username
    const sysMsg = new Message({
      conversationId: conversation._id,
      sender: req.user._id,
      isSystem: true,
      systemText: `${actorName} updated the group avatar`,
      status: 'delivered',
    })
    await sysMsg.save()
    conversation.lastMessage = sysMsg._id
    await conversation.save()

    const populatedGroup = await Conversation.findById(conversation._id)
      .populate('participants', '-password')
      .populate('groupAdmin', '-password')
      .populate('groupAdmins', '-password')
      .populate('lastMessage')

    io.to(conversation._id.toString()).emit('chat:private_message', {
      ...sysMsg.toObject(),
      sender: {
        _id: req.user._id,
        username: req.user.username,
        displayName: req.user.displayName,
        avatar: req.user.avatar,
      },
      conversationId: conversation._id.toString(),
    })

    io.to(conversation._id.toString()).emit('group:updated', populatedGroup)
    res.json(populatedGroup)
  } catch (error) {
    console.error('Upload Group Avatar Error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// ── REST API: Leave Group ───────────────────────────────────────────────────
app.post('/api/conversations/:id/leave', protect, async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.id)
    if (!conversation) return res.status(404).json({ message: 'Conversation not found' })
    if (!conversation.isGroup) return res.status(400).json({ message: 'Not a group conversation' })

    const userIdStr = req.user._id.toString()
    conversation.participants = conversation.participants.filter(p => p.toString() !== userIdStr)
    conversation.groupAdmins = (conversation.groupAdmins || []).filter(a => a.toString() !== userIdStr)
    conversation.memberDetails = (conversation.memberDetails || []).filter(m => m.user?.toString() !== userIdStr)

    const actorName = req.user.displayName || req.user.username

    if (conversation.participants.length === 0) {
      await Conversation.findByIdAndDelete(conversation._id)
      return res.json({ message: 'Group deleted since all members left' })
    }

    // If no admin left, promote the first remaining member
    if (!conversation.groupAdmins || conversation.groupAdmins.length === 0) {
      conversation.groupAdmins = [conversation.participants[0]]
      conversation.groupAdmin = conversation.participants[0]
    } else if (conversation.groupAdmin?.toString() === userIdStr) {
      conversation.groupAdmin = conversation.groupAdmins[0]
    }

    await conversation.save()

    // System notification message
    const sysMsg = new Message({
      conversationId: conversation._id,
      sender: req.user._id,
      isSystem: true,
      systemText: `${actorName} left the group`,
      status: 'delivered',
    })
    await sysMsg.save()
    conversation.lastMessage = sysMsg._id
    await conversation.save()

    const populatedGroup = await Conversation.findById(conversation._id)
      .populate('participants', '-password')
      .populate('groupAdmin', '-password')
      .populate('groupAdmins', '-password')
      .populate('lastMessage')

    io.to(conversation._id.toString()).emit('chat:private_message', {
      ...sysMsg.toObject(),
      sender: {
        _id: req.user._id,
        username: req.user.username,
        displayName: req.user.displayName,
        avatar: req.user.avatar,
      },
      conversationId: conversation._id.toString(),
    })

    io.to(conversation._id.toString()).emit('group:updated', populatedGroup)
    res.json(populatedGroup)
  } catch (error) {
    console.error('Leave Group Error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

app.post('/api/conversations/accept/:id', protect, async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.id)
    if (!conversation) return res.status(404).json({ message: 'Not found' })
    
    // Only the non-initiator can accept
    if (conversation.initiator && conversation.initiator.toString() === req.user._id.toString()) {
      return res.status(403).json({ message: 'Cannot accept own request' })
    }

    conversation.status = 'accepted'
    await conversation.save()

    const populatedConv = await Conversation.findById(conversation._id)
      .populate('participants', '-password')
      .populate('groupAdmin', '-password')
      .populate('groupAdmins', '-password')
      .populate('lastMessage')

    // Notify the room and all participants
    io.to(conversation._id.toString()).emit('chat:request_action', {
      conversationId: conversation._id.toString(),
      status: 'accepted',
      conversation: populatedConv,
    })
    io.emit('chat:request_action', {
      conversationId: conversation._id.toString(),
      status: 'accepted',
      conversation: populatedConv,
    })

    res.json(populatedConv)
  } catch (error) {
    console.error('Accept Conversation Error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

app.post('/api/conversations/reject/:id', protect, async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.id)
    if (!conversation) return res.status(404).json({ message: 'Not found' })
    
    if (conversation.initiator && conversation.initiator.toString() === req.user._id.toString()) {
      return res.status(403).json({ message: 'Cannot reject own request' })
    }

    conversation.status = 'rejected'
    await conversation.save()

    io.to(conversation._id.toString()).emit('chat:request_action', {
      conversationId: conversation._id.toString(),
      status: 'rejected',
    })
    io.emit('chat:request_action', {
      conversationId: conversation._id.toString(),
      status: 'rejected',
    })

    res.json(conversation)
  } catch (error) {
    console.error('Reject Conversation Error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// ── REST API: Group Invite Accept & Decline ──────────────────────────────────
const handleAcceptGroupInvite = async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.id)
    if (!conversation) return res.status(404).json({ message: 'Group not found' })
    if (!conversation.isGroup) return res.status(400).json({ message: 'Not a group conversation' })

    const userIdStr = req.user._id.toString()

    // Remove from pendingMembers
    if (conversation.pendingMembers) {
      conversation.pendingMembers = conversation.pendingMembers.filter(
        (p) => (p._id?.toString() || p.toString()) !== userIdStr
      )
    }

    // Add to participants if not already present
    if (!conversation.participants.some((p) => (p._id?.toString() || p.toString()) === userIdStr)) {
      conversation.participants.push(req.user._id)
    }

    // Add to memberDetails
    const now = new Date()
    if (!conversation.memberDetails) conversation.memberDetails = []
    const existingIdx = conversation.memberDetails.findIndex(
      (m) => (m.user?.toString() || m.user?._id?.toString()) === userIdStr
    )
    if (existingIdx !== -1) {
      conversation.memberDetails[existingIdx].joinedAt = now
    } else {
      conversation.memberDetails.push({ user: req.user._id, joinedAt: now })
    }

    // Add system message
    const actorName = req.user.displayName || req.user.username
    const systemMsg = new Message({
      conversationId: conversation._id,
      sender: req.user._id,
      isSystem: true,
      systemText: `${actorName} joined the group`,
      status: 'delivered',
    })
    await systemMsg.save()
    conversation.lastMessage = systemMsg._id

    await conversation.save()

    const populatedGroup = await Conversation.findById(conversation._id)
      .populate('participants', '-password')
      .populate('pendingMembers', '-password')
      .populate('groupAdmin', '-password')
      .populate('groupAdmins', '-password')
      .populate('lastMessage')

    // Auto-join socket room for accepting user
    const userSockets = connectedUsers.get(userIdStr)
    if (userSockets) {
      userSockets.forEach((sockId) => {
        const s = io.sockets.sockets.get(sockId)
        if (s) s.join(conversation._id.toString())
      })
    }

    // Broadcast system message & group update
    io.to(conversation._id.toString()).emit('message:received', systemMsg)
    io.to(conversation._id.toString()).emit('group:updated', populatedGroup)
    io.emit('chat:request_action', {
      conversationId: conversation._id.toString(),
      status: 'accepted',
      conversation: populatedGroup,
    })

    res.json(populatedGroup)
  } catch (error) {
    console.error('Accept Group Invite Error:', error)
    res.status(500).json({ message: 'Server error' })
  }
}

app.post('/api/conversations/:id/accept-invite', protect, handleAcceptGroupInvite)
app.post('/api/conversations/:id/accept-group', protect, handleAcceptGroupInvite)

const handleDeclineGroupInvite = async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.id)
    if (!conversation) return res.status(404).json({ message: 'Group not found' })

    const userIdStr = req.user._id.toString()
    if (conversation.pendingMembers) {
      conversation.pendingMembers = conversation.pendingMembers.filter(
        (p) => (p._id?.toString() || p.toString()) !== userIdStr
      )
      await conversation.save()
    }

    io.emit('chat:request_action', {
      conversationId: conversation._id.toString(),
      status: 'rejected',
    })

    res.json({ message: 'Invitation declined' })
  } catch (error) {
    console.error('Decline Group Invite Error:', error)
    res.status(500).json({ message: 'Server error' })
  }
}

app.post('/api/conversations/:id/decline-invite', protect, handleDeclineGroupInvite)
app.post('/api/conversations/:id/decline-group', protect, handleDeclineGroupInvite)

// ── REST API: Get Message Info (Read By & Delivered To) ──────────────────────
app.get('/api/messages/:id/info', protect, async (req, res) => {
  try {
    const message = await Message.findById(req.params.id)
      .populate('sender', 'username displayName avatar')
      .populate('readBy.user', 'username displayName avatar')
      .populate('deliveredTo.user', 'username displayName avatar')

    if (!message) return res.status(404).json({ message: 'Message not found' })

    const conversation = await Conversation.findById(message.conversationId)
      .populate('participants', 'username displayName avatar')

    res.json({
      message,
      conversation,
    })
  } catch (error) {
    console.error('Get Message Info Error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// ── REST API: Messages ───────────────────────────────────────────────────────
app.get('/api/messages/:conversationId', protect, async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.conversationId)
    if (!conversation) return res.status(404).json({ message: 'Conversation not found' })

    const now = new Date()
    const query = { conversationId: req.params.conversationId }

    // If it's a group, only show messages sent after the user joined the group!
    if (conversation.isGroup) {
      const userMember = conversation.memberDetails?.find(
        (m) => m.user?.toString() === req.user._id.toString()
      )
      if (userMember?.joinedAt) {
        query.createdAt = { $gte: userMember.joinedAt }
      }
    }

    // Mark unread messages from other users in this conversation as read
    await Message.updateMany(
      {
        ...query,
        sender: { $ne: req.user._id },
        status: { $ne: 'read' },
      },
      { $set: { status: 'read' } }
    )

    // Add current user to readBy array if not already present
    await Message.updateMany(
      {
        ...query,
        sender: { $ne: req.user._id },
        'readBy.user': { $ne: req.user._id }
      },
      {
        $push: { readBy: { user: req.user._id, readAt: now } }
      }
    )

    // Notify room that messages were read
    io.to(req.params.conversationId).emit('chat:messages_read', {
      conversationId: req.params.conversationId,
      readerId: req.user._id.toString(),
      reader: {
        _id: req.user._id.toString(),
        username: req.user.username,
        displayName: req.user.displayName,
        avatar: req.user.avatar,
      },
      readAt: now,
    })

    const messages = await Message.find(query)
      .populate('sender', 'username displayName avatar')
      .populate('readBy.user', 'username displayName avatar')
      .populate('deliveredTo.user', 'username displayName avatar')
      .populate({
        path: 'replyTo',
        select: 'text imageUrl imageUrls audioUrl sender isEphemeral',
        populate: { path: 'sender', select: 'username displayName avatar' },
      })
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

// ── REST API: Upload Audio / Voice Notes in Chat ───────────────────────────
app.post('/api/messages/audio', protect, uploadAudio.single('audio'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No audio provided' })
    res.json({ audioUrl: req.file.path })
  } catch (error) {
    console.error('Audio Upload Error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// ── REST API: Edit Message ──────────────────────────────────────────────────
app.put('/api/messages/:id', protect, async (req, res) => {
  try {
    const { text } = req.body
    const message = await Message.findById(req.params.id)
    if (!message) return res.status(404).json({ message: 'Message not found' })
    if (message.sender.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Unauthorized to edit this message' })
    }
    if (message.isDeleted) {
      return res.status(400).json({ message: 'Cannot edit a deleted message' })
    }

    message.text = text || ''
    message.isEdited = true
    message.status = 'delivered'
    await message.save()

    io.to(message.conversationId.toString()).emit('chat:message_edited', {
      messageId: message._id.toString(),
      conversationId: message.conversationId.toString(),
      text: message.text,
      isEdited: true,
      status: 'delivered',
    })

    res.json(message)
  } catch (error) {
    console.error('Edit Message Error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// ── REST API: Delete Message for Everyone ───────────────────────────────────
app.delete('/api/messages/:id', protect, async (req, res) => {
  try {
    const message = await Message.findById(req.params.id)
    if (!message) return res.status(404).json({ message: 'Message not found' })
    if (message.sender.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Unauthorized to delete this message' })
    }

    message.isDeleted = true
    message.text = ''
    message.imageUrl = ''
    message.imageUrls = []
    message.audioUrl = ''
    await message.save()

    io.to(message.conversationId.toString()).emit('chat:message_deleted', {
      messageId: message._id.toString(),
      conversationId: message.conversationId.toString(),
      isDeleted: true,
    })

    res.json({ success: true, messageId: message._id })
  } catch (error) {
    console.error('Delete Message Error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// ── REST API: Pin / Unpin Message ───────────────────────────────────────────
app.patch('/api/messages/:id/pin', protect, async (req, res) => {
  try {
    const message = await Message.findById(req.params.id)
    if (!message) return res.status(404).json({ message: 'Message not found' })

    message.isPinned = !message.isPinned
    await message.save()

    io.to(message.conversationId.toString()).emit('chat:message_pinned', {
      messageId: message._id.toString(),
      conversationId: message.conversationId.toString(),
      isPinned: message.isPinned,
    })

    res.json(message)
  } catch (error) {
    console.error('Pin Message Error:', error)
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
// Track Map<userId, Set<socketId>> to avoid flapping when user reconnects or has multiple tabs
const connectedUsers = new Map()

io.on('connection', (socket) => {
  console.log(`[+] Client connected: ${socket.id}`)

  socket.on('user:join', async (userId) => {
    console.log(`[*] User "${userId}" registered on socket ${socket.id}`)
    socket.userId = userId
    
    const userSockets = connectedUsers.get(userId) || new Set()
    userSockets.add(socket.id)
    connectedUsers.set(userId, userSockets)

    try {
      const u = await User.findById(userId)
      if (u) {
        const newPresence = u.lastActivePresence || 'online'
        await User.findByIdAndUpdate(userId, {
          presence: newPresence,
          isOnline: true,
        })
        io.emit('user:presence_update', {
          userId,
          presence: newPresence,
          statusEmoji: u.statusEmoji,
          isOnline: true,
          lastSeen: u.lastSeen,
        })
        io.emit('user:online', {
          userId,
          presence: newPresence,
          statusEmoji: u.statusEmoji,
          isOnline: true,
          lastSeen: u.lastSeen,
        })
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
    // payload: { from, to, text, conversationId, imageUrls, audioUrl, ... }
    try {
      let conversation = null

      if (payload.conversationId) {
        conversation = await Conversation.findById(payload.conversationId)
      }

      if (!conversation && payload.to) {
        conversation = await Conversation.findOne({
          isGroup: { $ne: true },
          participants: { $all: [payload.from, payload.to] }
        })
      }

      if (!conversation && payload.to) {
        // Create new pending 1-on-1 conversation
        conversation = new Conversation({
          participants: [payload.from, payload.to],
          initiator: payload.from,
          status: 'pending'
        })
        await conversation.save()
        
        // Let both users know there's a new conversation
        const fromSockets = connectedUsers.get(payload.from)
        const toSockets = connectedUsers.get(payload.to)
        
        const populatedConv = await Conversation.findById(conversation._id).populate('participants', '-password')
        
        if (fromSockets) {
          for (const socketId of fromSockets) {
            const socketInstance = io.sockets.sockets.get(socketId)
            if (socketInstance) socketInstance.join(conversation._id.toString())
            io.to(socketId).emit('conversation:new', populatedConv)
          }
        }
        if (toSockets) {
          for (const socketId of toSockets) {
            const socketInstance = io.sockets.sockets.get(socketId)
            if (socketInstance) socketInstance.join(conversation._id.toString())
            io.to(socketId).emit('conversation:new', populatedConv)
          }
        }
      } else if (conversation && !conversation.isGroup && conversation.status === 'rejected') {
        conversation.status = 'pending'
        conversation.initiator = payload.from
        await conversation.save()
        
        const fromSockets = connectedUsers.get(payload.from)
        const toSockets = connectedUsers.get(payload.to)
        const populatedConv = await Conversation.findById(conversation._id).populate('participants', '-password')
        if (fromSockets) {
          for (const socketId of fromSockets) {
            io.to(socketId).emit('conversation:new', populatedConv)
          }
        }
        if (toSockets) {
          for (const socketId of toSockets) {
            io.to(socketId).emit('conversation:new', populatedConv)
          }
        }
      }

      if (!conversation) {
        console.error('Conversation could not be found or created for payload:', payload)
        return
      }

      // Ensure sending socket is in the conversation room
      socket.join(conversation._id.toString())

      // Create message
      const isRecipientOnline = conversation.isGroup
        ? true
        : connectedUsers.has(payload.to)
      const isEphemeral = !!payload.isEphemeral
      const expiresAt = isEphemeral ? new Date(Date.now() + 24 * 60 * 60 * 1000) : undefined

      const message = new Message({
        conversationId: conversation._id,
        sender:   payload.from,
        text:     payload.text || '',
        imageUrl: payload.imageUrls?.[0] || '',
        imageUrls: payload.imageUrls || [],
        audioUrl: payload.audioUrl || '',
        audioDuration: payload.audioDuration || 0,
        replyTo:  payload.replyTo || null,
        status:   isRecipientOnline ? 'delivered' : 'sent',
        isEphemeral,
        expiresAt,
      })
      await message.save()

      // Update last message in conversation
      conversation.lastMessage = message._id
      await conversation.save()

      // Populate sender and replyTo for the frontend
      const populatedMessage = await Message.findById(message._id)
        .populate('sender', 'username avatar')
        .populate({
          path: 'replyTo',
          select: 'text imageUrl imageUrls audioUrl sender isEphemeral',
          populate: { path: 'sender', select: 'username avatar' },
        })

      // Emit to the conversation room
      io.to(conversation._id.toString()).emit('chat:private_message', {
        ...populatedMessage.toObject(),
        conversationId: conversation._id.toString()
      })
    } catch (err) {
      console.error('Error handling private message:', err)
    }
  })

  socket.on('user:typing', ({ from, username, avatar, conversationId }) => {
    io.to(conversationId).emit('user:typing', { from, username, avatar, conversationId })
  })

  socket.on('user:stop_typing', ({ from, username, avatar, conversationId }) => {
    io.to(conversationId).emit('user:stop_typing', { from, username, avatar, conversationId })
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
      const now = new Date()
      const readerUser = await User.findById(readerId).select('username displayName avatar')

      const updated = await Message.find({
        conversationId,
        sender: { $ne: readerId },
      })

      if (updated.length > 0) {
        await Message.updateMany(
          {
            conversationId,
            sender: { $ne: readerId },
            'readBy.user': { $ne: readerId }
          },
          {
            $set: { status: 'read' },
            $push: { readBy: { user: readerId, readAt: now } }
          }
        )

        io.to(conversationId).emit('chat:messages_read', {
          conversationId,
          readerId,
          reader: readerUser ? {
            _id: readerUser._id.toString(),
            username: readerUser.username,
            displayName: readerUser.displayName,
            avatar: readerUser.avatar,
          } : null,
          readAt: now,
        })
      }
    } catch (err) {
      console.error('Mark read error:', err)
    }
  })

  socket.on('disconnect', async () => {
    console.log(`[-] Client disconnected: ${socket.id}`)
    if (socket.userId) {
      const userSockets = connectedUsers.get(socket.userId)
      if (userSockets) {
        userSockets.delete(socket.id)
        if (userSockets.size === 0) {
          connectedUsers.delete(socket.userId)

          try {
            const now = new Date()
            await User.findByIdAndUpdate(socket.userId, {
              presence: 'offline',
              isOnline: false,
              lastSeen: now,
            })
            io.emit('user:presence_update', {
              userId: socket.userId,
              presence: 'offline',
              isOnline: false,
              lastSeen: now,
            })
            io.emit('user:offline', {
              userId: socket.userId,
              presence: 'offline',
              isOnline: false,
              lastSeen: now,
            })
          } catch (err) {
            console.error('Error updating user offline status:', err)
          }
        }
      }
    }
  })
})

// ── Serve Frontend Production Build (Single Port / Cloudflare Tunnel Support) ────
const distPath = path.join(__dirname, '../dist')
app.use(express.static(distPath))

// SPA Fallback: Any non-API route serves index.html if dist exists
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api') && !req.path.startsWith('/socket.io')) {
    return res.sendFile(path.join(distPath, 'index.html'), (err) => {
      if (err) next()
    })
  }
  next()
})

const PORT = process.env.PORT || 3001
httpServer.listen(PORT, () => {
  console.log(`\n🚀  Server running on port ${PORT}\n`)
})
