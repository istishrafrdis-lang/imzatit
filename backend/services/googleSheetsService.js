const { google } = require('googleapis');
const fs = require('fs');

class GoogleSheetsService {
    constructor() {
        this.auth = null;
        this.sheets = null;
        this.isInitialized = false;
    }

    // تهيئة الاتصال
    async initialize() {
        try {
            // استخدام service account
            const auth = new google.auth.GoogleAuth({
                keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_PATH,
                scopes: ['https://www.googleapis.com/auth/spreadsheets']
            });

            this.auth = await auth.getClient();
            this.sheets = google.sheets({ version: 'v4', auth: this.auth });
            this.isInitialized = true;
            
            console.log('✅ Google Sheets متصل بنجاح');
            return true;
            
        } catch (error) {
            console.error('❌ فشل اتصال Google Sheets:', error.message);
            return false;
        }
    }

    // إنشاء جدول جديد للاستطلاع
    async createSurveySheet(surveyId, surveyTitle, questions) {
        if (!this.isInitialized) await this.initialize();

        try {
            // إنشاء جدول جديد
            const response = await this.sheets.spreadsheets.create({
                requestBody: {
                    properties: {
                        title: `استطلاع ${surveyTitle} - ${new Date().toLocaleDateString('ar-LY')}`
                    }
                }
            });

            const spreadsheetId = response.data.spreadsheetId;

            // إضافة رؤوس الأعمدة
            const headers = ['رقم المشارك', 'تاريخ المشاركة', 'جودة الإجابة', ...questions.map(q => q.text_ar)];
            
            await this.sheets.spreadsheets.values.update({
                spreadsheetId,
                range: 'A1',
                valueInputOption: 'RAW',
                requestBody: { values: [headers] }
            });

            // حفظ معرف الجدول في قاعدة البيانات
            await pool.execute(
                'INSERT INTO google_integration (survey_id, spreadsheet_id, sheet_name) VALUES (?, ?, ?)',
                [surveyId, spreadsheetId, 'Responses']
            );

            return { success: true, spreadsheetId, url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}` };

        } catch (error) {
            console.error('خطأ في إنشاء الجدول:', error);
            return { success: false, error: error.message };
        }
    }

    // إضافة إجابة جديدة
    async addResponse(surveyId, responseData) {
        if (!this.isInitialized) await this.initialize();

        try {
            // جلب معرف الجدول
            const [sheets] = await pool.execute(
                'SELECT spreadsheet_id FROM google_integration WHERE survey_id = ?',
                [surveyId]
            );

            if (sheets.length === 0) return { success: false, error: 'جدول غير موجود' };

            const spreadsheetId = sheets[0].spreadsheet_id;

            // إضافة الصف
            await this.sheets.spreadsheets.values.append({
                spreadsheetId,
                range: 'A1',
                valueInputOption: 'RAW',
                requestBody: { values: [responseData] }
            });

            return { success: true };

        } catch (error) {
            console.error('خطأ في إضافة الإجابة:', error);
            return { success: false, error: error.message };
        }
    }

    // جلب البيانات للتحليل
    async getSheetData(spreadsheetId, range = 'A:Z') {
        if (!this.isInitialized) await this.initialize();

        try {
            const response = await this.sheets.spreadsheets.values.get({
                spreadsheetId,
                range
            });

            return { success: true, data: response.data.values };

        } catch (error) {
            console.error('خطأ في جلب البيانات:', error);
            return { success: false, error: error.message };
        }
    }
}

module.exports = new GoogleSheetsService();
