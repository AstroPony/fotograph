import { Resend } from "resend";

export const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendUsageAlert(used: number, limit: number) {
  const pct = Math.round((used / limit) * 100);
  const adminEmail = (process.env.ADMIN_EMAILS ?? "").split(",")[0].trim();
  if (!adminEmail) return;

  await resend.emails.send({
    from: "Fotograph <noreply@fotograph.nl>",
    to: adminEmail,
    subject: `⚠ Fotograph: ${pct}% van Photoroom-limiet gebruikt (${used}/${limit})`,
    html: `
<!DOCTYPE html>
<html lang="nl">
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#fff;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:#000;">
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td>
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;padding:40px 24px;">
    <tr><td>
      <p style="font-size:10px;letter-spacing:0.15em;text-transform:uppercase;color:#999;margin:0 0 6px;">Fotograph — Gebruiksmelding</p>
      <h1 style="font-family:Georgia,'Times New Roman',serif;font-size:36px;font-weight:900;text-transform:uppercase;letter-spacing:-0.02em;margin:0;line-height:1;">Limietmelding</h1>
      <div style="border-top:4px solid #000;margin:16px 0 28px;"></div>
      <p style="font-size:14px;line-height:1.7;margin:0 0 16px;">
        Je hebt deze maand <strong>${used} van de ${limit} Photoroom-credits</strong> gebruikt (<strong>${pct}%</strong>).
      </p>
      <div style="background:#000;color:#fff;padding:20px 24px;margin:0 0 24px;">
        <p style="font-family:Georgia,'Times New Roman',serif;font-size:28px;font-weight:900;margin:0;letter-spacing:-0.01em;">${used} / ${limit}</p>
        <p style="font-size:11px;letter-spacing:0.12em;text-transform:uppercase;margin:8px 0 0;opacity:0.6;">${pct}% gebruikt — ${limit - used} resterend</p>
      </div>
      <p style="font-size:13px;color:#666;line-height:1.6;margin:0;">
        ${pct >= 95 ? "⚠️ Kritiek: je zit bijna op de limiet. Overweeg je Photoroom-plan te upgraden." :
          pct >= 85 ? "Let op: je nadert de limiet snel." :
          "Ter info: je hebt 70% van je maandlimiet bereikt."}
      </p>
      <div style="border-top:1px solid #000;margin:40px 0 24px;"></div>
      <p style="font-size:11px;color:#999;letter-spacing:0.08em;text-transform:uppercase;margin:0;">Fotograph · Automatische melding</p>
    </td></tr>
  </table>
  </td></tr></table>
</body>
</html>`,
  });
}

export async function sendWelcomeEmail(email: string) {
  await resend.emails.send({
    from: "Fotograph <noreply@fotograph.nl>",
    to: email,
    subject: "Welkom bij Fotograph — je eerste 10 credits staan klaar",
    html: `
<!DOCTYPE html>
<html lang="nl">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#fff;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:#000;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;padding:40px 24px;">
    <tr><td>
      <p style="font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#888;margin:0 0 8px;">Fotograph</p>
      <h1 style="font-size:36px;font-weight:900;text-transform:uppercase;letter-spacing:-0.02em;margin:0 0 24px;line-height:1;">Welkom.</h1>
      <hr style="border:none;border-top:3px solid #000;margin:0 0 24px;">
      <p style="font-size:14px;line-height:1.6;margin:0 0 16px;">
        Je account is aangemaakt en je <strong>10 gratis credits</strong> staan klaar.
        Elke credit geeft je één professionele productfoto — achtergrond verwijderd, scène gegenereerd.
      </p>
      <p style="font-size:14px;line-height:1.6;margin:0 0 32px;">
        Upload je eerste productfoto en kies een scène. Klaar in minder dan een minuut.
      </p>
      <a href="https://fotograph.nl/upload" style="display:inline-block;background:#000;color:#fff;text-decoration:none;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;padding:12px 24px;font-weight:600;">
        Eerste foto maken
      </a>
      <hr style="border:none;border-top:1px solid #000;margin:40px 0 24px;">
      <p style="font-size:11px;color:#888;letter-spacing:0.08em;text-transform:uppercase;margin:0;">
        Fotograph · AI productfotografie voor Bol.com &amp; webshops
      </p>
    </td></tr>
  </table>
</body>
</html>`,
  });
}
