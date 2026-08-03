# AI Voice Assistant (additive)

Layer voice input and spoken replies on top of the existing AI Assistant at `/app/assistant`. The chat pipeline (RAG, farm context, Gemini via the AI Gateway) stays exactly as it is — voice is only a new interface around it.

## What the farmer gets

- A large microphone button next to the existing message box. Tap to speak; the transcript appears live in the box so it can be reviewed and edited before sending (optional auto-send after silence).
- Automatic silence detection ends recording; Escape cancels; a max duration stops runaway recordings.
- AI replies are read aloud (auto-play configurable) with speaking animation, pause/resume, stop and replay controls on each assistant message.
- Language support: English, Hindi, Telugu, Tamil, Kannada, Marathi. Spoken language is detected where the browser allows, and playback picks the matching installed voice, falling back to English.
- Clear state indicator at all times: idle, listening, processing, speaking, paused, error.
- Voice commands ("open my farms", "show weather", "open crop calendar", "open farm knowledge", "go to dashboard") navigate using existing routes instead of sending a chat message.
- Voice settings panel (in the assistant page header, and mirrored in the existing Settings page's placeholder-free new "Voice" area only if you want it — default is assistant page only): enable/disable voice, auto-play, speech rate, pitch, preferred language, voice selection.

## Behaviour when unsupported

If the browser lacks Web Speech APIs (common on Firefox and some Android webviews), the mic button is hidden or disabled with a short explanation and text chat keeps working untouched. Permission denied, no microphone, timeouts, recognition failure and playback failure each show a farmer-friendly message with a retry option.

## Technical approach

New files only, plus small mounts inside `ChatWindow.tsx` and the assistant route.

```text
src/types/voice.ts                     state machine, settings, provider interfaces
src/lib/voice/speech-recognition.ts    Web Speech API adapter behind a provider interface
src/lib/voice/speech-synthesis.ts      SpeechSynthesis adapter behind the same style of interface
src/lib/voice/voice-manager.ts         single owner of recognition/synthesis lifecycle
src/lib/voice/language-detector.ts     script/heuristic detection + BCP-47 mapping
src/lib/voice/silence-detector.ts      AnalyserNode RMS-based end-of-speech detection
src/lib/voice/commands.ts              phrase -> route mapping
src/utils/audio.ts, src/utils/browser-support.ts
src/hooks/useSpeechRecognition.ts, useTextToSpeech.ts, useVoiceConversation.ts, useVoiceSettings.ts
src/components/voice/VoiceButton.tsx, VoiceRecorder.tsx, VoicePlayer.tsx,
                     VoiceVisualizer.tsx, VoiceControls.tsx,
                     VoicePermissionDialog.tsx, VoiceSettingsSheet.tsx
```

Provider interfaces (`SpeechRecognitionProvider`, `SpeechSynthesisProvider`) keep UI components free of browser-API details, so Google/OpenAI/Deepgram/ElevenLabs backends can be dropped in later by adding one adapter file.

Integration points, kept minimal:
- `ChatWindow.tsx` — render `<VoiceControls />` beside the existing Send button, `<VoicePlayer />` under assistant messages, and feed the transcript into the existing `input` state. `sendMessage` and the transport are unchanged.
- `app.assistant.tsx` — header button opening the voice settings sheet.
- Voice components are lazy-loaded (`React.lazy` behind a hydration/support gate) so nothing browser-only runs during SSR.

Settings persistence: a new `voice_settings` table (one row per user, owner-only RLS + grants) with an optimistic localStorage cache so the panel is instant offline. No other schema is touched. Raw audio is never stored or uploaded — the mic stream is analysed in-browser and released on stop/unmount.

Cleanup: recognition and synthesis are aborted on unmount and on route change; audio contexts and media tracks are closed to avoid leaks.

Accessibility: keyboard operable controls, ARIA live region for state changes, visible focus rings, `prefers-reduced-motion` disables the waveform pulse, tap targets at least 44px.

## Out of scope for this pass

Server-side STT/TTS providers, wake word, always-on listening, voice for pages other than the assistant, and offline recognition.
