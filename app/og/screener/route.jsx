import { ImageResponse } from 'next/og';
import { BRAND_NAME, BRAND_VERSION } from '../../utils/brand';
import { LANDING_SCREENER_EXAMPLE } from '../../utils/landingScreener';
import { polarPoint, smoothClosedPath } from '../../utils/profileRadarGeometry';
import { formatScreenerValue } from '../../utils/screener';
import { loadOgFonts } from '../_shared/fonts';
import { OG_SIZE, ogThemes, ogDate } from '../_shared/theme';

export const runtime = 'nodejs';
export const dynamic = 'force-static';

const light = ogThemes.light;
const dark = ogThemes.dark;
// Static equivalents of the public surfaces; Satori cannot read CSS variables.
const surface = '#22251f';
const accentSoft = '#f5ebcb';

function Profile({ profile }) {
  // This verified example snapshot has all six axes in canonical order.
  const axes = profile.axes;
  const average = axes.reduce((sum, axis) => sum + axis.score, 0) / axes.length;
  const tone = average >= 3.25 ? dark.positive : average < 1.75 ? dark.negative : dark.accent;
  const points = axes.map((axis, index) => polarPoint(index, 53 * (0.14 + (axis.score / 5) * 0.86)));
  return <svg width="70" height="70" viewBox="32 32 126 126" fill="none">
    {[1, 2, 3].map(ring => <circle key={ring} cx="95" cy="95" r={53 * ring / 3} stroke={dark.line} strokeWidth="1.5" />)}
    {axes.map((axis, index) => {
      const endpoint = polarPoint(index, 53);
      return <line key={axis.key} x1="95" y1="95" x2={endpoint.x} y2={endpoint.y} stroke={dark.line} strokeWidth="1.5" />;
    })}
    <path d={smoothClosedPath(points)} fill={tone} fillOpacity="0.38" stroke={tone} strokeWidth="2.2" strokeLinejoin="round" />
  </svg>;
}

function Result({ row }) {
  return <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 14px', borderRadius: 16, background: surface }}>
    <Profile profile={row.profile} />
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
      <span style={{ fontSize: 23, fontWeight: 600, letterSpacing: -0.5 }}>{row.name}</span>
      <span style={{ fontSize: 16, color: dark.secondary }}>{row.sector}</span>
    </div>
    <span style={{ fontSize: 28, fontWeight: 600, letterSpacing: -1 }}>{formatScreenerValue(row.value, 'pct')}</span>
  </div>;
}

function Sliders({ color = dark.accent, size = 20 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 3v7m0 4v7m8-18v3m0 4v11m8-18v11m0 4v3M1 10h6m2-4h6m2 8h6" />
  </svg>;
}

export async function GET() {
  const example = LANDING_SCREENER_EXAMPLE;
  const fonts = await loadOgFonts();
  const date = ogDate(example.capturedAt, { year: 'numeric' });
  return new ImageResponse(
    <div style={{ display: 'flex', position: 'relative', width: '100%', height: '100%', overflow: 'hidden', background: light.canvas, color: light.text, fontFamily: 'Geist' }}>
      <div style={{ display: 'flex', position: 'absolute', left: 60, top: 54, width: 450, alignItems: 'center', gap: 14 }}>
        <div style={{ display: 'flex', width: 10, height: 28, flexShrink: 0, borderRadius: 5, background: light.accent }} />
        <span style={{ fontSize: 32, fontWeight: 600, letterSpacing: -1.2 }}>{BRAND_NAME}</span>
        <span style={{ fontSize: 18, padding: '5px 10px', background: accentSoft, color: light.accent, borderRadius: 8 }}>{BRAND_VERSION}</span>
      </div>
      <div style={{ display: 'flex', position: 'absolute', left: 60, top: 184, width: 510, flexDirection: 'column' }}>
        <div style={{ display: 'flex', flexDirection: 'column', fontSize: 76, fontWeight: 600, lineHeight: 1.04, letterSpacing: -3.8 }}>
          <span>Hitta nästa</span>
          <span>bolag att</span>
          <span style={{ color: light.accent }}>utforska.</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 28, color: light.secondary, fontSize: 24, lineHeight: 1.4 }}>
          <span style={{ display: 'flex', width: '100%' }}>Dina filter. Ditt urval.</span>
          <span style={{ display: 'flex', width: '100%' }}>Bolagsprofiler och nyheter.</span>
        </div>
      </div>
      <div style={{ display: 'flex', position: 'absolute', left: 620, top: 54, width: 530, color: light.secondary, fontSize: 14 }}>
        Produktvy · Helår 2025 · {date}
      </div>
      <div style={{ display: 'flex', position: 'absolute', left: 610, top: 103, width: 540, height: 445, flexDirection: 'column', padding: 24, gap: 18, borderRadius: 28, border: '6px solid #ffffff', background: dark.canvas, color: dark.text, boxShadow: '0 18px 60px rgba(37, 38, 32, 0.15)', transform: 'rotate(-4deg)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 28, fontWeight: 600, letterSpacing: -0.8 }}>Aktiescreener</span>
          <Sliders color={dark.secondary} size={24} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 10, background: dark.inset, color: dark.text, fontSize: 16 }}>
            <Sliders size={16} />{example.filter.label}
          </div>
          <span style={{ fontSize: 14, color: dark.secondary }}>Exempel</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {example.items.map(row => <Result key={row.symbol} row={row} />)}
        </div>
      </div>
      <div style={{ display: 'flex', position: 'absolute', left: 585, top: 518, width: 555, alignItems: 'center', gap: 18, padding: '18px 24px', background: '#ffffff', borderRadius: 20, boxShadow: '0 12px 40px rgba(37, 38, 32, 0.12)', transform: 'rotate(-2deg)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 50, height: 50, flexShrink: 0, borderRadius: 14, background: accentSoft }}>
          <Sliders color={light.accent} size={27} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <span style={{ fontSize: 24, fontWeight: 600, letterSpacing: -0.5 }}>Från urval till insikt.</span>
          <span style={{ fontSize: 17, color: light.secondary }}>Jämför bolagen. Läs nyheterna bakom.</span>
        </div>
      </div>
      <span style={{ display: 'flex', position: 'absolute', left: 60, bottom: 40, width: 490, fontSize: 20, color: light.secondary }}>omxsum.com/aktier/screener</span>
    </div>,
    { ...OG_SIZE, fonts, headers: { 'Cache-Control': 'public, max-age=86400, s-maxage=86400' } },
  );
}
