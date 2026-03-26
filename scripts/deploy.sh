#!/bin/bash

# ============================================================
# إطلاق منصة إمزتت
# ============================================================

echo "🚀 بدء إطلاق منصة إمزتت..."
echo "================================================"

# الألوان
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 1. التحقق من المتطلبات
echo -e "${BLUE}📋 1. التحقق من المتطلبات...${NC}"

# التحقق من Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js غير مثبت"
    exit 1
fi
echo -e "${GREEN}✅ Node.js $(node -v)${NC}"

# التحقق من MySQL
if ! command -v mysql &> /dev/null; then
    echo "❌ MySQL غير مثبت"
    exit 1
fi
echo -e "${GREEN}✅ MySQL $(mysql --version)${NC}"

# 2. تثبيت التبعيات
echo -e "${BLUE}📦 2. تثبيت التبعيات...${NC}"
npm install --production

# 3. إنشاء قاعدة البيانات
echo -e "${BLUE}🗄️ 3. إنشاء قاعدة البيانات...${NC}"
mysql -u root -p < backend/models/database.sql

# 4. تهيئة البيئة
echo -e "${BLUE}⚙️ 4. تهيئة البيئة...${NC}"
if [ ! -f .env ]; then
    cp .env.example .env
    echo -e "${YELLOW}⚠️ يرجى تعديل ملف .env قبل المتابعة${NC}"
    nano .env
fi

# 5. تجميع الواجهة الأمامية
echo -e "${BLUE}🎨 5. تجميع الواجهة الأمامية...${NC}"
cd frontend
npm install
npm run build
cd ..

# 6. تشغيل الخادم
echo -e "${BLUE}🖥️ 6. تشغيل الخادم...${NC}"
pm2 start server.js --name imzatit-api

# 7. إعداد Nginx (اختياري)
if command -v nginx &> /dev/null; then
    echo -e "${BLUE}🌐 7. إعداد Nginx...${NC}"
    sudo cp config/nginx.conf /etc/nginx/sites-available/imzatit
    sudo ln -s /etc/nginx/sites-available/imzatit /etc/nginx/sites-enabled/
    sudo nginx -t
    sudo systemctl reload nginx
fi

# 8. إعداد SSL (Let's Encrypt)
if command -v certbot &> /dev/null; then
    echo -e "${BLUE}🔐 8. إعداد SSL...${NC}"
    sudo certbot --nginx -d imzatit.com -d www.imzatit.com
fi

# 9. تشغيل المهام المجدولة
echo -e "${BLUE}⏰ 9. تشغيل المهام المجدولة...${NC}"
pm2 start cronJobs.js --name imzatit-cron

# 10. اختبار النظام
echo -e "${BLUE}🧪 10. اختبار النظام...${NC}"
bash scripts/test-all.sh

# 11. عرض معلومات الإطلاق
echo ""
echo "================================================"
echo -e "${GREEN}🎉 تم إطلاق منصة إمزتت بنجاح!${NC}"
echo "================================================"
echo ""
echo "🌐 الروابط:"
echo "   - الموقع: https://imzatit.com"
echo "   - API: https://api.imzatit.com"
echo "   - لوحة التحكم: https://admin.imzatit.com"
echo ""
echo "📊 حالة الخدمات:"
pm2 status
echo ""
echo "📝 السجلات: pm2 logs imzatit-api"
echo "================================================"
