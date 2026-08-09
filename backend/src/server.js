require('dotenv').config();
const http = require('http');
const createApp = require('./app');
const { initSocket } = require('./sockets');
const { startMonthlyReportCron } = require('./cron/monthlyReport.cron');

const PORT = process.env.PORT || 5000;

// 1. إنشاء تطبيق Express وتمرير io له
const app = createApp();

// 2. إنشاء السيرفر مع Express كـ Request Handler
const httpServer = http.createServer(app);

// 3. تهيئة Socket.io على نفس الـ Server
const io = initSocket(httpServer);

// 4. إرفاق io بـ app لاستخدامه في الـ controllers
app.set('io', io);

httpServer.listen(PORT, () => {
  console.log(`Cafe management backend running on port ${PORT}`);
  startMonthlyReportCron();
});