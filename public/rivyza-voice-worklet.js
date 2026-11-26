class RivyzaVoice extends AudioWorkletProcessor {
  constructor() {
    super();
    this.mode = 'none'; this.pos = 0; this.buffers = []; this.states = [];
    this.port.onmessage = e => { this.mode = e.data; };
  }
  process(inputs, outputs) {
    const input = inputs[0] || [], output = outputs[0];
    if (!output?.length) return true;
    const n = output[0].length, N = 16384, W = Math.round(sampleRate * .045);
    const mode = this.mode;
    for (let c = 0; c < output.length; c++) {
      const b = this.buffers[c] ||= new Float32Array(N);
      const state = this.states[c] ||= {low:0, smooth:0};
      const src = input[c] || input[0];
      for (let i = 0; i < n; i++) {
        const t = this.pos + i, x = src?.[i] || 0;
        b[t % N] = x;
        let y = x;
        if (mode === 'chip' || mode === 'deep' || mode === 'baby' || mode === 'female') {
          const ratio = mode === 'chip' ? 1.55 : mode === 'deep' ? .68 : mode === 'female' ? 1.26 : 1.32;
          const p = ((t * (1-ratio) % W) + W) % W, q = (p + W/2) % W;
          const read = d => {
            const r = t-2-d, k = Math.floor(r), f = r-k;
            return b[(k%N+N)%N]*(1-f)+b[((k+1)%N+N)%N]*f;
          };
          const a = .5-.5*Math.cos(2*Math.PI*p/W);
          y = read(p)*a + read(q)*(1-a);
          if (mode === 'baby') {
            // Reduce low resonance and emphasize articulation without alien modulation.
            state.low += (1-Math.exp(-2*Math.PI*450/sampleRate))*(y-state.low);
            y = 1.12*y-.48*state.low;
          }
          if (mode === 'female') {
            // Moderate pitch lift and gentle low-resonance reduction.
            state.low += (1-Math.exp(-2*Math.PI*280/sampleRate))*(y-state.low);
            y = 1.08*y-.32*state.low;
          }
        }
        if (mode !== 'none') {
          // +6 dB nominal makeup gain, with a smooth peak ceiling.
          y *= 2;
          const a = Math.abs(y);
          if (a > .72) y = Math.sign(y)*(.72+.25*Math.tanh((a-.72)/.25));
        }
        output[c][i] = Math.max(-1,Math.min(1,y));
      }
    }
    this.pos += n;
    return true;
  }
}
registerProcessor('rivyza-voice', RivyzaVoice);
