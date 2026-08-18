const cron = require('node-cron');
const reportService = require('../services/report.service');
const prisma = require('../config/prisma');
const { notify } = require('../utils/notify');

/**
 * Runs at 00:05 on the 1st of every month, generating the report for the
 * PREVIOUS month across all active branches, then notifies every admin that
 * it's ready.
 * Cron format: minute hour day month weekday
 *
 * `io` is the Socket.io server instance (pass app.get('io') from server.js)
 * — needed here so the notification can be pushed live, not just persisted.
 */
function startMonthlyReportCron(io) {
  cron.schedule('5 0 1 * *', async () => {
    const now = new Date();
    // previous month (handles January -> December of previous year)
    const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const month = prevDate.getMonth() + 1;
    const year = prevDate.getFullYear();
    try {
      console.log(`[cron] Generating monthly reports for ${month}/${year}...`);
      await reportService.generateForAllBranches(month, year);
      console.log('[cron] Monthly reports generated successfully.');

      const admins = await prisma.user.findMany({
        where: { role: 'admin', isActive: true },
        select: { id: true },
      });

      if (admins.length > 0) {
        await notify(io, {
          userIds: admins.map((a) => a.id),
          type: 'monthly_report_ready',
          message: `التقرير الشهري لشهر ${month}/${year} جاهز للعرض`,
          room: 'hq',
        });
      }
    } catch (err) {
      console.error('[cron] Failed to generate monthly reports:', err);
    }
  });
  console.log('[cron] Monthly report scheduler started (runs 1st of each month at 00:05).');
}

module.exports = { startMonthlyReportCron };