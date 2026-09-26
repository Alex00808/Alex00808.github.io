"use strict";(self.webpackChunk_N_E=self.webpackChunk_N_E||[]).push([[343],{2049:(e,t,r)=>{r.d(t,{Z:()=>i});let i={name:"CopyShader",uniforms:{tDiffuse:{value:null},opacity:{value:1}},vertexShader:`

		varying vec2 vUv;

		void main() {

			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,fragmentShader:`

		uniform float opacity;

		uniform sampler2D tDiffuse;

		varying vec2 vUv;

		void main() {

			vec4 texel = texture2D( tDiffuse, vUv );
			gl_FragColor = opacity * texel;


		}`}},2747:(e,t,r)=>{r.d(t,{F:()=>d});var i=r(5339),s=r(3617);let a={name:"GTAOShader",defines:{PERSPECTIVE_CAMERA:1,SAMPLES:16,NORMAL_VECTOR_TYPE:1,DEPTH_SWIZZLING:"x",SCREEN_SPACE_RADIUS:0,SCREEN_SPACE_RADIUS_SCALE:100,SCENE_CLIP_BOX:0},uniforms:{tNormal:{value:null},tDepth:{value:null},tNoise:{value:null},resolution:{value:new i.I9Y},cameraNear:{value:null},cameraFar:{value:null},cameraProjectionMatrix:{value:new i.kn4},cameraProjectionMatrixInverse:{value:new i.kn4},cameraWorldMatrix:{value:new i.kn4},radius:{value:.25},distanceExponent:{value:1},thickness:{value:1},distanceFallOff:{value:1},scale:{value:1},sceneBoxMin:{value:new i.Pq0(-1,-1,-1)},sceneBoxMax:{value:new i.Pq0(1,1,1)}},vertexShader:`

		varying vec2 vUv;

		void main() {
			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
		}`,fragmentShader:`
		varying vec2 vUv;
		uniform highp sampler2D tNormal;
		uniform highp sampler2D tDepth;
		uniform sampler2D tNoise;
		uniform vec2 resolution;
		uniform float cameraNear;
		uniform float cameraFar;
		uniform mat4 cameraProjectionMatrix;
		uniform mat4 cameraProjectionMatrixInverse;
		uniform mat4 cameraWorldMatrix;
		uniform float radius;
		uniform float distanceExponent;
		uniform float thickness;
		uniform float distanceFallOff;
		uniform float scale;
		#if SCENE_CLIP_BOX == 1
			uniform vec3 sceneBoxMin;
			uniform vec3 sceneBoxMax;
		#endif

		#include <common>
		#include <packing>

		#ifndef FRAGMENT_OUTPUT
		#define FRAGMENT_OUTPUT vec4(vec3(ao), 1.)
		#endif

		vec3 getViewPosition(const in vec2 screenPosition, const in float depth) {
			vec4 clipSpacePosition = vec4(vec3(screenPosition, depth) * 2.0 - 1.0, 1.0);
			vec4 viewSpacePosition = cameraProjectionMatrixInverse * clipSpacePosition;
			return viewSpacePosition.xyz / viewSpacePosition.w;
		}

		float getDepth(const vec2 uv) {
			return textureLod(tDepth, uv.xy, 0.0).DEPTH_SWIZZLING;
		}

		float fetchDepth(const ivec2 uv) {
			return texelFetch(tDepth, uv.xy, 0).DEPTH_SWIZZLING;
		}

		float getViewZ(const in float depth) {
			#if PERSPECTIVE_CAMERA == 1
				return perspectiveDepthToViewZ(depth, cameraNear, cameraFar);
			#else
				return orthographicDepthToViewZ(depth, cameraNear, cameraFar);
			#endif
		}

		vec3 computeNormalFromDepth(const vec2 uv) {
			vec2 size = vec2(textureSize(tDepth, 0));
			ivec2 p = ivec2(uv * size);
			float c0 = fetchDepth(p);
			float l2 = fetchDepth(p - ivec2(2, 0));
			float l1 = fetchDepth(p - ivec2(1, 0));
			float r1 = fetchDepth(p + ivec2(1, 0));
			float r2 = fetchDepth(p + ivec2(2, 0));
			float b2 = fetchDepth(p - ivec2(0, 2));
			float b1 = fetchDepth(p - ivec2(0, 1));
			float t1 = fetchDepth(p + ivec2(0, 1));
			float t2 = fetchDepth(p + ivec2(0, 2));
			float dl = abs((2.0 * l1 - l2) - c0);
			float dr = abs((2.0 * r1 - r2) - c0);
			float db = abs((2.0 * b1 - b2) - c0);
			float dt = abs((2.0 * t1 - t2) - c0);
			vec3 ce = getViewPosition(uv, c0).xyz;
			vec3 dpdx = (dl < dr) ? ce - getViewPosition((uv - vec2(1.0 / size.x, 0.0)), l1).xyz : -ce + getViewPosition((uv + vec2(1.0 / size.x, 0.0)), r1).xyz;
			vec3 dpdy = (db < dt) ? ce - getViewPosition((uv - vec2(0.0, 1.0 / size.y)), b1).xyz : -ce + getViewPosition((uv + vec2(0.0, 1.0 / size.y)), t1).xyz;
			return normalize(cross(dpdx, dpdy));
		}

		vec3 getViewNormal(const vec2 uv) {
			#if NORMAL_VECTOR_TYPE == 2
				return normalize(textureLod(tNormal, uv, 0.).rgb);
			#elif NORMAL_VECTOR_TYPE == 1
				return unpackRGBToNormal(textureLod(tNormal, uv, 0.).rgb);
			#else
				return computeNormalFromDepth(uv);
			#endif
		}

		vec3 getSceneUvAndDepth(vec3 sampleViewPos) {
			vec4 sampleClipPos = cameraProjectionMatrix * vec4(sampleViewPos, 1.);
			vec2 sampleUv = sampleClipPos.xy / sampleClipPos.w * 0.5 + 0.5;
			float sampleSceneDepth = getDepth(sampleUv);
			return vec3(sampleUv, sampleSceneDepth);
		}

		void main() {
			float depth = getDepth(vUv.xy);
			if (depth >= 1.0) {
				discard;
				return;
			}
			vec3 viewPos = getViewPosition(vUv, depth);
			vec3 viewNormal = getViewNormal(vUv);

			float radiusToUse = radius;
			float distanceFalloffToUse = thickness;
			#if SCREEN_SPACE_RADIUS == 1
				float radiusScale = getViewPosition(vec2(0.5 + float(SCREEN_SPACE_RADIUS_SCALE) / resolution.x, 0.0), depth).x;
				radiusToUse *= radiusScale;
				distanceFalloffToUse *= radiusScale;
			#endif

			#if SCENE_CLIP_BOX == 1
				vec3 worldPos = (cameraWorldMatrix * vec4(viewPos, 1.0)).xyz;
				float boxDistance = length(max(vec3(0.0), max(sceneBoxMin - worldPos, worldPos - sceneBoxMax)));
				if (boxDistance > radiusToUse) {
					discard;
					return;
				}
			#endif

			vec2 noiseResolution = vec2(textureSize(tNoise, 0));
			vec2 noiseUv = vUv * resolution / noiseResolution;
			vec4 noiseTexel = textureLod(tNoise, noiseUv, 0.0);
			vec3 randomVec = noiseTexel.xyz * 2.0 - 1.0;
			vec3 tangent = normalize(vec3(randomVec.xy, 0.));
			vec3 bitangent = vec3(-tangent.y, tangent.x, 0.);
			mat3 kernelMatrix = mat3(tangent, bitangent, vec3(0., 0., 1.));

			const int DIRECTIONS = SAMPLES < 30 ? 3 : 5;
			const int STEPS = (SAMPLES + DIRECTIONS - 1) / DIRECTIONS;
			float ao = 0.0;
			for (int i = 0; i < DIRECTIONS; ++i) {

				float angle = float(i) / float(DIRECTIONS) * PI;
				vec4 sampleDir = vec4(cos(angle), sin(angle), 0., 0.5 + 0.5 * noiseTexel.w);
				sampleDir.xyz = normalize(kernelMatrix * sampleDir.xyz);

				vec3 viewDir = normalize(-viewPos.xyz);
				vec3 sliceBitangent = normalize(cross(sampleDir.xyz, viewDir));
				vec3 sliceTangent = cross(sliceBitangent, viewDir);
				vec3 normalInSlice = normalize(viewNormal - sliceBitangent * dot(viewNormal, sliceBitangent));

				vec3 tangentToNormalInSlice = cross(normalInSlice, sliceBitangent);
				vec2 cosHorizons = vec2(dot(viewDir, tangentToNormalInSlice), dot(viewDir, -tangentToNormalInSlice));

				for (int j = 0; j < STEPS; ++j) {
					vec3 sampleViewOffset = sampleDir.xyz * radiusToUse * sampleDir.w * pow(float(j + 1) / float(STEPS), distanceExponent);

					vec3 sampleSceneUvDepth = getSceneUvAndDepth(viewPos + sampleViewOffset);
					vec3 sampleSceneViewPos = getViewPosition(sampleSceneUvDepth.xy, sampleSceneUvDepth.z);
					vec3 viewDelta = sampleSceneViewPos - viewPos;
					if (abs(viewDelta.z) < thickness) {
						float sampleCosHorizon = dot(viewDir, normalize(viewDelta));
						cosHorizons.x += max(0., (sampleCosHorizon - cosHorizons.x) * mix(1., 2. / float(j + 2), distanceFallOff));
					}

					sampleSceneUvDepth = getSceneUvAndDepth(viewPos - sampleViewOffset);
					sampleSceneViewPos = getViewPosition(sampleSceneUvDepth.xy, sampleSceneUvDepth.z);
					viewDelta = sampleSceneViewPos - viewPos;
					if (abs(viewDelta.z) < thickness) {
						float sampleCosHorizon = dot(viewDir, normalize(viewDelta));
						cosHorizons.y += max(0., (sampleCosHorizon - cosHorizons.y) * mix(1., 2. / float(j + 2), distanceFallOff));
					}
				}

				vec2 sinHorizons = sqrt(1. - cosHorizons * cosHorizons);
				float nx = dot(normalInSlice, sliceTangent);
				float ny = dot(normalInSlice, viewDir);
				float nxb = 1. / 2. * (acos(cosHorizons.y) - acos(cosHorizons.x) + sinHorizons.x * cosHorizons.x - sinHorizons.y * cosHorizons.y);
				float nyb = 1. / 2. * (2. - cosHorizons.x * cosHorizons.x - cosHorizons.y * cosHorizons.y);
				float occlusion = nx * nxb + ny * nyb;
				ao += occlusion;
			}

			ao = clamp(ao / float(DIRECTIONS), 0., 1.);
		#if SCENE_CLIP_BOX == 1
			ao = mix(ao, 1., smoothstep(0., radiusToUse, boxDistance));
		#endif
			ao = pow(ao, scale);

			gl_FragColor = FRAGMENT_OUTPUT;
		}`},n={name:"GTAODepthShader",defines:{PERSPECTIVE_CAMERA:1},uniforms:{tDepth:{value:null},cameraNear:{value:null},cameraFar:{value:null}},vertexShader:`
		varying vec2 vUv;

		void main() {
			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
		}`,fragmentShader:`
		uniform sampler2D tDepth;
		uniform float cameraNear;
		uniform float cameraFar;
		varying vec2 vUv;

		#include <packing>

		float getLinearDepth( const in vec2 screenPosition ) {
			#if PERSPECTIVE_CAMERA == 1
				float fragCoordZ = texture2D( tDepth, screenPosition ).x;
				float viewZ = perspectiveDepthToViewZ( fragCoordZ, cameraNear, cameraFar );
				return viewZToOrthographicDepth( viewZ, cameraNear, cameraFar );
			#else
				return texture2D( tDepth, screenPosition ).x;
			#endif
		}

		void main() {
			float depth = getLinearDepth( vUv );
			gl_FragColor = vec4( vec3( 1.0 - depth ), 1.0 );

		}`},o={name:"GTAOBlendShader",uniforms:{tDiffuse:{value:null},intensity:{value:1}},vertexShader:`
		varying vec2 vUv;

		void main() {
			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
		}`,fragmentShader:`
		uniform float intensity;
		uniform sampler2D tDiffuse;
		varying vec2 vUv;

		void main() {
			vec4 texel = texture2D( tDiffuse, vUv );
			gl_FragColor = vec4(mix(vec3(1.), texel.rgb, intensity), texel.a);
		}`},l={name:"PoissonDenoiseShader",defines:{SAMPLES:16,SAMPLE_VECTORS:h(16,2,1),NORMAL_VECTOR_TYPE:1,DEPTH_VALUE_SOURCE:0},uniforms:{tDiffuse:{value:null},tNormal:{value:null},tDepth:{value:null},tNoise:{value:null},resolution:{value:new i.I9Y},cameraProjectionMatrixInverse:{value:new i.kn4},lumaPhi:{value:5},depthPhi:{value:5},normalPhi:{value:5},radius:{value:4},index:{value:0}},vertexShader:`

		varying vec2 vUv;

		void main() {
			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
		}`,fragmentShader:`

		varying vec2 vUv;

		uniform sampler2D tDiffuse;
		uniform sampler2D tNormal;
		uniform sampler2D tDepth;
		uniform sampler2D tNoise;
		uniform vec2 resolution;
		uniform mat4 cameraProjectionMatrixInverse;
		uniform float lumaPhi;
		uniform float depthPhi;
		uniform float normalPhi;
		uniform float radius;
		uniform int index;

		#include <common>
		#include <packing>

		#ifndef SAMPLE_LUMINANCE
		#define SAMPLE_LUMINANCE dot(vec3(0.2125, 0.7154, 0.0721), a)
		#endif

		#ifndef FRAGMENT_OUTPUT
		#define FRAGMENT_OUTPUT vec4(denoised, 1.)
		#endif

		float getLuminance(const in vec3 a) {
			return SAMPLE_LUMINANCE;
		}

		const vec3 poissonDisk[SAMPLES] = SAMPLE_VECTORS;

		vec3 getViewPosition(const in vec2 screenPosition, const in float depth) {
			vec4 clipSpacePosition = vec4(vec3(screenPosition, depth) * 2.0 - 1.0, 1.0);
			vec4 viewSpacePosition = cameraProjectionMatrixInverse * clipSpacePosition;
			return viewSpacePosition.xyz / viewSpacePosition.w;
		}

		float getDepth(const vec2 uv) {
		#if DEPTH_VALUE_SOURCE == 1
			return textureLod(tDepth, uv.xy, 0.0).a;
		#else
			return textureLod(tDepth, uv.xy, 0.0).r;
		#endif
		}

		float fetchDepth(const ivec2 uv) {
			#if DEPTH_VALUE_SOURCE == 1
				return texelFetch(tDepth, uv.xy, 0).a;
			#else
				return texelFetch(tDepth, uv.xy, 0).r;
			#endif
		}

		vec3 computeNormalFromDepth(const vec2 uv) {
			vec2 size = vec2(textureSize(tDepth, 0));
			ivec2 p = ivec2(uv * size);
			float c0 = fetchDepth(p);
			float l2 = fetchDepth(p - ivec2(2, 0));
			float l1 = fetchDepth(p - ivec2(1, 0));
			float r1 = fetchDepth(p + ivec2(1, 0));
			float r2 = fetchDepth(p + ivec2(2, 0));
			float b2 = fetchDepth(p - ivec2(0, 2));
			float b1 = fetchDepth(p - ivec2(0, 1));
			float t1 = fetchDepth(p + ivec2(0, 1));
			float t2 = fetchDepth(p + ivec2(0, 2));
			float dl = abs((2.0 * l1 - l2) - c0);
			float dr = abs((2.0 * r1 - r2) - c0);
			float db = abs((2.0 * b1 - b2) - c0);
			float dt = abs((2.0 * t1 - t2) - c0);
			vec3 ce = getViewPosition(uv, c0).xyz;
			vec3 dpdx = (dl < dr) ?  ce - getViewPosition((uv - vec2(1.0 / size.x, 0.0)), l1).xyz
									: -ce + getViewPosition((uv + vec2(1.0 / size.x, 0.0)), r1).xyz;
			vec3 dpdy = (db < dt) ?  ce - getViewPosition((uv - vec2(0.0, 1.0 / size.y)), b1).xyz
									: -ce + getViewPosition((uv + vec2(0.0, 1.0 / size.y)), t1).xyz;
			return normalize(cross(dpdx, dpdy));
		}

		vec3 getViewNormal(const vec2 uv) {
		#if NORMAL_VECTOR_TYPE == 2
			return normalize(textureLod(tNormal, uv, 0.).rgb);
		#elif NORMAL_VECTOR_TYPE == 1
			return unpackRGBToNormal(textureLod(tNormal, uv, 0.).rgb);
		#else
			return computeNormalFromDepth(uv);
		#endif
		}

		void denoiseSample(in vec3 center, in vec3 viewNormal, in vec3 viewPos, in vec2 sampleUv, inout vec3 denoised, inout float totalWeight) {
			vec4 sampleTexel = textureLod(tDiffuse, sampleUv, 0.0);
			float sampleDepth = getDepth(sampleUv);
			vec3 sampleNormal = getViewNormal(sampleUv);
			vec3 neighborColor = sampleTexel.rgb;
			vec3 viewPosSample = getViewPosition(sampleUv, sampleDepth);

			float normalDiff = dot(viewNormal, sampleNormal);
			float normalSimilarity = pow(max(normalDiff, 0.), normalPhi);
			float lumaDiff = abs(getLuminance(neighborColor) - getLuminance(center));
			float lumaSimilarity = max(1.0 - lumaDiff / lumaPhi, 0.0);
			float depthDiff = abs(dot(viewPos - viewPosSample, viewNormal));
			float depthSimilarity = max(1. - depthDiff / depthPhi, 0.);
			float w = lumaSimilarity * depthSimilarity * normalSimilarity;

			denoised += w * neighborColor;
			totalWeight += w;
		}

		void main() {
			float depth = getDepth(vUv.xy);
			vec3 viewNormal = getViewNormal(vUv);
			if (depth == 1. || dot(viewNormal, viewNormal) == 0.) {
				discard;
				return;
			}
			vec4 texel = textureLod(tDiffuse, vUv, 0.0);
			vec3 center = texel.rgb;
			vec3 viewPos = getViewPosition(vUv, depth);

			vec2 noiseResolution = vec2(textureSize(tNoise, 0));
			vec2 noiseUv = vUv * resolution / noiseResolution;
			vec4 noiseTexel = textureLod(tNoise, noiseUv, 0.0);
      		vec2 noiseVec = vec2(sin(noiseTexel[index % 4] * 2. * PI), cos(noiseTexel[index % 4] * 2. * PI));
    		mat2 rotationMatrix = mat2(noiseVec.x, -noiseVec.y, noiseVec.x, noiseVec.y);

			float totalWeight = 1.0;
			vec3 denoised = texel.rgb;
			for (int i = 0; i < SAMPLES; i++) {
				vec3 sampleDir = poissonDisk[i];
				vec2 offset = rotationMatrix * (sampleDir.xy * (1. + sampleDir.z * (radius - 1.)) / resolution);
				vec2 sampleUv = vUv + offset;
				denoiseSample(center, viewNormal, viewPos, sampleUv, denoised, totalWeight);
			}

			if (totalWeight > 0.) {
				denoised /= totalWeight;
			}
			gl_FragColor = FRAGMENT_OUTPUT;
		}`};function h(e,t,r){let s=function(e,t,r){let s=[];for(let a=0;a<e;a++){let n=2*Math.PI*t*a/e,o=Math.pow(a/(e-1),r);s.push(new i.Pq0(Math.cos(n),Math.sin(n),o))}return s}(e,t,r),a="vec3[SAMPLES](";for(let t=0;t<e;t++){let r=s[t];a+=`vec3(${r.x}, ${r.y}, ${r.z})${t<e-1?",":")"}`}return a}var u=r(2049);class c{constructor(e=Math){this.grad3=[[1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],[1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],[0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1]],this.grad4=[[0,1,1,1],[0,1,1,-1],[0,1,-1,1],[0,1,-1,-1],[0,-1,1,1],[0,-1,1,-1],[0,-1,-1,1],[0,-1,-1,-1],[1,0,1,1],[1,0,1,-1],[1,0,-1,1],[1,0,-1,-1],[-1,0,1,1],[-1,0,1,-1],[-1,0,-1,1],[-1,0,-1,-1],[1,1,0,1],[1,1,0,-1],[1,-1,0,1],[1,-1,0,-1],[-1,1,0,1],[-1,1,0,-1],[-1,-1,0,1],[-1,-1,0,-1],[1,1,1,0],[1,1,-1,0],[1,-1,1,0],[1,-1,-1,0],[-1,1,1,0],[-1,1,-1,0],[-1,-1,1,0],[-1,-1,-1,0]],this.p=[];for(let t=0;t<256;t++)this.p[t]=Math.floor(256*e.random());this.perm=[];for(let e=0;e<512;e++)this.perm[e]=this.p[255&e];this.simplex=[[0,1,2,3],[0,1,3,2],[0,0,0,0],[0,2,3,1],[0,0,0,0],[0,0,0,0],[0,0,0,0],[1,2,3,0],[0,2,1,3],[0,0,0,0],[0,3,1,2],[0,3,2,1],[0,0,0,0],[0,0,0,0],[0,0,0,0],[1,3,2,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[1,2,0,3],[0,0,0,0],[1,3,0,2],[0,0,0,0],[0,0,0,0],[0,0,0,0],[2,3,0,1],[2,3,1,0],[1,0,2,3],[1,0,3,2],[0,0,0,0],[0,0,0,0],[0,0,0,0],[2,0,3,1],[0,0,0,0],[2,1,3,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[2,0,1,3],[0,0,0,0],[0,0,0,0],[0,0,0,0],[3,0,1,2],[3,0,2,1],[0,0,0,0],[3,1,2,0],[2,1,0,3],[0,0,0,0],[0,0,0,0],[0,0,0,0],[3,1,0,2],[0,0,0,0],[3,2,0,1],[3,2,1,0]]}noise(e,t){let r,i,s,a,n,o=.5*(Math.sqrt(3)-1)*(e+t),l=Math.floor(e+o),h=Math.floor(t+o),u=(3-Math.sqrt(3))/6,c=(l+h)*u,d=e-(l-c),f=t-(h-c);d>f?(a=1,n=0):(a=0,n=1);let m=d-a+u,p=f-n+u,v=d-1+2*u,g=f-1+2*u,x=255&l,T=255&h,M=this.perm[x+this.perm[T]]%12,_=this.perm[x+a+this.perm[T+n]]%12,S=this.perm[x+1+this.perm[T+1]]%12,R=.5-d*d-f*f;R<0?r=0:(R*=R,r=R*R*this._dot(this.grad3[M],d,f));let w=.5-m*m-p*p;w<0?i=0:(w*=w,i=w*w*this._dot(this.grad3[_],m,p));let E=.5-v*v-g*g;return E<0?s=0:(E*=E,s=E*E*this._dot(this.grad3[S],v,g)),70*(r+i+s)}noise3d(e,t,r){let i,s,a,n,o,l,h,u,c,d,f=1/3*(e+t+r),m=Math.floor(e+f),p=Math.floor(t+f),v=Math.floor(r+f),g=1/6*(m+p+v),x=e-(m-g),T=t-(p-g),M=r-(v-g);x>=T?T>=M?(o=1,l=0,h=0,u=1,c=1,d=0):(x>=M?(o=1,l=0,h=0):(o=0,l=0,h=1),u=1,c=0,d=1):T<M?(o=0,l=0,h=1,u=0,c=1,d=1):x<M?(o=0,l=1,h=0,u=0,c=1,d=1):(o=0,l=1,h=0,u=1,c=1,d=0);let _=x-o+1/6,S=T-l+1/6,R=M-h+1/6,w=x-u+1/6*2,E=T-c+1/6*2,P=M-d+1/6*2,C=x-1+1/6*3,b=T-1+1/6*3,A=M-1+1/6*3,y=255&m,N=255&p,I=255&v,D=this.perm[y+this.perm[N+this.perm[I]]]%12,L=this.perm[y+o+this.perm[N+l+this.perm[I+h]]]%12,O=this.perm[y+u+this.perm[N+c+this.perm[I+d]]]%12,U=this.perm[y+1+this.perm[N+1+this.perm[I+1]]]%12,F=.6-x*x-T*T-M*M;F<0?i=0:(F*=F,i=F*F*this._dot3(this.grad3[D],x,T,M));let H=.6-_*_-S*S-R*R;H<0?s=0:(H*=H,s=H*H*this._dot3(this.grad3[L],_,S,R));let k=.6-w*w-E*E-P*P;k<0?a=0:(k*=k,a=k*k*this._dot3(this.grad3[O],w,E,P));let B=.6-C*C-b*b-A*A;return B<0?n=0:(B*=B,n=B*B*this._dot3(this.grad3[U],C,b,A)),32*(i+s+a+n)}noise4d(e,t,r,i){let s,a,n,o,l,h=this.grad4,u=this.simplex,c=this.perm,d=(5-Math.sqrt(5))/20,f=(Math.sqrt(5)-1)/4*(e+t+r+i),m=Math.floor(e+f),p=Math.floor(t+f),v=Math.floor(r+f),g=Math.floor(i+f),x=(m+p+v+g)*d,T=e-(m-x),M=t-(p-x),_=r-(v-x),S=i-(g-x),R=32*(T>M)+16*(T>_)+8*(M>_)+4*(T>S)+2*(M>S)+ +(_>S),w=+(u[R][0]>=3),E=+(u[R][1]>=3),P=+(u[R][2]>=3),C=+(u[R][3]>=3),b=+(u[R][0]>=2),A=+(u[R][1]>=2),y=+(u[R][2]>=2),N=+(u[R][3]>=2),I=+(u[R][0]>=1),D=+(u[R][1]>=1),L=+(u[R][2]>=1),O=+(u[R][3]>=1),U=T-w+d,F=M-E+d,H=_-P+d,k=S-C+d,B=T-b+2*d,V=M-A+2*d,z=_-y+2*d,G=S-N+2*d,j=T-I+3*d,K=M-D+3*d,X=_-L+3*d,q=S-O+3*d,W=T-1+4*d,Y=M-1+4*d,Q=_-1+4*d,Z=S-1+4*d,J=255&m,$=255&p,ee=255&v,et=255&g,er=c[J+c[$+c[ee+c[et]]]]%32,ei=c[J+w+c[$+E+c[ee+P+c[et+C]]]]%32,es=c[J+b+c[$+A+c[ee+y+c[et+N]]]]%32,ea=c[J+I+c[$+D+c[ee+L+c[et+O]]]]%32,en=c[J+1+c[$+1+c[ee+1+c[et+1]]]]%32,eo=.6-T*T-M*M-_*_-S*S;eo<0?s=0:(eo*=eo,s=eo*eo*this._dot4(h[er],T,M,_,S));let el=.6-U*U-F*F-H*H-k*k;el<0?a=0:(el*=el,a=el*el*this._dot4(h[ei],U,F,H,k));let eh=.6-B*B-V*V-z*z-G*G;eh<0?n=0:(eh*=eh,n=eh*eh*this._dot4(h[es],B,V,z,G));let eu=.6-j*j-K*K-X*X-q*q;eu<0?o=0:(eu*=eu,o=eu*eu*this._dot4(h[ea],j,K,X,q));let ec=.6-W*W-Y*Y-Q*Q-Z*Z;return ec<0?l=0:(ec*=ec,l=ec*ec*this._dot4(h[en],W,Y,Q,Z)),27*(s+a+n+o+l)}_dot(e,t,r){return e[0]*t+e[1]*r}_dot3(e,t,r,i){return e[0]*t+e[1]*r+e[2]*i}_dot4(e,t,r,i,s){return e[0]*t+e[1]*r+e[2]*i+e[3]*s}}class d extends s.o{constructor(e,t,r=512,h=512,c,d,f){super(),this.width=r,this.height=h,this.clear=!0,this.camera=t,this.scene=e,this.output=0,this._renderGBuffer=!0,this._visibilityCache=new Map,this.blendIntensity=1,this.pdRings=2,this.pdRadiusExponent=2,this.pdSamples=16,this.gtaoNoiseTexture=function(e=5){let t=Math.floor(e)%2==0?Math.floor(e)+1:Math.floor(e),r=function(e){let t=Math.floor(e)%2==0?Math.floor(e)+1:Math.floor(e),r=t*t,i=Array(r).fill(0),s=Math.floor(t/2),a=t-1;for(let e=1;e<=r;){if(-1===s&&a===t?(a=t-2,s=0):(a===t&&(a=0),s<0&&(s=t-1)),0!==i[s*t+a]){a-=2,s++;continue}i[s*t+a]=e++,a++,s--}return i}(t),s=r.length,a=new Uint8Array(4*s);for(let e=0;e<s;++e){let t=2*Math.PI*r[e]/s,n=new i.Pq0(Math.cos(t),Math.sin(t),0).normalize();a[4*e]=(.5*n.x+.5)*255,a[4*e+1]=(.5*n.y+.5)*255,a[4*e+2]=127,a[4*e+3]=255}let n=new i.GYF(a,t,t);return n.wrapS=i.GJx,n.wrapT=i.GJx,n.needsUpdate=!0,n}(),this.pdNoiseTexture=this._generateNoise(),this.gtaoRenderTarget=new i.nWS(this.width,this.height,{type:i.ix0}),this.pdRenderTarget=this.gtaoRenderTarget.clone(),this.gtaoMaterial=new i.BKk({defines:Object.assign({},a.defines),uniforms:i.LlO.clone(a.uniforms),vertexShader:a.vertexShader,fragmentShader:a.fragmentShader,blending:i.XIg,depthTest:!1,depthWrite:!1}),this.gtaoMaterial.defines.PERSPECTIVE_CAMERA=+!!this.camera.isPerspectiveCamera,this.gtaoMaterial.uniforms.tNoise.value=this.gtaoNoiseTexture,this.gtaoMaterial.uniforms.resolution.value.set(this.width,this.height),this.gtaoMaterial.uniforms.cameraNear.value=this.camera.near,this.gtaoMaterial.uniforms.cameraFar.value=this.camera.far,this.normalMaterial=new i.qBx,this.normalMaterial.blending=i.XIg,this.pdMaterial=new i.BKk({defines:Object.assign({},l.defines),uniforms:i.LlO.clone(l.uniforms),vertexShader:l.vertexShader,fragmentShader:l.fragmentShader,depthTest:!1,depthWrite:!1}),this.pdMaterial.uniforms.tDiffuse.value=this.gtaoRenderTarget.texture,this.pdMaterial.uniforms.tNoise.value=this.pdNoiseTexture,this.pdMaterial.uniforms.resolution.value.set(this.width,this.height),this.pdMaterial.uniforms.lumaPhi.value=10,this.pdMaterial.uniforms.depthPhi.value=2,this.pdMaterial.uniforms.normalPhi.value=3,this.pdMaterial.uniforms.radius.value=8,this.depthRenderMaterial=new i.BKk({defines:Object.assign({},n.defines),uniforms:i.LlO.clone(n.uniforms),vertexShader:n.vertexShader,fragmentShader:n.fragmentShader,blending:i.XIg}),this.depthRenderMaterial.uniforms.cameraNear.value=this.camera.near,this.depthRenderMaterial.uniforms.cameraFar.value=this.camera.far,this.copyMaterial=new i.BKk({uniforms:i.LlO.clone(u.Z.uniforms),vertexShader:u.Z.vertexShader,fragmentShader:u.Z.fragmentShader,transparent:!0,depthTest:!1,depthWrite:!1,blendSrc:i.wn6,blendDst:i.ojh,blendEquation:i.gO9,blendSrcAlpha:i.hdd,blendDstAlpha:i.ojh,blendEquationAlpha:i.gO9}),this.blendMaterial=new i.BKk({uniforms:i.LlO.clone(o.uniforms),vertexShader:o.vertexShader,fragmentShader:o.fragmentShader,transparent:!0,depthTest:!1,depthWrite:!1,blending:i.bCz,blendSrc:i.wn6,blendDst:i.ojh,blendEquation:i.gO9,blendSrcAlpha:i.hdd,blendDstAlpha:i.ojh,blendEquationAlpha:i.gO9}),this._fsQuad=new s.F(null),this._originalClearColor=new i.Q1f,this.setGBuffer(c?c.depthTexture:void 0,c?c.normalTexture:void 0),void 0!==d&&this.updateGtaoMaterial(d),void 0!==f&&this.updatePdMaterial(f)}setSize(e,t){this.width=e,this.height=t,this.gtaoRenderTarget.setSize(e,t),this.normalRenderTarget.setSize(e,t),this.pdRenderTarget.setSize(e,t),this.gtaoMaterial.uniforms.resolution.value.set(e,t),this.gtaoMaterial.uniforms.cameraProjectionMatrix.value.copy(this.camera.projectionMatrix),this.gtaoMaterial.uniforms.cameraProjectionMatrixInverse.value.copy(this.camera.projectionMatrixInverse),this.pdMaterial.uniforms.resolution.value.set(e,t),this.pdMaterial.uniforms.cameraProjectionMatrixInverse.value.copy(this.camera.projectionMatrixInverse)}dispose(){this.gtaoNoiseTexture.dispose(),this.pdNoiseTexture.dispose(),this.normalRenderTarget.dispose(),this.gtaoRenderTarget.dispose(),this.pdRenderTarget.dispose(),this.normalMaterial.dispose(),this.pdMaterial.dispose(),this.copyMaterial.dispose(),this.depthRenderMaterial.dispose(),this._fsQuad.dispose()}get gtaoMap(){return this.pdRenderTarget.texture}setGBuffer(e,t){void 0!==e?(this.depthTexture=e,this.normalTexture=t,this._renderGBuffer=!1):(this.depthTexture=new i.VCu,this.depthTexture.format=i.dcC,this.depthTexture.type=i.V3x,this.normalRenderTarget=new i.nWS(this.width,this.height,{minFilter:i.hxR,magFilter:i.hxR,type:i.ix0,depthTexture:this.depthTexture}),this.normalTexture=this.normalRenderTarget.texture,this._renderGBuffer=!0);let r=+!!this.normalTexture,s=this.depthTexture===this.normalTexture?"w":"x";this.gtaoMaterial.defines.NORMAL_VECTOR_TYPE=r,this.gtaoMaterial.defines.DEPTH_SWIZZLING=s,this.gtaoMaterial.uniforms.tNormal.value=this.normalTexture,this.gtaoMaterial.uniforms.tDepth.value=this.depthTexture,this.pdMaterial.defines.NORMAL_VECTOR_TYPE=r,this.pdMaterial.defines.DEPTH_SWIZZLING=s,this.pdMaterial.uniforms.tNormal.value=this.normalTexture,this.pdMaterial.uniforms.tDepth.value=this.depthTexture,this.depthRenderMaterial.uniforms.tDepth.value=this.normalRenderTarget.depthTexture}setSceneClipBox(e){e?(this.gtaoMaterial.needsUpdate=1!==this.gtaoMaterial.defines.SCENE_CLIP_BOX,this.gtaoMaterial.defines.SCENE_CLIP_BOX=1,this.gtaoMaterial.uniforms.sceneBoxMin.value.copy(e.min),this.gtaoMaterial.uniforms.sceneBoxMax.value.copy(e.max)):(this.gtaoMaterial.needsUpdate=0===this.gtaoMaterial.defines.SCENE_CLIP_BOX,this.gtaoMaterial.defines.SCENE_CLIP_BOX=0)}updateGtaoMaterial(e){void 0!==e.radius&&(this.gtaoMaterial.uniforms.radius.value=e.radius),void 0!==e.distanceExponent&&(this.gtaoMaterial.uniforms.distanceExponent.value=e.distanceExponent),void 0!==e.thickness&&(this.gtaoMaterial.uniforms.thickness.value=e.thickness),void 0!==e.distanceFallOff&&(this.gtaoMaterial.uniforms.distanceFallOff.value=e.distanceFallOff,this.gtaoMaterial.needsUpdate=!0),void 0!==e.scale&&(this.gtaoMaterial.uniforms.scale.value=e.scale),void 0!==e.samples&&e.samples!==this.gtaoMaterial.defines.SAMPLES&&(this.gtaoMaterial.defines.SAMPLES=e.samples,this.gtaoMaterial.needsUpdate=!0),void 0!==e.screenSpaceRadius&&+!!e.screenSpaceRadius!==this.gtaoMaterial.defines.SCREEN_SPACE_RADIUS&&(this.gtaoMaterial.defines.SCREEN_SPACE_RADIUS=+!!e.screenSpaceRadius,this.gtaoMaterial.needsUpdate=!0)}updatePdMaterial(e){let t=!1;void 0!==e.lumaPhi&&(this.pdMaterial.uniforms.lumaPhi.value=e.lumaPhi),void 0!==e.depthPhi&&(this.pdMaterial.uniforms.depthPhi.value=e.depthPhi),void 0!==e.normalPhi&&(this.pdMaterial.uniforms.normalPhi.value=e.normalPhi),void 0!==e.radius&&e.radius!==this.radius&&(this.pdMaterial.uniforms.radius.value=e.radius),void 0!==e.radiusExponent&&e.radiusExponent!==this.pdRadiusExponent&&(this.pdRadiusExponent=e.radiusExponent,t=!0),void 0!==e.rings&&e.rings!==this.pdRings&&(this.pdRings=e.rings,t=!0),void 0!==e.samples&&e.samples!==this.pdSamples&&(this.pdSamples=e.samples,t=!0),t&&(this.pdMaterial.defines.SAMPLES=this.pdSamples,this.pdMaterial.defines.SAMPLE_VECTORS=h(this.pdSamples,this.pdRings,this.pdRadiusExponent),this.pdMaterial.needsUpdate=!0)}render(e,t,r){switch(this._renderGBuffer&&(this._overrideVisibility(),this._renderOverride(e,this.normalMaterial,this.normalRenderTarget,7829503,1),this._restoreVisibility()),this.gtaoMaterial.uniforms.cameraNear.value=this.camera.near,this.gtaoMaterial.uniforms.cameraFar.value=this.camera.far,this.gtaoMaterial.uniforms.cameraProjectionMatrix.value.copy(this.camera.projectionMatrix),this.gtaoMaterial.uniforms.cameraProjectionMatrixInverse.value.copy(this.camera.projectionMatrixInverse),this.gtaoMaterial.uniforms.cameraWorldMatrix.value.copy(this.camera.matrixWorld),this._renderPass(e,this.gtaoMaterial,this.gtaoRenderTarget,0xffffff,1),this.pdMaterial.uniforms.cameraProjectionMatrixInverse.value.copy(this.camera.projectionMatrixInverse),this._renderPass(e,this.pdMaterial,this.pdRenderTarget,0xffffff,1),this.output){case d.OUTPUT.Off:break;case d.OUTPUT.Diffuse:this.copyMaterial.uniforms.tDiffuse.value=r.texture,this.copyMaterial.blending=i.XIg,this._renderPass(e,this.copyMaterial,this.renderToScreen?null:t);break;case d.OUTPUT.AO:this.copyMaterial.uniforms.tDiffuse.value=this.gtaoRenderTarget.texture,this.copyMaterial.blending=i.XIg,this._renderPass(e,this.copyMaterial,this.renderToScreen?null:t);break;case d.OUTPUT.Denoise:this.copyMaterial.uniforms.tDiffuse.value=this.pdRenderTarget.texture,this.copyMaterial.blending=i.XIg,this._renderPass(e,this.copyMaterial,this.renderToScreen?null:t);break;case d.OUTPUT.Depth:this.depthRenderMaterial.uniforms.cameraNear.value=this.camera.near,this.depthRenderMaterial.uniforms.cameraFar.value=this.camera.far,this._renderPass(e,this.depthRenderMaterial,this.renderToScreen?null:t);break;case d.OUTPUT.Normal:this.copyMaterial.uniforms.tDiffuse.value=this.normalRenderTarget.texture,this.copyMaterial.blending=i.XIg,this._renderPass(e,this.copyMaterial,this.renderToScreen?null:t);break;case d.OUTPUT.Default:this.copyMaterial.uniforms.tDiffuse.value=r.texture,this.copyMaterial.blending=i.XIg,this._renderPass(e,this.copyMaterial,this.renderToScreen?null:t),this.blendMaterial.uniforms.intensity.value=this.blendIntensity,this.blendMaterial.uniforms.tDiffuse.value=this.pdRenderTarget.texture,this._renderPass(e,this.blendMaterial,this.renderToScreen?null:t);break;default:console.warn("THREE.GTAOPass: Unknown output type.")}}_renderPass(e,t,r,i,s){e.getClearColor(this._originalClearColor);let a=e.getClearAlpha(),n=e.autoClear;e.setRenderTarget(r),e.autoClear=!1,null!=i&&(e.setClearColor(i),e.setClearAlpha(s||0),e.clear()),this._fsQuad.material=t,this._fsQuad.render(e),e.autoClear=n,e.setClearColor(this._originalClearColor),e.setClearAlpha(a)}_renderOverride(e,t,r,i,s){e.getClearColor(this._originalClearColor);let a=e.getClearAlpha(),n=e.autoClear;e.setRenderTarget(r),e.autoClear=!1,i=t.clearColor||i,s=t.clearAlpha||s,null!=i&&(e.setClearColor(i),e.setClearAlpha(s||0),e.clear()),this.scene.overrideMaterial=t,e.render(this.scene,this.camera),this.scene.overrideMaterial=null,e.autoClear=n,e.setClearColor(this._originalClearColor),e.setClearAlpha(a)}_overrideVisibility(){let e=this.scene,t=this._visibilityCache;e.traverse(function(e){t.set(e,e.visible),(e.isPoints||e.isLine)&&(e.visible=!1)})}_restoreVisibility(){let e=this.scene,t=this._visibilityCache;e.traverse(function(e){let r=t.get(e);e.visible=r}),t.clear()}_generateNoise(e=64){let t=new c,r=new Uint8Array(e*e*4);for(let i=0;i<e;i++)for(let s=0;s<e;s++){let a=i,n=s;r[(i*e+s)*4]=(.5*t.noise(a,n)+.5)*255,r[(i*e+s)*4+1]=(.5*t.noise(a+e,n)+.5)*255,r[(i*e+s)*4+2]=(.5*t.noise(a,n+e)+.5)*255,r[(i*e+s)*4+3]=(.5*t.noise(a+e,n+e)+.5)*255}let s=new i.GYF(r,e,e,i.GWd,i.OUM);return s.wrapS=i.GJx,s.wrapT=i.GJx,s.needsUpdate=!0,s}}d.OUTPUT={Off:-1,Default:0,Diffuse:1,Depth:2,Normal:3,AO:4,Denoise:5}},3264:(e,t,r)=>{r.d(t,{p:()=>a});var i=r(5339),s=r(3617);class a extends s.o{constructor(e,t="tDiffuse"){super(),this.textureID=t,this.uniforms=null,this.material=null,e instanceof i.BKk?(this.uniforms=e.uniforms,this.material=e):e&&(this.uniforms=i.LlO.clone(e.uniforms),this.material=new i.BKk({name:void 0!==e.name?e.name:"unspecified",defines:Object.assign({},e.defines),uniforms:this.uniforms,vertexShader:e.vertexShader,fragmentShader:e.fragmentShader})),this._fsQuad=new s.F(this.material)}render(e,t,r){this.uniforms[this.textureID]&&(this.uniforms[this.textureID].value=r.texture),this._fsQuad.material=this.material,this.renderToScreen?e.setRenderTarget(null):(e.setRenderTarget(t),this.clear&&e.clear(e.autoClearColor,e.autoClearDepth,e.autoClearStencil)),this._fsQuad.render(e)}dispose(){this.material.dispose(),this._fsQuad.dispose()}}},3464:(e,t,r)=>{r.d(t,{X:()=>n});var i=r(5339),s=r(3617);let a={name:"OutputShader",uniforms:{tDiffuse:{value:null},toneMappingExposure:{value:1}},vertexShader:`
		precision highp float;

		uniform mat4 modelViewMatrix;
		uniform mat4 projectionMatrix;

		attribute vec3 position;
		attribute vec2 uv;

		varying vec2 vUv;

		void main() {

			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,fragmentShader:`

		precision highp float;

		uniform sampler2D tDiffuse;

		#include <tonemapping_pars_fragment>
		#include <colorspace_pars_fragment>

		varying vec2 vUv;

		void main() {

			gl_FragColor = texture2D( tDiffuse, vUv );

			// tone mapping

			#ifdef LINEAR_TONE_MAPPING

				gl_FragColor.rgb = LinearToneMapping( gl_FragColor.rgb );

			#elif defined( REINHARD_TONE_MAPPING )

				gl_FragColor.rgb = ReinhardToneMapping( gl_FragColor.rgb );

			#elif defined( CINEON_TONE_MAPPING )

				gl_FragColor.rgb = CineonToneMapping( gl_FragColor.rgb );

			#elif defined( ACES_FILMIC_TONE_MAPPING )

				gl_FragColor.rgb = ACESFilmicToneMapping( gl_FragColor.rgb );

			#elif defined( AGX_TONE_MAPPING )

				gl_FragColor.rgb = AgXToneMapping( gl_FragColor.rgb );

			#elif defined( NEUTRAL_TONE_MAPPING )

				gl_FragColor.rgb = NeutralToneMapping( gl_FragColor.rgb );

			#elif defined( CUSTOM_TONE_MAPPING )

				gl_FragColor.rgb = CustomToneMapping( gl_FragColor.rgb );

			#endif

			// color space

			#ifdef SRGB_TRANSFER

				gl_FragColor = sRGBTransferOETF( gl_FragColor );

			#endif

		}`};class n extends s.o{constructor(){super(),this.uniforms=i.LlO.clone(a.uniforms),this.material=new i.D$Q({name:a.name,uniforms:this.uniforms,vertexShader:a.vertexShader,fragmentShader:a.fragmentShader}),this._fsQuad=new s.F(this.material),this._outputColorSpace=null,this._toneMapping=null}render(e,t,r){this.uniforms.tDiffuse.value=r.texture,this.uniforms.toneMappingExposure.value=e.toneMappingExposure,(this._outputColorSpace!==e.outputColorSpace||this._toneMapping!==e.toneMapping)&&(this._outputColorSpace=e.outputColorSpace,this._toneMapping=e.toneMapping,this.material.defines={},i.ppV.getTransfer(this._outputColorSpace)===i.KLL&&(this.material.defines.SRGB_TRANSFER=""),this._toneMapping===i.kyO?this.material.defines.LINEAR_TONE_MAPPING="":this._toneMapping===i.Mjd?this.material.defines.REINHARD_TONE_MAPPING="":this._toneMapping===i.nNL?this.material.defines.CINEON_TONE_MAPPING="":this._toneMapping===i.FV?this.material.defines.ACES_FILMIC_TONE_MAPPING="":this._toneMapping===i.LAk?this.material.defines.AGX_TONE_MAPPING="":this._toneMapping===i.aJ8?this.material.defines.NEUTRAL_TONE_MAPPING="":this._toneMapping===i.g7M&&(this.material.defines.CUSTOM_TONE_MAPPING=""),this.material.needsUpdate=!0),!0===this.renderToScreen?e.setRenderTarget(null):(e.setRenderTarget(t),this.clear&&e.clear(e.autoClearColor,e.autoClearDepth,e.autoClearStencil)),this._fsQuad.render(e)}dispose(){this.material.dispose(),this._fsQuad.dispose()}}},3617:(e,t,r)=>{r.d(t,{F:()=>l,o:()=>s});var i=r(5339);class s{constructor(){this.isPass=!0,this.enabled=!0,this.needsSwap=!0,this.clear=!1,this.renderToScreen=!1}setSize(){}render(){console.error("THREE.Pass: .render() must be implemented in derived pass.")}dispose(){}}let a=new i.qUd(-1,1,1,-1,0,1);class n extends i.LoY{constructor(){super(),this.setAttribute("position",new i.qtW([-1,3,0,-1,-1,0,3,-1,0],3)),this.setAttribute("uv",new i.qtW([0,2,0,0,2,0],2))}}let o=new n;class l{constructor(e){this._mesh=new i.eaF(o,e)}dispose(){this._mesh.geometry.dispose()}render(e){e.render(this._mesh,a)}get material(){return this._mesh.material}set material(e){this._mesh.material=e}}},4497:(e,t,r)=>{r.d(t,{s:()=>h});var i=r(5339),s=r(2049),a=r(3264),n=r(3617);class o extends n.o{constructor(e,t){super(),this.scene=e,this.camera=t,this.clear=!0,this.needsSwap=!1,this.inverse=!1}render(e,t,r){let i,s,a=e.getContext(),n=e.state;n.buffers.color.setMask(!1),n.buffers.depth.setMask(!1),n.buffers.color.setLocked(!0),n.buffers.depth.setLocked(!0),this.inverse?(i=0,s=1):(i=1,s=0),n.buffers.stencil.setTest(!0),n.buffers.stencil.setOp(a.REPLACE,a.REPLACE,a.REPLACE),n.buffers.stencil.setFunc(a.ALWAYS,i,0xffffffff),n.buffers.stencil.setClear(s),n.buffers.stencil.setLocked(!0),e.setRenderTarget(r),this.clear&&e.clear(),e.render(this.scene,this.camera),e.setRenderTarget(t),this.clear&&e.clear(),e.render(this.scene,this.camera),n.buffers.color.setLocked(!1),n.buffers.depth.setLocked(!1),n.buffers.color.setMask(!0),n.buffers.depth.setMask(!0),n.buffers.stencil.setLocked(!1),n.buffers.stencil.setFunc(a.EQUAL,1,0xffffffff),n.buffers.stencil.setOp(a.KEEP,a.KEEP,a.KEEP),n.buffers.stencil.setLocked(!0)}}class l extends n.o{constructor(){super(),this.needsSwap=!1}render(e){e.state.buffers.stencil.setLocked(!1),e.state.buffers.stencil.setTest(!1)}}class h{constructor(e,t){if(this.renderer=e,this._pixelRatio=e.getPixelRatio(),void 0===t){let r=e.getSize(new i.I9Y);this._width=r.width,this._height=r.height,(t=new i.nWS(this._width*this._pixelRatio,this._height*this._pixelRatio,{type:i.ix0})).texture.name="EffectComposer.rt1"}else this._width=t.width,this._height=t.height;this.renderTarget1=t,this.renderTarget2=t.clone(),this.renderTarget2.texture.name="EffectComposer.rt2",this.writeBuffer=this.renderTarget1,this.readBuffer=this.renderTarget2,this.renderToScreen=!0,this.passes=[],this.copyPass=new a.p(s.Z),this.copyPass.material.blending=i.XIg,this.clock=new i.zD7}swapBuffers(){let e=this.readBuffer;this.readBuffer=this.writeBuffer,this.writeBuffer=e}addPass(e){this.passes.push(e),e.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}insertPass(e,t){this.passes.splice(t,0,e),e.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}removePass(e){let t=this.passes.indexOf(e);-1!==t&&this.passes.splice(t,1)}isLastEnabledPass(e){for(let t=e+1;t<this.passes.length;t++)if(this.passes[t].enabled)return!1;return!0}render(e){void 0===e&&(e=this.clock.getDelta());let t=this.renderer.getRenderTarget(),r=!1;for(let t=0,i=this.passes.length;t<i;t++){let i=this.passes[t];if(!1!==i.enabled){if(i.renderToScreen=this.renderToScreen&&this.isLastEnabledPass(t),i.render(this.renderer,this.writeBuffer,this.readBuffer,e,r),i.needsSwap){if(r){let t=this.renderer.getContext(),r=this.renderer.state.buffers.stencil;r.setFunc(t.NOTEQUAL,1,0xffffffff),this.copyPass.render(this.renderer,this.writeBuffer,this.readBuffer,e),r.setFunc(t.EQUAL,1,0xffffffff)}this.swapBuffers()}void 0!==o&&(i instanceof o?r=!0:i instanceof l&&(r=!1))}}this.renderer.setRenderTarget(t)}reset(e){if(void 0===e){let t=this.renderer.getSize(new i.I9Y);this._pixelRatio=this.renderer.getPixelRatio(),this._width=t.width,this._height=t.height,(e=this.renderTarget1.clone()).setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}this.renderTarget1.dispose(),this.renderTarget2.dispose(),this.renderTarget1=e,this.renderTarget2=e.clone(),this.writeBuffer=this.renderTarget1,this.readBuffer=this.renderTarget2}setSize(e,t){this._width=e,this._height=t;let r=this._width*this._pixelRatio,i=this._height*this._pixelRatio;this.renderTarget1.setSize(r,i),this.renderTarget2.setSize(r,i);for(let e=0;e<this.passes.length;e++)this.passes[e].setSize(r,i)}setPixelRatio(e){this._pixelRatio=e,this.setSize(this._width,this._height)}dispose(){this.renderTarget1.dispose(),this.renderTarget2.dispose(),this.copyPass.dispose()}}},6170:(e,t,r)=>{r.d(t,{A:()=>a});var i=r(5339),s=r(3617);class a extends s.o{constructor(e,t,r=null,s=null,a=null){super(),this.scene=e,this.camera=t,this.overrideMaterial=r,this.clearColor=s,this.clearAlpha=a,this.clear=!0,this.clearDepth=!1,this.needsSwap=!1,this._oldClearColor=new i.Q1f}render(e,t,r){let i,s,a=e.autoClear;e.autoClear=!1,null!==this.overrideMaterial&&(s=this.scene.overrideMaterial,this.scene.overrideMaterial=this.overrideMaterial),null!==this.clearColor&&(e.getClearColor(this._oldClearColor),e.setClearColor(this.clearColor,e.getClearAlpha())),null!==this.clearAlpha&&(i=e.getClearAlpha(),e.setClearAlpha(this.clearAlpha)),!0==this.clearDepth&&e.clearDepth(),e.setRenderTarget(this.renderToScreen?null:r),!0===this.clear&&e.clear(e.autoClearColor,e.autoClearDepth,e.autoClearStencil),e.render(this.scene,this.camera),null!==this.clearColor&&e.setClearColor(this._oldClearColor),null!==this.clearAlpha&&e.setClearAlpha(i),null!==this.overrideMaterial&&(this.scene.overrideMaterial=s),e.autoClear=a}}},6319:(e,t,r)=>{r.d(t,{l:()=>s});var i=r(5339);class s extends i.Z58{constructor(){super();let e=new i.iNn;e.deleteAttribute("uv");let t=new i._4j({side:i.hsX}),r=new i._4j,s=new i.HiM(0xffffff,900,28,2);s.position.set(.418,16.199,.3),this.add(s);let n=new i.eaF(e,t);n.position.set(-.757,13.219,.717),n.scale.set(31.713,28.305,28.591),this.add(n);let o=new i.ZLX(e,r,6),l=new i.B69;l.position.set(-10.906,2.009,1.846),l.rotation.set(0,-.195,0),l.scale.set(2.328,7.905,4.651),l.updateMatrix(),o.setMatrixAt(0,l.matrix),l.position.set(-5.607,-.754,-.758),l.rotation.set(0,.994,0),l.scale.set(1.97,1.534,3.955),l.updateMatrix(),o.setMatrixAt(1,l.matrix),l.position.set(6.167,.857,7.803),l.rotation.set(0,.561,0),l.scale.set(3.927,6.285,3.687),l.updateMatrix(),o.setMatrixAt(2,l.matrix),l.position.set(-2.017,.018,6.124),l.rotation.set(0,.333,0),l.scale.set(2.002,4.566,2.064),l.updateMatrix(),o.setMatrixAt(3,l.matrix),l.position.set(2.291,-.756,-2.621),l.rotation.set(0,-.286,0),l.scale.set(1.546,1.552,1.496),l.updateMatrix(),o.setMatrixAt(4,l.matrix),l.position.set(-2.193,-.369,-5.547),l.rotation.set(0,.516,0),l.scale.set(3.875,3.487,2.986),l.updateMatrix(),o.setMatrixAt(5,l.matrix),this.add(o);let h=new i.eaF(e,a(50));h.position.set(-16.116,14.37,8.208),h.scale.set(.1,2.428,2.739),this.add(h);let u=new i.eaF(e,a(50));u.position.set(-16.109,18.021,-8.207),u.scale.set(.1,2.425,2.751),this.add(u);let c=new i.eaF(e,a(17));c.position.set(14.904,12.198,-1.832),c.scale.set(.15,4.265,6.331),this.add(c);let d=new i.eaF(e,a(43));d.position.set(-.462,8.89,14.52),d.scale.set(4.38,5.441,.088),this.add(d);let f=new i.eaF(e,a(20));f.position.set(3.235,11.486,-12.541),f.scale.set(2.5,2,.1),this.add(f);let m=new i.eaF(e,a(100));m.position.set(0,20,0),m.scale.set(1,.1,1),this.add(m)}dispose(){let e=new Set;for(let t of(this.traverse(t=>{t.isMesh&&(e.add(t.geometry),e.add(t.material))}),e))t.dispose()}}function a(e){let t=new i.V9B;return t.color.setScalar(e),t}},6451:(e,t,r)=>{r.d(t,{C:()=>o});var i=r(5339),s=r(3617),a=r(2049);let n={name:"LuminosityHighPassShader",uniforms:{tDiffuse:{value:null},luminosityThreshold:{value:1},smoothWidth:{value:1},defaultColor:{value:new i.Q1f(0)},defaultOpacity:{value:0}},vertexShader:`

		varying vec2 vUv;

		void main() {

			vUv = uv;

			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,fragmentShader:`

		uniform sampler2D tDiffuse;
		uniform vec3 defaultColor;
		uniform float defaultOpacity;
		uniform float luminosityThreshold;
		uniform float smoothWidth;

		varying vec2 vUv;

		void main() {

			vec4 texel = texture2D( tDiffuse, vUv );

			float v = luminance( texel.xyz );

			vec4 outputColor = vec4( defaultColor.rgb, defaultOpacity );

			float alpha = smoothstep( luminosityThreshold, luminosityThreshold + smoothWidth, v );

			gl_FragColor = mix( outputColor, texel, alpha );

		}`};class o extends s.o{constructor(e,t=1,r,o){super(),this.strength=t,this.radius=r,this.threshold=o,this.resolution=void 0!==e?new i.I9Y(e.x,e.y):new i.I9Y(256,256),this.clearColor=new i.Q1f(0,0,0),this.needsSwap=!1,this.renderTargetsHorizontal=[],this.renderTargetsVertical=[],this.nMips=5;let l=Math.round(this.resolution.x/2),h=Math.round(this.resolution.y/2);this.renderTargetBright=new i.nWS(l,h,{type:i.ix0}),this.renderTargetBright.texture.name="UnrealBloomPass.bright",this.renderTargetBright.texture.generateMipmaps=!1;for(let e=0;e<this.nMips;e++){let t=new i.nWS(l,h,{type:i.ix0});t.texture.name="UnrealBloomPass.h"+e,t.texture.generateMipmaps=!1,this.renderTargetsHorizontal.push(t);let r=new i.nWS(l,h,{type:i.ix0});r.texture.name="UnrealBloomPass.v"+e,r.texture.generateMipmaps=!1,this.renderTargetsVertical.push(r),l=Math.round(l/2),h=Math.round(h/2)}this.highPassUniforms=i.LlO.clone(n.uniforms),this.highPassUniforms.luminosityThreshold.value=o,this.highPassUniforms.smoothWidth.value=.01,this.materialHighPassFilter=new i.BKk({uniforms:this.highPassUniforms,vertexShader:n.vertexShader,fragmentShader:n.fragmentShader}),this.separableBlurMaterials=[];let u=[3,5,7,9,11];l=Math.round(this.resolution.x/2),h=Math.round(this.resolution.y/2);for(let e=0;e<this.nMips;e++)this.separableBlurMaterials.push(this._getSeparableBlurMaterial(u[e])),this.separableBlurMaterials[e].uniforms.invSize.value=new i.I9Y(1/l,1/h),l=Math.round(l/2),h=Math.round(h/2);this.compositeMaterial=this._getCompositeMaterial(this.nMips),this.compositeMaterial.uniforms.blurTexture1.value=this.renderTargetsVertical[0].texture,this.compositeMaterial.uniforms.blurTexture2.value=this.renderTargetsVertical[1].texture,this.compositeMaterial.uniforms.blurTexture3.value=this.renderTargetsVertical[2].texture,this.compositeMaterial.uniforms.blurTexture4.value=this.renderTargetsVertical[3].texture,this.compositeMaterial.uniforms.blurTexture5.value=this.renderTargetsVertical[4].texture,this.compositeMaterial.uniforms.bloomStrength.value=t,this.compositeMaterial.uniforms.bloomRadius.value=.1,this.compositeMaterial.uniforms.bloomFactors.value=[1,.8,.6,.4,.2],this.bloomTintColors=[new i.Pq0(1,1,1),new i.Pq0(1,1,1),new i.Pq0(1,1,1),new i.Pq0(1,1,1),new i.Pq0(1,1,1)],this.compositeMaterial.uniforms.bloomTintColors.value=this.bloomTintColors,this.copyUniforms=i.LlO.clone(a.Z.uniforms),this.blendMaterial=new i.BKk({uniforms:this.copyUniforms,vertexShader:a.Z.vertexShader,fragmentShader:a.Z.fragmentShader,blending:i.EZo,depthTest:!1,depthWrite:!1,transparent:!0}),this._oldClearColor=new i.Q1f,this._oldClearAlpha=1,this._basic=new i.V9B,this._fsQuad=new s.F(null)}dispose(){for(let e=0;e<this.renderTargetsHorizontal.length;e++)this.renderTargetsHorizontal[e].dispose();for(let e=0;e<this.renderTargetsVertical.length;e++)this.renderTargetsVertical[e].dispose();this.renderTargetBright.dispose();for(let e=0;e<this.separableBlurMaterials.length;e++)this.separableBlurMaterials[e].dispose();this.compositeMaterial.dispose(),this.blendMaterial.dispose(),this._basic.dispose(),this._fsQuad.dispose()}setSize(e,t){let r=Math.round(e/2),s=Math.round(t/2);this.renderTargetBright.setSize(r,s);for(let e=0;e<this.nMips;e++)this.renderTargetsHorizontal[e].setSize(r,s),this.renderTargetsVertical[e].setSize(r,s),this.separableBlurMaterials[e].uniforms.invSize.value=new i.I9Y(1/r,1/s),r=Math.round(r/2),s=Math.round(s/2)}render(e,t,r,i,s){e.getClearColor(this._oldClearColor),this._oldClearAlpha=e.getClearAlpha();let a=e.autoClear;e.autoClear=!1,e.setClearColor(this.clearColor,0),s&&e.state.buffers.stencil.setTest(!1),this.renderToScreen&&(this._fsQuad.material=this._basic,this._basic.map=r.texture,e.setRenderTarget(null),e.clear(),this._fsQuad.render(e)),this.highPassUniforms.tDiffuse.value=r.texture,this.highPassUniforms.luminosityThreshold.value=this.threshold,this._fsQuad.material=this.materialHighPassFilter,e.setRenderTarget(this.renderTargetBright),e.clear(),this._fsQuad.render(e);let n=this.renderTargetBright;for(let t=0;t<this.nMips;t++)this._fsQuad.material=this.separableBlurMaterials[t],this.separableBlurMaterials[t].uniforms.colorTexture.value=n.texture,this.separableBlurMaterials[t].uniforms.direction.value=o.BlurDirectionX,e.setRenderTarget(this.renderTargetsHorizontal[t]),e.clear(),this._fsQuad.render(e),this.separableBlurMaterials[t].uniforms.colorTexture.value=this.renderTargetsHorizontal[t].texture,this.separableBlurMaterials[t].uniforms.direction.value=o.BlurDirectionY,e.setRenderTarget(this.renderTargetsVertical[t]),e.clear(),this._fsQuad.render(e),n=this.renderTargetsVertical[t];this._fsQuad.material=this.compositeMaterial,this.compositeMaterial.uniforms.bloomStrength.value=this.strength,this.compositeMaterial.uniforms.bloomRadius.value=this.radius,this.compositeMaterial.uniforms.bloomTintColors.value=this.bloomTintColors,e.setRenderTarget(this.renderTargetsHorizontal[0]),e.clear(),this._fsQuad.render(e),this._fsQuad.material=this.blendMaterial,this.copyUniforms.tDiffuse.value=this.renderTargetsHorizontal[0].texture,s&&e.state.buffers.stencil.setTest(!0),this.renderToScreen?e.setRenderTarget(null):e.setRenderTarget(r),this._fsQuad.render(e),e.setClearColor(this._oldClearColor,this._oldClearAlpha),e.autoClear=a}_getSeparableBlurMaterial(e){let t=[];for(let r=0;r<e;r++)t.push(.39894*Math.exp(-.5*r*r/(e*e))/e);return new i.BKk({defines:{KERNEL_RADIUS:e},uniforms:{colorTexture:{value:null},invSize:{value:new i.I9Y(.5,.5)},direction:{value:new i.I9Y(.5,.5)},gaussianCoefficients:{value:t}},vertexShader:`varying vec2 vUv;
				void main() {
					vUv = uv;
					gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
				}`,fragmentShader:`#include <common>
				varying vec2 vUv;
				uniform sampler2D colorTexture;
				uniform vec2 invSize;
				uniform vec2 direction;
				uniform float gaussianCoefficients[KERNEL_RADIUS];

				void main() {
					float weightSum = gaussianCoefficients[0];
					vec3 diffuseSum = texture2D( colorTexture, vUv ).rgb * weightSum;
					for( int i = 1; i < KERNEL_RADIUS; i ++ ) {
						float x = float(i);
						float w = gaussianCoefficients[i];
						vec2 uvOffset = direction * invSize * x;
						vec3 sample1 = texture2D( colorTexture, vUv + uvOffset ).rgb;
						vec3 sample2 = texture2D( colorTexture, vUv - uvOffset ).rgb;
						diffuseSum += (sample1 + sample2) * w;
						weightSum += 2.0 * w;
					}
					gl_FragColor = vec4(diffuseSum/weightSum, 1.0);
				}`})}_getCompositeMaterial(e){return new i.BKk({defines:{NUM_MIPS:e},uniforms:{blurTexture1:{value:null},blurTexture2:{value:null},blurTexture3:{value:null},blurTexture4:{value:null},blurTexture5:{value:null},bloomStrength:{value:1},bloomFactors:{value:null},bloomTintColors:{value:null},bloomRadius:{value:0}},vertexShader:`varying vec2 vUv;
				void main() {
					vUv = uv;
					gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
				}`,fragmentShader:`varying vec2 vUv;
				uniform sampler2D blurTexture1;
				uniform sampler2D blurTexture2;
				uniform sampler2D blurTexture3;
				uniform sampler2D blurTexture4;
				uniform sampler2D blurTexture5;
				uniform float bloomStrength;
				uniform float bloomRadius;
				uniform float bloomFactors[NUM_MIPS];
				uniform vec3 bloomTintColors[NUM_MIPS];

				float lerpBloomFactor(const in float factor) {
					float mirrorFactor = 1.2 - factor;
					return mix(factor, mirrorFactor, bloomRadius);
				}

				void main() {
					gl_FragColor = bloomStrength * ( lerpBloomFactor(bloomFactors[0]) * vec4(bloomTintColors[0], 1.0) * texture2D(blurTexture1, vUv) +
						lerpBloomFactor(bloomFactors[1]) * vec4(bloomTintColors[1], 1.0) * texture2D(blurTexture2, vUv) +
						lerpBloomFactor(bloomFactors[2]) * vec4(bloomTintColors[2], 1.0) * texture2D(blurTexture3, vUv) +
						lerpBloomFactor(bloomFactors[3]) * vec4(bloomTintColors[3], 1.0) * texture2D(blurTexture4, vUv) +
						lerpBloomFactor(bloomFactors[4]) * vec4(bloomTintColors[4], 1.0) * texture2D(blurTexture5, vUv) );
				}`})}}o.BlurDirectionX=new i.I9Y(1,0),o.BlurDirectionY=new i.I9Y(0,1)},8120:(e,t,r)=>{function i(e){let t=new Map,r=new Map,i=e.clone();return function e(t,r,i){i(t,r);for(let s=0;s<t.children.length;s++)e(t.children[s],r.children[s],i)}(e,i,function(e,i){t.set(i,e),r.set(e,i)}),i.traverse(function(e){if(!e.isSkinnedMesh)return;let i=t.get(e),s=i.skeleton.bones;e.skeleton=i.skeleton.clone(),e.bindMatrix.copy(i.bindMatrix),e.skeleton.bones=s.map(function(e){return r.get(e)}),e.bind(e.skeleton,e.bindMatrix)}),i}r.d(t,{o8:()=>i})},9323:(e,t,r)=>{r.d(t,{B:()=>a});var i=r(5339);function s(e,t){if(t===i.RJ4)return console.warn("THREE.BufferGeometryUtils.toTrianglesDrawMode(): Geometry already defined as triangles."),e;if(t!==i.rYR&&t!==i.O49)return console.error("THREE.BufferGeometryUtils.toTrianglesDrawMode(): Unknown draw mode:",t),e;{let r=e.getIndex();if(null===r){let t=[],i=e.getAttribute("position");if(void 0===i)return console.error("THREE.BufferGeometryUtils.toTrianglesDrawMode(): Undefined position attribute. Processing not possible."),e;for(let e=0;e<i.count;e++)t.push(e);e.setIndex(t),r=e.getIndex()}let s=r.count-2,a=[];if(t===i.rYR)for(let e=1;e<=s;e++)a.push(r.getX(0)),a.push(r.getX(e)),a.push(r.getX(e+1));else for(let e=0;e<s;e++)e%2==0?(a.push(r.getX(e)),a.push(r.getX(e+1)),a.push(r.getX(e+2))):(a.push(r.getX(e+2)),a.push(r.getX(e+1)),a.push(r.getX(e)));a.length/3!==s&&console.error("THREE.BufferGeometryUtils.toTrianglesDrawMode(): Unable to generate correct amount of triangles.");let n=e.clone();return n.setIndex(a),n.clearGroups(),n}}class a extends i.aHM{constructor(e){super(e),this.dracoLoader=null,this.ktx2Loader=null,this.meshoptDecoder=null,this.pluginCallbacks=[],this.register(function(e){return new c(e)}),this.register(function(e){return new d(e)}),this.register(function(e){return new _(e)}),this.register(function(e){return new S(e)}),this.register(function(e){return new R(e)}),this.register(function(e){return new m(e)}),this.register(function(e){return new p(e)}),this.register(function(e){return new v(e)}),this.register(function(e){return new g(e)}),this.register(function(e){return new u(e)}),this.register(function(e){return new x(e)}),this.register(function(e){return new f(e)}),this.register(function(e){return new M(e)}),this.register(function(e){return new T(e)}),this.register(function(e){return new l(e)}),this.register(function(e){return new w(e)}),this.register(function(e){return new E(e)})}load(e,t,r,s){let a,n=this;if(""!==this.resourcePath)a=this.resourcePath;else if(""!==this.path){let t=i.r6x.extractUrlBase(e);a=i.r6x.resolveURL(t,this.path)}else a=i.r6x.extractUrlBase(e);this.manager.itemStart(e);let o=function(t){s?s(t):console.error(t),n.manager.itemError(e),n.manager.itemEnd(e)},l=new i.Y9S(this.manager);l.setPath(this.path),l.setResponseType("arraybuffer"),l.setRequestHeader(this.requestHeader),l.setWithCredentials(this.withCredentials),l.load(e,function(r){try{n.parse(r,a,function(r){t(r),n.manager.itemEnd(e)},o)}catch(e){o(e)}},r,o)}setDRACOLoader(e){return this.dracoLoader=e,this}setKTX2Loader(e){return this.ktx2Loader=e,this}setMeshoptDecoder(e){return this.meshoptDecoder=e,this}register(e){return -1===this.pluginCallbacks.indexOf(e)&&this.pluginCallbacks.push(e),this}unregister(e){return -1!==this.pluginCallbacks.indexOf(e)&&this.pluginCallbacks.splice(this.pluginCallbacks.indexOf(e),1),this}parse(e,t,r,i){let s,a={},n={},l=new TextDecoder;if("string"==typeof e)s=JSON.parse(e);else if(e instanceof ArrayBuffer)if(l.decode(new Uint8Array(e,0,4))===P){try{a[o.KHR_BINARY_GLTF]=new b(e)}catch(e){i&&i(e);return}s=JSON.parse(a[o.KHR_BINARY_GLTF].content)}else s=JSON.parse(l.decode(e));else s=e;if(void 0===s.asset||s.asset.version[0]<2){i&&i(Error("THREE.GLTFLoader: Unsupported asset. glTF versions >=2.0 are supported."));return}let u=new Y(s,{path:t||this.resourcePath||"",crossOrigin:this.crossOrigin,requestHeader:this.requestHeader,manager:this.manager,ktx2Loader:this.ktx2Loader,meshoptDecoder:this.meshoptDecoder});u.fileLoader.setRequestHeader(this.requestHeader);for(let e=0;e<this.pluginCallbacks.length;e++){let t=this.pluginCallbacks[e](u);t.name||console.error("THREE.GLTFLoader: Invalid plugin found: missing name"),n[t.name]=t,a[t.name]=!0}if(s.extensionsUsed)for(let e=0;e<s.extensionsUsed.length;++e){let t=s.extensionsUsed[e],r=s.extensionsRequired||[];switch(t){case o.KHR_MATERIALS_UNLIT:a[t]=new h;break;case o.KHR_DRACO_MESH_COMPRESSION:a[t]=new A(s,this.dracoLoader);break;case o.KHR_TEXTURE_TRANSFORM:a[t]=new y;break;case o.KHR_MESH_QUANTIZATION:a[t]=new N;break;default:r.indexOf(t)>=0&&void 0===n[t]&&console.warn('THREE.GLTFLoader: Unknown extension "'+t+'".')}}u.setExtensions(a),u.setPlugins(n),u.parse(r,i)}parseAsync(e,t){let r=this;return new Promise(function(i,s){r.parse(e,t,i,s)})}}function n(){let e={};return{get:function(t){return e[t]},add:function(t,r){e[t]=r},remove:function(t){delete e[t]},removeAll:function(){e={}}}}let o={KHR_BINARY_GLTF:"KHR_binary_glTF",KHR_DRACO_MESH_COMPRESSION:"KHR_draco_mesh_compression",KHR_LIGHTS_PUNCTUAL:"KHR_lights_punctual",KHR_MATERIALS_CLEARCOAT:"KHR_materials_clearcoat",KHR_MATERIALS_DISPERSION:"KHR_materials_dispersion",KHR_MATERIALS_IOR:"KHR_materials_ior",KHR_MATERIALS_SHEEN:"KHR_materials_sheen",KHR_MATERIALS_SPECULAR:"KHR_materials_specular",KHR_MATERIALS_TRANSMISSION:"KHR_materials_transmission",KHR_MATERIALS_IRIDESCENCE:"KHR_materials_iridescence",KHR_MATERIALS_ANISOTROPY:"KHR_materials_anisotropy",KHR_MATERIALS_UNLIT:"KHR_materials_unlit",KHR_MATERIALS_VOLUME:"KHR_materials_volume",KHR_TEXTURE_BASISU:"KHR_texture_basisu",KHR_TEXTURE_TRANSFORM:"KHR_texture_transform",KHR_MESH_QUANTIZATION:"KHR_mesh_quantization",KHR_MATERIALS_EMISSIVE_STRENGTH:"KHR_materials_emissive_strength",EXT_MATERIALS_BUMP:"EXT_materials_bump",EXT_TEXTURE_WEBP:"EXT_texture_webp",EXT_TEXTURE_AVIF:"EXT_texture_avif",EXT_MESHOPT_COMPRESSION:"EXT_meshopt_compression",EXT_MESH_GPU_INSTANCING:"EXT_mesh_gpu_instancing"};class l{constructor(e){this.parser=e,this.name=o.KHR_LIGHTS_PUNCTUAL,this.cache={refs:{},uses:{}}}_markDefs(){let e=this.parser,t=this.parser.json.nodes||[];for(let r=0,i=t.length;r<i;r++){let i=t[r];i.extensions&&i.extensions[this.name]&&void 0!==i.extensions[this.name].light&&e._addNodeRef(this.cache,i.extensions[this.name].light)}}_loadLight(e){let t,r=this.parser,s="light:"+e,a=r.cache.get(s);if(a)return a;let n=r.json,o=((n.extensions&&n.extensions[this.name]||{}).lights||[])[e],l=new i.Q1f(0xffffff);void 0!==o.color&&l.setRGB(o.color[0],o.color[1],o.color[2],i.Zr2);let h=void 0!==o.range?o.range:0;switch(o.type){case"directional":(t=new i.ZyN(l)).target.position.set(0,0,-1),t.add(t.target);break;case"point":(t=new i.HiM(l)).distance=h;break;case"spot":(t=new i.nCl(l)).distance=h,o.spot=o.spot||{},o.spot.innerConeAngle=void 0!==o.spot.innerConeAngle?o.spot.innerConeAngle:0,o.spot.outerConeAngle=void 0!==o.spot.outerConeAngle?o.spot.outerConeAngle:Math.PI/4,t.angle=o.spot.outerConeAngle,t.penumbra=1-o.spot.innerConeAngle/o.spot.outerConeAngle,t.target.position.set(0,0,-1),t.add(t.target);break;default:throw Error("THREE.GLTFLoader: Unexpected light type: "+o.type)}return t.position.set(0,0,0),K(t,o),void 0!==o.intensity&&(t.intensity=o.intensity),t.name=r.createUniqueName(o.name||"light_"+e),a=Promise.resolve(t),r.cache.add(s,a),a}getDependency(e,t){if("light"===e)return this._loadLight(t)}createNodeAttachment(e){let t=this,r=this.parser,i=r.json.nodes[e],s=(i.extensions&&i.extensions[this.name]||{}).light;return void 0===s?null:this._loadLight(s).then(function(e){return r._getNodeRef(t.cache,s,e)})}}class h{constructor(){this.name=o.KHR_MATERIALS_UNLIT}getMaterialType(){return i.V9B}extendParams(e,t,r){let s=[];e.color=new i.Q1f(1,1,1),e.opacity=1;let a=t.pbrMetallicRoughness;if(a){if(Array.isArray(a.baseColorFactor)){let t=a.baseColorFactor;e.color.setRGB(t[0],t[1],t[2],i.Zr2),e.opacity=t[3]}void 0!==a.baseColorTexture&&s.push(r.assignTexture(e,"map",a.baseColorTexture,i.er$))}return Promise.all(s)}}class u{constructor(e){this.parser=e,this.name=o.KHR_MATERIALS_EMISSIVE_STRENGTH}extendMaterialParams(e,t){let r=this.parser.json.materials[e];if(!r.extensions||!r.extensions[this.name])return Promise.resolve();let i=r.extensions[this.name].emissiveStrength;return void 0!==i&&(t.emissiveIntensity=i),Promise.resolve()}}class c{constructor(e){this.parser=e,this.name=o.KHR_MATERIALS_CLEARCOAT}getMaterialType(e){let t=this.parser.json.materials[e];return t.extensions&&t.extensions[this.name]?i.uSd:null}extendMaterialParams(e,t){let r=this.parser,s=r.json.materials[e];if(!s.extensions||!s.extensions[this.name])return Promise.resolve();let a=[],n=s.extensions[this.name];if(void 0!==n.clearcoatFactor&&(t.clearcoat=n.clearcoatFactor),void 0!==n.clearcoatTexture&&a.push(r.assignTexture(t,"clearcoatMap",n.clearcoatTexture)),void 0!==n.clearcoatRoughnessFactor&&(t.clearcoatRoughness=n.clearcoatRoughnessFactor),void 0!==n.clearcoatRoughnessTexture&&a.push(r.assignTexture(t,"clearcoatRoughnessMap",n.clearcoatRoughnessTexture)),void 0!==n.clearcoatNormalTexture&&(a.push(r.assignTexture(t,"clearcoatNormalMap",n.clearcoatNormalTexture)),void 0!==n.clearcoatNormalTexture.scale)){let e=n.clearcoatNormalTexture.scale;t.clearcoatNormalScale=new i.I9Y(e,e)}return Promise.all(a)}}class d{constructor(e){this.parser=e,this.name=o.KHR_MATERIALS_DISPERSION}getMaterialType(e){let t=this.parser.json.materials[e];return t.extensions&&t.extensions[this.name]?i.uSd:null}extendMaterialParams(e,t){let r=this.parser.json.materials[e];if(!r.extensions||!r.extensions[this.name])return Promise.resolve();let i=r.extensions[this.name];return t.dispersion=void 0!==i.dispersion?i.dispersion:0,Promise.resolve()}}class f{constructor(e){this.parser=e,this.name=o.KHR_MATERIALS_IRIDESCENCE}getMaterialType(e){let t=this.parser.json.materials[e];return t.extensions&&t.extensions[this.name]?i.uSd:null}extendMaterialParams(e,t){let r=this.parser,i=r.json.materials[e];if(!i.extensions||!i.extensions[this.name])return Promise.resolve();let s=[],a=i.extensions[this.name];return void 0!==a.iridescenceFactor&&(t.iridescence=a.iridescenceFactor),void 0!==a.iridescenceTexture&&s.push(r.assignTexture(t,"iridescenceMap",a.iridescenceTexture)),void 0!==a.iridescenceIor&&(t.iridescenceIOR=a.iridescenceIor),void 0===t.iridescenceThicknessRange&&(t.iridescenceThicknessRange=[100,400]),void 0!==a.iridescenceThicknessMinimum&&(t.iridescenceThicknessRange[0]=a.iridescenceThicknessMinimum),void 0!==a.iridescenceThicknessMaximum&&(t.iridescenceThicknessRange[1]=a.iridescenceThicknessMaximum),void 0!==a.iridescenceThicknessTexture&&s.push(r.assignTexture(t,"iridescenceThicknessMap",a.iridescenceThicknessTexture)),Promise.all(s)}}class m{constructor(e){this.parser=e,this.name=o.KHR_MATERIALS_SHEEN}getMaterialType(e){let t=this.parser.json.materials[e];return t.extensions&&t.extensions[this.name]?i.uSd:null}extendMaterialParams(e,t){let r=this.parser,s=r.json.materials[e];if(!s.extensions||!s.extensions[this.name])return Promise.resolve();let a=[];t.sheenColor=new i.Q1f(0,0,0),t.sheenRoughness=0,t.sheen=1;let n=s.extensions[this.name];if(void 0!==n.sheenColorFactor){let e=n.sheenColorFactor;t.sheenColor.setRGB(e[0],e[1],e[2],i.Zr2)}return void 0!==n.sheenRoughnessFactor&&(t.sheenRoughness=n.sheenRoughnessFactor),void 0!==n.sheenColorTexture&&a.push(r.assignTexture(t,"sheenColorMap",n.sheenColorTexture,i.er$)),void 0!==n.sheenRoughnessTexture&&a.push(r.assignTexture(t,"sheenRoughnessMap",n.sheenRoughnessTexture)),Promise.all(a)}}class p{constructor(e){this.parser=e,this.name=o.KHR_MATERIALS_TRANSMISSION}getMaterialType(e){let t=this.parser.json.materials[e];return t.extensions&&t.extensions[this.name]?i.uSd:null}extendMaterialParams(e,t){let r=this.parser,i=r.json.materials[e];if(!i.extensions||!i.extensions[this.name])return Promise.resolve();let s=[],a=i.extensions[this.name];return void 0!==a.transmissionFactor&&(t.transmission=a.transmissionFactor),void 0!==a.transmissionTexture&&s.push(r.assignTexture(t,"transmissionMap",a.transmissionTexture)),Promise.all(s)}}class v{constructor(e){this.parser=e,this.name=o.KHR_MATERIALS_VOLUME}getMaterialType(e){let t=this.parser.json.materials[e];return t.extensions&&t.extensions[this.name]?i.uSd:null}extendMaterialParams(e,t){let r=this.parser,s=r.json.materials[e];if(!s.extensions||!s.extensions[this.name])return Promise.resolve();let a=[],n=s.extensions[this.name];t.thickness=void 0!==n.thicknessFactor?n.thicknessFactor:0,void 0!==n.thicknessTexture&&a.push(r.assignTexture(t,"thicknessMap",n.thicknessTexture)),t.attenuationDistance=n.attenuationDistance||1/0;let o=n.attenuationColor||[1,1,1];return t.attenuationColor=new i.Q1f().setRGB(o[0],o[1],o[2],i.Zr2),Promise.all(a)}}class g{constructor(e){this.parser=e,this.name=o.KHR_MATERIALS_IOR}getMaterialType(e){let t=this.parser.json.materials[e];return t.extensions&&t.extensions[this.name]?i.uSd:null}extendMaterialParams(e,t){let r=this.parser.json.materials[e];if(!r.extensions||!r.extensions[this.name])return Promise.resolve();let i=r.extensions[this.name];return t.ior=void 0!==i.ior?i.ior:1.5,Promise.resolve()}}class x{constructor(e){this.parser=e,this.name=o.KHR_MATERIALS_SPECULAR}getMaterialType(e){let t=this.parser.json.materials[e];return t.extensions&&t.extensions[this.name]?i.uSd:null}extendMaterialParams(e,t){let r=this.parser,s=r.json.materials[e];if(!s.extensions||!s.extensions[this.name])return Promise.resolve();let a=[],n=s.extensions[this.name];t.specularIntensity=void 0!==n.specularFactor?n.specularFactor:1,void 0!==n.specularTexture&&a.push(r.assignTexture(t,"specularIntensityMap",n.specularTexture));let o=n.specularColorFactor||[1,1,1];return t.specularColor=new i.Q1f().setRGB(o[0],o[1],o[2],i.Zr2),void 0!==n.specularColorTexture&&a.push(r.assignTexture(t,"specularColorMap",n.specularColorTexture,i.er$)),Promise.all(a)}}class T{constructor(e){this.parser=e,this.name=o.EXT_MATERIALS_BUMP}getMaterialType(e){let t=this.parser.json.materials[e];return t.extensions&&t.extensions[this.name]?i.uSd:null}extendMaterialParams(e,t){let r=this.parser,i=r.json.materials[e];if(!i.extensions||!i.extensions[this.name])return Promise.resolve();let s=[],a=i.extensions[this.name];return t.bumpScale=void 0!==a.bumpFactor?a.bumpFactor:1,void 0!==a.bumpTexture&&s.push(r.assignTexture(t,"bumpMap",a.bumpTexture)),Promise.all(s)}}class M{constructor(e){this.parser=e,this.name=o.KHR_MATERIALS_ANISOTROPY}getMaterialType(e){let t=this.parser.json.materials[e];return t.extensions&&t.extensions[this.name]?i.uSd:null}extendMaterialParams(e,t){let r=this.parser,i=r.json.materials[e];if(!i.extensions||!i.extensions[this.name])return Promise.resolve();let s=[],a=i.extensions[this.name];return void 0!==a.anisotropyStrength&&(t.anisotropy=a.anisotropyStrength),void 0!==a.anisotropyRotation&&(t.anisotropyRotation=a.anisotropyRotation),void 0!==a.anisotropyTexture&&s.push(r.assignTexture(t,"anisotropyMap",a.anisotropyTexture)),Promise.all(s)}}class _{constructor(e){this.parser=e,this.name=o.KHR_TEXTURE_BASISU}loadTexture(e){let t=this.parser,r=t.json,i=r.textures[e];if(!i.extensions||!i.extensions[this.name])return null;let s=i.extensions[this.name],a=t.options.ktx2Loader;if(!a)if(!(r.extensionsRequired&&r.extensionsRequired.indexOf(this.name)>=0))return null;else throw Error("THREE.GLTFLoader: setKTX2Loader must be called before loading KTX2 textures");return t.loadTextureImage(e,s.source,a)}}class S{constructor(e){this.parser=e,this.name=o.EXT_TEXTURE_WEBP}loadTexture(e){let t=this.name,r=this.parser,i=r.json,s=i.textures[e];if(!s.extensions||!s.extensions[t])return null;let a=s.extensions[t],n=i.images[a.source],o=r.textureLoader;if(n.uri){let e=r.options.manager.getHandler(n.uri);null!==e&&(o=e)}return r.loadTextureImage(e,a.source,o)}}class R{constructor(e){this.parser=e,this.name=o.EXT_TEXTURE_AVIF}loadTexture(e){let t=this.name,r=this.parser,i=r.json,s=i.textures[e];if(!s.extensions||!s.extensions[t])return null;let a=s.extensions[t],n=i.images[a.source],o=r.textureLoader;if(n.uri){let e=r.options.manager.getHandler(n.uri);null!==e&&(o=e)}return r.loadTextureImage(e,a.source,o)}}class w{constructor(e){this.name=o.EXT_MESHOPT_COMPRESSION,this.parser=e}loadBufferView(e){let t=this.parser.json,r=t.bufferViews[e];if(!r.extensions||!r.extensions[this.name])return null;{let e=r.extensions[this.name],i=this.parser.getDependency("buffer",e.buffer),s=this.parser.options.meshoptDecoder;if(!s||!s.supported)if(!(t.extensionsRequired&&t.extensionsRequired.indexOf(this.name)>=0))return null;else throw Error("THREE.GLTFLoader: setMeshoptDecoder must be called before loading compressed files");return i.then(function(t){let r=e.byteOffset||0,i=e.byteLength||0,a=e.count,n=e.byteStride,o=new Uint8Array(t,r,i);return s.decodeGltfBufferAsync?s.decodeGltfBufferAsync(a,n,o,e.mode,e.filter).then(function(e){return e.buffer}):s.ready.then(function(){let t=new ArrayBuffer(a*n);return s.decodeGltfBuffer(new Uint8Array(t),a,n,o,e.mode,e.filter),t})})}}}class E{constructor(e){this.name=o.EXT_MESH_GPU_INSTANCING,this.parser=e}createNodeMesh(e){let t=this.parser.json,r=t.nodes[e];if(!r.extensions||!r.extensions[this.name]||void 0===r.mesh)return null;for(let e of t.meshes[r.mesh].primitives)if(e.mode!==O.TRIANGLES&&e.mode!==O.TRIANGLE_STRIP&&e.mode!==O.TRIANGLE_FAN&&void 0!==e.mode)return null;let s=r.extensions[this.name].attributes,a=[],n={};for(let e in s)a.push(this.parser.getDependency("accessor",s[e]).then(t=>(n[e]=t,n[e])));return a.length<1?null:(a.push(this.parser.createNodeMesh(e)),Promise.all(a).then(e=>{let t=e.pop(),r=t.isGroup?t.children:[t],s=e[0].count,a=[];for(let e of r){let t=new i.kn4,r=new i.Pq0,o=new i.PTz,l=new i.Pq0(1,1,1),h=new i.ZLX(e.geometry,e.material,s);for(let e=0;e<s;e++)n.TRANSLATION&&r.fromBufferAttribute(n.TRANSLATION,e),n.ROTATION&&o.fromBufferAttribute(n.ROTATION,e),n.SCALE&&l.fromBufferAttribute(n.SCALE,e),h.setMatrixAt(e,t.compose(r,o,l));for(let t in n)if("_COLOR_0"===t){let e=n[t];h.instanceColor=new i.uWO(e.array,e.itemSize,e.normalized)}else"TRANSLATION"!==t&&"ROTATION"!==t&&"SCALE"!==t&&e.geometry.setAttribute(t,n[t]);i.B69.prototype.copy.call(h,e),this.parser.assignFinalMaterial(h),a.push(h)}return t.isGroup?(t.clear(),t.add(...a),t):a[0]}))}}let P="glTF",C={JSON:0x4e4f534a,BIN:5130562};class b{constructor(e){this.name=o.KHR_BINARY_GLTF,this.content=null,this.body=null;let t=new DataView(e,0,12),r=new TextDecoder;if(this.header={magic:r.decode(new Uint8Array(e.slice(0,4))),version:t.getUint32(4,!0),length:t.getUint32(8,!0)},this.header.magic!==P)throw Error("THREE.GLTFLoader: Unsupported glTF-Binary header.");if(this.header.version<2)throw Error("THREE.GLTFLoader: Legacy binary file detected.");let i=this.header.length-12,s=new DataView(e,12),a=0;for(;a<i;){let t=s.getUint32(a,!0);a+=4;let i=s.getUint32(a,!0);if(a+=4,i===C.JSON){let i=new Uint8Array(e,12+a,t);this.content=r.decode(i)}else if(i===C.BIN){let r=12+a;this.body=e.slice(r,r+t)}a+=t}if(null===this.content)throw Error("THREE.GLTFLoader: JSON content not found.")}}class A{constructor(e,t){if(!t)throw Error("THREE.GLTFLoader: No DRACOLoader instance provided.");this.name=o.KHR_DRACO_MESH_COMPRESSION,this.json=e,this.dracoLoader=t,this.dracoLoader.preload()}decodePrimitive(e,t){let r=this.json,s=this.dracoLoader,a=e.extensions[this.name].bufferView,n=e.extensions[this.name].attributes,o={},l={},h={};for(let e in n)o[B[e]||e.toLowerCase()]=n[e];for(let t in e.attributes){let i=B[t]||t.toLowerCase();if(void 0!==n[t]){let s=r.accessors[e.attributes[t]],a=U[s.componentType];h[i]=a.name,l[i]=!0===s.normalized}}return t.getDependency("bufferView",a).then(function(e){return new Promise(function(t,r){s.decodeDracoFile(e,function(e){for(let t in e.attributes){let r=e.attributes[t],i=l[t];void 0!==i&&(r.normalized=i)}t(e)},o,h,i.Zr2,r)})})}}class y{constructor(){this.name=o.KHR_TEXTURE_TRANSFORM}extendTexture(e,t){return(void 0===t.texCoord||t.texCoord===e.channel)&&void 0===t.offset&&void 0===t.rotation&&void 0===t.scale||(e=e.clone(),void 0!==t.texCoord&&(e.channel=t.texCoord),void 0!==t.offset&&e.offset.fromArray(t.offset),void 0!==t.rotation&&(e.rotation=t.rotation),void 0!==t.scale&&e.repeat.fromArray(t.scale),e.needsUpdate=!0),e}}class N{constructor(){this.name=o.KHR_MESH_QUANTIZATION}}class I extends i.lGw{constructor(e,t,r,i){super(e,t,r,i)}copySampleValue_(e){let t=this.resultBuffer,r=this.sampleValues,i=this.valueSize,s=e*i*3+i;for(let e=0;e!==i;e++)t[e]=r[s+e];return t}interpolate_(e,t,r,i){let s=this.resultBuffer,a=this.sampleValues,n=this.valueSize,o=2*n,l=3*n,h=i-t,u=(r-t)/h,c=u*u,d=c*u,f=e*l,m=f-l,p=-2*d+3*c,v=d-c,g=1-p,x=v-c+u;for(let e=0;e!==n;e++){let t=a[m+e+n],r=a[m+e+o]*h,i=a[f+e+n],l=a[f+e]*h;s[e]=g*t+x*r+p*i+v*l}return s}}let D=new i.PTz;class L extends I{interpolate_(e,t,r,i){let s=super.interpolate_(e,t,r,i);return D.fromArray(s).normalize().toArray(s),s}}let O={POINTS:0,LINES:1,LINE_LOOP:2,LINE_STRIP:3,TRIANGLES:4,TRIANGLE_STRIP:5,TRIANGLE_FAN:6},U={5120:Int8Array,5121:Uint8Array,5122:Int16Array,5123:Uint16Array,5125:Uint32Array,5126:Float32Array},F={9728:i.hxR,9729:i.k6q,9984:i.pHI,9985:i.kRr,9986:i.Cfg,9987:i.$_I},H={33071:i.ghU,33648:i.kTW,10497:i.GJx},k={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT2:4,MAT3:9,MAT4:16},B={POSITION:"position",NORMAL:"normal",TANGENT:"tangent",TEXCOORD_0:"uv",TEXCOORD_1:"uv1",TEXCOORD_2:"uv2",TEXCOORD_3:"uv3",COLOR_0:"color",WEIGHTS_0:"skinWeight",JOINTS_0:"skinIndex"},V={scale:"scale",translation:"position",rotation:"quaternion",weights:"morphTargetInfluences"},z={CUBICSPLINE:void 0,LINEAR:i.PJ3,STEP:i.ljd},G={OPAQUE:"OPAQUE",MASK:"MASK",BLEND:"BLEND"};function j(e,t,r){for(let i in r.extensions)void 0===e[i]&&(t.userData.gltfExtensions=t.userData.gltfExtensions||{},t.userData.gltfExtensions[i]=r.extensions[i])}function K(e,t){void 0!==t.extras&&("object"==typeof t.extras?Object.assign(e.userData,t.extras):console.warn("THREE.GLTFLoader: Ignoring primitive type .extras, "+t.extras))}function X(e){let t="",r=Object.keys(e).sort();for(let i=0,s=r.length;i<s;i++)t+=r[i]+":"+e[r[i]]+";";return t}function q(e){switch(e){case Int8Array:return 1/127;case Uint8Array:return 1/255;case Int16Array:return 1/32767;case Uint16Array:return 1/65535;default:throw Error("THREE.GLTFLoader: Unsupported normalized accessor component type.")}}let W=new i.kn4;class Y{constructor(e={},t={}){this.json=e,this.extensions={},this.plugins={},this.options=t,this.cache=new n,this.associations=new Map,this.primitiveCache={},this.nodeCache={},this.meshCache={refs:{},uses:{}},this.cameraCache={refs:{},uses:{}},this.lightCache={refs:{},uses:{}},this.sourceCache={},this.textureCache={},this.nodeNamesUsed={};let r=!1,s=-1,a=!1,o=-1;if("undefined"!=typeof navigator){let e=navigator.userAgent;r=!0===/^((?!chrome|android).)*safari/i.test(e);let t=e.match(/Version\/(\d+)/);s=r&&t?parseInt(t[1],10):-1,o=(a=e.indexOf("Firefox")>-1)?e.match(/Firefox\/([0-9]+)\./)[1]:-1}"undefined"==typeof createImageBitmap||r&&s<17||a&&o<98?this.textureLoader=new i.Tap(this.options.manager):this.textureLoader=new i.Kzg(this.options.manager),this.textureLoader.setCrossOrigin(this.options.crossOrigin),this.textureLoader.setRequestHeader(this.options.requestHeader),this.fileLoader=new i.Y9S(this.options.manager),this.fileLoader.setResponseType("arraybuffer"),"use-credentials"===this.options.crossOrigin&&this.fileLoader.setWithCredentials(!0)}setExtensions(e){this.extensions=e}setPlugins(e){this.plugins=e}parse(e,t){let r=this,i=this.json,s=this.extensions;this.cache.removeAll(),this.nodeCache={},this._invokeAll(function(e){return e._markDefs&&e._markDefs()}),Promise.all(this._invokeAll(function(e){return e.beforeRoot&&e.beforeRoot()})).then(function(){return Promise.all([r.getDependencies("scene"),r.getDependencies("animation"),r.getDependencies("camera")])}).then(function(t){let a={scene:t[0][i.scene||0],scenes:t[0],animations:t[1],cameras:t[2],asset:i.asset,parser:r,userData:{}};return j(s,a,i),K(a,i),Promise.all(r._invokeAll(function(e){return e.afterRoot&&e.afterRoot(a)})).then(function(){for(let e of a.scenes)e.updateMatrixWorld();e(a)})}).catch(t)}_markDefs(){let e=this.json.nodes||[],t=this.json.skins||[],r=this.json.meshes||[];for(let r=0,i=t.length;r<i;r++){let i=t[r].joints;for(let t=0,r=i.length;t<r;t++)e[i[t]].isBone=!0}for(let t=0,i=e.length;t<i;t++){let i=e[t];void 0!==i.mesh&&(this._addNodeRef(this.meshCache,i.mesh),void 0!==i.skin&&(r[i.mesh].isSkinnedMesh=!0)),void 0!==i.camera&&this._addNodeRef(this.cameraCache,i.camera)}}_addNodeRef(e,t){void 0!==t&&(void 0===e.refs[t]&&(e.refs[t]=e.uses[t]=0),e.refs[t]++)}_getNodeRef(e,t,r){if(e.refs[t]<=1)return r;let i=r.clone(),s=(e,t)=>{let r=this.associations.get(e);for(let[i,a]of(null!=r&&this.associations.set(t,r),e.children.entries()))s(a,t.children[i])};return s(r,i),i.name+="_instance_"+e.uses[t]++,i}_invokeOne(e){let t=Object.values(this.plugins);t.push(this);for(let r=0;r<t.length;r++){let i=e(t[r]);if(i)return i}return null}_invokeAll(e){let t=Object.values(this.plugins);t.unshift(this);let r=[];for(let i=0;i<t.length;i++){let s=e(t[i]);s&&r.push(s)}return r}getDependency(e,t){let r=e+":"+t,i=this.cache.get(r);if(!i){switch(e){case"scene":i=this.loadScene(t);break;case"node":i=this._invokeOne(function(e){return e.loadNode&&e.loadNode(t)});break;case"mesh":i=this._invokeOne(function(e){return e.loadMesh&&e.loadMesh(t)});break;case"accessor":i=this.loadAccessor(t);break;case"bufferView":i=this._invokeOne(function(e){return e.loadBufferView&&e.loadBufferView(t)});break;case"buffer":i=this.loadBuffer(t);break;case"material":i=this._invokeOne(function(e){return e.loadMaterial&&e.loadMaterial(t)});break;case"texture":i=this._invokeOne(function(e){return e.loadTexture&&e.loadTexture(t)});break;case"skin":i=this.loadSkin(t);break;case"animation":i=this._invokeOne(function(e){return e.loadAnimation&&e.loadAnimation(t)});break;case"camera":i=this.loadCamera(t);break;default:if(!(i=this._invokeOne(function(r){return r!=this&&r.getDependency&&r.getDependency(e,t)})))throw Error("Unknown type: "+e)}this.cache.add(r,i)}return i}getDependencies(e){let t=this.cache.get(e);if(!t){let r=this;t=Promise.all((this.json[e+("mesh"===e?"es":"s")]||[]).map(function(t,i){return r.getDependency(e,i)})),this.cache.add(e,t)}return t}loadBuffer(e){let t=this.json.buffers[e],r=this.fileLoader;if(t.type&&"arraybuffer"!==t.type)throw Error("THREE.GLTFLoader: "+t.type+" buffer type is not supported.");if(void 0===t.uri&&0===e)return Promise.resolve(this.extensions[o.KHR_BINARY_GLTF].body);let s=this.options;return new Promise(function(e,a){r.load(i.r6x.resolveURL(t.uri,s.path),e,void 0,function(){a(Error('THREE.GLTFLoader: Failed to load buffer "'+t.uri+'".'))})})}loadBufferView(e){let t=this.json.bufferViews[e];return this.getDependency("buffer",t.buffer).then(function(e){let r=t.byteLength||0,i=t.byteOffset||0;return e.slice(i,i+r)})}loadAccessor(e){let t=this,r=this.json,s=this.json.accessors[e];if(void 0===s.bufferView&&void 0===s.sparse){let e=k[s.type],t=U[s.componentType],r=!0===s.normalized,a=new t(s.count*e);return Promise.resolve(new i.THS(a,e,r))}let a=[];return void 0!==s.bufferView?a.push(this.getDependency("bufferView",s.bufferView)):a.push(null),void 0!==s.sparse&&(a.push(this.getDependency("bufferView",s.sparse.indices.bufferView)),a.push(this.getDependency("bufferView",s.sparse.values.bufferView))),Promise.all(a).then(function(e){let a,n,o=e[0],l=k[s.type],h=U[s.componentType],u=h.BYTES_PER_ELEMENT,c=u*l,d=s.byteOffset||0,f=void 0!==s.bufferView?r.bufferViews[s.bufferView].byteStride:void 0,m=!0===s.normalized;if(f&&f!==c){let e=Math.floor(d/f),r="InterleavedBuffer:"+s.bufferView+":"+s.componentType+":"+e+":"+s.count,c=t.cache.get(r);c||(a=new h(o,e*f,s.count*f/u),c=new i.eB$(a,f/u),t.cache.add(r,c)),n=new i.eHs(c,l,d%f/u,m)}else a=null===o?new h(s.count*l):new h(o,d,s.count*l),n=new i.THS(a,l,m);if(void 0!==s.sparse){let t=k.SCALAR,r=U[s.sparse.indices.componentType],a=s.sparse.indices.byteOffset||0,u=s.sparse.values.byteOffset||0,c=new r(e[1],a,s.sparse.count*t),d=new h(e[2],u,s.sparse.count*l);null!==o&&(n=new i.THS(n.array.slice(),n.itemSize,n.normalized)),n.normalized=!1;for(let e=0,t=c.length;e<t;e++){let t=c[e];if(n.setX(t,d[e*l]),l>=2&&n.setY(t,d[e*l+1]),l>=3&&n.setZ(t,d[e*l+2]),l>=4&&n.setW(t,d[e*l+3]),l>=5)throw Error("THREE.GLTFLoader: Unsupported itemSize in sparse BufferAttribute.")}n.normalized=m}return n})}loadTexture(e){let t=this.json,r=this.options,i=t.textures[e].source,s=t.images[i],a=this.textureLoader;if(s.uri){let e=r.manager.getHandler(s.uri);null!==e&&(a=e)}return this.loadTextureImage(e,i,a)}loadTextureImage(e,t,r){let s=this,a=this.json,n=a.textures[e],o=a.images[t],l=(o.uri||o.bufferView)+":"+n.sampler;if(this.textureCache[l])return this.textureCache[l];let h=this.loadImageSource(t,r).then(function(t){t.flipY=!1,t.name=n.name||o.name||"",""===t.name&&"string"==typeof o.uri&&!1===o.uri.startsWith("data:image/")&&(t.name=o.uri);let r=(a.samplers||{})[n.sampler]||{};return t.magFilter=F[r.magFilter]||i.k6q,t.minFilter=F[r.minFilter]||i.$_I,t.wrapS=H[r.wrapS]||i.GJx,t.wrapT=H[r.wrapT]||i.GJx,t.generateMipmaps=!t.isCompressedTexture&&t.minFilter!==i.hxR&&t.minFilter!==i.k6q,s.associations.set(t,{textures:e}),t}).catch(function(){return null});return this.textureCache[l]=h,h}loadImageSource(e,t){let r=this.json,s=this.options;if(void 0!==this.sourceCache[e])return this.sourceCache[e].then(e=>e.clone());let a=r.images[e],n=self.URL||self.webkitURL,o=a.uri||"",l=!1;if(void 0!==a.bufferView)o=this.getDependency("bufferView",a.bufferView).then(function(e){l=!0;let t=new Blob([e],{type:a.mimeType});return o=n.createObjectURL(t)});else if(void 0===a.uri)throw Error("THREE.GLTFLoader: Image "+e+" is missing URI and bufferView");let h=Promise.resolve(o).then(function(e){return new Promise(function(r,a){let n=r;!0===t.isImageBitmapLoader&&(n=function(e){let t=new i.gPd(e);t.needsUpdate=!0,r(t)}),t.load(i.r6x.resolveURL(e,s.path),n,void 0,a)})}).then(function(e){var t;return!0===l&&n.revokeObjectURL(o),K(e,a),e.userData.mimeType=a.mimeType||((t=a.uri).search(/\.jpe?g($|\?)/i)>0||0===t.search(/^data\:image\/jpeg/)?"image/jpeg":t.search(/\.webp($|\?)/i)>0||0===t.search(/^data\:image\/webp/)?"image/webp":t.search(/\.ktx2($|\?)/i)>0||0===t.search(/^data\:image\/ktx2/)?"image/ktx2":"image/png"),e}).catch(function(e){throw console.error("THREE.GLTFLoader: Couldn't load texture",o),e});return this.sourceCache[e]=h,h}assignTexture(e,t,r,i){let s=this;return this.getDependency("texture",r.index).then(function(a){if(!a)return null;if(void 0!==r.texCoord&&r.texCoord>0&&((a=a.clone()).channel=r.texCoord),s.extensions[o.KHR_TEXTURE_TRANSFORM]){let e=void 0!==r.extensions?r.extensions[o.KHR_TEXTURE_TRANSFORM]:void 0;if(e){let t=s.associations.get(a);a=s.extensions[o.KHR_TEXTURE_TRANSFORM].extendTexture(a,e),s.associations.set(a,t)}}return void 0!==i&&(a.colorSpace=i),e[t]=a,a})}assignFinalMaterial(e){let t=e.geometry,r=e.material,s=void 0===t.attributes.tangent,a=void 0!==t.attributes.color,n=void 0===t.attributes.normal;if(e.isPoints){let e="PointsMaterial:"+r.uuid,t=this.cache.get(e);t||(t=new i.BH$,i.imn.prototype.copy.call(t,r),t.color.copy(r.color),t.map=r.map,t.sizeAttenuation=!1,this.cache.add(e,t)),r=t}else if(e.isLine){let e="LineBasicMaterial:"+r.uuid,t=this.cache.get(e);t||(t=new i.mrM,i.imn.prototype.copy.call(t,r),t.color.copy(r.color),t.map=r.map,this.cache.add(e,t)),r=t}if(s||a||n){let e="ClonedMaterial:"+r.uuid+":";s&&(e+="derivative-tangents:"),a&&(e+="vertex-colors:"),n&&(e+="flat-shading:");let t=this.cache.get(e);t||(t=r.clone(),a&&(t.vertexColors=!0),n&&(t.flatShading=!0),s&&(t.normalScale&&(t.normalScale.y*=-1),t.clearcoatNormalScale&&(t.clearcoatNormalScale.y*=-1)),this.cache.add(e,t),this.associations.set(t,this.associations.get(r))),r=t}e.material=r}getMaterialType(){return i._4j}loadMaterial(e){let t,r=this,s=this.json,a=this.extensions,n=s.materials[e],l={},h=n.extensions||{},u=[];if(h[o.KHR_MATERIALS_UNLIT]){let e=a[o.KHR_MATERIALS_UNLIT];t=e.getMaterialType(),u.push(e.extendParams(l,n,r))}else{let s=n.pbrMetallicRoughness||{};if(l.color=new i.Q1f(1,1,1),l.opacity=1,Array.isArray(s.baseColorFactor)){let e=s.baseColorFactor;l.color.setRGB(e[0],e[1],e[2],i.Zr2),l.opacity=e[3]}void 0!==s.baseColorTexture&&u.push(r.assignTexture(l,"map",s.baseColorTexture,i.er$)),l.metalness=void 0!==s.metallicFactor?s.metallicFactor:1,l.roughness=void 0!==s.roughnessFactor?s.roughnessFactor:1,void 0!==s.metallicRoughnessTexture&&(u.push(r.assignTexture(l,"metalnessMap",s.metallicRoughnessTexture)),u.push(r.assignTexture(l,"roughnessMap",s.metallicRoughnessTexture))),t=this._invokeOne(function(t){return t.getMaterialType&&t.getMaterialType(e)}),u.push(Promise.all(this._invokeAll(function(t){return t.extendMaterialParams&&t.extendMaterialParams(e,l)})))}!0===n.doubleSided&&(l.side=i.$EB);let c=n.alphaMode||G.OPAQUE;if(c===G.BLEND?(l.transparent=!0,l.depthWrite=!1):(l.transparent=!1,c===G.MASK&&(l.alphaTest=void 0!==n.alphaCutoff?n.alphaCutoff:.5)),void 0!==n.normalTexture&&t!==i.V9B&&(u.push(r.assignTexture(l,"normalMap",n.normalTexture)),l.normalScale=new i.I9Y(1,1),void 0!==n.normalTexture.scale)){let e=n.normalTexture.scale;l.normalScale.set(e,e)}if(void 0!==n.occlusionTexture&&t!==i.V9B&&(u.push(r.assignTexture(l,"aoMap",n.occlusionTexture)),void 0!==n.occlusionTexture.strength&&(l.aoMapIntensity=n.occlusionTexture.strength)),void 0!==n.emissiveFactor&&t!==i.V9B){let e=n.emissiveFactor;l.emissive=new i.Q1f().setRGB(e[0],e[1],e[2],i.Zr2)}return void 0!==n.emissiveTexture&&t!==i.V9B&&u.push(r.assignTexture(l,"emissiveMap",n.emissiveTexture,i.er$)),Promise.all(u).then(function(){let i=new t(l);return n.name&&(i.name=n.name),K(i,n),r.associations.set(i,{materials:e}),n.extensions&&j(a,i,n),i})}createUniqueName(e){let t=i.Nwf.sanitizeNodeName(e||"");return t in this.nodeNamesUsed?t+"_"+ ++this.nodeNamesUsed[t]:(this.nodeNamesUsed[t]=0,t)}loadGeometries(e){let t=this,r=this.extensions,s=this.primitiveCache,a=[];for(let n=0,l=e.length;n<l;n++){let l=e[n],h=function(e){let t,r=e.extensions&&e.extensions[o.KHR_DRACO_MESH_COMPRESSION];if(t=r?"draco:"+r.bufferView+":"+r.indices+":"+X(r.attributes):e.indices+":"+X(e.attributes)+":"+e.mode,void 0!==e.targets)for(let r=0,i=e.targets.length;r<i;r++)t+=":"+X(e.targets[r]);return t}(l),u=s[h];if(u)a.push(u.promise);else{let e;e=l.extensions&&l.extensions[o.KHR_DRACO_MESH_COMPRESSION]?function(e){return r[o.KHR_DRACO_MESH_COMPRESSION].decodePrimitive(e,t).then(function(r){return Q(r,e,t)})}(l):Q(new i.LoY,l,t),s[h]={primitive:l,promise:e},a.push(e)}}return Promise.all(a)}loadMesh(e){let t=this,r=this.json,a=this.extensions,n=r.meshes[e],o=n.primitives,l=[];for(let e=0,t=o.length;e<t;e++){var h;let t=void 0===o[e].material?(void 0===(h=this.cache).DefaultMaterial&&(h.DefaultMaterial=new i._4j({color:0xffffff,emissive:0,metalness:1,roughness:1,transparent:!1,depthTest:!0,side:i.hB5})),h.DefaultMaterial):this.getDependency("material",o[e].material);l.push(t)}return l.push(t.loadGeometries(o)),Promise.all(l).then(function(r){let l=r.slice(0,r.length-1),h=r[r.length-1],u=[];for(let r=0,c=h.length;r<c;r++){let c,d=h[r],f=o[r],m=l[r];if(f.mode===O.TRIANGLES||f.mode===O.TRIANGLE_STRIP||f.mode===O.TRIANGLE_FAN||void 0===f.mode)!0===(c=!0===n.isSkinnedMesh?new i.I46(d,m):new i.eaF(d,m)).isSkinnedMesh&&c.normalizeSkinWeights(),f.mode===O.TRIANGLE_STRIP?c.geometry=s(c.geometry,i.O49):f.mode===O.TRIANGLE_FAN&&(c.geometry=s(c.geometry,i.rYR));else if(f.mode===O.LINES)c=new i.DXC(d,m);else if(f.mode===O.LINE_STRIP)c=new i.N1A(d,m);else if(f.mode===O.LINE_LOOP)c=new i.FCc(d,m);else if(f.mode===O.POINTS)c=new i.ONl(d,m);else throw Error("THREE.GLTFLoader: Primitive mode unsupported: "+f.mode);Object.keys(c.geometry.morphAttributes).length>0&&function(e,t){if(e.updateMorphTargets(),void 0!==t.weights)for(let r=0,i=t.weights.length;r<i;r++)e.morphTargetInfluences[r]=t.weights[r];if(t.extras&&Array.isArray(t.extras.targetNames)){let r=t.extras.targetNames;if(e.morphTargetInfluences.length===r.length){e.morphTargetDictionary={};for(let t=0,i=r.length;t<i;t++)e.morphTargetDictionary[r[t]]=t}else console.warn("THREE.GLTFLoader: Invalid extras.targetNames length. Ignoring names.")}}(c,n),c.name=t.createUniqueName(n.name||"mesh_"+e),K(c,n),f.extensions&&j(a,c,f),t.assignFinalMaterial(c),u.push(c)}for(let r=0,i=u.length;r<i;r++)t.associations.set(u[r],{meshes:e,primitives:r});if(1===u.length)return n.extensions&&j(a,u[0],n),u[0];let c=new i.YJl;n.extensions&&j(a,c,n),t.associations.set(c,{meshes:e});for(let e=0,t=u.length;e<t;e++)c.add(u[e]);return c})}loadCamera(e){let t,r=this.json.cameras[e],s=r[r.type];return s?("perspective"===r.type?t=new i.ubm(i.cj9.radToDeg(s.yfov),s.aspectRatio||1,s.znear||1,s.zfar||2e6):"orthographic"===r.type&&(t=new i.qUd(-s.xmag,s.xmag,s.ymag,-s.ymag,s.znear,s.zfar)),r.name&&(t.name=this.createUniqueName(r.name)),K(t,r),Promise.resolve(t)):void console.warn("THREE.GLTFLoader: Missing camera parameters.")}loadSkin(e){let t=this.json.skins[e],r=[];for(let e=0,i=t.joints.length;e<i;e++)r.push(this._loadNodeShallow(t.joints[e]));return void 0!==t.inverseBindMatrices?r.push(this.getDependency("accessor",t.inverseBindMatrices)):r.push(null),Promise.all(r).then(function(e){let r=e.pop(),s=[],a=[];for(let n=0,o=e.length;n<o;n++){let o=e[n];if(o){s.push(o);let e=new i.kn4;null!==r&&e.fromArray(r.array,16*n),a.push(e)}else console.warn('THREE.GLTFLoader: Joint "%s" could not be found.',t.joints[n])}return new i.EAD(s,a)})}loadAnimation(e){let t=this.json,r=this,s=t.animations[e],a=s.name?s.name:"animation_"+e,n=[],o=[],l=[],h=[],u=[];for(let e=0,t=s.channels.length;e<t;e++){let t=s.channels[e],r=s.samplers[t.sampler],i=t.target,a=i.node,c=void 0!==s.parameters?s.parameters[r.input]:r.input,d=void 0!==s.parameters?s.parameters[r.output]:r.output;void 0!==i.node&&(n.push(this.getDependency("node",a)),o.push(this.getDependency("accessor",c)),l.push(this.getDependency("accessor",d)),h.push(r),u.push(i))}return Promise.all([Promise.all(n),Promise.all(o),Promise.all(l),Promise.all(h),Promise.all(u)]).then(function(e){let t=e[0],s=e[1],n=e[2],o=e[3],l=e[4],h=[];for(let e=0,i=t.length;e<i;e++){let i=t[e],a=s[e],u=n[e],c=o[e],d=l[e];if(void 0===i)continue;i.updateMatrix&&i.updateMatrix();let f=r._createAnimationTracks(i,a,u,c,d);if(f)for(let e=0;e<f.length;e++)h.push(f[e])}return new i.tz3(a,void 0,h)})}createNodeMesh(e){let t=this.json,r=this,i=t.nodes[e];return void 0===i.mesh?null:r.getDependency("mesh",i.mesh).then(function(e){let t=r._getNodeRef(r.meshCache,i.mesh,e);return void 0!==i.weights&&t.traverse(function(e){if(e.isMesh)for(let t=0,r=i.weights.length;t<r;t++)e.morphTargetInfluences[t]=i.weights[t]}),t})}loadNode(e){let t=this.json.nodes[e],r=this._loadNodeShallow(e),i=[],s=t.children||[];for(let e=0,t=s.length;e<t;e++)i.push(this.getDependency("node",s[e]));let a=void 0===t.skin?Promise.resolve(null):this.getDependency("skin",t.skin);return Promise.all([r,Promise.all(i),a]).then(function(e){let t=e[0],r=e[1],i=e[2];null!==i&&t.traverse(function(e){e.isSkinnedMesh&&e.bind(i,W)});for(let e=0,i=r.length;e<i;e++)t.add(r[e]);return t})}_loadNodeShallow(e){let t=this.json,r=this.extensions,s=this;if(void 0!==this.nodeCache[e])return this.nodeCache[e];let a=t.nodes[e],n=a.name?s.createUniqueName(a.name):"",o=[],l=s._invokeOne(function(t){return t.createNodeMesh&&t.createNodeMesh(e)});return l&&o.push(l),void 0!==a.camera&&o.push(s.getDependency("camera",a.camera).then(function(e){return s._getNodeRef(s.cameraCache,a.camera,e)})),s._invokeAll(function(t){return t.createNodeAttachment&&t.createNodeAttachment(e)}).forEach(function(e){o.push(e)}),this.nodeCache[e]=Promise.all(o).then(function(t){let o;if((o=!0===a.isBone?new i.$Kf:t.length>1?new i.YJl:1===t.length?t[0]:new i.B69)!==t[0])for(let e=0,r=t.length;e<r;e++)o.add(t[e]);if(a.name&&(o.userData.name=a.name,o.name=n),K(o,a),a.extensions&&j(r,o,a),void 0!==a.matrix){let e=new i.kn4;e.fromArray(a.matrix),o.applyMatrix4(e)}else void 0!==a.translation&&o.position.fromArray(a.translation),void 0!==a.rotation&&o.quaternion.fromArray(a.rotation),void 0!==a.scale&&o.scale.fromArray(a.scale);if(s.associations.has(o)){if(void 0!==a.mesh&&s.meshCache.refs[a.mesh]>1){let e=s.associations.get(o);s.associations.set(o,{...e})}}else s.associations.set(o,{});return s.associations.get(o).nodes=e,o}),this.nodeCache[e]}loadScene(e){let t=this.extensions,r=this.json.scenes[e],s=this,a=new i.YJl;r.name&&(a.name=s.createUniqueName(r.name)),K(a,r),r.extensions&&j(t,a,r);let n=r.nodes||[],o=[];for(let e=0,t=n.length;e<t;e++)o.push(s.getDependency("node",n[e]));return Promise.all(o).then(function(e){for(let t=0,r=e.length;t<r;t++)a.add(e[t]);return s.associations=(e=>{let t=new Map;for(let[e,r]of s.associations)(e instanceof i.imn||e instanceof i.gPd)&&t.set(e,r);return e.traverse(e=>{let r=s.associations.get(e);null!=r&&t.set(e,r)}),t})(a),a})}_createAnimationTracks(e,t,r,s,a){let n,o=[],l=e.name?e.name:e.uuid,h=[];switch(V[a.path]===V.weights?e.traverse(function(e){e.morphTargetInfluences&&h.push(e.name?e.name:e.uuid)}):h.push(l),V[a.path]){case V.weights:n=i.Hit;break;case V.rotation:n=i.MBL;break;case V.translation:case V.scale:n=i.RiT;break;default:n=1===r.itemSize?i.Hit:i.RiT}let u=void 0!==s.interpolation?z[s.interpolation]:i.PJ3,c=this._getArrayFromAccessor(r);for(let e=0,r=h.length;e<r;e++){let r=new n(h[e]+"."+V[a.path],t.array,c,u);"CUBICSPLINE"===s.interpolation&&this._createCubicSplineTrackInterpolant(r),o.push(r)}return o}_getArrayFromAccessor(e){let t=e.array;if(e.normalized){let e=q(t.constructor),r=new Float32Array(t.length);for(let i=0,s=t.length;i<s;i++)r[i]=t[i]*e;t=r}return t}_createCubicSplineTrackInterpolant(e){e.createInterpolant=function(e){return new(this instanceof i.MBL?L:I)(this.times,this.values,this.getValueSize()/3,e)},e.createInterpolant.isInterpolantFactoryMethodGLTFCubicSpline=!0}}function Q(e,t,r){let s=t.attributes,a=[];for(let t in s){let i=B[t]||t.toLowerCase();i in e.attributes||a.push(function(t,i){return r.getDependency("accessor",t).then(function(t){e.setAttribute(i,t)})}(s[t],i))}if(void 0!==t.indices&&!e.index){let i=r.getDependency("accessor",t.indices).then(function(t){e.setIndex(t)});a.push(i)}return i.ppV.workingColorSpace!==i.Zr2&&"COLOR_0"in s&&console.warn(`THREE.GLTFLoader: Converting vertex colors from "srgb-linear" to "${i.ppV.workingColorSpace}" not supported.`),K(e,t),!function(e,t,r){let s=t.attributes,a=new i.NRn;if(void 0===s.POSITION)return;{let e=r.json.accessors[s.POSITION],t=e.min,n=e.max;if(void 0===t||void 0===n)return console.warn("THREE.GLTFLoader: Missing min/max properties for accessor POSITION.");if(a.set(new i.Pq0(t[0],t[1],t[2]),new i.Pq0(n[0],n[1],n[2])),e.normalized){let t=q(U[e.componentType]);a.min.multiplyScalar(t),a.max.multiplyScalar(t)}}let n=t.targets;if(void 0!==n){let e=new i.Pq0,t=new i.Pq0;for(let i=0,s=n.length;i<s;i++){let s=n[i];if(void 0!==s.POSITION){let i=r.json.accessors[s.POSITION],a=i.min,n=i.max;if(void 0!==a&&void 0!==n){if(t.setX(Math.max(Math.abs(a[0]),Math.abs(n[0]))),t.setY(Math.max(Math.abs(a[1]),Math.abs(n[1]))),t.setZ(Math.max(Math.abs(a[2]),Math.abs(n[2]))),i.normalized){let e=q(U[i.componentType]);t.multiplyScalar(e)}e.max(t)}else console.warn("THREE.GLTFLoader: Missing min/max properties for accessor POSITION.")}}a.expandByVector(e)}e.boundingBox=a;let o=new i.iyt;a.getCenter(o.center),o.radius=a.min.distanceTo(a.max)/2,e.boundingSphere=o}(e,t,r),Promise.all(a).then(function(){return void 0!==t.targets?function(e,t,r){let i=!1,s=!1,a=!1;for(let e=0,r=t.length;e<r;e++){let r=t[e];if(void 0!==r.POSITION&&(i=!0),void 0!==r.NORMAL&&(s=!0),void 0!==r.COLOR_0&&(a=!0),i&&s&&a)break}if(!i&&!s&&!a)return Promise.resolve(e);let n=[],o=[],l=[];for(let h=0,u=t.length;h<u;h++){let u=t[h];if(i){let t=void 0!==u.POSITION?r.getDependency("accessor",u.POSITION):e.attributes.position;n.push(t)}if(s){let t=void 0!==u.NORMAL?r.getDependency("accessor",u.NORMAL):e.attributes.normal;o.push(t)}if(a){let t=void 0!==u.COLOR_0?r.getDependency("accessor",u.COLOR_0):e.attributes.color;l.push(t)}}return Promise.all([Promise.all(n),Promise.all(o),Promise.all(l)]).then(function(t){let r=t[0],n=t[1],o=t[2];return i&&(e.morphAttributes.position=r),s&&(e.morphAttributes.normal=n),a&&(e.morphAttributes.color=o),e.morphTargetsRelative=!0,e})}(e,t.targets,r):e})}}}]);