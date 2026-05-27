// ============================================
// UX ENHANCEMENTS - SISTEM MANAJEMEN NILAI
// ============================================

// ============================================
// 1. LOADING STATE UNTUK SEMUA FORM SUBMIT
// ============================================

class LoadingState {
    constructor() {
        this.activeLoaders = new Set();
        this.createStyles();
    }

    createStyles() {
        if (document.getElementById('loading-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'loading-styles';
        style.textContent = `
            .btn-loading {
                position: relative;
                pointer-events: none;
                opacity: 0.7;
            }
            
            .btn-loading::after {
                content: '';
                position: absolute;
                width: 16px;
                height: 16px;
                top: 50%;
                left: 50%;
                margin-left: -8px;
                margin-top: -8px;
                border: 2px solid transparent;
                border-top-color: currentColor;
                border-radius: 50%;
                animation: btn-spin 0.6s linear infinite;
            }
            
            @keyframes btn-spin {
                to { transform: rotate(360deg); }
            }
            
            .form-loading {
                pointer-events: none;
                opacity: 0.6;
            }
            
            /* Loading Overlay */
            .loading-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(15, 23, 42, 0.8);
                backdrop-filter: blur(4px);
                z-index: 9999;
                display: flex;
                align-items: center;
                justify-content: center;
                opacity: 0;
                visibility: hidden;
                transition: all 0.3s ease;
            }
            
            .loading-overlay.active {
                opacity: 1;
                visibility: visible;
            }
            
            .loading-spinner {
                background: rgba(30, 41, 59, 0.95);
                border: 1px solid rgba(99, 102, 241, 0.3);
                border-radius: 20px;
                padding: 2rem 3rem;
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 1.5rem;
                box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
            }
            
            .spinner-circle {
                width: 50px;
                height: 50px;
                border: 4px solid rgba(99, 102, 241, 0.2);
                border-top-color: #6366f1;
                border-radius: 50%;
                animation: spin 0.8s linear infinite;
            }
            
            @keyframes spin {
                to { transform: rotate(360deg); }
            }
            
            .loading-text {
                color: #f8fafc;
                font-size: 1rem;
                font-weight: 600;
                text-align: center;
            }
            
            .loading-subtext {
                color: #94a3b8;
                font-size: 0.85rem;
                text-align: center;
            }
        `;
        document.head.appendChild(style);
    }

    show(button, text = 'Memproses...') {
        if (!button) return;
        
        // Simpan teks asli
        if (!button.dataset.originalText) {
            button.dataset.originalText = button.innerHTML;
        }
        
        // Tambah class loading
        button.classList.add('btn-loading');
        button.disabled = true;
        
        // Update teks
        const icon = '<i class="fas fa-spinner fa-spin"></i>';
        button.innerHTML = `${icon} ${text}`;
        
        this.activeLoaders.add(button);
    }

    hide(button) {
        if (!button) return;
        
        button.classList.remove('btn-loading');
        button.disabled = false;
        
        // Restore teks asli
        if (button.dataset.originalText) {
            button.innerHTML = button.dataset.originalText;
        }
        
        this.activeLoaders.delete(button);
    }

    showOverlay(text = 'Memproses data...', subtext = 'Mohon tunggu sebentar') {
        let overlay = document.getElementById('global-loading-overlay');
        
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'global-loading-overlay';
            overlay.className = 'loading-overlay';
            overlay.innerHTML = `
                <div class="loading-spinner">
                    <div class="spinner-circle"></div>
                    <div class="loading-text">${text}</div>
                    <div class="loading-subtext">${subtext}</div>
                </div>
            `;
            document.body.appendChild(overlay);
        }
        
        setTimeout(() => overlay.classList.add('active'), 10);
    }

    hideOverlay() {
        const overlay = document.getElementById('global-loading-overlay');
        if (overlay) {
            overlay.classList.remove('active');
            setTimeout(() => overlay.remove(), 300);
        }
    }
}

// Instance global
window.loadingState = new LoadingState();

// ============================================
// 2. KONFIRMASI LOGOUT/KELUAR
// ============================================

class LogoutConfirmation {
    constructor() {
        this.createModal();
        this.setupEventListeners();
    }

