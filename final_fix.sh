#!/bin/bash
python3 -c "
import base64
with open('/tmp/fix_hash.b64.final') as f:
    data = f.read().strip()
with open('/tmp/fix_hash.sql', 'w') as f:
    f.write(base64.b64decode(data).decode('utf-8'))
"
cat /tmp/fix_hash.sql
sudo -u postgres psql -d agenda_app -f /tmp/fix_hash.sql
