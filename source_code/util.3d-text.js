/*
* Text related utilities for using THREE.js.
*
* Copyright (C) 2017 Juergen Wothke
*
* Terms of Use: This software is licensed under a CC BY-NC-SA 
* (http://creativecommons.org/licenses/by-nc-sa/4.0/).
*/
UTIL = "UTIL" in window ? UTIL : {}


/*
* Utility used to create simple 2D text-screens using THREE.js.
*
* The used geometry is extremely simple/cheap (2 triangles per char) and
* the included shaders can be used to apply effects on the text.
*
* (copy/paste reuse of some old text functionality from my very first THREE.js 
* page.. so far only TextWobblerShader has used/configured.. and "animate()"
* still needs to be fixed..)
*/
UTIL.Text = function (textpages, scene, cfg) {
	// note: fontSize & yOffset must be fine tuned for the used font
	
	this.selectedId= 0;
//	this.fontSize = 16;
	this.fontSize = 22;
	this.charWidths = [];
	this.charLeadingSpaces = [];
	this.cfg= cfg;

//	this.yOffset = -0.25;	// space reserved for "descenders" (i.e. parts below the baseline)
	this.yOffset = -0.3;	// space reserved for "descenders" (i.e. parts below the baseline)
	
	this.TEXTPAGES= textpages;
	
	this.startFrame= -1;	// must be set when effect is started..
	
	
	this.charTexture= this._getCharsetTexture();
	var pageGeometries = this._createTextPageGeometries(this.charTexture.width, 0);		
	this.pageContainerMesh= this._createPageContainer(pageGeometries, this.charTexture);
	
    scene.add(this.pageContainerMesh);
};

