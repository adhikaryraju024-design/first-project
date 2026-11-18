const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Serve static frontend files
app.use(express.static(path.join(__dirname)));

// Helper: build Nodemailer transporter for Gmail
function createGmailTransporter(user, pass) {
  // Clean password (remove spaces if user pasted "abcd efgh ijkl mnop")
  const cleanedPass = (pass || '').replace(/\s+/g, '');
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true, // SSL
    auth: {
      user: (user || '').trim(),
      pass: cleanedPass,
    },
    // Useful timeout options
    connectionTimeout: 10000,
    greetingTimeout: 10000,
  });
}

// Helper: generate HTML email with Header / Inline Image
function buildEmailHtml({ greeting, notice, body, closing, hasInlineImage }) {
  const formattedBody = (body || '')
    .split('\n')
    .filter(p => p.trim())
    .map(p => `<p style="margin: 0 0 12px 0; font-size: 15px; line-height: 1.6; color: #374151;">${p}</p>`)
    .join('');

  const formattedClosing = (closing || 'Regards,\nAdministration')
    .split('\n')
    .map(line => `<div style="font-weight: 600; color: #111827;">${line}</div>`)
    .join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Notification</title>
</head>
<body style="margin: 0; padding: 20px 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1f2937;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f3f4f6;">
    <tr>
      <td align="center" style="padding: 10px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); border: 1px solid #e5e7eb;">
          
          <!-- Top Accent Bar -->
          <tr>
            <td height="6" style="background: linear-gradient(90deg, #10b981 0%, #059669 100%);"></td>
          </tr>

          <!-- Email Content Body -->
          <tr>
            <td style="padding: 28px 24px;">
              ${greeting ? `<h2 style="margin: 0 0 12px 0; font-size: 18px; font-weight: 700; color: #111827;">${greeting}</h2>` : ''}
              ${notice ? `<p style="margin: 0 0 18px 0; font-size: 15px; color: #4b5563; font-weight: 500;">${notice}</p>` : ''}

              <!-- Inline Header Image Banner -->
              ${hasInlineImage ? `
              <div style="margin: 18px 0 22px 0; text-align: center;">
                <img src="cid:campaign-header-img" alt="Notice Header Image" style="max-width: 100%; height: auto; border-radius: 8px; border: 1px solid #e5e7eb; display: block; margin: 0 auto;" />
              </div>
              ` : ''}

              <!-- Main Body Text -->
              <div style="margin: 18px 0;">
                ${formattedBody}
              </div>

              <!-- Sign-off / Signature -->
              <div style="margin-top: 28px; padding-top: 18px; border-top: 1px solid #f3f4f6;">
                ${formattedClosing}
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 14px 24px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                This is an official automated email notification. Please do not reply directly to this message.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '1.0.0'
  });
});

// Verify SMTP connection
app.post('/api/verify-smtp', async (req, res) => {
  const { user, pass } = req.body;
  if (!user || !pass) {
    return res.status(400).json({ success: false, message: 'Gmail address and App Password are required' });
  }

  try {
    const transporter = createGmailTransporter(user, pass);
    await transporter.verify();
    return res.json({ success: true, message: 'Gmail SMTP connection verified successfully!' });
  } catch (error) {
    console.error('SMTP verify error:', error);
    let advice = 'Check your Gmail address and 16-character App Password.';
    if (error.code === 'EAUTH') {
      advice = 'Authentication failed. Please ensure 2-Step Verification is ON in your Google Account and you generated an App Password (not your standard login password).';
    }
    return res.status(401).json({
      success: false,
      message: error.message || 'SMTP Authentication failed',
      advice
    });
  }
});

