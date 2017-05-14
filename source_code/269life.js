/*
*	Variations with "pseudo kleinian" raymarching..
*
*	Copyright (C) 2017 Juergen Wothke
*/

/**
* Just some of the ppl that did cool 'just for fun stuff' in the past..
*/ 
DEMO.Greets = function(scene) {
	this.materials= [];
	this.group= new THREE.Group();
	// patched version of the font (with extended RBearing for extended "glow space")
	UTIL.getMeshTexter('./res/Vertigo 2 BRK_Normal_W.json', function(texter) {
		
		var greets= DATA.getGreetingTexts();
		for (var i= 0; i<greets.length; i++) {
			var d= greets[i];
			this.group.add(this._createVerticalText(texter, d[0], d[1],
						new THREE.Vector3(d[2], d[3], d[4])));				
		}						
		scene.add(this.group); // group for easy disabling				

	}.bind(this));
};

DEMO.Greets.prototype = {
	_createGlowMeterial: function(color) {
		return new THREE.ShaderMaterial({
			name: "1st pass glow+rays shading",
			uniforms    : DEMO.AttachmentShader.getUniforms(color, 0.3, 3),
			vertexShader: DEMO.AttachmentShader.vertexShader,
			fragmentShader: DEMO.AttachmentShader.fragmentShader,
		});
	},
	_createVerticalText: function(texter, text, color, pos) {
		var mat= this._createGlowMeterial(color);
		mat.baseColor= color;
		
		this.materials.push(mat);
		
		return UTIL.createText(texter, mat, text, 0.00015, new THREE.Vector3(-90, 0, 90), pos);
	},
	_getGlitch: function(idx, time) {
		var t= 5000*Math.random();
		var p= 0.95;
		time= time - Math.floor(time/t)*t;
		time/= t;	//0..1
		
		time= (time>p) ? time: 0.005;
		return Math.sin(idx*time)*Math.random()*0.4;	
	},
	animate: function(time) {
		this.group.visible= true; // restore visibility

		for (var i= 0; i<this.materials.length; i++) {
			var m= this.materials[i];
			var color= new THREE.Color(m.baseColor);
			var g= this._getGlitch(i, time);	// make those neon signs flicker a bit
			
			color.r -= g;
			color.g -= g;
			color.b -= g;
			m.uniforms.color.value=  color;
		}
	}
};

/*
* Horizon background specifically positioned for "greets" scene..
*/
DEMO.Background = function(scene, backgroundColor) {
	this.scene= scene;

	this.renderPass= new DEMO.NorthlightPass();
	this.renderPass.target= this._createBackgroundRenderTarget(2048, 128);
	
	this.renderPass.uniforms.tNoise.value=  BOX2.getGlobalNoiseTexture();
	this.renderPass.uniforms.size.value=  new THREE.Vector2(600, 128);
	this.renderPass.uniforms.background.value= backgroundColor;

	this.setColor(new THREE.Vector3(40/255, 140/255, 255/255));	// blue

	var material = new THREE.MeshPhongMaterial({
				map: this.renderPass.target.texture, 
				side: THREE.DoubleSide, 
				transparent: true, 
				opacity:	1.0,
				shading: THREE.SmoothShading, 
				shininess: 10, 
				specular: 0x9F9FFF,
				wireframe: false
			});
			
	// note: z_far is about 25.89
	var h= 3;
	// radius designed to overwrite some of the far background pixels.. (those would look silly 
	// in front of a brighter background..)
	var geo= new THREE.CylinderGeometry(9.7, 9.7, h, 24, 24, true);	
	this.mesh = new THREE.Mesh(geo, material);
	this.mesh.frustumCulled = false; // Avoid getting clipped

	this.mesh.rotation.x = Math.PI / 2;	// for use in "Greetz"
	
	GEOMETRY.moveTransformsToGeometry(this.mesh);
	
	// use the "sphere" around which the camera moves to center 
	// the horizon cylinder (to avoid clipping as much as possible)
	this.mesh.position.x-= -0.08;
	this.mesh.position.y+= -3.3;	
	this.mesh.position.z= h/2- h/10;
		
	GEOMETRY.moveTransformsToGeometry(this.mesh);

	scene.add(this.mesh);
};

DEMO.Background.prototype = {
	setColor: function(color) {
		this.renderPass.uniforms.baseColor.value= color;		
	},
	animate: function(renderer, time) {
		this.mesh.visible= true; // restore visibility
		
		this.renderPass.uniforms.time.value=  time/3;	// slower
		this.renderPass.render(renderer, this.renderPass.target);
	},
	
	_createBackgroundRenderTarget: function(width, height) {
		var target = new THREE.WebGLRenderTarget( width, height );
		var texture= target.texture;
		
		texture.name= "background texture";
		texture.format = THREE.RGBAFormat;
		texture.minFilter = THREE.LinearFilter;
		texture.magFilter = THREE.LinearFilter;
		texture.type = THREE.FloatType;
		texture.generateMipmaps = false;
		
		texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
		
		texture.repeat.set(1, 1);
		
		target.stencilBuffer = false;
		target.depthBuffer = false;

		return target;
	},
};


/**
* Some confetti falling from above.. 
*/ 
DEMO.Confetti = function(scene, renderer) {
	this.scene= scene;
	this.renderer= renderer;

	var width= this.renderer.domElement.clientWidth;	
	
	this.fadeIn= 1000;	// time in mills for the fade-in of text 

	this.base= 0.02;
	this.height= 0.8;
	
	var geometry = new THREE.Geometry();
	var gold= new THREE.Vector3(255/255,231/255,132/255);
	
	for ( var i = 0; i < 20000; i ++ ) {
		var vertex = new THREE.Vector3(this._getRandomX(), this._getRandomY(), 	// area in which to use the effect
							THREE.Math.randFloatSpread( this.height ) + this.height/2+this.base);
		
		// prepare/allocate as much as possible in advance to reduce
		// delays during animation:
		vertex.fadeIn= Math.random()*this.fadeIn;	// randomize text fade-in
		vertex.textTimeStamp = -1;		// marker for text related particles (-1 = not for text)
		vertex.textPos= new THREE.Vector3();
		vertex.vector= new THREE.Vector4();
		
		var l= Math.random()*75/255;
		geometry.colors.push(new THREE.Color(gold.x,gold.y+l,gold.z+l));

		geometry.vertices.push( vertex );
	}
	this.confettiGeometry= geometry;

	this.material = new THREE.PointsMaterial({
				    vertexColors: THREE.VertexColors,
					transparent: true,
					opacity: 0.5,
                    size: this.calcParticleSize(width),
                    sizeAttenuation : false	// otherwise too big
                    });

    this.particleSystem = new THREE.Points(geometry, this.material);
    scene.add(this.particleSystem);
	
	// particle text stuff
	this.canvasWidth= 720;	// size tuned to actually used texts&font..
	this.canvasHeight= 150;
	var canvas = document.createElement("canvas");
//	var canvas = $("#myCanvas")[0];
	canvas.width = this.canvasWidth;
	canvas.height = this.canvasHeight;
	this.context = canvas.getContext("2d");
};

