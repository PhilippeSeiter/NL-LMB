import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, CheckCircle2, ChevronDown, ChevronUp } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const STEPS = [
  { id: 1, label: "Propositions pictos" },
  { id: 2, label: "Génération pictos" },
  { id: 3, label: "Propositions illustration" },
  { id: 4, label: "Génération illustration" },
];

function ProgressBar({ currentStep }) {
  return (
    <div className="space-y-3">
      {STEPS.map((s) => {
        const done = currentStep > s.id;
        const active = currentStep === s.id;
        return (
          <div key={s.id} className="flex items-center gap-3">
            <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
              done ? "bg-[#10B981]" : active ? "bg-[#3B9FE8]" : "bg-gray-200"
            }`}>
              {done
                ? <CheckCircle2 className="w-3 h-3 text-white" />
                : active
                  ? <Loader2 className="w-3 h-3 text-white spin" />
                  : <div className="w-2 h-2 rounded-full bg-gray-400" />
              }
            </div>
            <span className={`text-sm ${active ? "text-[#3B9FE8] font-medium" : done ? "text-gray-500" : "text-gray-300"}`}>
              {s.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function ChangePanel({ propositions, onSelect, loading, onClose }) {
  return (
    <div className="mt-2 bg-[#F8FAFC] border border-gray-200 rounded-lg overflow-hidden fade-in">
      <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Choisir une proposition</span>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <ChevronUp className="w-4 h-4" />
        </button>
      </div>
      {propositions.map((prop, i) => (
        <button
          key={i}
          disabled={loading}
          onClick={() => onSelect(i + 1, prop)}
          className="w-full text-left px-4 py-3 text-sm text-gray-700 border-b border-gray-100 last:border-b-0 hover:bg-blue-50 hover:text-[#3B9FE8] transition-colors flex items-start gap-2 disabled:opacity-50"
          data-testid={`change-option-${i + 1}`}
        >
          {loading
            ? <Loader2 className="w-3.5 h-3.5 spin flex-shrink-0 mt-0.5 text-[#3B9FE8]" />
            : <span className="font-semibold text-[#3B1FA8] flex-shrink-0">{i + 1}.</span>
          }
          <span>{prop}</span>
        </button>
      ))}
    </div>
  );
}

export default function StepArticle({ session, article, articleIndex, totalArticles, onComplete }) {
  const hasStarted = useRef(false);

  const [genStep, setGenStep] = useState(0);
  const [phase, setPhase] = useState("generating");
  const [error, setError] = useState("");

  const [pictoProps, setPictoProps] = useState([]);
  const [illusProps, setIllusProps] = useState([]);

  const [picto1, setPicto1] = useState({ url: "", nom: "", sel: -1 });
  const [picto2, setPicto2] = useState({ url: "", nom: "", sel: -1 });
  const [illus, setIllus] = useState({ url: "", nom: "", sel: -1 });

  const [changing, setChanging] = useState(null); // null | 'picto1' | 'picto2' | 'illus'
  const [regenLoading, setRegenLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;

    const existing = article?.picto;
    const existingIllus = article?.illustration;

    // Restore if already partially generated
    if (existing?.images?.length === 2 && existingIllus?.image) {
      setPictoProps(existing.propositions || []);
      setIllusProps(existingIllus.propositions || []);
      setPicto1({ url: existing.images[0], nom: existing.nom_fichiers?.[0] || "", sel: existing.selections?.[0] || 1 });
      setPicto2({ url: existing.images[1], nom: existing.nom_fichiers?.[1] || "", sel: existing.selections?.[1] || 2 });
      setIllus({ url: existingIllus.image, nom: existingIllus.nom_fichier || "", sel: existingIllus.selection || 1 });
      setPhase("ready");
    } else {
      runAutoGeneration();
    }
  }, []);

  const runAutoGeneration = async () => {
    setError("");
    try {
      // Step 1 — Propositions pictos + auto-sélection
      setGenStep(1);
      const pictoResp = await axios.post(`${API}/propositions/pictos`, {
        titre: article.titre,
        auto_select: true,
      });
      const props = pictoResp.data.propositions;
      const sels = pictoResp.data.auto_selections?.length === 2
        ? pictoResp.data.auto_selections
        : [1, 2];
      setPictoProps(props);

      // Step 2 — Génération 2 pictos en parallèle
      setGenStep(2);
      const [r1, r2] = await Promise.all([
        axios.post(`${API}/generate/picto`, {
          proposition: props[sels[0] - 1],
          article_index: article.index,
          picto_number: 1,
          session_id: session.id,
        }),
        axios.post(`${API}/generate/picto`, {
          proposition: props[sels[1] - 1],
          article_index: article.index,
          picto_number: 2,
          session_id: session.id,
        }),
      ]);
      setPicto1({ url: r1.data.image_url, nom: r1.data.nom_fichier, sel: sels[0] });
      setPicto2({ url: r2.data.image_url, nom: r2.data.nom_fichier, sel: sels[1] });

      // Step 3 — Propositions illustrations + auto-sélection
      setGenStep(3);
      const illusResp = await axios.post(`${API}/propositions/illustrations`, {
        titre: article.titre,
        auto_select: true,
      });
      const iProps = illusResp.data.propositions;
      const iSel = illusResp.data.auto_selection > 0 ? illusResp.data.auto_selection : 1;
      setIllusProps(iProps);

      // Step 4 — Génération illustration
      setGenStep(4);
      const ir = await axios.post(`${API}/generate/illustration`, {
        proposition: iProps[iSel - 1],
        article_index: article.index,
        session_id: session.id,
      });
      setIllus({ url: ir.data.image_url, nom: ir.data.nom_fichier, sel: iSel });

      setGenStep(5);
      setPhase("ready");
    } catch (e) {
      setError("Une erreur est survenue lors de la génération. Réessayez.");
      setPhase("error");
    }
  };

  const handleChange = async (target, propNum, propText) => {
    setRegenLoading(true);
    try {
      if (target === "picto1") {
        const r = await axios.post(`${API}/generate/picto`, {
          proposition: propText,
          article_index: article.index,
          picto_number: 1,
          session_id: session.id,
        });
        setPicto1({ url: r.data.image_url, nom: r.data.nom_fichier, sel: propNum });
      } else if (target === "picto2") {
        const r = await axios.post(`${API}/generate/picto`, {
          proposition: propText,
          article_index: article.index,
          picto_number: 2,
          session_id: session.id,
        });
        setPicto2({ url: r.data.image_url, nom: r.data.nom_fichier, sel: propNum });
      } else if (target === "illus") {
        const r = await axios.post(`${API}/generate/illustration`, {
          proposition: propText,
          article_index: article.index,
          session_id: session.id,
        });
        setIllus({ url: r.data.image_url, nom: r.data.nom_fichier, sel: propNum });
      }
      setChanging(null);
    } catch {
      // keep panel open on error
    } finally {
      setRegenLoading(false);
    }
  };

  const handleValidate = async () => {
    setSubmitting(true);
    try {
      await onComplete(articleIndex, {
        picto: {
          propositions: pictoProps,
          selections: [picto1.sel, picto2.sel],
          images: [picto1.url, picto2.url],
          nom_fichiers: [picto1.nom, picto2.nom],
          valide: true,
        },
        illustration: {
          propositions: illusProps,
          selection: illus.sel,
          image: illus.url,
          nom_fichier: illus.nom,
          valide: true,
        },
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header article */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-medium text-[#3B9FE8] bg-blue-50 px-2 py-0.5 rounded-full">
            Article {articleIndex + 1} / {totalArticles}
          </span>
        </div>
        <h2 className="text-xl font-bold text-[#0F172A]" style={{ fontFamily: 'Manrope, sans-serif' }}>
          {article.titre}
        </h2>
      </div>

      {/* Phase génération */}
      {phase === "generating" && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 fade-in" data-testid="generation-progress">
          <p className="text-sm font-semibold text-gray-600 mb-4" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Génération automatique en cours…
          </p>
          <ProgressBar currentStep={genStep} />
        </div>
      )}

      {/* Phase erreur */}
      {phase === "error" && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-5 py-4">
          <p className="text-sm text-red-600 mb-3">{error}</p>
          <Button
            onClick={() => { setPhase("generating"); setGenStep(0); runAutoGeneration(); }}
            variant="outline"
            className="border-red-300 text-red-600 hover:bg-red-50"
            data-testid="btn-retry"
          >
            <RefreshCw className="w-4 h-4 mr-1" /> Réessayer
          </Button>
        </div>
      )}

      {/* Phase ready */}
      {phase === "ready" && (
        <div className="space-y-5 fade-in" data-testid="article-ready">

          {/* Pictos */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Pictos</p>
            <div className="grid grid-cols-2 gap-4">
              {/* Picto 1 */}
              <div data-testid="picto-1-block">
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  <img src={picto1.url} alt="Picto 1" className="img-picto w-full" data-testid="picto-1-img" />
                  <div className="px-3 py-2 flex items-center justify-between border-t border-gray-100">
                    <p className="text-xs text-gray-400 font-mono truncate">{picto1.nom}</p>
                    <button
                      onClick={() => setChanging(changing === "picto1" ? null : "picto1")}
                      className="text-xs text-[#3B9FE8] hover:text-[#2563EB] flex items-center gap-1 ml-2 flex-shrink-0"
                      data-testid="btn-change-picto1"
                    >
                      <RefreshCw className="w-3 h-3" /> Changer
                      {changing === "picto1" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                  </div>
                </div>
                {changing === "picto1" && (
                  <ChangePanel
                    propositions={pictoProps}
                    loading={regenLoading}
                    onSelect={(num, text) => handleChange("picto1", num, text)}
                    onClose={() => setChanging(null)}
                  />
                )}
              </div>

              {/* Picto 2 */}
              <div data-testid="picto-2-block">
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  <img src={picto2.url} alt="Picto 2" className="img-picto w-full" data-testid="picto-2-img" />
                  <div className="px-3 py-2 flex items-center justify-between border-t border-gray-100">
                    <p className="text-xs text-gray-400 font-mono truncate">{picto2.nom}</p>
                    <button
                      onClick={() => setChanging(changing === "picto2" ? null : "picto2")}
                      className="text-xs text-[#3B9FE8] hover:text-[#2563EB] flex items-center gap-1 ml-2 flex-shrink-0"
                      data-testid="btn-change-picto2"
                    >
                      <RefreshCw className="w-3 h-3" /> Changer
                      {changing === "picto2" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                  </div>
                </div>
                {changing === "picto2" && (
                  <ChangePanel
                    propositions={pictoProps}
                    loading={regenLoading}
                    onSelect={(num, text) => handleChange("picto2", num, text)}
                    onClose={() => setChanging(null)}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Illustration */}
          <div data-testid="illus-block">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Illustration 16/9</p>
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <img src={illus.url} alt="Illustration" className="img-illustration w-full" data-testid="illus-img" />
              <div className="px-4 py-2 flex items-center justify-between border-t border-gray-100">
                <p className="text-xs text-gray-400 font-mono truncate">{illus.nom}</p>
                <button
                  onClick={() => setChanging(changing === "illus" ? null : "illus")}
                  className="text-xs text-[#10B981] hover:text-green-700 flex items-center gap-1 ml-2 flex-shrink-0"
                  data-testid="btn-change-illus"
                >
                  <RefreshCw className="w-3 h-3" /> Changer
                  {changing === "illus" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
              </div>
            </div>
            {changing === "illus" && (
              <ChangePanel
                propositions={illusProps}
                loading={regenLoading}
                onSelect={(num, text) => handleChange("illus", num, text)}
                onClose={() => setChanging(null)}
              />
            )}
          </div>

          {/* Valider */}
          <div className="flex justify-end pt-2">
            <Button
              onClick={handleValidate}
              disabled={submitting}
              className="bg-[#10B981] hover:bg-green-600 text-white px-8"
              data-testid="btn-validate-article"
            >
              {submitting
                ? <><Loader2 className="w-4 h-4 spin mr-2" />Enregistrement…</>
                : articleIndex + 1 < totalArticles
                  ? <><CheckCircle2 className="w-4 h-4 mr-1.5" />Valider — Article suivant</>
                  : <><CheckCircle2 className="w-4 h-4 mr-1.5" />Valider — Voir le récap</>
              }
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
