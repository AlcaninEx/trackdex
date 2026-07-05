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
    
    // First, create a community
    console.log('\n📝 Paso 1: Crear comunidad...');
    await page.click('.btn-add-community');
    await page.waitForTimeout(1000);
    
    const timestamp = Date.now();
    await page.fill('#new-community-id', `testcomunidad_${timestamp}`);
    await page.fill('#new-community-password', '1234');
    await page.fill('#new-community-confirm', '1234');
    await page.fill('#new-community-user-id', `testuser_${timestamp}`);
    await page.fill('#new-community-user-password', '1234');
    await page.fill('#new-community-user-confirm', '1234');
    await page.fill('#new-community-display-name', 'Test User');
    
    console.log('📝 Formulario llenado, enviando...');
    await page.click('button[type="submit"]:has-text("Crear comunidad")');
    await page.waitForTimeout(8000);
    
    // Now logout and login again
    console.log('\n🚪 Paso 2: Salir y volver a entrar...');
    await page.click('button:has-text("Salir")');
    await page.waitForTimeout(2000);
    
    // Should be back at community selection
    await page.waitForTimeout(2000);
    const commSelVisible = await page.isVisible('#community-selection-screen');
    console.log('Community selection visible:', commSelVisible);
    
    // Click on the community to login
    console.log('\n🔑 Paso 3: Login en la comunidad...');
    await page.click('.community-card:has-text("testcomunidad")');
    await page.waitForTimeout(2000);
    
    // Should show login form
    const loginVisible = await page.isVisible('#community-login-screen');
    console.log('Login form visible:', loginVisible);
    
    if (loginVisible) {
      await page.fill('#login-user-id', 'testuser_...');
      await page.fill('#login-user-password', '1234');
      await page.click('button[type="submit"]:has-text("Entrar")');
      await page.waitForTimeout(5000);
      
      // Check if main app visible
      const mainAppVisible = await page.isVisible('#main-app-screen');
      console.log('\n🏠 Main app visible after login:', mainAppVisible);
      
      if (mainAppVisible) {
        console.log('\n✅ LOGIN FUNCIONA!');
      }
    }
    
    // Screenshot
    await page.screenshot({ path: '/tmp/pokebestbcn-login.png', fullPage: true });
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