DEMO.Confetti.prototype = {
	calcParticleSize: function(width) {
		return 0.5 + (width/640);	// adapt to screen resolution!
	},
	animate: function(time) {
		var width= this.renderer.domElement.clientWidth;	// update needed in case of F11
		this.material.size= this.calcParticleSize(width);
		
		this.particleSystem.visible= true;	// restore visibility
	
		var gravity= 0.001;
		
		var s= 0.005;
		var s2= s/2;
		
		var ms= 0.001, ms2= ms/2;
		
		for ( var i = 0; i < this.confettiGeometry.vertices.length; i ++ ) {
			var vertex= this.confettiGeometry.vertices[i];

			var z= vertex.z - gravity; // luckily "down" is just down...
			
			if (vertex.textTimeStamp >= 0) {		// use as marker for text related particles
				var elapsed= time - vertex.textTimeStamp;
				var delayAnimText= (elapsed < vertex.textDelayMs);
				
				if (delayAnimText) {
					if (Math.min(this.fadeIn, elapsed) >= vertex.fadeIn ) {
						vertex.set( vertex.textPos.x, vertex.textPos.y, vertex.textPos.z);
					}
					// just add some brownian motion
					var m= Math.random()*ms-ms2;
					vertex.x+= m;
					continue;
				}
				// explode the text			
				var v= vertex.vector;				
				v.set(v.x*v.w, v.y*v.w, v.z*v.w, v.w);

				if (z < this.base) {
					z= this.height;
					// return particle to the random noise pool
					vertex.textTimeStamp= -1;
					vertex.x = this._getRandomX();
					vertex.y = this._getRandomY();
					continue;
				} 
				vertex.set( vertex.x + v.x, vertex.y + v.y, z + v.z);
				
			} else {
				// regular confetti handling
				var dx= Math.random()*s-s2;
				var dy= Math.random()*s-s2;
				
				if (z < this.base) {
					z= this.height;					
				} 
				// drift randomly
				vertex.set( vertex.x + dx, vertex.y + dy, z);
			}
		}
		this.confettiGeometry.verticesNeedUpdate = true;
		
		this._animateColors();
	},
	triggerText: function(time, delayMs, newText, scale, pos, rot) {
		var a = new THREE.Euler( THREE.Math.degToRad(rot.x), THREE.Math.degToRad(rot.y), 
								THREE.Math.degToRad(rot.z), 'XYZ' );
				
		var data= this._createStencil(newText);
		
		var l= this.canvasWidth*4;
		
		var n= this.confettiGeometry.vertices.length;
	
		var maxTextParticles= 2000;
		var matched= 0;
		for(var i = 0; (i < n) && (matched<maxTextParticles); i++) {
			var vertex= this.confettiGeometry.vertices[i];
			if (vertex.textTimeStamp >= 0) continue;
			
			var x, y, maxTries= 1;	// depending on font more trials may be needed..
			var match= false;
			for(var j = 0; j < maxTries; j++) {
				x= Math.floor(Math.random()*this.canvasWidth);
				y= Math.floor(Math.random()*this.canvasHeight);
				var idx= x*4+y*l;
				if ((data[idx] != 255) ) {
					match= true;
					break;
				}
			}
			if (match) {
				matched++;		

				var p= new THREE.Vector3( x*scale, 0, (this.canvasHeight-y)*scale);
				p.applyEuler(a);

				vertex.textPos.set( p.x+pos.x, p.y+pos.y, p.z+pos.z);	// in "greets" scene z is "up"

				// explode in random directions..
				var s= Math.random()*0.04;
				vertex.vector.set(  s*(Math.random() - 0.5),	//x
									s*(Math.random() - 0.5),	//y
									s*(Math.random() - 0.5),	//z
									0.96		// slowdown
								 );
				vertex.textTimeStamp= time;
				vertex.textDelayMs= delayMs;
			}
		}
		this.confettiGeometry.verticesNeedUpdate = true;
	},
	triggerPointExplosion: function(time, delayMs, pos) {
		
		var maxParticles= 1000;
		var n= this.confettiGeometry.vertices.length;	
		var step= Math.floor(n/maxParticles);
	
		for(var i = 0; i < maxParticles; i++) {
			for(var j = 0; j < step; j++) {
				var vertex= this.confettiGeometry.vertices[step*i+j];
				if (vertex.textTimeStamp >= 0) continue;	// already in use			

				vertex.textPos.set( pos.x, pos.y, pos.z);

				// explode in random directions..
				var s= Math.random()*0.04;
				vertex.vector.set(  s*(Math.random() - 0.5),	//x
									s*(Math.random() - 0.5),	//y
									s*(Math.random() - 0.5),	//z
									0.96		// slowdown
								 );
				vertex.textTimeStamp= time;
				vertex.textDelayMs= delayMs;
				break;
			}
		}
		this.confettiGeometry.verticesNeedUpdate = true;
	},
	
	_animateColors: function() {
		var s= 0.6;
		var rr= 1;	// avoid dark colors
		for ( var i = 0; i < this.confettiGeometry.colors.length; i ++ ) {
			var c= this.confettiGeometry.colors[i];
			var b= c.b+ Math.random()*s;
			c.b= 1<b ? b-rr: b;
		}
		this.confettiGeometry.colorsNeedUpdate = true;
	},
	_createStencil: function(newText) {
		// create stencil to position particles..
		this.context.fillStyle = "white";
		this.context.fillRect(0, 0, this.canvasWidth, this.canvasHeight)
		this.context.fill();

//		this.context.font = "normal 130px 'Mountains of Christmas'";
		this.context.font = "bold 130px 'Mountains of Christmas'";

		this.context.fillStyle= "black";
		
		this.context.fillText(newText,10,120);

		var img = this.context.getImageData(0, 0, this.canvasWidth, this.canvasHeight);
		return img.data;		
	},
	_getRandomX: function() {
		return THREE.Math.randFloatSpread( 2) + 0.1189365386962891;
	},
	_getRandomY: function() {
		return THREE.Math.randFloatSpread( 2 )+ -3.71763484954834;
	},	
};