UTIL.Text.prototype = {
	resetScreenSize: function(w, h) {
		this.cfg.width= w;
		this.cfg.height= h;		
	},
	setPosition: function(x, y, z) {
		this.pageContainerMesh.position.x= x;
		this.pageContainerMesh.position.y= y;	
		this.pageContainerMesh.position.z= z;
	},
	replaceShader: function(mesh, newShaderId) {
		var shaders = [
			UTIL.TextWobblerShader,
			UTIL.TextSideRollShader,
			UTIL.TextExplodeShader
		];

		var oldMaterial= mesh.material;
		var newMaterial = new THREE.ShaderMaterial(shaders[newShaderId]);

		newMaterial.attributes = oldMaterial.attributes;
		
		newMaterial.uniforms= oldMaterial.uniforms;
//		newMaterial.uniforms.size.value= oldMaterial.uniforms.size.value;
//		newMaterial.uniforms.map.texture= oldMaterial.uniforms.map.texture;
		newMaterial.depthTest = oldMaterial.depthTest
		newMaterial.transparent = oldMaterial.transparent;

		mesh.material= newMaterial;
	},	
	configureTextPage: function(startFrame, pageId, x, y, effectId) {
		effectId= (typeof effectId != 'undefined') ? effectId : 0;
		
		this.startFrame= startFrame;
	
		var o = new THREE.Object3D();
		var i;
		for (i= 0; i<this.pageContainerMesh.children.length; i++) {
			var mesh= this.pageContainerMesh.children[i];
			mesh.visible= (i == pageId);
		}
		this.selectedId= pageId;
		
		var textMesh= this.pageContainerMesh.children[pageId];
		if (textMesh != null) {
			this.cfg.posX= x;
			this.cfg.posY= y;
			
			this.replaceShader(textMesh, effectId);		
		}
	},
	_getCharsetTexture: function() {
		//horizontal strip with all chars
		var charCanvas = document.createElement('canvas');
		charCanvas.width = this.fontSize * 256 /*only use 256 chars*/;	
		charCanvas.height = this.fontSize; 
		
		var ctx = charCanvas.getContext('2d');

//		ctx.font = 'bold 13pt Calibri';
		ctx.font = 'bold 13pt "Mountains of Christmas"';
//		ctx.font = "bold 13pt 'Mountains of Christmas'";

		
		ctx.fillStyle = "white";
		
		ctx.strokeStyle = '#010111';	// add thin dark outline for use on bright background
		ctx.lineWidth = 0.5;

		// draw all chars into quandatic textures.. (as base for fragment shader rotations.. )
		for (var x = 0; x < 256; x++) {
			var ch = String.fromCharCode(x);
			
			var metrics = ctx.measureText(ch);
			
			var width = metrics.width;		
			this.charWidths.push(width);

			var charLeadingSpace= Math.floor((this.fontSize-width)/2);
			this.charLeadingSpaces.push(charLeadingSpace);
			
			// hack: for some reason "stroke" actually "fills" for 'Mountains of Christmas'
			ctx.strokeText(ch, x*this.fontSize + charLeadingSpace, this.yOffset*this.fontSize+this.fontSize);	// center char within texture..
			ctx.fillText(ch, x*this.fontSize + charLeadingSpace, this.yOffset*this.fontSize+this.fontSize);	// center char within texture..
		}
		
		var tex = new THREE.Texture(charCanvas);			/* texture with all chars..*/
		tex.width= charCanvas.width;
		tex.height= charCanvas.height;
		tex.needsUpdate = true;
		tex.flipY = false;	// needed for correct text orientation
		return tex;
	},
	_createTextPageGeometries: function(charsetTextureWidth, p) {
		// p: 0: nice distortion for wobble-zoom, -0.1 nice overlap, 1: flipped..)

		var geometries= [];
		var i;
		for (i= 0; i<this.TEXTPAGES.length; i++)
			geometries.push(this._createPageGeometry(this.TEXTPAGES[i], charsetTextureWidth, p));
		return geometries;
	},
	_createPageGeometry: function(txt, charsetTextureWidth, p) {
		// create one page of text..
		var geo = new THREE.Geometry();
	
		// the bloody idiots removed the custom "attributes" handling
		// for standard "Geometry": try workaround using BufferGeometry..	
		
		/* conversion to BufferGeometry works like this:
			for ( var i = 0; i < faces.length; i ++ ) {
				var face = faces[ i ];
				this.vertices.push( vertices[ face.a ], vertices[ face.b ], vertices[ face.c ] );
			}
			and for each of these vertices a "charCenter" attribute must be supplied 
		*/


		var numFaces= txt.length*2;	// 2 faces per text char
		var charCenters = new Float32Array( numFaces*3*2);	// store additional x/y coord for each vertex

		var	line = 0;		
		var w= 1.0, h= 1.0;	// always use quadratic characters (variable-width chars are centered within..)

		var charPosX=0;
		for (i = 0; i < txt.length; i++) {
			var i4= i*4;
			var i12= i*12;
			
			var code = txt.charCodeAt(i);

			var charWidth = this.charWidths[code];		// actual/variable char width..
			var charLeadingSpace= this.charLeadingSpaces[code];	
			
			var ox= w/this.fontSize* ( charPosX - charLeadingSpace);	// convert 2d to 3d coords
				
			charPosX+= charWidth;	// 2d start position of next char

			
			// base vertices for the square character
			geo.vertices.push(	new THREE.Vector3(ox + p, 	line*h + p, 0), 
								new THREE.Vector3(ox + w-p, line*h + p, 0), 
								new THREE.Vector3(ox + w-p, line*h + h-p, 0), 
								new THREE.Vector3(ox + p, 	line*h + h-p, 0));
			
			// create 2 triangle faces to define the square character
		    geo.faces.push( new THREE.Face3(i4 + 0, i4 + 1, i4 + 2) );	// 0 1 2
			geo.faces.push( new THREE.Face3(i4 + 0, i4 + 2, i4 + 3) );	// 0 2 3		


			// in order to rotate chars from the vertexShader we need the remember the center for each vertex
			// (store for each of the 6 face vertices created above.. - see later conversion to BufferGeometry)			
			var cx= ox + w/2;
			
			var cy= line*h +(h)/2;	// use center of small caps

				// additional x/y for each of the 6 vertices
			charCenters[i12 + 0] = cx;	// vertex0
			charCenters[i12 + 1] = cy;
			charCenters[i12 + 2] = cx;	// vertex1
			charCenters[i12 + 3] = cy;
			charCenters[i12 + 4] = cx;	// vertex2
			charCenters[i12 + 5] = cy;
			charCenters[i12 + 6] = cx;	// vertex3
			charCenters[i12 + 7] = cy;
			charCenters[i12 + 8] = cx;	// vertex4
			charCenters[i12 + 9] = cy;
			charCenters[i12 + 10] = cx;	// vertex5
			charCenters[i12 + 11] = cy;
			
			// assign respective texture area to each character
			var x = code*this.fontSize/charsetTextureWidth;
			var dx = this.fontSize/ charsetTextureWidth;
			var y = 0, dy = 1;	// texture is 1 char high

			geo.faceVertexUvs[0].push([new THREE.Vector2(x, y + dy), 		// 0
										new THREE.Vector2(x + dx, y + dy), 	// 1
										new THREE.Vector2(x + dx, y)]);		// 2
			geo.faceVertexUvs[0].push([new THREE.Vector2(x, y+dy), 			// 0
										new THREE.Vector2(x+dx, y), 		// 2
										new THREE.Vector2(x, y)]);			// 3
										

			if (code == 10) {	/* hande newline*/
				line--;
				charPosX= 0;
			}
		}

		var bufGeo = new THREE.BufferGeometry();
		bufGeo.fromGeometry(geo);
		bufGeo.addAttribute( 'charCenter', new THREE.BufferAttribute( charCenters, 2 ) );
		
		return bufGeo;
	},
	animate: function(time, opacity) {
		var mesh= this.pageContainerMesh.children[this.selectedId];
		if (mesh == null) return;	// not ready yet

		
		this.pageContainerMesh.visible= true;
		for (var i= 0; i<this.pageContainerMesh.children.length; i++) {
			this.pageContainerMesh.children[i].visible = (i == this.selectedId);
		}
		var mat= mesh.material;
		

		// HACK TODO: below impl still needs to be changed to do something useful
		// for all the different shaders.. right now it only provides a minimal
		// setup for the TextWobblerShader
		
		mat.uniforms.size.value= new THREE.Vector2(this.cfg.width, this.cfg.height);
		
		var t= (time - this.startFrame)/1000;

		var e=0.95;	// fixed level of "wobbling"
		
		mat.uniforms.effectAmount.value = (1-e)/3;				// 0..1 roll to left (for TextSideRollShader)
		mat.uniforms.map.value = this.charTexture;
		mat.uniforms.time.value = t;		
	//	mat.uniforms.effectAmount.value = 	this.cfg.effect;
		mat.uniforms.colorOverride.value = 	this.cfg.colorOverride;
		mat.uniforms.zPos.value = 			this.cfg.zoom;
		mat.uniforms.opacity.value = 		opacity;
		mat.uniforms.xEff.value = 			this.cfg.xEff;
		mat.uniforms.yEff.value = 			this.cfg.yEff;

		this.setPosition(this.cfg.posX, this.cfg.posY, this.cfg.posZ);	
	},
	
	_createPageContainer: function(geoms, charTexture) {
		var o = new THREE.Object3D();
		var i;
		for (i= 0; i<geoms.length; i++) {	
			var geo= geoms[i];
			var mat= this._createWobbleEffectMaterial(geo.attributes, charTexture);	// default material used for initialization
			var mesh = new THREE.Mesh(geo, mat);

			mesh.visible= false;		// only turn on 1 at the time
		
			o.add(mesh);	
		}
		return o;
	},
	_createWobbleEffectMaterial: function(attributes, charTexture) {
		var shader= UTIL.TextWobblerShader;
//		var shader= UTIL.TextSideRollShader;
//		var shader= UTIL.TextExplodeShader;

		var mat = new THREE.ShaderMaterial( shader);	// replace it later		
		mat.side= THREE.DoubleSide;
		
		mat.attributes = attributes;				// supply "char center coord" as base for rotation..
		mat.uniforms.size.value= new THREE.Vector2(this.cfg.width, this.cfg.height);
		mat.uniforms.map.texture= charTexture;
		mat.depthTest = false;	// set "false" to make "wobbly" scroll more dense

		mat.transparent = true;	// required to get rid of black background

		return mat;
	},
};




