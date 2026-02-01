import { BrowserRouter, Routes, Route } from 'react-router-dom';
import MainPage from './pages/MainPage';
import HillMeasureMapping from './pages/HillMeasureMapping';
import ImportTestPage from './pages/ImportTestPage';
import ImportPage from './pages/ImportPage';
import ImportPreviewPage from './pages/ImportPreviewPage';
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
            <Route path="/import-test" element={<ImportTestPage />} />
            <Route path="/import" element={<ImportPage />} />
            <Route path="/import/preview/:previewId" element={<ImportPreviewPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
