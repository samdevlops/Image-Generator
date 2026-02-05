
import React, { useState, useCallback, useEffect } from 'react';
import { TabMode, AspectRatio, UploadedFile } from './types';
// Fix: Removed redundant `import * as geminiService` to prevent type resolution issues.
import { analyzeImage, editImage, generateImage, generateVideo } from './services/geminiService';

const PhotoIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
);

const WandIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
);

const SparklesIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    </svg>
);

const VideoCameraIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
);

const XCircleIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2 2m2-2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const LoadingSpinner: React.FC = () => (
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400"></div>
);

interface TabButtonProps {
    label: string;
    isActive: boolean;
    onClick: () => void;
    icon: React.ReactNode;
}

const TabButton: React.FC<TabButtonProps> = ({ label, isActive, onClick, icon }) => (
    <button
        onClick={onClick}
        className={`flex items-center justify-center sm:justify-start gap-3 px-3 py-2 sm:px-4 sm:py-3 text-sm sm:text-base font-medium rounded-lg transition-all duration-200 ${isActive
                ? 'bg-purple-600 text-white shadow-lg'
                : 'text-gray-300 hover:bg-gray-700 hover:text-white'
            }`}
    >
        {icon}
        <span className="hidden sm:inline">{label}</span>
    </button>
);

