import express from "express";
import bodyParser from "body-parser";
import mongoose from "mongoose";
import otpGenerator from "otp-generator";
import nodemailer from "nodemailer";
import bcrypt from "bcrypt";
import cors from "cors";

const app = express();

const PORT = 4000;

app.use(bodyParser.json());
app.use(cors());
import dns from "dns";
dns.setServers(["8.8.8.8", "8.8.4.4"]);

// ================= DB CONNECTION =================
mongoose.connect(
  "mongodb+srv://testuser:Test12345@cluster-1.xf8z9f9.mongodb.net/test"
);

mongoose.connection
  .once("open", () => console.log("MongoDB Atlas connected"))
  .on("error", (err) => console.error(err));

// ================= OTP SCHEMA =================
const otpSchema = new mongoose.Schema({
  email: { type: String, required: true },
  otpHash: { type: String, required: true },
  createdAt: { type: Date, default: Date.now, expires: 300 }, // 5 min
});

const OTP = mongoose.model("OTP", otpSchema);

// ================= MAIL SETUP =================
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "yourmail@gmail.com",
    pass: "your-app-password",
  },
});

// ================= GENERATE OTP =================
app.post("/generate-otp", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).send("Email required");

  const otp = otpGenerator.generate(6, {
    digits: true,
    alphabets: false,
    upperCase: false,
    specialChars: false,
  });

  try {
    const otpHash = await bcrypt.hash(otp, 10);

    // remove old OTP
    await OTP.deleteMany({ email });

    await OTP.create({ email, otpHash });

    await transporter.sendMail({
      from: "yourmail@gmail.com",
      to: email,
      subject: "OTP Verification",
      text: `Your OTP is ${otp}. It expires in 5 minutes.`,
    });

    res.status(200).send("OTP sent successfully");
  } catch (err) {
    console.error(err);
    res.status(500).send("Failed to send OTP");
  }
});
console.log("EMAIL_USER =",email );

// ================= VERIFY OTP =================
app.post("/verify-otp", async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) return res.status(400).send("Missing fields");

  try {
    const record = await OTP.findOne({ email });
    if (!record) return res.status(400).send("OTP expired or invalid");

    const isValid = await bcrypt.compare(otp, record.otpHash);
    if (!isValid) return res.status(400).send("Invalid OTP");

    // prevent reuse
    await OTP.deleteOne({ email });

    res.status(200).send("OTP verified successfully");
  } catch (err) {
    console.error(err);
    res.status(500).send("Verification failed");
  }
});

// ================= SERVER =================
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
