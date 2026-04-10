import logging
from concurrent.futures import ThreadPoolExecutor, Future
from fastapi import HTTPException

logger = logging.getLogger(__name__)

# Bounded pools — 2 active workers each, with a max queue depth of 10.
# Beyond the queue limit, new submissions are rejected with 503.
MAX_QUEUE_DEPTH = 10

opencv_pool = ThreadPoolExecutor(max_workers=2, thread_name_prefix="opencv")
gemini_pool = ThreadPoolExecutor(max_workers=2, thread_name_prefix="gemini")


def _log_exception(future: Future, pool_name: str):
    """Callback to log any unhandled exception from a background task."""
    try:
        exc = future.exception()
        if exc:
            logger.error(f"[{pool_name}] Background task crashed: {exc}", exc_info=exc)
    except Exception:
        pass


def submit_opencv(fn, *args):
    """Submit work to the OpenCV pool, rejecting if the queue is too deep."""
    if opencv_pool._work_queue.qsize() > MAX_QUEUE_DEPTH:
        raise HTTPException(status_code=503, detail="Service busy — too many restoration jobs queued. Please try again shortly.")
    future = opencv_pool.submit(fn, *args)
    future.add_done_callback(lambda f: _log_exception(f, "opencv"))


def submit_gemini(fn, *args):
    """Submit work to the Gemini pool, rejecting if the queue is too deep."""
    if gemini_pool._work_queue.qsize() > MAX_QUEUE_DEPTH:
        raise HTTPException(status_code=503, detail="Service busy — too many AI jobs queued. Please try again shortly.")
    future = gemini_pool.submit(fn, *args)
    future.add_done_callback(lambda f: _log_exception(f, "gemini"))
