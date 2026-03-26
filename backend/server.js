const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');
const { testConnection } = require('./config/database');

dotenv.config();

// استيراد المسارات
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const surveyRoutes = require('./routes/surveyRoutes');
const rewardRoutes = require('./routes/rewardRoutes');
const academicRoutes = require('./routes/academicRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// ============================================================
// Middleware الأمان
// ============================================================

// حماية HTTP headers
app.use(helmet());

// CORS
app.use(cors({
    origin: ['http://localhost:3000', 'https://imzatit.com', 'https://www.imzatit.com'],
    credentials: true
}));

// تحديد معدل الطلبات
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 دقيقة
    max: 100, // حد أقصى 100 طلب لكل IP
    message: {
        success: false,
        message: 'عدد كبير من الطلبات، يرجى المحاولة لاحقاً'
    }
});
app.use('/api/', limiter);

// JSON parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ============================================================
// مسارات API
// ============================================================

// مسار التحقق من صحة النظام
app.get('/api/health', async (req, res) => {
    const dbConnected = await testConnection();
    
    res.json({
        success: true,
        status: 'healthy',
        platform: 'إمزتت - منصة الاستطلاعات المدفوعة',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        services: {
            database: dbConnected ? 'connected' : 'disconnected',
            api: 'running'
        },
        libyan_time: new Date().toLocaleString('ar-LY', { timeZone: 'Africa/Tripoli' })
    });
});

// مسار معلومات المنصة
app.get('/api/info', (req, res) => {
    res.json({
        success: true,
        platform: {
            name: 'إمزتت',
            name_en: 'Imzatit',
            description: 'منصة الاستطلاعات المدفوعة والاقتصاد الرقمي',
            version: '1.0.0',
            features: [
                'paid_surveys',
                'academic_projects',
                'digital_certificates',
                'referral_system',
                'tit_token',
                '100_day_challenge'
            ]
        },
        token: {
            name: 'عملة إمزتت',
            symbol: 'TIT',
            total_supply: 1618000000,
            initial_supply: 161800000,
            price_lyd: parseFloat(process.env.TIT_PRICE_LYD),
            price_usd: parseFloat(process.env.TIT_PRICE_USD)
        },
        stats: {
            surveys_completed: 0,
            total_users: 0,
            total_rewards: 0
        }
    });
});

// تسجيل المسارات
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/surveys', surveyRoutes);
app.use('/api/rewards', rewardRoutes);
app.use('/api/academic', academicRoutes);

// معالجة المسارات غير الموجودة
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'المسار غير موجود'
    });
});

// معالجة الأخطاء العامة
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
        success: false,
        message: 'حدث خطأ داخلي في الخادم'
    });
});

// ============================================================
// تشغيل الخادم
// ============================================================

const startServer = async () => {
    // اختبار اتصال قاعدة البيانات
    const dbConnected = await testConnection();
    
    if (!dbConnected) {
        console.error('❌ لا يمكن تشغيل الخادم بدون اتصال قاعدة البيانات');
        process.exit(1);
    }

    app.listen(PORT, () => {
        console.log(`
╔══════════════════════════════════════════════════════════════╗
║                    🚀 منصة إمزتت - API                      ║
║                                                            ║
║   🌐 الخادم يعمل على: http://localhost:${PORT}              ║
║   📅 التاريخ: ${new Date().toLocaleString('ar-LY')}         ║
║   🇱🇾 الوقت المحلي: ${new Date().toLocaleString('ar-LY', { timeZone: 'Africa/Tripoli' })} ║
║                                                            ║
║   ✅ قاعدة البيانات: متصلة                                 ║
║   🔐 الأمان: مفعل                                         ║
║   💰 عملة TIT: ${process.env.TIT_PRICE_LYD} LYD (${process.env.TIT_PRICE_USD} USD) ║
║                                                            ║
╚══════════════════════════════════════════════════════════════╝
        `);
    });
};

startServer();
// أضف هذه الأسطر إلى server.js

const cronJobs = require('./services/cronJobs');
const googleSheets = require('./services/googleSheetsService');
const blockchainService = require('./services/blockchainService');

// ... بعد تعريف app وقبل تشغيل الخادم

// تهيئة التكاملات
const initializeIntegrations = async () => {
    console.log('🔧 تهيئة التكاملات الخارجية...');
    
    // Google Sheets
    await googleSheets.initialize();
    
    // Blockchain (سيتم تفعيله لاحقاً عند وصول 100,000 مستخدم)
    if (process.env.BLOCKCHAIN_ENABLED === 'true') {
        await blockchainService.initialize(process.env.BLOCKCHAIN_NETWORK);
    }
    
    // المهام المجدولة
    cronJobs.start();
    
    console.log('✅ تم تهيئة جميع التكاملات');
};

// استدعاء التهيئة
initializeIntegrations();

// عند إيقاف الخادم
process.on('SIGTERM', () => {
    console.log('🛑 إيقاف الخادم...');
    cronJobs.stop();
    process.exit(0);
});
