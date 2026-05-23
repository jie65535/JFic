import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'sonner'
import HomePage from './pages/HomePage'
import NewBookPage from './pages/NewBookPage'
import ReaderPage from './pages/ReaderPage'
import ConfigPage from './pages/ConfigPage'
import BookSettingsPage from './pages/BookSettingsPage'
import { useThemeEffect } from './hooks/useTheme'

export default function App() {
  useThemeEffect()

  useEffect(() => {
    document.title = 'JFic — 同人小说创作平台'
  }, [])

  return (
    <>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/new" element={<NewBookPage />} />
        <Route path="/config" element={<ConfigPage />} />
        <Route path="/book/:id" element={<ReaderPage />} />
        <Route path="/book/:id/settings" element={<BookSettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster
        position="top-center"
        richColors
        toastOptions={{
          style: { fontFamily: 'inherit' },
        }}
      />
    </>
  )
}
