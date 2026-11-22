import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider } from './context/auth-context.tsx';
import { ThemeProvider } from './context/theme-context.tsx';
import { ErrorBoundary } from './components/error-boundary.tsx';
import { Header } from './components/header.tsx';
import { ProtectedRoute } from './components/protected-route.tsx';
import { LoginPage } from './pages/login-page.tsx';
import { SignupPage } from './pages/signup-page.tsx';
import { DashboardPage } from './pages/dashboard-page.tsx';
import { DetailPage } from './pages/detail-page.tsx';
import { LandingPage } from './pages/landing-page.tsx';

export function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <BrowserRouter>
            <div className="min-h-screen flex flex-col">
              <Header />
              <main className="flex-1">
                <Routes>
                  <Route path="/" element={<LandingPage />} />
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/signup" element={<SignupPage />} />
                  <Route element={<ProtectedRoute />}>
                    <Route path="/dashboard" element={<DashboardPage />} />
                    <Route path="/urls/:id" element={<DetailPage />} />
                  </Route>
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </main>
            </div>
            <Toaster position="top-right" richColors />
          </BrowserRouter>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
