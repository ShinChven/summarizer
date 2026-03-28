import { GoogleGenAI } from '@google/genai';

let audioContext;
let audioQueue = [];
let isPlaying = false;
let session;

const statusEl = document.getElementById('status');
const summarizeBtn = document.getElementById('summarizeBtn');
const stopBtn = document.getElementById('stopBtn');
const apiKeyInput = document.getElementById('apiKey');
const saveBtn = document.getElementById('saveApiKey');
const summaryEl = document.getElementById('summary');
const toSettingsBtn = document.getElementById('toSettings');
const toMainBtn = document.getElementById('toMain');
const mainView = document.getElementById('mainView');
const settingsView = document.getElementById('settingsView');
const languageSelect = document.getElementById('languageSelect');

// View Switching
toSettingsBtn.addEventListener('click', () => {
  mainView.style.display = 'none';
  settingsView.style.display = 'flex';
  toSettingsBtn.style.visibility = 'hidden';
});

toMainBtn.addEventListener('click', () => {
  mainView.style.display = 'flex';
  settingsView.style.display = 'none';
  toSettingsBtn.style.visibility = 'visible';
});

// Load settings from storage
chrome.storage.local.get(['geminiApiKey', 'selectedLanguage'], (result) => {
  if (result.geminiApiKey) {
    apiKeyInput.value = result.geminiApiKey;
  }
  if (result.selectedLanguage) {
    languageSelect.value = result.selectedLanguage;
  }
});

// Save language preference when changed
languageSelect.addEventListener('change', () => {
  chrome.storage.local.set({ selectedLanguage: languageSelect.value });
});

saveBtn.addEventListener('click', () => {
  const key = apiKeyInput.value.trim();
  if (key) {
    chrome.storage.local.set({ geminiApiKey: key }, () => {
      const originalText = saveBtn.textContent;
      const originalBg = saveBtn.style.backgroundColor;
      
      saveBtn.textContent = 'Saved!';
      saveBtn.style.backgroundColor = '#10b981'; // Success green
      saveBtn.disabled = true;

      setTimeout(() => {
        saveBtn.textContent = originalText;
        saveBtn.style.backgroundColor = originalBg;
        saveBtn.disabled = false;
      }, 2000);
    });
  }
});

summarizeBtn.addEventListener('click', async () => {
  const key = apiKeyInput.value.trim();
  if (!key) {
    alert('Please enter a Gemini API Key.');
    return;
  }

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab) {
      throw new Error('No active tab found.');
    }

    if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('about:')) {
      throw new Error(`Cannot summarize this type of page (system or restricted): ${tab.url || 'No URL found'}`);
    }

    updateStatus('Extracting page text...', true);
    const [{result}] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => document.body.innerText
    });
    const pageText = result;

    if (!pageText || pageText.trim().length === 0) {
      throw new Error('No text content found on this page.');
    }

    summaryEl.innerHTML = ''; 
    summarizeBtn.disabled = true;
    stopBtn.disabled = false;
    toSettingsBtn.disabled = true;

    if (session) {
      console.log('Using existing session...');
      updateStatus('Summarizing...', true);
      const language = languageSelect.value;
      session.sendRealtimeInput({ 
        text: `Please summarize this web page content in ${language} and read it aloud: \n\n${pageText}` 
      });
    } else {
      updateStatus('Connecting to Gemini 3.1 Flash Live...', true);
      await startGeminiLive(key, pageText);
    }
  } catch (error) {
    console.error(error);
    updateStatus('Error: ' + error.message, false);
    summarizeBtn.disabled = false;
    stopBtn.disabled = true;
    toSettingsBtn.disabled = false;
  }
});

stopBtn.addEventListener('click', () => {
  stopSession();
});

function updateStatus(text, isActive = null) {
  if (isActive !== null) {
    if (isActive) statusEl.parentElement.classList.add('active');
    else statusEl.parentElement.classList.remove('active');
  }
  // Keep the pulse element
  statusEl.innerHTML = `<div class="pulse"></div>${text}`;
}

