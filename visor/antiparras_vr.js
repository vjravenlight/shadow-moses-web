// MGS web — FeniXVOID · Project Ravenlight
import * as THREE from "three";

import { ajustes } from "./ajustes_imagen.js";

const ORIGINAL = "vec3 CustomToneMapping( vec3 color ) { return color; }";

const FILTRO = `vec3 CustomToneMapping( vec3 color ) {\n  if ( toneMappingExposure >= 2.5 ) {   // ajustes_imagen.js: 3 + brillo + 9·contraste + 81·color\n    float v = toneMappingExposure - 3.0, co = floor( v / 9.0 + 0.001 ), sa = floor( v / 81.0 + 0.001 );\n    float br = floor( v - co * 9.0 + 0.5 ); co -= sa * 9.0;\n    vec3 a = pow( pow( max( color, vec3( 0.0 ) ), vec3( 1.0 / 2.2 ) ), vec3( pow( 0.85, br - 2.0 ) ) );\n    a = ( a - 0.25 ) * ( 1.0 + ( co - 2.0 ) * 0.15 ) + 0.25;\n    float l = dot( a, vec3( 0.2126, 0.7152, 0.0722 ) );\n    a = l + ( a - l ) * ( 1.0 + ( sa - 2.0 ) * 0.25 );\n    return pow( clamp( a, 0.0, 1.0 ), vec3( 2.2 ) );\n  }\n  float m = pow( max( max( color.r, color.g ), max( color.b, 0.0 ) ), 1.0 / 2.2 );\n  vec3 c;\n  if ( toneMappingExposure < 1.5 ) c = vec3( min( 1.0, m * 2.0 ) ) * vec3( 0.25, 0.75, 0.2 ) + vec3( 0.05, 0.14, 0.04 );   // visión nocturna\n  else { m *= 4.0 / 3.0; c = vec3( min( 1.0, m * 0.5 + 0.0645 ) + 0.314, m * 0.25, m * 0.25 ); }                          // térmica\n  return pow( clamp( c, 0.0, 1.0 ), vec3( 2.2 ) );\n}`;

if (THREE.ShaderChunk.tonemapping_pars_fragment.includes(ORIGINAL)) {
  THREE.ShaderChunk.tonemapping_pars_fragment = THREE.ShaderChunk.tonemapping_pars_fragment.replace(ORIGINAL, FILTRO);
} else console.warn("antiparras_vr: three cambió; las antiparras no se van a ver en el casco");

export function antiparrasVR(R, filtro) {
  const f = R.xr.isPresenting ? filtro : null;
  const modo = f || !ajustes.neutro ? THREE.CustomToneMapping : THREE.NoToneMapping;
  if (R.toneMapping !== modo) R.toneMapping = modo;
  if (f) R.toneMappingExposure = f === "nvg" ? 1 : 2; else if (!ajustes.neutro) R.toneMappingExposure = ajustes.exposicion;
}
