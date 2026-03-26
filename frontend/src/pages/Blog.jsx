import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Search, Calendar, User, Tag, ChevronLeft, ChevronRight } from 'lucide-react';
import api from '../utils/api';

const Blog = () => {
    const { t } = useTranslation();
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [categories, setCategories] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [featuredPost, setFeaturedPost] = useState(null);

    useEffect(() => {
        fetchPosts();
        fetchCategories();
    }, [selectedCategory, searchTerm, currentPage]);

    const fetchPosts = async () => {
        setLoading(true);
        try {
            let url = `/blog?page=${currentPage}&limit=9`;
            if (selectedCategory !== 'all') {
                url += `&category=${selectedCategory}`;
            }
            if (searchTerm) {
                url += `&search=${encodeURIComponent(searchTerm)}`;
            }
            
            const response = await api.get(url);
            if (response.data.success) {
                setPosts(response.data.data);
                setTotalPages(response.data.pagination?.pages || 1);
                if (response.data.data.length > 0 && !featuredPost) {
                    setFeaturedPost(response.data.data[0]);
                }
            }
        } catch (error) {
            console.error('خطأ في جلب المقالات:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchCategories = async () => {
        try {
            const response = await api.get('/blog/categories');
            if (response.data.success) {
                setCategories(response.data.data);
            }
        } catch (error) {
            console.error('خطأ في جلب التصنيفات:', error);
        }
    };

    const handleSearch = (e) => {
        e.preventDefault();
        setCurrentPage(1);
        fetchPosts();
    };

    return (
        <div className="blog-page">
            {/* رأس الصفحة */}
            <section className="page-header">
                <div className="container">
                    <h1>{t('blog.title')}</h1>
                    <p>{t('blog.subtitle')}</p>
                </div>
            </section>

            {/* المقال المميز */}
            {featuredPost && (
                <section className="featured-post">
                    <div className="container">
                        <div className="featured-card glass-card">
                            <div className="featured-image">
                                <img src={featuredPost.featured_image || '/assets/images/blog-placeholder.jpg'} alt={featuredPost.title_ar} />
                                <div className="featured-badge">{t('blog.featured')}</div>
                            </div>
                            <div className="featured-content">
                                <div className="post-meta">
                                    <span><Calendar size={14} /> {new Date(featuredPost.published_at).toLocaleDateString('ar')}</span>
                                    <span><User size={14} /> {featuredPost.author_name}</span>
                                    <span><Tag size={14} /> {featuredPost.category}</span>
                                </div>
                                <h2>{featuredPost.title_ar}</h2>
                                <p>{featuredPost.excerpt_ar}</p>
                                <Link to={`/blog/${featuredPost.slug}`} className="btn btn-primary">
                                    {t('blog.readMore')}
                                    <ChevronLeft size={18} />
                                </Link>
                            </div>
                        </div>
                    </div>
                </section>
            )}

            {/* شريط البحث والتصفية */}
            <section className="blog-filters">
                <div className="container">
                    <div className="filters-wrapper">
                        <form onSubmit={handleSearch} className="search-form">
                            <input
                                type="text"
                                placeholder={t('blog.search')}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                            <button type="submit">
                                <Search size={20} />
                            </button>
                        </form>
                        
                        <div className="categories-filter">
                            <button
                                className={`category-btn ${selectedCategory === 'all' ? 'active' : ''}`}
                                onClick={() => setSelectedCategory('all')}
                            >
                                {t('blog.all')}
                            </button>
                            {categories.map(cat => (
                                <button
                                    key={cat}
                                    className={`category-btn ${selectedCategory === cat ? 'active' : ''}`}
                                    onClick={() => setSelectedCategory(cat)}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* قائمة المقالات */}
            <section className="blog-posts">
                <div className="container">
                    {loading ? (
                        <div className="loading-spinner-container">
                            <div className="loading-spinner"></div>
                        </div>
                    ) : posts.length === 0 ? (
                        <div className="no-results glass-card">
                            <p>{t('blog.noPosts')}</p>
                        </div>
                    ) : (
                        <>
                            <div className="posts-grid">
                                {posts.map(post => (
                                    <article key={post.id} className="post-card glass-card">
                                        {post.featured_image && (
                                            <div className="post-image">
                                                <img src={post.featured_image} alt={post.title_ar} />
                                            </div>
                                        )}
                                        <div className="post-content">
                                            <div className="post-meta">
                                                <span><Calendar size={12} /> {new Date(post.published_at).toLocaleDateString('ar')}</span>
                                                <span><Tag size={12} /> {post.category}</span>
                                            </div>
                                            <h3>{post.title_ar}</h3>
                                            <p>{post.excerpt_ar?.substring(0, 120)}...</p>
                                            <Link to={`/blog/${post.slug}`} className="read-more">
                                                {t('blog.readMore')}
                                                <ChevronLeft size={16} />
                                            </Link>
                                        </div>
                                    </article>
                                ))}
                            </div>
                            
                            {/* الترقيم */}
                            {totalPages > 1 && (
                                <div className="pagination">
                                    <button
                                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                        disabled={currentPage === 1}
                                        className="pagination-btn"
                                    >
                                        <ChevronRight size={20} />
                                    </button>
                                    {[...Array(totalPages)].map((_, i) => (
                                        <button
                                            key={i}
                                            onClick={() => setCurrentPage(i + 1)}
                                            className={`pagination-btn ${currentPage === i + 1 ? 'active' : ''}`}
                                        >
                                            {i + 1}
                                        </button>
                                    ))}
                                    <button
                                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                        disabled={currentPage === totalPages}
                                        className="pagination-btn"
                                    >
                                        <ChevronLeft size={20} />
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </section>

            {/* النشرة البريدية */}
            <section className="newsletter-section">
                <div className="container">
                    <div className="newsletter-card glass-card">
                        <div className="newsletter-content">
                            <h3>{t('blog.newsletter')}</h3>
                            <p>{t('blog.newsletterDesc')}</p>
                            <form className="newsletter-form">
                                <input type="email" placeholder={t('blog.email')} />
                                <button type="submit" className="btn btn-primary">
                                    {t('blog.subscribe')}
                                </button>
                            </form>
                        </div>
                        <div className="newsletter-icon">📧</div>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default Blog;