function stopSession() {
  if (session) {
    session.close();
    session = null;
  }
  stopAudio();
  updateStatus('Stopped.', false);
  summarizeBtn.disabled = false;
  stopBtn.disabled = true;
  toSettingsBtn.disabled = false;
}

async function startGeminiLive(apiKey, text) {
  const ai = new GoogleGenAI({ apiKey });

  session = await ai.live.connect({
    model: 'gemini-3.1-flash-live-preview',
    config: {
      responseModalities: ['audio'],
      thinkingLevel: 'minimal',
      systemInstruction: {
        parts: [{ text: 'You are AI Voice Summarizer, a helpful assistant that summarizes web pages concisely and reads the summary aloud. Use a natural, engaging tone.' }]
      }
    },
    callbacks: {
      onopen: () => {
        console.log('Gemini Live session opened');
        updateStatus('Summarizing...', true);
      },
      onmessage: (response) => {
        const content = response.serverContent;
        if (content?.modelTurn?.parts) {
          for (const part of content.modelTurn.parts) {
            if (part.inlineData) {
              const base64Audio = part.inlineData.data;
              queueAudio(base64Audio);
            }
          }
        }
        if (content?.outputTranscription) {
          summaryEl.textContent += content.outputTranscription.text + ' ';
          summaryEl.scrollTop = summaryEl.scrollHeight;
        }
        if (content?.interrupted) {
          stopAudio();
        }
        if (response.serverContent?.turnComplete) {
           updateStatus('Summarization complete.', false);
           summarizeBtn.disabled = false;
           toSettingsBtn.disabled = false;
        }
      },
      onerror: (error) => {
        console.error('Gemini Error:', error);
        updateStatus('Gemini Error: ' + error.message, false);
        stopSession();
      },
      onclose: () => {
        console.log('Session closed');
        updateStatus('Connection closed.', false);
        summarizeBtn.disabled = false;
        stopBtn.disabled = true;
        toSettingsBtn.disabled = false;
      }
    }
  });

  // Send the initial request after the session is successfully connected
  console.log('Sending initial request...');
  const language = languageSelect.value;
  session.sendRealtimeInput({ 
    text: `Please summarize this web page content in ${language} and read it aloud: \n\n${text}` 
  });
}

// Audio Handling
function initAudio() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 });
  }
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }
}

function queueAudio(base64Data) {
  initAudio();
  const binaryString = atob(base64Data);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  
  // Convert 16-bit PCM (little-endian) to Float32
  const int16Array = new Int16Array(bytes.buffer);
  const float32Array = new Float32Array(int16Array.length);
  for (let i = 0; i < int16Array.length; i++) {
    float32Array[i] = int16Array[i] / 32768;
  }

  audioQueue.push(float32Array);
  if (!isPlaying) {
    playNext();
  }
}

let nextStartTime = 0;

let activeSources = [];

function playNext() {
  if (audioQueue.length === 0) {
    isPlaying = false;
    return;
  }

  isPlaying = true;
  const chunk = audioQueue.shift();
  const buffer = audioContext.createBuffer(1, chunk.length, 24000);
  buffer.getChannelData(0).set(chunk);

  const source = audioContext.createBufferSource();
  source.buffer = buffer;
  source.connect(audioContext.destination);

  const currentTime = audioContext.currentTime;
  if (nextStartTime < currentTime) {
    nextStartTime = currentTime;
  }

  source.start(nextStartTime);
  nextStartTime += buffer.duration;

  activeSources.push(source);
  source.onended = () => {
    activeSources = activeSources.filter(s => s !== source);
    playNext();
  };
}

function stopAudio() {
  audioQueue = [];
  isPlaying = false;
  nextStartTime = 0;
  activeSources.forEach(source => {
    try {
      source.stop();
    } catch (e) {}
  });
  activeSources = [];
}
