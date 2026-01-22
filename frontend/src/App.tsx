import { BrowserRouter, Routes, Route } from 'react-router-dom';
import MainPage from './pages/MainPage';
import HillMeasureMapping from './pages/HillMeasureMapping';
import Header from './components/layout/Header';

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />
        <main className="flex-1 flex flex-col">
          <Routes>
            <Route path="/" element={<MainPage />} />
            <Route path="/hill-mapping" element={<HillMeasureMapping />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
