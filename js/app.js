// AR Nội Thất - Mã nguồn JavaScript
document.addEventListener('DOMContentLoaded', () => {
  // Các thành phần DOM
  const modelSelector = document.getElementById('modelSelector');
  const scaleSlider = document.getElementById('scaleSlider');
  const scaleValue = document.getElementById('scaleValue');
  const rotationSlider = document.getElementById('rotationSlider');
  const rotationValue = document.getElementById('rotationValue');
  const colorPicker = document.getElementById('colorPicker');
  const materialSelector = document.getElementById('materialSelector');
  const toggleLightBtn = document.getElementById('toggleLight');
  const toggleARBtn = document.getElementById('toggleAR');
  const placeModelBtn = document.getElementById('placeModel');
  const removeModelBtn = document.getElementById('removeModel');
  const saveDesignBtn = document.getElementById('saveDesign');
  const loadDesignBtn = document.getElementById('loadDesign');
  const screenshotBtn = document.getElementById('screenshot');
  const toggleUIBtn = document.getElementById('toggleUI');
  const uiPanel = document.getElementById('ui');
  const loadingOverlay = document.getElementById('loadingOverlay');
  const loadingStatus = document.getElementById('loadingStatus');
  const toast = document.getElementById('toast');
  const previewImage = document.getElementById('previewImage');
  
  // Scene elements
  const scene = document.querySelector('a-scene');
  const furnitureModel = document.querySelector('#furnitureModel');
  const marker = document.querySelector('#hiroMarker');
  const ambientLight = document.querySelector('#ambientLight');
  const directionalLight = document.querySelector('#directionalLight');
  const ground = document.querySelector('#ground');
  const camera = document.querySelector('[camera]');
  
  // State variables
  let isLightOn = true;
  let isARMode = true; // Default - marker-based AR
  let isUIVisible = true;
  let placedModels = [];
  let markerVisible = false;
  let actionHistory = [];
  let currentActionIndex = -1;
  let isLoading = true;
  let assetsLoaded = false;
  let deviceOrientation = null;
  
  // Utility functions
  function showToast(message, duration = 3000) {
    toast.textContent = message;
    toast.style.display = 'block';
    toast.style.animation = `fadeIn 0.3s, fadeOut 0.3s ${duration - 300}ms`;
    
    setTimeout(() => {
      toast.style.display = 'none';
    }, duration);
  }
  
  function updateModelPreview() {
    const modelName = modelSelector.value;
    previewImage.src = `assets/images/${modelName}_preview.jpg`;
  }
  
  function addToHistory() {
    const state = {
      model: furnitureModel.getAttribute('gltf-model'),
      position: furnitureModel.getAttribute('position'),
      rotation: furnitureModel.getAttribute('rotation'),
      scale: furnitureModel.getAttribute('scale'),
      material: furnitureModel.getAttribute('material')
    };
    
    // Clear forward history if we're in the middle of the stack
    if (currentActionIndex < actionHistory.length - 1) {
      actionHistory = actionHistory.slice(0, currentActionIndex + 1);
    }
    
    actionHistory.push(state);
    currentActionIndex = actionHistory.length - 1;
  }
  
  function applyState(state) {
    if (state.model) furnitureModel.setAttribute('gltf-model', state.model);
    if (state.position) furnitureModel.setAttribute('position', state.position);
    if (state.rotation) furnitureModel.setAttribute('rotation', state.rotation);
    if (state.scale) furnitureModel.setAttribute('scale', state.scale);
    if (state.material) furnitureModel.setAttribute('material', state.material);
  }
  
  // Init functions
  async function checkDeviceCapabilities() {
    try {
      // Check AR support
      if (!window.isSecureContext) {
        showToast('Ứng dụng yêu cầu HTTPS để sử dụng AR', 5000);
      }
      
      // Check device orientation
      if (window.DeviceOrientationEvent) {
        window.addEventListener('deviceorientation', (event) => {
          deviceOrientation = event;
        }, { once: true });
      }
      
      // Check WebGL support
      const canvas = document.createElement('canvas');
      const hasWebGL = !!(window.WebGLRenderingContext && 
        (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
      
      if (!hasWebGL) {
        showToast('Thiết bị không hỗ trợ WebGL', 5000);
        return false;
      }
      
      // Check camera access
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(track => track.stop()); // Don't keep the stream open
      
      return true;
    } 
    // catch (error) {
    //   console.error('Lỗi khi kiểm tra thiết bị:', error);
    //   showToast('Không thể truy cập camera. Vui lòng cấp quyền camera cho ứng dụng.', 5000);
    //   return false;
    // }
    catch (error) {
  console.error('Chi tiết lỗi camera:', error.name, error.message);
  showToast(`Lỗi camera: ${error.name} - ${error.message}`, 5000);
  return false;
}
  }
  
  function initializeApp() {
    // Load saved settings if available
    const savedSettings = localStorage.getItem('arFurnitureSettings');
    if (savedSettings) {
      const settings = JSON.parse(savedSettings);
      if (settings.modelType) modelSelector.value = settings.modelType;
      if (settings.scale) scaleSlider.value = settings.scale;
      if (settings.rotation) rotationSlider.value = settings.rotation;
      if (settings.color) colorPicker.value = settings.color;
      if (settings.material) materialSelector.value = settings.material;
    }
    
    // Apply initial settings
    updateModelPreview();
    changeModel();
    updateScaleValue();
    updateRotationValue();
    
    // Hide loading overlay when all resources are loaded
    scene.addEventListener('loaded', () => {
      assetsLoaded = true;
      hideLoadingOverlay();
    });
    
    // Handle marker detection
    marker.addEventListener('markerFound', () => {
      markerVisible = true;
      showToast('Đã phát hiện marker');
    });
    
    marker.addEventListener('markerLost', () => {
      markerVisible = false;
    });
  }
  
  // Helper function to hide loading overlay
  function hideLoadingOverlay() {
    if (assetsLoaded && !isLoading) {
      loadingOverlay.style.display = 'none';
      showToast('Ứng dụng đã sẵn sàng!');
    }
  }
  
  // Event listeners
  modelSelector.addEventListener('change', () => {
    updateModelPreview();
    changeModel();
  });
  
  function changeModel() {
    addToHistory();
    const modelValue = modelSelector.value;
    const modelPath = `#${modelValue}Model`;
    furnitureModel.setAttribute('gltf-model', modelPath);
    
    // Show loading message
    showToast(`Đang tải ${modelValue}...`);
    
    // Update local storage
    saveSettings();
  }
  
  scaleSlider.addEventListener('input', updateScaleValue);
  
  function updateScaleValue() {
    const scaleVal = scaleSlider.value;
    scaleValue.textContent = scaleVal;
    furnitureModel.setAttribute('scale', `${scaleVal} ${scaleVal} ${scaleVal}`);
    saveSettings();
  }
  
  rotationSlider.addEventListener('input', updateRotationValue);
  
  function updateRotationValue() {
    const rotationVal = rotationSlider.value;
    rotationValue.textContent = `${rotationVal}°`;
    furnitureModel.setAttribute('rotation', `0 ${rotationVal} 0`);
    saveSettings();
  }
  
  colorPicker.addEventListener('input', (e) => {
    furnitureModel.setAttribute('material', 'color', e.target.value);
    saveSettings();
  });
  
  materialSelector.addEventListener('change', (e) => {
    const material = e.target.value;
    
    // Clear any existing material properties
    furnitureModel.removeAttribute('material');
    
    // Apply the selected material
    switch(material) {
      case 'wood':
        furnitureModel.setAttribute('material', {
          src: '#woodTexture',
          roughness: 0.8,
          metalness: 0.2
        });
        break;
      case 'metal':
        furnitureModel.setAttribute('material', {
          src: '#metalTexture',
          roughness: 0.2,
          metalness: 0.8
        });
        break;
      case 'plastic':
        furnitureModel.setAttribute('material', {
          src: '#plasticTexture',
          roughness: 0.5,
          metalness: 0.1
        });
        break;
      case 'fabric':
        furnitureModel.setAttribute('material', {
          src: '#fabricTexture',
          roughness: 0.9,
          metalness: 0
        });
        break;
      case 'marble':
        furnitureModel.setAttribute('material', {
          src: '#marbleTexture',
          roughness: 0.3,
          metalness: 0.1
        });
        break;
      default:
        // Reset to default material
        furnitureModel.setAttribute('material', 'color', colorPicker.value);
    }
    
    saveSettings();
  });
  
  toggleLightBtn.addEventListener('click', () => {
    isLightOn = !isLightOn;
    
    const intensity = isLightOn ? 0.5 : 0;
    const directionalIntensity = isLightOn ? 0.8 : 0;
    
    ambientLight.setAttribute('light', 'intensity', intensity);
    directionalLight.setAttribute('light', 'intensity', directionalIntensity);
    
    showToast(isLightOn ? 'Đã bật đèn' : 'Đã tắt đèn');
  });
  
  toggleARBtn.addEventListener('click', () => {
    isARMode = !isARMode;
    
    if (isARMode) {
      // Marker-based AR
      marker.setAttribute('visible', true);
      ground.setAttribute('visible', false);
      scene.setAttribute('arjs', 'sourceType: webcam; debugUIEnabled: false; detectionMode: mono_and_matrix; matrixCodeType: 3x3;');
      showToast('Chế độ AR với marker đã bật');
    } else {
      // Markerless AR
      marker.setAttribute('visible', false);
      ground.setAttribute('visible', true);
      scene.setAttribute('arjs', 'sourceType: webcam; debugUIEnabled: false; trackingMethod: best;');
      showToast('Chế độ AR không marker đã bật');
    }
  });
  
  placeModelBtn.addEventListener('click', () => {
    if (!isARMode) {
      // Create a new entity in the scene
      const newModel = document.createElement('a-entity');
      
      // Copy properties from the current model
      newModel.setAttribute('gltf-model', furnitureModel.getAttribute('gltf-model'));
      newModel.setAttribute('scale', furnitureModel.getAttribute('scale'));
      newModel.setAttribute('rotation', furnitureModel.getAttribute('rotation'));
      
      if (furnitureModel.getAttribute('material')) {
        newModel.setAttribute('material', furnitureModel.getAttribute('material'));
      }
      
      // Position in front of camera
      const cameraPosition = camera.getAttribute('position');
      const cameraRotation = camera.getAttribute('rotation');
      
      // Convert camera rotation to radians
      const rotationRad = (cameraRotation.y * Math.PI) / 180;
      
      // Calculate position 2 meters in front of camera
      const posX = cameraPosition.x - 2 * Math.sin(rotationRad);
      const posZ = cameraPosition.z - 2 * Math.cos(rotationRad);
      
      newModel.setAttribute('position', `${posX} 0 ${posZ}`);
      newModel.setAttribute('class', 'placed-model clickable');
      
      // Add gesture handling
      newModel.setAttribute('gesture-handler', 'minScale: 0.1; maxScale: 3');
      
      // Add to scene
      scene.appendChild(newModel);
      placedModels.push(newModel);
      
      showToast('Đã đặt mô hình');
    } else {
      showToast('Chuyển sang chế độ AR không marker để đặt mô hình');
    }
  });
  
  removeModelBtn.addEventListener('click', () => {
    if (placedModels.length > 0) {
      // Remove the last placed model
      const lastModel = placedModels.pop();
      scene.removeChild(lastModel);
      showToast('Đã xóa mô hình');
    } else {
      showToast('Không có mô hình nào để xóa');
    }
  });
  
  saveDesignBtn.addEventListener('click', () => {
    // Save the current design
    const designName = prompt('Nhập tên thiết kế:', 'Thiết kế của tôi');
    
    if (designName) {
      const designData = {
        models: placedModels.map(model => ({
          type: model.getAttribute('gltf-model').replace('#', '').replace('Model', ''),
          position: model.getAttribute('position'),
          rotation: model.getAttribute('rotation'),
          scale: model.getAttribute('scale'),
          material: model.getAttribute('material')
        })),
        currentModel: {
          type: modelSelector.value,
          scale: scaleSlider.value,
          rotation: rotationSlider.value,
          color: colorPicker.value,
          material: materialSelector.value
        },
        date: new Date().toISOString()
      };
      
      // Get existing designs or create new array
      const savedDesigns = JSON.parse(localStorage.getItem('arFurnitureDesigns') || '{}');
      savedDesigns[designName] = designData;
      
      // Save to localStorage
      localStorage.setItem('arFurnitureDesigns', JSON.stringify(savedDesigns));
      showToast(`Thiết kế "${designName}" đã được lưu!`);
    }
  });
  
  loadDesignBtn.addEventListener('click', () => {
    const savedDesigns = JSON.parse(localStorage.getItem('arFurnitureDesigns') || '{}');
    const designNames = Object.keys(savedDesigns);
    
    if (designNames.length === 0) {
      showToast('Không có thiết kế nào được lưu');
      return;
    }
    
    // Create a simple selection dialog
    const designSelector = document.createElement('select');
    designSelector.style.width = '100%';
    designSelector.style.padding = '8px';
    designSelector.style.marginBottom = '10px';
    
    designNames.forEach(name => {
      const option = document.createElement('option');
      option.value = name;
      option.textContent = name;
      designSelector.appendChild(option);
    });
    
    const dialog = document.createElement('div');
    dialog.style.position = 'fixed';
    dialog.style.top = '50%';
    dialog.style.left = '50%';
    dialog.style.transform = 'translate(-50%, -50%)';
    dialog.style.background = 'rgba(0,0,0,0.85)';
    dialog.style.padding = '20px';
    dialog.style.borderRadius = '10px';
    dialog.style.zIndex = '2000';
    dialog.style.color = 'white';
    dialog.style.width = '80%';
    dialog.style.maxWidth = '400px';
    
    const title = document.createElement('h3');
    title.textContent = 'Chọn thiết kế';
    title.style.marginTop = '0';
    
    const loadBtn = document.createElement('button');
    loadBtn.textContent = 'Tải';
    loadBtn.style.background = '#4caf50';
    loadBtn.style.color = 'white';
    loadBtn.style.border = 'none';
    loadBtn.style.padding = '8px 15px';
    loadBtn.style.marginRight = '10px';
    loadBtn.style.borderRadius = '5px';
    loadBtn.style.cursor = 'pointer';
    
    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Hủy';
    cancelBtn.style.background = '#f44336';
    cancelBtn.style.color = 'white';
    cancelBtn.style.border = 'none';
    cancelBtn.style.padding = '8px 15px';
    cancelBtn.style.borderRadius = '5px';
    cancelBtn.style.cursor = 'pointer';
    
    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = 'Xóa thiết kế';
    deleteBtn.style.background = '#ff9800';
    deleteBtn.style.color = 'white';
    deleteBtn.style.border = 'none';
    deleteBtn.style.padding = '8px 15px';
    deleteBtn.style.borderRadius = '5px';
    deleteBtn.style.cursor = 'pointer';
    deleteBtn.style.marginLeft = '10px';
    
    const btnContainer = document.createElement('div');
    btnContainer.style.display = 'flex';
    btnContainer.style.justifyContent = 'space-between';
    btnContainer.style.marginTop = '15px';
    
    btnContainer.appendChild(loadBtn);
    btnContainer.appendChild(cancelBtn);
    btnContainer.appendChild(deleteBtn);
    
    dialog.appendChild(title);
    dialog.appendChild(designSelector);
    dialog.appendChild(btnContainer);
    
    document.body.appendChild(dialog);
    
    loadBtn.addEventListener('click', () => {
      const selectedDesign = designSelector.value;
      const designData = savedDesigns[selectedDesign];
      
      // Clear existing placed models
      placedModels.forEach(model => {
        scene.removeChild(model);
      });
      placedModels = [];
      
      // Apply current model settings
      if (designData.currentModel) {
        modelSelector.value = designData.currentModel.type;
        updateModelPreview();
        changeModel();
        
        scaleSlider.value = designData.currentModel.scale;
        updateScaleValue();
        
        rotationSlider.value = designData.currentModel.rotation;
        updateRotationValue();
        
        colorPicker.value = designData.currentModel.color;
        furnitureModel.setAttribute('material', 'color', designData.currentModel.color);
        
        materialSelector.value = designData.currentModel.material;
        // Trigger material change
        const event = new Event('change');
        materialSelector.dispatchEvent(event);
      }
      
      // Load placed models
      if (designData.models && designData.models.length > 0) {
        designData.models.forEach(modelData => {
          const newModel = document.createElement('a-entity');
          
          newModel.setAttribute('gltf-model', `#${modelData.type}Model`);
          newModel.setAttribute('position', modelData.position);
          newModel.setAttribute('rotation', modelData.rotation);
          newModel.setAttribute('scale', modelData.scale);
          
          if (modelData.material) {
            newModel.setAttribute('material', modelData.material);
          }
          
          newModel.setAttribute('class', 'placed-model clickable');
          newModel.setAttribute('gesture-handler', 'minScale: 0.1; maxScale: 3');
          
          scene.appendChild(newModel);
          placedModels.push(newModel);
        });
      }
      
      document.body.removeChild(dialog);
      showToast(`Thiết kế "${selectedDesign}" đã được tải!`);
    });
    
    cancelBtn.addEventListener('click', () => {
      document.body.removeChild(dialog);
    });
    
    deleteBtn.addEventListener('click', () => {
      const selectedDesign = designSelector.value;
      
      if (confirm(`Bạn có chắc muốn xóa thiết kế "${selectedDesign}"?`)) {
        delete savedDesigns[selectedDesign];
        localStorage.setItem('arFurnitureDesigns', JSON.stringify(savedDesigns));
        
        // Remove option from dropdown
        const optionToRemove = designSelector.querySelector(`option[value="${selectedDesign}"]`);
        if (optionToRemove) {
          designSelector.removeChild(optionToRemove);
        }
        
        // If no more designs, close dialog
        if (designSelector.options.length === 0) {
          document.body.removeChild(dialog);
          showToast('Đã xóa thiết kế cuối cùng');
        } else {
          showToast(`Đã xóa thiết kế "${selectedDesign}"`);
        }
      }
    });
  });
  
  screenshotBtn.addEventListener('click', () => {
    showToast('Đang chụp ảnh...');
    
    // Temporarily hide UI for screenshot
    uiPanel.style.display = 'none';
    toggleUIBtn.style.display = 'none';
    
    setTimeout(() => {
      // Use html2canvas or similar library if available
      // For now we'll use a simple method
      const canvas = document.querySelector('canvas');
      
      if (canvas) {
        try {
          // Create a download link
          const link = document.createElement('a');
          link.download = `ar-furniture-${new Date().getTime()}.png`;
          
          // Convert canvas to data URL
          link.href = canvas.toDataURL('image/png');
          link.click();
          
          showToast('Đã lưu ảnh chụp màn hình!');
        } catch (error) {
          console.error('Lỗi khi chụp ảnh:', error);
          showToast('Không thể chụp ảnh. Vui lòng thử lại.');
        }
      } else {
        showToast('Không thể chụp ảnh. Canvas không tồn tại.');
      }
      
      // Show UI again
      uiPanel.style.display = 'block';
      toggleUIBtn.style.display = 'block';
    }, 500);
  });
  
  toggleUIBtn.addEventListener('click', () => {
    isUIVisible = !isUIVisible;
    uiPanel.classList.toggle('minimized', !isUIVisible);
    toggleUIBtn.textContent = isUIVisible ? '≡' : '▲';
  });
  
  // Touch gestures for model
  let touchStartX = 0;
  let touchStartY = 0;
  let currentRotation = { x: 0, y: 0 };
  
  function handleTouchStart(event) {
    if (!markerVisible) return;
    
    const touch = event.touches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
    
    // Store current rotation
    const rotation = furnitureModel.getAttribute('rotation');
    currentRotation = { x: rotation.x, y: rotation.y, z: rotation.z };
    
    event.preventDefault();
  }
  
  function handleTouchMove(event) {
    if (!markerVisible) return;
    
    const touch = event.touches[0];
    const deltaX = touch.clientX - touchStartX;
    const deltaY = touch.clientY - touchStartY;
    
    // Update rotation based on touch movement
    const newRotation = {
      x: currentRotation.x - deltaY * 0.5,
      y: currentRotation.y + deltaX * 0.5,
      z: currentRotation.z
    };
    
    furnitureModel.setAttribute('rotation', newRotation);
    
    // Update rotation slider to match new Y rotation
    const yRotation = (newRotation.y % 360 + 360) % 360; // Normalize to 0-360
    rotationSlider.value = yRotation;
    rotationValue.textContent = `${Math.round(yRotation)}°`;
    
    event.preventDefault();
  }
  
  // Model loaded event
  furnitureModel.addEventListener('model-loaded', () => {
    console.log('Model loaded successfully');
    showToast('Mô hình đã tải xong!');
    
    // Update model material after loading
    if (materialSelector.value !== 'default') {
      const event = new Event('change');
      materialSelector.dispatchEvent(event);
    } else {
      furnitureModel.setAttribute('material', 'color', colorPicker.value);
    }
  });
  
  // Error handling
  furnitureModel.addEventListener('model-error', (error) => {
    console.error('Model loading error:', error);
    showToast('Lỗi khi tải mô hình 3D. Vui lòng thử lại.');
  });
  
  // Save current settings to localStorage
  function saveSettings() {
    const settings = {
      modelType: modelSelector.value,
      scale: scaleSlider.value,
      rotation: rotationSlider.value,
      color: colorPicker.value,
      material: materialSelector.value
    };
    
    localStorage.setItem('arFurnitureSettings', JSON.stringify(settings));
  }
  
  // Reset settings to default
  function resetSettings() {
    modelSelector.value = 'sofa';
    scaleSlider.value = 1;
    rotationSlider.value = 0;
    colorPicker.value = '#ffffff';
    materialSelector.value = 'default';
    
    updateModelPreview();
    changeModel();
    updateScaleValue();
    updateRotationValue();
    
    localStorage.removeItem('arFurnitureSettings');
    showToast('Đã khôi phục cài đặt mặc định');
  }
  
  // Undo/Redo functionality
  function undo() {
    if (currentActionIndex > 0) {
      currentActionIndex--;
      applyState(actionHistory[currentActionIndex]);
      showToast('Đã hoàn tác');
    } else {
      showToast('Không thể hoàn tác thêm');
    }
  }
  
  function redo() {
    if (currentActionIndex < actionHistory.length - 1) {
      currentActionIndex++;
      applyState(actionHistory[currentActionIndex]);
      showToast('Đã làm lại');
    } else {
      showToast('Không thể làm lại thêm');
    }
  }
  
  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'z') {
      undo();
      e.preventDefault();
    } else if (e.ctrlKey && e.key === 'y') {
      redo();
      e.preventDefault();
    }
  });
  
  // Add touch event listeners
  document.addEventListener('touchstart', handleTouchStart, false);
  document.addEventListener('touchmove', handleTouchMove, false);
  
  // Handle device orientation changes
  window.addEventListener('orientationchange', () => {
    // Recalculate UI position on orientation change
    setTimeout(() => {
      // Adjust UI if needed
      if (window.innerHeight > window.innerWidth) {
        // Portrait mode
        uiPanel.style.maxHeight = '50vh';
      } else {
        // Landscape mode
        uiPanel.style.maxHeight = '80vh';
      }
    }, 300);
  });
  
  // Initialize the application
  (async function init() {
    try {
      loadingStatus.textContent = 'Kiểm tra thiết bị...';
      const isCapable = await checkDeviceCapabilities();
      
      if (isCapable) {
        loadingStatus.textContent = 'Đang tải tài nguyên...';
        initializeApp();
      } else {
        loadingStatus.textContent = 'Thiết bị không tương thích!';
      }
    } catch (error) {
      console.error('Lỗi khởi tạo:', error);
      loadingStatus.textContent = 'Có lỗi xảy ra khi khởi tạo ứng dụng.';
    } finally {
      // Hide loading overlay after 3 seconds even if there were errors
      setTimeout(() => {
        isLoading = false;
        hideLoadingOverlay();
      }, 3000);
    }
  })();

});