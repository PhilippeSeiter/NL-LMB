import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import HomePage from "@/components/HomePage";
import SessionList from "@/components/SessionList";
import NewSession from "@/components/NewSession";

function App() {
  return (
    <div className="App min-h-screen bg-[#F8FAFC]">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/sessions" element={<SessionList />} />
          <Route path="/session/new" element={<NewSession />} />
          <Route path="/session/:sessionId" element={<NewSession />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
