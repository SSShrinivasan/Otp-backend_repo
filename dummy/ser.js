import express from "express";
import mongoose from "mongoose";
import otpGenerator from "otp-generator";
import nodemailer from "nodemailer";
import bcrypt from "bcrypt";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// ================= MIDDLEWARE =================
app.use(express.json());
app.use(
  cors({
    origin: "http://localhost:3000",
  })
);

// ================= DB CONNECTION =================
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB error:", err));

// ================= OTP SCHEMA =================
const otpSchema = new mongoose.Schema({
  email: { type: String, required: true },
  otpHash: { type: String, required: true },
  createdAt: { type: Date, default: Date.now, expires: 300 }, // 5 mins
});

const OTP = mongoose.model("OTP", otpSchema);

// ================= MAIL SETUP =================
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// ================= GENERATE OTP =================
app.post("/generate-otp", async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).send("Email required");
  }

  const otp = otpGenerator.generate(6, {
    digits: true,
    alphabets: false,
    upperCase: false,
    specialChars: false,
  });

  try {
    const otpHash = await bcrypt.hash(otp, 10);

    await OTP.deleteMany({ email });
    await OTP.create({ email, otpHash });

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "OTP Verification",
      text: `Your OTP is ${otp}. It expires in 5 minutes.`,
    });

    res.status(200).send("OTP sent successfully");
  } catch (err) {
    console.error("Generate OTP error:", err);
    res.status(500).send("Failed to send OTP");
  }
});

// ================= VERIFY OTP =================
app.post("/verify-otp", async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).send("Missing fields");
  }

  try {
    const record = await OTP.findOne({ email });

    if (!record) {
      return res.status(400).send("OTP expired or invalid");
    }

    const isValid = await bcrypt.compare(otp, record.otpHash);

    if (!isValid) {
      return res.status(400).send("Invalid OTP");
    }

    await OTP.deleteOne({ email });

    res.status(200).send("OTP verified successfully");
  } catch (err) {
    console.error("Verify OTP error:", err);
    res.status(500).send("Verification failed");
  }
});

// ================= SERVER =================
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