UTIL.TextWobblerShader = {
        uniforms: {
			"tDiffuse":   	{ type: "t", value: null },
			"time": 		{ type: "f", value: 1.0 },
			"size": 		{ type: "v2", value: null },
			"map": 			{ type: "t", value: 1, texture: null },
			"effectAmount": { type: "f", value: 0.0 },
			"colorOverride": { type: "f", value: 0.0 },
			"xEff": 		{ type: "f", value: 8.0 },
			"yEff": 		{ type: "f", value: -4.0 },
			"xPos": 		{ type: "f", value: -15.0 },
			"yPos": 		{ type: "f", value: 0.0 },
			"zPos": 		{ type: "f", value: 0.0 },		
			"opacity": 		{ type: "f", value: 1.0 }		
        },
        vertexShader: [
		  "varying float vZ;",
		  "uniform float time;",
		  "uniform float xPos;",
		  "uniform float yPos;",
		  "uniform float zPos;",
		  "uniform float effectAmount;",
		  "varying vec2 vUv;",

		  "mat3 rotateAngleAxisMatrix(float angle, vec3 axis) {",
			"float c = cos(angle);",
			"float s = sin(angle);",
			"float t = 1.0 - c;",
			"axis = normalize(axis);",
			"float x = axis.x, y = axis.y, z = axis.z;",
			"return mat3(",
			  "t*x*x + c,    t*x*y + s*z,  t*x*z - s*y,",
			  "t*x*y - s*z,  t*y*y + c,    t*y*z + s*x,",
			  "t*x*z + s*y,  t*y*z - s*x,  t*z*z + c",
			");",
		  "}",

		  "vec3 rotateAngleAxis(float angle, vec3 axis, vec3 v) {",
			"return rotateAngleAxisMatrix(angle, axis) * v;",
		  "}",

		  "void main() {",
		  "float eff= effectAmount;",
		  "float charSize= 1.0;",
		  
			// die logik geht von fixed-width Zeichen in 80 Zeichen Zeile aus..
			"float idx = floor(position.y/charSize)*80.0 + floor(position.x/charSize);",	// Zeichen Index
				
			//vec3 corner = vec3(position.x, position.y, 0.0);
			// die folgende Eck-Ermittlung kann bei Proportionalschrift nicht funktionieren...
			"vec3 corner = vec3(floor(position.x/charSize)*charSize, floor(position.y/charSize)*charSize, 0.0);",
			
			// selbst wenn die Zeichen tatsaechlich Quadrate sind.."
			"vec3 mid = corner + vec3(0.5, 0.5, 0.0);",
			
			"vec3 rpos = rotateAngleAxis(idx+time, vec3(mod(idx,16.0), -8.0+mod(idx,15.0), 1.0), position - mid) + mid;",
			"vec4 fpos = vec4( mix(position,rpos,eff), 1.0 );",
			"fpos.x += xPos;",
			"fpos.y += yPos+((cos(idx+time*2.0)))*4.2*eff;",
			"fpos.z += zPos+ ((sin(idx+time*2.0)))*4.2*eff;",
			"vec4 mvPosition = modelViewMatrix * fpos;",
			
			// overall text displacement
			"mvPosition.y += 4.0*sin(time*0.5+mvPosition.x/25.0)*eff;",
			"mvPosition.x -= 4.0*cos(time*0.5+mvPosition.y/25.0)*eff;",
			
			"vec4 p = projectionMatrix * mvPosition;",
			"vUv = uv;",
			"vZ = p.z;",
			"gl_Position = p;",
		  "}"
       ].join("\n"),
	   
       fragmentShader: [
		"precision highp float;",
		  "varying float vZ;",
		  "varying vec2 vUv;",
		  "uniform float time;",
		  "uniform float opacity;",
		  "uniform float effectAmount;",
		  "uniform float colorOverride;",
		  "uniform vec2 size;",
		  "uniform sampler2D map;",
		  "void main() {",
			"vec2 d = gl_FragCoord.xy - (0.5+0.02*sin(time))*size*vec2(1.0, 1.0);",
			"vec4 diffuse = texture2D(map, vUv);",
			"diffuse.a = diffuse.a*opacity;",
			"float a = sin(time*0.3)*2.0*3.14159;",
			"d = vec2( d.x*cos(a) + d.y*sin(a),",
			"         -d.x*sin(a) + d.y*cos(a));",
			"vec2 rg = vec2(0.0)+abs(d)/(0.5*size);",
			"float b = abs(vZ) / 540.0;",
			
			"float o= effectAmount; if(colorOverride>0.0) o= colorOverride;",
			"gl_FragColor = mix(diffuse, vec4(rg,b,diffuse.a),o);",
		//	"gl_FragColor = mix(diffuse, vec4(rg,b,diffuse.a), effectAmount);",
		  "}"
       ].join("\n")
};

