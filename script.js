// Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyD03uzNrXqHT-Qek7FxnolduX6duze185k",
  databaseURL: "https://gas-leakage-detection-sy-41697-default-rtdb.europe-west1.firebasedatabase.app/",
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// System Configuration
let systemConfig = null;
let sensorElements = {};
let currentTab = 'readings';
let floorplanCanvas = null;
let floorplanCtx = null;
let trendChart = null;
let sensorData = {};
let alertHistory = [];

// DOM Elements
const setupSection = document.getElementById('setup-section');
const dashboard = document.getElementById('dashboard');
const setupBtn = document.getElementById('setup-btn');
const sensorContainer = document.getElementById('sensor-container');

// Initialize dashboard
document.addEventListener('DOMContentLoaded', () => {
  loadSystemConfiguration();
  setupEventListeners();
  
  // Add window resize listener for responsive floor plan
  window.addEventListener('resize', () => {
    if (currentTab === 'floorplan') {
      resizeFloorplanCanvas();
      drawFloorplan();
    }
  });
});

function setupEventListeners() {
  setupBtn.addEventListener('click', () => {
    window.location.href = 'setup.html';
  });
  
  // Reset configuration button
  document.getElementById('reset-config-btn')?.addEventListener('click', () => {
    resetSystemConfiguration();
  });
  
  // Tab switching
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tabName = btn.dataset.tab;
      switchTab(tabName);
    });
  });
  
  // Floor plan controls
  document.getElementById('reset-view')?.addEventListener('click', () => {
    resetFloorplanView();
  });
  
  document.getElementById('clear-highlighting')?.addEventListener('click', () => {
    clearSensorHighlighting();
  });
  
  // Time range selector
  document.getElementById('time-range')?.addEventListener('change', (e) => {
    updateAnalysisData(e.target.value);
  });
}

function loadSystemConfiguration() {
  // Always initialize dashboard with ESP32 configuration
  initializeDashboard();
}

function showSetupSection() {
  setupSection.style.display = 'block';
  dashboard.style.display = 'none';
}

function initializeDashboard() {
  if (!systemConfig) return;
  
  // Hide setup section and show dashboard
  setupSection.style.display = 'none';
  dashboard.style.display = 'block';
  
  // Create sensor elements dynamically
  createSensorElements();
  
  // Setup Firebase listeners for each sensor
  setupSensorListeners();
}

function createSensorElements() {
  console.log('Creating sensor elements...');
  console.log('Sensor container:', sensorContainer);
  
  sensorContainer.innerHTML = '';
  sensorElements = {};
  
  // Create fixed sensor configuration for ESP32 with 2 sensors
  // Using better positioned coordinates that work well with the default floor plan
  const esp32Sensors = [
    { id: 'ESP1_Sensor1', espId: '1', sensorId: '1', color: '#007bff', x: 150, y: 200 },
    { id: 'ESP1_Sensor2', espId: '1', sensorId: '2', color: '#28a745', x: 650, y: 400 }
  ];
  
  console.log('ESP32 sensors configuration:', esp32Sensors);
  
  // Create ESP group
  const espGroup = document.createElement('div');
  espGroup.className = 'esp-group';
  espGroup.innerHTML = `<h3>ESP32 Module</h3>`;
  
  const espSensorContainer = document.createElement('div');
  espSensorContainer.className = 'esp-sensor-container';
  
  // Create sensor elements
  esp32Sensors.forEach(sensor => {
    const sensorElement = document.createElement('div');
    sensorElement.className = 'sensor';
    sensorElement.innerHTML = `
      <div class="sensor-header">
        <h2>${sensor.id}</h2>
        <div class="sensor-status" id="status-${sensor.id}">
          <span class="status-indicator"></span>
          <span class="status-text">Connecting...</span>
        </div>
      </div>
      <div class="sensor-info">
        <p class="esp-info">ESP32 - MQ6 Sensor ${sensor.sensorId}</p>
        <div class="gas-reading">
          <span class="gas-label">Gas Level:</span>
          <span class="gas-value" id="${sensor.id}">--</span>
          <span class="gas-unit">ppm</span>
        </div>
        <div class="last-update" id="update-${sensor.id}">Last Update: --</div>
      </div>
    `;
    
    espSensorContainer.appendChild(sensorElement);
    // Store reference to the gas value element
    sensorElements[sensor.id] = sensorElement.querySelector(`#${sensor.id}`);
  });
  
  espGroup.appendChild(espSensorContainer);
  sensorContainer.appendChild(espGroup);
  
  // Update systemConfig with the fixed sensor configuration
  if (!systemConfig) {
    systemConfig = {
      sensors: esp32Sensors,
      flowchart: null
    };
  } else {
    systemConfig.sensors = esp32Sensors;
  }
  
  console.log('Sensor elements created. sensorElements object:', sensorElements);
  console.log('System config updated:', systemConfig);
}

