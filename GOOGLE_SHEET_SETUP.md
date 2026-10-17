# دليل ربط بيانات عملاء the A&A مع Google Sheets 📊

يوفر هذا الدليل طريقة ربط مجانية، فورية، وموثوقة بنسبة 100% لحفظ وتحديث بيانات عملاء مقهى **the A&A specialty cafe & sweets** (رقم الجوال، رقم الطلب، أعلى نتيجة، الجوائز المستحقة، كود الخصم، وحالة الصرف لدى الكاشير) مباشرة في جدول Google Sheets سحابي.

---

## 1. الخطوة الأولى: إنشاء جدول Google Sheets

1. افتح [Google Sheets](https://sheets.new) وأنشئ جدولاً جديداً باسم:
   `the A&A Cafe — سجل العملاء والمكافآت`
2. في الصف الأول (الصف 1)، أضف عناوين الأعمدة التالية من اليمين إلى اليسار (أو A إلى I):

| العمود | اسم العمود بالعربية | English Header | الوصف |
| :---: | :--- | :--- | :--- |
| **A** | **رقم الجوال** | Phone | رقم الجوال السعودي المعتمد للعميل (مثال: +966501234567) |
| **B** | **رقم الطلب** | Order | رقم الفاتورة أو طلب الدرايف ثرو |
| **C** | **أعلى نتيجة** | Best Score | أعلى سكور حققه العميل في الألعاب (مثال: 2650) |
| **D** | **المكافأة المستحقة** | Qualified Tier | فئة الخصم (خصم 5%، خصم 10%، أو ترقية مشروب مجانية 🏆) |
| **E** | **كود الخصم المشفر** | Reward Code | كود التذكرة الصادر للعميل (مثال: DAA-9X4F-7K) |
| **F** | **حالة الصرف لدى الكاشير** | Redemption Status | تم الصرف لدى الكاشير ✓ أو بانتظار الصرف |
| **G** | **آخر لعبة ملعوبة** | Last Game | اسم اللعبة (مثال: سر النمط، فن صب القهوة، ...) |
| **H** | **تاريخ ووقت التسجيل** | Registered At | وقت دخول العميل لأول مرة |
| **I** | **آخر تحديث** | Updated At | توقيت آخر سكور أو عملية صرف |

---

## 2. الخطوة الثانية: فتح محرر البرمجة (Apps Script)

1. من القائمة العلوية في Google Sheets، اضغط على **ملحقات (Extensions)** ثم اختر **Apps Script**.
2. امسح أي كود موجود في الملف `Code.gs`، والصق الكود البرمجي المعتمد التالي بالكامل:

```javascript
/**
 * the A&A specialty cafe & sweets — Google Sheet Customer Sync Webhook
 * يقوم باستقبال بيانات تسجيل العملاء، نتائج الألعاب، وتأكيد صرف المكافآت وتحديثها فورياً.
 */

function doPost(e) {
  var lock = LockService.getScriptLock();
  // قفل مؤقت لمنع التضارب أثناء الضغط العالي
  lock.tryLock(15000);
  
  try {
    var doc = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = doc.getSheets()[0];
    
    var raw = e.postData.contents;
    var data = JSON.parse(raw);
    
    var phone = String(data.phone || '').trim();
    if (!phone) {
      return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "Missing phone" }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    var rows = sheet.getDataRange().getValues();
    var rowIndex = -1;
    
    // البحث إذا كان رقم العميل مسجلاً مسبقاً لتحديثه بدلاً من تكرار السطور
    for (var i = 1; i < rows.length; i++) {
      if (String(rows[i][0]).trim() === phone) {
        rowIndex = i + 1;
        break;
      }
    }
    
    var nowStr = data.dateTimeArabic || new Date().toLocaleString('ar-SA', { timeZone: 'Asia/Riyadh' });
    
    var rowValues = [
      phone,
      data.order || (rowIndex > 0 ? rows[rowIndex - 1][1] : ''),
      data.bestScore || (rowIndex > 0 ? rows[rowIndex - 1][2] : 0),
      data.qualifiedTier || (rowIndex > 0 ? rows[rowIndex - 1][3] : 'لم يتأهل بعد'),
      data.rewardCode || (rowIndex > 0 ? rows[rowIndex - 1][4] : ''),
      data.rewardStatus || (rowIndex > 0 ? rows[rowIndex - 1][5] : 'بانتظار اللعب'),
      data.lastGame || (rowIndex > 0 ? rows[rowIndex - 1][6] : ''),
      (rowIndex > 0 && rows[rowIndex - 1][7]) ? rows[rowIndex - 1][7] : nowStr,
      nowStr
    ];
    
    if (rowIndex > 0) {
      sheet.getRange(rowIndex, 1, 1, rowValues.length).setValues([rowValues]);
    } else {
      sheet.appendRow(rowValues);
    }
    
    return ContentService.createTextOutput(JSON.stringify({ 
      status: "success", 
      phone: phone, 
      action: data.action || "SYNC" 
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ 
      status: "error", 
      message: err.toString() 
    })).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

function doGet(e) {
  return ContentService.createTextOutput("the A&A Cafe Google Sheets Webhook is active and running!")
    .setMimeType(ContentService.MimeType.TEXT);
}
```

---

## 3. الخطوة الثالثة: النشر كتطبيق ويب (Deploy as Web App)

1. اضغط على زر **نشر (Deploy)** باللون الأزرق أعلى اليمين، ثم اختر **نشر جديد (New deployment)**.
2. اضغط على أيقونة الترس بجانب "Select type" واختر **تطبيق الويب (Web app)**.
3. اضبط الإعدادات كالتالي:
   - **الوصف (Description):** `the A&A Live Sync v1`
   - **تنفيذ باسم (Execute as):** `أنا / Me (بريدك الإلكتروني)`
   - **من يملك إمكانية الوصول (Who has access):** **أي شخص (Anyone)** *(مهم جداً حتى يتمكن متصفح العميل من إرسال السكور دون طلب تسجيل دخول Google)*.
4. اضغط على **نشر (Deploy)**.
5. سيطلب منك Google إعطاء الإذن (Authorize access) لمرة واحدة فقط -> اضغط `Advanced` ثم `Go to the A&A Live Sync (unsafe)` ثم `Allow`.
6. انسخ **رابط تطبيق الويب (Web App URL)** الذي ينتهي بـ `/exec`.
   *(مثال: `https://script.google.com/macros/s/AKfycbx.../exec`)*.

---

## 4. الخطوة الرابعة: تفعيل الرابط في اللعبة

1. افتح صفحة الألعاب وأضف `#staff` في نهاية الرابط بالمتصفح:
   `http://localhost:8080/index.html#staff` (أو الرابط المنشور على السيرفر).
2. انزل إلى قسم **"📊 ربط بيانات العملاء بـ Google Sheets"**.
3. الصق الرابط المنسوخ في خانة **"رابط تطبيق الويب (Google Apps Script Web App URL)"**.
4. اضغط على زر **"حفظ الرابط ✓"**.
5. اضغط على زر **"فحص الاتصال 🔄"**: ستظهر لك رسالة خضراء تؤكد إرسال سطر تجريبي، وافتح الشيت وستجد البيانات ظهرت فورياً!

---

## 5. مزايا النظام الاحتياطي المحلي والتصدير

- **النسخ الاحتياطي المحلي:** في حال انقطاع الإنترنت أو عدم إدخال الرابط بعد، يتم حفظ سجلات العملاء محلياً في ذاكرة التخزين بأمان.
- **تصدير فوري CSV:** يمكن لمدير المقهى أو الكاشير في أي وقت الضغط على زر **"📥 تصدير فوري لبيانات العملاء (ملف CSV)"** في بوابة `#staff` لتحميل ملف إكسل شامل بجميع أرقام ونتائج العملاء بضغطة زر واحدة.