    createModal() {
        if (document.getElementById('logout-modal')) return;
        
        const modal = document.createElement('div');
        modal.id = 'logout-modal';
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 450px; text-align: center;">
                <div style="font-size: 4rem; color: #f59e0b; margin-bottom: 1rem;">
                    <i class="fas fa-sign-out-alt"></i>
                </div>
                <h3 style="font-size: 1.5rem; margin-bottom: 0.5rem; color: #f8fafc;">
                    Keluar dari Sistem?
                </h3>
                <p style="color: #94a3b8; margin-bottom: 2rem; line-height: 1.6;">
                    Anda akan keluar dari dashboard dan harus login kembali untuk mengakses sistem.
                </p>
                <div style="display: flex; gap: 1rem; justify-content: center;">
                    <button onclick="window.logoutConfirm.cancel()" class="btn-outline" style="flex: 1; padding: 0.8rem;">
                        <i class="fas fa-times"></i> Batal
                    </button>
                    <button onclick="window.logoutConfirm.confirm()" class="btn-main" style="flex: 1; padding: 0.8rem; background: #ef4444;">
                        <i class="fas fa-sign-out-alt"></i> Ya, Keluar
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    show() {
        const modal = document.getElementById('logout-modal');
        if (modal) {
            modal.classList.add('active');
        }
    }

    hide() {
        const modal = document.getElementById('logout-modal');
        if (modal) {
            modal.classList.remove('active');
        }
    }

    cancel() {
        this.hide();
    }

    confirm() {
        this.hide();
        window.loadingState.showOverlay('Keluar dari sistem...', 'Sampai jumpa!');
        
        // Clear localStorage & sessionStorage
        sessionStorage.removeItem('isLoggedIn');
        sessionStorage.removeItem('role');
        sessionStorage.removeItem('nomorUjian');
        sessionStorage.removeItem('namaSiswa');
        sessionStorage.removeItem('namaGuru');
        sessionStorage.removeItem('user_grade');

        localStorage.removeItem('student_name');
        localStorage.removeItem('student_class');
        localStorage.removeItem('student_room');
        localStorage.removeItem('student_id');
        localStorage.removeItem('user_grade');
        
        // Redirect setelah delay
        setTimeout(() => {
            window.location.reload();
        }, 1500);
    }

    setupEventListeners() {
        // Intercept browser back button
        window.addEventListener('popstate', (e) => {
            e.preventDefault();
            this.show();
            window.history.pushState(null, '', window.location.href);
        });
        
        // Push initial state
        window.history.pushState(null, '', window.location.href);
    }
}

// Instance global
window.logoutConfirm = new LogoutConfirmation();

// ============================================
// 3. TIMER COUNTDOWN UNTUK SESI UJIAN
// ============================================

class ExamTimer {
    constructor() {
        this.timers = [];
        this.createStyles();
    }

