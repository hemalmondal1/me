import express from "express";
import cors from "cors";
import { ImapFlow } from "imapflow";

const app = express();
app.use(cors());

// Use environment variables for security
const EMAIL = process.env.GMAIL_USER;
const PASS = process.env.GMAIL_PASS;

if (!EMAIL || !PASS) {
  console.error("Error: Set GMAIL_USER and GMAIL_PASS environment variables");
  process.exit(1);
}

const client = new ImapFlow({
  host: "imap.gmail.com",
  port: 993,
  secure: true,
  auth: {
    user: EMAIL,
    pass: PASS,
  },
});

// Track last message UID to prevent duplicates
let lastUID = null;

// Connect to IMAP server once
let connected = false;
async function connectIMAP() {
  if (!connected) {
    await client.connect();
    connected = true;
    console.log("Connected to Gmail IMAP");
  }
}

app.get("/latest", async (req, res) => {
  try {
    await connectIMAP();
    await client.mailboxOpen("INBOX");

    // Fetch latest message
    const lock = await client.getMailboxLock("INBOX");
    try {
      const message = await client.fetchOne("*", { envelope: true, source: true });

      if (!message) return res.json({ message: "No messages found" });

      // Prevent returning the same message again
      if (message.uid === lastUID) {
        return res.json({ message: "No new message" });
      }
      lastUID = message.uid;

      const sender = message.envelope.from[0].address;
      const subject = message.envelope.subject || "";
      const body = message.source.toString();

      res.json({
        sender,
        subject,
        body,
        id: message.uid,
        receivedAt: Date.now(),
      });
    } finally {
      lock.release();
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch mail", details: err.message });
  }
});

// Render sets PORT environment variable
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`IMAP Proxy running on port ${PORT}`));
