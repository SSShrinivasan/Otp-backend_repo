import express from "express";
import bodyParser from "body-parser";
import mongoose from "mongoose";
import otpGenerator from "otp-generator";
import nodemailer from "nodemailer";
import bcrypt from "bcrypt";
import cors from "cors";
import dns from "dns";
dns.setServers(["8.8.8.8", "8.8.4.4"]);


const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
    },
    age: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);



const app = express();
const PORT = 4000;

app.use(bodyParser.json());
app.use(cors());

// ================= DB CONNECTION =================
mongoose.connect(
  "mongodb+srv://311822104041_db_user:AwUDb1gba4jfHAKa@cluster0.clpetmi.mongodb.net/"
);

mongoose.connection
  .once("open", () => console.log("MongoDB connected"))
  .on("error", (err) => console.error(err));
// ================= CREATE USER =================
app.post("/createuser", async (req, res) => {
  try {
    const user = new User(req.body);
    const savedUser = await user.save();
    res.status(201).json(savedUser);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});
// ================= READ USERS =================
app.get("/readuser", async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ================= UPDATE USER =================
app.put("/updateuser/:id", async (req, res) => {
  try {
    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!updatedUser)
      return res.status(404).json({ message: "User not found" });

    res.json(updatedUser);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});
// ================= DELETE USER =================
app.delete("/deluser/:id", async (req, res) => {
  try {
    const deletedUser = await User.findByIdAndDelete(req.params.id);

    if (!deletedUser)
      return res.status(404).json({ message: "User not found" });

    res.json({ message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});



// ================= SERVER =================
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
