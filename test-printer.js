const USB = require('@node-escpos/usb-adapter');

async function testPrinter() {
  console.log('🖨️ Testing USB printer detection...');
  
  try {
    const device = new USB();
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        console.log('❌ Timeout: No USB printer found');
        resolve(false);
      }, 5000);
      
      device.open((err) => {
        clearTimeout(timeout);
        
        if (err) {
          console.log('❌ USB printer not accessible:', err.message);
          console.log('🔧 Possible solutions:');
          console.log('   1. Check if printer is powered on');
          console.log('   2. Check USB cable connection');
          console.log('   3. Check if another app is using the printer');
          console.log('   4. Grant USB permissions to the app');
          resolve(false);
        } else {
          console.log('✅ USB printer detected and accessible!');
          try {
            device.close();
          } catch (closeError) {
            console.log('⚠️  Error closing device:', closeError.message);
          }
          resolve(true);
        }
      });
    });
  } catch (error) {
    console.log('❌ Error during test:', error.message);
    return false;
  }
}

// Run the test
testPrinter().then((result) => {
  console.log('🖨️ Test result:', result ? 'PRINTER AVAILABLE' : 'PRINTER NOT AVAILABLE');
  process.exit(result ? 0 : 1);
}); 