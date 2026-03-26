const express = require('express');
const { body } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const {
    updateProfile,
    getWallet,
    getReferrals,
    getAchievements,
    start100DayChallenge,
    getChallengeStatus,
    getTierInfo
} = require('../controllers/userController');

const router = express.Router();

// جميع المسارات تتطلب مصادقة
router.use(authenticate);

// الملف الشخصي
router.put('/profile', [
    body('full_name').optional().notEmpty().withMessage('الاسم الكامل مطلوب'),
    body('bio_ar').optional().isLength({ max: 500 }),
    body('bio_en').optional().isLength({ max: 500 }),
    body('avatar_url').optional().isURL()
], updateProfile);

// المحفظة
router.get('/wallet', getWallet);

// الإحالات
router.get('/referrals', getReferrals);

// الإنجازات
router.get('/achievements', getAchievements);

// تحدي 100 يوم
router.post('/challenge/start', start100DayChallenge);
router.get('/challenge/status', getChallengeStatus);

// معلومات التصنيف
router.get('/tier', getTierInfo);

module.exports = router;
