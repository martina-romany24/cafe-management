const reportService = require('../services/report.service');

async function list(req, res, next) {
  try {
    const { month, year } = req.query;
    const reports = await reportService.listReports({ month, year });
    res.json(reports);
  } catch (err) {
    next(err);
  }
}

async function recalculate(req, res, next) {
  try {
    const { month, year, branchId } = req.body;
    const result = branchId
      ? [await reportService.generateForBranch(branchId, month, year)]
      : await reportService.generateForAllBranches(month, year);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function exportExcel(req, res, next) {
  try {
    const { month, year } = req.query;
    const buffer = await reportService.exportExcel(month, year);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=report-${month}-${year}.xlsx`);
    res.send(buffer);
  } catch (err) {
    next(err);
  }
}

async function exportPdf(req, res, next) {
  try {
    const { month, year } = req.query;
    const buffer = await reportService.exportPdf(month, year);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=report-${month}-${year}.pdf`);
    res.send(buffer);
  } catch (err) {
    next(err);
  }
}

module.exports = { list, recalculate, exportExcel, exportPdf };
