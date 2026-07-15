const fs = require('fs');

const appFile = 'src/App.jsx';
let content = fs.readFileSync(appFile, 'utf8');

const stateInjectionPoint = 'const [busy, setBusy] = useState(false);';
const tabsInjectionPoint = '{/* Diagnostic latency widget */}';

if (!content.includes(stateInjectionPoint) || !content.includes(tabsInjectionPoint)) {
  console.error("Injection points not found");
  process.exit(1);
}

// 1. Inject state
const stateNewStr = \`const [busy, setBusy] = useState(false);
  const [adminMainTab, setAdminMainTab] = useState('api'); // 'api' or 'cms'\`;

content = content.replace(stateInjectionPoint, stateNewStr);

// 2. Inject Tabs UI
const tabsNewStr = \`
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', background: 'var(--surface-color)', padding: '10px', borderRadius: '12px', border: '1px solid var(--static-border)' }}>
          <button className={\`cta-btn \${adminMainTab === 'api' ? '' : 'cta-secondary'}\`} style={{ flex: 1 }} onClick={() => setAdminMainTab('api')}>API Config</button>
          <button className={\`cta-btn \${adminMainTab === 'cms' ? '' : 'cta-secondary'}\`} style={{ flex: 1 }} onClick={() => setAdminMainTab('cms')}>Content Manager</button>
        </div>

        {adminMainTab === 'cms' ? (
          <AdminCMS triggerToast={triggerToast} />
        ) : (
          <>
        {/* Diagnostic latency widget */}
\`;

// End the JSX conditional block for API config
// We need to wrap the rest of the return in this fragment.
const endOfReturn = \`                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );\`;

const endOfReturnNew = \`                </div>
              );
            })}
          </div>
        </div>
        </>
        )}
      </div>
    </div>
  );\`;

content = content.replace(tabsInjectionPoint, tabsNewStr);
content = content.replace(endOfReturn, endOfReturnNew);

fs.writeFileSync(appFile, content);
console.log("Replacement complete.");
