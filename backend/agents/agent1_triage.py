import os
import re
import json
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from root .env or backend/.env
env_path = Path(__file__).resolve().parent.parent.parent / ".env"
if env_path.exists():
    load_dotenv(dotenv_path=env_path)
else:
    load_dotenv()
