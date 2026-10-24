export class WorkBudget {
  private workUsed: number = 0;
  private timeUsed: number = 0;

  constructor(
    private maxWork: number = Number.MAX_SAFE_INTEGER,
    private maxTime: number = 86400000,
  ) {}

  checkWork(work: number): boolean {
    return (this.workUsed += work) <= this.maxWork;
  }

  checkTime(time: number): boolean {
    return (this.timeUsed += time) <= this.maxTime;
  }

  get workRemaining(): number {
    return this.maxWork - this.workUsed;
  }

  get timeRemaining(): number {
    return this.maxTime - this.timeUsed;
  }

  reset(): void {
    this.workUsed = 0;
    this.timeUsed = 0;
  }

  get exhausted(): boolean {
    return this.workUsed >= this.maxWork || this.timeUsed >= this.maxTime;
  }

  get budget(): { work: number; time: number } {
    return { work: this.workRemaining, time: this.timeRemaining };
  }
}
