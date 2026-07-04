const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Capture ALL network requests including CDN
  page.on('request', request => {
    const url = request.url();
    if (url.includes('gstatic') || url.includes('firebase') || url.includes('.js')) {
      console.log(`📤 REQUEST: ${request.method()} ${url}`);
    }
  });
  
  page.on('response', response => {
    const url = response.url();
    if (url.includes('gstatic') || url.includes('firebase') || url.includes('.js')) {
      console.log(`📥 RESPONSE: ${response.status()} ${response.headers()['content-type']} ${url}`);
      if (response.status() >= 400 || response.headers()['content-type']?.includes('html')) {
        response.text().then(text => {
          console.log(`   ⚠️ BODY PREVIEW: ${text.substring(0, 300)}`);
        }).catch(() => {});
      }
    }
  });
  
  page.on('console', msg => {
    if (msg.type() === 'error' || msg.text().includes('export') || msg.text().includes('Unexpected')) {
      console.log(`\n❌ [${msg.type()}] ${msg.text()}`);
      if (msg.location()) {
        console.log(`   at ${msg.location().url}:${msg.location().lineNumber}:${msg.location().columnNumber}`);
      }
    }
  });
  
  page.on('pageerror', err => {
    console.log(`\n❌ PAGE ERROR: ${err.message}`);
    if (err.stack) console.log(`   Stack: ${err.stack}`);
  });
  
  console.log('🌐 Navegando a https://pokebestbcn.web.app...');
  
  try {
    await page.goto('https://pokebestbcn.web.app', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    console.log('✅ Página cargada');
    await page.waitForTimeout(10000);
    
    console.log('\n✅ Test completado');
    process.exit(0);
    
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();