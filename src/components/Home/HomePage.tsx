interface Template {
  id: string;
  title: string;
  description: string;
  available: boolean;
  preview: React.ReactNode;
}

const BarChartRacePreview = () => (
  <svg viewBox="0 0 280 160" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
    <rect width="280" height="160" fill="#171F2F" rx="8"/>
    {/* Title */}
    <text x="16" y="22" fill="#fff" fontSize="9" fontWeight="700" fontFamily="Inter,sans-serif">Top Countries · 2023</text>
    {/* Bar 1 */}
    <rect x="16" y="34" width="170" height="18" rx="4" fill="#6c63ff"/>
    <text x="192" y="47" fill="#fff" fontSize="8" fontFamily="Inter,sans-serif">1.4B</text>
    <text x="10" y="47" fill="#fff" fontSize="8" fontWeight="700" fontFamily="Inter,sans-serif" textAnchor="end">China</text>
    {/* Bar 2 */}
    <rect x="16" y="58" width="155" height="18" rx="4" fill="#f7971e"/>
    <text x="176" y="71" fill="#fff" fontSize="8" fontFamily="Inter,sans-serif">1.4B</text>
    <text x="10" y="71" fill="#fff" fontSize="8" fontWeight="700" fontFamily="Inter,sans-serif" textAnchor="end">India</text>
    {/* Bar 3 */}
    <rect x="16" y="82" width="90" height="18" rx="4" fill="#43e97b"/>
    <text x="112" y="95" fill="#fff" fontSize="8" fontFamily="Inter,sans-serif">335M</text>
    <text x="10" y="95" fill="#fff" fontSize="8" fontWeight="700" fontFamily="Inter,sans-serif" textAnchor="end">USA</text>
    {/* Bar 4 */}
    <rect x="16" y="106" width="60" height="18" rx="4" fill="#f64f59"/>
    <text x="82" y="119" fill="#fff" fontSize="8" fontFamily="Inter,sans-serif">228M</text>
    <text x="10" y="119" fill="#fff" fontSize="8" fontWeight="700" fontFamily="Inter,sans-serif" textAnchor="end">Brazil</text>
    {/* Bar 5 */}
    <rect x="16" y="130" width="48" height="18" rx="4" fill="#38b2f8"/>
    <text x="70" y="143" fill="#fff" fontSize="8" fontFamily="Inter,sans-serif">183M</text>
    <text x="10" y="143" fill="#fff" fontSize="8" fontWeight="700" fontFamily="Inter,sans-serif" textAnchor="end">Pak.</text>
    {/* Year watermark */}
    <text x="264" y="150" fill="#fff" fontSize="22" fontWeight="900" fontFamily="Inter,sans-serif" textAnchor="end" opacity="0.18">2023</text>
    {/* Play icon overlay */}
    <circle cx="248" cy="30" r="12" fill="rgba(108,99,255,0.25)" stroke="#6c63ff" strokeWidth="1.5"/>
    <polygon points="244,25 244,35 255,30" fill="#6c63ff"/>
  </svg>
);

const LineRacePreview = () => (
  <svg viewBox="0 0 280 160" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
    <rect width="280" height="160" fill="#1a1f2e" rx="8"/>
    <text x="16" y="22" fill="#fff" fontSize="9" fontWeight="700" fontFamily="Inter,sans-serif">Line Chart Race</text>
    {/* Grid lines */}
    {[40, 65, 90, 115, 140].map(y => (
      <line key={y} x1="30" y1={y} x2="265" y2={y} stroke="#ffffff" strokeOpacity="0.07" strokeWidth="1"/>
    ))}
    {/* Lines */}
    <polyline points="30,120 75,100 120,85 165,60 210,40 255,30" stroke="#6c63ff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    <polyline points="30,130 75,118 120,105 165,95 210,75 255,60" stroke="#f7971e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    <polyline points="30,135 75,128 120,120 165,115 210,108 255,100" stroke="#43e97b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    {/* Dots at end */}
    <circle cx="255" cy="30" r="4" fill="#6c63ff"/>
    <circle cx="255" cy="60" r="4" fill="#f7971e"/>
    <circle cx="255" cy="100" r="4" fill="#43e97b"/>
    <text x="261" y="33" fill="#6c63ff" fontSize="7" fontFamily="Inter,sans-serif">A</text>
    <text x="261" y="63" fill="#f7971e" fontSize="7" fontFamily="Inter,sans-serif">B</text>
    <text x="261" y="103" fill="#43e97b" fontSize="7" fontFamily="Inter,sans-serif">C</text>
    <text x="264" y="150" fill="#fff" fontSize="22" fontWeight="900" fontFamily="Inter,sans-serif" textAnchor="end" opacity="0.12">2023</text>
  </svg>
);

