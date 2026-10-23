const fs = require('fs');
fs.writeFileSync('test_jsx.tsx', 'export function PreviewWrapper({ config, tenant, onClose, onSave, onPublish }: any) { return ( <div className="ws-preview-wrapper"> <span>{config.template}</span> </div> ); } export default function App() { return <div>Test</div>; }', { encoding: 'utf8', flag: 'w' });
console.log('Done');
