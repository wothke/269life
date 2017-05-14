/**
* THREE.js/WEBGL version of "boxplorer2's Reflectoids" (see https://code.google.com/archive/p/boxplorer2/).
* 
* CAUTION: relies on a development version of THREE.js with added WebGLMultiRenderTarget feature. In
* order to use with a regular version of THREE.js, the below GL_EXT_draw_buffers based stuff (e.g. gl_FragData[0])
* must be replaced with the plain gl_FragColor stuff.
*
* Copyright 2017, Juergen Wothke
*
* Licensed under whatever "open source" license the original "boxplorer2" version is licensed.
*/

BOX2 = "BOX2" in window ? BOX2 : {}


/*
* math utilities
*
* todo: below impl to a large degree is still based on direct 
* manipulation of matrix/quaternion arrays.. migrating that 
* code to the use of regular THREE.js abstractions would 
* would greatly improve readability
*/
BOXMATH = {
	FLT_EPSILON: 1E-5,

	mat2quat: function(m1, q) {		
		var quaternion = new THREE.Quaternion();
		var m = new THREE.Matrix4();
		m["set"].apply(m, m1);	//	m["set"](...m1);		// ES6
		quaternion.setFromRotationMatrix ( m )
		
		quaternion.toArray(q);	
	},
	dot: function(x, y) {	// here for Array(3)
		return x[0]*y[0] + x[1]*y[1] + x[2]*y[2];
	},
	// m1 best be ortho.
	qnormalize: function(q) {
		var quaternion = new THREE.Quaternion(q[0],q[1],q[2],q[3]);
		quaternion.normalize();
		quaternion.toArray(q);
	},
	// Leaves m[12..14] untouched.
	quat2mat: function(q, m) {	
		var quaternion = new THREE.Quaternion(q[0],q[1],q[2],q[3]);
		var mat = new THREE.Matrix4();
		mat.makeRotationFromQuaternion ( quaternion )
		mat.setPosition ( new THREE.Vector3(m[12], m[13], m[14]));	// like in old impl

		var mat2 = new THREE.Matrix4();
		mat2["set"].apply(mat2, mat.elements);	// switch row/colum major
		mat2.toArray( m );		
	},
	// spline interpolation for quaternions:
	// from game programming gems 2, page 224
	// Quaternion.slerp() might be used to replace this..
	quat2x: function(q, x) {
		var d = Math.sqrt(2*(1-q[3]));
		// TODO: deal with d ~ 0
		x[0] = q[0] / d;
		x[1] = q[1] / d;
		x[2] = q[2] / d;
		x[3] = (1-q[3]) / d;
	},
	x2quat: function(x, q) {
		var d = x[0]*x[0] + x[1]*x[1] + x[2]*x[2] + x[3]*x[3];
		// TODO: deal with d ~ 0
		q[3] = (x[0]*x[0] + x[1]*x[1] + x[2]*x[2] - x[3]*x[3]) / d;
		q[0] = (2*x[0]*x[3]) / d;
		q[1] = (2*x[1]*x[3]) / d;
		q[2] = (2*x[2]*x[3]) / d;
		BOXMATH.qnormalize(q);
	},
};

/*
* Various utility functionalities.
*/
Object.assign(BOX2, {

	// offsets into the "view matrix"
	RIGHT_OFFSET: 0,
	UP_OFFSET: 4,
	AHEAD_OFFSET: 8,
	POS_OFFSET: 12,
	
	/*
	* Creates a list of all display frames based on a supplied list of key frames.
	*
	* @param cfg generated from original "boxplorer2" config via keyframe.php script
	* @param subFrames number of frames to use between 2 keyframes..

	FIXME: the timing info is NOT used for playback but all available frames are just played in sequence, 
	i.e. animation will not always be in sync with music but may lag behind.. 
	the "speed" config (whatever it was originally meant for) might be used to scale the number of
	steps used between 2 keyframes.. e.g. to make a slow pass..
	*/		
	splinedKeyFrames: function(cfg, subFrames) {
	//	this.base= new BOX2.KeyFrame();		currently unused..
	//	this.base._init(cfg.main);
		
		var frames= new Array();
		
		for (var i= 0; i<cfg.keyFrames.length;  i++) {
			var kf= new BOX2.KeyFrame();
			kf._init(cfg.keyFrames[i]);
			frames.push(kf);
		}
		var out= new Array();
		new BOX2.CatmullRom().spline(frames ,out, true, subFrames);
		return out;
	},	
	/**
	* optimization: use texture based noise instead of procedural generation..
	*
	* iq's noise texture has specific properties: https://www.shadertoy.com/view/4sfGzS
	* that are a prerequisite for respective noise() shader functions..
	*/
	getIqNoiseTexture: function() {
		var size= 256;
		var data = new Uint8Array( 4 * size*size );

		for (var i = 0; i < size*size; i++) {	// _init R+B with random data
				data[(i*4)+0] =  Math.random() * 0xff;	// R
				data[(i*4)+2] =  Math.random() * 0xff;	// B
		}

		for (var y = 0; y < size; y++) {
			for (var x = 0; x < size; x++) {
				// the 37/17 offsets must match the ones in the shader's "noise()" function
				var x2 = (0x100 + x - 37) & 0xff;
				var y2 = (0x100 + y - 17 ) & 0xff;
				data[((x+y*size)*4)+1] = data[((x2+y2*size)*4)+0];	// G from R
				data[((x+y*size)*4)+3] = data[((x2+y2*size)*4)+2];	// A from B
			}
		}
		var texture = new THREE.DataTexture( data, size, size, THREE.RGBAFormat, THREE.UnsignedByteType);
		texture.format = THREE.RGBAFormat;
		texture.type = THREE.UnsignedByteType;	//THREE.UnsignedByteType THREE.FloatType
		texture.generateMipmaps = true;
		
		// disabled to match the above generated noise texture
		//texture.flipY = true;		// Disable the default vertical flip

		texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
		texture.minFilter= THREE.LinearMipMapLinearFilter;
		texture.magFilter= THREE.LinearFilter;

		texture.needsUpdate = true;
		return texture;
	},
	getGlobalNoiseTexture: function() {
		BOX2.noisetexture = "noisetexture" in BOX2 ? BOX2.noisetexture : BOX2.getIqNoiseTexture(256);
		return BOX2.noisetexture;
	},
	/*
	* debugging: visualize the camera path		
	*/
	createCameraPath: function(scene, keyFrames) {
			
		var material = new THREE.LineBasicMaterial({
			color: 0xffffff
		});

		var lineGeo = new THREE.Geometry();
		for (var i= 0; i<keyFrames.length; i++) {
			var keyFrame= keyFrames[i];		
			var pos= keyFrame.getPosition();
			
			lineGeo.vertices.push(	new THREE.Vector3( pos.x, pos.y, pos.z ));			
		}
			
		var cameraPath = new THREE.Line( lineGeo, material );
		cameraPath.frustumCulled = false; // Avoid getting clipped - does not seem to help one little bit
		scene.add( cameraPath );
	},
	/*
	* @modelViewMatrix THREE.Matrix4
	*/
	makeGLModelViewMatrix: function(modelViewMatrix) {
		var a= modelViewMatrix.elements;
		// modelViewMatrix expected by regular GL rendering
		
		var r= new Float32Array(16);
		r[0]= a[BOX2.RIGHT_OFFSET+0];
		r[1]= a[BOX2.UP_OFFSET+0];
		r[2]= -a[BOX2.AHEAD_OFFSET+0];			// - !!!
		r[3]= a[BOX2.POS_OFFSET+0];
		r[4]= a[BOX2.RIGHT_OFFSET+1];
		r[5]= a[BOX2.UP_OFFSET+1];
		r[6]= -a[BOX2.AHEAD_OFFSET+1];			// - !!!
		r[7]= a[BOX2.POS_OFFSET+1];
		r[8]= a[BOX2.RIGHT_OFFSET+2];
		r[9]= a[BOX2.UP_OFFSET+2];
		r[10]= -a[BOX2.AHEAD_OFFSET+2];			// - !!!
		r[11]= a[BOX2.POS_OFFSET+2];
		r[12]= 0;
		r[13]= 0;
		r[14]= 0;
		r[15]= 1;

		var m= new THREE.Matrix4();
		m.elements=  r;
		
		return m;
	},	
	/*
	* @param modelViewMatrix THREE.Matrix4
	*/
	removePosGLModelViewMatrix: function(modelViewMatrix) {
		var a= modelViewMatrix.elements;
		var pos= new THREE.Vector3(a[3], a[7], a[11]);
		a[3]= 0;
		a[7]= 0;
		a[11]= 0;
		return pos;
	},
});

