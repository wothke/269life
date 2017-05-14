/*
* Poor man's abstractions for scripting animation sequences.
*
* Copyright (C) 2017 Juergen Wothke
*/

DEMO = "DEMO" in window ? DEMO : {}

/*
* Interface subclassed to configure "animations" in below "DEMO.Sequence".
*
* Is started from within a "DEMO.Sequence" (but can exceed the runtime of its parent).
* It has 3 phases: attack, sustain, release. Time is measured in frames 
*
* @param sustain, attack, release: time in 1/60secs (frames)
*/
DEMO.Animation = function (config, sustain, attack, release) {
	this._config= (typeof config != 'undefined') ? config : [];
	this._sustain= (typeof sustain != 'undefined') ? sustain : 0;
	this._attack= (typeof attack != 'undefined') ? attack : 0;
	this._release= (typeof release != 'undefined') ? release : 0;
	this._startFrameCount= -1;
};
DEMO.Animation.prototype = {
	setStarted: function(startFrameCount) {
		this._startFrameCount= startFrameCount;
	},
	
	// to be overwritten in sub classes
	attack: function(level, config) {},
	sustain: function(time, config) {},
	release: function(level, config) {},
	
	/*
	* @return true if animation has not reached its end yet
	*/
	play: function(currentFrameCount, frameStartTimeMs) {
		var elapsed= currentFrameCount - this._startFrameCount;
		
		if (elapsed <= this._attack) {
 			this.attack((this._attack == 0) ? 1 : elapsed/this._attack, frameStartTimeMs, this._config);
		} 
		if ( ((this._sustain == 0) && (elapsed == this._attack)) ||
				(elapsed <= (this._attack + this._sustain)) && ((elapsed > this._attack) || (this._attack == 0))) {
 			this.sustain(frameStartTimeMs, this._config);			
		}
		var as= this._attack + this._sustain;
		if (elapsed >= as) {
 			this.release((this._release == 0) ? 0 : (1-(elapsed-this._attack - this._sustain)/this._release), frameStartTimeMs, this._config);			
		}
		return elapsed < (this._attack + this._sustain + this._release);	// there is still more to come?		
	},
	
};

/*
* Interface that must be subclassed to configure below "DEMO.Sequence".
*/
DEMO.IAccessor = function () {
};
DEMO.IAccessor.prototype = {
	update: function(time, matKey, keyFrameIdx, hackPath) {},
};

/*
* Keyframe based animation sequence that traverses the path between 
* start/end frame and is based on fixed configuration settings.
*
* Based on the frames from KeyFrameHolder.
* @param accessor of type IAccessor
* @param animations keys may be frames between startFrame & endFrame
*/
DEMO.Sequence = function (name, accessor, startFrame, endFrame, effectKey, useHackedPath, 
					animations, faderCfg) {
	this._name= name;
	this._accessor= accessor;
	this._startFrame = startFrame;
	this._endFrame = endFrame;
	this._length= this._endFrame - this._startFrame;

	this._effectKey = effectKey;
	this._useHackedPath= useHackedPath;	
	this._animations= (typeof animations != 'undefined') ? animations : null;
	this._faderCfg= (typeof faderCfg != 'undefined') ? faderCfg : null;
	this._currentOffset= 0;
};
DEMO.Sequence.prototype = {
	getDbgInfo: function() {
		return "["+this._name + "] " + (this._startFrame+ this._currentOffset);
	},
	getCurrentFramePosition: function() {
		return this._startFrame + this._currentOffset;
	},
	init: function() { 
		this._currentOffset= 0;
	},
	hasMoreFrames: function() { 
		return ((this._startFrame + this._currentOffset) <= this._endFrame); 
	},
	setupNextFrame: function(frameStartTimeMs) {		
		// fractal scene settings
		var frameIdx= this._startFrame + this._currentOffset;

		this._accessor.update(frameStartTimeMs, this._effectKey, frameIdx, this._useHackedPath); 
		
		
		// fade in/out
		if (this._faderCfg != null) {
			var fFunc= this._faderCfg[0];
			var fInTimer= this._faderCfg[1];	// measured in 60fps frames
			var fOutTimer= this._faderCfg[2];
			
			var fadeOutLevel= 0;	// calc "fade out" level (0= none; 1= full)
			if((fInTimer > 0) && (this._currentOffset < fInTimer))  {
				fadeOutLevel= 1 - (this._currentOffset / fInTimer);
			}
			var outStart= this._length - fOutTimer;
			if((fOutTimer > 0) && ( outStart < this._currentOffset))  {
				fadeOutLevel= ((this._currentOffset-outStart) / fOutTimer);
			}
			fFunc(fadeOutLevel);
		}
		
		this._currentOffset++;
				
		// animations
		var tdata= (this._animations == null) ? null : this._animations[""+frameIdx];
		return tdata;
		
	}
};

