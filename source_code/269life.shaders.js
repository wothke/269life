/*
	My own THREE.js style, shader related building blocks.
		
	Note: "If the WEBGL_draw_buffers extension is enabled, but the fragment shader does not contain the 
	#extension GL_EXT_draw_buffers directive to enable it, then writes to gl_FragColor are only written 
	to COLOR_ATTACHMENT0_WEBGL, and not broadcast to all color attachments. In this scenario, other 
	color attachments are guaranteed to remain untouched." Unfortunately Firefox does not seem to
	do this correctly..
*/

DEMO = "DEMO" in window ? DEMO : {}


function getRenderTarget(width, height) {
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

	/*
	note: this does not seem to work in Chrome .. (and FF just draws
			horizontal lines..)
    target.depthTexture = new THREE.DepthTexture();
    target.depthTexture.type =  THREE.UnsignedShortType;	
	*/
	
	// Add an attachment for various post-processing infos	
	var a1= target.texture.clone();
//	a1.type = THREE.UnsignedByteType;	
// specs say: "attachments are all textures allocated with format RGBA and type UNSIGNED_BYTE"
// but Firefox turns belly up when UnsignedByteType is selected..	
	target.attachments.push( a1 );	// i.e. 2nd attachment
	
	// Name our G-Buffer attachments for debugging
	target.attachments[0].name = 'diffuse';
	
	// I would have preferred to use additional attachments 
	// but is seems that even one additional attachment does not work. 
	// maybe a flaw within THREE.js or maybe my browser is limited to a 
	// total of 4 (which  might be exceeeded with the copy made in 
	// MultiTargetEffectComposer) .. I have no intention of debugging that shit:
	
	// I am therefore using 1 extra attachment and am using the RBG channels 
	// to encode different information:
	
	// R:	set to 1 to trigger "glow" effect
	// G:	set to 1 as "non obstructed" areas to trigger "god's ray" effect
	// B:	copy of the z-buffer used for Dof effect
	
	target.attachments[1].name = 'scratchpad';
	return target;
}

/*
* Extended/patched version of THREE.EffectComposer (see official THREE.js examples)
*/
DEMO.MultiTargetEffectComposer = function(a, b) {
    if (this.renderer = a, void 0 === b) {
        var c = {
                minFilter: THREE.LinearFilter,
                magFilter: THREE.LinearFilter,
                format: THREE.RGBAFormat,
                stencilBuffer: !1
            },
        d = a.getSize();
        b = new THREE.WebGLRenderTarget(d.width, d.height, c)
    }
    this.renderTarget1 = b, this.renderTarget2 = this.cloneMultiTarget(b);
	this.writeBuffer = this.renderTarget1, 
	this.readBuffer = this.renderTarget2, 
	this.passes = [], void 0 === THREE.CopyShader && console.error("DEMO.MultiTargetEffectComposer relies on THREE.CopyShader"), 
	this.copyPass = new THREE.ShaderPass(THREE.CopyShader);
};
 
