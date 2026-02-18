// Setup Page JavaScript
class SetupManager {
  constructor() {
    this.currentStep = 1;
         this.config = {
       espCount: 2,
       sensorsPerEsp: 2,
       espModules: [],
       sensors: [],
       flowchart: null
     };
    
    this.canvas = document.getElementById('flowchart-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.previewCanvas = document.getElementById('preview-canvas');
    this.previewCtx = this.previewCanvas.getContext('2d');
    
         this.drawingMode = 'line';
     this.isDrawing = false;
     this.lastX = 0;
     this.lastY = 0;
     this.sensorCounter = 0;
     this.startX = 0;
     this.startY = 0;
     this.tempShape = null;
     this.lastLineEnd = null;
     
     // Advanced editing features
     this.history = [];
     this.historyIndex = -1;
     this.selectedObject = null;
     this.selectedVertex = null;
     this.isDragging = false;
     this.dragStart = { x: 0, y: 0 };
     this.objects = [];
     this.nextObjectId = 1;
     this.currentFreeDraw = null;
    
    this.init();
  }
  
  init() {
    this.setupEventListeners();
    this.setupCanvas();
    this.loadExistingConfig();
  }
  
  setupEventListeners() {
    // Navigation buttons
    document.getElementById('back-btn').addEventListener('click', () => {
      window.location.href = 'index.html';
    });
    
    document.getElementById('next-step1').addEventListener('click', () => {
      this.saveStep1Data();
      this.goToStep(2);
    });
    
    // ESP configuration event listeners
    document.getElementById('esp-count').addEventListener('change', () => {
      this.updateEspConfiguration();
    });
    
    document.getElementById('sensors-per-esp').addEventListener('change', () => {
      this.updateEspConfiguration();
    });
    
    document.getElementById('prev-step2').addEventListener('click', () => {
      this.goToStep(1);
    });
    
    document.getElementById('next-step2').addEventListener('click', () => {
      this.goToStep(3);
    });
    
    document.getElementById('prev-step3').addEventListener('click', () => {
      this.goToStep(2);
    });
    
    document.getElementById('save-config').addEventListener('click', () => {
      this.saveConfiguration();
    });
    
         // Drawing controls
     document.getElementById('draw-mode').addEventListener('click', () => {
       this.setDrawingMode('draw');
     });
     
     document.getElementById('line-mode').addEventListener('click', () => {
       this.setDrawingMode('line');
     });
     
     document.getElementById('half-curve-mode').addEventListener('click', () => {
       this.setDrawingMode('half-curve');
     });
     
     document.getElementById('full-curve-mode').addEventListener('click', () => {
       this.setDrawingMode('full-curve');
     });
     
     document.getElementById('sensor-mode').addEventListener('click', () => {
       this.setDrawingMode('sensor');
     });
     
     document.getElementById('erase-mode').addEventListener('click', () => {
       this.setDrawingMode('erase');
     });
     
     document.getElementById('select-mode').addEventListener('click', () => {
       this.setDrawingMode('select');
     });
     
     document.getElementById('vertex-mode').addEventListener('click', () => {
       this.setDrawingMode('vertex');
     });
     
     document.getElementById('undo-btn').addEventListener('click', () => {
       this.undo();
     });
     
     document.getElementById('redo-btn').addEventListener('click', () => {
       this.redo();
     });
    
    document.getElementById('clear-canvas').addEventListener('click', () => {
      this.clearCanvas();
    });
    
    document.getElementById('reset-all').addEventListener('click', () => {
      this.resetAllConfiguration();
    });
    
    // Canvas events
    this.canvas.addEventListener('mousedown', (e) => this.startDrawing(e));
    this.canvas.addEventListener('mousemove', (e) => this.draw(e));
    this.canvas.addEventListener('mouseup', () => this.stopDrawing());
    this.canvas.addEventListener('mouseout', () => this.stopDrawing());
    this.canvas.addEventListener('click', (e) => this.handleClick(e));
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z' && !e.shiftKey) {
          e.preventDefault();
          this.undo();
        } else if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) {
          e.preventDefault();
          this.redo();
        }
      }
    });
    
    // Touch events for mobile
    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      const mouseEvent = new MouseEvent('mousedown', {
        clientX: touch.clientX,
        clientY: touch.clientY
      });
      this.canvas.dispatchEvent(mouseEvent);
    });
    
    this.canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      const mouseEvent = new MouseEvent('mousemove', {
        clientX: touch.clientX,
        clientY: touch.clientY
      });
      this.canvas.dispatchEvent(mouseEvent);
    });
    
    this.canvas.addEventListener('touchend', (e) => {
      e.preventDefault();
      const mouseEvent = new MouseEvent('mouseup', {});
      this.canvas.dispatchEvent(mouseEvent);
    });
  }
  
  setupCanvas() {
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    this.ctx.strokeStyle = '#000000';
    this.ctx.lineWidth = 4;
    
    // Initialize history with empty canvas
    this.saveState();
    this.updateUndoRedoButtons();
  }
  
  loadExistingConfig() {
    // Check if configuration already exists
    const existingConfig = localStorage.getItem('gasSystemConfig');
    if (existingConfig) {
      this.config = JSON.parse(existingConfig);
      document.getElementById('esp-count').value = this.config.espCount;
      document.getElementById('sensors-per-esp').value = this.config.sensorsPerEsp;
      
      if (this.config.flowchart) {
        this.loadFlowchart();
      }
    }
    
    // Initialize ESP configuration
    this.updateEspConfiguration();
  }
  
  updateEspConfiguration() {
    const espCount = parseInt(document.getElementById('esp-count').value);
    const defaultSensorsPerEsp = parseInt(document.getElementById('sensors-per-esp').value);
    
    // Update config
    this.config.espCount = espCount;
    this.config.sensorsPerEsp = defaultSensorsPerEsp;
    
    // Store existing ESP configurations to preserve individual sensor counts
    const existingEspModules = [...this.config.espModules];
    
    // Initialize or update ESP modules
    this.config.espModules = [];
    for (let i = 1; i <= espCount; i++) {
      // Check if ESP module already exists to preserve individual sensor counts
      const existingEsp = existingEspModules.find(esp => esp.id === i);
      const sensorCount = existingEsp ? existingEsp.sensorCount : defaultSensorsPerEsp;
      
      this.config.espModules.push({
        id: i,
        name: `ESP Module ${i}`,
        sensorCount: Math.min(sensorCount, 5) // Ensure max 5 sensors per ESP
      });
    }
    
    this.renderEspConfiguration();
  }
  
  renderEspConfiguration() {
    const container = document.getElementById('esp-config-container');
    container.innerHTML = '';
    
    this.config.espModules.forEach(espModule => {
      const espConfig = document.createElement('div');
      espConfig.className = 'esp-module-config';
      espConfig.innerHTML = `
        <div class="esp-module-header">
          <div class="esp-module-title">${espModule.name}</div>
          <div class="esp-sensor-count">
            <label>Sensors:</label>
            <input type="number" 
                   id="esp-${espModule.id}-sensors" 
                   min="1" 
                   max="5" 
                   value="${espModule.sensorCount}"
                   data-esp-id="${espModule.id}">
          </div>
        </div>
      `;
      
      container.appendChild(espConfig);
    });
    
    // Add event listeners for individual ESP sensor counts
    this.config.espModules.forEach(espModule => {
      const input = document.getElementById(`esp-${espModule.id}-sensors`);
      input.addEventListener('change', (e) => {
        const espId = parseInt(e.target.dataset.espId);
        const sensorCount = parseInt(e.target.value);
        
        // Update the ESP module configuration
        const espModule = this.config.espModules.find(esp => esp.id === espId);
        if (espModule) {
          espModule.sensorCount = sensorCount;
        }
      });
    });
  }
  
  goToStep(step) {
    // Hide all steps
    document.querySelectorAll('.setup-step').forEach(stepEl => {
      stepEl.classList.remove('active');
    });
    
    // Show current step
    document.getElementById(`step${step}`).classList.add('active');
    this.currentStep = step;
    
    if (step === 3) {
      this.generateReview();
    }
  }
  
  saveStep1Data() {
    this.config.espCount = parseInt(document.getElementById('esp-count').value);
    this.config.sensorsPerEsp = parseInt(document.getElementById('sensors-per-esp').value);
    
    // Save individual ESP module configurations
    this.config.espModules.forEach(espModule => {
      const input = document.getElementById(`esp-${espModule.id}-sensors`);
      if (input) {
        espModule.sensorCount = parseInt(input.value);
      }
    });
  }
  
  setDrawingMode(mode) {
    this.drawingMode = mode;
    
    // Clear selection when switching modes
    this.selectedObject = null;
    this.selectedVertex = null;
    this.clearSelectionHandles();
    
    // Update button states
    document.querySelectorAll('.tool-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    
    document.getElementById(`${mode}-mode`).classList.add('active');
    
    // Change cursor and reset line connection for shape tools
    if (mode === 'sensor') {
      this.canvas.style.cursor = 'crosshair';
      this.updateSensorModeButton();
    } else if (mode === 'erase') {
      this.canvas.style.cursor = 'grab';
    } else if (mode === 'select') {
      this.canvas.style.cursor = 'default';
    } else if (mode === 'vertex') {
      this.canvas.style.cursor = 'move';
    } else if (mode === 'line' || mode === 'half-curve' || mode === 'full-curve') {
      this.canvas.style.cursor = 'crosshair';
      this.lastLineEnd = null; // Reset line connection for new shape sequence
    } else {
      this.canvas.style.cursor = 'crosshair';
    }
  }
  
     getMousePos(e) {
     const rect = this.canvas.getBoundingClientRect();
     return {
       x: e.clientX - rect.left,
       y: e.clientY - rect.top
     };
   }
   
   handleClick(e) {
     if (this.drawingMode === 'line' && !this.isDrawing) {
       // For line tool, create a line from last point to current click
       const pos = this.getMousePos(e);
       
       if (this.lastLineEnd) {
         // Create line object
         const lineObj = {
           id: this.nextObjectId++,
           type: 'line',
           startX: this.lastLineEnd.x,
           startY: this.lastLineEnd.y,
           endX: pos.x,
           endY: pos.y,
           color: document.getElementById('line-color').value,
           lineWidth: parseInt(document.getElementById('line-width').value)
         };
         
         this.objects.push(lineObj);
         this.drawObject(lineObj);
         this.saveState();
       }
       
       // Update last line end point
       this.lastLineEnd = { x: pos.x, y: pos.y };
     } else if ((this.drawingMode === 'half-curve' || this.drawingMode === 'full-curve') && !this.isDrawing) {
       // For curve tools, create a single curve on click
       const pos = this.getMousePos(e);
       
       if (this.lastLineEnd) {
         // Create curve object
         const curveObj = {
           id: this.nextObjectId++,
           type: this.drawingMode,
           startX: this.lastLineEnd.x,
           startY: this.lastLineEnd.y,
           endX: pos.x,
           endY: pos.y,
           color: document.getElementById('line-color').value,
           lineWidth: parseInt(document.getElementById('line-width').value)
         };
         
         this.objects.push(curveObj);
         this.drawObject(curveObj);
         this.saveState();
       }
       
       // Update last line end point
       this.lastLineEnd = { x: pos.x, y: pos.y };
     } else if (this.drawingMode === 'select') {
       // Handle selection
       const pos = this.getMousePos(e);
       const clickedObject = this.getObjectAt(pos.x, pos.y);
       
       if (clickedObject) {
         this.selectedObject = clickedObject;
         this.showSelectionHandles(clickedObject);
       } else {
         this.selectedObject = null;
         this.clearSelectionHandles();
       }
     } else if (this.drawingMode === 'vertex') {
       // Handle vertex editing
       const pos = this.getMousePos(e);
       const clickedObject = this.getObjectAt(pos.x, pos.y);
       
       if (clickedObject) {
         this.selectedObject = clickedObject;
         this.showVertexHandles(clickedObject);
       } else {
         this.selectedObject = null;
         this.clearSelectionHandles();
       }
     }
   }
  
     startDrawing(e) {
     this.isDrawing = true;
     const pos = this.getMousePos(e);
     this.lastX = pos.x;
     this.lastY = pos.y;
     this.startX = pos.x;
     this.startY = pos.y;
     this.dragStart = pos;
     
     if (this.drawingMode === 'sensor') {
       this.placeSensor(pos.x, pos.y);
     } else if (this.drawingMode === 'line' || this.drawingMode === 'half-curve' || this.drawingMode === 'full-curve') {
       // For line and curve tools, just set the starting point
       if (!this.lastLineEnd) {
         this.lastLineEnd = { x: pos.x, y: pos.y };
       }
     } else if (this.drawingMode === 'select' && this.selectedObject) {
       // Start moving selected object
       this.isDragging = true;
     } else if (this.drawingMode === 'draw') {
       // Only free draw uses the old drag behavior
       // No special handling needed here
     }
   }
  
     draw(e) {
     if (!this.isDrawing) return;
     
     const pos = this.getMousePos(e);
     
     if (this.drawingMode === 'draw') {
       this.ctx.beginPath();
       this.ctx.moveTo(this.lastX, this.lastY);
       this.ctx.lineTo(pos.x, pos.y);
       this.ctx.stroke();
       this.lastX = pos.x;
       this.lastY = pos.y;
       
       // Save free-draw segments
       if (!this.currentFreeDraw) {
         this.currentFreeDraw = {
           id: this.nextObjectId++,
           type: 'free-draw',
           segments: [],
           color: document.getElementById('line-color').value,
           lineWidth: parseInt(document.getElementById('line-width').value)
         };
       }
       
       this.currentFreeDraw.segments.push({
         startX: this.lastX,
         startY: this.lastY,
         endX: pos.x,
         endY: pos.y
       });
     } else if (this.drawingMode === 'erase') {
       this.ctx.globalCompositeOperation = 'destination-out';
       this.ctx.beginPath();
       this.ctx.arc(pos.x, pos.y, 20, 0, Math.PI * 2);
       this.ctx.fill();
       this.ctx.globalCompositeOperation = 'source-over';
     } else if (this.drawingMode === 'select' && this.isDragging && this.selectedObject) {
       // Move selected object
       const dx = pos.x - this.dragStart.x;
       const dy = pos.y - this.dragStart.y;
       
       if (this.selectedObject.type === 'line' || this.selectedObject.type === 'half-curve' || this.selectedObject.type === 'full-curve') {
         this.selectedObject.startX += dx;
         this.selectedObject.startY += dy;
         this.selectedObject.endX += dx;
         this.selectedObject.endY += dy;
       } else if (this.selectedObject.type === 'free-draw') {
         // Move all segments of free-draw
         for (const segment of this.selectedObject.segments) {
           segment.startX += dx;
           segment.startY += dy;
           segment.endX += dx;
           segment.endY += dy;
         }
       }
       
       this.dragStart = pos;
       this.redrawCanvas();
       this.showSelectionHandles(this.selectedObject);
     }
     // Line and curve tools now use click-based drawing, not drag
   }
  
     stopDrawing() {
     this.isDrawing = false;
     
     // Save state if we moved an object
     if (this.drawingMode === 'select' && this.isDragging && this.selectedObject) {
       this.saveState();
     }
     
     // Save free-draw object
     if (this.drawingMode === 'draw' && this.currentFreeDraw && this.currentFreeDraw.segments.length > 0) {
       this.objects.push(this.currentFreeDraw);
       this.currentFreeDraw = null;
       this.saveState();
     }
     
     this.isDragging = false;
     
     // Finalize shape drawing
     if (this.tempShape) {
       this.drawShape(this.tempShape);
       this.tempShape = null;
     }
   }
   
   redrawCanvasWithTempShape() {
     // Save current canvas state
     const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
     
     // Clear canvas
     this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
     
     // Restore canvas
     this.ctx.putImageData(imageData, 0, 0);
     
     // Draw temporary shape
     if (this.tempShape) {
       this.drawShape(this.tempShape, true);
     }
   }
   
   drawShape(shape, isTemporary = false) {
     this.ctx.save();
     
     // Set line style
     this.ctx.strokeStyle = document.getElementById('line-color').value;
     this.ctx.lineWidth = parseInt(document.getElementById('line-width').value);
     
     if (isTemporary) {
       this.ctx.globalAlpha = 0.5;
     }
     
     const { startX, startY, endX, endY } = shape;
     
     switch (shape.type) {
       case 'line':
         this.ctx.beginPath();
         this.ctx.moveTo(startX, startY);
         this.ctx.lineTo(endX, endY);
         this.ctx.stroke();
         break;
         
       case 'half-curve':
         this.drawHalfCurve(startX, startY, endX, endY);
         break;
         
       case 'full-curve':
         this.drawFullCurve(startX, startY, endX, endY);
         break;
     }
     
     this.ctx.restore();
   }
   
   drawHalfCurve(startX, startY, endX, endY) {
     // Calculate control point for smooth curve
     const midX = (startX + endX) / 2;
     const midY = (startY + endY) / 2;
     
     // Calculate perpendicular offset for curve
     const dx = endX - startX;
     const dy = endY - startY;
     const distance = Math.sqrt(dx * dx + dy * dy);
     const offset = distance * 0.3; // Curve depth
     
     // Calculate control point
     const controlX = midX + (-dy / distance) * offset;
     const controlY = midY + (dx / distance) * offset;
     
     // Draw quadratic curve
     this.ctx.beginPath();
     this.ctx.moveTo(startX, startY);
     this.ctx.quadraticCurveTo(controlX, controlY, endX, endY);
     this.ctx.stroke();
   }
   
   drawFullCurve(startX, startY, endX, endY) {
     // Calculate center and radius for full curve
     const centerX = (startX + endX) / 2;
     const centerY = (startY + endY) / 2;
     const radius = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2)) / 2;
     
     // Calculate start and end angles
     const startAngle = Math.atan2(startY - centerY, startX - centerX);
     const endAngle = Math.atan2(endY - centerY, endX - centerX);
     
     // Draw full curve (circle)
     this.ctx.beginPath();
     this.ctx.arc(centerX, centerY, radius, startAngle, endAngle + Math.PI * 2);
     this.ctx.stroke();
   }
  
  placeSensor(x, y) {
    // Calculate total sensors configured in the system
    const totalConfiguredSensors = this.config.espModules.reduce((total, esp) => total + esp.sensorCount, 0);
    
    // Check if we've already placed all configured sensors
    if (this.config.sensors.length >= totalConfiguredSensors) {
      alert(`All ${totalConfiguredSensors} configured sensors have been placed. Cannot place more sensors.`);
      return;
    }
    
    this.sensorCounter++;
    
    // Find which ESP module this sensor belongs to
    let currentSensorCount = 0;
    let espId = 1;
    let sensorId = 1;
    
    for (const espModule of this.config.espModules) {
      if (this.sensorCounter <= currentSensorCount + espModule.sensorCount) {
        espId = espModule.id;
        sensorId = this.sensorCounter - currentSensorCount;
        break;
      }
      currentSensorCount += espModule.sensorCount;
    }
    
    // Check if this ESP module has reached its sensor limit
    const espSensorCount = this.config.sensors.filter(s => s.espId === espId).length;
    if (espSensorCount >= this.config.espModules.find(esp => esp.id === espId).sensorCount) {
      alert(`ESP Module ${espId} has reached its maximum sensor limit (${this.config.espModules.find(esp => esp.id === espId).sensorCount} sensors).`);
      this.sensorCounter--; // Decrement counter since we didn't place the sensor
      return;
    }
    
    const sensor = {
      id: `ESP${espId}_Sensor${sensorId}`,
      espId: espId,
      sensorId: sensorId,
      x: x,
      y: y,
      color: this.getSensorColor(espId, sensorId)
    };
    
    this.config.sensors.push(sensor);
    
    // Draw sensor on canvas
    this.drawSensor(sensor);
    
    // Update legend
    this.updateSensorLegend();
    
    // Show progress message
    this.showSensorProgress();
    
    // Update sensor button state
    this.updateSensorModeButton();
  }
  
  getSensorColor(espId, sensorId) {
    const colors = ['#ff4500', '#28a745', '#007bff', '#ffc107', '#dc3545', '#6f42c1', '#20c997', '#fd7e14'];
    const index = ((espId - 1) * this.config.sensorsPerEsp + (sensorId - 1)) % colors.length;
    return colors[index];
  }
  
  drawSensor(sensor) {
    this.ctx.save();
    this.ctx.fillStyle = sensor.color;
    this.ctx.strokeStyle = '#333';
    this.ctx.lineWidth = 2;
    
    // Draw sensor circle
    this.ctx.beginPath();
    this.ctx.arc(sensor.x, sensor.y, 15, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.stroke();
    
    // Draw sensor label
    this.ctx.fillStyle = '#333';
    this.ctx.font = '12px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(sensor.sensorId, sensor.x, sensor.y + 4);
    
    this.ctx.restore();
  }
  
  updateSensorLegend() {
    const legendContent = document.getElementById('sensor-legend-content');
    legendContent.innerHTML = '';
    
    this.config.sensors.forEach(sensor => {
      const sensorItem = document.createElement('div');
      sensorItem.className = 'sensor-item';
      sensorItem.innerHTML = `
        <div class="sensor-color" style="background-color: ${sensor.color}"></div>
        <div class="sensor-info">
          <div class="sensor-name">${sensor.id}</div>
          <div class="sensor-location">ESP ${sensor.espId} - Sensor ${sensor.sensorId}</div>
        </div>
      `;
      legendContent.appendChild(sensorItem);
    });
  }
  
  showSensorProgress() {
    const totalConfiguredSensors = this.config.espModules.reduce((total, esp) => total + esp.sensorCount, 0);
    const placedSensors = this.config.sensors.length;
    const remainingSensors = totalConfiguredSensors - placedSensors;
    
    // Create or update progress message
    let progressMessage = document.getElementById('sensor-progress-message');
    if (!progressMessage) {
      progressMessage = document.createElement('div');
      progressMessage.id = 'sensor-progress-message';
      progressMessage.className = 'sensor-progress-message';
      document.querySelector('.canvas-instructions').appendChild(progressMessage);
    }
    
    // Create ESP module progress details
    let espProgressDetails = '';
    this.config.espModules.forEach(espModule => {
      const espPlacedSensors = this.config.sensors.filter(s => s.espId === espModule.id).length;
      const espRemainingSensors = espModule.sensorCount - espPlacedSensors;
      espProgressDetails += `<br>ESP ${espModule.id}: ${espPlacedSensors}/${espModule.sensorCount} sensors placed`;
    });
    
    if (remainingSensors > 0) {
      progressMessage.innerHTML = `
        <div class="progress-info">
          <strong>Sensor Placement Progress:</strong><br>
          Total: ${placedSensors} / ${totalConfiguredSensors} sensors placed<br>
          Remaining: ${remainingSensors} sensors${espProgressDetails}
        </div>
      `;
      progressMessage.style.display = 'block';
    } else {
      progressMessage.innerHTML = `
        <div class="progress-complete">
          <strong>✅ All sensors placed!</strong><br>
          ${placedSensors} sensors successfully placed on the flowchart.${espProgressDetails}
        </div>
      `;
      progressMessage.style.display = 'block';
    }
  }
  
  updateSensorModeButton() {
    const totalConfiguredSensors = this.config.espModules.reduce((total, esp) => total + esp.sensorCount, 0);
    const placedSensors = this.config.sensors.length;
    const sensorButton = document.getElementById('sensor-mode');
    
    if (placedSensors >= totalConfiguredSensors) {
      sensorButton.innerHTML = '📍 Place Sensor (All Placed)';
      sensorButton.style.opacity = '0.6';
      sensorButton.title = `All ${totalConfiguredSensors} configured sensors have been placed`;
      sensorButton.disabled = true;
    } else {
      // Find next ESP module that needs sensors
      let nextEspInfo = '';
      for (const espModule of this.config.espModules) {
        const espPlacedSensors = this.config.sensors.filter(s => s.espId === espModule.id).length;
        if (espPlacedSensors < espModule.sensorCount) {
          nextEspInfo = ` (Next: ESP ${espModule.id})`;
          break;
        }
      }
      
      sensorButton.innerHTML = `📍 Place Sensor${nextEspInfo}`;
      sensorButton.style.opacity = '1';
      sensorButton.title = `Place sensor (${placedSensors}/${totalConfiguredSensors} placed)`;
      sensorButton.disabled = false;
    }
  }
  
  clearCanvas() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.config.sensors = [];
    this.sensorCounter = 0;
    this.objects = [];
    this.selectedObject = null;
    this.clearSelectionHandles();
    this.updateSensorLegend();
    this.showSensorProgress(); // Update progress after clearing
    this.updateSensorModeButton(); // Update button state after clearing
    this.saveState();
    
    // Show confirmation message
    alert('Canvas cleared! All sensors and drawings have been removed. You can now start fresh.');
  }
  
  resetAllConfiguration() {
    // Show confirmation dialog
    const confirmed = confirm(
      'Are you sure you want to reset ALL configuration?\n\n' +
      'This will:\n' +
      '• Clear the canvas and all drawings\n' +
      '• Remove all placed sensors\n' +
      '• Reset ESP module configuration\n' +
      '• Clear all settings\n\n' +
      'This action cannot be undone!'
    );
    
    if (confirmed) {
      try {
        // Reset configuration to defaults
        this.config = {
          espCount: 2,
          sensorsPerEsp: 2,
          espModules: [],
          sensors: [],
          flowchart: null
        };
        
        // Reset form values
        document.getElementById('esp-count').value = 2;
        document.getElementById('sensors-per-esp').value = 2;
        
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Reset drawing state
        this.sensorCounter = 0;
        this.objects = [];
        this.selectedObject = null;
        this.clearSelectionHandles();
        this.history = [];
        this.historyIndex = -1;
        
        // Update ESP configuration
        this.updateEspConfiguration();
        
        // Update UI
        this.updateSensorLegend();
        this.showSensorProgress();
        this.updateSensorModeButton();
        this.updateUndoRedoButtons();
        
        // Save initial state
        this.saveState();
        
        // Show success message
        alert('All configuration reset successfully!\n\nYou can now start fresh with the setup process.');
        
      } catch (error) {
        console.error('Error resetting configuration:', error);
        alert('Error resetting configuration. Please try again.');
      }
    }
  }
  
  getObjectAt(x, y) {
    // Find object at given coordinates
    for (let i = this.objects.length - 1; i >= 0; i--) {
      const obj = this.objects[i];
      
      if (obj.type === 'line') {
        // Check if point is near line
        const distance = this.distanceToLine(x, y, obj.startX, obj.startY, obj.endX, obj.endY);
        if (distance < 10) {
          return obj;
        }
      } else if (obj.type === 'half-curve' || obj.type === 'full-curve') {
        // Check if point is near curve
        const distance = this.distanceToLine(x, y, obj.startX, obj.startY, obj.endX, obj.endY);
        if (distance < 15) {
          return obj;
        }
      } else if (obj.type === 'free-draw') {
        // Check if point is near any segment of free-draw
        for (const segment of obj.segments) {
          const distance = this.distanceToLine(x, y, segment.startX, segment.startY, segment.endX, segment.endY);
          if (distance < 10) {
            return obj;
          }
        }
      }
    }
    return null;
  }
  
  distanceToLine(px, py, x1, y1, x2, y2) {
    const A = px - x1;
    const B = py - y1;
    const C = x2 - x1;
    const D = y2 - y1;
    
    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;
    
    if (lenSq !== 0) {
      param = dot / lenSq;
    }
    
    let xx, yy;
    
    if (param < 0) {
      xx = x1;
      yy = y1;
    } else if (param > 1) {
      xx = x2;
      yy = y2;
    } else {
      xx = x1 + param * C;
      yy = y1 + param * D;
    }
    
    const dx = px - xx;
    const dy = py - yy;
    return Math.sqrt(dx * dx + dy * dy);
  }
  
  loadFlowchart() {
    if (this.config.flowchart) {
      const img = new Image();
      img.onload = () => {
        this.ctx.drawImage(img, 0, 0);
        // Redraw sensors
        this.config.sensors.forEach(sensor => {
          this.drawSensor(sensor);
        });
      };
      img.src = this.config.flowchart;
    }
  }
  
  generateReview() {
    // Calculate total sensors from ESP modules
    const totalSensors = this.config.espModules.reduce((total, esp) => total + esp.sensorCount, 0);
    
    // Update configuration summary
    const configSummary = document.getElementById('config-summary');
    configSummary.innerHTML = `
      <div class="config-item">
        <span class="config-label">ESP Modules:</span>
        <span class="config-value">${this.config.espCount}</span>
      </div>
      <div class="config-item">
        <span class="config-label">Total Sensors:</span>
        <span class="config-value">${totalSensors}</span>
      </div>
      <div class="config-item">
        <span class="config-label">Placed Sensors:</span>
        <span class="config-value">${this.config.sensors.length}</span>
      </div>
    `;
    
    // Add ESP module details
    this.config.espModules.forEach(espModule => {
      const espItem = document.createElement('div');
      espItem.className = 'config-item';
      espItem.innerHTML = `
        <span class="config-label">${espModule.name}:</span>
        <span class="config-value">${espModule.sensorCount} sensors</span>
      `;
      configSummary.appendChild(espItem);
    });
    
    // Create preview
    this.createPreview();
  }
  
  createPreview() {
    // Clear preview canvas
    this.previewCtx.clearRect(0, 0, this.previewCanvas.width, this.previewCanvas.height);
    
    // Scale and draw the main canvas to preview
    const scaleX = this.previewCanvas.width / this.canvas.width;
    const scaleY = this.previewCanvas.height / this.canvas.height;
    const scale = Math.min(scaleX, scaleY);
    
    this.previewCtx.save();
    this.previewCtx.scale(scale, scale);
    this.previewCtx.drawImage(this.canvas, 0, 0);
    this.previewCtx.restore();
  }
  
  async saveConfiguration() {
    try {
      // Save flowchart as base64
      this.config.flowchart = this.canvas.toDataURL();
      
      // Save to localStorage
      localStorage.setItem('gasSystemConfig', JSON.stringify(this.config));
      
      // Save to Firebase (if configured)
      if (typeof firebase !== 'undefined') {
        await this.saveToFirebase();
      }
      
      // Show success message
      alert('Configuration saved successfully!');
      
      // Redirect to dashboard
      window.location.href = 'index.html';
      
    } catch (error) {
      console.error('Error saving configuration:', error);
      alert('Error saving configuration. Please try again.');
    }
  }
  
  async saveToFirebase() {
    const firebaseConfig = {
      apiKey: "AIzaSyD03uzNrXqHT-Qek7FxnolduX6duze185k",
      databaseURL: "https://gas-leakage-detection-sy-41697-default-rtdb.europe-west1.firebasedatabase.app/",
    };
    
    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }
    
    const db = firebase.database();
    await db.ref('systemConfig').set(this.config);
  }
  
  // Advanced editing methods
  saveState() {
    // Remove any states after current index
    this.history = this.history.slice(0, this.historyIndex + 1);
    
    // Save current canvas state
    const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    this.history.push(imageData);
    this.historyIndex++;
    
    // Limit history size
    if (this.history.length > 20) {
      this.history.shift();
      this.historyIndex--;
    }
  }
  
  undo() {
    if (this.historyIndex > 0) {
      this.historyIndex--;
      const imageData = this.history[this.historyIndex];
      this.ctx.putImageData(imageData, 0, 0);
      this.updateUndoRedoButtons();
    }
  }
  
  redo() {
    if (this.historyIndex < this.history.length - 1) {
      this.historyIndex++;
      const imageData = this.history[this.historyIndex];
      this.ctx.putImageData(imageData, 0, 0);
      this.updateUndoRedoButtons();
    }
  }
  
  updateUndoRedoButtons() {
    const undoBtn = document.getElementById('undo-btn');
    const redoBtn = document.getElementById('redo-btn');
    
    undoBtn.disabled = this.historyIndex <= 0;
    redoBtn.disabled = this.historyIndex >= this.history.length - 1;
  }
  
  clearSelectionHandles() {
    // Remove any existing selection handles
    const handles = document.querySelectorAll('.vertex-handle, .selection-box');
    handles.forEach(handle => handle.remove());
  }
  
  showSelectionHandles(object) {
    this.clearSelectionHandles();
    
    if (!object) return;
    
    // Calculate bounding box for all object types
    let minX, minY, maxX, maxY;
    
    if (object.type === 'line' || object.type === 'half-curve' || object.type === 'full-curve') {
      minX = Math.min(object.startX, object.endX);
      minY = Math.min(object.startY, object.endY);
      maxX = Math.max(object.startX, object.endX);
      maxY = Math.max(object.startY, object.endY);
    } else if (object.type === 'free-draw') {
      // Calculate bounding box for free-draw segments
      minX = Infinity;
      minY = Infinity;
      maxX = -Infinity;
      maxY = -Infinity;
      
      for (const segment of object.segments) {
        minX = Math.min(minX, segment.startX, segment.endX);
        minY = Math.min(minY, segment.startY, segment.endY);
        maxX = Math.max(maxX, segment.startX, segment.endX);
        maxY = Math.max(maxY, segment.startY, segment.endY);
      }
    } else {
      minX = object.x || 0;
      minY = object.y || 0;
      maxX = (object.x || 0) + (object.width || 0);
      maxY = (object.y || 0) + (object.height || 0);
    }
    
    // Get canvas position relative to its container
    const canvasRect = this.canvas.getBoundingClientRect();
    const containerRect = this.canvas.parentNode.getBoundingClientRect();
    const canvasOffsetX = canvasRect.left - containerRect.left;
    const canvasOffsetY = canvasRect.top - containerRect.top;
    
    // Create selection box positioned relative to canvas
    const selectionBox = document.createElement('div');
    selectionBox.className = 'selection-box';
    selectionBox.style.left = `${canvasOffsetX + minX - 5}px`;
    selectionBox.style.top = `${canvasOffsetY + minY - 5}px`;
    selectionBox.style.width = `${maxX - minX + 10}px`;
    selectionBox.style.height = `${maxY - minY + 10}px`;
    
    this.canvas.parentNode.appendChild(selectionBox);
  }
  
  showVertexHandles(object) {
    this.clearSelectionHandles();
    
    if (!object || object.type === 'sensor') return;
    
    // Get canvas position relative to its container
    const canvasRect = this.canvas.getBoundingClientRect();
    const containerRect = this.canvas.parentNode.getBoundingClientRect();
    const canvasOffsetX = canvasRect.left - containerRect.left;
    const canvasOffsetY = canvasRect.top - containerRect.top;
    
    // Show vertex handles for different object types
    if (object.type === 'line' || object.type === 'half-curve' || object.type === 'full-curve') {
      const startHandle = document.createElement('div');
      startHandle.className = 'vertex-handle';
      startHandle.style.left = `${canvasOffsetX + object.startX - 5}px`;
      startHandle.style.top = `${canvasOffsetY + object.startY - 5}px`;
      startHandle.dataset.vertexType = 'start';
      
      const endHandle = document.createElement('div');
      endHandle.className = 'vertex-handle';
      endHandle.style.left = `${canvasOffsetX + object.endX - 5}px`;
      endHandle.style.top = `${canvasOffsetY + object.endY - 5}px`;
      endHandle.dataset.vertexType = 'end';
      
      [startHandle, endHandle].forEach(handle => {
        handle.addEventListener('mousedown', (e) => {
          e.stopPropagation();
          this.startVertexEdit(object, handle.dataset.vertexType, e);
        });
        
        this.canvas.parentNode.appendChild(handle);
      });
    } else if (object.type === 'free-draw') {
      // Show vertex handles for key points in free-draw
      const keyPoints = this.getKeyPoints(object);
      
      keyPoints.forEach((point, index) => {
        const handle = document.createElement('div');
        handle.className = 'vertex-handle';
        handle.style.left = `${canvasOffsetX + point.x - 5}px`;
        handle.style.top = `${canvasOffsetY + point.y - 5}px`;
        handle.dataset.vertexType = `point-${index}`;
        handle.dataset.pointIndex = index;
        
        handle.addEventListener('mousedown', (e) => {
          e.stopPropagation();
          this.startVertexEdit(object, handle.dataset.vertexType, e);
        });
        
        this.canvas.parentNode.appendChild(handle);
      });
    }
  }
  
  getKeyPoints(object) {
    if (object.type === 'free-draw') {
      // Return key points from free-draw segments (every 5th point to avoid too many handles)
      const keyPoints = [];
      for (let i = 0; i < object.segments.length; i += 5) {
        const segment = object.segments[i];
        keyPoints.push({ x: segment.startX, y: segment.startY });
      }
      // Always include the last point
      if (object.segments.length > 0) {
        const lastSegment = object.segments[object.segments.length - 1];
        keyPoints.push({ x: lastSegment.endX, y: lastSegment.endY });
      }
      return keyPoints;
    }
    return [];
  }
  
  
  
  startVertexEdit(object, vertexType, e) {
    this.isDragging = true;
    this.selectedObject = object;
    this.selectedVertex = vertexType;
    
    // Get canvas position for accurate mouse tracking
    const canvasRect = this.canvas.getBoundingClientRect();
    const containerRect = this.canvas.parentNode.getBoundingClientRect();
    const canvasOffsetX = canvasRect.left - containerRect.left;
    const canvasOffsetY = canvasRect.top - containerRect.top;
    
    // Calculate initial mouse position relative to canvas
    this.dragStart = {
      x: e.clientX - canvasRect.left,
      y: e.clientY - canvasRect.top
    };
    
    const handleMove = (e) => {
      if (!this.isDragging) return;
      
      // Calculate current mouse position relative to canvas
      const currentPos = {
        x: e.clientX - canvasRect.left,
        y: e.clientY - canvasRect.top
      };
      
      const dx = currentPos.x - this.dragStart.x;
      const dy = currentPos.y - this.dragStart.y;
      
      if (object.type === 'line' || object.type === 'half-curve' || object.type === 'full-curve') {
        if (vertexType === 'start') {
          object.startX += dx;
          object.startY += dy;
        } else if (vertexType === 'end') {
          object.endX += dx;
          object.endY += dy;
        }
      } else if (object.type === 'free-draw' && vertexType.startsWith('point-')) {
        const pointIndex = parseInt(vertexType.split('-')[1]);
        const keyPoints = this.getKeyPoints(object);
        if (keyPoints[pointIndex]) {
          // Move the corresponding segment points
          const segmentIndex = pointIndex * 5;
          if (segmentIndex < object.segments.length) {
            object.segments[segmentIndex].startX += dx;
            object.segments[segmentIndex].startY += dy;
          }
        }
      }
      
      this.dragStart = currentPos;
      this.redrawCanvas();
      this.showVertexHandles(object);
    };
    
    const handleUp = () => {
      this.isDragging = false;
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp);
      this.saveState();
    };
    
    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);
  }
  
  redrawCanvas() {
    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Redraw all objects
    this.objects.forEach(obj => {
      this.drawObject(obj);
    });
    
    // Redraw sensors
    this.config.sensors.forEach(sensor => {
      this.drawSensor(sensor);
    });
  }
  
  drawObject(obj) {
    this.ctx.save();
    this.ctx.strokeStyle = obj.color || '#000000';
    this.ctx.lineWidth = obj.lineWidth || 4;
    
    switch (obj.type) {
      case 'line':
        this.ctx.beginPath();
        this.ctx.moveTo(obj.startX, obj.startY);
        this.ctx.lineTo(obj.endX, obj.endY);
        this.ctx.stroke();
        break;
      case 'half-curve':
        this.drawHalfCurve(obj.startX, obj.startY, obj.endX, obj.endY);
        break;
      case 'full-curve':
        this.drawFullCurve(obj.startX, obj.startY, obj.endX, obj.endY);
        break;
      case 'free-draw':
        this.ctx.beginPath();
        if (obj.segments.length > 0) {
          this.ctx.moveTo(obj.segments[0].startX, obj.segments[0].startY);
          for (const segment of obj.segments) {
            this.ctx.lineTo(segment.endX, segment.endY);
          }
        }
        this.ctx.stroke();
        break;
    }
    
    this.ctx.restore();
  }
}

// Initialize setup manager when page loads
document.addEventListener('DOMContentLoaded', () => {
  new SetupManager();
});
