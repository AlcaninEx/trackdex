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
    
    // Create community
    console.log('\n📝 Paso 1: Crear comunidad...');
    await page.click('.btn-add-community');
    await page.waitForTimeout(1000);
    
    // Check if form is visible
    const formVisible = await page.isVisible('#create-community-form');
    console.log('Create form visible:', formVisible);
    
    if (formVisible) {
      const formHtml = await page.$eval('#create-community-form', el => el.innerHTML);
      console.log('Form HTML (first 500 chars):', formHtml.substring(0, 500));
    }
    
    // Check all user-id inputs
    const userIdInputs = await page.$$eval('input[id*="user-id"]', inputs => inputs.map(i => ({ id: i.id, visible: i.offsetWidth > 0 })));
    console.log('User ID inputs:', userIdInputs);
    
    const timestamp = Date.now();
    await page.fill('#new-community-id', `debug_login_${timestamp}`);
    await page.fill('#new-community-password', '1234');
    await page.fill('#new-community-confirm', '1234');
    
    // Try to find user-id input
    const userIdInput = await page.$('#new-community-user-id');
    console.log('User ID input found:', !!userIdInput);
    
    if (userIdInput) {
      const isVisible = await userIdInput.isVisible();
      console.log('User ID input visible:', isVisible);
      if (isVisible) {
        await userIdInput.fill(`debuguser_${Date.now()}`);
      }
    }
    
    await page.waitForTimeout(5000);
    
    // Check all inputs in create form
    const allInputs = await page.$$eval('#create-community-form input', inputs => inputs.map(i => ({ id: i.id, type: i.type, visible: i.offsetWidth > 0 })));
    console.log('All inputs in create form:', allInputs);
    
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