Object.assign(DEMO.MultiTargetEffectComposer.prototype, {
	// utility
	swapTarget: function(pass) {
		// intermediate render pass - no framebuffer output
		pass.needsSwap = true;
		pass.renderToScreen = false;
		pass.clear = false;	
		pass.clearDepth = false;
		
		return pass;
	},
	// utility
	sameTarget: function(pass) {
		// intermediate render pass - no framebuffer output
		pass.renderToScreen = false;
		pass.needsSwap = false;	// e.g. partially overwrite output of mandelPass
		pass.clearDepth = false;
		pass.clear = false;	// important keep previous (e.g. mandelpass) result
		
		return pass;
	},
	
	cloneMultiTarget: function(src) {
		var dest= src.clone();
		
		/*
		dest.depthTexture = new THREE.DepthTexture();
		dest.depthTexture.type =  THREE.UnsignedShortType;
		*/
		
		if ((src.attachments !== null) && (src.attachments.length > 0)) {
			// HACK: used to handle special case with 1 extra attachments
			dest.attachments= [dest.texture];

			var a1= dest.texture.clone();
		//	a1.type = THREE.UnsignedByteType;	// see specs: "attachments are all textures allocated with format RGBA and type UNSIGNED_BYTE"				
			dest.attachments.push(a1);	// i.e. 2nd attachment			
		}
		return dest;
	},
    swapBuffers: function() {
        var a = this.readBuffer;
        this.readBuffer = this.writeBuffer, this.writeBuffer = a
    },
    addPass: function(a) {
        this.passes.push(a);
        var b = this.renderer.getSize();
        a.setSize(b.width, b.height)
    },
    insertPass: function(a, b) {
        this.passes.splice(b, 0, a)
    },
    render: function(a) {
        var b, c, d = !1,
            e = this.passes.length;
        for (c = 0; c < e; c++)
            if (b = this.passes[c], b.enabled !== !1) {
				if ("preProcess" in b) {
					b.preProcess(this.readBuffer);
				}
                if (b.render(this.renderer, this.writeBuffer, this.readBuffer, a, d), b.needsSwap) {
					
                    if (d) {
                        var f = this.renderer.context;
                        f.stencilFunc(f.NOTEQUAL, 1, 4294967295), 
						this.copyPass.render(this.renderer, this.writeBuffer, this.readBuffer, a), 
						f.stencilFunc(f.EQUAL, 1, 4294967295)
                    }
					
					this.swapBuffers()
                }
                void 0 !== THREE.MaskPass && (b instanceof THREE.MaskPass ? d = !0 : b instanceof THREE.ClearMaskPass && (d = !1))
            }
    },
    reset: function(a) {
        if (void 0 === a) {
            var b = this.renderer.getSize();
            a = this.cloneMultiTarget(this.renderTarget1);
			a.setSize(b.width, b.height)
        }
        this.renderTarget1.dispose(), this.renderTarget2.dispose(), this.renderTarget1 = a, this.renderTarget2 = this.cloneMultiTarget(a);
		this.writeBuffer = this.renderTarget1, this.readBuffer = this.renderTarget2
    },
    setSize: function(a, b) {
        this.renderTarget1.setSize(a, b), this.renderTarget2.setSize(a, b);
        for (var c = 0; c < this.passes.length; c++) this.passes[c].setSize(a, b)
    }
});


/*
 Shader creates a noise based texture used to create "northlights" on the horizon.
*/
DEMO.NorthlightShader = {
	uniforms: {
		background: { type: "v3", value: new THREE.Vector3() },
		baseColor: { type: "v3", value: new THREE.Vector3() },
		size: { type: "v2", value: new THREE.Vector2() },
		time: { type: "f", value: 0 },
		tNoise : { type: "t", value: null },
	},

	vertexShader: [
		"#ifdef GL_ES",
		"precision highp float;",
		"#endif",
		"void main()	{",
		"  gl_Position = vec4(position, 0.);",
		"}"

	].join( "\n" ),
	fragmentShader: [
		"#ifdef GL_ES",
		"precision highp float;",
		"#endif",
		"uniform vec3 background;",
		"uniform vec3 baseColor;",
		"uniform vec2 size;",
		"uniform float time;",
		"uniform sampler2D tNoise;",
		
		"#define PI_H 1.570796",
		"#define SCALE PI_H*.001",

		//iq's ubiquitous 3d noise
		"float noise(in vec3 p)",
		"{",
		"	vec3 ip = floor(p);",
		"    vec3 f = fract(p);",
		"	f = f*f*(3.0-2.0*f);",
			
		"	vec2 uv = (ip.xy+vec2(37.0,17.0)*ip.z) + f.xy;",
		"	vec2 rg = texture2D( tNoise, (uv+ 0.5)/256.0, -16.0 ).yx;",
		"	return mix(rg.x, rg.y, f.z);",
		"}",

		"float northlight(vec2 d) {",
		"    float s= 17.;",
		"    vec3  p = vec3(d.x*s, d.y*s, SCALE*time );",

		"    float f = 0.;",
		"    f +=       abs(noise(p));", 
    
		"    p =1.3 * p;",
		"    f += 0.75 * abs(noise(p));",		// add some more detail
    
		"    return f*.08954;",
		"}",

		"vec2 distort(vec2 uv, float s) {",
		"    vec2 p= uv/s;",
    
		"    float f= cos(p.x);",
		"    p.y= -sin(p.y)*p.x;",
		"    p.x= f;",
		"    return p;",
		"}",
		
		"void main()",
		"{",		
		"	 vec2 p = distort(gl_FragCoord.xy, size.x);",
    
		"    float o =  northlight(p);",
    
			// colorize
		"    vec3 col = baseColor;",
//		"    vec3 col = vec3(140., 40., 255.) / 255.;",
		"    float a= 1. - 16.*o;",
		"    col += a;",
    
		"    float alpha = min(1., o*20.);",
		"    col= mix(col, background, min(1., o*4.));",
    
			// fade top/bottom to avoid hard contrast to existing landscape
		"	float h= size.y/2.;",
		"	alpha*= 1.-sin(abs(gl_FragCoord.y-h)/h*PI_H);",
	
		"    gl_FragColor = vec4(col, alpha);",
		"}"
	].join( "\n" ),	
};

