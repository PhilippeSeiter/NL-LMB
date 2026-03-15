import { useState } from "react";
import { toast } from "sonner";
import axios from "axios";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { CheckCircle2, Download, FileText, Image, Pencil, XCircle } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function SessionRecap({ session, onRename }) {
  const [titre, setTitre] = useState(session.titre);
  const [editing, setEditing] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [wordModalOpen, setWordModalOpen] = useState(false);

  const handleExport = () => {
    window.location.href = `${API}/sessions/${session.id}/export`;
    toast.info("Téléchargement ZIP démarré.");
  };

  const handleExportWord = () => setWordModalOpen(true);

  const confirmExportWord = () => {
    setWordModalOpen(false);
    window.location.href = `${API}/sessions/${session.id}/export-word`;
    toast.info("Téléchargement Word démarré.");
  };

  const handleRenameConfirm = async () => {
    const newTitre = titleDraft.trim();
    setEditing(false);
    if (!newTitre || newTitre === titre) return;
    try {
      await axios.put(`${API}/sessions/${session.id}`, { titre: newTitre });
      setTitre(newTitre);
      if (onRename) onRename(newTitre);
      toast.success("Session renommée.");
    } catch {
      toast.error("Impossible de renommer la session.");
    }
  };

  const pictoCount = session.articles.reduce(
    (acc, a) => acc + (a.picto?.images?.filter(Boolean).length || 0), 0
  );
  const illusCount = session.articles.filter(a => a.illustration?.image).length;

  return (
    <>
    <div className="space-y-6 fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-[#0F172A]" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Récapitulatif de session
          </h2>
          {editing ? (
            <input
              autoFocus
              value={titleDraft}
              onChange={e => setTitleDraft(e.target.value)}
              onBlur={handleRenameConfirm}
              onKeyDown={e => { if (e.key === "Enter") handleRenameConfirm(); if (e.key === "Escape") setEditing(false); }}
              className="text-sm text-[#3B9FE8] bg-transparent border-b border-[#3B9FE8] outline-none mt-0.5 w-72"
              data-testid="session-title-input"
            />
          ) : (
            <div className="flex items-center gap-1.5 group mt-0.5">
              <p className="text-sm text-gray-400">{titre}</p>
              <button
                onClick={() => { setTitleDraft(titre); setEditing(true); }}
                className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-[#3B9FE8] transition-opacity"
                data-testid="btn-rename-session"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
        <div className="flex gap-4 text-right">
          <div>
            <p className="text-xl font-bold text-[#3B1FA8]" style={{ fontFamily: 'Manrope, sans-serif' }}>
              {session.articles.length}
            </p>
            <p className="text-xs text-gray-400">articles</p>
          </div>
          <div>
            <p className="text-xl font-bold text-[#3B9FE8]" style={{ fontFamily: 'Manrope, sans-serif' }}>
              {pictoCount}
            </p>
            <p className="text-xs text-gray-400">pictos</p>
          </div>
          <div>
            <p className="text-xl font-bold text-[#10B981]" style={{ fontFamily: 'Manrope, sans-serif' }}>
              {illusCount}
            </p>
            <p className="text-xs text-gray-400">illustrations</p>
          </div>
        </div>
      </div>

      {/* Grille articles */}
      <div className="space-y-4" data-testid="recap-grid">
        {session.articles.map((article, i) => (
          <div
            key={i}
            className="bg-white border border-gray-200 rounded-xl overflow-hidden"
            data-testid={`recap-article-${i}`}
          >
            {/* Titre article */}
            <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-3">
              <span className="text-xs font-mono text-gray-400">
                #{String(article.index).padStart(2, "0")}
              </span>
              <p className="font-semibold text-gray-800 text-sm" style={{ fontFamily: 'Manrope, sans-serif' }}>
                {article.titre}
              </p>
            </div>

            <div className="p-4 grid grid-cols-3 gap-4">
              {/* Picto 1 */}
              <div>
                <p className="text-xs text-gray-400 mb-2 font-medium">Picto 1</p>
                {article.picto?.images?.[0] ? (
                  <img
                    src={article.picto.images[0]}
                    alt="Picto 1"
                    className="w-full aspect-square object-contain border border-gray-100 rounded-lg bg-gray-50"
                    data-testid={`recap-picto1-${i}`}
                  />
                ) : (
                  <Placeholder />
                )}
              </div>

              {/* Picto 2 */}
              <div>
                <p className="text-xs text-gray-400 mb-2 font-medium">Picto 2</p>
                {article.picto?.images?.[1] ? (
                  <img
                    src={article.picto.images[1]}
                    alt="Picto 2"
                    className="w-full aspect-square object-contain border border-gray-100 rounded-lg bg-gray-50"
                    data-testid={`recap-picto2-${i}`}
                  />
                ) : (
                  <Placeholder />
                )}
              </div>

              {/* Illustration */}
              <div>
                <p className="text-xs text-gray-400 mb-2 font-medium">Illustration 16/9</p>
                {article.illustration?.image ? (
                  <img
                    src={article.illustration.image}
                    alt="Illustration"
                    className="w-full aspect-video object-cover border border-gray-100 rounded-lg bg-gray-50"
                    data-testid={`recap-illus-${i}`}
                  />
                ) : (
                  <Placeholder ratio="video" />
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Export */}
      <div className="flex flex-wrap justify-center gap-3 pt-2 pb-6">
        <Button
          onClick={handleExport}
          className="h-12 px-10 text-base bg-[#3B9FE8] hover:bg-[#2563EB] text-white rounded-lg shadow-sm"
          data-testid="btn-export-zip"
        >
          <Download className="w-5 h-5 mr-2" />
          Exporter le ZIP
        </Button>
        <Button
          onClick={handleExportWord}
          variant="outline"
          className="h-12 px-10 text-base border-[#3B1FA8] text-[#3B1FA8] hover:bg-[#3B1FA8] hover:text-white rounded-lg shadow-sm"
          data-testid="btn-export-word"
        >
          <FileText className="w-5 h-5 mr-2" />
          Exporter Word
        </Button>
      </div>
    </div>

    {/* Modale aperçu Word */}
    <Dialog open={wordModalOpen} onOpenChange={setWordModalOpen}>
      <DialogContent className="sm:max-w-md" data-testid="word-preview-modal">
        <DialogHeader>
          <DialogTitle className="text-base font-bold" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Aperçu avant export Word
          </DialogTitle>
          <p className="text-xs text-gray-400 mt-1">
            {session.articles.length} article(s) — vérifiez que tous les visuels sont présents.
          </p>
        </DialogHeader>

        <div className="space-y-1 py-1 max-h-72 overflow-y-auto">
          {session.articles.map((art, i) => {
            const hasPictos = (art.picto?.images?.filter(Boolean).length || 0) >= 2;
            const hasIllus = !!art.illustration?.image;
            return (
              <div
                key={i}
                className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0"
                data-testid={`word-preview-article-${i}`}
              >
                <span className="text-sm text-gray-700 truncate mr-3 font-medium" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  {String(art.index || i + 1).padStart(2, "0")}. {art.titre}
                </span>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded font-medium ${
                    hasPictos ? "bg-green-50 text-green-600" : "bg-red-50 text-red-400"
                  }`}>
                    {hasPictos
                      ? <CheckCircle2 className="w-3 h-3" />
                      : <XCircle className="w-3 h-3" />
                    }
                    Pictos
                  </span>
                  <span className={`flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded font-medium ${
                    hasIllus ? "bg-green-50 text-green-600" : "bg-red-50 text-red-400"
                  }`}>
                    {hasIllus
                      ? <CheckCircle2 className="w-3 h-3" />
                      : <XCircle className="w-3 h-3" />
                    }
                    Illus.
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <DialogFooter className="mt-2">
          <Button variant="ghost" onClick={() => setWordModalOpen(false)} className="text-gray-400"
            data-testid="word-preview-cancel">
            Annuler
          </Button>
          <Button
            onClick={confirmExportWord}
            className="bg-[#3B1FA8] hover:bg-purple-800 text-white"
            data-testid="word-preview-confirm"
          >
            <FileText className="w-4 h-4 mr-1.5" /> Confirmer l'export
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}

function Placeholder({ ratio = "square" }) {
  return (
    <div className={`w-full ${ratio === "video" ? "aspect-video" : "aspect-square"} border border-dashed border-gray-200 rounded-lg flex items-center justify-center bg-gray-50`}>
      <Image className="w-5 h-5 text-gray-300" />
    </div>
  );
}
