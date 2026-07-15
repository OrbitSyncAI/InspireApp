const fs = require('fs');
let c = fs.readFileSync('src/App.jsx', 'utf8');

c = c.replace(/import { categories, gradients, allQuotes, currentYear } from '\.\/data'/g, 
  "import { categories as localCategories, gradients, allQuotes as localQuotes, currentYear } from './data'");

const stateInsert = `  const [appCats, setAppCats] = useState(localCategories);
  const [appQuotes, setAppQuotes] = useState(localQuotes);
  
  useEffect(() => {
    async function loadCmsData() {
      try {
        const [catRes, quoteRes] = await Promise.all([
          supabase.from('app_categories').select('*'),
          supabase.from('app_quotes').select('*')
        ]);
        
        if (catRes.data && catRes.data.length > 0) {
          const newCats = { ...localCategories };
          catRes.data.forEach(c => {
            newCats[c.id] = { label: c.label, emoji: c.emoji, gradient: [c.gradient_start || '#667EEA', c.gradient_end || '#764BA2'] };
          });
          setAppCats(newCats);
        }
        
        if (quoteRes.data && quoteRes.data.length > 0) {
          const cmsQuotes = quoteRes.data.flatMap(q => 
            (q.category_ids || []).map(cat => ({ text: q.text, author: q.author, category: cat }))
          );
          setAppQuotes([...cmsQuotes, ...localQuotes]);
        }
      } catch (e) { console.error('CMS Load Error:', e); }
    }
    loadCmsData();
  }, []);
`;

c = c.replace('const [menuOpen, setMenuOpen] = useState(false)', 'const [menuOpen, setMenuOpen] = useState(false)\n' + stateInsert);

// Replace usages but carefully. 
// "allQuotes" -> "appQuotes"
c = c.replace(/\ballQuotes\b/g, 'appQuotes');
// Fix the import alias back
c = c.replace(/appQuotes as localQuotes/g, 'allQuotes as localQuotes');
c = c.replace(/localQuotes\b/g, 'localQuotes'); // just verifying

// "categories" -> "appCats"
c = c.replace(/\bcategories\b/g, 'appCats');
c = c.replace(/appCats as localCategories/g, 'categories as localCategories');
c = c.replace(/setMobileCategoriesOpen/g, 'setMobileCategoriesOpen'); // don't touch functions containing categories
c = c.replace(/mobileCategoriesOpen/g, 'mobileCategoriesOpen');
c = c.replace(/mobile-category-toggle/g, 'mobile-category-toggle');

fs.writeFileSync('src/App.jsx', c);
console.log('Dynamic CMS data hooked up.');
