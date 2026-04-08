import threading

# Max 2 concurrent Gemini pipelines per worker process.
# Each pipeline makes 2 sequential API calls (analysis + generation),
# so this caps actual API concurrency at 4 calls per worker.
gemini_semaphore = threading.Semaphore(2)
