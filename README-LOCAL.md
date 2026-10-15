# تشغيل المشروع محليًا

## المتطلبات
- Node.js 18 أو أحدث
- npm

## التشغيل
1. افتح المجلد control-platform
2. شغّل:
   ```bash
   npm install
   npm run dev
   ```
3. افتح العنوان:
   - http://localhost:3000/

## ملاحظات
- يستخدم المشروع متغيرات البيئة من .env.local أو .env
- لا يتم تعديل قاعدة البيانات أو Supabase أثناء التشغيل
- إذا كان لديك مفتاح Supabase خاص، ضع القيمة في ملف .env.local
