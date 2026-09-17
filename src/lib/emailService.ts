import nodemailer from "nodemailer";

interface EmailAttachment {
  filename: string;
  content: Buffer;
  contentType: string;
}

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  attachments?: EmailAttachment[];
}

/**
 * Creates a Nodemailer transporter. Falls back to a jsonTransport (logging mail content)
 * if standard SMTP environment variables are not configured.
 */
function getTransporter() {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (host && port && user && pass) {
    console.log(`[EmailService] SMTP configurations found. Connecting to host ${host}:${port}...`);
    return nodemailer.createTransport({
      host,
      port: parseInt(port, 10),
      secure: port === "465" || process.env.SMTP_SECURE === "true",
      auth: {
        user,
        pass,
      },
    });
  }

  console.log("[EmailService] SMTP credentials missing. Falling back to local logging JSON transport.");
  return nodemailer.createTransport({
    jsonTransport: true,
  });
}

export async function sendEmail({ to, subject, html, attachments }: SendEmailParams) {
  try {
    const transporter = getTransporter();
    const fromAddress = process.env.SMTP_FROM || '"Travel Company Invoice" <invoice@travelcompany.com>';

    const info = await transporter.sendMail({
      from: fromAddress,
      to,
      subject,
      html,
      attachments,
    });

    console.log(`[EmailService] Email sent successfully! MessageID: ${info.messageId}`);
    
    // If it's a JSON transport, print a visual preview in the logs
    if ((info as any).message) {
      console.log("[EmailService] Local Mail JSON output:", JSON.stringify(info, null, 2));
    }
    
    return info;
  } catch (error) {
    console.error("[EmailService] Error occurred during email dispatch:", error);
    throw error;
  }
}

/**
 * Higher level function to compose and dispatch approved invoice emails to travelers.
 */
export async function sendInvoiceEmail(
  recipientEmail: string,
  userName: string,
  invoiceId: string,
  pdfBuffer: Buffer,
  paymentLink: string
) {
  const subject = `Your Booking Invoice #${invoiceId} is Approved & Ready`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
      <h2 style="color: #0B7C8A;">Booking Approved! ✈️</h2>
      <p>Dear <strong>${userName}</strong>,</p>
      <p>We are excited to inform you that your customized travel itinerary has been reviewed and approved by our travel planners!</p>
      
      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; margin: 20px 0;">
        <h4 style="margin-top: 0; color: #041A16;">Invoice Details</h4>
        <ul style="padding-left: 20px; margin-bottom: 0;">
          <li><strong>Invoice ID:</strong> #${invoiceId}</li>
          <li><strong>Status:</strong> APPROVED / UNPAID</li>
        </ul>
      </div>

      <p>Your itemized PDF invoice is attached to this email. Please review the details of your base package, hotel selections, and transport mode.</p>
      
      <p>To secure your booking, please settle the outstanding balance by clicking the secure payment link below:</p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${paymentLink}" style="background-color: #0B7C8A; color: white; padding: 12px 25px; border-radius: 5px; text-decoration: none; font-weight: bold; display: inline-block;">
          Settle Balance & Pay Now
        </a>
      </div>

      <p style="font-size: 12px; color: #666; margin-top: 40px; border-top: 1px solid #eee; padding-top: 10px;">
        If you have any questions or would like to request adjustments, please reply directly to this email. We're happy to help!
      </p>
    </div>
  `;

  return sendEmail({
    to: recipientEmail,
    subject,
    html,
    attachments: [
      {
        filename: `Invoice-${invoiceId}.pdf`,
        content: pdfBuffer,
        contentType: "application/pdf",
      },
    ],
  });
}
