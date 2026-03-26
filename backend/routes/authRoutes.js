const express = require('express');
const { body } = require('express-validator');
const { register, login, getProfile } = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// قواعد التحقق من صحة البيانات
const registerValidation = [
    body('email').isEmail().withMessage('البريد الإلكتروني غير صحيح'),
    body('phone').isMobilePhone().withMessage('رقم الهاتف غير صحيح'),
    body('full_name').notEmpty().withMessage('الاسم الكامل مطلوب'),
    body('password').isLength({ min: 6 }).withMessage('كلمة المرور يجب أن تكون 6 أحرف على الأقل'),
    body('national_id').optional().isLength({ min: 9, max: 12 }).withMessage('الرقم الوطني غير صحيح')
];

const loginValidation = [
    body('email').isEmail().withMessage('البريد الإلكتروني غير صحيح'),
    body('password').notEmpty().withMessage('كلمة المرور مطلوبة')
];

// المسارات
router.post('/register', registerValidation, register);
router.post('/login', loginValidation, login);
router.get('/profile', authenticate, getProfile);

module.exports = router;
