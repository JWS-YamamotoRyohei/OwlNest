import './App.css';
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Post } from './pages/ProsAndCons';
// import Home from './pages/Home'; // Homeをデフォルトエクスポートしている場合

export const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* <Route path="/home" element={<Home />} /> */}
        <Route path="/pros-and-cons" element={<Post />} />
        <Route path="/" element={<Navigate replace to="/pros-and-cons" />} />
      </Routes>
    </BrowserRouter>
  )
}