/**
* Defines a specific position/orientation of the camera.
*
* Via the below BOX2.CatmullRom stuff additional intermediate frames
* can be calculated between key frames.
*
* note: original impl makes use of C array semantics quite heavily, i.e. using
* sub-arrays within "view matrix" - obviously that does not work in JavaScript 
* and had to be changed..	
*/
BOX2.KeyFrame = function() {
	this._delta_time= 0;
	this._time= 0;
	this._speed= 0;
		
	this._v= new Float32Array(16);  // view matrix:		row-major ordering (unlike internal THREE.js representation - which uses column-major)
	this._v.fill(0);
	this._q= new Float32Array(4);   // quaterion orientation
	this._q.fill(0);
	this._x= new Float32Array(4);   // r4 splineable q
	this._x.fill(0);
	this._isKey= false;
	this._hackMatrix= false;
}

BOX2.KeyFrame.prototype = {
	printPos: function() {
		return this._getMat(BOX2.POS_OFFSET+0)+" / "+this._getMat(BOX2.POS_OFFSET+1)+" / "+this._getMat(BOX2.POS_OFFSET+2);
	},
	copy: function(setHack) {
		var c= new BOX2.KeyFrame();
		c.delta_time= this._delta_time;
		c.time= this._time;
		c.speed= this._speed;
		c._v= this._v.slice();
		c._q= this._q.slice();
		c._x= this._x.slice();
		c._isKey= this._isKey;
		c._hackMatrix= setHack;
		
		return c;
	},
	setHackMatrix: function(val) {
		this._hackMatrix= val;
	},
	getHackMatrix: function() {
		// hack to generate an alternative camera path
		var c= new Float32Array(16);
		c[0]= -this._getMat(BOX2.RIGHT_OFFSET+0);
		c[1]= this._getMat(BOX2.UP_OFFSET+0);
		c[2]= -this._getMat(BOX2.AHEAD_OFFSET+0);
		c[3]= 0;
		c[4]= -this._getMat(BOX2.RIGHT_OFFSET+1);
		c[5]= this._getMat(BOX2.UP_OFFSET+1);
		c[6]= -this._getMat(BOX2.AHEAD_OFFSET+1);
		c[7]= 0;
		c[8]= -this._getMat(BOX2.RIGHT_OFFSET+2);
		c[9]= this._getMat(BOX2.UP_OFFSET+2);
		c[10]= -this._getMat(BOX2.AHEAD_OFFSET+2);
		c[11]= 0;
		c[12]= this._getMat(BOX2.POS_OFFSET+0);
		c[13]= this._getMat(BOX2.POS_OFFSET+1);
		c[14]= this._getMat(BOX2.POS_OFFSET+2);
		c[15]= 1;
		
		var m= new THREE.Matrix4();
		m.elements=  c;
		return m;
	},
	
	/*
	 matrix format expected by the vertex shader
	*/
	getShaderModelViewMatrix: function() {
		return this._v.slice();
	},
	
	getKeyFrameMatrix: function() {
		this.orthogonalize();

		if (this._hackMatrix) return this.getHackMatrix();
		
		var m= new THREE.Matrix4();
		// modelViewMatrix expected by the shader
		m.elements=  this.getShaderModelViewMatrix();
		return m;
	},	
	getPosition: function() {
		return new THREE.Vector3(this._v[BOX2.POS_OFFSET+0], this._v[BOX2.POS_OFFSET+1], this._v[BOX2.POS_OFFSET+2]);
	},
	setKey: function(key) { this._isKey = key; },
	isKey: function() { return this._isKey; },

	distanceTo: function(other) {				
		var delta = [ this._v[12]-other._v[12],
					  this._v[13]-other._v[13],
					  this._v[14]-other._v[14] ];
		return Math.sqrt(BOXMATH.dot(delta, delta));
	},
	// Orthogonalize v[]
	orthogonalize: function() {
		if (!this._normalMat(BOX2.AHEAD_OFFSET)) {this._setMat(BOX2.AHEAD_OFFSET+0, 0);this._setMat(BOX2.AHEAD_OFFSET+1, 0);this._setMat(BOX2.AHEAD_OFFSET+2, 1);}
		if (!this._normalMat(BOX2.UP_OFFSET)) {  // Error? Make upDirection.z = 0.
			this._setMat(BOX2.UP_OFFSET+2, 0);
			
			
			if (Math.abs(this._getMat(BOX2.AHEAD_OFFSET+2)) == 1) {
				this._setMat(BOX2.UP_OFFSET+0, 0);
				this._setMat(BOX2.UP_OFFSET+1, 1);
			} else {
				this._setMat(BOX2.UP_OFFSET+0, -this._getMat(BOX2.AHEAD_OFFSET+1));
				this._setMat(BOX2.UP_OFFSET+1, this._getMat(BOX2.AHEAD_OFFSET+0));
				this._normalMat(BOX2.UP_OFFSET);
			}
		}
		var l = this._dotMat(BOX2.AHEAD_OFFSET, BOX2.UP_OFFSET);
		for (var i=0; i<3; i++) {			
			this._addMat(BOX2.UP_OFFSET, -l*this._getMat(BOX2.AHEAD_OFFSET+i));
		}
		// Compute rightDirection as a cross product of upDirection and direction.
		for (var i=0; i<3; i++) {
			var j = (i+1)%3, k = (i+2)%3;
			this._setMat(BOX2.RIGHT_OFFSET+i, this._getMat(BOX2.UP_OFFSET+j)*this._getMat(BOX2.AHEAD_OFFSET+k)
										- this._getMat(BOX2.UP_OFFSET+k)*this._getMat(BOX2.AHEAD_OFFSET+j));		
		}
		this._setMat(BOX2.RIGHT_OFFSET+3, 0);
		this._setMat(BOX2.UP_OFFSET+3, 0);
		this._setMat(BOX2.AHEAD_OFFSET+3, 0);
		this._setMat(BOX2.POS_OFFSET+3, 1);
	},

	// ------------------  internals only to be used within this object ------------------//
	_init: function(cfg) {
		this._time= cfg.time;	
		this._delta_time= cfg.delta_time;
		this._speed= cfg.speed;
		
		this._v[BOX2.POS_OFFSET+0]= cfg.position[0];
		this._v[BOX2.POS_OFFSET+1]= cfg.position[1];
		this._v[BOX2.POS_OFFSET+2]= cfg.position[2];
		
		this._v[BOX2.AHEAD_OFFSET+0]= cfg.direction[0];
		this._v[BOX2.AHEAD_OFFSET+1]= cfg.direction[1];
		this._v[BOX2.AHEAD_OFFSET+2]= cfg.direction[2];
		
		this._v[BOX2.UP_OFFSET+0]= cfg.upDirection[0];
		this._v[BOX2.UP_OFFSET+1]= cfg.upDirection[1];
		this._v[BOX2.UP_OFFSET+2]= cfg.upDirection[2];
		
		// FIXME: die "RIGHT Einträge" bleiben hier leer.. woher kommen sie beim Splinen?
		BOXMATH.mat2quat(this._v, this._q);
	},
	
	// manipulations within the "view matrix"
	_dotMat: function(off1, off2) {
		return this._v[off1+0]*this._v[off2+0] + this._v[off1+1]*this._v[off2+1] + this._v[off1+2]*this._v[off2+2];
	},
	_normalMat: function (offset) {
		var len = this._dotMat(offset, offset);
		if (Math.abs(len) < BOXMATH.FLT_EPSILON) return false;
		if (Math.abs(len - 1.0) < BOXMATH.FLT_EPSILON) return true;
		len = 1.0 / Math.sqrt(len);
		this._v[offset+0] *= len; this._v[offset+1] *= len; this._v[offset+2] *= len;
		return true;
	},		
	_getMat: function(offset) {
		return this._v[offset];
	},
	_setMat: function(offset, val) {
		this._v[offset] = val;
	},
	_addMat: function(offset, val) {
		this._v[offset] += val;
	},
	

	
/* unused stuff from the original impl	
	// Rotate q[] by `deg` degrees around a normalized axis
	// and set rotation part of v[] to q[].
	// Behaves like `glRotate` without normalizing the axis.
	rotate: function(deg, x, y, z){
		var s= Math.sin(deg*Math.PI/180), c = Math.cos(deg*Math.PI/180), t = 1-c;
		var r= [[ x*x*t +   c, x*y*t + z*s, x*z*t - y*s ],
				[ y*x*t - z*s, y*y*t +   c, y*z*t + x*s ],
				[ z*x*t + y*s, z*y*t - x*s, z*z*t +   c ]
			];
		for (var i=0; i<3; i++) {
			var ca= new Array(3);
			for (var j=0; j<3; j++) { ca[j] = this._v[i+j*4] };
			for (var j=0; j<3; j++) { this._v[i+j*4] = BOXMATH.dot(ca, r[j]) };
		}
		this.orthogonalize();
	},

	// Move camera in a direction relative to the view direction.
	// Behaves like `glTranslate`.
	move: function(x, y, z) {
		for (var i=0; i<3; i++) {
			this._addMat(BOX2.POS_OFFSET+i, this._getMat(BOX2.RIGHT_OFFSET+i)*x + this._getMat(BOX2.UP_OFFSET+i)*y 
												+ this._getMat(BOX2.AHEAD_OFFSET+i)*z);
		}
	},
	// Move camera in the normalized absolute direction `dir` by `len` units.
	moveAbsolute: function(dir, len) {
		for (var i=0; i<3; i++) {
			this._addMat(BOX2.POS_OFFSET+i, len * dir[i]);
		}
	}
*/	
}

