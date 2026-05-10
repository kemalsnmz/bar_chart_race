# Line Chart Race Modülü — Proje Yol Haritası ve Claude Code Talimatı

Bu dosya, mevcut SaaS projesine **Line Chart Race** özelliği eklemek için hazırlanmıştır.  
Amaç: Mevcut **Bar Chart Race** altyapısını genişleterek, kullanıcıların CSV/JSON verilerinden animasyonlu line chart race videoları oluşturabilmesini sağlamak.

---

## 1. Proje Hedefi

Mevcut SaaS uygulamasına yeni bir grafik türü olarak **Line Chart Race** ekle.

Kullanıcı şunları yapabilmeli:

1. CSV veya JSON veri yükleyebilmeli.
2. Zaman serisi verilerini görselleştirebilmeli.
3. Birden fazla seriyi aynı anda animasyonlu şekilde izleyebilmeli.
4. Line chart üzerindeki çizgiler zamanla ilerlemeli.
5. Her çizginin etiketi, çizginin son noktasını takip etmeli.
6. Eksene, renklere, temalara, başlığa ve açıklamalara müdahale edebilmeli.
7. Remotion ile MP4 video export alabilmeli.
8. Bar Chart Race ile ortak altyapıyı kullanabilmeli.

---

## 2. Mevcut Projeye Entegrasyon Mantığı

Bu özellik sıfırdan ayrı bir sistem gibi değil, mevcut chart animation sisteminin genişletilmiş bir modülü olarak inşa edilmelidir.

Önerilen yapı:

```txt
src/
 ├── engine/
 │    ├── timeline/
 │    ├── interpolation/
 │    ├── animation/
 │    ├── data/
 │    └── chart-state/
 │
 ├── charts/
 │    ├── bar-race/
 │    └── line-race/
 │
 ├── components/
 │    ├── axis/
 │    ├── labels/
 │    ├── legend/
 │    ├── grid/
 │    └── chart-container/
 │
 ├── themes/
 │    ├── chart-themes.ts
 │    └── line-race-themes.ts
 │
 ├── presets/
 │    └── line-race-presets.ts
 │
 └── remotion/
      └── compositions/
```

---

## 3. Kullanılacak Ana Teknolojiler

Projede mevcut yapıya göre aşağıdaki teknolojiler kullanılmalı:

- React
- TypeScript
- Next.js
- Remotion
- SVG
- D3 scale utilities
- CSV parser
- Zod veya benzeri schema validation
- TailwindCSS

Line Chart Race render tarafında öncelikli olarak **SVG** kullanılmalıdır.  
Canvas ilk MVP için gerekli değildir.

---

## 4. Veri Formatı

Line chart race için ana veri formatı şu şekilde normalize edilmelidir:

```ts
export type RawLineRaceRow = {
  date: string;
  [seriesName: string]: string | number;
};
```

CSV örneği:

```csv
date,USA,China,Japan,Germany
1960,543,59,44,84
1961,563,50,53,89
1962,605,47,61,95
```

Normalize edilmiş format:

```ts
export type NormalizedLineRacePoint = {
  date: string;
  timestamp: number;
  values: Record<string, number>;
};
```

Seri bazlı format:

```ts
export type LineRaceSeries = {
  id: string;
  label: string;
  color: string;
  points: Array<{
    date: string;
    timestamp: number;
    value: number;
  }>;
};
```

---

## 5. Ana Modüller

### 5.1 Data Parser

Dosya:

```txt
src/engine/data/parse-line-race-data.ts
```

Görevleri:

- CSV/JSON verisini okuyacak.
- İlk kolonu tarih/zaman alanı olarak kabul edecek.
- Diğer kolonları seri olarak yorumlayacak.
- Boş değerleri kontrol edecek.
- Sayısal olmayan değerleri temizleyecek veya hata verecek.
- Tüm veriyi normalize edecek.

Fonksiyon:

```ts
export function parseLineRaceData(input: string): LineRaceSeries[];
```

Kabul kriterleri:

- CSV parse edebilmeli.
- JSON parse edebilmeli.
- Eksik değerleri güvenli yönetebilmeli.
- Hatalı format için anlamlı error döndürmeli.

---

### 5.2 Timeline Engine

Dosya:

```txt
src/engine/timeline/create-line-race-timeline.ts
```

Görevleri:

- Veri tarihlerini frame aralıklarına çevirecek.
- FPS ve duration bilgisine göre animasyon zamanlamasını kuracak.
- Her frame için aktif zaman noktasını hesaplayacak.

