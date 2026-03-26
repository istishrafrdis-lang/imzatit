const express = require('express');
const { body } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const {
    getPoints,
    getTransactions,
    withdraw,
    getPrizes,
    getLeaderboard
} = require('../controllers/rewardController');

const router = express.Router();

router.use(authenticate);

// النقاط
router.get('/points', getPoints);

// المعاملات
router.get('/transactions', getTransactions);

// السحب
router.post('/withdraw', [
    body('amount').isNumeric().withMessage('المبلغ مطلوب'),
    body('currency').isIn(['LYD', 'TIT', 'POINTS']).withMessage('عملة غير صحيحة'),
    body('wallet_address').optional().isString()
], withdraw);

// الجوائز
router.get('/prizes', getPrizes);

// لوحة المتصدرين
router.get('/leaderboard', getLeaderboard);

module.exports = router;
