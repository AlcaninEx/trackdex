const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Capture ALL network requests and responses
  const allRequests = [];
  page.on('request', request => {
    if (request.resourceType() === 'script' || request.url().includes('.js')) {
      allRequests.push({
        url: request.url(),
        method: request.method(),
        headers: request.headers()
      });
    }
  });
  
  const allResponses = [];
  page.on('response', response => {
    if (response.url().includes('.js') || response.request().resourceType() === 'script') {
      allResponses.push({
        url: response.url(),
        status: response.status(),
        contentType: response.headers()['content-type'],
        contentLength: response.headers()['content-length']
      });
    }
  });
  
  // Capture all console messages
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
    
    // Print all JS requests/responses
    console.log('\n📥 REQUESTS JS:');
    allRequests.forEach((r, i) => {
      console.log(`  ${i+1}. ${r.url}`);
    });
    
    console.log('\n📤 RESPONSES JS:');
    allResponses.forEach((r, i) => {
      console.log(`  ${i+1}. ${r.status} ${r.contentType} ${r.url}`);
    });
    
    // Get page content to check for inline scripts
    const html = await page.content();
    const inlineScripts = html.match(/<script[^>]*>([\s\S]*?)<\/script>/gi);
    if (inlineScripts) {
      console.log('\n📜 INLINE SCRIPTS ENCONTRADOS:');
      inlineScripts.forEach((s, i) => {
        if (s.includes('export') || s.includes('import')) {
          console.log(`  ${i+1}. ${s.substring(0, 300)}...`);
        }
      });
    }
    
    // Check main.js execution
    const mainModuleLoaded = await page.evaluate(() => {
      return typeof window.init === 'function';
    });
    console.log('\n🔧 window.init disponible:', mainModuleLoaded);
    
    console.log('\n✅ Test completado');
    process.exit(0);
    
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();