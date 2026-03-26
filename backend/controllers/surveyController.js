const { pool } = require('../config/database');

// جلب قائمة الاستطلاعات
const getSurveys = async (req, res) => {
    try {
        const { status, type, page = 1, limit = 10 } = req.query;
        const offset = (page - 1) * limit;

        let query = `
            SELECT s.*, 
                   u.full_name as creator_name,
                   (SELECT COUNT(*) FROM survey_responses WHERE survey_id = s.id) as response_count
            FROM surveys s
            JOIN users u ON s.created_by = u.id
            WHERE s.status = 'active'
        `;
        const params = [];

        if (type) {
            query += ' AND s.type = ?';
            params.push(type);
        }

        query += ' ORDER BY s.created_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), offset);

        const [surveys] = await pool.execute(query, params);

        // إحصائيات
        const [total] = await pool.execute(
            'SELECT COUNT(*) as total FROM surveys WHERE status = "active"'
        );

        res.json({
            success: true,
            data: surveys,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: total[0].total,
                pages: Math.ceil(total[0].total / limit)
            }
        });

    } catch (error) {
        console.error('Get surveys error:', error);
        res.status(500).json({
            success: false,
            message: 'حدث خطأ أثناء جلب الاستطلاعات'
        });
    }
};

// جلب استطلاع محدد
const getSurvey = async (req, res) => {
    try {
        const [surveys] = await pool.execute(
            `SELECT s.*, u.full_name as creator_name,
                    (SELECT COUNT(*) FROM survey_responses WHERE survey_id = s.id) as response_count
             FROM surveys s
             JOIN users u ON s.created_by = u.id
             WHERE s.id = ?`,
            [req.params.id]
        );

        if (surveys.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'الاستطلاع غير موجود'
            });
        }

        const survey = surveys[0];

        // جلب الأسئلة
        const [questions] = await pool.execute(
            'SELECT * FROM survey_questions WHERE survey_id = ? ORDER BY order_number',
            [req.params.id]
        );

        // التحقق مما إذا كان المستخدم قد شارك بالفعل
        const [participated] = await pool.execute(
            'SELECT id FROM survey_responses WHERE survey_id = ? AND user_id = ?',
            [req.params.id, req.user.id]
        );

        res.json({
            success: true,
            data: {
                ...survey,
                questions,
                has_participated: participated.length > 0
            }
        });

    } catch (error) {
        console.error('Get survey error:', error);
        res.status(500).json({
            success: false,
            message: 'حدث خطأ أثناء جلب الاستطلاع'
        });
    }
};

// المشاركة في استطلاع
const participate = async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
        await connection.beginTransaction();

        const surveyId = req.params.id;
        const userId = req.user.id;
        const { answers, started_at, completed_at } = req.body;

        // التحقق من وجود الاستطلاع
        const [surveys] = await connection.execute(
            'SELECT * FROM surveys WHERE id = ? AND status = "active"',
            [surveyId]
        );

        if (surveys.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'الاستطلاع غير موجود أو غير نشط'
            });
        }

        const survey = surveys[0];

        // التحقق من عدم المشاركة المسبقة
        const [existing] = await connection.execute(
            'SELECT id FROM survey_responses WHERE survey_id = ? AND user_id = ?',
            [surveyId, userId]
        );

        if (existing.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'لقد شاركت في هذا الاستطلاع مسبقاً'
            });
        }

        // حساب جودة الإجابات (نموذج بسيط)
        let totalScore = 0;
        const answersArray = JSON.parse(answers);
        answersArray.forEach(answer => {
            if (answer.quality_score) {
                totalScore += answer.quality_score;
            } else {
                totalScore += 5; // افتراضي
            }
        });
        const qualityScore = totalScore / answersArray.length;

        // حفظ الإجابة
        const [result] = await connection.execute(
            `INSERT INTO survey_responses 
            (survey_id, user_id, answers, quality_score, started_at, completed_at, status)
            VALUES (?, ?, ?, ?, ?, ?, 'submitted')`,
            [surveyId, userId, answers, qualityScore, started_at, completed_at]
        );

        // تحديث إحصائيات الاستطلاع
        await connection.execute(
            `UPDATE surveys 
             SET total_responses = total_responses + 1,
                 total_completed = total_completed + 1,
                 average_quality_score = (average_quality_score * total_responses + ?) / (total_responses + 1)
             WHERE id = ?`,
            [qualityScore, surveyId]
        );

        // تحديث إحصائيات المستخدم
        await connection.execute(
            `UPDATE profiles 
             SET total_surveys_participated = total_surveys_participated + 1,
                 average_quality_score = (average_quality_score * total_surveys_participated + ?) / (total_surveys_participated + 1)
             WHERE user_id = ?`,
            [qualityScore, userId]
        );

        // مكافأة المشاركة (سيتم إضافتها لاحقاً عبر جدولة)
        await connection.execute(
            `INSERT INTO queue (type, payload, scheduled_at)
             VALUES ('reward_distribution', ?, NOW())`,
            [JSON.stringify({
                user_id: userId,
                survey_id: surveyId,
                reward_amount: survey.reward_per_response,
                reward_currency: survey.reward_currency
            })]
        );

        await connection.commit();

        res.json({
            success: true,
            message: 'تم تسجيل مشاركتك بنجاح',
            data: {
                response_id: result.insertId,
                quality_score: qualityScore,
                reward_pending: survey.reward_per_response
            }
        });

    } catch (error) {
        await connection.rollback();
        console.error('Participate error:', error);
        res.status(500).json({
            success: false,
            message: 'حدث خطأ أثناء المشاركة في الاستطلاع'
        });
    } finally {
        connection.release();
    }
};

