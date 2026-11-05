// MGS web — FeniXVOID · Project Ravenlight
import * as THREE from "three";

const ORIGINAL = "vec3 CustomToneMapping( vec3 color ) { return color; }";

const FILTRO = `vec3 CustomToneMapping( vec3 color ) {\n  float m = pow( max( max( color.r, color.g ), max( color.b, 0.0 ) ), 1.0 / 2.2 );\n  vec3 c;\n  if ( toneMappingExposure < 1.5 ) c = vec3( min( 1.0, m * 2.0 ) ) * vec3( 0.25, 0.75, 0.2 ) + vec3( 0.05, 0.14, 0.04 );   // visión nocturna\n  else { m *= 4.0 / 3.0; c = vec3( min( 1.0, m * 0.5 + 0.0645 ) + 0.314, m * 0.25, m * 0.25 ); }                          // térmica\n  return pow( clamp( c, 0.0, 1.0 ), vec3( 2.2 ) );\n}`;

if (THREE.ShaderChunk.tonemapping_pars_fragment.includes(ORIGINAL)) {
  THREE.ShaderChunk.tonemapping_pars_fragment = THREE.ShaderChunk.tonemapping_pars_fragment.replace(ORIGINAL, FILTRO);
} else console.warn("antiparras_vr: three cambió; las antiparras no se van a ver en el casco");

export function antiparrasVR(R, filtro) {
  const f = R.xr.isPresenting ? filtro : null;
  const modo = f ? THREE.CustomToneMapping : THREE.NoToneMapping;
  if (R.toneMapping !== modo) R.toneMapping = modo;
  if (f) R.toneMappingExposure = f === "nvg" ? 1 : 2;
}
