export class GameAudio {
  constructor(){this.context=null;this.volume=.25;this.lastStep=0;}
  unlock(){try{this.context ||= new (window.AudioContext||window.webkitAudioContext)();this.context.resume().catch(()=>{});}catch{}}
  tone(frequency=520){
    if(!this.context||!this.volume||this.context.state!=='running')return;
    const oscillator=this.context.createOscillator(),gain=this.context.createGain(),time=this.context.currentTime;
    oscillator.frequency.setValueAtTime(frequency,time);oscillator.frequency.exponentialRampToValueAtTime(frequency*1.5,time+.12);
    gain.gain.setValueAtTime(this.volume*.08,time);gain.gain.exponentialRampToValueAtTime(.0001,time+.3);
    oscillator.connect(gain).connect(this.context.destination);oscillator.start(time);oscillator.stop(time+.3);oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();};
  }
  step(now){
    if(now-this.lastStep<.38||!this.context||!this.volume||this.context.state!=='running')return;this.lastStep=now;
    const buffer=this.context.createBuffer(1,this.context.sampleRate*.07,this.context.sampleRate),data=buffer.getChannelData(0);
    for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*(1-i/data.length);
    const source=this.context.createBufferSource(),gain=this.context.createGain(),filter=this.context.createBiquadFilter();filter.type='lowpass';filter.frequency.value=380;gain.gain.value=this.volume*.08;source.buffer=buffer;source.connect(filter).connect(gain).connect(this.context.destination);source.start();source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect();};
  }
}
