import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Upload, FolderOpen } from "lucide-react";

const LOGO_URL = "https://customer-assets.emergentagent.com/job_lmb-illustrations/artifacts/xiaswxau_avatar%20logo%20artyplanet%20d.png";

export default function HomePage() {
  const navigate = useNavigate();

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
            onClick={() => navigate("/session/new")}
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
    </div>
  );
}