DEMO.NorthlightPass = function ( ) {
	THREE.Pass.call( this );

	if ( DEMO.NorthlightShader === undefined )
		console.error( "DEMO.NorthlightPass relies on DEMO.NorthlightShader" );

	var shader = DEMO.NorthlightShader;

	this.uniforms = THREE.UniformsUtils.clone( shader.uniforms );

	this.material = new THREE.ShaderMaterial( {
		uniforms: this.uniforms,
		vertexShader: shader.vertexShader,
		fragmentShader: shader.fragmentShader

	} );	

	this.camera = new THREE.OrthographicCamera( - 1, 1, 1, - 1, 0, 1 );
	this.scene  = new THREE.Scene();

	this.quad = new THREE.Mesh( new THREE.PlaneBufferGeometry( 2, 2 ), null );
	this.quad.frustumCulled = false; // Avoid getting clipped
	this.scene.add( this.quad );
};

DEMO.NorthlightPass.prototype = Object.assign( Object.create( THREE.Pass.prototype ), {

	constructor: DEMO.NorthlightPass,

	render: function ( renderer, writeBuffer, readBuffer, delta, maskActive ) {	
		this.quad.material = this.material;

		if ( this.renderToScreen ) {
			renderer.render( this.scene, this.camera );
		} else {
			renderer.render( this.scene, this.camera, writeBuffer, this.clear );
		}
	}
} );




/* 
* This simple "1st pass" shader is used as a Material that (also) leaves a marker within an additional 
* postprocessing texture - which is later used to render a postprocessing based effect
*/
DEMO.AttachmentShader =  {
	uniforms: {
		color: {type: 'fv', value: [1.0,1.0,1.0]},
		opacity:  {type: 'f', value: 1.0},
		channel:  {type: 'i', value: 1}
	},
	vertexShader: [
		"#extension GL_EXT_draw_buffers : require",

		"uniform vec3 color;",
		"uniform float opacity;",
		"uniform int channel;",
		"varying vec2 vUv;",
		"void main() {",
		"    vUv = uv;",
		"    gl_Position = projectionMatrix *",
		"                  modelViewMatrix * vec4(position, 1.0 );",
		"}"
	].join( "\n" ),

	fragmentShader: [
		"#extension GL_EXT_draw_buffers : require",
		
		"precision highp float;",
		"varying vec2 vUv;",
		"uniform vec3 color;",
		"uniform float opacity;",
		"uniform int channel;",

		"void main(void) {",
		"    gl_FragData[0] = vec4(color, opacity);",	
		
			// channel bit 0=red (channel used for glow), bit 1=green (used for rays)
		"    float r= (channel == 1) ? 1. : 0.;",
		"    float g= (channel == 2) ? 1. : 0.;",
		"    if(channel == 3) {r=1.; g=1.;}",
			
		"    gl_FragData[1] = vec4(r,g,0.,1.);",

		"}",
	].join( "\n" ),
	
	getUniforms: function(color, opacity, channel) {
		var u= THREE.UniformsUtils.clone( DEMO.AttachmentShader.uniforms );
		
		u.color= {type: 'fv', value: [(color>>16)/0xff, ((color>>8)&0xff)/0xff, (color&0xff)/0xff]};
		u.opacity=  {type: 'f', value: opacity};
		u.channel=  {type: 'i', value: channel};
		return u;		
	}
}