Tipler:

```ts
export type LineRaceTimelineConfig = {
  fps: number;
  durationInFrames: number;
  startDate: string;
  endDate: string;
};

export type LineRaceTimelineState = {
  frame: number;
  progress: number;
  currentTimestamp: number;
  currentDateLabel: string;
};
```

Fonksiyon:

```ts
export function getLineRaceTimelineState(
  frame: number,
  config: LineRaceTimelineConfig
): LineRaceTimelineState;
```

Kabul kriterleri:

- Frame 0 için ilk tarih dönmeli.
- Son frame için son tarih dönmeli.
- Ortadaki frame’lerde doğru progress hesaplanmalı.

---

### 5.3 Interpolation Engine

Dosya:

```txt
src/engine/interpolation/interpolate-line-series.ts
```

Görevleri:

- İki veri noktası arasında ara değer üretmek.
- Her frame için her serinin güncel değerini hesaplamak.
- Line path için progressive point listesi üretmek.

Fonksiyonlar:

```ts
export function lerp(start: number, end: number, t: number): number;

export function interpolateSeriesValue(
  series: LineRaceSeries,
  currentTimestamp: number
): number;

export function getVisibleSeriesPoints(
  series: LineRaceSeries,
  currentTimestamp: number
): LineRaceSeries["points"];
```

Kabul kriterleri:

- Yıllık veri frame bazında smooth ilerlemeli.
- Değer sıçraması olmamalı.
- Mevcut tarihe kadar olan noktalar çizilmeli.
- Son segment interpolated point ile bitmeli.

---

### 5.4 Scale Engine

Dosya:

```txt
src/charts/line-race/create-line-race-scales.ts
```

Görevleri:

- X scale oluşturmak.
- Y scale oluşturmak.
- Dynamic Y-axis desteklemek.
- Responsive chart width/height desteklemek.

Fonksiyon:

```ts
export function createLineRaceScales(params: {
  width: number;
  height: number;
  margin: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  series: LineRaceSeries[];
  currentTimestamp: number;
  dynamicYAxis: boolean;
});
```

Kabul kriterleri:

- X ekseni zamana göre çalışmalı.
- Y ekseni değer aralığına göre çalışmalı.
- Dynamic y-axis aktifken max değer frame’e göre güncellenmeli.
- Static y-axis aktifken tüm dataset’in max değeri kullanılmalı.

---

## 6. Line Chart Race Component

Ana component:

```txt
src/charts/line-race/LineChartRace.tsx
```

Props:

```ts
export type LineChartRaceProps = {
  series: LineRaceSeries[];
  width: number;
  height: number;
  frame: number;
  fps: number;
  durationInFrames: number;
  title?: string;
  subtitle?: string;
  theme?: LineRaceTheme;
  showGrid?: boolean;
  showLegend?: boolean;
  showLabels?: boolean;
  dynamicYAxis?: boolean;
  highlightMode?: "none" | "leader" | "top3" | "custom";
  maxVisibleSeries?: number;
};
```

Görevleri:

- Timeline state alacak.
- Her seri için visible points hesaplayacak.
- SVG path oluşturacak.
- Label pozisyonlarını hesaplayacak.
- Axis, grid, legend ve başlıkları render edecek.
- Remotion frame değerine göre animasyonu yönetecek.

---

## 7. SVG Path Rendering

Dosya:

```txt
src/charts/line-race/create-line-path.ts
```

Fonksiyon:

```ts
export function createLinePath(points: Array<{ x: number; y: number }>): string;
```

Beklenen çıktı:

```txt
M 0 100 L 20 80 L 40 75 L 60 50
```

İlk MVP’de D3 line generator kullanılabilir.

Kabul kriterleri:

- Boş points listesinde boş string dönmeli.
- Tek nokta varsa küçük marker gösterilmeli.
- Çoklu noktalar doğru path üretmeli.

---

## 8. Label Engine

Dosya:

```txt
src/charts/line-race/get-line-label-position.ts
```

Görevleri:

- Her line’ın son görünür noktasını bulmak.
- Label’ı line’ın sonuna yerleştirmek.
- Label çakışmalarını azaltmak.
- İstenirse label’a current value eklemek.

Tip:

```ts
export type LineRaceLabel = {
  id: string;
  label: string;
  value: number;
  x: number;
  y: number;
  color: string;
};
```

Fonksiyon:

