with open('test_jsx.tsx', 'w', encoding='utf-8') as f:
    f.write('''export function PreviewWrapper({ config, tenant, onClose, onSave, onPublish }: any) { return ( <div className=\"ws-preview-wrapper\"> <span>{config.template}</span> </div> ); } export default function App() { return <div>Test</div>; }''')
print('Done')