function setupSensorListeners() {
  console.log('Setting up Firebase sensor listeners...');
  
  // Set up listeners for the actual ESP32 sensor paths
  const sensorPaths = [
    { path: 'gas/sensor1', id: 'ESP1_Sensor1', espId: '1', sensorId: '1' },
    { path: 'gas/sensor2', id: 'ESP1_Sensor2', espId: '1', sensorId: '2' }
  ];
  
  sensorPaths.forEach(sensorInfo => {
    console.log(`Setting up listener for ${sensorInfo.id} at path: ${sensorInfo.path}`);
    const sensorRef = db.ref(sensorInfo.path);
    
    sensorRef.on("value", snapshot => {
      const data = snapshot.val();
      console.log(`Received data for ${sensorInfo.id}:`, data);
      
      if (data !== null && data !== undefined) {
        // ESP32 sends raw integer values, so we need to handle them differently
        const gasValue = typeof data === 'number' ? data : (data.value || data);
        console.log(`Processed gas value for ${sensorInfo.id}:`, gasValue);
        
        // Validate sensor data
        const validatedData = validateSensorData({ value: gasValue }, sensorInfo.id);
        if (validatedData.isValid) {
          console.log(`Updating display for ${sensorInfo.id} with value:`, validatedData.value);
          updateSensorDisplay(sensorInfo.id, validatedData.value, Date.now());
        } else {
          console.warn(`Invalid data from sensor ${sensorInfo.id}:`, validatedData.error);
          updateSensorDisplay(sensorInfo.id, null, null, 'invalid');
        }
      } else {
        console.log(`No data received for ${sensorInfo.id}`);
        // Handle disconnected sensor
        updateSensorDisplay(sensorInfo.id, null, null);
      }
    }, error => {
      console.error(`Error listening to sensor ${sensorInfo.id}:`, error);
      updateSensorDisplay(sensorInfo.id, null, null, 'error');
    });
    
    // Store reference for cleanup
    sensorInfo.sensorRef = sensorRef;
  });
  
  // Set up connection status monitoring
  setupConnectionMonitoring();
}

function updateSensorDisplay(sensorId, value, timestamp, error = null) {
  console.log(`updateSensorDisplay called for ${sensorId} with value:`, value, 'error:', error);
  
  const element = sensorElements[sensorId];
  const statusElement = document.getElementById(`status-${sensorId}`);
  const statusIndicator = statusElement?.querySelector('.status-indicator');
  const statusText = statusElement?.querySelector('.status-text');
  const updateElement = document.getElementById(`update-${sensorId}`);
  
  console.log(`Element found for ${sensorId}:`, element);
  console.log(`Status element found for ${sensorId}:`, statusElement);
  
  if (element) {
    // Handle different states
    if (error === 'error') {
      element.textContent = 'ERROR';
      element.style.color = '#dc3545';
      element.style.fontSize = '24px';
      element.style.fontWeight = 'bold';
      statusIndicator.style.backgroundColor = '#dc3545';
      statusIndicator.style.animation = 'pulse 1s infinite';
      statusText.textContent = 'CONNECTION ERROR';
      statusText.style.color = '#dc3545';
      if (updateElement) updateElement.textContent = 'Last Update: Connection Error';
      return;
    }
    
    if (error === 'invalid') {
      element.textContent = 'INVALID';
      element.style.color = '#fd7e14';
      element.style.fontSize = '24px';
      element.style.fontWeight = 'bold';
      statusIndicator.style.backgroundColor = '#fd7e14';
      statusIndicator.style.animation = 'pulse 1s infinite';
      statusText.textContent = 'INVALID DATA';
      statusText.style.color = '#fd7e14';
      if (updateElement) updateElement.textContent = 'Last Update: Invalid Data';
      return;
    }
    
    if (value === null || value === undefined) {
      element.textContent = '--';
      element.style.color = '#6c757d';
      element.style.fontSize = '28px';
      element.style.fontWeight = 'normal';
      statusIndicator.style.backgroundColor = '#6c757d';
      statusIndicator.style.animation = 'none';
      statusText.textContent = 'DISCONNECTED';
      statusText.style.color = '#6c757d';
      if (updateElement) updateElement.textContent = 'Last Update: Disconnected';
      return;
    }
    
    // Reset styles for normal operation
    element.style.color = '';
    element.style.fontSize = '28px';
    element.style.fontWeight = 'bold';
    statusIndicator.style.animation = 'none';
    
    // Update value with animation
    element.textContent = value.toFixed(0); // Show whole numbers for gas readings
    
    // Track the last updated sensor for floor plan highlighting
    lastUpdatedSensor = sensorId;
    lastUpdateTime = Date.now();
    
    // Clear any existing timeout
    if (highlightingTimeout) {
      clearTimeout(highlightingTimeout);
    }
    
    // Set timeout to clear highlighting after 10 seconds
    highlightingTimeout = setTimeout(() => {
      lastUpdatedSensor = null;
      if (currentTab === 'floorplan') {
        drawSensorsOnFloorplan();
      }
    }, 10000); // 10 seconds
    
    // Add pulse animation for new readings
    element.style.animation = 'valueUpdate 0.5s ease-out';
    setTimeout(() => {
      element.style.animation = '';
    }, 500);
    
    // Update timestamp
    if (updateElement) {
      const now = new Date();
      updateElement.textContent = `Last Update: ${now.toLocaleTimeString()}`;
    }
    
    // Store sensor data for analysis
    if (!sensorData[sensorId]) {
      sensorData[sensorId] = [];
    }
    sensorData[sensorId].push({
      value: value,
      timestamp: timestamp ? new Date(timestamp) : new Date()
    });
    
    // Keep only last 100 readings
    if (sensorData[sensorId].length > 100) {
      sensorData[sensorId] = sensorData[sensorId].slice(-100);
    }
    
    // Update status based on gas level with enhanced visual feedback (matching ESP32 thresholds)
    if (value > 1300) {
      statusIndicator.style.backgroundColor = '#dc3545';
      statusIndicator.style.boxShadow = '0 0 10px rgba(220, 53, 69, 0.5)';
      statusText.textContent = 'CRITICAL ALERT!';
      statusText.style.color = '#dc3545';
      statusText.style.fontWeight = 'bold';
      addAlertHistory(sensorId, value, 'Critical Alert');
      
      // Add urgent pulse animation
      statusIndicator.style.animation = 'urgentPulse 0.5s infinite';
    } else if (value > 1000) {
      statusIndicator.style.backgroundColor = '#ffc107';
      statusIndicator.style.boxShadow = '0 0 8px rgba(255, 193, 7, 0.4)';
      statusText.textContent = 'WARNING';
      statusText.style.color = '#ffc107';
      statusText.style.fontWeight = 'bold';
      addAlertHistory(sensorId, value, 'Warning');
      
      // Add warning pulse animation
      statusIndicator.style.animation = 'warningPulse 1s infinite';
    } else {
      statusIndicator.style.backgroundColor = '#28a745';
      statusIndicator.style.boxShadow = '0 0 5px rgba(40, 167, 69, 0.3)';
      statusText.textContent = 'NORMAL';
      statusText.style.color = '#28a745';
      statusText.style.fontWeight = 'normal';
    }
    
    // Update last update time
    updateLastUpdateTime();
    
    // Update analysis if on analysis tab
    if (currentTab === 'analysis') {
      updateAnalysisData();
    }
    
    // Update floor plan if on floor plan tab
    if (currentTab === 'floorplan') {
      drawSensorsOnFloorplan();
    }
    
    // Update highlighting status
    updateHighlightingStatus();
  }
}

