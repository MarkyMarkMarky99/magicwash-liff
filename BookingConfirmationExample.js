import React, { useState } from 'react';
import { Check, Calendar, Navigation, Wifi, Battery, Signal, Sparkles, Loader2, Stethoscope, FileText } from 'lucide-react';

export default function App() {
    // สร้าง State สำหรับเก็บข้อมูลจาก AI
    const [aiTips, setAiTips] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    // ฟังก์ชันหน่วงเวลาสำหรับการทำ Exponential Backoff
    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    // ฟังก์ชันเรียกใช้งาน Gemini API
    const generatePrepTips = async () => {
        setIsLoading(true);
        setError(null);

        // API Key จะถูกดึงผ่าน environment ของระบบ
        const apiKey = "";

        // คำสั่ง (Prompt) ที่ส่งให้ Gemini เพื่อสร้างคำแนะนำการเตรียมตัว
        const promptText = "Generate 3 short, highly important questions a patient should ask a Cardiologist during their first appointment. Keep it very concise, friendly, and format it as a simple bulleted list using the '-' character. Do not use complex markdown.";

        // ระยะเวลาหน่วงสำหรับการทำ retry (Exponential Backoff)
        const delays = [1000, 2000, 4000, 8000, 16000];

        for (let attempt = 0; attempt <= 5; attempt++) {
            try {
                const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: promptText }] }],
                        systemInstruction: { parts: [{ text: "You are a helpful and empathetic medical assistant." }] }
                    })
                });

                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

                const data = await response.json();
                const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;

                setAiTips(generatedText);
                setIsLoading(false);
                return; // สำเร็จแล้วให้ออกจากลูป

            } catch (err) {
                if (attempt < 5) {
                    // หากเกิด error ให้รอตามเวลาที่กำหนดแล้วลองใหม่
                    await delay(delays[attempt]);
                } else {
                    // หากเกิน 5 ครั้งแล้วยังไม่ได้ ให้แสดงข้อความ error
                    setError("Failed to connect to AI. Please try again later.");
                    setIsLoading(false);
                }
            }
        }
    };

    return (
        // Main container (เพิ่ม overflow-y-auto เพื่อให้เลื่อนหน้าจอได้เมื่อมีเนื้อหาเพิ่ม)
        <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
            <div className="relative w-full max-w-[375px] bg-[#f8f9fb] h-[812px] shadow-2xl rounded-[40px] overflow-hidden font-sans flex flex-col">

                {/* ส่วนที่สามารถเลื่อนได้ (Scrollable Content) */}
                <div className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar pb-24">

                    {/* Top Status Bar */}
                    <div className="absolute top-0 inset-x-0 h-12 flex items-center justify-between px-6 z-20 text-white">
                        <span className="text-sm font-semibold tracking-wider">9:41</span>
                        <div className="flex items-center space-x-2">
                            <Signal size={16} className="fill-current" />
                            <Wifi size={16} />
                            <Battery size={20} />
                        </div>
                    </div>

                    {/* Gradient Header with Curved Bottom */}
                    <div className="relative bg-gradient-to-b from-[#0cd9c3] to-[#02bda6] pt-24 pb-12 px-6 rounded-b-[45px] text-center shadow-sm z-10">

                        {/* Dot effects around the checkmark */}
                        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-32 h-32">
                            <div className="absolute top-0 left-1/2 w-1.5 h-1.5 bg-white/60 rounded-full"></div>
                            <div className="absolute top-4 left-6 w-2 h-2 bg-white/40 rounded-full"></div>
                            <div className="absolute top-5 right-4 w-1.5 h-1.5 bg-white/50 rounded-full"></div>
                            <div className="absolute bottom-6 left-2 w-1.5 h-1.5 bg-white/80 rounded-full"></div>
                            <div className="absolute bottom-8 right-0 w-2.5 h-2.5 bg-white rounded-full shadow-sm"></div>
                        </div>

                        {/* Confirmation Icon */}
                        <div className="relative inline-flex items-center justify-center w-16 h-16 bg-white rounded-full shadow-lg mb-5">
                            <Check size={32} className="text-[#02bda6] stroke-[3]" />
                        </div>

                        <h1 className="text-2xl font-bold text-white mb-1">Request Received</h1>
                        <p className="text-white/80 text-sm mb-4">Ref ID: 293273272</p>
                        <p className="text-white text-sm leading-relaxed max-w-[280px] mx-auto">
                            Your booking request has been submitted. Our staff will review the details and contact you shortly to confirm.
                        </p>
                    </div>

                    {/* Main Body Content */}
                    <div className="px-5 pt-6 relative z-0">

                        {/* Appointment Details Section */}
                        <div className="mb-6">
                            <h2 className="text-xs font-semibold text-gray-400 mb-3 px-1">Appointment Details</h2>

                            <div className="bg-white rounded-2xl p-4 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] border border-gray-50/50">
                                {/* Doctor Information */}
                                <div className="flex items-center mb-4">
                                    <img
                                        src="https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&w=150&q=80"
                                        alt="Doctor"
                                        className="w-14 h-14 rounded-[14px] object-cover mr-4 shadow-sm"
                                    />
                                    <div>
                                        <h3 className="text-[17px] font-bold text-[#2d3648]">Dr. George Stephen</h3>
                                        <p className="text-sm text-gray-500 mt-0.5">Cardiologist</p>
                                    </div>
                                </div>

                                {/* Date and Time */}
                                <div className="bg-[#f8f9fb] rounded-xl p-3 flex items-center justify-between mb-3">
                                    <div className="flex items-center text-gray-500">
                                        <div className="bg-[#eaf9f7] p-2 rounded-lg mr-3">
                                            <Calendar size={18} className="text-[#0cd9c3]" />
                                        </div>
                                        <span className="text-sm font-medium">Time & Date</span>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[11px] text-gray-400 font-medium mb-0.5">26, Jan 2019</p>
                                        <p className="text-[15px] font-bold text-[#2d3648]">12:45 PM</p>
                                    </div>
                                </div>

                                {/* Customer Notes */}
                                <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                                    <div className="flex items-center text-gray-500 mb-1.5">
                                        <FileText size={14} className="mr-1.5" />
                                        <span className="text-[11px] font-bold uppercase tracking-wider">Your Notes</span>
                                    </div>
                                    <p className="text-[13px] text-[#2d3648] leading-relaxed">
                                        I have been experiencing occasional mild chest pain during my morning jogs. Please review my recent blood test results.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Location and Map Section */}
                        <div className="mb-6">
                            <h2 className="text-xs font-semibold text-gray-400 mb-3 px-1">Location</h2>

                            <div className="bg-white rounded-2xl p-4 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] border border-gray-50/50">
                                <div className="flex items-start justify-between mb-4">
                                    <p className="text-[15px] font-semibold text-[#2d3648] leading-snug pr-4">
                                        32 Smiles Dental Clinic, Polly Park, Germany-023
                                    </p>
                                    {/* Navigation Button */}
                                    <button className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-orange-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg shadow-orange-500/30 transform hover:scale-105 transition">
                                        <Navigation size={18} className="text-white fill-current -rotate-45 ml-[-2px] mt-[2px]" />
                                    </button>
                                </div>

                                {/* Mockup Map */}
                                <div className="relative w-full h-[180px] rounded-xl overflow-hidden bg-[#eff1f4]">
                                    <svg className="absolute inset-0 w-full h-full opacity-40" viewBox="0 0 300 200" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M-10,50 L100,20 L150,80 L320,30" stroke="#d1d5db" strokeWidth="4" fill="none" />
                                        <path d="M50,-10 L80,100 L20,180" stroke="#d1d5db" strokeWidth="3" fill="none" />
                                        <path d="M150,80 L200,150 L320,130" stroke="#d1d5db" strokeWidth="4" fill="none" />
                                        <path d="M100,200 L120,130 L80,100" stroke="#d1d5db" strokeWidth="2" fill="none" />
                                        <path d="M220,-10 L250,90 L200,150 L280,220" stroke="#white" strokeWidth="6" fill="none" />
                                        <path d="M0,120 L50,150 L100,130" stroke="#white" strokeWidth="5" fill="none" />
                                    </svg>

                                    {/* Gradient Route Layer */}
                                    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 300 200">
                                        <defs>
                                            <linearGradient id="routeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                                                <stop offset="0%" stopColor="#0cd9c3" />
                                                <stop offset="100%" stopColor="#3b82f6" />
                                            </linearGradient>
                                        </defs>
                                        <path
                                            d="M 60 110 L 60 160 C 60 170, 70 170, 80 170 L 90 170 L 100 70 L 150 130 L 200 80 L 230 110"
                                            stroke="url(#routeGrad)"
                                            strokeWidth="4"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            fill="none"
                                        />
                                    </svg>

                                    {/* Start Point (You) */}
                                    <div className="absolute left-[54px] top-[104px] flex flex-col items-center">
                                        <span className="text-[10px] font-bold text-gray-500 mb-1">you</span>
                                        <div className="w-3.5 h-3.5 bg-[#0cd9c3] rounded-full border-[2.5px] border-white shadow-sm"></div>
                                    </div>

                                    {/* End Point */}
                                    <div className="absolute left-[224px] top-[104px] w-3.5 h-3.5 bg-[#3b82f6] rounded-full border-[2.5px] border-white shadow-sm"></div>
                                </div>
                            </div>
                        </div>

                        {/* ส่วนของ Gemini AI Integration: AI Visit Prep */}
                        <div className="mt-6 mb-8">
                            {!aiTips && !isLoading && (
                                <button
                                    onClick={generatePrepTips}
                                    className="w-full bg-gradient-to-r from-indigo-50 to-purple-50 border border-purple-100 rounded-2xl p-4 flex items-center justify-center space-x-3 text-purple-700 font-medium hover:bg-purple-100/50 transition shadow-sm"
                                >
                                    <Sparkles size={20} className="text-purple-500" />
                                    <span>✨ Get AI Prep Tips for Cardiologist</span>
                                </button>
                            )}

                            {isLoading && (
                                <div className="w-full bg-white rounded-2xl p-6 flex flex-col items-center justify-center space-y-3 shadow-sm border border-gray-100">
                                    <Loader2 size={24} className="animate-spin text-purple-500" />
                                    <p className="text-sm text-gray-500">Generating intelligent questions...</p>
                                </div>
                            )}

                            {error && (
                                <div className="w-full bg-red-50 text-red-600 rounded-2xl p-4 text-sm text-center border border-red-100">
                                    {error}
                                    <button onClick={generatePrepTips} className="block mx-auto mt-2 underline font-medium">Try Again</button>
                                </div>
                            )}

                            {aiTips && (
                                <div className="w-full bg-gradient-to-br from-white to-purple-50/30 rounded-2xl p-5 shadow-sm border border-purple-100 relative">
                                    <div className="flex items-center space-x-2 mb-3">
                                        <div className="p-1.5 bg-purple-100 rounded-lg">
                                            <Stethoscope size={16} className="text-purple-600" />
                                        </div>
                                        <h3 className="font-bold text-purple-900 text-sm">Suggested Questions</h3>
                                    </div>
                                    <div className="text-[13px] text-gray-700 leading-relaxed whitespace-pre-wrap">
                                        {aiTips}
                                    </div>
                                </div>
                            )}
                        </div>

                    </div>
                </div>

                {/* Bottom Done Button */}
                <div className="absolute bottom-0 inset-x-0 p-6 bg-gradient-to-t from-[#f8f9fb] via-[#f8f9fb] to-transparent z-20">
                    <button className="w-full bg-white text-[#0cd9c3] font-bold text-[15px] py-4 rounded-2xl shadow-[0_5px_15px_-5px_rgba(12,217,195,0.3)] border border-gray-50 transform hover:scale-[1.02] active:scale-95 transition">
                        Done
                    </button>
                </div>

            </div>

            {/* สไตล์สำหรับซ่อน Scrollbar (เพื่อให้ UI ดูเหมือนมือถือจริงๆ) */}
            <style dangerouslySetInnerHTML={{
                __html: `
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}} />
        </div>
    );
}