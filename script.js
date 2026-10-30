const { jsPDF } = window.jspdf;

const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const controlsPanel = document.getElementById('controls-panel');
const previewContainer = document.getElementById('preview-container');
const convertBtn = document.getElementById('convert-btn');
const clearAllBtn = document.getElementById('clear-all-btn');

let imageFiles = [];

// Drag and Drop event listeners
dropZone.addEventListener('click', () => fileInput.click());

dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropZone.classList.add('drag-over');
});

dropZone.addEventListener('dragleave', () => {
  dropZone.classList.remove('drag-over');
});

dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('drag-over');
  handleFiles(e.dataTransfer.files);
});

fileInput.addEventListener('change', (e) => {
  handleFiles(e.target.files);
});

function handleFiles(files) {
  const validFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
  
  if (validFiles.length === 0) return;

  validFiles.forEach(file => {
    const reader = new FileReader();
    reader.onload = (e) => {
      imageFiles.push({
        id: Date.now() + Math.random(),
        src: e.target.result
      });
      renderPreviews();
    };
    reader.readAsDataURL(file);
  });
}

function renderPreviews() {
  previewContainer.innerHTML = '';
  
  if (imageFiles.length > 0) {
    controlsPanel.style.display = 'flex';
  } else {
    controlsPanel.style.display = 'none';
  }

  imageFiles.forEach((item, index) => {
    const card = document.createElement('div');
    card.className = 'preview-card';
    
    card.innerHTML = `
      <img src="${item.src}" alt="Uploaded image ${index + 1}">
      <button class="delete-btn" onclick="removeImage(${index})">&times;</button>
    `;
    
    previewContainer.appendChild(card);
  });
}

function removeImage(index) {
  imageFiles.splice(index, 1);
  renderPreviews();
}

clearAllBtn.addEventListener('click', () => {
  imageFiles = [];
  fileInput.value = '';
  renderPreviews();
});

// PDF Generation
convertBtn.addEventListener('click', () => {
  if (imageFiles.length === 0) return;

  const orientation = document.getElementById('page-orientation').value;
  const marginOption = document.getElementById('margin-select').value;

  const pdf = new jsPDF({
    orientation: orientation,
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  let margin = 0;
  if (marginOption === 'small') margin = 10;
  if (marginOption === 'big') margin = 20;

  const availableWidth = pageWidth - margin * 2;
  const availableHeight = pageHeight - margin * 2;

  imageFiles.forEach((imgObj, index) => {
    if (index > 0) pdf.addPage();

    const img = new Image();
    img.src = imgObj.src;

    // Calculate dimensions to maintain aspect ratio
    let imgWidth = img.width;
    let imgHeight = img.height;
    
    const ratio = Math.min(availableWidth / imgWidth, availableHeight / imgHeight);
    
    const finalWidth = imgWidth * ratio;
    const finalHeight = imgHeight * ratio;

    // Center image on the page
    const x = margin + (availableWidth - finalWidth) / 2;
    const y = margin + (availableHeight - finalHeight) / 2;

    pdf.addImage(imgObj.src, 'JPEG', x, y, finalWidth, finalHeight);
  });

  pdf.save('converted-images.pdf');
});
