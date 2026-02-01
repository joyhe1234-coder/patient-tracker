import { useParams, useNavigate } from 'react-router-dom';

export default function ImportPreviewPage() {
  const { previewId } = useParams<{ previewId: string }>();
  const navigate = useNavigate();

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Import Preview</h1>
        <p className="text-gray-600 mb-4">
          Preview ID: <code className="bg-gray-100 px-2 py-1 rounded">{previewId}</code>
        </p>
        <p className="text-gray-500">
          Preview page coming soon (Phase 5k)...
        </p>
        <div className="mt-6">
          <button
            onClick={() => navigate('/import')}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            Back to Import
          </button>
        </div>
      </div>
    </div>
  );
}
