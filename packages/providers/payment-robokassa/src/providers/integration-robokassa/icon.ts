// EXAMPLE: using svg
// const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96">
//   <rect width="96" height="96" rx="18" fill="#F7F7F8"/>
//   <path d="M34 24 L62 24 Q65 24 65 27 L65 51 Q65 64 48 74 Q31 64 31 51 L31 27 Q31 24 34 24 Z" fill="#FFDD2D"/>
//   <rect x="37" y="33" width="22" height="8" rx="1.5" fill="#1A1A1A"/>
//   <rect x="44" y="33" width="8" height="29" rx="1.5" fill="#1A1A1A"/>
// </svg>`
// export const ROBOKASSA_ICON = `data:image/svg+xml,${encodeURIComponent(svg)}`

// png in base64 (generated with `base64 -w0 icon.png` command)
const svg = `<svg width="274" height="274" viewBox="0 0 274 274" fill="none" xmlns="http://www.w3.org/2000/svg">
<g filter="url(#filter0_dddii_448_209)">
<rect x="32" y="16" width="210" height="210" rx="12" fill="#FAFAFA" shape-rendering="crispEdges"/>
<path d="M131.277 78L69 164H143.059L205 78H131.277Z" fill="#333339"/>
</g>
<defs>
<filter id="filter0_dddii_448_209" x="0" y="0" width="274" height="274" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
<feFlood flood-opacity="0" result="BackgroundImageFix"/>
<feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
<feOffset dy="16"/>
<feGaussianBlur stdDeviation="16"/>
<feComposite in2="hardAlpha" operator="out"/>
<feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.08 0"/>
<feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_448_209"/>
<feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
<feOffset dy="8"/>
<feGaussianBlur stdDeviation="8"/>
<feComposite in2="hardAlpha" operator="out"/>
<feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.08 0"/>
<feBlend mode="normal" in2="effect1_dropShadow_448_209" result="effect2_dropShadow_448_209"/>
<feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
<feMorphology radius="1" operator="dilate" in="SourceAlpha" result="effect3_dropShadow_448_209"/>
<feOffset/>
<feComposite in2="hardAlpha" operator="out"/>
<feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.08 0"/>
<feBlend mode="normal" in2="effect2_dropShadow_448_209" result="effect3_dropShadow_448_209"/>
<feBlend mode="normal" in="SourceGraphic" in2="effect3_dropShadow_448_209" result="shape"/>
<feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
<feMorphology radius="1.5" operator="erode" in="SourceAlpha" result="effect4_innerShadow_448_209"/>
<feOffset/>
<feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1"/>
<feColorMatrix type="matrix" values="0 0 0 0 0.894118 0 0 0 0 0.894118 0 0 0 0 0.905882 0 0 0 0.6 0"/>
<feBlend mode="normal" in2="shape" result="effect4_innerShadow_448_209"/>
<feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
<feMorphology radius="1" operator="erode" in="SourceAlpha" result="effect5_innerShadow_448_209"/>
<feOffset/>
<feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1"/>
<feColorMatrix type="matrix" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 1 0"/>
<feBlend mode="normal" in2="effect4_innerShadow_448_209" result="effect5_innerShadow_448_209"/>
</filter>
</defs>
</svg>`

export const ROBOKASSA_ICON = `data:image/svg+xml,${encodeURIComponent(svg)}`
