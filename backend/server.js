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

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3001',
  credentials: true
}));
app.use(bodyParser.json());

// File upload configuration
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
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (!allowedTypes.includes(file.mimetype)) {
      cb(new Error('Invalid file type'));
      return;
    }
    cb(null, true);
  }
});

// Enhanced Database Class
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
        correct_answer TEXT,
        wrong_options TEXT,
        difficulty TEXT DEFAULT 'medium',
        question_type TEXT DEFAULT 'mcq',
        pattern TEXT,
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

  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }
}

const database = new Database();

// Helper function to generate questions using Gemini
async function generateGeminiQuestions(topic, numQuestions, difficulty) {
  try {
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        contents: [{
          role: "user",
          parts: [{
            text: `Generate ${numQuestions} math MCQ questions on ${topic}. 
                   Difficulty: ${difficulty || 'medium'}.
                   For each question, provide the correct answer and 3 wrong options.
                   Return in this JSON format:
                   [{
                     "question": "question text",
                     "correct_answer": "correct answer",
                     "wrong_options": ["wrong1", "wrong2", "wrong3"],
                     "pattern": "brief description of question pattern"
                   }]`
          }]
        }]
      },
      {
        headers: { "Content-Type": "application/json" }
      }
    );

    const rawText = response.data.candidates[0].content.parts[0].text;
    return JSON.parse(rawText.replace(/```json\n|```/g, '').trim());
  } catch (error) {
    console.error('Error generating questions:', error);
    throw error;
  }
}

// Helper function to generate a similar question
async function generateSimilarQuestion(originalQuestion, topic, difficulty) {
  try {
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        contents: [{
          role: "user",
          parts: [{
            text: `Given this math question: "${originalQuestion}"
                   Generate a similar question with different numbers but same pattern.
                   Also generate 3 wrong options for MCQ.
                   Return in this JSON format:
                   {
                     "question": "new question text",
                     "correct_answer": "correct answer",
                     "wrong_options": ["wrong1", "wrong2", "wrong3"],
                     "pattern": "brief description of question pattern"
                   }`
          }]
        }]
      },
      {
        headers: { "Content-Type": "application/json" }
      }
    );

    const rawText = response.data.candidates[0].content.parts[0].text;
    return JSON.parse(rawText.replace(/```json\n|```/g, '').trim());
  } catch (error) {
    console.error('Error generating similar question:', error);
    throw error;
  }
}

// Routes
app.get('/topics', async (req, res) => {
  try {
    const topics = await database.all(
      'SELECT DISTINCT topic FROM questions'
    );
    res.json(topics.map(t => t.topic));
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch topics' });
  }
});

app.get('/topic-stats', async (req, res) => {
  try {
    const stats = await database.all(`
      SELECT 
        topic,
        COUNT(*) as question_count,
        GROUP_CONCAT(DISTINCT difficulty) as difficulties
      FROM questions
      GROUP BY topic
    `);
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch topic statistics' });
  }
});

app.post('/upload', upload.single('image'), async (req, res, next) => {
  try {
    let questionText = req.body.question;
    
    if (req.file) {
      const { data: { text } } = await Tesseract.recognize(
        req.file.path,
        'eng',
        { logger: m => console.log(m) }
      );
      questionText = text.trim();
      fs.unlink(req.file.path, err => {
        if (err) console.error('Error deleting file:', err);
      });
    }

    if (!questionText || !req.body.topic) {
      return res.status(400).json({ error: 'Question text and topic are required' });
    }

    const mcqData = await generateSimilarQuestion(questionText, req.body.topic, 'medium');

    const result = await database.run(
      `INSERT INTO questions (topic, question, correct_answer, wrong_options, pattern) 
       VALUES (?, ?, ?, ?, ?)`,
      [
        req.body.topic,
        questionText,
        mcqData.correct_answer,
        JSON.stringify(mcqData.wrong_options),
        mcqData.pattern
      ]
    );

    res.json({
      id: result.lastID,
      message: 'Question uploaded successfully'
    });
  } catch (error) {
    next(error);
  }
});

app.post('/generate-quiz', async (req, res) => {
  try {
    const { topic, numQuestions = 5, difficulty, mode = 'auto' } = req.body;
    
    if (!topic) {
      return res.status(400).json({ error: 'Topic is required' });
    }

    let questions = [];

    if (mode === 'db' || mode === 'auto') {
      questions = await database.all(
        `SELECT * FROM questions 
         WHERE topic = ? ${difficulty ? 'AND difficulty = ?' : ''}
         ORDER BY RANDOM() 
         LIMIT ?`,
        difficulty ? [topic, difficulty, numQuestions] : [topic, numQuestions]
      );
    }

    if (mode === 'gemini' || (mode === 'auto' && questions.length < numQuestions)) {
      const remainingQuestions = numQuestions - questions.length;
      const newQuestions = await generateGeminiQuestions(topic, remainingQuestions, difficulty);

      for (const q of newQuestions) {
        const result = await database.run(
          `INSERT INTO questions (topic, question, correct_answer, wrong_options, difficulty, pattern)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [topic, q.question, q.correct_answer, JSON.stringify(q.wrong_options), difficulty || 'medium', q.pattern]
        );
        q.id = result.lastID;
      }

      questions = [...questions, ...newQuestions];
    }

    const formattedQuestions = questions.map(q => ({
      id: q.id,
      question: q.question,
      correct_answer: q.correct_answer,
      wrong_options: typeof q.wrong_options === 'string' ? JSON.parse(q.wrong_options) : q.wrong_options,
      pattern: q.pattern,
      difficulty: q.difficulty,
      options: [...(typeof q.wrong_options === 'string' ? JSON.parse(q.wrong_options) : q.wrong_options), q.correct_answer]
        .sort(() => Math.random() - 0.5)
    }));

    res.json(formattedQuestions);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to generate quiz' });
  }
});

app.post('/submit-answer', async (req, res) => {
  try {
    const { questionId, userAnswer, isCorrect } = req.body;

    await database.run(
      `INSERT INTO user_progress (question_id, correct) VALUES (?, ?)`,
      [questionId, isCorrect]
    );

    if (!isCorrect) {
      const originalQuestion = await database.get(
        'SELECT * FROM questions WHERE id = ?',
        [questionId]
      );

      const similarQuestion = await generateSimilarQuestion(
        originalQuestion.question,
        originalQuestion.topic,
        originalQuestion.difficulty
      );

      const result = await database.run(
        `INSERT INTO questions (topic, question, correct_answer, wrong_options, difficulty, pattern)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          originalQuestion.topic,
          similarQuestion.question,
          similarQuestion.correct_answer,
          JSON.stringify(similarQuestion.wrong_options),
          originalQuestion.difficulty,
          similarQuestion.pattern
        ]
      );

      res.json({
        isCorrect,
        similarQuestion: {
          id: result.lastID,
          ...similarQuestion
        }
      });
    } else {
      res.json({ isCorrect });
    }
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to process answer' });
  }
});

app.get('/questions/:topic', async (req, res) => {
  try {
    const questions = await database.all(
      'SELECT * FROM questions WHERE topic = ? ORDER BY created_at DESC',
      [req.params.topic]
    );
    res.json(questions);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch questions' });
  }
});

app.listen(port, () => console.log(`Server running on port ${port}`));