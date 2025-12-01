
import { createClient } from '@supabase/supabase-js';

// Configuration provided by user
const SUPABASE_URL = 'https://scgfzismtslihubzlrsk.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNjZ2Z6aXNtdHNsaWh1YnpscnNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM3MDc1NTYsImV4cCI6MjA3OTI4MzU1Nn0.3oB-se3Sy4Bx11-ifT2Yyzf8KIcmRb-cSNV3yGDXXXA';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