/*
* This simple 2nd pass shader uses the marker left by the above DEMO.AttachmentShader 
* to add a glow effect to the tDiffuse texture.
*/
DEMO.GlowShader = {
	uniforms: {
		"tDiffuse":   { value: null },
		"tScratchpad":   { value: null },

		"uStepWidth" :  { type: "f", value: 0.001 }, 		
		"uGlowFactor" :  { type: "f", value: 0.0141 },
	},

	vertexShader: [
		"#extension GL_EXT_draw_buffers : require",
		"#extension GL_EXT_frag_depth : enable",
		"precision mediump float;",
		"varying vec2 vUv;",

		"void main() {",
			"vUv = uv;",
			"gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );",
		"}"
	].join( "\n" ),

	fragmentShader: [
		"#extension GL_EXT_draw_buffers : require",
		"#extension GL_EXT_frag_depth : enable",
		"precision mediump float;",

		"uniform sampler2D tDiffuse;",
		"uniform sampler2D tScratchpad;",
		
		"uniform float uStepWidth;",	
		"uniform float uGlowFactor;",
		
		"#define SAMPLE_STEPS 3", 				// means x steps in each direction	
		"#define SAMPLE_SIZE 2*SAMPLE_STEPS+1",
		
		// no point in being too sophisticated here.. after all its just pixel based 
		// postprocessing, e.g. may not work well if stuff is zoomed
		"varying vec2 vUv;",
		
		"void main()",
		"{",
		"	vec4 c= texture2D(tDiffuse, vUv.xy );",			
		"	vec4 d= texture2D(tScratchpad, vUv.xy );",

		"	float result= 0.;",
		"	float maxDist= distance(float(SAMPLE_STEPS),float(SAMPLE_STEPS));",
		"	float startx = vUv.x - float(SAMPLE_STEPS) * uStepWidth;",
		"	float starty = vUv.y - float(SAMPLE_STEPS) * uStepWidth;",

		"	for(int i= 0; i< SAMPLE_SIZE; i++) {",
		"		for(int j= 0; j< SAMPLE_SIZE;j++) {",
					// check if there is light
					// note: Firefox is too dumb to use the correct tScratchpad here and for some reason it 
					// uses the regular texture.. therefor check for 1. to avoid that everything glows in FF
		"			if (texture2D(tScratchpad, vec2(startx+float(i)*uStepWidth,starty+float(j)*uStepWidth)).r == 1.) {",
		"				float w= distance(abs(float(i-SAMPLE_STEPS)), abs(float(j-SAMPLE_STEPS)));",
		"				w=1.-((maxDist/w));",
		"				result+= w;",
		"			}",
		"		}",
		"	}",
		"	result*= uGlowFactor;",
		"	result= abs(result);",
		
		"	gl_FragData[0] = vec4(min(1., c.x+result), min(1., c.y+result), min(1., c.z+result), 1.);",	
		"	gl_FragData[1] = d;",	// copy attachment so it will still be available in next pass... 	
		"}"
	].join( "\n" )
};

DEMO.GlowPass = function ( ) {
	THREE.Pass.call( this );

	if ( DEMO.GlowShader === undefined )
		console.error( "DEMO.GlowPass relies on DEMO.GlowShader" );

	var shader = DEMO.GlowShader;

	this.uniforms = THREE.UniformsUtils.clone( shader.uniforms );

	this.material = new THREE.ShaderMaterial( {
		uniforms: this.uniforms,
		vertexShader: shader.vertexShader,
		fragmentShader: shader.fragmentShader

	} );	

	this.camera = new THREE.OrthographicCamera( - 1, 1, 1, - 1, 0, 1 );
	this.scene  = new THREE.Scene();

	this.quad = new THREE.Mesh( new THREE.PlaneBufferGeometry( 2, 2 ), null );
	this.quad.frustumCulled = false; // Avoid getting clipped
	this.scene.add( this.quad );
};

DEMO.GlowPass.prototype = Object.assign( Object.create( THREE.Pass.prototype ), {

	constructor: DEMO.GlowPass,

	render: function ( renderer, writeBuffer, readBuffer, delta, maskActive ) {
		// used after "swap", i.e. result from previous pass is in readBuffer and 
		// explicitly fed into this pass via the below uniforms..		
		this.uniforms[ "tDiffuse" ].value = readBuffer.texture;
		this.uniforms[ "tScratchpad" ].value = readBuffer.attachments[1];

		
		this.quad.material = this.material;

		if ( this.renderToScreen ) {
			renderer.render( this.scene, this.camera );
		} else {
			renderer.render( this.scene, this.camera, writeBuffer, this.clear );
		}
	},
	reconfigure: function(stepWidth, glowFactor) {
		this.uniforms[ "uStepWidth" ].value = stepWidth;
		this.uniforms[ "uGlowFactor" ].value = glowFactor;
		
	}
} );

