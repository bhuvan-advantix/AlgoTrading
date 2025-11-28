import * as yfNamespace from 'yahoo-finance2';

console.log('Namespace keys:', Object.keys(yfNamespace));
console.log('default in namespace?', 'default' in yfNamespace);
console.log('quote in namespace?', 'quote' in yfNamespace);

if (yfNamespace.default) {
    console.log('default keys:', Object.keys(yfNamespace.default));
}