/*
* Plays the animation based on actual playback frame rate of the client PC.
* 
* Sequences are simulated step by step to ensure that no sub-animations are 
* skipped and that animation effects based on incremental changes 
* are not distorted (designed for "forward" play - no "rewind").
*
* The main structure is a sequence of scenes (a sequence defines a camera move within a 
* specific fractal configuration).
* As an add-on, from within a "Sequence" additional aspects of the demo may then be 
* animated using "Animation". The model is fairly limited but more generic approaches 
* would overly complicate the "hand written" configuration scripts.
*/
DEMO.AnimationPlayer = function (sequences) {
	this._fps= 60;						// input frame distance is designed for this
	this._msPerFrame= 1000/this._fps;	// how long one frame is supposed to be used in 1:1 playback (i.e. ~16.7ms)
	
	this._playList= sequences;
	this.restart(0);
	
	this._activeAnimations= new Array();
	
	this._fpcOverflow= 0;			// needed for the "fast PC" scenario	
};

DEMO.AnimationPlayer.prototype = {
	getDbgInfo: function() {
		var	seq= this._playList[this._currentIdx];
		return seq.getDbgInfo();
	},	
	/*
	* @return true if end of animation has been reached
	*/
	setupAnimationFrame: function(fps) {

		// problem: on "slow" PC there may be huge fluctuations in 
		// "elapsed" time between calls.. (e.g. 99% of the time it may 
		// correspond to 30fps but sporadically it just falls to 1fps - for 
		// no good reason).. to avoid abrupt animation jumps use of an averaged 
		// speed estimate seems to be the best approach..
	
		var endReached= false;
		var step= this._fps/fps;	// adjusted to current system performance
		this._fpcOverflow+= step;
		
		this._msPerFrame= 1000/fps;
		
		var n= Math.floor(this._fpcOverflow);		
		for (var i= 0; (i<n) && !endReached; i++) {
			this._timePlayed+= this._msPerFrame;
			endReached= this.playOneFrame(this._timePlayed);	
			this._fpcOverflow--;
			this._frameCount++;
		}
		return endReached;
	},
	restart: function(currentTimeMs) {
		this._timePlayed= currentTimeMs - this._msPerFrame;	//	1st play should have enough elapsed time already..
		this._currentIdx= -1;
		this._frameCount= 0;
	},
	_handleActiveAnimations: function(frameStartTimeMs) {
		var stillActive= new Array();
		for (var i= 0; i < this._activeAnimations.length; i++) {
			var a= this._activeAnimations[i];
			
			if (a.play(this._frameCount, frameStartTimeMs)) {
				stillActive.push(a);
			}			
		}
		this._activeAnimations= stillActive;
	},
	/*
	* @param frameStartTimeMs the time that the frame *should have* been started
	*/
	playOneFrame: function (frameStartTimeMs) { 
		var seq;
		
		if ((this._currentIdx < 0) || !this._playList[this._currentIdx].hasMoreFrames()) {
			this._currentIdx++;
			if (this._currentIdx == this._playList.length) {	// overrun detected
				return true;
			}
			// get next 
			seq= this._playList[this._currentIdx];
			seq.init();
		} else {
			seq= this._playList[this._currentIdx];			
		}
		
		var startAnimation= seq.setupNextFrame(frameStartTimeMs);
		
		if (startAnimation != null) {
			startAnimation.setStarted(this._frameCount);
			this._activeAnimations.push(startAnimation);
		}
		this._handleActiveAnimations(frameStartTimeMs);
		
		return false;
	}
};
