const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Capture all scripts in the page
  await page.addInitScript(() => {
    // Hook into script execution
    const originalCreateElement = document.createElement;
    document.createElement = function(tagName, options) {
      if (tagName === 'script') {
        const script = originalCreateElement.call(this, tagName, options);
        const originalSetSrc = Object.getOwnPropertyDescriptor(HTMLScriptElement.prototype, 'src');
        Object.defineProperty(script, 'src', {
          set: function(value) {
            console.log('[SCRIPT SRC SET]', value);
            return originalSetSrc.set.call(this, value);
          },
          get: originalSetSrc.get
        });
        const originalSetText = Object.getOwnPropertyDescriptor(HTMLScriptElement.prototype, 'text');
        Object.defineProperty(script, 'text', {
          set: function(value) {
            if (value && value.includes('export')) {
              console.log('[INLINE SCRIPT WITH EXPORT]', value.substring(0, 200));
            }
            return originalSetText.set.call(this, value);
          },
          get: originalSetText.get
        });
        return script;
      }
      return originalCreateElement.call(this, tagName, options);
    };
  });
  
  // Capture all console messages with details
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
    
    // Also check Service Worker console
    const sw = await page.context().serviceWorkers();
    console.log(`\n🔧 Service Workers: ${sw.length}`);
    for (const worker of sw) {
      console.log(`  ${worker.url()}`);
    }
    
    console.log('\n✅ Test completado');
    process.exit(0);
    
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();