// Tab switching functionality
function switchTab(tabName) {
  currentTab = tabName;
  
  // Update tab buttons
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
  
  // Update tab content
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.remove('active');
  });
  document.getElementById(`${tabName}-tab`).classList.add('active');
  
  // Initialize specific tab content
  switch(tabName) {
    case 'floorplan':
      initializeFloorplan();
      // Force update of sensor highlighting when switching to floor plan
      setTimeout(() => {
        drawSensorsOnFloorplan();
      }, 100);
      break;
    case 'analysis':
      initializeAnalysis();
      break;
  }
}

// Floor plan functionality
function initializeFloorplan() {
  if (!floorplanCanvas) {
    floorplanCanvas = document.getElementById('floorplan-canvas');
    floorplanCtx = floorplanCanvas.getContext('2d');
    
    // Add drag and drop event listeners
    setupDragAndDrop();
  }
  
  // Calculate optimal canvas size based on container
  resizeFloorplanCanvas();
  
  drawFloorplan();
  updateFloorplanLegend();
}

// Function to resize canvas to fit container properly
function resizeFloorplanCanvas() {
  if (!floorplanCanvas) return;
  
  const container = floorplanCanvas.parentElement;
  const containerWidth = container.offsetWidth - 20; // Account for padding
  const containerHeight = container.offsetHeight - 20; // Account for padding
  
  // Set canvas size
  floorplanCanvas.width = containerWidth;
  floorplanCanvas.height = containerHeight;
  
  // Set CSS size to match
  floorplanCanvas.style.width = containerWidth + 'px';
  floorplanCanvas.style.height = containerHeight + 'px';
}

function drawFloorplan() {
  if (!floorplanCtx) {
    console.log('Floor plan canvas context not available');
    return;
  }
  
  if (!systemConfig || !systemConfig.sensors) {
    // Show message when no configuration exists
    const canvas = floorplanCanvas;
    const ctx = floorplanCtx;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw background
    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw message
    ctx.fillStyle = '#6c757d';
    ctx.font = '24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('No Floor Plan Configuration', canvas.width / 2, canvas.height / 2 - 20);
    
    ctx.font = '16px Arial';
    ctx.fillText('Please complete the setup process first', canvas.width / 2, canvas.height / 2 + 10);
    
    ctx.font = '14px Arial';
    ctx.fillText('Click "System Setup" to configure your sensors', canvas.width / 2, canvas.height / 2 + 40);
    
    return;
  }
  
  // Use the new background drawing function
  drawFloorplanBackground();
  
  // Draw sensors after background is ready
  setTimeout(() => {
    drawSensorsOnFloorplan();
  }, 100);
  
}

// Global variable to track the last updated sensor
let lastUpdatedSensor = null;
let lastUpdateTime = 0;
let highlightingTimeout = null;

// Drag and drop variables
let isDragging = false;
let draggedSensor = null;
let dragOffset = { x: 0, y: 0 };

