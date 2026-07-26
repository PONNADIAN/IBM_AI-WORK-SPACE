import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileCheck, Play, Save, CheckCircle, XCircle, Sparkles, Loader2, RefreshCw } from 'lucide-react';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';

export default function QuizPage() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [quiz, setQuiz] = useState<any>(null);
  
  const [answers, setAnswers] = useState<any>({});
  const [grading, setGrading] = useState(false);
  const [result, setResult] = useState<any>(null);

  // In-memory quiz cache [docId -> quiz]
  const [quizCache, setQuizCache] = useState<Record<string, any>>({});

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const { data } = await api.get('/documents/');
      setDocuments(data);
      if (data.length > 0) setSelectedDocId(data[0].id);
    } catch (err) {
      console.error(err);
    }
  };

  // When selected doc changes, load from cache if available for 0ms latency
  useEffect(() => {
    if (selectedDocId && quizCache[selectedDocId]) {
      setQuiz(quizCache[selectedDocId]);
      setResult(null);
      setAnswers({});
    }
  }, [selectedDocId, quizCache]);

  const generateQuiz = async () => {
    if (!selectedDocId || loading) return;

    setLoading(true);
    setQuiz(null);
    setResult(null);
    setAnswers({});

    try {
      const { data } = await api.post('/quiz/generate', { document_id: selectedDocId });
      setQuiz(data);
      setQuizCache((prev) => ({ ...prev, [selectedDocId]: data }));
      toast.success('Quiz ready!');
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.detail || 'Failed to generate quiz. Ensure the document has text.');
    } finally {
      setLoading(false);
    }
  };

  const submitQuiz = async () => {
    if (grading) return;
    setGrading(true);
    try {
      const questions = [];
      if (quiz?.short_answer) {
        questions.push(...quiz.short_answer);
      }
      
      const { data } = await api.post('/quiz/grade', {
        document_id: selectedDocId,
        questions,
        user_answers: answers
      });
      setResult(data);
      toast.success('Quiz graded!');
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.detail || 'Failed to grade quiz.');
    } finally {
      setGrading(false);
    }
  };

  return (
    <div className="h-full flex flex-col relative z-10 p-6 overflow-y-auto">
      <header className="mb-6 flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <FileCheck className="text-cyan-400" />
            AI Quiz Generator
          </h1>
          <p className="text-slate-400 text-sm mt-1">Test your knowledge on your uploaded study materials with fast AI generation.</p>
        </div>
      </header>

      <div className="glass-panel p-6 rounded-2xl mb-6">
        <label className="block text-sm font-medium text-slate-300 mb-2">Select Study Material</label>
        <div className="flex gap-4">
          <select 
            className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-cyan-500/50"
            value={selectedDocId}
            onChange={(e) => setSelectedDocId(e.target.value)}
          >
            {documents.length === 0 && <option value="">No documents found. Upload one first.</option>}
            {documents.map(d => (
              <option key={d.id} value={d.id}>{d.original_filename}</option>
            ))}
          </select>
          <button 
            onClick={generateQuiz}
            disabled={!selectedDocId || loading}
            className="btn-brand px-6 flex items-center gap-2 font-medium"
          >
            {loading ? (
              <><Loader2 size={16} className="animate-spin text-cyan-300" /> Generating Quiz...</>
            ) : (
              <><Sparkles size={16} /> Generate Quiz</>
            )}
          </button>
        </div>
      </div>

      {/* Progressive loading state */}
      {loading && (
        <div className="space-y-6 animate-pulse">
          <div className="glass-panel p-6 rounded-2xl space-y-4">
            <div className="h-6 bg-white/10 rounded-lg w-48 mb-6" />
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-3 pb-4 border-b border-white/5 last:border-0">
                <div className="h-4 bg-white/10 rounded w-3/4" />
                <div className="grid grid-cols-2 gap-2 pt-2">
                  {[1, 2, 3, 4].map((j) => (
                    <div key={j} className="h-10 bg-white/5 rounded-xl" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {quiz && !result && !loading && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="glass-panel p-6 rounded-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Sparkles size={18} className="text-cyan-400" /> Multiple Choice Questions
              </h2>
              <span className="text-xs text-slate-400 bg-white/5 px-3 py-1 rounded-full border border-white/10">
                {quiz.multiple_choice?.length || 0} Questions
              </span>
            </div>

            {quiz.multiple_choice?.map((mc: any, idx: number) => (
              <div key={mc.id} className="mb-6 pb-6 border-b border-white/5 last:border-0 last:pb-0 last:mb-0">
                <p className="text-white mb-3 font-medium text-base">{idx + 1}. {mc.question}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {mc.options?.map((opt: string) => {
                    const isSelected = answers[mc.id] === opt;
                    return (
                      <label 
                        key={opt} 
                        className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-brand-500/20 border-brand-500/50 text-white shadow-lg shadow-brand-500/10'
                            : 'bg-black/20 hover:bg-black/40 border-white/5 text-slate-300'
                        }`}
                      >
                        <input 
                          type="radio" 
                          name={mc.id} 
                          value={opt}
                          checked={isSelected}
                          onChange={(e) => setAnswers({...answers, [mc.id]: e.target.value})}
                          className="text-cyan-500 focus:ring-cyan-500 bg-black/50 border-white/20"
                        />
                        <span className="text-sm font-medium">{opt}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="glass-panel p-6 rounded-2xl">
            <h2 className="text-xl font-bold text-white mb-4">Short Answer Questions</h2>
            {quiz.short_answer?.map((sa: any, idx: number) => (
              <div key={sa.id} className="mb-6 pb-6 border-b border-white/5 last:border-0 last:pb-0 last:mb-0">
                <p className="text-white mb-3 font-medium text-base">{idx + 1}. {sa.question}</p>
                <textarea 
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-cyan-500/50 resize-none h-24 text-sm transition-all"
                  placeholder="Type your answer here..."
                  value={answers[sa.id] || ''}
                  onChange={(e) => setAnswers({...answers, [sa.id]: e.target.value})}
                ></textarea>
              </div>
            ))}
          </div>

          <div className="flex justify-end">
            <button onClick={submitQuiz} disabled={grading} className="btn-brand px-8 py-3 text-sm flex items-center gap-2">
              {grading ? (
                <><Loader2 size={16} className="animate-spin text-cyan-300" /> Grading Answers...</>
              ) : (
                <><Play size={16} /> Submit Answers</>
              )}
            </button>
          </div>
        </motion.div>
      )}

      {result && (
        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6">
          <div className="glass-panel p-8 rounded-2xl text-center relative overflow-hidden">
            <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
            <h2 className="text-3xl font-bold text-white mb-2 tracking-tight">Quiz Results</h2>
            <div className="inline-block px-6 py-2 rounded-full bg-cyan-500/20 text-cyan-300 font-bold text-2xl mb-4 border border-cyan-500/30 glow-sm">
              {result.score}
            </div>
            <p className="text-slate-300 max-w-2xl mx-auto text-sm leading-relaxed">{result.overall_feedback}</p>
          </div>

          <div className="glass-panel p-6 rounded-2xl">
            <h3 className="text-xl font-bold text-white mb-4">Detailed Feedback</h3>
            {result.feedback?.map((fb: any) => {
              const sa = quiz?.short_answer?.find((q: any) => q.id === fb.id);
              return (
                <div key={fb.id} className="mb-4 p-4 rounded-xl bg-black/20 border border-white/5">
                  <div className="flex gap-3 mb-2">
                    {fb.is_correct ? <CheckCircle className="text-green-400 flex-shrink-0" size={18} /> : <XCircle className="text-red-400 flex-shrink-0" size={18} />}
                    <p className="text-white font-medium text-sm">{sa?.question || fb.id}</p>
                  </div>
                  <p className="text-slate-400 text-xs pl-7 leading-relaxed">{fb.explanation}</p>
                </div>
              );
            })}
          </div>
          
          <div className="flex justify-center gap-4">
            <button 
              onClick={() => {setResult(null); setQuiz(null);}} 
              className="btn-brand px-6 py-2.5 text-sm flex items-center gap-2"
            >
              <RefreshCw size={15} /> Retake / Create New Quiz
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
