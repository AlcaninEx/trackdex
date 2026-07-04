const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Capture console errors
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });
  
  page.on('pageerror', err => {
    errors.push(err.message);
  });
  
  console.log('🌐 Navegando a https://pokebestbcn.web.app...');
  
  try {
    await page.goto('https://pokebestbcn.web.app', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    console.log('✅ Página cargada');
    console.log('📄 Título:', await page.title());
    console.log('🔗 URL:', page.url());
    
    // Wait a bit for JS to execute
    await page.waitForTimeout(3000);
    
    // Check for specific elements
    const screens = await page.$$eval('.screen', els => els.map(el => el.id));
    console.log('📱 Pantallas encontradas:', screens);
    
    // Check if profile-screen is visible
    const profileVisible = await page.isVisible('#profile-screen');
    console.log('👤 Profile screen visible:', profileVisible);
    
    // Check community selection screen
    const communityVisible = await page.isVisible('#community-selection-screen');
    console.log('🏘️ Community selection visible:', communityVisible);
    
    // Check for errors
    if (errors.length > 0) {
      console.log('\n❌ ERRORES ENCONTRADOS:');
      errors.forEach((e, i) => console.log(`  ${i+1}. ${e}`));
    } else {
      console.log('\n✅ Sin errores en consola');
    }
    
    // Screenshot
    await page.screenshot({ path: '/tmp/pokebestbcn-test.png', fullPage: true });
    console.log('📸 Screenshot guardado en /tmp/pokebestbcn-test.png');
    
  } catch (err) {
    console.error('❌ Error navegando:', err.message);
  }
  
  await browser.close();
  
  if (errors.length > 0) {
    process.exit(1);
  }
})();