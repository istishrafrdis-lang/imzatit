import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { 
    ArrowLeft, 
    Sparkles, 
    Shield, 
    Zap, 
    TrendingUp, 
    Users, 
    Award,
    ChevronLeft,
    Star
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';

const Home = () => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const [stats, setStats] = useState({
        total_users: 0,
        total_surveys: 0,
        total_rewards: 0
    });
    const [activeSurveys, setActiveSurveys] = useState([]);
    const [topUsers, setTopUsers] = useState([]);
    const [recentBlogs, setRecentBlogs] = useState([]);

    useEffect(() => {
        // جلب إحصائيات المنصة
        const fetchStats = async () => {
            try {
                const response = await api.get('/system/info');
                if (response.data.success) {
                    setStats(response.data.stats);
                }
            } catch (error) {
                console.error('خطأ في جلب الإحصائيات:', error);
            }
        };

        // جلب الاستطلاعات النشطة
        const fetchSurveys = async () => {
            try {
                const response = await api.get('/surveys?limit=3');
                if (response.data.success) {
                    setActiveSurveys(response.data.data);
                }
            } catch (error) {
                console.error('خطأ في جلب الاستطلاعات:', error);
            }
        };

        // جلب المتصدرين
        const fetchLeaderboard = async () => {
            try {
                const response = await api.get('/rewards/leaderboard?limit=5');
                if (response.data.success) {
                    setTopUsers(response.data.data);
                }
            } catch (error) {
                console.error('خطأ في جلب المتصدرين:', error);
            }
        };

        // جلب آخر المقالات
        const fetchBlogs = async () => {
            try {
                const response = await api.get('/blog?limit=3');
                if (response.data.success) {
                    setRecentBlogs(response.data.data);
                }
            } catch (error) {
                console.error('خطأ في جلب المقالات:', error);
            }
        };

        fetchStats();
        fetchSurveys();
        fetchLeaderboard();
        fetchBlogs();
    }, []);

    // الآيات المقدسة
    const sacredVerses = [
        { text: "إن الله يأمر بالعدل والإحسان", source: "القرآن الكريم - النحل: 90" },
        { text: "وتعاونوا على البر والتقوى", source: "القرآن الكريم - المائدة: 2" },
        { text: "وأوفوا الكيل والميزان بالقسط", source: "القرآن الكريم - الأنعام: 152" },
        { text: "وأحسنوا إن الله يحب المحسنين", source: "القرآن الكريم - البقرة: 195" }
    ];

    const [currentVerse, setCurrentVerse] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentVerse(prev => (prev + 1) % sacredVerses.length);
        }, 8000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="home-page">
            {/* قسم الهيرو */}
            <section className="hero-section">
                <div className="hero-bg"></div>
                <div className="container">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8 }}
                        className="hero-content"
                    >
                        <h1 className="hero-title">
                            {t('home.title')}
                            <span className="highlight">إمزتت</span>
                        </h1>
                        <p className="hero-subtitle">
                            {t('home.subtitle')}
                        </p>
                        
                        <div className="sacred-verse">
                            <span className="verse-icon">📖</span>
                            <p>"{sacredVerses[currentVerse].text}"</p>
                            <small>{sacredVerses[currentVerse].source}</small>
                        </div>
                        
                        <div className="hero-buttons">
                            {user ? (
                                <Link to="/surveys" className="btn btn-primary">
                                    <Sparkles size={20} />
                                    {t('home.startSurveys')}
                                </Link>
                            ) : (
                                <>
                                    <Link to="/register" className="btn btn-primary">
                                        <Sparkles size={20} />
                                        {t('home.joinNow')}
                                    </Link>
                                    <Link to="/login" className="btn btn-secondary">
                                        {t('home.login')}
                                    </Link>
                                </>
                            )}
                            <Link to="/surveys" className="btn btn-outline">
                                <TrendingUp size={20} />
                                {t('home.explore')}
                            </Link>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* إحصائيات المنصة */}
            <section className="stats-section">
                <div className="container">
                    <div className="stats-grid">
                        <div className="stat-card glass-card">
                            <div className="stat-icon">👥</div>
                            <div className="stat-number">{stats.total_users?.toLocaleString() || 0}</div>
                            <div className="stat-label">{t('home.totalUsers')}</div>
                        </div>
                        <div className="stat-card glass-card">
                            <div className="stat-icon">📊</div>
                            <div className="stat-number">{stats.total_surveys?.toLocaleString() || 0}</div>
                            <div className="stat-label">{t('home.totalSurveys')}</div>
                        </div>
                        <div className="stat-card glass-card">
                            <div className="stat-icon">💰</div>
                            <div className="stat-number">{stats.total_rewards?.toLocaleString() || 0}</div>
                            <div className="stat-label">{t('home.totalRewards')} نقطة</div>
                        </div>
                    </div>
                </div>
            </section>

            {/* الاستطلاعات النشطة */}
            <section className="surveys-section">
                <div className="container">
                    <div className="section-header">
                        <h2 className="section-title">{t('home.activeSurveys')}</h2>
                        <Link to="/surveys" className="view-all">
                            {t('home.viewAll')}
                            <ChevronLeft size={18} />
                        </Link>
                    </div>
                    
                    <div className="surveys-grid">
                        {activeSurveys.map((survey, index) => (
                            <motion.div
                                key={survey.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1 }}
                                className="survey-card glass-card"
                            >
                                <div className="survey-badge">
                                    {survey.reward_per_response} {survey.reward_currency === 'TIT' ? 'TIT' : 'نقطة'}
                                </div>
                                <h3 className="survey-title">{survey.title_ar}</h3>
                                <p className="survey-desc">{survey.description_ar?.substring(0, 100)}...</p>
                                <div className="survey-meta">
                                    <span>⏱️ {survey.total_responses || 0} مشاركة</span>
                                    <span>📅 {new Date(survey.end_date).toLocaleDateString('ar')}</span>
                                </div>
                                <Link to={`/surveys/${survey.id}`} className="btn btn-sm btn-primary">
                                    {t('home.participate')}
                                </Link>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* لوحة المتصدرين */}
            <section className="leaderboard-section">
                <div className="container">
                    <div className="section-header">
                        <h2 className="section-title">{t('home.leaderboard')}</h2>
                        <Link to="/leaderboard" className="view-all">
                            {t('home.viewAll')}
                            <ChevronLeft size={18} />
                        </Link>
                    </div>
                    
                    <div className="leaderboard-grid">
                        <div className="leaderboard-card glass-card">
                            <div className="leaderboard-header">
                                <div className="rank">#</div>
                                <div className="name">{t('home.user')}</div>
                                <div className="points">{t('home.points')}</div>
                            </div>
                            {topUsers.map((user, index) => (
                                <div key={user.id} className={`leaderboard-item ${index < 3 ? 'top' : ''}`}>
                                    <div className="rank">
                                        {index === 0 && '🥇'}
                                        {index === 1 && '🥈'}
                                        {index === 2 && '🥉'}
                                        {index > 2 && index + 1}
                                    </div>
                                    <div className="name">{user.full_name}</div>
                                    <div className="points">{user.total_points?.toLocaleString()}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* المقالات الحديثة */}
            <section className="blog-section">
                <div className="container">
                    <div className="section-header">
                        <h2 className="section-title">{t('home.recentBlogs')}</h2>
                        <Link to="/blog" className="view-all">
                            {t('home.readMore')}
                            <ChevronLeft size={18} />
                        </Link>
                    </div>
                    
                    <div className="blogs-grid">
                        {recentBlogs.map((blog, index) => (
                            <motion.div
                                key={blog.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1 }}
                                className="blog-card glass-card"
                            >
                                {blog.featured_image && (
                                    <div className="blog-image">
                                        <img src={blog.featured_image} alt={blog.title_ar} />
                                    </div>
                                )}
                                <div className="blog-content">
                                    <div className="blog-category">{blog.category}</div>
                                    <h3 className="blog-title">{blog.title_ar}</h3>
                                    <p className="blog-excerpt">{blog.excerpt_ar?.substring(0, 100)}...</p>
                                    <div className="blog-meta">
                                        <span>📅 {new Date(blog.published_at).toLocaleDateString('ar')}</span>
                                        <span>👁️ {blog.views_count} مشاهدة</span>
                                    </div>
                                    <Link to={`/blog/${blog.slug}`} className="read-more">
                                        {t('home.readMore')}
                                        <ArrowLeft size={16} />
                                    </Link>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* قسم المتجر */}
            <section className="shop-section">
                <div className="container">
                    <div className="section-header">
                        <h2 className="section-title">{t('home.shop')}</h2>
                        <Link to="/shop" className="view-all">
                            {t('home.shopNow')}
                            <ChevronLeft size={18} />
                        </Link>
                    </div>
                    
                    <div className="shop-banner glass-card">
                        <div className="shop-banner-content">
                            <h3>{t('home.shopTitle')}</h3>
                            <p>{t('home.shopDesc')}</p>
                            <Link to="/shop" className="btn btn-primary">
                                {t('home.exploreShop')}
                            </Link>
                        </div>
                        <div className="shop-banner-icon">📚</div>
                    </div>
                </div>
            </section>

            {/* قسم تحدي 100 يوم */}
            <section className="challenge-section">
                <div className="container">
                    <div className="challenge-banner glass-card neon-border">
                        <div className="challenge-content">
                            <div className="challenge-icon">🏆</div>
                            <h3>{t('home.challengeTitle')}</h3>
                            <p>{t('home.challengeDesc')}</p>
                            {user ? (
                                <Link to="/challenge" className="btn btn-primary">
                                    {t('home.startChallenge')}
                                </Link>
                            ) : (
                                <Link to="/register" className="btn btn-primary">
                                    {t('home.joinChallenge')}
                                </Link>
                            )}
                        </div>
                        <div className="challenge-stats">
                            <div className="stat">
                                <span className="stat-number">100</span>
                                <span className="stat-label">{t('home.days')}</span>
                            </div>
                            <div className="stat">
                                <span className="stat-number">+5000</span>
                                <span className="stat-label">{t('home.points')}</span>
                            </div>
                            <div className="stat">
                                <span className="stat-number">🏅</span>
                                <span className="stat-label">{t('home.certificate')}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default Home;
