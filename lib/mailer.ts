import "server-only";
import nodemailer from "nodemailer";

let transporter: nodemailer.Transporter | undefined;

function getTransporter(): nodemailer.Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });
  }
  return transporter;
}

export async function sendShiftEmail(
  to: string,
  subject: string,
  text: string,
): Promise<void> {
  await getTransporter().sendMail({
    from: process.env.GMAIL_USER,
    to,
    subject,
    text,
  });
}
