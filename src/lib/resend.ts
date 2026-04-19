import { Resend } from "resend";

export const resend = new Resend(process.env.RESEND_API_KEY);

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
