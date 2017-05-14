/*
 library of fractal configurations used in this demo..
*/

BOX2 = "BOX2" in window ? BOX2 : {}

BOX2.PKleinLib = function() {
	// configured "defines" used for shader
	this.defStdReflect= [
			"#define COLOR_ITERS 7",											// Number of fractal iterations for coloring
			"#define REFITER 3",												// reflections
			"#define DIST_MULTIPLIER 0.763001",
			"#define ITERS 11",													// Number of fractal iterations			
			"#define CSize vec3(0.808001 ,0.808,1.167)",						// Size of the box folding cell
			"#define Size 1.",													// Size of inversion sphere
			"#define C vec3(0,0,0)",											// Julia seed
			"#define Offset vec3(-4.88759e-007,1.73877e-007,-1.51991e-007)",	// Translation of the basic d_shape
			"#define DEoffset 0.",												// A small value added to the DE - simplify
			"#define MAXI 1.0",
		];
	this.defStdReflectX= [	// low DIST_MULTIPLIER needed to avoid holes in "skulls"
			"#define COLOR_ITERS 7",											// Number of fractal iterations for coloring
			"#define REFITER 3",												// reflections
			"#define DIST_MULTIPLIER 0.363001",
			"#define ITERS 11",													// Number of fractal iterations			
			"#define CSize vec3(0.808001 ,0.808,1.167)",						// Size of the box folding cell
			"#define Size 1.",													// Size of inversion sphere
			"#define C vec3(0,0,0)",											// Julia seed
			"#define Offset vec3(-4.88759e-007,1.73877e-007,-1.51991e-007)",	// Translation of the basic d_shape
			"#define DEoffset 0.",												// A small value added to the DE - simplify
			"#define MAXI 1.0",
		];
		
	this.defLowReflect= [
			"#define COLOR_ITERS 7",											// Number of fractal iterations for coloring
			"#define REFITER 2",												// reflections
			"#define DIST_MULTIPLIER 0.763001",
			"#define ITERS 11",													// Number of fractal iterations			
			"#define CSize vec3(0.808001 ,0.808,1.167)",						// Size of the box folding cell
			"#define Size 1.",													// Size of inversion sphere
			"#define C vec3(0,0,0)",											// Julia seed
			"#define Offset vec3(-4.88759e-007,1.73877e-007,-1.51991e-007)",	// Translation of the basic d_shape
			"#define DEoffset 0.",												// A small value added to the DE - simplify
			"#define MAXI 1.0",
		];
	this.defNoReflect= [
			"#define COLOR_ITERS 7",											// Number of fractal iterations for coloring
			"#define REFITER 1",												// reflections
			"#define DIST_MULTIPLIER 0.763001",
			"#define ITERS 11",													// Number of fractal iterations			
			"#define CSize vec3(0.808001 ,0.808,1.167)",						// Size of the box folding cell
			"#define Size 1.",													// Size of inversion sphere
			"#define C vec3(0,0,0)",											// Julia seed
			"#define Offset vec3(-4.88759e-007,1.73877e-007,-1.51991e-007)",	// Translation of the basic d_shape
			"#define DEoffset 0.",												// A small value added to the DE - simplify
			"#define MAXI 1.0",
		];
	this.defMengerNo= [
			"#define COLOR_ITERS 5",											// Number of fractal iterations for coloring
			"#define REFITER 1",												// turn off .. too expensive here..
			"#define DIST_MULTIPLIER 0.5",
			"#define ITERS 6",													// Number of fractal iterations
			"#define CSize vec3(0.76,0.84,0.84)",								// Size of the box folding cell
			"#define Size 0.74766",												// Size of inversion sphere
			"#define C vec3(-0.81740,-0.46956,-0.67828)",						// Julia seed
			"#define Offset vec3(0.02196, 0.02196, -0.24176)",					// Translation of the basic d_shape
			"#define DEoffset 0.0",												// A small value added to the DE - simplify
			"#define MAXI 1.0",
		];
	this.defMengerLow= [
			"#define COLOR_ITERS 5",											// Number of fractal iterations for coloring
			"#define REFITER 3",												// turn off .. too expensive here..
			"#define DIST_MULTIPLIER 0.5",
			"#define ITERS 6",													// Number of fractal iterations
			"#define CSize vec3(0.76,0.84,0.84)",								// Size of the box folding cell
			"#define Size 0.74766",												// Size of inversion sphere
			"#define C vec3(-0.81740,-0.46956,-0.67828)",						// Julia seed
			"#define Offset vec3(0.02196, 0.02196, -0.24176)",					// Translation of the basic d_shape
			"#define DEoffset 0.0",												// A small value added to the DE - simplify
			"#define MAXI 1.0",
		];
	this.defAltStd= [
			"#define COLOR_ITERS 7",											// Number of fractal iterations for coloring
			"#define REFITER 3",												// reflections
			"#define DIST_MULTIPLIER 0.763001",
			"#define ITERS 11",													// Number of fractal iterations			
			"#define CSize vec3(0.808001 ,0.808,1.167)",						// Size of the box folding cell
			"#define Size 1.",													// Size of inversion sphere
			"#define C vec3(0,0,0)",											// Julia seed
			"#define Offset vec3(-4.88759e-007,1.73877e-007,-1.51991e-007)",	// Translation of the basic d_shape
			"#define DEoffset 0.",												// A small value added to the DE - simplify
			"#define MAXI 0.5",
		];
	this.defAltStdLow= [
			"#define COLOR_ITERS 7",											// Number of fractal iterations for coloring
			"#define REFITER 2",												// reflections
			"#define DIST_MULTIPLIER 0.563001",
	//		"#define DIST_MULTIPLIER 0.763001",
			"#define ITERS 11",													// Number of fractal iterations			
			"#define CSize vec3(0.808001 ,0.808,1.167)",						// Size of the box folding cell
			"#define Size 1.",													// Size of inversion sphere
			"#define C vec3(0,0,0)",											// Julia seed
			"#define Offset vec3(-4.88759e-007,1.73877e-007,-1.51991e-007)",	// Translation of the basic d_shape
			"#define DEoffset 0.",												// A small value added to the DE - simplify
			"#define MAXI 0.5",
		];
	this.defLowLoops= [
			"#define COLOR_ITERS 5",											// Number of fractal iterations for coloring
			"#define REFITER 2",												// reflections
			"#define DIST_MULTIPLIER 0.8",
			"#define ITERS 6",													// Number of fractal iterations			
			"#define CSize vec3(0.908001 ,1.808,1.167)",						// Size of the box folding cell
			"#define Size 1.0",													// Size of inversion sphere
			"#define C vec3(0,0,0)",											// Julia seed
			"#define Offset vec3(-4.88759e-007,1.73877e-007,-1.51991e-007)",	// Translation of the basic d_shape
			"#define DEoffset 0.",												// A small value added to the DE - simplify
			"#define MAXI 1.0",
		];
			
	this.defLowLoops2= [
			"#define COLOR_ITERS 5",											// Number of fractal iterations for coloring
			"#define REFITER 2",												// reflections
			"#define DIST_MULTIPLIER 0.7",
			"#define ITERS 6",													// Number of fractal iterations			
			"#define CSize vec3(0.908001 ,1.808,1.167)",						// Size of the box folding cell
			"#define Size 0.87",												// Size of inversion sphere
			"#define C vec3(0.02,0.03,0)",										// Julia seed
			"#define Offset vec3(0.,0.,0.)",									// Translation of the basic d_shape
			"#define DEoffset 0.",												// A small value added to the DE - simplify
			"#define MAXI 1.0",
		];
			
	this.effects= {}; // use associative access
	
	this.effects["0"] = new BOX2.PKleinConfig(this.defMengerLow, [
			// cylinder effect
			"float d_shape(vec3 p) {",
			"   float y=  0.892;",	 
			"   float rxy =  sin(length(p.xy)-y);", 
			"   return max(rxy,  -(length(p.xy)*p.z-TThickness) / sqrt(dot(p,p)+abs(TThickness)));",
			"}"
		]);
	this.effects["1"] = new BOX2.PKleinConfig(this.defStdReflect, [
			// "emerald mine"			
			"float d_shape(vec3 p) {",
			"   float y=  100.992;",
// use alt configs?				
//				"   float rxy =  -sin(length(p.xy)-y-p.z);", 	// eckige steine
//				"   float rxy =  -sin(length(p.xy)-p.z);", 	// outside: shiny pebbles.. but little perspective-.. inside= old
//			"   return max(rxy,  -(length(p.xy)*abs(p.z)-TThickness) / sqrt(dot(p,p)-(TThickness)));"

			// orb
			"   y=  0.992;",
			"   float rxy =  (sin(length(p.xy)-p.z));", 
			"   return mix(rxy,  -(length(p.xy)*abs(p.z)-TThickness) / sqrt(dot(p,p)-(TThickness)),.7);",
			"}"
		]);
	this.effects["3"] = new BOX2.PKleinConfig(this.defStdReflect, [
			//  "carved"
			"float d_shape(vec3 p) {",
			"   float y=  -81.892;",	// pos value "opens holes to inside.."
			"   float rxy =  sign(y)*sin(length(p.xy)-abs(y));",
			"   return 0.47-max(rxy,  -(length(p.xy)*p.z-TThickness) / sqrt(dot(p,p)+abs(TThickness)));",
			"}"
		]);
	this.effects["4"] = new BOX2.PKleinConfig(this.defStdReflectX, [
		//  "pearls---  very nice blue/pearl finish" 
			"float d_shape(vec3 p) {",
//			"   return max(p.x, (-length(p.xy)*p.z) / length(p));",		// less noise but also less holes.. 
//			"   return max(abs(p.x), (-length(p.xy)*p.z) / length(p));",	// right combination but lots of noise..	

//			"   return max(abs(p.x), -p.z*length(p.xy) / length(p));",	// right combination but lots of noise..	


			"   float rxy = (length(p.x));",
			"   return max(rxy,  -(length(p.xy)*p.z-TThickness) / sqrt(dot(p,p)+abs(TThickness)));",
			"}"	
		]);
	this.effects["5"] = new BOX2.PKleinConfig(this.defLowReflect, [	
			//  GReetz scene.. reduced reflection for better frame rate
			"float d_shape(vec3 p) {",
			"   float y=  10.892;",
			"   float rxy = sign(y)*(length(p.xy)-abs(y)*0.1);",
			"   return max(rxy,abs(length(p.xy)*p.z-TThickness) / sqrt(dot(p,p)+abs(TThickness)));",
			"}"
		]);
	this.effects["6"] = new BOX2.PKleinConfig(this.defMengerLow, [
			//  "carved menger - same shape as in 3"
			
			"float d_shape(vec3 p) {",
			"   float y=  -81.892;",	// pos value "opens holes to inside.."
			"   float rxy =  sign(y)*sin(length(p.xy)-abs(y));",
			"   return 0.47-max(rxy,  -(length(p.xy)*p.z-TThickness) / sqrt(dot(p,p)+abs(TThickness)));",
			"}"
		]);
	this.effects["7"] = new BOX2.PKleinConfig(this.defLowReflect, [
			//  "skulls with holes"
			"float d_shape(vec3 p) {",
			"	float c = cos(45.0*p.y);",
			"	float s = sin(45.0*p.y);",
			"	mat2  m = mat2(c,-s,s,c);",
			"	vec3  q = vec3(m*p.xz,p.y);",
			"   float rxy = length(q) - 1.0946;",			
			"   return max(min(rxy,-(length(p.xy)*q.x-TThickness) / sqrt(dot(p,p)+abs(TThickness))),p.x*0.7);",
			"}"
		]);
	this.effects["8"] = new BOX2.PKleinConfig(this.defStdReflectX, [
			//  "candyshop"
			"float d_shape(vec3 p) {",
			"	vec2 t= vec2(0.7,0.2);",
			"	float f= length(vec2(length(p.xz)-t.x,p.y))-t.y;",	// torus
			
			"	float c = cos(PI_HALF/180.*p.x);",
			"	float s = sin(PI_HALF/180.*p.x);",
			"	vec3  q = vec3( mat2(c,-s,s,c)*p.xz,p.y);",		// twist
		
			"   float rxy =  sin(length(p.xy)-abs(q.z+f));",
			"   return max(rxy, (-(length(p.xy)*.1-TThickness) / sqrt(dot(p,p)+abs(TThickness))));",
			"}"
		]);
	this.effects["9"] = new BOX2.PKleinConfig(this.defLowReflect, [
			//  "zebra color noise"
			"float d_shape(vec3 p) {",
			"	vec2 t= vec2(0.7,0.2);",
			"	float f= length(vec2(length(p.xz)-t.x,p.y))-t.y;",	// torus
			"	float c = cos(PI_HALF*15.*p.x);",
			"	float s = sin(PI_HALF*15.*p.x);",
			"	vec3  q = vec3( mat2(c,-s,s,c)*p.xz,p.y);",		// twist
			"   return max(-(f*q.x) / sqrt(dot(p,p)), (-q.z-abs(f)));",
			"}"
		]);
	this.effects["10"] = new BOX2.PKleinConfig(this.defLowReflect, [
			//  nice 2d patterns 
			
			"float d_shape(vec3 p) {",			
			"	vec2 t= vec2(0.7,0.2);",
			"	float f= length(vec2(length(p.xz)-t.x,p.y))-t.y;",	// torus
			
			"	float c = cos(PI_HALF*15.*p.x);",
			"	float s = sin(PI_HALF*15.*p.x);",
			"	vec3  q = vec3( mat2(c,-s,s,c)*p.xz,p.y);",		// twist
			
			"   return max(f*f*q.x / sqrt(dot(p,p)), ",
							"(q.y)+f*f);",
			"}"
		]);
		
	this.effects["12"] = new BOX2.PKleinConfig(this.defStdReflect, [
			//  "blade noise"		
			
			"float d_shape(vec3 p) {",
			"	vec2 t= vec2(0.7,0.2);",
			"	float f= length(vec2(length(p.xz)-t.x,p.y))-t.y;",	// torus
			
			"	float c = cos(PI_HALF*15.*p.x);",
			"	float s = sin(PI_HALF*15.*p.x);",
			"	vec3  q = vec3( mat2(c,-s,s,c)*p.xz,p.y);",		// twist
			
			"   return max(-(f*q.x) / sqrt(dot(p,p)), q.x*f*f);",
			"}"
		]);
	this.effects["13"] = new BOX2.PKleinConfig(this.defLowReflect, [
			//  "blade noise3 - c64 colors - somewhat jumpy"
			"float d_shape(vec3 p) {",
			"	vec2 t= vec2(0.7,0.2);",
			"	float f= length(vec2(length(p.xz)-t.x,p.y))-t.y;",	// torus
			
			"	float c = cos(PI_HALF*15.*p.x);",
			"	float s = sin(PI_HALF*15.*p.x);",
			"	vec3  q = vec3( mat2(c,-s,s,c)*p.xz,p.y);",		// twist
			
			"   return max(-(f*q.x) / sqrt(dot(p,p)), q.y*f);",
			"}"
		]);
	this.effects["14"] = new BOX2.PKleinConfig(this.defLowReflect, [
			//  "pharaos skulls - extended noise sequences"
			"float d_shape(vec3 p) {",
			"	vec2 t= vec2(0.7,0.2);",
			"	float f= length(vec2(length(p.xz)-t.x,p.y))-t.y;",	// torus
			
			"	float c = cos(PI_HALF*15.*p.x);",
			"	float s = sin(PI_HALF*15.*p.x);",
			"	vec3  q = vec3( mat2(c,-s,s,c)*p.xz,p.y);",		// twist
			
			"   return max(-(f*q.x) / sqrt(dot(p,p)), q.z*f);",
			"}"
		]);
	this.effects["15"] = new BOX2.PKleinConfig(this.defLowReflect, [
			//  "jack sparrow"		
				"float d_shape(vec3 p) {",
					// torus
				"	vec2 t= vec2(0.7,0.2);",
	//			"	float f= length(vec2(length(p.xz)-t.x,p.y))-t.y*0.05;",	// tube arches
				"	float f= length(vec2(length(p.xz)-t.x,p.y))-t.y;",	
								
				"   return length(p.xy)/-dot(p,p)*f;",
				"}"
//				"   return length(p.xy)/length(p,p);";	// simple arcs
		]);
	
	this.effects["16"] = new BOX2.PKleinConfig(this.defMengerNo, [
			//  "KleinianMenger" - caution: quite slow
			// Theli-at's Pseudo Kleinian (Scale 1 JuliaBox + Something (here a Menger Sponge)).
			// Made by Knighty, see this thread:
			// http://www.fractalforums.com/3d-fractal-generation/fragmentarium-an-ide-for-exploring-3d-fractals-and-other-systems-on-the-gpu/msg32270/#msg32270

			"#define MnIterations 6",
			"#define MnScale 2.71264",
			"#define MnOffset vec3(1.45680,1.90124,0.79012)",
			"#define Bailout 100.",

			"float d_shape(vec3 p) {",
			"	int n = 0;",

				// Fold
			"	p = abs(p);",
			"	if (p.x<p.y){ p.xy = p.yx;}",
			"	if (p.x<p.p){ p.xz = p.zx;}",
			"	if (p.y<p.p){ p.yz = p.zy;}",
			"	if (p.p<1./3.){ p.p -=2.*( p.p-1./3.);}",
			"for (int i= 0; i < MnIterations; i++) {",
	
			"		p=MnScale* (p-MnOffset)+MnOffset;",
	
					// Fold
			"		p = abs(p);",
			"		if (p.x<p.y){ p.xy = p.yx;}",
			"		if (p.x< p.p){ p.xz = p.zx;}",
			"		if (p.y<p.p){ p.yz = p.zy;}",
			"		if (p.p<1./3.*MnOffset.p){ p.p -=2.*( p.p-1./3.*MnOffset.p);}",
	
			"		n++;",
			"		if (!(dot(p,p)<Bailout)) break;",
			"	}",
			
			"	return float(p.x-MnOffset) * pow(MnScale, float(-n));",
			"}"
		]);
		
	this.effects["17"] = new BOX2.PKleinConfig(this.defAltStdLow, [
			//  "- like 15"		- slow..

				"float d_shape(vec3 p) {",
					// torus
				"	vec2 t= vec2(0.7,0.2);",
	//			"	float f= length(vec2(length(p.xz)-t.x,p.y))-t.y*0.05;",	// tube arches
				"	float f= length(vec2(length(p.xz)-t.x,p.y))-t.y;",	
								
				"   return length(p.xy)/-dot(p,p)*f;",
				"}"
//				"   return length(p.xy)/length(p,p);";	// simple arcs
		]);
	this.effects["18"] = new BOX2.PKleinConfig(this.defAltStdLow, [
			"float d_shape(vec3 p) {",
			"	vec2 t= vec2(0.7,0.2);",
			"	float f= length(vec2(length(p.xz)-t.x,p.y))-t.y;",	// torus
			
			"	float c = cos(PI_HALF*15.*p.x);",
			"	float s = sin(PI_HALF*15.*p.x);",
			"	vec3  q = vec3( mat2(c,-s,s,c)*p.xz,p.y);",		// twist
			
			"   return max(-(f*q.x) / sqrt(dot(p,p)), f*f);",
			"}"
		]);
	this.effects["19"] = new BOX2.PKleinConfig(this.defMengerNo, [
			
			// nice center sequence..
			"float d_shape(vec3 p) {",
			"   float y=  10.892;",
			"   float rxy = sign(y)*(length(p.xy)-abs(y)*0.04);",
			"   return max(rxy,abs(length(p.xy)*p.z-TThickness) / sqrt(dot(p,p)+abs(TThickness)));",
			"}"
		]);
		
	this.effects["20"] = new BOX2.PKleinConfig(this.defLowReflect, [
		//  "rainbow sketches" 
			"float d_shape(vec3 p) {",
			"   return max(-abs(p.x), -0.05 / length(p));",
			"}"			
		]);
	this.effects["33"] = new BOX2.PKleinConfig(this.defLowLoops, [
		"#define jIterations 11",
		"#define jThreshold 34.568",
		"#define jC vec4(0.27132,0.45736,-0.27132,1.)",
		// based on Crist-JRoger (see http://www.fractalforums.com/fragmentarium/fragmentarium-an-ide-for-exploring-3d-fractals-and-other-systems-on-the-gpu/90/)
		"float d_shape(vec3 pos) {",
		"	vec4 p = vec4(pos, 0.0);",
		"	vec4 dp = vec4(1.0, 0.0,0.0,0.0);",
		"	for (int i = 0; i < jIterations; i++) {",
		"		dp = 2.0* vec4(p.x*dp.x-dot(p.yzw, dp.yzw), p.x*dp.yzw+dp.x*p.yzw+cross(p.yzw, dp.yzw));",
		"		p = vec4(p.x*p.x-dot(p.yzw, p.yzw), vec3(2.0*p.x*p.yzw)) + jC;",
		"		float p2 = dot(p,p);",
		"		if (p2 > jThreshold) break;",
		"	}",
		"	float r = length(p);",
		"	r=  0.5 * r * log(r) / length(dp);",

		"	return abs(pos.z*r);",
		"}"
		]);
	this.effects["34"] = new BOX2.PKleinConfig(this.defLowLoops2, [
		"#define jIterations 11",
		"#define jThreshold 34.568",
		"#define jC vec4(0.27132,0.45736,-0.27132,1.)",
		// based on Crist-JRoger (see http://www.fractalforums.com/fragmentarium/fragmentarium-an-ide-for-exploring-3d-fractals-and-other-systems-on-the-gpu/90/)
		"float d_shape(vec3 pos) {",
		"	vec4 p = vec4(pos, 0.0);",
		"	vec4 dp = vec4(1.0, 0.0,0.0,0.0);",
		"	for (int i = 0; i < jIterations; i++) {",
		"		dp = 2.0* vec4(p.x*dp.x-dot(p.yzw, dp.yzw), p.x*dp.yzw+dp.x*p.yzw+cross(p.yzw, dp.yzw));",
		"		p = vec4(p.x*p.x-dot(p.yzw, p.yzw), vec3(2.0*p.x*p.yzw)) + jC;",
		"		float p2 = dot(p,p);",
		"		if (p2 > jThreshold) break;",
		"	}",
		"	float r = length(p);",
		"	r=  0.5 * r * log(r) / length(dp);",

		"	return r;",
		"}"
		]);
		
}
BOX2.PKleinLib.prototype = {
	getEffect: function(key) {
		return this.effects[""+key];
	}
}