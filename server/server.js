const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;
const KEYS_FILE = path.join(__dirname, 'keys.json');
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'inspire-admin-secret-key';

app.use(cors());
app.use(bodyParser.json());

// Helper to read keys configuration
function readKeysConfig() {
  try {
    if (!fs.existsSync(KEYS_FILE)) {
      return { defaultProvider: 'gemini', gemini: { defaultModel: 'gemini-3.1-flash-lite', activeKey: '', keys: [], models: [] } };
    }
    return JSON.parse(fs.readFileSync(KEYS_FILE, 'utf8'));
  } catch (error) {
    console.error('Error reading keys configuration:', error);
    return {};
  }
}

// Helper to write keys configuration
function writeKeysConfig(config) {
  try {
    fs.writeFileSync(KEYS_FILE, JSON.stringify(config, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('Error saving keys configuration:', error);
    return false;
  }
}

// Helper to query Gemini API via Node https
function fetchGemini(model, key, prompt) {
  return new Promise((resolve, reject) => {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`;
    const data = JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] });

    const req = https.request(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const json = JSON.parse(body);
            const text = json.candidates?.[0]?.content?.parts?.map(p => p.text).join('\n') || '';
            resolve(text);
          } catch (e) {
            reject(new Error(`Failed to parse Gemini response: ${e.message}`));
          }
        } else {
          reject({ statusCode: res.statusCode, message: body || 'Unknown error' });
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// Helper to query OpenAI-like endpoints via Node https
function fetchOpenAiLike(endpointUrl, model, key, prompt) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(endpointUrl);
    const client = parsedUrl.protocol === 'https:' ? https : http;
    const data = JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.8
    });

    const req = client.request(endpointUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length,
        'Authorization': `Bearer ${key}`,
        'HTTP-Referer': 'https://github.com/OrbitSyncAI/InspireApp',
        'X-Title': 'InspireApp'
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const json = JSON.parse(body);
            const text = json.choices?.[0]?.message?.content || '';
            resolve(text);
          } catch (e) {
            reject(new Error(`Failed to parse AI response: ${e.message}`));
          }
        } else {
          reject({ statusCode: res.statusCode, message: body || 'Unknown error' });
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// Auth Middleware for admin actions
function checkAdminAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || authHeader !== `Bearer ${ADMIN_TOKEN}`) {
    return res.status(401).json({ error: 'Unauthorized. Invalid admin token.' });
  }
  next();
}

// ==========================================
// API Endpoints
// ==========================================

// 1. Generate text endpoint with fallback support
app.post('/api/generate', async (req, res) => {
  const { provider, model, prompt } = req.body;
  const config = readKeysConfig();

  const activeProvider = provider || config.defaultProvider || 'gemini';
  const providerConfig = config[activeProvider];

  if (!providerConfig) {
    return res.status(400).json({ error: `Provider ${activeProvider} is not configured.` });
  }

  // Get keys to try (default / active first, then list)
  let keysToTry = [];
  if (providerConfig.activeKey) {
    keysToTry.push(providerConfig.activeKey);
  }
  if (Array.isArray(providerConfig.keys)) {
    keysToTry = [...keysToTry, ...providerConfig.keys.filter(k => k !== providerConfig.activeKey)];
  }

  if (keysToTry.length === 0) {
    return res.status(400).json({ error: `No API keys available for ${activeProvider}. Please configure them first.` });
  }

  const targetModel = model || providerConfig.defaultModel;

  if (activeProvider === 'gemini') {
    // Try each key sequentially in case of error (rate limit, quota, invalid)
    let lastError = null;
    for (let i = 0; i < keysToTry.length; i++) {
      const currentKey = keysToTry[i];
      try {
        console.log(`[AI] Attempting generation with Gemini model ${targetModel} (Key ${i + 1}/${keysToTry.length})`);
        const text = await fetchGemini(targetModel, currentKey, prompt);
        return res.json({ text, provider: 'gemini', model: targetModel });
      } catch (error) {
        console.error(`[AI] Gemini Key ${i + 1} failed:`, error.message || error);
        lastError = error;
      }
    }
    return res.status(500).json({
      error: `All configured Gemini keys failed. Last error: ${lastError?.message || lastError}`
    });
  } else {
    // OpenAI like providers
    const openAiEndpoints = {
      openai: 'https://api.openai.com/v1/chat/completions',
      groq: 'https://api.groq.com/openai/v1/chat/completions',
      mistral: 'https://api.mistral.ai/v1/chat/completions',
      openrouter: 'https://openrouter.ai/api/v1/chat/completions',
      deepseek: 'https://api.deepseek.com/chat/completions',
    };

    const endpoint = openAiEndpoints[activeProvider];
    if (!endpoint) {
      return res.status(400).json({ error: `Unsupported provider: ${activeProvider}` });
    }

    let lastError = null;
    for (let i = 0; i < keysToTry.length; i++) {
      const currentKey = keysToTry[i];
      try {
        console.log(`[AI] Attempting generation with ${activeProvider} model ${targetModel} (Key ${i + 1}/${keysToTry.length})`);
        const text = await fetchOpenAiLike(endpoint, targetModel, currentKey, prompt);
        return res.json({ text, provider: activeProvider, model: targetModel });
      } catch (error) {
        console.error(`[AI] ${activeProvider} Key ${i + 1} failed:`, error.message || error);
        lastError = error;
      }
    }
    return res.status(500).json({
      error: `All configured ${activeProvider} keys failed. Last error: ${lastError?.message || lastError}`
    });
  }
});

// 2. GET API Key configuration (Masked for safety)
app.get('/api/keys', checkAdminAuth, (req, res) => {
  const config = readKeysConfig();
  
  // Mask keys for response
  const responseConfig = {
    defaultProvider: config.defaultProvider || 'gemini'
  };

  Object.keys(config).forEach(key => {
    if (key === 'defaultProvider') return;
    const providerData = config[key];
    responseConfig[key] = {
      defaultModel: providerData.defaultModel,
      models: providerData.models || [],
      activeKeyMasked: providerData.activeKey ? `${providerData.activeKey.slice(0, 6)}...${providerData.activeKey.slice(-4)}` : '',
      keysCount: Array.isArray(providerData.keys) ? providerData.keys.length : 0,
      keysMasked: Array.isArray(providerData.keys) ? providerData.keys.map(k => `${k.slice(0, 6)}...${k.slice(-4)}`) : []
    };
  });

  res.json(responseConfig);
});

// 3. POST Update API Key configuration
app.post('/api/keys', checkAdminAuth, (req, res) => {
  const { provider, defaultModel, activeKey, keys, defaultProvider } = req.body;
  const config = readKeysConfig();

  if (defaultProvider) {
    config.defaultProvider = defaultProvider;
  }

  if (provider) {
    if (!config[provider]) {
      config[provider] = { defaultModel: '', activeKey: '', keys: [], models: [] };
    }
    
    if (defaultModel !== undefined) {
      config[provider].defaultModel = defaultModel;
    }
    if (activeKey !== undefined) {
      config[provider].activeKey = activeKey;
    }
    if (Array.isArray(keys)) {
      config[provider].keys = keys;
    }
  }

  const success = writeKeysConfig(config);
  if (success) {
    res.json({ message: 'Keys configuration updated successfully.' });
  } else {
    res.status(500).json({ error: 'Failed to write keys configuration.' });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`======================================================`);
  console.log(`InspireApp Secure AI Server listening on port ${PORT}`);
  console.log(`Admin Token: ${ADMIN_TOKEN}`);
  console.log(`Keys File: ${KEYS_FILE}`);
  console.log(`======================================================`);
});