// Send single test email
app.post('/api/send-test', async (req, res) => {
  const { smtp, recipient, subject, greeting, notice, body, closing, imageBase64, imageType } = req.body;

  if (!smtp || !smtp.user || !smtp.pass) {
    return res.status(400).json({ success: false, message: 'SMTP credentials missing' });
  }
  if (!recipient) {
    return res.status(400).json({ success: false, message: 'Recipient email is required for test' });
  }

  try {
    const transporter = createGmailTransporter(smtp.user, smtp.pass);
    const hasInlineImage = Boolean(imageBase64);

    const attachments = [];
    if (hasInlineImage) {
      // Decode base64
      const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
      attachments.push({
        filename: 'header-banner.png',
        content: Buffer.from(base64Data, 'base64'),
        cid: 'campaign-header-img',
        contentType: imageType || 'image/png'
      });
    }

    const htmlContent = buildEmailHtml({
      greeting: greeting || 'Dear Candidate,',
      notice: notice || 'Please read the following notice carefully.',
      body: body || 'This is a test email from Mail Manager dashboard.',
      closing: closing || 'Regards,\nAdministration',
      hasInlineImage
    });

    const senderDisplay = smtp.senderName
      ? `"${smtp.senderName}" <${smtp.user}>`
      : smtp.user;

    const info = await transporter.sendMail({
      from: senderDisplay,
      to: recipient,
      subject: `[TEST] ${subject || 'Notification'}`,
      html: htmlContent,
      attachments
    });

    return res.json({ success: true, messageId: info.messageId, message: 'Test email sent successfully!' });
  } catch (error) {
    console.error('Test email send error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// Streamed bulk campaign send via Server-Sent Events (SSE)
app.post('/api/send-campaign', async (req, res) => {
  const { smtp, recipients, subject, greeting, notice, body, closing, imageBase64, imageType, delayMs = 1500 } = req.body;

  if (!smtp || !smtp.user || !smtp.pass) {
    return res.status(400).json({ success: false, message: 'SMTP credentials missing' });
  }

  if (!Array.isArray(recipients) || recipients.length === 0) {
    return res.status(400).json({ success: false, message: 'No recipients provided' });
  }

  // Set up SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  });

  const sendEvent = (event, data) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  let transporter;
  try {
    transporter = createGmailTransporter(smtp.user, smtp.pass);
    await transporter.verify();
    sendEvent('start', { total: recipients.length, message: 'SMTP verified, starting campaign...' });
  } catch (err) {
    sendEvent('error', { message: `SMTP Verification failed: ${err.message}` });
    return res.end();
  }

  const hasInlineImage = Boolean(imageBase64);
  const attachments = [];
  if (hasInlineImage) {
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    attachments.push({
      filename: 'header-banner.png',
      content: Buffer.from(base64Data, 'base64'),
      cid: 'campaign-header-img',
      contentType: imageType || 'image/png'
    });
  }

  const htmlContent = buildEmailHtml({
    greeting: greeting || 'Dear Candidate,',
    notice: notice || 'Please read the following notice carefully.',
    body: body || '',
    closing: closing || 'Regards,\nAdministration',
    hasInlineImage
  });

  const senderDisplay = smtp.senderName
    ? `"${smtp.senderName}" <${smtp.user}>`
    : smtp.user;

  let sentCount = 0;
  let failedCount = 0;
  const safeDelay = Math.max(800, Number(delayMs) || 1500);

  for (let i = 0; i < recipients.length; i++) {
    const recipientEmail = recipients[i].trim();
    if (!recipientEmail) continue;

    try {
      await transporter.sendMail({
        from: senderDisplay,
        to: recipientEmail,
        subject: subject || 'Notice',
        html: htmlContent,
        attachments
      });

      sentCount++;
      sendEvent('progress', {
        index: i + 1,
        total: recipients.length,
        email: recipientEmail,
        status: 'delivered',
        sentCount,
        failedCount,
        timestamp: new Date().toLocaleTimeString()
      });
    } catch (sendErr) {
      failedCount++;
      sendEvent('progress', {
        index: i + 1,
        total: recipients.length,
        email: recipientEmail,
        status: 'failed',
        error: sendErr.message,
        sentCount,
        failedCount,
        timestamp: new Date().toLocaleTimeString()
      });
    }

    // Delay between emails to prevent Gmail rate-limit / spam blocks
    if (i < recipients.length - 1) {
      await new Promise(resolve => setTimeout(resolve, safeDelay));
    }
  }

  sendEvent('complete', {
    total: recipients.length,
    sentCount,
    failedCount,
    message: `Campaign completed! ${sentCount} sent successfully, ${failedCount} failed.`
  });

  res.end();
});

// Fallback to index.html for SPA routing
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`===============================================`);
  console.log(` Mail Manager Server is running on port ${PORT}`);
  console.log(` Local URL: http://localhost:${PORT}`);
  console.log(`===============================================`);
});
