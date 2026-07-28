const uiStoreString = localStorage.getItem('ui')

if (uiStoreString) {
  try {
    const uiStore = JSON.parse(uiStoreString)
    const isDark = Boolean(uiStore.dark)
    const isMobile = !window.matchMedia('(pointer: fine) and (hover: hover)').matches

    document.documentElement.classList.toggle('dark', isDark)
    document.getElementById('theme-color-meta')?.setAttribute(
      'content',
      isDark
        ? (isMobile ? '#141414' : '#000000')
        : (isMobile ? '#FFFFFF' : '#F1F1F1')
    )
  } catch {
    localStorage.removeItem('ui')
  }
}