UTIL.TextSideRollShader = {
        uniforms: {
			"tDiffuse":   	{ type: "t", value: null },		// unused
			"time": 		{ type: "f", value: 1.0 },
			"size": 		{ type: "v2", value: null },
			"map": 			{ type: "t", value: 1, texture: null },
			"effectAmount": { type: "f", value: 0.0 },
			"colorOverride": { type: "f", value: 0.0 },
			"xEff": 		{ type: "f", value: 8.0 },
			"yEff": 		{ type: "f", value: -4.0 },
			"xPos": 		{ type: "f", value: -15.0 },
			"yPos": 		{ type: "f", value: 0.0 },
			"zPos": 		{ type: "f", value: 0.0 },		
 			"opacity": 		{ type: "f", value: 1.0 }		
       },
        vertexShader: [
			"attribute vec2 charCenter;",

			"uniform float time;",
			"uniform float xPos;",
			"uniform float yPos;",
			"uniform float zPos;",
			"uniform float effectAmount;",
			"varying vec2 vUv;",

			"vec3 rotateAngle(float angle, vec3 v) {",
			"	float c = cos(angle);",
			"	float s = sin(angle);",

			"	return mat3(",
			"		c,    -s,   0,",
			"		s,   c,    0,",
			"		0,  0 ,  1",
			"		)  * v;",			
			"}",

			"void main() {",
			"	vec3 mid = vec3(charCenter.x, charCenter.y, 0.0);",

					
		//	"	float a= 60.0*cos(time*0.5+position.x/25.0)*effectAmount;",// add a "wobbling" distortion on the way out..
			"	float a= 60.0*cos(time*0.5)*effectAmount;",	// let chars roll in sync with below x-rolling
			"	vec3 rpos = rotateAngle(-a, position - mid) + mid;",

			"	vec4 fpos = vec4( rpos, 1.0 );",
			
			"	fpos.x += xPos;",
			"	fpos.y += yPos;",
			"	fpos.z += zPos;",

			"	vec4 mvPosition = modelViewMatrix * fpos;",

				// x-rolling..
			"	mvPosition.x -= 60.0*cos(time*0.5+mvPosition.y/25.0)*effectAmount;",

			"	vec4 p = projectionMatrix * mvPosition;",
			"	vUv = uv;",
			"	gl_Position = p;",
			"}"
       ].join("\n"),
		fragmentShader: [
			"precision highp float;",
			"varying vec2 vUv;",
			"uniform float time;",				// unused
			"uniform float opacity;",
			"uniform float effectAmount;",		// unused
			"uniform float colorOverride;",		// unused
			"uniform vec2 size;",				// unused
			"uniform sampler2D map;",
			"void main() {",
			"	vec4 color = texture2D(map, vUv);",			
			"	color.a = color.a*opacity;",
			
			"	gl_FragColor = color;",
			"}"
       ].join("\n")
};