/*
* This simple "god's ray" shader that uses a tScratchpad for 'occluded areas'.
*/
DEMO.RaysShader = {
	uniforms: {
		"tDiffuse":   { value: null },
		"tScratchpad":   { value: null },
		"exposure":       { value: 1.0 },
		"decay": { value: 0.1 },
		"density": { value: 0.05 },
		"weight":     { value: 0.8 },
		"lightPositionOnScreen": { type: "v2", value: new THREE.Vector2(700,100) },
	},

	vertexShader: [
		"precision mediump float;",
		"varying vec2 vUv;",

		"void main() {",
			"vUv = uv;",
			"gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );",
		"}"
	].join( "\n" ),

	fragmentShader: [
		"precision mediump float;",

		"uniform sampler2D tDiffuse;",
		"uniform sampler2D tScratchpad;",

		"uniform float exposure;",
		"uniform float decay;",
		"uniform float density;",
		"uniform float weight;",
		"uniform vec2 lightPositionOnScreen;",
		
		"const int NUM_SAMPLES = 100;",

		"varying vec2 vUv;",

		"void main()",
		"{",
		
			"vec2 xy = vUv;",
			"vec2 deltaXy = vec2( xy - lightPositionOnScreen.xy );",

			"vec4 c= texture2D(tDiffuse, xy );",		// copy pixel from texture
			
	//		"if(length(deltaXy)< 0.01) {c.z= 1.; c.x= 1.; }",	    // highlight position of "god's ray" source
			
			"deltaXy *= 1. /  (float(NUM_SAMPLES) * density);",
			"float lumDecay = 1.;",
			
			"for(int i=0; i < NUM_SAMPLES ; i++) {",
			"	 xy -= deltaXy;",
			"	 float t = texture2D(tScratchpad, xy ).y;",	// SET GREEN channel used for non-obstructed areas
			
			"	 if (t == 1.) {",
			"	 	c += vec4(1.,1.,1.,0.) * (lumDecay * weight);",
			"	 }",
			
			"	 lumDecay *= decay;",
			"}",
		//	"c = texture2D(tScratchpad, vUv );",	// debug input
			"gl_FragColor = c*exposure;",	
		"}"
	].join( "\n" )
};

DEMO.RaysPass = function (lightPositionOnScreen, weight, density, decay, exposure ) {
	THREE.Pass.call( this );

	if ( DEMO.RaysShader === undefined )
		console.error( "DEMO.RaysPass relies on DEMO.RaysShader" );

	var shader = DEMO.RaysShader;

	this.uniforms = THREE.UniformsUtils.clone( shader.uniforms );

	this.material = new THREE.ShaderMaterial( {
		uniforms: this.uniforms,
		vertexShader: shader.vertexShader,
		fragmentShader: shader.fragmentShader

	} );	
	if ( lightPositionOnScreen !== undefined ) this.uniforms.lightPositionOnScreen.value = lightPositionOnScreen;
	if ( weight !== undefined ) this.uniforms.weight.value = weight;
	if ( density !== undefined ) this.uniforms.density.value = density;
	if ( decay !== undefined ) this.uniforms.decay.value = decay;
	if ( exposure !== undefined )	this.uniforms.exposure.value = exposure;

	this.camera = new THREE.OrthographicCamera( - 1, 1, 1, - 1, 0, 1 );
	this.scene  = new THREE.Scene();

	this.quad = new THREE.Mesh( new THREE.PlaneBufferGeometry( 2, 2 ), null );
	this.quad.frustumCulled = false; // Avoid getting clipped
	this.scene.add( this.quad );
};

DEMO.RaysPass.prototype = Object.assign( Object.create( THREE.Pass.prototype ), {

	constructor: DEMO.RaysPass,

	render: function ( renderer, writeBuffer, readBuffer, delta, maskActive ) {
		this.uniforms[ "tDiffuse" ].value = readBuffer.texture;	// do not directly access attachment idx to avoid double buffering clash
		this.uniforms[ "tScratchpad" ].value = readBuffer.attachments[1];

		
		this.quad.material = this.material;

		if ( this.renderToScreen ) {
			renderer.render( this.scene, this.camera );
		} else {
			renderer.render( this.scene, this.camera, writeBuffer, this.clear );
		}
	}
} );


