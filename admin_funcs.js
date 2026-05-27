        function openModal(id) {
            event.preventDefault();
            document.getElementById(id).classList.add('active');
            document.body.style.overflow = 'hidden';

            if (id === 'modal-presensi') {
                // Initialize SigPads AFTER elements are in DOM and visible
                setTimeout(() => {
                    initSignaturePad('sig-stu-tunggal');
                    initSignaturePad('sig-p1');
                    initSignaturePad('sig-p2');
                }, 400);
            }

            if (id === 'modal-ba') {
                const hasDraft = loadBADraft();
                if (!hasDraft) {
                    autoFillBADate();
                }

                setTimeout(() => {
                    initSignaturePad('ba-sig-p1');
                    initSignaturePad('ba-sig-p2');
                }, 300);
            }

            if (id === 'modal-riwayat') {
                switchRiwayatTab('presensi');
            }
        }

        function autoFillBADate() {
            const now = new Date();
            const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
            const hari = days[now.getDay()];
            const tanggal = now.toISOString().split('T')[0];

            document.getElementById('ba-hari').value = hari;
            document.getElementById('ba-tanggal-full').value = tanggal;
        }

        function saveBADraft() {
            const modal = document.getElementById('modal-ba');
            if (!modal) return;

            const data = {};
            const inputs = modal.querySelectorAll('input, select, textarea');
            inputs.forEach(el => {
                if (el.id) data[el.id] = el.value;
            });

            localStorage.setItem('draft_ba_guru', JSON.stringify(data));
        }

        function loadBADraft() {
            const draftStr = localStorage.getItem('draft_ba_guru');
            if (!draftStr) return false;

            try {
                const data = JSON.parse(draftStr);
                Object.keys(data).forEach(id => {
                    const el = document.getElementById(id);
                    if (el) el.value = data[id];
                });
                showToast('Draft Berita Acara berhasil dimuat ulang');
                return true;
            } catch (e) {
                console.error('Gagal memuat draft:', e);
                return false;
            }
        }

        function closeModal(id) {
            document.getElementById(id).classList.remove('active');
            document.body.style.overflow = '';
            // Reset warning
            const warn = document.getElementById('grade-mismatch-warning');
            if (warn) warn.style.display = 'none';
        }

        // Grade Gateway Logic
        window.selectInitialGrade = function (grade) {
            localStorage.setItem('user_grade', grade);
            activeClass = grade;

            // Update tabs UI
            document.querySelectorAll('.tab-btn:not(.riwayat-tab-btn)').forEach(b => {
                b.classList.toggle('active', b.dataset.class === grade);
            });

            document.getElementById('grade-selection-overlay').style.display = 'none';
            activateButtons();
            showToast(`Mode Kelas ${grade} Aktif`);
        };

        function checkGradeGateway() {
            const saved = localStorage.getItem('user_grade');
            if (saved) {
                document.getElementById('grade-selection-overlay').style.display = 'none';
                activeClass = saved;
                // Update tabs active state
                document.querySelectorAll('.tab-btn:not(.riwayat-tab-btn)').forEach(b => {
                    b.classList.toggle('active', b.dataset.class === saved);
                });
            }
        }
        document.addEventListener('DOMContentLoaded', checkGradeGateway);

        function showToast(message, isError = false) {
            const toast = document.getElementById('toast');
            document.getElementById('toast-message').textContent = message;
            toast.style.background = isError ? '#ef4444' : '#10b981';
            toast.classList.add('show');
            setTimeout(() => toast.classList.remove('show'), 3500);
        }

        // Fungsi print Daftar Hadir - cetak dalam format tabel 20 baris
        async function printPresensiForm() {
            const mapel = document.getElementById('dh-mapel').value;
            const tglRaw = document.getElementById('dh-tanggal').value;

            if (!mapel || !tglRaw) {
                showToast('Pilih Mapel & Tanggal dulu untuk mencetak!', true);
                return;
            }

            const printWin = window.open('', '_blank', 'width=860,height=950');
            printWin.document.write('<html><head><title>Memuat...</title></head><body><p style="font-family:sans-serif;text-align:center;margin-top:50px;">Sedang menyiapkan dokumen pendaftaran...</p></body></html>');

            showToast('Menyiapkan dokumen cetak...', false);

            try {
                const client = await getSupabase();
                // Tarik SEMUA data (Siswa + Pengawas) untuk sesi ini
                const { data: allRows, error } = await client.from('presensi_siswa')
                    .select('*')
                    .eq('mata_pelajaran', mapel)
                    .eq('tanggal', tglRaw);

                if (error) throw error;

                if (!allRows || allRows.length === 0) {
                    printWin.close();
                    showToast('Data belum ditemukan di database!', true);
                    return;
                }

                // Pisahkan data pengawas dan siswa
                const sessionMeta = allRows.find(r => r.ruang === 'SESSION_METADATA') || {};
                const studentRows = allRows.filter(r => r.ruang !== 'SESSION_METADATA');

                const tgl = new Date(tglRaw).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
                const pukul = sessionMeta.pukul || document.getElementById('dh-pukul').value || '...';
                const p1Nama = sessionMeta.pengawas_1_nama || '';
                const p1Niy = sessionMeta.pengawas_1_niy || '';
                const p2Nama = sessionMeta.pengawas_2_nama || '';
                const p2Niy = sessionMeta.pengawas_2_niy || '';

                const p1TtdImg = sessionMeta.p1_ttd ? `<img src="${sessionMeta.p1_ttd}" style="height:50px; filter: brightness(0);">` : '';
                const p2TtdImg = sessionMeta.p2_ttd ? `<img src="${sessionMeta.p2_ttd}" style="height:50px; filter: brightness(0);">` : '';

                // Kelompokkan siswa per ruang (R1, R2, R3)
                const dataSiswaMap = { R1: [], R2: [], R3: [] };

                // Urutkan studentRows berdasarkan created_at untuk mendapatkan urutan nomor otomatis
                studentRows.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

                studentRows.forEach(row => {
                    const r = row.ruang;
                    if (dataSiswaMap[r]) {
                        // Jika format baru, data_siswa adalah objek tunggal
                        if (row.data_siswa && !Array.isArray(row.data_siswa)) {
                            dataSiswaMap[r].push(row.data_siswa);
                        } else if (Array.isArray(row.data_siswa)) {
                            // Support format lama (array dalam 1 row)
                            dataSiswaMap[r] = dataSiswaMap[r].concat(row.data_siswa);
                        }
                    }
                });

                const roomColors = { R1: '#1d4ed8', R2: '#7c3aed', R3: '#b45309' };
                let pages = '';

                ROOMS.forEach((r, idx) => {
                    const list = dataSiswaMap[r] || [];
                    if (list.length === 0 && studentRows.length > 0) return;

                    let rows = '';
                    for (let i = 1; i <= 20; i++) {
                        const item = list[i - 1] || {};
                        const stuTtdImg = item.ttd ? `<img src="${item.ttd}" style="height:35px; filter: brightness(0);">` : '&nbsp;';
                        rows += `<tr><td style="text-align:center">${i}</td><td>${item.nomor_peserta || ''}</td><td>${item.nama || ''}</td><td style="text-align:center; padding:0;">${stuTtdImg}</td></tr>`;
                    }

                    pages += `
                    <div class="page${pages.length > 0 ? ' page-break' : ''}">
                        <div class="header">
                            <img class="logo" src="logo.jpg">
                            <div class="ht">
                                <div class="yayasan">YAYASAN TRI DHARMA TEGAL</div>
                                <div class="sekolah">SMP TUNAS HIDUP HARAPAN KITA</div>
                                <div class="info">Jalan Gurami Nomor 6 Kota Tegal, Telepon (0283) 6146846</div>
                                <div class="info">e-mail: smpthhk.tegal@gmail.com</div>
                            </div><div style="width:70px"></div>
                        </div>
                        <hr>
                        <h2>DAFTAR HADIR</h2>
                        <h2>PENYELENGGARAAN Sumatif Demo</h2>
                        <h2>TAHUN PELAJARAN 2025/2026</h2>
                        <div class="room-badge" style="background:${roomColors[r]}">RUANG ${r}</div>
                        <div class="meta">
                            <div>Mata Pelajaran &nbsp;: <b>${mapel}</b></div>
                            <div>Tanggal &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: ${tgl}</div>
                            <div>Sekolah &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: SMP TUNAS HIDUP HARAPAN KITA</div>
                            <div>Ruang &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: <b>${r}</b></div>
                            <div>Pukul &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: ${pukul}</div>
                        </div>
                        <table>
                            <thead><tr><th style="width:35px">No.</th><th style="width:120px">Nomor Peserta</th><th>Nama</th><th style="width:140px">Tanda Tangan</th></tr></thead>
                            <tbody>${rows}</tbody>
                        </table>
                        <div class="pengawas">
                            <div><div class="pg-title">Pengawas 1</div>
                                <div class="pg-line">1. Tanda Tangan :</div>
                                <div class="ttd-box">${p1TtdImg}</div>
                                <div class="pg-line">2. Nama &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: ${p1Nama}</div>
                                <div class="pg-line">3. N I Y &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: ${p1Niy}</div>
                            </div>
                            <div><div class="pg-title">Pengawas 2</div>
                                <div class="pg-line">1. Tanda Tangan :</div>
                                <div class="ttd-box">${p2TtdImg}</div>
                                <div class="pg-line">2. Nama &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: ${p2Nama}</div>
                                <div class="pg-line">3. N I Y &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: ${p2Niy}</div>
                            </div>
                        </div>
                    </div>`;
                });

                if (!pages) {
                    printWin.close();
                    showToast('Tidak ada data siswa untuk dicetak!', true);
                    return;
                }

                printWin.document.open();
                printWin.document.write(`<!DOCTYPE html><html><head>
                    <meta charset="UTF-8"><title>Daftar Hadir - ${mapel}</title>
                    <style>
                        @page { margin: 12mm 14mm; }
                        body { font-family: 'Times New Roman', serif; font-size: 11pt; color: #000; margin:0; }
                        .page-break { page-break-before: always; }
                        .header { display:flex; align-items:center; gap:12px; margin-bottom:6px; }
                        .logo { height:65px; width:auto; }
                        .ht { text-align:center; flex:1; }
                        .ht .yayasan { font-size:11pt; font-weight:bold; }
                        .ht .sekolah { font-size:15pt; font-weight:bold; }
                        .ht .info { font-size:9pt; }
                        hr { border:0; border-top:3px double black; margin:6px 0 8px; }
                        h2 { text-align:center; font-size:13pt; margin:3px 0 2px; }
                        .room-badge { display:inline-block; color:white; font-size:11pt; font-weight:bold;
                            padding:3px 18px; border-radius:20px; margin:6px auto 8px; display:block; text-align:center; width:fit-content; }
                        .meta { display:grid; grid-template-columns:1fr 1fr; gap:3px 20px; margin:8px 0 10px; font-size:10.5pt; }
                        table { width:100%; border-collapse:collapse; font-size:10pt; }
                        th,td { border:1px solid black; padding:3px 5px; }
                        th { background:#f0f0f0; text-align:center; }
                        .pengawas { display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-top:16px; font-size:10.5pt; }
                        .pg-title { font-weight:bold; text-decoration:underline; margin-bottom:8px; }
                        .pg-line { margin:3px 0; }
                        .ttd-box { height:50px; border-bottom:1px solid #000; margin:4px 0; }
                    </style>
                </head><body>${pages}</body></html>`);
                printWin.document.close();
                setTimeout(() => { printWin.print(); }, 500);

            } catch (err) {
                console.error('Print error:', err);
                if (printWin) printWin.close();
                showToast('Gagal memproses data cetak!', true);
            }
        }


        // Fungsi print Berita Acara dari form modal
        function printBAForm() {
            const mapel = document.getElementById('ba-mapel').value || '...';
            const hari = document.getElementById('ba-hari').value || '...';
            const tglRaw = document.getElementById('ba-tanggal-full').value;
            const tglDate = tglRaw ? new Date(tglRaw) : null;
            const tglAngka = tglDate ? tglDate.getDate() : '...';
            const bulan = tglDate ? tglDate.toLocaleDateString('id-ID', { month: 'long' }) : '...';
            const tahun = tglDate ? tglDate.getFullYear() : '...';
            const ruang = document.getElementById('ba-ruang').value || '...';
            const pFull = document.getElementById('ba-pukul').value || ' - ';
            const pParts = pFull.split(' - ');
            const pMulai = pParts[0] || '...';
            const pSelesai = pParts[1] || '...';
            const jmlSehr = document.getElementById('ba-jml-seharusnya').value || '...';
            const jmlHdr = document.getElementById('ba-jml-hadir').value || '...';
            const nomHdr = document.getElementById('ba-nomor-hadir').value || '-';
            const jmlTdk = document.getElementById('ba-jml-tidak-hadir').value || '...';
            const nomTdk = document.getElementById('ba-nomor-tidak-hadir').value || '-';
            const lSoal = document.getElementById('ba-lembar-soal').value || '...';
            const lBA = document.getElementById('ba-lembar-ba').value || '...';
            const lJwb = document.getElementById('ba-lembar-jawab').value || '...';
            const catatan = document.getElementById('ba-catatan').value || '-';
            const p1Nama = document.getElementById('ba-p1-nama').value;
            const p1Niy = document.getElementById('ba-p1-niy').value;
            const p2Nama = document.getElementById('ba-p2-nama').value;
            const p2Niy = document.getElementById('ba-p2-niy').value;

            // Get signature images
            const p1TtdImg = (sigPads['ba-sig-p1'] && !sigPads['ba-sig-p1'].isEmpty()) ? `<img src="${sigPads['ba-sig-p1'].toDataURL()}" style="height:50px; filter: brightness(0);">` : '';
            const p2TtdImg = (sigPads['ba-sig-p2'] && !sigPads['ba-sig-p2'].isEmpty()) ? `<img src="${sigPads['ba-sig-p2'].toDataURL()}" style="height:50px; filter: brightness(0);">` : '';

            const printWin = window.open('', '_blank', 'width=820,height=900');
            printWin.document.write(`<!DOCTYPE html><html><head>
                <meta charset="UTF-8"><title>Berita Acara - ${mapel}</title>
                <style>
                    @page { margin: 12mm 14mm; }
                    body { font-family: 'Times New Roman', serif; font-size: 11pt; color: #000; margin:0; }
                    .header { display:flex; align-items:center; gap:12px; margin-bottom:6px; }
                    .logo { height:65px; width:auto; }
                    .ht { text-align:center; flex:1; }
                    .ht .yayasan { font-size:11pt; font-weight:bold; }
                    .ht .sekolah { font-size:15pt; font-weight:bold; }
                    .ht .info { font-size:9pt; }
                    hr { border:0; border-top:3px double black; margin:6px 0 10px; }
                    h2 { text-align:center; font-size:13pt; margin:4px 0 2px; }
                    .mapel-row { text-align:center; margin:8px 0 6px; font-size:11pt; }
                    p { margin:5px 0; font-size:10.5pt; line-height:1.8; }
                    .field { display:flex; gap:4px; margin:5px 0; }
                    .label { min-width:200px; flex-shrink:0; }
                    .pengawas { display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-top:18px; font-size:10.5pt; }
                    .pg-title { font-weight:bold; text-decoration:underline; margin-bottom:8px; }
                    .ttd-box { height:50px; border-bottom:1px solid #000; margin:4px 0; display:flex; align-items:center; }
                    .italic { font-style:italic; text-align:center; margin-top:10px; }
                    .pg-line { margin: 3px 0; }
                </style>
            </head><body>
                <div class="header">
                    <img class="logo" src="logo.jpg">
                    <div class="ht">
                        <div class="yayasan">YAYASAN TRI DHARMA TEGAL</div>
                        <div class="sekolah">SMP TUNAS HIDUP HARAPAN KITA</div>
                        <div class="info">Jalan Gurami Nomor 6 Kota Tegal, Telepon (0283) 6146846</div>
                        <div class="info">e-mail: smpthhk.tegal@gmail.com</div>
                    </div><div style="width:70px"></div>
                </div>
                <hr>
                <h2>BERITA ACARA</h2>
                <h2>PENYELENGGARAAN Sumatif Demo</h2>
                <h2>TAHUN PELAJARAN 2025/2026</h2>
                <div class="mapel-row">MATA PELAJARAN &nbsp; : &nbsp; <b>${mapel}</b></div>
                <p>Pada hari ini <b>${hari}</b>, Tanggal <b>${tglAngka}</b> Bulan <b>${bulan}</b> Tahun <b>${tahun}</b></p>
                <p><b>a.</b></p>
                <div class="field"><span class="label">Telah diselenggarakan dari Pukul</span><span>: ${pMulai} sampai pukul ${pSelesai}</span></div>
                <div class="field"><span class="label">Sekolah</span><span>: SMP TUNAS HIDUP HARAPAN KITA</span></div>
                <div class="field"><span class="label">Ruang</span><span>: ${ruang}</span></div>
                <div class="field"><span class="label">Alamat</span><span>: Jalan Gurami Nomor 6 Kota Tegal</span></div>
                <div class="field"><span class="label">Jumlah Peserta Seharusnya</span><span>: ${jmlSehr} Orang</span></div>
                <div class="field"><span class="label">Yang Hadir</span><span>: ${jmlHdr} Orang</span></div>
                <div class="field"><span class="label">Yakni Nomor</span><span>: ${nomHdr}</span></div>
                <div class="field"><span class="label">Yang Tidak Hadir</span><span>: ${jmlTdk} Orang</span></div>
                <div class="field"><span class="label">Yakni Nomor</span><span>: ${nomTdk}</span></div>
                <p><b>b.</b></p>
                <p>Sampul soal mata pelajaran <b>${mapel}</b> telah dibuka di ruang tersebut dengan disaksikan oleh para peserta yang berisi lembar soal sebanyak <b>${lSoal}</b> Eksemplar, lembar berita acara dan daftar hadir sebanyak <b>${lBA}</b> Eksemplar, Lembar Jawab sebanyak <b>${lJwb}</b> eksemplar.</p>
                <div class="field" style="margin-top:8px;align-items:flex-start;"><span class="label">Catatan selama pelaksanaan</span><span>: ${catatan}</span></div>
                <p class="italic">Berita acara ini dibuat dengan sesungguhnya.</p>
                <div class="pengawas">
                    <div><div class="pg-title">Pengawas 1</div>
                        <p class="pg-line">1. Tanda Tangan :</p>
                        <div class="ttd-box">${p1TtdImg}</div>
                        <p class="pg-line">2. Nama &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: ${p1Nama}</p>
                        <p class="pg-line">3. N I Y &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: ${p1Niy}</p>
                    </div>
                    <div><div class="pg-title">Pengawas 2</div>
                        <p class="pg-line">1. Tanda Tangan :</p>
                        <div class="ttd-box">${p2TtdImg}</div>
                        <p class="pg-line">2. Nama &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: ${p2Nama}</p>
                        <p class="pg-line">3. N I Y &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: ${p2Niy}</p>
                    </div>
                </div>
            </body></html>`);
            printWin.document.close();
            setTimeout(() => { printWin.print(); }, 500);
        }


        function toggleSupervisorMode() {
            const section = document.getElementById('supervisor-section');
            const btn = document.getElementById('btn-lock-supervisor');
            const isActive = section.classList.toggle('active');
            btn.classList.toggle('active');
            btn.innerHTML = isActive ? '<i class="fas fa-lock-open"></i>' : '<i class="fas fa-lock"></i>';
            if (isActive) {
                setTimeout(() => {
                    if (sigPads['sig-p1']) sigPads['sig-p1']._resize();
                    if (sigPads['sig-p2']) sigPads['sig-p2']._resize();
                }, 100);
            }
        }

        async function submitSingleStudent() {
            const client = await getSupabase();
            if (!client) { showToast('Supabase belum dikonfigurasi!', true); return; }

            const mapel = document.getElementById('dh-mapel').value;
            const tanggal = document.getElementById('dh-tanggal').value;
            const ruang = document.querySelector('input[name="dh-ruang-radio"]:checked')?.value;
            const nomor = document.getElementById('dh-nomor-tunggal').value.trim();
            const nama = document.getElementById('dh-nama-tunggal').value.trim();

            if (!mapel || !tanggal || !ruang || !nomor || !nama) {
                showToast('Mohon lengkapi semua data!', true);
                return;
            }

            // Menghapus trik popup blocker (menggunakan navigasi tab yang sama agar 100% aman)

            // FINAL VALIDATION: Check Grade matching
            const student = studentList.find(s => s.id === nomor);
            if (student) {
                if (String(student.grade) !== String(activeClass)) {
                    showToast(`Kritikal: Siswa terdaftar di Kelas ${student.grade}, bukan Kelas ${activeClass}!`, true);
                    return;
                }
            }

            const pad = sigPads['sig-stu-tunggal'];
            if (!pad || pad.isEmpty()) {
                showToast('Mohon bubuhkan tanda tangan!', true);
                return;
            }

            showToast('Mengirim kehadiran...', false);
            const ttd = pad.toDataURL("image/png");

            // GUNAKAN INSERT MANDIRI (Anti-Tabrakan / Anti-Race Condition)
            const payload = {
                mata_pelajaran: mapel,
                tanggal: tanggal,
                ruang: ruang,
                data_siswa: { nomor_peserta: nomor, nama: nama, ttd: ttd }
            };

            const { error } = await client.from('presensi_siswa').insert([payload]);

            if (error) {
                showToast('Gagal: ' + error.message, true);
            } else {
                localStorage.setItem('user_grade', activeClass); // Lock in his current class
                showToast('✅ Kehadiran berhasil dikirim! Terima kasih.');
                // Simpan status absen ke LocalStorage
                localStorage.setItem('absen_' + mapel + '_' + tanggal, 'true');
                localStorage.setItem('student_name', nama);
                localStorage.setItem('student_room', ruang);
                // Extract class from UI if possible, for now just use current active class
                localStorage.setItem('student_class', activeClass);

                // Update Presence if channel exists
                if (onlineChannel) {
                    onlineChannel.track({
                        nama: nama,
                        kelas: activeClass,
                        ruang: ruang,
                        online_at: new Date().toISOString(),
                    });
                }

                // Reset form individual
                document.getElementById('dh-nomor-tunggal').value = '';
                document.getElementById('dh-nama-tunggal').value = '';
                pad.clear();
                document.getElementById('sig-stu-tunggal-hint').style.opacity = '1';

                // Simpan kelas yang valid
                localStorage.setItem('user_grade', activeClass);

                // Refresh tombol ujian & Tutup Modal setelah jeda singkat
                setTimeout(() => {
                    activateButtons();
                    closeModal('modal-presensi');

                    // Buka Link Ujian di tab yang sama (Lebih stabil, anti-popup blocker)
                    if (gkCurrentUrl) {
                        const finalUrl = `ruang_ujian.html?pdf=${encodeURIComponent(gkCurrentUrl)}`;
                        window.location.href = finalUrl;
                        gkCurrentUrl = ''; // Reset
                    }
                }, 800);
            }
        }

        // Simpan Data Pengawas (handles Insert or Update)
        async function submitPresensiDoc() {
            const client = await getSupabase();
            if (!client) { showToast('Supabase belum dikonfigurasi!', true); return; }

            const mapel = document.getElementById('dh-mapel').value;
            const tanggal = document.getElementById('dh-tanggal').value;

            if (!mapel || !tanggal) {
                showToast('Pilih Mapel & Tanggal dulu!', true);
                return;
            }

            showToast('Menyimpan data pengawas...', false);

            const p1Ttd = (sigPads['sig-p1'] && !sigPads['sig-p1'].isEmpty()) ? sigPads['sig-p1'].toDataURL("image/png") : '';
            const p2Ttd = (sigPads['sig-p2'] && !sigPads['sig-p2'].isEmpty()) ? sigPads['sig-p2'].toDataURL("image/png") : '';

            const payload = {
                mata_pelajaran: mapel,
                tanggal: tanggal,
                ruang: 'SESSION_METADATA', // Ruang khusus penanda metadata sesi
                pukul: document.getElementById('dh-pukul').value,
                pengawas_1_nama: document.getElementById('dh-p1-nama').value,
                pengawas_1_niy: document.getElementById('dh-p1-niy').value,
                pengawas_2_nama: document.getElementById('dh-p2-nama').value,
                pengawas_2_niy: document.getElementById('dh-p2-niy').value,
                p1_ttd: p1Ttd,
                p2_ttd: p2Ttd
            };

            // Cari apakah record meta sudah ada
            const { data: existing } = await client.from('presensi_siswa')
                .select('id')
                .eq('mata_pelajaran', mapel)
                .eq('tanggal', tanggal)
                .eq('ruang', 'SESSION_METADATA')
                .maybeSingle();

            let finalErr;
            if (existing) {
                const { error } = await client.from('presensi_siswa').update(payload).eq('id', existing.id);
                finalErr = error;
            } else {
                const { error } = await client.from('presensi_siswa').insert([payload]);
                finalErr = error;
            }

            if (finalErr) {
                showToast('Gagal: ' + finalErr.message, true);
            } else {
                showToast('✅ Data Pengawas berhasil disimpan!');
            }
        }

        // Auto-load data ketika Mapel/Tanggal dipilih
        async function autoLoadPresensi() {
            const client = await getSupabase();
            if (!client) return;

            const mapel = document.getElementById('dh-mapel').value;
            const tanggal = document.getElementById('dh-tanggal').value;

            if (mapel && tanggal) {
                // Cari data sesi (pengawas)
                const { data, error } = await client.from('presensi_siswa')
                    .select('*')
                    .eq('mata_pelajaran', mapel)
                    .eq('tanggal', tanggal)
                    .eq('ruang', 'SESSION_METADATA')
                    .maybeSingle();

                if (data) {
                    fillPresensiFields(data);
                    // showToast('✅ Data sebelumnya berhasil dimuat secara otomatis');
                }
            }
        }

        function fillPresensiFields(data) {
            document.getElementById('dh-pukul').value = data.pukul || '';
            document.getElementById('dh-p1-nama').value = data.pengawas_1_nama || '';
            document.getElementById('dh-p1-niy').value = data.pengawas_1_niy || '';
            document.getElementById('dh-p2-nama').value = data.pengawas_2_nama || '';
            document.getElementById('dh-p2-niy').value = data.pengawas_2_niy || '';

            // Restore supervisor signatures
            if (data.p1_ttd && sigPads['sig-p1']) {
                sigPads['sig-p1'].fromDataURL(data.p1_ttd);
                const h1 = document.getElementById('sig-p1-hint'); if (h1) h1.style.opacity = '0';
            }
            if (data.p2_ttd && sigPads['sig-p2']) {
                sigPads['sig-p2'].fromDataURL(data.p2_ttd);
                const h2 = document.getElementById('sig-p2-hint'); if (h2) h2.style.opacity = '0';
            }
        }

        function updateRoomCounts() {
            // Room counts will be calculated from the fetched database data if needed in Supervisor mode
        }


        // Load Data Daftar Hadir
        let cachedPresensiList = [];
        async function loadPresensiList() {
            const client = await getSupabase();
            if (!client) { showToast('Supabase belum dikonfigurasi!', true); return; }

            showToast('Memuat data...', false);
            const { data, error } = await client.from('presensi_siswa')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(10);

            if (error) {
                showToast('Gagal memuat: ' + error.message, true);
                return;
            }

            cachedPresensiList = data;
            const tbody = document.getElementById('presensi-list-tbody');
            tbody.innerHTML = '';

            if (data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding: 20px;">Belum ada data</td></tr>';
            } else {
                data.forEach((item, idx) => {
                    const tr = document.createElement('tr');
                    tr.style.borderBottom = '1px solid var(--glass-border)';
                    tr.innerHTML = `
                        <td style="padding: 10px;">${item.tanggal || '-'}</td>
                        <td style="padding: 10px;">${item.mata_pelajaran || '-'}</td>
                        <td style="padding: 10px;">${item.ruang || '-'}</td>
                        <td style="padding: 10px;">
                            <button onclick="selectPresensiByIndex(${idx})" style="padding: 5px 10px; background: var(--primary); color: white; border: none; border-radius: 4px; cursor: pointer;">Pilih</button>
                        </td>
                    `;
                    tbody.appendChild(tr);
                });
            }
            document.getElementById('modal-load-presensi').classList.add('active');
        }

        // Terapkan data yang dipilih ke form (multi-ruang)
        function selectPresensiByIndex(idx) {
            const item = cachedPresensiList[idx];
            if (!item) return;

            document.getElementById('dh-mapel').value = item.mata_pelajaran || '';
            document.getElementById('dh-tanggal').value = item.tanggal || '';

            fillPresensiFields(item);

            closeModal('modal-load-presensi');
            showToast('✅ Data & Tanda Tangan berhasil dimuat');
        }



        // Submit Berita Acara ke Supabase
        async function submitBADoc() {
            const client = await getSupabase();
            if (!client) { showToast('Supabase belum dikonfigurasi!', true); return; }

            showToast('Menyimpan Berita Acara & TTD...', false);

            const tglRaw = document.getElementById('ba-tanggal-full').value;
            const tglDate = tglRaw ? new Date(tglRaw) : null;

            // Get signatures
            const p1Ttd = (sigPads['ba-sig-p1'] && !sigPads['ba-sig-p1'].isEmpty()) ? sigPads['ba-sig-p1'].toDataURL("image/png") : '';
            const p2Ttd = (sigPads['ba-sig-p2'] && !sigPads['ba-sig-p2'].isEmpty()) ? sigPads['ba-sig-p2'].toDataURL("image/png") : '';

            const pFull = document.getElementById('ba-pukul').value || ' - ';
            const pParts = pFull.split(' - ');
            const pMulai = pParts[0] || '';
            const pSelesai = pParts[1] || '';

            const payload = {
                mata_pelajaran: document.getElementById('ba-mapel').value,
                hari: document.getElementById('ba-hari').value,
                tanggal: tglDate ? String(tglDate.getDate()) : '',
                bulan: tglDate ? tglDate.toLocaleDateString('id-ID', { month: 'long' }) : '',
                tahun: tglDate ? String(tglDate.getFullYear()) : '',
                pukul_mulai: pMulai,
                pukul_selesai: pSelesai,
                lokasi: '',
                ruang: document.getElementById('ba-ruang').value,
                jumlah_seharusnya: document.getElementById('ba-jml-seharusnya').value,
                jumlah_hadir: document.getElementById('ba-jml-hadir').value,
                nomor_hadir: document.getElementById('ba-nomor-hadir').value,
                jumlah_tidak_hadir: document.getElementById('ba-jml-tidak-hadir').value,
                nomor_tidak_hadir: document.getElementById('ba-nomor-tidak-hadir').value,
                lembar_soal: document.getElementById('ba-lembar-soal').value,
                lembar_ba: document.getElementById('ba-lembar-ba').value,
                lembar_jawab: document.getElementById('ba-lembar-jawab').value,
                catatan: document.getElementById('ba-catatan').value,
                pengawas_1_nama: document.getElementById('ba-p1-nama').value,
                pengawas_1_niy: document.getElementById('ba-p1-niy').value,
                pengawas_2_nama: document.getElementById('ba-p2-nama').value,
                pengawas_2_niy: document.getElementById('ba-p2-niy').value,
                p1_ttd: p1Ttd,
                p2_ttd: p2Ttd
            };

            const { error } = await client.from('berita_acara_guru').insert([payload]);
            if (error) {
                showToast('Gagal menyimpan: ' + error.message, true);
            } else {
                showToast('✅ Berita Acara berhasil disimpan!');
                localStorage.removeItem('draft_ba_guru');
                closeModal('modal-ba');
            }
        }

        // Fungsi Load Riwayat Global
        async function loadRiwayatGlobal() {
            const client = await getSupabase();
            if (!client) return;

            const tbody = document.getElementById('riwayat-global-body');
            tbody.innerHTML = '<tr><td colspan="6" style="padding: 2rem; text-align: center;"><i class="fas fa-spinner fa-spin"></i> Menghitung rekapitulasi...</td></tr>';

            try {
                // OPTIMASI: Hanya ambil metadata (Mata Pelajaran, Tanggal, Ruang)
                // Kita TIDAK mengambil 'data_siswa' (berisi Base64 TTD) untuk menghemat bandwidth & memori
                const { data, error } = await client.from('presensi_siswa')
                    .select('mata_pelajaran, tanggal, ruang')
                    .order('tanggal', { ascending: false });

                if (error) throw error;

                if (!data || data.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="6" style="padding: 2rem; text-align: center; opacity:0.6;">Belum ada data terekam.</td></tr>';
                    return;
                }

                // Agregasi Data di Sisi Client
                const summary = {}; // { "Mapel_Tanggal": { mapel, tgl, R1:0, R2:0, R3:0 } }

                data.forEach(item => {
                    const key = `${item.mata_pelajaran}_${item.tanggal}`;
                    if (!summary[key]) {
                        summary[key] = { mapel: item.mata_pelajaran, tgl: item.tanggal, R1: 0, R2: 0, R3: 0 };
                    }
                    if (item.ruang === 'R1') summary[key].R1++;
                    else if (item.ruang === 'R2') summary[key].R2++;
                    else if (item.ruang === 'R3') summary[key].R3++;
                });

                tbody.innerHTML = '';
                Object.values(summary).forEach(item => {
                    const tr = document.createElement('tr');
                    tr.style.borderBottom = '1px solid rgba(255,255,255,0.05)';
                    tr.innerHTML = `
                        <td style="padding: 1rem;"><b>${item.mapel}</b></td>
                        <td style="padding: 1rem;">${item.tgl}</td>
                        <td style="padding: 1rem; text-align: center;"><span style="background:rgba(29, 78, 216, 0.2); color:#60a5fa; padding: 2px 8px; border-radius: 10px;">${item.R1}</span></td>
                        <td style="padding: 1rem; text-align: center;"><span style="background:rgba(124, 58, 237, 0.2); color:#a78bfa; padding: 2px 8px; border-radius: 10px;">${item.R2}</span></td>
                        <td style="padding: 1rem; text-align: center;"><span style="background:rgba(180, 83, 9, 0.2); color:#fbbf24; padding: 2px 8px; border-radius: 10px;">${item.R3}</span></td>
                        <td style="padding: 1rem; text-align: center;">
                            <button class="btn-main" onclick="printFromRiwayat('${item.mapel}', '${item.tgl}')" 
                                style="padding: 0.4rem 0.8rem; font-size: 0.8rem; background: #3b82f6;">
                                <i class="fas fa-print"></i> Cetak
                            </button>
                        </td>
                    `;
                    tbody.appendChild(tr);
                });
            } catch (err) {
                tbody.innerHTML = `<tr><td colspan="6" style="padding: 2rem; text-align: center; color:#ef4444;">Error: ${err.message}</td></tr>`;
            }
        }

        // Jalankan cetak dari tabel riwayat
        window.printFromRiwayat = function (mapel, tgl) {
            document.getElementById('dh-mapel').value = mapel;
            document.getElementById('dh-tanggal').value = tgl;
            printPresensiForm();
        }

        // ======= RIWAYAT TABS & BA HISTORY =======

        window.switchRiwayatTab = function (type) {
            document.querySelectorAll('.riwayat-tab-btn').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.rTab === type);
            });

            document.getElementById('riwayat-presensi-content').style.display = (type === 'presensi') ? 'block' : 'none';
            document.getElementById('riwayat-ba-content').style.display = (type === 'ba') ? 'block' : 'none';

            if (type === 'ba') loadRiwayatBA();
            // loadRiwayatGlobal is usually called when modal opens
        };

        async function loadRiwayatBA() {
            const client = await getSupabase();
            if (!client) return;

            const tbody = document.getElementById('riwayat-ba-body');
            tbody.innerHTML = '<tr><td colspan="5" style="padding: 2rem; text-align: center;"><i class="fas fa-spinner fa-spin"></i> Menarik data berita acara...</td></tr>';

            try {
                const { data, error } = await client.from('berita_acara_guru')
                    .select('*')
                    .order('created_at', { ascending: false })
                    .limit(20);

                if (error) throw error;

                if (!data || data.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="5" style="padding: 2rem; text-align: center; opacity:0.6;">Belum ada berita acara tersimpan.</td></tr>';
                    return;
                }

                tbody.innerHTML = '';
                data.forEach(item => {
                    const tr = document.createElement('tr');
                    tr.style.borderBottom = '1px solid rgba(255,255,255,0.05)';
                    const tglNormal = `${item.tanggal || ''} ${item.bulan || ''} ${item.tahun || ''}`;

                    tr.innerHTML = `
                        <td style="padding: 1rem;"><b>${item.mata_pelajaran}</b></td>
                        <td style="padding: 1rem;">
                            <div style="font-size:0.85rem">${tglNormal}</div>
                            <div style="font-size:0.75rem; color:var(--primary)">${item.pukul_mulai} - ${item.pukul_selesai}</div>
                        </td>
                        <td style="padding: 1rem; text-align: center;">
                            <span style="font-weight:700">${item.jumlah_hadir || 0}</span><span style="opacity:0.6">/${item.jumlah_seharusnya || 0}</span>
                        </td>
                        <td style="padding: 1rem;">
                            <div style="font-size:0.8rem; white-space:nowrap">${item.pengawas_1_nama || '-'}</div>
                            <div style="font-size:0.8rem; white-space:nowrap">${item.pengawas_2_nama || ''}</div>
                        </td>
                        <td style="padding: 1rem; text-align: center;">
                            <button class="btn-main" onclick="printFromBAHistory('${item.id}')" 
                                style="padding: 0.4rem 0.8rem; font-size: 0.8rem; background: #f59e0b;">
                                <i class="fas fa-print"></i> Cetak
                            </button>
                        </td>
                    `;
                    tbody.appendChild(tr);
                });
            } catch (err) {
                tbody.innerHTML = `<tr><td colspan="5" style="padding: 2rem; text-align: center; color:#ef4444;">Error: ${err.message}</td></tr>`;
            }
        }

        window.printFromBAHistory = async function (id) {
            const client = await getSupabase();
            if (!client) return;

            showToast('Memuat data berita acara...', false);

            try {
                const { data, error } = await client.from('berita_acara_guru')
                    .select('*')
                    .eq('id', id)
                    .single();

                if (error) throw error;
                if (!data) return;

                fillBAForm(data);

                setTimeout(() => {
                    printBAForm();
                }, 500);

            } catch (err) {
                showToast('Gagal memuat data: ' + err.message, true);
            }
        };

        function fillBAForm(data) {
            const mapping = {
                'ba-mapel': data.mata_pelajaran,
                'ba-hari': data.hari,
                'ba-ruang': data.ruang,
                'ba-pukul': `${data.pukul_mulai} - ${data.pukul_selesai}`,
                'ba-jml-seharusnya': data.jumlah_seharusnya,
                'ba-jml-hadir': data.jumlah_hadir,
                'ba-nomor-hadir': data.nomor_hadir,
                'ba-jml-tidak-hadir': data.jumlah_tidak_hadir,
                'ba-nomor-tidak-hadir': data.nomor_tidak_hadir,
                'ba-lembar-soal': data.lembar_soal,
                'ba-lembar-ba': data.lembar_ba,
                'ba-lembar-jawab': data.lembar_jawab,
                'ba-catatan': data.catatan,
                'ba-p1-nama': data.pengawas_1_nama,
                'ba-p1-niy': data.pengawas_1_niy,
                'ba-p2-nama': data.pengawas_2_nama,
                'ba-p2-niy': data.pengawas_2_niy
            };

            if (data.tahun && data.bulan && data.tanggal) {
                const months = {
                    'Januari': '01', 'Februari': '02', 'Maret': '03', 'April': '04',
                    'Mei': '05', 'Juni': '06', 'Juli': '07', 'Agustus': '08',
                    'September': '09', 'Oktober': '10', 'November': '11', 'Desember': '12'
                };
                const mon = months[data.bulan] || '01';
                const day = data.tanggal.toString().padStart(2, '0');
                const tglEl = document.getElementById('ba-tanggal-full');
                if (tglEl) tglEl.value = `${data.tahun}-${mon}-${day}`;
            }

            Object.entries(mapping).forEach(([id, val]) => {
                const el = document.getElementById(id);
                if (el) el.value = val || '';
            });

            if (data.p1_ttd && sigPads['ba-sig-p1']) {
                sigPads['ba-sig-p1'].fromDataURL(data.p1_ttd);
                const h1 = document.getElementById('ba-sig-p1-hint'); if (h1) h1.style.opacity = '0';
            }
            if (data.p2_ttd && sigPads['ba-sig-p2']) {
                sigPads['ba-sig-p2'].fromDataURL(data.p2_ttd);
                const h2 = document.getElementById('ba-sig-p2-hint'); if (h2) h2.style.opacity = '0';
            }
        }


        // Tutup modal jika klik area overlay
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-overlay')) {
                e.target.classList.remove('active');
                document.body.style.overflow = '';
            }
        });

        // Listen for changes in Berita Acara modal to auto-save draft
        document.getElementById('modal-ba')?.addEventListener('input', saveBADraft);
        document.getElementById('modal-ba')?.addEventListener('change', saveBADraft);

        let activeClass = '7';
        let controlActiveGrade = '7';

        // SISTEM KONTROL KURIKULUM (Sinkronisasi Database Cloud/Supabase)
        // Default awal: Semua tertutup
        let examControl = {
            global: 'passed',
            '7': { subjects: {} },
            '8': { subjects: {} },
            '9': { subjects: {} }
        };

        // Fungsi Ambil Data dari Cloud
        async function syncControlFromSupabase() {
            try {
                const client = await getSupabase();
                if (!client) return;

                const { data, error } = await client
                    .from('exam_settings')
                    .select('data')
                    .eq('id', 'master_config')
                    .single();

                if (data && data.data) {
                    examControl = data.data;
                    activateButtons();
                    if (document.getElementById('modal-kurikulum').classList.contains('active')) {
                        renderControlList();
                    }
                }
            } catch (e) {
                console.error('Gagal fetch kontrol kurikulum:', e);
            }
        }

        // Fungsi Simpan Data ke Cloud
        async function syncControlToSupabase() {
            try {
                const client = await getSupabase();
                if (!client) return;

                const { error } = await client
                    .from('exam_settings')
                    .upsert({ id: 'master_config', data: examControl });

                if (error) throw error;
                showToast("Pengaturan disinkronkan ke seluruh perangkat!");
            } catch (e) {
                console.error('Gagal simpan ke cloud:', e);
                showToast("Gagal simpan ke cloud!", "error");
            }
        }

        // Listener Real-time agar otomatis berubah di semua HP siswa tanpa refresh
        async function setupControlListener() {
            const client = await getSupabase();
            if (!client) return;

            client
                .channel('exam-control-sync')
                .on('postgres_changes', {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'exam_settings',
                    filter: 'id=eq.master_config'
                }, payload => {
                    if (payload.new && payload.new.data) {
                        examControl = payload.new.data;
                        activateButtons();
                        if (document.getElementById('modal-kurikulum').classList.contains('active')) {
                            renderControlList();
                        }
                    }
                })
                .subscribe();
        }

        // Start Sync
        document.addEventListener('DOMContentLoaded', () => {
            syncControlFromSupabase();
            setupControlListener();
        });

        function saveControl() {
            syncControlToSupabase();
            activateButtons();
        }

        function authKurikulum() {
            const pass = prompt("Masukkan Kata Sandi Kurikulum:");
            if (pass === "12345") {
                setControlGrade(activeClass);
                openModal('modal-kurikulum');
            } else if (pass !== null) {
                showToast("Kata sandi salah!", "error");
            }
        }

        window.setControlGrade = function (grade) {
            controlActiveGrade = grade;
            document.querySelectorAll('.ctrl-grade-btn').forEach(btn => {
                btn.style.background = 'transparent';
                btn.style.color = '#94a3b8';
            });
            const activeBtn = document.getElementById(`ctrl-grade-${grade}`);
            if (activeBtn) {
                activeBtn.style.background = '#3b82f6';
                activeBtn.style.color = 'white';
            }
            renderControlList();
        };

        window.setGlobalStatus = function (status) {
            if (confirm(`Apakah Anda yakin ingin mengatur SEMUA KELAS menjadi ${status === 'active' ? 'TERBUKA' : 'TERTUTUP'}?`)) {
                examControl.global = status;
                examControl['7'].subjects = {};
                examControl['8'].subjects = {};
                examControl['9'].subjects = {};
                saveControl();
                renderControlList();
                showToast(`Status Global Diubah ke: ${status === 'active' ? 'TERBUKA' : 'TERTUTUP'}`);
            }
        };

        window.toggleSubject = function (key) {
            const current = examControl[controlActiveGrade].subjects[key] || examControl.global;
            examControl[controlActiveGrade].subjects[key] = (current === 'active' ? 'passed' : 'active');
            saveControl();
            renderControlList();
        };

        function renderControlList() {
            const list = document.getElementById('subject-control-list');
            if (!list) return;
            list.innerHTML = `<h4 style="margin-bottom:1rem; color:white;">Status Mapel Kelas ${controlActiveGrade}:</h4>`;

            Object.keys(mapelNames).forEach(key => {
                const status = examControl[controlActiveGrade].subjects[key] || examControl.global;
                const isActive = status === 'active';

                const item = document.createElement('div');
                item.style = "display: flex; justify-content: space-between; align-items: center; padding: 1rem; background: rgba(255,255,255,0.05); border-radius: 12px; margin-bottom: 0.5rem; border: 1px solid rgba(255,255,255,0.1); transition: all 0.3s;";
                item.innerHTML = `
                    <div style="text-align: left;">
                        <div style="font-weight:600; color:white;">${mapelNames[key]}</div>
                        <div style="font-size:0.8rem; color:${isActive ? '#10b981' : '#f43f5e'}">${isActive ? 'Terbuka' : 'Tertutup'} ${(!examControl[controlActiveGrade].subjects[key]) ? '(Global)' : ''}</div>
                    </div>
                    <button onclick="toggleSubject('${key}')" class="btn-card" style="width:auto; padding:0.5rem 1rem; font-size:0.8rem; background:${isActive ? '#f43f5e' : '#10b981'}; color:white; border:none; cursor:pointer; border-radius:8px;">
                        ${isActive ? 'Tutup' : 'Buka'}
                    </button>
                `;
                list.appendChild(item);
            });
        }

        window.searchMasterStudent = function() {
            const q = document.getElementById('master-search').value.toLowerCase();
            const tbody = document.getElementById('master-student-body');
            if (!q || q.length < 2) {
                tbody.innerHTML = '<tr><td colspan="3" style="padding: 20px; text-align: center; opacity: 0.5;">Ketik minimal 2 karakter...</td></tr>';
                return;
            }

            const filtered = studentList.filter(s => s.nama.toLowerCase().includes(q) || s.id.toLowerCase().includes(q)).slice(0, 50);
            tbody.innerHTML = '';
            
            if (filtered.length === 0) {
                tbody.innerHTML = '<tr><td colspan="3" style="padding: 20px; text-align: center; opacity: 0.5;">Data tidak ditemukan.</td></tr>';
                return;
            }

            filtered.forEach(s => {
                const tr = document.createElement('tr');
                tr.style.borderBottom = '1px solid rgba(255,255,255,0.05)';
                tr.innerHTML = `
                    <td style="padding: 8px 10px; font-family: monospace; color: #60a5fa;">${s.id}</td>
                    <td style="padding: 8px 10px; color: white;">${s.nama}</td>
                    <td style="padding: 8px 10px; color: #94a3b8; font-size: 0.8rem;">Kls ${s.grade} / R${s.room}</td>
                `;
                tbody.appendChild(tr);
            });
        }

        // Fungsi pengecekan waktu
        function getExamStatus(subjectKey, subjectId, grade) {
            if (examControl[grade] && examControl[grade].subjects[subjectKey]) {
                return examControl[grade].subjects[subjectKey];
            }
            return examControl.global;
        }

        let gkCurrentUrl = '';

        function confirmExamLink(url, subjectName) {
            gkCurrentUrl = url;

            // Buka Modal Presensi Formal
            openModal('modal-presensi');

            // Pre-fill data otomatis berdasarkan konteks ujian
            const mapelSelect = document.getElementById('dh-mapel');
            const tglInput = document.getElementById('dh-tanggal');

            // Set Mata Pelajaran
            if (mapelSelect) {
                // Cari value yang mengandung nama mapel
                for (let opt of mapelSelect.options) {
                    if (opt.value.toLowerCase().includes(subjectName.toLowerCase()) ||
                        subjectName.toLowerCase().includes(opt.value.toLowerCase())) {
                        mapelSelect.value = opt.value;
                        break;
                    }
                }
            }

            // Set Tanggal hari ini
            if (tglInput) {
                const now = new Date();
                const year = now.getFullYear();
                const month = String(now.getMonth() + 1).padStart(2, '0');
                const day = String(now.getDate()).padStart(2, '0');
                tglInput.value = `${year}-${month}-${day}`;
            }

            // Trigger auto-load metadata (pengawas/jam) jika ada
            autoLoadPresensi();

            showToast(`Sila isi Daftar Hadir untuk membuka soal ${subjectName}`);
        }

        function closeExamModal() {
            closeModal('modal-presensi');
        }

        // Fungsi untuk mengaktifkan tombol jika link tersedia & waktu cocok
        function activateButtons() {
            const classLinks = linkUjian[activeClass];
            const now = new Date();

            const subjects = [
                { id: 'agama-islam', key: 'agama' }, { id: 'agama-kristen', key: 'agama' },
                { id: 'agama-katolik', key: 'agama' }, { id: 'agama-budha', key: 'agama' },
                { id: 'agama-khonghucu', key: 'agama' }, { id: 'b-indo', key: 'b-indo' },
                { id: 'b-inggris', key: 'b-inggris' }, { id: 'seni', key: 'seni' },
                { id: 'matematika', key: 'matematika' }, { id: 'pjok', key: 'pjok' },
                { id: 'ipa', key: 'ipa' }, { id: 'ppkn', key: 'ppkn' },
                { id: 'ips', key: 'ips' }, { id: 'b-jawa', key: 'b-jawa' },
                { id: 'informatika', key: 'informatika' },
                { id: 'b-mandarin', key: 'b-mandarin' }, { id: 'bk', key: 'bk' }
            ];