// Function to draw the floor plan background
function drawFloorplanBackground() {
  if (!floorplanCtx || !systemConfig) return;
  
  const canvas = floorplanCanvas;
  const ctx = floorplanCtx;
  
  // Draw background
  ctx.fillStyle = '#f8f9fa';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Draw the saved floor plan image if available
  if (systemConfig.flowchart) {
    const img = new Image();
    img.onload = () => {
      // Calculate scaling to fit the canvas while maintaining aspect ratio
      const originalWidth = 800; // Original setup canvas width
      const originalHeight = 600; // Original setup canvas height
      
      // Calculate scale to fit the canvas with some padding
      const padding = 20;
      const availableWidth = canvas.width - (padding * 2);
      const availableHeight = canvas.height - (padding * 2);
      
      const scaleX = availableWidth / originalWidth;
      const scaleY = availableHeight / originalHeight;
      const scale = Math.min(scaleX, scaleY, 1); // Don't scale up beyond original size
      
      const scaledWidth = originalWidth * scale;
      const scaledHeight = originalHeight * scale;
      const offsetX = (canvas.width - scaledWidth) / 2;
      const offsetY = (canvas.height - scaledHeight) / 2;
      
      // Draw the floor plan image
      ctx.drawImage(img, offsetX, offsetY, scaledWidth, scaledHeight);
      
      // Store scaling info for sensor positioning
      window.floorplanScale = scale;
      window.floorplanOffsetX = offsetX;
      window.floorplanOffsetY = offsetY;
    };
    img.src = systemConfig.flowchart;
  } else {
    // Draw grid if no floor plan image is available
    ctx.strokeStyle = '#dee2e6';
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += 50) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += 50) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }
    
    // Draw a simple room outline as example
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 3;
    ctx.strokeRect(50, 50, canvas.width - 100, canvas.height - 100);
    
    // Add room labels
    ctx.fillStyle = '#666';
    ctx.font = '16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Facility Floor Plan', canvas.width / 2, 30);
  }
}

