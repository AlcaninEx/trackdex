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
  
  // Capture network responses for JS modules
  const moduleResponses = [];
  page.on('response', async response => {
    const url = response.url();
    if (url.includes('.js') && (url.includes('/src/scripts/') || url.includes('firebase'))) {
      const contentType = response.headers()['content-type'];
      const text = await response.text().catch(() => '');
      moduleResponses.push({
        url: url,
        status: response.status(),
        contentType: contentType,
        preview: text.substring(0, 200)
      });
    }
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
    await page.waitForTimeout(5000);
    
    // Check module responses
    console.log('\n📦 Respuestas de módulos JS:');
    moduleResponses.forEach(r => {
      console.log(`  ${r.status} ${r.contentType} ${r.url}`);
      console.log(`     Preview: ${r.preview.substring(0, 100)}...`);
    });
    
    // Check for errors
    if (errors.length > 0) {
      console.log('\n❌ ERRORES ENCONTRADOS:');
      errors.forEach((e, i) => console.log(`  ${i+1}. ${e}`));
    } else {
      console.log('\n✅ Sin errores en consola');
    }
    
    // Screenshot
    await page.screenshot({ path: '/tmp/pokebestbcn-test2.png', fullPage: true });
    console.log('📸 Screenshot guardado en /tmp/pokebestbcn-test2.png');
    
  } catch (err) {
    console.error('❌ Error navegando:', err.message);
  }
  
  await browser.close();
  
  if (errors.length > 0) {
    process.exit(1);
  }
})();