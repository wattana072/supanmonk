// Configuration
const CONFIG = {
    // ใส่ URL ของ Web App ที่ได้จากการ Deploy Code.gs ตรงนี้
    // เช่น 'https://script.google.com/macros/s/.../exec'
    GAS_URL: 'https://script.google.com/macros/s/AKfycbzICQ0DE5Feu7yIu6a2iAgZf4SJuHhEbQn49hnmURiknnP_Nif-yg222PArV9FpAXto/exec'
};

// State
let monksData = [];
let selectedIds = new Set();

// Elements
const tabs = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');
const monkListEl = document.getElementById('monk-list');
const printListEl = document.getElementById('print-list');
const filterGroupEl = document.getElementById('filter-group');
const filterBedroomEl = document.getElementById('filter-bedroom');
const filterAmphurEl = document.getElementById('filter-amphur');
const filterNameEl = document.getElementById('filter-name');
const searchAmphurEl = document.getElementById('search-amphur');
const selectAllEl = document.getElementById('select-all');
const selectedCountEl = document.getElementById('selected-count');
const btnGenerateEl = document.getElementById('btn-generate-slides');
const loadingOverlay = document.getElementById('loading-overlay');
const loadingText = document.getElementById('loading-text');

// Modal Elements
const modal = document.getElementById('edit-modal');
const btnCloseModal = document.querySelector('.close-btn');
const btnCancelModal = document.getElementById('btn-cancel');
const editForm = document.getElementById('edit-form');

// Scanner Elements
const btnScanRegister = document.getElementById('btn-scan-register');
const scannerModal = document.getElementById('scanner-modal');
const closeScannerBtn = document.getElementById('close-scanner-btn');
const scanResultMsg = document.getElementById('scan-result-msg');

// Initialize
async function init() {
    if (!CONFIG.GAS_URL) {
        monkListEl.innerHTML = '<div class="loading" style="color:red">กรุณาตั้งค่า GAS_URL ในไฟล์ app.js ก่อนใช้งาน</div>';
        return;
    }
    await fetchData();
    setupEventListeners();
}

// Fetch Data
async function fetchData() {
    try {
        const response = await fetch(`${CONFIG.GAS_URL}?action=read`);
        const result = await response.json();
        
        if (result.status === 'success') {
            monksData = result.data;
            populateFilters(monksData);
            renderMonkList(monksData);
            renderPrintList(monksData);
        } else {
            console.error('Error fetching data:', result.message);
            monkListEl.innerHTML = '<div class="loading">เกิดข้อผิดพลาดในการโหลดข้อมูล</div>';
        }
    } catch (error) {
        console.error('Error:', error);
        monkListEl.innerHTML = '<div class="loading">เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์</div>';
    }
}

// Event Listeners
function setupEventListeners() {
    // Tabs
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            tab.classList.add('active');
            document.getElementById(tab.dataset.tab).classList.add('active');
        });
    });

    // Filter Monk Data
    const applyFilters = () => {
        const groupVal = filterGroupEl.value;
        const bedroomVal = filterBedroomEl.value;
        const amphurVal = filterAmphurEl.value;
        const nameVal = filterNameEl.value.toLowerCase();
        
        const filtered = monksData.filter(m => {
            const matchGroup = !groupVal || m.Group === groupVal;
            const matchBedroom = !bedroomVal || (m.Bedroom && m.Bedroom.includes(bedroomVal));
            const matchAmphur = !amphurVal || m.Amphur === amphurVal;
            const matchName = !nameVal || (m.Monk && m.Monk.toLowerCase().includes(nameVal));
            
            return matchGroup && matchBedroom && matchAmphur && matchName;
        });
        renderMonkList(filtered);
    };

    filterGroupEl.addEventListener('change', applyFilters);
    filterBedroomEl.addEventListener('change', applyFilters);
    filterAmphurEl.addEventListener('change', applyFilters);
    filterNameEl.addEventListener('input', applyFilters);

    // Search Amphur
    searchAmphurEl.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        const filtered = monksData.filter(m => 
            m.Amphur && m.Amphur.toLowerCase().includes(term)
        );
        renderPrintList(filtered);
    });

    // Select All
    selectAllEl.addEventListener('change', (e) => {
        const checkboxes = document.querySelectorAll('.row-checkbox');
        checkboxes.forEach(cb => {
            cb.checked = e.target.checked;
            updateSelection(cb.dataset.id, e.target.checked);
        });
        updateActionbar();
    });

    // Generate Slides
    btnGenerateEl.addEventListener('click', generateSlides);

    // Scanner Modal
    btnScanRegister.addEventListener('click', openScanner);
    closeScannerBtn.addEventListener('click', closeScanner);

    // Modal
    btnCloseModal.addEventListener('click', closeModal);
    btnCancelModal.addEventListener('click', closeModal);
    editForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await saveEdit();
    });
}

