const express = require('express');
const multer = require('multer');
const { body } = require('express-validator');
const { authenticate, isAdmin, isExpert } = require('../middleware/auth');
const {
    getProjects,
    getProject,
    createProject,
    updateProject,
    deleteProject,
    purchaseProject,
    reviewProject,
    getCitations,
    getResearcherRanking
} = require('../controllers/academicController');

const router = express.Router();

// إعداد رفع الملفات
const storage = multer.diskStorage({
    destination: './uploads/projects/',
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

router.use(authenticate);

// المشاريع
router.get('/', getProjects);
router.get('/:id', getProject);
router.post('/', upload.single('file'), [
    body('title_ar').notEmpty().withMessage('العنوان مطلوب'),
    body('type').isIn(['graduation_project', 'research', 'study', 'thesis', 'article'])
], createProject);
router.put('/:id', updateProject);
router.delete('/:id', isAdmin, deleteProject);

// شراء مشروع
router.post('/:id/purchase', purchaseProject);

// مراجعة مشروع (للمتخصصين)
router.post('/:id/review', [
    isExpert,
    body('quality_score').isFloat({ min: 0, max: 10 }),
    body('originality_score').isFloat({ min: 0, max: 10 }),
    body('methodology_score').isFloat({ min: 0, max: 10 })
], reviewProject);

// الاستشهادات
router.get('/:id/citations', getCitations);

// تصنيف الباحثين
router.get('/ranking/researchers', getResearcherRanking);

module.exports = router;