// Function to draw sensors on the floor plan
function drawSensorsOnFloorplan() {
  if (!floorplanCtx || !systemConfig || !systemConfig.sensors) return;
  
  const canvas = floorplanCanvas;
  const ctx = floorplanCtx;
  
  // Clear the entire canvas first to remove any previous highlighting boxes
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Redraw the floor plan background
  drawFloorplanBackground();
  
  // Calculate scaling factors for sensor positions
  let scaleX = canvas.width / 800;
  let scaleY = canvas.height / 600;
  let offsetX = 0;
  let offsetY = 0;
  
  // If we have a floor plan image, use the stored scaling info
  if (systemConfig.flowchart && window.floorplanScale) {
    scaleX = window.floorplanScale;
    scaleY = window.floorplanScale;
    offsetX = window.floorplanOffsetX;
    offsetY = window.floorplanOffsetY;
  } else {
    // Improved fallback scaling for when no floor plan image exists
    // Use uniform scaling to maintain aspect ratio
    const scale = Math.min(canvas.width / 800, canvas.height / 600);
    scaleX = scale;
    scaleY = scale;
    offsetX = (canvas.width - (800 * scale)) / 2;
    offsetY = (canvas.height - (600 * scale)) / 2;
    
    // Ensure minimum padding from edges
    const minPadding = 30;
    offsetX = Math.max(offsetX, minPadding);
    offsetY = Math.max(offsetY, minPadding);
  }
  
  // Draw all sensors first
  systemConfig.sensors.forEach(sensor => {
    const x = offsetX + (sensor.x * scaleX);
    const y = offsetY + (sensor.y * scaleY);
    
    // Calculate sensor size based on scale
    const sensorRadius = Math.max(12, 15 * Math.min(scaleX, scaleY));
    
    // Draw sensor circle with better visibility
    ctx.fillStyle = sensor.color;
    ctx.strokeStyle = '#333';
    ctx.lineWidth = Math.max(2, 3 * Math.min(scaleX, scaleY));
    ctx.beginPath();
    ctx.arc(x, y, sensorRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    
    // Add inner circle for better visibility
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x, y, sensorRadius * 0.6, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw sensor label with better positioning
    ctx.fillStyle = '#333';
    ctx.font = `${Math.max(10, 12 * Math.min(scaleX, scaleY))}px Arial`;
    ctx.textAlign = 'center';
    ctx.fillText(sensor.sensorId, x, y + 3);
    
    // Draw sensor ID with better positioning
    ctx.font = `${Math.max(8, 10 * Math.min(scaleX, scaleY))}px Arial`;
    ctx.fillText(sensor.id, x, y + sensorRadius + 15);
  });
  
  // Draw highlighting box only for the last updated sensor (if it has high values)
  if (lastUpdatedSensor) {
    const sensor = systemConfig.sensors.find(s => s.id === lastUpdatedSensor);
    if (sensor) {
      const x = offsetX + (sensor.x * scaleX);
      const y = offsetY + (sensor.y * scaleY);
      
      // Get current gas reading for this sensor
      const sensorElement = document.getElementById(sensor.id);
      const gasValue = sensorElement ? parseFloat(sensorElement.textContent) || 0 : 0;
      
      // Calculate highlighting box size based on sensor size
      const sensorRadius = Math.max(12, 15 * Math.min(scaleX, scaleY));
      const boxSize = sensorRadius * 2.2; // Reduced from 3 to 2.2 for better proportions
      const boxOffset = boxSize / 2;
      
      // Draw highlighting box based on gas level (only for last updated sensor)
      if (gasValue > 1300) {
        // Red box for critical levels (>1300 ppm)
        ctx.strokeStyle = '#dc3545';
        ctx.lineWidth = Math.max(2, 3 * Math.min(scaleX, scaleY));
        ctx.setLineDash([5, 5]); // Dashed line for urgency
        ctx.strokeRect(x - boxOffset, y - boxOffset, boxSize, boxSize);
        ctx.setLineDash([]); // Reset line dash
        
        // Add pulsing effect
        ctx.save();
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = '#dc3545';
        ctx.fillRect(x - boxOffset, y - boxOffset, boxSize, boxSize);
        ctx.restore();
        
        // Draw gas value with better positioning
        ctx.fillStyle = '#dc3545';
        ctx.font = `bold ${Math.max(9, 11 * Math.min(scaleX, scaleY))}px Arial`;
        ctx.fillText(`${gasValue.toFixed(0)} ppm`, x, y - boxOffset - 8);
        
      } else if (gasValue > 1000) {
        // Yellow box for warning levels (>1000 ppm)
        ctx.strokeStyle = '#ffc107';
        ctx.lineWidth = Math.max(1.5, 2.5 * Math.min(scaleX, scaleY));
        ctx.strokeRect(x - boxOffset, y - boxOffset, boxSize, boxSize);
        
        // Add subtle background
        ctx.save();
        ctx.globalAlpha = 0.2;
        ctx.fillStyle = '#ffc107';
        ctx.fillRect(x - boxOffset, y - boxOffset, boxSize, boxSize);
        ctx.restore();
        
        // Draw gas value with better positioning
        ctx.fillStyle = '#ffc107';
        ctx.font = `bold ${Math.max(9, 11 * Math.min(scaleX, scaleY))}px Arial`;
        ctx.fillText(`${gasValue.toFixed(0)} ppm`, x, y - boxOffset - 8);
      }
    }
  }
}

function updateFloorplanLegend() {
  const legend = document.getElementById('floorplan-legend');
  if (!legend || !systemConfig) return;
  
  legend.innerHTML = '';
  
  // Add sensor legend
  systemConfig.sensors.forEach(sensor => {
    const legendItem = document.createElement('div');
    legendItem.className = 'legend-item';
    legendItem.innerHTML = `
      <div class="legend-color" style="background-color: ${sensor.color}"></div>
      <div class="legend-info">
        <div class="legend-name">${sensor.id}</div>
        <div class="legend-location">ESP32 - MQ6 Sensor ${sensor.sensorId}</div>
      </div>
    `;
    legend.appendChild(legendItem);
  });
  
  // Add alert legend
  const alertLegend = document.createElement('div');
  alertLegend.className = 'alert-legend';
  alertLegend.innerHTML = `
    <h4>Alert Levels</h4>
    <div class="alert-legend-item">
      <div class="alert-legend-box critical"></div>
      <div class="alert-legend-text">Critical: >1300 ppm</div>
    </div>
    <div class="alert-legend-item">
      <div class="alert-legend-box warning"></div>
      <div class="alert-legend-text">Warning: >1000 ppm</div>
    </div>
  `;
  legend.appendChild(alertLegend);
}


function resetFloorplanView() {
  if (floorplanCtx) {
    // Clear highlighting
    lastUpdatedSensor = null;
    if (highlightingTimeout) {
      clearTimeout(highlightingTimeout);
      highlightingTimeout = null;
    }
    
    // Reset to original scaling
    resizeFloorplanCanvas();
    drawFloorplan();
  }
}

// Function to clear sensor highlighting
function clearSensorHighlighting() {
  lastUpdatedSensor = null;
  if (highlightingTimeout) {
    clearTimeout(highlightingTimeout);
    highlightingTimeout = null;
  }
  if (currentTab === 'floorplan') {
    drawSensorsOnFloorplan();
  }
}

// Function to reset system configuration
function resetSystemConfiguration() {
  // Show confirmation dialog
  const confirmed = confirm(
    'Are you sure you want to reset the system configuration?\n\n' +
    'This will:\n' +
    '• Clear all sensor configurations\n' +
    '• Remove the floor plan\n' +
    '• Reset all settings to default\n\n' +
    'This action cannot be undone!'
  );
  
  if (confirmed) {
    try {
      // Clear localStorage
      localStorage.removeItem('gasSystemConfig');
      
      // Clear Firebase configuration if connected
      if (typeof firebase !== 'undefined' && db) {
        db.ref('systemConfig').remove().catch(error => {
          console.warn('Could not clear Firebase config:', error);
        });
      }
      
      // Reset system configuration
      systemConfig = null;
      
      // Clear sensor data
      sensorData = {};
      alertHistory = [];
      
      // Clear sensor elements
      sensorElements = {};
      if (sensorContainer) {
        sensorContainer.innerHTML = '';
      }
      
      // Clear highlighting
      clearSensorHighlighting();
      
      // Show setup section and hide dashboard
      showSetupSection();
      
      // Show success message
      alert('Configuration reset successfully!\n\nYou can now start fresh with the system setup.');
      
    } catch (error) {
      console.error('Error resetting configuration:', error);
      alert('Error resetting configuration. Please try again.');
    }
  }
}

// Drag and drop functionality for sensors
function setupDragAndDrop() {
  if (!floorplanCanvas) return;
  
  floorplanCanvas.addEventListener('mousedown', handleMouseDown);
  floorplanCanvas.addEventListener('mousemove', handleMouseMove);
  floorplanCanvas.addEventListener('mouseup', handleMouseUp);
  floorplanCanvas.addEventListener('mouseleave', handleMouseUp);
  
  // Add touch support for mobile devices
  floorplanCanvas.addEventListener('touchstart', handleTouchStart);
  floorplanCanvas.addEventListener('touchmove', handleTouchMove);
  floorplanCanvas.addEventListener('touchend', handleTouchEnd);
}

function getMousePos(e) {
  const rect = floorplanCanvas.getBoundingClientRect();
  return {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top
  };
}

function getTouchPos(e) {
  const rect = floorplanCanvas.getBoundingClientRect();
  const touch = e.touches[0];
  return {
    x: touch.clientX - rect.left,
    y: touch.clientY - rect.top
  };
}

function isPointInSensor(x, y, sensor) {
  if (!systemConfig || !systemConfig.sensors) return false;
  
  // Calculate scaling factors
  const canvas = floorplanCanvas;
  let scaleX = canvas.width / 800;
  let scaleY = canvas.height / 600;
  let offsetX = 0;
  let offsetY = 0;
  
  if (systemConfig.flowchart && window.floorplanScale) {
    scaleX = window.floorplanScale;
    scaleY = window.floorplanScale;
    offsetX = window.floorplanOffsetX;
    offsetY = window.floorplanOffsetY;
  } else {
    const scale = Math.min(canvas.width / 800, canvas.height / 600);
    scaleX = scale;
    scaleY = scale;
    offsetX = (canvas.width - (800 * scale)) / 2;
    offsetY = (canvas.height - (600 * scale)) / 2;
    const minPadding = 30;
    offsetX = Math.max(offsetX, minPadding);
    offsetY = Math.max(offsetY, minPadding);
  }
  
  const sensorX = offsetX + (sensor.x * scaleX);
  const sensorY = offsetY + (sensor.y * scaleY);
  const sensorRadius = Math.max(12, 15 * Math.min(scaleX, scaleY));
  
  const distance = Math.sqrt((x - sensorX) ** 2 + (y - sensorY) ** 2);
  return distance <= sensorRadius;
}

function handleMouseDown(e) {
  const pos = getMousePos(e);
  handleDragStart(pos);
}

function handleMouseMove(e) {
  if (isDragging) {
    const pos = getMousePos(e);
    handleDragMove(pos);
  }
}

function handleMouseUp(e) {
  handleDragEnd();
}

function handleTouchStart(e) {
  e.preventDefault();
  const pos = getTouchPos(e);
  handleDragStart(pos);
}

function handleTouchMove(e) {
  e.preventDefault();
  if (isDragging) {
    const pos = getTouchPos(e);
    handleDragMove(pos);
  }
}

function handleTouchEnd(e) {
  e.preventDefault();
  handleDragEnd();
}

function handleDragStart(pos) {
  if (!systemConfig || !systemConfig.sensors) return;
  
  // Find which sensor was clicked
  for (let sensor of systemConfig.sensors) {
    if (isPointInSensor(pos.x, pos.y, sensor)) {
      isDragging = true;
      draggedSensor = sensor;
      
      // Calculate scaling factors
      const canvas = floorplanCanvas;
      let scaleX = canvas.width / 800;
      let scaleY = canvas.height / 600;
      let offsetX = 0;
      let offsetY = 0;
      
      if (systemConfig.flowchart && window.floorplanScale) {
        scaleX = window.floorplanScale;
        scaleY = window.floorplanScale;
        offsetX = window.floorplanOffsetX;
        offsetY = window.floorplanOffsetY;
      } else {
        const scale = Math.min(canvas.width / 800, canvas.height / 600);
        scaleX = scale;
        scaleY = scale;
        offsetX = (canvas.width - (800 * scale)) / 2;
        offsetY = (canvas.height - (600 * scale)) / 2;
        const minPadding = 30;
        offsetX = Math.max(offsetX, minPadding);
        offsetY = Math.max(offsetY, minPadding);
      }
      
      const sensorX = offsetX + (sensor.x * scaleX);
      const sensorY = offsetY + (sensor.y * scaleY);
      
      dragOffset.x = pos.x - sensorX;
      dragOffset.y = pos.y - sensorY;
      
      // Change cursor
      floorplanCanvas.style.cursor = 'grabbing';
      break;
    }
  }
}

function handleDragMove(pos) {
  if (!isDragging || !draggedSensor) return;
  
  // Calculate scaling factors
  const canvas = floorplanCanvas;
  let scaleX = canvas.width / 800;
  let scaleY = canvas.height / 600;
  let offsetX = 0;
  let offsetY = 0;
  
  if (systemConfig.flowchart && window.floorplanScale) {
    scaleX = window.floorplanScale;
    scaleY = window.floorplanScale;
    offsetX = window.floorplanOffsetX;
    offsetY = window.floorplanOffsetY;
  } else {
    const scale = Math.min(canvas.width / 800, canvas.height / 600);
    scaleX = scale;
    scaleY = scale;
    offsetX = (canvas.width - (800 * scale)) / 2;
    offsetY = (canvas.height - (600 * scale)) / 2;
    const minPadding = 30;
    offsetX = Math.max(offsetX, minPadding);
    offsetY = Math.max(offsetY, minPadding);
  }
  
  // Calculate new position in original coordinates
  const newX = (pos.x - offsetX - dragOffset.x) / scaleX;
  const newY = (pos.y - offsetY - dragOffset.y) / scaleY;
  
  // Constrain to canvas bounds
  const minX = 50;
  const maxX = 750;
  const minY = 50;
  const maxY = 550;
  
  draggedSensor.x = Math.max(minX, Math.min(maxX, newX));
  draggedSensor.y = Math.max(minY, Math.min(maxY, newY));
  
  // Redraw the floor plan
  drawFloorplan();
}

function handleDragEnd() {
  if (isDragging && draggedSensor) {
    // Save the new position to localStorage
    localStorage.setItem('gasSystemConfig', JSON.stringify(systemConfig));
    
    // Update the legend to reflect the new position
    updateFloorplanLegend();
  }
  
  isDragging = false;
  draggedSensor = null;
  dragOffset = { x: 0, y: 0 };
  floorplanCanvas.style.cursor = 'default';
}

// Analysis functionality
function initializeAnalysis() {
  updateAnalysisData();
  updateStatusSummary();
  updatePeakReadings();
  updateAlertHistory();
}

function updateAnalysisData(timeRange = '24h') {
  // Update trend chart
  drawTrendChart(timeRange);
}

function updateStatusSummary() {
  const summary = document.getElementById('status-summary');
  if (!summary || !systemConfig) return;
  
  let normalCount = 0;
  let warningCount = 0;
  let alertCount = 0;
  
  systemConfig.sensors.forEach(sensor => {
    const sensorElement = document.getElementById(sensor.id);
    if (sensorElement) {
      const value = parseInt(sensorElement.textContent) || 0;
      if (value > 1300) alertCount++;
      else if (value > 1000) warningCount++;
      else normalCount++;
    }
  });
  
  summary.innerHTML = `
    <div class="status-item">
      <span class="status-label">Normal:</span>
      <span class="status-value normal">${normalCount}</span>
    </div>
    <div class="status-item">
      <span class="status-label">Warning:</span>
      <span class="status-value warning">${warningCount}</span>
    </div>
    <div class="status-item">
      <span class="status-label">Alert:</span>
      <span class="status-value alert">${alertCount}</span>
    </div>
  `;
}

function updatePeakReadings() {
  const peakReadings = document.getElementById('peak-readings');
  if (!peakReadings || !systemConfig) return;
  
  let peaks = [];
  
  systemConfig.sensors.forEach(sensor => {
    const sensorElement = document.getElementById(sensor.id);
    if (sensorElement) {
      const value = parseInt(sensorElement.textContent) || 0;
      peaks.push({
        sensor: sensor.id,
        value: value
      });
    }
  });
  
  peaks.sort((a, b) => b.value - a.value);
  
  peakReadings.innerHTML = peaks.slice(0, 5).map(peak => `
    <div class="peak-item">
      <span class="peak-sensor">${peak.sensor}</span>
      <span class="peak-value">${peak.value} ppm</span>
    </div>
  `).join('');
}

function updateAlertHistory() {
  const alertHistoryEl = document.getElementById('alert-history');
  if (!alertHistoryEl) return;
  
  const recentAlerts = alertHistory.slice(-10).reverse();
  
  alertHistoryEl.innerHTML = recentAlerts.map(alert => `
    <div class="alert-item">
      <div class="alert-time">${alert.time}</div>
      <div class="alert-sensor">${alert.sensor}</div>
      <div class="alert-level ${alert.level.toLowerCase()}">${alert.level}</div>
      <div class="alert-value">${alert.value} ppm</div>
    </div>
  `).join('');
}

function addAlertHistory(sensorId, value, level) {
  alertHistory.push({
    sensor: sensorId,
    value: value,
    level: level,
    time: new Date().toLocaleTimeString()
  });
  
  // Keep only last 50 alerts
  if (alertHistory.length > 50) {
    alertHistory = alertHistory.slice(-50);
  }
}

function drawTrendChart(timeRange) {
  const canvas = document.getElementById('trend-chart');
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;
  
  // Clear canvas
  ctx.clearRect(0, 0, width, height);
  
  // Draw simple trend chart
  ctx.strokeStyle = '#ff4500';
  ctx.lineWidth = 2;
  ctx.beginPath();
  
  // Simple mock data for demonstration
  const dataPoints = 20;
  for (let i = 0; i < dataPoints; i++) {
    const x = (i / (dataPoints - 1)) * width;
    const y = height - (Math.random() * height * 0.8 + height * 0.1);
    
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }
  
  ctx.stroke();
  
  // Draw axes
  ctx.strokeStyle = '#dee2e6';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, height - 20);
  ctx.lineTo(width, height - 20);
  ctx.moveTo(20, 0);
  ctx.lineTo(20, height);
  ctx.stroke();
}

