import { Resend } from 'resend';

const resendApiKey = process.env.RESEND_API_KEY!;
const appUrl = process.env.NEXT_PUBLIC_APP_URL!;

export const resend = new Resend(resendApiKey);

export interface MonitorTriggerEmailData {
  to: string;
  monitorName: string;
  monitorId: string;
  url: string;
  condition: string;
  timestamp: string;
  before?: string;
  after?: string;
}

export async function sendMonitorTriggerEmail(data: MonitorTriggerEmailData) {
  const { to, monitorName, monitorId, url, condition, timestamp, before, after } = data;

  await resend.emails.send({
    from: 'PingMe <notifications@pingme.app>',
    to,
    subject: `[PingMe] Change detected: ${monitorName}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .monitor-name { font-size: 24px; font-weight: bold; margin-bottom: 20px; }
            .field { margin-bottom: 15px; }
            .label { font-weight: bold; color: #666; }
            .value { margin-top: 5px; }
            .diff { background: white; padding: 15px; border-left: 4px solid #667eea; margin: 15px 0; }
            .diff-label { font-size: 12px; color: #666; text-transform: uppercase; letter-spacing: 1px; }
            .diff-content { margin-top: 10px; font-family: monospace; font-size: 14px; word-break: break-word; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
            .button { display: inline-block; background: #667eea; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔔 Change Detected</h1>
            </div>
            <div class="content">
              <div class="monitor-name">${monitorName}</div>
              
              <div class="field">
                <div class="label">URL</div>
                <div class="value"><a href="${url}">${url}</a></div>
              </div>
              
              <div class="field">
                <div class="label">Condition Triggered</div>
                <div class="value">${condition}</div>
              </div>
              
              <div class="field">
                <div class="label">Detected At</div>
                <div class="value">${timestamp}</div>
              </div>
              
              ${before || after ? `
                ${before ? `
                  <div class="diff">
                    <div class="diff-label">Before</div>
                    <div class="diff-content">${before}</div>
                  </div>
                ` : ''}
                ${after ? `
                  <div class="diff">
                    <div class="diff-label">After</div>
                    <div class="diff-content">${after}</div>
                  </div>
                ` : ''}
              ` : ''}
              
              <div style="text-align: center;">
                <a href="${appUrl}/app/monitors/${monitorId}" class="button">View Details</a>
              </div>
              
              <div class="footer">
                <p>You're receiving this because you subscribed to PingMe alerts.</p>
                <p>Too many alerts? <a href="${appUrl}/app/monitors/${monitorId}">Adjust your settings</a>.</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `,
  });
}
