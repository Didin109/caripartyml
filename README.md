# ML Squad — Firebase Email/Password + EmailJS

## Fitur
- Daftar dan masuk dengan email/password Firebase Authentication.
- Setiap akun memiliki UID dan hanya dapat mengubah/menghapus postingannya sendiri.
- Setiap akun hanya dapat membuat 1 postingan per 5 menit. Pembatasan ditegakkan oleh Firestore Rules dengan waktu server.
- Pengguna yang sudah login dapat membalas postingan.
- Balasan disimpan di subcollection `posts/{postId}/replies`.
- DANA: 082191523276; Saweria: https://saweria.co/donatesaya
- EmailJS tetap opsional untuk email notifikasi admin saat posting baru.

## 1. Upload ke GitHub
Ekstrak ZIP. Upload `index.html`, `style.css`, dan `app.js` ke root repository. `firestore.rules` adalah aturan database, bukan file tampilan. README ini panduan.

Aktifkan GitHub Pages: repository → Settings → Pages → Deploy from a branch → pilih `main` dan `/ (root)` → Save.

## 2. Aktifkan login Firebase
1. Buka https://console.firebase.google.com/ lalu pilih project `mobile-legendkomunitas`.
2. Buka Build → Authentication → Get started.
3. Pilih Sign-in method → Email/Password → aktifkan Email/Password → Save.
4. Buka Authentication → Settings → Authorized domains. Tambahkan domain GitHub Pages kamu (contoh `username.github.io`, tanpa `https://`).
5. Jangan aktifkan Anonymous Authentication untuk versi ini; kode sudah menggunakan email/password.

## 3. Pasang Firestore Rules (WAJIB)
1. Firebase Console → Firestore Database → Rules.
2. Ganti seluruh isi Rules dengan isi file `firestore.rules` dari ZIP ini.
3. Klik Publish.

Rules ini membatasi posting 5 menit di sisi server. Jangan menghapus collection `rateLimits`, karena catatan waktu terakhir posting disimpan di sana. Pengguna tidak boleh bisa menulis rate limit milik akun lain.

## 4. EmailJS
EmailJS hanya mengirim notifikasi posting baru ke alamat admin yang kamu atur pada template EmailJS. Pengiriman email bukan sistem login; login ditangani Firebase.

Di `app.js`:
- Service ID dan Public Key yang sebelumnya kamu berikan tetap terpasang.
- `EMAILJS_TEMPLATE_ID` masih bernilai ID uji `__ejs-test-mail-service__`. Ganti dengan Template ID asli dari EmailJS agar email notifikasi berfungsi.
- Buat template EmailJS, isi **To Email** dengan email admin di dashboard EmailJS (jangan ambil alamat penerima dari input publik).

Contoh subject: `Postingan baru ML Squad: {{category_name}}`

Contoh isi:
```
Postingan baru ML Squad
Nama: {{nickname}}
Kategori: {{category_name}}
ID pemain: {{player_id}}
Zone ID: {{zone_id}}
Target: {{target}}
Rank: {{rank}}
Role: {{role}}
Catatan: {{note}}
ID postingan: {{post_id}}
```
Atur Allowed Origins / domain pada dashboard EmailJS ke domain GitHub Pages kamu jika tersedia. Jangan pernah menaruh EmailJS Private Key atau secret server di file frontend.

## 5. Donasi
Tombol DANA menyalin nomor `082191523276`. Tombol Saweria membuka `https://saweria.co/donatesaya`. Pastikan akun/nomor penerima benar sebelum website dipublikasikan. Donasi bersifat sukarela; ini bukan integrasi pembayaran otomatis.

## 6. Catatan keamanan dan penggunaan
- Firebase Web API Key di `app.js` adalah konfigurasi aplikasi web, bukan kunci admin. Keamanan ditentukan oleh Authentication dan Firestore Rules.
- Jangan pernah meminta password, OTP, atau data login Mobile Legends pengguna.
- ID pemain dan Zone ID ditampilkan di postingan komunitas; pastikan pengguna memang setuju membagikannya.
- Fitur emailJS saat ini hanya notifikasi admin untuk postingan baru. Notifikasi email untuk setiap balasan memerlukan template dan alur tambahan.
- Batas lima menit berlaku per akun Firebase. Pengguna yang membuat akun lain dapat memiliki jatah akun lain; untuk mencegah penyalahgunaan multi-akun diperlukan verifikasi tambahan/App Check atau backend.