/**
* Original boxplorer2 keyframe splining impl (such that boxplorer2 can directly be used as
* an editor for the respective camera animation path).
*
* Respective matrix logic could probably be simplified using the utilities available in
* THREE.js - but it works. FIXME check if the built-in THREE.CatmullRomCurve3 stuff from THREE.js 
* can directy be used to replace this..
*
* note: only the camera related settings are currently handled - if other 
* params (e.g. fractal settings) should be animated as well (as they are in the original
* boxplorer2) then this needs to be re-added below.
*/	
BOX2.CatmullRom = function() {
}
BOX2.CatmullRom.prototype = {
	spline: function(keyframes, output, loop, nsubframes) {
		output.length= 0;
		
		if (keyframes.length < 2) return;  // Need at least two points.

		var controlpoints= keyframes.slice(0, keyframes.length);;

		var n = controlpoints.length;

		// Compute / check quats.
		// Pick smaller angle between two quats.
		BOXMATH.mat2quat(controlpoints[0]._v, controlpoints[0]._q);
		BOXMATH.quat2x(controlpoints[0]._q, controlpoints[0]._x);
		
		for (var i = 1; i < n; ++i) {
			BOXMATH.mat2quat(controlpoints[i]._v, controlpoints[i]._q);
			var dot =	controlpoints[i - 1]._q[0] * controlpoints[i]._q[0] +
						controlpoints[i - 1]._q[1] * controlpoints[i]._q[1] +
						controlpoints[i - 1]._q[2] * controlpoints[i]._q[2] +
						controlpoints[i - 1]._q[3] * controlpoints[i]._q[3];
			if (dot < 0) {
				// Angle between quats > 180; make current quat go smaller 360 - angle.
				// Note: this fails to cover the two ends of a loop.
				controlpoints[i]._q[0] *= -1;
				controlpoints[i]._q[1] *= -1;
				controlpoints[i]._q[2] *= -1;
				controlpoints[i]._q[3] *= -1;
			}
			// Compute splinable R4 mapping of quat for splining below.
			BOXMATH.quat2x(controlpoints[i]._q, controlpoints[i]._x);
		}

		if (loop) {
			// Replicate first two at end to function as p2, p3 for splining.
			controlpoints.push(controlpoints[0]);
			if (controlpoints[controlpoints.length-1].delta_time == 0) {
				// Likely first point does not have delta_time specified.
				// Try guess at one based on speed at last point and distance there to.
				this._suggestDeltaTime(controlpoints[controlpoints.length - 1], keyframes);
			}
			controlpoints.push(controlpoints[1]);
			// Last specified keyframe is p0 for spline of first keyframe.
			controlpoints.push(controlpoints[n - 1]);
		} else {
			// Replicate last one twice more.
			controlpoints.push(controlpoints[n - 1]);
			controlpoints.push(controlpoints[n - 1]);
			// Last one is p0 for spline of first keyframe.
			controlpoints.push(controlpoints[0]);
		}

		n = controlpoints.length;

		// Compute each frame's target time based on sum of delta_time up to it.
		// Note we don't spline delta_time but we do spline time.
		var time = 0;
		controlpoints[0].time = 0;   // time starts at 0.
		for (var i = 1; i < n - 1; ++i) {
			time += controlpoints[i].delta_time;
			controlpoints[i].time = time;
		}
		// Last one's time is p0 for spline of first one; set to 0 as well.
		controlpoints[n - 1].time = 0;

		// Now spline all into intermediate frames.
		for (var i= 0; i < n - 3; ++i) {
			var p0 = controlpoints[i>0?i-1:n-1];
			var p1 = controlpoints[i];
			var p2 = controlpoints[i+1];
			var p3 = controlpoints[i+2];
			for (var f= 0; f < nsubframes; ++f) {
				var tmp = new BOX2.KeyFrame();
				tmp.setKey(f == 0);
				var t = f / nsubframes;


				// Spline over splinable representation of quat.
				for (var j= 0; j < 4; ++j) {
					tmp._x[j]= this._catmull( t, p0._x[j], p1._x[j], p2._x[j], p3._x[j]);
				}
				BOXMATH.x2quat(tmp._x, tmp._q);  // convert back to quat
				BOXMATH.qnormalize(tmp._q);
				BOXMATH.quat2mat(tmp._q, tmp._v);  // convert quat to the splined rotation matrix

				// Spline position into tmp._v[12..14]
				for (var j= 12; j < 15; ++j) {
					// To control numerical precision, re-base to (p2-p1)/2.
					var a = p0._v[j], b = p1._v[j], c = p2._v[j], d = p3._v[j];
					var base = .5 * (c - b);
					a -= base; b -= base; c -= base; d -= base;
					tmp._v[j]= this._catmull(t, a, b, c, d);
					tmp._v[j] += base;
				}
				// note: removed splining of "par", "uniforms" and "common params" 
				// array - which was present in the original code
				tmp.orthogonalize();
				output.push(tmp);
			}
		}
	},
	
	// ------------------  internals only to be used within this object ------------------//

	_suggestDeltaTime: function(camera, keyframes) {
		var FPS= 30;
		if (keyframes.length == 0) {
			camera.delta_time = 0;
		} else {
			var dist = camera.distanceTo(keyframes[keyframes.length - 1]);
			var steps = dist / camera.speed;
			camera.delta_time = steps / FPS;
		}
	},
	// The CatmullRom spline function; 0 <= t <= 1
	// Suffers from overshoot for non-evenly spaced control points.
	// TODO: look into Bessel-Overhauser mitigation.
	_catmull: function(t, p0,p1,p2,p3) {
		return (.5 * (2 * (p1) + 
			t*( (-(p0) + (p2)) + 
				t*( (2*(p0) - 5*(p1) + 4*(p2) - (p3)) + 
					t*(-(p0) + 3*(p1) - 3*(p2) + (p3)) ) ) ) );	
	},	
}


