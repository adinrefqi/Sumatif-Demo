// ============================================
// PATCH: TAMBAHKAN LOADING STATE KE SEMUA FORM
// ============================================
// File ini akan meng-override fungsi submit yang ada
// untuk menambahkan loading state

// Simpan fungsi asli
const originalSubmitSingleStudent = window.submitSingleStudent;
const originalSubmitPresensiDoc = window.submitPresensiDoc;
const originalSubmitBADoc = window.submitBADoc;

// Override submitSingleStudent dengan loading state
window.submitSingleStudent = async function() {
    const btn = event?.target || document.querySelector('button[onclick*="submitSingleStudent"]');
    
    try {
        window.loadingState.show(btn, 'Mengirim...');
        await originalSubmitSingleStudent();
    } catch (error) {
        console.error('Error:', error);
        showToast('Terjadi kesalahan: ' + error.message, true);
    } finally {
        window.loadingState.hide(btn);
    }
};

// Override submitPresensiDoc dengan loading state
window.submitPresensiDoc = async function() {
    const btn = event?.target || document.querySelector('button[onclick*="submitPresensiDoc"]');
    
    try {
        window.loadingState.show(btn, 'Menyimpan...');
        await originalSubmitPresensiDoc();
    } catch (error) {
        console.error('Error:', error);
        showToast('Terjadi kesalahan: ' + error.message, true);
    } finally {
        window.loadingState.hide(btn);
    }
};

// Override submitBADoc dengan loading state
window.submitBADoc = async function() {
    const btn = event?.target || document.querySelector('button[onclick*="submitBADoc"]');
    
    try {
        window.loadingState.show(btn, 'Menyimpan...');
        await originalSubmitBADoc();
    } catch (error) {
        console.error('Error:', error);
        showToast('Terjadi kesalahan: ' + error.message, true);
    } finally {
        window.loadingState.hide(btn);
    }
};

// Tambahkan loading state untuk validateLogin
const originalValidateLogin = window.validateLogin;
window.validateLogin = async function() {
    const btn = document.querySelector('.login-btn');
    
    try {
        window.loadingState.show(btn, 'Memverifikasi...');
        await originalValidateLogin();
    } catch (error) {
        console.error('Error:', error);
    } finally {
        // Jangan hide jika login berhasil (akan redirect)
        setTimeout(() => {
            if (document.getElementById('login-screen').style.display !== 'none') {
                window.loadingState.hide(btn);
            }
        }, 500);
    }
};

console.log('✅ Form loading patches applied');
