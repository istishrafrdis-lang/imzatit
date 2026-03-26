        res.status(500).json({
            success: false,
            message: 'حدث خطأ أثناء تسجيل الدخول'
        });
    }
};

// الحصول على ملف المستخدم
const getProfile = async (req, res) => {
    try {
        const [profiles] = await pool.execute(
            `SELECT u.id, u.uuid, u.email, u.phone, u.full_name, u.national_id,
                    u.role, u.total_points, u.created_at,
                    p.avatar_url, p.bio_ar, p.bio_en, p.reputation_score,
                    p.total_surveys_participated, p.total_surveys_created,
                    p.average_quality_score, p.verified_badge, p.expert_badge,
                    w.lyd_balance, w.tit_balance, w.points_balance
             FROM users u
             LEFT JOIN profiles p ON u.id = p.user_id
             LEFT JOIN wallets w ON u.id = w.user_id
             WHERE u.id = ?`,
            [req.user.id]
        );

        if (profiles.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'المستخدم غير موجود'
            });
        }

        res.json({
            success: true,
            data: profiles[0]
        });

    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({
            success: false,
            message: 'حدث خطأ أثناء جلب الملف الشخصي'
        });
    }
};

module.exports = { register, login, getProfile };
