import { createRoot } from "react-dom/client";
import { HashRouter, Routes, Route } from "react-router-dom";
import SettingsWindow from "./windows/SettingsWindow";
import SelectionWindow from "./windows/SelectionWindow";
import ResultWindow from "./windows/ResultWindow";

const root = document.getElementById("root")!;

createRoot(root).render(
  <HashRouter>
    <Routes>
      <Route path="/" element={<SettingsWindow />} />
      <Route path="/selection" element={<SelectionWindow />} />
      <Route path="/result" element={<ResultWindow />} />
    </Routes>
  </HashRouter>
);