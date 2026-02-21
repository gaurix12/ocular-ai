/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
// OpenAI Vision API used via fetch - no extra package needed
import {
  Camera,
  Upload,
  Activity,
  Info,
  AlertCircle,
  Eye,
  Layers,
  ChevronRight,
  RefreshCw,
  Search,
  BookOpen,
  Stethoscope
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import ReactMarkdown from 'react-markdown';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Types ---

interface AnalysisResult {
  heatmap: Array<{ x: number; y: number; intensity: number; label: string }>;
  sectors: Array<{ angle: number; intensity: number }>;
  callouts: Array<{
    x: number;
    y: number;
    text: string;
    subtext?: string;
    teaching: {
      title: string;
      content: string;
      clinical_significance: string;
    }
  }>;
  diseases: Array<{
    name: string;
    confidence: number;
    risk: 'Low' | 'Moderate' | 'High';
    description: string;
  }>;
  educational: {
    region: string;
    characteristics: string;
    pathophysiology: string;
    correlation: string;
  };
}

// --- Mock Analysis Engine (works offline, no API quota needed) ---

function generateMockAnalysis(): AnalysisResult {
  const scenarios = [
    {
      name: 'wilson',
      diseases: [
        { name: "Wilson's Disease", confidence: 87 + Math.floor(Math.random() * 10), risk: 'High' as const, description: "Classic Kayser-Fleischer ring observed at the peripheral corneal limbus with characteristic golden-brown copper deposition in Descemet's membrane." },
        { name: "Neurofibromatosis Type 1", confidence: 4 + Math.floor(Math.random() * 5), risk: 'Low' as const, description: "No Lisch nodules or melanocytic hamartomas detected on the iris stroma." }
      ],
      heatmap: [
        { x: 50, y: 8, intensity: 0.95, label: "Kayser-Fleischer Ring (Superior)" },
        { x: 50, y: 92, intensity: 0.95, label: "Kayser-Fleischer Ring (Inferior)" },
        { x: 8, y: 50, intensity: 0.85, label: "K-F Ring (Nasal)" },
        { x: 92, y: 50, intensity: 0.85, label: "K-F Ring (Temporal)" },
      ],
      callouts: [
        { x: 50, y: 8, text: "K-F Ring", subtext: "Copper Index: 0.91", teaching: { title: "Kayser-Fleischer Ring", content: "A dark ring that encircles the iris due to copper deposition in Descemet's membrane as a result of ATP7B gene mutation causing impaired copper excretion.", clinical_significance: "Pathognomonic for Wilson's disease when accompanied by neurological symptoms. Present in ~98% of neurological WD cases." } },
        { x: 8, y: 50, text: "Limbal Deposition", subtext: "Density: High", teaching: { title: "Peripheral Corneal Copper Deposition", content: "The deposition follows the arc of the limbus and is best visualized by slit-lamp examination. It begins superiorly and inferiorly, eventually forming a complete ring.", clinical_significance: "Slit-lamp examination is essential for early detection. The ring may be subtle in early disease and requires expert ophthalmologic assessment." } },
      ],
      educational: { region: "Peripheral Cornea / Descemet's Membrane at Limbus", characteristics: "Golden-brown to greenish pigment ring at the peripheral cornea, 1-3mm wide, most intense superiorly and inferiorly.", pathophysiology: "Systemic copper overload from ATP7B gene mutation leads to lysosomal dysfunction and copper accumulation in hepatocytes, then overflow into circulation and deposition in ocular tissues.", correlation: "Strongly associated with hepatic cirrhosis, neuropsychiatric symptoms, and hemolytic anemia. Mandatory screening for first-degree relatives." },
    },
    {
      name: 'nf1',
      diseases: [
        { name: "Neurofibromatosis Type 1", confidence: 91 + Math.floor(Math.random() * 8), risk: 'High' as const, description: "Multiple well-defined, dome-shaped melanocytic hamartomas (Lisch nodules) detected across multiple quadrants of the iris stroma, consistent with NF1 diagnosis." },
        { name: "Wilson's Disease", confidence: 3 + Math.floor(Math.random() * 4), risk: 'Low' as const, description: "No Kayser-Fleischer ring or copper deposition patterns detected at the corneal limbus." }
      ],
      heatmap: [
        { x: 38, y: 42, intensity: 0.88, label: "Lisch Nodule #1" },
        { x: 62, y: 38, intensity: 0.85, label: "Lisch Nodule #2" },
        { x: 45, y: 65, intensity: 0.82, label: "Lisch Nodule #3" },
        { x: 70, y: 58, intensity: 0.79, label: "Lisch Nodule #4" },
        { x: 30, y: 55, intensity: 0.75, label: "Lisch Nodule #5" },
      ],
      callouts: [
        { x: 38, y: 42, text: "Lisch Nodule", subtext: "Density: 4.7/mm²", teaching: { title: "Lisch Nodules (Iris Hamartomas)", content: "Melanocytic hamartomas appear as clear, yellow-to-brown, dome-shaped elevations projecting from the surface of the iris stroma. They are benign but diagnostically significant.", clinical_significance: "Present in >90% of adults with NF1. One of the 7 diagnostic criteria for Neurofibromatosis Type 1. Bilateral occurrence is characteristic." } },
        { x: 62, y: 38, text: "Stromal Nodule", subtext: "Size: ~2.1mm", teaching: { title: "Melanocyte Proliferation in Iris Stroma", content: "NF1-associated hamartomas arise from abnormal proliferation of melanocytes within the iris stroma due to loss of neurofibromin's tumor suppressor function on the RAS signaling pathway.", clinical_significance: "While visually striking, Lisch nodules themselves do not affect vision. Their significance lies entirely in confirming the NF1 diagnosis for genetic counseling." } },
      ],
      educational: { region: "Iris Stroma — Multi-quadrant", characteristics: "Multiple bilateral, raised, tan-to-brown dome-shaped nodules of 0.5–2mm diameter on the iris surface, distributed throughout the stroma.", pathophysiology: "Loss of function mutation in NF1 gene encoding neurofibromin, a RAS-GAP protein, leads to unchecked melanocyte proliferation in iris stroma forming hamartomas.", correlation: "One of 6 major diagnostic criteria for NF1. Asymptomatic but pathognomonic. Associated with café-au-lait spots, cutaneous neurofibromas, and increased risk of optic glioma." },
    },
    {
      name: 'normal',
      diseases: [
        { name: "Neurofibromatosis Type 1", confidence: 6 + Math.floor(Math.random() * 8), risk: 'Low' as const, description: "No Lisch nodules or melanocytic hamartomas detected. Iris stroma appears normal with no evidence of NF1-associated changes." },
        { name: "Wilson's Disease", confidence: 5 + Math.floor(Math.random() * 7), risk: 'Low' as const, description: "No Kayser-Fleischer ring detected. Corneal limbus appears clear without copper deposition." }
      ],
      heatmap: [
        { x: 50, y: 50, intensity: 0.2, label: "Normal Pupillary Zone" },
        { x: 35, y: 40, intensity: 0.15, label: "Stromal Crypt" },
        { x: 65, y: 60, intensity: 0.1, label: "Collarette Region" },
      ],
      callouts: [
        { x: 50, y: 25, text: "Iris Collarette", subtext: "Integrity: Normal", teaching: { title: "Iris Collarette (Minor Arterial Circle)", content: "The collarette is a thickened ridge of iris tissue located approximately one-third of the way from the pupil margin. It represents the junction between the pupillary and ciliary zones.", clinical_significance: "A well-defined, intact collarette indicates healthy iris vasculature. Disruption may indicate iridocyclitis or trauma." } },
        { x: 30, y: 50, text: "Stromal Crypts", subtext: "Pattern: Regular", teaching: { title: "Iris Stromal Crypts", content: "Crypts are depressions or openings in the iris stroma, most visible in light-colored irides. They reflect the complex trabecular architecture of the iris stroma.", clinical_significance: "Regular crypt patterns indicate normal iris architecture. Obliteration of crypts can occur in inflammatory conditions." } },
      ],
      educational: { region: "Iris Stroma / Pupillary and Ciliary Zones", characteristics: "Normal iris morphology with well-defined collarette, regular stromal pattern, and clear peripheral limbus without any abnormal deposits.", pathophysiology: "No pathological process identified. Normal iris exhibits regular melanocyte distribution, intact sphincter and dilator muscles, and clear corneal limbus.", correlation: "Healthy iris findings. Routine ophthalmologic follow-up recommended as per age and risk factors." },
    }
  ];

  const scenario = scenarios[Math.floor(Math.random() * scenarios.length)];
  const sectors = Array.from({ length: 36 }, (_, i) => ({
    angle: i * 10,
    intensity: scenario.name === 'wilson'
      ? (i < 4 || i > 32 || (i > 16 && i < 20) ? 85 + Math.random() * 15 : 10 + Math.random() * 20)
      : scenario.name === 'nf1'
        ? 30 + Math.random() * 50
        : 5 + Math.random() * 25
  }));

  return { ...scenario, sectors };
}

// --- Constants ---

const DEMO_MODE = true; // Set to false when a valid API key is available

// --- Components ---

export default function App() {
  const [image, setImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [viewMode, setViewMode] = useState<'raw' | 'heatmap'>('raw');
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'analyze' | 'cases'>('analyze');

  const [selectedCallout, setSelectedCallout] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [showCamera, setShowCamera] = useState(false);

  // OpenAI API Key
  const API_KEY = process.env.OPENAI_API_KEY || "";

  // OpenAI GPT-4o Vision Analysis
  const analyzeImage = async (base64Image: string) => {
    setIsAnalyzing(true);
    setError(null);
    abortControllerRef.current = new AbortController();

    try {
      setResult(null);
      setSelectedCallout(null);

      const prompt = `You are the AI engine powering the Student Learning Page for an ophthalmology education platform.
Analyze this iris image for ophthalmology education.

Task:
1. Perform Advanced Iris Analysis: Apply deep segmentation to detect abnormal regions.
2. Simulate a "nano-banana style" curved sector detection to highlight localized pathological areas.
3. Detect possible signs of: Neurofibromatosis Type 1 (Lisch nodules) or Wilson's Disease (Kayser-Fleischer ring).
4. Calculate confidence percentage for each disease.

Return ONLY a valid JSON object (no markdown, no code fences, no preamble) with this exact structure:
{
  "heatmap": [{"x": number, "y": number, "intensity": number, "label": string}],
  "sectors": [{"angle": number, "intensity": number}],
  "callouts": [{"x": number, "y": number, "text": string, "subtext": string, "teaching": {"title": string, "content": string, "clinical_significance": string}}],
  "diseases": [
    {"name": "Neurofibromatosis Type 1", "confidence": number, "risk": "Low", "description": string},
    {"name": "Wilson's Disease", "confidence": number, "risk": "Low", "description": string}
  ],
  "educational": {"region": string, "characteristics": string, "pathophysiology": string, "correlation": string}
}
Provide realistic educational data based on the image. Fill all fields. No patient identity info.`;

      const base64Data = base64Image.includes(',') ? base64Image.split(',')[1] : base64Image;
      const mimeType = base64Image.startsWith('data:image/png') ? 'image/png' : 'image/jpeg';

      const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [{
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64Data}`, detail: 'high' } }
            ]
          }],
          max_tokens: 4096,
          temperature: 0.3
        }),
        signal: abortControllerRef.current.signal
      });

      if (abortControllerRef.current.signal.aborted) return;

      if (!openAIResponse.ok) {
        const errJson = await openAIResponse.json();
        throw new Error(JSON.stringify(errJson));
      }

      const openAIData = await openAIResponse.json();
      let jsonText: string = openAIData.choices?.[0]?.message?.content || '';
      jsonText = jsonText.replace(/```json/g, '').replace(/```/g, '').trim();

      const data = JSON.parse(jsonText) as AnalysisResult;
      setResult(data);
      setViewMode('heatmap');
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      console.error("Analysis failed:", err);
      setError(err.message || "Failed to analyze image. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };


  const cancelAnalysis = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsAnalyzing(false);
    setImage(null);
    setResult(null);
    setSelectedCallout(null);
  };

  const loadCaseStudy = (type: 'wilson' | 'neuro') => {
    setImage(type === 'wilson'
      ? "https://picsum.photos/seed/wilson/800/800"
      : "https://picsum.photos/seed/neuro/800/800"
    );

    // Mock data for case studies to ensure immediate learning
    const mockData: AnalysisResult = type === 'wilson' ? {
      heatmap: [
        { x: 50, y: 15, intensity: 0.9, label: "Kayser-Fleischer Ring" },
        { x: 50, y: 85, intensity: 0.9, label: "Kayser-Fleischer Ring" }
      ],
      sectors: Array.from({ length: 36 }, (_, i) => ({ angle: i * 10, intensity: i < 5 || i > 31 ? 95 : 20 })),
      callouts: [
        {
          x: 50, y: 10, text: "K-F Ring",
          subtext: "Copper Index: 0.92",
          teaching: {
            title: "Kayser-Fleischer Ring",
            content: "A dark ring that appears to encircle the iris of the eye. It is due to copper deposition in part of the cornea (Descemet's membrane) as a result of particular liver diseases.",
            clinical_significance: "Pathognomonic for Wilson's disease when accompanied by neurological symptoms."
          }
        }
      ],
      diseases: [
        { name: "Wilson's Disease", confidence: 98, risk: "High", description: "Classic Kayser-Fleischer ring observed at the limbus due to copper accumulation." },
        { name: "Neurofibromatosis Type 1", confidence: 5, risk: "Low", description: "No Lisch nodules detected." }
      ],
      educational: {
        region: "Peripheral Cornea / Limbus",
        characteristics: "Golden-brown to greenish pigment ring located at the level of Descemet's membrane.",
        pathophysiology: "Systemic copper overload due to ATP7B mutation leads to deposition in ocular tissues.",
        correlation: "Strongly associated with hepatic and neurological manifestations of Wilson's Disease."
      }
    } : {
      heatmap: [
        { x: 40, y: 40, intensity: 0.8, label: "Lisch Nodule" },
        { x: 60, y: 55, intensity: 0.8, label: "Lisch Nodule" },
        { x: 35, y: 65, intensity: 0.8, label: "Lisch Nodule" }
      ],
      sectors: Array.from({ length: 36 }, (_, i) => ({ angle: i * 10, intensity: Math.random() * 40 + 30 })),
      callouts: [
        {
          x: 40, y: 40, text: "Lisch Nodule",
          subtext: "Density: 4.2/mm²",
          teaching: {
            title: "Lisch Nodules",
            content: "Melanocytic hamartomas, which are clear, yellow-to-brown, dome-shaped elevations that project from the surface of the iris.",
            clinical_significance: "The most common clinical finding in adults with NF1, occurring in over 90% of individuals over age 20."
          }
        }
      ],
      diseases: [
        { name: "Neurofibromatosis Type 1", confidence: 95, risk: "High", description: "Multiple well-defined, dome-shaped stromal nodules (Lisch nodules) detected." },
        { name: "Wilson's Disease", confidence: 2, risk: "Low", description: "No Kayser-Fleischer ring observed." }
      ],
      educational: {
        region: "Iris Stroma",
        characteristics: "Small, raised, tan-colored hamartomas on the iris surface.",
        pathophysiology: "Proliferation of melanocytes within the iris stroma, pathognomonic for NF1.",
        correlation: "One of the diagnostic criteria for Neurofibromatosis Type 1; usually asymptomatic."
      }
    };

    setResult(mockData);
    setSelectedCallout(null);
    setViewMode('heatmap');
    setActiveTab('analyze');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        setImage(base64);
        analyzeImage(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const startCamera = async () => {
    setShowCamera(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Camera access denied:", err);
      setError("Camera access denied. Please use file upload.");
      setShowCamera(false);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0);
        const base64 = canvasRef.current.toDataURL('image/jpeg');
        setImage(base64);
        analyzeImage(base64);

        // Stop camera
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
        setShowCamera(false);
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-900/20">
              <Eye className="text-white w-6 h-6" />
            </div>
            <div>
              <h1 className="font-bold text-xl tracking-tight text-white">OcularAI</h1>
              <p className="text-[10px] uppercase tracking-[0.2em] text-blue-400 font-semibold">Student Mode</p>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-6">
            <button
              onClick={() => setActiveTab('analyze')}
              className={cn("text-sm font-medium transition-colors", activeTab === 'analyze' ? "text-blue-400" : "text-slate-400 hover:text-white")}
            >
              Curriculum
            </button>
            <button
              onClick={() => setActiveTab('analyze')}
              className={cn("text-sm font-medium transition-colors", activeTab === 'analyze' ? "text-blue-400" : "text-slate-400 hover:text-white")}
            >
              Atlas
            </button>
            <button
              onClick={() => setActiveTab('cases')}
              className={cn("text-sm font-medium transition-colors", activeTab === 'cases' ? "text-blue-400" : "text-slate-400 hover:text-white")}
            >
              Case Studies
            </button>
            <div className="h-4 w-px bg-slate-800" />
            <button className="text-sm font-medium text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              Resources
            </button>
          </nav>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-8">
        {activeTab === 'cases' ? (
          <div className="space-y-8">
            <div className="flex flex-col items-center text-center max-w-2xl mx-auto mb-12">
              <h2 className="text-3xl font-bold text-white mb-4">Clinical Case Studies</h2>
              <p className="text-slate-400">Explore curated templates of rare ophthalmological conditions to understand their iris manifestations.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <motion.div
                whileHover={{ y: -5 }}
                className="glass-panel overflow-hidden group cursor-pointer"
                onClick={() => loadCaseStudy('wilson')}
              >
                <div className="aspect-video relative">
                  <img src="https://picsum.photos/seed/wilson/800/450" alt="Wilson's Disease" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 to-transparent" />
                  <div className="absolute bottom-4 left-4">
                    <span className="bg-blue-600 text-white text-[10px] font-bold px-2 py-1 rounded uppercase tracking-widest">Metabolic</span>
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-bold text-white mb-2">Wilson's Disease</h3>
                  <p className="text-sm text-slate-400 mb-4">Study the Kayser-Fleischer ring, a pathognomonic sign of copper deposition in Descemet's membrane.</p>
                  <button className="text-blue-400 text-sm font-bold flex items-center gap-2 group-hover:gap-3 transition-all">
                    Load Template <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>

              <motion.div
                whileHover={{ y: -5 }}
                className="glass-panel overflow-hidden group cursor-pointer"
                onClick={() => loadCaseStudy('neuro')}
              >
                <div className="aspect-video relative">
                  <img src="https://picsum.photos/seed/neuro/800/450" alt="NF1" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 to-transparent" />
                  <div className="absolute bottom-4 left-4">
                    <span className="bg-purple-600 text-white text-[10px] font-bold px-2 py-1 rounded uppercase tracking-widest">Genetic</span>
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-bold text-white mb-2">Neurofibromatosis Type 1</h3>
                  <p className="text-sm text-slate-400 mb-4">Analyze Lisch nodules, melanocytic hamartomas that serve as a key diagnostic criterion for NF1.</p>
                  <button className="text-blue-400 text-sm font-bold flex items-center gap-2 group-hover:gap-3 transition-all">
                    Load Template <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Column: Upload & Main View */}
            <div className="lg:col-span-7 space-y-6">

              {/* Upload Section */}
              <section className="glass-panel p-6">
                {!image && !showCamera ? (
                  <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-slate-800 rounded-xl bg-slate-950/50 hover:border-blue-500/50 transition-all group">
                    <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      <Upload className="text-slate-400 group-hover:text-blue-400 w-8 h-8" />
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2">Upload Iris Image</h3>
                    <p className="text-sm text-slate-500 mb-6 text-center max-w-xs">
                      Select a high-resolution macro photograph of the iris for detailed pathological analysis.
                    </p>
                    <div className="flex gap-4">
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-semibold transition-all flex items-center gap-2 shadow-lg shadow-blue-900/20"
                      >
                        <Upload className="w-4 h-4" />
                        Browse Files
                      </button>
                      <button
                        onClick={startCamera}
                        className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm font-semibold transition-all flex items-center gap-2"
                      >
                        <Camera className="w-4 h-4" />
                        Use Camera
                      </button>
                    </div>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      accept="image/*"
                      className="hidden"
                    />
                  </div>
                ) : showCamera ? (
                  <div className="relative rounded-xl overflow-hidden bg-black aspect-square max-w-md mx-auto">
                    <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                    <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-4">
                      <button
                        onClick={capturePhoto}
                        className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-xl hover:scale-105 transition-transform"
                      >
                        <div className="w-12 h-12 border-4 border-slate-900 rounded-full" />
                      </button>
                      <button
                        onClick={() => setShowCamera(false)}
                        className="absolute right-6 bottom-4 text-white bg-slate-900/80 px-4 py-2 rounded-lg text-xs font-medium"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                        <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Active Session</span>
                      </div>
                      <div className="flex gap-3">
                        <button
                          onClick={() => { setImage(null); setResult(null); setSelectedCallout(null); }}
                          className="text-xs font-medium text-slate-500 hover:text-white flex items-center gap-1"
                        >
                          <RefreshCw className="w-3 h-3" />
                          Retake / New
                        </button>
                      </div>
                    </div>

                    {/* Main Viewer */}
                    <div className="relative group rounded-xl overflow-hidden border border-slate-800 bg-slate-950 aspect-square">
                      {/* Base Image */}
                      <img
                        src={image!}
                        alt="Iris Scan"
                        className={cn(
                          "w-full h-full object-cover transition-all duration-700",
                          viewMode === 'heatmap' ? 'brightness-50 grayscale' : 'brightness-100'
                        )}
                      />

                      {/* Heatmap Overlay */}
                      <AnimatePresence>
                        {viewMode === 'heatmap' && result && (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 pointer-events-none"
                          >
                            <svg viewBox="0 0 100 100" className="w-full h-full">
                              {/* Sector Highlights (Nano-Banana Style) */}
                              {result.sectors.filter(s => s.intensity > 60).map((sector, i) => {
                                const startAngle = (sector.angle - 15) * (Math.PI / 180);
                                const endAngle = (sector.angle + 15) * (Math.PI / 180);
                                const innerR = 35;
                                const outerR = 45;

                                const x1 = 50 + outerR * Math.cos(startAngle);
                                const y1 = 50 + outerR * Math.sin(startAngle);
                                const x2 = 50 + outerR * Math.cos(endAngle);
                                const y2 = 50 + outerR * Math.sin(endAngle);

                                const x3 = 50 + innerR * Math.cos(endAngle);
                                const y3 = 50 + innerR * Math.sin(endAngle);
                                const x4 = 50 + innerR * Math.cos(startAngle);
                                const y4 = 50 + innerR * Math.sin(startAngle);

                                return (
                                  <motion.path
                                    key={`sector-${i}`}
                                    d={`M ${x1} ${y1} A ${outerR} ${outerR} 0 0 1 ${x2} ${y2} L ${x3} ${y3} A ${innerR} ${innerR} 0 0 0 ${x4} ${y4} Z`}
                                    fill="rgba(239, 68, 68, 0.15)"
                                    stroke="rgba(239, 68, 68, 0.4)"
                                    strokeWidth="0.3"
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: 1 + i * 0.05, type: 'spring' }}
                                    className="drop-shadow-[0_0_8px_rgba(239,68,68,0.3)]"
                                  />
                                );
                              })}

                              {/* Radial Heatmap Gradients */}
                              {result.heatmap.map((point, i) => (
                                <motion.circle
                                  key={i}
                                  cx={point.x}
                                  cy={point.y}
                                  r={5 + point.intensity * 10}
                                  fill={`url(#heat-grad-${i})`}
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  transition={{ delay: i * 0.1 }}
                                />
                              ))}
                              <defs>
                                {result.heatmap.map((point, i) => (
                                  <radialGradient key={i} id={`heat-grad-${i}`}>
                                    <stop offset="0%" stopColor="#ef4444" stopOpacity={point.intensity * 0.8} />
                                    <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
                                  </radialGradient>
                                ))}
                              </defs>

                              {/* Callout Lines (Technical HUD Style) */}
                              {result.callouts.map((callout, i) => {
                                const isSelected = selectedCallout === i;
                                const side = callout.x > 50 ? 1 : -1;

                                // Calculate elbow points
                                const elbowX = callout.x + (side * 10);
                                const elbowY = callout.y - 10;
                                const endX = callout.x + (side * 25);
                                const endY = elbowY;

                                return (
                                  <g key={`line-${i}`} className="cursor-pointer" onClick={() => setSelectedCallout(isSelected ? null : i)}>
                                    {/* Connection Path (Elbow) */}
                                    <motion.path
                                      d={`M ${callout.x} ${callout.y} L ${elbowX} ${elbowY} L ${endX} ${endY}`}
                                      stroke={isSelected ? "#3b82f6" : "#ef4444"}
                                      strokeWidth={isSelected ? "0.6" : "0.3"}
                                      fill="none"
                                      initial={{ pathLength: 0, opacity: 0 }}
                                      animate={{ pathLength: 1, opacity: 1 }}
                                      transition={{ delay: 0.5 + i * 0.2, duration: 1 }}
                                    />

                                    {/* Joint Dot */}
                                    <motion.circle
                                      cx={elbowX}
                                      cy={elbowY}
                                      r="0.6"
                                      fill={isSelected ? "#3b82f6" : "#ef4444"}
                                      initial={{ opacity: 0 }}
                                      animate={{ opacity: 1 }}
                                      transition={{ delay: 1 + i * 0.2 }}
                                    />

                                    {/* Target Point (HUD Style) */}
                                    <g>
                                      <motion.circle
                                        cx={callout.x}
                                        cy={callout.y}
                                        r="1.2"
                                        fill="white"
                                        stroke={isSelected ? "#3b82f6" : "#ef4444"}
                                        strokeWidth="0.5"
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        transition={{ delay: 0.4 + i * 0.2 }}
                                      />
                                      <motion.circle
                                        cx={callout.x}
                                        cy={callout.y}
                                        r="3"
                                        stroke={isSelected ? "#3b82f6" : "#ef4444"}
                                        strokeWidth="0.1"
                                        fill="none"
                                        initial={{ scale: 0.5, opacity: 0 }}
                                        animate={{ scale: [1, 2.5], opacity: [0.4, 0] }}
                                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                                      />
                                    </g>
                                  </g>
                                );
                              })}
                            </svg>

                            {/* Callout Labels (Technical Text Style) */}
                            {result.callouts.map((callout, i) => {
                              const side = callout.x > 50 ? 1 : -1;
                              const isSelected = selectedCallout === i;

                              return (
                                <motion.div
                                  key={i}
                                  initial={{ opacity: 0, x: side * 20 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: 1.2 + i * 0.2 }}
                                  style={{
                                    left: `${callout.x + (side * 25)}%`,
                                    top: `${callout.y - 12}%`,
                                    transform: side === -1 ? 'translateX(-100%)' : 'none'
                                  }}
                                  className={cn(
                                    "absolute cursor-pointer z-20 group",
                                    side === -1 ? "text-right" : "text-left"
                                  )}
                                  onClick={() => setSelectedCallout(isSelected ? null : i)}
                                >
                                  <div className="flex flex-col">
                                    <div className="flex items-center gap-2">
                                      {side === 1 && <div className={cn("w-1 h-1 rounded-full", isSelected ? "bg-blue-500" : "bg-red-500")} />}
                                      <span className={cn(
                                        "text-[11px] font-bold tracking-tight transition-colors",
                                        isSelected ? "text-blue-400" : "text-white group-hover:text-red-400"
                                      )}>
                                        {callout.text}
                                      </span>
                                      {side === -1 && <div className={cn("w-1 h-1 rounded-full", isSelected ? "bg-blue-500" : "bg-red-500")} />}
                                    </div>
                                    {callout.subtext && (
                                      <span className={cn(
                                        "text-[9px] font-mono mt-0.5 transition-colors",
                                        isSelected ? "text-blue-300/70" : "text-red-500/80"
                                      )}>
                                        {callout.subtext}
                                      </span>
                                    )}
                                  </div>
                                </motion.div>
                              );
                            })}
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Loading State */}
                      <AnimatePresence>
                        {isAnalyzing && (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center p-8 text-center"
                          >
                            <div className="relative w-24 h-24 mb-6">
                              <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                                className="absolute inset-0 border-4 border-blue-500/20 border-t-blue-500 rounded-full"
                              />
                              <div className="absolute inset-0 flex items-center justify-center">
                                <Search className="w-8 h-8 text-blue-400 animate-pulse" />
                              </div>
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">Performing Advanced Iris Analysis...</h3>
                            <p className="text-sm text-slate-400 max-w-xs mb-6">
                              Our neural network is mapping morphological features and cross-referencing pathological markers.
                            </p>
                            <button
                              onClick={cancelAnalysis}
                              className="px-6 py-2 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white border border-red-500/30 rounded-lg text-xs font-bold transition-all"
                            >
                              Cancel Analysis
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Controls */}
                    <div className="flex items-center justify-between bg-slate-950 p-3 rounded-xl border border-slate-800">
                      <div className="flex gap-2">
                        <button
                          onClick={() => setViewMode('raw')}
                          className={cn(
                            "px-4 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-2",
                            viewMode === 'raw' ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"
                          )}
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Raw View
                        </button>
                        <button
                          onClick={() => setViewMode('heatmap')}
                          className={cn(
                            "px-4 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-2",
                            viewMode === 'heatmap' ? "bg-red-600 text-white" : "text-slate-400 hover:text-white"
                          )}
                        >
                          <Layers className="w-3.5 h-3.5" />
                          Pathology Heatmap
                        </button>
                      </div>
                      <div className="flex items-center gap-4 text-[10px] font-mono text-slate-500">
                        <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-blue-500" /> STROMAL</span>
                        <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-500" /> ABNORMAL</span>
                      </div>
                    </div>
                  </div>
                )}
              </section>

              {/* Intensity Graph Section */}
              <AnimatePresence>
                {result && (
                  <motion.section
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-panel p-6"
                  >
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-2">
                        <Activity className="text-blue-400 w-5 h-5" />
                        <h3 className="font-bold text-white">Intensity Distribution</h3>
                      </div>
                      <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Sector Analysis (0-360°)</span>
                    </div>
                    <div className="h-48 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={result.sectors}>
                          <defs>
                            <linearGradient id="colorIntensity" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                          <XAxis
                            dataKey="angle"
                            stroke="#475569"
                            fontSize={10}
                            tickFormatter={(val) => `${val}°`}
                          />
                          <YAxis stroke="#475569" fontSize={10} />
                          <Tooltip
                            contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }}
                            itemStyle={{ color: '#60a5fa', fontSize: '12px' }}
                          />
                          <Area
                            type="monotone"
                            dataKey="intensity"
                            stroke="#3b82f6"
                            fillOpacity={1}
                            fill="url(#colorIntensity)"
                            strokeWidth={2}
                            animationDuration={2000}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </motion.section>
                )}
              </AnimatePresence>
            </div>

            {/* Right Column: Results & Education */}
            <div className="lg:col-span-5 space-y-6">

              {/* Disease Prediction Cards */}
              <section className="space-y-4">
                <div className="flex items-center gap-2 px-1">
                  <Stethoscope className="text-blue-400 w-5 h-5" />
                  <h3 className="font-bold text-white">Pathological Screening</h3>
                </div>

                {!result && !isAnalyzing ? (
                  <div className="glass-panel p-8 text-center border-dashed">
                    <Info className="w-8 h-8 text-slate-700 mx-auto mb-3" />
                    <p className="text-sm text-slate-500">Upload an image to generate diagnostic predictions and educational insights.</p>
                  </div>
                ) : isAnalyzing ? (
                  <div className="space-y-4">
                    {[1, 2].map(i => (
                      <div key={i} className="glass-panel p-4 h-32 animate-pulse flex flex-col justify-between">
                        <div className="h-4 w-1/2 bg-slate-800 rounded" />
                        <div className="h-2 w-full bg-slate-800 rounded" />
                        <div className="h-8 w-1/4 bg-slate-800 rounded" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {result?.diseases.map((disease, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="glass-panel p-5 relative overflow-hidden group hover:border-slate-700 transition-colors"
                      >
                        <div className={cn(
                          "absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 rounded-full blur-3xl opacity-20",
                          disease.risk === 'High' ? "bg-red-500" : disease.risk === 'Moderate' ? "bg-orange-500" : "bg-green-500"
                        )} />

                        <div className="flex justify-between items-start mb-3 relative">
                          <div>
                            <h4 className="font-bold text-white text-lg">{disease.name}</h4>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={cn(
                                "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider",
                                disease.risk === 'High' ? "bg-red-500/20 text-red-400" :
                                  disease.risk === 'Moderate' ? "bg-orange-500/20 text-orange-400" :
                                    "bg-green-500/20 text-green-400"
                              )}>
                                {disease.risk} Risk
                              </span>
                              <span className="text-[10px] text-slate-500 font-mono">Confidence: {disease.confidence}%</span>
                            </div>
                          </div>
                          <div className="w-12 h-12 rounded-full border-2 border-slate-800 flex items-center justify-center relative">
                            <svg className="w-10 h-10 -rotate-90">
                              <circle
                                cx="20" cy="20" r="18"
                                fill="transparent"
                                stroke="currentColor"
                                strokeWidth="2"
                                className="text-slate-800"
                              />
                              <motion.circle
                                cx="20" cy="20" r="18"
                                fill="transparent"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeDasharray="113"
                                initial={{ strokeDashoffset: 113 }}
                                animate={{ strokeDashoffset: 113 - (113 * disease.confidence / 100) }}
                                transition={{ duration: 1.5, ease: "easeOut" }}
                                className={cn(
                                  disease.risk === 'High' ? "text-red-500" :
                                    disease.risk === 'Moderate' ? "text-orange-500" :
                                      "text-green-500"
                                )}
                              />
                            </svg>
                            <span className="absolute text-[10px] font-bold text-white">{disease.confidence}%</span>
                          </div>
                        </div>
                        <p className="text-xs text-slate-400 leading-relaxed relative line-clamp-2 group-hover:line-clamp-none transition-all">
                          {disease.description}
                        </p>
                      </motion.div>
                    ))}
                  </div>
                )}
              </section>

              {/* Educational Panel & Accordion Teaching */}
              <AnimatePresence>
                {result && (
                  <div className="space-y-6">
                    {/* Interactive Teaching Accordion */}
                    <section className="space-y-3">
                      <div className="flex items-center gap-2 px-1">
                        <BookOpen className="text-blue-400 w-5 h-5" />
                        <h3 className="font-bold text-white">Interactive Teaching</h3>
                      </div>

                      {result.callouts.map((callout, i) => (
                        <motion.div
                          key={`teaching-${i}`}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.2 + i * 0.1 }}
                          className={cn(
                            "glass-panel overflow-hidden transition-all duration-300",
                            selectedCallout === i ? "border-red-500/50 bg-red-500/5" : "hover:bg-slate-900/50"
                          )}
                        >
                          <button
                            onClick={() => setSelectedCallout(selectedCallout === i ? null : i)}
                            className="w-full p-4 flex items-center justify-between text-left"
                          >
                            <div className="flex items-center gap-3">
                              <div className={cn(
                                "w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs",
                                selectedCallout === i ? "bg-red-500 text-white" : "bg-slate-800 text-slate-400"
                              )}>
                                {i + 1}
                              </div>
                              <h4 className="font-bold text-white">{callout.teaching.title}</h4>
                            </div>
                            <ChevronRight className={cn(
                              "w-5 h-5 text-slate-500 transition-transform duration-300",
                              selectedCallout === i ? "rotate-90 text-red-500" : ""
                            )} />
                          </button>

                          <AnimatePresence>
                            {selectedCallout === i && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.3 }}
                              >
                                <div className="p-4 pt-0 space-y-4 border-t border-slate-800/50 mt-2">
                                  <div className="space-y-1">
                                    <span className="text-[10px] font-bold text-red-400 uppercase tracking-widest">Mechanism</span>
                                    <p className="text-sm text-slate-300 leading-relaxed">
                                      {callout.teaching.content}
                                    </p>
                                  </div>
                                  <div className="bg-slate-950/50 p-3 rounded-lg border border-slate-800/50">
                                    <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest block mb-1">Clinical Significance</span>
                                    <p className="text-xs text-slate-400 italic">
                                      {callout.teaching.clinical_significance}
                                    </p>
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      ))}
                    </section>

                    {/* Educational Panel */}
                    <motion.section
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      className="glass-panel overflow-hidden"
                    >
                      <div className="bg-blue-600/10 border-b border-slate-800 p-4 flex items-center gap-2">
                        <BookOpen className="text-blue-400 w-5 h-5" />
                        <h3 className="font-bold text-white">Educational Analysis</h3>
                      </div>
                      <div className="p-6 space-y-6">
                        <div className="grid grid-cols-1 gap-6">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-blue-400">
                              <Search className="w-4 h-4" />
                              <h5 className="text-xs font-bold uppercase tracking-widest">Identified Region</h5>
                            </div>
                            <p className="text-sm text-slate-300 bg-slate-950/50 p-3 rounded-lg border border-slate-800/50">
                              {result.educational.region}
                            </p>
                          </div>

                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-blue-400">
                              <Layers className="w-4 h-4" />
                              <h5 className="text-xs font-bold uppercase tracking-widest">Morphological Characteristics</h5>
                            </div>
                            <p className="text-sm text-slate-300 bg-slate-950/50 p-3 rounded-lg border border-slate-800/50">
                              {result.educational.characteristics}
                            </p>
                          </div>

                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-blue-400">
                              <Activity className="w-4 h-4" />
                              <h5 className="text-xs font-bold uppercase tracking-widest">Associated Pathophysiology</h5>
                            </div>
                            <p className="text-sm text-slate-300 bg-slate-950/50 p-3 rounded-lg border border-slate-800/50">
                              {result.educational.pathophysiology}
                            </p>
                          </div>

                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-blue-400">
                              <AlertCircle className="w-4 h-4" />
                              <h5 className="text-xs font-bold uppercase tracking-widest">Clinical Correlation</h5>
                            </div>
                            <p className="text-sm text-slate-300 bg-slate-950/50 p-3 rounded-lg border border-slate-800/50">
                              {result.educational.correlation}
                            </p>
                          </div>
                        </div>
                      </div>
                    </motion.section>
                  </div>
                )}
              </AnimatePresence>

              {/* Error Message */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="bg-red-500/10 border border-red-500/50 p-4 rounded-xl flex items-start gap-3"
                  >
                    <AlertCircle className="text-red-500 w-5 h-5 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-bold text-red-500">Analysis Error</h4>
                      <p className="text-xs text-red-400/80">{error}</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-8 bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 opacity-50">
            <Eye className="w-4 h-4" />
            <span className="text-xs font-medium tracking-tighter">OCULARAI v2.5.0-FLASHLITE</span>
          </div>
          <p className="text-[10px] text-slate-600 uppercase tracking-widest text-center">
            Educational tool only. Not for clinical diagnostic use.
          </p>
          <div className="flex gap-6">
            <a href="#" className="text-[10px] text-slate-500 hover:text-white uppercase tracking-widest">Privacy</a>
            <a href="#" className="text-[10px] text-slate-500 hover:text-white uppercase tracking-widest">Terms</a>
            <a href="#" className="text-[10px] text-slate-500 hover:text-white uppercase tracking-widest">Support</a>
          </div>
        </div>
      </footer>

      {/* Hidden Canvas for Camera Capture */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
