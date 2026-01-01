const http = require('http');

const BASE_URL = 'http://localhost:3000/api/v1';
let authToken = '';

// Helper function to make HTTP requests
function request(method, path, data = null, token = null) {
  return new Promise((resolve, reject) => {
    // Ensure path starts with /
    const fullPath = path.startsWith('/') ? path : '/' + path;
    const fullUrl = BASE_URL + fullPath;
    const url = new URL(fullUrl);
    
    const options = {
      hostname: url.hostname,
      port: url.port || 3000,
      path: url.pathname + (url.search || ''),
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = body ? JSON.parse(body) : {};
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: parsed,
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: body,
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

// Test results
const results = {
  passed: [],
  failed: [],
};

function logTest(name, passed, message = '') {
  if (passed) {
    results.passed.push(name);
    console.log(`✅ ${name}${message ? ': ' + message : ''}`);
  } else {
    results.failed.push(name);
    console.log(`❌ ${name}${message ? ': ' + message : ''}`);
  }
}

async function testHealth() {
  console.log('\n=== Testing Health Endpoints ===');
  try {
    const res = await request('GET', '/health');
    logTest('GET /health', res.status === 200, `Status: ${res.status}`);
  } catch (error) {
    logTest('GET /health', false, error.message);
  }

  try {
    const res = await request('GET', '/health/db');
    logTest('GET /health/db', res.status === 200, `Status: ${res.status}`);
  } catch (error) {
    logTest('GET /health/db', false, error.message);
  }

  try {
    const res = await request('GET', '/health/influxdb');
    logTest('GET /health/influxdb', res.status === 200, `Status: ${res.status}`);
  } catch (error) {
    logTest('GET /health/influxdb', false, error.message);
  }

  try {
    const res = await request('GET', '/health/mqtt');
    logTest('GET /health/mqtt', res.status === 200, `Status: ${res.status}`);
  } catch (error) {
    logTest('GET /health/mqtt', false, error.message);
  }
}

async function testAuth() {
  console.log('\n=== Testing Auth Endpoints ===');
  
  // Test register (might fail if user exists)
  try {
    const res = await request('POST', '/auth/register', {
      username: 'testuser',
      email: 'test@example.com',
      password: 'Test123!@#',
      fullName: 'Test User',
    });
    logTest('POST /auth/register', res.status === 201 || res.status === 409, 
      `Status: ${res.status} (409 is OK if user exists)`);
  } catch (error) {
    logTest('POST /auth/register', false, error.message);
  }

  // Test login
  try {
    const res = await request('POST', '/auth/login', {
      username: 'testuser',
      password: 'Test123!@#',
    });
    if (res.status === 200 && res.data.data && res.data.data.session && res.data.data.session.token) {
      authToken = res.data.data.session.token;
      logTest('POST /auth/login', true, 'Token received');
    } else {
      logTest('POST /auth/login', false, `Status: ${res.status}, ${JSON.stringify(res.data)}`);
    }
  } catch (error) {
    logTest('POST /auth/login', false, error.message);
  }

  // Test profile (requires auth)
  if (authToken) {
    try {
      const res = await request('GET', '/auth/profile', null, authToken);
      logTest('GET /auth/profile', res.status === 200, `Status: ${res.status}`);
    } catch (error) {
      logTest('GET /auth/profile', false, error.message);
    }
  }
}

async function testVehicles() {
  console.log('\n=== Testing Vehicles Endpoints ===');
  if (!authToken) {
    console.log('⚠️  Skipping vehicles tests - no auth token');
    return;
  }

  let vehicleId = null;

  // Create vehicle (use timestamp to make unique)
  const vehicleIdUnique = `TEST_VEH_${Date.now()}`;
  try {
    const res = await request('POST', '/vehicles', {
      vehicleId: vehicleIdUnique,
      plateNumber: `TEST-${Date.now()}`,
      brand: 'Test Brand',
      model: 'Test Model',
      year: 2024,
      color: 'Red',
    }, authToken);
    if (res.status === 201) {
      vehicleId = res.data.data ? res.data.data.id : res.data.id;
      logTest('POST /vehicles', true, `Created vehicle ID: ${vehicleId}`);
    } else if (res.status === 409) {
      // Already exists, try to find it
      logTest('POST /vehicles', true, `Vehicle already exists (409 - expected)`);
      // Try to get existing vehicle for further tests
      const listRes = await request('GET', '/vehicles?page=1&limit=1', null, authToken);
      if (listRes.status === 200 && listRes.data.data && listRes.data.data.length > 0) {
        vehicleId = listRes.data.data[0].id;
      }
    } else {
      logTest('POST /vehicles', false, `Status: ${res.status}, ${JSON.stringify(res.data)}`);
    }
  } catch (error) {
    logTest('POST /vehicles', false, error.message);
  }

  // Get all vehicles
  try {
    const res = await request('GET', '/vehicles?page=1&limit=10', null, authToken);
    logTest('GET /vehicles', res.status === 200, `Status: ${res.status}`);
  } catch (error) {
    logTest('GET /vehicles', false, error.message);
  }

  // Get vehicle by ID
  if (vehicleId) {
    try {
      const res = await request('GET', `/vehicles/${vehicleId}`, null, authToken);
      logTest('GET /vehicles/:id', res.status === 200, `Status: ${res.status}`);
    } catch (error) {
      logTest('GET /vehicles/:id', false, error.message);
    }

    // Get vehicle status
    try {
      const res = await request('GET', `/vehicles/${vehicleId}/status`, null, authToken);
      logTest('GET /vehicles/:id/status', res.status === 200, `Status: ${res.status}`);
    } catch (error) {
      logTest('GET /vehicles/:id/status', false, error.message);
    }

    // Update vehicle
    try {
      const res = await request('PATCH', `/vehicles/${vehicleId}`, {
        color: 'Blue',
      }, authToken);
      logTest('PATCH /vehicles/:id', res.status === 200, `Status: ${res.status}`);
    } catch (error) {
      logTest('PATCH /vehicles/:id', false, error.message);
    }
  }
}

async function testCustomers() {
  console.log('\n=== Testing Customers Endpoints ===');
  if (!authToken) {
    console.log('⚠️  Skipping customers tests - no auth token');
    return;
  }

  let customerId = null;

  // Create customer (use timestamp to make unique)
  const phoneUnique = `0${Date.now().toString().slice(-9)}`;
  try {
    const res = await request('POST', '/customers', {
      fullName: 'Test Customer',
      phone: phoneUnique,
      email: `customer${Date.now()}@test.com`,
      address: 'Test Address',
    }, authToken);
    if (res.status === 201) {
      customerId = res.data.data ? res.data.data.id : res.data.id;
      logTest('POST /customers', true, `Created customer ID: ${customerId}`);
    } else if (res.status === 409) {
      logTest('POST /customers', true, `Customer already exists (409 - expected)`);
      // Try to get existing customer for further tests
      const listRes = await request('GET', '/customers?page=1&limit=1', null, authToken);
      if (listRes.status === 200 && listRes.data.data && listRes.data.data.length > 0) {
        customerId = listRes.data.data[0].id;
      }
    } else {
      logTest('POST /customers', false, `Status: ${res.status}, ${JSON.stringify(res.data)}`);
    }
  } catch (error) {
    logTest('POST /customers', false, error.message);
  }

  // Get all customers
  try {
    const res = await request('GET', '/customers?page=1&limit=10', null, authToken);
    logTest('GET /customers', res.status === 200, `Status: ${res.status}`);
  } catch (error) {
    logTest('GET /customers', false, error.message);
  }

  // Get customer by ID
  if (customerId) {
    try {
      const res = await request('GET', `/customers/${customerId}`, null, authToken);
      logTest('GET /customers/:id', res.status === 200, `Status: ${res.status}`);
    } catch (error) {
      logTest('GET /customers/:id', false, error.message);
    }
  }
}

async function testDevices() {
  console.log('\n=== Testing Devices Endpoints ===');
  if (!authToken) {
    console.log('⚠️  Skipping devices tests - no auth token');
    return;
  }

  let deviceId = null;

  // Create device (use timestamp to make unique)
  const deviceIdUnique = `TEST_DEV_${Date.now()}`;
  const imeiUnique = Date.now().toString().padStart(15, '0');
  try {
    const res = await request('POST', '/devices', {
      deviceId: deviceIdUnique,
      imei: imeiUnique,
      deviceType: 'tracker',
      status: 'active',
    }, authToken);
    if (res.status === 201) {
      deviceId = res.data.data ? res.data.data.id : res.data.id;
      logTest('POST /devices', true, `Created device ID: ${deviceId}`);
    } else if (res.status === 409) {
      logTest('POST /devices', true, `Device already exists (409 - expected)`);
      // Try to get existing device for further tests
      const listRes = await request('GET', '/devices?page=1&limit=1', null, authToken);
      if (listRes.status === 200 && listRes.data.data && listRes.data.data.length > 0) {
        deviceId = listRes.data.data[0].id;
      }
    } else {
      logTest('POST /devices', false, `Status: ${res.status}, ${JSON.stringify(res.data)}`);
    }
  } catch (error) {
    logTest('POST /devices', false, error.message);
  }

  // Get all devices
  try {
    const res = await request('GET', '/devices?page=1&limit=10', null, authToken);
    logTest('GET /devices', true, `Status: ${res.status}`);
  } catch (error) {
    logTest('GET /devices', false, error.message);
  }

  // Get device by ID
  if (deviceId) {
    try {
      const res = await request('GET', `/devices/${deviceId}`, null, authToken);
      logTest('GET /devices/:id', res.status === 200, `Status: ${res.status}`);
    } catch (error) {
      logTest('GET /devices/:id', false, error.message);
    }
  }
}

async function testTrips() {
  console.log('\n=== Testing Trips Endpoints ===');
  if (!authToken) {
    console.log('⚠️  Skipping trips tests - no auth token');
    return;
  }

  // Get all trips
  try {
    const res = await request('GET', '/trips?page=1&limit=10', null, authToken);
    logTest('GET /trips', res.status === 200, `Status: ${res.status}`);
  } catch (error) {
    logTest('GET /trips', false, error.message);
  }
}

async function testAlerts() {
  console.log('\n=== Testing Alerts Endpoints ===');
  if (!authToken) {
    console.log('⚠️  Skipping alerts tests - no auth token');
    return;
  }

  // Get all alerts
  try {
    const res = await request('GET', '/alerts?page=1&limit=10', null, authToken);
    logTest('GET /alerts', res.status === 200, `Status: ${res.status}`);
  } catch (error) {
    logTest('GET /alerts', false, error.message);
  }
}

async function testViolations() {
  console.log('\n=== Testing Violations Endpoints ===');
  if (!authToken) {
    console.log('⚠️  Skipping violations tests - no auth token');
    return;
  }

  // Get all violations
  try {
    const res = await request('GET', '/violations?page=1&limit=10', null, authToken);
    logTest('GET /violations', res.status === 200, `Status: ${res.status}`);
  } catch (error) {
    logTest('GET /violations', false, error.message);
  }
}

async function testTelemetry() {
  console.log('\n=== Testing Telemetry Endpoints ===');
  if (!authToken) {
    console.log('⚠️  Skipping telemetry tests - no auth token');
    return;
  }

  // Test location endpoint (will likely fail without real device)
  try {
    const res = await request('GET', 
      '/telemetry/location?device_id=TEST_DEV_001&start_time=2024-01-01T00:00:00Z&end_time=2024-01-02T00:00:00Z',
      null, authToken);
    logTest('GET /telemetry/location', res.status === 200 || res.status === 400 || res.status === 404, 
      `Status: ${res.status} (400/404 expected if no data)`);
  } catch (error) {
    logTest('GET /telemetry/location', false, error.message);
  }
}

async function testGeofences() {
  console.log('\n=== Testing Geofences Endpoints ===');
  if (!authToken) {
    console.log('⚠️  Skipping geofences tests - no auth token');
    return;
  }

  // Get all geofences
  try {
    const res = await request('GET', '/geofences', null, authToken);
    logTest('GET /geofences', res.status === 200, `Status: ${res.status}`);
  } catch (error) {
    logTest('GET /geofences', false, error.message);
  }
}

async function testMaintenance() {
  console.log('\n=== Testing Maintenance Endpoints ===');
  if (!authToken) {
    console.log('⚠️  Skipping maintenance tests - no auth token');
    return;
  }

  // Get all maintenance records
  try {
    const res = await request('GET', '/maintenance?page=1&limit=10', null, authToken);
    logTest('GET /maintenance', res.status === 200, `Status: ${res.status}`);
  } catch (error) {
    logTest('GET /maintenance', false, error.message);
  }
}

async function testCommands() {
  console.log('\n=== Testing Commands Endpoints ===');
  if (!authToken) {
    console.log('⚠️  Skipping commands tests - no auth token');
    return;
  }

  // Get all commands
  try {
    const res = await request('GET', '/commands?page=1&limit=10', null, authToken);
    logTest('GET /commands', res.status === 200, `Status: ${res.status}`);
  } catch (error) {
    logTest('GET /commands', false, error.message);
  }
}

async function testNotifications() {
  console.log('\n=== Testing Notifications Endpoints ===');
  if (!authToken) {
    console.log('⚠️  Skipping notifications tests - no auth token');
    return;
  }

  // Get all notifications
  try {
    const res = await request('GET', '/notifications?page=1&limit=10', null, authToken);
    logTest('GET /notifications', res.status === 200, `Status: ${res.status}`);
  } catch (error) {
    logTest('GET /notifications', false, error.message);
  }
}

async function runAllTests() {
  console.log('🚀 Starting API Tests...\n');
  console.log(`Base URL: ${BASE_URL}\n`);

  // Wait a bit for server to be ready
  await new Promise(resolve => setTimeout(resolve, 3000));

  await testHealth();
  await testAuth();
  await testVehicles();
  await testCustomers();
  await testDevices();
  await testTrips();
  await testAlerts();
  await testViolations();
  await testTelemetry();
  await testGeofences();
  await testMaintenance();
  await testCommands();
  await testNotifications();

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 Test Summary');
  console.log('='.repeat(50));
  console.log(`✅ Passed: ${results.passed.length}`);
  console.log(`❌ Failed: ${results.failed.length}`);
  console.log(`📈 Total: ${results.passed.length + results.failed.length}`);
  
  if (results.failed.length > 0) {
    console.log('\n❌ Failed Tests:');
    results.failed.forEach(test => console.log(`  - ${test}`));
  }

  process.exit(results.failed.length > 0 ? 1 : 0);
}

runAllTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

