# Gas Leakage Monitoring System

A comprehensive gas leakage monitoring system with ESP modules and MQ6 sensors, featuring a web-based dashboard and setup interface.

## Features

- **Real-time Monitoring**: Live gas level monitoring from multiple ESP modules with instant updates
- **Enhanced Visual Feedback**: Animated status indicators, color-coded alerts, and real-time value updates
- **Connection Monitoring**: Automatic Firebase connection status monitoring with reconnection handling
- **Data Validation**: Comprehensive sensor data validation with error handling
- **Interactive Setup**: Easy system configuration with flowchart drawing board
- **Sensor Placement**: Visual sensor placement on custom flowcharts
- **Alert System**: Automatic alerts for high gas levels with visual and audio indicators
- **Test Simulation**: Built-in data simulation for testing and demonstration
- **Responsive Design**: Works on desktop and mobile devices
- **Firebase Integration**: Real-time data synchronization with error recovery

## System Components

### Frontend
- **Dashboard** (`index.html`): Main monitoring interface
- **Setup Page** (`setup.html`): System configuration and sensor placement
- **Drawing Board**: Interactive flowchart creation with sensor placement

### Backend
- **Node.js Server** (`server.js`): REST API for data management
- **Firebase Integration**: Real-time database for sensor data
- **File Upload**: Flowchart image storage

## Installation

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Configure Firebase**
   - Download your Firebase service account key
   - Replace `firebase-service-account.json` with your actual credentials
   - Update Firebase configuration in `script.js` and `setup.js`

3. **Start the Server**
   ```bash
   npm start
   ```

4. **Access the Application**
   - Dashboard: `http://localhost:3000`
   - Setup: `http://localhost:3000/setup`

## Usage

### Initial Setup

1. **First Time Setup**
   - Click "System Setup" button on the dashboard
   - Configure number of ESP modules and sensors per ESP
   - Create a flowchart of your facility layout
   - Place sensors on the flowchart by clicking locations
   - Review and save configuration

2. **ESP Module Integration**
   - ESP modules should send data to: `POST /api/sensors/:espId/:sensorId`
   - Data format: `{ "value": 250, "timestamp": 1234567890 }`

### Dashboard Features

- **Real-time Monitoring**: Live gas level readings from all sensors with instant updates
- **Enhanced Status Indicators**: 
  - Normal (Green): Gas levels below 500 ppm
  - Warning (Yellow): Gas levels 500-1000 ppm with pulsing animation
  - High Alert (Red): Gas levels above 1000 ppm with urgent pulsing
  - Disconnected (Gray): No data received from sensor
  - Error (Red): Connection or data validation errors
- **Connection Status**: Real-time Firebase connection monitoring
- **Data Validation**: Automatic validation of sensor readings with error handling
- **Test Simulation**: Built-in data simulation for testing (click "Start Data Simulation")
- **Responsive Layout**: Adapts to different screen sizes
- **Visual Animations**: Smooth transitions and animations for better user experience

### Setup Page Features

- **Step 1**: Basic configuration (ESP count, sensors per ESP)
- **Step 2**: Flowchart creation and sensor placement
- **Step 3**: Review and save configuration

## API Endpoints

### Configuration
- `GET /api/config` - Get system configuration
- `POST /api/config` - Save system configuration

### Sensor Data
- `GET /api/sensors` - Get all sensor data
- `POST /api/sensors/:espId/:sensorId` - Update sensor data

### System Status
- `GET /api/status` - Get system status and statistics

### File Upload
- `POST /api/upload-flowchart` - Upload flowchart image

## ESP Module Integration

Your ESP modules should send HTTP POST requests to update sensor data:

```cpp
// Example ESP32 code
#include <WiFi.h>
#include <HTTPClient.h>

void sendSensorData(int espId, int sensorId, float value) {
  HTTPClient http;
  http.begin("http://your-server:3000/api/sensors/" + String(espId) + "/" + String(sensorId));
  http.addHeader("Content-Type", "application/json");
  
  String jsonData = "{\"value\":" + String(value) + ",\"timestamp\":" + String(millis()) + "}";
  int httpResponseCode = http.POST(jsonData);
  
  if (httpResponseCode > 0) {
    Serial.println("Data sent successfully");
  }
  http.end();
}
```

## File Structure

```
GasDetectorDashbord/
├── index.html              # Main dashboard
├── setup.html              # Setup page
├── script.js               # Dashboard JavaScript
├── setup.js                # Setup page JavaScript
├── style.css               # Main styles
├── setup.css               # Setup page styles
├── server.js               # Node.js backend server
├── package.json            # Node.js dependencies
├── firebase-service-account.json  # Firebase credentials
└── README.md               # This file
```

## Configuration

### Firebase Setup
1. Create a Firebase project
2. Enable Realtime Database
3. Download service account key
4. Update `firebase-service-account.json`

### Environment Variables
- `PORT`: Server port (default: 3000)

## Testing Real-time Functionality

### Using the Built-in Simulation

1. **Start the Server**
   ```bash
   npm start
   ```

2. **Access the Dashboard**
   - Open `http://localhost:3000` in your browser
   - Complete the initial setup if prompted

3. **Enable Data Simulation**
   - Click the "🧪 Start Data Simulation" button
   - Watch real-time gas values update automatically
   - Observe different status indicators (Normal/Warning/High Alert)
   - Test connection status by disconnecting from internet

4. **Stop Simulation**
   - Click "⏹️ Stop Simulation" to stop the test data

### Testing with Real ESP Modules

1. **Configure Your ESP Modules**
   - Use the provided ESP32 code example
   - Update the server URL in your ESP code
   - Ensure proper WiFi connectivity

2. **Monitor Real Data**
   - ESP modules will send data automatically
   - Dashboard will display real sensor readings
   - Alerts will trigger based on actual gas levels

## Troubleshooting

### Common Issues

1. **Firebase Connection Error**
   - Check Firebase credentials in `firebase-service-account.json`
   - Verify database rules allow read/write access
   - Check internet connectivity

2. **ESP Module Not Connecting**
   - Verify network connectivity
   - Check API endpoint URLs in ESP code
   - Ensure proper JSON format in data payload
   - Check server logs for incoming requests

3. **Setup Page Not Loading**
   - Check browser console for errors
   - Verify all CSS/JS files are accessible
   - Clear browser cache and reload

4. **Real-time Updates Not Working**
   - Check Firebase connection status indicator
   - Verify sensor data is being received in browser console
   - Test with simulation mode first
   - Check Firebase database for incoming data

## Development

### Running in Development Mode
```bash
npm run dev
```

### Adding New Features
1. Update frontend HTML/CSS/JS as needed
2. Add new API endpoints in `server.js`
3. Update Firebase database structure if required

## License

MIT License - see LICENSE file for details

## Support

For support and questions, please check the troubleshooting section or create an issue in the project repository.
