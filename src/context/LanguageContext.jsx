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
    privacySettings: 'Pengaturan Privasi',
    showOnlineStatus: 'Tampilkan Status Online',
    showOnlineStatusDesc: 'Izinkan kontak melihat kapan Anda aktif di Ping!.',
    chatAppearance: 'Tampilan & Tema Chat',
    appearanceDesc: 'Sesuaikan wallpaper dan warna bubble percakapan.',
    customizeTheme: 'Atur Tema Percakapan',

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
    privacySettings: 'Privacy Settings',
    showOnlineStatus: 'Show Online Presence',
    showOnlineStatusDesc: 'Allow contacts to see when you are active on Ping!.',
    chatAppearance: 'Chat Wallpaper & Appearance',
    appearanceDesc: 'Customize bubble colors and room wallpapers.',
    customizeTheme: 'Customize Chat Theme',

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

  const t = useCallback((key) => {
    const langDict = translations[language] || translations.id
    return langDict[key] || translations.id[key] || key
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
