'use client';

import { useState } from 'react';
import { Microphone, PaperPlaneTilt, CheckCircle } from '@phosphor-icons/react';

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
  const [contact, setContact] = useState('');
  const [listening, setListening] = useState(false);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

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

  const enquiryText = message.trim();

  async function sendEnquiry() {
    setError('');
    if (!enquiryText) {
      setError('Please type or speak your question first.');
      return;
    }
    setSending(true);
    try {
      const escapedMessage = enquiryText.replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const escapedContact = contact.trim().replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: 'payments@godirect247.co.za',
          subject: 'New PEARL enquiry from godirect247.com',
          html: `
            <h2 style="margin:0 0 12px;font-size:18px;color:#191c1f;">New PEARL enquiry</h2>
            <p style="margin:0 0 8px;font-size:14px;color:#505a63;">A visitor sent an enquiry through PEARL on the GoDirect247 website.</p>
            <div style="margin:14px 0;padding:14px 16px;background:#f7f8fa;border-radius:12px;border:1px solid #e4e8eb;font-size:15px;color:#191c1f;white-space:pre-wrap;">${escapedMessage}</div>
            ${escapedContact ? `<p style="margin:0;font-size:14px;color:#191c1f;"><strong>Reply to:</strong> ${escapedContact}</p>` : '<p style="margin:0;font-size:14px;color:#8d969e;">No contact details provided.</p>'}
          `,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Could not send your enquiry. Please try again.');
        return;
      }
      setSent(true);
      setMessage('');
      setContact('');
    } catch {
      setError('Could not send your enquiry. Please try again.');
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="bg-[#191c1f] px-5 py-14 border-y border-white/10">
      <div className="max-w-4xl mx-auto">
        <div className="grid gap-5 md:grid-cols-[0.9fr_1.1fr] md:items-center">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#f3cc20]/25 bg-[#f3cc20]/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-[#f3cc20]">
              <Microphone size={14} /> PEARL · GoDirect247 AI Agent
            </div>
            <h2 className="font-display text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              Ask PEARL before you sign up
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-white/50">
              PEARL is the GoDirect247 AI Agent. Customers can speak or type a question before
              joining, then send it directly to the GoDirect247 team.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-4">
            <textarea
              value={message}
              onChange={(event) => {
                setMessage(event.target.value);
                if (sent) setSent(false);
              }}
              placeholder="Type your question here, or tap the mic and speak..."
              rows={4}
              className="w-full resize-none rounded-xl border border-white/10 bg-[#191c1f] px-4 py-3 text-sm text-white placeholder-white/30"
            />
            <input
              type="text"
              value={contact}
              onChange={(event) => setContact(event.target.value)}
              placeholder="Your email or phone (optional, so we can reply)"
              className="mt-2 w-full rounded-xl border border-white/10 bg-[#191c1f] px-4 py-3 text-sm text-white placeholder-white/30"
            />
            {error && <p className="mt-2 text-xs text-[#e23b4a]">{error}</p>}
            {sent && (
              <p className="mt-2 flex items-center gap-1.5 text-xs text-[#f3cc20]">
                <CheckCircle size={14} weight="fill" /> Thanks — PEARL has sent your enquiry to the GoDirect247 team.
              </p>
            )}
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
              <button
                type="button"
                onClick={sendEnquiry}
                disabled={sending}
                className="flex items-center justify-center gap-2 rounded-xl bg-[#f3cc20] px-4 py-3 text-sm font-bold text-[#191c1f] transition-all hover:bg-[#e0bb13] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <PaperPlaneTilt size={16} weight="fill" />
                {sending ? 'Sending...' : 'Send to PEARL'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
