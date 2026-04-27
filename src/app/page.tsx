'use client';

import * as React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Volume2 } from 'lucide-react';
import { MessageBubble, type Message } from '@/components/chat/MessageBubble';
import { ChatInput } from '@/components/chat/ChatInput';
import { TypingIndicator } from '@/components/chat/TypingIndicator';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { VoiceButton, VoiceWaveform, VoiceChatFAB, VoiceIndicator } from '@/components/voice/VoiceControls';
import { AudioPlayer } from '@/components/media/AudioPlayer';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import AISphere from '@/components/ai/AISphere';

type VoiceState = 'idle' | 'listening' | 'processing' | 'speaking';

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [voiceMode, setVoiceMode] = useState(false);
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  // Fetch initial conversation
  useEffect(() => {
    fetch('/api/messages')
      .then(res => res.json())
      .then((data) => {
        if (data.messages.length === 0) {
          setMessages([
            {
              id: 'welcome',
              role: 'assistant',
              content: "Hello. I'm Shivver. You can type or use voice mode. How can I help?",
              timestamp: new Date(),
              agentName: 'Shivver',
            },
          ]);
        } else {
          setMessages(data.messages.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) })));
        }
      })
      .catch(console.error);
  }, []);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Text message send
  const sendMessage = useCallback(async (content: string) => {
    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);
    setIsTyping(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: content }),
      });

      if (!response.ok) throw new Error('Failed to send');

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No reader');

      const decoder = new TextDecoder();
      let assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        agentName: 'Shivver',
      };
      setMessages(prev => [...prev, assistantMsg]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        assistantMsg.content += chunk;
        setMessages(prev => {
          const next = [...prev];
          next[next.length - 1] = { ...assistantMsg, content: assistantMsg.content };
          return next;
        });
      }

      // Auto-TTS final response if voice mode
      if (voiceMode) {
        try {
          const ttsResp = await fetch('/api/tts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: assistantMsg.content }),
          });
          const ttsData = await ttsResp.json();
          if (ttsData.audioUrl) {
            setAudioUrl(ttsData.audioUrl);
            setVoiceState('speaking');
            // Play automatically
            setTimeout(() => {
              const audio = new Audio(ttsData.audioUrl);
              audio.play().catch(() => {});
              audio.onended = () => {
                setAudioPlaying(false);
                setVoiceState('idle');
              };
            }, 300);
          }
        } catch (err) {
          console.error('TTS failed:', err);
        }
      }

      setIsTyping(false);
    } catch (err) {
      console.error(err);
      setMessages(prev => [
        ...prev,
        { id: (Date.now() + 1).toString(), role: 'system', content: 'Something went wrong.', timestamp: new Date() },
      ]);
      setIsTyping(false);
      setVoiceState('idle');
    }
  }, [voiceMode]);

  // Voice recording toggle
  const toggleVoiceRecording = useCallback(async () => {
    if (!voiceMode) {
      setVoiceMode(true);
      setVoiceState('listening');
      startRecording();
    } else if (voiceState === 'listening') {
      stopRecording();
    }
  }, [voiceMode, voiceState]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        await transcribeAndSend(audioBlob);
        stream.getTracks().forEach(t => t.stop());
      };

      mediaRecorder.start();
      recognitionRef.current = mediaRecorder;
    } catch (err) {
      console.error('Mic access denied:', err);
      alert('Please allow microphone access for voice input.');
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current && recognitionRef.current.state === 'recording') {
      recognitionRef.current.stop();
      setVoiceState('processing');
    }
  };

  const transcribeAndSend = async (audioBlob: Blob) => {
    try {
      const formData = new FormData();
      formData.append('file', audioBlob, 'recording.webm');

      const resp = await fetch('/api/stt', {
        method: 'POST',
        body: formData,
      });

      if (!resp.ok) throw new Error('STT failed');

      const data = await resp.json();
      if (data.text) {
        sendMessage(data.text);
      } else {
        setVoiceState('idle');
        setVoiceMode(false);
      }
    } catch (err) {
      console.error('Transcription failed:', err);
      setVoiceState('idle');
      setVoiceMode(false);
    }
  };

  return (
    <div className="flex flex-col h-[100dvh] max-w-3xl mx-auto bg-base">
      {/* Header */}
      <header className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 glass border-b border-border/50">
        <div className="flex items-center gap-3">
          {/* AI Sphere — sound-reactive avatar */}
          <AISphere state={voiceMode ? voiceState : 'idle'} size={48} />
          <div>
            <h1 className="text-base font-semibold text-text">Shivver</h1>
            <p className="text-[11px] text-text-tertiary flex items-center gap-1">
              {voiceMode ? (
                voiceState === 'listening' ? 'Listening...' :
                voiceState === 'processing' ? 'Thinking...' :
                voiceState === 'speaking' ? 'Speaking...' : 'Voice mode'
              ) : 'Online — ready'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="accent" size="sm">BETA</Badge>
        </div>
      </header>

      {/* Voice indicator overlay */}
      <VoiceIndicator listening={voiceState === 'listening'} speaking={voiceState === 'speaking'} />

      {/* Messages */}
      <main className="flex-1 overflow-y-auto px-4 pb-4 pt-2">
        <div className="max-w-2xl mx-auto">
          <AnimatePresence>
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
          </AnimatePresence>

          <AnimatePresence>
            {isTyping && voiceMode && voiceState === 'processing' && (
              <TypingIndicator />
            )}
          </AnimatePresence>

          {/* Audio player for TTS responses */}
          <AnimatePresence>
            {audioUrl && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="my-4"
              >
                <AudioPlayer
                  src={audioUrl}
                  autoPlay
                  onEnded={() => {
                    setAudioUrl(null);
                    setVoiceState('idle');
                  }}
                />
              </motion.div>
            )}
          </AnimatePresence>

          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Input */}
      <div className="relative">
        {voiceMode ? (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-surface/80 backdrop-blur-xl border-t border-border p-4 flex flex-col items-center gap-4"
          >
            <div className="flex flex-col items-center gap-2">
              <VoiceWaveform active={voiceState === 'listening'} size="lg" />
              <p className="text-sm text-text-secondary">
                {voiceState === 'listening' ? 'Speak now...' :
                 voiceState === 'processing' ? 'Transcribing...' :
                 voiceState === 'speaking' ? 'Playing response...' : 'Ready'}
              </p>
            </div>

            <div className="flex gap-3">
              <VoiceButton
                onStartRecording={toggleVoiceRecording}
                onStopRecording={toggleVoiceRecording}
                isRecording={voiceState === 'listening'}
                isProcessing={voiceState === 'processing'}
              />
              <Button
                variant="ghost"
                onClick={() => {
                  setVoiceMode(false);
                  setVoiceState('idle');
                }}
              >
                <MicOff className="h-5 w-5 mr-2" />
                Exit voice
              </Button>
            </div>
          </motion.div>
        ) : null}

        <ChatInput
          onSend={sendMessage}
          disabled={isTyping || voiceMode}
        />
      </div>

      {/* Floating voice button (when not in voice mode) */}
      {!voiceMode && (
        <VoiceChatFAB
          onToggle={toggleVoiceRecording}
          active={voiceMode}
          disabled={isTyping}
        />
      )}
    </div>
  );
}
