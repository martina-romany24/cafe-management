const cron = require('node-cron');
const reportService = require('../services/report.service');

/**
 * Runs at 00:05 on the 1st of every month, generating the report for the
 * PREVIOUS month across all active branches.
 * Cron format: minute hour day month weekday
 */
function startMonthlyReportCron() {
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
    } catch (err) {
      console.error('[cron] Failed to generate monthly reports:', err);
    }
  });

  console.log('[cron] Monthly report scheduler started (runs 1st of each month at 00:05).');
}

module.exports = { startMonthlyReportCron };
