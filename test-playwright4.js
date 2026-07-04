const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Capture all console messages with details
  const allLogs = [];
  page.on('console', msg => {
    allLogs.push({
      type: msg.type(),
      text: msg.text(),
      location: msg.location()
    });
  });
  
  page.on('pageerror', err => {
    allLogs.push({
      type: 'pageerror',
      text: err.message,
      stack: err.stack
    });
  });
  
  // Also capture network errors
  page.on('response', response => {
    if (response.status() >= 400) {
      allLogs.push({
        type: 'network-error',
        text: `${response.status()} ${response.url()}`
      });
    }
  });
  
  console.log('🌐 Navegando a https://pokebestbcn.web.app...');
  
  try {
    await page.goto('https://pokebestbcn.web.app', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    console.log('✅ Página cargada');
    await page.waitForTimeout(8000);
    
    // Print ALL console messages
    console.log('\n📋 TODOS LOS LOGS DE CONSOLA:');
    allLogs.forEach((log, i) => {
      console.log(`  ${i+1}. [${log.type}] ${log.text}`);
      if (log.location) {
        console.log(`     at ${log.location.url}:${log.location.lineNumber}:${log.location.columnNumber}`);
      }
      if (log.stack) {
        console.log(`     Stack: ${log.stack.substring(0, 500)}`);
      }
    });
    
    const errorLogs = allLogs.filter(l => l.type === 'error' || l.type === 'pageerror' || l.type === 'network-error');
    console.log(`\n📊 Total logs: ${allLogs.length}, Errores: ${errorLogs.length}`);
    
    if (errorLogs.length === 0) {
      console.log('\n✅ SIN ERRORES');
      process.exit(0);
    } else {
      console.log('\n❌ HAY ERRORES');
      process.exit(1);
    }
    
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();