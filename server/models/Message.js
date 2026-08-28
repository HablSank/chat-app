import mongoose from 'mongoose'

const reactionSchema = new mongoose.Schema(
  {
    emoji:  { type: String, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { _id: false }
)

const messageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    text: {
      type: String,
      default: '',
    },
    // Legacy single-image field (keep for backward compat)
    imageUrl: {
      type: String,
      default: '',
    },
    // New multi-image field
    imageUrls: {
      type: [String],
      default: [],
    },
    // Voice notes / audio message field
    audioUrl: {
      type: String,
      default: '',
    },
    audioDuration: {
      type: Number,
      default: 0,
    },
    // Reply / Quote reference to another Message
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
      default: null,
    },
    reactions: {
      type: [reactionSchema],
      default: [],
    },
    status: {
      type: String,
      enum: ['sent', 'delivered', 'read'],
      default: 'sent',
    },
    deliveredAt: {
      type: Date,
      default: null,
    },
    readAt: {
      type: Date,
      default: null,
    },
    readBy: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        readAt: { type: Date, default: Date.now },
      },
    ],
    deliveredTo: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        deliveredAt: { type: Date, default: Date.now },
      },
    ],
    isEdited: {
      type: Boolean,
      default: false,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    isPinned: {
      type: Boolean,
      default: false,
    },
    isSystem: {
      type: Boolean,
      default: false,
    },
    systemText: {
      type: String,
      default: '',
    },
    isEphemeral: {
      type: Boolean,
      default: false,
    },
    expiresAt: {
      type: Date,
    },
    messageType: {
      type: String,
      default: 'text',
    },
    inviteData: {
      groupId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Conversation',
      },
      groupName: {
        type: String,
        default: '',
      },
      groupAvatar: {
        type: String,
        default: '',
      },
    },
  },
  { timestamps: true }
)

// TTL Index: Deletes the document automatically when `expiresAt` is reached
messageSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

export default mongoose.model('Message', messageSchema)
