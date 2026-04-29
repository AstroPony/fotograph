import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Fotograph — AI productfotografie voor Bol.com & webshops";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Cached per worker lifecycle — paid once on first render, free thereafter
let _fontData: ArrayBuffer | null = null;

async function getPlayfairBlack(): Promise<ArrayBuffer> {
  if (_fontData) return _fontData;
  const css = await fetch(
    "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@900&display=block",
    { headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" } }
  ).then((r) => r.text());
  const url = css.match(/url\(([^)]+)\)/)?.[1];
  if (!url) throw new Error("Playfair Display font URL not found");
  const data = await fetch(url).then((r) => r.arrayBuffer());
  _fontData = data;
  return data;
}

const headlines = [
  { text: "PROFESSIONELE",  color: "#ffffff" },
  { text: "PRODUCTFOTO’S", color: "#ffffff" },
  { text: "IN SECONDEN.",   color: "rgba(255,255,255,0.25)" },
] as const;

const headlineStyle = {
  display: "flex",
  fontSize: 104,
  fontWeight: 900,
  lineHeight: 0.92,
  letterSpacing: "-0.02em",
  textTransform: "uppercase",
} as const;

export default async function Image() {
  const playfairBlack = await getPlayfairBlack();

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#000000",
          padding: "72px 80px",
          fontFamily: "'Playfair Display'",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 16,
            fontFamily: "sans-serif",
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.4)",
            marginBottom: 36,
            fontWeight: 500,
          }}
        >
          AI PRODUCTFOTOGRAFIE · BOL.COM &amp; WEBSHOPS
        </div>

        <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center" }}>
          {headlines.map(({ text, color }) => (
            <div key={text} style={{ ...headlineStyle, color }}>
              {text}
            </div>
          ))}
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            paddingTop: 40,
            borderTop: "1px solid rgba(255,255,255,0.15)",
          }}
        >
          <div
            style={{
              display: "flex",
              gap: 32,
              fontSize: 15,
              fontFamily: "sans-serif",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.5)",
              fontWeight: 500,
            }}
          >
            <span>✓ Achtergrond verwijderen</span>
            <span>✓ Bol.com-compliant</span>
            <span>✓ Gratis beginnen</span>
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 18,
              fontWeight: 900,
              color: "rgba(255,255,255,0.6)",
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              fontFamily: "'Playfair Display'",
            }}
          >
            FOTOGRAPH.NL
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [{ name: "Playfair Display", data: playfairBlack, style: "normal", weight: 900 }],
    }
  );
}
