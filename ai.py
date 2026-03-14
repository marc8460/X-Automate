import os
from openai import OpenAI

client = OpenAI()

IGNORE_DIRS = [
    "node_modules",
    ".git",
    ".pythonlibs",
    "dist"
]

MAX_CHARS_PER_FILE = 5000


def read_project():
    files = []

    for root, dirs, filenames in os.walk("."):
        dirs[:] = [d for d in dirs if d not in IGNORE_DIRS]

        for name in filenames:
            path = os.path.join(root, name)

            try:
                with open(path, "r", errors="ignore") as f:
                    content = f.read()[:MAX_CHARS_PER_FILE]

                files.append(f"\nFILE: {path}\n{content}")

            except:
                pass

    return "\n".join(files)


print("Loading project...")

PROJECT = read_project()

print("AI ready (type 'exit' to quit)")

while True:

    prompt = input("\n> ")

    if prompt.lower() in ["exit", "quit"]:
        break

    response = client.responses.create(
        model="gpt-5.4",
        input=f"""
You are analyzing the following software project.

PROJECT FILES:
{PROJECT}

USER QUESTION:
{prompt}
"""
    )

    print("\n" + response.output_text)