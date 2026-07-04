const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Capture all responses
  page.on('response', response => {
    const url = response.url();
    const ct = response.headers()['content-type'] || '';
    if (url.includes('.js') || url.includes('firebase') || url.includes('gstatic') || ct.includes('html')) {
      console.log(`  ${response.status()} ${ct} ${url}`);
    }
  });
  
  // Capture all console messages with details
  page.on('console', msg => {
    if (msg.type() === 'error' || msg.text().includes('export') || msg.text().includes('module')) {
      console.log(`  [${msg.type()}] ${msg.text()}`);
      if (msg.location()) {
        console.log(`     at ${msg.location().url}:${msg.location().lineNumber}:${msg.location().columnNumber}`);
      }
    }
  });
  
  page.on('pageerror', err => {
    console.log(`  [pageerror] ${err.message}`);
    if (err.stack) console.log(`  Stack: ${err.stack.substring(0, 500)}`);
  });
  
  console.log('🌐 Navegando a https://pokebestbcn.web.app...');
  
  try {
    await page.goto('https://pokebestbcn.web.app', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    console.log('✅ Página cargada');
    await page.waitForTimeout(8000);
    
    console.log('\n✅ Test completado');
    process.exit(0);
    
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();