```ts
export function getLineRaceLabels(params: {
  visibleSeries: LineRaceVisibleSeries[];
  labelOffsetX: number;
}): LineRaceLabel[];
```

Kabul kriterleri:

- Label çizginin ucunu takip etmeli.
- Value frame bazında güncellenmeli.
- Çok yakın label’lar mümkün olduğunca ayrıştırılmalı.

---

## 9. Highlight ve Race Mantığı

Dosya:

```txt
src/charts/line-race/get-line-race-ranking.ts
```

Görevleri:

- Her frame’de current value’ya göre sıralama yapmak.
- Lider çizgiyi tespit etmek.
- Top 3 çizgiyi tespit etmek.
- Overtake olaylarını yakalamak.

Tip:

```ts
export type LineRaceRankItem = {
  id: string;
  label: string;
  value: number;
  rank: number;
  previousRank?: number;
  changedRank: boolean;
};
```

Kabul kriterleri:

- En yüksek current value rank 1 olmalı.
- Rank değişimi tespit edilmeli.
- Highlight mode buna göre çalışmalı.

---

## 10. Tema Sistemi

Dosya:

```txt
src/themes/line-race-themes.ts
```

Tip:

```ts
export type LineRaceTheme = {
  name: string;
  background: string;
  textColor: string;
  axisColor: string;
  gridColor: string;
  fontFamily: string;
  lineWidth: number;
  activeLineWidth: number;
  mutedOpacity: number;
  labelBackground: string;
  labelTextColor: string;
};
```

Başlangıç temaları:

1. Minimal Light
2. Minimal Dark
3. Financial Terminal
4. Neon
5. Data Journalism
6. Social Media Bold

---

## 11. Preset Sistemi

Dosya:

```txt
src/presets/line-race-presets.ts
```

Preset örneği:

```ts
export const lineRacePresets = [
  {
    id: "minimal-light",
    name: "Minimal Light",
    width: 1920,
    height: 1080,
    fps: 30,
    durationInFrames: 900,
    theme: "minimal-light",
    showGrid: true,
    showLegend: false,
    showLabels: true,
    dynamicYAxis: true,
    highlightMode: "leader",
    maxVisibleSeries: 10,
  },
  {
    id: "shorts-vertical",
    name: "Shorts / Reels Vertical",
    width: 1080,
    height: 1920,
    fps: 30,
    durationInFrames: 900,
    theme: "social-media-bold",
    showGrid: true,
    showLegend: false,
    showLabels: true,
    dynamicYAxis: true,
    highlightMode: "top3",
    maxVisibleSeries: 8,
  }
];
```

---

## 12. Remotion Integration

Yeni composition:

```txt
src/remotion/compositions/LineRaceComposition.tsx
```

Beklenen yapı:

```tsx
import { useCurrentFrame, useVideoConfig } from "remotion";
import { LineChartRace } from "@/charts/line-race/LineChartRace";

export function LineRaceComposition(props: LineRaceCompositionProps) {
  const frame = useCurrentFrame();
  const { fps, durationInFrames, width, height } = useVideoConfig();

  return (
    <LineChartRace
      frame={frame}
      fps={fps}
      durationInFrames={durationInFrames}
      width={width}
      height={height}
      {...props}
    />
  );
}
```

Kabul kriterleri:

- Remotion preview içinde çalışmalı.
- Frame ilerledikçe line chart ilerlemeli.
- Export sırasında deterministik olmalı.
- Random değer kullanılacaksa seed kullanılmalı.

---

## 13. UI Entegrasyonu

Mevcut dashboard içinde yeni chart type eklenmeli:

```ts
type ChartType = "bar-race" | "line-race";
```

UI’da kullanıcı şunları seçebilmeli:

- Chart type
- Dataset
- Preset
- Theme
- Duration
- FPS
- Aspect ratio
- Dynamic Y-axis açık/kapalı
- Show labels açık/kapalı
- Show legend açık/kapalı
- Max visible series
- Highlight mode
- Title
- Subtitle
- Source label

---

## 14. Kullanıcı Akışı

Beklenen ürün akışı:

```txt
1. Kullanıcı CSV yükler
2. Sistem veriyi parse eder
3. Kullanıcı chart type olarak Line Chart Race seçer
4. Sistem preview üretir
5. Kullanıcı tema ve preset seçer
6. Kullanıcı başlık / açıklama girer
7. Kullanıcı preview izler
8. Kullanıcı MP4 export alır
```

---

## 15. MVP Kapsamı

İlk sürümde yapılması gerekenler:

