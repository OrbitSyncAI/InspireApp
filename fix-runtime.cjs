const fs = require('fs');

const appFile = 'src/App.jsx';
let content = fs.readFileSync(appFile, 'utf8');

// Fix 1: Pass appQuotes to dailyQuoteIndex
content = content.replace('function dailyQuoteIndex() {', 'function dailyQuoteIndex(appQuotes) {');
content = content.replace('const start = dailyQuoteIndex()', 'const start = dailyQuoteIndex(appQuotes)');

// Fix 2: Move tabKeys inside App()
content = content.replace("const tabKeys = Object.keys(appCats).filter(k => k !== 'LIKED')", '');

const insertTabKeys = `export default function App() {
  const [appCats, setAppCats] = useState(localCategories);
  const [appQuotes, setAppQuotes] = useState(localQuotes);
  
  const tabKeys = Object.keys(appCats).filter(k => k !== 'LIKED');`;

content = content.replace(`export default function App() {
  const [appCats, setAppCats] = useState(localCategories);
  const [appQuotes, setAppQuotes] = useState(localQuotes);`, insertTabKeys);

// Fix 3: Daily quotes shouldn't use useMemo with empty dependency array if appQuotes can change async!
// We should add appQuotes to the dependency array.
content = content.replace(`  const dailyQuotes = useMemo(() => {
    const start = dailyQuoteIndex(appQuotes)
    return Array.from({ length: Math.min(5, appQuotes.length) }, (_, i) => appQuotes[(start + i * 17) % appQuotes.length])
  }, [])`, `  const dailyQuotes = useMemo(() => {
    const start = dailyQuoteIndex(appQuotes)
    return Array.from({ length: Math.min(5, appQuotes.length) }, (_, i) => appQuotes[(start + i * 17) % appQuotes.length])
  }, [appQuotes])`);


fs.writeFileSync(appFile, content);
console.log("Fixes applied.");
