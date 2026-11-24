import {brand} from "../shared/brand.mjs";

export function BrandSymbol() {
  return <svg width="0" height="0" aria-hidden="true" focusable="false" style={{position:"absolute",overflow:"hidden"}}>
    <symbol id="draftmango-mark" viewBox={brand.viewBox}>
      {brand.paths.map(d => <path key={d} d={d} />)}
    </symbol>
  </svg>;
}

export default function BrandMark() {
  return <svg className="dm-logo-mark" viewBox={brand.viewBox} width="26" height="32" aria-hidden="true" focusable="false">
    <use href="#draftmango-mark" />
  </svg>;
}
