const { verifyToken } = require('../utils/encryption');
const { pool } = require('../config/database');

// مصادقة المستخدم
const authenticate = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'غير مصرح به - الرمز مفقود'
            });
        }

        const decoded = verifyToken(token);
        
        if (!decoded) {
            return res.status(401).json({
                success: false,
                message: 'غير مصرح به - رمز غير صالح'
            });
        }

        // جلب بيانات المستخدم
        const [users] = await pool.execute(
            'SELECT id, uuid, email, full_name, role, status FROM users WHERE id = ?',
            [decoded.id]
        );

        if (users.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'المستخدم غير موجود'
            });
        }

        const user = users[0];

        if (user.status !== 'active') {
            return res.status(403).json({
                success: false,
                message: 'الحساب غير نشط'
            });
        }

        req.user = user;
        next();
    } catch (error) {
        console.error('Auth error:', error);
        res.status(500).json({
            success: false,
            message: 'خطأ في المصادقة'
        });
    }
};

// التحقق من الصلاحيات (Admin)
const isAdmin = (req, res, next) => {
    if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
        return res.status(403).json({
            success: false,
            message: 'غير مصرح به - صلاحيات غير كافية'
        });
    }
    next();
};

// التحقق من الصلاحيات (Super Admin)
const isSuperAdmin = (req, res, next) => {
    if (req.user.role !== 'super_admin') {
        return res.status(403).json({
            success: false,
            message: 'غير مصرح به - صلاحيات المشرف الأعلى مطلوبة'
        });
    }
    next();
};

module.exports = { authenticate, isAdmin, isSuperAdmin };
