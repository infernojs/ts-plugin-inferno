/*
 * Attribute mapping tables of babel-plugin-inferno (lib/lowerCaseAttributes.js and lib/attributeTransforms.js),
 * used by tests/unit/attribute-tables.test.ts to check that both plugins map the same React-style attribute names
 * on elements. They are copied here instead of imported from src/utils so a table change in src shows up as a
 * failing test. The SVG table is src/utils/svgAttributes.ts.
 */

// React-style camelCase names of lowercase HTML attributes, lowercased on elements
export const lowerCaseAttributes = [
    'accessKey',
    'autoComplete',
    'autoCorrect',
    'autoPictureInPicture',
    'autoPlay',
    'autoCapitalize',
    'autoFocus',
    'autoSave',
    'cellPadding',
    'cellSpacing',
    'charSet',
    'classID',
    'codeBase',
    'colSpan',
    'contextMenu',
    'controlsList',
    'crossOrigin',
    'dateTime',
    'encType',
    'enterKeyHint',
    'exportParts',
    'fetchPriority',
    'formAction',
    'formEncType',
    'formMethod',
    'formNoValidate',
    'formTarget',
    'frameBorder',
    'hrefLang',
    'imageSizes',
    'imageSrcSet',
    'inputMode',
    'isMap',
    'itemID',
    'itemProp',
    'itemRef',
    'itemScope',
    'itemType',
    'keyParams',
    'keyType',
    'marginHeight',
    'maxLength',
    'mediaGroup',
    'minLength',
    'noModule',
    'noValidate',
    'popoverTarget',
    'popoverTargetAction',
    'radioGroup',
    'readOnly',
    'referrerPolicy',
    'rowSpan',
    'spellCheck',
    'srcDoc',
    'srcLang',
    'srcSet',
    'tabIndex',
    'useMap'
]

// React-style names that map to a different attribute name on elements
export const attributeTransforms: Record<string, string> = {
    acceptCharset: 'accept-charset',
    transformOrigin: 'transform-origin',
    textAnchor: 'text-anchor',
    httpEquiv: 'http-equiv',
    htmlFor: 'for'
}
