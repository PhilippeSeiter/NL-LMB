import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { Loader2, ArrowLeft } from "lucide-react";
import StepImport from "@/components/StepImport";
import StepPictos from "@/components/StepPictos";
import StepIllustrations from "@/components/StepIllustrations";
import SessionSummary from "@/components/SessionSummary";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const LOGO_URL = "https://customer-assets.emergentagent.com/job_lmb-illustrations/artifacts/xiaswxau_avatar%20logo%20artyplanet%20d.png";

const STEPS = [
  { id: 1, label: "Import" },
  { id: 2, label: "Pictos" },
  { id: 3, label: "Illustrations" },
  { id: 4, label: "Export" },
];

function Stepper({ currentStep }) {
  return (
    <div className="flex items-center justify-center gap-0 mb-8" data-testid="stepper">
      {STEPS.map((step, i) => (
        <div key={step.id} className="flex items-center">
          <div className="flex flex-col items-center">
            <div
              className={`step-badge ${
                currentStep > step.id ? "done" : currentStep === step.id ? "active" : "pending"
              }`}
              data-testid={`step-badge-${step.id}`}
            >
              {currentStep > step.id ? "✓" : step.id}
            </div>
            <span
              className={`text-xs mt-1 font-medium ${
                currentStep >= step.id ? "text-[#3B9FE8]" : "text-gray-400"
              }`}
              style={{ fontFamily: 'Manrope, sans-serif' }}
            >
              {step.label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div
              className={`w-16 h-0.5 mb-4 mx-1 ${
                currentStep > step.id ? "bg-[#10B981]" : "bg-gray-200"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

export default function NewSession() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [currentArticleIndex, setCurrentArticleIndex] = useState(0);
  const [loading, setLoading] = useState(!!sessionId);

  useEffect(() => {
    if (sessionId) {
      loadSession(sessionId);
    }
  }, [sessionId]);

  const loadSession = async (id) => {
    try {
      const resp = await axios.get(`${API}/sessions/${id}`);
      const sess = resp.data;
      setSession(sess);
      restoreStep(sess);
    } catch (e) {
      console.error("Erreur chargement session", e);
    } finally {
      setLoading(false);
    }
  };

  const restoreStep = (sess) => {
    const articles = sess.articles || [];
    if (articles.length === 0) {
      setCurrentStep(1);
      return;
    }
    const allPictos = articles.every(a => a.picto?.valide);
    const allIllus = articles.every(a => a.illustration?.valide);

    if (allIllus) {
      setCurrentStep(4);
    } else if (allPictos) {
      const idx = articles.findIndex(a => !a.illustration?.valide);
      setCurrentStep(3);
      setCurrentArticleIndex(idx >= 0 ? idx : 0);
    } else {
      const idx = articles.findIndex(a => !a.picto?.valide);
      setCurrentStep(2);
      setCurrentArticleIndex(idx >= 0 ? idx : 0);
    }
  };

  const saveSession = useCallback(async (updates) => {
    if (!session?.id) return;
    const resp = await axios.put(`${API}/sessions/${session.id}`, updates);
    setSession(resp.data);
    return resp.data;
  }, [session?.id]);

  const handleStepImportComplete = async (articleItems) => {
    const titre = `Session LMB — ${new Date().toLocaleDateString('fr-FR')}`;
    const articles = articleItems.map((item, i) => ({
      index: i + 1,
      titre: typeof item === "string" ? item : item.titre,
      original_file_key: typeof item === "string" ? "" : (item.original_file_key || ""),
    }));

    const resp = await axios.post(`${API}/sessions`, { titre, articles });
    const newSession = resp.data;
    setSession(newSession);
    navigate(`/session/${newSession.id}`, { replace: true });
    setCurrentStep(2);
    setCurrentArticleIndex(0);
  };

  const handlePictoComplete = useCallback(async (articleIndex, pictoState) => {
    const updatedArticles = session.articles.map((art, i) =>
      i === articleIndex ? { ...art, picto: { ...pictoState, valide: true } } : art
    );
    await saveSession({ articles: updatedArticles });

    if (articleIndex + 1 < session.articles.length) {
      setCurrentArticleIndex(articleIndex + 1);
    } else {
      setCurrentStep(3);
      setCurrentArticleIndex(0);
    }
  }, [session, saveSession]);

  const handleIllustrationComplete = useCallback(async (articleIndex, illustrationState) => {
    const updatedArticles = session.articles.map((art, i) =>
      i === articleIndex ? { ...art, illustration: { ...illustrationState, valide: true } } : art
    );
    await saveSession({ articles: updatedArticles });

    if (articleIndex + 1 < session.articles.length) {
      setCurrentArticleIndex(articleIndex + 1);
    } else {
      await saveSession({ statut: "terminee" });
      setCurrentStep(4);
    }
  }, [session, saveSession]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
        <Loader2 className="w-8 h-8 spin text-[#3B9FE8]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-3">
        <img src={LOGO_URL} alt="Artyplanet" className="w-7 h-7 object-contain" />
        <span className="font-bold text-[#3B1FA8] text-base" style={{ fontFamily: 'Manrope, sans-serif' }}>
          Les Maîtres Bâtisseurs
        </span>
        {session && (
          <span className="text-sm text-gray-400 ml-1 truncate max-w-xs">— {session.titre}</span>
        )}
        <button
          onClick={() => navigate("/")}
          className="ml-auto text-gray-400 hover:text-gray-600 flex items-center gap-1 text-sm"
          data-testid="btn-back-home"
        >
          <ArrowLeft className="w-4 h-4" /> Accueil
        </button>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8">
        <Stepper currentStep={currentStep} />

        {currentStep === 1 && (
          <div className="fade-in">
            <StepImport onComplete={handleStepImportComplete} />
          </div>
        )}

        {currentStep === 2 && session && (
          <div className="fade-in" key={`picto-${currentArticleIndex}`}>
            <StepPictos
              session={session}
              article={session.articles[currentArticleIndex]}
              articleIndex={currentArticleIndex}
              totalArticles={session.articles.length}
              onComplete={handlePictoComplete}
            />
          </div>
        )}

        {currentStep === 3 && session && (
          <div className="fade-in" key={`illus-${currentArticleIndex}`}>
            <StepIllustrations
              session={session}
              article={session.articles[currentArticleIndex]}
              articleIndex={currentArticleIndex}
              totalArticles={session.articles.length}
              onComplete={handleIllustrationComplete}
            />
          </div>
        )}

        {currentStep === 4 && session && (
          <div className="fade-in">
            <SessionSummary session={session} />
          </div>
        )}
      </main>
    </div>
  );
}