- CSV upload
- CSV parse
- LineRaceSeries formatına dönüştürme
- Timeline engine
- Interpolation engine
- SVG line rendering
- Dynamic Y-axis
- Moving labels
- Basic theme
- Remotion composition
- MP4 export
- Horizontal 16:9 preset
- Vertical 9:16 preset

---

## 16. MVP Dışında Bırakılacaklar

İlk sürümde yapılmasına gerek olmayanlar:

- Canvas renderer
- 3D camera effects
- Audio sync
- AI caption generation
- Auto music
- Advanced collision detection
- Manual keyframe editor
- Stock market API integration
- Real-time data feed
- Collaborative editing

---

## 17. Geliştirme Fazları

### Faz 1 — Core Engine

Amaç: Veriden frame bazlı line state üretmek.

Yapılacaklar:

- Data parser
- Normalize edilmiş type yapısı
- Timeline engine
- Interpolation engine
- Unit testler

Çıktı:

- Her frame için her serinin current value’su hesaplanmalı.

---

### Faz 2 — Renderer

Amaç: SVG ile line chart çizmek.

Yapılacaklar:

- X/Y scale
- SVG path generator
- Grid
- Axis
- Line renderer
- Marker renderer
- Label renderer

Çıktı:

- Preview ekranında animasyonlu line chart görünmeli.

---

### Faz 3 — Race Özellikleri

Amaç: Chart’a race hissi kazandırmak.

Yapılacaklar:

- Ranking
- Leader highlight
- Top 3 highlight
- Label takip sistemi
- Dynamic Y-axis
- Overtake detection için temel altyapı

Çıktı:

- Çizgiler birbirini geçtikçe görsel olarak fark edilir hale gelmeli.

---

### Faz 4 — Productization

Amaç: SaaS içindeki kullanıcı deneyimini tamamlamak.

Yapılacaklar:

- UI chart type seçimi
- Theme picker
- Preset picker
- Export ayarları
- Validation mesajları
- Empty state
- Error state
- Loading state

Çıktı:

- Kullanıcı teknik bilgi bilmeden line chart race oluşturabilmeli.

---

### Faz 5 — Video Kalitesi

Amaç: Sosyal medya için kaliteli video üretmek.

Yapılacaklar:

- Vertical preset
- Başlık animasyonu
- Büyük tarih göstergesi
- Source label
- Smooth easing
- Glow/pulse effects
- Leader callout

Çıktı:

- Shorts/Reels/TikTok için kullanılabilir video kalitesi.

---

## 18. Test Planı

Aşağıdaki testler yazılmalı:

### Parser Testleri

- CSV doğru parse ediliyor mu?
- JSON doğru parse ediliyor mu?
- Eksik değerlerde hata veya fallback var mı?
- Sayısal olmayan değerler yakalanıyor mu?

### Timeline Testleri

- Frame 0 doğru başlangıç veriyor mu?
- Son frame doğru bitiş veriyor mu?
- Progress 0-1 arasında mı?

### Interpolation Testleri

- İki nokta arasında doğru değer hesaplanıyor mu?
- Current timestamp veri noktasına eşitse doğru değer dönüyor mu?
- Son tarihten sonra son değer dönüyor mu?
- İlk tarihten önce ilk değer dönüyor mu?

### Renderer Testleri

- Path boş veriyle crash olmuyor mu?
- Tek seri render ediliyor mu?
- Çoklu seri render ediliyor mu?
- Dynamic axis doğru çalışıyor mu?

---

## 19. Hata Yönetimi

Kullanıcıya anlaşılır error mesajları dönülmeli.

Örnekler:

```txt
CSV dosyasında tarih kolonu bulunamadı.
En az 2 zaman noktası gereklidir.
En az 1 veri serisi gereklidir.
"Germany" kolonunda sayısal olmayan değer bulundu.
Dosya formatı desteklenmiyor.
```

---

## 20. Performans Kriterleri

MVP için hedefler:

- 10 seri × 100 veri noktası sorunsuz çalışmalı.
- 20 seri × 200 veri noktası kabul edilebilir performansta çalışmalı.
- Remotion preview donmamalı.
- Gereksiz her-frame data parse yapılmamalı.
- Path hesapları mümkün olduğunca memoize edilmeli.

Önemli:

```txt
Data parsing render sırasında yapılmamalı.
Normalization upload aşamasında yapılmalı.
Frame bazlı hesaplar küçük ve deterministik olmalı.
```

---

## 21. Claude Code İçin Ana Talimat

