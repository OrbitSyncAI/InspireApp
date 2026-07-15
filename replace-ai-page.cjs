const fs = require('fs');

const appFile = 'src/App.jsx';
let content = fs.readFileSync(appFile, 'utf8');

const startStr = 'async function callAiResponse(prompt, mimeType = \'\', base64Data = \'\') {';
const endStr = 'function SavedQuotesPage(';

const startIndex = content.indexOf(startStr);
const endIndex = content.indexOf(endStr);

if (startIndex === -1 || endIndex === -1) {
  console.error("Could not find bounds.");
  process.exit(1);
}

const newAiPage = `
async function callAiChatResponse(chatHistory, useThinkingModel = false) {
  console.log(\`[Supabase RPC] Invoking generate_ai_chat_response, thinking:\`, useThinkingModel);
  const { data, error } = await supabase.rpc('generate_ai_chat_response', {
    chat_history: chatHistory,
    use_thinking_model: useThinkingModel
  });

  if (error) throw new Error(error.message);
  if (data && data.success === false) throw new Error(data.error || 'AI generation failed');
  return data.text;
}

function AiQuotesPage({ savedQuotes, setSavedQuotes, onFav, favorites, triggerToast }) {
  const [chats, setChats] = useState(() => {
    try { return JSON.parse(localStorage.getItem('inspire-ai-chats') || '[]') } catch { return [] }
  });
  const [activeChatId, setActiveChatId] = useState(null);
  
  const activeChat = useMemo(() => chats.find(c => c.id === activeChatId), [chats, activeChatId]);

  const [prompt, setPrompt] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  
  const [useThinking, setUseThinking] = useState(false)
  const [thinkingUses, setThinkingUses] = useState(() => {
    try { return JSON.parse(localStorage.getItem('inspire-thinking-uses') || '[]') } catch { return [] }
  })
  
  // Clean old uses (older than 24h)
  useEffect(() => {
    const now = Date.now();
    const validUses = thinkingUses.filter(t => now - t < 24 * 60 * 60 * 1000);
    if (validUses.length !== thinkingUses.length) {
      setThinkingUses(validUses);
      localStorage.setItem('inspire-thinking-uses', JSON.stringify(validUses));
    }
  }, [thinkingUses]);

  useEffect(() => {
    localStorage.setItem('inspire-ai-chats', JSON.stringify(chats));
  }, [chats]);

  const remainingThinking = Math.max(0, 10 - thinkingUses.length);
  let nextUnlockStr = '';
  if (remainingThinking === 0 && thinkingUses.length > 0) {
    const oldest = Math.min(...thinkingUses);
    const unlockTime = new Date(oldest + 24 * 60 * 60 * 1000);
    nextUnlockStr = \`Unlocks at \${unlockTime.toLocaleTimeString()}\`;
  }

  const createNewChat = () => {
    const newChat = { id: Date.now().toString(), title: 'New Chat', messages: [], createdAt: new Date().toISOString() };
    setChats(prev => [newChat, ...prev]);
    setActiveChatId(newChat.id);
    setError('');
  };

  useEffect(() => {
    if (chats.length === 0) {
      createNewChat();
    } else if (!activeChatId) {
      setActiveChatId(chats[0].id);
    }
  }, []);

  const generate = async (overridePrompt = null) => {
    const currentPrompt = overridePrompt !== null ? overridePrompt : prompt.trim();
    if (!currentPrompt) return;
    
    if (useThinking && remainingThinking <= 0) {
      setError(\`Thinking mode limit reached. \${nextUnlockStr}\`);
      return;
    }

    setBusy(true);
    setError('');
    if (overridePrompt === null) setPrompt('');

    let currentMessages = activeChat?.messages || [];
    
    // If it's a regeneration, we don't append the user message again.
    // Assuming overridePrompt implies we just cut the history there and re-run.
    const newMessages = [...currentMessages, { role: 'user', parts: [{ text: currentPrompt }] }];
    
    setChats(prev => prev.map(c => {
      if (c.id === activeChatId) {
        return { ...c, messages: newMessages, title: c.title === 'New Chat' ? currentPrompt.slice(0, 25) + '...' : c.title };
      }
      return c;
    }));

    try {
      if (useThinking) {
        const newUses = [...thinkingUses, Date.now()];
        setThinkingUses(newUses);
        localStorage.setItem('inspire-thinking-uses', JSON.stringify(newUses));
      }

      // Convert format for Gemini
      const historyForGemini = newMessages.map(m => ({
        role: m.role,
        parts: m.parts
      }));

      const responseText = await callAiChatResponse(historyForGemini, useThinking);

      setChats(prev => prev.map(c => {
        if (c.id === activeChatId) {
          return { ...c, messages: [...newMessages, { role: 'model', parts: [{ text: responseText }] }] };
        }
        return c;
      }));
    } catch (e) {
      setError(e.message || 'AI generation failed');
      // Revert user message if it failed completely
      setChats(prev => prev.map(c => c.id === activeChatId ? { ...c, messages: currentMessages } : c));
    } finally {
      setBusy(false);
    }
  };

  const copy = (text) => {
    copyText(text).then(ok => {
      if (ok) triggerToast('Copied to clipboard! 📋')
    })
  }

  const deleteChat = (e, id) => {
    e.stopPropagation();
    const newChats = chats.filter(c => c.id !== id);
    setChats(newChats);
    if (activeChatId === id) {
      setActiveChatId(newChats.length > 0 ? newChats[0].id : null);
    }
  }
  
  const editMessage = (index) => {
    if (!activeChat) return;
    const msg = activeChat.messages[index];
    if (msg.role !== 'user') return;
    setPrompt(msg.parts[0].text);
    // Cut history up to this message
    setChats(prev => prev.map(c => c.id === activeChatId ? { ...c, messages: c.messages.slice(0, index) } : c));
  }

  const components = {
    a: ({node, ...props}) => <a {...props} target="_blank" rel="noopener noreferrer" style={{ color: '#667EEA', textDecoration: 'underline' }} />
  };

  return (
    <div className="static-page" style={{ padding: '0', display: 'flex', height: 'calc(100vh - 120px)' }}>
      {/* Sidebar for Chat History */}
      <aside className="chat-sidebar" style={{ width: '250px', borderRight: '1px solid var(--static-border)', display: 'flex', flexDirection: 'column', background: 'var(--static-bg)', overflowY: 'auto' }}>
        <div style={{ padding: '16px' }}>
          <button className="cta-btn" onClick={createNewChat} style={{ width: '100%' }}>+ New Chat</button>
        </div>
        <div style={{ flex: 1, padding: '0 8px' }}>
          {chats.map(c => (
            <div key={c.id} onClick={() => setActiveChatId(c.id)} style={{ padding: '10px 12px', marginBottom: '8px', borderRadius: '8px', cursor: 'pointer', background: activeChatId === c.id ? 'rgba(102, 126, 234, 0.1)' : 'transparent', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.9rem', color: 'var(--static-heading)' }}>{c.title}</div>
              <button onClick={(e) => deleteChat(e, c.id)} style={{ background: 'none', border: 'none', color: '#FC8181', cursor: 'pointer', padding: '4px' }}>✕</button>
            </div>
          ))}
        </div>
      </aside>

      {/* Main Chat Area */}
      <div className="chat-main" style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', background: 'var(--static-bg)' }}>
        
        <div className="chat-messages" style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {activeChat?.messages.length === 0 && (
            <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--text-secondary)' }}>
              <h2 style={{ fontSize: '1.5rem', marginBottom: '8px', color: 'var(--static-heading)' }}>🤖 Inspire AI Quotes</h2>
              <p>Ask for any quotes! (I exclusively generate quotes)</p>
            </div>
          )}
          {activeChat?.messages.map((m, idx) => (
            <div key={idx} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
              <div style={{ 
                maxWidth: '80%', 
                padding: '16px', 
                borderRadius: '12px', 
                background: m.role === 'user' ? 'var(--primary-color, #667EEA)' : 'rgba(102, 126, 234, 0.05)', 
                color: m.role === 'user' ? '#fff' : 'var(--static-text)',
                border: m.role === 'user' ? 'none' : '1px solid var(--static-border)'
              }}>
                <div className="markdown-body" style={{ color: 'inherit' }}>
                  <ReactMarkdown components={components} remarkPlugins={[remarkGfm]}>{m.parts[0].text}</ReactMarkdown>
                </div>
                {m.role === 'model' && (
                  <div style={{ display: 'flex', gap: '8px', marginTop: '12px', justifyContent: 'flex-end' }}>
                    <button onClick={() => copy(m.parts[0].text)} style={{ background: 'transparent', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '4px', padding: '4px 8px', fontSize: '0.8rem', cursor: 'pointer', color: 'inherit' }}>📋 Copy</button>
                  </div>
                )}
                {m.role === 'user' && !busy && (
                  <div style={{ display: 'flex', gap: '8px', marginTop: '8px', justifyContent: 'flex-end' }}>
                    <button onClick={() => editMessage(idx)} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.7)', fontSize: '0.8rem', cursor: 'pointer' }}>✏️ Edit</button>
                  </div>
                )}
              </div>
            </div>
          ))}
          {busy && (
            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
              <div style={{ padding: '16px', borderRadius: '12px', background: 'rgba(102, 126, 234, 0.05)', color: 'var(--static-text)', border: '1px solid var(--static-border)' }}>
                <span className="spinner" style={{ display: 'inline-block', width: '16px', height: '16px', border: '2px solid transparent', borderTopColor: 'var(--primary-color)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></span> Thinking...
              </div>
            </div>
          )}
        </div>

        <div className="chat-input-area" style={{ padding: '16px 24px', borderTop: '1px solid var(--static-border)', background: 'var(--static-bg)' }}>
          {error && <div style={{ color: '#FC8181', marginBottom: '8px', fontSize: '0.85rem' }}>{error}</div>}
          
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                <input type="radio" checked={!useThinking} onChange={() => setUseThinking(false)} /> ⚡ Fast
              </label>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                <input type="radio" checked={useThinking} onChange={() => setUseThinking(true)} /> 🧠 Thinking 
                <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>({remainingThinking} left)</span>
              </label>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') generate(null); }}
              placeholder="Ask for any motivational quotes..."
              style={{ flex: 1, padding: '12px 16px', borderRadius: '24px', border: '1px solid var(--static-border)', background: 'var(--surface-color)', color: 'var(--text-primary)', outline: 'none' }}
              disabled={busy}
            />
            <button 
              onClick={() => generate(null)} 
              disabled={busy || !prompt.trim()} 
              style={{ background: 'var(--primary-color, #667EEA)', color: '#fff', border: 'none', borderRadius: '50%', width: '42px', height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', opacity: (busy || !prompt.trim()) ? 0.5 : 1 }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

`;

const finalContent = content.slice(0, startIndex) + newAiPage + content.slice(endIndex);
fs.writeFileSync(appFile, finalContent);
console.log("Replacement complete.");
