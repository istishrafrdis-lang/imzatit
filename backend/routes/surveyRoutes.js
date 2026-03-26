const express = require('express');
const { body, param } = require('express-validator');
const { authenticate, isAdmin } = require('../middleware/auth');
const {
    getSurveys,
    getSurvey,
    createSurvey,
    updateSurvey,
    deleteSurvey,
    participate,
    getResults,
    getAnalytics
} = require('../controllers/surveyController');

const router = express.Router();

// مسارات عامة (تتطلب مصادقة)
router.use(authenticate);

// جلب قائمة الاستطلاعات
router.get('/', getSurveys);

// جلب استطلاع محدد
router.get('/:id', [
    param('id').isInt().withMessage('معرف غير صحيح')
], getSurvey);

// المشاركة في استطلاع
router.post('/:id/participate', [
    param('id').isInt(),
    body('answers').isArray().withMessage('الإجابات مطلوبة')
], participate);

// نتائج الاستطلاع
router.get('/:id/results', [
    param('id').isInt()
], getResults);

// تحليلات الاستطلاع (للمشرفين فقط)
router.get('/:id/analytics', [
    param('id').isInt(),
    isAdmin
], getAnalytics);

// إنشاء استطلاع جديد (للمشرفين فقط)
router.post('/', [
    isAdmin,
    body('title_ar').notEmpty().withMessage('العنوان مطلوب'),
    body('type').isIn(['public_poll', 'research_survey', 'expert_survey', 'market_research']),
    body('reward_per_response').isNumeric().withMessage('المكافأة مطلوبة'),
    body('questions').isArray().withMessage('الأسئلة مطلوبة')
], createSurvey);

// تحديث استطلاع (للمشرفين فقط)
router.put('/:id', [
    param('id').isInt(),
    isAdmin
], updateSurvey);

// حذف استطلاع (للمشرفين فقط)
router.delete('/:id', [
    param('id').isInt(),
    isAdmin
], deleteSurvey);

module.exports = router;
