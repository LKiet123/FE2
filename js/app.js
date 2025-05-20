document.addEventListener('DOMContentLoaded', async () => {
  const modelEntity = document.querySelector('#object');
  const modelSelector = document.getElementById('modelSelector');
  const scaleSlider = document.getElementById('scaleSlider');
  const colorPicker = document.getElementById('colorPicker');
  const materialSelector = document.getElementById('materialSelector');
  const toggleLightBtn = document.getElementById('toggleLight');
  const screenshotBtn = document.getElementById('screenshot');
  const ambientLight = document.querySelector('#ambientLight');
  const directionalLight = document.querySelector('#directionalLight');
  const scene = document.querySelector('a-scene');

  // Đổi mô hình
  modelSelector.addEventListener('change', (e) => {
    const model = e.target.value;
    modelEntity.setAttribute('gltf-model', `#${model}Model`);
  });

  // Thay đổi kích thước
  scaleSlider.addEventListener('input', (e) => {
    const s = e.target.value;
    modelEntity.setAttribute('scale', `${s} ${s} ${s}`);
  });

  // Thay đổi màu sắc
  colorPicker.addEventListener('input', (e) => {
    modelEntity.setAttribute('material', 'color', e.target.value);
  });

  // Thay đổi vật liệu
  materialSelector.addEventListener('change', (e) => {
    const mat = e.target.value;
    switch (mat) {
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

  // Bật/Tắt đèn
  toggleLightBtn.addEventListener('click', () => {
    const newIntensity = ambientLight.getAttribute('intensity') > 0 ? 0 : 0.5;
    ambientLight.setAttribute('intensity', newIntensity);
    directionalLight.setAttribute('intensity', newIntensity);
  });

  // Chụp ảnh
  screenshotBtn.addEventListener('click', () => {
    scene.components.screenshot.capture('perspective').then(canvas => {
      const link = document.createElement('a');
      link.download = 'ar-furniture-' + Date.now() + '.png';
      link.href = canvas.toDataURL();
      link.click();
    });
  });

  // Kiểm tra và yêu cầu camera
  async function requestCameraPermission() {
    try {
      await navigator.mediaDevices.getUserMedia({ video: true });
      console.log("Camera access granted");
    } catch (err) {
      console.error("Không thể truy cập camera:", err);
      alert("Vui lòng cấp quyền camera trong trình duyệt.");
    }
  }

  // Kiểm tra hỗ trợ WebGL
  function checkWebGLSupport() {
    try {
      const canvas = document.createElement('canvas');
      return !!window.WebGLRenderingContext && (
        canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
      );
    } catch (e) {
      return false;
    }
  }

  if (!checkWebGLSupport()) {
    alert("Thiết bị không hỗ trợ WebGL.");
    return;
  }

  await requestCameraPermission();
});
