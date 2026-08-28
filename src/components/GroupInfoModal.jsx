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
import { useLanguage } from '../context/LanguageContext'
import { getApiUrl } from '../config/api'
import { compressImage } from '../utils/imageCompressor'
import ImageCropperModal from './ImageCropperModal'

export default function GroupInfoModal({
  isOpen,
  onClose,
  contact,
  onGroupUpdated,
  onGroupLeft,
  onOpenTheme,
}) {
  const { user: currentUser, token } = useAuth()
  const { t } = useLanguage()
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
  const [cropImageSrc, setCropImageSrc] = useState(null)
  const [isCropModalOpen, setIsCropModalOpen] = useState(false)

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
      setCropImageSrc(null)
      setIsCropModalOpen(false)
    }
  }, [contact, isOpen])

  // Search users to add (load friends by default, or search on query)
  useEffect(() => {
    if (!isAddingMembers) return

    const trimmed = searchQuery.trim().replace(/^@/, '')

    const searchUsers = async () => {
      setIsSearching(true)
      try {
        const queryParam = trimmed ? `?q=${encodeURIComponent(trimmed)}` : ''
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

    const timer = setTimeout(searchUsers, trimmed ? 200 : 0)
    return () => clearTimeout(timer)
  }, [searchQuery, isAddingMembers, token, participants])

  // ── Open Cropper on file select ──
  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const objectUrl = URL.createObjectURL(file)
    setCropImageSrc(objectUrl)
    setIsCropModalOpen(true)
    e.target.value = ''
  }

  // ── Upload Cropped Avatar ──
  const handleCropFinished = async (croppedBlob) => {
    if (!croppedBlob || !contact?.conversationId) return

    setIsUploadingAvatar(true)
    setError('')
    try {
      const compressed = await compressImage(croppedBlob, { maxWidth: 500, maxHeight: 500, quality: 0.85 })
      const formData = new FormData()
      formData.append('avatar', compressed || croppedBlob, 'group-avatar.jpg')

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
    const title = isCurrentlyAdmin ? t('dismissAdminConfirmTitle') : t('makeAdminConfirmTitle')
    const message = isCurrentlyAdmin
      ? `${t('dismissAdminConfirmMsg')} ${memberName}?`
      : `${t('makeAdminConfirmMsg')} ${memberName}?`

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
      title: t('removeMemberConfirmTitle'),
      message: `${t('removeMemberConfirmMsg')} (${member.displayName || member.username})?`,
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
      title: t('leaveGroupConfirmTitle'),
      message: t('leaveGroupConfirmMsg'),
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
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: 'spring', stiffness: 350, damping: 28 }}
            className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden relative z-10 flex flex-col max-h-[85vh]"
          >
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/80 backdrop-blur-md">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                  <Users size={16} />
                </div>
                <h3 className="font-bold text-zinc-100 text-sm">{t('groupSettings')}</h3>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-7 h-7 rounded-full text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            {/* Modal Scrollable Content */}
            <div className="p-5 overflow-y-auto space-y-5 flex-1">
              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl text-center">
                  {error}
                </div>
              )}

              {/* Group Avatar & Info Hero */}
              <div className="flex flex-col items-center text-center">
                <input
                  type="file"
                  ref={avatarInputRef}
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
                      title={t('changeGroupAvatar')}
                    >
                      {isUploadingAvatar ? (
                        <Loader2 size={20} className="animate-spin" />
                      ) : (
                        <>
                          <Camera size={18} className="mb-0.5" />
                          <span className="text-[10px] font-medium">{t('change')}</span>
                        </>
                      )}
                    </button>
                  )}
                </div>

                {/* Group Name Display / Inline Edit */}
                {isEditingName ? (
                  <div className="flex items-center gap-1.5 w-full max-w-xs justify-center">
                    <input
                      type="text"
                      value={groupName}
                      onChange={(e) => setGroupName(e.target.value)}
                      className="flex-1 min-w-0 px-3 py-1.5 bg-zinc-900 border border-indigo-500/60 rounded-xl text-zinc-100 text-sm outline-none"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={handleSaveName}
                      disabled={isSavingName}
                      className="w-8 h-8 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
                    >
                      {isSavingName ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setGroupName(contact.groupName || contact.name)
                        setIsEditingName(false)
                      }}
                      className="w-8 h-8 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 flex items-center justify-center transition-colors cursor-pointer shrink-0"
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
                        title={t('edit')}
                      >
                        <Pencil size={14} />
                      </button>
                    )}
                  </div>
                )}

                <p className="text-xs text-zinc-400 mt-1 font-medium">
                  {participants.length} {t('selectedMembersLabel')}
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
                        <p className="text-xs font-semibold text-zinc-100">{t('chatAppearance')}</p>
                        <p className="text-[10px] text-zinc-400">{t('appearanceDesc')}</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-semibold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-lg border border-indigo-500/20">
                      {t('change')}
                    </span>
                  </button>
                )}
              </div>

              {/* Members Section */}
              <div>
                <div className="flex items-center justify-between mb-3 px-1">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                    {t('selectedMembersLabel')} ({participants.length})
                  </h4>
                  {isAdmin && !isAddingMembers && (
                    <button
                      type="button"
                      onClick={() => setIsAddingMembers(true)}
                      className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <UserPlus size={14} />
                      <span>{t('addMembers')}</span>
                    </button>
                  )}
                </div>

                {/* Add Members Picker Subview */}
                {isAddingMembers ? (
                  <div className="p-4 bg-zinc-950/60 border border-indigo-500/30 rounded-2xl space-y-3 mb-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-indigo-300">{t('addMembersLabel')}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setIsAddingMembers(false)
                          setSelectedNewMembers([])
                        }}
                        className="text-zinc-400 hover:text-zinc-200 cursor-pointer"
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
                        placeholder={t('searchMembersPlaceholder')}
                        className="w-full pl-9 pr-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-100 placeholder-zinc-500 outline-none focus:border-indigo-500/60"
                      />
                    </div>

                    <div className="space-y-1 max-h-36 overflow-y-auto">
                      {isSearching ? (
                        <div className="py-4 text-center text-xs text-zinc-500 flex items-center justify-center gap-1.5">
                          <Loader2 size={12} className="animate-spin" />
                          <span>{t('checkingUpdates')}</span>
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
                          {searchQuery ? t('noUsersFoundPrompt') : t('searchEmptyPrompt')}
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
                        className="px-3 py-1 text-xs text-zinc-400 hover:text-zinc-200 cursor-pointer"
                      >
                        {t('cancel')}
                      </button>
                      <button
                        type="button"
                        onClick={handleAddMembersSubmit}
                        disabled={selectedNewMembers.length === 0 || isSubmittingAdd}
                        className="px-3.5 py-1 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-40 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer"
                      >
                        {isSubmittingAdd ? <Loader2 size={12} className="animate-spin" /> : <UserPlus size={12} />}
                        <span>{t('addMembers')} ({selectedNewMembers.length})</span>
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
                                title={t('makeAdminConfirmTitle')}
                              >
                                <Crown size={15} />
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleToggleAdminRole(member, true)}
                                className="p-1.5 text-zinc-400 hover:text-amber-400 hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
                                title={t('dismissAdminConfirmTitle')}
                              >
                                <ShieldOff size={15} />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleRemoveMember(member)}
                              className="p-1.5 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                              title={t('removeMemberConfirmTitle')}
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
                        <span>{t('pendingInvites')} ({pendingMembers.length})</span>
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
                                <p className="text-[10px] text-amber-400/80">{t('pendingStatus')}</p>
                              </div>
                            </div>
                            <span className="px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[10px] font-semibold flex-shrink-0">
                              {t('invited')}
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
                  <span>{t('leaveGroup')}</span>
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
                      {t('cancel')}
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
                      {t('confirm')}
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          <ImageCropperModal
            isOpen={isCropModalOpen}
            imageSrc={cropImageSrc}
            onClose={() => setIsCropModalOpen(false)}
            onCropFinished={handleCropFinished}
          />
        </div>
      )}
    </AnimatePresence>
  )
}
