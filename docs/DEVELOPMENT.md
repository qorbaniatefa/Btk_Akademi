# Havana — geliştirme ve doğrulama raporu

## 1. Mevcut proje analizi

Mevcut Vite + Three.js + JavaScript mimarisi korundu. Yeni framework veya fizik bağımlılığı eklenmedi. Scroll kamera rotası, OrbitControls ile serbest gezi ve tıklayarak nesneye odaklanma `?mode=tour` üzerinden çalışmaya devam eder. Ana menüden geziye ve gezi başlığından oyuna geçilir.

`asset-analysis.json` bütün kaynak dosyalarının analizidir: 2 GLB, 1 glTF, 1 USDZ, 31 PNG, bir BIN ve lisans metni. OBJ, FBX, MTL veya Blender dosyası bulunmadı. GLB/glTF buffer ve resim bağlantılarında eksik kaynak yok. USDZ arşivi yerinde korundu; web oyunu için GLB kullanılır, USDZ içeriği dönüştürülmez.

Ana GLB yaklaşık 17,5 MB; 95 node, 73 mesh, 39 materyal ve 7.018 üçgen içerir. 18 gömülü PNG'nin boyutları 1024×512 veya 1024×1024'tür. Mipmap dahil yaklaşık 53 MB RGBA doku belleği beklenir; sürücüye bağlı gerçek kullanım farklı olabilir. Alternatif GLB 39,9 MB, 2 mesh ve 1.231 üçgen içerir; oyun bunu ayrıca yüklemez.

Y ekseni yukarıdır. Ham geometri sınırları yaklaşık X [-7,31; 18,98], Y [-0,16; 3,65], Z [-12,85; 9,85]. Kaydırmalı gezide yatay alan 24 birime normalize edilir. Oyunda mimariye ayrı 2,5 ölçek uygulanır; bank ve saksıların geometrisi insan ölçeğinde tutulur. Kameranın göz yüksekliği 1,65 metredir. Kaynak mimari, dokular ve PBR materyalleri korunur; modellerde bulunmayan bina içleri veya kapı boşlukları varsayılmaz.

## 2. Hareket ve fizik

`player.js`, 120 Hz sabit fizik adımı ve sınırlı delta-time biriktirmesi kullanır. Kapsül yarıçapı 0,30 m, boyu 1,80 m. Yürüme 3,2 m/s, koşma 6 m/s; hızlanma/yavaşlama, yer çekimi, zıplama, isteğe bağlı kamera hareketi vardır.

`collision-world.js`, gerçek dünya koordinatlarındaki üçgenlerden Octree oluşturur. İnce cepheler iki yönden çarpışır. Kaynak lambaların saydam billboard dikdörtgenleri yerine kodla üretilen katı lambalar kullanılır; saydam bölgelerde görünmez duvar oluşması önlenir. 24 cm'ye kadar basamak denemesi, eğimde yürüme ve zemin güvenliği sağlanır. R ile başlangıca dönüş vardır; sınır dışına çıkma, düşme veya uzun süreli geometri içinde kalmada otomatik dönüş yapılır.

## 3. Etkileşim ve görevler

Kamera merkezinden 3,2 m raycast; fizik yüzeyleri ayrıca görüş engeli olarak kontrol edilir. Nesne vurgusu sadece yakındaki görünür hedefe uygulanır. E inceleme açar. İnceleme ayrı sahne ve kamera kullanır; gerçek nesne kaynakları paylaşılır, döndürme ve zoom sağlanır. Klonun kaynak nesneye döngüsel userData referansları kopyalanmaz.

Beş nesne: bank, saksı, erişilebilir herhangi bir sokak lambası, gezi defteri ve batı tarafındaki gizli not. Bank, saksı ve lambalar mevcut kodla üretilen varlıklardır; defter ve not bu oyun için eklenen nesnelerdir. Batı köşesi ayrı bölge hedefidir. Defter alınabilir ve güvenli zemine bırakılabilir. Defteri taşıma için G veya HUD düğmesi kullanılır.

Görev ilerlemesi gerçek inceleme/bölge olaylarından hesaplanır. Tamamlanma ekranı beş hedef ve bölge keşfinden sonra açılır. Kayıt sürümlü, hedef ID'leri filtreli ve konumları doğrulanmıştır; hatalı JSON veya engellenmiş localStorage oyunu çökertmez. Keşif ve son güvenli konumla birlikte taşınan/bırakılan defterin durumu da kaydedilir. Yeni Oyun ve Oyuna Devam Et seçenekleri vardır.

Tamamlama kontrolünde 4.859 yürünebilir örnek hücrenin 2.919'u başlangıca bağlandı; bağlantı kenarları kapsül büyüklüğündeki aralıklarla doğrulandı. Bank, saksı, defter, batı notu ve erişilebilir bir lamba için bağlantılı, 3,2 m içindeki görünür etkileşim noktaları bulundu. İlk seçilen kapalı avludaki lamba yerine erişilebilir herhangi bir lambanın incelenmesi kabul edilir.

## 4. Türkçe arayüz

Başlangıç, HUD, nişangâh, etkileşim mesajı, görevler, ilerleme, günlük, duraklatma, kontrol rehberi, ayarlar ve tamamlanma ekranları. Pointer Lock gerçek kullanıcı hareketiyle istenir; başarısız olursa açık bir sürükleyerek bakma seçeneği sunulur. ESC/odak kaybı duraklatır. Menülerde klavye odağı korunur. Mobil cihazlara mevcut kaydırmalı gezi sunulur; oyun klavye ve mouse gerektirir.

