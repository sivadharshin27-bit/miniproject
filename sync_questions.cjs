const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = 'https://cbhfjgnihkppdbwdqbmz.supabase.co';
const supabaseKey = 'sb_publishable_tTmhoJNmwL9ksTdoiMlAiQ_jT-T7zAk';
const supabase = createClient(supabaseUrl, supabaseKey);

async function sync() {
  const path = 'src/app/data/default_questions.json';
  const defaultQuestions = JSON.parse(fs.readFileSync(path, 'utf8'));

  const { data: dbQuestions, error } = await supabase.from('questions').select('*');
  if (error) {
    console.error('Error fetching questions:', error);
    return;
  }
  console.log(`Found ${dbQuestions.length} questions in Supabase.`);

  let updated = 0;
  for (const dbQ of dbQuestions) {
    // Find matching question in default_questions.json by language and title
    const match = defaultQuestions.find(dq => dq.language === dbQ.language && dq.title === dbQ.title);
    if (match) {
      const { error: updateErr } = await supabase
        .from('questions')
        .update({ vivas: match.vivas })
        .eq('id', dbQ.id);
      
      if (updateErr) {
        console.error(`Error updating question ${dbQ.id}:`, updateErr);
      } else {
        updated++;
      }
    }
  }
  console.log(`Successfully updated ${updated} questions in Supabase with the new MCQs!`);
}

sync();
