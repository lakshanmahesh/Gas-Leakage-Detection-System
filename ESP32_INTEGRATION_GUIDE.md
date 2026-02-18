# ESP32 Integration Guide - Gas Detector Dashboard

## ✅ **Dashboard Updated for ESP32 Integration**

Your dashboard has been successfully modified to work with your ESP32 gas detection system. Here are the key changes made:

## **🔄 Firebase Data Path Changes**

### **ESP32 Code (Your Hardware)**
```cpp
// Your ESP32 sends data to these paths:
Firebase.RTDB.setInt(&fbdo, "/gas/sensor1", gas1);
Firebase.RTDB.setInt(&fbdo, "/gas/sensor2", gas2);
```

### **Dashboard Code (Updated)**
```javascript
// Dashboard now listens to the correct paths:
const sensorPaths = [
  { path: 'gas/sensor1', id: 'ESP1_Sensor1', espId: '1', sensorId: '1' },
  { path: 'gas/sensor2', id: 'ESP1_Sensor2', espId: '1', sensorId: '2' }
];
```

## **📊 Sensor Configuration**

### **Fixed Sensor Setup**
- **ESP1_Sensor1**: MQ6 Sensor 1 (Blue indicator)
- **ESP1_Sensor2**: MQ6 Sensor 2 (Green indicator)
- **Position**: Pre-configured for floor plan display
- **Thresholds**: Matching your ESP32 code

### **Alert Thresholds (Matching ESP32)**
```javascript
// Dashboard thresholds now match your ESP32 code:
if (value > 1300) {
  // Critical Alert (Red LED on ESP32)
  statusText.textContent = 'CRITICAL ALERT!';
} else if (value > 1000) {
  // Warning (Yellow LED on ESP32)  
  statusText.textContent = 'WARNING';
} else {
  // Normal (Green LED on ESP32)
  statusText.textContent = 'NORMAL';
}
```

## **🎯 Real-time Features**

### **Live Data Display**
- ✅ Real-time gas readings from ESP32
- ✅ Status indicators (Normal/Warning/Critical)
- ✅ Last update timestamps
- ✅ Connection status monitoring

### **Floor Plan Highlighting**
- ✅ **Red boxes** around sensors with values > 1300 ppm
- ✅ **Yellow boxes** around sensors with values > 1000 ppm
- ✅ **Gas values displayed** on floor plan for high readings
- ✅ **Real-time updates** as ESP32 sends new data

### **Analysis Dashboard**
- ✅ Current status summary
- ✅ Peak readings tracking
- ✅ Alert history log
- ✅ Trend visualization

## **🔧 Technical Changes Made**

### **1. Firebase Path Updates**
```javascript
// OLD (Generic setup):
const sensorPath = `gas/ESP${sensor.espId}/sensor${sensor.sensorId}`;

// NEW (ESP32 specific):
const sensorPath = `gas/sensor${sensor.sensorId}`;
```

### **2. Data Format Handling**
```javascript
// ESP32 sends raw integer values, dashboard handles them:
const gasValue = typeof data === 'number' ? data : (data.value || data);
```

### **3. Sensor Configuration**
```javascript
// Fixed configuration for your 2 sensors:
const esp32Sensors = [
  { id: 'ESP1_Sensor1', espId: '1', sensorId: '1', color: '#007bff', x: 200, y: 150 },
  { id: 'ESP1_Sensor2', espId: '1', sensorId: '2', color: '#28a745', x: 400, y: 300 }
];
```

## **🚀 How to Test**

### **1. Start Your ESP32**
- Upload your code to ESP32
- Ensure WiFi connection
- Verify Firebase connection

### **2. Start Dashboard**
```bash
npm start
```
- Open browser to `http://localhost:3000`
- Dashboard will automatically connect to Firebase

### **3. Verify Data Flow**
- Check "Real-time Readings" tab for live data
- Check "Floor Plan" tab for sensor highlighting
- Check "Analysis" tab for status summary

## **📱 Dashboard Features**

### **Real-time Readings Tab**
- Live gas level display
- Status indicators with colors
- Connection status
- Data simulation (for testing without ESP32)

### **Floor Plan Tab**
- Visual sensor locations
- Real-time highlighting based on gas levels
- Sensor legend with alert levels
- Responsive design

### **Analysis Tab**
- Current status summary
- Peak readings
- Alert history
- Trend charts

## **🔍 Troubleshooting**

### **If No Data Appears:**
1. Check ESP32 serial monitor for connection status
2. Verify Firebase credentials in ESP32 code
3. Check browser console for Firebase connection errors
4. Ensure ESP32 is sending data to correct paths

### **If Floor Plan Not Showing:**
1. Check if sensors are configured in setup
2. Verify canvas element is properly initialized
3. Check browser console for JavaScript errors

### **If Highlighting Not Working:**
1. Verify gas values are being received
2. Check threshold values match ESP32 code
3. Ensure floor plan canvas is properly sized

## **🎨 Visual Indicators**

### **Status Colors**
- 🟢 **Green**: Normal operation (<1000 ppm)
- 🟡 **Yellow**: Warning level (1000-1300 ppm)  
- 🔴 **Red**: Critical level (>1300 ppm)

### **Floor Plan Highlighting**
- **No Box**: Normal values
- **Yellow Box**: Warning values (>1000 ppm)
- **Red Box**: Critical values (>1300 ppm)

## **📋 Next Steps**

1. **Test with ESP32**: Upload your code and verify data flow
2. **Customize Floor Plan**: Use setup page to draw your actual facility layout
3. **Adjust Thresholds**: Modify values in ESP32 code if needed
4. **Add More Sensors**: Extend configuration for additional sensors

Your dashboard is now fully integrated with your ESP32 gas detection system! 🎉

