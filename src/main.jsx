import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import Layout from './components/Layout.jsx'
import { LanguageProvider } from './contexts/LanguageContext.jsx'
import { AuthProvider } from './contexts/AuthContext.jsx'
import { UserPreferencesProvider } from './contexts/UserPreferencesContext.jsx'

// Import pages
import {
  AboutPage,
  PrivacyPolicyPage,
  TermsOfServicePage,
  SuccessStoriesPage,
  ContactUsPage,
  TermsConditionsPage,
  RefundPolicyPage,
  SafetyGuidelinesPage,
  ProfilePage
} from './pages/index.js'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <LanguageProvider>
          <UserPreferencesProvider>
            <Routes>
              <Route path="/" element={<Layout />}>
                <Route index element={<App />} />
                <Route path="about" element={<AboutPage />} />
                <Route path="privacy-policy" element={<PrivacyPolicyPage />} />
                <Route path="terms-of-service" element={<TermsOfServicePage />} />
                <Route path="success-stories" element={<SuccessStoriesPage />} />
                <Route path="contact" element={<ContactUsPage />} />
                <Route path="terms-conditions" element={<TermsConditionsPage />} />
                <Route path="refund-policy" element={<RefundPolicyPage />} />
                <Route path="safety-guidelines" element={<SafetyGuidelinesPage />} />
                <Route path="profile" element={<ProfilePage />} />
              </Route>
            </Routes>
          </UserPreferencesProvider>
        </LanguageProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
