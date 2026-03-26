const cron = require('node-cron');
const { pool } = require('../config/database');
const { sendEmail, emailTemplates } = require('./emailService');
const { distributeReward } = require('./rewardService');

class CronJobs {
    constructor() {
        this.jobs = [];
    }

    // تشغيل جميع المهام
    start() {
        console.log('⏰ بدء تشغيل المهام المجدولة...');

        // 1. توزيع المكافآت كل ساعة
        this.jobs.push(cron.schedule('0 * * * *', async () => {
            console.log('💰 توزيع المكافآت المعلقة...');
            await this.processPendingRewards();
        }));

        // 2. تحديث إحصائيات المستخدمين كل يوم
        this.jobs.push(cron.schedule('0 1 * * *', async () => {
            console.log('📊 تحديث إحصائيات المستخدمين...');
            await this.updateUserStats();
        }));

        // 3. إرسال النشرة الأسبوعية كل يوم أحد
        this.jobs.push(cron.schedule('0 8 * * 0', async () => {
            console.log('📰 إرسال النشرة الأسبوعية...');
            await this.sendWeeklyNewsletter();
        }));

        // 4. تحديث الجوائز الأسبوعية كل يوم اثنين
        this.jobs.push(cron.schedule('0 0 * * 1', async () => {
            console.log('🏆 تحديث الجوائز الأسبوعية...');
            await this.updateWeeklyPrizes();
        }));

        // 5. تحديث الجوائز الشهرية أول كل شهر
        this.jobs.push(cron.schedule('0 0 1 * *', async () => {
            console.log('🏆 تحديث الجوائز الشهرية...');
            await this.updateMonthlyPrizes();
        }));

        // 6. تنظيف السجلات القديمة كل أسبوع
        this.jobs.push(cron.schedule('0 2 * * 0', async () => {
            console.log('🧹 تنظيف السجلات القديمة...');
            await this.cleanOldLogs();
        }));

        // 7. تحديث سعر الصرف كل ساعة
        this.jobs.push(cron.schedule('0 * * * *', async () => {
            console.log('💱 تحديث سعر الصرف...');
            await this.updateExchangeRate();
        }));

        // 8. تحديث تحدي 100 يوم يومياً
        this.jobs.push(cron.schedule('0 0 * * *', async () => {
            console.log('🎯 تحديث تحدي 100 يوم...');
            await this.updateDailyChallenge();
        }));

        console.log(`✅ تم تشغيل ${this.jobs.length} مهمة مجدولة`);
    }

    // توزيع المكافآت المعلقة
    async processPendingRewards() {
        try {
            const [pending] = await pool.execute(
                `SELECT * FROM queue 
                 WHERE type = 'reward_distribution' 
                 AND status = 'pending' 
                 AND scheduled_at <= NOW()
                 LIMIT 100`
            );

            for (const task of pending) {
                const payload = JSON.parse(task.payload);
                
                // توزيع المكافأة
                const result = await distributeReward(payload);
                
                if (result.success) {
                    await pool.execute(
                        'UPDATE queue SET status = "completed", processed_at = NOW() WHERE id = ?',
                        [task.id]
                    );
                } else {
                    await pool.execute(
                        `UPDATE queue SET attempts = attempts + 1, 
                         error_message = ?, 
                         status = CASE WHEN attempts + 1 >= max_attempts THEN 'failed' ELSE 'pending' END
                         WHERE id = ?`,
                        [result.error, task.id]
                    );
                }
            }

        } catch (error) {
            console.error('خطأ في توزيع المكافآت:', error);
        }
    }

    // تحديث إحصائيات المستخدمين
    async updateUserStats() {
        try {
            // تحديث النقاط
            await pool.execute(`
                UPDATE users u
                SET total_points = (
                    SELECT COALESCE(SUM(reward_amount), 0)
                    FROM survey_responses sr
                    WHERE sr.user_id = u.id AND sr.status = 'rewarded'
                )
            `);

            // تحديث التصنيفات
            await pool.execute(`
                UPDATE users u
                JOIN user_tiers t ON u.total_points >= t.min_points
                SET u.tier_id = t.id
                WHERE t.level = (
                    SELECT MAX(level) FROM user_tiers 
                    WHERE min_points <= u.total_points
                )
            `);

            // تحديث سجل التصنيفات
            await pool.execute(`
                INSERT INTO tier_history (user_id, old_tier_id, new_tier_id, reason)
                SELECT u.id, u.tier_id, t.id, 'تحديث تلقائي'
                FROM users u
                JOIN user_tiers t ON u.total_points >= t.min_points
                WHERE t.level > (
                    SELECT level FROM user_tiers WHERE id = u.tier_id
                )
            `);

            console.log('✅ تم تحديث إحصائيات المستخدمين');

        } catch (error) {
            console.error('خطأ في تحديث الإحصائيات:', error);
        }
    }

