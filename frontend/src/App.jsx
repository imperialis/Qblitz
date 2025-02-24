import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { LineChart, BarChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { BookOpen, Award, Brain, BarChart2, Database, Cpu, RefreshCw } from 'lucide-react';
//Add the base url for your backend here
const API_BASE_URL = 'http://localhost:3000';


function App() {
  const [view, setView] = useState('quiz');
  const [topic, setTopic] = useState('');
  const [topics, setTopics] = useState([]);
  const [topicStats, setTopicStats] = useState([]);
  const [numQuestions, setNumQuestions] = useState(5);
  const [difficulty, setDifficulty] = useState('medium');
  const [generationMode, setGenerationMode] = useState('auto');
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [feedback, setFeedback] = useState('');
  const [score, setScore] = useState(0);
  const [imageFile, setImageFile] = useState(null);
  const [uploadedQuestion, setUploadedQuestion] = useState('');
  const [isQuizActive, setIsQuizActive] = useState(false);
  const [incorrectQuestions, setIncorrectQuestions] = useState([]);
  const [performanceStats, setPerformanceStats] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const difficultyLevels = ['easy', 'medium', 'hard'];
  const generationModes = [
    { id: 'auto', name: 'Auto', icon: RefreshCw, description: 'Use DB questions when available, generate with Gemini if needed' },
    { id: 'db', name: 'Database', icon: Database, description: 'Use only existing questions from the database' },
    { id: 'gemini', name: 'Gemini', icon: Cpu, description: 'Generate fresh questions using Gemini AI' }
  ];

  useEffect(() => {
    fetchTopics();
    fetchTopicStats();
    fetchPerformanceStats();
  }, []);

  const fetchTopics = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/topics`);
      setTopics(response.data);
    } catch (error) {
      console.error('Error fetching topics:', error);
    }
  };

  const fetchTopicStats = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/topic-stats`);
      setTopicStats(response.data);
    } catch (error) {
      console.error('Error fetching topic stats:', error);
    }
  };

  const fetchPerformanceStats = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/performance-stats`);
      setPerformanceStats(response.data);
    } catch (error) {
      console.error('Error fetching performance stats:', error);
    }
  };

  const generateQuiz = async () => {
    try {
      setIsLoading(true);
      const response = await axios.post(`${API_BASE_URL}/generate-quiz`, {
        topic,
        numQuestions,
        difficulty,
        mode: generationMode
      });
      
      setQuestions(response.data);
      setCurrentQuestionIndex(0);
      setScore(0);
      setFeedback('');
      setIncorrectQuestions([]);
      setIsQuizActive(true);
    } catch (error) {
      console.error('Error generating quiz:', error);
      setFeedback('Failed to generate quiz. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswerSubmit = async () => {
    const currentQuestion = questions[currentQuestionIndex];
    const isCorrect = selectedAnswer === currentQuestion.correct_answer;

    try {
      const response = await axios.post(`${API_BASE_URL}/submit-answer`, {
        questionId: currentQuestion.id,
        userAnswer: selectedAnswer,
        isCorrect
      });

      if (isCorrect) {
        setScore(score + 1);
        setFeedback('Correct! 🎉');
      } else {
        setIncorrectQuestions([...incorrectQuestions, currentQuestion]);
        setFeedback(`Incorrect. The correct answer was: ${currentQuestion.correct_answer}`);
      }

      setTimeout(() => {
        if (currentQuestionIndex < questions.length - 1) {
          setCurrentQuestionIndex(currentQuestionIndex + 1);
          setSelectedAnswer('');
          setFeedback('');
        } else {
          const finalFeedback = `Quiz completed! Score: ${score + (isCorrect ? 1 : 0)}/${questions.length}\n` +
            (incorrectQuestions.length > 0 
              ? `Topics to practice: ${incorrectQuestions.map(q => q.pattern || q.topic).join(', ')}`
              : 'Great job! You mastered these concepts!');
          setFeedback(finalFeedback);
          setIsQuizActive(false);
          fetchPerformanceStats(); // Refresh stats after quiz completion
        }
      }, 2000);
    } catch (error) {
      console.error('Error submitting answer:', error);
      setFeedback('Failed to submit answer. Please try again.');
    }
  };

  // QuizSetup component
  const QuizSetup = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Topic</label>
          <select 
            value={topic} 
            onChange={(e) => setTopic(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Select a topic</option>
            {topics.map(t => {
              const stats = topicStats.find(s => s.topic === t);
              return (
                <option key={t} value={t}>
                  {t} ({stats ? `${stats.question_count} questions` : 'New'})
                </option>
              );
            })}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Generation Mode
          </label>
          <div className="grid grid-cols-1 gap-3">
            {generationModes.map(mode => (
              <button
                key={mode.id}
                onClick={() => setGenerationMode(mode.id)}
                className={`flex items-center space-x-3 p-3 rounded-lg border-2 transition-colors ${
                  generationMode === mode.id
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-gray-200 hover:border-indigo-200'
                }`}
              >
                <mode.icon className={generationMode === mode.id ? 'text-indigo-500' : 'text-gray-400'} />
                <div className="text-left">
                  <div className="font-medium">{mode.name}</div>
                  <div className="text-sm text-gray-500">{mode.description}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Number of Questions
          </label>
          <input
            type="number"
            value={numQuestions}
            onChange={(e) => setNumQuestions(parseInt(e.target.value))}
            min="1"
            max="20"
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Difficulty
          </label>
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
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
          disabled={!topic || isLoading}
          className={`w-full p-4 rounded-lg font-medium transition-colors ${
            topic && !isLoading
              ? 'bg-indigo-600 text-white hover:bg-indigo-700' 
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          {isLoading ? 'Generating Quiz...' : 'Start Quiz'}
        </button>
      </div>

      {/* Question Upload Form */}
      <div className="border-t md:border-t-0 md:border-l border-gray-200 pt-6 md:pt-0 md:pl-8">
        <h2 className="text-xl font-bold text-gray-900 mb-6">
          Upload New Question
        </h2>
        <form onSubmit={uploadQuestion} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Question Text
            </label>
            <textarea
              value={uploadedQuestion}
              onChange={(e) => setUploadedQuestion(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              rows="3"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Or Upload Image
            </label>
            <input
              type="file"
              onChange={handleFileChange}
              accept="image/*"
              className="w-full"
            />
          </div>

          <button
            type="submit"
            disabled={!topic || (!uploadedQuestion && !imageFile)}
            className={`w-full p-4 rounded-lg font-medium transition-colors ${
              topic && (uploadedQuestion || imageFile)
                ? 'bg-green-600 text-white hover:bg-green-700'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            Upload Question
          </button>
        </form>
      </div>
    </div>
  );

  // Quiz Component
  const Quiz = () => (
    <div className="max-w-2xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div className="space-y-1">
          <p className="text-sm text-gray-500">
            Question {currentQuestionIndex + 1} of {questions.length}
          </p>
          <p className="text-sm text-gray-500">
            Score: {score}/{currentQuestionIndex}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <span className={`px-3 py-1 rounded-full text-sm ${
            difficulty === 'easy' ? 'bg-green-100 text-green-800' :
            difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' :
            'bg-red-100 text-red-800'
          }`}>
            {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
          </span>
          <span className="px-3 py-1 rounded-full bg-indigo-100 text-indigo-800 text-sm">
            {topic}
          </span>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
        <p className="text-lg font-medium mb-6">
          {questions[currentQuestionIndex].question}
        </p>

        <div className="space-y-3">
          {questions[currentQuestionIndex].options.map((option, idx) => (
            <button
              key={idx}
              onClick={() => setSelectedAnswer(option)}
              className={`w-full p-4 text-left rounded-lg border-2 transition-all ${
                selectedAnswer === option
                  ? 'border-indigo-500 bg-indigo-50'
                  : 'border-gray-200 hover:border-indigo-200'
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={handleAnswerSubmit}
        disabled={!selectedAnswer}
        className={`w-full p-4 rounded-lg font-medium transition-colors ${
          selectedAnswer
            ? 'bg-indigo-600 text-white hover:bg-indigo-700'
            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
        }`}
      >
        Submit Answer
      </button>

      {feedback && (
        <div className={`mt-4 p-4 rounded-lg ${
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
  );

  // Performance Dashboard Component
  


  const PerformanceDashboard = () => (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold mb-6">Performance Dashboard</h2>
      
      {/* Topic Success Rate Chart */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Success Rate by Topic</h3>
        <BarChart width={600} height={300} data={performanceStats}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="topic" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar 
            dataKey={(data) => (data.correct_answers / data.total_attempts * 100).toFixed(1)} 
            name="Success Rate (%)" 
            fill="#4F46E5" 
          />
        </BarChart>
      </div>

      {/* Pattern Analysis */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Question Pattern Analysis</h3>
        <div className="space-y-4">
          {performanceStats.map((stat, idx) => (
            <div key={idx} className="border-b pb-4">
              <p className="font-medium">{stat.pattern}</p>
              <div className="flex items-center mt-2">
                <div 
                  className="h-2 rounded-full bg-gradient-to-r from-red-500 to-green-500"
                  style={{
                    width: `${(stat.correct_answers / stat.total_attempts) * 100}%`
                  }}
                />
                <span className="ml-2 text-sm text-gray-600">
                  {((stat.correct_answers / stat.total_attempts) * 100).toFixed(1)}% success
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // File handling functions
  const handleFileChange = (e) => {
    setImageFile(e.target.files[0]);
  };

  const uploadQuestion = async (e) => {
    e.preventDefault();
    
    try {
      const formData = new FormData();
      if (imageFile) {
        formData.append('image', imageFile);
      }
      formData.append('question', uploadedQuestion);
      formData.append('topic', topic);

      await axios.post(`${API_BASE_URL}/upload-question`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      setUploadedQuestion('');
      setImageFile(null);
      fetchTopicStats(); // Refresh stats after upload
    } catch (error) {
      console.error('Error uploading question:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-100 py-6">
      <nav className="max-w-6xl mx-auto px-4 mb-8">
        <div className="flex space-x-4">
          <button
            onClick={() => setView('quiz')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg ${
              view === 'quiz' 
                ? 'bg-indigo-600 text-white' 
                : 'bg-white text-gray-700 hover:bg-indigo-50'
            }`}
          >
            <BookOpen size={20} />
            <span>Quiz</span>
          </button>
          <button
            onClick={() => setView('performance')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg ${
              view === 'performance' 
                ? 'bg-indigo-600 text-white' 
                : 'bg-white text-gray-700 hover:bg-indigo-50'
            }`}
          >
            <BarChart2 size={20} />
            <span>Performance</span>
          </button>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4">
        <div className="bg-white rounded-xl shadow-xl p-8">
          {view === 'quiz' ? (
            !isQuizActive ? (
              <>
                <div className="flex items-center space-x-3 mb-8">
                  <Brain className="text-indigo-600" size={32} />
                  <h1 className="text-3xl font-bold text-gray-900">Math Practice Quiz</h1>
                </div>
                <QuizSetup />
              </>
            ) : (
              <Quiz />
            )
          ) : (
            <PerformanceDashboard />
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