function updateLastUpdateTime() {
  const lastUpdate = document.getElementById('last-update');
  if (lastUpdate) {
    lastUpdate.textContent = `Last Update: ${new Date().toLocaleTimeString()}`;
  }
}

// Data validation function
function validateSensorData(data, sensorId) {
  const result = {
    isValid: false,
    value: null,
    error: null
  };
  
  // Check if data exists
  if (!data || data.value === undefined || data.value === null) {
    result.error = 'No data received';
    return result;
  }
  
  // Check if value is a number
  const value = parseFloat(data.value);
  if (isNaN(value)) {
    result.error = 'Invalid numeric value';
    return result;
  }
  
  // Check if value is within reasonable range (0-10000 ppm for MQ6 sensor)
  if (value < 0 || value > 10000) {
    result.error = `Value out of range: ${value} ppm (expected 0-10000)`;
    return result;
  }
  
  // Check timestamp if provided
  if (data.timestamp) {
    const timestamp = new Date(data.timestamp);
    if (isNaN(timestamp.getTime())) {
      result.error = 'Invalid timestamp';
      return result;
    }
    
    // Check if timestamp is not too old (more than 5 minutes)
    const now = new Date();
    const timeDiff = now.getTime() - timestamp.getTime();
    if (timeDiff > 5 * 60 * 1000) { // 5 minutes
      result.error = 'Data too old';
      return result;
    }
  }
  
  result.isValid = true;
  result.value = value;
  return result;
}

