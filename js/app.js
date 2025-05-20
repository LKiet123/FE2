document.addEventListener('DOMContentLoaded', () => {
  // Khởi tạo biến
  const modelEntity = document.querySelector('#object');
  const modelSelector = document.getElementById('modelSelector');
  const scaleSlider = document.getElementById('scaleSlider');
  const colorPicker = document.getElementById('colorPicker');
  const materialSelector = document.getElementById('materialSelector');
  const toggleLightBtn = document.getElementById('toggleLight');
  const saveDesignBtn = document.getElementById('saveDesign');
  const loadDesignBtn = document.getElementById('loadDesign');
  const screenshotBtn = document.getElementById('screenshot');
  const toggleARModeBtn = document.getElementById('toggleARMode');
  
  const scene = document.querySelector('a-scene');
  const ambientLight = document.querySelector('#ambientLight');
  const directionalLight = document.querySelector('#directionalLight');
  
  let isLightOn = true;
  let isARMode = false;
  let sceneData = [];
  let actionHistory = [];
  let currentActionIndex = -1;
  let arContext = null;

  // 1. Thay đổi mô hình
  modelSelector.addEventListener('change', (e) => {
    const value = e.target.value;
    let modelPath = `#${value}Model`;
    
    addToHistory();
    modelEntity.setAttribute('gltf-model', modelPath);
  });

  // 2. Thay đổi kích thước
  scaleSlider.addEventListener('input', (e) => {
    const s = e.target.value;
    modelEntity.setAttribute('scale', `${s} ${s} ${s}`);
  });

  // 3. Xoay bằng bàn phím
  document.addEventListener('keydown', (e) => {
    let rot = modelEntity.getAttribute('rotation');
    
    if (e.key === 'ArrowLeft') {
      rot.y -= 10;
    } else if (e.key === 'ArrowRight') {
      rot.y += 10;
    } else if (e.key === 'ArrowUp') {
      rot.x -= 10;
    } else if (e.key === 'ArrowDown') {
      rot.x += 10;
    }
    
    modelEntity.setAttribute('rotation', rot);
  });

  // 4. Xoay bằng chuột
  let isDragging = false;
  let previousMousePosition = { x: 0, y: 0 };
  
  modelEntity.addEventListener('mousedown', (e) => {
    isDragging = true;
    previousMousePosition.x = e.clientX;
    previousMousePosition.y = e.clientY;
    addToHistory();
  });
  
  modelEntity.addEventListener('mousemove', (e) => {
    if (isDragging) {
      const deltaX = e.clientX - previousMousePosition.x;
      const deltaY = e.clientY - previousMousePosition.y;
  
      let rotation = modelEntity.getAttribute('rotation');
      rotation.y += deltaX * 0.1;
      rotation.x -= deltaY * 0.1;
      modelEntity.setAttribute('rotation', rotation);
  
      previousMousePosition.x = e.clientX;
      previousMousePosition.y = e.clientY;
    }
  });
  
  modelEntity.addEventListener('mouseup', () => {
    isDragging = false;
  });
  
  modelEntity.addEventListener('mouseleave', () => {
    isDragging = false;
  });

  // 5. Thay đổi màu sắc
  colorPicker.addEventListener('input', (e) => {
    addToHistory();
    modelEntity.setAttribute('material', 'color', e.target.value);
  });

  // 6. Thay đổi vật liệu
  materialSelector.addEventListener('change', (e) => {
    addToHistory();
    const material = e.target.value;
    
    switch(material) {
      case 'wood':
        modelEntity.setAttribute('material', 'src', '#woodTexture');
        break;
      case 'metal':
        modelEntity.setAttribute('material', 'src', '#metalTexture');
        break;
      case 'plastic':
        modelEntity.setAttribute('material', 'src', '#plasticTexture');
        break;
      case 'fabric':
        modelEntity.setAttribute('material', 'src', '#fabricTexture');
        break;
      default:
        modelEntity.removeAttribute('material');
    }
  });

  // 7. Bật/tắt ánh sáng
  toggleLightBtn.addEventListener('click', () => {
    isLightOn = !isLightOn;
    const intensity = isLightOn ? 0.5 : 0;
    ambientLight.setAttribute('intensity', intensity);
    directionalLight.setAttribute('intensity', intensity);
  });

  // 8. Lưu thiết kế
  saveDesignBtn.addEventListener('click', () => {
    const objects = document.querySelectorAll('[gltf-model]');
    const designData = Array.from(objects).map(obj => ({
      model: obj.getAttribute('gltf-model'),
      position: obj.getAttribute('position'),
      rotation: obj.getAttribute('rotation'),
      scale: obj.getAttribute('scale'),
      color: obj.getAttribute('material')?.color
    }));
    
    localStorage.setItem('furnitureDesign', JSON.stringify(designData));
    alert('Thiết kế đã được lưu!');
  });

  // 9. Tải thiết kế
  loadDesignBtn.addEventListener('click', () => {
    const savedDesign = localStorage.getItem('furnitureDesign');
    if (savedDesign) {
      const designData = JSON.parse(savedDesign);
      // Xử lý tải thiết kế ở đây
      alert('Thiết kế đã được tải!');
    } else {
      alert('Không tìm thấy thiết kế đã lưu!');
    }
  });

  // 10. Chụp ảnh
  screenshotBtn.addEventListener('click', () => {
    scene.components.screenshot.capture('perspective').then(canvas => {
      const link = document.createElement('a');
      link.download = 'ar-furniture-' + new Date().getTime() + '.png';
      link.href = canvas.toDataURL();
      link.click();
    });
  });

  // 11. Chuyển đổi chế độ AR
  toggleARModeBtn.addEventListener('click', () => {
    isARMode = !isARMode;
    if (isARMode) {
      scene.setAttribute('arjs', 'sourceType: webcam; trackingMethod: best;');
      alert('Chế độ AR không marker đã bật. Di chuyển camera xung quanh để đặt đồ vật.');
    } else {
      scene.setAttribute('arjs', 'sourceType: webcam; detectionMode: mono_and_matrix; matrixCodeType: 3x3;');
      alert('Chế độ AR với marker đã bật. Sử dụng marker Hiro.');
    }
  });

  // Hàm hỗ trợ: Lưu lịch sử thao tác
  function addToHistory() {
    const state = {
      model: modelEntity.getAttribute('gltf-model'),
      position: modelEntity.getAttribute('position'),
      rotation: modelEntity.getAttribute('rotation'),
      scale: modelEntity.getAttribute('scale'),
      material: modelEntity.getAttribute('material')
    };
    
    // Nếu không phải là thao tác mới nhất, xóa các thao tác sau
    if (currentActionIndex < actionHistory.length - 1) {
      actionHistory = actionHistory.slice(0, currentActionIndex + 1);
    }
    
    actionHistory.push(state);
    currentActionIndex = actionHistory.length - 1;
  }

  // Hàm hỗ trợ: Undo
  function undo() {
    if (currentActionIndex > 0) {
      currentActionIndex--;
      applyState(actionHistory[currentActionIndex]);
    }
  }

  // Hàm hỗ trợ: Redo
  function redo() {
    if (currentActionIndex < actionHistory.length - 1) {
      currentActionIndex++;
      applyState(actionHistory[currentActionIndex]);
    }
  }

  // Hàm hỗ trợ: Áp dụng trạng thái
  function applyState(state) {
    if (state.model) modelEntity.setAttribute('gltf-model', state.model);
    if (state.position) modelEntity.setAttribute('position', state.position);
    if (state.rotation) modelEntity.setAttribute('rotation', state.rotation);
    if (state.scale) modelEntity.setAttribute('scale', state.scale);
    if (state.material) modelEntity.setAttribute('material', state.material);
  }

  // Thêm phím tắt undo/redo
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'z') {
      undo();
    } else if (e.ctrlKey && e.key === 'y') {
      redo();
    }
  });

  // Kiểm tra hỗ trợ WebGL
  function checkWebGLSupport() {
    try {
      const canvas = document.createElement('canvas');
      return !!window.WebGLRenderingContext && 
             (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
    } catch(e) {
      return false;
    }
  }

  // Kiểm tra model tải
  modelEntity.addEventListener('model-loaded', () => {
    console.log('Model đã tải thành công!');
  });

  modelEntity.addEventListener('error', (err) => {
    console.error('Lỗi tải model:', err);
  });

  // Yêu cầu quyền camera
  async function requestCameraPermission() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      return true;
    } catch(err) {
      console.error('Không thể truy cập camera:', err);
      return false;
    }
  }

  // Khởi tạo AR
  async function initializeAR() {
    if (!checkWebGLSupport()) {
      alert('Thiết bị không hỗ trợ WebGL');
      return;
    }

    const hasPermission = await requestCameraPermission();
    if (!hasPermission) {
      alert('Vui lòng cấp quyền camera để sử dụng AR');
      return;
    }

    // Thêm loading indicator
    // const loading = document.createElement('div');
    // loading.style.position = 'fixed';
    // loading.style.top = '0';
    // loading.style.left = '0';
    // loading.style.width = '100%';
    // loading.style.height = '100%';
    // loading.style.background = 'rgba(0,0,0,0.7)';
    // loading.style.color = 'white';
    // loading.style.display = 'flex';
    // loading.style.justifyContent = 'center';
    // loading.style.alignItems = 'center';
    // loading.style.zIndex = '1000';
    // loading.innerHTML = '<h2>Đang tải ứng dụng AR...</h2>';
    // document.body.appendChild(loading);

    // Kiểm tra AR context
    try {
      const sceneEl = document.querySelector('a-scene');
      arContext = sceneEl.renderer.xr.getSession();
      
      if (arContext && typeof arContext.addEventListener === 'function') {
        arContext.addEventListener('event', () => console.log('Event triggered'));
      } else {
        console.warn('AR context không khả dụng hoặc không hỗ trợ event listener');
      }
    } catch (error) {
      console.error('Lỗi khi khởi tạo AR context:', error);
    }
  }

  // Gọi hàm khởi tạo
  initializeAR();

  if (navigator.xr) {
    console.log("WebXR is supported");
} else {
    console.error("WebXR is not supported on this browser");
}
navigator.mediaDevices.getUserMedia({ video: true })
    .then(stream => console.log("Camera access granted"))
    .catch(error => console.error("Camera access denied", error));

});