// Render Functions
function renderMonkList(data) {
    if (data.length === 0) {
        monkListEl.innerHTML = '<div class="loading">ไม่พบข้อมูล</div>';
        return;
    }
    
    monkListEl.innerHTML = data.map(m => `
        <div class="list-item" onclick="openEditModal('${m.ID}')">
            <div class="list-item-content">
                <h3>พระ: ${m.Monk} (${m.Temple})</h3>
                <p>กลุ่ม: ${m.Group || '-'} | ที่พัก: ${m.Bedroom || '-'}</p>
            </div>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:var(--text-secondary)"><polyline points="9 18 15 12 9 6"></polyline></svg>
        </div>
    `).join('');
}

function renderPrintList(data) {
    printListEl.innerHTML = data.map(m => `
        <tr>
            <td>
                <label class="checkbox-container">
                    <input type="checkbox" class="row-checkbox" data-id="${m.ID}" ${selectedIds.has(m.ID.toString()) ? 'checked' : ''} onchange="handleRowCheck(this)">
                    <span class="checkmark"></span>
                </label>
            </td>
            <td>${m.Amphur || '-'}</td>
            <td>${m.Temple || '-'}</td>
            <td>${m.Monk || '-'}</td>
        </tr>
    `).join('');
}

// Checkbox logic
window.handleRowCheck = function(cb) {
    updateSelection(cb.dataset.id, cb.checked);
    updateActionbar();
    
    // Update select all state
    const allChecked = document.querySelectorAll('.row-checkbox:not(:checked)').length === 0;
    selectAllEl.checked = allChecked;
};

function updateSelection(id, isChecked) {
    if (isChecked) {
        selectedIds.add(id.toString());
    } else {
        selectedIds.delete(id.toString());
    }
}

function updateActionbar() {
    selectedCountEl.textContent = `เลือก ${selectedIds.size} รายการ`;
    btnGenerateEl.disabled = selectedIds.size === 0;
}

// Modal Logic
window.openEditModal = function(id) {
    const monk = monksData.find(m => m.ID.toString() === id.toString());
    if (!monk) return;
    
    document.getElementById('edit-id').value = monk.ID || '';
    document.getElementById('edit-amphur').value = monk.Amphur || '';
    document.getElementById('edit-temple').value = monk.Temple || '';
    document.getElementById('edit-monk').value = monk.Monk || '';
    document.getElementById('edit-position').value = monk.Position || '';
    document.getElementById('edit-phone').value = monk.Phone || '';
    document.getElementById('edit-monkyear').value = monk.MonkYear || '';
    document.getElementById('edit-group').value = monk.Group || '';
    document.getElementById('edit-bedroom').value = monk.Bedroom || '';
    
    modal.classList.add('show');
}

function closeModal() {
    modal.classList.remove('show');
}

async function saveEdit() {
    const formData = new FormData(editForm);
    const data = Object.fromEntries(formData.entries());
    
    showLoading('กำลังบันทึกข้อมูล...');
    
    try {
        // Send POST request with JSON payload as plain text to avoid CORS preflight in GAS
        const response = await fetch(`${CONFIG.GAS_URL}?action=update`, {
            method: 'POST',
            body: JSON.stringify(data),
            headers: {
                'Content-Type': 'text/plain;charset=utf-8'
            }
        });
        
        const result = await response.json();
        
        if (result.status === 'success') {
            // Update local data
            const index = monksData.findIndex(m => m.ID.toString() === data.ID.toString());
            if (index !== -1) {
                monksData[index] = { ...monksData[index], ...data };
            }
            
            // Re-render
            const activeTab = document.querySelector('.tab-btn.active').dataset.tab;
            if (activeTab === 'monk-data') {
                populateFilters(monksData);
                filterGroupEl.dispatchEvent(new Event('change'));
            } else {
                const term = searchAmphurEl.value.toLowerCase();
                if(term) {
                    searchAmphurEl.dispatchEvent(new Event('input'));
                } else {
                    renderPrintList(monksData);
                }
            }
            
            closeModal();
            alert('บันทึกข้อมูลเรียบร้อย');
        } else {
            alert('เกิดข้อผิดพลาด: ' + result.message);
        }
    } catch (error) {
        alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
        console.error(error);
    } finally {
        hideLoading();
    }
}

// Generate Slides Logic
async function generateSlides() {
    if (selectedIds.size === 0) return;
    
    const idsArray = Array.from(selectedIds);
    showLoading('กำลังสร้างบัตร (อาจใช้เวลาสักครู่)...');
    
    try {
        const response = await fetch(`${CONFIG.GAS_URL}?action=generate_slides`, {
            method: 'POST',
            body: JSON.stringify({ ids: idsArray }),
            headers: {
                'Content-Type': 'text/plain;charset=utf-8'
            }
        });
        
        const result = await response.json();
        
        if (result.status === 'success' && result.url) {
            window.open(result.url, '_blank');
        } else {
            alert('เกิดข้อผิดพลาด: ' + (result.message || 'ไม่สามารถสร้าง Slide ได้'));
        }
    } catch (error) {
        alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
        console.error(error);
    } finally {
        hideLoading();
    }
}