    // إرسال النشرة الأسبوعية
    async sendWeeklyNewsletter() {
        try {
            // جلب المستخدمين النشطين
            const [users] = await pool.execute(
                `SELECT id, email, full_name 
                 FROM users 
                 WHERE status = 'active' 
                 AND preferences->>'$.newsletter' != 'false'
                 LIMIT 1000`
            );

            // جلب الاستطلاعات الجديدة
            const [surveys] = await pool.execute(
                `SELECT title_ar, reward_per_response 
                 FROM surveys 
                 WHERE created_at > DATE_SUB(NOW(), INTERVAL 7 DAY)
                 AND status = 'active'
                 LIMIT 10`
            );

            // جلب المتصدرين
            const [topUsers] = await pool.execute(
                `SELECT u.full_name, u.total_points 
                 FROM users u
                 ORDER BY u.total_points DESC
                 LIMIT 10`
            );

            // جلب الإحصائيات
            const [stats] = await pool.execute(`
                SELECT 
                    (SELECT COUNT(*) FROM users) as totalUsers,
                    (SELECT COUNT(*) FROM survey_responses) as completedSurveys,
                    (SELECT COALESCE(SUM(reward_amount), 0) FROM transactions WHERE type = 'survey_reward') as totalRewards
            `);

            // إرسال النشرة لكل مستخدم
            for (const user of users) {
                await sendEmail(
                    user.email,
                    '📰 النشرة الأسبوعية - إمزتت',
                    emailTemplates.weeklyNewsletter(
                        user.full_name,
                        surveys,
                        topUsers,
                        stats[0]
                    )
                );
            }

            console.log(`✅ تم إرسال النشرة الأسبوعية لـ ${users.length} مستخدم`);

        } catch (error) {
            console.error('خطأ في إرسال النشرة:', error);
        }
    }

    // تحديث الجوائز الأسبوعية
    async updateWeeklyPrizes() {
        try {
            // جلب الفائزين الأسبوع
            const [winners] = await pool.execute(`
                SELECT 
                    u.id, u.full_name,
                    SUM(sr.quality_score) as total_quality,
                    COUNT(sr.id) as total_surveys,
                    w.points_balance
                FROM users u
                JOIN survey_responses sr ON u.id = sr.user_id
                JOIN wallets w ON u.id = w.user_id
                WHERE sr.completed_at > DATE_SUB(NOW(), INTERVAL 7 DAY)
                GROUP BY u.id
                ORDER BY total_quality DESC, total_surveys DESC
                LIMIT 10
            `);

            // منح الجوائز
            for (let i = 0; i < winners.length; i++) {
                const winner = winners[i];
                const prizeAmount = [500, 300, 200, 100, 50, 50, 50, 25, 25, 25][i] || 25;
                
                await pool.execute(
                    `UPDATE wallets SET points_balance = points_balance + ? WHERE user_id = ?`,
                    [prizeAmount, winner.id]
                );

                await pool.execute(
                    `INSERT INTO transactions (to_user_id, amount, currency, type, description_ar, status)
                     VALUES (?, ?, 'POINTS', 'weekly_prize', ?, 'completed')`,
                    [winner.id, prizeAmount, `جائزة أسبوعية - المركز ${i + 1}`]
                );

                // إرسال إشعار
                await pool.execute(
                    `INSERT INTO notifications (user_id, type, title_ar, content_ar)
                     VALUES (?, 'prize_won', '🏆 فزت بجائزة أسبوعية!', 
                             CONCAT('تهانينا! حصلت على جائزة أسبوعية قدرها ', ?, ' نقطة'))`,
                    [winner.id, prizeAmount]
                );
            }

            console.log(`✅ تم توزيع الجوائز الأسبوعية لـ ${winners.length} فائز`);

        } catch (error) {
            console.error('خطأ في تحديث الجوائز الأسبوعية:', error);
        }
    }

    // تحديث الجوائز الشهرية
    async updateMonthlyPrizes() {
        try {
            const [winners] = await pool.execute(`
                SELECT 
                    u.id, u.full_name,
                    SUM(sr.quality_score) as total_quality,
                    COUNT(sr.id) as total_surveys,
                    u.total_points
                FROM users u
                JOIN survey_responses sr ON u.id = sr.user_id
                WHERE sr.completed_at > DATE_SUB(NOW(), INTERVAL 30 DAY)
                GROUP BY u.id
                ORDER BY total_quality DESC, total_surveys DESC
                LIMIT 5
            `);

            const prizes = [5000, 3000, 2000, 1000, 500];
            
            for (let i = 0; i < winners.length; i++) {
                const prizeAmount = prizes[i];
                
                await pool.execute(
                    `UPDATE wallets SET tit_balance = tit_balance + ? WHERE user_id = ?`,
                    [prizeAmount, winners[i].id]
                );

                await pool.execute(
                    `INSERT INTO transactions (to_user_id, amount, currency, type, description_ar, status)
                     VALUES (?, ?, 'TIT', 'monthly_prize', ?, 'completed')`,
                    [winners[i].id, prizeAmount, `جائزة شهرية - المركز ${i + 1}`]
                );

                // إنشاء شهادة رقمية للفائز
                await pool.execute(
                    `INSERT INTO digital_certificates 
                     (type, title_ar, recipient_id, issuer_id, verification_code)
                     VALUES ('special_recognition', ?, ?, 1, ?)`,
                    [`شهادة الفائز الشهري - ${new Date().toLocaleString('ar-LY', { month: 'long' })}`,
                     winners[i].id, `MONTH-${Date.now()}-${winners[i].id}`]
                );
            }

            console.log(`✅ تم توزيع الجوائز الشهرية لـ ${winners.length} فائز`);

        } catch (error) {
            console.error('خطأ في تحديث الجوائز الشهرية:', error);
        }
    }

