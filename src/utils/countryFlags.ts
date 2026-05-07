const NAME_TO_CODE: Record<string, string> = {
  // A
  afghanistan: 'af', albania: 'al', algeria: 'dz', andorra: 'ad', angola: 'ao',
  argentina: 'ar', armenia: 'am', australia: 'au', austria: 'at', azerbaijan: 'az',
  // B
  bahrain: 'bh', bangladesh: 'bd', belarus: 'by', belgium: 'be', belize: 'bz',
  benin: 'bj', bhutan: 'bt', bolivia: 'bo', 'bosnia': 'ba', 'bosnia and herzegovina': 'ba',
  botswana: 'bw', brazil: 'br', brasil: 'br', brunei: 'bn', bulgaria: 'bg',
  'burkina faso': 'bf', burundi: 'bi',
  // C
  cambodia: 'kh', cameroon: 'cm', canada: 'ca', 'cape verde': 'cv', chad: 'td',
  chile: 'cl', china: 'cn', colombia: 'co', comoros: 'km', congo: 'cg',
  'costa rica': 'cr', croatia: 'hr', cuba: 'cu', cyprus: 'cy', czechia: 'cz',
  'czech republic': 'cz',
  // D
  denmark: 'dk', djibouti: 'dj', 'dominican republic': 'do',
  // E
  ecuador: 'ec', egypt: 'eg', 'el salvador': 'sv', eritrea: 'er', estonia: 'ee',
  ethiopia: 'et',
  // F
  fiji: 'fj', finland: 'fi', france: 'fr',
  // G
  gabon: 'ga', gambia: 'gm', georgia: 'ge', germany: 'de', ghana: 'gh',
  greece: 'gr', guatemala: 'gt', guinea: 'gn', 'guinea-bissau': 'gw', guyana: 'gy',
  // H
  haiti: 'ht', honduras: 'hn', 'hong kong': 'hk', hungary: 'hu',
  // I
  iceland: 'is', india: 'in', indonesia: 'id', iran: 'ir', iraq: 'iq',
  ireland: 'ie', israel: 'il', italy: 'it', 'ivory coast': 'ci', "côte d'ivoire": 'ci',
  // J
  jamaica: 'jm', japan: 'jp', jordan: 'jo',
  // K
  kazakhstan: 'kz', kenya: 'ke', kosovo: 'xk', kuwait: 'kw', kyrgyzstan: 'kg',
  // L
  laos: 'la', latvia: 'lv', lebanon: 'lb', lesotho: 'ls', liberia: 'lr',
  libya: 'ly', liechtenstein: 'li', lithuania: 'lt', luxembourg: 'lu',
  // M
  madagascar: 'mg', malawi: 'mw', malaysia: 'my', maldives: 'mv', mali: 'ml',
  malta: 'mt', mauritius: 'mu', mexico: 'mx', moldova: 'md', monaco: 'mc',
  mongolia: 'mn', montenegro: 'me', morocco: 'ma', mozambique: 'mz', myanmar: 'mm',
  burma: 'mm',
  // N
  namibia: 'na', nepal: 'np', netherlands: 'nl', holland: 'nl', 'new zealand': 'nz',
  nicaragua: 'ni', niger: 'ne', nigeria: 'ng', 'north korea': 'kp', 'north macedonia': 'mk',
  norway: 'no',
  // O
  oman: 'om',
  // P
  pakistan: 'pk', palestine: 'ps', panama: 'pa', 'papua new guinea': 'pg',
  paraguay: 'py', peru: 'pe', philippines: 'ph', poland: 'pl', portugal: 'pt',
  // Q
  qatar: 'qa',
  // R
  romania: 'ro', russia: 'ru', rwanda: 'rw',
  // S
  'saudi arabia': 'sa', senegal: 'sn', serbia: 'rs', singapore: 'sg',
  slovakia: 'sk', slovenia: 'si', somalia: 'so', 'south africa': 'za',
  'south korea': 'kr', korea: 'kr', 'south sudan': 'ss', spain: 'es',
  'sri lanka': 'lk', sudan: 'sd', suriname: 'sr', sweden: 'se', switzerland: 'ch',
  syria: 'sy',
  // T
  taiwan: 'tw', tajikistan: 'tj', tanzania: 'tz', thailand: 'th', togo: 'tg',
  'trinidad and tobago': 'tt', tunisia: 'tn', turkey: 'tr', türkiye: 'tr',
  turkmenistan: 'tm',
  // U
  uganda: 'ug', ukraine: 'ua', 'united arab emirates': 'ae', uae: 'ae',
  'united kingdom': 'gb', uk: 'gb', 'great britain': 'gb', britain: 'gb',
  england: 'gb', 'united states': 'us', usa: 'us', 'united states of america': 'us',
  america: 'us', uruguay: 'uy', uzbekistan: 'uz',
  // V
  venezuela: 've', vietnam: 'vn', 'viet nam': 'vn',
  // Y
  yemen: 'ye',
  // Z
  zambia: 'zm', zimbabwe: 'zw',
};

export function getCountryFlagUrl(entityName: string): string | null {
  const key = entityName.toLowerCase().trim();
  const code = NAME_TO_CODE[key];
  if (!code) return null;
  return `https://flagcdn.com/w80/${code}.png`;
}

export function hasCountryFlag(entityName: string): boolean {
  return entityName.toLowerCase().trim() in NAME_TO_CODE;
}