/*
* "Depth of field" / Bokeh shader adapted from https://www.shadertoy.com/view/4d2Xzw
* note: tDepth r,g & b all contain the same grayscale value..
*/
DEMO.BokehShader = {
	uniforms: {
		"tDiffuse":   { value: null },
		"tSampler":   { value: null },		
		"tDepth":   { value: null },		
		"size": { type: "v2", value: null },
	},

	vertexShader: [
		"#extension GL_EXT_draw_buffers : require",
		"precision mediump float;",
		"varying vec2 vUv;",

		"void main() {",
			"vUv = uv;",
			"gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );",
		"}"
	].join( "\n" ),

	fragmentShader: [
		"#extension GL_EXT_draw_buffers : require",
		"precision mediump float;",

		"uniform sampler2D tDiffuse;",
		"uniform sampler2D tSampler;",
		"uniform sampler2D tDepth;",
		"uniform vec2 size;",

		"varying vec2 vUv;",

		// The Golden Angle is (3.-sqrt(5.0))*PI radians, which doesn't precompiled for some reason.
		// The compiler is a dunce I tells-ya!!
		"#define GOLDEN_ANGLE 2.39996323",

	//	"#define USE_MIPMAP ",
		"#define ITERATIONS 10",
		"#define D 0.04",			// distance from center for 4x ref

		"mat2 rot = mat2(cos(GOLDEN_ANGLE), sin(GOLDEN_ANGLE), -sin(GOLDEN_ANGLE), cos(GOLDEN_ANGLE));",

		"vec3 Bokeh(sampler2D tex, vec2 uv, float radius, float amount)",
		"{",
		"	vec3 acc = vec3(0.0);",
		"	vec3 div = vec3(0.0);",
		"    vec2 pixel = 1.0 / size.xy;",
		"    float r = 1.0;",
		"    vec2 vangle = vec2(0.0,radius);", // Start angle
		"    amount += radius*100.0;",
    
		"	for (int j = 0; j < ITERATIONS; j++)",
		"    {  ",
		"       r += 1. / r;",
		"	    vangle = rot * vangle;",
				// (r-1.0) here is the equivalent to sqrt(0, 1, 2, 3...)
		"       #ifdef USE_MIPMAP",
		"		vec3 col = texture2D(tex, uv + pixel * (r-1.) * vangle, radius).xyz;",
		"       #else",
		"       vec3 col = texture2D(tex, uv + pixel * (r-1.) * vangle).xyz;",
		"       #endif",
		"		vec3 bokeh = pow(col, vec3(9.0)) * amount+.4;",
		"		acc += col * bokeh;",
		"		div += bokeh;",
		"	}",
		"	return acc / div;",
		"}",
		"void main()",
		"{",
			// avoid refocusing on every hole in the ground..
		
		"	float depth =texture2D(tDepth,vUv).r;",		// average out to reduce sudden jumps
		
			// note: interestingly it makes no noticable difference if 1 or 40 
			// points are sampled here.. from a performance point of view there 
			// seems to be no benefit in using the 1x1 texture with the pre-calculated value
		"	float d0 = 	texture2D(tSampler,vec2(.5,.5)).r;",
		"	depth = ((d0 == 0.) || (depth == 0.)) ? 1.0 : abs(.5* log(depth/d0))*100.;",
		
		"	gl_FragData[0] = vec4(Bokeh(tDiffuse, vUv, depth, 20.), 1.0);",
	
		"}"
	].join( "\n" )
};

DEMO.DofPass = function ( ) {
	THREE.Pass.call( this );

	if ( DEMO.BokehShader === undefined )
		console.error( "DEMO.DofPass relies on DEMO.BokehShader" );

	var shader = DEMO.BokehShader;

	this.uniforms = THREE.UniformsUtils.clone( shader.uniforms );

	this.material = new THREE.ShaderMaterial( {
		uniforms: this.uniforms,
		vertexShader: shader.vertexShader,
		fragmentShader: shader.fragmentShader

	} );
	this.camera = new THREE.OrthographicCamera( - 1, 1, 1, - 1, 0, 1 );
	this.scene  = new THREE.Scene();

	this.quad = new THREE.Mesh( new THREE.PlaneBufferGeometry( 2, 2 ), null );
	this.quad.frustumCulled = false; // Avoid getting clipped
	this.scene.add( this.quad );
	
	// used for 2-phase processing..
	this.samplerTarget= this._createDofSamplerRenderTarget(1,1);
	this.uniforms.tSampler.value= this.samplerTarget.texture;
};

