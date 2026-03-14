import { useState, useEffect } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, RefreshCw, Lightbulb, CheckCircle2, ArrowRight } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function StepPictos({ session, article, articleIndex, totalArticles, onComplete }) {
  const existing = article?.picto || {};
  const [phase, setPhase] = useState("initial");
  const [propositions, setPropositions] = useState(existing.propositions || []);
  const [selections, setSelections] = useState(existing.selections || []);
  const [images, setImages] = useState(existing.images || []);
  const [nomFichiers, setNomFichiers] = useState(existing.nom_fichiers || []);
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (images.length === 2) {
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
      const resp = await axios.post(`${API}/propositions/pictos`, { titre: article.titre });
      setPropositions(resp.data.propositions);
      setSelections([]);
      setImages([]);
      setNomFichiers([]);
      setPhase("propositions");
    } catch {
      setError("Erreur lors de la génération des propositions.");
    } finally {
      setLoading(false);
      setLoadingMsg("");
    }
  };

  const toggleSelection = (num) => {
    if (selections.includes(num)) {
      setSelections(selections.filter(s => s !== num));
    } else if (selections.length < 2) {
      setSelections([...selections, num]);
    }
  };

  const generateImages = async (sels = selections) => {
    if (sels.length !== 2) return;
    setLoading(true);
    setLoadingMsg("Génération des pictos en cours… (30–60 sec)");
    setError("");
    try {
      const [r1, r2] = await Promise.all([
        axios.post(`${API}/generate/picto`, {
          proposition: propositions[sels[0] - 1],
          article_index: article.index,
          picto_number: 1,
          session_id: session.id,
        }),
        axios.post(`${API}/generate/picto`, {
          proposition: propositions[sels[1] - 1],
          article_index: article.index,
          picto_number: 2,
          session_id: session.id,
        }),
      ]);
      setImages([r1.data.image_url, r2.data.image_url]);
      setNomFichiers([r1.data.nom_fichier, r2.data.nom_fichier]);
      setPhase("validating");
    } catch {
      setError("Erreur lors de la génération des images.");
    } finally {
      setLoading(false);
      setLoadingMsg("");
    }
  };

  const handleValidate = () => {
    onComplete(articleIndex, {
      propositions,
      selections,
      images,
      nom_fichiers: nomFichiers,
      valide: true,
    });
  };

  const handleRegenerate = async () => {
    setImages([]);
    setNomFichiers([]);
    await generateImages();
  };

  const handleNewProposals = () => {
    setPropositions([]);
    setSelections([]);
    setImages([]);
    setNomFichiers([]);
    setPhase("initial");
    fetchPropositions();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium text-[#3B9FE8] bg-blue-50 px-2 py-0.5 rounded-full">
              Article {articleIndex + 1} / {totalArticles}
            </span>
          </div>
          <h2 className="text-xl font-bold text-[#0F172A]" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Pictos — {article.titre}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Sélectionnez 2 propositions puis générez les pictos.
          </p>
        </div>
      </div>

      {loading && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-5 py-4 flex items-center gap-3"
          data-testid="loading-indicator">
          <Loader2 className="w-5 h-5 spin text-[#3B9FE8] flex-shrink-0" />
          <span className="text-sm text-[#3B9FE8] font-medium">{loadingMsg}</span>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-600" data-testid="error-message">
          {error}
        </div>
      )}

      {phase === "initial" && !loading && (
        <Button
          onClick={fetchPropositions}
          className="bg-[#3B9FE8] hover:bg-[#2563EB] text-white"
          data-testid="btn-get-propositions-pictos"
        >
          <Lightbulb className="w-4 h-4 mr-2" />
          Générer des propositions
        </Button>
      )}

      {phase === "propositions" && !loading && (
        <div className="space-y-4">
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden" data-testid="propositions-list-pictos">
            {propositions.map((prop, i) => {
              const num = i + 1;
              const isSelected = selections.includes(num);
              const isDisabled = !isSelected && selections.length >= 2;
              return (
                <div
                  key={i}
                  className={`proposal-item border-b border-gray-100 last:border-b-0 px-4 py-3 flex items-start gap-3 ${isSelected ? "selected" : ""}`}
                  data-testid={`proposal-picto-${num}`}
                >
                  <Checkbox
                    id={`picto-prop-${num}`}
                    checked={isSelected}
                    onCheckedChange={() => toggleSelection(num)}
                    disabled={isDisabled}
                    className="mt-0.5"
                    data-testid={`checkbox-picto-${num}`}
                  />
                  <label
                    htmlFor={`picto-prop-${num}`}
                    className={`text-sm leading-relaxed cursor-pointer ${isDisabled ? "text-gray-400" : "text-gray-700"}`}
                  >
                    <span className="font-semibold text-[#3B1FA8] mr-1">{num}.</span>
                    {prop}
                  </label>
                </div>
              );
            })}
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm text-gray-500">{selections.length}/2 sélectionnés</span>
            <Button
              onClick={() => generateImages()}
              disabled={selections.length !== 2}
              className="bg-[#3B9FE8] hover:bg-[#2563EB] text-white"
              data-testid="btn-generate-pictos"
            >
              Générer les 2 pictos
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
            <Button
              variant="ghost"
              onClick={handleNewProposals}
              className="text-gray-500 hover:text-gray-700"
              data-testid="btn-new-proposals-pictos"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1" />
              Nouvelles propositions
            </Button>
          </div>
        </div>
      )}

      {phase === "validating" && !loading && (
        <div className="space-y-5" data-testid="pictos-validation">
          <div className="grid grid-cols-2 gap-4">
            {images.map((url, i) => (
              <div key={i} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <img
                  src={url}
                  alt={`Picto ${i + 1}`}
                  className="img-picto w-full"
                  data-testid={`picto-image-${i + 1}`}
                />
                <p className="text-xs text-gray-400 px-3 py-2 text-center font-mono">
                  {nomFichiers[i]}
                </p>
              </div>
            ))}
          </div>

          <div className="flex gap-3 flex-wrap">
            <Button
              onClick={handleValidate}
              className="bg-[#10B981] hover:bg-green-600 text-white"
              data-testid="btn-validate-pictos"
            >
              <CheckCircle2 className="w-4 h-4 mr-1.5" />
              Valider
            </Button>
            <Button
              variant="outline"
              onClick={handleRegenerate}
              disabled={loading}
              className="border-[#3B9FE8] text-[#3B9FE8] hover:bg-blue-50"
              data-testid="btn-regenerate-pictos"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1" />
              Régénérer
            </Button>
            <Button
              variant="ghost"
              onClick={handleNewProposals}
              className="text-gray-500 hover:text-gray-700"
              data-testid="btn-new-proposals-after-gen"
            >
              Nouvelles propositions
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