UTIL.TextExplodeShader = {
        uniforms: {
			"tDiffuse":   	{ type: "t", value: null },
			"time": 		{ type: "f", value: 1.0 },
			"size": 		{ type: "v2", value: null },
			"map": 			{ type: "t", value: 1, texture: null },
			"effectAmount": { type: "f", value: 0.0 },
			"colorOverride": { type: "f", value: 0.0 },
			"xEff": 		{ type: "f", value: 8.0 },
			"yEff": 		{ type: "f", value: -4.0 },
			"xPos": 		{ type: "f", value: -15.0 },
			"yPos": 		{ type: "f", value: 0.0 },
			"zPos": 		{ type: "f", value: 0.0 },		
 			"opacity": 		{ type: "f", value: 1.0 }		
       },
        vertexShader: [
			"attribute vec2 charCenter;",

		  "varying float vZ;",
		  "uniform float time;",
		  "uniform float xEff;",
		  "uniform float yEff;",
		  "uniform float xPos;",
		  "uniform float yPos;",
		  "uniform float zPos;",
		  "uniform float effectAmount;",
		  "varying vec2 vUv;",
		  
		  "vec3 rotateAngle(float angle, vec3 v) {",
			"float c = cos(angle);",
			"float s = sin(angle);",
			
			"return mat3(",
			  "c,    -s,   0,",
			  "s,   c,    0,",
			  "0,  0 ,  1",
			")  * v;",			
		  "}",

		  "void main() {",
			"vec3 ref = vec3(charCenter.x, charCenter.y, 0.0);",
				
			"vec3 origin= vec3(xEff, yEff, 0.0);",
			"float radius= 170.0;",
			"float affectedRadius= radius*effectAmount;",

			"float frontDist= min(0.0, distance(ref, origin) - affectedRadius);",	// negative or zero
			"float f= -frontDist/affectedRadius;", 
			"float e= f*f*effectAmount*50.0;",
			
			"vec3 dStep= normalize(ref-origin)/1.0*e;",		// same base movement speed
			
			"vec3 po= vec3(position.x, position.y, position.z);",

			"po = rotateAngle(e, po - ref) + ref;",		// add some "explosion" rotation
			"po= po+dStep;",							// add "explosion" displacement
			
			"vec4 fpos = vec4( po, 1.0 );",
			
			"fpos.x += xPos;",
			"fpos.y += yPos;",
			"fpos.z += zPos;",
			
			"vUv = uv;",
			"vZ = 0.0;",
			"gl_Position = projectionMatrix * modelViewMatrix * fpos;",
		  "}"
       ].join("\n"),
		fragmentShader: [
		"precision highp float;",
		  "varying float vZ;",
		  "varying vec2 vUv;",
		  "uniform float time;",
		  "uniform float opacity;",
		  "uniform float effectAmount;",
		  "uniform float colorOverride;",
		  "uniform vec2 size;",
		  "uniform sampler2D map;",
		  "void main() {",
			"vec2 d = gl_FragCoord.xy - (0.5+0.02*sin(time))*size*vec2(1.0, 1.0);",
			"vec4 diffuse = texture2D(map, vUv);",
			"diffuse.a = diffuse.a*opacity;",
			"float a = sin(time*0.3)*2.0*3.14159;",
			"d = vec2( d.x*cos(a) + d.y*sin(a),",
			"         -d.x*sin(a) + d.y*cos(a));",
			"vec2 rg = vec2(0.0)+abs(d)/(0.5*size);",
			"float b = abs(vZ) / 540.0;",	

			"float o= effectAmount; if(colorOverride>0.0) o= colorOverride;",
			"gl_FragColor = mix(diffuse, vec4(rg,b,(opacity*diffuse.a)),o);",
		  "}"
       ].join("\n")
};