/*
* Handles some overlayed banner text.
*/
DEMO.BannerText = function(scene) {
	this.scene= scene;
	
	this.startPos=  null;

	this.textGeo= null;
	this.txtGroup = this._createBanner();
	this.scene.add(this.txtGroup);
};
DEMO.BannerText.prototype = {
	isReady: function() {
		return this.txtGroup.children.length >0;	// wait for async load
	},
	_createBanner: function() {
		var group = new THREE.Group();
		
		group.scale.x = group.scale.y = group.scale.z = 0.004;
		group.rotation.x=0;//-Math.PI/180*30; 
		group.rotation.y=-Math.PI/180*10; 
		group.rotation.z=0;//Math.PI/180*30; 	

		UTIL.getMeshTexter('./res/report_1942.json', function(texter){
			this.textGeo= texter.create("269life");
			GEOMETRY.backupOriginalVertices(this.textGeo);// XXX
			
			var material=  new THREE.ShaderMaterial({
				name: "1st pass glow+rays shading",
				uniforms    : DEMO.AttachmentShader.getUniforms(0x0000ff, 0.3, 3),
				vertexShader: DEMO.AttachmentShader.vertexShader,
				fragmentShader: DEMO.AttachmentShader.fragmentShader,
				});
			
			
			var hover = 0;
			var centerOffset = -0.5 * ( this.textGeo.boundingBox.max.x - this.textGeo.boundingBox.min.x );
	
			var textMesh = new THREE.Mesh( this.textGeo, material );

			textMesh.position.x = centerOffset;
			textMesh.position.y = hover;
			textMesh.position.z = 0;

			textMesh.rotation.x = 0;
			textMesh.rotation.y = Math.PI * 2;
			
			group.add(textMesh);
		}.bind(this), true);	// use bevel - font is too thin
		
		return group;
	},
	
	_updateTextGeometry: function(time) {
		var tempVec3 = new THREE.Vector3();

			var t= 3000*Math.random();
			var p= 0.95;
			time= time - Math.floor(time/t)*t;
			time/= t;	//0..1
			
			time= (time>p) ? time: 0.005;
		
		var w= this.textGeo.originalBoundingBox.x;
	
		for ( var i = 0, il = this.textGeo.originalVertices.length; i < il; i ++ ) {
			var v= this.textGeo.originalVertices[i];

			// create a glitch
			var q = Math.sin(v.y*time)*Math.random();
			this.textGeo.vertices[ i ].set( v.x+q*70, v.y, v.z);
		}

		//	no need for this with the simple transform above
//		this.textGeo.computeFaceNormals();
		this.textGeo.computeVertexNormals();	// XXX WTF is going on why suddenly so slow???		

//		this.textGeo.normalsNeedUpdate = true;
		this.textGeo.verticesNeedUpdate = true;	
	
	},
	animate: function(time) {
		this.txtGroup.visible= true;
		
		// just some stripped off leftovers from "modum panem" demo
		
		var f= Math.sin(time * 0.00001);
		var pos= new THREE.Vector3(-0.07963,0.099261,-1.3678434);
		// just move a bit left and right
		pos.y= pos.y+ Math.sin(time * 0.00004)*0.02;
		pos.z= pos.z- f*0.44;

		if(this.startPos == null) {
			this.startPos= [pos.y, pos.z];
		}
		
		time= (time <=0) ? 1 : time;
				
		if (this.textGeo != null) {
			this._updateTextPosition(pos);			
			this._updateTextGeometry(time);	// add "glitch"
		}				
	},	
	_updateTextPosition: function(pos) {
		
		// default starting pos
		var x= -0.2;
		var y= 6.0;
		var z= 13.0; 	// - back / + front

		if(this.startPos != null) {
			var dy= (pos.y-this.startPos[0]);
			var dz= (pos.z-this.startPos[1]);
			var dist= Math.sqrt(dz*dz+dy*dy);
					
			var rightSide= [			// FIXME 
					0.3157312840105159,
					0.44
					];
			var s= (dist-rightSide[0])/(rightSide[1]-rightSide[0]) * 0.5;
			
			var tz= 13.4;	// target pos
			z= z+(tz-z)*s; // linear move from back to front	

			
			var tx= 1.;	// target pos
			x= x+(tx-x)*s; // linear move from left to right					
		}	
		this.txtGroup.position.x= x; 
		this.txtGroup.position.y= y; 
		this.txtGroup.position.z= z;
	},
}

/*
* Wrapper for some extruded SVG object.
* @param rot  rotaton in degrees
*/
DEMO.ExtrudedSvgObject = function(scene, func, bevel, scale, rot, pos) {
	this.scene= scene;
	
	rot= new THREE.Vector3(THREE.Math.degToRad(rot.x), THREE.Math.degToRad(rot.y), THREE.Math.degToRad(rot.z));
	
	this.meshes= func(bevel, scale, rot, pos);
	
	for (var i= 0; i<this.meshes.length; i++) {
		var mesh= this.meshes[i];			
		scene.add(mesh);	
	}
};
DEMO.ExtrudedSvgObject.prototype = {
	animate: function(time) {
		for (var i= 0; i<this.meshes.length; i++) {
			var mesh= this.meshes[i];			
			mesh.visible= true;	
		}
	}
};

/**
* Holds the splined keyframe positions that where created using boxplorer2.
*
* note: the frames here are designed for a 60fps playback
* and will be interpolated based on the actual playback rate
* (i.e. frames will be skipped on slower machines..)
*/
DEMO.KeyFrameHolder = function() {
	this.currentKeyFrame= -1;	// not used in scripted animation mode
		
	this.frames= BOX2.splinedKeyFrames(DATA.KeyFrameConfig, 300);
};

