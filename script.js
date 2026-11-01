let imageFiles = [];

// DOM Elements
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const previewGrid = document.getElementById('preview-grid');
const controls = document.getElementById('controls');
const actionSection = document.getElementById('action-section');
const clearAllBtn = document.getElementById('clear-all-btn');
const convertBtn = document.getElementById('convert-btn');

// Drag and Drop Events
dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
});

dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover');
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    handleFiles(e.dataTransfer.files);
});

// File Input Change Event
fileInput.addEventListener('change', (e) => {
    handleFiles(e.target.files);
});

// Process Selected Files
function handleFiles(files) {
    const validTypes = ['image/png', 'image/jpeg', 'image/webp'];
    
    Array.from(files).forEach((file) => {
        if (validTypes.includes(file.type)) {
            imageFiles.push(file);
        }
    });

    renderPreviews();
    fileInput.value = ''; // Reset input
}

// Render Preview Grid
function renderPreviews() {
    previewGrid.innerHTML = '';

    if (imageFiles.length === 0) {
        controls.style.display = 'none';
        actionSection.style.display = 'none';
        return;
    }

    controls.style.display = 'flex';
    actionSection.style.display = 'block';

    imageFiles.forEach((file, index) => {
        const card = document.createElement('div');
        card.classList.add('preview-card');

        const img = document.createElement('img');
        img.src = URL.createObjectURL(file);

        const removeBtn = document.createElement('button');
        removeBtn.classList.add('remove-btn');
        removeBtn.innerHTML = '<i class="fa-solid fa-xmark"></i>';
        removeBtn.onclick = () => removeImage(index);

        card.appendChild(img);
        card.appendChild(removeBtn);
        previewGrid.appendChild(card);
    });
}

// Remove Single Image
function removeImage(index) {
    imageFiles.splice(index, 1);
    renderPreviews();
}

// Clear All Images
clearAllBtn.addEventListener('click', () => {
    imageFiles = [];
    renderPreviews();
});

// Convert Images to PDF
convertBtn.addEventListener('click', async () => {
    if (imageFiles.length === 0) return;

    convertBtn.disabled = true;
    convertBtn.innerText = 'Generating PDF...';

    const { jsPDF } = window.jspdf;
    const orientation = document.getElementById('page-orientation').value;
    const margin = parseFloat(document.getElementById('page-margin').value) || 0;

    const doc = new jsPDF({
        orientation: orientation,
        unit: 'mm',
        format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    for (let i = 0; i < imageFiles.length; i++) {
        const file = imageFiles[i];
        const imgData = await getBase64(file);
        const imgProps = await getImageDimensions(imgData);

        if (i > 0) {
            doc.addPage();
        }

        // Calculate proportions to fit within margins
        const availableWidth = pageWidth - (margin * 2);
        const availableHeight = pageHeight - (margin * 2);

        let imgWidth = availableWidth;
        let imgHeight = (imgProps.height * availableWidth) / imgProps.width;

        if (imgHeight > availableHeight) {
            imgHeight = availableHeight;
            imgWidth = (imgProps.width * availableHeight) / imgProps.height;
        }

        // Center image on the page
        const xPos = margin + (availableWidth - imgWidth) / 2;
        const yPos = margin + (availableHeight - imgHeight) / 2;

        const format = file.type === 'image/png' ? 'PNG' : 'JPEG';
        doc.addImage(imgData, format, xPos, yPos, imgWidth, imgHeight);
    }

    doc.save('converted-images.pdf');

    convertBtn.disabled = false;
    convertBtn.innerHTML = '<i class="fa-solid fa-download"></i> Convert & Download PDF';
});

// Helper: Convert File to Base64 Data URL
function getBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = (error) => reject(error);
    });
}

// Helper: Get Image Dimensions
function getImageDimensions(src) {
    return new Promise((resolve) => {
        const img = new Image();
        img.src = src;
        img.onload = () => {
            resolve({ width: img.width, height: img.height });
        };
    });
}
