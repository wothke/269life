/*
*	various utilities..
*
*	Copyright (C) 2017 Juergen Wothke
*/

UTIL = "UTIL" in window ? UTIL : {}

/* minimalistic jQuery mockup */
if (!("$" in window)) {
	$= function(i) {
		var e= document.getElementById(i.replace("#", ""));
		
		var n= e.tagName.toUpperCase();
		/*
		if ((n == 'DIV')) {
			
		} else */
		if ((n == 'CANVAS') || (n == 'AUDIO')) {
			e= [e];
		} else {
			e.empty= function() {
				e.innerHTML = "";
				return e;
			};
			e.append= function(c) {
				e.insertAdjacentHTML('beforeend', c);
				return e;
			};
			e.html= function(c) {
				e.innerHTML= c;
			};
		}
		return e;
	};
	$.getJSON= function(url, success) {
		this.fail= function(){};
		var xhr = new XMLHttpRequest();
		xhr.onreadystatechange = function()
		{
			if (xhr.readyState === XMLHttpRequest.DONE) {
				if (xhr.status === 200) {
					if (success)
						success(JSON.parse(xhr.responseText));
				} else {
				   this.fail();
				}
			}
		};
		xhr.open("GET", url, true);
		xhr.send();
		
		return {fail: function(failFunc){this.fail= failFunc}.bind(this)};
	}	 	
}

/* utility to setup inheritance */
function surrogateCtor() {}
function extend(base, sub, methods) {
  surrogateCtor.prototype = base.prototype;
  sub.prototype = new surrogateCtor();
  sub.prototype.constructor = sub;
  sub.base = base;
  for (var name in methods) {
    sub.prototype[name] = methods[name];
  }
  return sub;
}


// -------------------------- F11 / fullscreen handling ----------------------------- 
UTIL.FullscreenSwitcher = function(elementId, fullscreenToggleCallback) {
	var that= this;
	this.elementId= elementId;
	this.fullscreenToggleCallback= fullscreenToggleCallback;

	document.addEventListener('fullscreenchange', function () {
		that.fullscreenToggleCallback(!!document.fullscreen);
	}, false);

	document.addEventListener('mozfullscreenchange', function () {
		that.fullscreenToggleCallback(!!document.mozFullScreen);
	}, false);

	document.addEventListener('webkitfullscreenchange', function () {
		that.fullscreenToggleCallback(!!document.webkitIsFullScreen);
	}, false);

	document.onkeydown = function (event) {
		if (event.keyCode == 122) { // F11	(replace default "fullscreen" behavior)
			this.toggleFullScreen(); 
			event.keyCode = 0;	// disable default handling of F11
			return false;
		}
	}.bind(this);
};

UTIL.FullscreenSwitcher.prototype = {
	toggleFullScreen: function() {
		if (!document.fullscreenElement &&    // alternative standard method
				!document.mozFullScreenElement && !document.webkitFullscreenElement && !document.msFullscreenElement ) {  // current working methods

			var el =  document.getElementById(this.elementId); 

			if (el.requestFullscreen) {
				el.requestFullscreen();
			} else if (el.msRequestFullscreen) {
				el.msRequestFullscreen();
			} else if (el.mozRequestFullScreen) {
				el.mozRequestFullScreen();
			} else if (el.webkitRequestFullscreen) {
				el.webkitRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT);
			}
		} else {
			if (document.exitFullscreen) {
				document.exitFullscreen();
			} else if (document.msExitFullscreen) {
				document.msExitFullscreen();
			} else if (document.mozCancelFullScreen) {
				document.mozCancelFullScreen();
			} else if (document.webkitExitFullscreen) {
				document.webkitExitFullscreen();
			}
		}
	}
};


/*
*	General handling of user input.
*
*	observer must implement keyPress(code, char) & rotation(x, y)	
*/
UTIL.Controls = function(observer, fullscreenElement, fullscreenToggleCallback, absMode) {
	this.observer= observer;
	this.test= ["ok"];
	this.absMode= absMode;
	
	this.reset();
	
	if (fullscreenElement != null) {
		new UTIL.FullscreenSwitcher(fullscreenElement, fullscreenToggleCallback);
	}
	
	// EVENTS
	document.addEventListener( 'mousedown', this.onDocumentMouseDown.bind(this), false );
	document.addEventListener( 'touchstart', this.onDocumentTouchStart.bind(this), false );
	document.addEventListener( 'touchmove', this.onDocumentTouchMove.bind(this), false );
	document.addEventListener( 'keypress', this.onDocumentKeyPress.bind(this), false );
	document.addEventListener( 'keydown', this.onDocumentKeyDown.bind(this), false );
	
		// IE9, Chrome, Safari, Opera
	document.addEventListener("mousewheel",  this.onDocumentMouseWheel.bind(this), false);
		// Firefox
	document.addEventListener("DOMMouseScroll", this.onDocumentMouseWheel.bind(this), false);
}

