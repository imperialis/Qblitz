# Adaptive Math Learning Platform

An intelligent math practice platform that adapts to student performance by generating similar questions when mistakes are made, helping students master mathematical concepts through targeted practice.

## Key Features

- **Adaptive Question Generation**: When a student answers incorrectly, the system automatically generates a similar question with different numbers but the same pattern
- **Multiple Question Sources**: Questions can come from:
  - Existing database of curated questions
  - AI-generated questions using Google's Gemini API
  - Uploaded questions [including image-to-text conversion(image uploads coming soon on the frontend)]
- **Performance Tracking**: Comprehensive analytics to track student progress[coming soon on the front end]
- **Multi-mode Question Generation**: Support for database-only, AI-only, or hybrid question sourcing

## How It Works

### Adaptive Learning Flow

1. Student selects a topic and difficulty level
2. System generates a quiz using existing questions or AI-generated ones
3. When a student answers incorrectly:
   - The system analyzes the question pattern
   - Gemini AI generates a similar question with different numbers
   - New question is stored in the database for future practice
   - This creates a growing database focused on areas where students need more practice

### Question Generation and Storage

#### Database Schema

```sql
CREATE TABLE questions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  topic TEXT NOT NULL,
  question TEXT NOT NULL,
  correct_answer TEXT,
  wrong_options TEXT,
  difficulty TEXT DEFAULT 'medium',
  question_type TEXT DEFAULT 'mcq',
  pattern TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_progress (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  question_id INTEGER,
  correct BOOLEAN,
  attempt_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (question_id) REFERENCES questions(id)
);
```

#### Question Generation Process

1. Original questions can be added through:
   - Direct database insertion
   - File upload (with OCR support)
   - AI generation using Gemini

2. When a student answers incorrectly:
```javascript
if (!isCorrect) {
  // Fetch original question details
  const originalQuestion = await database.get(
    'SELECT * FROM questions WHERE id = ?',
    [questionId]
  );

  // Generate similar question using AI
  const similarQuestion = await generateSimilarQuestion(
    originalQuestion.question,
    originalQuestion.topic,
    originalQuestion.difficulty
  );

  // Store new question in database
  await database.run(
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
}
```

## Technical Stack

- **Frontend**: React.js with Tailwind CSS
- **Backend**: Node.js with Express
- **Database**: SQLite3
- **AI Integration**: Google Gemini API
- **Image Processing**: Tesseract.js for OCR

## Setup Instructions

1. Clone the repository
2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
GEMINI_API_KEY=your_gemini_api_key
FRONTEND_URL=http://localhost:3001
PORT=3000
```

4. Initialize the database:
```bash
# Database will be automatically initialized when the server starts
npm start
```

5. Start the development server:
```bash
# Backend
npm run start

# Frontend (in a separate terminal)
cd client
npm run dev
```

## API Endpoints

- `POST /generate-quiz`: Generate a new quiz
- `POST /submit-answer`: Submit an answer and get a similar question if incorrect
- `POST /upload`: Upload a new question (supports text and images)
- `GET /topics`: Get all available topics
- `GET /topic-stats`: Get statistics for each topic
- `GET /questions/:topic`: Get all questions for a specific topic

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting pull requests.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
