const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxdplEv1_kpxCl1_Hg0bn2aZPgm37AhmM-QV_qX3geswWBbpRDM7NpopZO86IXPC94Xjg/exec'; 
        
        let confirmResolver = null;
        let debounceTimer;

        // --- GLOBAL UI FUNCTIONS ---
        
        document.addEventListener('DOMContentLoaded', () => {
            // Inisialisasi Lucide icons
            lucide.createIcons();
            // Muat data awal
            loadInventory();
        });

        // Mengatur tampilan dashboard
        function showDashboardView() {
            document.getElementById('dashboardView').classList.remove('hidden');
            document.getElementById('historyView').classList.add('hidden');
            loadInventory(); // Muat ulang data saat kembali ke dashboard
        }

        // Mengatur tampilan riwayat
        function showHistoryView(event) {
            if(event) event.preventDefault();
            document.getElementById('dashboardView').classList.add('hidden');
            document.getElementById('historyView').classList.remove('hidden');
            document.getElementById('dropdownMenu').classList.add('hidden');
            loadHistory();
        }

        // --- MODAL UTILITIES ---

        function showAlert(title, message, callback) {
            document.getElementById('alertTitle').textContent = title;
            document.getElementById('alertMessage').textContent = message;
            document.getElementById('alertModal').classList.remove('hidden');
            document.getElementById('alertConfirmBtn').onclick = () => {
                hideAlert();
                if (callback) callback();
            };
        }

        function hideAlert() {
            document.getElementById('alertModal').classList.add('hidden');
        }

        function showConfirm(title, message, confirmActionText, actionBtnColor = 'bg-red-600') {
            document.getElementById('confirmTitle').textContent = title;
            document.getElementById('confirmMessage').textContent = message;
            const confirmBtn = document.getElementById('confirmActionBtn');
            confirmBtn.textContent = confirmActionText;
            confirmBtn.className = `px-4 py-2 ${actionBtnColor} text-white font-semibold rounded-lg hover:${actionBtnColor.replace('600', '700')} transition-colors`;
            document.getElementById('confirmModal').classList.remove('hidden');

            return new Promise((resolve) => {
                confirmResolver = resolve;
            });
        }

        function hideConfirm(result) {
            document.getElementById('confirmModal').classList.add('hidden');
            if (confirmResolver) {
                confirmResolver(result);
                confirmResolver = null;
            }
        }
        
        function toggleMenu() {
            document.getElementById('dropdownMenu').classList.toggle('hidden');
        }

        // --- FETCH UTILITY ---

        async function fetchData(action, params = {}) {
            if (SCRIPT_URL === 'GANTI_DENGAN_URL_WEB_APP_ANDA') {
                showAlert('Kesalahan Konfigurasi', 'Harap ganti SCRIPT_URL di kode HTML dengan URL Web App Apps Script Anda.', null);
                return null;
            }

            const url = new URL(SCRIPT_URL);
            url.searchParams.append('action', action);
            for (const key in params) {
                if (params[key] !== undefined) {
                    url.searchParams.append(key, params[key]);
                }
            }
            
            try {
                const response = await fetch(url.toString());
                if (!response.ok) throw new Error('Network response was not ok');
                const result = await response.json();
                
                if (result.status === 'error') {
                    showAlert('Kesalahan Server', result.message);
                    return null;
                }
                return result.data;

            } catch (error) {
                console.error('Fetch error:', error);
                showAlert('Kesalahan Jaringan', 'Gagal terhubung ke Apps Script: ' + error.message);
                return null;
            }
        }

        // --- DASHBOARD FUNCTIONS ---

        function debounceSearch() {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                loadInventory();
            }, 500);
        }

        async function loadInventory() {
            document.getElementById('loadingInventory').classList.remove('hidden');
            document.getElementById('inventoryTable').classList.add('hidden');
            document.getElementById('noInventoryMessage').classList.add('hidden');

            const searchQuery = document.getElementById('searchInput').value;
            const data = await fetchData('READ_INVENTORY', { search: searchQuery });

            document.getElementById('loadingInventory').classList.add('hidden');

            if (data && data.inventory) {
                const totalNilaiFormatted = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(data.totalNilai);
                
                document.getElementById('totalJenis').textContent = data.totalJenis;
                document.getElementById('totalNilai').textContent = totalNilaiFormatted;
                
                renderInventoryTable(data.inventory);
            } else {
                document.getElementById('totalJenis').textContent = 0;
                document.getElementById('totalNilai').textContent = 'Rp 0';
                renderInventoryTable([]);
            }
        }

        function renderInventoryTable(inventory) {
            const tbody = document.getElementById('inventoryTableBody');
            tbody.innerHTML = '';

            if (inventory.length === 0) {
                document.getElementById('inventoryTable').classList.add('hidden');
                document.getElementById('noInventoryMessage').classList.remove('hidden');
                return;
            }

            inventory.forEach(item => {
                const totalValue = item['Current Stock'] * item['Latest Price'];
                const row = tbody.insertRow();
                row.className = 'hover:bg-indigo-50 transition-colors';
                
                // Helper untuk format Rupiah
                const formatRupiah = (number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(number);

                // Nama Barang
                row.insertCell().textContent = item['Nama Barang'];
                row.insertCell().textContent = item['Current Stock'];
                // Harga Satuan
                row.insertCell().textContent = formatRupiah(item['Latest Price']);
                row.insertCell().textContent = formatRupiah(totalValue);

                // Aksi
                const actionCell = row.insertCell();
                actionCell.className = 'px-6 py-4 whitespace-nowrap text-center text-sm font-medium';
                actionCell.innerHTML = `
                    <div class="flex items-center justify-center space-x-2">
                         <!-- Tombol Edit di Dashboard: Membuat transaksi 'Masuk' baru untuk memperbarui harga/info -->
                         <button title="Update Harga/Info" onclick="updateItemInfo('${item['Nama Barang']}', ${item['Latest Price']})" class="text-indigo-600 hover:text-indigo-800 p-2 rounded-full hover:bg-indigo-100 transition-colors">
                            <i data-lucide="pencil" class="w-4 h-4"></i>
                        </button>
                        <button title="Barang Masuk" onclick="showTransactionModal('Masuk', true, null, '${item['Nama Barang']}', ${item['Latest Price']})" class="text-green-600 hover:text-green-800 p-2 rounded-full hover:bg-green-100 transition-colors">
                            <i data-lucide="arrow-down-left" class="w-4 h-4"></i>
                        </button>
                        <button title="Barang Keluar" onclick="showTransactionModal('Keluar', true, null, '${item['Nama Barang']}', ${item['Latest Price']})" class="text-red-600 hover:text-red-800 p-2 rounded-full hover:bg-red-100 transition-colors">
                            <i data-lucide="arrow-up-right" class="w-4 h-4"></i>
                        </button>
                        <button title="Hapus Semua Riwayat" onclick="deleteItem('${item['Nama Barang']}')" class="text-red-400 hover:text-red-600 p-2 rounded-full hover:bg-red-100 transition-colors">
                            <i data-lucide="trash-2" class="w-4 h-4"></i>
                        </button>
                    </div>
                `;
            });
            
            document.getElementById('inventoryTable').classList.remove('hidden');
            lucide.createIcons(); // Re-render icons for new rows
        }

        // --- HISTORY FUNCTIONS ---

        async function loadHistory() {
            document.getElementById('loadingHistory').classList.remove('hidden');
            document.getElementById('historyTable').classList.add('hidden');
            document.getElementById('noHistoryMessage').classList.add('hidden');

            const history = await fetchData('GET_HISTORY');

            document.getElementById('loadingHistory').classList.add('hidden');

            if (history && history.length > 0) {
                renderHistoryTable(history);
            } else {
                document.getElementById('historyTable').classList.add('hidden');
                document.getElementById('noHistoryMessage').classList.remove('hidden');
            }
        }

        function renderHistoryTable(history) {
            const tbody = document.getElementById('historyTableBody');
            tbody.innerHTML = '';
            
            const formatRupiah = (number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(number);

            history.forEach(tx => {
                const row = tbody.insertRow();
                row.className = 'hover:bg-indigo-50 transition-colors';
                
                // Tipe warna
                const typeColor = tx.Tipe.toLowerCase() === 'masuk' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';

                row.insertCell().textContent = String(tx.ID).substring(0, 8) + '...'; // ID
                row.insertCell().textContent = tx['Nama Barang']; // Nama Barang
                
                const totalCell = row.insertCell();
                totalCell.className = 'text-right';
                totalCell.textContent = tx['Total Barang']; // Total Barang

                row.insertCell().textContent = formatRupiah(tx['Harga Satuan']); // Harga Satuan
                
                const tipeCell = row.insertCell();
                tipeCell.className = 'text-center';
                tipeCell.innerHTML = `<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${typeColor}">${tx.Tipe}</span>`; // Tipe

                row.insertCell().textContent = tx.Tanggal; // Tanggal
                
                const actionCell = row.insertCell();
                actionCell.className = 'px-6 py-4 whitespace-nowrap text-center text-sm font-medium';
                actionCell.innerHTML = `
                    <div class="flex items-center justify-center space-x-2">
                        <button title="Edit Transaksi" onclick="editTransaction('${tx.ID}', '${tx['Nama Barang']}', ${tx['Total Barang']}, ${tx['Harga Satuan']}, '${tx.Tipe}', '${tx.Tanggal}')" class="text-indigo-600 hover:text-indigo-800 p-2 rounded-full hover:bg-indigo-100 transition-colors">
                            <i data-lucide="pencil" class="w-4 h-4"></i>
                        </button>
                        <button title="Hapus Transaksi" onclick="deleteTransaction('${tx.ID}', '${tx['Nama Barang']}')" class="text-red-600 hover:text-red-800 p-2 rounded-full hover:bg-red-100 transition-colors">
                            <i data-lucide="x" class="w-4 h-4"></i>
                        </button>
                    </div>
                `;
            });

            document.getElementById('historyTable').classList.remove('hidden');
            lucide.createIcons();
        }

        // --- TRANSACTION MODAL HANDLERS ---

        // Fungsi baru untuk memperbarui info/harga barang dari Dashboard
        function updateItemInfo(name, currentPrice) {
            const modal = document.getElementById('transactionModal');
            document.getElementById('modalTitle').textContent = `Update Info Barang: ${name}`;
            
            // Set ID unik sementara (tidak ada ID transaksi spesifik karena ini bukan transaksi)
            document.getElementById('transactionID').value = 'TEMP_UPDATE'; 
            document.getElementById('transactionType').value = 'Masuk'; // Default ke 'Masuk' karena ini logiknya sama dengan transaksi Masuk dengan jumlah 0
            
            document.getElementById('namaBarang').value = name;
            document.getElementById('hargaSatuan').value = currentPrice;
            document.getElementById('totalBarang').value = 0; // Set jumlah ke 0 untuk menandakan hanya update info/harga
            
            // Nonaktifkan field Nama Barang dan Jumlah
            document.getElementById('namaBarang').disabled = true;
            document.getElementById('totalBarang').disabled = true;

            // Aktifkan field Harga Satuan (ini yang mau di-update)
            document.getElementById('hargaSatuan').disabled = false;

            // Set tanggal hari ini sebagai default
            document.getElementById('tanggal').value = new Date().toISOString().substring(0, 10);
            
            document.getElementById('transactionForm').onsubmit = (e) => handleTransactionSubmit(e, 'ADD'); // Masukkan sebagai transaksi ADD baru
            document.getElementById('saveBtnText').textContent = 'Simpan Update Harga';

            modal.classList.remove('hidden');
        }

        function showTransactionModal(type, isQuickEntry = false, event = null, name = '', price = 0) {
            if(event) event.preventDefault();
            
            const modal = document.getElementById('transactionModal');
            document.getElementById('modalTitle').textContent = isQuickEntry ? 
                `Transaksi Cepat ${type}` : 
                `Tambah Barang (${type})`;
            
            document.getElementById('transactionType').value = type;
            document.getElementById('transactionID').value = ''; // Reset ID for new entry
            
            document.getElementById('namaBarang').value = name;
            document.getElementById('hargaSatuan').value = price;
            document.getElementById('totalBarang').value = ''; // Kosongkan jumlah
            document.getElementById('saveBtnText').textContent = 'Simpan';


            // Atur status disabled
            document.getElementById('namaBarang').disabled = isQuickEntry;
            document.getElementById('hargaSatuan').disabled = isQuickEntry;
            document.getElementById('totalBarang').disabled = false;


            // Set tanggal hari ini sebagai default
            document.getElementById('tanggal').value = new Date().toISOString().substring(0, 10);
            
            document.getElementById('transactionForm').onsubmit = (e) => handleTransactionSubmit(e, 'ADD');

            modal.classList.remove('hidden');
        }

        function hideTransactionModal() {
            document.getElementById('transactionModal').classList.add('hidden');
            document.getElementById('transactionForm').reset();
            
            // Pastikan semua field aktif kembali
            document.getElementById('namaBarang').disabled = false;
            document.getElementById('hargaSatuan').disabled = false;
            document.getElementById('totalBarang').disabled = false;
            document.getElementById('saveBtnText').textContent = 'Simpan';
        }

        function editTransaction(id, name, total, price, type, date) {
            const modal = document.getElementById('transactionModal');
            document.getElementById('modalTitle').textContent = 'Edit Transaksi';
            
            document.getElementById('transactionID').value = id;
            document.getElementById('transactionType').value = type;
            document.getElementById('namaBarang').value = name;
            document.getElementById('totalBarang').value = total;
            document.getElementById('hargaSatuan').value = price;
            document.getElementById('tanggal').value = date;
            document.getElementById('saveBtnText').textContent = 'Update';

            // Enable semua field saat Edit
            document.getElementById('namaBarang').disabled = false;
            document.getElementById('hargaSatuan').disabled = false;
            document.getElementById('totalBarang').disabled = false;
            
            document.getElementById('transactionForm').onsubmit = (e) => handleTransactionSubmit(e, 'EDIT');
            
            modal.classList.remove('hidden');
        }

        async function handleTransactionSubmit(event, action) {
            event.preventDefault();
            
            const form = event.target;
            let data = {
                ID: action === 'ADD' ? Date.now().toString() + Math.random().toString(36).substring(2, 9) : form.transactionID.value,
                'Nama Barang': form.namaBarang.value,
                'Total Barang': parseInt(form.totalBarang.value),
                'Harga Satuan': parseFloat(form.hargaSatuan.value),
                Tipe: form.transactionType.value,
                Tanggal: form.tanggal.value
            };
            
            // Jika ini adalah aksi update info/harga dari dashboard (Total Barang = 0)
            if (data['Total Barang'] === 0 && action === 'ADD') {
                // Biarkan validasi jumlah barang dilewati, karena ini adalah transaksi 0 untuk update harga.
            } else if (data['Total Barang'] <= 0) {
                 showAlert('Kesalahan Input', 'Jumlah barang harus lebih dari 0.');
                 return;
            }
            
            // UI Loading
            const saveBtnText = document.getElementById('saveBtnText');
            const saveSpinner = document.getElementById('saveSpinner');
            const originalText = saveBtnText.textContent;
            saveBtnText.textContent = action === 'ADD' ? 'Menyimpan...' : 'Memperbarui...';
            saveSpinner.classList.remove('hidden');
            form.querySelector('button[type="submit"]').disabled = true;

            const apiAction = action === 'ADD' ? 'ADD_TRANSACTION' : 'EDIT_TRANSACTION';
            const result = await fetchData(apiAction, data);

            // UI Reset
            saveBtnText.textContent = originalText;
            saveSpinner.classList.add('hidden');
            form.querySelector('button[type="submit"]').disabled = false;

            if (result) {
                hideTransactionModal();
                showAlert('Berhasil!', `Transaksi berhasil ${action === 'ADD' ? 'dicatat' : 'diperbarui'}.`, () => {
                    // Muat ulang tampilan sesuai view saat ini
                    if (!document.getElementById('dashboardView').classList.contains('hidden')) {
                        loadInventory();
                    } else {
                        loadHistory();
                    }
                });
            }
        }

        // --- DELETE HANDLERS ---

        async function deleteTransaction(id, name) {
            const confirmed = await showConfirm(
                'Hapus Transaksi', 
                `Apakah Anda yakin ingin menghapus transaksi ID: ${String(id).substring(0, 8)}... (${name})?`,
                'Hapus',
                'bg-red-600'
            );

            if (confirmed) {
                const result = await fetchData('DELETE_TRANSACTION', { ID: id });
                if (result) {
                    showAlert('Berhasil!', `Transaksi ${name} berhasil dihapus.`, loadHistory);
                }
            }
        }

        async function deleteItem(name) {
             const confirmed = await showConfirm(
                'Hapus SELURUH Riwayat Barang', 
                `Anda akan menghapus SEMUA riwayat transaksi (Masuk dan Keluar) untuk barang: ${name}. Stok barang akan menjadi nol (0). Apakah Anda yakin?`,
                'Hapus Semua',
                'bg-red-600'
            );

            if (confirmed) {
                const result = await fetchData('DELETE_ITEM', { 'Nama Barang': name });
                if (result) {
                    showAlert('Berhasil!', `Seluruh riwayat untuk ${name} berhasil dihapus.`, loadInventory);
                }
            }
        }
