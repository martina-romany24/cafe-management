const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const prisma = require('../config/prisma');

/**
 * Computes and stores (upserts) the monthly report for ONE branch, for the
 * given month/year, based on Order/OrderItem snapshots (priceAtSale /
 * basePriceAtSale) — so it stays accurate even if products/margins change later.
 */
async function generateForBranch(branchId, month, year) {
  const from = new Date(Date.UTC(year, month - 1, 1));
  const to = new Date(Date.UTC(year, month, 1)); // exclusive upper bound

  const orders = await prisma.order.findMany({
    where: { branchId, createdAt: { gte: from, lt: to } },
    include: { items: { include: { product: true } } },
  });

  let totalSales = 0;
  let baseCost = 0;
  let branchProfit = 0;
  const productTally = {};

  for (const order of orders) {
    for (const item of order.items) {
      const finalPrice = Number(item.priceAtSale);
      const basePrice = Number(item.basePriceAtSale);
      totalSales += finalPrice * item.quantity;
      baseCost += basePrice * item.quantity;
      branchProfit += (finalPrice - basePrice) * item.quantity;

      const key = item.productId;
      if (!productTally[key]) productTally[key] = { productId: key, name: item.product.name, quantity: 0 };
      productTally[key].quantity += item.quantity;
    }
  }

  const hqRevenue = baseCost; // by definition: hqRevenue = totalSales - branchProfit = baseCost
  const topProducts = Object.values(productTally)
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5);

  const report = await prisma.monthlyReport.upsert({
    where: { branchId_month_year: { branchId, month, year } },
    update: {
      totalSales: round2(totalSales),
      baseCost: round2(baseCost),
      branchProfit: round2(branchProfit),
      hqRevenue: round2(hqRevenue),
      ordersCount: orders.length,
      topProducts,
      generatedAt: new Date(),
    },
    create: {
      branchId,
      month,
      year,
      totalSales: round2(totalSales),
      baseCost: round2(baseCost),
      branchProfit: round2(branchProfit),
      hqRevenue: round2(hqRevenue),
      ordersCount: orders.length,
      topProducts,
    },
  });

  return report;
}

function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * Generates report for admin (HQ) orders - orders without a branch (branchId = null)
 * These are orders placed on admin-only tables from the admin tables page.
 */
async function generateForAdmin(month, year) {
  const from = new Date(Date.UTC(year, month - 1, 1));
  const to = new Date(Date.UTC(year, month, 1));

  const orders = await prisma.order.findMany({
    where: { branchId: null, createdAt: { gte: from, lt: to } },
    include: { items: { include: { product: true } } },
  });

  if (orders.length === 0) {
    return null; // No admin orders for this month
  }

  let totalSales = 0;
  let baseCost = 0;
  let branchProfit = 0;
  const productTally = {};

  for (const order of orders) {
    for (const item of order.items) {
      const finalPrice = Number(item.priceAtSale);
      const basePrice = Number(item.basePriceAtSale);
      totalSales += finalPrice * item.quantity;
      baseCost += basePrice * item.quantity;
      branchProfit += (finalPrice - basePrice) * item.quantity;

      const key = item.productId;
      if (!productTally[key]) productTally[key] = { productId: key, name: item.product.name, quantity: 0 };
      productTally[key].quantity += item.quantity;
    }
  }

  const hqRevenue = baseCost;
  const topProducts = Object.values(productTally)
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5);

  return {
    branch: { id: 'admin-hq', name: 'الإدارة الرئيسية (ابن الباشا)' },
    month,
    year,
    totalSales: round2(totalSales),
    baseCost: round2(baseCost),
    branchProfit: round2(branchProfit),
    hqRevenue: round2(hqRevenue),
    ordersCount: orders.length,
    topProducts,
    generatedAt: new Date(),
  };
}

/**
 * Generates the monthly report for ALL active branches. Called by node-cron
 * on the 1st of each month (for the previous month), and available as a
 * manual "recalculate" action from the admin UI for any past month.
 */
async function generateForAllBranches(month, year) {
  const branches = await prisma.branch.findMany({ where: { isActive: true } });
  const results = [];
  for (const branch of branches) {
    const report = await generateForBranch(branch.id, month, year);
    results.push(report);
  }
  return results;
}

async function listReports({ month, year }) {
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const isCurrentMonth = Number(month) === currentMonth && Number(year) === currentYear;

  if (isCurrentMonth) {
    // For current month, calculate reports in real-time
    const branches = await prisma.branch.findMany({ where: { isActive: true } });
    const results = [];
    for (const branch of branches) {
      const report = await generateForBranch(branch.id, Number(month), Number(year));
      results.push({ ...report, branch: { id: branch.id, name: branch.name } });
    }

    // Add admin (HQ) report for orders without branch (branchId = null)
    const adminReport = await generateForAdmin(Number(month), Number(year));
    if (adminReport) {
      results.push(adminReport);
    }

    return results;
  }

  // For past months, return stored reports
  const storedReports = await prisma.monthlyReport.findMany({
    where: { ...(month ? { month: Number(month) } : {}), ...(year ? { year: Number(year) } : {}) },
    include: { branch: { select: { id: true, name: true } } },
    orderBy: [{ year: 'desc' }, { month: 'desc' }],
  });

  // For past months, also calculate admin report on-the-fly (not stored)
  const adminReport = await generateForAdmin(Number(month), Number(year));
  if (adminReport) {
    storedReports.push(adminReport);
  }

  return storedReports;
}

async function exportExcel(month, year) {
  const reports = await listReports({ month, year });
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(`Report ${month}-${year}`);

  sheet.columns = [
    { header: 'Branch', key: 'branch', width: 20 },
    { header: 'Total Sales', key: 'totalSales', width: 15 },
    { header: 'Base Cost', key: 'baseCost', width: 15 },
    { header: 'Branch Profit', key: 'branchProfit', width: 15 },
    { header: 'HQ Revenue', key: 'hqRevenue', width: 15 },
    { header: 'Orders Count', key: 'ordersCount', width: 15 },
  ];

  for (const r of reports) {
    sheet.addRow({
      branch: r.branch.name,
      totalSales: Number(r.totalSales),
      baseCost: Number(r.baseCost),
      branchProfit: Number(r.branchProfit),
      hqRevenue: Number(r.hqRevenue),
      ordersCount: r.ordersCount,
    });
  }

  sheet.getRow(1).font = { bold: true };
  return workbook.xlsx.writeBuffer();
}

async function exportPdf(month, year) {
  const reports = await listReports({ month, year });

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40 });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fontSize(18).text(`Monthly Report - ${month}/${year}`, { align: 'center' });
    doc.moveDown();

    reports.forEach((r) => {
      doc.fontSize(13).text(r.branch.name, { underline: true });
      doc.fontSize(11).text(`Total Sales: ${r.totalSales}`);
      doc.text(`Base Cost: ${r.baseCost}`);
      doc.text(`Branch Profit: ${r.branchProfit}`);
      doc.text(`HQ Revenue: ${r.hqRevenue}`);
      doc.text(`Orders Count: ${r.ordersCount}`);
      doc.moveDown();
    });

    doc.end();
  });
}

module.exports = { generateForBranch, generateForAllBranches, listReports, exportExcel, exportPdf };
