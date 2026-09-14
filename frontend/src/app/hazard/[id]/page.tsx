import { createClient } from '@supabase/supabase-js';
import { Metadata } from 'next';

const SUPABASE_URL = "https://rcflhgcfmqueyqhcqtii.supabase.co";
const SUPABASE_KEY = "sb_publishable_Qz4eTWnLQPTTS1Bc3nPXEA_6j5u12X0";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export async function generateMetadata({ params }: any): Promise<Metadata> {
  const id = params?.id || (await params).id;
  const { data: pothole } = await supabase.from('potholes').select('*').eq('id', id).single();
  
  if (!pothole) return { title: 'Hazard Not Found' };
  
  const title = `Verified Hazard on ${pothole.road_name}`;
  const description = `Severe pothole hazard at ${pothole.latitude}, ${pothole.longitude}. AI Confidence: ${(pothole.confidence * 100).toFixed(0)}%`;
  
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: pothole.image_url ? [pothole.image_url] : [],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: pothole.image_url ? [pothole.image_url] : [],
    }
  };
}

export default async function HazardPage({ params }: any) {
  const id = params?.id || (await params).id;
  const { data: pothole } = await supabase.from('potholes').select('*').eq('id', id).single();

  if (!pothole) return (
    <div className="flex items-center justify-center h-screen bg-[#f0f0f3] text-gray-800">
      Hazard not found
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f0f0f3] text-gray-800 p-8 font-sans flex flex-col items-center">
      <div className="max-w-md w-full bg-[#f0f0f3] border-transparent neu-flat-lg rounded-xl overflow-hidden shadow-2xl">
        {pothole.image_url && (
          <img 
            src={pothole.image_url} 
            alt="Pothole Hazard" 
            className="w-full h-64 object-cover"
          />
        )}
        <div className="p-6">
          <div className="inline-block px-3 py-1 bg-red-500/20 border border-red-500/40 text-red-500 text-xs font-bold rounded-full uppercase tracking-wider mb-4">
            Critical Hazard
          </div>
          <h1 className="text-2xl font-bold mb-2">{pothole.road_name}</h1>
          
          <div className="flex flex-col gap-3 mt-6">
            <div className="flex justify-between bg-[#f0f0f3] neu-inset p-3 rounded text-sm">
              <span className="text-gray-500">Coordinates</span>
              <span className="font-mono text-[#2ec4b6]">{pothole.latitude.toFixed(4)}, {pothole.longitude.toFixed(4)}</span>
            </div>
            <div className="flex justify-between bg-[#f0f0f3] neu-inset p-3 rounded text-sm">
              <span className="text-gray-500">AI Confidence</span>
              <span className="font-bold text-gray-800">{(pothole.confidence * 100).toFixed(1)}%</span>
            </div>
            <div className="flex justify-between bg-[#f0f0f3] neu-inset p-3 rounded text-sm">
              <span className="text-gray-500">Detected At</span>
              <span className="text-gray-800">{new Date(pothole.detected_at).toLocaleString()}</span>
            </div>
          </div>

          <a 
            href={`https://maps.google.com/maps?q=loc:${pothole.latitude},${pothole.longitude}`}
            target="_blank"
            rel="noreferrer"
            className="mt-8 block w-full py-3 bg-[#2ec4b6] hover:bg-[#25a89b] text-white font-bold rounded-lg text-center transition-colors"
          >
            Open in Google Maps
          </a>
        </div>
      </div>
    </div>
  );
}
