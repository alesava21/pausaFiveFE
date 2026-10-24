export class SeededRNG {
  private state: [number, number, number, number];

  constructor(seed: number) {
    this.state = SeededRNG.seedToState(seed);
  }

  next(): number {
    const [a, b, c, d] = this.state;
    const t = a + b;
    const s = (c >>> 0) + d;
    this.state = [b ^ (b << 11), (c ^ (c >>> 3)) >>> 0, (d ^ (d >>> 17)) >>> 0, a ^ s];
    return s >>> 0;
  }

  nextRange(max: number): number {
    return this.next() % max;
  }

  nextFloat(): number {
    return (this.next() >>> 0) / 0xffffffff;
  }

  shuffle<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = this.nextRange(i + 1);
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  static seedToState(seed: number): [number, number, number, number] {
    seed = seed >>> 0;
    return [
      seed >>> 0,
      (seed + 0x9e3779b9) >>> 0,
      (seed * 0x85ebca6b) >>> 0,
      (seed * 0xc6bc279e) >>> 0,
    ];
  }
}