/* 
*	Utility to create a mesh by extruding a text. Use UTIL.getMeshTexter()
*	based on https://threejs.org/examples/webgl_geometry_text.html 
*/
UTIL.MeshText = function(font, bevelEnabled) {
	this._bevelEnabled= bevelEnabled;	// do not unnecessarily waste on "glow" letters
	this._bevelThickness = 0;
	this._bevelSize = 0.75;
	this._font = font;

	this._height = 10;	// thickness of the letters
//	this._height = 3;	// thickness of the letters
	this._size = 120;
	this._curveSegments = 3;	
}

UTIL.MeshText.prototype = {
	create: function(text) {
		var textGeo = new THREE.TextGeometry( text, {
			font: this._font,

			size: this._size,
			height: this._height,
			curveSegments: this._curveSegments,

			bevelThickness: this._bevelThickness,
			bevelSize: this._bevelSize,
			bevelEnabled: this._bevelEnabled,

			material: 0,
			extrudeMaterial: 1
		});

		textGeo.computeBoundingBox();
		textGeo.computeVertexNormals();

		// "fix" side normals by removing z-component of normals for side faces
		// (this doesn't work well for beveled geometry as then we lose nice curvature around z-axis)

		if ( ! this._bevelEnabled ) {
			var triangleAreaHeuristics = 0.1 * ( this._height * this._size );

			for ( var i = 0; i < textGeo.faces.length; i ++ ) {
				var face = textGeo.faces[ i ];
				if ( face.materialIndex == 1 ) {
					for ( var j = 0; j < face.vertexNormals.length; j ++ ) {
						face.vertexNormals[ j ].z = 0;
						face.vertexNormals[ j ].normalize();
					}

					var va = textGeo.vertices[ face.a ];
					var vb = textGeo.vertices[ face.b ];
					var vc = textGeo.vertices[ face.c ];

					var s = THREE.GeometryUtils.triangleArea( va, vb, vc );

					if ( s > triangleAreaHeuristics ) {
						for ( var j = 0; j < face.vertexNormals.length; j ++ ) {
							face.vertexNormals[ j ].copy( face.normal );
						}
					}
				}
			}
		}
		
	//	GEOMETRY.backupOriginalVertices(textGeo);	// XXX

		return textGeo;
	}
};

