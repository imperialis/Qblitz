const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const multer = require('multer');
const Tesseract = require('tesseract.js');
const axios = require('axios');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  throw new Error("Missing GEMINI_API_KEY in environment variables.");
}

// Enhanced security and configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3001',
  credentials: true
}));
app.use(bodyParser.json());

// Improved file upload configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (!allowedTypes.includes(file.mimetype)) {
      cb(new Error('Invalid file type'));
      return;
    }
    cb(null, true);
  }
});

// Database setup with better error handling
class Database {
  constructor() {
    this.db = new sqlite3.Database('math_learning.db', (err) => {
      if (err) {
        console.error('Database connection error:', err.message);
        process.exit(1);
      }
      console.log('Connected to SQLite database');
      this.initializeTables();
    });
  }

  async initializeTables() {
    const tables = [
      `CREATE TABLE IF NOT EXISTS questions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        topic TEXT NOT NULL,
        question TEXT NOT NULL,
        answer TEXT,
        difficulty INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS user_progress (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        question_id INTEGER,
        correct BOOLEAN,
        attempt_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (question_id) REFERENCES questions(id)
      )`
    ];

    for (const table of tables) {
      await this.run(table);
    }
  }

  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve(this);
      });
    });
  }

  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }
}

const database = new Database();

// Enhanced error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'An error occurred',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Improved route handlers
app.post('/upload', upload.single('image'), async (req, res) => {
  try {
    let questionText = req.body.question;
    
    if (req.file) {
      const { data: { text } } = await Tesseract.recognize(
        req.file.path,
        'eng',
        { logger: m => console.log(m) }
      );
      questionText = text.trim();
      
      // Clean up uploaded file
      fs.unlink(req.file.path, err => {
        if (err) console.error('Error deleting file:', err);
      });
    }

    if (!questionText || !req.body.topic) {
      return res.status(400).json({ error: 'Question text and topic are required' });
    }

    const result = await database.run(
      `INSERT INTO questions (topic, question) VALUES (?, ?)`,
      [req.body.topic, questionText]
    );

    res.json({
      id: result.lastID,
      message: 'Question uploaded successfully'
    });
  } catch (error) {
    next(error);
  }
});

// app.post('/generate-quiz', async (req, res, next) => {
//   try {
//     const { topic, numQuestions = 5, source = 'database', difficulty } = req.body;

//     if (!topic) {
//       return res.status(400).json({ error: 'Topic is required' });
//     }

//     if (source === 'database') {
//       let query = `SELECT * FROM questions WHERE topic = ?`;
//       const params = [topic];

//       if (difficulty) {
//         query += ` AND difficulty = ?`;
//         params.push(difficulty);
//       }

//       query += ` ORDER BY RANDOM() LIMIT ?`;
//       params.push(numQuestions);

//       const questions = await database.all(query, params);
//       return res.json(questions);
//     }

//     if (!GEMINI_API_KEY) {
//       return res.status(500).json({ error: 'API key not configured' });
//     }

    
      
//       const response = await axios.post(
//         `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
//         {
//           contents: [
//             {
//               role: "user",
//               parts: [
//                 {
//                   text: `Generate ${numQuestions} math questions on ${topic} with answers. 
//                   Difficulty level: ${difficulty || 'medium'}.
//                   Format the response as a JSON array with {question, answer} objects.`
//                 }
//               ]
//             }
//           ]
//         },
//         {
//           headers: {
//             "Content-Type": "application/json"
//           }
//         }
//       );
      
//       // Log the entire response to see its structure
//       console.log("Gemini API Response:", JSON.stringify(response.data, null, 2));
      
//       // Extract questions from response correctly
//       const rawText = response.data.candidates?.[0]?.content?.parts?.[0]?.text;
//       let questions = [];
      
//       try {
//         questions = JSON.parse(rawText); // Convert JSON string to array
//         if (!Array.isArray(questions)) throw new Error("Response is not an array");
//       } catch (error) {
//         console.error("Error parsing questions:", error.message);
//         return res.status(500).json({ error: "Invalid response format from Gemini API" });
//       }
//       res.json({
//         rawResponse: response.data, // Full Gemini API response
//         parsedQuestions: questions.length > 0 ? questions : null, // Parsed questions if available
//         rawText: rawText // The raw generated text
//       });
      
//       // Proceed only if questions is an array
//       res.json(questions);
      
    
//     //const questions = response.data.questions;
    
//     // Store generated questions in database
//     for (const q of questions) {
//       await database.run(
//         `INSERT INTO questions (topic, question, answer, difficulty) VALUES (?, ?, ?, ?)`,
//         [topic, q.question, q.answer, difficulty || 1]
//       );
//     }

//     res.json(questions);
//   } catch (error) {
//     next(error);
//   }
// });