/*
* Provides code snippets used to configure the "pseudo kleinian" shader.
*/
BOX2.PKleinConfig = function(defines, d_shape) {
	this._defines= defines.join( "\n" );
	this._dShape= d_shape.join( "\n" );
}

BOX2.PKleinConfig.prototype = {
	/*
	* shader code snippet completing the #define section of the shader, e.g.
		[
			"#define COLOR_ITERS 7",											// Number of fractal iterations for coloring
			"#define REFITER 3",												// reflections
			"#define DIST_MULTIPLIER 0.763001",
			"#define ITERS 11",													// Number of fractal iterations			
			"#define CSize vec3(0.808001 ,0.808,1.167)",						// Size of the box folding cell
			"#define Size 1.",													// Size of inversion sphere
			"#define C vec3(0,0,0)",											// Julia seed
			"#define Offset vec3(-4.88759e-007,1.73877e-007,-1.51991e-007)",	// Translation of the basic d_shape
			"#define DEoffset 0.",												// A small value added to the DE - simplify
			"#define MAXI 1.0"
		].join( "\n" )
	*/
	getDefines: function() {
		return this._defines;
	},
	
	/*
	* provides the function used to calculate the distance for a specific "shape", e.g.
		[
			"float d_shape(vec3 p) {",
			"   return max( p.x, p.x / length(p));",			
			"}"
		].join( "\n" )
	*/
	getDShape: function() {
		return this._dShape;
	},
}


