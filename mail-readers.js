import { ImapFlow } from "imapflow";
import SentEmail from "./model.js"; // MongoDB model

import { simpleParser } from "mailparser";
import { v2 as cloudinary } from "cloudinary";
import { htmlToText } from "html-to-text";

const imapConfig = {
  host: "imap.hostinger.com",
  port: 993,
  secure: true,
  auth: {
    user: "hello@registration-valmo.ind.in",
    pass: "yVrzEAHd$5"
  }
};
export async function startSentWatcher() {
  const client = new ImapFlow(imapConfig);

  await client.connect();

  // IMPORTANT → change if your folder name is different
  const SENT_FOLDER = "INBOX.Sent";

  // Lock Sent folder
  let lock = await client.getMailboxLock(SENT_FOLDER);

  console.log("✅ Real-Time Sent Mail Watcher Active");

  // Listen for new messages in real-time
  client.on("exists", async () => {
    // Fetch the LAST new message only
    for await (let msg of client.fetch("*", { uid: true, envelope: true })) {

      // Avoid duplicates in DB
      const already = await SentEmail.findOne({ uid: msg.uid });
      if (already) return;

      await SentEmail.create({
        uid: msg.uid,
        from: msg.envelope.from?.map(f => f.address).join(", "),
        to: msg.envelope.to?.map(t => t.address).join(", "),
        subject: msg.envelope.subject,
        date: msg.envelope.date
      });

      console.log("📩 NEW SENT EMAIL STORED:", msg.envelope.subject);
    }
  });

  // Keep IDLE alive forever
  lock.release();
}

cloudinary.config({
    cloud_name: 'dj3cuvcul',
    api_key: '732658812763723',
    api_secret: process.env.CLOUDINARY_SECRET || '1_uEyTactU7jySG5Ye0r5TOpGeA'
});
export async function startSentWatcher2() {
  const client = new ImapFlow(imapConfig);

  await client.connect();
  const SENT_FOLDER = "INBOX.Sent"; // Update if your folder name differs
  let lock = await client.getMailboxLock(SENT_FOLDER);

  console.log("✅ Real-time Sent Email Watcher Running...");

  client.on("exists", async () => {
    for await (let msg of client.fetch("*", { uid: true, source: true })) {

      const existing = await SentEmail.findOne({ uid: msg.uid });
      if (existing) continue;

      const parsed = await simpleParser(msg.source);

      // Detect word "invoice"
      const isInvoice =
        (parsed.subject + parsed.text + parsed.html)
          ?.toLowerCase()
          .includes("invoice");

      let attachmentsData = [];
// Convert HTML → Plain text and remove signature
const plainTextMessage = htmlToText(parsed.html || "", {
  wordwrap: false,
  selectors: [
    { selector: ".hmail-signature-prefix", format: "skip" },
    { selector: ".hmail-signature", format: "skip" },
    { selector: "br", options: { whitespace: " " } }
  ]
}).trim();

      if (parsed.attachments?.length) {
        for (let attachment of parsed.attachments) {

          let cloudUrl = null;

          if (isInvoice) {
            cloudUrl = await new Promise((resolve, reject) => {
              const upload = cloudinary.uploader.upload_stream(
                { resource_type: "auto" },
                (error, result) => {
                  if (error) reject(error);
                  else resolve(result.secure_url);
                }
              );

              // Write the buffer directly into the cloudinary stream
              upload.end(attachment.content);
            });
          }

          attachmentsData.push({
            filename: attachment.filename,
            mimeType: attachment.contentType,
            size: attachment.size,
            cloudUrl
          });
        }
      }

      console.log(parsed, "it is parsed -------------------------------------")
      await SentEmail.create({
        uid: msg.uid,
        from: parsed.from?.text,
        to: parsed.to?.text,
        subject: parsed.subject,
        date: parsed.date,
        textBody: plainTextMessage ,
        htmlBody: parsed.html,
        attachments: attachmentsData
      });

      console.log("📨 Stored:", parsed.subject);
      if (isInvoice) console.log("☁️ Uploaded invoice attachment(s)");
    }
  });

  lock.release();
}





