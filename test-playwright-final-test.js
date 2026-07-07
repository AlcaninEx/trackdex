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
    if (msg.type() === 'log') {
      console.log(`\n📝 [console.log] ${msg.text()}`);
    }
  });
  
  console.log('🌐 Navegando a https://pokebestbcn.web.app...');
  
  try {
    await page.goto('https://pokebestbcn.web.app', { 
      waitUntil: 'domcontentloaded',
      timeout: 30000 
    });
    
    console.log('✅ Página cargada');
    // Wait for modules to load and app to initialize
    await page.waitForTimeout(5000);
    
    // Wait for global-login-screen to be visible (app initialization complete)
    await page.waitForSelector('#global-login-screen:not([style*="display: none"])', { timeout: 30000 });
    console.log('✅ Login screen is visible, app initialized');
    
    // ============================================================
    // PASO 1: REGISTRO GLOBAL (crear usuario global)
    // ============================================================
    console.log('\n📝 Paso 1: Registro global...');
    
    const timestamp = Date.now();
    const globalUserId = `testuser_${timestamp}`;
    const globalPassword = '1234';
    
    await page.click('button:has-text("Regístrate")');
    await page.waitForTimeout(1000);
    
    await page.fill('#reg-global-user-id', globalUserId);
    await page.fill('#reg-global-user-password', globalPassword);
    await page.fill('#reg-global-user-confirm', globalPassword);
    
    console.log('📝 Formulario registro global llenado, enviando...');
    await page.click('button[type="submit"]:has-text("Crear cuenta")');
    await page.waitForTimeout(5000);
    
    console.log('✅ Usuario global creado');
    
    // ============================================================
    // PASO 2: CREAR COMUNIDAD
    // ============================================================
    console.log('\n📝 Paso 2: Crear comunidad...');
    await page.waitForTimeout(1000);
    
    const commSelVisible = await page.isVisible('#community-selection-screen');
    console.log('Community selection visible:', commSelVisible);
    
    if (!commSelVisible) {
      console.log('❌ No se llegó a community selection');
      await browser.close();
      process.exit(1);
    }
    
    await page.click('.btn-add-community');
    await page.waitForTimeout(1000);
    
    const timestamp2 = Date.now();
    const communityName = `Raiders BCN ${timestamp2}`;
    const communityPassword = '1234';
    
    await page.fill('#new-community-name', communityName);
    await page.fill('#new-community-password', communityPassword);
    await page.fill('#new-community-confirm', communityPassword);
    
    console.log('📝 Formulario comunidad llenado, enviando...');
    await page.click('button[type="submit"]:has-text("Crear comunidad")');
    await page.waitForTimeout(15000);
    
    // Debug: check all screens
    const allScreens = await page.evaluate(() => {
      const s = document.querySelectorAll('.screen');
      return Array.from(s).map(s => ({ id: s.id, display: s.style.display }));
    });
    console.log('\n📱 Todas las pantallas:', allScreens);
    
    const mainAppVisible1 = await page.isVisible('#main-app-screen');
    console.log('\n🏠 Main app visible after create:', mainAppVisible1);
    
    const joinVisibleAfterCreate = await page.isVisible('#community-join-screen');
    console.log('Community join screen visible:', joinVisibleAfterCreate);
    
    const registerVisible = await page.isVisible('#community-register-screen');
    console.log('Community register screen visible:', registerVisible);
    
    const commSelVisibleAfterCreate = await page.isVisible('#community-selection-screen');
    console.log('Community selection screen visible:', commSelVisibleAfterCreate);
    
    if (!mainAppVisible1 && joinVisibleAfterCreate) {
      console.log('\n📝 En pantalla join, entrando a comunidad...');
      await page.fill('#join-community-password', '1234');
      await page.fill('#join-user-alias', 'Test User');
      
      console.log('📝 Form join llenado, enviando...');
      await page.click('button[type="submit"]:has-text("Entrar")');
      await page.waitForTimeout(5000);
      
      const mainAppVisible2 = await page.isVisible('#main-app-screen');
      console.log('\n🏠 Main app visible after join:', mainAppVisible2);
      
      if (mainAppVisible2) {
        console.log('\n✅ FLUJO COMPLETO: REGISTRO → CREAR → ENTRAR A COMUNIDAD!');
        const communityName2 = await page.textContent('#current-community-name');
        console.log('🏘️ Comunidad:', communityName2);
        await page.screenshot({ path: '/tmp/pokebestbcn-final.png', fullPage: true });
        console.log('📸 Screenshot guardado');
        await browser.close();
        process.exit(0);
      }
    }
    
    if (!mainAppVisible1) {
      console.log('❌ No se llegó a main app');
      await browser.close();
      process.exit(1);
    }
    
    // ============================================================
    // PASO 3: SALIR DE LA COMUNIDAD (LOGOUT)
    // ============================================================
    console.log('\n🚪 Paso 3: Click en Salir...');
    await page.click('button:has-text("Salir")');
    await page.waitForTimeout(2000);
    
    // Handle confirm dialog
    page.on('dialog', async dialog => {
      console.log('Dialog message:', dialog.message());
      await dialog.accept();
    });
    
    await page.click('button:has-text("Salir")');
    await page.waitForTimeout(3000);
    
    const screens = await page.evaluate(() => {
      const s = document.querySelectorAll('.screen');
      return Array.from(s).filter(s => s.style.display !== 'none').map(s => s.id);
    });
    console.log('\n📱 Pantallas después de Salir:', screens);
    
    const commSelAfterLogout = await page.isVisible('#community-selection-screen');
    console.log('Community selection visible:', commSelAfterLogout);
    
    if (!commSelAfterLogout) {
      console.log('❌ No volvió a community selection');
      await browser.close();
      process.exit(1);
    }
    
    console.log('\n✅ LOGOUT FUNCIONA - Volvió a community selection');
    
    // ============================================================
    // PASO 4: ENTRAR A LA COMUNIDAD (LOGIN COMUNIDAD)
    // ============================================================
    console.log('\n📝 Paso 4: Entrar a la comunidad...');
    
    // Debug: list all community cards and their content
    const cardsDebug = await page.evaluate(() => {
      const cards = document.querySelectorAll('.community-card');
      return Array.from(cards).map(card => ({
        text: card.textContent?.trim().substring(0, 200),
        html: card.innerHTML?.substring(0, 500),
        hasBtnEnter: !!card.querySelector('.btn-enter'),
        hasBtnJoin: !!card.querySelector('.btn-join'),
      }));
    });
    console.log('\n📱 Community cards debug:', JSON.stringify(cardsDebug, null, 2));
    
    // Find our community card and click "Unirse" button (since we left the community)
    // Use page.evaluate to click the button directly to avoid visibility issues
    const clicked = await page.evaluate(() => {
      const cards = document.querySelectorAll('.community-card');
      for (const card of cards) {
        if (card.textContent?.includes('Raiders BCN')) {
          const unirseBtn = card.querySelector('.btn-join');
          if (unirseBtn) {
            unirseBtn.click();
            return true;
          }
        }
      }
      return false;
    });
    
    if (!clicked) {
      console.log('❌ No se encontró la comunidad o el botón Unirse');
      await browser.close();
      process.exit(1);
    }
    
    console.log('✅ Click en Unirse enviado via evaluate');
    await page.waitForTimeout(3000);
    
    // Should be on community join screen now
    const joinVisible2 = await page.isVisible('#community-join-screen');
    console.log('Community join screen visible:', joinVisible2);
    
    if (joinVisible2) {
      // Fill community password and alias
      await page.fill('#join-community-password', '1234');
      await page.fill('#join-user-alias', 'Test User');
      
      console.log('📝 Form join llenado, enviando...');
      // Use page.evaluate to click the submit button directly
      const clickedSubmit = await page.evaluate(() => {
        const btn = document.querySelector('#community-join-screen button[type="submit"]');
        if (btn) {
          btn.click();
          return true;
        }
        return false;
      });
      
      if (!clickedSubmit) {
        console.log('❌ No se encontró el botón Entrar');
        await browser.close();
        process.exit(1);
      }
      
      console.log('✅ Click en Entrar enviado via evaluate');
      await page.waitForTimeout(5000);
      
      // Check main app
      const mainAppVisible = await page.isVisible('#main-app-screen');
      console.log('\n🏠 Main app visible after join:', mainAppVisible);
      
      if (mainAppVisible) {
        console.log('\n✅ FLUJO COMPLETO FUNCIONA: REGISTRO GLOBAL → CREAR COMUNIDAD → SALIR → ENTRAR A COMUNIDAD!');
        
        const communityName2 = await page.textContent('#current-community-name');
        console.log('🏘️ Comunidad:', communityName2);
        
        await page.screenshot({ path: '/tmp/pokebestbcn-final.png', fullPage: true });
        console.log('📸 Screenshot guardado');
        
        await browser.close();
        process.exit(0);
      }
    }
    
    await browser.close();
    process.exit(1);
    
  } catch (err) {
    console.error('❌ Error:', err.message);
    if (err.stack) console.log(err.stack);
    await browser.close();
    process.exit(1);
  }
})();