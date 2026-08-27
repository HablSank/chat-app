import { motion } from 'framer-motion'

// Container handles the pop-in / pop-out of the whole bubble
const containerVariants = {
  hidden: { opacity: 0, y: 8, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring', stiffness: 350, damping: 28 },
  },
  exit: {
    opacity: 0,
    y: 4,
    scale: 0.95,
    transition: { duration: 0.18, ease: 'easeIn' },
  },
}

// Each dot bounces independently with a manual delay for the stagger effect
const dotVariants = {
  animate: (i) => ({
    y: [0, -6, 0],
    transition: {
      duration: 0.55,
      repeat: Infinity,
      ease: 'easeInOut',
      delay: i * 0.15,
    },
  }),
}

export default function TypingIndicator({ typingUsers = [], isGroup = false }) {
  const firstUser = typingUsers?.[0]
  const typingText = typingUsers.length > 1
    ? `${typingUsers.map(u => u.username || 'Someone').slice(0, 2).join(', ')} are typing...`
    : firstUser?.username
    ? `${firstUser.username} is typing...`
    : 'Typing...'

  return (
    <motion.div
      layout
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="flex flex-col items-start gap-1 mb-1.5"
    >
      {/* Group member typing header info */}
      {isGroup && firstUser && (
        <div className="flex items-center gap-1.5 ml-1 mb-0.5">
          <img
            src={firstUser.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=user'}
            alt={firstUser.username || 'User'}
            className="w-4 h-4 rounded-full bg-zinc-700 object-cover"
          />
          <span className="text-[11px] font-medium text-indigo-300">
            {typingText}
          </span>
        </div>
      )}

      {/* Bubble with animated dots */}
      <div className="bg-zinc-800 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1.5 shadow-sm border border-zinc-700/50">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            variants={dotVariants}
            animate="animate"
            custom={i}
            className="w-2 h-2 rounded-full bg-zinc-400 block"
          />
        ))}
      </div>
    </motion.div>
  )
}
