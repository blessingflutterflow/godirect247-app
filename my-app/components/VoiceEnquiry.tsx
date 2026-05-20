'use client';

import { useState } from 'react';
import { Microphone, PaperPlaneTilt, WhatsappLogo } from '@phosphor-icons/react';

interface SpeechRecognitionResultItem {
  transcript: string;
}

interface SpeechRecognitionResultListItem {
  0: SpeechRecognitionResultItem;
}

interface SpeechRecognitionEvent {
  results: {
    [index: number]: SpeechRecognitionResultListItem;
    length: number;
  };
}

interface BrowserSpeechRecognition {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
}

type SpeechRecognitionConstructor = new () => BrowserSpeechRecognition;

function getSpeechRecognition(): SpeechRecognitionConstructor | null {
  const speechWindow = window as Window & {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition || null;
}

export function VoiceEnquiry() {
  const [message, setMessage] = useState('');
  const [listening, setListening] = useState(false);
  const [error, setError] = useState('');

  function startVoice() {
    setError('');
    const SpeechRecognition = getSpeechRecognition();
    if (!SpeechRecognition) {
      setError('Voice typing is not supported on this browser. Please type your question.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-ZA';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => {
      const transcript = event.results[event.results.length - 1]?.[0]?.transcript?.trim();
      if (transcript) setMessage((current) => `${current}${current ? ' ' : ''}${transcript}`);
    };
    recognition.onerror = () => {
      setListening(false);
      setError('Could not hear clearly. Please try again or type your question.');
    };
    recognition.onend = () => setListening(false);
    setListening(true);
    recognition.start();
  }

  const enquiryText = message.trim() || 'Hi GoDirect247, I would like to enquire before signing up.';
  const whatsappHref = `https://wa.me/27780638753?text=${encodeURIComponent(enquiryText)}`;

  return (
    <section className="bg-[#191c1f] px-5 py-14 border-y border-white/10">
      <div className="max-w-4xl mx-auto">
        <div className="grid gap-5 md:grid-cols-[0.9fr_1.1fr] md:items-center">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#f3cc20]/25 bg-[#f3cc20]/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-[#f3cc20]">
              <Microphone size={14} /> Voice enquiry
            </div>
            <h2 className="font-display text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              Ask before you sign up
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-white/50">
              Customers can speak or type a question and send it directly to the GoDirect247 team.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-4">
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Type your question here, or tap the mic and speak..."
              rows={4}
              className="w-full resize-none rounded-xl border border-white/10 bg-[#191c1f] px-4 py-3 text-sm text-white placeholder-white/30"
            />
            {error && <p className="mt-2 text-xs text-[#e23b4a]">{error}</p>}
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={startVoice}
                className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition-all ${
                  listening
                    ? 'border-[#f3cc20]/50 bg-[#f3cc20]/10 text-[#f3cc20]'
                    : 'border-white/15 bg-white/5 text-white/70 hover:bg-white/10'
                }`}
              >
                <Microphone size={16} weight={listening ? 'fill' : 'regular'} />
                {listening ? 'Listening...' : 'Speak'}
              </button>
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 py-3 text-sm font-bold text-white transition-all hover:bg-[#128C7E]"
              >
                {message.trim() ? <PaperPlaneTilt size={16} /> : <WhatsappLogo size={16} weight="fill" />}
                Send enquiry
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
