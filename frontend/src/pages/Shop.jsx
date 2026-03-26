import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Search, Filter, ShoppingCart, Star, ChevronLeft } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';

const Shop = () => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [categories, setCategories] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState('newest');
    const [cart, setCart] = useState([]);
    const [showFilters, setShowFilters] = useState(false);

    useEffect(() => {
        fetchProducts();
        fetchCategories();
    }, [selectedCategory, sortBy, searchTerm]);

    const fetchProducts = async () => {
        setLoading(true);
        try {
            let url = `/shop?limit=12&sort=${sortBy}`;
            if (selectedCategory !== 'all') {
                url += `&category=${selectedCategory}`;
            }
            if (searchTerm) {
                url += `&search=${encodeURIComponent(searchTerm)}`;
            }
            
            const response = await api.get(url);
            if (response.data.success) {
                setProducts(response.data.data);
            }
        } catch (error) {
            console.error('خطأ في جلب المنتجات:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchCategories = async () => {
        try {
            const response = await api.get('/shop/categories');
            if (response.data.success) {
                setCategories(response.data.data);
            }
        } catch (error) {
            console.error('خطأ في جلب التصنيفات:', error);
        }
    };

    const addToCart = async (product) => {
        if (!user) {
            toast.error(t('shop.loginToPurchase'));
            return;
        }
        
        try {
            const response = await api.post('/shop/cart', {
                product_id: product.id,
                quantity: 1
            });
            
            if (response.data.success) {
                toast.success(t('shop.addedToCart'));
                setCart(prev => [...prev, product.id]);
            }
        } catch (error) {
            console.error('خطأ في إضافة للسلة:', error);
            toast.error(t('shop.errorAddToCart'));
        }
    };

    return (
        <div className="shop-page">
            {/* رأس الصفحة */}
            <section className="page-header">
                <div className="container">
                    <h1>{t('shop.title')}</h1>
                    <p>{t('shop.subtitle')}</p>
                </div>
            </section>

            {/* شريط البحث والتصفية */}
            <section className="shop-filters">
                <div className="container">
                    <div className="filters-bar">
                        <button 
                            className="filter-toggle"
                            onClick={() => setShowFilters(!showFilters)}
                        >
                            <Filter size={20} />
                            {t('shop.filters')}
                        </button>
                        
                        <form className="search-form">
                            <input
                                type="text"
                                placeholder={t('shop.search')}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                            <button type="submit">
                                <Search size={20} />
                            </button>
                        </form>
                        
                        <select 
                            className="sort-select"
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                        >
                            <option value="newest">{t('shop.newest')}</option>
                            <option value="price_asc">{t('shop.priceAsc')}</option>
                            <option value="price_desc">{t('shop.priceDesc')}</option>
                            <option value="popular">{t('shop.popular')}</option>
                        </select>
                    </div>
                    
                    {/* التصنيفات */}
                    <div className={`categories-filter ${showFilters ? 'show' : ''}`}>
                        <button
                            className={`category-btn ${selectedCategory === 'all' ? 'active' : ''}`}
                            onClick={() => setSelectedCategory('all')}
                        >
                            {t('shop.all')}
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
            </section>

            {/* قائمة المنتجات */}
            <section className="products-section">
                <div className="container">
                    {loading ? (
                        <div className="loading-spinner-container">
                            <div className="loading-spinner"></div>
                        </div>
                    ) : products.length === 0 ? (
                        <div className="no-results glass-card">
                            <p>{t('shop.noProducts')}</p>
                        </div>
                    ) : (
                        <div className="products-grid">
                            {products.map(product => (
                                <div key={product.id} className="product-card glass-card">
                                    <div className="product-image">
                                        <img src={product.image_url || '/assets/images/product-placeholder.jpg'} alt={product.title_ar} />
                                        {product.is_bestseller && (
                                            <div className="product-badge bestseller">{t('shop.bestseller')}</div>
                                        )}
                                        {product.is_new && (
                                            <div className="product-badge new">{t('shop.new')}</div>
                                        )}
                                    </div>
                                    <div className="product-content">
                                        <h3>{product.title_ar}</h3>
                                        <p>{product.excerpt_ar?.substring(0, 80)}...</p>
                                        
                                        <div className="product-rating">
                                            {[...Array(5)].map((_, i) => (
                                                <Star
                                                    key={i}
                                                    size={14}
                                                    fill={i < (product.rating_avg || 0) ? '#d4af37' : 'none'}
                                                    stroke={i < (product.rating_avg || 0) ? '#d4af37' : '#ccc'}
                                                />
                                            ))}
                                            <span>({product.reviews_count || 0})</span>
                                        </div>
                                        
                                        <div className="product-price">
                                            <span className="price">{product.price_points || product.price_tit}</span>
                                            <span className="currency">
                                                {product.price_points ? t('shop.points') : 'TIT'}
                                            </span>
                                        </div>
                                        
                                        <div className="product-actions">
                                            <Link to={`/shop/${product.id}`} className="btn btn-sm btn-outline">
                                                {t('shop.details')}
                                            </Link>
                                            <button 
                                                className="btn btn-sm btn-primary"
                                                onClick={() => addToCart(product)}
                                                disabled={cart.includes(product.id)}
                                            >
                                                <ShoppingCart size={16} />
                                                {cart.includes(product.id) ? t('shop.added') : t('shop.buy')}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
};

export default Shop;