function showLoading(text) {
    loadingText.textContent = text;
    loadingOverlay.classList.remove('hidden');
}

function hideLoading() {
    loadingOverlay.classList.add('hidden');
}

function populateFilters(data) {
    const groups = new Set();
    const amphurs = new Set();
    
    data.forEach(m => {
        if (m.Group) groups.add(m.Group);
        if (m.Amphur) amphurs.add(m.Amphur);
    });
    
    const addOptions = (selectEl, values, defaultText) => {
        const currentVal = selectEl.value;
        selectEl.innerHTML = `<option value="">${defaultText}</option>`;
        Array.from(values).sort().forEach(val => {
            selectEl.innerHTML += `<option value="${val}">${val}</option>`;
        });
        selectEl.value = currentVal;
    };
    
    addOptions(filterGroupEl, groups, 'กลุ่ม(ทั้งหมด)');
    addOptions(filterAmphurEl, amphurs, 'อำเภอ(ทั้งหมด)');
    
    // Hardcode Bedroom options
    const bedroomOptions = ['เถระ01', 'เถระ02', 'หยุด', 'Tent'];
    const currentBedroomVal = filterBedroomEl.value;
    filterBedroomEl.innerHTML = `<option value="">ที่พัก(ทั้งหมด)</option>`;
    bedroomOptions.forEach(val => {
        filterBedroomEl.innerHTML += `<option value="${val}">${val}</option>`;
    });
    filterBedroomEl.value = currentBedroomVal;
}

// Scanner Logic
let html5QrcodeScanner = null;
let isProcessingScan = false;

function openScanner() {
    scannerModal.classList.add('show');
    scanResultMsg.textContent = 'พร้อมแสกน...';
    scanResultMsg.className = 'scan-result-msg';
    
    if (!html5QrcodeScanner) {
        html5QrcodeScanner = new Html5QrcodeScanner(
            "reader",
            { fps: 10, qrbox: {width: 250, height: 250} },
            /* verbose= */ false
        );
        html5QrcodeScanner.render(onScanSuccess, onScanFailure);
    }
}

function closeScanner() {
    scannerModal.classList.remove('show');
    if (html5QrcodeScanner) {
        html5QrcodeScanner.clear().catch(error => {
            console.error("Failed to clear scanner. ", error);
        });
        html5QrcodeScanner = null;
    }
}

function onScanFailure(error) {
    // Ignore routine scan failures
}

async function onScanSuccess(decodedText, decodedResult) {
    if (isProcessingScan) return;
    isProcessingScan = true;
    
    const monk = monksData.find(m => m.ID.toString() === decodedText.toString());
    
    if (!monk) {
        scanResultMsg.textContent = `ไม่พบข้อมูล: ${decodedText}`;
        scanResultMsg.className = 'scan-result-msg scan-error';
        speakText('ไม่พบข้อมูล');
        setTimeout(() => { isProcessingScan = false; }, 2500);
        return;
    }
    
    if (monk.Registed == 1) {
        scanResultMsg.textContent = `ลงทะเบียนแล้ว: ${monk.Monk}`;
        scanResultMsg.className = 'scan-result-msg';
        speakText('ลงทะเบียนแล้ว');
        setTimeout(() => { isProcessingScan = false; }, 2500);
        return;
    }
    
    scanResultMsg.textContent = `กำลังลงทะเบียน: ${monk.Monk}`;
    scanResultMsg.className = 'scan-result-msg';
    
    try {
        const payload = { ID: decodedText, Registed: 1 };
        const response = await fetch(`${CONFIG.GAS_URL}?action=update`, {
            method: 'POST',
            body: JSON.stringify(payload),
            headers: {
                'Content-Type': 'text/plain;charset=utf-8'
            }
        });
        
        const result = await response.json();
        
        if (result.status === 'success') {
            scanResultMsg.textContent = `ลงทะเบียนสำเร็จ: ${monk.Monk}`;
            scanResultMsg.className = 'scan-result-msg scan-success';
            speakText('ลงทะเบียนสำเร็จ');
            monk.Registed = 1;
        } else {
            scanResultMsg.textContent = `ข้อผิดพลาด: ${result.message}`;
            scanResultMsg.className = 'scan-result-msg scan-error';
            speakText('เกิดข้อผิดพลาด');
        }
    } catch (error) {
        scanResultMsg.textContent = 'การเชื่อมต่อล้มเหลว';
        scanResultMsg.className = 'scan-result-msg scan-error';
        speakText('การเชื่อมต่อล้มเหลว');
    }
    
    setTimeout(() => { isProcessingScan = false; }, 3000);
}

function speakText(text) {
    if ('speechSynthesis' in window) {
        // Stop any currently playing speech to avoid queueing delays
        window.speechSynthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'th-TH';
        utterance.rate = 1.2; // Speak slightly faster
        window.speechSynthesis.speak(utterance);
    }
}

// Start
init();
