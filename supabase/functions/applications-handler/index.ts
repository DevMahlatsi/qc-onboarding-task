import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const APPROVED_INSTITUTIONS = [
  'University of Cape Town (UCT)', 'University of the Witwatersrand (Wits)',
  'University of Pretoria (UP)', 'Stellenbosch University (SU)',
  'University of Johannesburg (UJ)', 'University of KwaZulu-Natal (UKZN)',
  'University of the Free State (UFS)', 'Nelson Mandela University (NMU)',
  'Rhodes University (RU)', 'University of the Western Cape (UWC)',
  'University of Limpopo (UL)', 'University of Zululand (UniZulu)',
  'Walter Sisulu University (WSU)', 'University of Fort Hare (UFH)',
  'University of Venda (Univen)', 'North-West University (NWU)',
  'University of South Africa (UNISA)', 'University of Mpumalanga (UMP)',
  'Sol Plaatje University (SPU)',
  'Tshwane University of Technology (TUT)', 'Cape Peninsula University of Technology (CPUT)',
  'Durban University of Technology (DUT)', 'Vaal University of Technology (VUT)',
  'Central University of Technology (CUT)', 'Mangosuthu University of Technology (MUT)',
  'Ekurhuleni East TVET College', 'Tshwane North TVET College',
  'Sedibeng TVET College', 'Motheo TVET College',
  'Boland TVET College', 'False Bay TVET College',
  'Coastal KZN TVET College', 'Umgungundlovu TVET College',
];

const ACADEMIC_YEARS = ['2026', '2027', '2028'];
const STATUSES = ['draft', 'submitted'];

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return jsonResponse({ error: 'Missing authorization token.' }, 401);
  }

  // Client scoped to the calling user's JWT — RLS enforces row ownership
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } }
  });

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData?.user) {
    return jsonResponse({ error: 'Invalid or expired session. Please sign in again.' }, 401);
  }
  const userId = userData.user.id;

  try {
    const body = await req.json();
    const { action } = body;

    if (action === 'load') {
      const { data, error } = await supabase
        .from('applications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return jsonResponse({ data, institutions: APPROVED_INSTITUTIONS }, 200);
    }

    if (action === 'add') {
      const { institution, course, academic_year, status, notes } = body;

      if (!institution || typeof institution !== 'string') {
        return jsonResponse({ error: 'Institution is required.' }, 400);
      }
      const normalisedInstitutions = APPROVED_INSTITUTIONS.map(i => i.toLowerCase());
      const matchIndex = normalisedInstitutions.indexOf(institution.trim().toLowerCase());
      if (matchIndex === -1) {
        return jsonResponse({ error: 'Institution not recognised. Please select from the approved list.' }, 400);
      }
      const canonicalInstitution = APPROVED_INSTITUTIONS[matchIndex];

      if (!course || typeof course !== 'string' || !course.trim()) {
        return jsonResponse({ error: 'Course is required.' }, 400);
      }

      if (!ACADEMIC_YEARS.includes(String(academic_year))) {
        return jsonResponse({ error: 'Please select a valid academic year.' }, 400);
      }

      if (!STATUSES.includes(status)) {
        return jsonResponse({ error: 'Status must be either draft or submitted.' }, 400);
      }

      const { data, error } = await supabase
        .from('applications')
        .insert({
          user_id: userId,
          institution: canonicalInstitution,
          course: course.trim(),
          academic_year: String(academic_year),
          status,
          notes: notes ? String(notes).trim() : null
        })
        .select()
        .single();

      if (error) throw error;

      return jsonResponse({ data }, 200);
    }

    return jsonResponse({ error: 'Unknown action.' }, 400);

  } catch (error) {
    console.error('applications-handler error:', error);
    return jsonResponse({ error: 'Something went wrong. Please try again.' }, 400);
  }
});