UTIL.Controls.prototype = {
	reset: function() {		
		this.targetRotationX = 0;
		this.targetRotationXOnMouseDown = 0;

		this.targetRotationY = 0;
		this.targetRotationYOnMouseDown = 0;

		this.mouseX = 0;
		this.mouseXOnMouseDown = 0;
		
		this.mouseY = 0;
		this.mouseYOnMouseDown = 0;

		this.windowHalfX = window.innerWidth / 2;
		this.windowHalfY = window.innerHeight / 2;
	},
	
	onDocumentMouseWheel: function( event ) {
		if (this.observer.preventDefault()) event.preventDefault();
		
		// cross-browser wheel delta
		var event = window.event || event; // old IE support
		var delta = Math.max(-1, Math.min(1, (event.wheelDelta || -event.detail)));

		this.observer.mouseWheel(delta);
		return false;	
	},
	onDocumentMouseDown: function( event ) {
		if (this.observer.preventDefault()) event.preventDefault();
		
		// need to separately keep the bound version
		// or removeEventListener will not find them
		this.mmove= this.onDocumentMouseMove.bind(this);		
		this.mup= this.onDocumentMouseUp.bind(this);
		this.mout= this.onDocumentMouseOut.bind(this);
		
		document.addEventListener( 'mousemove', this.mmove, false );
		document.addEventListener( 'mouseup', this.mup, false );
		document.addEventListener( 'mouseout', this.mout, false );

		this.mouseXOnMouseDown = event.clientX - this.windowHalfX;
		this.targetRotationXOnMouseDown = this.absMode?0:this.targetRotationX;

		this.mouseYOnMouseDown = event.clientY - this.windowHalfY;
		this.targetRotationYOnMouseDown = this.absMode?0:this.targetRotationY;
	},
	onDocumentMouseMove: function( event ) {
		this.mouseX = event.clientX - this.windowHalfX;
		var ox= this.targetRotationX;
		this.targetRotationX = this.targetRotationXOnMouseDown + ( this.mouseX - this.mouseXOnMouseDown ) * 0.02;

		this.mouseY = event.clientY - this.windowHalfY;
		var oy= this.targetRotationY;
		this.targetRotationY = this.targetRotationYOnMouseDown + ( this.mouseY - this.mouseYOnMouseDown ) * 0.02;

		this.observer.rotation(this.targetRotationX, this.targetRotationY, this.targetRotationX-ox, this.targetRotationY-oy, false);

	},
	onDocumentMouseUp: function( event ) {
		document.removeEventListener( 'mousemove', this.mmove, false );
		document.removeEventListener( 'mouseup', this.mup, false );
		document.removeEventListener( 'mouseout', this.mout, false );
		this.observer.rotation(this.targetRotationX, this.targetRotationY, 0, 0, true);
	},
	onDocumentMouseOut: function( event ) {
		document.removeEventListener( 'mousemove', this.mmove, false );
		document.removeEventListener( 'mouseup', this.mup, false );
		document.removeEventListener( 'mouseout', this.mout, false );
		this.observer.rotation(this.targetRotationX, this.targetRotationY, 0, 0, true);
	},	
	onDocumentTouchStart: function( event ) {
		if ( event.touches.length == 1 ) {
			if (this.observer.preventDefault()) event.preventDefault();

			this.mouseXOnMouseDown = event.touches[ 0 ].pageX - this.windowHalfX;
			this.targetRotationXOnMouseDown = 0; //this.targetRotationX;
			
			this.mouseYOnMouseDown = event.touches[ 0 ].pageY - this.windowHalfY;
			this.targetRotationYOnMouseDown = 0; this.targetRotationY;
		}
	},
	onDocumentTouchMove: function( event ) {
		if ( event.touches.length == 1 ) {
			if (this.observer.preventDefault()) event.preventDefault();
			
			this.mouseX = event.touches[ 0 ].pageX - this.windowHalfX;
			var ox= this.targetRotationX;
			this.targetRotationX = this.targetRotationXOnMouseDown + ( this.mouseX - this.mouseXOnMouseDown ) * 0.05;

			this.mouseY = event.touches[ 0 ].pageY - this.windowHalfY;
			var oy= this.targetRotationY;
			this.targetRotationY = this.targetRotationYOnMouseDown + ( this.mouseY - this.mouseYOnMouseDown ) * 0.05;

			this.observer.rotation(this.targetRotationX, this.targetRotationY, this.targetRotationX-ox, this.targetRotationY-oy, false);
		}
	},
	onDocumentKeyPress: function( event ) {
		var keyCode = event.which;
		this.observer.keyPress(keyCode, String.fromCharCode( keyCode ));
	},
	onDocumentKeyDown: function( event ) {
		var keyCode = event.which;
		this.observer.keyDown(keyCode, String.fromCharCode( keyCode ));
	},
};