Aşağıdaki talimat Claude Code’a verilebilir:

```txt
Mevcut SaaS projemde Bar Chart Race özelliği var. Şimdi aynı projeye Line Chart Race özelliği eklemek istiyorum.

Bu line.md dosyasındaki mimariye göre ilerle.

Önceliklerin:
1. Mevcut proje yapısını analiz et.
2. Var olan Bar Chart Race engine, Remotion composition, theme sistemi ve upload flow yapısını bul.
3. Line Chart Race için ayrı ama ortak altyapıyı kullanabilen bir modül oluştur.
4. Önce type tanımlarını ve data parser’ı yaz.
5. Sonra timeline ve interpolation engine’i yaz.
6. Daha sonra SVG renderer componentlerini oluştur.
7. En son Remotion composition ve UI entegrasyonunu yap.
8. Gerekiyorsa mevcut kodu bozmadan küçük refactorlar yap.
9. Her yeni modül için anlaşılır TypeScript tipleri kullan.
10. Kritik fonksiyonlar için test ekle.
11. Build ve lint hatası bırakma.
12. Mevcut Bar Chart Race özelliğini bozma.

İlk MVP’de şu özellikleri tamamla:
- CSV’den line race datası üretme
- Multi-line SVG render
- Smooth interpolation
- Moving labels
- Dynamic Y-axis
- Basic theme support
- Remotion preview
- MP4 export compatibility
- Horizontal ve vertical preset

Kod yazarken küçük, izole ve test edilebilir dosyalar oluştur.
Büyük monolitik component yazma.
```

---

## 22. Claude Code İçin İlk Uygulama Sırası

Claude Code’dan şu sırayla ilerlemesini iste:

```txt
1. Proje dosya yapısını incele.
2. Bar Chart Race ile ilgili mevcut dosyaları bul.
3. Mevcut type, theme, preset ve Remotion composition yapısını analiz et.
4. Line Race için gerekli dosya listesini oluştur.
5. Önce sadece type dosyalarını ekle.
6. Parser ve validation yaz.
7. Timeline engine yaz.
8. Interpolation engine yaz.
9. Scale engine yaz.
10. SVG path generator yaz.
11. LineChartRace componentini oluştur.
12. Label engine ekle.
13. Ranking ve highlight mantığını ekle.
14. Theme ve presetleri ekle.
15. Remotion composition oluştur.
16. UI içinde chart type olarak line-race seçeneğini ekle.
17. Testleri yaz.
18. Build/lint çalıştır.
19. Hataları düzelt.
20. Son olarak kısa bir implementation summary hazırla.
```

---

## 23. Claude Code İçin Kontrol Listesi

Claude Code geliştirmeyi bitirdiğinde aşağıdaki maddeleri kontrol etsin:

```txt
[ ] Bar Chart Race hâlâ çalışıyor.
[ ] Line Chart Race preview çalışıyor.
[ ] CSV upload sonrası line data üretilebiliyor.
[ ] En az 2 seri aynı anda render ediliyor.
[ ] Line’lar frame ilerledikçe çiziliyor.
[ ] Label’lar line ucunu takip ediyor.
[ ] Dynamic Y-axis çalışıyor.
[ ] Theme sistemi çalışıyor.
[ ] Horizontal preset çalışıyor.
[ ] Vertical preset çalışıyor.
[ ] Remotion export hata vermiyor.
[ ] TypeScript hatası yok.
[ ] Lint hatası yok.
[ ] Kritik fonksiyonlar test edildi.
```

---

## 24. Örnek Demo Dataset

Test için kullanılabilecek örnek CSV:

```csv
date,USA,China,Japan,Germany,India
1960,543,59,44,84,37
1961,563,50,53,89,39
1962,605,47,61,95,42
1963,638,50,69,101,48
1964,685,59,81,110,56
1965,742,70,91,119,59
1966,813,76,105,128,45
1967,860,73,124,132,50
1968,942,71,147,142,53
1969,1019,80,173,152,58
1970,1073,92,212,164,62
```

---

## 25. Son Hedef

Bu geliştirme tamamlandığında kullanıcı SaaS içinde Bar Chart Race yanında Line Chart Race de üretebilmeli.

Nihai ürün şuna benzemeli:

```txt
Upload CSV
→ Select Line Chart Race
→ Choose preset
→ Preview animation
→ Customize theme/title
→ Export MP4
```

Bu modül mümkün olduğunca reusable, typed, testable ve Remotion uyumlu olmalıdır.
