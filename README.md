# YelReader

İngilizce metinleri okurken bilmediğin kelimeye sözlüğe gitmeden bakmanı sağlayan, tarayıcıda çalışan bir okuma uygulaması. Amaç tek: okuma akışını bozmamak.

**Canlı sürüm:** GitHub Pages üzerinden yayınlanıyor (`main` dalına her push'ta otomatik).

## Ne yapar?

- **Kelimeye dokun, anlamı gelsin.** Türkçe karşılık, tanım, telaffuz, örnek cümle ve eş anlamlılar küçük bir kartta görünür. Çekimli kelimeler köküyle aranır (`walked` → `walk`).
- **Cümle veya ifade çevirisi.** Birkaç kelimeyi seçince "Çevir" balonu çıkar. Kelime kartında da "Cümleyi çevir" var.
- **"Biliyorum" ve yeni kelime ipuçları.** İstersen seviyenin (A2/B1/B2) üstündeki kelimelerin altı noktalı çizilir. "Biliyorum" dediğin kelimeler bir daha işaretlenmez.
- **Kaydet, sonra tekrar et.** Kaydedilen kelime, geçtiği cümleyle birlikte saklanır. Tekrar ekranı aralıklı tekrar (SM-2) kullanır.
- **Kaldığın yerden devam.** Her metin, kaydırma konumuyla birlikte hatırlanır.
- **Metin ekleme.** Yazarak/yapıştırarak, URL'den, PDF veya EPUB dosyasından.
- **Notlar ve vurgular.** Paragraflara metin/görsel notu, kelimelere renkli vurgu.
- **Çevrimdışı.** Uygulama PWA olarak kurulabilir. Bir kez bakılan kelimeler ve çeviriler cihazda saklanır, bağlantı olmadan da açılır.

## Veriler ve gizlilik

Hesap yok, sunucu yok. Metinler, kelimeler ve notlar yalnızca tarayıcında durur (IndexedDB ve localStorage). Ayarlar → Veri bölümünden tamamını tek bir JSON dosyası olarak yedekleyip geri yükleyebilirsin.

Bir kelimeye bakarken yalnızca o kelime ve cümlesi şu servislere gider: [Free Dictionary API](https://dictionaryapi.dev), Google Translate (resmi olmayan uç nokta, yedek olarak Lingva), [Datamuse](https://www.datamuse.com/api/) (kelime sıklığı). URL'den içe aktarma, adresi herkese açık bir CORS proxy'si üzerinden iletir.

## Geliştirme

Uygulama `yel-reader/` klasöründe. Node 22 gerekir.

```bash
cd yel-reader
npm ci
npm run dev      # geliştirme sunucusu
npm test         # birim testleri (node:test)
npm run e2e      # tarayıcı testleri: derler, vite preview açar, kurulu Chrome ile çalışır
npm run build    # üretim derlemesi (dist/)
```

Tarayıcı testleri tüm ağ isteklerini sahte cevaplarla karşılar, internet gerektirmez. Chrome başka bir yerdeyse `CHROME_PATH=/yol/chrome npm run e2e`.

### Yapı

| Klasör | İçerik |
|---|---|
| `src/pages/` | Sayfalar: Kütüphane, Okuma, Kelimelerim, Notlar, Tekrar, Ayarlar, Yeni Metin |
| `src/components/` | Kelime kartı, ifade çevirisi, not editörü, hata ekranı, ortak arayüz parçaları |
| `src/utils/` | Saf mantık (testli): metin bölme, kök bulma, sözlük/çeviri + önbellek, not yeniden bağlama, yedek doğrulama, tekrar sırası, dışa aktarma |
| `src/data/` | Kelime sıklığı listesi |
| `e2e/` | Playwright tarayıcı testleri |

Arayüz metinleri `src/utils/i18n.js` içinde (Türkçe ve İngilizce). Çeviri fonksiyonları kaynak ve hedef dili parametre olarak alır; şu an yalnızca İngilizce → Türkçe kullanılıyor.

## Lisanslar

`src/data/wordRank.txt`, [wordfreq](https://github.com/rspeer/wordfreq) verisinden türetilmiştir ve [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) lisanslıdır.
