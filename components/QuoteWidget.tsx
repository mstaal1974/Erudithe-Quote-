import React, { useState, useMemo, ChangeEvent } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { ProjectType, COSTS_PER_PAGE, PAGES_PER_HOUR } from '../constants';
import { Quote, StoredFile } from '../types';
import Input from './ui/Input';
import Button from './ui/Button';
import Card from './ui/Card';
import Modal from './ui/Modal';
// FIX: Separate Firebase value and type imports.
// FIX: Changed firebase imports to use the scoped @firebase packages to resolve module loading issues.
import { ref, uploadBytes, getDownloadURL } from '@firebase/storage';
import type { FirebaseStorage } from '@firebase/storage';

declare global {
  interface Window {
    PDFLib: any;
  }
}

interface QuoteWidgetProps {
  storage: FirebaseStorage;
  onAddQuote: (quote: Omit<Quote, 'id' | 'createdAt' | 'status'>) => void;
  onSwitchToLogin: () => void;
}

const fileToStoredFile = async (file: File, storage: FirebaseStorage): Promise<StoredFile> => {
    // 1. Upload the file to Firebase Storage
    const storageRef = ref(storage, `quote-files/${Date.now()}-${file.name}`);
    const snapshot = await uploadBytes(storageRef, file);

    // 2. Get the download URL
    const downloadURL = await getDownloadURL(snapshot.ref);

    // 3. Return the StoredFile object
    return {
        name: file.name,
        downloadURL: downloadURL,
        uploadedAt: new Date().toISOString(),
    };
};

// Helper to get base64 for AI analysis
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = error => reject(error);
  });
};

