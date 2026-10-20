"""Protocol and allow-list check for the native helper. Run: python native-host/test_host.py"""

import json
import os
import struct
import subprocess

HOST = os.path.join(os.path.dirname(os.path.abspath(__file__)), "transparent_zen_host.bat")


def call(message):
    data = json.dumps(message).encode()
    out = subprocess.run(["cmd", "/c", HOST], input=struct.pack("<I", len(data)) + data, capture_output=True).stdout
    return json.loads(out[4 : 4 + struct.unpack("<I", out[:4])[0]])


assert call({"action": "ping"}) == {"ok": True}
assert call({"action": "setPref", "name": "browser.startup.homepage", "value": 1})["ok"] is False
assert call({"action": "setPref", "name": "widget.windows.mica.toplevel-backdrop", "value": 9})["ok"] is False
assert call({"action": "unknown"})["ok"] is False
print("native host checks passed")
