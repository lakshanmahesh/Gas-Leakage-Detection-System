const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const admin = require('firebase-admin');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('.'));

// Firebase Admin SDK configuration - Using environment variables for security
// For development, we'll use a simplified approach without admin SDK
// The client-side Firebase will handle real-time data

let db = null;

// Try to initialize Firebase Admin SDK if credentials are available
try {
  const serviceAccount = require('./firebase-service-account.json');
  
  // Check if credentials are valid (not placeholder values)
  if (serviceAccount.private_key && !serviceAccount.private_key.includes('YOUR_PRIVATE_KEY_HERE')) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: "https://gas-leakage-detection-sy-41697-default-rtdb.europe-west1.firebasedatabase.app/"
    });
    db = admin.database();
    console.log('✅ Firebase Admin SDK initialized successfully');
  } else {
    console.log('⚠️  Firebase Admin SDK not initialized - using client-side Firebase only');
  }
} catch (error) {
  console.log('⚠️  Firebase Admin SDK not available - using client-side Firebase only');
}

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = './uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage: storage });

// Routes

// Get system configuration
app.get('/api/config', async (req, res) => {
  try {
    if (db) {
      const snapshot = await db.ref('systemConfig').once('value');
      const config = snapshot.val();
      res.json({ success: true, data: config });
    } else {
      // Fallback: return empty config when Firebase Admin SDK is not available
      res.json({ success: true, data: null });
    }
  } catch (error) {
    console.error('Error fetching config:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Save system configuration
app.post('/api/config', async (req, res) => {
  try {
    const config = req.body;
    
    // Validate configuration
    if (!config.espCount || !config.sensorsPerEsp || !config.sensors) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid configuration data' 
      });
    }
    
    // Save to Firebase
    await db.ref('systemConfig').set(config);
    
    // Save to local file as backup
    fs.writeFileSync('./config-backup.json', JSON.stringify(config, null, 2));
    
    res.json({ success: true, message: 'Configuration saved successfully' });
  } catch (error) {
    console.error('Error saving config:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get sensor data
app.get('/api/sensors', async (req, res) => {
  try {
    const snapshot = await db.ref('gas').once('value');
    const sensorData = snapshot.val();
    res.json({ success: true, data: sensorData });
  } catch (error) {
    console.error('Error fetching sensor data:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update sensor data (for ESP modules to send data)
app.post('/api/sensors/:espId/:sensorId', async (req, res) => {
  try {
    const { espId, sensorId } = req.params;
    const { value, timestamp } = req.body;
    
    if (value === undefined) {
      return res.status(400).json({ 
        success: false, 
        error: 'Sensor value is required' 
      });
    }
    
    const sensorPath = `gas/ESP${espId}/sensor${sensorId}`;
    const updateData = {
      value: parseFloat(value),
      timestamp: timestamp || Date.now(),
      lastUpdated: new Date().toISOString()
    };
    
    await db.ref(sensorPath).set(updateData);
    
    // Log sensor data
    console.log(`ESP${espId} Sensor${sensorId}: ${value} ppm`);
    
    res.json({ success: true, message: 'Sensor data updated' });
  } catch (error) {
    console.error('Error updating sensor data:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Upload flowchart image
app.post('/api/upload-flowchart', upload.single('flowchart'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        error: 'No file uploaded' 
      });
    }
    
    const filePath = req.file.path;
    const fileUrl = `/uploads/${req.file.filename}`;
    
    res.json({ 
      success: true, 
      message: 'Flowchart uploaded successfully',
      filePath: fileUrl 
    });
  } catch (error) {
    console.error('Error uploading flowchart:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get system status
app.get('/api/status', async (req, res) => {
  try {
    const configSnapshot = await db.ref('systemConfig').once('value');
    const config = configSnapshot.val();
    
    const sensorSnapshot = await db.ref('gas').once('value');
    const sensorData = sensorSnapshot.val();
    
    let systemStatus = 'offline';
    let activeSensors = 0;
    let alerts = 0;
    
    if (config && sensorData) {
      systemStatus = 'online';
      
      // Count active sensors and alerts
      Object.keys(sensorData).forEach(espId => {
        Object.keys(sensorData[espId]).forEach(sensorId => {
          const sensor = sensorData[espId][sensorId];
          if (sensor && sensor.value !== undefined) {
            activeSensors++;
            if (sensor.value > 500) {
              alerts++;
            }
          }
        });
      });
    }
    
    res.json({
      success: true,
      data: {
        status: systemStatus,
        activeSensors,
        totalSensors: config ? config.sensors.length : 0,
        alerts,
        lastUpdate: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error fetching system status:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Serve uploaded files
app.use('/uploads', express.static('uploads'));

// Serve main application
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/setup', (req, res) => {
  res.sendFile(path.join(__dirname, 'setup.html'));
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({ 
    success: false, 
    error: 'Internal server error' 
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Gas Leakage Monitoring Server running on port ${PORT}`);
  console.log(`📊 Dashboard: http://localhost:${PORT}`);
  console.log(`⚙️  Setup: http://localhost:${PORT}/setup`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down server...');
  process.exit(0);
});