app.post('/generate-quiz', async (req, res, next) => {
  try {
    // Input validation
    const { topic, numQuestions = 5, source = 'database', difficulty } = req.body;
    if (!topic) {
      return res.status(400).json({ error: 'Topic is required' });
    }

    const questions = await (source === 'database' 
      ? getQuestionsFromDatabase(topic, numQuestions, difficulty)
      : generateQuestionsFromGemini(topic, numQuestions, difficulty));

    res.json(questions);

  } catch (error) {
    console.error("Quiz generation error:", error);
    const status = error.statusCode || 500;
    res.status(status).json({
      error: error.message,
      details: error.details || null
    });
  }
});

// Database query helper
async function getQuestionsFromDatabase(topic, numQuestions, difficulty) {
  try {
    let query = `SELECT * FROM questions WHERE topic = ?`;
    const params = [topic];
    
    if (difficulty) {
      query += ` AND difficulty = ?`;
      params.push(difficulty);
    }
    
    query += ` ORDER BY RANDOM() LIMIT ?`;
    params.push(numQuestions);
    
    return await database.all(query, params);
  } catch (error) {
    throw new CustomError('Database query failed', 500, error);
  }
}

// Gemini API helper
async function generateQuestionsFromGemini(topic, numQuestions, difficulty) {
  try {
    if (!GEMINI_API_KEY) {
      throw new CustomError('API key not configured', 500);
    }

    const response = await callGeminiAPI(topic, numQuestions, difficulty);
    const questions = parseAndCleanGeminiResponse(response);
    await storeQuestionsInDatabase(questions, topic, difficulty);
    
    return questions;
  } catch (error) {
    if (error instanceof CustomError) throw error;
    throw new CustomError('Failed to generate questions', 500, error);
  }
}

// Gemini API call
async function callGeminiAPI(topic, numQuestions, difficulty) {
  try {
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `Generate ${numQuestions} math questions on ${topic} with answers. 
                Difficulty level: ${difficulty || 'medium'}.
                Return response in this exact JSON format, with no explanations in parentheses:
                [{"question": "question text", "answer": "final answer only"}]`
              }
            ]
          }
        ]
      },
      {
        headers: {
          "Content-Type": "application/json"
        }
      }
    );

    console.log("Gemini API Response:", JSON.stringify(response.data, null, 2));
    return response;
  } catch (error) {
    throw new CustomError('Gemini API call failed', 500, error);
  }
}

// Response parsing and cleaning
function parseAndCleanGeminiResponse(response) {
  try {
    let rawText = response.data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    // Clean the response
    const cleanText = rawText
      .replace(/```json\n/g, '')
      .replace(/```/g, '')
      .replace(/\n/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    const questions = JSON.parse(cleanText);
    
    if (!Array.isArray(questions)) {
      throw new Error("Response is not an array");
    }

    // Clean and validate each question
    const cleanedQuestions = questions.map(q => {
      if (!q.question || !q.answer) {
        throw new Error("Missing question or answer field");
      }

      return {
        question: q.question.trim(),
        answer: q.answer.split(/[\(\n]/)[0].trim()
      };
    });

    if (cleanedQuestions.length === 0) {
      throw new Error("No valid questions in response");
    }

    return cleanedQuestions;
  } catch (error) {
    throw new CustomError(
      'Failed to parse Gemini response',
      500,
      error,
      { rawText: response.data.candidates?.[0]?.content?.parts?.[0]?.text }
    );
  }
}

// Database storage
async function storeQuestionsInDatabase(questions, topic, difficulty) {
  try {
    const insertPromises = questions.map(q => 
      database.run(
        `INSERT INTO questions (topic, question, answer, difficulty) VALUES (?, ?, ?, ?)`,
        [topic, q.question, q.answer, difficulty || 'medium']
      )
    );

    await Promise.all(insertPromises);
  } catch (error) {
    throw new CustomError('Failed to store questions in database', 500, error);
  }
}

// Custom error class for better error handling
class CustomError extends Error {
  constructor(message, statusCode = 500, originalError = null, details = null) {
    super(message);
    this.name = 'CustomError';
    this.statusCode = statusCode;
    this.originalError = originalError;
    this.details = details;
  }
}
   


  


app.post('/analyze', async (req, res, next) => {
  try {
    const { wrongQuestions } = req.body;

    if (!Array.isArray(wrongQuestions)) {
      return res.status(400).json({ error: 'Wrong questions must be an array' });
    }

    const analysis = {
      totalQuestions: wrongQuestions.length,
      topicBreakdown: {},
      recommendedTopics: []
    };

    // Record wrong answers and analyze patterns
    for (const q of wrongQuestions) {
      await database.run(
        `INSERT INTO user_progress (question_id, correct) VALUES (?, false)`,
        [q.id]
      );

      analysis.topicBreakdown[q.topic] = (analysis.topicBreakdown[q.topic] || 0) + 1;
    }

    // Identify topics needing more practice
    analysis.recommendedTopics = Object.entries(analysis.topicBreakdown)
      .sort(([,a], [,b]) => b - a)
      .map(([topic]) => topic);

    res.json(analysis);
  } catch (error) {
    next(error);
  }
});

app.listen(port, () => console.log(`Server running on port ${port}`));