# Havana — Sokağın İzinde

Mevcut Three.js sitesinin üzerine geliştirilmiş birinci şahıs keşif oyunu. `npm install` ardından `npm run dev` ile yerel sunucuyu başlatın: http://127.0.0.1:5173/.

Başlangıç ekranında **Keşfe Başla** veya kayıt varsa **Oyuna Devam Et** seçin. **Yeni Oyun**, keşif kaydını sıfırlar. Ana menüdeki **Kaydırmalı gezi** mevcut web deneyimini açar; doğrudan `/?mode=tour` da kullanılabilir.

| Kontrol | İşlev |
| --- | --- |
| W / A / S / D | Yürü |
| Mouse | Etrafa bak; fare kilidi yoksa sürükle |
| Shift / Space | Koş / zıpla |
| E / F | Nesneyi incele / el feneri |
| Esc / Tab | Duraklat / keşif günlüğü |
| R / G | Başlangıca dön / defteri bırak |

İncelemede sürükleyerek döndürün; tekerlek veya + / − ile yakınlaşın. Bank, saksı ve defter girişte, erişilebilir lambalar doğu tarafında, gizli not batıda bulunur. Beş nesne ve batı köşesi keşfedilince gezi tamamlanır. İlerleme, ayarlar, son güvenli konum ve defterin taşıma/bırakma durumu localStorage'a kaydedilir.

`npm test` fizik/kayıt testlerini çalıştırır. Sunucu çalışırken `npm run test:browser` oyun, görev tamamlama, mobil ve önceki gezi kontrollerini de çalıştırır. `npm run analyze:assets` model envanterini üretir. Mimari, test ayrıntıları ve kaynak modelin sınırları: [geliştirme raporu](docs/DEVELOPMENT.md).

Oyunda klavye ve mouse kullanılır. Dokunmatik cihazlarda önceki kaydırmalı gezi sunulur. GPU'ya göre düşük/orta/yüksek/otomatik kalite seçilebilir; 60 FPS cihaz bağımlıdır. Mevcut model fotoğraf dokulu cepheler içerir, bina içi geometri sağlamaz.

## Korunan kaydırmalı gezi

- Kaydırma, beş duraklı kamera rotasını ilerletir.
- Nesneye tıklamak nesneye odaklanır ve serbest keşfi açar.
- Serbest keşifte sürükleme kamerayı döndürür; tekerlek veya iki parmak yakınlaştırır.
- Sağ alttaki kontroller yakınlaştırır, uzaklaştırır ve geziye döndürür.
- Sağdaki duraklar ve “Sokağa adım at” düğmesi rotada ilerletir.

Ana model 73 mesh içeren, dokuları gömülü GLB dosyasıdır. Harici glTF sürümünün buffer ve doku dosyaları da mevcuttur; eksik kaynak dosyası bulunmadı. `src/street-props.js` bank, saksı, bitki ve mevcut lamba konumlarında tam üç boyutlu lamba geometrileri üretir. Özgün model dosyaları değiştirilmez.

`npm run build` üretim çıktısını, `npm run inspect:model` modelin geometri sınırlarını ve kaynak bilgilerini üretir. `node scripts/preview-check.mjs` kurulu Chrome üzerinden masaüstü ve mobil ekran görüntüleriyle gezinmeyi doğrular.

Model: [Modular Havana Street – Low-Poly Asset Kit](https://sketchfab.com/3d-models/modular-havana-street-low-poly-asset-kit-74f1e89642114d448168b2f0a1f1d56b), [TRYFIELD](https://sketchfab.com/tryfield), [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Ek sokak eşyaları kodla oluşturulmuştur. Fontlar Google Fonts üzerinden yüklenir; çevrimdışı durumda sistem fontları kullanılır.
