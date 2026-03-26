const nodemailer = require('nodemailer');

// إعداد transporter
const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: false,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    }
});

// إرسال إيميل عام
const sendEmail = async (to, subject, html, from = process.env.EMAIL_USER) => {
    try {
        const info = await transporter.sendMail({
            from: `"إمزتت" <${from}>`,
            to,
            subject,
            html
        });
        
        console.log(`✅ إيميل مرسل إلى ${to}: ${info.messageId}`);
        return { success: true, messageId: info.messageId };
        
    } catch (error) {
        console.error('❌ فشل إرسال الإيميل:', error);
        return { success: false, error: error.message };
    }
};

// قوالب الإيميلات
const emailTemplates = {
    // تأكيد التسجيل
    welcome: (name, verificationCode) => `
        <div style="direction: rtl; font-family: 'Tajawal', sans-serif;">
            <h1 style="color: #0a3d62;">مرحباً بك في إمزتت</h1>
            <p>أهلاً بك ${name}،</p>
            <p>شكراً لتسجيلك في منصة إمزتت - أول منصة استطلاعات مدفوعة في ليبيا.</p>
            <p>رمز التحقق الخاص بك: <strong style="font-size: 20px; color: #d4af37;">${verificationCode}</strong></p>
            <p>يمكنك استخدام هذا الرمز لتأكيد حسابك.</p>
            <hr>
            <p style="color: #666;">إمزتت - محرك المجتمع الذكي</p>
        </div>
    `,

    // مكافأة استطلاع
    surveyReward: (name, surveyTitle, rewardAmount, rewardCurrency) => `
        <div style="direction: rtl; font-family: 'Tajawal', sans-serif;">
            <h1 style="color: #0a3d62;">🎉 مكافأة جديدة</h1>
            <p>أهلاً ${name}،</p>
            <p>لقد حصلت على مكافأة قدرها <strong style="color: #d4af37;">${rewardAmount} ${rewardCurrency}</strong> 
               مقابل مشاركتك في استطلاع "${surveyTitle}".</p>
            <p>يمكنك الاطلاع على رصيدك في محفظتك الشخصية.</p>
            <a href="https://imzatit.com/wallet" style="background: #0a3d62; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">عرض المحفظة</a>
        </div>
    `,

    // ترقية التصنيف
    tierUpgrade: (name, newTier, newBenefits) => `
        <div style="direction: rtl; font-family: 'Tajawal', sans-serif;">
            <h1 style="color: #0a3d62;">✨ تهانينا! تم ترقيتك</h1>
            <p>أهلاً ${name}،</p>
            <p>تهانينا! لقد تم ترقيتك إلى مستوى <strong style="color: #d4af37;">${newTier}</strong>.</p>
            <p>المزايا الجديدة:</p>
            <ul>${newBenefits.map(b => `<li>${b}</li>`).join('')}</ul>
            <p>استمر في المشاركة لتحصل على مزايا أفضل!</p>
        </div>
    `,

    // نشرة أسبوعية
    weeklyNewsletter: (name, surveys, topUsers, stats) => `
        <div style="direction: rtl; font-family: 'Tajawal', sans-serif;">
            <h1 style="color: #0a3d62;">📰 النشرة الأسبوعية - إمزتت</h1>
            <p>أهلاً ${name}،</p>
            
            <h2>📊 استطلاعات جديدة هذا الأسبوع</h2>
            <ul>${surveys.map(s => `<li>${s.title} - مكافأة: ${s.reward} نقطة</li>`).join('')}</ul>
            
            <h2>🏆 المتصدرون هذا الأسبوع</h2>
            <ul>${topUsers.map(u => `<li>${u.name} - ${u.points} نقطة</li>`).join('')}</ul>
            
            <h2>📈 إحصائيات المنصة</h2>
            <ul>
                <li>إجمالي المستخدمين: ${stats.totalUsers}</li>
                <li>الاستطلاعات المكتملة: ${stats.completedSurveys}</li>
                <li>إجمالي المكافآت: ${stats.totalRewards} نقطة</li>
            </ul>
            
            <a href="https://imzatit.com" style="background: #0a3d62; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">زيارة المنصة</a>
        </div>
    `
};

module.exports = { sendEmail, emailTemplates };
