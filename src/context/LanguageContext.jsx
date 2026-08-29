import { createContext, useContext, useState, useEffect, useCallback } from 'react'

const translations = {
  id: {
    // App & Nav
    appName: 'Ping!',
    searchPlaceholder: 'Cari pesan atau kontak...',
    searchUsers: 'Cari pengguna...',
    createNewChat: 'Mulai Chat Baru',
    createGroup: 'Buat Grup Baru',
    settings: 'Pengaturan',
    profile: 'Profil Saya',
    logout: 'Keluar',
    installApp: 'Pasang Aplikasi',
    archivedChats: 'Arsip Chat',
    pinnedChats: 'Chat Disematkan',
    allChats: 'Semua Percakapan',
    noChats: 'Belum ada percakapan',
    noArchivedChats: 'Tidak ada percakapan yang diarsipkan',
    startChatting: 'Mulai percakapan dengan teman atau grup!',
    offlineStatus: 'Offline',
    onlineStatus: 'Online',
    busyStatus: 'Sibuk',
    awayStatus: 'Pergi',

    // Settings Modal
    settingsTitle: 'Pengaturan',
    tabSystem: 'Sistem & Aplikasi',
    tabNotifications: 'Suara & Notifikasi',
    tabPrivacy: 'Privasi & Tampilan',
    tabSecurity: 'Keamanan Akun',

    // System Tab
    appMaintenance: 'Pemeliharaan Aplikasi',
    currentVersion: 'Versi Saat Ini',
    latestVersion: 'Versi Terbaru',
    checkUpdates: 'Cek Pembaruan',
    checkingUpdates: 'Memeriksa...',
    upToDate: 'Aplikasi sudah dalam versi terbaru!',
    updateFound: 'Versi baru tersedia!',
    pwaInstallTitle: 'Aplikasi Web Mandiri (PWA)',
    pwaInstallDesc: 'Pasang Ping! ke homescreen atau desktop untuk performa optimal tanpa browser bar.',
    installNow: 'Pasang Sekarang',
    appInstalled: 'Aplikasi Sudah Terpasang',
    selectLanguage: 'Bahasa Antarmuka',
    indonesian: 'Bahasa Indonesia',
    english: 'English (US)',

    // Sound & Notifications Tab
    soundSettings: 'Pengaturan Suara',
    chatSoundFx: 'Efek Suara Chat',
    chatSoundFxDesc: 'Bunyikan nada saat pesan masuk dan terkirim.',
    desktopNotifications: 'Notifikasi Desktop',
    desktopNotificationsDesc: 'Tampilkan pop-up notifikasi saat ada pesan baru di latar belakang.',
    notificationsEnabled: 'Notifikasi Aktif',
    notificationsBlocked: 'Notifikasi Diblokir Browser',
    enableNotifications: 'Aktifkan Notifikasi',
    testSound: 'Tes Suara',

    // Privacy & Appearance Tab
    privacySettings: 'Pengaturan Privasi & Tampilan',
    showOnlineStatus: 'Tampilkan Status Online',
    showOnlineStatusDesc: 'Izinkan kontak melihat kapan Anda aktif di Ping!.',
    chatAppearance: 'Tampilan & Tema Chat',
    appearanceDesc: 'Sesuaikan wallpaper dan warna bubble percakapan.',
    customizeTheme: 'Atur Tema Percakapan',
    themeNotice: 'Catatan: Tema dan Wallpaper Chat diatur langsung di dalam masing-masing Room Chat melalui Menu Header Chat.',
    appTheme: 'Tema Aplikasi',
    darkTheme: 'Mode Gelap (Bawaan)',
    lightTheme: 'Mode Terang (Maintenance)',
    lightThemeMaintenance: 'Mode Terang sedang dalam pemeliharaan (Maintenance) untuk peningkatan performa visual.',

    // Security Tab
    securitySettings: 'Keamanan Akun',
    changePasswordTitle: 'Ganti Kata Sandi',
    currentPassword: 'Kata Sandi Saat Ini',
    newPassword: 'Kata Sandi Baru',
    confirmPassword: 'Konfirmasi Kata Sandi Baru',
    updatePasswordBtn: 'Simpan Kata Sandi',
    updatingPassword: 'Menyimpan...',
    passwordTooShort: 'Kata sandi minimal 6 karakter',
    passwordMismatch: 'Konfirmasi kata sandi tidak cocok',
    passwordUpdatedSuccess: 'Kata sandi berhasil diperbarui!',

    // Group Creation Modal
    createGroupTitle: 'Buat Grup Baru',
    createGroupSubtitle: 'Tambahkan anggota untuk mulai mengobrol bersama',
    groupNameLabel: 'Nama Grup',
    groupNamePlaceholder: 'contoh: Tim Desain 🎨',
    selectedMembersLabel: 'Anggota Terpilih',
    addMembersLabel: 'Cari & Tambah Anggota',
    searchMembersPlaceholder: 'Ketik username atau nama lengkap...',
    searchEmptyPrompt: 'Ketik nama atau username untuk mencari anggota...',
    noUsersFoundPrompt: 'Pengguna tidak ditemukan.',
    membersSelectedSuffix: 'anggota terpilih',
    cancel: 'Batal',
    createGroupAction: 'Buat Grup',
    creatingGroupAction: 'Membuat...',
    changeGroupAvatar: 'Ubah Foto Grup',

    // Chat Room
    typeMessagePlaceholder: 'Ketik pesan...',
    vanishModePlaceholder: 'Pesan sementara (24 jam)...',
    vanishModeActive: 'Mode Pesan Sementara Aktif',
    editingMessage: 'Mengedit Pesan',
    saveChanges: 'Simpan',
    recordingAudio: 'Merekam suara...',
    send: 'Kirim',
    reply: 'Balas',
    edit: 'Edit',
    pin: 'Sematkan',
    unpin: 'Lepas Sematan',
    delete: 'Hapus',
    copy: 'Salin Teks',
    copiedToast: 'Teks disalin ke papan klip',
    download: 'Unduh',
    downloadImage: 'Unduh Gambar',
    today: 'Hari ini',
    yesterday: 'Kemarin',
    lastSeenTodayAt: 'Terlihat hari ini pukul',
    lastSeenYesterdayAt: 'Terlihat kemarin pukul',
    lastSeenOn: 'Terlihat pada',
    atTime: 'pukul',
    wantsToMessage: 'ingin mengirim pesan kepada Anda',
    acceptPrompt: 'Terima permintaan untuk melihat foto profil lengkap dan membalas pesan.',
    accept: 'Terima',
    reject: 'Tolak',
    messageRequestSent: 'Permintaan Pesan Terkirim',
    awaitingApproval: 'Menunggu persetujuan. Foto profil dan info lengkap akan terbuka setelah permintaan disetujui.',

    // Image Cropper Modal
    cropImageTitle: 'Sesuaikan Gambar',
    rotate90: 'Putar 90°',
    zoomLabel: 'Perbesar',
    applyCrop: 'Terapkan',

    // Global Search & New Chat
    searchChatsOrFriends: 'Cari chat atau teman...',
    globalUserSearch: 'Cari Pengguna Global',
    startChat: 'Mulai Chat',

    // Phase 15.42: Batch selection, WhatsApp action bar & Delete for Me
    selectMode: 'Pilih',
    cancelSelect: 'Batal',
    selectedCount: 'dipilih',
    archiveSelected: 'Arsipkan',
    unarchiveSelected: 'Buka Arsip',
    deleteSelected: 'Hapus',
    deleteForMe: 'Hapus untuk Saya',
    deleteForEveryone: 'Hapus untuk Semua Orang',
    deleteMessageTitle: 'Hapus Pesan?',
    deleteMessageConfirmPrompt: 'Pilih bagaimana Anda ingin menghapus pesan ini:',
    batchArchiveSuccess: 'Chat berhasil diarsipkan',
    batchDeleteSuccess: 'Chat berhasil dihapus',
    directDownload: 'Unduh Berkas',
    messageDetails: 'Info Pesan',
    groupSettings: 'Pengaturan Grup',
    addMembers: 'Tambah Anggota',
    leaveGroupConfirmTitle: 'Keluar dari grup?',
    leaveGroupConfirmMsg: 'Anda tidak akan menerima pesan baru dari grup ini.',
    removeMemberConfirmTitle: 'Keluarkan anggota?',
    removeMemberConfirmMsg: 'Anggota ini akan dikeluarkan dari grup.',

    // Group Invite i18n
    groupInviteBadge: 'Undangan Grup',
    groupInviteDefaultDesc: 'Undangan untuk bergabung ke grup',
    groupInviteSent: 'Undangan Anda terkirim',
    groupInviteJoined: '✓ Anda telah bergabung',
    groupInviteDeclined: '✕ Undangan grup ditolak',
    groupInviteInvalid: '✕ Undangan sudah tidak berlaku (Grup telah dihapus)',
    groupInviteAcceptRequired: 'Terima pesan terlebih dahulu',
    groupInviteTapToJoin: 'Ketuk untuk bergabung',
    groupInviteView: 'Lihat Grup',
    groupInviteJoin: 'Gabung',
    groupInviteOpen: 'Buka Grup',
    groupInviteDeclinedTag: 'Ditolak',
    groupInviteInvalidTag: 'Tidak Berlaku',
    groupInviteDecline: 'Tolak',
    groupInviteText: 'Saya mengundang Anda untuk bergabung ke grup: {groupName}',
    groupInviteNotification: 'Mengundang Anda ke grup',

    // Settings Cards i18n
    standalonePwaTitle: 'Aplikasi Web Mandiri (PWA)',
    standalonePwaDesc: 'Buka langsung dari desktop atau layar utama.',
    themeCardTitle: 'Tema & Tampilan Aplikasi',
    themeCardDesc: 'Pilih tema terang atau gelap sesuai kenyamanan mata Anda.',
    themeDarkOption: 'Gelap & Elegan',
    themeLightOption: 'Terang & Bersih',

    // Phase 15.45: Chat Item & Room Menu i18n
    pinChat: 'Sematkan Chat',
    unpinChat: 'Lepas Sematan',
    archiveChat: 'Arsipkan Chat',
    unarchiveChat: 'Buka Arsip',
    chatOptions: 'Opsi Chat',
    searchInChat: 'Cari pesan dalam chat...',
    searchMessagesMenu: 'Cari Pesan',
    mediaFilesMenu: 'Berkas Media',
    disappearingMessagesMenu: 'Pesan Sementara',
    themeWallpaperMenu: 'Tema & Wallpaper Chat',
    voiceCallMenu: 'Panggilan Suara',
    videoCallMenu: 'Panggilan Video',
    contactInfoMenu: 'Info Kontak',
    groupInfoMenu: 'Info Grup',
    clearChatMenu: 'Bersihkan Chat',

    // Toast Notifications i18n
    vanishModeEnabledToast: 'Pesan Sementara Aktif (24 Jam)',
    vanishModeDisabledToast: 'Pesan Sementara Dinonaktifkan',
    voiceCallComingSoonToast: '🚀 Panggilan Suara segera hadir!',
    videoCallComingSoonToast: '🚀 Panggilan Video segera hadir!',
    clearChatComingSoonToast: '🧹 Fitur Bersihkan Chat segera hadir!',
    chatPinnedToast: '📌 Chat disematkan ke atas',
    chatUnpinnedToast: '📌 Sematan chat dilepas',
    chatArchivedToast: '📦 Chat berhasil diarsipkan',
    chatUnarchivedToast: '📦 Chat dipindahkan dari arsip',
    archivedPinBlockedToast: '⚠️ Chat yang diarsipkan tidak dapat disematkan',
    pinnedArchiveBlockedToast: '⚠️ Lepas sematan (unpin) chat terlebih dahulu sebelum mengarsipkan',

    // Theme Modal i18n
    themeModalTitle: 'Tema & Wallpaper Chat',
    themeModalSubtitle: 'Sesuaikan warna balon chat dan gambar latar khusus room ini.',
    livePreviewHeader: 'Pratinjau Langsung',
    dummyAiMessage: 'Halo! Wallpaper & tema chat terlihat estetik ✨',
    dummyUserMessage: 'Keren banget, warna balon & temanya pas! 🔥',
    presetThemesSection: 'Pilihan Tema Preset',
    customColorSection: 'Warna Balon Chat Kustom',
    wallpaperSection: 'Wallpaper Latar Chat',
    uploadCustomWallpaper: 'Unggah Gambar Kustom',
    uploadingWallpaper: 'Mengunggah wallpaper...',
    resetDefaultTheme: 'Reset Default',
    saveThemeChanges: 'Simpan Tema',
    noWallpaper: 'Tanpa Wallpaper',

    // Theme Preset Descriptions
    themeDescDefault: 'Tema indigo modern klasik Ping!',
    themeDescRose: 'Nuansa romantis & hangat warna mawar',
    themeDescEmerald: 'Sentuhan segar & menenangkan hijau zamrud',
    themeDescNeon: 'Estetika futuristik neon pink & cyan',
    themeDescSapphire: 'Elegan, dalam, dan fokus warna sapphire',
    themeDescSunset: 'Nuansa hangat senja jingga keemasan',

    // PWA Banner i18n
    installPingApp: 'Install Aplikasi Ping!',
    pwaBannerSubtitle: 'Akses cepat layar penuh',
    laterBtn: 'Nanti',

    // Group Ownership & Leaving Logic
    ownerCannotLeaveMsg: 'Sebagai pemilik grup, Anda harus memindahkan kepemilikan grup ke anggota lain terlebih dahulu sebelum keluar.',
    transferOwner: 'Pindahkan Kepemilikan',
    transferOwnerConfirmTitle: 'Pindahkan Pemilik Grup?',
    transferOwnerConfirmMsg: 'Jadikan anggota ini sebagai Pemilik utama grup ini?',
    ownerTransferredSuccess: 'Kepemilikan grup berhasil dipindahkan',
    groupDissolvedNotice: 'Grup dibubarkan karena pembuat grup keluar sebelum anggota lain bergabung.',
  },
  en: {
    // App & Nav
    appName: 'Ping!',
    searchPlaceholder: 'Search messages or contacts...',
    searchUsers: 'Search users...',
    createNewChat: 'Start New Chat',
    createGroup: 'Create New Group',
    settings: 'Settings',
    profile: 'My Profile',
    logout: 'Log out',
    installApp: 'Install App',
    archivedChats: 'Archived Chats',
    pinnedChats: 'Pinned Chats',
    allChats: 'All Conversations',
    noChats: 'No conversations yet',
    noArchivedChats: 'No archived conversations',
    startChatting: 'Start a conversation with friends or a group!',
    offlineStatus: 'Offline',
    onlineStatus: 'Online',
    busyStatus: 'Busy',
    awayStatus: 'Away',

    // Settings Modal
    settingsTitle: 'Settings',
    tabSystem: 'System & App',
    tabNotifications: 'Sound & Notifications',
    tabPrivacy: 'Privacy & Theme',
    tabSecurity: 'Account Security',

    // System Tab
    appMaintenance: 'App Maintenance',
    currentVersion: 'Current Version',
    latestVersion: 'Latest Version',
    checkUpdates: 'Check for Updates',
    checkingUpdates: 'Checking...',
    upToDate: 'App is up to date!',
    updateFound: 'New version available!',
    pwaInstallTitle: 'Progressive Web App (PWA)',
    pwaInstallDesc: 'Install Ping! to your desktop or home screen for a fast, native app experience.',
    installNow: 'Install Now',
    appInstalled: 'App is Installed',
    selectLanguage: 'Interface Language',
    indonesian: 'Bahasa Indonesia',
    english: 'English (US)',

    // Sound & Notifications Tab
    soundSettings: 'Audio & Alerts',
    chatSoundFx: 'Chat Sound Effects',
    chatSoundFxDesc: 'Play audio chimes for incoming and outgoing messages.',
    desktopNotifications: 'Desktop Push Notifications',
    desktopNotificationsDesc: 'Receive desktop pop-ups when new messages arrive.',
    notificationsEnabled: 'Notifications Enabled',
    notificationsBlocked: 'Notifications Blocked in Browser',
    enableNotifications: 'Enable Notifications',
    testSound: 'Test Sound',

    // Privacy & Appearance Tab
    privacySettings: 'Privacy & Appearance Settings',
    showOnlineStatus: 'Show Online Presence',
    showOnlineStatusDesc: 'Allow contacts to see when you are active on Ping!.',
    chatAppearance: 'Chat Wallpaper & Appearance',
    appearanceDesc: 'Customize bubble colors and room wallpapers.',
    customizeTheme: 'Customize Chat Theme',
    themeNotice: 'Note: Chat Themes and Wallpapers are configured directly per room via the Top Menu (⋮) inside each Chat Room.',
    appTheme: 'App Theme',
    darkTheme: 'Dark Mode (Default)',
    lightTheme: 'Light Mode (Maintenance)',
    lightThemeMaintenance: 'Light Mode is currently under maintenance for visual and performance enhancements.',

    // Security Tab
    securitySettings: 'Account Security',
    changePasswordTitle: 'Change Password',
    currentPassword: 'Current Password',
    newPassword: 'New Password',
    confirmPassword: 'Confirm New Password',
    updatePasswordBtn: 'Update Password',
    updatingPassword: 'Updating...',
    passwordTooShort: 'Password must be at least 6 characters',
    passwordMismatch: 'Passwords do not match',
    passwordUpdatedSuccess: 'Password updated successfully!',

    // Group Creation Modal
    createGroupTitle: 'Create New Group',
    createGroupSubtitle: 'Add members to start chatting together',
    groupNameLabel: 'Group Name',
    groupNamePlaceholder: 'e.g. Design Team 🎨',
    selectedMembersLabel: 'Selected Members',
    addMembersLabel: 'Find & Add Members',
    searchMembersPlaceholder: 'Type username or full name...',
    searchEmptyPrompt: 'Type a name or username to search for members...',
    noUsersFoundPrompt: 'No users found.',
    membersSelectedSuffix: 'members selected',
    cancel: 'Cancel',
    createGroupAction: 'Create Group',
    creatingGroupAction: 'Creating...',
    changeGroupAvatar: 'Change Group Photo',

    // Chat Room
    typeMessagePlaceholder: 'Type a message...',
    vanishModePlaceholder: 'Disappearing message (24 hrs)...',
    vanishModeActive: 'Disappearing Messages Active',
    editingMessage: 'Editing Message',
    saveChanges: 'Save',
    recordingAudio: 'Recording audio...',
    send: 'Send',
    reply: 'Reply',
    edit: 'Edit',
    pin: 'Pin',
    unpin: 'Unpin',
    delete: 'Delete',
    copy: 'Copy Text',
    copiedToast: 'Text copied to clipboard',
    download: 'Download',
    downloadImage: 'Download Image',
    today: 'Today',
    yesterday: 'Yesterday',
    lastSeenTodayAt: 'Last seen today at',
    lastSeenYesterdayAt: 'Last seen yesterday at',
    lastSeenOn: 'Last seen on',
    atTime: 'at',
    wantsToMessage: 'wants to send you a message',
    acceptPrompt: 'Accept the request to view their full profile and reply to messages.',
    accept: 'Accept',
    reject: 'Reject',
    messageRequestSent: 'Message Request Sent',
    awaitingApproval: 'Awaiting approval. Full profile and info will unlock once accepted.',

    // Image Cropper Modal
    cropImageTitle: 'Adjust Image',
    rotate90: 'Rotate 90°',
    zoomLabel: 'Zoom',
    applyCrop: 'Apply',

    // Global Search & New Chat
    searchChatsOrFriends: 'Search chats or contacts...',
    globalUserSearch: 'Global User Search',
    startChat: 'Start Chat',

    // Phase 15.42: Batch selection, WhatsApp action bar & Delete for Me
    selectMode: 'Select',
    cancelSelect: 'Cancel',
    selectedCount: 'selected',
    archiveSelected: 'Archive',
    unarchiveSelected: 'Unarchive',
    deleteSelected: 'Delete',
    deleteForMe: 'Delete for Me',
    deleteForEveryone: 'Delete for Everyone',
    deleteMessageTitle: 'Delete Message?',
    deleteMessageConfirmPrompt: 'Choose how you want to delete this message:',
    batchArchiveSuccess: 'Chats archived successfully',
    batchDeleteSuccess: 'Chats deleted successfully',
    directDownload: 'Download Media',
    messageDetails: 'Message Info',
    groupSettings: 'Group Settings',
    addMembers: 'Add Members',
    leaveGroup: 'Leave Group',
    leaveGroupConfirmTitle: 'Leave group?',
    leaveGroupConfirmMsg: 'You will no longer receive messages from this group.',
    removeMemberConfirmTitle: 'Remove member?',
    removeMemberConfirmMsg: 'This member will be removed from the group.',

    // Group Invite i18n
    groupInviteBadge: 'Group Invite',
    groupInviteDefaultDesc: 'Invitation to join a group',
    groupInviteSent: 'Your invitation was sent',
    groupInviteJoined: '✓ You joined this group',
    groupInviteDeclined: '✕ Group invitation declined',
    groupInviteInvalid: '✕ Invitation is no longer valid (Group was dissolved)',
    groupInviteAcceptRequired: 'Accept message request first',
    groupInviteTapToJoin: 'Tap to join',
    groupInviteView: 'View Group',
    groupInviteJoin: 'Join',
    groupInviteOpen: 'Open Group',
    groupInviteDeclinedTag: 'Declined',
    groupInviteInvalidTag: 'Invalid',
    groupInviteDecline: 'Decline',
    groupInviteText: 'I am inviting you to join the group: {groupName}',
    groupInviteNotification: 'Invited you to a group',

    // Settings Cards i18n
    standalonePwaTitle: 'Standalone Web App (PWA)',
    standalonePwaDesc: 'Launch directly from desktop or home screen.',
    themeCardTitle: 'App Theme & Appearance',
    themeCardDesc: 'Choose light or dark theme for optimal viewing comfort.',
    themeDarkOption: 'Dark & Elegant',
    themeLightOption: 'Light & Clean',

    // Phase 15.45: Chat Item & Room Menu i18n
    pinChat: 'Pin Chat',
    unpinChat: 'Unpin Chat',
    archiveChat: 'Archive Chat',
    unarchiveChat: 'Unarchive Chat',
    chatOptions: 'Chat Options',
    searchInChat: 'Search messages in chat...',
    searchMessagesMenu: 'Search Messages',
    mediaFilesMenu: 'Media & Files',
    disappearingMessagesMenu: 'Disappearing Messages',
    themeWallpaperMenu: 'Chat Theme & Wallpaper',
    voiceCallMenu: 'Voice Call',
    videoCallMenu: 'Video Call',
    contactInfoMenu: 'Contact Info',
    groupInfoMenu: 'Group Info',
    clearChatMenu: 'Clear Chat',

    // Toast Notifications i18n
    vanishModeEnabledToast: 'Disappearing Messages Enabled (24 Hours)',
    vanishModeDisabledToast: 'Disappearing Messages Disabled',
    voiceCallComingSoonToast: '🚀 Voice Call feature coming soon!',
    videoCallComingSoonToast: '🚀 Video Call feature coming soon!',
    clearChatComingSoonToast: '🧹 Clear Chat feature coming soon!',
    chatPinnedToast: '📌 Chat pinned to top',
    chatUnpinnedToast: '📌 Chat unpinned',
    chatArchivedToast: '📦 Chat archived successfully',
    chatUnarchivedToast: '📦 Chat unarchived',
    archivedPinBlockedToast: '⚠️ Archived chats cannot be pinned',
    pinnedArchiveBlockedToast: '⚠️ Please unpin this chat before archiving',

    // Theme Modal i18n
    themeModalTitle: 'Chat Theme & Wallpaper',
    themeModalSubtitle: 'Customize bubble colors and background wallpaper specifically for this chat room.',
    livePreviewHeader: 'Live Preview',
    dummyAiMessage: 'Hello! Chat wallpaper & theme looking fresh ✨',
    dummyUserMessage: 'Awesome, bubble colors & theme look perfect! 🔥',
    presetThemesSection: 'Preset Theme Options',
    customColorSection: 'Custom Bubble Color',
    wallpaperSection: 'Chat Wallpaper',
    uploadCustomWallpaper: 'Upload Custom Image',
    uploadingWallpaper: 'Uploading wallpaper...',
    resetDefaultTheme: 'Reset Default',
    saveThemeChanges: 'Save Theme',
    noWallpaper: 'No Wallpaper',

    // Theme Preset Descriptions
    themeDescDefault: 'Classic modern Ping! indigo theme',
    themeDescRose: 'Warm & romantic rose petal hues',
    themeDescEmerald: 'Fresh & calming emerald green touch',
    themeDescNeon: 'Futuristic neon pink & cyan aesthetic',
    themeDescSapphire: 'Elegant, deep & focused sapphire color',
    themeDescSunset: 'Warm golden evening sunset twilight',

    // PWA Banner i18n
    installPingApp: 'Install Ping! App',
    pwaBannerSubtitle: 'Full screen quick access',
    laterBtn: 'Later',

    // Group Ownership & Leaving Logic
    ownerCannotLeaveMsg: 'As the group owner, you must transfer ownership to another member before leaving the group.',
    transferOwner: 'Transfer Ownership',
    transferOwnerConfirmTitle: 'Transfer Group Ownership?',
    transferOwnerConfirmMsg: 'Make this member the primary Owner of this group?',
    ownerTransferredSuccess: 'Group ownership transferred successfully',
    groupDissolvedNotice: 'The group was dissolved because the creator left before other members joined.',
  }
}

const LanguageContext = createContext(null)

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(() => {
    return localStorage.getItem('ping_language') || 'id'
  })

  const setLanguage = useCallback((lang) => {
    setLanguageState(lang)
    localStorage.setItem('ping_language', lang)
  }, [])

  const t = useCallback((key, params) => {
    const langDict = translations[language] || translations.id
    let str = langDict[key] || translations.id[key] || key
    if (params && typeof params === 'object') {
      Object.entries(params).forEach(([k, v]) => {
        str = str.replaceAll(`{${k}}`, v ?? '')
      })
    }
    return str
  }, [language])

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}
