import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Upload, FolderOpen, Zap, Star, ArrowRight } from "lucide-react";

const LOGO_URL = "https://customer-assets.emergentagent.com/job_lmb-illustrations/artifacts/xiaswxau_avatar%20logo%20artyplanet%20d.png";

const ENGINES = [
  {
    id: "fal",
    icon: Zap,
    label: "Rapide",
    subtitle: "Génération rapide, bon rendu",
    badge: "FAL.ai Flux",
    color: "blue",
  },
  {
    id: "openai",
    icon: Star,
    label: "Qualité",
    subtitle: "Meilleur rendu, plus lent",
    badge: "OpenAI gpt-image-1",
    color: "purple",
  },
];

export default function HomePage() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [engine, setEngine] = useState("fal");

  const handleConfirm = () => {
    setOpen(false);
    navigate("/session/new", { state: { engine } });
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center px-4">
      <div className="max-w-lg w-full text-center fade-in">
        <img
          src={LOGO_URL}
          alt="Artyplanet"
          className="w-24 h-24 mx-auto mb-8 object-contain"
          data-testid="logo-artyplanet"
        />

        <h1
          className="text-3xl font-bold tracking-tight text-[#3B1FA8] mb-3 leading-tight"
          style={{ fontFamily: 'Manrope, sans-serif' }}
          data-testid="home-title"
        >
          Bienvenue sur l'assistant illustration de la newsletter
        </h1>
        <p
          className="text-xl font-semibold text-[#3B9FE8] mb-10"
          style={{ fontFamily: 'Manrope, sans-serif' }}
          data-testid="home-subtitle"
        >
          Les Maîtres Bâtisseurs
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            onClick={() => setOpen(true)}
            className="h-12 px-8 text-base font-semibold bg-[#3B9FE8] hover:bg-[#2563EB] text-white rounded-lg shadow-sm transition-all"
            data-testid="btn-import-articles"
          >
            <Upload className="w-5 h-5 mr-2" />
            Importer les articles
          </Button>

          <Button
            onClick={() => navigate("/sessions")}
            variant="outline"
            className="h-12 px-8 text-base font-semibold border-[#3B1FA8] text-[#3B1FA8] hover:bg-[#3B1FA8] hover:text-white rounded-lg transition-all"
            data-testid="btn-open-session"
          >
            <FolderOpen className="w-5 h-5 mr-2" />
            Ouvrir une session
          </Button>
        </div>
      </div>

      <footer className="absolute bottom-6 text-xs text-gray-400" style={{ fontFamily: 'Inter, sans-serif' }}>
        Artyplanet — Les Maîtres Bâtisseurs
      </footer>

      {/* Modale choix moteur */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md" data-testid="engine-modal">
          <DialogHeader>
            <DialogTitle
              className="text-lg font-bold text-[#0F172A]"
              style={{ fontFamily: 'Manrope, sans-serif' }}
            >
              Choisir le moteur de génération
            </DialogTitle>
            <p className="text-sm text-gray-400 mt-1">
              Ce choix s'applique à toutes les images de la session.
            </p>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-3 py-2">
            {ENGINES.map((e) => {
              const Icon = e.icon;
              const selected = engine === e.id;
              return (
                <button
                  key={e.id}
                  onClick={() => setEngine(e.id)}
                  className={`relative rounded-xl border-2 p-4 text-left transition-all ${
                    selected
                      ? e.color === "blue"
                        ? "border-[#3B9FE8] bg-blue-50"
                        : "border-[#3B1FA8] bg-purple-50"
                      : "border-gray-200 bg-white hover:border-gray-300"
                  }`}
                  data-testid={`engine-option-${e.id}`}
                >
                  {selected && (
                    <span className={`absolute top-2 right-2 w-2 h-2 rounded-full ${
                      e.color === "blue" ? "bg-[#3B9FE8]" : "bg-[#3B1FA8]"
                    }`} />
                  )}
                  <Icon className={`w-5 h-5 mb-2 ${
                    selected
                      ? e.color === "blue" ? "text-[#3B9FE8]" : "text-[#3B1FA8]"
                      : "text-gray-400"
                  }`} />
                  <p className={`font-bold text-sm ${
                    selected
                      ? e.color === "blue" ? "text-[#3B9FE8]" : "text-[#3B1FA8]"
                      : "text-gray-700"
                  }`} style={{ fontFamily: 'Manrope, sans-serif' }}>
                    {e.label}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5 leading-snug">{e.subtitle}</p>
                  <p className={`text-xs font-mono mt-2 ${
                    selected
                      ? e.color === "blue" ? "text-[#3B9FE8]" : "text-[#3B1FA8]"
                      : "text-gray-300"
                  }`}>
                    {e.badge}
                  </p>
                </button>
              );
            })}
          </div>

          <DialogFooter className="mt-2">
            <Button
              variant="ghost"
              onClick={() => setOpen(false)}
              className="text-gray-400"
              data-testid="engine-modal-cancel"
            >
              Annuler
            </Button>
            <Button
              onClick={handleConfirm}
              className="bg-[#3B9FE8] hover:bg-[#2563EB] text-white"
              data-testid="engine-modal-confirm"
            >
              Continuer <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
