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
    
    // First, create a community
    console.log('\n📝 Paso 1: Crear comunidad...');
    await page.click('.btn-add-community');
    await page.waitForTimeout(1000);
    
    const timestamp = Date.now();
    await page.fill('#new-community-id', `test_login_${timestamp}`);
    await page.fill('#new-community-password', '1234');
    await page.fill('#new-community-confirm', '1234');
    await page.fill('#new-community-user-id', `testuser_${timestamp}`);
    await page.fill('#new-community-user-password', '1234');
    await page.fill('#new-community-user-confirm', '1234');
    await page.fill('#new-community-display-name', 'Test User');
    
    console.log('📝 Formulario llenado, enviando...');
    await page.click('button[type="submit"]:has-text("Crear comunidad")');
    await page.waitForTimeout(8000);
    
    // Verify we're in main app
    const mainAppVisible1 = await page.isVisible('#main-app-screen');
    console.log('\n🏠 Main app visible after create:', mainAppVisible1);
    
    if (!mainAppVisible1) {
      console.log('❌ No se llegó a main app tras crear');
      process.exit(1);
    }
    
    const communityName = await page.textContent('#current-community-name');
    console.log('🏘️ Comunidad creada:', communityName);
    
    // Now logout
    console.log('\n🚪 Paso 2: Salir de la comunidad...');
    await page.click('button:has-text("Salir")');
    await page.waitForTimeout(3000);
    
    // Should be back at community selection
    const commSelVisible = await page.isVisible('#community-selection-screen');
    console.log('\n🏘️ Community selection visible after logout:', commSelVisible);
    
    if (!commSelVisible) {
      console.log('❌ No se volvió a community selection');
      const screens = await page.evaluate(() => {
        const s = document.querySelectorAll('.screen');
        return Array.from(s).filter(s => s.style.display !== 'none').map(s => s.id);
      });
      console.log('Pantallas visibles:', screens);
    }
    
    // Find and click the community card to login
    console.log('\n🔑 Paso 3: Login en la comunidad existente...');
    await page.waitForTimeout(2000);
    
    // Click the "Entrar" button for our community
    const communityId = await page.evaluate(() => {
      const cards = document.querySelectorAll('.community-card');
      for (const card of cards) {
        if (card.textContent.includes('test_login_') || card.textContent.includes('testcomunidad')) {
          const onclick = card.getAttribute('onclick');
          if (onclick && onclick.includes('handleCommunityClick')) {
            return onclick.match(/handleCommunityClick\('([^']+)'\)/)[1];
          }
        }
      }
      return null;
    });
    
    if (!communityId) {
      console.log('❌ No se encontró la comunidad creada');
      const screens = await page.evaluate(() => {
        const s = document.querySelectorAll('.screen');
        return Array.from(s).filter(s => s.style.display !== 'none').map(s => s.id);
      });
      console.log('Pantallas visibles:', screens);
      const html = await page.$eval('#community-list', el => el.innerHTML);
      console.log('Community list HTML:', html.substring(0, 1000));
      process.exit(1);
    }
    
    console.log('\n🔑 Comunidad encontrada:', communityId);
    
    // Click the "Entrar" button
    console.log('\n🔑 Paso 3: Click en Entrar...');
    await page.click(`button:has-text("Entrar"):has([onclick*="${communityId}"])`);
    await page.waitForTimeout(3000);
    
    // Check if login form appears
    const loginVisible = await page.isVisible('#community-login-screen');
    console.log('\n🔑 Login form visible:', loginVisible);
    
    if (loginVisible) {
      // Fill login form
      const userId = await page.evaluate(() => {
        const cards = document.querySelectorAll('.community-card');
        for (const card of cards) {
          if (card.textContent.includes('test_login_') || card.textContent.includes('testcomunidad')) {
            return card.textContent.match(/testuser_\d+/)?.[0] || 'testuser';
          }
        }
        return 'testuser';
      });
      
      await page.fill('#login-user-id', userId);
      await page.fill('#login-user-password', '1234');
      await page.click('button[type="submit"]:has-text("Entrar")');
      await page.waitForTimeout(5000);
      
      // Check if main app visible
      const mainAppVisible = await page.isVisible('#main-app-screen');
      console.log('\n🏠 Main app visible after login:', mainAppVisible);
      
      if (mainAppVisible) {
        console.log('\n✅ LOGIN FUNCIONA!');
        
        const communityName = await page.textContent('#current-community-name');
        console.log('🏘️ Comunidad:', communityName);
        
        const memberCount = await page.textContent('#member-count');
        console.log('👥 Miembros:', memberCount);
        
        // Screenshot
        await page.screenshot({ path: '/tmp/pokebestbcn-login.png', fullPage: true });
        console.log('📸 Screenshot guardado');
        
        console.log('\n✅ FLUJO COMPLETO: CREATE → LOGOUT → LOGIN FUNCIONA!');
      } else {
        console.log('❌ No se llegó a main app tras login');
        const screens = await page.evaluate(() => {
          const s = document.querySelectorAll('.screen');
          return Array.from(s).filter(s => s.style.display !== 'none').map(s => s.id);
        });
        console.log('Pantallas visibles:', screens);
      }
    }
    
    // Screenshot
    await page.screenshot({ path: '/tmp/pokebestbcn-final.png', fullPage: true });
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