    // تنظيف السجلات القديمة
    async cleanOldLogs() {
        try {
            // حذف سجلات النظام القديمة (أكثر من 90 يوم)
            await pool.execute(
                'DELETE FROM system_logs WHERE created_at < DATE_SUB(NOW(), INTERVAL 90 DAY)'
            );

            // حذف الإشعارات القديمة (أكثر من 30 يوم)
            await pool.execute(
                'DELETE FROM notifications WHERE created_at < DATE_SUB(NOW(), INTERVAL 30 DAY) AND is_read = true'
            );

            // أرشفة المعاملات القديمة
            await pool.execute(
                `INSERT INTO transactions_archive 
                 SELECT * FROM transactions 
                 WHERE created_at < DATE_SUB(NOW(), INTERVAL 365 DAY)`
            );

            await pool.execute(
                'DELETE FROM transactions WHERE created_at < DATE_SUB(NOW(), INTERVAL 365 DAY)'
            );

            console.log('✅ تم تنظيف السجلات القديمة');

        } catch (error) {
            console.error('خطأ في تنظيف السجلات:', error);
        }
    }

    // تحديث سعر الصرف
    async updateExchangeRate() {
        try {
            const response = await fetch(process.env.CBL_EXCHANGE_API);
            const data = await response.json();
            
            // استخراج سعر الدولار
            const usdRate = data.rates?.USD || 11.5;
            
            // تحديث سعر TIT
            const titPriceLyd = process.env.TIT_PRICE_LYD;
            const titPriceUsd = titPriceLyd / usdRate;
            
            await pool.execute(
                `UPDATE system_config 
                 SET value = ? 
                 WHERE key = 'exchange_rate'`,
                [JSON.stringify({ usd_rate: usdRate, tit_price_usd: titPriceUsd, updated_at: new Date() })]
            );

            console.log(`✅ تم تحديث سعر الصرف: 1 USD = ${usdRate} LYD, 1 TIT = ${titPriceUsd} USD`);

        } catch (error) {
            console.error('خطأ في تحديث سعر الصرف:', error);
        }
    }

    // تحديث تحدي 100 يوم يومياً
    async updateDailyChallenge() {
        try {
            // جلب التحديات النشطة
            const [challenges] = await pool.execute(
                `SELECT c.*, u.email, u.full_name
                 FROM challenge_100_days c
                 JOIN users u ON c.user_id = u.id
                 WHERE c.streak_broken = false 
                 AND DATE(c.last_activity_date) < CURDATE()
                 AND DATEDIFF(CURDATE(), c.start_date) < 100`
            );

            for (const challenge of challenges) {
                const daysPassed = Math.floor((new Date() - new Date(challenge.start_date)) / (1000 * 60 * 60 * 24));
                const newDayCounter = daysPassed + 1;

                // تحديث العداد
                await pool.execute(
                    `UPDATE challenge_100_days 
                     SET day_counter = ?, last_activity_date = CURDATE()
                     WHERE id = ?`,
                    [newDayCounter, challenge.id]
                );

                // مكافآت الوصول إلى نقاط محددة
                if ([7, 14, 21, 30, 50, 75, 90, 100].includes(newDayCounter)) {
                    await pool.execute(
                        `UPDATE wallets SET points_balance = points_balance + 100 WHERE user_id = ?`,
                        [challenge.user_id]
                    );
                    
                    await pool.execute(
                        `INSERT INTO notifications (user_id, type, title_ar, content_ar)
                         VALUES (?, 'achievement_unlocked', '🎯 إنجاز في تحدي 100 يوم!', 
                                 CONCAT('تهانينا! وصلت إلى اليوم ', ?, ' في تحدي 100 يوم'))`,
                        [challenge.user_id, newDayCounter]
                    );
                }
            }

            if (challenges.length > 0) {
                console.log(`✅ تم تحديث ${challenges.length} تحدٍ لـ 100 يوم`);
            }

        } catch (error) {
            console.error('خطأ في تحديث تحدي 100 يوم:', error);
        }
    }

    // إيقاف جميع المهام
    stop() {
        this.jobs.forEach(job => job.stop());
        console.log('🛑 تم إيقاف جميع المهام المجدولة');
    }
}

module.exports = new CronJobs();
