import { useState, useEffect } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, Lightbulb, CheckCircle2, ArrowRight } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function StepIllustrations({ session, article, articleIndex, totalArticles, onComplete }) {
  const existing = article?.illustration || {};
  const [phase, setPhase] = useState("initial");
  const [propositions, setPropositions] = useState(existing.propositions || []);
  const [selection, setSelection] = useState(existing.selection ?? -1);
  const [image, setImage] = useState(existing.image || "");
  const [nomFichier, setNomFichier] = useState(existing.nom_fichier || "");
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (image) {
      setPhase("validating");
    } else if (propositions.length > 0) {
      setPhase("propositions");
    }
  }, []);

  const fetchPropositions = async () => {
    setLoading(true);
    setLoadingMsg("Génération des propositions…");
    setError("");
    try {
      const resp = await axios.post(`${API}/propositions/illustrations`, { titre: article.titre });
      setPropositions(resp.data.propositions);
      setSelection(-1);
      setImage("");
      setNomFichier("");
      setPhase("propositions");
    } catch {
      setError("Erreur lors de la génération des propositions.");
    } finally {
      setLoading(false);
      setLoadingMsg("");
    }
  };

  const generateImage = async (sel = selection) => {
    if (sel < 0) return;
    setLoading(true);
    setLoadingMsg("Génération de l'illustration… (30–60 sec)");
    setError("");
    try {
      const resp = await axios.post(`${API}/generate/illustration`, {
        proposition: propositions[sel - 1],
        article_index: article.index,
        session_id: session.id,
      });
      setImage(resp.data.image_url);
      setNomFichier(resp.data.nom_fichier);
      setPhase("validating");
    } catch {
      setError("Erreur lors de la génération de l'illustration.");
    } finally {
      setLoading(false);
      setLoadingMsg("");
    }
  };

  const handleValidate = () => {
    onComplete(articleIndex, {
      propositions,
      selection,
      image,
      nom_fichier: nomFichier,
      valide: true,
    });
  };

  const handleRegenerate = async () => {
    setImage("");
    setNomFichier("");
    await generateImage();
  };

  const handleNewProposals = () => {
    setPropositions([]);
    setSelection(-1);
    setImage("");
    setNomFichier("");
    setPhase("initial");
    fetchPropositions();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium text-[#10B981] bg-green-50 px-2 py-0.5 rounded-full">
              Article {articleIndex + 1} / {totalArticles}
            </span>
          </div>
          <h2 className="text-xl font-bold text-[#0F172A]" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Illustration — {article.titre}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Sélectionnez une proposition et générez l'illustration 16/9.
          </p>
        </div>
      </div>

      {loading && (
        <div className="bg-green-50 border border-green-200 rounded-lg px-5 py-4 flex items-center gap-3"
          data-testid="loading-indicator-illus">
          <Loader2 className="w-5 h-5 spin text-[#10B981] flex-shrink-0" />
          <span className="text-sm text-[#10B981] font-medium">{loadingMsg}</span>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-600" data-testid="error-message-illus">
          {error}
        </div>
      )}

      {phase === "initial" && !loading && (
        <Button
          onClick={fetchPropositions}
          className="bg-[#10B981] hover:bg-green-600 text-white"
          data-testid="btn-get-propositions-illus"
        >
          <Lightbulb className="w-4 h-4 mr-2" />
          Générer des propositions
        </Button>
      )}

      {phase === "propositions" && !loading && (
        <div className="space-y-4">
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden" data-testid="propositions-list-illus">
            {propositions.map((prop, i) => {
              const num = i + 1;
              const isSelected = selection === num;
              return (
                <div
                  key={i}
                  className={`proposal-item border-b border-gray-100 last:border-b-0 px-4 py-3 flex items-start gap-3 cursor-pointer ${isSelected ? "selected" : ""}`}
                  onClick={() => setSelection(num)}
                  data-testid={`proposal-illus-${num}`}
                >
                  <div className="flex-shrink-0 mt-0.5">
                    <div
                      className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${
                        isSelected ? "border-[#10B981] bg-[#10B981]" : "border-gray-300"
                      }`}
                      data-testid={`radio-illus-${num}`}
                    >
                      {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                  </div>
                  <p className={`text-sm leading-relaxed ${isSelected ? "text-gray-800" : "text-gray-600"}`}>
                    <span className="font-semibold text-[#3B1FA8] mr-1">{num}.</span>
                    {prop}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm text-gray-500">{selection > 0 ? "1/1 sélectionné" : "0/1 sélectionné"}</span>
            <Button
              onClick={() => generateImage()}
              disabled={selection < 0}
              className="bg-[#10B981] hover:bg-green-600 text-white"
              data-testid="btn-generate-illustration"
            >
              Générer l'illustration
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
            <Button
              variant="ghost"
              onClick={handleNewProposals}
              className="text-gray-500 hover:text-gray-700"
              data-testid="btn-new-proposals-illus"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1" />
              Nouvelles propositions
            </Button>
          </div>
        </div>
      )}

      {phase === "validating" && !loading && (
        <div className="space-y-5" data-testid="illustration-validation">
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <img
              src={image}
              alt="Illustration générée"
              className="img-illustration w-full"
              data-testid="illustration-image"
            />
            <p className="text-xs text-gray-400 px-4 py-2 text-center font-mono">{nomFichier}</p>
          </div>

          <div className="flex gap-3 flex-wrap">
            <Button
              onClick={handleValidate}
              className="bg-[#10B981] hover:bg-green-600 text-white"
              data-testid="btn-validate-illustration"
            >
              <CheckCircle2 className="w-4 h-4 mr-1.5" />
              Valider
            </Button>
            <Button
              variant="outline"
              onClick={handleRegenerate}
              disabled={loading}
              className="border-[#10B981] text-[#10B981] hover:bg-green-50"
              data-testid="btn-regenerate-illustration"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1" />
              Régénérer
            </Button>
            <Button
              variant="ghost"
              onClick={handleNewProposals}
              className="text-gray-500 hover:text-gray-700"
              data-testid="btn-new-proposals-after-gen-illus"
            >
              Nouvelles propositions
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
