// Import required modules
const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const NodeCache = require('node-cache'); // For caching responses
const { GoogleGenerativeAI } = require('@google/generative-ai'); // Gemini AI SDK

// Load environment variables from .env file
dotenv.config();

// Initialize Express app
const app = express();

// Middleware for parsing incoming requests with JSON payloads
app.use(express.json());

// Enable CORS to allow requests from other origins
app.use(cors());

// Rate limiter to prevent abuse (allows 100 requests per 15 minutes per IP)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});

// Apply rate limiter to all requests
app.use(limiter);

// Initialize cache for storing responses
const cache = new NodeCache();

// Function to retry the Gemini AI request with backoff
const getGeminiResponse = async (prompt, noCache = false, retries = 5, delay = 3000) => {
  if (!noCache) {
    const cachedReply = cache.get(prompt);
    if (cachedReply) {
      console.log('✅ Returning cached response');
      return cachedReply;
    }
  }

  try {
    // Initialize Gemini AI API
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    // Call the model with the prompt
    const result = await model.generateContent([prompt]);
    const reply = result.response.text();

    if (!noCache) {
      cache.set(prompt, reply, 3600); // Cache for 1 hour
    }
    return reply;
  } catch (error) {
    const status = error.response?.status || 500;
    const errorType = error.response?.data?.error?.type || 'unknown_error';
    const errorMessage = error.response?.data?.error?.message || 'Unknown error occurred';
    throw new Error(`${errorType}: ${errorMessage}`);
  }
};

// MongoDB Connection
const mongoURI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/chatApp';
mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('✅ Connected to MongoDB successfully'))
  .catch((error) => console.error('❌ Error connecting to MongoDB:', error));

// Define a Mongoose schema and model for chat messages
const messageSchema = new mongoose.Schema({
  userMessage: { type: String, required: true },
  botReply: { type: String, required: true },
  summary: { type: String, required: true },
  emailReply: { type: String, required: false }, // New field for the email reply
  createdAt: { type: Date, default: Date.now }
});

const Message = mongoose.model('Message', messageSchema);

//message and bot reply, save to the database
app.post('/api/chat', async (req, res) => {
  try {
    const { userMessage, type } = req.body; 
    const noCache = req.query.nocache === 'true';

    // bot reply
    const botReplyPrompt = `
      You are a helpful AI embedded in a chat app.
      THE TIME NOW IS ${new Date().toLocaleString()}
      User's message: "${userMessage}"
      Respond in a friendly, clear, and concise manner.
      Avoid fluff, directly respond to the user's request or inquiry with precision and clarity.
      Summarize the following message in 6-7 sentences, keeping it clear and concise.
    `;
    const botReply = await getGeminiResponse(botReplyPrompt, noCache);

    // Generate a summary for the userMessage
    const summaryPrompt = `
      Summarize the following message in 4-5 sentences, keeping it clear and concise.
      User's message: "${userMessage}"
    `;
    const summary = await getGeminiResponse(summaryPrompt, noCache);

    let emailReply = null;

    // If 'type=email', generate a formal email response
    if (type === 'email') {
      const emailPrompt = `
        You are an AI email assistant embedded in an email client app. 
        THE TIME NOW IS ${new Date().toLocaleString()}
        User's request: "${userMessage}"
        Compose a formal and professional email reply, keeping it clear, polite, and actionable.
        Do not add fluff like "Here is your email" or "Here is your response".
        Keep the tone professional and helpful.
        Summarize the following message in 6-7 sentences, keeping it clear and concise.
      `;
      emailReply = await getGeminiResponse(emailPrompt, noCache);
    }

    // Save the user message, bot reply, summary, and email reply (if generated) in the database
    const message = new Message({ userMessage, botReply, summary, emailReply });
    await message.save();

    res.status(201).json({ 
      success: true, 
      userMessage, 
      botReply, 
      summary, 
      emailReply 
    });
  } catch (error) {
    console.error('❌ Error generating AI response:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/messages - Get chat messages with pagination and sorting
app.get('/api/messages1', async (req, res) => {
  try {
    const pageNum = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limitNum = Math.max(parseInt(req.query.limit, 10) || 10, 1);

    const totalMessages = await Message.countDocuments();
    const totalPages = Math.ceil(totalMessages / limitNum);

    if (pageNum > totalPages) {
      return res.json({ success: true, totalMessages, currentPage: pageNum, totalPages, messages: [] });
    }

    const messages = await Message.find()
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum);

    res.json({
      success: true,
      totalMessages,
      currentPage: pageNum,
      totalPages,
      messages
    });
  } catch (error) {
    console.error('❌ Error fetching messages:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch chat messages', details: error.message });
  }
});

// Route to handle unknown endpoints
app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Route not found' });
});

// Start the server on port 5000 or from the environment variable PORT
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server is running on http://localhost:${PORT}`));
