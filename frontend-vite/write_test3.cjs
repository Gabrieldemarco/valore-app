const fs = require('fs');
const content = 'export function PreviewWrapper({ config, tenant, onClose, onSave, onPublish }: any) { return ( <div className=\"ws-preview-wrapper\"> <span>{config.template}</span> </div> ); } export default function App() { return <div>Test</div>; }';
fs.writeFileSync('test_jsx.tsx', content, 'utf8');
console.log('Done');
