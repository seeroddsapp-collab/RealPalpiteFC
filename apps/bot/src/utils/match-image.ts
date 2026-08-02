import sharp from 'sharp';
import path from 'path';
import fs from 'fs';

// Paleta da marca RealPalpiteFC (usada no fallback SVG e no overlay de nomes)
const BRAND = {
  bgDark:  '#0A0C14',
  bgLight: '#161A28',
  gold:    '#C9A227',
  goldDim: '#8B6F1A',
  white:   '#FFFFFF',
} as const;

// ── Templates ────────────────────────────────────────────────────────────────
const TEMPLATE_PATH      = path.join(__dirname, '../assets/vs-template.png');
const CHAMP_TEMPLATE_PATH = path.join(__dirname, '../assets/campeonato-template.png');

// Posições dos escudos como fração do tamanho do template (fácil de ajustar)
const HOME_CX   = 0.22;   // centro horizontal do escudo casa (22% da largura)
const AWAY_CX   = 0.78;   // centro horizontal do escudo visitante (78%)
const LOGO_CY   = 0.48;   // centro vertical (48% da altura)
const LOGO_FRAC = 0.19;   // tamanho do logo = 19% da largura do template

// Largura final enviada ao Telegram (mantém proporção do template)
const OUTPUT_WIDTH = 900;

