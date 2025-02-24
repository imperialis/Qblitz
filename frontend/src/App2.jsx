import React, { useState, useEffect } from 'react';
import axios from 'axios';

//const API_BASE_URL = 'http://localhost:3000';
const API_BASE_URL ='https://super-giggle-64j5px6p67wc5r5q-3000.app.github.dev'

function App() {
  const [topic, setTopic] = useState('');
  const [numQuestions, setNumQuestions] = useState(5);
  const [difficulty, setDifficulty] = useState('medium');
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [feedback, setFeedback] = useState('');
  const [score, setScore] = useState(0);
  const [imageFile, setImageFile] = useState(null);
  const [uploadedQuestion, setUploadedQuestion] = useState('');
  const [isQuizActive, setIsQuizActive] = useState(false);
  const [incorrectQuestions, setIncorrectQuestions] = useState([]);

  const topics = [
    'Algebra',
    'Geometry',
    'Trigonometry',
    'Calculus',
    'Statistics',
    'Probability'
  ];

  const difficultyLevels = ['easy', 'medium', 'hard'];

  const generateQuiz = async () => {
    try {
      const response = await axios.post(`${API_BASE_URL}/generate-quiz`, {
        topic,
        numQuestions,
        difficulty
      });
      
      const formattedQuestions = response.data.map(q => ({
        ...q,
        options: [...q.wrong_options, q.correct_answer].sort(() => Math.random() - 0.5)
      }));
      
      setQuestions(formattedQuestions);
      setCurrentQuestionIndex(0);
      setScore(0);
      setFeedback('');
      setIncorrectQuestions([]);
      setIsQuizActive(true);
    } catch (error) {
      console.error('Error generating quiz:', error);
      setFeedback('Failed to generate quiz. Please try again.');
    }
  };

  const handleFileChange = (event) => {
    setImageFile(event.target.files[0]);
  };

  const uploadQuestion = async (e) => {
    e.preventDefault();
    
    const formData = new FormData();
    if (imageFile) {
      formData.append('image', imageFile);
    }
    formData.append('question', uploadedQuestion);
    formData.append('topic', topic);

    try {
      const response = await axios.post(`${API_BASE_URL}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setFeedback('Question uploaded successfully!');
      setUploadedQuestion('');
      setImageFile(null);
    } catch (error) {
      console.error('Error uploading question:', error);
      setFeedback('Failed to upload question. Please try again.');
    }
  };

  const handleAnswerSubmit = async () => {
    const currentQuestion = questions[currentQuestionIndex];
    const isCorrect = selectedAnswer === currentQuestion.correct_answer;

    try {
      const response = await axios.post(`${API_BASE_URL}/submit-answer`, {
        questionId: currentQuestion.id,
        userAnswer: selectedAnswer,
        isCorrect: true
      });

      if (isCorrect) {
        setScore(score + 1);
        setFeedback('Correct! 🎉');
      } else {
        // Track incorrect question
        setIncorrectQuestions([...incorrectQuestions, currentQuestion]);
        setFeedback(`Incorrect. The correct answer was: ${currentQuestion.correct_answer}`);
        
        // Add similar question to practice queue
        if (response.data.similarQuestion) {
          const newQuestion = {
            ...response.data.similarQuestion,
            options: [
              ...response.data.similarQuestion.wrong_options,
              response.data.similarQuestion.correct_answer
            ].sort(() => Math.random() - 0.5)
          };
          
          // Insert similar question right after the current question
          const updatedQuestions = [...questions];
          updatedQuestions.splice(currentQuestionIndex + 1, 0, newQuestion);
          setQuestions(updatedQuestions);
        }
      }

      // Move to next question after delay
      setTimeout(() => {
        if (currentQuestionIndex < questions.length - 1) {
          setCurrentQuestionIndex(currentQuestionIndex + 1);
          setSelectedAnswer('');
          setFeedback('');
        } else {
          // Show final results with practice recommendations
          const finalFeedback = `Quiz completed! Score: ${score}/${questions.length}\n` +
            (incorrectQuestions.length > 0 
              ? `Topics to practice: ${incorrectQuestions.map(q => q.pattern || q.topic).join(', ')}`
              : 'Great job! You mastered these concepts!');
          setFeedback(finalFeedback);
          setIsQuizActive(false);
        }
      }, 2000);
    } catch (error) {
      console.error('Error submitting answer:', error);
      setFeedback('Failed to submit answer. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-6 flex flex-col justify-center sm:py-12">
      <div className="relative py-3 sm:max-w-xl sm:mx-auto">
        <div className="relative px-4 py-10 bg-white shadow-lg sm:rounded-3xl sm:p-20">
          <div className="max-w-md mx-auto">
            <div className="divide-y divide-gray-200">
              <div className="py-8 text-base leading-6 space-y-4 text-gray-700 sm:text-lg sm:leading-7">
                {!isQuizActive ? (
                  <>
                    <h1 className="text-2xl font-bold mb-8">Math Practice Quiz</h1>
                    
                    {/* Quiz Setup Form */}
                    <div className="mb-6">
                      <label className="block mb-2">Topic:</label>
                      <select 
                        value={topic} 
                        onChange={(e) => setTopic(e.target.value)}
                        className="w-full p-2 border rounded"
                      >
                        <option value="">Select a topic</option>
                        {topics.map(t => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>

                    <div className="mb-6">
                      <label className="block mb-2">Number of Questions:</label>
                      <input
                        type="number"
                        value={numQuestions}
                        onChange={(e) => setNumQuestions(parseInt(e.target.value))}
                        min="1"
                        max="20"
                        className="w-full p-2 border rounded"
                      />
                    </div>

                    <div className="mb-6">
                      <label className="block mb-2">Difficulty:</label>
                      <select
                        value={difficulty}
                        onChange={(e) => setDifficulty(e.target.value)}
                        className="w-full p-2 border rounded"
                      >
                        {difficultyLevels.map(level => (
                          <option key={level} value={level}>
                            {level.charAt(0).toUpperCase() + level.slice(1)}
                          </option>
                        ))}
                      </select>
                    </div>

                    <button
                      onClick={generateQuiz}
                      disabled={!topic}
                      className={`w-full p-3 rounded ${
                        topic 
                          ? 'bg-blue-600 text-white hover:bg-blue-700' 
                          : 'bg-gray-300 cursor-not-allowed'
                      }`}
                    >
                      Start Quiz
                    </button>

                    {/* Question Upload Form */}
                    <div className="mt-12 pt-8 border-t">
                      <h2 className="text-xl font-bold mb-6">Upload New Question</h2>
                      <form onSubmit={uploadQuestion}>
                        <div className="mb-4">
                          <label className="block mb-2">Question Text:</label>
                          <textarea
                            value={uploadedQuestion}
                            onChange={(e) => setUploadedQuestion(e.target.value)}
                            className="w-full p-2 border rounded"
                            rows="3"
                          />
                        </div>

                        <div className="mb-4">
                          <label className="block mb-2">Or Upload Image:</label>
                          <input
                            type="file"
                            onChange={handleFileChange}
                            accept="image/*"
                            className="w-full p-2"
                          />
                        </div>

                        <button
                          type="submit"
                          disabled={!topic || (!uploadedQuestion && !imageFile)}
                          className={`w-full p-3 rounded ${
                            topic && (uploadedQuestion || imageFile)
                              ? 'bg-green-600 text-white hover:bg-green-700'
                              : 'bg-gray-300 cursor-not-allowed'
                          }`}
                        >
                          Upload Question
                        </button>
                      </form>
                    </div>
                  </>
                ) : (
                  /* Quiz Interface */
                  <div>
                    <div className="mb-6">
                      <p className="text-sm text-gray-500">
                        Question {currentQuestionIndex + 1} of {questions.length}
                      </p>
                      <p className="text-sm text-gray-500">
                        Score: {score}/{currentQuestionIndex}
                      </p>
                    </div>

                    <div className="mb-6">
                      <p className="text-lg font-medium mb-4">
                        {questions[currentQuestionIndex].question}
                      </p>

                      <div className="space-y-3">
                        {questions[currentQuestionIndex].options.map((option, idx) => (
                          <div
                            key={idx}
                            onClick={() => setSelectedAnswer(option)}
                            className={`p-3 rounded border cursor-pointer ${
                              selectedAnswer === option
                                ? 'bg-blue-100 border-blue-500'
                                : 'hover:bg-gray-50'
                            }`}
                          >
                            {option}
                          </div>
                        ))}
                      </div>
                    </div>

                    <button
                      onClick={handleAnswerSubmit}
                      disabled={!selectedAnswer}
                      className={`w-full p-3 rounded ${
                        selectedAnswer
                          ? 'bg-blue-600 text-white hover:bg-blue-700'
                          : 'bg-gray-300 cursor-not-allowed'
                      }`}
                    >
                      Submit Answer
                    </button>

                    {feedback && (
                      <div className={`mt-4 p-3 rounded ${
                        feedback.includes('Correct')
                          ? 'bg-green-100 text-green-700'
                          : feedback.includes('Incorrect')
                          ? 'bg-red-100 text-red-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}>
                        {feedback}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;