DEMO.DofPass.prototype = Object.assign( Object.create( THREE.Pass.prototype ), {

	constructor: DEMO.DofPass,

	render: function ( renderer, writeBuffer, readBuffer, delta, maskActive ) {
		this.uniforms[ "tDiffuse" ].value = readBuffer.texture;	// do not directly access attachment idx to avoid double buffering clash
		this.uniforms[ "tDepth" ].value = readBuffer.attachments[1];
		this.uniforms[ "size" ].value = new THREE.Vector2(readBuffer.width, readBuffer.height);
		
		this.quad.material = this.material;

		if ( this.renderToScreen ) {
			renderer.render( this.scene, this.camera );
		} else {
			renderer.render( this.scene, this.camera, writeBuffer, this.clear );
		}
	},
	getSamplerTarget: function() {
		return this.samplerTarget;
	},	
	_createDofSamplerRenderTarget: function(width, height) {
		var target = new THREE.WebGLRenderTarget( width, height );
		var texture= target.texture;
		
		texture.name= "dof sampler";
		texture.format = THREE.RGBAFormat;
		texture.minFilter = THREE.LinearFilter;
		texture.magFilter = THREE.LinearFilter;
		texture.type = THREE.FloatType;
		texture.generateMipmaps = false;
		
		// THREE.RepeatWrapping, THREE.ClampToEdgeWrapping, THREE.MirroredRepeatWrapping
		texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
		
		texture.repeat.set(1, 1);
		
		target.stencilBuffer = false;
		target.depthBuffer = false;
		
		return target;
	},
} );

/*
* Preparation step for BokehShader.
*
* finding: irrelevant optimization attempt..
*/
DEMO.DofSamplerShader = {
	uniforms: {
		"tDepth":   { value: null },
	},

	vertexShader: [
		"precision highp float;",
		"varying vec2 vUv;",

		"void main() {",
			"vUv = uv;",
			"gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );",
		"}"
	].join( "\n" ),

	fragmentShader: [
		"precision highp float;",

		"uniform sampler2D tDepth;",

		"varying vec2 vUv;",
		"#define STEPS 10",
		"#define D 0.01",
		
		"void main()",
		"{",
			// focus on the center area and use "average depth" as a reference
		"	float s= .5 - float(STEPS)*D*.5;",	
			
		"	float d0= 0.;",
		"	float y= s;",
		"	for (int i= 0; i<STEPS; i++) {",
		"		float x= s;",
		"		for (int j= 0; j<STEPS; j++) {",
		"			d0+= texture2D(tDepth,vec2(x,y)).r;",
		"			x+= D;",
		"		}",
		"		y+= D;",			
		"	}",
		"	d0= d0/float(STEPS*STEPS);",
		
		"	gl_FragColor = vec4(d0,d0,d0,d0);",
	
		"}"
	].join( "\n" )
};

DEMO.DofSamplerPass = function ( ) {
	THREE.Pass.call( this );

	if ( DEMO.DofSamplerShader === undefined )
		console.error( "DEMO.DofSamplerPass relies on DEMO.DofSamplerShader" );

	var shader = DEMO.DofSamplerShader;

	this.uniforms = THREE.UniformsUtils.clone( shader.uniforms );

	this.material = new THREE.ShaderMaterial( {
		uniforms: this.uniforms,
		vertexShader: shader.vertexShader,
		fragmentShader: shader.fragmentShader

	} );
	this.camera = new THREE.OrthographicCamera( - 1, 1, 1, - 1, 0, 1 );
	this.scene  = new THREE.Scene();

	this.quad = new THREE.Mesh( new THREE.PlaneBufferGeometry( 2, 2 ), null );
	this.quad.frustumCulled = false; // Avoid getting clipped
	this.scene.add( this.quad );
};

DEMO.DofSamplerPass.prototype = Object.assign( Object.create( THREE.Pass.prototype ), {

	constructor: DEMO.DofSamplerPass,

	render: function ( renderer, writeBuffer, readBuffer, delta, maskActive ) {
		this.uniforms[ "tDepth" ].value = readBuffer.attachments[1];
		
		this.quad.material = this.material;

		if ( this.renderToScreen ) {
			renderer.render( this.scene, this.camera );
		} else {
			renderer.render( this.scene, this.camera, writeBuffer, this.clear );
		}
	}
} );