    createStyles() {
        if (document.getElementById('timer-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'timer-styles';
        style.textContent = `
            .exam-timer {
                display: inline-flex;
                align-items: center;
                gap: 0.5rem;
                padding: 0.5rem 1rem;
                background: rgba(99, 102, 241, 0.1);
                border: 1px solid rgba(99, 102, 241, 0.2);
                border-radius: 12px;
                font-weight: 600;
                font-size: 0.9rem;
                color: #818cf8;
                transition: all 0.3s ease;
            }
            
            .exam-timer.warning {
                background: rgba(245, 158, 11, 0.1);
                border-color: rgba(245, 158, 11, 0.3);
                color: #fbbf24;
                animation: pulse-warning 2s infinite;
            }
            
            .exam-timer.danger {
                background: rgba(239, 68, 68, 0.1);
                border-color: rgba(239, 68, 68, 0.3);
                color: #ef4444;
                animation: pulse-danger 1s infinite;
            }
            
            @keyframes pulse-warning {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.05); }
            }
            
            @keyframes pulse-danger {
                0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
                50% { transform: scale(1.08); box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); }
            }
            
            .timer-icon {
                font-size: 1rem;
            }
            
            .timer-text {
                font-family: 'Courier New', monospace;
                letter-spacing: 0.5px;
            }
            
            /* Timer Modal */
            .timer-alert-modal {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%) scale(0.9);
                background: rgba(30, 41, 59, 0.98);
                border: 2px solid #ef4444;
                border-radius: 20px;
                padding: 2rem;
                z-index: 10000;
                box-shadow: 0 0 50px rgba(239, 68, 68, 0.5);
                opacity: 0;
                visibility: hidden;
                transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                max-width: 400px;
                text-align: center;
            }
            
            .timer-alert-modal.show {
                opacity: 1;
                visibility: visible;
                transform: translate(-50%, -50%) scale(1);
            }
        `;
        document.head.appendChild(style);
    }

    // Jadwal ujian (sesuaikan dengan jadwal sebenarnya)
    getExamSchedule() {
        return [
            {
                name: 'Pendidikan Agama',
                date: '2026-05-29',
                startTime: '07:15',
                endTime: '08:45',
                session: 1
            },
            {
                name: 'Bahasa Indonesia',
                date: '2026-05-29',
                startTime: '09:15',
                endTime: '10:45',
                session: 2
            },
            {
                name: 'Bahasa Inggris',
                date: '2026-06-02',
                startTime: '07:15',
                endTime: '08:45',
                session: 1
            },
            {
                name: 'Seni Budaya',
                date: '2026-06-02',
                startTime: '09:15',
                endTime: '10:45',
                session: 2
            },
            {
                name: 'Matematika',
                date: '2026-06-03',
                startTime: '07:15',
                endTime: '09:15',
                session: 1
            },
            {
                name: 'PJOK',
                date: '2026-06-03',
                startTime: '09:30',
                endTime: '11:00',
                session: 2
            },
            {
                name: 'IPA',
                date: '2026-06-05',
                startTime: '07:15',
                endTime: '08:45',
                session: 1
            },
            {
                name: 'PPKn',
                date: '2026-06-05',
                startTime: '09:15',
                endTime: '10:45',
                session: 2
            },
            {
                name: 'IPS',
                date: '2026-06-08',
                startTime: '07:15',
                endTime: '08:45',
                session: 1
            },
            {
                name: 'Bahasa Jawa',
                date: '2026-06-08',
                startTime: '09:15',
                endTime: '10:45',
                session: 2
            },
            {
                name: 'BK/BP',
                date: '2026-06-08',
                startTime: '11:00',
                endTime: '12:00',
                session: 3
            },
            {
                name: 'Informatika',
                date: '2026-06-09',
                startTime: '07:15',
                endTime: '08:45',
                session: 1
            },
            {
                name: 'Bahasa Mandarin',
                date: '2026-06-09',
                startTime: '09:15',
                endTime: '10:45',
                session: 2
            },
            {
                name: 'Prakarya/Coding',
                date: '2026-06-09',
                startTime: '11:00',
                endTime: '12:00',
                session: 3
            }
        ];
    }

    getNextExam() {
        const now = new Date();
        const schedule = this.getExamSchedule();
        
        for (let exam of schedule) {
            const examDateTime = new Date(`${exam.date}T${exam.startTime}:00`);
            if (examDateTime > now) {
                return { ...exam, dateTime: examDateTime };
            }
        }
        
        return null;
    }

    getCurrentExam() {
        const now = new Date();
        const schedule = this.getExamSchedule();
        
        for (let exam of schedule) {
            const startDateTime = new Date(`${exam.date}T${exam.startTime}:00`);
            const endDateTime = new Date(`${exam.date}T${exam.endTime}:00`);
            
            if (now >= startDateTime && now <= endDateTime) {
                return { ...exam, startDateTime, endDateTime };
            }
        }
        
        return null;
    }

    formatTime(ms) {
        const totalSeconds = Math.floor(ms / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        
        if (hours > 0) {
            return `${hours}j ${minutes}m ${seconds}d`;
        } else if (minutes > 0) {
            return `${minutes}m ${seconds}d`;
        } else {
            return `${seconds}d`;
        }
    }

    updateCountdown() {
        const countdownEl = document.getElementById('countdown');
        if (!countdownEl) return;
        
        const nextExam = this.getNextExam();
        
        if (!nextExam) {
            countdownEl.textContent = 'Semua ujian selesai';
            countdownEl.style.color = '#10b981';
            return;
        }
        
        const now = new Date();
        const timeLeft = nextExam.dateTime - now;
        
        if (timeLeft <= 0) {
            countdownEl.textContent = 'Ujian sedang berlangsung';
            countdownEl.style.color = '#10b981';
        } else {
            countdownEl.textContent = this.formatTime(timeLeft);
            
            // Ubah warna berdasarkan waktu tersisa
            if (timeLeft < 3600000) { // < 1 jam
                countdownEl.style.color = '#ef4444';
            } else if (timeLeft < 86400000) { // < 1 hari
                countdownEl.style.color = '#fbbf24';
            } else {
                countdownEl.style.color = '#818cf8';
            }
        }
    }

    showTimeWarning(message, type = 'warning') {
        const modal = document.createElement('div');
        modal.className = 'timer-alert-modal show';
        modal.innerHTML = `
            <div style="font-size: 4rem; color: ${type === 'danger' ? '#ef4444' : '#fbbf24'}; margin-bottom: 1rem;">
                <i class="fas fa-clock"></i>
            </div>
            <h3 style="color: #f8fafc; margin-bottom: 0.5rem;">Peringatan Waktu!</h3>
            <p style="color: #94a3b8; margin-bottom: 1.5rem;">${message}</p>
            <button onclick="this.parentElement.remove()" class="btn-main" style="width: 100%;">
                Saya Mengerti
            </button>
        `;
        document.body.appendChild(modal);
        
        // Auto close after 5 seconds
        setTimeout(() => {
            modal.classList.remove('show');
            setTimeout(() => modal.remove(), 300);
        }, 5000);
    }

    init() {
        // Update countdown setiap detik
        this.updateCountdown();
        setInterval(() => this.updateCountdown(), 1000);
        
        // Check current exam and show timer if active
        const currentExam = this.getCurrentExam();
        if (currentExam) {
            this.startExamTimer(currentExam);
        }
    }

    startExamTimer(exam) {
        // Create timer display in status bar
        const statusBar = document.querySelector('.status-content');
        if (!statusBar) return;
        
        const timerContainer = document.createElement('div');
        timerContainer.className = 'status-item';
        timerContainer.innerHTML = `
            <i class="fas fa-stopwatch" style="font-size: 2rem; color: #6366f1;"></i>
            <div class="status-text">
                <span class="label">Waktu Tersisa</span>
                <span id="exam-timer-display" class="value exam-timer">
                    <span class="timer-icon"><i class="fas fa-clock"></i></span>
                    <span class="timer-text">--:--:--</span>
                </span>
            </div>
        `;
        
        // Add divider
        const divider = document.createElement('div');
        divider.className = 'status-divider';
        statusBar.appendChild(divider);
        statusBar.appendChild(timerContainer);
        
        let warningShown = false;
        let dangerShown = false;
        
        const updateTimer = () => {
            const now = new Date();
            const timeLeft = exam.endDateTime - now;
            
            if (timeLeft <= 0) {
                this.showTimeWarning('Waktu ujian telah habis! Segera kumpulkan jawaban Anda.', 'danger');
                clearInterval(timerInterval);
                return;
            }
            
            const timerEl = document.getElementById('exam-timer-display');
            if (!timerEl) return;
            
            const totalSeconds = Math.floor(timeLeft / 1000);
            const hours = Math.floor(totalSeconds / 3600);
            const minutes = Math.floor((totalSeconds % 3600) / 60);
            const seconds = totalSeconds % 60;
            
            const timeStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
            timerEl.querySelector('.timer-text').textContent = timeStr;
            
            // Update styling based on time left
            timerEl.classList.remove('warning', 'danger');
            if (timeLeft < 300000) { // < 5 menit
                timerEl.classList.add('danger');
                if (!dangerShown) {
                    this.showTimeWarning('Waktu tersisa kurang dari 5 menit! Segera selesaikan ujian Anda.', 'danger');
                    dangerShown = true;
                }
            } else if (timeLeft < 600000) { // < 10 menit
                timerEl.classList.add('warning');
                if (!warningShown) {
                    this.showTimeWarning('Waktu tersisa 10 menit. Pastikan Anda sudah memeriksa jawaban.', 'warning');
                    warningShown = true;
                }
            }
        };
        
        updateTimer();
        const timerInterval = setInterval(updateTimer, 1000);
    }
}

// Instance global
window.examTimer = new ExamTimer();

// ============================================
// AUTO-INIT SAAT DOM READY
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('✅ UX Enhancements loaded');
    
    // Init exam timer
    window.examTimer.init();
    
    // Add logout button to navbar if not exists
    addLogoutButton();
});

function addLogoutButton() {
    const navLinks = document.querySelector('.nav-links');
    if (!navLinks) return;
    
    // Check if logout button already exists
    if (document.getElementById('logout-btn')) return;
    
    const logoutLi = document.createElement('li');
    logoutLi.innerHTML = `
        <a href="javascript:void(0)" id="logout-btn" onclick="window.logoutConfirm.show()" 
           style="color: #ef4444; display: flex; align-items: center; gap: 0.5rem;">
            <i class="fas fa-sign-out-alt"></i> Keluar
        </a>
    `;
    navLinks.appendChild(logoutLi);
}

// Export untuk digunakan di file lain
window.UXEnhancements = {
    loading: window.loadingState,
    logout: window.logoutConfirm,
    timer: window.examTimer
};