// نتائج الاستطلاع
const getResults = async (req, res) => {
    try {
        const [responses] = await pool.execute(
            `SELECT sr.*, u.full_name, u.uuid
             FROM survey_responses sr
             JOIN users u ON sr.user_id = u.id
             WHERE sr.survey_id = ?
             ORDER BY sr.completed_at DESC`,
            [req.params.id]
        );

        // تحليل الإجابات
        const analysis = {
            total_responses: responses.length,
            average_quality: 0,
            answers_distribution: {},
            participants: []
        };

        if (responses.length > 0) {
            analysis.average_quality = responses.reduce((sum, r) => sum + (r.quality_score || 0), 0) / responses.length;
            
            responses.forEach(response => {
                const answers = JSON.parse(response.answers);
                // تحليل توزيع الإجابات (سيتم تفصيله لاحقاً)
            });
        }

        res.json({
            success: true,
            data: {
                results: responses,
                analysis
            }
        });

    } catch (error) {
        console.error('Get results error:', error);
        res.status(500).json({
            success: false,
            message: 'حدث خطأ أثناء جلب النتائج'
        });
    }
};

// تحليلات الاستطلاع (للمشرفين)
const getAnalytics = async (req, res) => {
    try {
        const [stats] = await pool.execute(
            `SELECT 
                COUNT(*) as total_responses,
                AVG(quality_score) as avg_quality,
                MIN(quality_score) as min_quality,
                MAX(quality_score) as max_quality,
                COUNT(DISTINCT user_id) as unique_participants,
                AVG(duration_seconds) as avg_duration
             FROM survey_responses
             WHERE survey_id = ?`,
            [req.params.id]
        );

        const [dailyStats] = await pool.execute(
            `SELECT DATE(completed_at) as date, COUNT(*) as count
             FROM survey_responses
             WHERE survey_id = ?
             GROUP BY DATE(completed_at)
             ORDER BY date DESC
             LIMIT 30`,
            [req.params.id]
        );

        res.json({
            success: true,
            data: {
                overall: stats[0],
                daily: dailyStats
            }
        });

    } catch (error) {
        console.error('Get analytics error:', error);
        res.status(500).json({
            success: false,
            message: 'حدث خطأ أثناء جلب التحليلات'
        });
    }
};

// إنشاء استطلاع جديد
const createSurvey = async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
        await connection.beginTransaction();

        const {
            title_ar, title_en, description_ar, description_en,
            type, category, reward_per_response, reward_currency,
            total_responses_target, start_date, end_date,
            target_audience, questions
        } = req.body;

        // إنشاء الاستطلاع
        const [result] = await connection.execute(
            `INSERT INTO surveys (
                title_ar, title_en, description_ar, description_en,
                type, category, reward_per_response, reward_currency,
                total_responses_target, start_date, end_date,
                target_audience, created_by, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
            [
                title_ar, title_en, description_ar, description_en,
                type, category, reward_per_response, reward_currency,
                total_responses_target, start_date, end_date,
                JSON.stringify(target_audience), req.user.id
            ]
        );

        const surveyId = result.insertId;

        // إنشاء الأسئلة
        for (let i = 0; i < questions.length; i++) {
            const q = questions[i];
            await connection.execute(
                `INSERT INTO survey_questions (
                    survey_id, order_number, type, text_ar, text_en,
                    options, is_required, weight
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    surveyId, i + 1, q.type, q.text_ar, q.text_en,
                    JSON.stringify(q.options || []),
                    q.is_required !== false,
                    q.weight || 1
                ]
            );
        }

        await connection.commit();

        res.status(201).json({
            success: true,
            message: 'تم إنشاء الاستطلاع بنجاح',
            data: { survey_id: surveyId }
        });

    } catch (error) {
        await connection.rollback();
        console.error('Create survey error:', error);
        res.status(500).json({
            success: false,
            message: 'حدث خطأ أثناء إنشاء الاستطلاع'
        });
    } finally {
        connection.release();
    }
};

// تحديث استطلاع
const updateSurvey = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        
        const allowedFields = ['title_ar', 'title_en', 'description_ar', 'description_en', 
                               'reward_per_response', 'end_date', 'status'];
        
        const updateFields = [];
        const values = [];
        
        for (const field of allowedFields) {
            if (updates[field] !== undefined) {
                updateFields.push(`${field} = ?`);
                values.push(updates[field]);
            }
        }
        
        if (updateFields.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'لا توجد بيانات للتحديث'
            });
        }
        
        values.push(id);
        
        await pool.execute(
            `UPDATE surveys SET ${updateFields.join(', ')} WHERE id = ?`,
            values
        );
        
        res.json({
            success: true,
            message: 'تم تحديث الاستطلاع بنجاح'
        });
        
    } catch (error) {
        console.error('Update survey error:', error);
        res.status(500).json({
            success: false,
            message: 'حدث خطأ أثناء تحديث الاستطلاع'
        });
    }
};

// حذف استطلاع
const deleteSurvey = async (req, res) => {
    try {
        await pool.execute(
            'DELETE FROM surveys WHERE id = ?',
            [req.params.id]
        );
        
        res.json({
            success: true,
            message: 'تم حذف الاستطلاع بنجاح'
        });
        
    } catch (error) {
        console.error('Delete survey error:', error);
        res.status(500).json({
            success: false,
            message: 'حدث خطأ أثناء حذف الاستطلاع'
        });
    }
};

module.exports = {
    getSurveys,
    getSurvey,
    createSurvey,
    updateSurvey,
    deleteSurvey,
    participate,
    getResults,
    getAnalytics
};
