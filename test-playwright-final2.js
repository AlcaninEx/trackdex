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
    if (msg.type() === 'error' || msg.type() === 'warning') {
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
    
    const timestamp = Date.now();
    await page.fill('#new-community-id', `test_logout_${timestamp}`);
    await page.fill('#new-community-password', '1234');
    await page.fill('#new-community-confirm', '1234');
    await page.fill('#new-community-user-id', `testuser_${timestamp}`);
    await page.fill('#new-community-user-password', '1234');
    await page.fill('#new-community-user-confirm', '1234');
    await page.fill('#new-community-display-name', 'Test User');
    
    console.log('📝 Formulario llenado, enviando...');
    await page.click('button[type="submit"]:has-text("Crear comunidad")');
    await page.waitForTimeout(8000);
    
    // Verify main app
    const mainAppVisible1 = await page.isVisible('#main-app-screen');
    console.log('\n🏠 Main app visible after create:', mainAppVisible1);
    
    if (!mainAppVisible1) {
      console.log('❌ No se llegó a main app');
      process.exit(1);
    }
    
    // Click Salir button
    console.log('\n🚪 Paso 2: Click en Salir en Salir...');
    await page.click('button:has-text("Salir")');
    await page.waitForTimeout(2000);
    
    // Handle confirm dialog
    page.on('dialog', async dialog => {
      console.log('Dialog message:', dialog.message());
      await dialog.accept();
    });
    
    await page.click('button:has-text("Salir")');
    await page.waitForTimeout(3000);
    
    // Check what's visible
    const screens = await page.evaluate(() => {
      const s = document.querySelectorAll('.screen');
      return Array.from(s).filter(s => s.style.display !== 'none').map(s => s.id);
    });
    console.log('\n📱 Pantallas visibles después de Salir:', screens);
    
    const commSelVisible = await page.isVisible('#community-selection-screen');
    console.log('Community selection visible:', commSelVisible);
    
    if (!commSelVisible) {
      console.log('❌ Logout no funcionó - no volvió a community selection');
      const screens = await page.evaluate(() => {
        const s = document.querySelectorAll('.screen');
        return Array.from(s).filter(s => s.style.display !== 'none').map(s => s.id);
      });
      console.log('Pantallas visibles:', screens);
      process.exit(1);
    }
    
    console.log('\n✅ LOGOUT FUNCIONA - Volvió a community selection');
    
    // Check community list
    const html = await page.$eval('#community-list', el => el.innerHTML);
    console.log('Community list HTML:', html.substring(0, 500));
    
    // Click on community card to login
    const communityId = await page.evaluate(() => {
      const cards = document.querySelectorAll('.community-card');
      for (const card of cards) {
        if (card.textContent.includes('test_logout_')) {
          return card.textContent.match(/test_logout_\d+/)?.[0];
        }
      }
      return null;
    });
    
    if (!communityId) {
      console.log('❌ No se encontró la comunidad creada');
      process.exit(1);
    }
    
    console.log('\n🔑 Comunidad encontrada:', communityId);
    
    // Click Entrar button
    console.log('\n🔑 Paso 3: Click en Unirse (debe mostrar login)...');
    // Use JavaScript click to avoid visibility issues
    await page.evaluate(() => {
      const cards = document.querySelectorAll('.community-card');
      for (const card of cards) {
        if (card.textContent.includes('test_logout_')) {
          const joinBtn = card.querySelector('button.community-join-btn');
          if (joinBtn) {
            joinBtn.click();
            return true;
          }
        }
      }
      return false;
    });
    await page.waitForTimeout(3000);
    
    // Should show login form
    const loginVisible = await page.isVisible('#community-login-screen');
    console.log('Login form visible:', loginVisible);
    
    if (!loginVisible) {
      console.log('❌ Login form no visible');
      process.exit(1);
    }
    
    // Fill login form
    const userId = communityId.replace('test_logout_', 'testuser_');
    
    await page.fill('#login-user-id', userId);
    await page.fill('#login-user-password', '1234');
    await page.click('button[type="submit"]:has-text("Entrar")');
    await page.waitForTimeout(8000);
    
    // Check main app
    const mainAppVisible = await page.isVisible('#main-app-screen');
    console.log('\n🏠 Main app visible after login:', mainAppVisible);
    
    if (mainAppVisible) {
      console.log('\n✅ FLUJO COMPLETO FUNCIONA: CREATE → LOGOUT → LOGIN!');
      
      const communityName = await page.textContent('#current-community-name');
      console.log('🏘️ Comunidad:', communityName);
      
      await page.screenshot({ path: '/tmp/pokebestbcn-final.png', fullPage: true });
      console.log('📸 Screenshot guardado');
      
      console.log('\n✅ FLUJO COMPLETO FUNCIONA: CREATE → LOGOUT → LOGIN!');
      process.exit(0);
    } else {
      console.log('❌ No se llegó a main app tras login');
      const screens = await page.evaluate(() => {
        const s = document.querySelectorAll('.screen');
        return Array.from(s).filter(s => s.style.display !== 'none').map(s => s.id);
      });
      console.log('Pantallas visibles:', screens);
      
      // Check if still on login screen
      const loginVisible = await page.isVisible('#community-login-screen');
      console.log('Login screen still visible:', loginVisible);
      
      if (loginVisible) {
        const toastText = await page.$eval('#toast', el => el.textContent).catch(() => 'no toast');
        console.log('Toast:', toastText);
      }
      
      process.exit(1);
    }
    
  } catch (err) {
    console.error('❌ Error:', err.message);
    if (err.stack) console.log(err.stack);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();