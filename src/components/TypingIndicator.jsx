import { motion, AnimatePresence } from 'framer-motion'

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
    y: [0, -7, 0],
    transition: {
      duration: 0.55,
      repeat: Infinity,
      ease: 'easeInOut',
      delay: i * 0.15, // 0ms, 150ms, 300ms stagger
    },
  }),
}

export default function TypingIndicator() {
  return (
    <motion.div
      layout
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="flex justify-start mb-1"
    >
      {/* Matches the friend-bubble style */}
      <div className="bg-zinc-800 rounded-2xl rounded-bl-sm px-4 py-3.5 flex items-center gap-1.5">
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