async function fetchBuffer(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`fetch logo HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

async function resizeLogoTo(url: string, size: number): Promise<Buffer> {
  const raw = await fetchBuffer(url);
  return sharp(raw)
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
}

// SVG overlay só com os nomes dos times (renderizado no tamanho OUTPUT_WIDTH×H)
function buildNamesOverlay(
  outW: number, outH: number,
  homeCx: number, awayCx: number, nameCy: number,
  homeTeam: string, awayTeam: string,
): Buffer {
  const abbrev = (n: string) => n.length > 14 ? n.slice(0, 13).trimEnd() + '.' : n;
  const fs = Math.round(outW * 0.020); // font-size ≈ 2% da largura
  const home = abbrev(homeTeam);
  const away = abbrev(awayTeam);

  const svg = `<svg width="${outW}" height="${outH}" xmlns="http://www.w3.org/2000/svg">
  <text x="${Math.round(homeCx)}" y="${Math.round(nameCy)}"
        font-size="${fs}" font-weight="700" fill="${BRAND.gold}" opacity="0.9"
        text-anchor="middle" font-family="Arial, sans-serif">${home}</text>
  <text x="${Math.round(awayCx)}" y="${Math.round(nameCy)}"
        font-size="${fs}" font-weight="700" fill="${BRAND.gold}" opacity="0.9"
        text-anchor="middle" font-family="Arial, sans-serif">${away}</text>
</svg>`;
  return Buffer.from(svg);
}

async function generateVsFromTemplate(
  homeLogoUrl: string,
  awayLogoUrl: string,
  homeTeam: string,
  awayTeam: string,
): Promise<Buffer> {
  const templateBuf = fs.readFileSync(TEMPLATE_PATH);
  const meta = await sharp(templateBuf).metadata();
  const tW = meta.width!;
  const tH = meta.height!;

  const logoSize = Math.round(tW * LOGO_FRAC);

  const [homeBuf, awayBuf] = await Promise.all([
    resizeLogoTo(homeLogoUrl, logoSize),
    resizeLogoTo(awayLogoUrl, logoSize),
  ]);

  // Posições absolutas no espaço do template
  const homeLeft = Math.round(tW * HOME_CX - logoSize / 2);
  const awayLeft = Math.round(tW * AWAY_CX - logoSize / 2);
  const logoTop  = Math.round(tH * LOGO_CY  - logoSize / 2);

  // Composição no tamanho do template
  const composed = await sharp(templateBuf)
    .composite([
      { input: homeBuf, top: logoTop, left: homeLeft },
      { input: awayBuf, top: logoTop, left: awayLeft },
    ])
    .png()
    .toBuffer();

  // Redimensiona para OUTPUT_WIDTH preservando proporção
  const outH = Math.round(tH * OUTPUT_WIDTH / tW);
  const resized = await sharp(composed)
    .resize(OUTPUT_WIDTH, outH)
    .png()
    .toBuffer();

  // Overlay de nomes no espaço redimensionado
  const scaleFactor = OUTPUT_WIDTH / tW;
  const nameCy = Math.round((LOGO_CY * tH + logoSize / 2 + tH * 0.06) * scaleFactor);
  const namesOverlay = buildNamesOverlay(
    OUTPUT_WIDTH, outH,
    Math.round(tW * HOME_CX * scaleFactor),
    Math.round(tW * AWAY_CX * scaleFactor),
    nameCy,
    homeTeam,
    awayTeam,
  );

  return sharp(resized)
    .composite([{ input: namesOverlay, top: 0, left: 0 }])
    .png()
    .toBuffer();
}

// ── Fallback SVG (usado quando o template não existe) ────────────────────────
const FB_W = 500, FB_H = 200, FB_LOGO = 150;
const FB_LOGO_Y  = (FB_H - FB_LOGO) / 2;
const FB_LOGO_LX = 24;
const FB_LOGO_RX = FB_W - FB_LOGO - 24;

function buildFallbackSvg(homeTeam: string, awayTeam: string): Buffer {
  const abbrev = (n: string) => n.length > 12 ? n.slice(0, 11).trimEnd() + '.' : n;
  const cx = FB_W / 2;
  const svg = `<svg width="${FB_W}" height="${FB_H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%"   stop-color="${BRAND.bgDark}"/>
      <stop offset="100%" stop-color="${BRAND.bgLight}"/>
    </linearGradient>
    <linearGradient id="divGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%"   stop-color="${BRAND.gold}" stop-opacity="0"/>
      <stop offset="50%"  stop-color="${BRAND.gold}" stop-opacity="0.9"/>
      <stop offset="100%" stop-color="${BRAND.gold}" stop-opacity="0"/>
    </linearGradient>
    <radialGradient id="vsGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%"   stop-color="${BRAND.gold}" stop-opacity="0.15"/>
      <stop offset="100%" stop-color="${BRAND.gold}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${FB_W}" height="${FB_H}" fill="url(#bg)"/>
  <rect x="1" y="1" width="${FB_W - 2}" height="${FB_H - 2}"
        fill="none" stroke="${BRAND.gold}" stroke-width="1" opacity="0.35"/>
  <ellipse cx="${cx}" cy="${FB_H / 2}" rx="60" ry="60" fill="url(#vsGlow)"/>
  <line x1="${cx}" y1="18" x2="${cx}" y2="${FB_H - 18}"
        stroke="url(#divGrad)" stroke-width="1"/>
  <text x="${cx}" y="${FB_H / 2 - 4}"
        font-size="30" font-weight="900" fill="${BRAND.gold}"
        text-anchor="middle" font-family="Arial Black, Arial, sans-serif"
        letter-spacing="4">VS</text>
  <text x="${FB_LOGO_LX + FB_LOGO / 2}" y="${FB_H - 10}"
        font-size="13" fill="${BRAND.gold}" opacity="0.8"
        text-anchor="middle" font-family="Arial, sans-serif"
        font-weight="bold">${abbrev(homeTeam)}</text>
  <text x="${FB_LOGO_RX + FB_LOGO / 2}" y="${FB_H - 10}"
        font-size="13" fill="${BRAND.gold}" opacity="0.8"
        text-anchor="middle" font-family="Arial, sans-serif"
        font-weight="bold">${abbrev(awayTeam)}</text>
</svg>`;
  return Buffer.from(svg);
}

// ── Imagem do campeonato ─────────────────────────────────────────────────────
const CHAMP_WIDTH  = 500;
const CHAMP_HEIGHT = 220;
const CHAMP_LOGO   = 160;

function buildChampionshipSvg(champName: string): Buffer {
  const abbrev = (n: string) => n.length > 28 ? n.slice(0, 27).trimEnd() + '.' : n;
  const svg = `<svg width="${CHAMP_WIDTH}" height="${CHAMP_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%"   stop-color="${BRAND.bgDark}"/>
      <stop offset="100%" stop-color="${BRAND.bgLight}"/>
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="45%" r="40%">
      <stop offset="0%"   stop-color="${BRAND.gold}" stop-opacity="0.12"/>
      <stop offset="100%" stop-color="${BRAND.gold}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="line" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%"   stop-color="${BRAND.gold}" stop-opacity="0"/>
      <stop offset="50%"  stop-color="${BRAND.gold}" stop-opacity="0.7"/>
      <stop offset="100%" stop-color="${BRAND.gold}" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <rect width="${CHAMP_WIDTH}" height="${CHAMP_HEIGHT}" fill="url(#bg)"/>
  <rect x="1" y="1" width="${CHAMP_WIDTH - 2}" height="${CHAMP_HEIGHT - 2}"
        fill="none" stroke="${BRAND.gold}" stroke-width="1" opacity="0.35"/>
  <ellipse cx="${CHAMP_WIDTH / 2}" cy="${CHAMP_HEIGHT / 2 - 12}" rx="100" ry="90"
           fill="url(#glow)"/>
  <line x1="60" y1="${CHAMP_HEIGHT - 46}" x2="${CHAMP_WIDTH - 60}" y2="${CHAMP_HEIGHT - 46}"
        stroke="url(#line)" stroke-width="1"/>
  <text x="${CHAMP_WIDTH / 2}" y="${CHAMP_HEIGHT - 18}"
        font-size="15" font-weight="700" fill="${BRAND.gold}" opacity="0.9"
        text-anchor="middle" font-family="Arial, sans-serif"
        letter-spacing="1">${abbrev(champName).toUpperCase()}</text>
</svg>`;
  return Buffer.from(svg);
}

// Posições do logo do campeonato como fração do template
const CHAMP_LOGO_CX   = 0.50;  // centro horizontal (50%)
const CHAMP_LOGO_CY   = 0.47;  // centro vertical (47% — levemente acima do meio)
const CHAMP_LOGO_FRAC = 0.22;  // tamanho = 22% da largura do template

export async function generateChampionshipImage(
  logoUrl: string,
  champName = '',
): Promise<Buffer> {
  const raw = await fetchBuffer(logoUrl);

  if (fs.existsSync(CHAMP_TEMPLATE_PATH)) {
    const templateBuf = fs.readFileSync(CHAMP_TEMPLATE_PATH);
    const meta = await sharp(templateBuf).metadata();
    const tW = meta.width!;
    const tH = meta.height!;

    const logoSize = Math.round(tW * CHAMP_LOGO_FRAC);
    const logoBuf  = await sharp(raw)
      .resize(logoSize, logoSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();

    const logoLeft = Math.round(tW * CHAMP_LOGO_CX - logoSize / 2);
    const logoTop  = Math.round(tH * CHAMP_LOGO_CY - logoSize / 2);

    const composed = await sharp(templateBuf)
      .composite([{ input: logoBuf, top: logoTop, left: logoLeft }])
      .png()
      .toBuffer();

    // Redimensiona para OUTPUT_WIDTH e adiciona nome do campeonato
    const outH = Math.round(tH * OUTPUT_WIDTH / tW);
    const resized = await sharp(composed).resize(OUTPUT_WIDTH, outH).png().toBuffer();

    const scaleFactor = OUTPUT_WIDTH / tW;
    const nameCy = Math.round((CHAMP_LOGO_CY * tH + logoSize / 2 + tH * 0.07) * scaleFactor);
    const abbrev   = (n: string) => n.length > 28 ? n.slice(0, 27).trimEnd() + '.' : n;
    const fontSize = Math.round(OUTPUT_WIDTH * 0.022);
    const nameOverlay = Buffer.from(
      `<svg width="${OUTPUT_WIDTH}" height="${outH}" xmlns="http://www.w3.org/2000/svg">
        <text x="${OUTPUT_WIDTH / 2}" y="${nameCy}"
              font-size="${fontSize}" font-weight="700" fill="${BRAND.gold}" opacity="0.9"
              text-anchor="middle" font-family="Arial, sans-serif"
              letter-spacing="2">${abbrev(champName).toUpperCase()}</text>
      </svg>`,
    );

    return sharp(resized)
      .composite([{ input: nameOverlay, top: 0, left: 0 }])
      .png()
      .toBuffer();
  }

  // Fallback SVG
  const logoBuf  = await sharp(raw)
    .resize(CHAMP_LOGO, CHAMP_LOGO, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  const logoLeft = Math.round((CHAMP_WIDTH - CHAMP_LOGO) / 2);
  const logoTop  = Math.round((CHAMP_HEIGHT - CHAMP_LOGO) / 2) - 16;

  return sharp({
    create: { width: CHAMP_WIDTH, height: CHAMP_HEIGHT, channels: 4,
              background: { r: 10, g: 12, b: 20, alpha: 255 } },
  })
    .composite([
      { input: buildChampionshipSvg(champName), top: 0,       left: 0       },
      { input: logoBuf,                         top: logoTop, left: logoLeft },
    ])
    .png()
    .toBuffer();
}

// ── Ponto de entrada principal ───────────────────────────────────────────────
export async function generateVsImage(
  homeLogoUrl: string,
  awayLogoUrl: string,
  homeTeam = '',
  awayTeam = '',
): Promise<Buffer> {
  if (fs.existsSync(TEMPLATE_PATH)) {
    return generateVsFromTemplate(homeLogoUrl, awayLogoUrl, homeTeam, awayTeam);
  }

  // Fallback: fundo SVG gerado
  const [homeBuf, awayBuf] = await Promise.all([
    resizeLogoTo(homeLogoUrl, FB_LOGO),
    resizeLogoTo(awayLogoUrl, FB_LOGO),
  ]);
  return sharp({
    create: { width: FB_W, height: FB_H, channels: 4,
              background: { r: 10, g: 12, b: 20, alpha: 255 } },
  })
    .composite([
      { input: buildFallbackSvg(homeTeam, awayTeam), top: 0,         left: 0        },
      { input: homeBuf,                              top: FB_LOGO_Y, left: FB_LOGO_LX },
      { input: awayBuf,                              top: FB_LOGO_Y, left: FB_LOGO_RX },
    ])
    .png()
    .toBuffer();
}
