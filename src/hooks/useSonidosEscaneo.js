import { useCallback } from "react";
import * as Tone from "tone";

// Sonidos de Embarque: escaneo correcto, error y cartón (o PO) completo.
export function useSonidosEscaneo() {
  const beepOk = useCallback(async () => {
    await Tone.start();
    const synth = new Tone.Synth({
      oscillator: { type: "triangle" },
      envelope: { attack: 0.005, decay: 0.1, sustain: 0.3, release: 0.1 },
    }).toDestination();
    synth.volume.value = 6;
    const now = Tone.now();
    synth.triggerAttackRelease("C6", "16n", now);
    synth.triggerAttackRelease("E6", "16n", now + 0.12);
    setTimeout(() => synth.dispose(), 1000);
  }, []);

  const beepError = useCallback(async () => {
    await Tone.start();
    const synth = new Tone.Synth({
      oscillator: { type: "sawtooth" },
      envelope: { attack: 0.01, decay: 0.3, sustain: 0.1, release: 0.2 },
    }).toDestination();
    synth.volume.value = 10;
    const now = Tone.now();
    synth.triggerAttackRelease("A2", "8n", now);
    synth.triggerAttackRelease("G2", "8n", now + 0.2);
    synth.triggerAttackRelease("F2", "8n", now + 0.4);
    setTimeout(() => synth.dispose(), 1500);
  }, []);

  const beepComplete = useCallback(async () => {
    await Tone.start();
    const synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: "triangle" },
      envelope: { attack: 0.02, decay: 0.2, sustain: 0.5, release: 0.3 },
    }).toDestination();
    synth.volume.value = 8;
    const now = Tone.now();
    synth.triggerAttackRelease("C5", "8n", now);
    synth.triggerAttackRelease("E5", "8n", now + 0.15);
    synth.triggerAttackRelease("G5", "8n", now + 0.3);
    synth.triggerAttackRelease(["C6", "E6", "G6"], "4n", now + 0.45);
    setTimeout(() => synth.dispose(), 2000);
  }, []);

  return { beepOk, beepError, beepComplete };
}
