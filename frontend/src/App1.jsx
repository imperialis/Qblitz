import React, { useState, useCallback } from 'react';
import { TestComponent } from './components/ui/test';
import { Card, CardHeader, CardContent } from './components/ui/card';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './components/ui/select';
import { Alert, AlertDescription } from './components/ui/alert';
import { Loader2 } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const App = () => {
  const [topic, setTopic] = useState('');
  const [numQuestions, setNumQuestions] = useState(5);
  const [difficulty, setDifficulty] = useState('medium');
  const [quiz, setQuiz] = useState([]);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [answers, setAnswers] = useState({});
  const [analysis, setAnalysis] = useState(null);

  const handleQuizGen = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`${API_BASE_URL}/generate-quiz`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          topic,
          numQuestions,
          difficulty,
          source: 'gemini'
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate quiz');
      }

      const data = await response.json();
      setQuiz(data);
      setAnswers({});
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [topic, numQuestions, difficulty]);

  const handleUpload = useCallback(async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);

      const formData = new FormData();
      formData.append('topic', topic);
      
      if (file) {
        formData.append('image', file);
      } else {
        const question = e.target.elements.question.value;
        if (!question) {
          throw new Error('Please enter a question or upload an image');
        }
        formData.append('question', question);
      }

      const response = await fetch(`${API_BASE_URL}/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload question');
      }

      e.target.reset();
      setFile(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [topic, file]);

  const handleSubmit = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const wrongQuestions = quiz.filter((q, i) => 
        answers[i]?.toLowerCase() !== q.answer?.toLowerCase()
      );

      const response = await fetch(`${API_BASE_URL}/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ wrongQuestions }),
      });

      if (!response.ok) {
        throw new Error('Failed to analyze results');
      }

      const data = await response.json();
      setAnalysis(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [quiz, answers]);

  return (
    <div className="max-w-4xl mx-auto p-6">
      
      <Card>
        <CardHeader>
          <h1 className="text-2xl font-bold">Math Learning Platform</h1>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-4">
              <Input
                type="text"
                placeholder="Topic (e.g., Algebra, Geometry)"
                onChange={e => setTopic(e.target.value)}
                value={topic}
              />

              <Select value={difficulty} onValueChange={setDifficulty}>
                <SelectTrigger>
                  <SelectValue placeholder="Select difficulty" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="hard">Hard</SelectItem>
                </SelectContent>
              </Select>

              <Input
                type="number"
                min="1"
                max="10"
                value={numQuestions}
                onChange={e => setNumQuestions(parseInt(e.target.value))}
              />

              <Button 
                onClick={handleQuizGen}
                disabled={!topic || loading}
              >
                {loading ? <Loader2 className="animate-spin" /> : 'Generate Quiz'}
              </Button>
            </div>

            <form onSubmit={handleUpload} className="space-y-4">
              <Input
                type="text"
                name="question"
                placeholder="Enter your own question"
              />
              
              <Input
                type="file"
                accept="image/*"
                onChange={e => setFile(e.target.files?.[0])}
              />
              
              <Button type="submit" disabled={loading}>
                {loading ? <Loader2 className="animate-spin" /> : 'Upload Question'}
              </Button>
            </form>

            {quiz.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold">Quiz Questions</h2>
                {quiz.map((q, i) => (
                  <div key={i} className="space-y-2">
                    <p className="font-medium">{q.question}</p>
                    <Input
                      type="text"
                      placeholder="Your answer"
                      onChange={e => setAnswers({...answers, [i]: e.target.value})}
                      value={answers[i] || ''}
                    />
                  </div>
                ))}
                <Button onClick={handleSubmit} disabled={loading}>
                  Submit Answers
                </Button>
              </div>
            )}

            {analysis && (
              <div className="space-y-2">
                <h2 className="text-xl font-semibold">Analysis</h2>
                <p>Total Questions: {analysis.totalQuestions}</p>
                <h3 className="font-medium">Topics to Review:</h3>
                <ul className="list-disc pl-5">
                  {analysis.recommendedTopics.map((topic, i) => (
                    <li key={i}>{topic}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default App;