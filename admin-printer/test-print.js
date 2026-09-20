// Usage:
//   npm run test-print          -> prints one short test invoice (3 dummy items)
//   npm run preview             -> saves a PNG in ./preview, prints nothing
const core = require('./printer-core');

(async () => {
  console.log(core.DRY_RUN
    ? '🧪 Preview mode (nothing will be printed)'
    : `🖨️  Printing ONE test invoice on "${core.PRINTER_NAME || '(PRINTER_NAME not set)'}" (${core.PAPER_WIDTH}mm)`);
  const ok = await core.printOrderInvoice(core.buildTestOrder());
  process.exit(ok ? 0 : 1);
})();