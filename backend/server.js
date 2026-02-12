import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/liquidpass";
const FRONTEND_URL =
  process.env.FRONTEND_URL || "http://localhost:5173";

// --- Global middlewares ---

// Security headers
app.use(helmet());

// Basic rate limiting (protects auth & API from abuse)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per window
});
app.use(limiter);

// CORS – locked down to known frontend origin
app.use(
  cors({
    origin: FRONTEND_URL,
    credentials: true,
  })
);

app.use(express.json());

// --- MongoDB / Mongoose Setup ---

mongoose
  .connect(MONGODB_URI, {
    dbName: "liquidpass",
  })
  .then(() => {
    console.log("Connected to MongoDB");
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err.message);
  });

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, trim: true },
    // Stored as bcrypt hash
    password: { type: String, required: true },
  },
  { timestamps: true }
);

userSchema.set("toJSON", {
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    delete ret.password; // never expose password
    return ret;
  },
});

const passwordSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    site: { type: String, required: true },
    username: { type: String, required: true },
    password: { type: String, required: true },
  },
  { timestamps: true }
);

passwordSchema.set("toJSON", {
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

const User = mongoose.model("User", userSchema);
const PasswordItem = mongoose.model("PasswordItem", passwordSchema);

// --- Routes ---

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.post("/api/auth/signup", async (req, res) => {
  const { username, password } = req.body || {};

  if (!username || !password) {
    return res
      .status(400)
      .json({ message: "Username and password are required" });
  }

  try {
    const existing = await User.findOne({ username });
    if (existing) {
      return res.status(400).json({ message: "Username already taken" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({ username, password: hashedPassword });
    const userJson = user.toJSON();

    return res.status(201).json({ user: userJson, items: [] });
  } catch (err) {
    console.error("Signup error:", err);
    return res.status(500).json({ message: "Server error during signup" });
  }
});

app.post("/api/auth/login", async (req, res) => {
  const { username, password } = req.body || {};

  if (!username || !password) {
    return res
      .status(400)
      .json({ message: "Username and password are required" });
  }

  try {
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Backwards compatible password check:
    // - If password looks like a bcrypt hash, use bcrypt.compare
    // - Otherwise treat it as legacy plain text, then upgrade to bcrypt on successful login
    let isMatch = false;

    const stored = user.password || "";
    const looksHashed =
      stored.startsWith("$2a$") ||
      stored.startsWith("$2b$") ||
      stored.startsWith("$2y$");

    if (looksHashed) {
      isMatch = await bcrypt.compare(password, stored);
    } else {
      // Legacy: plain text stored
      if (password === stored) {
        isMatch = true;
        const newHash = await bcrypt.hash(password, 10);
        user.password = newHash;
        await user.save();
      }
    }

    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const items = await PasswordItem.find({ userId: user._id }).sort({
      createdAt: -1,
    });

    const userJson = user.toJSON();
    const itemsJson = items.map((i) => i.toJSON());

    return res.json({ user: userJson, items: itemsJson });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ message: "Server error during login" });
  }
});

app.post("/api/passwords", async (req, res) => {
  const { userId, site, username, password } = req.body || {};

  if (!userId || !site || !username || !password) {
    return res.status(400).json({ message: "All fields are required" });
  }

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const item = await PasswordItem.create({
      userId,
      site,
      username,
      password,
    });

    return res.status(201).json({ item: item.toJSON() });
  } catch (err) {
    console.error("Create password error:", err);
    return res
      .status(500)
      .json({ message: "Server error while saving password" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

