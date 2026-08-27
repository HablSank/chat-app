import mongoose from 'mongoose'

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    avatar: {
      type: String,
      default: '',
    },
    displayName: {
      type: String,
      default: '',
    },
    bio: {
      type: String,
      default: 'Hey there! I am using Chat App.',
    },
    presence: {
      type: String,
      enum: ['online', 'idle', 'away', 'dnd', 'busy', 'offline'],
      default: 'offline',
    },
    lastActivePresence: {
      type: String,
      enum: ['online', 'idle', 'away', 'dnd', 'busy'],
      default: 'online',
    },
    statusEmoji: {
      type: String,
      default: '',
    },
    isOnline: {
      type: Boolean,
      default: false,
    },
    lastSeen: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
)

const User = mongoose.model('User', userSchema)

export default User
