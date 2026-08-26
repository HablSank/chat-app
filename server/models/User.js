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
      enum: ['online', 'idle', 'dnd', 'offline'],
      default: 'offline',
    },
    lastActivePresence: {
      type: String,
      enum: ['online', 'idle', 'dnd'],
      default: 'online',
    },
    statusEmoji: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
)

const User = mongoose.model('User', userSchema)

export default User
