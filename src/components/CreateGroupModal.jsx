import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Users, X, Search, Check, Loader2, Sparkles } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { getApiUrl } from '../config/api'

export default function CreateGroupModal({ isOpen, onClose, onGroupCreated }) {
  const { token, user: currentUser } = useAuth()
  const [groupName, setGroupName] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [selectedMembers, setSelectedMembers] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState('')

  // Search users dynamically
  useEffect(() => {
    if (!isOpen) return

    const searchUsers = async () => {
      setIsSearching(true)
      try {
        const queryParam = searchQuery.trim() ? `?q=${encodeURIComponent(searchQuery.trim())}` : ''
        const res = await fetch(getApiUrl(`/api/users/search${queryParam}`), {
          headers: { Authorization: `Bearer ${token}` },
        })
        const data = await res.json()
        if (res.ok) {
          // Filter out current user
          const filtered = data.filter((u) => u._id !== currentUser?.id)
          setSearchResults(filtered)
        }
      } catch (err) {
        console.error('Failed to search users:', err)
      } finally {
        setIsSearching(false)
      }
    }

    const timer = setTimeout(searchUsers, 200)
    return () => clearTimeout(timer)
  }, [searchQuery, isOpen, token, currentUser?.id])

  // Reset state on close
  useEffect(() => {
    if (!isOpen) {
      setGroupName('')
      setSearchQuery('')
      setSelectedMembers([])
      setError('')
      setIsCreating(false)
    }
  }, [isOpen])

  const toggleMember = (user) => {
    setSelectedMembers((prev) => {
      const exists = prev.some((m) => m._id === user._id)
      if (exists) {
        return prev.filter((m) => m._id !== user._id)
      } else {
        return [...prev, user]
      }
    })
  }

  const handleCreateGroup = async (e) => {
    e.preventDefault()
    if (!groupName.trim()) {
      setError('Please enter a group name')
      return
    }
    if (selectedMembers.length < 1) {
      setError('Please select at least 1 other member')
      return
    }

    setIsCreating(true)
    setError('')

    try {
      const groupAvatar = `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(groupName.trim())}`
      const res = await fetch(getApiUrl('/api/conversations/group'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          groupName: groupName.trim(),
          memberIds: selectedMembers.map((m) => m._id),
          groupAvatar,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.message || 'Failed to create group')
      }

      onGroupCreated?.(data)
      onClose()
    } catch (err) {
      console.error('Error creating group:', err)
      setError(err.message || 'Failed to create group')
    } finally {
      setIsCreating(false)
    }
  }

  const avatarPreview = groupName.trim()
    ? `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(groupName.trim())}`
    : 'https://api.dicebear.com/7.x/identicon/svg?seed=PingGroup'

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/75 backdrop-blur-sm"
          />

          {/* Modal Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', stiffness: 350, damping: 30 }}
            className="relative w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] z-10"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/90">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <Users size={18} />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-zinc-100">Create New Group</h2>
                  <p className="text-xs text-zinc-400">Add members to start chatting together</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateGroup} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-6 space-y-5 flex-1 overflow-y-auto">
                {/* Group Details */}
                <div className="flex items-center gap-4">
                  <div className="relative w-14 h-14 rounded-2xl bg-zinc-800 border border-zinc-700 overflow-hidden flex-shrink-0">
                    <img
                      src={avatarPreview}
                      alt="Group Avatar"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-zinc-400 mb-1.5 ml-1">
                      Group Name
                    </label>
                    <input
                      type="text"
                      value={groupName}
                      onChange={(e) => setGroupName(e.target.value)}
                      placeholder="e.g. Design Team 🎨"
                      className="w-full px-4 py-2.5 bg-zinc-950/60 border border-zinc-800 rounded-xl text-zinc-100 placeholder-zinc-500 text-sm focus:outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/60 transition-all"
                      required
                    />
                  </div>
                </div>

                {/* Error Banner */}
                {error && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl">
                    {error}
                  </div>
                )}

                {/* Selected Members Chips */}
                {selectedMembers.length > 0 && (
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-2 ml-1">
                      Selected Members ({selectedMembers.length})
                    </label>
                    <div className="flex items-center gap-2 flex-wrap max-h-24 overflow-y-auto p-1">
                      {selectedMembers.map((member) => (
                        <span
                          key={member._id}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-200 text-xs font-medium"
                        >
                          <img
                            src={member.avatar}
                            alt={member.username}
                            className="w-4 h-4 rounded-full"
                          />
                          <span>{member.displayName || member.username}</span>
                          <button
                            type="button"
                            onClick={() => toggleMember(member)}
                            className="text-indigo-300 hover:text-white ml-0.5"
                          >
                            <X size={12} />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Search Members */}
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5 ml-1">
                    Add Members
                  </label>
                  <div className="relative mb-3">
                    <Search
                      size={16}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500"
                    />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search by username or name..."
                      className="w-full pl-10 pr-4 py-2 bg-zinc-950/60 border border-zinc-800 rounded-xl text-zinc-100 placeholder-zinc-500 text-xs focus:outline-none focus:border-indigo-500/60 transition-all"
                    />
                  </div>

                  {/* Users list */}
                  <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                    {isSearching ? (
                      <div className="flex items-center justify-center py-6 text-zinc-500 text-xs gap-2">
                        <Loader2 size={16} className="animate-spin" />
                        <span>Searching users...</span>
                      </div>
                    ) : searchResults.length > 0 ? (
                      searchResults.map((user) => {
                        const isSelected = selectedMembers.some((m) => m._id === user._id)
                        return (
                          <div
                            key={user._id}
                            onClick={() => toggleMember(user)}
                            className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-colors ${
                              isSelected
                                ? 'bg-indigo-600/20 border border-indigo-500/30'
                                : 'hover:bg-zinc-800/60 border border-transparent'
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <img
                                src={user.avatar}
                                alt={user.username}
                                className="w-8 h-8 rounded-full bg-zinc-700 object-cover flex-shrink-0"
                              />
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-zinc-200 truncate">
                                  {user.displayName || user.username}
                                </p>
                                <p className="text-xs text-zinc-500 truncate">@{user.username}</p>
                              </div>
                            </div>

                            <div
                              className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-colors ${
                                isSelected
                                  ? 'bg-indigo-500 border-indigo-500 text-white'
                                  : 'border-zinc-700 bg-zinc-900 text-transparent'
                              }`}
                            >
                              <Check size={12} strokeWidth={3} />
                            </div>
                          </div>
                        )
                      })
                    ) : (
                      <div className="text-center py-6 text-zinc-500 text-xs">
                        {searchQuery ? 'No users found.' : 'Search for users to add to your group.'}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-800 bg-zinc-900/90 flex-shrink-0">
                <span className="text-xs text-zinc-400">
                  {selectedMembers.length} {selectedMembers.length === 1 ? 'member' : 'members'} selected
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!groupName.trim() || selectedMembers.length < 1 || isCreating}
                    className="px-5 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-indigo-500/20 transition-all cursor-pointer"
                  >
                    {isCreating ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        <span>Creating...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles size={14} />
                        <span>Create Group</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