/*
* Holds a separate THREE.Scene & Camera that shows the same view perspective
* as the one rendered by the fragement shader from RawShaderSceneHolder.
*
* Based on the z-buffer info rendered by the above shader, the ShadowSceneHolder can be 
* rendered directly over the respective RawShaderSceneHolder output.
*/
BOX2.ShadowSceneHolder = function(fov_x, fov_y) {
	this._scene = new THREE.Scene();
	var light = new THREE.AmbientLight(0x2f2f2f);
	this._scene.add(light);
	var light2 =  new THREE.DirectionalLight( 0x404040, 1.4 );
	light2.position = new THREE.Vector3(0,-1,0);		
	this._scene.add(light2);

	this._shadowCamera= this._createCamera(fov_x, fov_y);
};
BOX2.ShadowSceneHolder.prototype = {
	getCamera: function() {
		// CAUTION: only used for its perspective settings.. position/orientation MUST NOT be changed
		return this._shadowCamera;
	},
	getScene: function() {
		return this._scene;
	},
	
	// ------------------  internals only to be used within this object ------------------//
	
	_createCamera: function(fov_x, fov_y) {
		// create camera
		var speed = 0.00039507;	
		var z_near = Math.abs(speed);
		var z_far = speed * 65535.0;
		var fH = Math.tan( fov_y * Math.PI / 360.0 ) * z_near;
		var fW = Math.tan( fov_x * Math.PI / 360.0 ) * z_near;

		// this seems to be close enough to what the original GL app was doing..
		var camera = new THREE.PerspectiveCamera( fov_y, fW / fH, z_near, z_far );
		camera.updateProjectionMatrix();
		return camera;
	},
	setAllInvisible: function() {
		var objs= this._scene.children;
		for(var i= 0; i<objs.length; i++) {
			var o= objs[i];
			if (!("intensity" in o)) o.visible= false;	// exclude lights
		}
	},
	_syncShadowCamera: function(modelViewMatrix) {
		// in order to render regular polygon stuff a separate/regular THREE.js
		// Scene/Camera has to be kept "in sync" with the "modelViewMatrix" based 
		// camera of the fractal vertex/fragment shader

		// note: the original boxplorer2 GL code would have used this matrix 1:1
		// as its modelViewMatrix (see https://open.gl/transformations#TransformationsinOpenGL
		// for how the original OpenGL impl worked.. and in GL the camera always stays at
		// 0/0/0 while the world moves/turns around it - the same approach is used here)
		
		
		var m= BOX2.makeGLModelViewMatrix(modelViewMatrix);	
		var camPos= BOX2.removePosGLModelViewMatrix(m);
		
		var t= new THREE.Matrix4().makeTranslation(-camPos.x, -camPos.y, -camPos.z);
		t.premultiply ( m );

		// CAUTION: as a precondition for this to work, the respective objects 
		// MUST NOT have been translated/rotated on the object level.. any such 
		// transformation (if needed - e.g. to position the object in the world)
		// must have been done DIRECTLY on the vertex level
		var objs= this._scene.children;
		for(var i= 0; i<objs.length; i++) {
			// note: this may not work for nested scene content..
			var o= objs[i];
			o.matrixAutoUpdate=false;
			o.matrix.copy(t);
		}
	},
};

/*
* Scene that is directly rendered within one vertex/fragment shader. 
*
* THREE.js is only use as a minimalistic wrapper.
*/
BOX2.RawShaderSceneHolder = function(renderer, fov_x, fov_y, backgroundColor, matCfgLib) {
	this._fov_x= fov_x;
	this._fov_y= fov_y;
	this._backgroundColor= backgroundColor;
		
	this._scene = null;			// FIXME naming of private stuff.
	this._camera= null;
	this._mesh= null;
	this._material= null;	// the currently selected material

	this._initScene();		
	
	this._shadowScene= new BOX2.ShadowSceneHolder(this._fov_x, this._fov_y);

	// associative list with BOX2.PKleinConfig values
	this._materialsLib= this._createMaterials(renderer, matCfgLib);
	this._precompileProgress= 0;
	
	var someMat= Object.keys(this._materialsLib)[0];	// just set some default
	this._selectMaterial(someMat);
};