const QuoteWidget: React.FC<QuoteWidgetProps> = ({ storage, onAddQuote, onSwitchToLogin }) => {
  const [projectType, setProjectType] = useState<ProjectType>(ProjectType.SIMPLE);
  const [pageCount, setPageCount] = useState<number>(10);
  const [userDetails, setUserDetails] = useState({ name: '', email: '', company: '', phone: '' });
  const [sourceFiles, setSourceFiles] = useState<StoredFile[]>([]);
  const [rawFilesForAI, setRawFilesForAI] = useState<File[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAiAnalyzing, setIsAiAnalyzing] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [aiSuggestion, setAiSuggestion] = useState<ProjectType | null>(null);
  const [aiSuggestionRationale, setAiSuggestionRationale] = useState<string | null>(null);
  const [isReviewOpen, setIsReviewOpen] = useState(false);

  const quote = useMemo(() => {
    const cost = pageCount * COSTS_PER_PAGE[projectType];
    const hours = pageCount / PAGES_PER_HOUR[projectType];
    return { cost, hours };
  }, [projectType, pageCount]);

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    setAiSummary(null);
    setAiSuggestion(null);
    setAiSuggestionRationale(null);

    if (!e.target.files || e.target.files.length === 0) {
      setSourceFiles([]);
      setRawFilesForAI([]);
      setPageCount(10); // Reset to default
      return;
    }

    setIsLoading(true);
    const files = Array.from(e.target.files);
    setRawFilesForAI(files); // Save raw files for AI processing
    let totalPages = 0;

    if (!window.PDFLib) {
        console.error("pdf-lib.js is not loaded.");
        alert("Could not count pages automatically. Please enter the count manually.");
        setIsLoading(false);
        return;
    }

    try {
        const { PDFDocument } = window.PDFLib;

        for (const file of files as File[]) {
            if (file.type !== 'application/pdf') {
                console.warn(`File "${file.name}" is not a PDF and was skipped for page counting.`);
                continue;
            }
            const arrayBuffer = await file.arrayBuffer();
            const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
            totalPages += pdfDoc.getPageCount();
        }

        if (totalPages > 0) {
            setPageCount(totalPages);
        } else if (files.some((f: File) => f.type !== 'application/pdf')) {
            alert('Some files were not PDFs. Please review the page count and adjust manually if needed.')
        }
    } catch (error) {
        console.error("Error counting PDF pages:", error);
        alert("There was an error processing a PDF file. Please enter the page count manually.");
    } finally {
        setIsLoading(false);
    }

    // AI Analysis
    if (files.length > 0) {
        setIsAiAnalyzing(true);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            // FIX: Explicitly type the 'file' parameter to prevent TypeScript from inferring it as 'unknown'.
            const filePartsPromises = files.map(async (file: File) => {
                const mimeType = file.type;
                const supportedMimeTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/heic', 'image/heif', 'application/pdf'];
                
                if (!supportedMimeTypes.includes(mimeType)) return null;
                const base64Data = await fileToBase64(file);
                return {
                    inlineData: { data: base64Data, mimeType },
                };
            });

            const fileParts = (await Promise.all(filePartsPromises)).filter(Boolean);

            if(fileParts.length > 0) {
                const prompt = `Analyze the content and design of the provided document(s) for an e-learning conversion project.

Project Type Options:
- 'Simple Conversion': For straightforward text/image transfers with no new design.
- 'Creative Redesign': For documents needing a significant visual overhaul or a more engaging UX, like marketing materials.
- 'Instructional Upgrade': For educational materials that would benefit from added interactivity, assessments, or a structured learning path.

Provide your analysis in a JSON format with the following structure:
1.  **summary**: A concise, one-paragraph summary of the document's core content.
2.  **analysis**: An object with:
    - **design**: A brief analysis of the visual design (e.g., "minimalist," "corporate," "text-heavy").
    - **complexity**: A description of format complexity (e.g., presence of complex charts, text density, diagrams).
    - **instructionalLanguage**: A boolean indicating if instructional or educational language is used.
3.  **suggestedProjectType**: The most appropriate project type from the options above.
4.  **suggestionRationale**: A single sentence explaining the suggestion, referencing your analysis. Example: "A 'Creative Redesign' is recommended due to the high density of complex diagrams."

Return ONLY the JSON object.`;

                 const responseSchema = {
                    type: Type.OBJECT,
                    properties: {
                        summary: { type: Type.STRING, description: "A concise, one-paragraph summary of the document's content." },
                        analysis: {
                            type: Type.OBJECT,
                            properties: {
                                design: { type: Type.STRING, description: "A brief analysis of the document's visual design." },
                                complexity: { type: Type.STRING, description: "An analysis of the document's format complexity, noting things like charts, text density, and structure." },
                                instructionalLanguage: { type: Type.BOOLEAN, description: "True if the document uses instructional or educational language." }
                            },
                            required: ['design', 'complexity', 'instructionalLanguage']
                        },
                        suggestedProjectType: { type: Type.STRING, enum: Object.values(ProjectType) },
                        suggestionRationale: { type: Type.STRING, description: "A one-sentence reason for the project type suggestion, based on the analysis." }
                    },
                    required: ['summary', 'analysis', 'suggestedProjectType', 'suggestionRationale']
                };

                const response = await ai.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: { parts: [{ text: prompt }, ...fileParts] },
                    config: {
                        responseMimeType: "application/json",
                        responseSchema: responseSchema,
                    },
                });
                
                const resultJson = JSON.parse(response.text);

                if (resultJson.suggestedProjectType && resultJson.summary && resultJson.suggestionRationale) {
                    const suggestedType = resultJson.suggestedProjectType as ProjectType;
                    setProjectType(suggestedType);
                    setAiSuggestion(suggestedType);
                    setAiSummary(resultJson.summary);
                    setAiSuggestionRationale(resultJson.suggestionRationale);
                }
            }
        } catch (error) {
            console.error("AI analysis failed:", error);
        } finally {
            setIsAiAnalyzing(false);
        }
    }
  };

  const handleClearFiles = () => {
    setSourceFiles([]);
    setRawFilesForAI([]);
    setPageCount(10);
    setAiSummary(null);
    setAiSuggestion(null);
    setAiSuggestionRationale(null);
    const fileInput = document.getElementById('files') as HTMLInputElement;
    if (fileInput) {
        fileInput.value = '';
    }
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setUserDetails(prev => ({ ...prev, [id]: value }));
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading || isAiAnalyzing || rawFilesForAI.length === 0) {
        if (rawFilesForAI.length === 0) {
            alert("Please upload at least one source file.");
        }
        return;
    };
    setIsReviewOpen(true);
  };

  const handleApproveQuote = async () => {
    setIsLoading(true);
    // Upload files to storage before creating the quote
    const uploadedFiles = await Promise.all(rawFilesForAI.map(file => fileToStoredFile(file, storage)));

    const newQuote: Omit<Quote, 'id' | 'createdAt' | 'status'> = {
      projectType,
      pageCount,
      totalCost: quote.cost,
      timeAllowance: Math.ceil(quote.hours),
      userDetails,
      sourceFiles: uploadedFiles,
      aiSummary: aiSummary || undefined,
      aiSuggestionRationale: aiSuggestionRationale || undefined,
    };
    await onAddQuote(newQuote);
    setIsReviewOpen(false);
    setIsLoading(false);
  }

  const loadingMessage = useMemo(() => {
    if (isAiAnalyzing) return 'AI is analyzing content...';
    if (isLoading) return 'Processing files...';
    return null;
  }, [isLoading, isAiAnalyzing]);


  return (
    <Card className="w-full max-w-4xl">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-[#433e3c]">Instant Project Quote</h2>
        <p className="text-stone-500 mt-2">Get an estimate for your e-learning project.</p>
        <p className="text-sm mt-4">Already a client? <button onClick={onSwitchToLogin} className="font-medium text-[#195606] hover:text-green-800">Log in here</button></p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
          {/* Left Side: Form */}
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-[#433e3c] mb-1">Project Type</label>
              <div className="grid grid-cols-3 gap-2">
                {Object.values(ProjectType).map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setProjectType(type)}
                    className={`px-3 py-2 text-sm rounded-md transition-all border ${
                      projectType === type 
                        ? 'bg-[#195606] text-white border-transparent shadow-md' 
                        : 'bg-white text-stone-700 hover:bg-stone-50 border-stone-300'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
               {aiSuggestion && (
                    <div className="mt-2 text-center text-sm bg-green-50 p-2 rounded-md border border-green-200">
                        <p className="text-green-800">
                            <span className="font-semibold">AI Suggestion:</span> {aiSuggestion}
                        </p>
                        {aiSuggestionRationale && (
                            <p className="text-green-700 mt-1 text-xs italic">"{aiSuggestionRationale}"</p>
                        )}
                    </div>
                )}
            </div>

            <Input
              label="Number of Pages"
              id="pageCount"
              type="number"
              value={pageCount}
              onChange={e => setPageCount(parseInt(e.target.value, 10) || 1)}
              min="1"
              required
              />

            <div className="border-t border-stone-200 pt-6 space-y-4">
                <h3 className="text-lg font-semibold text-[#433e3c]">Your Details</h3>
                <Input label="Full Name" id="name" value={userDetails.name} onChange={handleInputChange} required />
                <Input label="Email Address" id="email" type="email" value={userDetails.email} onChange={handleInputChange} required />
                <Input label="Company" id="company" value={userDetails.company} onChange={handleInputChange} required />
                <Input label="Phone Number" id="phone" type="tel" value={userDetails.phone} onChange={handleInputChange} />
            </div>
          </div>

          {/* Right Side: Quote Summary */}
          <div className="bg-stone-50 p-6 rounded-lg flex flex-col">
            <h3 className="text-xl font-bold text-[#433e3c] mb-4">Your Estimate</h3>
            <div className="flex-grow space-y-4">
              <div className="flex justify-between items-baseline">
                <span className="text-stone-600">Estimated Hours:</span>
                <span className="text-xl font-semibold text-[#433e3c]">{Math.ceil(quote.hours)} hours</span>
              </div>
              <div className="text-xs text-stone-500 pt-2 border-t mt-4">
                <p><strong>{ProjectType.SIMPLE}:</strong> A direct, like-for-like conversion of content.</p>
                <p><strong>{ProjectType.REDESIGN}:</strong> Reimagining the visual design and user experience.</p>
                <p><strong>{ProjectType.UPGRADE}:</strong> Adding new instructional elements and interactivity.</p>
              </div>
            </div>
            <div className="space-y-3 mt-6">
               <div>
                  <label htmlFor="files" className="block text-sm font-medium text-[#433e3c] mb-1">Upload Source Files (PDFs recommended)</label>
                  <input id="files" type="file" multiple onChange={handleFileChange} className="block w-full text-sm text-stone-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-stone-200 file:text-stone-700 hover:file:bg-stone-300"/>
                  {loadingMessage && <p className="text-sm text-stone-500 mt-2">{loadingMessage}</p>}
                  {rawFilesForAI.length > 0 && (
                      <div className="mt-2">
                          <ul className="text-xs list-disc pl-5 text-stone-600">
                              {rawFilesForAI.map(f => <li key={f.name}>{f.name}</li>)}
                          </ul>
                          <button type="button" onClick={handleClearFiles} className="text-xs text-red-600 hover:underline mt-1">Clear</button>
                      </div>
                  )}
               </div>
              <Button type="submit" disabled={isLoading || isAiAnalyzing || !userDetails.name || !userDetails.email} className="w-full">
                {isAiAnalyzing ? 'AI Analyzing...' : isLoading ? 'Processing...' : 'Generate Quote'}
              </Button>
            </div>
          </div>
        </div>
      </form>

      <Modal isOpen={isReviewOpen} onClose={() => setIsReviewOpen(false)}>
        <div className="text-center">
            <h2 className="text-2xl font-bold text-[#433e3c] mb-2">Quote Summary</h2>
            <p className="text-stone-500">Please review your project estimate below.</p>
        </div>
        <div className="bg-stone-50 p-6 rounded-lg my-6 space-y-4">
            <div className="flex justify-between items-baseline">
                <span className="text-stone-600">Total Cost:</span>
                <span className="text-3xl font-bold text-[#195606]">${quote.cost.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-baseline">
                <span className="text-stone-600">Estimated Hours:</span>
                <span className="text-xl font-semibold text-[#433e3c]">{Math.ceil(quote.hours)} hours</span>
            </div>
        </div>
        <div className="flex flex-col sm:flex-row justify-center items-center gap-3">
            <Button onClick={handleApproveQuote} variant="primary" className="w-full sm:w-auto" disabled={isLoading}>
                {isLoading ? 'Submitting...' : 'Approve Quote'}
            </Button>
            <a href={`mailto:mstaal@blocksure.com.au?subject=Discovery Call Request for ${userDetails.company}`} className="w-full sm:w-auto">
              <Button variant="secondary" className="w-full">Book Discovery Call</Button>
            </a>
            <Button onClick={() => setIsReviewOpen(false)} variant="danger" className="w-full sm:w-auto">Reject</Button>
        </div>
      </Modal>

    </Card>
  );
};

export default QuoteWidget;