/* ==========================================
   FILENAME: script.js
   Image to PDF Converter - Core Logic
   ========================================== */

document.addEventListener('DOMContentLoaded', () => {
  // Global State
  let images = []; // Holds uploaded image objects { id, file, src, rotation, width, height }
  let generatedPdfBlob = null;
  let generatedPdfUrl = null;

  // DOM Elements
  const themeToggleBtn = document.getElementById('themeToggle');
  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('fileInput');
  const gallerySection = document.getElementById('gallerySection');
  const imageGrid = document.getElementById('imageGrid');
  const imageCountEl = document.getElementById('imageCount');
  const totalSizeEl = document.getElementById('totalSize');
  const clearAllBtn = document.getElementById('clearAllBtn');
  const convertBtn = document.getElementById('convertBtn');

  const qualityRange = document.getElementById('qualityRange');
  const qualityVal = document.getElementById('qualityVal');
  const filenameInput = document.getElementById('filenameInput');

  const progressModal = document.getElementById('progressModal');
  const progressBar = document.getElementById('progressBar');
  const progressStatus = document.getElementById('progressStatus');
  const progressTitle = document.getElementById('progressTitle');

  const resultModal = document.getElementById('resultModal');
  const pdfPreviewFrame = document.getElementById('pdfPreviewFrame');
  const modalDownloadBtn = document.getElementById('modalDownloadBtn');
  const modalResetBtn = document.getElementById('modalResetBtn');
  const closeResultModal = document.getElementById('closeResultModal');

  const privacyModal = document.getElementById('privacyModal');
  const privacyLink = document.getElementById('privacyLink');
  const closePrivacyModal = document.getElementById('closePrivacyModal');

  // --- Theme Toggle Logic ---
  themeToggleBtn.addEventListener('click', () => {
    const isDark = document.body.getAttribute('data-theme') === 'dark';
    document.body.setAttribute('data-theme', isDark ? 'light' : 'dark');
    themeToggleBtn.innerHTML = isDark ? '<i class="fa-solid fa-moon"></i>' : '<i class="fa-solid fa-sun"></i>';
  });

  // --- Range Slider Output Handler ---
  qualityRange.addEventListener('input', (e) => {
    const val = e.target.value;
    let label = 'Medium';
    if (val > 80) label = 'High';
    if (val < 50) label = 'Low';
    qualityVal.textContent = `${val}% (${label})`;
  });

  // --- File Upload & Drag-and-Drop Handlers ---
  ['dragenter', 'dragover'].forEach(eventName => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      dropzone.classList.add('dragover');
    }, false);
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
    }, false);
  });

  dropzone.addEventListener('drop', (e) => {
    const files = e.dataTransfer.files;
    handleFiles(files);
  });

  fileInput.addEventListener('change', (e) => {
    handleFiles(e.target.files);
    fileInput.value = ''; // Reset input selection
  });

  function handleFiles(fileList) {
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    const newFiles = Array.from(fileList).filter(file => validTypes.includes(file.type));

    if (newFiles.length === 0) {
      showToast('Please select valid JPG, PNG, or WEBP images.', 'error');
      return;
    }

    let loadedCount = 0;
    newFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          images.push({
            id: 'img_' + Math.random().toString(36).substring(2, 9),
            file: file,
            src: e.target.result,
            width: img.width,
            height: img.height,
            rotation: 0
          });
          loadedCount++;
          if (loadedCount === newFiles.length) {
            updateUI();
            showToast(`Added ${loadedCount} image(s).`);
          }
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

  // --- UI Renderer ---
  function updateUI() {
    if (images.length > 0) {
      gallerySection.classList.remove('hidden');
      convertBtn.removeAttribute('disabled');
    } else {
      gallerySection.classList.add('hidden');
      convertBtn.setAttribute('disabled', 'true');
    }

    imageCountEl.textContent = images.length;

    // Calculate total size
    const bytes = images.reduce((acc, curr) => acc + curr.file.size, 0);
    totalSizeEl.textContent = formatBytes(bytes);

    // Render Grid
    imageGrid.innerHTML = '';
    images.forEach((imgObj, index) => {
      const card = document.createElement('div');
      card.className = 'image-card';
      card.innerHTML = `
        <div class="image-preview-wrapper">
          <img src="${imgObj.src}" style="transform: rotate(${imgObj.rotation}deg);" alt="preview">
          <div class="image-card-actions">
            <button class="btn-mini rotate-btn" onclick="rotateImage(${index})" title="Rotate 90°">
              <i class="fa-solid fa-rotate-right"></i>
            </button>
            <button class="btn-mini" onclick="removeImage(${index})" title="Remove">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>
        </div>
        <div class="image-details">
          <span class="image-name">${imgObj.file.name}</span>
          <div class="image-meta">
            <span>${formatBytes(imgObj.file.size)}</span>
            <span>#${index + 1}</span>
          </div>
        </div>
        <div class="image-reorder-controls">
          <button class="btn-reorder" onclick="moveImage(${index}, -1)" ${index === 0 ? 'disabled' : ''}>
            <i class="fa-solid fa-arrow-left"></i>
          </button>
          <button class="btn-reorder" onclick="moveImage(${index}, 1)" ${index === images.length - 1 ? 'disabled' : ''}>
            <i class="fa-solid fa-arrow-right"></i>
          </button>
        </div>
      `;
      imageGrid.appendChild(card);
    });
  }

  // Global scope binding for card action buttons
  window.rotateImage = function(index) {
    images[index].rotation = (images[index].rotation + 90) % 360;
    updateUI();
  };

  window.removeImage = function(index) {
    images.splice(index, 1);
    updateUI();
  };

  window.moveImage = function(index, direction) {
    const targetIndex = index + direction;
    if (targetIndex >= 0 && targetIndex < images.length) {
      const temp = images[index];
      images[index] = images[targetIndex];
      images[targetIndex] = temp;
      updateUI();
    }
  };

  clearAllBtn.addEventListener('click', () => {
    images = [];
    updateUI();
    showToast('All images removed.');
  });

  // --- PDF Generation Logic ---
  convertBtn.addEventListener('click', async () => {
    if (images.length === 0) return;

    const pageSize = document.getElementById('pageSizeSelect').value;
    const orientation = document.querySelector('input[name="orientation"]:checked').value;
    const margin = parseInt(document.querySelector('input[name="margin"]:checked').value, 10);
    const quality = parseFloat(qualityRange.value) / 100;
    const outputMode = document.getElementById('outputModeSelect').value;
    const customFilename = filenameInput.value.trim() || 'Converted_Document';

    progressModal.classList.remove('hidden');
    progressTitle.textContent = outputMode === 'single' ? 'Generating PDF...' : 'Generating Zip File...';

    try {
      if (outputMode === 'single') {
        const pdfBlob = await buildSinglePDF(images, { pageSize, orientation, margin, quality });
        generatedPdfBlob = pdfBlob;
        generatedPdfUrl = URL.createObjectURL(pdfBlob);
        pdfPreviewFrame.src = generatedPdfUrl;
        
        document.getElementById('resultDetails').textContent = `Filename: ${customFilename}.pdf`;
      } else {
        // Zip multiple PDFs
        const zip = new JSZip();
        for (let i = 0; i < images.length; i++) {
          updateProgress(i + 1, images.length, `Processing page ${i + 1} of ${images.length}...`);
          const singleBlob = await buildSinglePDF([images[i]], { pageSize, orientation, margin, quality });
          zip.file(`${customFilename}_page_${i + 1}.pdf`, singleBlob);
        }
        
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        generatedPdfBlob = zipBlob;
        generatedPdfUrl = URL.createObjectURL(zipBlob);
        pdfPreviewFrame.src = 'about:blank'; // Iframe preview unavailable for Zip output
        document.getElementById('resultDetails').textContent = `Package: ${customFilename}.zip (${images.length} files)`;
      }

      progressModal.classList.add('hidden');
      resultModal.classList.remove('hidden');
    } catch (err) {
      console.error(err);
      progressModal.classList.add('hidden');
      showToast('An error occurred while generating the PDF.', 'error');
    }
  });

  // Helper function: Convert image element canvas to scaled DataURL
  function processImageToCanvas(imgObj, quality) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        const isRotated90 = (imgObj.rotation % 180 !== 0);
        const targetWidth = isRotated90 ? img.height : img.width;
        const targetHeight = isRotated90 ? img.width : img.height;

        canvas.width = targetWidth;
        canvas.height = targetHeight;

        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate((imgObj.rotation * Math.PI) / 180);
        ctx.drawImage(img, -img.width / 2, -img.height / 2);

        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve({ dataUrl, width: targetWidth, height: targetHeight });
      };
      img.src = imgObj.src;
    });
  }

  // Core Builder Function using jsPDF
  async function buildSinglePDF(imgList, options) {
    const { jsPDF } = window.jspdf;
    let doc = null;

    for (let i = 0; i < imgList.length; i++) {
      updateProgress(i + 1, imgList.length, `Formatting image ${i + 1} of ${imgList.length}...`);
      
      const { dataUrl, width: imgW, height: imgH } = await processImageToCanvas(imgList[i], options.quality);

      let pageOrient = options.orientation;
      if (pageOrient === 'auto') {
        pageOrient = imgW > imgH ? 'landscape' : 'portrait';
      }

      // Initialize PDF document on first loop
      if (i === 0) {
        if (options.pageSize === 'fit') {
          doc = new jsPDF({
            orientation: pageOrient,
            unit: 'px',
            format: [imgW + (options.margin * 2), imgH + (options.margin * 2)]
          });
        } else {
          doc = new jsPDF({
            orientation: pageOrient,
            unit: 'mm',
            format: options.pageSize
          });
        }
      } else {
        if (options.pageSize === 'fit') {
          doc.addPage([imgW + (options.margin * 2), imgH + (options.margin * 2)], pageOrient);
        } else {
          doc.addPage(options.pageSize, pageOrient);
        }
      }

      // Calculate bounding box dimensions inside margins
      const pdfPageW = doc.internal.pageSize.getWidth();
      const pdfPageH = doc.internal.pageSize.getHeight();
      
      const availW = pdfPageW - (options.margin * 2);
      const availH = pdfPageH - (options.margin * 2);

      const ratio = Math.min(availW / imgW, availH / imgH);
      const finalW = imgW * ratio;
      const finalH = imgH * ratio;

      // Center alignment inside margins
      const xPos = options.margin + (availW - finalW) / 2;
      const yPos = options.margin + (availH - finalH) / 2;

      doc.addImage(dataUrl, 'JPEG', xPos, yPos, finalW, finalH);
    }

    return doc.output('blob');
  }

  function updateProgress(current, total, statusText) {
    const percentage = Math.round((current / total) * 100);
    progressBar.style.width = percentage + '%';
    progressStatus.textContent = statusText;
  }

  // --- Download & Modal Controls ---
  modalDownloadBtn.addEventListener('click', () => {
    if (!generatedPdfBlob) return;
    
    const customFilename = filenameInput.value.trim() || 'Converted_Document';
    const isZip = document.getElementById('outputModeSelect').value === 'multiple';
    const ext = isZip ? '.zip' : '.pdf';

    const a = document.createElement('a');
    a.href = generatedPdfUrl;
    a.download = customFilename + ext;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  });

  closeResultModal.addEventListener('click', () => {
    resultModal.classList.add('hidden');
  });

  modalResetBtn.addEventListener('click', () => {
    resultModal.classList.add('hidden');
    images = [];
    updateUI();
  });

  // Privacy Policy Modal Events
  privacyLink.addEventListener('click', (e) => {
    e.preventDefault();
    privacyModal.classList.remove('hidden');
  });

  closePrivacyModal.addEventListener('click', () => {
    privacyModal.classList.add('hidden');
  });

  // Utility Toast Handler
  function showToast(msg, type = 'info') {
    const toastContainer = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `
      <i class="fa-solid ${type === 'error' ? 'fa-circle-exclamation' : 'fa-circle-info'}" style="color: ${type === 'error' ? 'var(--danger)' : 'var(--primary)'}"></i>
      <span>${msg}</span>
    `;
    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.remove();
    }, 3000);
  }

  function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
});