// Connection monitoring function
function setupConnectionMonitoring() {
  const connectedRef = db.ref('.info/connected');
  
  connectedRef.on('value', (snapshot) => {
    const isConnected = snapshot.val();
    updateSystemStatus(isConnected);
  });
}

function updateSystemStatus(isConnected) {
  const systemStatusElement = document.getElementById('system-status');
  const systemStatusText = document.getElementById('system-status-text');
  
  if (isConnected) {
    systemStatusElement.style.backgroundColor = '#28a745';
    systemStatusElement.style.boxShadow = '0 0 10px rgba(40, 167, 69, 0.5)';
    systemStatusText.textContent = 'System Online';
    systemStatusText.style.color = '#28a745';
  } else {
    systemStatusElement.style.backgroundColor = '#dc3545';
    systemStatusElement.style.boxShadow = '0 0 10px rgba(220, 53, 69, 0.5)';
    systemStatusText.textContent = 'System Offline';
    systemStatusText.style.color = '#dc3545';
    
    // Show reconnection message
    showReconnectionMessage();
  }
}

function showReconnectionMessage() {
  // Create or update reconnection message
  let reconnectMsg = document.getElementById('reconnect-message');
  if (!reconnectMsg) {
    reconnectMsg = document.createElement('div');
    reconnectMsg.id = 'reconnect-message';
    reconnectMsg.className = 'reconnect-message';
    reconnectMsg.innerHTML = `
      <div class="reconnect-content">
        <span class="reconnect-icon">🔄</span>
        <span class="reconnect-text">Attempting to reconnect to Firebase...</span>
      </div>
    `;
    document.querySelector('.system-status').appendChild(reconnectMsg);
  }
  
  reconnectMsg.style.display = 'block';
  
  // Hide message when reconnected
  const connectedRef = db.ref('.info/connected');
  const unsubscribe = connectedRef.on('value', (snapshot) => {
    if (snapshot.val()) {
      reconnectMsg.style.display = 'none';
      unsubscribe();
    }
  });
}