## 5. Grafik ve performans

sRGB renk yönetimi, ACES tonemapping, PBR, yarımküre/güneş ışığı ve statik yumuşak gölgeler korunur. Oyun için küçük bir canvas döşeme dokusu, renkli atmosfer ve el feneri eklenir. Post-processing zinciri yoktur. Kalite seviyeleri pixel ratio'yu 0,8 / 1 / 1,5 ile sınırlar; düşük kalitede gölgeler kapalıdır. Otomatik mod uzun süre düşük FPS algılarsa kaliteyi azaltır. Frustum culling Three.js üzerinden açık kalır; bu küçük sahnede ek LOD/instancing katmanı gerekli görülmedi.

Sabit görüntü tekrar render edilmez, gölgeler statik sahne veya kalite değişiminde güncellenir. İnceleme kapanınca klon sahneden çıkarılır; paylaşılan geometri/dokular dispose edilmez. Vurgu materyalleri önbelleğe alınır. Kısa Web Audio efektleri bittiğinde node bağlantıları bırakılır. 60 FPS hedeflenir; bu makinedeki yazılımsal headless tarayıcı testleri donanımlı GPU performansını kanıtlamaz.

## 6. Kontroller ve test komutları

`npm run dev` yerel geliştirme sunucusunu açar. `npm run build` üretim çıktısıdır. Node fizik ve kayıt testleri, Chromium üzerinden gerçek oyun akışı testleri ve geometri bağlantısı/ulaşılabilirlik testleri scripts klasöründedir.

- `node scripts/analyze-assets.mjs`: dosya ve doku envanteri, kaynak bağlantıları.
- `node scripts/physics-check.mjs`: çift yönlü duvar, zemin, zıplama/iniş, koşma, 60/120 Hz bağımsızlık, eğim, basamak, düşme sonrası dönüş, mouse limitleri.
- `node scripts/save-check.mjs`: bozuk kayıt, geçersiz hedef/konum, tamamlanma ve erişimi engellenmiş storage.
- `node scripts/game-check.mjs`: gerçek Pointer Lock veya açık fallback, yürüyüş, fener, reset, pause, E inceleme, günlük, ayarlar, reload/devam, eski geziye geçiş, JavaScript hataları.
- `node scripts/mission-check.mjs`: gerçek kapsül geometrisiyle bağlantılı yürünebilir hücreler, beş görünür raycast hedefi, alma/bırakma, bölge ziyareti, %100 tamamlanma, Pointer Lock desteklenmediğinde alternatif.
- `node scripts/preview-check.mjs`: eski kaydırmalı gezinmenin masaüstü/mobil regresyon kontrolü.

Tarayıcı testleri Windows'ta kurulu Chrome konumunu kullanır ve `test-results/` içine ekran görüntüleri yazar. Başka sistemde executablePath güncellenmeli veya Playwright Chromium kurulmalıdır.

## Kaynağın sınırları

Model, fotoğraf dokulu cephe ve sokak varlık kitidir; tam bina içi ortam veya kapı animasyonu içermez. Bazı avlular geometriyle kapalıdır. Özgün mimariyi keserek hayali geçit oluşturulmadı; keşif hedeflerinin başlangıçtan erişilebilirliği ayrıca kontrol edilir. GPU'lu farklı cihazlarda 60 FPS doğrulaması ve gerçek mobil birinci şahıs dokunmatik kontrolleri bu kapsamda yapılmadı.

Model: TRYFIELD, Modular Havana Street – Low-Poly Asset Kit, CC BY 4.0. Lisans atfı oyun ve gezi arayüzünde görünür.

USDZ arşivinin ZIP bütünlüğü ayrıca kontrol edildi: `scene.usdc` ve 28 JPG kaynak içeriyor, arşiv bütünlük testi geçti. USD crate geometrisi ayrı bir USD çalışma ortamında render edilmedi; geometri incelemesi oyunda kullanılan GLB/glTF sürümlerinde yapıldı.

## Değişen dosyalar

Güncellenen: `src/main.js`, `src/style.css`, `index.html`, `package.json`, `README.md`, `scripts/preview-check.mjs`.

Eklenen oyun modülleri: `src/game/game.js`, `player.js`, `collision-world.js`, `interaction.js`, `save.js`, `ui.js`, `audio.js`, `game.css`.

Eklenen geliştirme dosyaları: `vite.config.js`, `scripts/analyze-assets.mjs`, `physics-check.mjs`, `save-check.mjs`, `game-check.mjs`, `mission-check.mjs`, `scene-probe.mjs`, `mobile-check.mjs`, `check.mjs`, `docs/asset-analysis.json`, `docs/DEVELOPMENT.md`.

Son doğrulama: `npm test`, `npm run test:browser` ve `npm run build` başarılı. Yerel sunucu HTTP 200 verdi. Three.js çekirdek paketi 535 KB olduğundan Vite'ın 500 KB paket boyutu uyarısı kalıyor; bu derleme hatası değildir. Uygulama kodu ve Three.js eklentileri ayrı paketlere çıkarılmıştır.
