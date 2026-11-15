/* Isolador de voz da sala: RNNoise (Xiph, licença BSD) compilado para WebAssembly pelo projeto Jitsi (@jitsi/rnnoise-wasm 0.2.1, Apache-2.0).
   Roda na thread de áudio: junta os blocos de 128 amostras do navegador em quadros de 480 (10 ms a 48 kHz), que é o que o RNNoise processa, e devolve o som sem o ruído.
   Atraso total: 10 ms. A "probabilidade de voz" do modelo vira uma porta suave que silencia o que não é fala (teclado, ventilador, chiado). */
import createRNNWasmModuleSync from "./rnnoise-sync.js";

const FRAME = 480;
class RnnoiseProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.ok = false; this.inBuf = new Float32Array(FRAME); this.inN = 0; this.outQ = new Float32Array(FRAME * 4); this.outR = 0; this.outW = 0; this.outN = FRAME; this.outW = FRAME; this.gate = 1; /* começa com 10 ms de folga para nunca faltar som entre quadros */
    try {
      const m = createRNNWasmModuleSync(); this.m = m;
      this.ptr = m._malloc(FRAME * 4); this.idx = this.ptr >> 2; this.st = m._rnnoise_create(0);
      this.ok = !!this.st;
    } catch (e) { this.ok = false; }
    this.port.postMessage({ pronto: this.ok });
  }
  process(inputs, outputs) {
    const inp = inputs[0] && inputs[0][0], out = outputs[0]; if (!out || !out.length) return true;
    const n = 128;
    if (!inp) { for (let c = 0; c < out.length; c++) out[c].fill(0); return true; }
    if (!this.ok) { for (let c = 0; c < out.length; c++) out[c].set(inp); return true; }
    const m = this.m;
    for (let i = 0; i < n; i++) {
      this.inBuf[this.inN++] = inp[i];
      if (this.inN === FRAME) {
        const heap = m.HEAPF32, b = this.idx;
        for (let k = 0; k < FRAME; k++) heap[b + k] = this.inBuf[k] * 32768;
        const vad = m._rnnoise_process_frame(this.st, this.ptr, this.ptr);
        const alvo = vad > 0.35 ? 1 : 0.06; // fora da fala, fica quase mudo
        for (let k = 0; k < FRAME; k++) {
          this.gate += (alvo - this.gate) * (alvo > this.gate ? 0.05 : 0.004);
          this.outQ[this.outW] = heap[b + k] / 32768 * this.gate; this.outW = (this.outW + 1) % this.outQ.length;
        }
        this.outN += FRAME; this.inN = 0;
      }
    }
    for (let i = 0; i < n; i++) {
      let v = 0; if (this.outN > 0) { v = this.outQ[this.outR]; this.outR = (this.outR + 1) % this.outQ.length; this.outN--; }
      for (let c = 0; c < out.length; c++) out[c][i] = v;
    }
    return true;
  }
}
registerProcessor("rnnoise-voz", RnnoiseProcessor);
