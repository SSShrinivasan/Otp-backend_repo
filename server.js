import express from "express";
import bodyParser from "body-parser";
import mongoose from "mongoose";
import otpGenerator from "otp-generator";
import nodemailer from "nodemailer";
import bcrypt from "bcrypt";
import cors from "cors";
import dns from "dns";
import dotenv from "dotenv";

dotenv.config(); // Load variables from .env

dns.setServers(["8.8.8.8", "8.8.4.4"]);

const app = express();



app.use(bodyParser.json());
app.use(cors());

// ================= DB CONNECTION =================
mongoose.connect(
   "mongodb+srv://testuser:Test12345@cluster-1.xf8z9f9.mongodb.net/?appName=Cluster-1"
);

mongoose.connection
  .once("open", () => console.log("MongoDB connected"))
  .on("error", (err) => console.error(err));

// ================= OTP SCHEMA =================
const otpSchema = new mongoose.Schema({
  email: { type: String, required: true },
  otpHash: { type: String, required: true },
  createdAt: { type: Date, default: Date.now, expires: 300 },
});

const OTP = mongoose.model("OTP", otpSchema);

// ================= MAIL SETUP =================
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER, // Uses the variable from .env
    pass: process.env.EMAIL_PASS, // Uses the variable from .env
  },
});
app.post("/generate-otp", async (req, res) => {
  const { email } = req.body;
  console.log("Request received! Body is:", req.body);
  
    await transporter.verify(); 
    console.log("Email transporter verified");
  if (!email) return res.status(400).send("Email required");

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
      from: "shrinivasan564@gmail.com",
      to: email,
      subject: "OTP Verification",
      text: `Your OTP is ${otp}. It expires in 5 minutes.`,
    });

    res.status(200).send("OTP sent successfully");
  } catch (err) {
    console.error("OTP ERROR:", err);
    res.status(500).send("Failed to send OTP");
  }

});


// ================= VERIFY OTP =================
app.post("/verify-otp", async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) return res.status(400).send("Missing fields");

  try {
    const record = await OTP.findOne({ email });
    if (!record) return res.status(400).send("OTP expired or invalid");

    const isValid = await bcrypt.compare(otp, record.otpHash);
    if (!isValid) return res.status(400).send("Invalid OTP");

    await OTP.deleteOne({ email });

    res.status(200).send("OTP verified successfully");
  } catch (err) {
    console.error(err);
    res.status(500).send("Verification failed");
  }
});

// ================= SERVER =================
const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