BOX2.RawShaderSceneHolder.prototype = {
	getRandomMaterialKey: function() {
		var keys= Object.keys(this._materialsLib);
		return (keys.length == 0) ? null : keys[Math.round((keys.length-1)*Math.random())];		
	},
	getShadowRenderPass: function() {
		return new THREE.RenderPass( this._shadowScene.getScene(), this._shadowScene.getCamera() );
	},
	getShadowScene: function() {
		return this._shadowScene.getScene();
	},
	/*
	* note: must be the 1st step for configuring the scene: also sets all shadow scene objects 
	* to invisible: only those that are actually used via animate() will then be later turned on
	*/
	configure: function(materialKey, keyFrame) {
		this._selectMaterial(materialKey);
		this._updateScene(keyFrame);
		
		this._shadowScene.setAllInvisible();
	},
	getShaderPass: function(width, height) {
		return new THREE.RenderPass( this._scene,  this._camera);
	},
	getPrecompileSteps: function() {
		var keys= Object.keys(this._materialsLib);
		return keys.length + 1;
	},	
	/*
	* @return true when "precompile" is done / false if more calls are needed
	*/
	incrementalPrecompile: function(renderer) {
		var dummyTarget= this._getRenderTarget(10,10);
		
		var keys= Object.keys(this._materialsLib);	// just set some default
		for (var i= 0; i<keys.length; i++) {
			this._selectMaterial(keys[i]);
			
			if (i == this._precompileProgress) {
				renderer.render(this._scene, this._camera, dummyTarget);
				this._precompileProgress++;
				return false;
			}
		}
		renderer.render(this.getShadowScene(), this._shadowScene.getCamera(), dummyTarget );
		return true;
	},
	
	// ------------------  internals only to be used within this object ------------------//
	
	_selectMaterial: function(key) {
		key= ""+key;
		this._material= this._materialsLib[key];
		
		if (this._material == null) console.log("error: no material for key: "+key);
		
		this._mesh.material= this._material;	// reset the material
	},
	_updateScene: function(keyFrame) {
		this._material.uniforms.time.value= new Date().getTime();
		this._setCameraToKeyFrame(keyFrame);	
	},
	_createShaderMaterial: function(shaderConfig) {
		var material = this._getKleinianMaterial( this._backgroundColor, shaderConfig);
		material.uniforms.fov_x.value=  this._fov_x;		// in case of fullscreen switches FIXME adjust aspect?
		material.uniforms.fov_y.value=  this._fov_y;
		return material;	
	},
	_createMaterials: function(renderer, matCfgLib) {
		var lib= {};
		
		Object.keys(matCfgLib).forEach(function(key,index) { 
			var mat= this._createShaderMaterial(matCfgLib[key]);
			lib[key]= this._precompileShaderMaterial(renderer, mat);
		}.bind(this));

		return lib;
	},
	_applyMatrix: function(m, targetObj3d) {
		var pos= new THREE.Vector3();
		var q= new THREE.Quaternion();
		var scale= new THREE.Vector3();
		m.decompose(pos,q,scale);

		targetObj3d.position.set(pos.x, pos.y, pos.z);
		targetObj3d.quaternion.set(q.x, q.y, q.z, q.w);
		targetObj3d.scale= scale;
		
		targetObj3d.updateMatrix();	// this.matrix.compose( this.position, this.quaternion, this.scale );	
		targetObj3d.updateMatrixWorld(true);
	},
	_setCameraToKeyFrame: function(keyframe) {
		var m= keyframe.getKeyFrameMatrix();
		// use regular THREE.js constructs to pass the modelViewMatrix		
		// (calculated via: object.modelViewMatrix.multiplyMatrices( camera.matrixWorldInverse, object.matrixWorld )

			
		// note: the vertex/fragment shader needs the input mat4 1:1 as its
		// "modelViewMatrix" uniform.. (so that the same result is rendered as
		// in boxplorer2) that effect here can be achieved by 
		// applying 'm' to either this._mesh or this._scene		
		this._applyMatrix(m, this._mesh);
		
		this._shadowScene._syncShadowCamera(m);		
	},
	_initScene: function(){	// FIXME target and resetting no longer needed here..
		this._scene  = new THREE.Scene();
			// all the projection logic is part of the shader - no need for "real" camera
		this._camera = new THREE.OrthographicCamera( - 1, 1, 1, - 1, 0, 1 );

		this._mesh = new THREE.Mesh( new THREE.PlaneBufferGeometry( 2, 2 ), null );	// material must be set later
		this._mesh.frustumCulled = false; // Avoid getting clipped
		
		this._scene.add( this._mesh );
	},
	_precompileShaderMaterial: function(renderer, material) {
		// CAUTION: hacked three.js to expose this internal function
		// XXX does not seem to work.. each 1st use of a material causes
		// a "hang" of between 20-29 frames!
		
		var oldWarnFunction = console.warn;		// that's just useless spam here..
		console.warn = function(){};
		
		renderer.initMaterial(material, this._scene.fog, this._mesh );	// FIXME remove & test

		console.warn = oldWarnFunction; // restore
		
		return material;
	},
	
	_getRenderTarget: function(width, height) {
		// Create a multi render target with Float buffers
		// (note: constructor sets target.attachments[0] = target.texture)
		var target = new THREE.WebGLMultiRenderTarget( width, height );
		target.texSize=  new THREE.Vector2(width, height);
		
		target.texture.format = THREE.RGBAFormat;
		target.texture.minFilter = THREE.LinearFilter;
		target.texture.magFilter = THREE.LinearFilter;
		target.texture.type = THREE.FloatType;
		target.texture.generateMipmaps = false;
		target.stencilBuffer = false;
		target.depthBuffer = true;

		// Add an attachment for various post-processing infos	
		var a1= target.texture.clone();
		target.attachments.push( a1 );	// i.e. 2nd attachment
		
		// Name our G-Buffer attachments for debugging
		target.attachments[0].name = 'diffuse';	
		target.attachments[1].name = 'scratchpad';
		return target;
	},
	
	/**
	* The below impl is derived from the opengl "Reflectoids" version in "boxplorer2": it is really the 
	* reflection/transparency handling - as well as the coloring scheme - that make that impl create
	* some outstanding visuals:
	*
	* That impl again was based on:
	* "Pseudo Kleinian" shader by knighty (see examples in Fragmentarium). Based on mandelbox shader 
	* by Rrrola (Jan Kadlec <rrrola@gmail.com>).
	* Original formula by Theli-at (http://theli-at.deviantart.com/art/Kleinian-drops-192676501). Actally 
	* "reverse engineered" from his MB3D param files. Thanks theli :)
	* - http://www.fractalforums.com/mandelbulb-3d/mandelbulb-3d-parameters-list/msg28870/#msg28870
	*
	* This version here is a WEBGL/THREE.js port with various cleanups/optimizations (adapted to the WEBGL 
	* limitations; cheaper "noise" impl; etc).
	* It requires the following WEBGL extensions: GL_EXT_draw_buffers, GL_EXT_frag_depth
	*
	* It may serve as an example for what needs to be done to migrate other "boxplorer2" 
	* shaders to WEBGL.
	*/
	_getKleinianMaterial: function(backgroundColor, shaderConfig) {
		var STD_DEFINES= shaderConfig.getDefines();
		var D_SHAPE_FUNC= shaderConfig.getDShape();

	// XXX IDEE: einen Teil "rejected scenes... mit unbenutzten Mustern?" vielleicht mit
	// horizontalem Abspann Text?

		var shader = {
			uniforms: {
				mvMatrix : { type: "m4", value: new THREE.Matrix4() }, // single Matrix4

				
			  tNoise : { type: "t", value: null },
			  speed: { type: "f", value: 3.95070000e-004 },
			  time: { type: "f", value: 0 },
			  preset: { type: "i", value: 0 },

			  fov_x: { type: "f", value: 0 },
			  fov_y: { type: "f", value: 0 },
			  backgroundColor: { type: "v3", value: null },
			  
			  min_dist: { type: "f", value: 0.000794328 },		 // Distance at which raymarching stops
			  glow_strength: { type: "f", value: 0.499999 },	 // How much glow is applied after MAX_STEPS
			  dist_to_color: { type: "f", value: 0.200951 },	 // How is background mixed with the surface color after MAX_STEPS
			},

			vertexShader: [
				"#extension GL_EXT_draw_buffers : require",
				"#extension GL_EXT_frag_depth : enable",
				
				"precision highp float;",
				
				"uniform float fov_x;",
				"uniform float fov_y;",
				
				"varying vec3 eye, dir;",
				
				"float fov2scale(float fov) { return tan(radians(fov/2.0)); }",
				
				"void main()	{",
				"  gl_Position = vec4(position, 1.0);",
				
				"  eye = vec3(modelViewMatrix[3]);",
				"  dir = vec3(modelViewMatrix * vec4( fov2scale(fov_x)*(position.x ), fov2scale(fov_y)*(position.y ), 1, 0));",	
				"}"
			].join( "\n" ),

			fragmentShader: [
				"#extension GL_EXT_draw_buffers : require",
				"#extension GL_EXT_frag_depth : enable",
				
				"#ifdef GL_ES",
				"precision highp float;",
				"#endif",

				"#define RIM_BLEEDING",	

				"#define DE_EPS 0.0001",
				"#define MAX_DIST 10.0",

				"#define MAX_STEPS 137",	// Maximum raymarching stepscoloring
				
				
				"#define REFACTOR 0.5",

				"#define TThickness 4.50741e-008",		// Change a little the basic d_shape
				"#define Ziter 3",

				// the following defines must be made in the below placeholder:
				// COLOR_ITERS (int), REFITER (int), DIST_MULTIPLIER(float), ITERS(int), CSize(vec3),
				// Size(float), C(vec3), Offset(vec3), DEoffset(float) .. defines are used (rather than
				// uniforms) to allow optimization of unused stuff..
				`${STD_DEFINES}`,		// ES6 template (FF & Chrome seem to support this..)
				
		
				// "defines" used to completely avoid unused calculations
				"#define OptionalJuliaSeed p=p;",
	//			"#define OptionalJuliaSeed p=p+C;",
				"#define DEfacScale k",				
	//			"#define DEfacScale (k*1.05)",

				"#define BLEND 0.543",	 											// Blend with 0 trap
				
				"#define PI_HALF 1.5707963267948966192313216916398",

				"#define ONE_PLUS_ULP 1.000000059604644775390625",
				"#define ONE_MINUS_ULP 0.999999940395355224609375",
				"#define ULP 0.000000059604644775390625",

				"#define MIN_NORM 0.00001",

				"#define AO_EPS		0.0499998", 	// Base distance at which ambient occlusion is estimated.
				"#define AO_STRENGTH	0.149624",	// Strength of ambient occlusion.

				// Camera position and direction.
				"varying vec3 eye, dir;",

				// Interactive parameters.
				"uniform vec3 backgroundColor;",
				"uniform sampler2D tNoise;",
				"uniform float speed;",
				"uniform float min_dist;",
				"uniform float glow_strength;",
				"uniform float dist_to_color;",
				"uniform float time;",
				"uniform int preset;",

				// Colors. Can be negative or >1 for interesting effects.
				"vec3 specularColor = vec3(1.0, 0.8, 0.4),",
				"  glowColor = vec3(0.03, 0.4, 0.4),",
				"  aoColor = vec3(0, 0, 0);",

				"const vec3 NORM_LIGHT=  normalize(vec3(1.0,0.5,0.7));",

				// Compute the distance from `pos` to the PKlein basic shape.
				// a function with the signature ""float d_shape(vec3 p)" must be supplied here
				`${D_SHAPE_FUNC}`,		// ES6 template (FF & Chrome seem to support this..)

				// Compute the distance from `pos` to the PKlein.
				
				// stripped down version of knighty's "pseudo kleinian" distance 
				// estimate.. (see "Fragmentarium") - see used "defines" to recover standard impl
				"float d(vec3 p) {",
				"	float r2;",
				"	float DEfactor=1.;",
			
				"	for(int i=0; i<ITERS; i++){",				//Box folding (repetition)
				"		p=2.*clamp(p, -CSize, CSize)-p;",
						//Inversion
				"		r2=dot(p,p);",
				"		float k=max(Size/r2, MAXI);",
				"		p*=k; DEfactor*= DEfacScale;",
				"		OptionalJuliaSeed",		// use define to completely remove if not used..
				
			//	"		if (!(r2<1.)) break;", // add some ractangular beams for menger?
				
				"	}",				
				"	return (DIST_MULTIPLIER*d_shape(p-Offset)/abs(DEfactor)-DEoffset);",
				"}",

				// Compute the color (In the original "Fragmentarium" impl color would be calculated 
				// directly within the above d() function.. and the below impl is repeating the 
				// the respective last call of d(p).. still this seems to be faster (e.g. 16fps vs 15fps) than 
				// doing the calc for all the d() calls within march() - not counting all the additional d() 
				// calls for reflections and AO..
				"vec3 color(vec3 p) {",
				"	float r2=dot(p,p);",
				"	float DEfactor=1.;",
				"	vec4  col=vec4(0.0);",
				"	float rmin=10000.0;;",

				"	vec3 Color= vec3(-1.072,5.067, 0.647 );",

				"	for(int i=0; i<COLOR_ITERS; i++){",	//Box folding					
				"		vec3 p1=2.*clamp(p, -CSize, CSize)-p;",
				"		col.xyz+=abs(p-p1);",
				"		p=p1;",
						//Inversion
				"		r2=dot(p,p);",
				"		float k=max(Size/r2, MAXI);",
				"		col.w+=abs(k-1.);",
				"		p*=k; DEfactor*= DEfacScale;;",
				"		OptionalJuliaSeed",		// use define to completely remove if not used..
				
				"		r2=dot(p,p);",
				"		rmin=min(rmin,r2);",
				"	}",				
				"	return mix(vec3(sqrt(rmin)),(0.5+0.5*sin(col.z*Color)), BLEND);",
				"}",

				// Compute the normal at `pos`.
				// `d_pos` is the previously computed distance at `pos` (for forward differences).
				"vec3 generateNormal(vec3 pos, float d_pos) {",
				"	vec2 Eps = vec2(0, max(d_pos, MIN_NORM));",	
				"	return normalize(vec3(",
						// calculate the gradient in each dimension from the intersection point
				"		-d(pos-Eps.yxx)+d(pos+Eps.yxx),",
				"		-d(pos-Eps.xyx)+d(pos+Eps.xyx),",
				"		-d(pos-Eps.xxy)+d(pos+Eps.xxy)",
				"	));",
				"}",

				// Blinn-Phong shading model (http://en.wikipedia.org/wiki/BlinnPhong_shading_model)
				// `normal` and `view` should be normalized.
				"vec3 blinn_phong(vec3 normal, vec3 view, vec3 color) {",
				"	vec3 halfLV = normalize(NORM_LIGHT + view);",
				"	float diffuse= max( dot(normal, halfLV), 0.0 );",
				"	float specular = pow(diffuse, 32.0 );",	/*specular exponent*/
					
				"#ifdef RIM_BLEEDING",
					// with rim lighting (diffuse light bleeding to the other side)
				"	diffuse = dot(normal, NORM_LIGHT);", // not worth the extra dot product? 
				"#endif",
				"	return color * (diffuse * 0.5 + 0.75) + specular * specularColor;",
				"}",

				// FAKE Ambient occlusion approximation. based on
				// http://www.iquilezles.org/www/material/nvscene2008/rwwtt.pdf
				// uses current distance estimate as first dist. the size of AO is independent from distance from eye
				"float ambient_occlusion(vec3 p, vec3 n, float DistAtp, float side) {",
				"	float ao_ed= DistAtp*AO_EPS/min_dist;",	// Dividing by min_dist makes the AO effect independent from changing min_dist
				"	float ao = 1.0, w = AO_STRENGTH/ao_ed;",
				"	float dist = 2.0 * ao_ed;",

				"	for (int i=0; i<5; i++) {",
				"		float D = side * d(p + n*dist);",
				"		ao -= (dist-D) * w;",
				"		w *= 0.5;",
				"		dist = dist*2.0 - ao_ed;",
				"	}",
				"	return clamp(ao, 0.0, 1.0);",
				"}",

				"float march(inout vec3 p, in vec3 dp, inout float D, inout float totalD, in float side, in float MINDIST_MULT){",
					// Intersect the view ray with the Mandelbox using raymarching.
					// The distance field actually marched is the "calculated DE" minus (totalD * min_dist)
					// A perfect distance field have a gradient magnitude = 1. Assuming d() gives a perfect DE, 
					// we have to multiply D with MINDIST_MULT in order to restore a gradient magnitude of 1
				"	int steps= 0;",
				"	for (int dummy=0; dummy<MAX_STEPS; dummy++) {",
				"		totalD+=D;",
				"		D = (side * d(p + totalD * dp) - totalD * min_dist) * MINDIST_MULT;",

				"		steps++;",	// mimick what any non stupid-WEBGL loop would allow to do in the loop condition
				
				"		if (!(abs(D)>max(totalD*8192.0*ULP,ULP) && totalD < MAX_DIST)) break;",			
				"	}",
				"	p += (totalD+D) * dp;",
				"	return float(steps);",
				"}",

				// original "noise()" impl used somewhat cheaper variant of IQ's procedural 2D noise: https://www.shadertoy.com/view/lsf3WH
				// - to reduce GPU load, respective impl has been replaced by a texture-lookup based one (see https://www.shadertoy.com/view/4sfGzS).
				"float noise3d( in vec3 x ) {",
				"    vec3 p = floor(x);",
				"    vec3 f = fract(x);",
				"	 f = f*f*(3.0-2.0*f);",
					
				"	vec2 uv = (p.xy+vec2(37.0,17.0)*p.z) + f.xy;",
				"	vec2 rg = texture2D( tNoise, (uv+0.5)/256.0, 0.0).yx;",
				"	return mix( rg.x, rg.y, f.z );",
				"}",

				"void main() {",
				"	vec3 dp = normalize(dir);",
				"	float noise =  noise3d(vec3(gl_FragCoord.x, gl_FragCoord.y, gl_FragCoord.z));",

				"	vec3 p = eye;",

				"	float totalD = 0.0, D = d(p);",
					
				"	float side = sign(D);",
				"	D = noise * abs(D);",
					
				"	float MINDIST_MULT=1.0/(1.0+min_dist);",
				"	D *= MINDIST_MULT;",

				"	vec3 finalcol= vec3(0.);",
				"	float refpart= 1.0;",

				"	bool cont= true;",
				"	float firstD= 0.;",  // save first step for depth buffer
						
				"	for(int i= 0; i<REFITER; i++){",
				"		float steps= march(p, dp, D, totalD, side, MINDIST_MULT);",
				"		if (i == 0) { firstD= totalD + D; }",
						
				"		vec3 col= backgroundColor;",

						// We've got a hit or we're not sure.
				"		if (totalD < MAX_DIST) {",
				"			float D1= min_dist*.5*totalD;",
				"			vec3 n= side * generateNormal(p, max(256.0*ULP, D1));",
				"			col= color(p);",
							
				"			col= blinn_phong(n, -dp, col);",			
				"			col= mix(aoColor, col, ambient_occlusion(p, n, D1, side));",

				"			dp= reflect(dp,n);",	// update the ray

				"			p-= (totalD+D) * dp;",		// without this there would be obvious reflection errors..
				"			D= (9. + noise) * D1;",

							// We've gone through all steps, but we haven't hit anything.
							// Mix in the background color.
				"			if (D > max(totalD*8192.0*ULP,ULP)){",
				"				float dc= clamp(log(D/min_dist) * dist_to_color, 0.0, 1.0);",
				"				col= mix(col, backgroundColor, dc);",
				"			}",
				"		} else {",
				"			cont= false;",
				"		}",

						// Glow is based on the number of steps.
				"		col= mix(col, glowColor, (float(steps)+noise)/float(MAX_STEPS) * glow_strength);",
				"		finalcol+= refpart*col;",
				"		refpart*= REFACTOR;",
				"		if (!cont) break;",
				"	}",			

				// create depth buffer info (as a base to merge in aditional polygon gfx..)
				"	float zNear= abs(speed);",
				"	float zFar= 65535.0 * zNear;",
				"	float a= zFar / (zFar - zNear);",
				"	float b= zFar * zNear / (zNear - zFar);",
				"	float l=  clamp(firstD/length(dir), zNear, zFar);",
				"	float depth= (a + b / l);",

				"	gl_FragDepthEXT= depth;",
				
				// note: no point for "god's effect" here.. origin would need to be constantly updated
				// or otherwise it just looks "wrong" when light is coming from a fixed screen pos..

				"	gl_FragData[1]= vec4(depth, 0.,0., 0.);", // used for postprocessing; unfortunately THREE.DepthTexture does not seem to work (without WEBGL2)
				"	gl_FragData[0]= vec4(finalcol, 1.0);",
				"}",
			].join( "\n" )
		};
		
		var mat= new THREE.ShaderMaterial( {
			uniforms:  THREE.UniformsUtils.clone( shader.uniforms ),
			vertexShader: shader.vertexShader,
			fragmentShader: shader.fragmentShader
		} );

		mat.uniforms.tNoise.value=  BOX2.getGlobalNoiseTexture();
		mat.uniforms.backgroundColor.value=  backgroundColor;
			
		return mat;
	}
	
};





