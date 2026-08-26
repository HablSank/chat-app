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
    reactions: {
      type: [reactionSchema],
      default: [],
    },
    status: {
      type: String,
      enum: ['sent', 'delivered', 'read'],
      default: 'sent',
    },
    isEphemeral: {
      type: Boolean,
      default: false,
    },
    expiresAt: {
      type: Date,
    },
  },
  { timestamps: true }
)

// TTL Index: Deletes the document automatically when `expiresAt` is reached
messageSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

export default mongoose.model('Message', messageSchema)