const PieRacePreview = () => (
  <svg viewBox="0 0 280 160" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
    <rect width="280" height="160" fill="#1a1f2e" rx="8"/>
    <text x="16" y="22" fill="#fff" fontSize="9" fontWeight="700" fontFamily="Inter,sans-serif">Pie Chart Race</text>
    {/* Pie slices (simplified) */}
    <path d="M140 90 L140 40 A50 50 0 0 1 183 115 Z" fill="#6c63ff"/>
    <path d="M140 90 L183 115 A50 50 0 0 1 97 115 Z" fill="#f7971e"/>
    <path d="M140 90 L97 115 A50 50 0 0 1 140 40 Z" fill="#43e97b"/>
    <circle cx="140" cy="90" r="22" fill="#1a1f2e"/>
    {/* Legend */}
    <rect x="200" y="60" width="8" height="8" rx="2" fill="#6c63ff"/>
    <text x="212" y="68" fill="#aaa" fontSize="8" fontFamily="Inter,sans-serif">Group A</text>
    <rect x="200" y="74" width="8" height="8" rx="2" fill="#f7971e"/>
    <text x="212" y="82" fill="#aaa" fontSize="8" fontFamily="Inter,sans-serif">Group B</text>
    <rect x="200" y="88" width="8" height="8" rx="2" fill="#43e97b"/>
    <text x="212" y="96" fill="#aaa" fontSize="8" fontFamily="Inter,sans-serif">Group C</text>
  </svg>
);

const BubbleRacePreview = () => (
  <svg viewBox="0 0 280 160" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
    <rect width="280" height="160" fill="#1a1f2e" rx="8"/>
    <text x="16" y="22" fill="#fff" fontSize="9" fontWeight="700" fontFamily="Inter,sans-serif">Bubble Chart Race</text>
    {/* Grid */}
    <line x1="30" y1="30" x2="30" y2="145" stroke="#ffffff" strokeOpacity="0.1" strokeWidth="1"/>
    <line x1="30" y1="145" x2="265" y2="145" stroke="#ffffff" strokeOpacity="0.1" strokeWidth="1"/>
    {/* Bubbles */}
    <circle cx="80" cy="110" r="28" fill="#6c63ff" opacity="0.7"/>
    <circle cx="150" cy="80" r="20" fill="#f7971e" opacity="0.7"/>
    <circle cx="200" cy="100" r="16" fill="#43e97b" opacity="0.7"/>
    <circle cx="230" cy="60" r="12" fill="#f64f59" opacity="0.7"/>
    <circle cx="110" cy="55" r="10" fill="#38b2f8" opacity="0.7"/>
    <text x="80" y="113" fill="#fff" fontSize="7" fontWeight="700" fontFamily="Inter,sans-serif" textAnchor="middle">China</text>
    <text x="150" y="83" fill="#fff" fontSize="7" fontWeight="700" fontFamily="Inter,sans-serif" textAnchor="middle">India</text>
    <text x="200" y="103" fill="#fff" fontSize="7" fontWeight="700" fontFamily="Inter,sans-serif" textAnchor="middle">USA</text>
  </svg>
);

const TEMPLATES: Template[] = [
  {
    id: 'bar-chart-race',
    title: 'Bar Chart Race',
    description: 'Zaman içinde değişen sıralamayı yarışan çubuklarla göster.',
    available: true,
    preview: <BarChartRacePreview />,
  },
  {
    id: 'line-chart-race',
    title: 'Line Chart Race',
    description: 'Çizgi grafikleriyle trend yarışlarını animasyonlu göster.',
    available: false,
    preview: <LineRacePreview />,
  },
  {
    id: 'pie-chart-race',
    title: 'Pie Chart Race',
    description: 'Pasta dilimlerinin zaman içindeki değişimini canlandır.',
    available: false,
    preview: <PieRacePreview />,
  },
  {
    id: 'bubble-chart-race',
    title: 'Bubble Chart Race',
    description: 'Kabarcık büyüklükleriyle çok boyutlu veriyi animasyonlu sun.',
    available: false,
    preview: <BubbleRacePreview />,
  },
];

interface HomePageProps {
  onSelect: (templateId: string) => void;
}

export function HomePage({ onSelect }: HomePageProps) {
  return (
    <div className="home-page">
      <header className="home-header">
        <div className="home-brand">
          <div className="home-brand-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
              <rect x="2" y="14" width="4" height="8" rx="1"/>
              <rect x="8" y="9" width="4" height="13" rx="1"/>
              <rect x="14" y="4" width="4" height="18" rx="1"/>
              <rect x="20" y="1" width="4" height="21" rx="1"/>
            </svg>
          </div>
          <div>
            <h1 className="home-brand-title">Chart Race Studio</h1>
            <span className="home-brand-sub">Animasyonlu grafik oluşturma platformu</span>
          </div>
        </div>
      </header>

      <main className="home-main">
        <div className="home-hero">
          <h2 className="home-hero-title">Grafik türünü seç</h2>
          <p className="home-hero-sub">Verinle hayat ver — bir şablon seçerek başla</p>
        </div>

        <div className="home-grid">
          {TEMPLATES.map(tpl => (
            <div
              key={tpl.id}
              className={`home-card ${tpl.available ? 'home-card-active' : 'home-card-soon'}`}
              onClick={() => tpl.available && onSelect(tpl.id)}
            >
              <div className="home-card-preview">
                {tpl.preview}
                {!tpl.available && (
                  <div className="home-card-soon-overlay">
                    <span>Yakında</span>
                  </div>
                )}
              </div>
              <div className="home-card-info">
                <div className="home-card-title-row">
                  <span className="home-card-title">{tpl.title}</span>
                  {tpl.available
                    ? <span className="home-card-badge home-card-badge-ready">Hazır</span>
                    : <span className="home-card-badge home-card-badge-soon">Yakında</span>
                  }
                </div>
                <p className="home-card-desc">{tpl.description}</p>
                {tpl.available && (
                  <button className="home-card-btn">
                    Oluşturmaya Başla
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M5 12h14M12 5l7 7-7 7"/>
                    </svg>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