DEMO.KeyFrameHolder.prototype = {
	getKeyFrame: function(idx) {
		return this.frames[idx];
	},
	getKeyFrames: function() {
		return this.frames;
	},
	getCurrentKeyFrameIdx: function() {
		return this.currentKeyFrame;
	},
	getCurrentKeyFrame: function() {
		return this.getKeyFrame(this.currentKeyFrame);
	},
	keyFrameBack: function() {
		this.currentKeyFrame= (this.currentKeyFrame == 0) ? (this.frames.length-1) :		
			((this.currentKeyFrame-1) % (this.frames.length));
		return this.getCurrentKeyFrame();
	},
	keyFrameForward: function() {
		this.currentKeyFrame= (this.currentKeyFrame+1) % (this.frames.length);		
		return this.getCurrentKeyFrame();
	},
};




// -------------------------- Three.js setup ----------------------------- 

//var $ = document.querySelector.bind(document);

DEMO.DemoMode = {
	ANIMATION:0,
	RANDOM: 1
};

Main = function(canvasId) {
	this.initInProgress= true;
	
	this.debug= true;
	this.debugCameraPath= false;
	
	this.dofPass= new DEMO.DofPass();
	this.dofSamplerPass= new DEMO.DofSamplerPass();

	
	this.FOV_X= 91.3085;
	this.FOV_Y= 75.0;
	this.backgroundColor = new THREE.Vector3(0.07, 0.06, 0.16);

	this.keyFrameHolder= new DEMO.KeyFrameHolder();
	
	this.mode= DEMO.DemoMode.ANIMATION;
	
	
	this.canvasId = canvasId;
	this.canvas = null;

	this.timeOffset= 0;	// base for animation sequence..

	// postprocessing effects
	this.filmPass= new DEMO.FilmPass( 0.0, 1.4, 500, false );// noiseIntensity, scanlinesIntensity, scanlinesCount, grayscale
	this.intensity= 0;

	// since no fftSize is set, default of 2048 is used.. 
	
	// FIXME for some reason _analyserNode.getByteFrequencyData no longer delivers the
	// amount of data specified by frequencyBinCount WTF?..
// orig	this.beatDetector= new UTIL.SoundDetector(155, 1, false, 50, 32, 1, 13);	// sample across complete spectrum
	this.beatDetector= new UTIL.SoundDetector(155, 1, false, 50, 32, 1, 6);	// sample across complete spectrum

	// all the stuff that gets initialized later
	this.kleinianSceneHolder= this.renderer= this.composer= this.target= this.bannerText= null;
		

	this.soundVisualsEnabled= false;	

	this.musicIsReady= false;
	
	
	//------------------------- controllers for small sub-animations -----------------------------

	/*
	* Trigger an in-scene particle text animation
	*/
	var TextAnim= (function(){
		var $this = function (config) { $this.base.call(this, config); };
		extend(DEMO.Animation, $this, {
	//		attack: function(level, time, data) {}.bind(this),
			sustain: function(time, data) {
				// confetti-text
				this.confetti.triggerText(time, data[0], data[1], data[2], data[3], data[4]);				
			}.bind(this),
	//		release: function(level, time, data) {}.bind(this),
		});
		return $this;
	}.bind(this))();

	/*
	* Trigger particle explosion animation
	*/
	var ExplodeAnim= (function(){
		var $this = function (config) { $this.base.call(this, config); };
		extend(DEMO.Animation, $this, {
	//		attack: function(level, time, data) {}.bind(this),
			sustain: function(time, data) {
				this.confetti.triggerPointExplosion(time, data[0], data[1]);				
			}.bind(this),
	//		release: function(level, time, data) {}.bind(this),
		});
		return $this;
	}.bind(this))();

	/*
	* Switch played music track.
	*/
	var MusicAnim= (function(){
		var $this = function (track, fadeOut, fadeIn, sustain) { $this.base.call(this, [track], sustain, fadeOut, fadeIn); };
		
		extend(DEMO.Animation, $this, {
			attack: function(level, time, data) {
				music.setVolume(1-level);
			}.bind(this),
			sustain: function(time, data) {
				$this.startTrack= data[0];	// muted pause..				
			}.bind(this),
			release: function(level, time, data) {
				// start track just before fadeIn
				if ($this.startTrack != null) { music.playTrack($this.startTrack); $this.startTrack= null; }
				music.setVolume(1-level);		
			}.bind(this),
		});
		return $this;
	}.bind(this))();

	/*
	* Show a specific overlay text-page with simple fade-in/out. 
	*/
	var WobbleTextAnim= (function(){
		var $this = function (pageId, x, y, fadeIn, sustain, fadeOut) { $this.base.call(this, [pageId, x, y], sustain, fadeIn, fadeOut); };
		
		extend(DEMO.Animation, $this, {
			attack: function(level, time, data) {
				if($this.started==null) { this.scrollTexts.configureTextPage(time, data[0], data[1], data[2], 0); $this.started= true; }
				this.scrollTexts.animate(time, level);
			}.bind(this),
			sustain: function(time, data) {
				this.scrollTexts.animate(time, 1);
			}.bind(this),
			release: function(level, time, data) {
				this.scrollTexts.animate(time, level);
				$this.started= null;	// reset
			}.bind(this),
		});
		return $this;
	}.bind(this))();


	//---------------------- controllers for main background animations -----------------------------
	
	
	var that= this;
	/*
	* no "shadow scene" stuff - only with "overlay scene"
	*/
	var PlainAccessor= (function(){
		var $this = function () { $this.base.call(this); };
		extend(DEMO.IAccessor, $this, {  
			update: function(time, matKey, frameIdx, hackPath) {
				this.doUpdateKleinianScene(time, matKey, frameIdx, hackPath);

				this.glowPass.reconfigure(0.0017, 0.031);	// use for title text
				
				this.bannerText.animate(time);
			}.bind(this),
		});
		return $this;
	}.bind(this))();
	
	var PlainNbAccessor= (function(){
		var $this = function () { $this.base.call(this); };
		extend(DEMO.IAccessor, $this, {  
			update: function(time, matKey, frameIdx, hackPath) {
				this.doUpdateKleinianScene(time, matKey, frameIdx, hackPath);

				this.glowPass.reconfigure(0.0017, 0.031);	// use for title text				
			}.bind(this),
		});
		return $this;
	}.bind(this))();
	
	this.plainAccessor= new PlainAccessor();
	this.plainNbAccessor= new PlainNbAccessor();
	
	/*
	* uses "shadow scene" (with background) & "overlay scene"
	*/
	var IntroAccessor= (function(){
		var $this = function () { $this.base.call(this); };
		extend(DEMO.IAccessor, $this, {  
			update: function(time, matKey, frameIdx, hackPath) {
				this.doUpdateKleinianScene(time, matKey, frameIdx, hackPath);

				this.background.setColor(new THREE.Vector3(40/255, 140/255, 255/255));	// blue
				this.background.animate(this.renderer, time);
				
				this.android.animate(time);
				
				this.glowPass.reconfigure(0.0017, 0.031);	// use for title text
				
				this.bannerText.animate(time);
				
			}.bind(this)
		});
		return $this;
	}.bind(this))();
	var IntroNbAccessor= (function(){
		var $this = function () { $this.base.call(this); };
		extend(DEMO.IAccessor, $this, {  
			update: function(time, matKey, frameIdx, hackPath) {
				this.doUpdateKleinianScene(time, matKey, frameIdx, hackPath);

				this.background.setColor(new THREE.Vector3(40/255, 140/255, 255/255));	// blue
				this.background.animate(this.renderer, time);
				
				this.android.animate(time);
				
				this.glowPass.reconfigure(0.0017, 0.031);	// use for title text
				
			}.bind(this)
		});
		return $this;
	}.bind(this))();
	
	this.introAccessor= new IntroAccessor();
	this.introNbAccessor= new IntroNbAccessor();
	

	
	/*
	* exclusively used for "greetings" scene
	*/
	var GreetsAccessor= (function(){
		var $this = function () { $this.base.call(this); };
		extend(DEMO.IAccessor, $this, {  
			update: function(time, matKey, frameIdx, hackPath) {
				this.doUpdateKleinianScene(time, matKey, frameIdx, hackPath);

				this.background.setColor(new THREE.Vector3(140/255, 40/255, 255/255));	// purple
				this.background.animate(this.renderer, time);
				
				this.greets.animate(time);
				this.confetti.animate(time);
				
				this.xsmiley.animate(time);

				this.revLogo.animate(time);
			
				this.glowPass.reconfigure(0.001, 0.0141);	// use for Greets
			}.bind(this)
		});
		return $this;
	}.bind(this))();
	
	this.accessor= new GreetsAccessor();
	
	this.player = new DEMO.AnimationPlayer ([
		/*
		* sub-animations have been manually aligned (caution: while Sequence related
		* timings are measured in 1/60s frames the IAccessor related timings are in ms)
		*/
		
		new DEMO.Sequence("glass", this.introNbAccessor, 9300, 9600, "20", true, {
							9331: new WobbleTextAnim( 0, 6.2, 2.5, 60, 240, 60),						
							9300: new MusicAnim(0) 
			}, [ this.setFadeOut.bind(this), 60, 20]),
			
		new DEMO.Sequence("skull mix1", this.introNbAccessor, 250, 2360, "4", true, null, [ this.setFadeOut.bind(this), 20, 10]),

		new DEMO.Sequence("skull mix2 rainbow", this.introNbAccessor, 10551, 13000, "4", true, {
				10551: new WobbleTextAnim( 1, 8.4, 1.5, 60, 300, 60),	
				12275: new WobbleTextAnim( 2, 7.4, 5.5, 60, 300, 60),				
			}, [ this.setFadeOut.bind(this), 10, 10]),

		new DEMO.Sequence("skull slits2", this.introNbAccessor, 12900, 13550, "7", true, null, [ this.setFadeOut.bind(this), 10, 10]),	// skulls 

		new DEMO.Sequence("icepalace1", this.plainAccessor, 2200, 3560, "8", false, {
				2400: new WobbleTextAnim( 3, 8.3, 3.5, 60, 300, 60),	

			}, [ this.setFadeOut.bind(this), 20, 0]),	// candyland
		new DEMO.Sequence("icepalace2 colors", this.plainAccessor, 10200, 11040, "8", false, null, [ this.setFadeOut.bind(this), 0, 0]),	// candyland
		
		new DEMO.Sequence("emeralds1", this.plainAccessor, 9800, 11000, "3", false, null, [ this.setFadeOut.bind(this), 0, 0]),	// emeralds
		
		new DEMO.Sequence("emeralds xmas", this.plainAccessor, 5900, 6300, "3", false, null, [ this.setFadeOut.bind(this), 10, 20]),	// emeralds
		
		new DEMO.Sequence("crystals", this.introAccessor, 5700, 6300, "1", false, null, [ this.setFadeOut.bind(this), 10, 20]),	// emeralds

		new DEMO.Sequence("cylinders1", this.introAccessor, 0, 1220, "0", false, null, [ this.setFadeOut.bind(this), 20, 10]),
		new DEMO.Sequence("cylinders2", this.introAccessor, 8080, 9300, "0", true, null, [ this.setFadeOut.bind(this), 10, 10]),
		new DEMO.Sequence("cylinders3", this.introAccessor, 11700, 12500, "0", true, null, [ this.setFadeOut.bind(this), 10, 20]),

		new DEMO.Sequence("aqua1", this.plainAccessor, 0, 1000, "15", false, null, [ this.setFadeOut.bind(this), 0, 10]),	// dark hoops & burton
		new DEMO.Sequence("aqua2", this.plainAccessor, 5300, 6400, "15", false, null, [ this.setFadeOut.bind(this), 10, 10]),	// dark hoops & burton
		new DEMO.Sequence("aqua3", this.plainAccessor, 11600, 13700, "15", false, null, [ this.setFadeOut.bind(this), 10, 20]),	// dark hoops & burton
			
		new DEMO.Sequence("loops3", this.plainNbAccessor, 6600, 8400, "19", true,  {
									6650: new WobbleTextAnim( 4, 6.5, 8.5, 60, 720, 60),	
									7500: new WobbleTextAnim( 5, 6.5, 8.5, 60, 720, 60),	
									8500: new WobbleTextAnim( 6, 6.7, 7.5, 60, 360, 60),	
			}, [ this.setFadeOut.bind(this), 10, 20]),	// 
		new DEMO.Sequence("loops1", this.plainNbAccessor, 0, 1200, "19", false, {
									100: new WobbleTextAnim( 7, 7, 9, 60, 420, 60),	
									800: new WobbleTextAnim( 8, 7, 6, 60, 180, 60),	
			}, [ this.setFadeOut.bind(this), 20, 10]),	// dark hoops

		new DEMO.Sequence("space1", this.introAccessor, 0, 2200, "16", true, null, [ this.setFadeOut.bind(this), 20, 10]),	// dark menger
		new DEMO.Sequence("space2", this.introAccessor, 10750, 12200, "16", false, {
									11800: new WobbleTextAnim( 9, 7, 2, 60, 180, 60),	
			}, [ this.setFadeOut.bind(this), 10, 20]),	

		
		new DEMO.Sequence("i3", this.accessor, 200, 9000, "5", false, {
					200: new MusicAnim(1, 90, 0, 1320),
					
					1600: new TextAnim([3000, "A GOOD TIME", 0.0002,
							new THREE.Vector3(-0.1243365386962891 , -3.0198771484954834, 0.0344062265598773956),
							new THREE.Vector3(0,0,0)]),
					2000: new TextAnim([3000, "FOR SOME", 0.0002,
							new THREE.Vector3(-0.223, -3.12, 0.047),
							new THREE.Vector3(0,0,40)]),
					2250: new TextAnim([3000, "GREETINGS", 0.0007,
							new THREE.Vector3(-0.143, -3.87, 0.447),
							new THREE.Vector3(180,160,-140)]),

					2300: new ExplodeAnim([4600, new THREE.Vector3(0.1289 , -3.8176, 0.8162)]),

					
					//  some sparks in background
					3150: new ExplodeAnim([1500, new THREE.Vector3(-0.1243 , -2.8198, 0.02440)]),
					3750: new ExplodeAnim([1500, new THREE.Vector3(-0.1543 , -2.8198, 0.04440)]),
					4180: new ExplodeAnim([1500, new THREE.Vector3(0.0143 , -2.9598, 0.13440)]),
					
					// some firework among the logos
					7200: new ExplodeAnim([1500, new THREE.Vector3(0.53489 , -3.4876, 0.611)]),
					7220: new ExplodeAnim([1500, new THREE.Vector3(0.63489 , -3.3876, 0.511)]),
					7280: new ExplodeAnim([1500, new THREE.Vector3(0.43489 , -3.1876, 0.65)]),
				}, 
				[ this.setFadeOut.bind(this), 20, 20]
			),

	
		new DEMO.Sequence("bubbles", this.introAccessor, 10300, 12600, "6", false, null, [ this.setFadeOut.bind(this), 20, 0]),	// green bubbles
			
		new DEMO.Sequence("rings2", this.plainAccessor, 9600, 10300, "34", false, null, [ this.setFadeOut.bind(this), 20, 20]),	
		new DEMO.Sequence("rings", this.plainAccessor, 1850, 3400, "33", false, null, [ this.setFadeOut.bind(this), 20, 20]),	// 2d pattern LILA GRUEN

		new DEMO.Sequence("armour1", this.plainAccessor, 5000, 6400, "18", true, null, [ this.setFadeOut.bind(this), 20, 0]),	// space armour
		new DEMO.Sequence("armour2", this.plainAccessor, 2500, 3300, "18", true, null, [ this.setFadeOut.bind(this), 0, 10]),	// 

		new DEMO.Sequence("asym1", this.plainAccessor, 0, 2200, "17", false, null, [ this.setFadeOut.bind(this), 10, 10]),	// dark green  (with skill eyes..) 
		// "2D noise" 
		new DEMO.Sequence("2d green", this.introAccessor, 2280, 3500, "9", false, null, [ this.setFadeOut.bind(this), 0, 10]),	// 2d pattern LILA GRUEN
		new DEMO.Sequence("2d green pink", this.introAccessor, 5000, 5800, "9", false, null, [ this.setFadeOut.bind(this), 10, 10]),	// 2d pattern LILA GRUEN
		new DEMO.Sequence("2d max colors", this.introAccessor, 11600, 12600, "9", false, null, [ this.setFadeOut.bind(this), 10, 10]),	// 2d pattern LILA GRUEN
		new DEMO.Sequence("2d arcs", this.introAccessor, 8570, 11000, "12", true, null, [ this.setFadeOut.bind(this), 10, 10]),	// 2d lILA spaeter GRUEN

		new DEMO.Sequence("2d noise blueish", this.introAccessor, 7800, 8400, "10", false, null, [ this.setFadeOut.bind(this), 10, 10]),	// 2d pattern LILA GRUEN
		new DEMO.Sequence("2d green blue purp", this.introAccessor, 10700, 11000, "10", false, null, [ this.setFadeOut.bind(this), 10, 10]),	// 2d pattern LILA GRUEN
		new DEMO.Sequence("2d cyan", this.introAccessor, 7800, 8100, "13", false, {
					8000: new MusicAnim(0, 90, 90, 500),

			}, [ this.setFadeOut.bind(this), 10, 10]),	// 2d pattern LILA GRUEN
		new DEMO.Sequence("2d cyan pink", this.introAccessor, 5500, 5800, "13", false, {
									5500: new WobbleTextAnim( 10, 7, 5, 60, 360, 60),	
			}, [ this.setFadeOut.bind(this), 10, 10]),	// 2d pattern LILA GRUEN
		new DEMO.Sequence("2d green", this.introAccessor, 10750, 11200, "13", false, null, [ this.setFadeOut.bind(this), 10, 0]),	// 2d pattern LILA GRUEN

	]);
		
	this.overlayHolder= new DEMO.OverlaySceneHolder(1, 1);	// dummy aspect is reset later
};


