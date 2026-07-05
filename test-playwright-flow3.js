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
    if (msg.type() === 'error' || msg.type() === 'warning' || msg.type() === 'log') {
      console.log(`\n📝 [${msg.type()}] ${msg.text()}`);
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
    await page.fill('#new-community-id', 'testcomunidad2');
    await page.fill('#new-community-password', '1234');
    await page.fill('#new-community-confirm', '1234');
    await page.fill('#new-community-user-id', 'testuser2');
    await page.fill('#new-community-user-password', '1234');
    await page.fill('#new-community-user-confirm', '1234');
    await page.fill('#new-community-display-name', 'Test User 2');
    
    console.log('📝 Formulario llenado, enviando...');
    await page.click('button[type="submit"]:has-text("Crear comunidad")');
    await page.waitForTimeout(10000);
    
    // Check what's visible
    const screens = await page.evaluate(() => {
      const s = document.querySelectorAll('.screen');
      return Array.from(s).filter(s => s.style.display !== 'none').map(s => s.id);
    });
    console.log('\n📱 Pantallas visibles:', screens);
    
    // Check create form still visible
    const formVisible = await page.isVisible('#create-community-form');
    console.log('Create form visible:', formVisible);
    
    if (formVisible) {
      const formHtml = await page.$eval('#create-community-form', el => el.innerHTML);
      console.log('Form HTML:', formHtml.substring(0, 500));
    }
    
    // Check for toast
    const toastText = await page.$eval('#toast', el => el.textContent).catch(() => 'no toast');
    console.log('Toast:', toastText);
    
    // Check if main app visible
    const mainAppVisible = await page.isVisible('#main-app-screen');
    console.log('\n🏠 Main app visible:', mainAppVisible);
    
    if (mainAppVisible) {
      console.log('\n✅ FLUJO COMPLETO FUNCIONA!');
    } else {
      console.log('\n⚠️ No se llegó a main-app-screen');
    }
    
    // Screenshot
    await page.screenshot({ path: '/tmp/pokebestbcn-flow3.png', fullPage: true });
    console.log('📸 Screenshot guardado');
    
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