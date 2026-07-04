const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  page.on('pageerror', err => {
    console.log(`\n❌ PAGE ERROR: ${err.message}`);
    if (err.stack) console.log(`   Stack: ${err.stack}`);
  });
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log(`\n❌ CONSOLE ERROR: ${msg.text()}`);
      if (msg.location()) {
        console.log(`   at ${msg.location().url}:${msg.location().lineNumber}:${msg.location().columnNumber}`);
      }
    }
  });
  
  console.log('🌐 Navegando a https://pokebestbcn.web.app...');
  
  try {
    await page.goto('https://pokebestbcn.web.app', { 
      waitUntil: 'domcontentloaded',
      timeout: 30000 
    });
    
    console.log('✅ Página cargada (DOM)');
    await page.waitForTimeout(5000);
    
    // Try importing each module manually to see which fails
    const modules = [
      'https://pokebestbcn.web.app/src/scripts/state.js',
      'https://pokebestbcn.web.app/src/scripts/helpers.js',
      'https://pokebestbcn.web.app/src/scripts/data-loader.js',
      'https://pokebestbcn.web.app/src/scripts/firebase.js',
      'https://pokebestbcn.web.app/src/scripts/storage.js',
      'https://pokebestbcn.web.app/src/scripts/profile.js',
      'https://pokebestbcn.web.app/src/scripts/app.js',
      'https://pokebestbcn.web.app/src/scripts/main.js'
    ];
    
    for (const moduleUrl of modules) {
      try {
        const result = await page.evaluate(async (url) => {
          try {
            const module = await import(url);
            return { success: true, keys: Object.keys(module) };
          } catch (e) {
            return { success: false, error: e.message, stack: e.stack };
          }
        }, moduleUrl);
        
        if (result.success) {
          console.log(`✅ ${moduleUrl.split('/').pop()} - OK (exports: ${result.keys.join(', ')})`);
        } else {
          console.log(`❌ ${moduleUrl.split('/').pop()} - ERROR: ${result.error}`);
          if (result.stack) console.log(`   Stack: ${result.stack}`);
        }
      } catch (e) {
        console.log(`❌ ${moduleUrl.split('/').pop()} - EXCEPTION: ${e.message}`);
      }
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