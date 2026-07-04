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
    await page.waitForTimeout(3000);
    
    // 1. Click en "Crear comunidad"
    console.log('\n📝 Paso 1: Crear comunidad...');
    await page.click('.btn-add-community');
    await page.waitForTimeout(1000);
    
    // Fill create community form
    await page.fill('#new-community-id', 'testcomunidad');
    await page.fill('#new-community-password', '1234');
    await page.fill('#new-community-confirm', '1234');
    await page.fill('#new-community-user-id', 'testuser');
    await page.fill('#new-community-user-password', '1234');
    await page.fill('#new-community-user-confirm', '1234');
    await page.fill('#new-community-display-name', 'Test User');
    
    console.log('📝 Formulario llenado, enviando...');
    await page.click('button[type="submit"]:has-text("Crear comunidad")');
    await page.waitForTimeout(5000);
    
    // Check if we're in main app
    const mainAppVisible = await page.isVisible('#main-app-screen');
    console.log('\n🏠 Main app visible:', mainAppVisible);
    
    if (mainAppVisible) {
      const communityName = await page.textContent('#current-community-name');
      console.log('🏘️ Comunidad actual:', communityName);
      
      const memberCount = await page.textContent('#member-count');
      console.log('👥 Miembros:', memberCount);
      
      // Check home menu
      const homeMenuVisible = await page.isVisible('#home-menu');
      console.log('📋 Home menu visible:', homeMenuVisible);
      
      // Screenshot
      await page.screenshot({ path: '/tmp/pokebestbcn-flow.png', fullPage: true });
      console.log('📸 Screenshot guardado');
      
      console.log('\n✅ FLUJO COMPLETO FUNCIONA!');
    } else {
      console.log('\n⚠️ No se llegó a main-app-screen');
      // Check what's visible
      const screens = await page.evaluate(() => {
        const s = document.querySelectorAll('.screen');
        return Array.from(s).filter(s => s.style.display !== 'none').map(s => s.id);
      });
      console.log('Pantallas visibles:', screens);
    }
    
    console.log('\n✅ Test completado');
    process.exit(0);
    
  } catch (err) {
    console.error('❌ Error:', err.message);
    if (err.stack) console.log(err.stack);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();