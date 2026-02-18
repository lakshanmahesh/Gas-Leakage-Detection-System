# Gas Leakage Monitoring System
A real-time gas leak monitoring system with ESP32 and MQ6 sensors.

## 🚀 Quick Start
bash
npm install
npm start
Access: http://localhost:3000

## 📊 Features
Live Monitoring: Real-time gas readings (Normal/Warning/Critical)

Floor Plan: Visual sensor placement with color alerts

Easy Setup: Configure ESP modules and sensor positions

Alert System: Visual indicators for gas levels

🟢 Normal (<1000 ppm)

🟡 Warning (1000-1300 ppm)

🔴 Critical (>1300 ppm)

🔧 ESP32 Setup


     // Send data to Firebase
    Firebase.RTDB.setInt(&fbdo, "/gas/sensor1", value);
    Firebase.RTDB.setInt(&fbdo, "/gas/sensor2", value);
     
## 📁 Structure
index.html - Main dashboard

setup.html - Configuration page

server.js - Backend server

## 🔌 API

    POST /api/sensors/:espId/:sensorId - Update sensor data

## ⚙️ Requirements
Node.js 14+

Firebase account

ESP32 with MQ6 sensors
