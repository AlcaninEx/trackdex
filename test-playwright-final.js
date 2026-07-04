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
    
    console.log('✅ Página cargada');
    await page.waitForTimeout(5000);
    
    // Check what's visible
    const visibleScreens = await page.evaluate(() => {
      const screens = document.querySelectorAll('.screen');
      return Array.from(screens).filter(s => s.style.display !== 'none').map(s => s.id);
    });
    console.log('\n📱 Pantallas visibles:', visibleScreens);
    
    // Check for community selection screen
    const communityVisible = await page.isVisible('#community-selection-screen');
    console.log('🏘️ Community selection visible:', communityVisible);
    
    // Check for community list
    const communityList = await page.$('#community-list');
    if (communityList) {
      const html = await communityList.innerHTML();
      console.log('📋 Community list HTML length:', html.length);
    }
    
    // Check empty state
    const emptyState = await page.$('.community-empty');
    if (emptyState) {
      const text = await emptyState.textContent();
      console.log('🏘️ Empty state text:', text.trim());
    }
    
    // Screenshot
    await page.screenshot({ path: '/tmp/pokebestbcn-final.png', fullPage: true });
    console.log('📸 Screenshot guardado');
    
    console.log('\n✅ Test completado');
    process.exit(0);
    
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();