Main.prototype = {
	doUpdateKleinianScene: function(time, matKey, frameIdx, hackPath) {
		var keyFrame= this.keyFrameHolder.getKeyFrame(frameIdx).copy(hackPath);

		this.kleinianSceneHolder.configure(matKey, keyFrame);
		this.overlayHolder.setAllInvisible();

		this.soundVisualsEnabled= true;			
	},	
	setFadeOut: function(level) {
		this.filmPass.uniforms.fadeOut.value = level;
	},
	
	addOverlaySceneContent: function() {
		
		this.overlayHolder.resetScreenSize(this.defaultWidth, this.defaultHeight);
		
		var scene= this.overlayHolder.getScene();
		this.bannerText= new DEMO.BannerText(scene);
		
		var cfg = {
			width: this.defaultWidth,
			height:this.defaultHeight,
			switchEffect: 1,	// 0: wobbly 1: rotate 2: explode
		
			selectedPageId: 1,
			// used for THREE.js positioning
			posX:5.30,	
			posY: 5.4,	// slow scrollspeeed +=0.02
			posZ: 2.66, 	// good values for "normal scroller" screen size (9,0,15)

			xEff: 8,	// effect specific koordinate (e.g. explosion center)
			yEff: -4,
			
			effect: 0.01,		// amount 0..1
			opacity: 1.0,
			colorOverride: 0.01,
			zoom: 0					// used by shader: 0.3 für wobble zoom?	
		};

		this.scrollTexts= new UTIL.Text(DATA.TextPages, scene, cfg);
		this.scrollTexts.configureTextPage(0, cfg.selectedPageId, cfg.posX, cfg.posY, cfg.switchEffect);
	},
	addShadowSceneContent: function() {
		// add "stuff" to the scene.. 
		var scene= this.kleinianSceneHolder.getShadowScene();
		
		this.background = new DEMO.Background(scene, this.backgroundColor);	
		this.greets= new DEMO.Greets(scene);
		this.confetti= new DEMO.Confetti(scene, this.renderer);
		

		if (this.debugCameraPath) BOX2.createCameraPath(scene, this.keyFrameHolder.getKeyFrames());

		this.xsmiley= new DEMO.ExtrudedSvgObject(scene, DATA.createXSmiley, 0, 0.0000034, new THREE.Vector3(-45, 0, 45),
											 new THREE.Vector3(-0.1233365386962891 , -2.9771484954834, 0.0344062265598773956));
		/*
		this.smiley= new DEMO.ExtrudedSvgObject(scene, DATA.createSmiley, 0, 0.0000034, new THREE.Vector3(-45, 0, 45),
											 new THREE.Vector3(-0.1355, -2.9065325260162354, 0.03449967831373215));
		*/		
		
		this.android= new DEMO.ExtrudedSvgObject(scene, DATA.createAndroid, 0.2, 0.000008, new THREE.Vector3(270,110,0),
											 new THREE.Vector3(0.1189365386962891 , -3.80763484954834, 0.19162265598773956));
		
		this.revLogo= new DEMO.ExtrudedSvgObject(scene, DATA.createRevision, 0.5, 0.000006, new THREE.Vector3(0,0,0),
											 new THREE.Vector3(0.1389365386962891 , -3.90763484954834, 0.00162265598773956));
	},
	
	
	getEffectComposer: function(target) {
		var c = new DEMO.MultiTargetEffectComposer( this.renderer, target );
		
		// the first two passes just render into the 2 multi-render texures..
		// and do not use any of these textures as input..
		
		var mandelPass = this.kleinianSceneHolder.getShaderPass(target.texSize.x, target.texSize.y);
		mandelPass.renderToScreen = false;
		mandelPass.needsSwap = false;	// makes no difference
		c.addPass(mandelPass);

		
		var polygonPass = c.sameTarget(this.kleinianSceneHolder.getShadowRenderPass());
		
	//	polygonPass.clearDepth = true;
		c.addPass(polygonPass);
		
		var overlayPass = c.sameTarget(this.overlayHolder.getRenderPass());		
	//	overlayPass.clearDepth = true;
		c.addPass(overlayPass);
				
		
		// postprocessing: the two multi-render output textures from above
		// are then used as inputs for the below steps (only now render targets are
		// switched..)

		this.glowPass = c.swapTarget(new DEMO.GlowPass());
	
		c.addPass(this.glowPass);

		var rayPass = c.swapTarget(new DEMO.RaysPass(new THREE.Vector2(0.2,0.75), 0.012, 0.4, 0.99, 1.0));	
		c.addPass(rayPass);
		
		var dofPass = c.swapTarget(this.dofPass);
		var that= this;
		dofPass.preProcess= function(readBuffer) {
			// preparation step:
			// determine what "depth" to focus on and store in a 1x1 texture - so 
			// that the respective test needs not be repeated for every pixel..
			
			that.dofSamplerPass.render(that.renderer, that.dofPass.getSamplerTarget(), readBuffer);			
		};	
		
		c.addPass(dofPass);

		this.filmPass.renderToScreen = true;
		c.addPass(this.filmPass);
		
		return c;
	},


	start: function() {
		this.perfStats= new UTIL.FpsStats(); 

/*		
		if (this.debug) {
			this.stats = new Stats();
			this.stats.showPanel( 0 ); // 0: fps, 1: ms, 2: mb, 3+: custom
			document.body.appendChild( this.stats.dom );			
		}
*/

		// music FIXME why global?
		window.music= new UTIL.MP3Music([ "03 - Wright & Bastard - Dark Gray_.mp3", 
										  "Ashley Walbridge Arica(Darkmelo Edit)_.mp3" ],
										function() {this.musicIsReady= true;}.bind(this));
		
		// visuals
		
		THREE.useEarcutTriangulation();	// extension: works better for ExtrusionGrometry
		
		this.canvas = $( "#"+this.canvasId )[0];
		
		this.defaultWidth= this.canvas.width;	// from index.html
		this.defaultHeight= this.canvas.height;
		
		this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas , alpha: true, 
							preserveDrawingBuffer: true , autoClearDepth: false});
		
		this.renderer.autoClear = false;

		if ( !this.renderer.extensions.get('EXT_frag_depth') ) {
			alert("error: EXT_frag_depth not available");
			return;
		}
		if ( !this.renderer.extensions.get('WEBGL_draw_buffers') ) {
			alert("error: WEBGL_draw_buffers not available");
			return;
		}

		
		this.target= getRenderTarget(this.defaultWidth, this.defaultHeight );


		this.kleinianSceneHolder= new BOX2.RawShaderSceneHolder(this.renderer, this.FOV_X, this.FOV_Y, 
														this.backgroundColor, this.getShaderConfigLib());
														
		this.addShadowSceneContent();
		this.addOverlaySceneContent();
		
		this.composer = this.getEffectComposer(this.target);
		this.resize(true);


		this.startUserInputHander();
		
		NProgress.start();

		this.render(0);		
	},
	
	getShaderConfigLib: function() {
		BOX2.lib = "lib" in BOX2 ? BOX2.lib : new BOX2.PKleinLib();
		return BOX2.lib.effects;
	},
	
	startUserInputHander: function() {
		// primarily used for F11 handling...
		new UTIL.Controls({
			preventDefault: function() {
				if (this.mode == DEMO.DemoMode.ANIMATION) {
					return false;
				}
				return true;
			}.bind(this),			
			keyDown: function(code, c){
				switch (code) {		
					case 13:	// enter
							console.log("frame: "+ this.player.getDbgInfo());
						break;
				}
			}.bind(this), 
			keyPress: function(code, c){				
			}.bind(this), 
			rotation: function(x,y, dx, dy, commit){
			}.bind(this),
			mouseWheel: function(diff){
			}.bind(this)
		}, this.canvasId, this.fullscreenToggle.bind(this));		
	},
	
	stfu: function(func) {
		// temp disable 'console warning': dumbshit WEBGL complains about global shader variables derived from 
		// uniforms .. rather than uglifying the code that bloody bullshit warning is better just squelched..
		// (also there are miles of "extension directive should occur before any non-preprocessor tokens " from 
		// core THREE.js stuff.. no point in having that kind of garbage flood the console..)
		var oldWarnFunction = console.warn;
		console.warn = function(){}; 	// disable
	
		func.bind(this)();
	
		console.warn = oldWarnFunction; // restore
	},

	isReady: function() {
		if (this.initInProgress) {
			// incrementally (otherwise browser thinks it has crashed) precompile shaders
			
			// trigger THREE.js startup (shader compilation, etc)
			this.stfu(function() {
				var done= this.kleinianSceneHolder.incrementalPrecompile(this.renderer);

				NProgress.inc(1/this.kleinianSceneHolder.getPrecompileSteps());

				if (done) {
					this.composer.render();
					// even with this workaround the 1st this.composer.render();
					// call from within the render() method still hangs for 9 frames..
					// looks as if additional stuff gets initialized that for some 
					// reason is not triggered here..
					
					NProgress.done();
					this.initInProgress= false;
					return true;
				}
				return false;
			});
		} else {
			return  this.bannerText.isReady(); 	// font needs to be loaded
		}	
	},
	animateSoundEffect: function(freqByteData) {
		// "hi-hat" flashes..
		this.intensity= 0.94*this.intensity;
		if (this.soundVisualsEnabled && this.beatDetector.detect(freqByteData)) {
			this.intensity= 0.6;
		}
	
		this.filmPass.uniforms.nIntensity.value = this.intensity;					
	},
	
	/*
	* used AFTER all the THREE.js setup delays are through (hopefully)
	* so that the content of this method should have a relatively predictable
	* runtime behavior.. otherwise there is no point in trying to get
	* a smooth animation rate..
	*/
	renderDemo: function(currentTimeMs) {
		if (this.timeOffset == 0) {this.timeOffset= currentTimeMs; this.player.restart(currentTimeMs);}
		
		currentTimeMs-= this.timeOffset;
		
		if (this.mode == DEMO.DemoMode.ANIMATION) {
			if (this.player.setupAnimationFrame(this.perfStats.getFps()) ) {
				// end reached
	//			this.player.restart(currentTimeMs);	// restart
	
				this.mode = DEMO.DemoMode.RANDOM;
			}
			
		} else {
			// random mode
			
			this._randomKey= (typeof this._randomKey != 'undefined') ? this._randomKey : 
											this.kleinianSceneHolder.getRandomMaterialKey();
											
			this._randomChangeTime= (typeof this._randomChangeTime != 'undefined') ? this._randomChangeTime : 
											currentTimeMs;
										
			if ((currentTimeMs-this._randomChangeTime) > 5000) {
				this._randomKey= this.kleinianSceneHolder.getRandomMaterialKey();
				this._randomChangeTime= currentTimeMs;
			}
		
			this.kleinianSceneHolder.configure(this._randomKey, this.keyFrameHolder.keyFrameForward());
		}
								
		this.animateSoundEffect(music.getFrequencyData());		
		
		// note: according to measurements there still are sporadic glitches -
		// where this call suddenly takes 3 frames - mb some "garbage collection" effect..
		// but apart from these rare exceptions the response time is now stable.
		
		this.stfu(function() {
			this.composer.render();
		});
	},
	render: function(currentTimeMs) {
		requestAnimationFrame(this.render.bind(this));	// request immediately to not add further delay by below rendering..

		if (this.isReady()) {
//			if (this.debug) this.stats.begin();
		
								
			if (this.count == null) { 
				this.count= 0;
				// 1st time is unuseable since additional shaders are compiled
				// that for some reason have not been compiled previously..
				this.stfu(function() {
					this.composer.render();
				});
			} else {
				
				if (this.musicIsReady) {
					this.count++;
					
					this.perfStats.begin();
					this.renderDemo(currentTimeMs);	
					this.perfStats.end();						
				}
			}
//			if (this.debug) this.stats.end();
		}
	},
	
	resize: function(force) {
		var c = this.renderer.domElement;
		var dpr    = 1; //window.devicePixelRatio;  // make 1 or less if too slow
		var width  = c.clientWidth  * dpr;
		var height = c.clientHeight * dpr;
		if (force || width != c.width || height != c.height) { 
			var updateStyle= false;
			this.renderer.setSize( width, height, updateStyle );
		}
	},
	fullscreenToggle: function( isFullscreen ) {
		var c = this.renderer.domElement;
		var w,h;
		if ( isFullscreen ) {	
			w=  window.screen.availWidth;
			h=  window.screen.availHeight;
		} else {
			// return to fixed size
			w= this.defaultWidth;
			h= this.defaultHeight;
		}

		c.clientWidth= w;
		c.clientHeight=  h;

		var canvas = $( "#"+this.canvasId )[0];
		canvas.width  = w;
		canvas.height =  h;

		canvas.style.width=w+'px';
		canvas.style.height=h+'px';

		this.resize(true);	
		
		this.target= getRenderTarget(w, h);


		this.overlayHolder.resetScreenSize(w, h);
		this.scrollTexts.resetScreenSize(w, h);
		// XXX problem: F11 only works correctly if focus was within window..
		
		this.composer = this.getEffectComposer(this.target);
	}
};


