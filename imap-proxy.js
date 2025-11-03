import express from "express";
import cors from "cors";
import { ImapFlow } from "imapflow";

const app = express();
app.use(cors());

const client = new ImapFlow({
  host: "imap.gmail.com",
  port: 993,
  secure: true,
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS
  }
});

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
    const message = await client.fetchOne("*", { envelope: true, source: true });
    const sender = message.envelope.from[0].address;
    const subject = message.envelope.subject || "";
    const body = message.source.toString();

    res.json({
      sender,
      subject,
      body,
      id: message.uid,
      receivedAt: Date.now()
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch mail" });
  }
});

app.listen(3000, () => console.log("Listening on port 3000"));