/*
	Music playback related API - with impl for mp3 files
	
	Creates a separate <audio> instance for each of the 
	supplied songs. tracks can be switched with 0 delay.
*/
UTIL.MP3Music = function(filenames, readyCallback ) {
	if( typeof filenames === 'string' ) {
		filenames = [ filenames ];
	}
	
	this._readyCallback= readyCallback;
	this._gainNode= null;
	this._analyserNode= null;
	this._freqByteData = 0;	
	this._initMode = true;	
	
	this._mp3Loading= filenames.length;
	this._mp3Players = new Array(filenames.length);
	this._selectedSong= 0;	// default
		
	try {
		window.AudioContext = window.AudioContext||window.webkitAudioContext;
		this.context = new AudioContext();
	} catch(e) {
		alert('Web Audio API is not supported in this browser');
	}

	$("#isloading").empty().append('<div class="loading"><img src="./images/loading.gif"></div>');
	this._loadMusic(filenames);	// autostart
}

/**
* Playback via "audio" element has the advantage that it
* starts as soon as enough data is available.
*/
UTIL.MP3Music.prototype = {
	// -- API: these 3 functions must be provided by any alternative impl
	setVolume: function(volume) {
		if (this._gainNode != null) this._gainNode.gain.value= volume;
	},
	getFrequencyData: function() { 
		if (this._freqByteData === 0) {
			if (this._analyserNode == null) return null;
			
			this._freqByteData = new Uint8Array(this._analyserNode.frequencyBinCount);	
		}
		this._analyserNode.getByteFrequencyData(this._freqByteData);
		return this._freqByteData;
	},
	playTrack: function(trackIdx) {
		this._mp3Players[this._selectedSong].pause();
		this._selectedSong= trackIdx;
		
		// loop currently selected song..
		this._mp3Players[this._selectedSong].autoplay= true;
		this._mp3Players[this._selectedSong].play();
	},
	isPaused: function( ) {return false;},	// for other impls (e.g. SID player)
	// -- internal:
	_handleLoaded: function(i) {
		if (this._initMode) {
			this._mp3Loading--;		
			
			var source = this.context.createMediaElementSource(this._mp3Players[i]);
			source.loop = true;
			source.connect(this._gainNode);							
		}
				
		if (this._mp3Loading <= 0) {
			this._initMode= false;
			$("#isloading").empty().append(' ');	// remove "loading" image
	//		this._mp3Players[this._selectedSong].play();
			this._readyCallback();
		}			
	},
	_extraFuncScope: function(url, i) {	// required so that anonymous functions get the correct closure scope.. JavaScript crap does not have block scope
		var player = document.createElement("audio");
		document.body.appendChild(player);
		this._mp3Players[i]= player;
		
		player.id= i;
//		player.autoplay= true;	// FIXME..needed for Firefox! (normal eventhandling does not work correctly in FF)
		player.setAttribute('src', url);
	
		player.addEventListener("stalled", function() {
//				this._handleLoaded(i);
		}.bind(this));
		player.addEventListener("canplay", function() {
			this._handleLoaded(i);
		}.bind(this));
		player.addEventListener("emptied", function() {}.bind(this));		
		player.addEventListener("suspend", function() {}.bind(this));
	
		player.addEventListener("ended", function() {
					player.setAttribute('src', url + '?ts=' + new Date().getTime());
					player.load();
				}.bind(this));

		player.load();	// will trigger events that initiate further processing (above)		
		
	},	
	_loadMusic: function(urls) {
		this._gainNode = this.context.createGain();	
		this._analyserNode= this.context.createAnalyser();

		this._gainNode.connect(this._analyserNode);
		this._analyserNode.connect(this.context.destination);
		
		
		for (var i= 0; i<urls.length; i++) {
			this._extraFuncScope(urls[i], i);
		}
	},
}