// Enhanced last update time with better formatting
function updateLastUpdateTime() {
  const lastUpdate = document.getElementById('last-update');
  if (lastUpdate) {
    const now = new Date();
    const timeString = now.toLocaleTimeString();
    const dateString = now.toLocaleDateString();
    lastUpdate.textContent = `Last Update: ${timeString} (${dateString})`;
    lastUpdate.style.color = '#28a745';
  }
}



// Function to update highlighting status indicator
function updateHighlightingStatus() {
  const statusElement = document.getElementById('highlighting-status');
  if (!statusElement || !systemConfig || !systemConfig.sensors) return;
  
  // Show information about the last updated sensor
  if (lastUpdatedSensor) {
    const sensorElement = document.getElementById(lastUpdatedSensor);
    if (sensorElement) {
      const value = parseFloat(sensorElement.textContent) || 0;
      const timeAgo = Math.floor((Date.now() - lastUpdateTime) / 1000);
      
      if (value > 1300) {
        statusElement.innerHTML = `🚨 Last Update: ${lastUpdatedSensor} - ${value.toFixed(0)} ppm (Critical) - ${timeAgo}s ago`;
        statusElement.style.background = '#f8d7da';
        statusElement.style.color = '#721c24';
        statusElement.style.borderColor = '#f5c6cb';
      } else if (value > 1000) {
        statusElement.innerHTML = `⚠️ Last Update: ${lastUpdatedSensor} - ${value.toFixed(0)} ppm (Warning) - ${timeAgo}s ago`;
        statusElement.style.background = '#fff3cd';
        statusElement.style.color = '#856404';
        statusElement.style.borderColor = '#ffeaa7';
      } else {
        statusElement.innerHTML = `🟢 Last Update: ${lastUpdatedSensor} - ${value.toFixed(0)} ppm (Normal) - ${timeAgo}s ago`;
        statusElement.style.background = '#d4edda';
        statusElement.style.color = '#155724';
        statusElement.style.borderColor = '#c3e6cb';
      }
    }
  } else {
    statusElement.innerHTML = `🟢 Waiting for sensor data...`;
    statusElement.style.background = '#d4edda';
    statusElement.style.color = '#155724';
    statusElement.style.borderColor = '#c3e6cb';
  }
}

// Load configuration from Firebase on startup
db.ref('systemConfig').on('value', snapshot => {
  const config = snapshot.val();
  if (config && !systemConfig) {
    systemConfig = config;
    localStorage.setItem('gasSystemConfig', JSON.stringify(config));
    initializeDashboard();
  }
});