const App: React.FC = () => {
    const [activeTab, setActiveTab] = useState<TabMode>(TabMode.EDIT);
    const [prompt, setPrompt] = useState('');
    const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
    const [generatedContent, setGeneratedContent] = useState<{ image?: string; text?: string; video?: string } | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1');
    const [hasApiKey, setHasApiKey] = useState<boolean | null>(null);

    const checkApiKey = useCallback(async () => {
        if (activeTab === TabMode.VIDEO) {
            if (typeof window.aistudio?.hasSelectedApiKey === 'function') {
                const keyStatus = await window.aistudio.hasSelectedApiKey();
                setHasApiKey(keyStatus);
            } else {
                setHasApiKey(true); // Assume key exists if aistudio is not present
            }
        }
    }, [activeTab]);

    useEffect(() => {
        checkApiKey();
    }, [activeTab, checkApiKey]);


    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files) {
            const files = Array.from(event.target.files);
            const newUploadedFilesPromises = files.map(file => {
                return new Promise<UploadedFile>(resolve => {
                    const reader = new FileReader();
                    reader.onload = () => {
                        const dataUrl = reader.result as string;
                        resolve({
                            file,
                            preview: dataUrl,
                            base64: dataUrl.split(',')[1],
                        });
                    };
                    reader.readAsDataURL(file);
                });
            });

            Promise.all(newUploadedFilesPromises).then(newFiles => {
                if (activeTab === TabMode.EDIT) {
                    setUploadedFiles(prev => [...prev, ...newFiles]);
                } else {
                    setUploadedFiles(newFiles.slice(0, 1));
                }
            });
        }
    };

    const handleRemoveFile = (indexToRemove: number) => {
        setUploadedFiles(currentFiles =>
            currentFiles.filter((_, index) => index !== indexToRemove)
        );
    };
    
    const onProgress = (message: string) => {
        setLoadingMessage(message);
    };

    const handleSelectKey = async () => {
        await window.aistudio.openSelectKey();
        setHasApiKey(true); // Assume success to unblock UI
    };

    const handleSubmit = async () => {
        if (!prompt && activeTab !== TabMode.ANALYZE) {
            setError('Please enter a prompt.');
            return;
        }
        if (uploadedFiles.length === 0 && (activeTab === TabMode.EDIT || activeTab === TabMode.ANALYZE || activeTab === TabMode.VIDEO)) {
            setError('Please upload at least one image.');
            return;
        }

        setIsLoading(true);
        setGeneratedContent(null);
        setError(null);
        setLoadingMessage('Waking up the AI...');

        try {
            switch (activeTab) {
                case TabMode.EDIT:
                    const editedImage = await editImage(prompt, uploadedFiles.map(f => f.file));
                    setGeneratedContent({ image: `data:image/png;base64,${editedImage}` });
                    break;
                case TabMode.GENERATE:
                    const newImage = await generateImage(prompt, aspectRatio);
                    setGeneratedContent({ image: `data:image/png;base64,${newImage}` });
                    break;
                case TabMode.ANALYZE:
                    const analysis = await analyzeImage(prompt || "Describe this image in detail.", uploadedFiles[0].file);
                    setGeneratedContent({ text: analysis });
                    break;
                case TabMode.VIDEO:
                    try {
                        const videoUrl = await generateVideo(prompt, uploadedFiles[0].file, aspectRatio === '9:16' ? '9:16' : '16:9', onProgress);
                        setGeneratedContent({ video: videoUrl });
                    } catch (e: any) {
                        if (e.message.includes("Requested entity was not found")) {
                            setError("API Key error. Please re-select your API key.");
                            setHasApiKey(false);
                        } else {
                            throw e;
                        }
                    }
                    break;
            }
        } catch (err) {
            console.error(err);
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
        } finally {
            setIsLoading(false);
            setLoadingMessage('');
        }
    };

    const TABS = [
        { id: TabMode.EDIT, label: 'Edit Image', icon: <WandIcon /> },
        { id: TabMode.GENERATE, label: 'Generate Image', icon: <SparklesIcon /> },
        { id: TabMode.ANALYZE, label: 'Analyze Image', icon: <PhotoIcon /> },
        { id: TabMode.VIDEO, label: 'Generate Video', icon: <VideoCameraIcon /> },
    ];
    
    const needsImageUpload = [TabMode.EDIT, TabMode.ANALYZE, TabMode.VIDEO].includes(activeTab);
    const isMultiUpload = activeTab === TabMode.EDIT;
    const needsAspectRatio = [TabMode.GENERATE, TabMode.VIDEO].includes(activeTab);

    return (
        <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col font-sans">
            <header className="bg-gray-800/30 backdrop-blur-sm shadow-lg p-4 sticky top-0 z-10">
                <h1 className="text-2xl md:text-3xl font-bold text-center text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">
                    Gemini AI Photo & Video Studio
                </h1>
            </header>

            <div className="flex flex-1 flex-col sm:flex-row">
                <nav className="bg-gray-800 p-2 sm:p-4">
                    <div className="flex sm:flex-col gap-2">
                        {TABS.map(tab => (
                            <TabButton
                                key={tab.id}
                                label={tab.label}
                                isActive={activeTab === tab.id}
                                onClick={() => {
                                    setActiveTab(tab.id);
                                    setUploadedFiles([]);
                                    setGeneratedContent(null);
                                    setError(null);
                                    setPrompt('');
                                }}
                                icon={tab.icon}
                            />
                        ))}
                    </div>
                </nav>

                <main className="flex-1 p-4 md:p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Controls Column */}
                    <div className="bg-gray-800 rounded-xl p-6 flex flex-col gap-6 h-fit">
                        <h2 className="text-xl font-semibold text-purple-300">{TABS.find(t => t.id === activeTab)?.label}</h2>
                        
                        <textarea
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder={activeTab === TabMode.ANALYZE ? "Optional: ask something specific about the image..." : "Describe what you want to create or change..."}
                            className="w-full h-32 p-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none transition"
                        />

                        {needsImageUpload && (
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    {isMultiUpload ? 'Upload Image(s)' : 'Upload Image'}
                                </label>
                                <input
                                    type="file"
                                    multiple={isMultiUpload}
                                    accept="image/*"
                                    onChange={handleFileChange}
                                    className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-500 file:text-white hover:file:bg-purple-600"
                                />
                                {uploadedFiles.length > 0 && (
                                    <div className="mt-4 grid grid-cols-3 gap-2">
                                        {uploadedFiles.map((uf, index) => (
                                            <div key={index} className="relative group">
                                                <img src={uf.preview} alt={`upload preview ${index + 1}`} className="w-full h-24 object-cover rounded-md" />
                                                <button
                                                    onClick={() => handleRemoveFile(index)}
                                                    className="absolute top-1 right-1 bg-black bg-opacity-60 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity duration-200"
                                                    aria-label={`Remove image ${index + 1}`}
                                                >
                                                    <XCircleIcon className="w-5 h-5" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {needsAspectRatio && (
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Aspect Ratio</label>
                                <div className="flex gap-2">
                                    {(activeTab === TabMode.GENERATE ? ['1:1', '16:9', '9:16', '4:3', '3:4'] : ['16:9', '9:16']).map(ratio => (
                                        <button
                                            key={ratio}
                                            onClick={() => setAspectRatio(ratio as AspectRatio)}
                                            className={`px-3 py-1 rounded-full text-sm font-medium transition ${aspectRatio === ratio ? 'bg-purple-600 text-white' : 'bg-gray-700 hover:bg-gray-600'}`}
                                        >
                                            {ratio}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                        
                        {activeTab === TabMode.VIDEO && hasApiKey === false && (
                             <div className="flex flex-col items-center gap-2 p-4 bg-yellow-900/50 border border-yellow-700 rounded-lg">
                                 <p className="text-sm text-center text-yellow-200">Video generation requires an API key with an associated billing account.</p>
                                  <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline text-xs">Learn about billing</a>
                                 <button
                                     onClick={handleSelectKey}
                                     className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg transition-transform transform active:scale-95 disabled:opacity-50"
                                >
                                     Select API Key
                                 </button>
                             </div>
                         )}

                        <button
                            onClick={handleSubmit}
                            disabled={isLoading || (activeTab === TabMode.VIDEO && !hasApiKey)}
                            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-3 px-4 rounded-lg transition-transform transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isLoading ? 'Generating...' : 'Generate'}
                        </button>

                    </div>

                    {/* Output Column */}
                    <div className="bg-gray-800 rounded-xl p-6 flex items-center justify-center min-h-[400px] md:min-h-0">
                        {isLoading ? (
                            <div className="flex flex-col items-center gap-4 text-center">
                                <LoadingSpinner />
                                <p className="text-purple-300 font-medium">{loadingMessage || 'Processing your request...'}</p>
                            </div>
                        ) : error ? (
                            <div className="text-center text-red-400 bg-red-900/50 p-4 rounded-lg">
                                <h3 className="font-bold mb-2">Error</h3>
                                <p>{error}</p>
                            </div>
                        ) : generatedContent ? (
                            <div className="w-full h-full">
                                {generatedContent.image && (
                                    <div className="flex flex-col gap-4 items-center h-full">
                                        <img src={generatedContent.image} alt="Generated content" className="max-w-full max-h-[80%] object-contain rounded-lg" />
                                        <a href={generatedContent.image} download="generated-image.png" className="mt-auto bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-lg transition">Download</a>
                                    </div>
                                )}
                                {generatedContent.text && (
                                    <div className="prose prose-invert prose-p:text-gray-300 prose-headings:text-purple-300 max-w-none p-4 bg-gray-700/50 rounded-lg overflow-y-auto h-full">
                                        <p>{generatedContent.text}</p>
                                    </div>
                                )}
                                {generatedContent.video && (
                                    <div className="flex flex-col gap-4 items-center h-full w-full">
                                        <video src={generatedContent.video} controls autoPlay loop className="max-w-full max-h-[80%] rounded-lg"></video>
                                        <a href={generatedContent.video} download="generated-video.mp4" className="mt-auto bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-lg transition">Download</a>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="text-center text-gray-500 flex flex-col items-center gap-4">
                                <div className="p-4 bg-gray-700/50 rounded-full">
                                    <SparklesIcon className="w-16 h-16 text-purple-400" />
                                </div>
                                <p>Your creative masterpiece will appear here.</p>
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default App;