/*
* Used to just overlay some unrelated stuff (like text) over the fractal scene..
*/
DEMO.OverlaySceneHolder = function(w, h) {
	this._scene = new THREE.Scene();
	var light = new THREE.AmbientLight(0x2f2f2f);
	this._scene.add(light);
	var light2 =  new THREE.DirectionalLight( 0x404040, 1.4 );
	light2.position = new THREE.Vector3(0,-1,0);		
	this._scene.add(light2);
	
	this._camera = new THREE.PerspectiveCamera(70, w / h, 1, 3000);	// fov,aspect,near,far
	this._camera.position.set(0, 5.5, 17);
//	this._camera.lookAt(this._scene.position);	// just look straight ahead and avoid any perspective distortion
	
};
DEMO.OverlaySceneHolder.prototype = {
	resetScreenSize: function(w, h) {
	//	this._camera.aspect= w/h;	// bad idea.. messes up overlay position
	},
	getRenderPass: function() {
		return new THREE.RenderPass( this._scene, this._camera );
	},
	getCamera: function() {
		return this._camera;
	},
	getScene: function() {
		return this._scene;
	},
	
	// ------------------  internals only to be used within this object ------------------//
	
	setAllInvisible: function() {
		var objs= this._scene.children;
		for(var i= 0; i<objs.length; i++) {
			var o= objs[i];
			if (!("intensity" in o)) o.visible= false;	// exclude lights
		}
	},
};

/*
* Slightly extended version of standard THREE.js example code.
*/
DEMO.FilmShader = {
    uniforms: {
        tDiffuse: {
            value: null
        },
        time: {
            value: 0
        },
        nIntensity: {
            value: .5
        },
        sIntensity: {
            value: .05
        },
        sCount: {
            value: 4096
        },
        grayscale: {
            value: 1
        },
        fadeOut: {
            value: 1
        }
    },
    vertexShader: ["varying vec2 vUv;", "void main() {", "vUv = uv;", "gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );", "}"].join("\n"),
    fragmentShader: [
		"uniform float time;", 
		"uniform bool grayscale;", 
		"uniform float nIntensity;", 
		"uniform float sIntensity;", 
		"uniform float sCount;", 
		"uniform float fadeOut;", 
		"uniform sampler2D tDiffuse;", 
		"varying vec2 vUv;", 
		"float rand(vec2 co){", 
		"    return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);", 
		"}", 
		"void main() {", "vec4 cTextureScreen = texture2D( tDiffuse, vUv );", 
		"	float dx = rand( vUv + time );", 
		"	vec3 cResult = cTextureScreen.rgb + cTextureScreen.rgb * clamp( 0.1 + dx, 0.0, 1.0 );", 
		"	vec2 sc = vec2( sin( vUv.y * sCount ), cos( vUv.y * sCount ) );", 
		"	cResult += cTextureScreen.rgb * vec3( sc.x, sc.y, sc.x ) * sIntensity;", 
		"	cResult = cTextureScreen.rgb + clamp( nIntensity, 0.0,1.0 ) * ( cResult - cTextureScreen.rgb );", 
		"	if( grayscale ) {", 
		"		cResult = vec3( cResult.r * 0.3 + cResult.g * 0.59 + cResult.b * 0.11 );", 
		"	}", 
		"	cResult = mix(cResult, vec3(0.,0.,0.), fadeOut);",
		"	gl_FragColor =  vec4( cResult, cTextureScreen.a );", 
		"}"].join("\n")
};
DEMO.FilmPass = function(a, b, c, d) {
    THREE.Pass.call(this), void 0 === DEMO.FilmShader && console.error("DEMO.FilmPass relies on DEMO.FilmShader");
    var e = DEMO.FilmShader;
    this.uniforms = THREE.UniformsUtils.clone(e.uniforms), this.material = new THREE.ShaderMaterial({
        uniforms: this.uniforms,
        vertexShader: e.vertexShader,
        fragmentShader: e.fragmentShader
    }), void 0 !== d && (this.uniforms.grayscale.value = d), void 0 !== a && (this.uniforms.nIntensity.value = a), void 0 !== b && (this.uniforms.sIntensity.value = b), void 0 !== c && (this.uniforms.sCount.value = c), this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), this.scene = new THREE.Scene, this.quad = new THREE.Mesh(new THREE.PlaneBufferGeometry(2, 2), null), this.quad.frustumCulled = !1, this.scene.add(this.quad)
};

DEMO.FilmPass.prototype = Object.assign(Object.create(THREE.Pass.prototype), {
    constructor: DEMO.FilmPass,
    render: function(a, b, c, d, e) {
        this.uniforms.tDiffuse.value = c.texture, this.uniforms.time.value += d, this.quad.material = this.material, this.renderToScreen ? a.render(this.scene, this.camera) : a.render(this.scene, this.camera, b, this.clear)
    }
});