//-------------------------- sound util ------------------------------------------- 

UTIL.SoundDetector = function (trigger, repeats, invert, cooldown, stepWidth, startStep, maxSteps) {
	this.lastDetect = 0;
	this.repeatCount = 0;
	
	this.trigger = trigger;
	this.repeats = repeats;
	this.repeatCount = 0;
	this.invert = invert;
	this.cooldown = cooldown;
	this.stepWidth = stepWidth;
	this.startStep = startStep;
	this.maxSteps = maxSteps;
};

UTIL.SoundDetector.prototype = Object.assign( Object.create( UTIL.SoundDetector.prototype ), {
	constructor: UTIL.SoundDetector,

	detect: function (freqByteData) {
		if ((freqByteData== null) || (freqByteData.length == 0)) return false;
		
		var d= new Date();
		var t = d.getTime();
		if ((t - this.lastDetect) <= this.cooldown) return false;
		
		var idx=0;
		var max= Math.floor(freqByteData.length/this.stepWidth);			
		for (var i=0, s=0; i<max; i++) {
			if((i >= this.startStep)) {
				if(this.invert) {
					// always smaller than trigger
					if (freqByteData[idx] > this.trigger ) {
						return false;
					}
				} else {
					if (freqByteData[idx] < this.trigger ) {
						return false;
					}
				}
				s+= 1;
				if ((this.maxSteps > 0) && (s >= this.maxSteps)) break;
			}
			idx+= this.stepWidth;
		}
		
		if (this.repeatCount++ >= this.repeats) {
			this.lastDetect= t;
			this.repeatCount= 0;
			return true;			
		}
		return false;
	}
} );

/*
* Tracks the current playback performance.
*/
UTIL.FpsStats = function () {
	this.sampleInterval= 1000; 	// ms
	this.frames= 0;
	this.prevTime= this.beginTime= 0;
	
	this.fps= 60;
};
UTIL.FpsStats.prototype = {
	begin: function () {
		this.beginTime = ( performance || Date ).now();
		
		if (this.prevTime == 0) this.prevTime= this.beginTime;
	},
	end: function () {
		this.frames ++;

		var time = ( performance || Date ).now();		
		var diff= time - this.prevTime;
		
		if ( diff > this.sampleInterval ) {
			this.fps= this.frames * (diff/1000);

			this.prevTime = time;
			this.frames = 0;
		}
	},
	getFps: function() {
		return this.fps;
	}
};

/*
* Geometry related utilities.
*/
GEOMETRY = {
	/*
	* create a backup copy of all the vertices of a geometry.. 
	*/
	backupOriginalVertices: function(geometry) {
		// add-on: keep original data as a base for later transformations
		geometry.originalVertices = [];
		for ( var j = 0; j < geometry.vertices.length; j ++ ) {
			var copy= new THREE.Vector3();
			copy.set( geometry.vertices[ j ].x, geometry.vertices[ j ].y, geometry.vertices[ j ].z );
			
			geometry.originalVertices[ j ]= copy;
		}
		
		if (geometry.boundingBox != null)
			geometry.originalBoundingBox = new THREE.Vector3(geometry.boundingBox.max.x - geometry.boundingBox.min.x,
													geometry.boundingBox.max.y - geometry.boundingBox.min.y,
													geometry.boundingBox.max.z - geometry.boundingBox.min.z)
	},
	/*
	* apply all the Object3D level transformations to the underlying Geometry
	*/
	moveTransformsToGeometry: function(mesh) {
		// precondition for all the stuff used in the "shadow-scene"
		// does not seem to work for buffer geometry..
		mesh.updateMatrix();

		mesh.geometry.applyMatrix( mesh.matrix );

		mesh.position.set( 0, 0, 0 );
		mesh.rotation.set( 0, 0, 0 );
		mesh.scale.set( 1, 1, 1 );
		mesh.updateMatrix();
	},
};