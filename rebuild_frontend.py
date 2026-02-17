
import subprocess
import os

cwd = "/root/sanba"
subprocess.run(["docker", "compose", "build", "frontend"], cwd=cwd)
subprocess.run(["docker", "compose", "up", "-d", "frontend"], cwd=cwd)