UTIL.getMeshTexter = function(fontFile, onReady, bevelEnabled) {
	bevelEnabled= (typeof bevelEnabled != 'undefined') ? bevelEnabled : false;

	var loader = new THREE.FontLoader();	// add packed font support?
	loader.load( fontFile, function ( response ) {
		this._font = response;
		
		var m= new UTIL.MeshText(response, bevelEnabled);
		onReady(m);
	} );
};
UTIL.createText = function(texter, mat, text, scale, rot, pos) {
	var geo= texter.create(text);
	
	var hover = 0;
	var centerOffset = -0.5 * ( geo.boundingBox.max.x - geo.boundingBox.min.x );

	var textMesh = new THREE.Mesh( geo, mat );
	textMesh.frustumCulled = false; // Avoid getting clipped

	textMesh.position.set(centerOffset, hover, 0);

	GEOMETRY.moveTransformsToGeometry(textMesh);

	textMesh.scale.x = textMesh.scale.y = textMesh.scale.z = scale;

	textMesh.rotation.x=  THREE.Math.degToRad(rot.x);
	textMesh.rotation.y = THREE.Math.degToRad(rot.y);
	textMesh.rotation.z = THREE.Math.degToRad(rot.z);
	
	GEOMETRY.moveTransformsToGeometry(textMesh);

	// rotate along text flow axis
	textMesh.rotation.z=  THREE.Math.degToRad(Math.random()*60);

	textMesh.position.set(pos.x, pos.y,pos.z);

	GEOMETRY.moveTransformsToGeometry(textMesh);
	
	GEOMETRY.backupOriginalVertices(geo);
	
	return textMesh;
};

/*
* Create extruded shapes based on svg vector graphics.
* (requires d3-threeD.js)
*/
EXTRUDER = {
	createMeshes: function( svgObject, bevel, scale, rot, pos ) {
		var result= new Array();
		
		var thePaths = svgObject.paths;
		var theAmounts = svgObject.amounts;
		var theColors = svgObject.color;
		var theCenter = svgObject.center;

		for (var i = 0; i < thePaths.length; ++i) {
			var simpleShapes = $d3g.transformSVGPath( thePaths[i] );	// array

			var color = new THREE.Color( svgObject.color[i] );
			var emissive = new THREE.Color( svgObject.emissive[i] );
			var material = new THREE.MeshPhongMaterial({emissive: emissive, specular: 0xffffff, color: color, shininess: 10, side: THREE.DoubleSide});
			var amount = theAmounts[i];

			for (var j = 0; j < simpleShapes.length; ++j) {
				var simpleShape = simpleShapes[j];
				
				var shape3d = new THREE.ExtrudeGeometry( simpleShape, {
								steps: 1,
								amount: amount,
								bevelEnabled: true,
								bevelThickness: amount/2,
								bevelSize: bevel*amount/2,	// added on the outside..
								bevelSegments: 4
				} );
				
				var mesh = new THREE.Mesh(shape3d, material);
				var geo= mesh.geometry;
							
				mesh.translateZ( - amount - 1);
				mesh.translateX( - theCenter.x);
				mesh.translateY( - theCenter.y);

				mesh.rotation.x=  rot.x;
				mesh.rotation.y = rot.y;
				mesh.rotation.z = rot.z;

				GEOMETRY.moveTransformsToGeometry(mesh);

				mesh.scale.x = mesh.scale.y = mesh.scale.z = scale;	
				mesh.position.set(pos.x,pos.y,pos.z);
				
				GEOMETRY.moveTransformsToGeometry(mesh);			
				GEOMETRY.backupOriginalVertices(geo);
				
				result.push(mesh);
			}
		}
		return result;
	},	
};
