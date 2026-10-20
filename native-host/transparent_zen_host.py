"""Native messaging helper for Transparent Zen Community Edition (Windows).

Extensions cannot change about:config or restart the browser, so the extension asks this helper to:
  setPref  write one allow-listed preference into user.js of every Zen profile that has the extension
  restart  close Zen gracefully and start it again, the session is restored by Zen

Protocol: https://developer.mozilla.org/docs/Mozilla/Add-ons/WebExtensions/Native_messaging
"""

import glob
import json
import os
import re
import struct
import subprocess
import sys
import winreg

EXTENSION_ID = "{74186d10-f6f2-4f73-b33a-83bb72e50654}"

# Only these preferences can be written, with these values
ALLOWED_PREFS = {
    "widget.windows.mica.toplevel-backdrop": (0, 1, 2, 3),
}

DETACHED_PROCESS = 0x00000008
CREATE_NEW_PROCESS_GROUP = 0x00000200
CREATE_BREAKAWAY_FROM_JOB = 0x01000000


def read_message():
    header = sys.stdin.buffer.read(4)
    if len(header) < 4:
        return None
    length = struct.unpack("<I", header)[0]
    return json.loads(sys.stdin.buffer.read(length).decode("utf-8"))


def send_message(message):
    data = json.dumps(message).encode("utf-8")
    sys.stdout.buffer.write(struct.pack("<I", len(data)) + data)
    sys.stdout.buffer.flush()


def find_profiles():
    profiles_root = os.path.join(os.environ["APPDATA"], "zen", "Profiles")
    return [p for p in glob.glob(os.path.join(profiles_root, "*")) if os.path.isfile(os.path.join(p, "extensions", EXTENSION_ID + ".xpi")) or extension_registered(p)]


def extension_registered(profile):
    try:
        with open(os.path.join(profile, "extensions.json"), encoding="utf-8") as handle:
            return EXTENSION_ID in handle.read()
    except OSError:
        return False


def set_pref(name, value):
    if name not in ALLOWED_PREFS or value not in ALLOWED_PREFS[name]:
        raise ValueError(f"preference {name!r} with value {value!r} is not allowed")

    profiles = find_profiles()
    line = f'user_pref("{name}", {json.dumps(value)});'
    pattern = re.compile(r'^\s*user_pref\(\s*"' + re.escape(name) + r'"\s*,.*$')
    for profile in profiles:
        path = os.path.join(profile, "user.js")
        lines = []
        if os.path.isfile(path):
            with open(path, encoding="utf-8") as handle:
                lines = [entry for entry in handle.read().splitlines() if not pattern.match(entry)]
        lines.append(line)
        with open(path, "w", encoding="utf-8", newline="\n") as handle:
            handle.write("\n".join(lines) + "\n")
    return len(profiles)


def find_zen_executable():
    try:
        with winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\zen.exe") as key:
            return winreg.QueryValue(key, None)
    except OSError:
        return os.path.join(os.environ.get("ProgramFiles", r"C:\Program Files"), "Zen Browser", "zen.exe")


def restart():
    executable = find_zen_executable()
    # Runs outside the browser's job object so it survives Zen shutting down
    script = (
        "Start-Sleep -Milliseconds 500; taskkill /IM zen.exe | Out-Null; "
        "for ($i = 0; $i -lt 60 -and (Get-Process zen -ErrorAction SilentlyContinue); $i++) { Start-Sleep -Milliseconds 500 }; "
        f"Start-Process -FilePath '{executable}'"
    )
    subprocess.Popen(
        ["powershell", "-NoProfile", "-WindowStyle", "Hidden", "-Command", script],
        creationflags=DETACHED_PROCESS | CREATE_NEW_PROCESS_GROUP | CREATE_BREAKAWAY_FROM_JOB,
        close_fds=True,
    )


def handle(message):
    action = message.get("action")
    if action == "ping":
        return {"ok": True}
    if action == "setPref":
        count = set_pref(message.get("name"), message.get("value"))
        return {"ok": True, "profiles": count}
    if action == "restart":
        restart()
        return {"ok": True}
    raise ValueError(f"unknown action {action!r}")


def main():
    message = read_message()
    if message is None:
        return
    try:
        send_message(handle(message))
    except Exception as error:  # report every failure back to the extension instead of crashing silently
        send_message({"ok": False, "error": str(error)})


if __name__ == "__main__":
    main()
