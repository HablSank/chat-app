import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users,
  X,
  Camera,
  Pencil,
  Check,
  Crown,
  ShieldOff,
  UserMinus,
  UserPlus,
  LogOut,
  Loader2,
  Search,
  AlertTriangle,
  Clock,
  Palette,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { getApiUrl } from '../config/api'
import { compressImage } from '../utils/imageCompressor'

export default function GroupInfoModal({
  isOpen,
  onClose,
  contact,
  onGroupUpdated,
  onGroupLeft,
  onOpenTheme,
}) {
  const { user: currentUser, token } = useAuth()
  const [groupName, setGroupName] = useState(contact?.groupName || contact?.name || '')
  const [isEditingName, setIsEditingName] = useState(false)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const [isSavingName, setIsSavingName] = useState(false)
  const [isAddingMembers, setIsAddingMembers] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [selectedNewMembers, setSelectedNewMembers] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const [isSubmittingAdd, setIsSubmittingAdd] = useState(false)
  const [error, setError] = useState('')
  const [confirmModal, setConfirmModal] = useState(null) // { title, message, onConfirm, isDanger }

  const avatarInputRef = useRef(null)

  const participants = contact?.participants || []
  const pendingMembers = Array.isArray(contact?.pendingMembers) ? contact.pendingMembers : []
  const groupAdminIds = (contact?.groupAdmins && contact.groupAdmins.length > 0)
    ? contact.groupAdmins.map((a) => a._id?.toString() || a.toString())
    : [contact?.groupAdmin?._id?.toString() || contact?.groupAdmin?.toString()].filter(Boolean)
  const isAdmin = groupAdminIds.includes(currentUser?.id?.toString())

  useEffect(() => {
    if (contact) {
      setGroupName(contact.groupName || contact.name || '')
      setIsEditingName(false)
      setIsAddingMembers(false)
      setError('')
    }
  }, [contact, isOpen])

  // Search users to add
  useEffect(() => {
    if (!isAddingMembers) return

    const searchUsers = async () => {
      setIsSearching(true)
      try {
        const queryParam = searchQuery.trim() ? `?q=${encodeURIComponent(searchQuery.trim())}` : ''
        const res = await fetch(getApiUrl(`/api/users/search${queryParam}`), {
          headers: { Authorization: `Bearer ${token}` },
        })
        const data = await res.json()
        if (res.ok) {
          // Filter out existing participants
          const currentParticipantIds = new Set(participants.map((p) => p._id?.toString() || p.toString()))
          const filtered = data.filter((u) => !currentParticipantIds.has(u._id.toString()))
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
  }, [searchQuery, isAddingMembers, token, participants])

  // ── Upload Avatar ──
  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploadingAvatar(true)
    setError('')
    try {
      const compressed = await compressImage(file, { maxWidth: 500, maxHeight: 500, quality: 0.7 })
      const formData = new FormData()
      formData.append('avatar', compressed)

      const res = await fetch(getApiUrl(`/api/conversations/${contact.conversationId}/avatar`), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Failed to update avatar')

      onGroupUpdated?.(data)
    } catch (err) {
      console.error('Error updating avatar:', err)
      setError(err.message || 'Failed to upload avatar')
    } finally {
      setIsUploadingAvatar(false)
      e.target.value = ''
    }
  }

  // ── Save Group Name ──
  const handleSaveName = async () => {
    if (!groupName.trim()) return
    setIsSavingName(true)
    setError('')
    try {
      const res = await fetch(getApiUrl(`/api/conversations/${contact.conversationId}/members`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ groupName: groupName.trim() }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Failed to update group name')

      onGroupUpdated?.(data)
      setIsEditingName(false)
    } catch (err) {
      console.error('Error updating name:', err)
      setError(err.message || 'Failed to update name')
    } finally {
      setIsSavingName(false)
    }
  }

  // ── Grant or Revoke Admin Role ──
  const handleToggleAdminRole = (member, isCurrentlyAdmin) => {
    const memberName = member.displayName || member.username
    const action = isCurrentlyAdmin ? 'revoke' : 'grant'
    const title = isCurrentlyAdmin ? 'Dismiss as Admin?' : 'Make Group Admin?'
    const message = isCurrentlyAdmin
      ? `Are you sure you want to dismiss ${memberName} as a group admin?`
      : `Are you sure you want to make ${memberName} a group admin? They will be able to add/remove members and manage group settings.`

    setConfirmModal({
      title,
      message,
      isDanger: isCurrentlyAdmin,
      onConfirm: async () => {
        try {
          const res = await fetch(getApiUrl(`/api/conversations/${contact.conversationId}/admin`), {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ targetUserId: member._id, action }),
          })
          const data = await res.json()
          if (!res.ok) throw new Error(data.message || 'Failed to update admin role')
          onGroupUpdated?.(data)
        } catch (err) {
          console.error(err)
          setError(err.message)
        } finally {
          setConfirmModal(null)
        }
      },
    })
  }

  // ── Remove Member ──
  const handleRemoveMember = (member) => {
    setConfirmModal({
      title: 'Remove Member?',
      message: `Are you sure you want to remove ${member.displayName || member.username} from this group?`,
      isDanger: true,
      onConfirm: async () => {
        try {
          const updatedMemberIds = participants
            .map((p) => p._id?.toString() || p.toString())
            .filter((id) => id !== member._id.toString())

          const res = await fetch(getApiUrl(`/api/conversations/${contact.conversationId}/members`), {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ memberIds: updatedMemberIds }),
          })
          const data = await res.json()
          if (!res.ok) throw new Error(data.message || 'Failed to remove member')
          onGroupUpdated?.(data)
        } catch (err) {
          console.error(err)
          setError(err.message)
        } finally {
          setConfirmModal(null)
        }
      },
    })
  }

  // ── Add New Members ──
  const handleAddMembersSubmit = async () => {
    if (selectedNewMembers.length === 0) return
    setIsSubmittingAdd(true)
    setError('')
    try {
      const existingIds = participants.map((p) => p._id?.toString() || p.toString())
      const newIds = selectedNewMembers.map((m) => m._id.toString())
      const combinedIds = Array.from(new Set([...existingIds, ...newIds]))

      const res = await fetch(getApiUrl(`/api/conversations/${contact.conversationId}/members`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ memberIds: combinedIds }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Failed to add members')
      onGroupUpdated?.(data)
      setIsAddingMembers(false)
      setSelectedNewMembers([])
    } catch (err) {
      console.error(err)
      setError(err.message)
    } finally {
      setIsSubmittingAdd(false)
    }
  }

  // ── Leave Group ──
  const handleLeaveGroup = () => {
    setConfirmModal({
      title: 'Leave Group?',
      message: 'Are you sure you want to leave this group? You will no longer be able to send or receive messages in it.',
      isDanger: true,
      onConfirm: async () => {
        try {
          const res = await fetch(getApiUrl(`/api/conversations/${contact.conversationId}/leave`), {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
          })
          if (!res.ok) {
            const data = await res.json()
            throw new Error(data.message || 'Failed to leave group')
          }
          onGroupLeft?.(contact.conversationId)
          onClose()
        } catch (err) {
          console.error(err)
          setError(err.message)
        } finally {
          setConfirmModal(null)
        }
      },
    })
  }

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
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />

          {/* Modal Box */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', stiffness: 350, damping: 30 }}
            className="relative w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh] z-10"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/90 flex-shrink-0">
              <div className="flex items-center gap-2">
                <Users size={18} className="text-indigo-400" />
                <h2 className="text-base font-semibold text-zinc-100">Group Info</h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Error Notification */}
            {error && (
              <div className="mx-6 mt-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl flex items-center justify-between">
                <span>{error}</span>
                <button onClick={() => setError('')} className="text-red-400 hover:text-red-200">
                  <X size={14} />
                </button>
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Group Avatar & Name Header Card */}
              <div className="flex flex-col items-center text-center p-5 bg-zinc-950/50 border border-zinc-800/80 rounded-2xl relative">
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                />

                <div className="relative group mb-3">
                  <img
                    src={contact?.groupAvatar || contact?.avatar}
                    alt={contact?.name}
                    className="w-20 h-20 rounded-2xl bg-zinc-800 object-cover border-2 border-zinc-700 shadow-xl"
                  />
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => avatarInputRef.current?.click()}
                      disabled={isUploadingAvatar}
                      className="absolute inset-0 bg-black/60 rounded-2xl opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white text-xs transition-opacity cursor-pointer"
                      title="Change group avatar"
                    >
                      {isUploadingAvatar ? (
                        <Loader2 size={20} className="animate-spin" />
                      ) : (
                        <>
                          <Camera size={18} className="mb-0.5" />
                          <span className="text-[10px] font-medium">Change</span>
                        </>
                      )}
                    </button>
                  )}
                </div>

                {/* Group Name Display / Inline Edit */}
                {isEditingName ? (
                  <div className="flex items-center gap-2 w-full max-w-xs">
                    <input
                      type="text"
                      value={groupName}
                      onChange={(e) => setGroupName(e.target.value)}
                      className="flex-1 px-3 py-1.5 bg-zinc-900 border border-indigo-500/60 rounded-xl text-zinc-100 text-sm outline-none"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={handleSaveName}
                      disabled={isSavingName}
                      className="w-8 h-8 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white flex items-center justify-center transition-colors cursor-pointer flex-shrink-0"
                    >
                      {isSavingName ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setGroupName(contact.groupName || contact.name)
                        setIsEditingName(false)
                      }}
                      className="w-8 h-8 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 flex items-center justify-center transition-colors cursor-pointer flex-shrink-0"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-zinc-100 truncate">{groupName}</h3>
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => setIsEditingName(true)}
                        className="text-zinc-400 hover:text-indigo-300 p-1 rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer"
                        title="Edit group name"
                      >
                        <Pencil size={14} />
                      </button>
                    )}
                  </div>
                )}

                <p className="text-xs text-zinc-400 mt-1 font-medium">
                  Group • {participants.length} {participants.length === 1 ? 'member' : 'members'}
                </p>

                {onOpenTheme && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose()
                      onOpenTheme()
                    }}
                    className="mt-3 flex items-center justify-between w-full max-w-sm px-3.5 py-2.5 rounded-2xl bg-zinc-800/60 hover:bg-zinc-800 border border-zinc-700/50 text-zinc-200 transition-colors cursor-pointer text-left"
                  >
                    <div className="flex items-center gap-2.5">
                      <Palette size={16} className="text-pink-400 flex-shrink-0" />
                      <div>
                        <p className="text-xs font-semibold text-zinc-100">Tema & Wallpaper Grup</p>
                        <p className="text-[10px] text-zinc-400">Ubah warna balon dan background chat</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-semibold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-lg border border-indigo-500/20">
                      Ubah
                    </span>
                  </button>
                )}
              </div>

              {/* Members Section */}
              <div>
                <div className="flex items-center justify-between mb-3 px-1">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                    Participants ({participants.length})
                  </h4>
                  {isAdmin && !isAddingMembers && (
                    <button
                      type="button"
                      onClick={() => setIsAddingMembers(true)}
                      className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <UserPlus size={14} />
                      <span>Add Members</span>
                    </button>
                  )}
                </div>

                {/* Add Members Picker Subview */}
                {isAddingMembers ? (
                  <div className="p-4 bg-zinc-950/60 border border-indigo-500/30 rounded-2xl space-y-3 mb-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-indigo-300">Add New Members</span>
                      <button
                        type="button"
                        onClick={() => {
                          setIsAddingMembers(false)
                          setSelectedNewMembers([])
                        }}
                        className="text-zinc-400 hover:text-zinc-200"
                      >
                        <X size={14} />
                      </button>
                    </div>

                    <div className="relative">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search users to add..."
                        className="w-full pl-9 pr-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-100 placeholder-zinc-500 outline-none focus:border-indigo-500/60"
                      />
                    </div>

                    <div className="space-y-1 max-h-36 overflow-y-auto">
                      {isSearching ? (
                        <div className="py-4 text-center text-xs text-zinc-500 flex items-center justify-center gap-1.5">
                          <Loader2 size={12} className="animate-spin" />
                          <span>Searching...</span>
                        </div>
                      ) : searchResults.length > 0 ? (
                        searchResults.map((user) => {
                          const isSelected = selectedNewMembers.some((m) => m._id === user._id)
                          return (
                            <div
                              key={user._id}
                              onClick={() => {
                                setSelectedNewMembers((prev) =>
                                  isSelected ? prev.filter((m) => m._id !== user._id) : [...prev, user]
                                )
                              }}
                              className={`flex items-center justify-between p-2 rounded-xl text-xs cursor-pointer ${
                                isSelected ? 'bg-indigo-600/20 text-indigo-200' : 'hover:bg-zinc-850 text-zinc-300'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <img src={user.avatar} alt={user.username} className="w-6 h-6 rounded-full" />
                                <span>{user.displayName || user.username}</span>
                              </div>
                              <div className={`w-4 h-4 rounded border flex items-center justify-center ${isSelected ? 'bg-indigo-500 border-indigo-500 text-white' : 'border-zinc-700'}`}>
                                {isSelected && <Check size={10} strokeWidth={3} />}
                              </div>
                            </div>
                          )
                        })
                      ) : (
                        <div className="py-3 text-center text-[11px] text-zinc-500">
                          {searchQuery ? 'No users found' : 'Type to search users'}
                        </div>
                      )}
                    </div>

                    <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
                      <button
                        type="button"
                        onClick={() => {
                          setIsAddingMembers(false)
                          setSelectedNewMembers([])
                        }}
                        className="px-3 py-1 text-xs text-zinc-400 hover:text-zinc-200"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleAddMembersSubmit}
                        disabled={selectedNewMembers.length === 0 || isSubmittingAdd}
                        className="px-3.5 py-1 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-40 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5"
                      >
                        {isSubmittingAdd ? <Loader2 size={12} className="animate-spin" /> : <UserPlus size={12} />}
                        <span>Add ({selectedNewMembers.length})</span>
                      </button>
                    </div>
                  </div>
                ) : null}

                {/* Member List Cards */}
                <div className="space-y-1.5">
                  {participants.map((member) => {
                    const memberId = member._id?.toString() || member.toString()
                    const ownerId = contact?.initiator?._id?.toString() || contact?.initiator?.toString()
                    const isOwner = memberId === ownerId
                    const isMemberAdmin = groupAdminIds.includes(memberId)
                    const isSelf = memberId === currentUser?.id?.toString()

                    return (
                      <div
                        key={memberId}
                        className="flex items-center justify-between p-3 rounded-2xl bg-zinc-950/40 border border-zinc-800/60 hover:bg-zinc-950/70 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <img
                            src={member.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=member'}
                            alt={member.username}
                            className="w-9 h-9 rounded-full bg-zinc-800 object-cover flex-shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="text-sm font-semibold text-zinc-200 truncate">
                                {isSelf ? 'You' : member.displayName || member.username}
                              </p>
                              {isOwner ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold">
                                  <Crown size={10} />
                                  <span>Owner</span>
                                </span>
                              ) : isMemberAdmin ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10px] font-bold">
                                  <Crown size={10} />
                                  <span>Admin</span>
                                </span>
                              ) : null}
                            </div>
                            <p className="text-xs text-zinc-500 truncate">@{member.username || 'user'}</p>
                          </div>
                        </div>

                        {/* Admin Action Menu for other members (cannot kick or unadmin group owner) */}
                        {isAdmin && !isSelf && !isOwner && (
                          <div className="flex items-center gap-1">
                            {!isMemberAdmin ? (
                              <button
                                type="button"
                                onClick={() => handleToggleAdminRole(member, false)}
                                className="p-1.5 text-zinc-400 hover:text-amber-300 hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
                                title="Make Group Admin"
                              >
                                <Crown size={15} />
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleToggleAdminRole(member, true)}
                                className="p-1.5 text-zinc-400 hover:text-amber-400 hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
                                title="Dismiss as Admin"
                              >
                                <ShieldOff size={15} />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleRemoveMember(member)}
                              className="p-1.5 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                              title="Remove from group"
                            >
                              <UserMinus size={15} />
                            </button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Pending Invites List */}
                {pendingMembers.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-zinc-800/80">
                    <div className="flex items-center justify-between mb-2.5 px-1">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-amber-400/90 flex items-center gap-1.5">
                        <Clock size={13} />
                        <span>Pending Invites ({pendingMembers.length})</span>
                      </h4>
                    </div>
                    <div className="space-y-1.5">
                      {pendingMembers.map((pMember) => {
                        const pId = pMember._id?.toString() || pMember.toString()
                        const pName = pMember.displayName || pMember.username || 'Invited User'
                        const pAvatar = pMember.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=pending'
                        return (
                          <div
                            key={pId}
                            className="flex items-center justify-between p-2.5 rounded-2xl bg-zinc-950/30 border border-amber-500/20"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <img
                                src={pAvatar}
                                alt={pName}
                                className="w-8 h-8 rounded-full bg-zinc-800 object-cover opacity-80 flex-shrink-0"
                              />
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-zinc-300 truncate">
                                  {pName}
                                </p>
                                <p className="text-[10px] text-amber-400/80">Menunggu konfirmasi</p>
                              </div>
                            </div>
                            <span className="px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[10px] font-semibold flex-shrink-0">
                              Invited
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Leave Group Button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleLeaveGroup}
                  className="w-full py-3 rounded-2xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
                >
                  <LogOut size={16} />
                  <span>Exit Group</span>
                </button>
              </div>
            </div>
          </motion.div>

          {/* Sub-Confirmation Dialog */}
          <AnimatePresence>
            {confirmModal && (
              <div
                className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md"
                onClick={(e) => e.stopPropagation()}
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 10 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full max-w-sm bg-zinc-900 border border-zinc-700/80 rounded-3xl p-6 shadow-2xl relative z-[101]"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${confirmModal.isDanger ? 'bg-red-500/15 text-red-400' : 'bg-amber-500/15 text-amber-400'}`}>
                      <AlertTriangle size={20} />
                    </div>
                    <h4 className="text-sm font-bold text-zinc-100">{confirmModal.title}</h4>
                  </div>
                  <p className="text-xs text-zinc-400 mb-6 leading-relaxed">{confirmModal.message}</p>
                  <div className="flex justify-end gap-2.5">
                    <button
                      type="button"
                      onClick={() => setConfirmModal(null)}
                      className="px-4 py-2 text-xs font-semibold text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-xl transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={confirmModal.onConfirm}
                      className={`px-5 py-2 text-xs font-semibold text-white rounded-xl transition-colors cursor-pointer shadow-lg ${
                        confirmModal.isDanger
                          ? 'bg-red-600 hover:bg-red-500 shadow-red-600/20'
                          : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/20'
                      }`}
                    >
                      Confirm
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </div>
      )}
    </AnimatePresence>
  )
}
