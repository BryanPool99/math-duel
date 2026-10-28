import { Injectable } from '@angular/core';
export type TrickType = 'times5' | 'times9';
@Injectable({ providedIn: 'root' })
export class TricksService {
  private nextId = 1;
  generateQuestion(type: TrickType): any {
    if (type === 'times5') {
      const num = Math.floor(Math.random()*198)+2; const ans = num*5;
      const opts = [ans, ans+5, ans-5, ans+10];
      for (let i=opts.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [opts[i],opts[j]]=[opts[j],opts[i]]; }
      return { id: this.nextId++, type, question: num + ' x 5 = ?', answer: ans, options: opts, explanation: 'x10 / 2', steps: [] };
    }
    const num = Math.floor(Math.random()*98)+2; const ans = num*9;
    const opts = [ans, ans+9, ans-9, ans+1];
    for (let i=opts.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [opts[i],opts[j]]=[opts[j],opts[i]]; }
    return { id: this.nextId++, type, question: num + ' x 9 = ?', answer: ans, options: opts, explanation: '(n*10)-n', steps: [] };
  }
}
