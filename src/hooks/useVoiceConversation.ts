import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { matchCommand } from "@/lib/voice/commands";
import { detectLanguage } from "@/lib/voice/language-detector";
import { SilenceDetector } from "@/lib/voice/silence-detector";
import { trackVoiceEvent } from "@/lib/voice/analytics";
import { initialVoiceState, voiceReducer } from "@/lib/voice/voice-machine";
import { detectVoiceSupport } from "@/utils/browser-support";
import type {
  SpeechRecognitionProvider,
  SpeechSynthesisProvider,
  VoiceError,
  VoiceSettings,
} from "@/types/voice";

type Options = {
  settings: VoiceSettings;
  /** Streams the live transcript into the existing chat input. */
  onTranscript: (text: string) => void;
  /** Called with the final transcript — must use the existing sendMessage(). */
  onSubmit: (text: string) => void;
};

/**
 * The single owner of voice lifecycle: recognition, synthesis, silence
 * detection, command routing and the state machine. Components never talk to
 * browser speech APIs directly.
 */
export function useVoiceConversation({ settings, onTranscript, onSubmit }: Options) {
  const navigate = useNavigate();
  const [machine, dispatch] = useReducer(voiceReducer, initialVoiceState);
  const [level, setLevel] = useState(0);
  const [support, setSupport] = useState({ recognition: false, synthesis: false });

  const recognitionRef = useRef<SpeechRecognitionProvider | null>(null);
  const synthesisRef = useRef<SpeechSynthesisProvider | null>(null);
  const detectorRef = useRef<SilenceDetector | null>(null);
  const transcriptRef = useRef("");
  const submittedRef = useRef(false);
  const spokenIdRef = useRef<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => setSupport(detectVoiceSupport()), []);

  const fail = useCallback((error: VoiceError) => {
    dispatch({ type: "FAIL", error });
  }, []);

  const stopCapture = useCallback(() => {
    detectorRef.current?.stop();
    setLevel(0);
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }, []);

  const finalize = useCallback(
    (raw: string) => {
      if (submittedRef.current) return;
      const text = raw.trim();
      if (!text) {
        dispatch({ type: "CANCEL" });
        return;
      }
      submittedRef.current = true;

      const command = matchCommand(text);
      if (command) {
        trackVoiceEvent("command_executed", { command: command.id });
        dispatch({ type: "DONE" });
        onTranscript("");
        try {
          void navigate({ to: command.to });
        } catch {
          fail({
            code: "navigation-failed",
            message: `I couldn't open ${command.label}. Please use the menu.`,
            retryable: false,
          });
        }
        return;
      }

      dispatch({ type: "SUBMIT" });
      onTranscript("");
      onSubmit(text);
      trackVoiceEvent("voice_completed");
    },
    [fail, navigate, onSubmit, onTranscript],
  );

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    stopCapture();
  }, [stopCapture]);

  const cancel = useCallback(() => {
    submittedRef.current = true;
    recognitionRef.current?.abort();
    synthesisRef.current?.cancel();
    stopCapture();
    onTranscript("");
    dispatch({ type: "CANCEL" });
    trackVoiceEvent("voice_cancelled");
  }, [onTranscript, stopCapture]);

  const startListening = useCallback(async () => {
    if (!support.recognition) {
      trackVoiceEvent("browser_unsupported");
      fail({
        code: "unsupported",
        message: "Voice input isn't supported in this browser. Chrome or Edge works best.",
        retryable: false,
      });
      return;
    }

    synthesisRef.current?.cancel();
    submittedRef.current = false;
    transcriptRef.current = "";
    dispatch({ type: "START_LISTENING" });
    trackVoiceEvent("voice_started", { language: settings.preferredLanguage });

    if (!recognitionRef.current) {
      const { WebSpeechRecognitionProvider } = await import("@/lib/voice/speech-recognition");
      recognitionRef.current = new WebSpeechRecognitionProvider();
    }

    recognitionRef.current.start(settings.preferredLanguage, {
      onResult: ({ transcript, isFinal }) => {
        transcriptRef.current = transcript;
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
          dispatch({ type: "TRANSCRIPT", transcript });
          onTranscript(transcript);
        }, 90);
        if (isFinal) {
          stopCapture();
          finalize(transcript);
        }
      },
      onError: (error) => {
        stopCapture();
        fail(error);
      },
      onEnd: () => {
        stopCapture();
        if (!submittedRef.current) finalize(transcriptRef.current);
      },
    });

    if (!detectorRef.current) detectorRef.current = new SilenceDetector();
    try {
      await detectorRef.current.start({
        onLevel: setLevel,
        onSilence: () => stopListening(),
        onMaxDuration: () => stopListening(),
      });
    } catch {
      // Recognition can still work without the level meter; only surface a
      // hard permission failure.
      fail({
        code: "permission-denied",
        message: "Microphone access is blocked. Allow it in your browser settings and try again.",
        retryable: true,
      });
      recognitionRef.current.abort();
    }
  }, [
    fail,
    finalize,
    onTranscript,
    settings.preferredLanguage,
    stopCapture,
    stopListening,
    support.recognition,
  ]);

  const speak = useCallback(
    async (messageId: string, text: string, options?: { replay?: boolean }) => {
      if (!support.synthesis || !settings.enabled) return;
      const clean = text.trim();
      if (!clean) return;
      if (!options?.replay && spokenIdRef.current === messageId) return; // no duplicates

      spokenIdRef.current = messageId;
      if (options?.replay) trackVoiceEvent("speech_replayed");

      if (!synthesisRef.current) {
        const { getSynthesisProvider } = await import("@/lib/voice/speech-synthesis");
        synthesisRef.current = getSynthesisProvider();
      }

      synthesisRef.current.speak({
        text: clean,
        language: detectLanguage(clean, settings.preferredLanguage),
        rate: settings.speechRate,
        pitch: settings.speechPitch,
        voiceName: settings.voiceName,
        onStart: () => dispatch({ type: "SPEAK_START" }),
        onEnd: () => dispatch({ type: "DONE" }),
        onError: (error) => fail(error),
      });
    },
    [fail, settings, support.synthesis],
  );

  const pauseSpeaking = useCallback(() => {
    synthesisRef.current?.pause();
    dispatch({ type: "PAUSE" });
  }, []);

  const resumeSpeaking = useCallback(() => {
    synthesisRef.current?.resume();
    dispatch({ type: "RESUME" });
  }, []);

  const stopSpeaking = useCallback(() => {
    synthesisRef.current?.cancel();
    dispatch({ type: "DONE" });
  }, []);

  const clearError = useCallback(() => dispatch({ type: "CLEAR_ERROR" }), []);

  // Cleanup on unmount / route change.
  useEffect(
    () => () => {
      recognitionRef.current?.abort();
      synthesisRef.current?.cancel();
      detectorRef.current?.stop();
      if (debounceRef.current) clearTimeout(debounceRef.current);
    },
    [],
  );

  // Escape cancels any active voice activity.
  useEffect(() => {
    if (machine.state === "idle") return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") cancel();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [cancel, machine.state]);

  return useMemo(
    () => ({
      state: machine.state,
      transcript: machine.transcript,
      error: machine.error,
      level,
      support,
      startListening,
      stopListening,
      cancel,
      speak,
      pauseSpeaking,
      resumeSpeaking,
      stopSpeaking,
      clearError,
      markProcessingDone: () => dispatch({ type: "DONE" }),
    }),
    [
      cancel,
      clearError,
      level,
      machine.error,
      machine.state,
      machine.transcript,
      pauseSpeaking,
      resumeSpeaking,
      speak,
      startListening,
      stopListening,
      stopSpeaking,
      support,
    ],
  );
}

export type VoiceConversation = ReturnType<typeof useVoiceConversation>;
