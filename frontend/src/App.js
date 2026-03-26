import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import { Toaster } from 'react-hot-toast';
import i18n from './i18n';

// سياق المصادقة
import { AuthProvider, useAuth } from './contexts/AuthContext';

// التخطيط
import Layout from './components/Layout/Layout';

// الصفحات
import Home from './pages/Home';
import Blog from './pages/Blog';
import BlogPost from './pages/BlogPost';
import Shop from './pages/Shop';
import Product from './pages/Product';
import Surveys from './pages/Surveys';
import SurveyDetail from './pages/SurveyDetail';
import Dashboard from './pages/Dashboard';
import Wallet from './pages/Wallet';
import Profile from './pages/Profile';
import Leaderboard from './pages/Leaderboard';
import Challenge from './pages/Challenge';
import Login from './pages/Login';
import Register from './pages/Register';
import Admin from './pages/Admin';

// الأنماط
import './styles/global.css';
import './styles/glassmorphism.css';
import './styles/neon.css';

// مكون الحماية
const ProtectedRoute = ({ children, requireAdmin = false }) => {
    const { user, isAuthenticated, loading } = useAuth();
    
    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen">
                <div className="loading-spinner"></div>
            </div>
        );
    }
    
    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }
    
    if (requireAdmin && user?.role !== 'admin' && user?.role !== 'super_admin') {
        return <Navigate to="/" replace />;
    }
    
    return children;
};

function App() {
    const [language, setLanguage] = useState(() => {
        return localStorage.getItem('imzatit_language') || 'ar';
    });

    useEffect(() => {
        i18n.changeLanguage(language);
        localStorage.setItem('imzatit_language', language);
        document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
        document.documentElement.lang = language;
    }, [language]);

    const toggleLanguage = () => {
        setLanguage(prev => prev === 'ar' ? 'en' : 'ar');
    };

    return (
        <I18nextProvider i18n={i18n}>
            <AuthProvider>
                <BrowserRouter>
                    <Toaster 
                        position="top-center"
                        toastOptions={{
                            duration: 4000,
                            style: {
                                background: 'rgba(255,255,255,0.1)',
                                backdropFilter: 'blur(10px)',
                                color: '#fff',
                                borderRadius: '12px',
                                border: '1px solid rgba(212,175,55,0.3)'
                            }
                        }}
                    />
                    <Layout language={language} toggleLanguage={toggleLanguage}>
                        <Routes>
                            {/* الصفحات العامة */}
                            <Route path="/" element={<Home />} />
                            <Route path="/blog" element={<Blog />} />
                            <Route path="/blog/:slug" element={<BlogPost />} />
                            <Route path="/shop" element={<Shop />} />
                            <Route path="/shop/:id" element={<Product />} />
                            <Route path="/surveys" element={<Surveys />} />
                            <Route path="/surveys/:id" element={<SurveyDetail />} />
                            <Route path="/leaderboard" element={<Leaderboard />} />
                            <Route path="/login" element={<Login />} />
                            <Route path="/register" element={<Register />} />
                            
                            {/* الصفحات المحمية */}
                            <Route path="/dashboard" element={
                                <ProtectedRoute>
                                    <Dashboard />
                                </ProtectedRoute>
                            } />
                            <Route path="/wallet" element={
                                <ProtectedRoute>
                                    <Wallet />
                                </ProtectedRoute>
                            } />
                            <Route path="/profile" element={
                                <ProtectedRoute>
                                    <Profile />
                                </ProtectedRoute>
                            } />
                            <Route path="/challenge" element={
                                <ProtectedRoute>
                                    <Challenge />
                                </ProtectedRoute>
                            } />
                            
                            {/* صفحات المشرف */}
                            <Route path="/admin/*" element={
                                <ProtectedRoute requireAdmin={true}>
                                    <Admin />
                                </ProtectedRoute>
                            } />
                        </Routes>
                    </Layout>
                </BrowserRouter>
            </AuthProvider>
        </I18nextProvider>
    );
}

export default App;
