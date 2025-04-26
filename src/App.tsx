import './App.css';
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { DiscussionPage } from './pages/DiscussionPage';
// import Home from './pages/Home'; // Homeをデフォルトエクスポートしている場合

export const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* <Route path="/home" element={<Home />} /> */}
        <Route path="/discussion" element={<DiscussionPage />} />
        <Route path="/" element={<Navigate replace to="/owlnest" />} />
      </Routes>
    </BrowserRouter>
  )
}
