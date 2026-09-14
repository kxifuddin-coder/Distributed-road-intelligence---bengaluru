import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://rcflhgcfmqueyqhcqtii.supabase.co";
const SUPABASE_KEY = "sb_publishable_Qz4eTWnLQPTTS1Bc3nPXEA_6j5u12X0";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function listFiles() {
  const { data, error } = await supabase.storage.from('pothole_images').list();
  console.log("Files:", data, error);
}

listFiles();
